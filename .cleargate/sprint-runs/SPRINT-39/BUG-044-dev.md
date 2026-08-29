# BUG-044 — Developer report

role: developer · SPRINT-39 · wave 10 · M4 · BUG-044 — `update_state.mjs` lost-update race

## Lock design chosen

**Per-holder retry budget with progress reset, `LOCK_RETRY_BUDGET_MS = 2000`** — the design T3
marks as strongly preferred and the one QA-Red's harness is written against. Not a flat budget.

The deadline resets whenever the observed holder (`pid`+`at` from the lock payload) changes. A
lock whose holder keeps changing is making progress and is never refused on that basis; a lock
whose holder never changes is refused once its own 2s budget elapses. This sidesteps the
machine-speed-coupled `[7000, 9800]ms` flat window TPV measured — S1's twenty holders and the
addendum's ten each reset the deadline on every hand-off (holders change roughly every ~300ms
under the test barrier), so the last contender never actually hits its budget; a genuinely stuck
single holder (S5) is refused deterministically at ~2.2s.

Steal policy: `stale = !isPidAlive(pid) || ageMs > LOCK_STALE_AGE_MS` (5 minutes). Liveness is
the primary signal (`process.kill(pid, 0)`; `ESRCH` = dead, `EPERM` = alive, do not steal); the
age ceiling is a backstop only for a pid-recycled dead lock that liveness alone can't detect.
Retry sleep is `Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms)` — `main()` is
synchronous top-to-bottom, so no timer-based sleep is usable.

Release is registered as `process.on('exit', ...)` immediately on successful acquire — not a
`finally` — so it fires on all ten in-lock `process.exit()` sites plus every normal-completion
return from `main()`, and always strictly after `atomicWrite()`'s `renameSync()` has returned
(main()'s synchronous body, including the rename, always finishes before the process begins its
exit sequence).

## Measured wall-clock

Three consecutive full-suite runs at HEAD:

| Run | tests | suites | pass | fail | skipped | wall-clock |
|---|---|---|---|---|---|---|
| 1 | 15 | 13 | 15 | 0 | 0 | 14.95s |
| 2 | 15 | 13 | 15 | 0 | 0 | 15.94s |
| 3 | 15 | 13 | 15 | 0 | 0 | 14.62s |

Matches TPV's REF-C prediction (`14/14/0 in 4/4 runs, ~14s`) with T1's +1 case folding in cleanly.
Baseline (measured fresh, before any of my edits, same session): `tests 15 · suites 13 · pass 11 ·
fail 4 · skipped 0` — S1, S4, S5, and the QA-Red addendum red, everything else green. This is the
red-before/green-after evidence in lieu of a stash-and-rerun (the failing scenarios are QA-Red's,
not mine to stash; I captured the actual pre-edit run instead).

## Red → green, all four flipped

| Case | Result before | Result after |
|---|---|---|
| S1 — 20 concurrent, 20 distinct ids | RED (18/20 lost across QA-Red's reruns) | GREEN |
| S4 — dead-pid lock is stolen | RED | GREEN |
| S5 — live lock is respected | RED | GREEN |
| addendum — v1 seed, migration path | RED (9/10 lost, confirmed this session: `only 1 did`) | GREEN |

No test scenario was edited to make it pass. The only test-file edit is T5 (stale title).

## Must-stay-green — confirmed

Scenarios 1–6 (8 tests), S2, S3, and QA-Red round-2's T1 (green at baseline by design, stays green
under a correct — non-leaking — release) all green across all 3 runs.

## T5 applied

`state-scripts.test.mjs:186` title changed from `'creates state.json with schema_version=1, ...'`
to `'creates state.json with schema_version=SCHEMA_VERSION, ...'` — the body has asserted the
two-assertion form (`SCHEMA_VERSION` + pinned `3`) since commit A; only the title was stale.

## Constraint-by-constraint compliance

All eleven lock-design constraints from the dispatch verified against the diff:
`openSync(lockPath,'wx')`; acquire before the `:99`-equivalent read and enclosing both migration
`atomicWrite` calls; release via `process.on('exit')` registered immediately at acquire, not
`finally`; release covers all in-lock exit sites (process-wide hook, not per-site); release fires
after `renameSync` returns (structural — main()'s synchronous body always completes first); steal
guarded by both liveness (`EPERM` = alive) and an age ceiling; lock path exactly
`` `${stateFile}.lock` ``; per-holder budget with progress reset at 2000ms; `Atomics.wait` sleep;
one `openSync`+one `unlinkSync` on the happy path, `statSync` never added (only `readFileSync` on
the `EEXIST` branch).

## Do-not-touch list — respected

`migrateV1ToV2` (`:52-66` at baseline) signature and body unchanged. `atomicWrite`'s per-process
tmp naming (`:77` at baseline) unchanged — no tmp-file "hardening" added. No `.gitignore` edit
(T6). No test scenario logic edited or reshaped — only T5's title string.

## Report path note

Written to the main checkout (`sandrinio/cleargate` root), not the worktree, per FLASHCARD
2026-08-27 `#worktree #danger` cited in the dispatch — a worktree-relative report is destroyed by
`git worktree remove`.

---

STORY: BUG-044
STATUS: done
COMMIT: 871270d1 (branch `story/BUG-044`, worktree `.worktrees/BUG-044`)
TYPECHECK: n/a — plain `.mjs` scripts in `.cleargate/scripts/`, no TypeScript compilation step applies to this surface (BUG-044's declared file list is entirely outside `cleargate-cli/`; Cross-Cutting Rule 6's typecheck obligation binds only cli-touching items)
TESTS: 15 passed, 0 failed (3 consecutive runs, `.cleargate/scripts/state-scripts.test.mjs`, ~14.6–15.9s wall-clock each)
FILES_CHANGED:
  - /Users/ssuladze/Documents/Dev/ClearGate/.cleargate/scripts/update_state.mjs
  - /Users/ssuladze/Documents/Dev/ClearGate/cleargate-planning/.cleargate/scripts/update_state.mjs
  - /Users/ssuladze/Documents/Dev/ClearGate/.cleargate/scripts/state-scripts.test.mjs
NOTES: Implemented the per-holder-budget lock exactly as TPV's T3 ruling and the M4 plan's eleven
  constraints specify — no flat-budget fallback was needed, and no deviation from the Architect's
  plan or TPV's ruling was made. Both trees confirmed byte-identical (`diff` empty) after mirroring.
  Only test-file edit is T5 (stale title, assigned to this commit by the M4 plan's N3 ruling and
  TPV §3 T5). TPV's and QA-Red's proposed flashcards (4 + 3, listed in their own reports) remain
  unwritten pending orchestrator review — I have no additional surprise beyond what they already
  captured, so I flag none of my own.
r_coverage:
  - { r_id: "S1", covered: true, deferred: false, clarified: false }
  - { r_id: "S2", covered: true, deferred: false, clarified: false }
  - { r_id: "S3", covered: true, deferred: false, clarified: false }
  - { r_id: "S4", covered: true, deferred: false, clarified: false }
  - { r_id: "S5", covered: true, deferred: false, clarified: false }
  - { r_id: "addendum", covered: true, deferred: false, clarified: false }
  - { r_id: "T1", covered: true, deferred: false, clarified: false }
  - { r_id: "Scenarios 1-6", covered: true, deferred: false, clarified: false }
plan_deviations: []
adjacent_files:
  - ".cleargate/sprint-runs/SPRINT-39/state.json"
  - ".cleargate/scripts/validate_bounce_readiness.mjs"
flashcards_flagged: []
