# BUG-044 — TPV (Test Pattern Validation) report

role: architect · SPRINT-39 · wave 10 · M4 · mode: TPV
Subject: `.worktrees/BUG-044` @ `e55431ec` (branch `story/BUG-044`)
Measured: 2026-08-29, Node v25.9.0, darwin 25.6.0, unloaded local machine

## TPV: rulings-required

**Survivors — the first three lines, as required.**

1. **M6 — release registered only on the happy paths (no `process.on('exit')`) SURVIVES CLEAN: 3/3 runs, `pass 14 · fail 0`.** The lock leaks on **nine** non-zero `process.exit(1|2)` sites that all fire *inside* the critical section (`update_state.mjs:102, :110, :130, :135, :146, :166, :184, :201, :223`). Directly demonstrated on three of them (see §1.M6). Nothing in the harness looks at the lock file after an error exit. **This is the highest-value uncovered mutant in the milestone** — its production consequence is a `.cleargate/sprint-runs/<id>/state.json.lock` that is **not gitignored** (`git check-ignore` exit 1), which makes the tree dirty, which makes `validate_bounce_readiness.mjs:98-101` hard-fail for **every subsequent story in the sprint**, with a diagnostic that says "git working tree is dirty" and never mentions `update_state`.
2. **M3 — lock released between `writeFileSync(tmp)` and `renameSync` SURVIVES 6 of 10 runs.** Caught only flakily and only by S1 (3/10) and the addendum (1/10). **S2 — the scenario the M4 plan assigns to exactly this mutant ("releasing the lock before `renameSync`") — was GREEN in 10 of 10 runs against it.** S2 does not kill its named mutant. S2 killed **zero** mutants in the whole battery.
3. **No third survivor** — the other eight mutants were all killed deterministically (3/3 each). But a third finding outranks a survivor: **the harness is over-constrained and will bounce a CORRECT implementation of the plan's own prescribed lock shape** unless its retry budget lands inside a ~2.8s window that nothing in the plan, the item, or the test states. See §2.E — this is the single most likely cause of a wasted Developer dispatch on this item.

---

## §0 — Method

Everything below was built, applied and measured **out of tree**. Nothing in
`.worktrees/BUG-044` or the main checkout was edited; `state-scripts.test.mjs` in the sandbox was
verified byte-identical to the worktree's at the end of the battery, and `update_state.mjs` was
restored to the committed baseline. Mutants have been destroyed.

