# STORY-063-09 Developer report (role: developer, off-sprint EPIC-063 M2)

STORY: STORY-063-09
STATUS: done
COMMIT: 2c40864 (branch `story/STORY-063-09` in `cleargate-cli/`, on 4d868dd, base main 669ee3b)
TYPECHECK: pass (`npm run typecheck`)
TESTS: full `npm test` 4,555 tests: 4,553 passed, 0 failed, 2 skipped. `test/wiki/*.node.test.ts`: 889 tests, 888 passed, 0 failed, 1 skipped (the live test, which needs CLEARGATE_META_ROOT).

## Files changed (20, plus 1 new)
- `src/wiki/page-schema.ts`: C9.1/C9.2. `IndexRowData` is `{id, status, sprint, title, digest, drift?}`. `formatIndexRow` and `parseIndexRow` are rewritten and inverse. `buildIndex(items, codeMap, drift, {relations, tokenTarget})` groups open items (Sprints, Epics with nested rows, Proposals and initiatives, By area, Unparented) and runs the tier ladder. Also exports `DEFAULT_INDEX_TOKEN_TARGET` and `gateText` (G-M2-49/50).
- `src/wiki/synthesis/sprint-partition.ts` (new): `partitionSprints` and `rankCompletedSprints`, the ranking moved out of `active-sprint.ts`. `active-sprint.ts` now calls it; `numericStem` and `listSprintReports` no longer appear in it.
- `src/wiki/synthesis/roadmap.ts` and `templates/synthesis/roadmap.md`: `compile(state, repoRoot, templateDir?)`. Sprint sections come from the partition. The in-flight row is rendered from `activeId`, with `state unknown` for any non-ok state.json. The `{{state}}` and `{{completed}}` row vars and the new descriptions are in.
- `src/wiki/synthesis/product-state.ts` and its template: Open = status not in `TERMINAL_STATUSES`. The comment is now `// Open counts`, keys are `open_*`, the section is `## Open Epics`.
- `src/wiki/synthesis/open-gates.ts` and its template: Gate 1 covers every open item with `approved !== true`. Row is `- [[ID]] — <type> · status: <s> — <checks>`, sorted by `ACTIVE_BUCKET_ORDER` then id.
- `src/commands/wiki-ingest.ts`: `compileSynthesisPage` is split from the write. The stamp-only early return is deleted: stamp-only compiles every targeted page and writes it only when it is missing or its bytes differ. The coupled roadmap/active-sprint pair is compiled together and the second page is written only when it differs, on both paths. `rebuildIndex` takes `relations` and `tokenTarget`.
- `src/commands/wiki-build.ts`: passes `rel` and `index_token_target` to `buildIndex`, and `cwd` to the roadmap.
- `src/wiki/lint-checks.ts` (`checkIndexTarget`), `src/commands/wiki-lint.ts` (warnings printed in both modes after findings and before the summary, never findings), `src/lib/wiki-config.ts` (`index_token_target`).
- Docs, canonical scaffold only: `scaffold/core/.cleargate/config.example.yml` and `knowledge/cleargate-protocol.md` (§10.1 index line, §21.1 target sentence). `npm run gen:codex` wrote no tracked change. `copy-planning-payload` and `build-manifest` were run. `build-codex-payload.mjs --check` exits 0.
- Shape-change reds updated, each with a "superseded by STORY-063-09" note: `build-index-hierarchical.node.test.ts`, the regenerated golden `fixtures/expected-index-hierarchical.md` (checked line by line against G-M2-54: the Sprints, Epics and Proposals lines match exactly, with no By area and no Unparented section), `page-builder-shared.node.test.ts` ("index row schema round-trips" and "one index writer"), `build-ingest-parity.node.test.ts:123`, `bucket-registry-parity.red.node.test.ts:211` (`// Open counts`). No other committed test was edited.

