# CR-031 Developer Report

## Files Changed
- `cleargate-cli/src/lib/readiness-predicates.ts` — extended `resolveLinkedPath()` with two additional candidates (pending-sync and archive paths). ~15 LOC added.

## Tests Added
Five new scenarios in `readiness-predicates.test.ts` under `describe('CR-031: resolveLinkedPath — searches pending-sync and archive')`:
1. Scenario 1: citer in pending-sync, target in pending-sync — resolves via candidate 1 (sibling, existing baseline)
2. Scenario 2: citer in pending-sync, target in archive — resolves via candidate 4 (the CR-031 bug case)
3. Scenario 3: citer in archive, target in archive — frozen pair resolves via candidate 1
4. Scenario 4: citer in archive, target in pending-sync — resolves via candidate 3
5. Scenario 5: sandbox preserved — `../../../etc/passwd` traversal rejected

## Acceptance Criteria Verified
1. Unit test Scenario 2 passes — "citer in pending-sync, target in archive" returns the archive path.
2. No regression — existing tests for `resolveLinkedPath` (candidates 1+2) still pass.
3. Sandbox preserved — test Scenario 5 confirms `../../etc/passwd` shape rejected.
4. Resolution order: pending-sync first (candidate 3), archive fallback (candidate 4) per spec.

## Mirror Diff Status
- `cleargate-cli/src/lib/readiness-predicates.ts` is a source-only file (no canonical mirror required).
