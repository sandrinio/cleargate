# BUG-044 — Architect post-flight

role: architect · SPRINT-39 · wave 10 · M4 · Mode: POST-FLIGHT

Subject: `.worktrees/BUG-044` @ `871270d1`, branch `story/BUG-044`, merge-base `9c1ba35f`.
Six commits: `5c96f2b4` `e9e3b87a` `fd5479c7` `e55431ec` `fe13d30f` `871270d1`.

## Verdict

**PASS.**

All twelve kick-back criteria clear (the M4 plan's eight + TPV's amended 9–12). Independent 5th
suite run in the worktree: `tests 15 · suites 13 · pass 15 · fail 0 · cancelled 0 · skipped 0`,
`duration_ms 14580.47`, exit 0, no `state.json.lock` anywhere under the repo afterwards. S5
refused at 2144 ms — the per-holder budget behaving exactly as T3 specified.

Surface is exactly three files (`git diff --stat 9c1ba35f 871270d1`), and the two
`update_state.mjs` copies share **the same git blob** `6dc7cf7cf6eab464e52f05d83e444e29e4b3df88` —
byte-parity proven at the object level, not by `diff`.

One thing I would have fixed before merge but will not bounce for: the committed test file's own
comments still cite pre-lock `update_state.mjs` offsets (§1 Group C). It is prose, it is green, and
it rides CR-106's commit — which edits the same file and already carries an explicit re-measure task
row. Bouncing a story on a criterion invented at post-flight is worse than the drift.

---

## §1 — N7: full citation re-measurement of `update_state.mjs`

`update_state.mjs`: **246 → 371 lines**. `git diff -U0` shows **three insertion-only hunks**, no
deletions, no moves. Offset map, exact:

| baseline range | offset | committed range | what occupies the gap |
|---|---|---|---|
| 1–20 | **0** | 1–20 | — |
| — | — | 21–24 | new docstring concurrency note |
| 21–32 | **+4** | 25–36 | — |
| — | — | 37–147 | lock constants, `sleepSync`, `isPidAlive`, `acquireLock` |
| 33–96 | **+115** | 148–211 | — |
| — | — | 212–221 | `lockPath` + `acquireLock()` call + its catch |
| 97–246 | **+125** | 222–371 | — |

`state-scripts.test.mjs`: **319 → 825 lines**.

### Group A — the CR-106-gating citations. These block wave 11.

Every one re-measured against `git show 871270d1:.cleargate/scripts/update_state.mjs`.

| Cited | Status | Corrected | Verified content at the corrected line |
|---|---|---|---|
| `:78` | **stale** | **`:193`** | `fs.writeFileSync(tmpFile, JSON.stringify(state, null, 2) + '\n', 'utf8');` — CR-106 case 7's byte anchor, text unchanged |
| `:76-80` | **stale** | **`:191-195`** | `function atomicWrite(stateFile, state)`, body unchanged, still 5 lines |
| `:78-79` | **stale** | **`:193-194`** | `writeFileSync` + `renameSync` |
| `:99` | **stale** | **`:224`** | `state = JSON.parse(fs.readFileSync(stateFile, 'utf8'));` — now preceded by the acquire at `:216` |
| `:114-117` | **stale** | **`:239-242`** | `if (state.schema_version === 1) { migrateV1ToV2; atomicWrite }` |
| `:120-123` | **stale** | **`:245-248`** | `migrateStateToV3` + `if (v3Changed) atomicWrite` |
| `:116` / `:122` | **stale** | **`:241` / `:247`** | the two pre-dispatch `atomicWrite(stateFile, state)` calls |
| `:187-189` | **stale** | **`:312-314`** | `if (story.qa_bounces >= BOUNCE_CAP) { story.state = 'Escalated'; }` |
| `:204-206` | **stale** | **`:329-331`** | `if (story.arch_bounces >= BOUNCE_CAP) { story.state = 'Escalated'; }` |
| `:227-229` | **stale** | **`:352-354`** | idempotency no-op: `stdout 'No-op:'` then `process.exit(0)` — still returns **without writing** |
| `:233-235` | **stale** | **`:358-360`** | `if (newState === 'Done') { story.worktree = null; }` |
| `:246` | **stale** | **`:371`** | `main();` — **still the last line, still called synchronously at module top level** |
| `:52-66` | **stale** | **`:167-181`** | `export function migrateV1ToV2(state)` — signature and body byte-unchanged; export surface intact |

Three of these need more than an offset bump:

- **`update_state.mjs:78-99`** (CR-106 frontmatter `context_source:10`, `## Context Source:225`,
  `SPRINT-39_Decomposition_Surfaces.md:130`) is no longer a meaningful span. Baseline 78–96 maps to
  193–211 and 97–99 maps to 222–224; **lines 212–221 in between are the lock acquire**. Rewrite as
  two citations: `:191-195` (`atomicWrite`) **and** `:224` (the read). Do not emit `:193-224`.
