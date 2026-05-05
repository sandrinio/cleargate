# DevOps Report — BUG-027

## Merge Result
- Sprint branch: sprint/S-26
- Story branch: story/BUG-027
- Merge commit SHA: bb81be25a195fbabd74a81397514a894d39bdeea
- Diff stat: 6 files changed, 1273 insertions(+), 78 deletions(-)
  - `.claude/hooks/token-ledger.sh` (modified)
  - `cleargate-cli/test/scripts/token-ledger-resolver.red.node.test.ts` (new)
  - `cleargate-cli/test/snapshots/hooks-snapshots.test.ts` (modified)
  - `cleargate-cli/test/snapshots/hooks/token-ledger.bug-027.sh` (new)
  - `cleargate-planning/.claude/hooks/token-ledger.sh` (modified)
  - `cleargate-planning/MANIFEST.json` (modified)

## Prebuild
- Run: `cd cleargate-cli && npm run prebuild`
- Result: 65 files → MANIFEST.json; 71 files → templates/cleargate-planning
- Exit code: 0

## Post-Merge Tests

### node:test (BUG-027 red test + combined invocation)
- Test files run: `test/scripts/token-ledger-resolver.red.node.test.ts`, `test/snapshots/hooks-snapshots.test.ts`
- Combined `npm test` result: 131 passed, 1 failed — exit code 1
- Failure classification: `hooks-snapshots.test.ts` imports vitest internals and cannot be executed under `tsx --test` (node:test runner). This is a pre-existing runner-collision (two-runner state established by CR-040 dropped per user direction in SPRINT-22+). The failure is NOT a regression introduced by BUG-027.

### node:test — BUG-027 red test (isolated, correct runner)
- Command: `npx tsx --test --test-reporter=spec test/scripts/token-ledger-resolver.red.node.test.ts`
- Result: 9 passed, 0 failed — exit code 0
- Scenarios covered:
  - Scenario 1: sentinel-first resolution — prior ledger row overrides transcript grep
  - Scenario 2: multi-epic transcript — sentinel+dispatch-marker overrides lexical-first grep
  - Scenario 3: no-sentinel fallback — dispatch-marker log overrides transcript grep
  - Scenario 4: snapshot-lock supersede — token-ledger.bug-027.sh must exist (byte-for-byte match confirmed)

### vitest — hooks-snapshots.test.ts (correct runner)
- Command: `npm run test:vitest -- test/snapshots/hooks-snapshots.test.ts`
- Result: 8 passed, 0 failed — exit code 0

## Mirror Parity Audit

Three-way diff: canonical ↔ npm payload ↔ snapshot

- `cleargate-planning/.claude/hooks/token-ledger.sh` ↔ `cleargate-cli/templates/cleargate-planning/.claude/hooks/token-ledger.sh` — diff empty (clean)
- `cleargate-planning/.claude/hooks/token-ledger.sh` ↔ `cleargate-cli/test/snapshots/hooks/token-ledger.bug-027.sh` — diff empty (clean)

All three paths are byte-identical. Mirror parity: CLEAN.

## Live Re-sync Required

The meta-repo's live `/.claude/hooks/token-ledger.sh` is gitignored and was NOT updated by prebuild. Re-sync required via `cleargate init` from the repo root (overwrites `/.claude/` from the npm payload). This is outside DevOps scope — flagged for the operator.

## State Transition
- Story state: Done (confirmed via state.json)
- Transitioned at: 2026-05-05T15:38:17.658Z

## Cleanup
- Worktree `.worktrees/BUG-027`: removed (--force required; working-tree dirt was stale orchestration artifacts from Dev/QA agents — story branch fully merged before removal)
- Branch `story/BUG-027`: deleted (was 12f4b8b)

## Script Incidents
- No script incidents recorded (update_state.mjs exited 0).
