# STORY-066-21 QA-Verify (role: qa)
STORY: STORY-066-21 | QA: PASS | TYPECHECK: pass | build: pass (worktree only)
Diff 5198aaa..a22e6b2: only §3.1 files; Dev diff 376c831..a22e6b2 touches no test file (sealed reds untouched); record_baseline/wave_runner/DERIVED_SPRINT_RUN_FILES untouched; no stash; sprintRoot is the only new export; sealLine key order and `sealed_sha`, verbatim trailer, `carried from the worktree:` / `not carried (the sprint dir has its own):` tails match the plan; SKILL/qa.md inserts in the right sections; `npm run gen:codex && npm run prebuild` leaves `git status` empty (Codex twins regenerated).
Reds: 4 files 8/8 pass. Regression list: 23 files, all 0 fail, 0 skipped.
Shell: cr080 pass. cr081 (scenario-6-qa-md-clause) and cr079 (provision-symlink-exists) exit 1 in BOTH this tree and a throwaway detached cli worktree at 5198aaa under a detached outer host: identical failures, pre-existing, not regressions. Residue scaffold/core/.cleargate/sprint-runs deleted in both; throwaway worktrees removed.
Replay (evidence/STORY-066-21/): `replay.sh` verbatim. Before (main 5198aaa) reproduces 4a: A1 exit 1 (`?? .cleargate/sprint-runs/`), A3 lists worktree sprint-run files, A4 root records absent, A5/B5/C1 exit 2 precondition, D1 exit 2 (` M .active`). After: A, B, B-parent-untouched, A3/B3 empty, seal line + trailer correct, A5/B5 done. C1/D1 ended step `state` exit 2 in the verbatim run: replay-script artifact (state() hand-writes state.json after A5 created events.jsonl, fold drift; merge+teardown succeeded, tail `carried from the worktree: 2 file(s)`). Re-run as replay-v2.sh (only change: `rm -f events.jsonl` in state(), flashcard 2026-11-15 #qa #proof-run) -> v2-after: all of A, B, C (done, carried 2 file(s), HAND-PLACED REPORT + hand jsonl in root), D (done, ` M .active`) pass; v2-before still fails at precondition as 4a.
Probe: sprint-root.mjs no arg exit 2; non-worktree path returned unchanged; nonexistent `.worktrees/x` unchanged.
Task Breakdown rows in story are unchecked (advisory; orchestrator copies at merge, rule 20).
Gate 4 note: plan's replay pass condition C1/D1 needs the events.jsonl reset; fix the plan's script text if reused for run 5.

## Amendment A verify

QA-Verify on `story/STORY-066-21` HEAD ac8f0c0. Verdict: **PASS**.

- Surface: `git diff --name-only 3ad3d7f..ac8f0c0` is exactly `scaffold/core/.cleargate/scripts/merge_story.mjs`. `git diff 376c831..ac8f0c0 -- test/` adds only `merge-story-carry-state.red.integration.node.test.ts`, via the `qa-red(` seal 2 commit (3ad3d7f). No sealed file was edited.
- Code matches A1 + A′: `CARRIED_LEDGERS`, `isCarriedOutput`, the A′ loop head, `dropped`, and the exact tail `not carried (per-checkout state, removed with the worktree): <rel>`.
- `npm run typecheck`: exit 0.
- Fresh shell, private TMPDIR, each file alone (tests/pass/fail):

| file | result |
|---|---|
| `expected-red-not-a-flag.red.node` | 1/1/0 |
| `bounce-readiness-runtime-state.red.integration` | 1/1/0 |
| `merge-story-carry-state.red.integration` (R2-T3) | 1/1/0 |
| `merge-story-carry.red.integration` | 3/3/0 |
| `sprint-root-outputs.red.integration` | 3/3/0 |
| `merge-story.red.node` | 2/2/0 |
| `merge-story.red.integration` | 8/8/0 |
| `merge-story-resume.red.integration` | 7/7/0 |
| `merge-story-amend-a.red.node` | 1/1/0 |
| `merge-story-amend-a.red.integration` | 3/3/0 |
| `merge-story-test-waiver.red.integration` | 2/2/0 |
| `test-command-env.red.integration` | 3/3/0 |

- `build-codex-payload.mjs --check` exit 0; `npm run prebuild` exit 0; worktree `git status` clean afterwards.
- replay-v2 A–D run against ac8f0c0's scaffold (A4): A, B, C, D all merge exit 0, step `done`. C tail is `carried from the worktree: 2 file(s)` (report and pre-gate.jsonl, carried as intended). D `.active` stays ` M` as in the prior run. The only diffs from the earlier `v2-after` run are timestamps and SHAs.
- Case E, by hand (`amendA/caseE.sh`):
  - E1 (untracked `events.jsonl` and `state.json`, plus a report): exit 0. The root `events.jsonl` has only the genesis and Done lines and no `wt-event` line. The report is carried (`carried from the worktree: 1 file(s)`). The tail has one `not carried (per-checkout state…)` line each for `events.jsonl` and `state.json`. The worktree is removed. `validate_state.mjs` on the root passes.
  - E2 (sprint dir committed, `state.json` shows ` M`): same outcome. `state.json` is reported, which is the A′ behaviour.
- Adversarial probe: no extra beyond E2's tracked-modified case. By design (A′), a tracked, modified carried output (` M reports/…` or a ledger) is residue with no line, which is out of scope and goes to intake.
- Task Breakdown rows: n/a, advisory.
- Evidence: `/Users/ssuladze/Documents/Dev/ClearGate/.cleargate/sprint-runs/SPRINT-46/evidence/STORY-066-21/amendA/{replay-v2/,caseE/,caseE.sh}`. Scratch dirs removed.