Sandbox: a copy of `.cleargate/scripts/` into a scratch `git init` root, so `REPO_ROOT =
resolve(__dirname,'..','..')` still resolves to a git repo (Scenario 5 needs it). The sandbox
reproduces the worktree's reported baseline **exactly**: `tests 14 · suites 12 · pass 10 · fail 4 ·
skipped 0`.

Two reference implementations and ten mutants, all built from the same committed baseline by a
single generator; every variant `node --check`ed before use.

---

## §1 — Mutation battery

| # | Mutant | Survived? | Killed by |
|---|---|---|---|
| **M1a** | Lock wraps ONLY the five action-branch `atomicWrite` calls (`:155/:176/:193/:210/:241`); the `:99` read and both migration writes outside | no — 3/3 | **S1** + **addendum** |
| **M1b** | Lock acquired *after* the migration block, with an authoritative re-read inside it; `:116`/`:122` still outside | no — 3/3 | **addendum ONLY** (S1 green 3/3) |
| **M2** | Advisory lock — `openSync(lockPath,'w')` instead of `'wx'`; taken and released, never blocks | no — 3/3 | **S1**, **S5**, **addendum** (S4 green) |
| **M3** | Lock released between `writeFileSync(tmp)` and `renameSync` | **YES — 6/10** | S1 3/10, addendum 1/10; **S2 green 10/10** |
| **M4** | Lock acquired *after* the `:99` read — read-modify-write still racy under the lock | no — 3/3 | **S1** + **addendum** |
| **M5** | No liveness check, no age ceiling — a crashed writer's lock is never reclaimed | no — 3/3 | **S4 only** |
| **M6** | No `process.on('exit')`; release explicit and only on the happy paths → leaks on every error exit | **YES — 3/3, `pass 14 · fail 0`** | **none** |
| **M7** | `finally`-only release (plan Gotcha 1) | no — 3/3 | **S3 only** |
| **M8** | Unconditional steal — every existing lock treated as stale | no — 3/3 | **S1**, **S5**, **addendum** |
| **M9** | Lock path is a fixed global path, not `${stateFile}.lock` | no — 3/3 | **S4** + **S5** (S1 red 1/3) |

### M1 — the one that matters. QA-Red's claim is CORRECT, and now measured.

The dispatch asked whether the v1-seeded addendum actually kills a lock that misses the two
pre-action migration writes, and whether the other race scenarios genuinely cannot. Both halves
confirmed:

- **M1b** (`lock post-migration + authoritative re-read inside it`, migration writes at `:116`/`:122`
  left outside) is **green on S1 in 3/3 runs and red on the addendum in 3/3 runs.** S1's
  `schema_version: 3` seed means the migrator never executes, so the entire gap M1b introduces is
  invisible to it. The addendum is the **sole** killer.
- M1b is not a strawman: it runs the *fastest* of every variant tested that passes S1 (13–15s vs the
  reference's 22s), because its pre-lock read consumes the test barrier outside the critical section.
  A Developer who lands M1b sees a fast, green S1 and would ship it. **The addendum is load-bearing;
  it is not an extra.**
- **M1a** (lock scoped to the five action-branch writes only, read outside) is killed by S1 as well,
  because that shape also leaves the `:99` read outside. Both M1a and M1b must be in the Developer's
  head; only the addendum separates them.

### M6 — direct demonstration

Reference vs. M6 on three error exits, same fixture, lock path checked immediately after:

| Error path | Reference | M6 |
|---|---|---|
| `--qa-bounce` on an already-`Escalated` story (`:184`) — *Scenario 4's own second test does exactly this* | exit 1, lock clean | exit 1, **lock LEAKED** |
| story id not in `state.json` (`:135`) | exit 1, lock clean | exit 1, **lock LEAKED** |
| invalid state literal — e.g. the item's own bad `--state` form (`:223`) | exit 1, lock clean | exit 1, **lock LEAKED** |

Twelve `process.exit()` sites exist (the plan says thirteen — off by one). Under the plan's
prescribed acquire point, `:42` and `:94` fire before the lock; the other **ten** fire holding it.
S3 covers exactly one of them — `:229`, the no-op. **Nine are uncovered.**

### M3 — S2 does not do the job the plan assigned it

Ten runs of M3: fully green 6, S1 red 3, addendum red 1. **S2 green 10/10.** S2's window is a single
`renameSync` between an `unlink` and a `rename` — microseconds — and two processes are not enough to
land in it. S2 remains a legitimate *acceptance-coverage* row for the item's §5 case 2 ("file stays
valid JSON"), but its stated mutant is not killed and must not be claimed.

---

## §2 — Adjudications

### A. Is the determinism real? YES on the red side — and the barrier is not too permissive.

**12 consecutive baseline runs, 12 identical results:** `tests 14 · suites 12 · pass 10 · fail 4 ·
skipped 0`, with S1 / S4 / S5 / addendum red and S2 / S3 green in **every** run. Zero accidental
greens. Combined with QA-Red's 18/18 that is **30/30**.

The "too permissive" direction is the one that actually needed testing, and it is clean. The barrier
is not merely non-flaky, it is *aggressive*: at baseline S1 preserves only **2–5 of 20** transitions
(6 runs kept 2, 3 kept 3, 1 kept 4, 2 kept 5) and the addendum preserves **1–3 of 10** (9 runs kept
1). Note for the record: QA-Red's report says S1 "loses 1–5 of 20" — inverted; it *keeps* 2–5 and
loses 15–18. Correct the figure before quoting it.

The decisive anti-vacuity check — **does a correct implementation actually go green?** — passes.
Three independent correct implementations reach `tests 14 · pass 14 · fail 0 · skipped 0`:

| Implementation | Result | Runs | Wall |
|---|---|---|---|
| REF (plan shape: acquire after `:92-95`, before the `:99` read; flat budget 9000ms) | 14/14/0 | 3/3 | ~22s |
| REF (same, flat budget 7000ms) | 14/14/0 | 3/3 | ~20s |
| REF-C (plan shape; **per-holder budget 2000ms, deadline resets when the holder changes**) | 14/14/0 | **4/4** | ~14s |
| REF-B (authoritative re-read inside the lock, throwaway pre-lock read; budget 2000ms) | 14/14/0 | 3/3 | ~10s |

**Verdict: the race is real, the barrier opens it every time, and the tests are satisfiable.**

### B. Commit A — correct, clean, masks nothing. One cosmetic residue.

`3` is genuinely right, not test-agrees-with-code. Four independent witnesses, all read directly:

- `.cleargate/scripts/constants.mjs:31` — `export const SCHEMA_VERSION = 3;`
- `.cleargate/scripts/state.schema.json:17-21` — `"schema_version": { "type": "integer", "const": 3 }`
- `.cleargate/scripts/init_sprint.mjs:221` — writes `schema_version: SCHEMA_VERSION`
- `.cleargate/scripts/_migrate-schema-v3.mjs:39-40` — bumps to 3; and the live
  `.cleargate/sprint-runs/SPRINT-39/state.json` carries `"schema_version": 3`

The two-assertion form is exactly N3 part 2 — `strictEqual(state.schema_version, SCHEMA_VERSION)`
(the contract) **and** `strictEqual(SCHEMA_VERSION, 3)` (the deliberate pin). The self-fulfilling
single-assertion trap N3 names is avoided. Commit A's diff is 11 insertions / 3 deletions, confined
to `state-scripts.test.mjs`; it also pre-stages `spawn` and `pathToFileURL` imports for commit B
(unused at commit A, harmless, intermediate measured 8/8/0). Reporting it as a separate commit rather
than folding it into the red count was the right call.

**Residue (T5):** the test *title* at `state-scripts.test.mjs:186` still reads `'creates state.json
with schema_version=1, …'` while the body now asserts 3. A stale title, left behind by the commit
whose entire purpose was to delete a stale assertion — and this sprint's own context file names
stale test titles as "the exact class of stale prose this sprint exists to remove"
(`sprint-context.md`, STORY-054-01 post-flight). One-line fix.

