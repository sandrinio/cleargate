# BUG-125 Dev report (U4, /Users/ssuladze/Documents/Dev/cg-wt/u4, branch story/BUG-125)

UPDATE after 4fc6a1f (QA-Red fixed the 4 test defects):
STATUS: done
COMMIT: f268656 `fix(wiki): BUG-125 sprint plan lists are membership in the wiki` (4 src files only)
Re-run: typecheck clean; check:no-inline-id-regex clean; sprint-plan-membership.red + extract-sections-pages.red 66/66 pass; 72-file default-tier set: 1586 pass, 0 fail, 6 cancelled (sprint-reconcile-lifecycle-parents.red, dist/cli.js missing, identical with change stashed).

(Original blocked notes follow.)

## Implementation (G-R-35..40)
- src/wiki/relations.ts: SPRINT_PLAN_LIST_KEYS; makeResolver (id + alias map, extracted from computeRelations); sprintPlanMembers (strip quotes/[[ ]], extractWorkItemIds(s)[0] === s, resolves, else dropped); computeRelations adds listed members to a sprint's children for every status; computeSprintMembership (numeric sprint order, sprint never a member of itself).
- src/wiki/page-schema.ts: SprintListing, sprintSlot, identityLine (sprint pages print `**Dates:** ...`), PageBodyInput.memberships, BuildIndexOptions.memberships, rowAt uses sprintSlot, buildPlanStub passes memberships. Hunks stay in the plan ranges; archive lines (~:569) untouched.
- src/commands/wiki-build.ts: computeSprintMembership(all) next to computeRelations; passed to buildPageBody, both buildPlanStub calls and buildIndex.
- src/commands/wiki-ingest.ts: same over forRelations (own page, rebuildIndex, rewriteNeighbours, refreshRelationPages); sprint-plan ingest adds old children to the neighbour set; rewritePageRelations(file, nr, slot|null) rewrites body line 2 with the given regex ('' -> none), compare-then-skip and mtime restore kept; slotFor returns null for sprint pages / report-only pages.
- sprint-scope.ts, session-brief.ts, frontmatter sprint_cleargate_id untouched.

## Gates
- `npm run typecheck`: clean. `npm run check:no-inline-id-regex`: clean.
- `npm run test:file -- test/wiki/sprint-plan-membership.red.node.test.ts`: 22 pass / 8 fail (all 8 are test defects, below).
- Same file copied to a scratch test with ONLY those assertions corrected: 30 / 30 pass (scratch file deleted, never committed).
- 72 default-tier files (all test/wiki/**, test/commands/sprint*, init, push-hierarchy, project-root, ingest-docs-match-code, collision-surface-planning-workflow; no integration/live) run with tsx --test: only failures are
  (a) test/commands/sprint-reconcile-lifecycle-parents.red.node.test.ts, 6 cancelled: `assertCliBinExists FAIL: dist/cli.js missing`; identical with my change stashed (verified);
  (b) test/wiki/extract-sections-pages.red.node.test.ts, 2 cases (build + ingest), see defect 4.
  The golden index test (expected-index-hierarchical.md) passes.

## Test defects found (evidence)
1. sprint-plan-membership.red lines 108/109, 125, 135, 196, 335: `fmList(page,'children').includes('EPIC-002')` compares a BARE id against page frontmatter, which stores `[[EPIC-002]]` (see relations-f1.red.node.test.ts:169 using refs(); actual value printed: `["[[EPIC-002]]","[[STORY-002-01]]"]`). 6 cases (Sc1 x3, terminal-plan case, Sc4 add x2). Fix: compare `[[ID]]`.
2. sprint-plan-membership.red ~line 412: expected key list `['children','cites','citedBy','parent','parentFound']` is not in sorted (code-unit) order; actual `.sort()` gives citedBy before cites. Fix: reorder expected.
3. sprint-plan-membership.red whole-corpus Sc5 (~line 278): `indexRow(root,'SPRINT-01')` for a Completed sprint; terminal items are in the Archive summary and have no index row ("index has no row for SPRINT-01"). Fix: skip the row check for terminal SPRINT-01.
4. test/wiki/extract-sections-pages.red.node.test.ts:104 (and the same case for ingest): asserts the SPRINT-44 page identity line is `**Status:** Completed · **Sprint:** SPRINT-44 · **Gate:** pass`. That directly contradicts Sc5 / G-R-38 (sprint pages say `**Dates:** ...`, never `**Sprint:**`); actual with the fix is `**Status:** Completed · **Dates:** 2026-11-10 → 2026-11-14 · **Gate:** pass`. Plan's "Existing tests that change shape" U4 list did not name this file; QA-Red must update it (line 104 + the identityLine helper usage for sprint pages).

## Needed from the orchestrator
Route back to QA-Red to fix defects 1-4 (red-named files are forbidden to me), then re-dispatch me (or just commit the existing worktree diff). No plan deviations.

plan_deviations: []
