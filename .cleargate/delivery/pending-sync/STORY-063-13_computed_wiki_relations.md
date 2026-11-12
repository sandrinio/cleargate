---
story_id: STORY-063-13
parent_epic_ref: EPIC-063
parent_cleargate_id: null
sprint_cleargate_id: null
carry_over: false
status: Draft
approved: true
approved_by: sandrinio
approved_at: 2026-11-12T00:00:00Z
ambiguity: 🟢 Low
context_source: "EPIC-063 (approved 2026-11-12 by sandrinio), §2 STORY-063-13, split out of STORY-063-08 by owner approval 2026-11-12 (granularity rubric: L3 + high bounce); grounded against cleargate-cli main 2026-11-12."
area: wiki,page-schema
actor: ClearGate orchestrator (the conversational agent)
complexity_label: L3
parallel_eligible: y
expected_bounce_exposure: med
lane: standard
db_write_set: []
deferred_verification: []
created_at: 2026-11-12T00:00:00Z
updated_at: 2026-11-12T00:00:00Z
created_at_version: strategy-phase-pre-init
updated_at_version: strategy-phase-pre-init
server_pushed_at_version: null
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-11-11T23:33:56Z
  transition: ready-for-execution
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
stamp_error: no ledger rows for work_item_id STORY-063-13
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-11-11T23:28:34Z
  sessions: []
---

# STORY-063-13: Computed Wiki Relations
**Complexity:** L3 — one new relations module computed across the whole raw corpus, wired into both page writers, with incremental neighbour rewrites on single-file ingest and a lint rule change.

## 1. The Spec (The Contract)

### 1.1 User Story
As the ClearGate orchestrator, I want every wiki page to show its real parent, its children and what it cites and is cited by, so that "what does this touch?" and "what belongs to this epic?" are answered from the wiki instead of grepping 600 raw files.

### 1.2 Detailed Requirements
- **R1 — Parent.** An item's parent is the first set value of `parent_ref`, `parent_epic_ref`, `parent`, in that order.
  - Today's `buildParentRef` (`cleargate-cli/src/commands/wiki-ingest.ts:402`, duplicated at `cleargate-cli/src/commands/wiki-build.ts:214`) reads only `parent_epic_ref`/`parent`. Epics, CRs and nearly all bugs use `parent_ref`, so 0 of 338 pages have a parent.
  - A value that is null, empty, or still a template placeholder (it contains `NNN`, `|`, or `{`; 10 files carry `parent_ref: EPIC-NNN | STORY-NNN-NN` today) means "no parent".
- **R2 — Children.** An item's children are every raw item whose R1 parent names it, stories included. Stories get no pages; they appear only as IDs in their parent's children list.
- **R3 — Citations.**
  - **cites:** every `[[ID]]` in the raw body that resolves to a known raw item.
  - **cited_by:** the reverse of cites.

  Page frontmatter gains `cites: []` and `cited_by: []`. Each list rendered in the page body is capped at 20 IDs plus "+N more"; frontmatter keeps the full list.
- **R4 — One helper.** `computeRelations(rawItems)` in a new `cleargate-cli/src/wiki/relations.ts` replaces both duplicated `buildParentRef`/`buildChildrenRefs` pairs (`wiki-ingest.ts:402,410`; `wiki-build.ts:214,222`). It scans every bucket, stories included. Only page writing honours `wiki.ingest_buckets`.
- **R5 — Incremental correctness.** When `wiki ingest` writes item A, it also rewrites every page whose `children` or `cited_by` set changed: A's old and new parent, plus the items A cited before or cites now. A full `wiki build` and a sequence of single-file ingests end in byte-identical pages.
- **R6 — Missing parent.** A parent ID with a valid shape that resolves to no raw item renders as `<ID> (not found)`, and the build or ingest exits 0.
- **R7 — Lint stays truthful.** `checkBrokenBacklinks` (`cleargate-cli/src/wiki/lint-checks.ts:154`):
  - accepts a parent that exists in the raw corpus but sits in a bucket excluded by `wiki.ingest_buckets`, such as a CR whose parent is a story;
  - still reports a parent that exists nowhere.