- **CR-106 §4's widened eviction grep** (`grep -n "atomicWrite(stateFile" update_state.mjs`, M4
  Omission 2) is line-number-free and therefore still correct, but its **expected output changed**:
  it now returns **seven** hits — `:241`, `:247` (migrations) and `:280`, `:301`, `:318`, `:335`,
  `:366` (the five action branches). CR-106's acceptance is that all seven collapse to the fold's
  single call site. Write the seven down before the Developer runs it, or "only the fold's own call
  site" is unfalsifiable.
- **CR-106's `init_sprint.mjs:231-233`** citation is **still valid** — BUG-044 did not touch
  `init_sprint.mjs`. Verified: `fs.writeFileSync(tmpFile, …)` / `fs.renameSync(tmpFile, stateFile)`
  at `:232-233`, preceded by the tmp-name line at `:231`.

### Group B — everything else in the tree that cites into this file

| File:line | Cited | Corrected |
|---|---|---|
| `plans/M4.md:456` | `update_state.mjs:88` (`args[1]` as action) | **`:203`** |
| `plans/M4.md:602` | `:229` (no-op exit) | **`:354`** |
| `plans/M4.md:604` | `:116`, `:122` | **`:241`, `:247`** |
| `plans/M4.md:606` | `:77` (tmp naming) | **`:192`** — still `` `${stateFile}.tmp.${process.pid}` ``, still un-hardened, still correct not to touch |
| `plans/M4.md:609` | `:52-66` | **`:167-181`** |
| `plans/M4.md:2220` | `:116`/`:122` | **`:241`/`:247`** |
| `plans/M4.md:2816` (TPV M6) | `:102,:110,:130,:135,:146,:166,:184,:201,:223` | **`:227,:235,:255,:260,:271,:291,:309,:326,:348`** |
| `plans/M4.md:565` | `state-scripts.test.mjs:25-31` (`runScript`) | **`:25-32`** (baseline was `:24`, so the plan was already off by one) |
| `plans/M4.md:611` | `state-scripts.test.mjs:38-48` (`makeState`) | **`:40-49`** |
| `BUG-044_…md:12` (frontmatter) | `update_state.mjs:78-79,99` | **`:193-194`, `:224`** |
| `BUG-044_…md:163` (Context Source) | `update_state.mjs:78-79` and `:99` | **`:193-194`** and **`:224`** |
| `SPRINT-39_Decomposition_Surfaces.md:130` | `update_state.mjs:78-99` | **`:191-195` + `:224`** (span, see above) |
| `CR-085-Drive-Execution-Loop-States-Live.md:90` | `update_state.mjs:217-242` | **`:342-367`** — content confirmed: the state-transition `else` branch |
| `BUG-039_State_Update_…md:101` | `cleargate-planning/…/update_state.mjs:71` (`resolveStateFile` throw) | **`:186`** |

Other `state-scripts.test.mjs` anchors, re-measured for CR-106's benefit: `writeStateJson`
`:34 → :35`; `makeStory` `:53 → :54`; Scenario-1 title `:77 → :186`; the `schema_version`
assertion `:90 → :205-206`; Scenario-3's "file content unchanged" no-op case (CR-106's own
§Gotchas anchor) `:172 → :288`.

**Still valid, do not touch:** `SPRINT-23/plans/M1.md:19,409,436` and
`SPRINT-23/.reporter-context.md:48,438,465` cite `update_state.mjs:8` — line 8 is below the first
hunk, offset 0, and still reads `node update_state.mjs <STORY-ID> --arch-bounce`. Their companion
`L191–207` span is stale (**→ `:316-332`**) but those are closed-sprint artefacts; leave them.
`wiki/bugs/BUG-039.md:31` and `BUG-039_…md:58` are captured **stack traces** from 2026 — historical
evidence, not surface claims. Leave.

### Group C — citations inside the committed tree itself (the N7 miss)

Nine comment/title sites in `state-scripts.test.mjs` cite `update_state.mjs` line numbers, and the
same commit `871270d1` moved every one of them. This is N7's own case ("a comment, a test title")
and the only place BUG-044 fell short. It is prose-only; all fifteen tests are green.

Four of the nine are not merely off-by-N — they now point at *unrelated* code. `:519`'s
nine-site list sends a reader to `:102` (`sleepSync(LOCK_POLL_INTERVAL_MS)` inside `acquireLock`),
`:110` (a comment), `:130` (another `sleepSync`) and `:146` (the close of `acquireLock`). A reader
chasing "the nine uncovered in-lock exit sites" lands in the retry loop.