### C. 14 / 10 / 4 reconciled against the plan's 12 / 8 / 4 — QA-Red's arithmetic holds; one of its two green justifications does not.

Reconciliation confirmed: 8 pre-existing tests + 6 new = 14; 8 + S2 + S3 = 10 pass; S1 + S4 + S5 +
addendum = 4 fail. QA-Red wrote six cases rather than four and reconciled the difference instead of
force-fitting the plan's number. That was correct, and the plan's `12/8/4` was an un-measured guess —
mine. Measurement wins.

Per-green adjudication:

- **S3 — justified. Kills its named mutant, measured.** M7 (`finally`-only release, the plan's
  headline Gotcha 1) goes **red on S3 in 3/3 runs**, and on S3 *alone*. The killing assertion is
  `:594` (`!existsSync(lockFile)` after the no-op), not the third-invocation hang: the leaked lock's
  pid is already dead, so a correct steal would rescue the third call. S3 asserts both, and the
  residual-lock assertion is the one that fires. **The plan called S3 the highest-value case in the
  milestone; that is confirmed** — it is the only killer of M7 and the only lock-hygiene assertion in
  the file.
- **S2 — NOT justified as written.** Its claimed mutant survives it 10/10 (see §1.M3). Keep the case
  for §5-case-2 acceptance coverage; strike the mutant claim.
- **The extra scenario is the migration one, and it is the sole killer of M1b.** Confirmed (§1.M1).

### D. R1 fitness — the harness CANNOT carry CR-106's precondition as it stands. Two blockers, both nameable.

`command grep -rn "state-scripts"` across `.cleargate/scripts/`, `.claude/`, `cleargate-planning/`,
`cleargate-cli/package.json`, `cleargate-cli/scripts/`, `.github/` returns **exactly two hits, both
inside the file's own docstring** (`:2`, `:6`) — unchanged from N3's measurement, after four QA-Red
commits. `.cleargate/config.yml` `gates.precommit` is
`npm --prefix cleargate-cli run typecheck && npm --prefix cleargate-cli test` — the **cli** suite;
this file is in the **outer** repo and is not in that glob. The only installed hook is
`.claude/hooks/pre-commit-surface-gate.sh`. **Nothing executes this file. R1 is not satisfied by
BUG-044 as committed.**

