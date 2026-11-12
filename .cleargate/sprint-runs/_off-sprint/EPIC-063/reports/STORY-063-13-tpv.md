# STORY-063-13 TPV — Computed wiki relations (role: architect, Mode: TPV)

Branch `story/STORY-063-13` (cli main checkout), red commit `35786e8`. Read-only review. No code edits, no build, no `wiki build` on the outer repo. Probes ran on temp fixtures and a read-only scan of the meta corpus.

## Baseline (re-run, short TMPDIR)
- `relations.red` + `relations-handlers.red` + the 3 changed files + `build-ingest-parity` + `lint.node`: 234 tests, 75 fail, 159 pass. With the live file that makes 76 reds, matching QA-Red's report: 42 unit, 24 handler, 9 pin/shape, plus the live test. `build-ingest-parity.node` and `lint.node` stay green.
- `cr075-standalone-contract` + `bucket-registry-parity.red`: 18/18 pass with the new files present.
- Wiring: every import resolves. `relations.js` is loaded by a per-test computed dynamic import, so the missing module fails test by test. Handler seams (`cwd`, `now`, `gitRunner`, `templateDir`, `exit`) match `WikiBuildOptions`/`WikiIngestOptions`/lint options. Every fixture has cleanup (`afterEach`, or `before`/`after`). Red naming: `*.red.node.test.ts`, live tier `*.live.integration.node.test.ts`.

## Rulings on QA-Red's six ambiguities
1. **Export location: accepted.** `RELATIONS_BEGIN/END`, `buildRelationsBlock` and `replaceRelationsBlock` live in `page-schema.ts`, beside `SPRINT_REPORT_*` (`page-schema.ts:566-567`). `relations.ts` stays data-only (C13.1).
2. **Alias-resolved parent is the canonical ID: accepted.** Real corpus case: `BUG-035-MCP-Test-Isolation-FK-Race` has `parent_ref: STORY-047-01`, which resolves only through the alias to `STORY-047-01-Indexed-Credential-Schema-Verify`. Lint keys pages and `rawItemBuckets` by `item.id`, so a short ID would produce a false `broken-backlink` (`lint-checks.ts:168-176`). 09's nesting also looks parents up by `item.id`.
3. **"+N more" separator: bound for the Developer (amendment 8).** The tests stay lenient.
4. **Block position: pinned now (amendment 5).** C13.3 ("end of the plan-side body"), C8.1 (after the extract, before the report) and `replaceRelationsBlock`'s no-marker fallback all put the block last. Blueprint step 2's "where `## Blast radius` was" is superseded. Today that slot sits *before* `## Open questions` (`page-schema.ts:318-334`).
5. **Initiatives excluded from the sweep: accepted for the child side only.** It is not enough. Initiatives as *parents* break the sweep. See amendment 1.
6. **Numeric IDs: accepted.** `extractWorkItemIds('EPIC-Y')` returns `[]` (probed), so the Gherkin placeholders cannot be used literally.

## Coverage map
| Source | Test |
|---|---|
| Outline rows 1–4 | handlers "Outline" rows 1–4 (+ C-order children, cites/cited_by present, one block) |
| Single-file ingest keeps neighbours current | "EPIC-A re-pointed …" incl. byte-identical fresh build |
| Lint accepts excluded-bucket parent | "CR-S parent_ref STORY-Y-02 …" (build + lint) + ingest variant |
| Cap 20 + "+5 more", fm full | handlers "EPIC-H cited by 25 … and parent of 25"; unit cap/20/21/first-20 |
| Error: missing parent | "BUG-Z … EPIC-999" (fm `[[EPIC-999]]`, body `(not found)`, exit 0, lint finding) + ingest exit 0 |
| Blueprint 1–4, 8–10 | as above |
| Blueprint 5 / R5 | re-point, re-parent, ingest-sequence vs build |
| G-M2-5 creation | cites case + children case, both byte-identical to a fresh build |
| Blueprint 7 (sprint neighbour) | report block bytes, `last_ingest`, report fields |
| G-M2-6 | round trip, block list does not swallow later keys, `[]`, old page parses |
| G-M2-7 | `parentIdOf` free text / leading-ID / wikilink / quotes; `buildParentRef` |
| G-M2-8 | build writes `parent_cleargate_id`/`sprint_cleargate_id`; R5 sequence includes them |
| G-M2-9 | unit (children/cites/cited_by) + handler (children 25) |
| G-M2-10 | unit + handler end to end, lint clean |
| Blueprint 14 topic lint | unit anchor (recorded expectation) + live |
| Blueprint 15 | live sweep (see findings) |

