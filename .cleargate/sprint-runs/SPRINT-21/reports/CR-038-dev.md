role: developer

# CR-038 Dev Report

## Summary

Implemented CR-038: sprint preflight Step 0 — stale `cached_gate_result` refresh.

## Files Changed

1. `cleargate-cli/src/commands/sprint.ts`
   - Added `RefreshResult` interface
   - Added `refreshScopedGateCaches(sprintId, cwd, execFn): RefreshResult` helper using existing `findSprintFile`, `extractInScopeWorkItemIds`, `findWorkItemFileLocal`, `TERMINAL_STATUSES`, `parseFrontmatter`
   - Wired as Step 0 in `sprintPreflightHandler` before the existing 5-check accumulator block
   - Step 0 output format: `Step 0: refreshed N items, M errors.\n` + bullet lines for errors
   - Step 0 never calls `exitFn(1)` — it is purely informational/restorative

2. `cleargate-cli/test/commands/sprint-preflight.test.ts`
   - Updated `seedReadinessFixture` execFn to also intercept `gate check` commands (M2 plan: "Tests should NOT spawn real cleargate gate check") — returning empty string for success
   - Added `seedStep0Fixture` helper for CR-038 test scenarios
   - Added 5 new scenarios (15–19) per M2 plan

## Test Results

- 23/23 tests pass in `sprint-preflight.test.ts` (18 existing + 5 new)
- 5 new tests fail without the sprint.ts implementation (verified by stash test)
- 18 existing tests unaffected by Step 0 addition (Step 0 outputs `refreshed 0 items, 0 errors.` for fixtures without `## 1. Consolidated Deliverables`)

## Deviation from Plan

Output format changed from conditional `, N errors` (when >0) to always-included `, N errors` to match M2 plan scenario 1 expectation: "Step 0 reports refreshed 5 items, 0 errors". The M2 sketch showed conditional `errMsg` but the acceptance scenario text required unconditional format.

## Pre-existing Failures

55 tests fail in the full suite but all are pre-existing on the base branch (verified). Affected files: `cli.test.ts` (needs dist build), `bootstrap-root.test.ts`, `foreign-repo.test.ts` (integration), `pre-tool-use-task.test.ts`, `scaffold-cli-resolution.test.ts`, `sprint-execution-mirror.test.ts`, `mcp/package.json` absent in worktree.
