# STORY-014-06 Dev Report

**Story:** STORY-014-06 — CLI flag plumbing  
**Commit:** f2d3831  
**Branch:** story/STORY-014-06  
**Status:** done

## Changes

- `cleargate-cli/src/commands/execution-mode.ts`: Added `sentinelFallback?: boolean` to `ExecutionModeOptions`. Added `resolveSprintIdFromSentinel(cwd?: string): string | null` as a new sibling export. Updated `readSprintExecutionMode` to apply sentinel fallback when `sprintId` is absent or `'SPRINT-UNKNOWN'`.
- `cleargate-cli/src/commands/sprint.ts`: Extended `sprintCloseHandler` opts signature to `{ sprintId: string; assumeAck?: boolean }`. Appends `'--assume-ack'` to the args array only when `opts.assumeAck === true`.
- `cleargate-cli/src/commands/state.ts`: Imported `resolveSprintIdFromSentinel`. `stateUpdateHandler` now resolves sprint ID via `cli?.sprintId ?? resolveSprintIdFromSentinel(cwd) ?? 'SPRINT-UNKNOWN'` (explicit flag wins, then sentinel, then unknown).
- `cleargate-cli/src/cli.ts`: Wired `--assume-ack` on `sprint close` (camelCase `opts.assumeAck`). Wired `--sprint <id>` on `state update` with key-omit pattern per flashcard #cli #commander #optional-key. Added `--sprint <id>` on `state validate` as well.
- `cleargate-cli/test/commands/sprint.test.ts`: Added 2 tests for Gherkin Scenario 1 (assume-ack propagates + no flag guard).
- `cleargate-cli/test/commands/state.test.ts`: Added 3 tests for Gherkin Scenarios 2/3/4 (sentinel read, --sprint override, empty sentinel fallthrough). Used real tmpdir with fixture files — no fs mocking.

## Test results

- Baseline: 805 passed (pre-existing failures: bootstrap-root needs Postgres, snapshot-drift needs mcp snapshot)
- After: 810 passed — 5 new tests, all green
- Typecheck: pass

## Deviations from plan

None. Implemented exactly the orchestrator decision: `resolveSprintIdFromSentinel` as a sibling export, `sentinelFallback` as a convenience on `ExecutionModeOptions`, callers in `state.ts` chain the two as the primary pattern. `stateValidateHandler` was not changed (it already takes explicit `sprintId` as positional arg).
