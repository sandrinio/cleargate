---
story_id: STORY-063-08
parent_epic_ref: EPIC-063
parent_cleargate_id: null
sprint_cleargate_id: null
carry_over: false
status: Draft
approved: true
approved_by: sandrinio
approved_at: 2026-11-12T00:00:00Z
ambiguity: 🟢 Low
context_source: EPIC-063 (approved 2026-11-12 by sandrinio), §2 story 063-08; relations split out to STORY-063-13 by owner approval 2026-11-12; grounded against cleargate-cli main 2026-11-12
actor: ClearGate orchestrator (the conversational agent)
complexity_label: L3
parallel_eligible: y
expected_bounce_exposure: med
lane: standard
area: wiki,page-schema
db_write_set: []
deferred_verification: []
created_at: 2026-04-17T00:00:00Z
updated_at: 2026-04-17T00:00:00Z
created_at_version: strategy-phase-pre-init
updated_at_version: strategy-phase-pre-init
server_pushed_at_version: null
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-11-11T22:59:31Z
  transition: ready-for-execution
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
stamp_error: no ledger rows for work_item_id STORY-063-08
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-11-11T23:29:26Z
  sessions: []
---

# STORY-063-08: Item Pages Extracted by Section
**Complexity:** L3 — replaces the shared page builder's 1,200-character cut, used by both `wiki build` and `wiki ingest`, with per-type extraction for four templates plus a fallback, a budget allocator and a report-block extract. Computed relations moved to STORY-063-13.

## 1. The Spec (The Contract)

### 1.1 User Story
As the ClearGate orchestrator, I want each wiki page to hold the sections that matter for its type, so that reading 1–5 pages tells me what an item is, why it exists, what it touches and what is still open, without opening a 20–30 KB raw file.

### 1.2 Detailed Requirements
- R1 Header, every type: the page body opens with one identity block. It shows status, owning sprint (`sprint_cleargate_id`), severity (bugs), and gate result (`cached_gate_result.pass`, plus failing criterion IDs when false).
- R2 Per-type extraction replaces the 1,200-character cut (`SUMMARY_BUDGET`, `cleargate-cli/src/wiki/page-schema.ts:161`, applied by `applyBudget` `:252` inside `buildPageBody` `:309`). Sections are located by heading name, numeric prefixes tolerated, the way `extractOpenQuestions` (`:279`) already does:
  - **Epic:** `<objective>` from the §0 agent context; `## 1. Problem & Value`; the IN-SCOPE and OUT-OF-SCOPE bullets of `## 2. Scope Boundaries`; `<architecture_rules>` rules; answered `Human Answer:` lines and still-`Unresolved` questions from `## 6. AI Interrogation Loop`.
  - **Bug:** `## 1. The Anomaly (Expected vs. Actual)`, `## 2. Reproduction Protocol` (first steps), the first lines of `## 3. Evidence & Context` labelled **Evidence**, and the paths in `## 4. Execution Sandbox (Suspected Blast Radius)`. The bug template has no root-cause heading; adding one is a follow-up CR, not this story.
  - **CR:** `## 1. The Context Override` (obsolete and new logic), `## 2. Blast Radius & Invalidation`, and the open items of `## 0.5 Open Questions`.
  - **Sprint:** `## Sprint Goal` and `## 1. Consolidated Deliverables` from the plan. From the report: the report's status, its `### Carried Over` list, and a pointer to `improvement-suggestions.md` when present.
  - **Proposal, initiative, spike, and legacy items without the expected headings:** heading-aware fallback. Skip `<agent_context>` and template guidance, then take sections in order until the budget is reached.
- R3 Budget: the extracted text is ≤ 2,400 characters. When the item has more than 2,000 characters of extractable content, the page uses at least 2,000.
  - Sections are filled in the R2 order.
  - A section that does not fit is cut at a line boundary, never inside an XML tag or a table row, and ends with the existing "bytes not shown — read <raw path>" marker.
  - The identity block sits outside the budget, as does the relations block STORY-063-13 adds.
