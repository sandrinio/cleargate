# BUG-125 QA-Red (U4, worktree cg-wt/u4, branch story/BUG-125 @ b9fe36a, nothing committed)

QA-RED: WRITTEN
BASELINE_FAIL: 25 failing cases of 30 in the new file, plus 1 edited golden test (26 red in total)

## Files
- created `test/wiki/sprint-plan-membership.red.node.test.ts` (30 cases)
- modified `test/wiki/fixtures/expected-index-hierarchical.md` line 9 only
  (`SPRINT-01 — Active · no sprint — Test Sprint` -> `· not scheduled —`; the fixture sprint has no dates)
- not changed: `extract-sections.red.node.test.ts:722-723` (its builder type is `cr`); no relations / parity fixture carries sprint member lists.
  `index-handlers`, `index-rows`, `page-builder-shared` use non-sprint rows only.

## Red on base, and why
- Sc1 (children): 4 cases. Sprint page `children: []`; PARENT_KEYS is the only source. Covers every sprint status, crs/bugs lists, quoted / wikilink / placeholder entries, stories as child IDs.
- Sc2 (planned label): 5 cases. Page and index row read `Sprint: none` / `no sprint`. Covers Ready, Active (bare id), two open plans, Active plus Draft, terminal plan (children listed, no label).
- Sc5 (sprint about itself): 5 cases. Sprint pages print `**Sprint:** none` or their own id; rows read `no sprint`. Covers dates, `from <start>`, placeholders, own-id claim, whole corpus.
- Sc4 (parity): 8 cases, red because the member page differs from a full build after ingest of the sprint file.
  - `sprint add` with only the sprint file ingested, and with every written file ingested.
  - `sprint remove` with only the sprint file ingested.
  - Hand edit of the plan, dropping a member (old children), a dates edit, and ingest of the member.
- Unit shape: 4 cases. `SPRINT_PLAN_LIST_KEYS`, `computeRelations` children with the five `ItemRelations` keys, `computeSprintMembership` and `sprintSlot` do not exist yet.
- Golden `expected-index-hierarchical.md` ("matches committed ...") is red on base: the build still writes `no sprint` for the sprint row.

## Green on base by design
- Own `sprint_cleargate_id` wins (Sc3, 2 cases; one is an [ANCHOR]); frontmatter `sprint_cleargate_id` stays the item's own value; no plan -> `none` / `no sprint`.
- `sprint remove` + every written file ingested: the EPIC's own ingest already heals it, so it is not a red.

## Other files red on base
None besides the golden above. Adjacent suites run green on base: relations*, build*, ingest*, extract-sections, index-handlers, sprint-pages-agree, audit-status, decisions-wiring.

## Notes for the Dev
- `sprintSlot(type, fm, memberships?)` is pinned only for the sprint branch (`'2026-11-01 → 2026-11-14'`, `'from <d>'`, `'not scheduled'`) and for the non-sprint no-membership branch (own claim or `''`). The `memberships` argument shape is not pinned.
- `computeSprintMembership` is pinned as `Map<memberId, Array<{sprint, status}>>`, numeric sprint order; sprints are not members of themselves.
- Parity tests compare page bodies and the whole `index.md` against a full build of a cloned corpus (`cloneCorpus`).
- Typecheck is clean and `check:no-inline-id-regex` passes (it scans `src/` and scaffold scripts only; tests write no id regexes).

## Re-scope (against the Developer's uncommitted G-R-35..40 src; no src touched)
Fixed four test defects, intent unchanged:
1. `sprint-plan-membership.red.node.test.ts`: children comparisons now strip the `[[ ]]` that page frontmatter stores (helpers `unbracket` / `kids`).
2. Same file: the expected `ItemRelations` key list is in sorted order (`children, citedBy, cites, parent, parentFound`).
3. Same file, whole-corpus Sc5: checks every sprint page's identity line (no `**Sprint:**`, has `**Dates:**`). Index rows are checked for the open sprints only (SPRINT-02 and SPRINT-03), since a Completed sprint has no row. The corpus-wide "no sprint row says no sprint" assertion is kept.
4. `extract-sections-pages.red.node.test.ts:104`: now expects `**Status:** Completed · **Dates:** 2026-11-10 → 2026-11-14 · **Gate:** pass` (fixture dates and gate value checked).

Results with the Dev WIP present:
- Both files: 66 pass, 0 fail.
- `tsc --noEmit`: clean.
- All default-tier `test/wiki/*.node.test.ts` (live and integration files excluded): 1326 tests, 1325 pass, 0 fail, 1 skipped (pre-existing). Nothing else red.
