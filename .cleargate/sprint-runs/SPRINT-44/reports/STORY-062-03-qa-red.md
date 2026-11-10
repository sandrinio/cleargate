# STORY-062-03 QA-Red

QA-RED: WRITTEN
RED_TESTS: cleargate-cli/test/commands/sprint-scope.red.node.test.ts (worktree .worktrees/STORY-062-03)
BASELINE_FAIL: 31 of 31 (0 pass) against the C3 stub; typecheck clean.

Coverage: @data outline (4 rows, real stamp/gate/ingest), @paths remove, no-op add, @rules outline (5 rows, each fingerprinting delivery/ before/after),
BUG-086 unwritten on BUG-999 refusal, Completed refusal, archived-id, state.json-without-.active, 3 precedence pairs, R8 unready warnings,
stale claim (Completed/archived SPRINT-41; no-file SPRINT-77), --json single line, R9 raw-bytes sha + chained expectSha, comment/sprint_goal/body preservation,
ingest failure -> warning, add/remove round trip, process.exit purity mock, cli.cwd resolution, CLI --help x2 and exit 1 spawn (absolute tsx/esm URL, tmp cwd).

Notes for Developer/Architect:
- Optional seams (now/getVersion/stampFn/gateFn/ingestFn) are passed via cast; frozen SprintScopeCli lacks them. Tests needing precise outcomes use no-op stamp/gate/ingest seams; the outline, JSON and sha tests use the real pipeline.
- Sprint stale-claim warning accepts "(completed)" or "(archived)" for the archived Completed SPRINT-41 case.
- Environment: in the worktree, real wikiIngestHandler throws ENOENT on src/wiki/templates/synthesis/active-sprint.md; this surfaces as an R7 warning (code 0), which the real-pipeline tests tolerate. Real gate refreshes last_gate_check and exits 1 on failing items without stderr (not an error), as the plan says.
- Divergence from plan: no `now` pinning in the real-pipeline outline; last_gate_check is asserted to differ from the 2020 seed.
- Unit tests for routeListKey/editYamlList/setYamlScalar exports are left to the Developer's sprint-scope.node.test.ts (names not frozen).