| test file line | cites | corrected |
|---|---|---|
| `:444` | `update_state.mjs:116/:122` | `:241/:247` |
| `:511` | "acquired after the `:99` read" | `:224` |
| `:519` | `:102,:110,:130,:135,:146,:166,:184,:201,:223` | `:227,:235,:255,:260,:271,:291,:309,:326,:348` |
| `:551` (test title), `:554`, `:560` | `:184`, `:135` | `:309`, `:260` |
| `:654` | `:227-229` | `:352-354` |
| `:752`, `:755-757` | `:116`, `:122`, `:114-117`, `:120-123` | `:241`, `:247`, `:239-242`, `:245-248` |
| `:760` (describe title) | `:116/:122` | `:241/:247` |
| `:773` | `:114-117`, `:120-123` | `:239-242`, `:245-248` |
| `:820-821` | `:116/:122`; `:155/:176/:193/:210/:241` | `:241/:247`; `:280/:301/:318/:335/:366` |

**Route:** CR-106 (wave 11) rewrites `update_state.mjs`'s write path and already carries the task
row *"Re-measure every line citation in the item and in this plan that points into a file this
commit edited (N7)"*. Extend that row to cover `state-scripts.test.mjs`'s comments. Do not spend a
BUG-044 bounce on it.

---

## §2 — Does the lock change what CR-106 must do? Yes. Four couplings, one of them silent.

The dispatch asks whether anything in the lock's *design* is now depended on by the *tests*, such
that deleting the lock breaks a test for a reason unrelated to the race. It does — in both
directions: two tests break loudly, two go vacuous, and two go **vacuous while still reading green**,
which is the dangerous one.

### 2.1 — Two tests hard-break on lock removal, for pure lock semantics

- **S5 (`:733-747`)** seeds a `state.json.lock` holding this test process's own (definitionally
  alive) pid, then asserts `result.status !== 0` (`:740`), `state untouched` (`:744`), and the lock
  survives (`:746`). A lock-free `update_state.mjs` ignores the stray file, exits 0 and transitions
  the story — `:740` and `:744` both go **RED**. S5 contains **zero** race content; it is a pure
  assertion about the steal heuristic.
- **S4 (`:693-707`)** seeds a dead-pid lock. Exit 0 (`:700`) and the transition (`:704`) survive
  lock removal, but `:706` — *"the stale lock should not survive a successful invocation"* — goes
  **RED**, because nothing unlinks it.

CR-106's E1 says "keep the 20-way test green." It says nothing about S4/S5, and its §4 case 1 says
*"do not delete or weaken it"* about the **concurrency** test only. **Ruling for CR-106: S4, S5 and
T1 are lock-lifecycle tests, not race tests. They are deleted with the lock, in the same commit, and
the deletion is stated in the CR-106 report — not silently.** Deleting them is correct; leaving them
red is not; "fixing" them by re-introducing a vestigial lockfile is a kick-back.

### 2.2 — Two tests go vacuous but stay green

**S3's `:660`** (`!existsSync(lockFile)`) and **T1's `:558`/`:564`** are both `!existsSync` on a file
that a lock-free implementation never creates. They pass trivially. TPV already recorded T1 as
"green at baseline" for exactly this reason. They carry no signal after CR-106 and go with S4/S5.

### 2.3 — The silent one: the barrier arms on a read CR-106 deletes

This is what TPV's "the barrier arms **inside** the critical section" implies for a lock-free
implementation, and it is the finding that most changes CR-106's plan.

The shim (`state-scripts.test.mjs:103-144`) patches `fs.readFileSync` and arms **only** on a path
resolving to `CG_TEST_BARRIER_TARGET`, which every caller sets to the **`state.json` path**
(`:482`, `:600`, `:794`). On that first read each process drops a marker and blocks until full
quorum or a 300 ms inactivity window. That read is `update_state.mjs:224` — the read half of the
race.

CR-106 removes exactly that read. Its own §Existing Surfaces says of `:99`: *"the read half of the
unguarded read-modify-write. **Replaced by an append.**"* If `update_state.mjs` no longer calls
`readFileSync` on the state file, then:

- `armed` never fires, no marker is written, no process ever blocks;
- **S1, S2 and the addendum degrade to plain unsynchronised N-way spawns** — no widened window, no
  quorum, no determinism;
- they go **GREEN**, E1 reads as satisfied, and the harness that made the pre-fix red *reproducible*
  has been disarmed without a single line of test code changing.

The tell is wall-clock, and it is unmissable if anyone looks for it: S1 (`3.1 s`), S2, the addendum
(`3.1 s`) and S5 (`2.1 s`) account for most of today's `14.6 s`. A disarmed barrier drops the file
to roughly **2–4 s**. **A CR-106 run that reports 15/15 green in under 6 s has disarmed the
barrier, not fixed the race.**