### 1.3 Out of Scope
- Per-type section extraction and the 2,000–2,400-character budget (STORY-063-08).
- Index grouping by parent (STORY-063-09 consumes these relations).
- Story wiki pages (stories stay excluded).
- Fixing the 10 placeholder `parent_ref` values in raw files.
- Topic pages' existing `cites:` frontmatter and the `invalidated-citation` lint check (`cleargate-cli/src/wiki/lint-checks.ts:204-221`), which keep working unchanged.

### 1.4 Open Questions
- None. The split from STORY-063-08 was approved by the owner on 2026-11-12, and every rule above follows from the code facts cited.

### 1.5 Risks
- **Risk:** Single-file ingest gets slower, because relations need a corpus scan. Ingest runs in the PostToolUse hook on every Edit/Write.
- **Mitigation:** Ingest already scans the raw corpus for the synthesis recompile (`wiki-ingest.ts:544`). Reuse that one scan, taking it before the bucket filter, instead of adding a second. Time `wiki ingest` on this repo before and after (20 runs) and report it in the PR. EPIC-063 sets no budget for this hook, so none is invented here.
- **Risk:** Lint findings jump once parents exist, for example CRs whose parent is a story.
- **Mitigation:** R7. The real-corpus sweep test also asserts that the number of `broken-backlink` findings after the change equals the number of parents that truly exist nowhere.
- **Risk:** A `cites` field on item pages collides with topic pages' `cites` handling in lint.
- **Mitigation:** The `invalidated-citation` check reads topic pages only (`lint-checks.ts:218-221`). A unit test proves topic lint output is unchanged.

## 2. The Truth (Executable Tests)

### 2.1 Acceptance Criteria (Gherkin)

**SPIDR coverage.**

| Axis | Cover | Reason |
|---|---|---|
| Paths | F | One successful route: relations are computed the same way for every item. Single-file vs full build is an Interfaces difference, covered below. |
| Interfaces | T | `wiki build`, `wiki ingest` and `wiki lint` all read or write relations and must agree. |
| Data | T | Three parent keys, placeholder values, and parents in excluded buckets behave differently. |
| Rules | T | Precedence of parent keys; reverse-link rules; the lint acceptance rule. |

```gherkin
Feature: Computed wiki relations

  @data @rules
  Scenario Outline: Parent and children are computed from the parent keys
    Given <child> whose frontmatter has <key>: <value>
    When `cleargate wiki build` runs
    Then <child>'s page shows parent <shown>
    And <listed>

    Examples:
      | child        | key             | value                    | shown   | listed                                                       |
      | CR-X         | parent_ref      | EPIC-Y                   | EPIC-Y  | EPIC-Y's page lists CR-X among its children                   |
      | STORY-Y-01   | parent_epic_ref | EPIC-Y                   | EPIC-Y  | EPIC-Y lists STORY-Y-01 as a child and no story page exists   |
      | CR-Z         | parent_ref      | EPIC-NNN \| STORY-NNN-NN | (none)  | no page lists CR-Z as a child                                 |
      | BUG-P        | parent_ref and parent_epic_ref | EPIC-Y and EPIC-Q | EPIC-Y | EPIC-Y lists BUG-P; EPIC-Q does not              |

  @interfaces @rules
  Scenario: Single-file ingest keeps neighbours' relations current
    Given EPIC-A cites [[EPIC-B]], and the wiki is built
    When EPIC-A is edited to cite [[EPIC-C]] instead, and ingested on its own
    Then EPIC-B's page no longer lists EPIC-A under cited_by, and EPIC-C's page does
    And the resulting pages are byte-identical to a fresh `wiki build`

  @interfaces @data
  Scenario: Lint accepts a parent in an excluded bucket
    Given CR-S whose parent_ref names STORY-Y-02, with stories excluded by wiki.ingest_buckets
    When `cleargate wiki build` and then `cleargate wiki lint` run
    Then CR-S's page shows parent STORY-Y-02
    And lint reports no broken-backlink finding for CR-S

  @rules
  Scenario: Citations are capped in the body but complete in frontmatter
    Given EPIC-H cited by 25 items
    When the wiki is built
    Then EPIC-H's page body lists 20 cited_by IDs followed by "+5 more"
    And its frontmatter cited_by holds all 25

  Scenario: Error — an item whose parent key names a missing item
    Given BUG-Z with parent_ref EPIC-999 and no EPIC-999 anywhere in the raw corpus
    When `cleargate wiki build` runs
    Then BUG-Z's page shows the parent as "EPIC-999 (not found)" and the build exits 0
    And `cleargate wiki lint` reports a broken-backlink finding for BUG-Z
```

