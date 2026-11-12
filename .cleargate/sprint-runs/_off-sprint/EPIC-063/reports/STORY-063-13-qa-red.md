# STORY-063-13 QA-Red report (role: qa, Mode: RED)

Branch `story/STORY-063-13` in `/Users/ssuladze/Documents/Dev/ClearGate/cleargate-cli`. Nothing committed, no production code touched, no build run.

## Files (all under cleargate-cli/test/wiki/)
| File | Kind | Cases | Baseline |
|---|---|---|---|
| `relations.red.node.test.ts` | new, default tier (unit: relations.ts, page-schema, lint-checks) | 52 | 42 fail, 10 green anchors |
| `relations-handlers.red.node.test.ts` | new, default tier (real `wiki build`/`ingest`/`lint` on temp repos) | 24 | 24 fail |
| `relations-corpus.live.integration.node.test.ts` | new, integration tier, skip-guarded, scratch copy of meta `.cleargate/{delivery,sprint-runs,config.yml}` | 1 | 1 fail (ERR_MODULE_NOT_FOUND relations.js) |
| `_relations-support.ts` | new helper (no meta-repo reads) | - | - |
| `build-sprint-reports.red.node.test.ts` | pin update ("superseded by STORY-063-13") | 1 changed | fails (buildChildrenRefs still exported) |
| `build.node.test.ts` | pin update (`## Blast radius` -> `## Relations`) | 1 changed | fails |
| `page-builder-shared.node.test.ts` | pin update (`input()` helper -> `relations`; "Affects" block -> "Relations") | 2 changed + 5 shape-change | 7 fail |

RED_COUNT: 67 new red cases (42 + 24 + 1) plus 9 pin-update reds = 76. 10 cases are green by design, all marked `[REGRESSION ANCHOR]`.

The 5 shape-change reds in `page-builder-shared` (H1, untitled, short-body, two open-questions cases) fail at baseline with `TypeError: input.children is not iterable`. That is the plan-mandated `PageBodyInput` change (`parent`/`children` -> `relations`), not a behaviour red; they go green once `buildPageBody` reads `relations`.

I did not extend `build-ingest-parity.node.test.ts` or `lint.node.test.ts` in place. The neighbour-rewrite parity cases and the excluded-bucket lint cases live in the red files above, so the Developer's green run does not edit pre-existing files beyond the listed pins. The DoD line "build-ingest-parity and lint tests green" still holds because both files are untouched and must stay green.

Baseline sanity: `cr075-standalone-contract` passes (8/8) with the new files present. A probe of the live test (temp copy with `parentIdOf` stubbed, deleted afterwards) showed the scratch copy plus `wiki build` run in about 2.2 s on the real corpus and the sweep reaches its first real assertion ("parents non-zero"). Not run in place on the outer repo.

## Contracts pinned (plan M2.md line numbers)
- `relations.ts`: `ItemRelations`, `EMPTY_RELATIONS`, `RELATIONS_LIST_CAP = 20`, `parentIdOf(fm)`, `computeRelations(items)` (C13.1, L110-136). Purity: no `node:fs`/`child_process` in relations.ts (L104).
- `parentIdOf`: key order `parent_ref`, `parent_epic_ref`, `parent`; empty/null falls through; placeholder (`NNN`, `|`, `{`) -> null with NO fall-through; `[[ ]]`/quotes stripped; leading-ID rule (G-M2-7, L126-129).
- `computeRelations`: every id has an entry; unresolved parent gets an entry with its children; C order = code-unit (test uses `BUG-...-Zeta` before `BUG-...-alpha`); cites via `/\[\[([^\]\n]+)\]\]/g`, trimmed, unresolved and self dropped; stories included; alias map G-M2-10 (L130-136).
- `page-schema.ts` (C13.2, L138-144): `WikiPage.cites?/cited_by?` serialised right after `children` as block lists and only when defined; `parsePage` reads block lists (G-M2-6, L140); `PageBodyInput.relations`; `buildParentRef` fixed (`[[ID]]` or `''`); `buildChildrenRefs` deleted; `buildPlanStub({ id, fm, body, rawPath, relations })`.
- Relations block (C13.3, L146-159): `RELATIONS_BEGIN`/`RELATIONS_END`, `buildRelationsBlock(r)`, `replaceRelationsBlock(body, block)` — exact line order Parent / Children (N) / Cites (N) / Cited by (N); `- Parent: none`; `<ID> (not found)`; cap 20 then `+N more` for all three lists (G-M2-9); replace is inclusive-range and idempotent; no markers -> before `SPRINT_REPORT_BEGIN`, else append.
- Neighbour rewrite (C13.4, L161-165): set = old parent, new parent, old cites, new cites, `children(A)`, `citedBy(A)` (G-M2-5). Rewrite preserves `last_ingest`, `last_ingest_commit`, `raw_path`, `last_contradict_sha` and every body byte outside the block; writes no `log.md` entry; sprint report block bytes survive.
- `checkBrokenBacklinks(pages, repoRoot, opts?: { rawItemBuckets?: ReadonlyMap<string,string>; ingestBuckets?: string[] })` (blueprint step 5, L496-500): excluded-bucket parent accepted; parent nowhere or in an ingestable bucket without a page still reported; no opts = unchanged.
- G-M2-8: build writes `parent_cleargate_id`/`sprint_cleargate_id`; build vs sequence-of-ingests pages byte-identical (R5). G-M2-5 creation cases (cites and children). Report-path ingest uses computed relations (L493). A file outside pending-sync/archive is appended to the scan (L490).
- Topic lint: `checkInvalidatedCitations` output pinned as a recorded expectation; item-page `cites`/`cited_by` add no finding. [REGRESSION ANCHOR]

