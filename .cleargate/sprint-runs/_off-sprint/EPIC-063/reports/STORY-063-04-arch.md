# STORY-063-04 Architect post-flight

role: architect

**ARCH: PASS**

## What I reviewed
- Dev commit: `60fc77a` on `story/STORY-063-04`
- QA-Red: `22ed6a4`, plus harness amendment `201bf0c`
- Base: `main` @ `323c9a7`
- Plan: `plans/M1.md`, sections C4 and STORY-063-04
- The checkout was already on `story/STORY-063-04` @ `60fc77a` and clean. I did not check out any other ref; the base was read with `git show 323c9a7:<path>`.

## Checks I ran
| Check | Result |
|---|---|
| `npx tsc --noEmit` | exit 0 |
| `node --test --import tsx/esm` on `build-sprint-reports.red`, `build-ingest-parity`, `wiki-ingest-sprint-report.red` | 30/30 pass |
| `check-no-inline-id-regex.mjs` (via `run_script.sh`) | exit 0 |
| Read-only tsx probe of the real repo: `listSprintReports` + `parseFrontmatter` | 37 found, 37 parse, 15 legacy `REPORT.md`; every one has a plan file. Goal check (2) of 37/37 is reachable once dist is rebuilt. |

## Findings by check

### 1. The C4 contracts match exactly
**C4.1** is in `src/wiki/page-schema.ts:566-629`:
- `SPRINT_REPORT_BEGIN` and `SPRINT_REPORT_END` have the exact string values the plan specified.
- `buildParentRef`, `buildChildrenRefs`, `extractReportBlock`, `extractPlanStub`, `buildPlanStub` and `buildReportBlock` have the names and signatures in the contract.

**C4.2** is the new file `src/wiki/sprint-reports.ts`:
- It defines `SprintReportFile { sprintId; absPath; relPath }` and `listSprintReports(repoRoot)`.
- `relPath` is built with `/` separators and is accepted by `isSprintReportPath`.
- `sprintId` comes from `deriveBucketFromReportPath`. It cannot throw for a hit, because both regexes require a `SPRINT-\d{2,}` directory (`derive-bucket.ts:31-55`).
- A missing runs directory returns `[]`. A non-directory entry such as `.active` hits `ENOTDIR` and is skipped.
- The file contains no ID regex.

STORY-063-05 consumes exactly this function and type.

### 2. `page-schema.ts` is still pure, and `buildPageBody`/`buildIndex` are untouched
- `command grep '^import'` finds no imports in the file.
- The diff is a single append-only hunk, `@@ -559,3 +559,71 @@`, placed after `buildIndex`.
- `buildPageBody` (`:309`) and `buildIndex` (`:429`) are byte-identical to the base.

### 3. The helpers moved with identical behaviour, and no duplicates remain
- Every code line is identical to the deleted copies (`wiki-ingest.ts` base `:415-507`, `wiki-build.ts` base `:214-231`).
- The only text change: the marker literals became the equal-valued constants.
- Comment wording was trimmed in two places, `buildPlanStub` and the `extractReportBlock` docstring. Code is unchanged.
- `command grep -rn` over `src/` finds exactly one definition of each helper and one occurrence of each marker literal, both in `page-schema.ts`.
- `buildSharedPageBody` is gone. Ingest's private sprint-aware `buildPageBody` (`wiki-ingest.ts:420-446`) now calls the imported helpers, as the plan specified.

### 4. G1/R5 is carried in the right order, with no new hash
`wiki-build.ts:131-145`:
1. Use the raw frontmatter's `last_contradict_sha` when it is a non-empty string. `upsertFrontmatterField` always writes it quoted (`contradict.ts:608,616`), so the `typeof === 'string'` guard is sound.
2. Otherwise use `parsePage(existing page).last_contradict_sha`, inside a try/catch.
3. Otherwise omit the field.

The existing page is read before `writePage` overwrites it. Nothing between the mkdir step (`:83-86`) and the loop clears the wiki.

The diff contains no `createHash` and no `contradictContentHash`. Three R5 tests cover this: raw and page, page only, and raw only.