**Ruling for CR-106, three parts:**
1. Re-target the barrier at the surface the new writer actually touches — `CG_TEST_BARRIER_TARGET`
   points at `events.jsonl`, or the shim arms on `appendFileSync`/`openSync(…,'a')` rather than
   `readFileSync`. Whichever, it must arm on a call the fold path genuinely makes.
2. Re-prove redness by construction: build a deliberately-racy fold (E8's "fold that reads
   `state.json` and merges") and show S1 red against it under the re-targeted barrier, before
   claiming E1 green. TPV's own instruction — *confirm the red set by MEASUREMENT, not prediction* —
   applies to the inherited test, not just the new ones.
3. Record the post-CR-106 wall-clock in the report next to the pass/fail line. A number that
   collapses is the only cheap witness that the barrier still arms.

### 2.4 — A design collision CR-106 has not noticed: the addendum vs. legacy-immutable

The QA-Red addendum (`:760-825`) seeds a **`schema_version: 1`** `state.json` with **no
`events.jsonl`**, then asserts (`:810-811`) the file ends fully migrated to v3 with `execution_mode`
stripped. Under CR-106's chosen §2 bullet — *"legacy-immutable — **never rewrite a closed sprint's
state**"* — a directory with `state.json` and no `events.jsonl` is **precisely the legacy shape the
new writer must not rewrite**. E5 asserts such a directory's bytes are identical before and after.

So E5 and the inherited addendum assert opposite things about the same fixture shape. CR-106 must
decide, before code: does "legacy" mean *no `events.jsonl`*, or *a closed sprint*? If the former, the
addendum must be re-seeded with an `events.jsonl` and its migration assertions rewritten. If the
latter, the CR needs a written discriminator (`.active` sentinel? sprint status?) because "has no
events.jsonl" is what the fold can actually observe. **Neither the CR text nor M4's CR-106 blueprint
raises this. It is an OD for wave 11, not a Developer judgement call.**

### 2.5 — What is *not* coupled

`atomicWrite` (`:191-195`) is untouched by the lock — the lock wraps it, exactly as the plan
required. Its byte contract (`JSON.stringify(state, null, 2) + '\n'`) is intact, so CR-106's case-7
anchor is sound. The two escalation side-effects (`:312-314`, `:329-331`), the `Done ⇒ worktree =
null` side-effect (`:358-360`) and the write-free no-op (`:352-354`) are all semantically unchanged;
the fold's obligations are exactly what M4 already wrote down, at new offsets.

---

## §3 — `Atomics.wait` and the synchronous `main()`

**Confirmed on all three questions. No async boundary was introduced.**

- `command grep -n 'async|await|.then(|setTimeout|setInterval|setImmediate|process.nextTick|Promise'`
  over the committed `update_state.mjs` returns **exactly one hit — line 74, inside a comment**
  ("`main()` is synchronous top-to-bottom, so no async timer can run here"). Zero executable
  occurrences. `main()` is still a plain `function`, still invoked bare at `:371`.
- `sleepSync` (`:54-56`) is called from **two sites only**, `:102` and `:130`, both inside
  `acquireLock`'s `catch (EEXIST)` branch, which is reached only from `main()`'s synchronous call at
  `:216`. There is no path on which the retry sleep is reached while the event loop is expected to
  turn — the event loop has not started doing anything else, because nothing in this program ever
  yields to it.
- `Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms)` with the cell at 0 and the
  expected value 0 blocks for the full timeout. Node permits blocking `Atomics.wait` on the main
  thread (unlike the browser main thread). Correct idiom.
- Because there is no `await`, the `process.on('exit')` handler registered at `:137-143` cannot run
  until `main()`'s synchronous body has fully unwound. **Kick-back criterion 9 (release strictly
  after `renameSync` returns) is therefore structurally satisfied, not merely observed:**
  `atomicWrite`'s `writeFileSync` (`:193`) and `renameSync` (`:194`) are adjacent statements with no
  `process.exit` between them, and no exit-site sits between them either. An `async main()` would
  have broken this silently — `'exit'` handlers do not run for a process that is still awaiting —
  and no test covers it. It did not happen.
- **Signal caveat, for the record:** `'exit'` handlers do **not** run on SIGINT/SIGTERM/SIGKILL
  termination, so a Ctrl-C mid-transition leaks the lock. That leak is self-healing — the pid is
  gone, so the next contender's `ESRCH` check steals it on the first retry (S4 is exactly this
  case, 120 ms). It is also the leak the T6 operational note in §7 covers.
- Narrow non-issue, stated so nobody re-derives it: if `writeSync`/`closeSync` at `:135-136` throw
  (ENOSPC), the lock file exists but the handler was not yet registered, so it leaks — and then the
  process dies, so liveness steals it. Fail-safe.

---