Placing the parity and lint cases in new files, rather than extending `build-ingest-parity`/`lint.node`, is accepted. Both untouched files stay green, so the story's DoD line holds.

**M1 carry-forwards are protected.** A's own page refreshes `last_ingest`. A neighbour keeps `last_ingest`, which `hook.ts:238` G3 dedup reads, plus `last_ingest_commit`, `raw_path`, `last_contradict_sha`, every byte outside the block and the report fields, and gets no `log.md` entry. Gap: neighbour rewrites bump the page *file* mtime, which hides a stale page from lint (amendment 6).

**9 changed-test reds are legitimate.**
- `build-sprint-reports` drops `buildChildrenRefs` (C13.2 delete) and asserts it is gone.
- `build.node` changes `## Blast radius` to `## Relations`.
- `page-builder-shared`:
  - the `input()` helper now carries `relations`, which turns 5 cases red with `input.children is not iterable`; their assertions are unchanged;
  - the "Affects" describe becomes `- Parent: none` with empty lists omitted (the C13.3 contract), so the empty case is still stated explicitly and is never a bare `None.`.

No existing guarantee is weakened. Census (`git grep Affects:|Blast radius|PageBodyInput|buildChildrenRefs|buildPlanStub`): no other test depends on the old shape. `sprint-archive-stamp.integration` declares its story via `parent_epic_ref`, so computed children match the old declared ones.

**Default tier and determinism are OK.**
- No meta-repo reads: `relations.red` reads only `CLI_ROOT/src`, and the handlers use mkdtemp fixtures plus the tracked `templates/synthesis`.
- Time is frozen (`NOW1`/`NOW2`) and SHAs are fixed. `SHA_RUNNER` makes `git show` return the NONZERO sentinel, so ingest's no-op guard never fires (`wiki-ingest.ts:221-223`, `:403`). `raw_path` is relative, so two roots compare byte for byte.

## Findings that force amendments
- **F1: a correct-per-plan implementation fails the live sweep.** `loadWikiPages` skips `initiatives` (`load-wiki.ts:13`, BUG-051(b), allowlisted in `bucket-registry-parity.red`). `EPIC-046` (archive) and `EPIC-047` (pending-sync) have `parent_ref: INITIATIVE-001`. INITIATIVE-001 is a raw item in an *ingestable* bucket with a page, but lint never loads that page, so blueprint step 5's rule reports both epics. Read-only scan of the real corpus (622 items):
  - oracle-missing parents = 1 (`CR-015 → SPRINT-001`);
  - lint findings = 3.
  R7 ("still reports a parent that exists nowhere") makes the 2 extra findings false. → amendment 1.
