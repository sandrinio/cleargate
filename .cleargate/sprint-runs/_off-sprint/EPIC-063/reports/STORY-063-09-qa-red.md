# STORY-063-09 QA-Red (role: qa, Mode: RED, off-sprint EPIC-063 M2)

QA-RED: WRITTEN
Branch `story/STORY-063-09` in `cleargate-cli/`, base main 669ee3b. Nothing committed. No src/ or scaffold/ edits.
Baseline: 118 default-tier reds + 1 live red, 18 green guards. Every existing wiki test stays green (full `test/wiki` run: the only failures are the 119 new reds).

## Files (all under cleargate-cli/test/wiki/)
| File | Kind | Red | Green (guards) |
|---|---|---|---|
| index-rows.red.node.test.ts | unit: formatIndexRow/parseIndexRow, buildIndex lines, grouping, stories rollup, archive | 38 | 8 |
| index-tiers.red.node.test.ts | unit + handler: tier ladder, per-tier content, Outline 1x/2x | 13 | 4 |
| index-handlers.red.node.test.ts | handler: Gherkin 1 and 5, ingest parity, config target | 8 | 2 |
| index-lint-config.red.node.test.ts | `checkIndexTarget`, lint handler, `index_token_target`, config.example.yml, protocol §10.1 | 14 | 2 |
| state-pages-open-work.red.node.test.ts | product-state (R6), open-gates Gate 1 (R7), stamp-only freshness (G-M2-4) | 15 | 2 |
| sprint-partition.red.node.test.ts | C9.6 `partitionSprints`/`rankCompletedSprints`; one-partition source pins | 17 | 0 |
| sprint-pages-agree.node.test.ts | A1 (a)-(d), C9.5a coupled pages, roadmap template text | 13 | 0 |
| index-open-ids.live.integration.node.test.ts | live (scratch copy): G3, G3b, G3c, G3d, R6, R7 on the real corpus | 1 | 0 |
| _index-support.ts, fixtures/corpus-shape.ts | helpers; seeded 1x/2x generator (92/184 open) | - | - |
| build.node.test.ts | Scenario 14 retitle only (see below) | - | 81 stay green |

Named per the plan where the Goal Acceptance Check cites the file (`sprint-pages-agree.node.test.ts`, `index-open-ids.live.integration.node.test.ts`); the rest are `*.red.node.test.ts`.
Each red was run against the clean baseline; failures are the old `(type)` row shape, the flat list, the missing module/export, the proposals-only Gate 1, the `activated_at` roadmap, and the early-return stamp-only path.

## Scenario -> test map
| Gherkin / requirement | Tests |
|---|---|
| S1 listed once, digest, under epic | index-rows "R2 grouping" (nest under epic, BUG-3 in `wiki` area, parse + no duplicates); index-handlers "Gherkin 1" (build, line format, ingest byte-identical, ingest-only == build) |
| S1 "ingest leaves index.md byte-identical" | index-handlers (index overwritten with junk first, so a no-op ingest cannot pass); index-tiers 1x handler case |
| Outline 1x / 2x | index-tiers "Outline" (in-memory) and "Outline via wiki build" (tmp repo, generated corpus): <= 4,000 tokens, every open ID once, header tier 1 (1x) / tier 3 (2x) per decision 1 |
| S3 lint warn vs ceiling | index-lint-config "Gherkin 3" (4,500 warns, 0 findings, exit 0; 8,500 fails as before; order; target from config; suggest mode) |
| S4 state pages | state-pages "R6" (15 non-terminal epics, none Active -> 15 open) and "R7" (BUG-9 + `repro-steps-deterministic`; `gate not run`) |
| S5 error: no parent/area, no digest | index-rows R1 + R2 (Unparented, line ends at title); index-handlers "Gherkin 5" |
| R1 digest rules (G-M2-47 consumer) | index-rows R1 (12-word digest per type; bug = Actual not Expected; ` — ` title -> ` - `) |
| R2 grouping, G-M2-3, stories rollup | index-rows R2 + "open stories" (3+ = one wikilink rollup line, 2 = nested rows) |
| R3 archive unchanged | index-rows R3/R8 (guard) |
| R4 tiers 1/2/3, header, every ID | index-tiers "tier selection" + "what each tier keeps and drops" |
| G-M2-2 / plan scenario 6 | index-tiers (collapsed ID still passes `evaluate('link-target-exists(...)')`) |
| R5 / C9.3 / C9.4 | index-lint-config |
| R6, R7 | state-pages-open-work |
| R8 parity | index-handlers (ingest-only == build; both read the target) + existing build-ingest-parity |
| G-M2-4 / C9.5, plan scenario 7 | state-pages "freshness" (epic and bug approve flip == fresh build, only differing pages rewritten) |
| C9.5a, plan scenario 11 | sprint-pages-agree "coupled pages" (epic body edit and approve flip after a sentinel change) |
| plan scenario 10 (a)-(d), C9.6, G-M2-35/36 | sprint-pages-agree, sprint-partition |
| plan scenario 9 / G3, G3b, G3c, G3d | index-open-ids.live (scratch copy) |
| docs | index-lint-config: config.example.yml, protocol §10.1 line; sprint-pages-agree: roadmap template wording |