### 5. The report pass follows the spec
- It is gated on `isBucketIngestable('sprints', ingestBuckets)` (`:102`).
- The canonical `SPRINT-NN_REPORT.md` is preferred: `hits.find(basename !== 'REPORT.md') ?? hits[0]` (`sprint-reports.ts:36`).
- Read errors and `parseFrontmatter` errors are caught per report and written to stderr as `wiki build: skipped report <rel>: <msg>`. The build continues.
- Nothing after the try can throw. `deriveRepo('.cleargate/…')` always returns `planning`, and `buildReportBlock`/`buildPlanStub` are pure.

**Composition, plan present:** the body is `buildPlanStub(plan) + buildReportBlock(report.body)`, plus `report_raw_path` and `last_report_ingest_commit`. `getGitSha` is called on the absolute path, the same as ingest at `wiki-ingest.ts:201`, so the no-op comparison holds.

**Composition, report only:** the fields mirror ingest's report-only path when `existingPage` is undefined.

`serializePage` emits fields in a fixed order (`page-schema.ts:42-70`), so the order in which object keys are assigned cannot change the bytes.

### 6. No new dependencies and no unrelated edits
- `package.json` and `package-lock.json` are unchanged.
- The Dev diff touches only the four planned source files.
- `201bf0c` touches only the red test's exit seam. `wikiBuildHandler` never calls `exit(0)`, so the `CleanExit` tolerance only absorbs ingest's no-op `exit(0)`.

## Non-blocking notes
1. **Lexical sort.** `listSprintReports` compares `sprintId` as strings, so `SPRINT-100` would sort before `SPRINT-11`. That meets "sorted by sprintId" literally. STORY-063-05 must not rely on this order: it sorts Recently Completed by `generated_at` with a `numericStem` tie-break (plan §05.2).
2. **Report-only carry-forward.** The report-only path also carries the existing page's `last_contradict_sha` (`wiki-build.ts:201`). The plan's mirror of the `existingPage === undefined` case does not include this. It is consistent with R5 and with ingest's own carry-forward (`wiki-ingest.ts:254`). Accepted.
3. **Duplicate sprint IDs.** `reports.delete(item.id)` (`:183`) means a second raw file with the same sprint id rewrites the page without the report block. This is not a regression, since the base dropped every report block. The repo has no duplicate sprint ids today. It is a data edge case.
4. **Discarded body.** For sprints that have a report, the per-item `buildPageBody` result is computed and then thrown away. By construction it equals `buildPlanStub(...)`. The cost is trivial.
5. **`last_contradict_sha` divergence.** Build prefers the raw value; ingest's plan path carries only the page value (`wiki-ingest.ts:239`). The two disagree only when raw and page already disagree. The plan requires raw-first, so leave it.
6. **Hierarchy keys (pre-existing, out of scope).** Build still does not emit `parent_cleargate_id`/`sprint_cleargate_id`; ingest does (`wiki-ingest.ts:256-261`). This is frontmatter-only, predates this story, and the M1 parity target is bodies. It is a candidate for M2 063-08.

## 7. Line shifts for STORY-063-05 (cite by function name)
| Plan citation | Base `323c9a7` | Now `60fc77a` |
|---|---|---|
| `wiki-build.ts:205` (`compileActiveSprint(items, templateDir)`) | :205 | **:291** |
| `wiki-ingest.ts` `writeSynthesisPage` (plan `:623-643`) | :636-656 | **:575-595** (active-sprint call at **:583**) |
| `wiki-ingest.ts` `recompileSynthesis` (plan `:645`) | :658 | **:597** |
| `wiki-ingest.ts` `BUCKET_SYNTHESIS_MAP` (plan `:565`, G14: do not change) | :578 | **:517** |
| `page-schema.ts` `TERMINAL_STATUSES` (`:164`) | :164 | :164 (unchanged; the 04 hunk is append-only) |
| `src/dashboard/collect.ts` | — | untouched |

05 must call `listSprintReports(repoRoot)` itself inside `compile`. Build's local `reports` map is consumed destructively (`reports.delete`) and is not exposed, so 05 cannot reuse it.

## Flashcards flagged
- `FLASHCARD.md:3` ("wiki build writes pages without last_contradict_sha … every rebuild wipes Phase 4 stamps") becomes stale when this merges. Supersede it with a card saying build now carries the stamp: raw mirror first, then the existing page.
- Candidate: `#wiki #sort` — "listSprintReports sorts sprintId lexically (SPRINT-100 < SPRINT-11); order by generated_at/numericStem where order matters."

## Script Incidents
None.
