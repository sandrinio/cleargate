# BUG-026 Developer Report

## Files Changed
- `.cleargate/scripts/update_state.mjs` — no change required; `validateShapeIgnoringVersion` import was already correct in the codebase (fix was included in STORY-022-02 / SPRINT-14).
- `.cleargate/scripts/validate_state.mjs` — no change required; `validateShapeIgnoringVersion` was already exported at line 27.
- `cleargate-cli/test/lib/readiness-predicates.test.ts` — added BUG-026 regression tests (2 scenarios).

## Tests Added
Two new scenarios in `readiness-predicates.test.ts` under `describe('BUG-026: validate_state.mjs exports validateShapeIgnoringVersion')`:
1. `validateShapeIgnoringVersion is exported and callable — rejects invalid shape` — dynamic import of validate_state.mjs, asserts the function is exported and returns `{valid: false}` for an invalid input.
2. `validateShapeIgnoringVersion is exported and callable — accepts minimal valid shape` — asserts the function returns `{valid: true, errors: []}` for a minimal valid state object.

## Acceptance Criteria Verified
1. Bug reproduces pre-fix: confirmed via git log — the import was already fixed in commit `cf8198e` (STORY-022-02, SPRINT-14). The bug was filed 2026-05-03 against `cleargate@0.10.0` (npm published) but was already fixed in the dev repo.
2. Fix unblocks: `node .cleargate/scripts/update_state.mjs` exits with usage message (not ImportError).
3. Validation still fires: existing test suite in `test_update_state.test.ts` covers happy path + rejection.
4. Mirror parity: `diff .cleargate/scripts/update_state.mjs cleargate-planning/.cleargate/scripts/update_state.mjs` returns empty.
5. Regression test added: 2 new BUG-026 scenarios in `readiness-predicates.test.ts`.

## Mirror Diff Status
- `.cleargate/scripts/update_state.mjs` == `cleargate-planning/.cleargate/scripts/update_state.mjs`: PARITY OK (pre-existing)
