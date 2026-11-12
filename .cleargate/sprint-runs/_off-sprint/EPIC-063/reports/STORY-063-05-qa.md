# STORY-063-05 QA-Verify (role: qa)
QA: PASS
- typecheck clean; 149/149 pass across the 5 requested test files (0 fail, 0 skip).
- `git diff 1a84b1e 0a6d3ae -- test/` empty; `git diff main 0a6d3ae --stat -- test/dashboard` empty.
- C5 exports match: compile(state, repoRoot, templateDir?); readSprintRunState/parseSprintPlanTable (+status ok|missing|malformed) in src/lib/sprint-run-state.ts.
- collect.ts: extraction only (imports shared helpers; destructures same fields). BUCKET_SYNTHESIS_MAP untouched (G14).
- Both callers (wiki-build, wiki-ingest) pass cwd; parity tests green (R6).
- R1-R5, G16 ok/missing/malformed covered by active-sprint-sentinel.red tests.
- Smoke (scratch copy, .active empty): "No active sprint found"; Planned = SPRINT-18/31/37/42/43; Recently Completed = SPRINT-44/41/40; no SPRINT-14/15/28.
- Note: template emits extra blank lines (cosmetic, renderer-wide).
