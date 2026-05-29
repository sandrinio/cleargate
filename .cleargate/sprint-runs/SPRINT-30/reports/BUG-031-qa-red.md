# BUG-031 QA-Red Report

**Sprint:** SPRINT-30
**Story:** BUG-031 — `cleargate init` inherits a project_id from global state
**Mode:** RED
**Date:** 2026-05-19

## Summary

RED test file written and confirmed failing on old baseline (dist from main branch, no BUG-031 fix).

Both tests fail with the exact BUG-031 symptom: `ClearGate state: member (project: FAKE-GLOBAL-PID)` instead of `pre-member` in a fresh tmpdir repo.

## Test File

`cleargate-cli/test/integration/init-pre-member-isolation.red.node.test.ts`

## Baseline Failure

- **Test A:** FAIL — banner shows `member (project: FAKE-GLOBAL-PID)` instead of `pre-member`
- **Test B:** FAIL — banner shows `member (project: FAKE-GLOBAL-PID)` instead of `member (project: PER-REPO-PID-12345)`

BASELINE_FAIL: 2

## HOME Safety Guard

Present — `assertIsTmpDir(fakeHome, ...)` runs before any `cleargate doctor` invocation.

## Notes

- Tests confirm the leak is in `membership.ts:getMembershipState` reading `~/.cleargate/auth.json` without checking per-repo join evidence.
- Test B confirms that seeding `.cleargate/.join.json` has zero effect on the old baseline — the fix must add projectRoot-awareness to `getMembershipState`.
- dist/cli.js was copied from main repo (worktree has no node_modules for tsup build); this is the correct OLD baseline.