- **F2: the live oracle is not independent.** It imports `parentIdOf` from `relations.js`, the module under test, and compares counts only, so offsetting errors pass. → amendment 2.
- **F3: the report-path test cannot fail.** "ingesting a sprint REPORT writes the computed relations" has EPIC-991 citing SPRINT-72 *before* the build, so a report path that keeps the stale plan stub, or reads the old page fields, passes too. → amendment 3.
- **F4: R5 is already broken for sprint pages with a report (pre-existing M1 bug, now 13's surface).**
  - Build writes `planStub + buildReportBlock()`, with one `\n` before the block (`wiki-build.ts:171-173`).
  - Ingest's plan path with a kept report writes `planStub.trimEnd() + '\n\n' + block + '\n'` (`wiki-ingest.ts:441-442`).
  - Probe: report-then-plan ingest ≠ build (`…frontmatter\n\n<!-- BEGIN sprint-report -->` vs `…frontmatter\n<!-- BEGIN sprint-report -->`).
  - This is the real close sequence: the report lands, then `close_sprint` edits the sprint file.
  - Report-only sprint relations (blueprint step 3) have no test. → amendment 4.
- **F5: neighbour rewrites hide a stale page.** Lint's `missing-ingest` compares raw mtime with the page *file* mtime (`lint-checks.ts:124-137`, 2 s threshold). A neighbour rewrite makes a stale neighbour look fresh. → amendment 6.
- **F6: upgraded pages end up with two relation sections.** A 0.29 page has no relations markers. The no-marker fallback appends a relations block and leaves `## Blast radius / Affects: no parent/child refs declared in frontmatter`, so after `cleargate upgrade` every hook ingest writes two contradicting relation sections onto neighbour pages. → amendment 7.

## VERDICT: BOUNCE

## Amendments (numbered; QA-Red re-seals; the Developer treats every [Dev] line as binding)
1. **[Dev + QA-Red] Initiative parents (proposed G-M2-37; record it in M2 Amendments).**
   - [Dev] In `load-wiki.ts`, add `export` to `BUCKET_DIRS`. Change nothing else: `bucket-registry-parity.red` extracts it with `/const BUCKET_DIRS = \[…\]/`.
   - [Dev] `checkBrokenBacklinks` imports `BUCKET_DIRS`. A missing parent page raises no finding when `rawItemBuckets` maps the parent to a bucket that is either `!isBucketIngestable(bucket, ingestBuckets)` **or** not in `BUCKET_DIRS`, because lint never reads that bucket's pages. Every other case behaves as specified.
   - [Dev] Protocol §10.5 gets one clause naming this. Fixing BUG-051(b), loading initiative pages in lint, stays out of 13.
   - [QA-Red] Unit: `loaded('EPIC-1','[[INITIATIVE-5]]')` with `rawItemBuckets {INITIATIVE-5:'initiatives'}` and `INGEST` → `[]`.
   - [QA-Red] Handler: `EPIC-9xx parent_ref: INITIATIVE-9yy` with `INITIATIVE-9yy` raw under `CONFIG_NO_STORIES`. `wiki build` writes `initiatives/INITIATIVE-9yy.md` with `children` containing `[[EPIC-9xx]]`, and `wiki lint` reports no `broken-backlink` for EPIC-9xx.
2. **[QA-Red] Live oracle made independent.**
   - Drop the `relations.js` import. Inline an oracle parent function written from R1 + G-M2-7 + G-M2-10:
     - first non-empty string of `parent_ref`/`parent_epic_ref`/`parent`;
     - `NNN`/`|`/`{` → none, with no fall-through;
     - strip quotes, then `[[ ]]`;
     - leading `extractWorkItemIds` ID;
     - resolve by id, else by the `idFromFilename` alias, to the canonical id.
     Shared infra (`scanRawItems`, `idFromFilename`, `extractWorkItemIds`, config helpers) may stay.
   - Replace both count checks with per-item equality:
     - every ingestable item's page `parent` === `[[<canonical-or-written id>]]` or `''`;
     - the set of `broken-backlink` lines === the oracle set of `<bucket>/<id>.md -> <written parent>` (for children in lint-read buckets whose parent resolves nowhere).
     Exclude IDs that occur more than once in the scan from both sets (today: PROPOSAL-013, STORY-014-01, STORY-014-02). Keep `parents > 0`.
   - Pick the topic page's real citation from a lint-read bucket with a status that does not contain `cancelled`.
3. **[QA-Red + Dev] Report path proven computed.**
   - [QA-Red] EPIC-991 starts with no cite. After `runBuild`, rewrite EPIC-991's raw to cite `[[SPRINT-72]]` **without ingesting it**, then ingest the report. Assert:
     - fm `cited_by` is `[[EPIC-991]]`;
     - the body has `- Cited by (1): [[EPIC-991]]`;
     - there is exactly one relations block;
     - `RELATIONS_END` comes before `SPRINT_REPORT_BEGIN`.
   - [Dev] The report path writes `replaceRelationsBlock(extractPlanStub(existing), buildRelationsBlock(r))` + `buildReportBlock(…)`, with page `parent`/`children`/`cites`/`cited_by` taken from the map.
4. **[QA-Red + Dev] Sprint-page R5 parity.**
   - [QA-Red] A sprint with a plan and a report: the sequences report→plan and plan→report are each byte-identical (`pageSnapshot`) to a fresh `runBuild` of a `cloneCorpus`.
   - [QA-Red] A report-only sprint (report, no plan file) named as `parent_ref` by a CR: build's sprint page has `[[CR-…]]` in fm `children` and `- Children (1)` in the body, and ingest(report) then ingest(CR) is byte-identical to build.
   - [Dev] Ingest's plan path with a kept report returns `planStub + extractReportBlock(existing) + '\n'`, with no `trimEnd` and no extra blank line. That is byte-identical to build's `planStub + buildReportBlock(body)`.
   - [Dev] Report-only pages in both writers use `rel.get(id) ?? EMPTY_RELATIONS` and define `cites`/`cited_by`.
5. **[QA-Red + Dev] Block position.**
   - [Dev] The relations block is the last element of `buildPageBody`'s output, after `## Open questions`.
   - [QA-Red] In the `buildPageBody` describe, assert `indexOf(RELATIONS_BEGIN) > indexOf('## Open questions')` and `body.trimEnd().endsWith(RELATIONS_END)`.
6. **[QA-Red + Dev] Neighbour rewrite keeps the page file's mtime.**
   - [Dev] Stat the neighbour page before writing, then `fs.utimesSync(page, st.atime, st.mtime)` after writing. A's own page is written normally.
   - [QA-Red] Handler test:
     - build, then back-date `epics/EPIC-931.md` by 60 s (`utimesSync`);
     - `wiki lint` reports `missing-ingest` for it;
     - ingest EPIC-930 re-pointed to EPIC-932;
     - `wiki lint` still reports `missing-ingest` for `epics/EPIC-931.md`.
7. **[QA-Red + Dev] Legacy (0.29) pages.**
   - [Dev] Only when the body has no relations markers, `replaceRelationsBlock` first removes an exact legacy pair (a line equal to `## Blast radius`, immediately followed by a line starting `Affects: `, plus one following blank line), then applies the no-marker rule. With markers present it never strips: after 08, a CR part may be labelled `## Blast radius`.
   - [QA-Red] Unit on `# T\n\nsummary\n\n## Blast radius\nAffects: no parent/child refs declared in frontmatter\n\n## Open questions\nQ\n`:
     - no `## Blast radius` and no `Affects:` remain;
     - there is one block, after `## Open questions`;
     - the same body with a report block → the relations block lands before the report and the report bytes are intact;
     - a body that has markers and also a `## Blast radius` line elsewhere keeps that line.
8. **[Dev] Separator.** A list over the cap renders the first 20 `[[ID]]`s joined with `, `, then `, +N more` (for example `- Cited by (25): [[A]], …, [[T]], +5 more`).
9. **[Dev] Misc binding.**
   - (a) Writers set page `parent` from `rel.get(id).parent` (canonical, ruling 2), never from `buildParentRef`.
   - (b) An out-of-scan A (blueprint step 4) is appended to the `computeRelations` input only. `rebuildIndex`/`recompileSynthesis` get the scan's filtered list without it, so the index stays equal to build's.
   - (c) Neighbour IDs with no map entry or no page are skipped and never throw (ingest still exits 0).
   - (d) The placeholder test uses `String.includes` for `NNN`/`|`/`{`, and IDs go through `extractWorkItemIds`/`idFromFilename` only. `npm run check:no-inline-id-regex` must be clean.

## Orchestrator notes
- After QA-Red re-seals, record G-M2-37 (amendment 1) and amendments 4–7 under M2 `## Amendments`.
- 13's file list gains `src/wiki/load-wiki.ts` (one keyword).
- The protocol §10.4 body example (`## Blast radius` at `scaffold/core/.cleargate/knowledge/cleargate-protocol.md:294`) stays 08's, per G-M2-11. It is stale between the 13 and 08 merges, and both ship in 0.30.0.
- Pre-existing and not amended: build copies a raw `last_contradict_sha` (`wiki-build.ts:133-135`), while a first-time ingest only carries the page's. A from-scratch ingest sequence of a stamped raw item therefore differs from build. That is M1 02/04 behaviour, and no 13 test exercises it.

## Script Incidents
None. No `run_script.sh` invocation; probes were `npx tsx` scripts in the session scratchpad on temp fixtures and a read-only corpus scan.

flashcards_flagged:
- `2026-11-12 · #wiki #lint · loadWikiPages skips initiatives (BUG-051b): an epic parented by an initiative is a false broken-backlink.`
- `2026-11-12 · #wiki #sprint-report · Ingest plan-path joins stub+kept report with \n\n, build with \n: report-then-plan ingest differs from build.`
- `2026-11-12 · #wiki #lint · Lint missing-ingest reads page FILE mtime; a neighbour rewrite that bumps it hides a stale page.`
