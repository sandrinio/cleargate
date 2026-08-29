# BUG-044 QA-Red report — lost-update race baseline

role: qa

## Commits (worktree `.worktrees/BUG-044`, branch `story/BUG-044`)

| SHA | Subject |
|---|---|
| `5c96f2b4` | test(BUG-044): fix stale schema_version assertion in state-scripts.test.mjs (commit A) |
| `e9e3b87a` | test(BUG-044): red baseline for the lost-update race (commit B, v1 — fixed-delay shim) |
| `fd5479c7` | test(BUG-044): replace fixed-delay race shim with a true full-quorum barrier (commit B, v2 — supersedes e9e3b87a's mechanism; found the v1 shim was flaky and fixed it before reporting) |
| `e55431ec` | test(BUG-044): add explicit node:test timeouts to the async concurrency scenarios |

**HEAD = `e55431ec`.** Only one file touched across all four commits: `.cleargate/scripts/state-scripts.test.mjs`. `update_state.mjs` and its `cleargate-planning/` mirror are byte-identical and untouched (`diff` empty, confirmed after every commit) — the QA-Red forbidden-list was respected throughout.

## Files authored

- `.cleargate/scripts/state-scripts.test.mjs` (live only — this is the declared surface; the canonical tree ships no script test files at all, so no mirror is expected, per the M4 plan's own §4 verdict for BUG-044).

No other file was created or modified (no new fixture files on disk — the concurrency shim is written to a `fs.mkdtempSync` path at test runtime and is not a repo artefact).

## Harness before/after, pre-existing failure called out separately

**Before I touched anything** (clean `sprint/S-39` tree, pre-commit-A): `node --test .cleargate/scripts/state-scripts.test.mjs` → **tests 8 · suites 6 · pass 7 · fail 1**. The one failure is the pre-existing, stale assertion at `state-scripts.test.mjs:90` (`schema_version must be 1` vs. `constants.mjs`'s `SCHEMA_VERSION = 3`) — exactly matches the M4 plan's N3 measurement. This failure is **not mine** and is **not folded into** any count below.

**After commit A** (the two-assertion fix, N3 part 2): **8 / 8 / 0 / 0.** Matches the plan's predicted intermediate exactly.

**After commit B / all QA-Red scenarios** (final, HEAD `e55431ec`): **14 / 10 / 4 / 0** — `tests 14 · suites 12 · pass 10 · fail 4 · skipped 0 · todo 0`.

This **diverges from the plan's predicted `12/8/4/0`** (12 tests, 4 new red, none new green). Measured, not predicted, per this dispatch's own instruction. Reconciliation: I wrote **6** new test cases, not 4 — the plan's own S2 and S3 scenarios test properties that are **already true today**, independent of any lock (see the per-scenario table below), so they are legitimate greens; I also authored one scenario **beyond** the plan's S1–S5 table, per this dispatch's explicit instruction to cover the two unguarded migration writes at `update_state.mjs:116`/`:122`. 8 existing + 6 new = 14 total; 8 + 2 new-green (S2, S3) = 10 pass; 4 new-red (S1, S4, S5, migration addendum) = 4 fail. The arithmetic is internally consistent; it just isn't the architect's un-measured guess, which this sprint's own flashcard record (2026-08-27, `#test-harness #tpv`) already warns is exactly the kind of thing that must be measured, not inherited.

## Per-scenario red/green table

| # | Scenario | Result (HEAD) | Mutant it kills / what it guards |
|---|---|---|---|
| S0 | (commit A) `schema_version === SCHEMA_VERSION` **and** `SCHEMA_VERSION === 3` | GREEN (fixed) | Replacing the literal with `assert.ok(...)`, or with the import alone — both are self-fulfilling and would hide a future version bump exactly as the stale `1` hid the v1→v3 bump. |
| S1 | 20 concurrent invocations, 20 distinct story ids, `Bouncing` — all 20 must persist | **RED** (18/18 reruns; loses 1–5 of 20 every time) | `'wx'` exclusive-create → `'w'`; lock acquired after the `:99` read; lock wrapping only the action-branch writes and not `:116`/`:122`. |
| S2 | Two concurrent invocations, **same** story id — file stays valid JSON, one write wins | **GREEN** (legitimate — `atomicWrite`'s tmp+rename already gives this independent of any lock; today's code cannot corrupt the file this way, only lose *other* stories' updates) | Guards **releasing the lock before `renameSync`** — a future implementation that unlocks too early could let a reader observe a mid-rename write; this scenario is the tripwire for that regression, not a pin of today's absent lock. |
| S3 | Idempotent no-op leaves no lock file; a third invocation doesn't hang | **GREEN** (legitimate — no `.lock` mechanism exists yet at baseline, so the property holds vacuously) | Guards **release via `finally` instead of `process.on('exit')`** (Gotcha 1) — the mutant that ships a self-deadlocking tool on its second no-op. This is the highest-value case in the milestone per the plan's own text, and it is structurally *invisible* to S1/S4/S5. |
| S4 | Stale lock (dead pid) is stolen, cleaned up, invocation succeeds | **RED** (18/18) | Today's code never inspects `.lock` at all — the manually-seeded dead-pid lock is silently ignored *and* never removed, so the "the stale lock should not survive" assertion fails. Not a vacuous check: it fails for a real, structural reason. |
| S5 | Live lock (this process's own pid) is respected — invocation refuses | **RED** (18/18) | Today's code proceeds and transitions the story even with a live lock present (exit 0 when it must be non-zero). Kills "treating every existing lock as stale" and "treating `EPERM` as dead." |
| — | QA-Red addendum: concurrent invocations against a **fresh v1** state.json (forces the two unguarded migration writes at `:116`/`:122`) | **RED** (18/18) | Kills a lock scoped **only** to the action-branch `atomicWrite` calls (`:155,:176,:193,:210,:241`) that does not extend back to the pre-migration read and the two migration writes. S1 is deliberately seeded at `schema_version: 3` (per the plan's own Gotcha, to measure the race and not the migrator) and so **cannot** exercise this gap — this addendum is the only scenario that does. |

**Acceptance coverage vs. the item's own §5:** case 1 (20-concurrent) → S1. Case 2 (same-story) → S2. Case 3 (existing stays green) → Scenarios 1–6 above, unchanged, all green at every measurement. Case 4 (stale lock) → S4/S5. Case 5 (carry-forward for CR-106) → not a test, a process note; not applicable to QA-Red.

## Determinism method for the race (S1, S2, migration addendum)

**First attempt, measured and discarded.** A `--import`-preloaded shim monkey-patched the process-global `fs.readFileSync` to sleep a fixed delay (tried 200ms, then 600ms) on the first read of the target path, so N spawned processes would land inside the same widened window. This is *not* "spawn N and hope" — it's an explicit, engineered widening of the read-modify-write window — but it was **not airtight**: measured 2 of 6 reruns of S1 passing accidentally on the unfixed baseline at 600ms, and the migration-addendum variant was worse (1 of 3 at 200ms). Root cause, traced: `spawn()` issuing N processes back-to-back does not bound how long any *one* of them takes to actually start running (V8 boot + ESM resolution of `update_state.mjs`'s three imports, under CPU contention from the other N−1 siblings cold-starting at once). A slow straggler can arrive at the read *after* an earlier process has already written, and its read then observes the already-updated file — "accidentally" preserving correctness. A fixed delay can only make this less likely, not rule it out, and less-likely-but-still-possible is exactly the flaky-green trap this dispatch calls out by name.

**Final mechanism: a real cross-process barrier via the filesystem**, all self-contained inside `state-scripts.test.mjs` (the shim source is written to a `fs.mkdtempSync` path at test runtime — no new repo file). On its first read of the target path, each spawned process drops an arrival marker into a shared temp directory, then blocks (synchronous poll + `Atomics.wait` sleep, no busy-spin) until **either** all N markers are present — true full quorum, every process now guaranteed to observe the identical pre-mutation snapshot regardless of how long any straggler took to arrive — **or** no new marker has appeared for `CG_TEST_BARRIER_INACTIVITY_MS` (300ms) straight. The inactivity clause is the escape hatch that prevents a *correctly fixed*, lock-serialized implementation from hanging forever: once a lock exists, no second process can ever reach this barriered read while the first holds the lock, so quorum will never complete, and inactivity is how the sole holder detects "no siblings are coming soon" and proceeds.

**Verified reliability:** 18 consecutive full-suite reruns (8 + 10, two separate batches) with the barrier mechanism, **identical result every single time** — `pass 10 / fail 4 / skipped 0`, with S1/S4/S5/addendum red and S2/S3 green in every run, zero accidental passes. This is a large improvement over the fixed-delay version's measured 3-flips-out-of-9 rate. I consider S1, S4, S5, and the migration addendum **deterministic in practice** (not mathematically airtight against arbitrary OS scheduling pathology, but backed by an explicit synchronization mechanism and 18/18 empirical confirmation, not hope).

**Robustness follow-up:** the async-spawn scenarios (S1, S2, addendum) had no per-test timeout, unlike S3/S4/S5 which use `spawnSync`'s `timeout: 10000`. `node --test` has no default timeout, so a genuinely hung `update_state.mjs` (e.g. a lock retry loop with no age ceiling) would hang these three forever rather than failing loudly. Added `{ timeout: 30000 }` (`15000` for the 2-process S2) via node:test's own per-test option; reverified unchanged results after adding it.

## Is the harness fit to carry CR-106's QA-Verify precondition (R1)?

**Mechanically, yes — with one caveat to flag, not fix (out of scope for this dispatch).** `node --test .cleargate/scripts/state-scripts.test.mjs` is a fully self-contained invocation (no external deps beyond Node core + the script's own local imports), trivially wireable into an npm script, git hook, or CI step by whoever does that wiring in CR-106 or at the orchestrator level. I did not do that wiring myself — R1 assigns it as a CR-106/orchestrator-level precondition, not a BUG-044 QA-Red task, and my forbidden-list does not include touching runner/CI config.

Caveat: my additions materially change the suite's cost profile. Before my changes the suite ran in ~1–2s; now a full run takes **roughly 5–10s wall-clock** (S1 alone spawns 20 real child `node` processes; the migration addendum spawns 10 more) — still fast enough for a pre-commit/CI gate, but a step-change from what a "run it every commit" wiring decision might have assumed on this file's cost profile. Worth a one-line note in whoever writes CR-106's runner-wiring change; not a blocker.

## What I could not author, and why

Nothing was left un-authored. All five of the plan's S1–S5 scenarios plus the QA-Red-dispatch-flagged migration-write addendum are written, run, and reported with real measured red/green status and named mutants. The one thing I did **not** do is force S2/S3 to be red to match the plan's predicted total — per this dispatch's own "measure, do not predict" instruction, I report what the code actually does today rather than reshaping the tests to match an a-priori guess.

## Flashcards flagged

- "2026-08-29 · #test-harness #qa-red #danger · A fixed-delay concurrency shim (spawn N, sleep before first matching read) is not airtight — measured 3/9 accidental greens; a real filesystem arrival-barrier with an inactivity escape hatch gave 18/18. [SPRINT-39 BUG-044 QA-Red]"
- "2026-08-29 · #test-harness #qa-red · A race test seeded to bypass the migrator (schema_version 3) structurally cannot catch a lock scoped only to the action-branch writes — the two pre-action migration writes need their own v1-seeded scenario. [SPRINT-39 BUG-044 QA-Red]"

STATUS=done

## Round 2 (TPV rulings applied)

role: qa

**Commit:** `fe13d30fd4008bd1c4151860e2fece55c39b9dcd` on `story/BUG-044` (worktree `.worktrees/BUG-044`), subject `test(BUG-044): TPV round-2 -- exit-path coverage, per-holder budget, S2 rescope`. One file touched: `.cleargate/scripts/state-scripts.test.mjs` (80 insertions / 8 deletions). `update_state.mjs` and its `cleargate-planning/` mirror re-confirmed byte-identical and untouched (`diff` empty, checked before and after commit) -- the round-2 forbidden-list (no edit to `update_state.mjs` or its mirror) was respected.

### T-rulings, applied or not, verbatim

| Ruling | Applied by me? | What was done |
|---|---|---|
| **T1** (BLOCKING, routes to QA-Red) | **Applied.** | New `describe('BUG-044 T1: ...')` with one `test()` covering both required paths (`:184` already-Escalated via `--qa-bounce`, `:135` story-not-found) in the same case, asserting `!fs.existsSync(stateFile + '.lock')` after each. Minimal form as specified (~35 lines incl. fixture/comments). Green at baseline, as ruled -- not reshaped to force red. |
| **T2** (S2's mutant claim struck) | **Applied.** | Replaced the S2 comment block. It no longer claims to guard "releasing the lock before `renameSync`"; it now states M3 survives S2 10/10, keeps S2 as the item's SS5-case-2 acceptance coverage ("file stays valid JSON"), and records the compensating control (QA-Verify must read the diff for release-after-`renameSync`, kick-back criterion 9). No assertion logic changed -- only the comment/claim. |
| **T3** (per-holder retry budget) | **NOT applied to `update_state.mjs`** -- ruled BLOCKING on the Developer, and editing that file is on my forbidden list; I author the baseline, not the fix. **Partially applied to the test file**: rewrote the two exit-code-loop assertion messages (S1 and the migration addendum) and the count-mismatch messages next to them, so a non-zero exit with `stderr` mentioning "could not acquire lock ... held by pid N" is no longer attributed to the three false lock-design causes -- it now says explicitly that the lock is correct and the retry budget is the cause, pointing at T3. I did not touch the barrier mechanism, its 300ms `CG_TEST_BARRIER_INACTIVITY_MS`, or any numeric assertion (`elapsedMs < 10000` in S4/S5 unchanged) -- T3 does not ask for that, and a correct per-holder implementation does not need it (see measurement below). |
| **T4** (R1 / CR-106 runner) | **Not applicable -- deliberately not touched**, per this dispatch's explicit "Do not fix R1." No runner wiring added. |
| **T5** (stale title at `:186`) | **Deliberately NOT applied.** The M4 ruling says "fix in the Developer's commit" and the amended task-row list attributes it there, not to the QA-Red re-entry row. `state-scripts.test.mjs:186` still reads `schema_version=1` in this commit -- confirmed unchanged (`grep -n "schema_version=1"` still hits `:186` after my commit). |
| **T6** (no `.gitignore` edit) | **Complied by omission.** No `.gitignore` file touched or added. |

### Measured case table -- own post-amendment line

`node --test .cleargate/scripts/state-scripts.test.mjs`, 3 consecutive runs at commit `fe13d30f`:

| Run | tests | suites | pass | fail | skipped |
|---|---|---|---|---|---|
| 1 | 15 | 13 | 11 | 4 | 0 |
| 2 | 15 | 13 | 11 | 4 | 0 |
| 3 | 15 | 13 | 11 | 4 | 0 |
| 4 (post-commit re-check) | 15 | 13 | 11 | 4 | 0 |

**Matches the dispatch's target exactly** (`tests 15 · suites 13 · pass 11 · fail 4 · skipped 0` at QA-Red HEAD, per the TPV ruling T1 harness line) -- no delta to report.

Per-suite status, all 4 runs identical: **RED** -- BUG-044 S1, S4, S5, QA-Red addendum (unchanged from round 1). **GREEN** -- Scenarios 1-6 (8 tests), S2, S3, and the new **T1** case (green at baseline, as ruled -- not forced red).

Baseline reproduction before any round-2 edit was re-confirmed first, matching TPV's `12/12` figure: `tests 14 · suites 12 · pass 10 · fail 4 · skipped 0`.

### T1 mutation-kill proof (not vacuous)

Built two M6-style leak mutants **out-of-tree** (`git init` scratch copy of `.cleargate/scripts/`, `update_state.mjs` restored/discarded after each check -- nothing in the worktree or main checkout touched):

1. **Leak only on `:184`** (write a lock file immediately before that `process.exit(1)`, leave `:135` clean): T1's test fails with `error exit at :184 must not leave a lock file; found .../state.json.lock`.
2. **Leak only on `:135`** (isolated from `:184`, to prove the second assertion in the case is independently load-bearing and not dead code riding on the first assertion's failure): T1's test fails with `error exit at :135 must not leave a lock file; found .../state.json.lock`.

Both paths independently kill their own mutant -- the case is not vacuous on either side.

### Per-holder-budget verification across repeated runs (proof a correct implementation now passes at a low budget)

Built a REF-C-shaped reference implementation **out-of-tree** (scratch `git init` root, `.cleargate/scripts/` copy so `REPO_ROOT` resolves correctly for Scenario 5 -- same method TPV used): `openSync(lockPath,'wx')`, acquired after the `:92-95` existsSync check and before the `:99` read, `process.on('exit')` release registered immediately at acquire (covers all in-lock exits including the nine T1 targets, migration writes at `:116`/`:122`, and the happy paths), steal guarded by `process.kill(pid,0)` liveness (`EPERM` = alive, do not steal) plus a generous age ceiling, `Atomics.wait`-based synchronous retry sleep, and **`LOCK_RETRY_BUDGET_MS = 2000` reset every time the observed holder (`pid`+`at`) changes** -- TPV's T3 shape. The **amended** test file (this commit) was overlaid on top.

`node --test .cleargate/scripts/state-scripts.test.mjs`, 4 consecutive runs:

| Run | tests | suites | pass | fail | skipped | wall-clock |
|---|---|---|---|---|---|---|
| 1 | 15 | 13 | **15** | **0** | 0 | 14.70s |
| 2 | 15 | 13 | **15** | **0** | 0 | 14.18s |
| 3 | 15 | 13 | **15** | **0** | 0 | 14.48s |
| 4 | 15 | 13 | **15** | **0** | 0 | 14.55s |

**14/14/0-class result confirmed at the amended count (15/15/0), 4/4 runs, ~14.2-14.7s wall-clock** -- matches TPV's REF-C measurement (`14/14/0 in 4/4 runs, ~14s`) with the +1 T1 case folding in cleanly and staying green under a correct implementation. `git status --porcelain` was clean after every run (no lock residue leaked into the scratch tree).

**Bonus confirmatory check (not required, done for rigor):** built a flat-total-budget mutant of the same reference (removes the per-holder reset, `LOCK_RETRY_BUDGET_MS = 2000` applied once to the whole contention window instead of per-holder) and ran S1 alone. It fails exactly where T3's rewritten message says it will: `AssertionError: every invocation should exit 0 even under the race; stderr: Error: could not acquire lock for .../state.json -- held by pid N` -- the exit-code assertion, not the count-mismatch one. Confirms the message rewrite is anchored at the correct failure site.

### Rulings I could not apply verbatim

- **T3's implementation clause** ("implement the retry budget per-holder... 2000ms with progress-reset") -- not applied to `update_state.mjs`, by design: it is explicitly ruled "BLOCKING on the Developer" in both the TPV report and the M4 plan's amended task rows, and `update_state.mjs`/its mirror are on my forbidden list. I applied the test-side half of T3 (the misleading-message rewrite) and verified, out-of-tree, that the harness as amended does not punish a correct per-holder implementation -- see above.
- **T5** -- not applied verbatim as "fix the stale title," because the ruling itself assigns that fix to the Developer's commit, not QA-Red's. Left `:186` unchanged on purpose; flagging here so it is not mistaken for an oversight.
- **T4** -- not applicable to this dispatch (explicitly forbidden: "Do not fix R1"). No action taken, none required from QA-Red.

### Flashcards flagged

- "2026-08-29 · #test-harness #qa-red #tpv · A test's own failure message can misattribute cause across two different assertions in the same test -- put the explanation next to the assertion that actually fires. [SPRINT-39 BUG-044 QA-Red round 2]"

STATUS=done