### 2.2 Verification Steps (Manual)
- [ ] After the 0.30.0 release, rebuild this repo's wiki and run `command grep -l '^parent: "\[\[' .cleargate/wiki/{epics,crs,bugs}/*.md | wc -l`. It must no longer be 0.
- [ ] Open `wiki/epics/EPIC-063.md` and confirm STORY-063-01..13 appear as its children.

## 3. The Implementation Guide

### 3.1 Context & Files

> **Pre-commit gate input:** this table is the authoritative file surface for the story's commit (cleargate-enforcement.md §6, always enforced). Every file staged in this story's commit must appear in the Value column, or be covered by `.cleargate/scripts/surface-whitelist.txt`. Non-path rows (e.g. "Mirrors", "New Files Needed: Yes/No") are ignored by the parser.

| Item | Value |
|---|---|
| Primary File | `cleargate-cli/src/wiki/relations.ts` (new, in the verified directory `cleargate-cli/src/wiki/`) |
| Related Files | `cleargate-cli/src/wiki/page-schema.ts`, `cleargate-cli/src/commands/wiki-build.ts`, `cleargate-cli/src/commands/wiki-ingest.ts`, `cleargate-cli/src/wiki/lint-checks.ts`, `cleargate-cli/test/wiki/build-ingest-parity.node.test.ts`, `cleargate-cli/test/wiki/lint.node.test.ts` |
| New Files Needed | Yes — `cleargate-cli/src/wiki/relations.ts`, `cleargate-cli/test/wiki/relations.node.test.ts` |

### 3.2 Technical Logic
- **Dependencies.** None within M2. It needs M1 merged (STORY-063-04 moved the sprint-report helpers into `page-schema.ts`). It shares `page-schema.ts`, `wiki-build.ts` and `wiki-ingest.ts` with STORY-063-08, so the two run one after the other in the order the M2 Architect sets. STORY-063-09 consumes the computed `parent` to nest bugs and CRs under their epic.
- **`relations.ts`.** `computeRelations(rawItems: RawItem[]): Map<string, { parent: string | null; parentFound: boolean; children: string[]; cites: string[]; citedBy: string[] }>`.
  - Reads parent keys in R1 order and rejects placeholders.
  - Resolves `[[ID]]` links against the known ID set.
  - Input is the unfiltered `scanRawItems` result (`cleargate-cli/src/wiki/scan.ts:34`; the bucket filter is applied by callers at `wiki-ingest.ts:544-545`, `:682-683` and `wiki-build.ts:84-85`).
- **`page-schema.ts`.**
  - `WikiPage` gains optional `cites` and `cited_by` (serialized after `children`, parsed with defaults, so old pages still parse).
  - `buildPageBody` (`:309`) renders a relations block after the content STORY-063-08 extracts, with the R3 cap. The block sits outside 08's character budget.
  - Update the field-list comment at `:1-4`.
- **`wiki-build.ts`.** Compute relations once from the unfiltered scan; write every ingestable page with them. Delete `buildParentRef`/`buildChildrenRefs` (`:214`, `:222`).
- **`wiki-ingest.ts`.** Take the scan at `:544` before filtering, compute relations, write A's page, then rewrite the R5 neighbour set: old parent and old cites read from A's existing page frontmatter; new ones from the computed map. Delete `buildParentRef`/`buildChildrenRefs` (`:402`, `:410`).
- **`lint-checks.ts:154`.** Before flagging a missing parent page, check the raw corpus. A parent that exists in an excluded bucket is accepted (R7).

## Task Breakdown
- [ ] Write red tests for the five §2.1 scenarios (the outline counts as four cases) in `test/wiki/relations.node.test.ts`; extend `build-ingest-parity` with the neighbour-rewrite case and `lint.node.test.ts` with the excluded-bucket parent.
- [ ] Implement `relations.ts`.
- [ ] Add `cites`/`cited_by` to `WikiPage`; render the relations block in `buildPageBody`.
- [ ] Wire `wiki build` and `wiki ingest` (incremental neighbour rewrite); delete the four duplicated helpers.
- [ ] Update `checkBrokenBacklinks`; add the real-corpus sweep assertion on broken-backlink counts and the topic-lint regression check.
- [ ] Time `wiki ingest` on one file of this repo before and after (20 runs) and report it in the PR.