## Shape-change reds (existing tests 09 deliberately breaks): Dev must update, not QA
Same precedent as 08-F1; these are green today and go red when the C9.2 shape lands.
1. `test/wiki/build-index-hierarchical.node.test.ts`: whole file. The `STORY-014-xx (N stories)` rollup becomes `  - stories (N): [[STORY-...]], ... - <breakdown>` (Scenarios 2, 2b, status-breakdown); individual story rows lose `(story)`; `## Active` is kept.
2. `test/wiki/fixtures/expected-index-hierarchical.md`: the golden (new row shape, `### Epics` / `### Proposals and initiatives` sections).
3. `test/wiki/page-builder-shared.node.test.ts`: the "CR-103 index row schema round-trips" and "one index writer" describe blocks (`(type)` removed; sprint and digest fields added; the title is always on the line).
4. `test/wiki/build-ingest-parity.node.test.ts:121`: `- [[EPIC-903]] (epic) — 🟢 — Test Epic` becomes `- [[EPIC-903]] — 🟢 · no sprint — Test Epic` (plus a digest if the epic has an objective).
Done by QA (title-only, as the plan directs): `build.node.test.ts` Scenario 14 retitled to the sentinel rule ("roadmap.md lists SPRINT-04 (non-terminal, no sentinel names it: Planned)"); assertions untouched, 81/81 green.
Read, no change needed: `test/scripts/init-sprint-context.red.node.test.ts` and `test/wiki/audit-status.node.test.ts` (neither asserts an index row), `test/wiki/query.node.test.ts` (its own hand-written index text), `bucket-registry-parity` (only `includes('SPIKE-001')`).
Pins that must stay green unedited: `wiki-ingest-synthesis-parity.red` Scenarios 1, 1b, 2; `active-sprint-sentinel.red`.

## Ambiguities (default chosen; each is pinned only as far as stated)
1. **Title is always on the line.** The old row omitted the title when it equalled the ID. With a digest that makes the line unparseable, so the C9.2 line has no optional title. Default: an item with no H1 renders its ID as the title. Pinned only softly (the line parses, carries id/status/sprint).
2. **Indent of items under an area group** (`- area: wiki`). The plan gives the `  - IDs:` line two spaces but is silent on item lines. Default: also two spaces. Not pinned: tests check position (between the area line and the next area/heading), not indentation. Tier-3 `  - IDs:` IS pinned at two spaces.
3. **`partitionSprints(items, ...)` filters to sprints itself** (called with all items, as `roadmap.compile` has them). Pinned: a mixed list yields only sprints; the input array is not reordered. `rankCompletedSprints` is only tested with an already-terminal list (no filter assumed).
4. **`IndexRowData`**: `type` is gone from the line, so `parseIndexRow` cannot return it. Fields pinned: `id, status, sprint, title, digest, drift, indent`. `sprint` is `'no sprint'` when parsed; `formatIndexRow` takes `''` for none and also writes `no sprint`.
5. **Tier 3 and Unparented.** The plan collapses "each epic's or area's" CR/bug lines. Default: Unparented keeps item rows (digest-less); only its IDs are pinned (still present, once).
6. **Compaction header text** after the colon is free. Pinned: exactly one `> Compacted (tier N): <non-empty>` line at index 3 (directly under the auto-generated note). The tier-3 render is compared with the header stripped, so a size in the text is allowed.
7. **Ladder thresholds are self-observed** (tier k+1 is requested as `tokens(tier k) - 5`), so no test depends on the exact byte count of a tier; only the generator calibration carries absolute numbers (tier 0 about 4,800, tier 1 about 3,600, 2x tier 2 about 6,000, 2x tier 3 about 2,700, from a scratch estimator of the C9.2 format). `index-tiers` "generator calibration" asserts tier 0 at 1x is > 4,400 tokens; it is red today only because there are no digests yet.
8. **`buildIndex` without `opts.relations`**: nothing nests, every open ID still appears once (pinned as a guard). Not pinned: where such items land.
9. **Gate 1 row format** (plan: ID, type, status, failing checks). Pinned per line: `[[ID]]`, the status, each failing id in order, `gate not run` / `pass`. The type column is not pinned (the ID already says it). Order is the plan's ACTIVE_BUCKET_ORDER then id (the story text says "by type"; the plan wins). The Gate 1 heading must not say "Proposal".
10. **Open vs Shipped on product-state** pinned literally: Open = status not terminal (Done/Closed/Resolved/Abandoned/Completed), Shipped = path under `archive/`, so a `Resolved` bug in pending-sync counts in Total only.
11. **Roadmap In-Flight row when `state.json` is ok but has no `sprint_status`** reads `— unknown` (plan: `<sprint_status | unknown>`); any non-ok status (missing/EISDIR/malformed) reads `— state unknown` (G-M2-36).
12. **Live test tier assertion** is `tier <= 1` (decision 1 expects 1; tier 0 is allowed if the corpus ever shrinks, tier 2+ fails). It records tokens and tier via `console.log`. Today it fails first at G3d (the roadmap still lists activated_at sprints as in flight); the R6/R7 asserts after it were checked for syntax only, not run against the new behaviour.
13. **Story text vs plan on the 1x header**: the Outline row says "absent"; decision 1 says tier 1. Tests follow decision 1. The story's 87-open/12-CR corpus and the plan's 92-open/17-CR census differ; the generator uses the plan's.

