# STORY-063-13 Architect post-flight: Computed wiki relations (role: architect, Mode: Post-Flight)

Branch `story/STORY-063-13` in the cli main checkout: red `35786e8`, amend `f401e99`, dev `ffbf104`. This review was read-only. I made no edits, no build, no `npx tsup`, and no `wiki build` on the outer repo. Probes ran with `node --import tsx` against a `git archive story/STORY-063-13` copy in the session scratchpad. They used temp fixtures (the branch's own `_relations-support.ts` helpers) plus a read-only timing pass over the meta corpus.

**Verdict up front: PASS. 13 merges as is.**
- The C13 exports match the plan exactly.
- Every TPV `[Dev]` binding (amendments 1 and 3–9) is applied as written.
- I found two defects on the C13 surface that my plan never specified (F1, F2) and one plan gap of mine (F3). None is a Developer deviation.
- 0.30.0 ships only at §R, so nothing reaches a user between merges. Recommended route: a small `13-F1` before 08 starts, following the 03-F1 precedent.

---

## 1. C13 exports vs the plan (what 08 and 09 consume)

| Contract | Plan | Branch | OK |
|---|---|---|---|
| C13.1 `ItemRelations` | `parent: string\|null; parentFound; children; cites; citedBy` | identical (`relations.ts:14-25`) | ✓ |
| `RelationsMap` | `ReadonlyMap<string, ItemRelations>` | identical | ✓ |
| `EMPTY_RELATIONS` | the empty value | `Object.freeze`, shallow (the arrays inside are not frozen; nit F8) | ✓ |
| `RELATIONS_LIST_CAP` | 20 | 20 | ✓ |
| `parentIdOf(fm)` | R1 order; `NNN`/`\|`/`{` → null with no fall-through; strip quotes and `[[ ]]`; must start with the leading ID | identical; uses `String.includes` (9d) | ✓ |
| `computeRelations(items)` | `Pick<RawItem,'id'\|'fm'\|'body'\|'absPath'>[]` → `Map` | identical | ✓ |
| Purity | relations imports `work-item-id` + `import type` only | `work-item-id.ts` has no imports; `page-schema.ts` imports only `relations.js` | ✓ |
| C13.2 `WikiPage.cites?/cited_by?` | serialized after `children`, only when defined | ✓ (`page-schema.ts:56-61`) | ✓ |
| `parseFmRaw` block lists (G-M2-6) | `/^\s+- (.*)$/`, quotes stripped | ✓ | ✓ |
| `PageBodyInput.relations` | replaces `parent`/`children` | ✓ | ✓ |
| `buildParentRef` kept and fixed; `buildChildrenRefs` deleted | | ✓. `buildParentRef` now has no production caller (tests only); writers take `parent` from the map (9a) | ✓ |
| `buildPlanStub({…, relations})` | | ✓ | ✓ |
| C13.3 `RELATIONS_BEGIN/END`, `buildRelationsBlock`, `replaceRelationsBlock` | in `page-schema.ts` (TPV ruling 1) | ✓. Format, ID order, `, +N more` (amendment 8) and last position (amendment 5) all match | ✓, but see F1 on marker matching |
| C13.4 neighbour rewrite | | ✓ except the report-only sprint (F2) | see F2 |

Refinements that stay inside the contract:
- **Alias map.** `relations.ts` aliases a short ID only when it is not itself a known ID, and the first alias wins (scan order). Build and ingest share one scan, so both are deterministic.
- **Wikilink scan.** `wikilinkTargets` uses `indexOf` rather than the plan's `/\[\[([^\]\n]+)\]\]/g`. I checked `[[A\n[[B]]`, `[[A]x]]`, `[[[X]]`, `[[A]]]` and `[[]]`: same targets (an empty target never resolves).

**No rework for 08/09.**
- 08 builds on `PageBodyInput & { type }` and must keep `lines.push(buildRelationsBlock(input.relations), '')` as the last plan-side element.
- 09 gets `rel` already in scope at both index call sites: `wiki-build.ts` before `buildIndex`, and `wiki-ingest.ts:354` before `rebuildIndex`, whose signature will gain `rel`.

## 2. Incremental correctness (R5)

Events that change *another* item's relations, and whether the neighbour set covers them:

| Event | Changed pages | Covered |
|---|---|---|
| A re-parented | old parent's and new parent's `children` | ✓ old parent from A's page, new from the map |
| A's cites change | old/new cited items' `cited_by` | ✓ (old cites come from A's page via the fixed `parsePage`) |
| A created (G-M2-5) | items citing A (their `cites` now resolve); A's children (`parentFound` flips, so `- Parent:` re-renders) | ✓ `citedBy(A) ∪ children(A)` |
| A's sprint report ingested | none (report bodies are not in the scan, in build or ingest) | ✓ rewrites are compare-then-skip no-ops |
| `git mv` pending-sync → archive (0.29 shell hook) | none: the ID comes from the filename, which is unchanged | ✓ `hook.ts:236-238` dedup sees `raw_path` change and ingests the new path; the scan finds A at its new path; the map is identical |
| Commit or merge touching N delivery files | | ✓ All N are on disk before `hookShellIngestHandler` ingests the first, so the first ingest already uses the final map |
| **Report-only sprint as the neighbour** | its `children` | ✗ **F2** (probe P2: `sprints/SPRINT-74.md` `children: []` vs build `[[CR-996]]`) |
| **Excluded-bucket item (story) created, re-parented or edited** | parent epic `children`, cited items' `cited_by` | ✗ **F3** (probe P3: `epics/EPIC-800.md` differs). Ingest exits at `wiki-ingest.ts:163-168` and shell-ingest skips at `hook.ts:228`, both before any scan |
| **Raw file deleted** | its parent, its cited items, its children (`parentFound`) | ✗ **F3** (probe P4). Deletes are never ingested (`hook.ts` filters on `existsSync`) |
| New A whose ID equals an existing legacy alias short ID | the previously aliased item loses `cited_by`/`children` | ✗ F3 edge: rare, and that item is not in A's set |
| 0.29 page for A (no `cites` field) | items A stopped citing before its first 0.30 ingest | acceptable: those neighbours are 0.29 pages with no `cited_by` either |

The amendment-4 report-only test passes only because CR-996 exists before the report is ingested. When the CR is re-parented to the report-only sprint *after* the build, the result diverges (P2).

## 3. Neighbour rewrites (`wiki-ingest.ts:504-552`)

- **Fields.** `parsePage` → set the four relation fields from the map → `serializePage(page, replaceRelationsBlock(body, block))`.
  - `raw_path`, `last_ingest`, `last_ingest_commit`, `last_contradict_sha`, the cleargate-id keys and the report fields round-trip through `parsePage`.
  - The neighbour's sprint-report block is outside the replaced range.
  - `next === content` skips unchanged pages, so they are not written and keep their mtime.
- **Canonical re-serialize.** This drops any frontmatter key `WikiPage` does not know. Our writers emit none. Topic pages (the only pages with foreign keys) have no raw item, so they are never neighbours. OK.
- **mtime.** `fs.utimesSync(file, st.atime, st.mtime)` (`:547`) keeps lint's `missing-ingest` truthful (amendment 6). Millisecond precision against a 2 s threshold is fine. Shell-ingest's G3 dedup reads fm `last_ingest`, not page mtime, so it is unaffected.
- **No `log.md` entry is right.**
  - Nothing in `src/` reads `log.md`: build writes it whole, ingest appends to it.
  - §10.6 says "one entry per ingest". The ingest of A still writes exactly one.
  - A neighbour rewrite is derived output, not a source ingest. Logging it would add up to 48 `update` lines per ingest (EPIC-058's neighbour set) for raw files that did not change.
- **Marker matching is substring-based.** This is F1, and it affects neighbour rewrites, A's report path and the legacy path.

## 4. One corpus scan per hooked ingest: cost and failure modes

**Scan count.**
- Before 13, `rebuildIndex` and `recompileSynthesis` each scanned the corpus. Every bucket maps to at least `open-gates` and `product-state`, so that was 2 scans per ingest.
- After 13 it is 1 scan (`wiki-ingest.ts:256-274`) plus `computeRelations` plus at most |neighbour set| page reads.
- The scan stays after the no-op exit.

**Measured in-process on the real corpus** (622 items, 344 pages, 20 runs; read-only; QA was running at the same time, so p95 is noisy and QA's dist timing is authoritative):

| Step | p50 | p95 |
|---|---|---|
| `scanRawItems` | 119.7 ms | 507 ms |
| `computeRelations` | 3.4 ms | 9.0 ms |
| read + `parsePage` of all 344 pages (a hypothetical full sweep, see F3) | 21.5 ms | 179 ms |

Largest neighbour set: EPIC-058, 48. Net per ingestable ingest: about one scan cheaper (≈ −120 ms p50) plus about 5 ms.

**Shell hook batch.** `hookShellIngestHandler` calls `wikiIngestHandler` once per changed file, so N files cost N scans (2N before 13). A batched ingest is a later optimisation, not 13's job.

**Failure modes.**
- **A malformed raw file elsewhere** is skipped by the scan's per-file `try/catch` (`scan.ts` parse block), so A's ingest is unaffected. While that file is malformed, its ID leaves the known set, so a neighbour rewritten in that window renders it `(not found)`. It heals when the file is fixed and ingested (`children ∪ citedBy` of that file).
- **A scan-wide throw** (`fs.statSync`/`readFileSync` outside any try in `scan.ts`: a dangling symlink, or a race with a concurrent `mv`) leaves `scanned = []`.
  - A's page is written with empty relations (`- Parent: X (not found)`, no children) and no neighbour is touched.
  - The index is emptied too, which is pre-existing M1 behaviour.
  - That is F5.

## 5. Lint

- `checkBrokenBacklinks` gains optional `opts`. With no `opts`, behaviour is unchanged.
- It skips a missing parent page only when `rawItemBuckets` places the parent in a bucket that is either not ingestable or not in `BUCKET_DIRS` (G-M2-37, amendment 1).
- `wikiLintHandler` builds `rawItemBuckets` from one `scanRawItems` (first wins). A scan throw falls back to the old behaviour.
- `load-wiki.ts` changes by one `export` keyword.
- No other check is touched. `checkInvalidatedCitations` still reads topic pages only.
- The only lint-output change is the intended one: about 174 pages now carry a parent and get a backlink check, and the live sweep shows 1 true `broken-backlink` (CR-015 → SPRINT-001). QA owns the before/after real-corpus diff.
- Nit: the comment at `lint-checks.ts:232` ("WikiPage doesn't have a cites field") is now stale.

## 6. Protocol and page-schema header

- **§10.4 field note** matches the code: key order, the placeholder rule, the free-text rule, stories scanned while excluded, cap 20 and `, +N more`, complete frontmatter lists.
- **§10.5.** The G-M2-37 clause matches the code. The **last sentence overclaims**: "so single-file ingests end byte-identical to a full `wiki build`" is false for F2 and F3. That is F4.
- **§10.4 body example** still shows `## Blast radius`. That is 08's paragraph (G-M2-11) and was already recorded in the TPV.
- **Header comment** (`page-schema.ts:1-10`) correctly lists 10 required and 7 optional fields. But the `WikiPage` doc comment at `page-schema.ts:20` still says "nine required + three optional". The `rebuildIndex` comment at `wiki-ingest.ts:586` ("one extra pass") is stale too. Both are F8 nits.

## 7. Adjacent files: what 08 must pick up

- **`src/wiki/synthesis/*.ts`**: nothing to do. None of them reads page `parent`/`children` or page bodies; they compile from raw items.
- **`src/commands/wiki-query.ts`**: nothing to do. It writes *topic* pages with an inline `cites: [...]`. Topics have no raw item, so they are never relation neighbours, and the inline-list parse path is unchanged.
- **`scaffold/hosts/claude/.claude/agents/cleargate-wiki-ingest.md:66-107`**: now actively wrong, not just stale. Its field rules say:
  - "`parent` — wrap the raw `parent_epic_ref`";
  - "`children` — copy from raw frontmatter";
  - "Then a `## Blast radius` section".

  The agent is the documented fallback when no hook fired. One that follows these rules writes pages that contradict build and lint, and the next neighbour rewrite then treats them as legacy pages.

  **08 must:**
  - replace the agent's manual page-authoring steps with `cleargate wiki ingest <file>` (the single page writer, CR-103), or at least mark the four relation fields as computed and never hand-authored;
  - update the page example in `cleargate-wiki-query.md:85-105` to the C8.1 layout with the relations block;
  - tell the query agent to answer "what belongs to / what cites X" from fm `children`/`cited_by`. This feeds 12's "an epic's children" eval question.
- **Codex `.toml` agents** are generated (header `# GENERATED by … build-codex-payload.mjs`). 08 regenerates them via `npm run gen:codex` and never hand-edits them. The live mirrors re-sync at §R.
- **Outside M2 (follow-up CR; F7):**
  - `src/lib/wiki/contradict.ts:445` `collectNeighborhood` is a third copy of the parent rule (`parent_epic_ref ?? parent`; it ignores `parent_ref`).
  - Its sibling step (`:451-466`) was dead because `parsePage` returned `children: []`. G-M2-6 made it live, so Phase 4 neighbourhoods now include siblings and hit the 12-path truncation more often. That is an unflagged behaviour change, though it matches STORY-020-02's intent.
  - `src/dashboard/backlog.ts:99-102` is a fourth parent rule. It takes `parent_epic_ref` before `parent_ref` (the reverse of R1) and does not reject placeholders, so on outline row 4 (BUG-P) the dashboard and the wiki disagree.
  - Both should call `parentIdOf`.

---

## Findings

| # | Severity | Blocking | Where | Finding | Route |
|---|---|---|---|---|---|
| F1 | Med | no | `page-schema.ts:640-652` (`replaceRelationsBlock`); pre-existing same class at `:655-667` (`extractReportBlock`/`extractPlanStub`) | Markers are found with `indexOf`, so an **inline quote** of a marker is taken for the real one. See "F1 detail" below. | 13-F1 (before 08) |
| F2 | Low-Med | no | `wiki-ingest.ts:529-530` | The neighbour set is restricted to IDs that have a raw item, so a **report-only sprint page** (no plan file, in the ingestable `sprints` bucket, page exists) is skipped. C13.4 says "restricted to ingestable buckets with an existing page". Probe P2: the CR is re-parented to SPRINT-74 after the build, ingest leaves `children: []`, build has `[[CR-996]]`. **Fix:** when `nid` has no raw item, derive its bucket from the ID (`getBucketFromId`, `src/lib/wiki/contradict.ts`) and continue when the bucket is ingestable and the page exists. **Test:** the P2 sequence is byte-identical to build. | 13-F1 |
| F3 | Med | no (plan gap, mine: "keep the early exits") | `wiki-ingest.ts:163-168`, `hook.ts:228`; deletes never ingested | Edits to **excluded-bucket items** (stories: 278 of 622 raw items, and the dominant children) and **deletions** never run relations. Parent epics' `children` and cited items' `cited_by` stay stale until that page is next written (its own ingest or as someone's neighbour) or rebuilt (probes P3, P4). Same root: 10's `stories → decisions` mapping (G-M2-17) never fires when stories are excluded. No acceptance check fails (G2/G2b run after a full rebuild; 12's eval builds clean). See open decision 2. | orchestrator decision |
| F4 | Low | no | protocol §10.5, last sentence | Overclaims byte-identity for every single-file ingest. **Narrow it to:** "for edits and creations of items in ingestable buckets; edits to excluded-bucket items and deletions are reflected at the next `wiki build` or the next ingest that rewrites the affected page." Rewrite again if open decision 2 lands a sweep. | 13-F1 |
| F5 | Low | no | `scan.ts` (`statSync`/`readFileSync` outside a try) | One unreadable directory entry throws the whole scan. Ingest then writes A with empty relations (and an empty index, pre-existing). **Fix:** a per-entry `try/catch` → `continue` (report through 10's `onSkip`). | 10 (owns the `scan.ts` `onSkip` change) |
| F6 | Low | no | `cleargate-wiki-ingest.md:66-107`, `cleargate-wiki-query.md:85-105` (+ generated codex tomls) | The agent page-authoring rules contradict computed relations. See §7. | 08 |
| F7 | Info | no | `contradict.ts:445-466`, `dashboard/backlog.ts:99-102` | A third and a fourth parent rule. The contradiction sibling step became live through the G-M2-6 fix. See §7. | follow-up CR |
| F8 | Nit | no | `page-schema.ts:20`; `wiki-ingest.ts:586`; `lint-checks.ts:232`; `EMPTY_RELATIONS` | Stale comments ("nine required + three optional", "one extra pass", "WikiPage doesn't have a cites field"). A shallow freeze lets `EMPTY_RELATIONS.children.push` mutate the shared constant. Deep-freeze the arrays or type them `readonly`. | 13-F1 (optional) |
| F9 | Info | no | `init.ts:553-558` vs `upgrade` | `init` runs a bootstrap `wiki build`; `cleargate upgrade` does not. Upgraded repos keep 0.29 pages, with the old `parent` rule and `## Blast radius`, until each page is rewritten. That mixed state yields `broken-backlink` findings and exercises the F1 legacy path. Note also that §R step 3 (`init`) already rebuilds the wiki in place before step 5. | §R step 2: a CHANGELOG 0.30.0 line, "run `cleargate wiki build` after upgrading" |
| F10 | Info | no | raw corpus | One real item has `parent_ref: <ID> \| <ID> \| <ID>` (a multi-parent declaration). The R1 `\|` placeholder rule reads it as "no parent". This conforms to the contract; flagged for the owner only. | none |

### F1 detail

Probe P1 (real shape: `wiki/crs/CR-063.md:21` quotes both report markers inline). A 0.29 page with no relations markers goes through the no-marker branch. `indexOf(SPRINT_REPORT_BEGIN)` hits the inline quote, and the block is spliced **mid-sentence**:

```
- **Recommended:** Yes. Plan-ingest must preserve any existing `

<!-- BEGIN relations -->
…
<!-- END relations -->
<!-- BEGIN sprint-report -->…<!-- END sprint-report -->` block verbatim.
```

Probe P1b: with markers present, an extract line quoting `<!-- BEGIN relations -->` inline makes the replace delete every byte from that quote up to the real `END`.

The pre-existing twin:
- `wiki/sprints/SPRINT-27.md:54`'s report text quotes `<!-- END sprint-report -->` inline.
- `extractReportBlock` stops there, so a plan re-ingest keeps a truncated report.

**Fix:**
- Match only lines exactly equal to a marker, searching from the end of the body: report END = the last full-line END; report BEGIN = the last full-line BEGIN before it; relations END = the last full-line `RELATIONS_END` before the report BEGIN (or the end of the body); relations BEGIN = the last full-line `RELATIONS_BEGIN` before that.
- The no-marker branch inserts before the full-line report BEGIN.
- Generated blocks already sit on their own lines, so **no rendered byte changes** and 08's goldens are unaffected in either order.

**Tests:**
- the CR-063 legacy shape;
- an extract quoting the relations marker inline and again as a full line inside a fence;
- the SPRINT-27 shape (plan re-ingest keeps the whole report).

Prior lesson in the same class: FLASHCARD 2026-08-29 `#test-harness #tpv #danger` (a block that quotes its own markers).

## Carry-forwards

**08**
- If 13-F1 has not landed: F1, plus a plan amendment. C13.3 and C8.7 both say "markers unchanged", and that must become the full-line rule.
- F6, then `npm run gen:codex`.
- Keep the relations block last on the plan side and on its own lines.
- Test 5 measures the extract region from the identity line to the **full-line** `RELATIONS_BEGIN`, not `indexOf`.
- The §10.4 body example (G-M2-11).

**09**
- Thread `rel` into `buildIndex` at both call sites. No new scan, no second `computeRelations`.
- Nest only when `parentFound` is true and the parent is among the index items.
- A CR or bug whose parent is a story (excluded): `rel.get(story).parent` names the epic, because stories are in the map. 09's plan needs a stated default: nest under the story's epic, or list it as Unparented.
- `rel` contains an out-of-scan A that is not in the index items. That is harmless.

**10**
- Ingest passes `scanned` (unfiltered, `wiki-ingest.ts:260`) as `allItems`; build passes `all`. Never add a second scan.
- F5 in `scan.ts`.
- F3 note: story §1.4 decisions refresh only on other ingests or a rebuild while stories are excluded.

**11**
- `allItems` = the same `scanned`. Nothing else from 13.

**§R**
- F9 CHANGELOG line.
- Step 3's `init` already rebuilds the wiki, so step 5 is the second build. That is harmless.

## Open decisions for orchestrator

1. **Route F1/F2/F4/F8.**
   - **Recommended:** `STORY-063-13-F1`, a new branch after 13 merges that lands before 08's QA-Red. It changes no rendered output and keeps 08's goldens single-sealed.
   - Alternative: fold the fixes into 08 as a plan amendment to C13.3/C8.7. That widens 08's QA surface.
2. **F3 (excluded-bucket edits and deletes).**
   - (a) Accept and document. F4's narrowed §10.5 text does this.
   - (b) Follow-up CR. An excluded-bucket ingest, and a shell-ingest delete, runs scan → `computeRelations` → a relations-only sweep over ingestable pages (patch when they differ, restore mtime). Measured cost per story edit on this repo: about 120 ms of scan plus about 21 ms of sweep (p50), on a path that today exits right after the config load.

   Default: (a) in M2, with (b) proposed as a follow-up CR.

## Script Incidents

None. There was no `run_script.sh` invocation. Probes were `node --import tsx` scripts in the session scratchpad. They imported from a `git archive` copy of the branch and used mkdtemp fixtures (P1, P1b, P2, P3, P4) plus a read-only scan of the meta corpus for timing.

VERDICT: PASS

flashcards_flagged:
- `2026-11-12 · #wiki #page-schema · Page block markers found by indexOf hit inline quotes (CR-063 cites the sprint-report markers); match full lines only.`
- `2026-11-12 · #wiki #ingest · Excluded-bucket edits (stories) exit before relations: epic children/cited_by stay stale until the epic is rewritten.`
- `2026-11-12 · #wiki #contradict · parsePage's block-list fix made Phase 4's sibling step live; collectNeighborhood still reads parent_epic_ref only.`
