---
story_id: STORY-063-04
parent_epic_ref: EPIC-063
parent_cleargate_id: null
sprint_cleargate_id: null
carry_over: false
status: Completed
approved: true
approved_by: sandrinio
approved_at: 2026-11-12T00:00:00Z
ambiguity: 🟢 Low
context_source: EPIC-063 (approved 2026-11-12 by sandrinio), §2 STORY-063-04; grounded against cleargate-cli main 2026-11-12.
area: wiki,cleargate-cli
actor: ClearGate orchestrator (the conversational agent)
complexity_label: L2
parallel_eligible: y
expected_bounce_exposure: low
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
  last_gate_check: 2026-11-11T23:11:57Z
  transition: ready-for-execution
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
stamp_error: no ledger rows for work_item_id STORY-063-04
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-11-11T23:11:57Z
  sessions: []
---

# STORY-063-04: `wiki build` Keeps Sprint Reports
**Complexity:** L2 — move four private helpers into the shared page module, and add one scan step to `wiki build`.

## 1. The Spec (The Contract)

### 1.1 User Story
As the ClearGate orchestrator, I want every closed sprint's report to stay on its wiki page after a full rebuild, so that "what did the last sprints ship and carry over" is answerable from the wiki.

### 1.2 Detailed Requirements
- **R1 — build scans reports.** `cleargate wiki build` finds every report file under `.cleargate/sprint-runs/SPRINT-*/` that `isSprintReportPath` accepts (`REPORT.md` legacy, or `SPRINT-NN_REPORT.md`). It composes each into that sprint's page exactly as `cleargate wiki ingest <report>` does: the plan stub above, the report block between `<!-- BEGIN sprint-report -->` and `<!-- END sprint-report -->` below.
- **R2 — one composition, two commands.** The plan-stub and report-block helpers move from `wiki-ingest.ts` into `cleargate-cli/src/wiki/page-schema.ts`, beside `buildPageBody` and `buildIndex` (CR-103's pattern). Build and ingest both call them, so the same inputs give byte-identical sprint pages.
- **R3 — report fields.** Build writes `report_raw_path` and `last_report_ingest_commit` on the page, as ingest does, so a later `wiki ingest <report>` stays idempotent.
- **R4 — report without a plan.** A sprint with a report but no plan file in `.cleargate/delivery/` still gets a page built from the report, as ingest already does.

Backfill on this repo (1 → 37 of 37 sprint pages with a report block) is the §2.2 verification of R1 on real data, not a separate requirement.

### 1.3 Out of Scope
- Changing what the report block contains (STORY-063-08 replaces the full copy with an extract).
- Ingesting other `sprint-runs/` files.
- Changing `close_sprint.mjs` Step 7.5.

### 1.4 Open Questions
- None. Each of the 37 sprint directories holds exactly one report file (checked 2026-11-12), so there is no legacy-vs-canonical tie to break today. R1 still prefers `SPRINT-NN_REPORT.md` if both ever exist.

### 1.5 Risks
- **Risk:** Build and ingest drift apart again, which is how this bug happened (CR-063 changed ingest only).
- **Mitigation:** R2's shared helpers, plus a parity test in `test/wiki/build-ingest-parity.node.test.ts` that builds and ingests the same sprint and compares the bytes.

## 2. The Truth (Executable Tests)

### 2.1 Acceptance Criteria (Gherkin)

**SPIDR coverage.**

| Axis | Cover | Reason |
|---|---|---|
| Paths | T | Plan + report, report only, and report then rebuild. |
| Interfaces | T | Two commands (`wiki build`, `wiki ingest`) must produce the same page. |
| Data | T | Two report filename shapes: legacy `REPORT.md` and canonical `SPRINT-NN_REPORT.md`. |
| Rules | F | No business rule beyond R2's parity, which the Interfaces scenario covers. |

```gherkin
Feature: wiki build keeps sprint reports

  @paths @data
  Scenario Outline: A rebuild composes every sprint report into its page
    Given SPRINT-A has a plan file and a report named <report file>
    When `cleargate wiki build` runs
    Then wiki/sprints/SPRINT-A.md has the plan stub followed by the report block
    And the page carries report_raw_path and last_report_ingest_commit

    Examples:
      | report file           |
      | SPRINT-A_REPORT.md    |
      | REPORT.md             |

  @paths
  Scenario: A report with no plan file still gets a page
    Given SPRINT-B has a report but no plan file in .cleargate/delivery/
    When `cleargate wiki build` runs
    Then wiki/sprints/SPRINT-B.md exists and carries the report block

  @interfaces
  Scenario: Build and ingest agree
    Given SPRINT-A with a plan and a report
    When the page is produced once by `wiki build` and once by `wiki ingest <plan>` then `wiki ingest <report>`
    Then the two page bodies are byte-identical

  @paths
  Scenario: Error — a report ingested before a rebuild is not lost
    Given SPRINT-C's report was ingested with `wiki ingest`
    When `cleargate wiki build` runs afterwards
    Then wiki/sprints/SPRINT-C.md still carries the report block
    And a following `wiki ingest <report>` reports "unchanged (no-op)"
```

### 2.2 Verification Steps (Manual)
- [ ] After release, run `cleargate wiki build` in this repo, then `command grep -l 'BEGIN sprint-report' .cleargate/wiki/sprints/*.md | wc -l`. It must print 37.

## 3. The Implementation Guide

### 3.1 Context & Files

| Item | Value |
|---|---|
| Primary File | `cleargate-cli/src/commands/wiki-build.ts` |
| Related Files | `cleargate-cli/src/wiki/page-schema.ts`, `cleargate-cli/src/commands/wiki-ingest.ts`, `cleargate-cli/src/wiki/derive-bucket.ts`, `cleargate-cli/test/wiki/build.node.test.ts`, `cleargate-cli/test/wiki/build-ingest-parity.node.test.ts`, `cleargate-cli/test/wiki/wiki-ingest-sprint-report.red.node.test.ts` |
| New Files Needed | No |

### 3.2 Technical Logic
- Move `extractReportBlock` (`wiki-ingest.ts:422`), `extractPlanStub` (`:432`), `buildPlanStub` (`:467`) and `buildReportBlock` (`:485`) into `page-schema.ts` as exports. `wiki-ingest.ts` imports them, with no behaviour change, and its existing sprint-report tests must stay green.
- `wiki-build.ts`, after the per-item loop (`:91-124`):
  - List `.cleargate/sprint-runs/SPRINT-*/`.
  - Pick the report file with `isSprintReportPath` (`derive-bucket.ts:30`), preferring the canonical name.
  - Derive the sprint ID with `deriveBucketFromReportPath`.
  - Compose `buildPlanStub(plan)` + `buildReportBlock(report)` with the shared helpers, and write the page with the report fields from R3.
  - When `isBucketIngestable('sprints')` is false, skip all of this.

## Task Breakdown
- [ ] Red tests: the outline (both filename shapes), report-only, parity, and rebuild-after-ingest.
- [ ] Move the four helpers into `page-schema.ts`; keep ingest's tests green.
- [ ] Report scan and composition step in `wiki-build.ts`.
- [ ] typecheck plus the full `npm test`.

## 4. Quality Gates

### 4.1 Minimum Test Expectations

| Test Type | Minimum Count | Notes |
|---|---|---|
| Unit tests | 5 | Two outline rows, report-only, parity, rebuild-after-ingest. Temp-repo fixtures through the real handlers. EPIC-063 level: unit. |
| Integration tests | 0 | No external infra; the handler tests above use real files and git. |
| E2E / acceptance tests | 1 | The §2.2 backfill check on this repo after release (37/37). EPIC-063 level: dogfood. |

### 4.2 Definition of Done (The Gate)
- [ ] Minimum test expectations (§4.1) met.
- [ ] All Gherkin scenarios from §2.1 covered.
- [ ] Peer/Architect Review passed.

## Existing Surfaces

- **Surface:** `cleargate-cli/src/commands/wiki-build.ts:84-124`. Scans `.cleargate/delivery/` only and writes each page with `buildPageBody`; it never reads `sprint-runs/`, so it overwrites report blocks.
- **Surface:** `cleargate-cli/src/commands/wiki-ingest.ts:103` (report-path carve-out), `:206-209` (report idempotency via `last_report_ingest_commit`), `:241-258` (plan and report field carry-over), `:422-495` (the four composition helpers).
- **Surface:** `cleargate-cli/src/wiki/derive-bucket.ts:21-36`. `isSprintReportPath` and the two filename shapes.
- **Surface:** `cleargate-cli/test/wiki/build-ingest-parity.node.test.ts:35`. CR-103's parity suite, extended here.
- **Coverage of this requirement:** ≥ 80% extension. The composition exists in ingest; build gains a scan and calls the same helpers.

## Prior work

- [[EPIC-063]] — parent.
- [[CR-063]] — added sprint-report ingest but not the build path. This story finishes it.
- [[CR-103]] — moved `buildPageBody`/`buildIndex` into the shared module so build and ingest can't disagree. Same pattern here.

## Why not simpler?

- **Smallest existing surface that could carry this:** `wiki-build.ts`'s per-item loop plus ingest's existing helpers.
- **Why isn't extension / parameterization / config sufficient?** It is extension. Calling `wiki ingest` on each report after a build was rejected because it doubles the writes and leaves two code paths able to disagree, the CR-103 failure mode. Sharing the helpers is the smallest change that keeps one composition.

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
