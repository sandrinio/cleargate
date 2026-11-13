# U4 QA (BUG-125) — worktree cg-wt/u4, story/BUG-125, fix f268656 (reds a724d24, 4fc6a1f; base b9fe36a)

STORY: BUG-125
QA: PASS
TYPECHECK: pass (`npm run typecheck`, no output)
CHECK: `npm run check:no-inline-id-regex` -> "no inline work-item-id regexes"
TESTS: red file 30/30; extract-sections-pages.red 36/36; 68 default-tier files (test/wiki/** + test/commands/sprint*, no integration/live): 1521 tests, 1507 pass, 7 fail, 6 cancelled.
 - sprint-reconcile-lifecycle-parents.red (6 cancelled + 1): `dist/cli.js` missing in the worktree; the same on base, and the file is built-CLI dependent (unrelated).
 - brief-truth-oracle.red and session-brief-f2.red failed under full-suite load only; alone they pass 31/31 on the branch, three times (twice more after the first), and 31/31 on a base archive. Load/timing flake, not BUG-125 (the failures were release-lookup and oracle timing, no sprint-membership content).
 - Base archive full run (minus the dist file): 1485 tests, 1 fail (flake class as above, not investigated further).
REGRESSIONS: none attributable.

## 1. Diff vs G-R-35..40 (`git diff b9fe36a..f268656 -- src`: 4 files only)
- No inline id regex; membership goes through `extractWorkItemIds(s)[0] === s` + the resolver (id, alias). The only new regexes are the date `^\d{4}-\d{2}-\d{2}` and the identity-line rewrite — neither is an id regex; the checker is green.
- `sprint-scope.ts`, `session-brief.ts`, frontmatter `sprint_cleargate_id`: untouched. `ItemRelations` shape unchanged (key test passes). Brief Planned count untouched.
- `SPRINT_PLAN_LIST_KEYS` = epics, proposals, stories, bugs, crs (matches plan). `computeSprintMembership` numeric sprint order (SPRINT-2 before SPRINT-10 proven below), sprint never its own member, terminal sprints excluded from labels in `sprintSlot`.
- `page-schema.ts` hunks (base lines ~222, 275-330, 431, 499-516, 726-740) are all in the plan's ranges; nothing near the archive lines ~569.
- Ingest: memberships computed over `forRelations` / `items`; passed to own page, `rebuildIndex`, `rewriteNeighbours`, `refreshRelationPages`; a sprint ingest adds old `existingPage.children` to the neighbour set; `rewritePageRelations(file, nr, slot|null)` rewrites body line 2 with the plan's regex, `''` -> `none`, compare-then-skip and mtime restore kept.
- `git diff 4fc6a1f..f268656 -- test`: empty.
- Re-scope commit 4fc6a1f: intent kept. (1) `[[ ]]` unwrapping of page frontmatter children (page stores wikilinks; relations-f1 precedent); (2) expected key list sorted to `.sort()` order (citedBy < cites); (3) Completed SPRINT-01 has no index row (terminal -> Archive summary), so the row check narrowed to open sprints SPRINT-02/03; the corpus-wide "no sprint row says `no sprint`" assertion and the identity-line check for every sprint are kept; (4) `extract-sections-pages` line 104 now expects `**Dates:** 2026-11-10 → 2026-11-14` for SPRINT-44 — consistent with G-R-38 and the decided "Dates or not scheduled". No assertion was loosened to hide a defect.

## 2/3. Scenario map (§5)
| Scenario | Test(s) | Result |
|---|---|---|
| Sprint page lists its members | Sc1 cases (listed epic + story; every status; crs/bugs; quoted/wikilink/placeholder dropped; terminal plan) | pass |
| Planned member names its sprint (page + index row) | Sc2 cases (Draft, Ready, Active bare id, two open plans, Active+Draft, terminal no label); golden expected-index-hierarchical | pass |
| Own sprint wins | Sc3 (2 cases) | pass |
| Ingest matches build after sprint add | Sc4 add (sprint-only hook, every file), remove, list edit, member drop, dates edit, member ingest | pass |
| Sprint page does not name itself | Sc5 (dates, from, placeholders, own-id claim, whole corpus) | pass |
| Unit shape G-R-35/37 | 4 cases | pass |
MISSING: none. Integration test of the Gherkin (build-vs-ingest parity) is covered by the Sc4 cases (in-process, real handlers).

## 4. Edge probes (temp fixtures, in-process handlers; probe file in the session scratchpad, nothing in the meta-repo)
- Two open plans (SPRINT-10 Draft, SPRINT-02 Ready): page `**Sprint:** SPRINT-02 (planned), SPRINT-10 (planned)`, index row same, numeric order. OK
- Plan lists EPIC-777 (no such item) and `"{EPIC-ID}"`: build exit 0, children `[[EPIC-002]]` only. OK
- Active SPRINT-02 listing EPIC-002 with own `SPRINT-03`: page and index `SPRINT-03`. OK
- `sprint remove` then ingest of only the sprint file: member page `Sprint: none`, index `no sprint`, page body and whole index equal to a full build of a clone. OK
- First-time ingest of a brand-new sprint plan listing an existing member: member page becomes `SPRINT-02 (planned)` and equals a full build. OK
- Dates: start only -> `from 2026-11-01`; `{YYYY-MM-DD}` both -> `not scheduled`; both -> `2026-11-01 → 2026-11-14`; start `null` + end set -> `not scheduled` (end-only is not in the plan's three forms; acceptable); no dates -> `not scheduled`. Index row carries the same text.
- Ingest of the member after a build, then full build: identical pages and index (parity). OK
- Performance, 300-item synthetic corpus (100 epics, 100 crs, 90 bugs, 10 plans of 30 members), 7 in-process builds each, interleaved twice: base median 68/74 ms, branch 74/65 ms; delta within noise.

## Findings
None blocking. Notes (non-blocking):
- End-date-only sprint prints `not scheduled` (plan does not define it).
- Full-suite concurrency flakes in brief-truth-oracle.red / session-brief-f2.red also exist independent of this change (pass alone, on both base and branch).

flashcards_flagged: []