## flashcards_flagged
- "2026-11-12 · #qa-red #test-harness · Tier ladders: ask for tier k+1 at tokens(tier k)-5 from the implementation's own output; no absolute byte pin."
- "2026-11-12 · #qa-red #wiki · A row parser used by reds must not share code with the parseIndexRow under test; and null-returning guards go vacuous, so assert rows.length first."
- "2026-11-12 · #wiki #ingest · A frontmatter-only edit (approved flip) is stamp-only to ingest; synthesis pages that read it stay stale unless the stamp-only path compiles and writes on byte difference."
- "2026-11-12 · #test-harness #macos · BSD sed -i needs an explicit '' backup suffix; without it the script is eaten as the suffix and the file is untouched."

## TPV round 2 (fixes applied; no commit)
Rulings read: `STORY-063-09-tpv.md`, `plans/M2.md` G-M2-49..54.

1. `index-tiers.red.node.test.ts:155`: the tier-3 area comparison is now `areaBlock(t3, a).filter((l) => l.trim() !== '')`. Applied exactly.
2. `state-pages-open-work.red.node.test.ts`: both the EPIC-501 and BUG-501 cases are now seeded with `gate: { pass: true }`, so the flip changes `approved` alone. `flipAndIngest` also reads the item's wiki page body after the build and after the ingest and asserts they are byte-identical (the stamp-only precondition). `readPage` is imported from `_relations-support`. Applied to both cases.

Ruling alignment: no test contradicts G-M2-49..54, so no other test changed. Checked against the rulings and left as they were:
- the compaction header is pinned only as a non-empty line at index 3 (looser than the exact per-tier text, not contradictory);
- area items are pinned by position, not indent, and the tier-3 `IDs:` line is two-space;
- `null`, `''` and absent sprint all give `no sprint`;
- Gate 1 line assertions fit `- [[ID]] — <type> · status: <status> — <checks>`;
- the `active-sprint.ts` source pin matches G-M2-52.

Counts after the fixes: default tier 118 red / 18 green guards (unchanged), plus the live red. On the baseline the two flip cases still red, now at the R7 precondition because Gate 1 does not list epics or bugs yet; the stamp-only body check becomes the discriminating assertion once R7 lands.

Corrected shape-change list for the Dev (per TPV / G-M2-54):
1. `build-index-hierarchical.node.test.ts` (whole file) and its golden `fixtures/expected-index-hierarchical.md`, using the regenerated lines in G-M2-54.
2. `page-builder-shared.node.test.ts`, the "index row schema round-trips" and "one index writer" blocks ("title omitted when equal to id" is inverted).
3. `build-ingest-parity.node.test.ts:123` (not :121), replacement `- [[EPIC-903]] — 🟢 · no sprint — Test Epic`, with no digest.
4. NEW fifth: `bucket-registry-parity.red.node.test.ts:211`, the extractor regex `\/\/ Active counts` becomes `\/\/ Open counts` (G-M2-51).
