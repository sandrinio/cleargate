# DevOps Report — BUG-029

## Merge Result
- Sprint branch: sprint/S-26
- Story branch: story/BUG-029
- Merge commit SHA: ef3e7d9
- Diff stat: 10 files changed, 1575 insertions(+), 38 deletions(-)
- Files merged:
  - `.claude/hooks/token-ledger.sh` (force-tracked live hook)
  - `.cleargate/scripts/write_dispatch.sh`
  - `cleargate-cli/test/scripts/parallel-dispatch.red.node.test.ts` (new)
  - `cleargate-cli/test/snapshots/hooks-snapshots.test.ts`
  - `cleargate-cli/test/snapshots/hooks/token-ledger.bug-027.sh` (rolling baseline update)
  - `cleargate-cli/test/snapshots/hooks/token-ledger.bug-029.sh` (new)
  - `cleargate-planning/.claude/hooks/pending-task-sentinel.sh`
  - `cleargate-planning/.claude/hooks/token-ledger.sh`
  - `cleargate-planning/.cleargate/scripts/write_dispatch.sh`
  - `cleargate-planning/MANIFEST.json`

## Prebuild
- Run: `cd cleargate-cli && npm run prebuild`
- Result: 65 files → MANIFEST.json; 71 files → cleargate-cli/templates/cleargate-planning
- Exit code: 0

## Post-Merge Tests
- Test files run:
  - `test/scripts/parallel-dispatch.red.node.test.ts`
  - `test/snapshots/hooks-snapshots.test.ts`
- BUG-029 scenarios:
  - Scenario 1: write_dispatch.sh parallel-session collision — PASS
  - Scenario 2: pending-task-sentinel TURN_INDEX collision — PASS
  - Scenario 3: token-ledger SubagentStop matches dispatch marker by (work_item, agent) tuple — PASS
- Result: 146 passed, 1 pre-existing failure (vitest internal state error from tsx --test picking up MCP vitest file via broad glob; confirmed pre-existing per dispatch note "Disregard pre-existing tsx ENOENT + vitest mcp ENOENT")
- Exit code: 1 (pre-existing; not attributable to BUG-029 changes)

## Mirror Parity Audit
- `cleargate-planning/.claude/hooks/token-ledger.sh` vs `cleargate-cli/templates/cleargate-planning/.claude/hooks/token-ledger.sh` — diff empty (clean)
- `cleargate-planning/.claude/hooks/pending-task-sentinel.sh` vs `cleargate-cli/templates/cleargate-planning/.claude/hooks/pending-task-sentinel.sh` — diff empty (clean)
- `cleargate-planning/.cleargate/scripts/write_dispatch.sh` vs `cleargate-cli/templates/cleargate-planning/.cleargate/scripts/write_dispatch.sh` — diff empty (clean)
- `cleargate-planning/.claude/hooks/token-ledger.sh` vs `cleargate-cli/test/snapshots/hooks/token-ledger.bug-029.sh` — diff empty (clean; snapshot is byte-identical to canonical)

## Live Re-sync Required
The meta-repo's live `/.claude/hooks/token-ledger.sh` and `/.claude/hooks/pending-task-sentinel.sh` are gitignored. Changes from BUG-029 landed in canonical (`cleargate-planning/.claude/hooks/`) and the npm payload (via prebuild) but do NOT auto-propagate to the live dogfood instance. Run `cleargate init` from the repo root to re-sync the live `/.claude/` instance, or hand-port the specific changed blocks. Until re-synced, the live hooks remain on the pre-BUG-029 logic (non-uniquified dispatch markers, non-tuple SubagentStop matching).

## State Transition
- Story state: Done (confirmed via state.json)
- Transitioned at: 2026-05-05T17:34:10.503Z
- Script: `.cleargate/scripts/update_state.mjs` via `run_script.sh` wrapper

## Cleanup
- Worktree `.worktrees/BUG-029`: removed (--force required; session artifacts present)
- Branch `story/BUG-029`: deleted (was f16645e)