## Ambiguities resolved (please confirm at TPV)
1. Location of `RELATIONS_BEGIN/END`, `buildRelationsBlock`, `replaceRelationsBlock`: C13.3 does not name the module. Pinned to `page-schema.ts` (next to `SPRINT_REPORT_*`; `page-schema` may import the pure relations module). If the Architect meant relations.ts, re-export from page-schema.
2. `ItemRelations.parent` when the parent resolves only through the alias map (`parent_ref: CR-083`, file `CR-083-Document-...`): C13.1 says "bare ID". Pinned to the CANONICAL item id (`CR-083-Document-Thing`), otherwise the page's `parent: "[[CR-083]]"` finds no page in lint and the real-corpus equality (broken-backlink == truly missing parents) breaks. An unresolved parent keeps its written id.
3. The exact join before `+N more` is unspecified (", +5 more" vs " +5 more"). Tests assert only 20 `[[` IDs on the line and `endsWith('+5 more')`.
4. Relations block position relative to `## Open questions` is unspecified in C13.3 vs C8.1; tests assert exactly one block, not its position (08 pins position later).
5. The corpus sweep's expected broken-backlink count excludes `initiatives`, because `loadWikiPages` (`src/wiki/load-wiki.ts` BUCKET_DIRS) never loads initiative pages.
6. Handler tests use numeric IDs (EPIC-910, CR-911...) standing in for the Gherkin's EPIC-Y/CR-X; the non-numeric `EPIC-Y` form needs >= 2 segments to parse as an ID.

flashcards_flagged:
- "2026-11-12 · #wiki #lint · loadWikiPages BUCKET_DIRS omits initiatives; any lint-count oracle over the corpus must exclude them."

## Amendment (TPV) — re-seal on top of commit 35786e8

Files changed (all under cleargate-cli/test/wiki/): `relations.red.node.test.ts` (52 -> 57 cases), `relations-handlers.red.node.test.ts` (24 -> 28), `relations-corpus.live.integration.node.test.ts` (rewritten oracle). Pin-update files and `_relations-support.ts` unchanged. Not committed.

| Amend | Applied as |
|---|---|
| 1 G-M2-37 | Unit: `loaded('EPIC-1','[[INITIATIVE-5]]')` + `{INITIATIVE-5:'initiatives'}` + INGEST -> `[]`. Handler: EPIC-901 `parent_ref: INITIATIVE-901` under CONFIG_NO_STORIES; initiative page `children` has `[[EPIC-901]]`, no broken-backlink for EPIC-901. BUG-051(b) not tested. |
| 2 live oracle | `relations.js` import dropped; inline `oracleParent` (R1 + G-M2-7). Per-item page `parent` equality, and exact sorted set of `broken-backlink` lines (`<bucket>/<id>.md -> <written parent> (parent missing child entry)`). IDs occurring more than once in the scan excluded from both sides. `parents > 0` kept. Topic citation picked from a lint-read, non-cancelled item. |
| 3 report path | EPIC-991 starts with no cite; raw rewritten to cite SPRINT-72 after build, never ingested; report ingest asserts fm `cited_by`, `- Cited by (1)`, one relations block, `RELATIONS_END` before `SPRINT_REPORT_BEGIN`. |
| 4 sprint R5 | Plan+report sprint: report->plan and plan->report each byte-equal to a fresh build (sprint page snapshot). Report-only sprint named by CR-996: build lists the child (fm + `- Children (1)`); ingest(report) then ingest(CR) equals build (full snapshot). |
| 5 position | In the `buildPageBody` describe: `indexOf(RELATIONS_BEGIN) > indexOf('## Open questions')` and `trimEnd().endsWith(RELATIONS_END)`. |
| 6 mtime | Build, back-date `epics/EPIC-931.md` 60 s, lint reports `missing-ingest`; ingest EPIC-930 re-pointed to EPIC-932; assert the neighbour was really rewritten (cited_by emptied, with a precondition that build set it), then lint still reports `missing-ingest` for it. |
| 7 legacy | Three unit cases on the TPV fixture: pair stripped and one block after `## Open questions`; with a report block (block before report, report bytes intact); with markers present, a `## Blast radius` line elsewhere is kept. |

Run results: `relations.red` 57 cases = 47 red + 10 anchors green; `relations-handlers.red` 28 = 28 red; live = 1 red (first failure: `bugs/BUG-002: page parent`, i.e. no computed parents yet); `cr075-standalone-contract` 8/8; `build-ingest-parity` 4/4 and `lint.node` 36/36 still green. Every new amendment case fails for the missing behaviour (or missing export), none vacuously: my first draft of amend 6 passed at baseline because an absent `cited_by` read as `[]`; I added the build-time precondition so it reds.

Amendments not applied as written: none. Amend 8 (separator) stays lenient in tests per the orchestrator ruling.

RED_COUNT: 85 = 76 new red cases (47 + 28 + 1) + 9 pin-update reds. Green anchors: 10.
