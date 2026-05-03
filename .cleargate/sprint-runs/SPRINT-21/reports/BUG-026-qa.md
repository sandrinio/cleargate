# BUG-026 QA Report

## Criteria Covered
1. Bug reproduces pre-fix — PASS. `git log --all -G "validateShapeIgnoringVersion" -- .cleargate/scripts/update_state.mjs` returns commit `cf8198e` (feat(STORY-022-02): SPRINT-14 M3). The import was fixed before this sprint; the bug was filed against the npm-published 0.10.0 (stale vs dev repo). Developer's claim verified.
2. Fix unblocks — PASS. `grep "validateShapeIgnoringVersion" .cleargate/scripts/update_state.mjs` at line 27 (import) and line 105 (call). `grep "export function validateShapeIgnoringVersion" .cleargate/scripts/validate_state.mjs` at line 27.
3. Validation still fires — PASS. BUG-026 test Scenario 2 (accepts minimal valid shape) + Scenario 1 (rejects invalid shape) directly test this.
4. Mirror parity — PASS. `update_state.mjs` mirrors byte-equal (pre-existing parity, not changed in this commit).
5. Regression test added — PASS. 2 tests in `cleargate-cli/test/lib/readiness-predicates.test.ts` under `describe('BUG-026: validate_state.mjs exports validateShapeIgnoringVersion')`.

## Criteria Missing
None.

## Regressions Checked
Stale absolute path hardcodes (`/Users/ssuladze/Documents/Dev/ClearGate`) replaced with `SMOKE_REPO_ROOT` in 5 locations across the test file. Correct fix; no pre-existing test semantics changed.

## Mirror Diff Status
`.cleargate/scripts/update_state.mjs` == `cleargate-planning/.cleargate/scripts/update_state.mjs`: PARITY OK (no change in this commit).

## Verdict: PASS
BUG-026 was already fixed in STORY-022-02. Developer correctly identified this and added 2 regression tests ensuring the export cannot silently break again. Acceptance criteria 1–5 satisfied.
