# STORY-063-10 QA-Verify (role: qa, off-sprint EPIC-063 M2)

STORY: STORY-063-10
QA: PASS
TYPECHECK: pass (npm run typecheck, exit 0)
TESTS: targeted 202 pass / 0 fail / 0 skipped (decisions-unit, -page, -wiring, synthesis-parity, index-lint-config); live corpus test 1/1 pass. Full suite not re-run (orchestrator decision 11; Dev: 4714 run, 0 fail).
ACCEPTANCE_COVERAGE: 5 of 5 Gherkin scenarios (plus Outline rows) map to passing red-now-green tests; R1-R9 covered
MISSING: none
REGRESSIONS: none

## Checks
1. Gherkin -> code -> test: scenarios 1-5 plus the placeholder Outline, R1-R9, map to QA-Red's decisions-unit / decisions-page / decisions-wiring files (see qa-red report scenario map); all pass against a78b744.
2. Test integrity: `git diff 0255c20 a78b744 -- test` touches only the two permitted files. synthesis-parity: 7 map pins each gain `decisions` (same deepStrictEqual, sorted compare, expected list extended; shape change, not a loosening). index-lint-config: "one line per open item" -> "every open item once" per G-M2-56; other assertions (`archive as counts`, no `one row per page`) kept. No decisions-*.ts or _decisions-support.ts change after 0255c20.
3. G-M2-56: `compileSynthesisPage(page, items, allItems, templateDir, cwd)` ok; `writeSynthesisPage` signature unchanged; `recompileSynthesis(wikiRoot, cwd, templateDir, ingestable, scanned, opts)` ok; handler passes `scanned` (not forRelations); decisions written only on byte difference and outside the roadmap/active-sprint pair; stale "(initiatives, topics, unknown)" comment fixed. Docs: protocol §10.1 index line + decisions.md line, §10.2, §21.1 ("build and ingest compact the index", decisions-size sentence), query agent Step 1 sentence + Gherkin example replaced; Claude md and Codex toml identical edits.
4. C10 frozen exports present with exact shapes: `compile(allItems, {wikiRoot, templateDir?})`, `latestDecisions(allItems, n)` -> {id,date,text,supersedes[]} (Q/A only, full answer text, newest first), `readUnlabelledContradictions(wikiRoot)` -> {draft,neighbor,claim}[], `checkDecisionsSize(repoRoot, ceiling=8000)`, `SYNTHESIS_PAGES` rename, `scanRawItems(..., onSkip?)`.
5. `node scripts/build-codex-payload.mjs --check` exit 0. No build/dist writes done.
6. `git status --porcelain .cleargate/delivery` before and after: only the pre-existing untracked CR-131 file. The live test works on a scratch copy outside the meta repo (asserts this); reads only.
7. Privacy: no /Users/, ssuladze or sandrinio strings in any added/changed file of the diff.

## Observations (non-blocking)
- decisions.md is 32,856 tokens on the real corpus (plan estimate ~25k), so `warn: decisions-size` fires permanently; accepted per story R9 (warn, never failure).
- Story file Task Breakdown rows are unticked (advisory in v1); the Dev left it to the orchestrator since the file lives in the outer repo.
- compile signature differs from story §3.3 text (`(items, templateDir?)`) by design: plan C10.1 / G-M2-56 win.
- Excluded-bucket (story) edits still lag until the next ingest/build (story R1 risk, stated in the page header).

flashcards_flagged: []