## Live numbers (scratch copy of the real corpus, via `index-open-ids.live.integration`)
- Open ingestable items: 91. Index: 3,582 tokens at tier 1 (CR and bug digests dropped, epic, sprint and proposal digests kept), 418 tokens under the 4,000 target.
- G3 (at most 4,000 tokens), G3b (every open ID once), G3c (no `warn: index-budget-target`, no `index-budget:` finding) and G3d (empty `.active`: roadmap has `_No sprints currently in flight._` once, active-sprint has `_No active sprint found._` once): all pass. The R6 open-epics count and the R7 Gate 1 coverage also pass.
- 08 live sweep `extract-sections-corpus.live.integration`: 2/2 pass, no regression.
- Delivery tree: `git status --porcelain .cleargate/delivery` was empty before and after the live runs and the full suite.

## Timings: `wiki ingest` of EPIC-058 (scratch copy of the corpus + git, scratch tsup builds of 669ee3b and the new tree)
Load average was 8–10 the whole time, so only the medians are meaningful. Times in ms, 6 runs each, two rounds.
| path | base 669ee3b | new |
|---|---|---|
| write (append a line), round 1 | 1003 | 1156 |
| write, round 2 | 1011 | 1025 |
| stamp-only (frontmatter-only edit), round 1 | 940 | 2087 (load spike; runs 1963 1811 2657 2211 2806 1296) |
| stamp-only, round 2 | 1011 | 1042 |

The stamp-only path now compiles four synthesis pages in memory (open-gates, product-state, roadmap, plus the coupled active-sprint). Round 2 shows about +30 ms. Round 1's 2 s is contaminated by load. I did not re-run on a quiet machine, so a lower-noise measurement is still open.

## r_coverage
- { r_id: "R1 digest/line contract", covered: true }
- { r_id: "R2 grouping and G-M2-3", covered: true }
- { r_id: "R3 archive unchanged", covered: true }
- { r_id: "R4 tiers 1/2/3 and header", covered: true }
- { r_id: "R5 target config and lint warning", covered: true }
- { r_id: "R6 product-state open", covered: true }
- { r_id: "R7 Gate 1 all types", covered: true }
- { r_id: "R8 build/ingest parity", covered: true }
- { r_id: "A1 C9.5/C9.5a/C9.6 and G-M2-4/53", covered: true }

## plan_deviations
- Agent docs and the Task Breakdown: the blueprint changes no agent doc, so none was edited (only protocol §10.1 and §21.1 and config.example.yml). The story file lives in the outer repo's `pending-sync/`, which this dispatch does not touch, so I did not tick its Task Breakdown rows; the orchestrator may need to.
- One implementation choice the plan leaves open: `buildIndex` renders the tier-3 `IDs:` line for an epic's child rows only (stories rolled up at 3 or more stay on their own `stories (n):` line, which tiers never change), as G-M2-49 specifies.

## adjacent_files
- `src/wiki/query.ts` / `wiki-query` `searchIndex`, which takes the first `[[ID]]` per line (known, plan gotcha; irrelevant until tier 3).
- `src/lib/readiness-predicates.ts` (`evalLinkTargetExists`, still `includes('[[ID]]')`; verified through a tier-3 collapsed ID).
- `src/commands/hook.ts` ingest path (calls `wikiIngestHandler`, so it inherits the new stamp-only compile cost).
- `scripts/*` that parse index rows (none in src; `.cleargate/scripts/prep_*.mjs` key on other surfaces).
- `test/dashboard/**` (uses `readSprintRunState`, unchanged).

## flashcards_flagged
- `2026-11-12 · #wiki #ingest · Stamp-only ingest now compiles synthesis pages and writes only on byte difference; ~+30 ms, no early return.`
- `2026-11-12 · #wiki #index · buildIndex places CR/bug/story by parent open epic > first area token > Unparented; roadmap/active-sprint share partitionSprints.`
- `2026-11-12 · #wiki #test-harness · Golden regen: run the fixture build through a throwaway test file, then diff against the plan's expected lines.`

## Script Incidents
None. No `run_script.sh` invocation.
