# STORY-063-05 dev report
Commit on story/STORY-063-05. Typecheck clean; npm test 3900 tests, 3898 pass, 0 fail, 2 skipped.
- New src/lib/sprint-run-state.ts (readSprintRunState with status discriminator, parseSprintPlanTable) moved verbatim from collect.ts; dashboard output unchanged, test/dashboard untouched and green.
- active-sprint.ts: compile(state, repoRoot, templateDir?) uses resolveActiveSprint, TERMINAL_STATUSES, listSprintReports + generated_at, numericStem tie-break.
- Template: stale_warning section, active_line/item_lines fields (pre-rendered, no nesting).
- Callers: wiki-build compileActiveSprint call; wiki-ingest writeSynthesisPage gained cwd param. BUCKET_SYNTHESIS_MAP unchanged (G14).
- No existing test expectations changed.
