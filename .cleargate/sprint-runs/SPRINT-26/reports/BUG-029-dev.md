# BUG-029 Developer Report

**Story:** BUG-029 — Parallel-eligible story dispatches silently serialize
**Commit:** f16645e
**Branch:** story/BUG-029
**Status:** done

## Summary

Three-file fix (28 lines net) addressing the root cause identified in §6 Spike Findings:

1. **write_dispatch.sh** — replaced `.dispatch-${SESSION_ID}.json` with `.dispatch-${TS_EPOCH}-$$-${RANDOM}.json`. Two parallel Task() spawns from the same orchestrator session now each produce a distinct on-disk dispatch marker.

2. **pending-task-sentinel.sh** — replaced `.pending-task-${TURN_INDEX}.json` with `.pending-task-${TURN_INDEX}-$$-${RANDOM}.json`. Two Agent calls in the same assistant message (same TURN_INDEX) now each get a distinct sentinel file.

3. **token-ledger.sh** — replaced `ls -t .dispatch-*.json | head -1` (newest-file lookup) with content-based (work_item_id) tuple-match. Hook now extracts the work_item_id from the SubagentStop transcript's first user message using a non-capture-group jq scan (supports both digit-keyed IDs like STORY-002-03 and letter-suffix IDs like STORY-A), then iterates dispatch files to find a content match. Newest-file fallback retained when no tuple match found (logged warning).

**Mirror chain:** canonical + live .claude/hooks/ + templates/cleargate-planning/ (prebuild) all synced.

**Snapshot:** `token-ledger.bug-029.sh` created as new authoritative baseline. `token-ledger.bug-027.sh` updated to current canonical per the Red test error message instruction (`token-ledger-resolver.red.node.test.ts` line 564). `hooks-snapshots.test.ts` updated to byte-check against `bug-029.sh` and demote `bug-027.sh` to existence-only.

## Tests

- `parallel-dispatch.red.node.test.ts`: 6/6 pass
- `npm test` (node:test): 146/146 pass
- `npm run test:vitest`: 1628 passed, 31 failed — all 31 failures are pre-existing (ENOENT for mcp/package.json, ENOENT for .claude/hooks/pre-tool-use-task.sh in worktree, "No test suite found" for .node.test.ts files vitest picks up but cannot run). Zero regressions introduced by this fix.