- R4 Sprint report block: the sprint page's `<!-- BEGIN sprint-report -->` … `<!-- END sprint-report -->` block holds the R2 report extract and a pointer to the report file, not the full report. The markers stay, so STORY-063-04's preservation logic still applies. Today SPRINT-44's page is 23,337 bytes because the whole report is copied in.
- R5 Parity: `wiki build` and `wiki ingest` produce byte-identical extracted pages for the same raw item (CR-103's rule).

### 1.3 Out of Scope
- Computed relations: parent, children, cites, cited_by, the `buildParentRef` fix and neighbour rewrites. STORY-063-13 does these.
- The index (`buildIndex`), digests, open-gates and product-state (STORY-063-09).
- `wiki/decisions.md` (STORY-063-10). It reuses R2's heading locator, but this story doesn't write that page.
- Changing any template's headings, including adding a root-cause heading to the bug template (follow-up CR).
- An LLM-written summary. Extraction is deterministic (EPIC-063 §0).

### 1.4 Open Questions

- **Question:** This story trips the rubric's "L3 + high bounce exposure" signal. Split it?
- **Recommended:** split the relations work into a new STORY-063-13, appended after 063-12 so no IDs change, and keep 063-08 as per-type extraction.
- **Human decision:** Owner approved 2026-11-12: split. Relations (former R4 and R5) moved to STORY-063-13; this story keeps extraction (R1–R5 above) and is re-rated L3 with medium bounce exposure.

- **Question:** Bugs have no root-cause heading (`Bug.md`: Anomaly, Reproduction, Evidence & Context, Execution Sandbox, Verification). What does the page show instead?
- **Recommended:** show `## 3. Evidence & Context` (first lines), labelled "Evidence". Adding a root-cause heading to the bug template is a separate CR.
- **Human decision:** Owner approved 2026-11-12: bug pages show `## 3. Evidence & Context` labelled Evidence (R2); the template heading is deferred to a follow-up CR.

### 1.5 Risks

- **Risk:** build/ingest page parity breaks (CR-103's whole point).
- **Mitigation:** The existing parity tests (`test/wiki/build-ingest-parity.node.test.ts`, `test/wiki/page-builder-shared.node.test.ts`) stay green and gain extraction and report-block cases (R5).
- **Risk:** legacy items with non-template headings produce empty pages.
- **Mitigation:** The R2 fallback, plus a sweep over every current item that fails if any page body is empty.
- **Risk:** 08 and 13 both change `buildPageBody`.
- **Mitigation:** The M2 Architect orders them. Whichever lands second rebases on the first, and the parity tests cover both.

## 2. The Truth (Executable Tests)

### 2.1 Acceptance Criteria (Gherkin)

**SPIDR coverage.**

| Axis | Cover | Reason |
|---|---|---|
| Paths | T | Template-following item vs legacy item (fallback) are two successful routes. |
| Interfaces | T | Pages are written by `wiki build` and by `wiki ingest`, which must agree. |
| Data | T | Extraction differs by item type (epic, bug, CR, sprint): one Scenario Outline. |
| Rules | T | Budget rule (≤ 2,400, ≥ 2,000 when available, no mid-tag cuts). |

```gherkin
Feature: Item pages extracted by section

  @data
  Scenario Outline: Each type's page carries its key sections
    Given the raw <type> fixture <fixture>
    When it is ingested
    Then its page contains <sections>
    And its page shows the identity block with status, sprint and gate result

    Examples:
      | type   | fixture                   | sections                                                                                       |
      | epic   | EPIC-058 (31,334 bytes)   | objective, Problem & Value, in-scope and out-of-scope bullets, unresolved questions            |
      | bug    | a template bug            | anomaly, reproduction steps, Evidence, execution sandbox paths, severity                       |
      | CR     | a template CR             | obsolete and new logic, blast radius, open questions                                           |
      | sprint | SPRINT-44 plan + report   | goal, deliverables, and inside the sprint-report markers only report status, carried over and a report pointer |

  @rules
  Scenario: The budget is used and never cuts structure
    Given EPIC-058, whose first 1,200 characters are all <agent_context>
    When it is ingested
    Then the extracted text is between 2,000 and 2,400 characters
    And no XML tag or table row is cut, and any cut section ends with the marker naming the raw path

  @paths
  Scenario: A legacy item without template headings still gets a page
    Given an archived item whose headings match no type template
    When it is ingested
    Then its page holds its first sections, skipping <agent_context> and guidance blocks, within the budget

  @interfaces
  Scenario: Build and ingest produce the same extracted page
    Given EPIC-058 and SPRINT-44 (plan and report)
    When each page is produced once by `cleargate wiki build` and once by `cleargate wiki ingest`
    Then the two page bodies are byte-identical

  Scenario: Error — a malformed raw body still yields a clean page
    Given an epic whose `<agent_context>` block is never closed, and an item whose body has no extractable text
    When `cleargate wiki build` runs
    Then the first page uses the fallback and contains no XML fragment
    And the second page carries its identity block and "(no extractable content — read <raw path>)"
    And the build exits 0
```

### 2.2 Verification Steps (Manual)
- [ ] Rebuild this repo's wiki and read `wiki/epics/EPIC-058.md`, `wiki/epics/EPIC-063.md`, `wiki/sprints/SPRINT-44.md` and one bug page. Confirm a reader can tell what each item is and what is open without opening the raw file.
- [ ] Confirm `wiki/sprints/SPRINT-44.md` is well under its current 23,337 bytes.

## 3. The Implementation Guide

### 3.1 Context & Files

| Item | Value |
|---|---|
| Primary File | `cleargate-cli/src/wiki/page-schema.ts` |
| Related Files | `cleargate-cli/src/commands/wiki-build.ts`, `cleargate-cli/src/commands/wiki-ingest.ts`, `cleargate-cli/test/wiki/build-ingest-parity.node.test.ts`, `cleargate-cli/test/wiki/page-builder-shared.node.test.ts` |
| New Files Needed | Yes — `cleargate-cli/src/wiki/extract-sections.ts`, `cleargate-cli/test/wiki/extract-sections.node.test.ts` |

### 3.2 Technical Logic
1. **Dependencies.** Depends on STORY-063-04 (M1), whose sprint-report helpers now live in `page-schema.ts`. There is no M2 predecessor. It shares `page-schema.ts`, `wiki-build.ts` and `wiki-ingest.ts` with STORY-063-13, so the two run one after the other in the order the M2 Architect sets. STORY-063-09 and STORY-063-10 depend on this story's extractors.
2. **`extract-sections.ts`.**
   - Generalise the heading scan from `extractOpenQuestions` (`page-schema.ts:279`) into an exported `findSection(body, namePattern)`; STORY-063-10 reuses it.
   - Add one extractor per type (R2) and a budget allocator (R3) that reuses `cutOnBoundary` and the marker format of `applyBudget` (`:252`).
   - Check first whether a heading-anchored locator from CR-112 has landed in `src/lib/readiness-predicates.ts`. On 2026-11-12 there is none, only positional `section(N)`.
3. **`buildPageBody`** (`page-schema.ts:309`) takes the item type and renders the identity block, then the extract. STORY-063-13 appends the relations block.
4. **Sprint report block (R4).** `buildReportBlock`, moved into `page-schema.ts` by STORY-063-04, renders the R2 report extract and a pointer instead of the full report. The markers are unchanged.
5. **Callers.** `wiki-build.ts` and `wiki-ingest.ts` pass the item type to `buildPageBody`.

### 3.3 API Contract (if applicable)
n/a — page format only. `findSection(body, namePattern): string | null` is exported for STORY-063-10.

## Task Breakdown

- [ ] Write red tests for the five §2.1 scenarios (the Outline counts as four cases), using EPIC-058, SPRINT-44 and template fixtures copied into `test/wiki/fixtures/`.
- [ ] Implement `extract-sections.ts` (heading finder, per-type extractors, budget allocator).
- [ ] Rewire `buildPageBody` and its callers in `wiki build` and `wiki ingest`, including the report-block extract.
- [ ] Extend the parity tests with extraction and report-block cases; add a sweep test that builds the real corpus and fails on any empty page body.

## 4. Quality Gates

### 4.1 Minimum Test Expectations

| Test Type | Minimum Count | Notes |
|---|---|---|
| Unit tests | 8 | Four Outline rows plus the four other §2.1 scenarios, on fixtures. EPIC-063 verification level: **unit** (golden extraction per type). |
| Integration tests | 2 | (1) build/ingest parity extended with extraction and report blocks; (2) the real-corpus sweep (no empty bodies, budget held on all current items). Level: **unit** on the real corpus, feeding the **truth oracle** (STORY-063-12). |
| E2E / acceptance tests | 0 | No host-visible behaviour of its own. Pages are judged by the M2 orientation eval (STORY-063-12) and the dogfood read in §2.2. Levels: **live end-to-end** (063-12 eval), **dogfood**. |

### 4.2 Definition of Done (The Gate)
- [ ] Minimum test expectations (§4.1) met.
- [ ] All Gherkin scenarios from §2.1 covered.
- [ ] Peer/Architect Review passed.
- [ ] `test/wiki/build-ingest-parity.node.test.ts`, `test/wiki/page-builder-shared.node.test.ts` and `test/wiki/wiki-ingest-sprint-report.red.node.test.ts` green.

## Existing Surfaces

- **Surface:** `cleargate-cli/src/wiki/page-schema.ts:161` `SUMMARY_BUDGET`, `:252` `applyBudget`, `:309` `buildPageBody`. The shared page builder (CR-103) this story rewrites.
- **Surface:** `cleargate-cli/src/wiki/page-schema.ts:279` `extractOpenQuestions`. The existing heading-scan pattern to generalise.
- **Surface:** `cleargate-cli/src/commands/wiki-ingest.ts:485` `buildReportBlock` (moved into `page-schema.ts` by STORY-063-04). Copies the full report into the sprint page today.
- **Coverage of this requirement:** partial (~50%). The builder, heading scan and budget marker exist; per-type extraction is new.

## Prior work

- [[EPIC-063]] — parent; 063-08 is the "item pages" layer of the awareness work. Relations are STORY-063-13.
- [[CR-103]] — Wiki Page and Index Fidelity: made build and ingest share one builder and introduced the 1,200-character budget being replaced.
- [[CR-063]] — sprint-report ingest; defines the report-block markers kept here.
- [[CR-112]] — heading-anchored predicates (Draft); a possible shared heading locator.
- [[EPIC-015]] — index hygiene and scale; the page/index split this keeps.

## Why not simpler?

- **Smallest existing surface that could carry this:** `buildPageBody` in `page-schema.ts`, the single page builder both commands use.
- **Why isn't extension / parameterization / config sufficient?** Raising `SUMMARY_BUDGET` still spends the budget from the top of the file, which for most epics is `<agent_context>`; EPIC-058's first 1,200 characters are all agent context. Extraction has to go by section, and each template names its sections differently, so one extractor per type is the smallest form that fills the budget with the right content.

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