## 4. Quality Gates

### 4.1 Minimum Test Expectations

| Test Type | Minimum Count | Notes |
|---|---|---|
| Unit tests | 8 | Four outline rows plus the four other §2.1 scenarios, on temp-repo fixtures through the real handlers. EPIC-063 verification level: unit. |
| Integration tests | 2 | (1) build/ingest parity extended with the neighbour-rewrite case; (2) a real-corpus sweep: parents non-zero, broken-backlink count equals truly-missing parents, topic lint unchanged. Level: unit on the real corpus, feeding the truth oracle (STORY-063-12). |
| E2E / acceptance tests | 0 | No host-visible behaviour of its own. Relations are judged by the M2 orientation eval's "an epic's children" question (STORY-063-12) and the dogfood check in §2.2. Levels: live end-to-end (063-12 eval), dogfood. |

### 4.2 Definition of Done (The Gate)
- [ ] Minimum test expectations (§4.1) met.
- [ ] All Gherkin scenarios from §2.1 covered.
- [ ] Peer/Architect Review passed.
- [ ] `test/wiki/build-ingest-parity.node.test.ts` and `test/wiki/lint.node.test.ts` green.

## Existing Surfaces

- **Surface:** `cleargate-cli/src/commands/wiki-ingest.ts:402` `buildParentRef` and `:410` `buildChildrenRefs`, duplicated at `cleargate-cli/src/commands/wiki-build.ts:214` and `:222`. They read only `parent_epic_ref`/`parent` and only a declared `children:` key, the root cause of 0/338 parents.
- **Surface:** `cleargate-cli/src/wiki/scan.ts:34` `scanRawItems`. The unfiltered corpus scan relations build on; callers apply `wiki.ingest_buckets` after it.
- **Surface:** `cleargate-cli/src/wiki/page-schema.ts:14-15` (`parent`, `children` on `WikiPage`) and `:309` `buildPageBody`.
- **Surface:** `cleargate-cli/src/wiki/lint-checks.ts:154` `checkBrokenBacklinks`. Flags any parent without a page today.
- **Coverage of this requirement:** partial (~40%). The page fields, the scan and the lint check exist; computing relations and keeping neighbours current are new.

## Prior work

- [[EPIC-063]] — parent; this story was split out of STORY-063-08 on 2026-11-12.
- [[CR-103]] — Wiki Page and Index Fidelity: made build and ingest share one page builder. R5's byte-identical rule keeps that parity.
- [[EPIC-015]] — Wiki Index Hygiene & Scale: introduced hierarchical nesting in the index, which STORY-063-09 now feeds with computed parents.
- [[BUG-051]] — work-item type and wiki bucket registries drifted apart (open, tangential). Relations must use the same bucket registry as ingest.

## Why not simpler?

- **Smallest existing surface that could carry this:** `buildParentRef` in the two page writers.
- **Why isn't extension / parameterization / config sufficient?** Fixing `buildParentRef` to read `parent_ref` is a one-line change and would give parents, but not children or citations, because no raw item declares `children:` and nothing computes reverse links. Children and cited_by only exist as a corpus-wide computation, and single-file ingest must update neighbours or the pages drift from a fresh build, the exact build/ingest split CR-103 removed.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟢 Low Ambiguity**

*Evaluate each criterion against its literal text. If you substituted an interpretation, leave the box unchecked and surface the substitution in the Brief.*

Requirements to pass to Green (Ready for Execution):
- [x] Gherkin scenarios completely cover all detailed requirements in §1.2.
- [x] Implementation Guide (§3) maps to specific, verified file paths from the approved Epic and verified codebase grounding.
- [x] No "TBDs" exist anywhere in the specification or technical logic.
- [x] Existing Surfaces cites at least one source-tree path or explicitly states "none — net-new."
- [x] Why not simpler? has both sub-bullets answered (no "TBD" / no "{}").