## §4 — The steal heuristic, as an architect

**Can a legitimate holder hold this lock for more than 5 minutes on this repo? No. Not by any path
that exists today.** The reasoning, not the reassurance:

**The lock has exactly one acquirer.** `command grep -rn 'acquireLock'` over `.cleargate/scripts/`
returns four hits, all inside `update_state.mjs` (`:24` comment, `:81` definition, `:213` comment,
`:216` the sole call). `state.json.lock` appears in only two files repo-wide: `update_state.mjs` and
the test. So the critical section is bounded by one invocation of one script, and its content is:
one `readFileSync` of a ~10 KB JSON file, two `validate*` passes, at most two migration writes, one
action write, one rename. Measured: S3 runs three complete sequential invocations — process spawn
included — in **439 ms**. The real hold is a small fraction of that. Five minutes is ~1000× the
observed cost.

Taking the three cases the dispatch names:

- **`close_sprint.mjs` — cannot hold this lock, because it never takes it.** It reads `state.json`
  at `:213` and writes it at `:222`, `:228` and `:1047` **unguarded**. Same for `init_sprint.mjs`
  (`:232-233`) and every other writer. So `close_sprint.mjs` cannot starve a contender — but this is
  the honest residual: **BUG-044 serialises `update_state.mjs` against itself, not `state.json`
  against all writers.** In practice `close_sprint` runs once, at Gate 4, behind a human ack and
  after Steps 2.7/2.8 have proven every story merged, so it does not overlap a dispatch. Correctly
  out of BUG-044's Do-NOT-modify surface; CR-106 subsumes it by making the fold the only writer.
- **The lifecycle reconciler** runs inside `close_sprint.mjs`. Same answer.
- **`--qa-bounce` issued while the 32-child suite runs.** No interaction: the suite's children run
  against state files under `os.mkdtemp` in `os.tmpdir()`, so they contend on *different* lock paths
  (`${stateFile}.lock` is derived per-file). CPU contention from 32 processes cannot stretch a
  sub-second synchronous section to 300 s — that is three orders of magnitude.

**What the backstop *can* fire on — the honest list.** All three need the holder's process to be
**alive but not progressing** for 300 s of wall-clock, because `ageMs` is wall-clock
(`Date.now() - Date.parse(lockInfo.at)`), not CPU time:

1. `SIGSTOP` / debugger breakpoint / `node --inspect-brk` inside the critical section. Not part of
   this workflow.
2. Laptop suspend landing inside a sub-second window. Probability ≈ 0.
3. An NTP step correction of > 5 minutes between acquire and a contender's check.

**And when it does fire, it is worse than a plain steal — the compound case, which nothing
documents.** The release handler at `:137-143` unlinks `lockPath` **unconditionally**; it does not
re-read the payload to confirm it still owns the lock. So: A holds, is suspended past 5 min; B
age-steals, unlinks A's lock, creates its own; A resumes, writes, exits, and its handler unlinks
**B's** lock; C then acquires while B is mid-section. The age backstop is the only path that reaches
this, because the other steal path (dead pid) implies A can no longer unlink anything.