Ruling: **mechanically wireable, but not wired, and the cost figure it would be wired on is wrong.**

- **What must happen (T4).** Adding a runner is *outside* BUG-044's three-row file surface and would
  trip its own kick-back criterion 7. It is CR-106's, per R1. What BUG-044 owes CR-106 is the
  **green** half of the precondition and an accurate cost, not the wiring.
- **The cost figure must be corrected before anyone wires it.** QA-Red's report estimates "roughly
  5–10s wall-clock". **Measured post-fix: 14s (REF-C), 20–22s (flat-budget plan shape).** Baseline is
  ~4s. A per-commit gate would pay 14–22s **on every commit in the repo**, and S5 alone spends its
  entire retry budget deliberately doing nothing. Whoever wires this must either accept that or gate
  it behind a changed-path filter on `.cleargate/scripts/**`.
- Second correction for the wiring decision: this file spawns **32 real `node` child processes** per
  run (S1 20, addendum 10, S2 2) plus ~10 `spawnSync`. Under a parallel test runner or a loaded CI
  box, S1's serialized lock-holding time grows and can collide with S5's fixed 10s ceiling — see §2.E.
  **Do not run this file with `--test-concurrency > 1`.**

### E. NEW — the harness silently constrains the implementation. Measured, and it will bounce a correct Developer.

This was not in the dispatch's battery. It is the finding most likely to cost a dispatch.

The barrier shim arms on the **first** `readFileSync` of the state file. Under the plan's prescribed
lock shape (acquire *before* the `:99` read — Gotcha 2, kick-back criterion 4), that first read is
**inside** the critical section. Consequence: every serialized lock holder pays the barrier's full
300ms `CG_TEST_BARRIER_INACTIVITY_MS` window while holding the lock. S1's twenty processes therefore
serialize into ~6s of lock-holding, so the last contender must wait ~6s to acquire.

Measured, three runs each, correct implementations differing **only** in `LOCK_RETRY_BUDGET_MS`:

| Flat budget | Result | S1 suite duration | S5 suite duration |
|---|---|---|---|
| 2000ms | **12/14 — S1 and addendum RED 3/3** | 2.9–3.6s (aborts) | 2.27–2.31s |
| 5000ms | **13/14 — S1 RED 3/3** | 6.18–6.76s | 5.16–5.43s |
| 7000ms | 14/14 green 3/3 | 5.86–6.48s | 7.15–7.16s |
| 9000ms | 14/14 green 3/3 | 6.08–6.44s | 9.17–9.20s |

The failure at 2000/5000 is **not** a lost update. It is `every invocation should exit 0` at `:490`,
`1 !== 0`, with stderr `could not acquire lock … held by pid N` — the lock is *correct* and the
budget is *too small*. The custom message printed one line lower (`:501`) blames "'wx' exclusive lock
missing, acquired after the :99 read, or not held across the full read-modify-write window" — all
three of which are false in that case.

- **Lower bound** ≈ 6.5–7s, and it **scales with machine speed and load**.
- **Upper bound** ≈ 9.8s, **fixed**: S5 asserts `elapsedMs < 10000` and its `spawnSync` carries
  `timeout: 10000`; measured S5 duration is budget + ~160ms.
- **Admissible window on this machine: ~[7000, 9800]ms — about 2.8s wide, and it narrows to nothing
  on a machine ~1.6× slower.** Nothing in the item, the plan, or the test says so.

**This does not invalidate the baseline** — the constraint is satisfiable and three correct
implementations satisfy it. It means the constraint must be *handed to the Developer*, and the
better answer is to remove the coupling rather than tune a number into it. See T3.

---

## §3 — Rulings

### T1 — BLOCKING, routes to QA-Red. One case, closing M6.

