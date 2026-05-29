# DevOps Report — BUG-031

## Merge Result
- Sprint branch: sprint/S-30
- Story branch: story/BUG-031
- Merge commit SHA: 1a07f7fc
- Diff stat: 8 files changed, 431 insertions(+), 8 deletions(-)
- Merge strategy: ort (no-ff)

## Build
- dist rebuild triggered: yes (src/ files changed)
- Build result: success (tsup ESM + CJS + DTS, exit code 0)

## Post-Merge Tests
- Test files run:
  - `test/integration/init-pre-member-isolation.node.test.ts`
  - `test/commands/doctor-membership-banner.node.test.ts`
  - `test/commands/cli-gating.node.test.ts`
  - `test/commands/whoami.node.test.ts`
- Result: 30 passed, 1 failed
- Exit code: 1
- Failure: `whoami.node.test.ts` — "calls exit(5) when mcpUrl is not configured (no join performed)" — `undefined !== 5`
- Pre-existing baseline: confirmed by QA report. This failure predates BUG-031; no new regression introduced. All 30 other tests pass including the 2 new integration scenarios (Test A + Test B) and all 4 updated fixture suites.

## Mirror Parity Audit
- N/A — no canonical scaffold files changed (all changes confined to cleargate-cli/src/ and cleargate-cli/test/).

## State Transition
- Story state: Done (confirmed via state.json)
- Transitioned at: 2026-05-19T20:06:09Z

## Cleanup
- Worktree .worktrees/BUG-031: removed
- Branch story/BUG-031: deleted