**Verdict: accepted residual, not a defect.** The plan mandated the age ceiling verbatim ("*a lock
older than a fixed budget is stealable regardless… pick a value and state it in the code comment*"),
TPV confirmed constraint 7, and the Developer implemented what was specified with liveness primary
and age as backstop — which is the correct ordering. A one-line ownership check in the release
handler would close the compound case, but changing the release path post-TPV re-opens M6/M3 and
buys ~nothing against a probability-zero trigger on a lock CR-106 deletes next wave.
**Recorded, not remediated.** If CR-106 slips out of SPRINT-39, file it.

**One more residual, distinct from the above.** The per-holder budget deliberately removes the flat
ceiling, so **total wait is unbounded under continuous holder churn** — a contender that keeps
observing a *new* holder resets its deadline forever. There is no queue and no fairness. Measured
20-way serialisation is ~6 s and this sprint runs ≤3 concurrent dispatches, so it is not reachable
here; it becomes real if EPIC-055 widens wave concurrency. Note it in EPIC-055's grounding.

---

## §5 — Mirror parity and the dogfood split

**Parity: proven, at the object level.** `git ls-tree 871270d1` returns the identical blob
`6dc7cf7cf6eab464e52f05d83e444e29e4b3df88` for `.cleargate/scripts/update_state.mjs` and
`cleargate-planning/.cleargate/scripts/update_state.mjs`. Same content hash ⇒ byte-identical, no
`diff` needed. Cross-Cutting Rule 1's same-commit requirement satisfied — both copies land in
`871270d1` itself, not a follow-up.

**Correctly no third row.** The canonical tree ships no script tests, so the absence of a
`cleargate-planning/.cleargate/scripts/state-scripts.test.mjs` mirror is right, exactly as the M4
plan ruled.

**N1 is not engaged.** BUG-044 touches no `.claude/**` path, so no live-agent re-sync is owed by
this story.

**What Gate 4 now owes, precisely one new item.** The npm payload copy
`cleargate-cli/templates/cleargate-planning/.cleargate/scripts/update_state.mjs` currently matches
canonical (both 246 lines, pre-merge). **The moment BUG-044 merges, it goes stale at 246 vs 371**
and only `npm --prefix cleargate-cli run prebuild` fixes it. That is Cross-Cutting Rule 2's
Gate-4 step and it now has a concrete reason rather than a routine one — this is a **behavioural**
change to a shipped script, so a stale payload means every fresh `cleargate init` installs the
racing version. Add to the Gate-4 list alongside the already-owed `dist/` rebuild (N9) and the
already-discharged SKILL.md re-sync (R8).

**Zero soak, and it is live immediately.** `.cleargate/scripts/**` is tracked and executes from the
main checkout, which sits on `sprint/S-39`. So on merge this lock becomes the write path for every
wave-11/12/13 transition — every DevOps `… Done`, every `--qa-bounce`, every `--arch-bounce` — with
no soak period and no automatic runner (N3 unchanged; TPV T4 assigns the runner to CR-106).

**Four things I want the orchestrator watching, in priority order:**

1. **A leaked `state.json.lock` at `.cleargate/sprint-runs/SPRINT-39/state.json.lock`.** Verified
   **not** gitignored (`git check-ignore` returns nothing), and `.cleargate/sprint-runs/` is a
   tracked tree — so a leak makes `git status --porcelain` non-empty and
   `validate_bounce_readiness.mjs:98-101` hard-fails the *next* story with `git working tree is
   dirty`, naming a file but never naming `update_state`. See §7.
2. **`Error: could not acquire lock for … -- held by pid N`, exit 1.** This is a genuine refusal
   after a 2 s per-holder budget against a *live, non-progressing* holder. It is not the retry-budget
   artefact TPV measured (that one only appears under the test barrier). Check for a stopped `node`
   process before removing anything.
3. **Any `update_state.mjs` invocation that hangs, or exits non-zero where it previously exited 0.**
   The M4 plan's stated rollback trigger. Rollback is `git revert -m 1 <merge commit>` in the outer
   repo — **never** `git reset --hard`.
4. **Stray `state.json.tmp.<pid>` files.** Unchanged behaviour (per-process tmp names, `:192`), but
   a `renameSync` failure now leaves both a tmp file and a released lock. Cosmetic; do not read one
   as evidence of a torn write.

---

## §6 — Cross-Cutting Rule 4

**Not engaged. Verified, not assumed.**

`git diff --stat 9c1ba35f 871270d1 -- '*.md'` is **empty**. The commit range touches exactly three
files, all `.mjs`. No markdown was modified, therefore no `## ` heading moved, therefore no
`section(N)` criterion shifted in either tree. No template, no gated document, no
`readiness-gates.md` edit. `expected-headings.ts` was not opened — correctly, per N6 and the
STORY-054-05 post-flight rule carried in `sprint-context.md`. `gate-section-index-pinning` needs no
re-run for this story.

---

## §7 — T6: the `.gitignore` ruling, honoured

**Confirmed.** `git diff 9c1ba35f 871270d1 -- .gitignore` produces **zero lines**. No ignore rule for
`state.json.lock` was added, the three-row surface was not widened to four, and
`validate_bounce_readiness.mjs`'s dirty-tree signal stays visible — which was the entire point of the
ruling.

The mitigation TPV relied on instead is present and works: `process.on('exit')` registered at acquire
covers all **ten** in-lock exit sites — enumerated independently here as `:227` (parse error), `:235`
(pre-migration invalid), `:255` (post-migration invalid), `:260` (story not found), `:271` (`--lane`
bad value), `:291` (`--lane-demote` missing reason), `:309` (`--qa-bounce` already-Escalated), `:326`
(`--arch-bounce` already-Escalated), `:348` (invalid state literal), `:354` (idempotent no-op) —
matching QA-Verify exactly. The committed file has **13** `process.exit()` call sites in total
(15 grep hits, two of them in comments); the three outside the lock are `:157` (usage), `:209`
(missing state file) and `:219` (acquire failure — the acquire threw before any handler was
registered, so there is nothing to release). No run in this dispatch left a lock behind.

**Operational consequence, one line for the orchestrator:**

> If any wave-11/12/13 transition reports `git working tree is dirty`, check for
> `.cleargate/sprint-runs/SPRINT-39/state.json.lock` and `rm` it **first** — the diagnostic comes
> from `validate_bounce_readiness.mjs:98-101` and will never name `update_state.mjs`.

---

## Kick-back criteria — all twelve, adjudicated

| # | Criterion | Result |
|---|---|---|
| 1 | Two-tree diff non-empty | **PASS** — identical blob `6dc7cf7c` |
| 2 | Red test uses `--state` | **PASS** — drives `Bouncing` (`:476`, `:594`, `:788`) |
| 3 | Release via `finally` | **PASS** — no `finally` in the file; `process.on('exit')` at `:137` |
| 4 | Lock after the read, or not enclosing the migration writes | **PASS** — acquire `:216` < read `:224` < migrations `:241`/`:247` |
| 5 | `schema_version` assertion bare-literal or self-fulfilling | **PASS** — two-assertion form at `:205-206` |
| 6 | Report lacks the three numbers | **PASS** — dev + QA both carry `15 / 0 / 0` |
| 7 | Any file outside the three-row surface | **PASS** — exactly three files |
| 8 | `--no-verify` / reset / force-push / cli hook | **PASS** — `cleargate-cli/.git/hooks/` still `*.sample` only; no history rewrite in the range |
| 9 | Release before `renameSync` returns (M3, diff-read only) | **PASS** — structurally impossible; §3 |
| 10 | Release not registered at acquire (M6) | **PASS** — registered on the success branch, covers all ten in-lock exits |
| 11 | Budget flat outside `[7000, 9800]`, or per-holder without holder-change reset | **PASS** — per-holder 2000 ms, deadline reset keyed on `` `${pid}:${lockInfo.at}` `` (`:121-125`) |
| 12 | T1 absent or reshaped to red | **PASS** — present `:526-566`, green at baseline by design, two error paths |

---

## Script Incidents

None. No `run_script.sh`-wrapped script was invoked in this dispatch.

---

STALE_CITATIONS:

# Group A — CR-106-gating. These block wave 11; correct before the CR-106 Developer is dispatched.
.cleargate/delivery/pending-sync/CR-106_Execution_State_Event_Log.md:10 → update_state.mjs:78-99 becomes ":191-195 (atomicWrite) and :224 (the read)" — the span is no longer contiguous
.cleargate/delivery/pending-sync/CR-106_Execution_State_Event_Log.md:99 → update_state.mjs:78-79 → :193-194
.cleargate/delivery/pending-sync/CR-106_Execution_State_Event_Log.md:100 → update_state.mjs:99 → :224
.cleargate/delivery/pending-sync/CR-106_Execution_State_Event_Log.md:116 → ":116 and :122" → ":241 and :247"
.cleargate/delivery/pending-sync/CR-106_Execution_State_Event_Log.md:171 → update_state.mjs:78 → :193
.cleargate/delivery/pending-sync/CR-106_Execution_State_Event_Log.md:183 → :114-117 and :120-123 → :239-242 and :245-248
.cleargate/delivery/pending-sync/CR-106_Execution_State_Event_Log.md:225 → update_state.mjs:78-99 → ":191-195 + :224"
.cleargate/delivery/pending-sync/CR-106_Execution_State_Event_Log.md:118 → init_sprint.mjs:231-233 → still valid, no edit
.cleargate/delivery/pending-sync/CR-106_Execution_State_Event_Log.md:188 → init_sprint.mjs:231-233 → still valid, no edit
.cleargate/sprint-runs/SPRINT-39/plans/M4.md:1027 → :114-117 and :120-123 → :239-242 and :245-248
.cleargate/sprint-runs/SPRINT-39/plans/M4.md:1065 → update_state.mjs:78 → :193
.cleargate/sprint-runs/SPRINT-39/plans/M4.md:1071 → update_state.mjs:76-80 → :191-195
.cleargate/sprint-runs/SPRINT-39/plans/M4.md:1120 → :227-229 → :352-354
.cleargate/sprint-runs/SPRINT-39/plans/M4.md:1125 → :187-189 / :204-206 → :312-314 / :329-331
.cleargate/sprint-runs/SPRINT-39/plans/M4.md:1129 → :233-235 → :358-360
.cleargate/sprint-runs/SPRINT-39/plans/M4.md:1145 → ":116 and :122" → ":241 and :247"
.cleargate/sprint-runs/SPRINT-39/plans/M4.md:2220 → :116/:122 → :241/:247
.cleargate/sprint-runs/SPRINT-39/plans/M4.md:1032 → the "atomicWrite(stateFile" eviction grep now returns SEVEN hits (:241,:247,:280,:301,:318,:335,:366) — record the seven, the grep text itself is unchanged

# Group B — everything else in the tree
.cleargate/sprint-runs/SPRINT-39/plans/M4.md:456 → update_state.mjs:88 → :203
.cleargate/sprint-runs/SPRINT-39/plans/M4.md:565 → state-scripts.test.mjs:25-31 → :25-32
.cleargate/sprint-runs/SPRINT-39/plans/M4.md:602 → :229 → :354
.cleargate/sprint-runs/SPRINT-39/plans/M4.md:604 → :116, :122 → :241, :247
.cleargate/sprint-runs/SPRINT-39/plans/M4.md:606 → :77 → :192
.cleargate/sprint-runs/SPRINT-39/plans/M4.md:609 → :52-66 → :167-181
.cleargate/sprint-runs/SPRINT-39/plans/M4.md:611 → state-scripts.test.mjs:38-48 → :40-49
.cleargate/sprint-runs/SPRINT-39/plans/M4.md:2816 → :102,:110,:130,:135,:146,:166,:184,:201,:223 → :227,:235,:255,:260,:271,:291,:309,:326,:348
.cleargate/delivery/pending-sync/BUG-044_Update_State_Lost_Update_Race.md:12 → update_state.mjs:78-79,99 → :193-194,:224
.cleargate/delivery/pending-sync/BUG-044_Update_State_Lost_Update_Race.md:163 → update_state.mjs:78-79 and :99 → :193-194 and :224
.cleargate/delivery/pending-sync/SPRINT-39_Decomposition_Surfaces.md:130 → update_state.mjs:78-99 → ":191-195 + :224"
.cleargate/delivery/pending-sync/CR-085-Drive-Execution-Loop-States-Live.md:90 → update_state.mjs:217-242 → :342-367
.cleargate/delivery/pending-sync/BUG-039_State_Update_Never_Resolves_State_File.md:101 → cleargate-planning/.cleargate/scripts/update_state.mjs:71 → :186

# Group C — inside the committed tree; route to CR-106's existing N7 re-measure task row
.cleargate/scripts/state-scripts.test.mjs:444 → update_state.mjs:116/:122 → :241/:247
.cleargate/scripts/state-scripts.test.mjs:511 → "after the :99 read" → :224
.cleargate/scripts/state-scripts.test.mjs:519 → :102,:110,:130,:135,:146,:166,:184,:201,:223 → :227,:235,:255,:260,:271,:291,:309,:326,:348
.cleargate/scripts/state-scripts.test.mjs:551 → :184, :135 → :309, :260
.cleargate/scripts/state-scripts.test.mjs:554 → :184 → :309
.cleargate/scripts/state-scripts.test.mjs:560 → :135 → :260
.cleargate/scripts/state-scripts.test.mjs:654 → :227-229 → :352-354
.cleargate/scripts/state-scripts.test.mjs:752 → :116 and :122 → :241 and :247
.cleargate/scripts/state-scripts.test.mjs:755-757 → :155, :114-117, :120-123 → :280, :239-242, :245-248
.cleargate/scripts/state-scripts.test.mjs:760 → :116/:122 → :241/:247
.cleargate/scripts/state-scripts.test.mjs:773 → :114-117, :120-123 → :239-242, :245-248
.cleargate/scripts/state-scripts.test.mjs:820-821 → :116/:122 and :155/:176/:193/:210/:241 → :241/:247 and :280/:301/:318/:335/:366

# Still valid — measured, listed so nobody "fixes" them
.cleargate/sprint-runs/SPRINT-23/plans/M1.md:19,409,436 → update_state.mjs:8 → still valid (offset 0); companion "L191–207" → :316-332 but closed-sprint artefact, leave
.cleargate/sprint-runs/SPRINT-23/.reporter-context.md:48,438,465 → same, leave
.cleargate/wiki/bugs/BUG-039.md:31 → captured stack trace, historical evidence, leave
.cleargate/delivery/pending-sync/BUG-039_State_Update_Never_Resolves_State_File.md:58 → captured stack trace, leave
.cleargate/sprint-runs/SPRINT-14/plans/M3.md:54 → closed-sprint plan, leave

FLASHCARDS_PROPOSED:

2026-08-29 · #test-harness #danger · A read-patching test barrier dies silently when the code stops making that read — the tell is wall-clock, not a red
2026-08-29 · #concurrency #lockfile · Age-based stale-lock steal + an unconditional unlink release lets a stolen-from process delete the new holder's lock
2026-08-29 · #concurrency #danger · process.on('exit') covers process.exit() but NOT SIGINT/SIGTERM; pid-liveness steal is what makes a Ctrl-C leak self-heal
2026-08-29 · #citations #process · N7 also binds comments and test titles that cite ANOTHER file the same commit edits — not just self-citations
2026-08-29 · #concurrency #scope · A lockfile in one script serialises that script against itself, not the file against all writers; close_sprint.mjs still writes state.json unguarded
2026-08-29 · #dogfood-split · A behavioural change to .cleargate/scripts/** goes live on merge with zero soak, and staleness moves to the npm payload until prebuild runs