Add a scenario asserting that **an error exit leaves no lock file**. Minimal sufficient form: seed a
valid v3 fixture, run `update_state.mjs <ID> --qa-bounce` against an already-`Escalated` story (exit
1, the `:184` path — Scenario 4's second test already builds this exact fixture), then assert
`!fs.existsSync(stateFile + '.lock')`. Cover at least a second path (`:135` story-not-found) in the
same case. This is ~15 lines, is deterministic (no concurrency), and is the **only** thing standing
between the milestone and a mutant that ships a sprint-halting dirty tree while showing `pass 14 ·
fail 0`.

This case is **green at baseline** — today's code writes no lock at all, so `!existsSync` passes
vacuously; it goes red only under M6. That is correct and must not be "fixed": it is a
green-at-baseline regression guard of exactly the same class as S3, and QA-Red must report it as
such rather than reshaping it to be red.

Harness line after T1: `tests 15 · suites 13 · pass 11 · fail 4 · skipped 0` at QA-Red HEAD, and
`tests 15 · suites 13 · pass 15 · fail 0 · skipped 0` after the fix.

### T2 — Correct the record. S2's mutant claim is struck.

`BUG-044-qa-red.md`'s per-scenario table asserts S2 "guards releasing the lock before `renameSync`".
Measured false: M3 survives S2 10/10. S2 stays (it is the item's §5 case 2), with its justification
rewritten to "file stays valid JSON under a same-story race". **M3 is accepted as a documented
residual** — a deterministic test for a single `renameSync` window is not worth a second shim.
Compensating control: **QA-Verify must read the `update_state.mjs` diff and confirm the release
happens strictly after `renameSync` returns.** No test enforces it.

### T3 — BLOCKING on the Developer. Lock design, with the measured constraint.

Implement the retry budget **per-holder, not per-total**: record the current holder's identity
(`pid` + `at` from the lock payload) and **reset the deadline whenever the holder changes**. A lock
whose holder keeps changing is making progress and is not stuck; a lock whose holder never changes is.
Measured: `LOCK_RETRY_BUDGET_MS = 2000` with progress-reset → **14/14/0 in 4/4 runs, ~14s**. It
satisfies S1 (twenty holder changes, each resetting) and S5 (one holder, never changes, refuses at
~2.2s) simultaneously, with a production-sane number and **no machine-speed coupling**.

If a flat total budget is used instead, it MUST be **8000ms** (centre of the measured `[7000, 9800]`
window) and the Developer must state in the code comment that the lower bound is a test-harness
artifact. Any flat value ≤5000 is red on S1; any ≥9800 is red on S5.

### T4 — R1 is NOT satisfied by BUG-044. Carry it to CR-106 with corrected numbers.

BUG-044 delivers the *green*; CR-106 (or the orchestrator) delivers the *runner* — adding one is
outside BUG-044's three-row surface and trips its own kick-back criterion 7. Hand CR-106 three
corrected facts: (a) post-fix wall-clock is **14–22s**, not 5–10s; (b) the file spawns **32 real node
child processes** per run; (c) it must run **single-concurrency** — S1's lock-serialization time is
already within ~3s of S5's hard 10s ceiling, and a parallel runner closes that gap.

### T5 — Fix the stale title. `state-scripts.test.mjs:186` still says `schema_version=1`.

### T6 — Do NOT add `.gitignore`. Ruled, so nobody spends a dispatch on it.

`.cleargate/sprint-runs/*/state.json.lock` is not gitignored, and `validate_bounce_readiness.mjs:98`
hard-fails on any dirty tree. The correct mitigation is **not** an ignore rule (which would add a
fourth row to a three-row surface and hide a real signal); it is the `process.on('exit')` release
registered at acquire, which the reference measured clean on all three error paths, plus the
liveness steal for the `SIGKILL` residue. **Operational note for the orchestrator:** if a wave-11/12/13
transition ever reports "git working tree is dirty", check for
`.cleargate/sprint-runs/SPRINT-39/state.json.lock` and `rm` it before anything else.

---

## §4 — Numbers for the Developer's dispatch

**Expected harness line after the fix** — `node --test .cleargate/scripts/state-scripts.test.mjs`:

- with T1 applied: **`tests 15 · suites 13 · pass 15 · fail 0 · skipped 0`**
- without T1: `tests 14 · suites 12 · pass 14 · fail 0 · skipped 0`

Report it verbatim (N3 part 3). Do not pipe the run through `tail`/`head` (N10).
Wall-clock: **~14s** with the T3 design; ~20–22s with a flat budget. Baseline today is ~4s.

**Red → green — all four must flip, none may be edited:**

| Case | Line | Fails today because |
|---|---|---|
| S1 — 20 concurrent, 20 distinct ids | `:473` | keeps only **2–5 of 20** transitions (12/12 runs) |
| S4 — dead-pid lock is stolen | `:627` | `the stale lock should not survive a successful invocation` — today's code never reads `.lock` |
| S5 — live lock is respected | `:667` | `got status 0` — today's code proceeds straight past a live lock |
| addendum — v1 seed, migration path | `:719` | keeps only **1–3 of 10** transitions (12/12 runs) |

**Must stay green — 10 tests, no exceptions:** Scenarios 1–6 (8 tests, `:186`–`:434`), plus **S2**
(`:531`) and **S3** (`:582`). S3 is the M7 tripwire; if S3 goes red the release mechanism is wrong,
not the test.

**Lock design constraints — each proven necessary by a measured mutant:**

1. **`openSync(lockPath, 'wx')`.** `'w'` (M2) → red on S1, S5, addendum.
2. **Acquire before the `:99` read.** Acquiring after it (M4) → red on S1 + addendum.
3. **The critical section must extend across `:116` and `:122`.** Skipping them (M1b) → red on the
   **addendum only**; S1 stays green and *fast*. This is the trap.
4. **Release via `process.on('exit')` registered immediately at acquire.** `finally` (M7) → red on S3.
5. **Release must fire on all ten in-lock exits, not just `:229`.** (M6 — currently unguarded; T1.)
6. **Release strictly after `renameSync` returns.** (M3 — currently unguarded; T2, QA-Verify reads the diff.)
7. **Steal guarded by BOTH pid liveness and an age ceiling.** Neither (M5) → red on S4. Unconditional
   (M8) → red on S1, S5, addendum. `process.kill(pid,0)` throwing **`EPERM` means ALIVE** — do not steal.
8. **Lock path exactly `` `${stateFile}.lock` ``.** A global path (M9) → red on S4 + S5.
9. **Per-holder retry budget with progress reset, 2000ms** (T3). Flat budgets ≤5000 → red on S1;
   ≥9800 → red on S5.
10. **`Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms)`** for the retry sleep —
    `main()` is synchronous top-to-bottom (`:246`); `setTimeout` cannot work. Confirmed in the
    reference.
11. **One `openSync` + one `unlinkSync` on the happy path.** The reference stats the lock only on the
    `EEXIST` branch. Do not add a `statSync` to the uncontended path.

**Unchanged constraints from the plan, restated because they are still true:** both trees byte-identical
in the same commit (`diff .cleargate/scripts/update_state.mjs
cleargate-planning/.cleargate/scripts/update_state.mjs` empty — confirmed empty today, both 246
lines); no file outside the three-row surface; no git hook inside `cleargate-cli`; never `--no-verify`.

---

## §5 — Proposed flashcards (NOT written — orchestrator's call)

- `2026-08-29 · #test-harness #tpv #danger · A cross-process barrier that fires INSIDE the critical section makes every serialized lock holder pay its inactivity window — S1's 20 holders forced a correct impl's retry budget into a 2.8s window. [SPRINT-39 BUG-044 TPV]`
- `2026-08-29 · #test-harness #tpv · A lock test that only checks the happy path and the no-op misses every error exit; 9 of 10 in-lock process.exit sites were uncovered and the leaking mutant scored pass 14 fail 0. [SPRINT-39 BUG-044 TPV]`
- `2026-08-29 · #tpv #danger · A scenario's CLAIMED mutant is a hypothesis until measured — S2 was green 10/10 against the exact mutant the plan assigned it. [SPRINT-39 BUG-044 TPV]`
- `2026-08-29 · #test-harness #tpv · Mutation-test the FIX too, not just the bug: three correct implementations differing only in one constant scored 12/14, 13/14 and 14/14. [SPRINT-39 BUG-044 TPV]`

## §6 — Script Incidents

None. No `run_script.sh`-wrapped script was invoked; all measurement was `node --test` and `git`
read-only inspection.
