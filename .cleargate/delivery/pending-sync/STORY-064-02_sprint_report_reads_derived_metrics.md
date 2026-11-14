---
story_id: STORY-064-02
parent_epic_ref: EPIC-064
parent_cleargate_id: EPIC-064
sprint_cleargate_id: SPRINT-45
carry_over: false
status: Draft
approved: true
approved_by: sandrinio
approved_at: 2026-11-14T00:00:00Z
ambiguity: 🟢 Low
context_source: "EPIC-064 §4; verified 2026-11-14: prep_reporter_context.mjs:18-26 passes qa_bounces/arch_bounces through from state.json; sprint_report.md:64-100 defines first-pass rate from those counters; close_sprint.mjs:451-458 requires six §3 rows by regex"
area: measurement,reporting,agent-prompts,templates
actor: Reporter agent at sprint close
complexity_label: L2
parallel_eligible: n
expected_bounce_exposure: low
lane: standard
db_write_set: []
deferred_verification: []
created_at: 2026-11-13T22:57:07.985Z
updated_at: 2026-11-13T22:57:07.985Z
created_at_version: strategy-phase-pre-init
updated_at_version: strategy-phase-pre-init
server_pushed_at_version: null
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-11-13T22:59:39Z
  transition: ready-for-execution
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
stamp_error: no ledger rows for work_item_id STORY-064-02
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-11-13T22:59:39Z
  sessions: []
last_contradict_sha: "dba5e0aaca23224c234053c519470eff103995f31d0afe46a199069a8093b5b4"
---

# STORY-064-02: Sprint Report Reads Derived Metrics
**Complexity:** L2 — one bundle section, the report template's §3 sources, and the Reporter's instructions.

## 1. The Spec (The Contract)

### 1.1 User Story
As the owner reading a sprint report, I want its rework, first-pass and cost figures to come from the derived metrics, so that I can trust the report without a recount.

### 1.2 Detailed Requirements
- **R1 — Bundle section.** `prep_reporter_context.mjs` runs `sprint_metrics.mjs <sprint-id> --json` as a child process, as it already does for `count_tokens.mjs`. It adds a `## Measured Metrics` section after the Token Ledger Digest containing:
  - a per-item table: item, dispatches, rework (red / dev / verify / total), git rework, wall time, tokens, models;
  - sprint-level and unattributed totals with the unattributed share;
  - one line per item where `disagrees` is true, in the form `<ID>: derived <n>, git <m>, state.json counter <k>`.
- **R2 — Degradation.** If `sprint_metrics.mjs` fails (missing, non-zero exit, timeout or unreadable output), the section is one line, `dispatch data: not measured (sprint_metrics.mjs <reason>)`. If it reports dispatch data "not measured", the section states `dispatch data: not measured` on one line and still lists the roster items, with dispatch, wall-time, token and model cells shown as "not measured" and rework taken from git (contract C2). Either way the bundle is written and the script exits 0. Missing-ledger handling is unchanged: `count_tokens.mjs` exits 1, and `prep_reporter_context.mjs` warns and still writes the bundle (BUG-081). *(CR:spec-clarification SC-1, SPRINT-45 M2 plan, 2026-11-14.)*
- **R3 — Token digest label.** The Token Ledger Digest heading becomes `## Token Ledger Digest (orchestrator window)`. Its content is unchanged.
- **R4 — Report template §3.**
  - **Rework rows.** Rows `Total QA bounces` and `Total Arch bounces` are kept and followed by `Rework rounds (measured)` and `Git rework commits (measured)`.
  - **First-pass rate.** It is redefined in the template's comment as "items with measured rework total 0 / total items × 100". The counter-based definition is kept as `First-pass success rate (state.json counters)` for one release, so old and new can be compared.
  - **Cost rows.** `Subagent tokens (measured)`, `Unattributed share (measured)` and `Orchestrator window tokens (ledger)` are added.
  - **Required rows.** The six rows `close_sprint.mjs` requires are untouched.
- **R5 — Reporter instructions.** `reporter.md` §Workflow step 6 tells the Reporter:
  - Fill §3 rework, first-pass and cost rows from the `## Measured Metrics` bundle section.
  - Name a state.json counter only where the bundle lists a disagreement.
  - Write "not measured" where the bundle says so, never a zero.

### 1.3 Out of Scope
- The derivation itself (STORY-064-01) and the dispatch reader (CR-120).
- Removing counter rows. That happens one release later, after comparison.
- The dashboard and `close_sprint.mjs`.

### 1.4 Open Questions

- **Question:** Keep the counter-based first-pass rate during the transition?
- **Recommended:** Yes, for one release, labelled as the counter figure, so SPRINT-45 and the dispenser pilot show both side by side.
- **Human decision:** Accepted at Gate 1 (owner confirmed in the SPRINT-45 Brief, 2026-11-14).

### 1.5 Risks

- **Risk:** The bundle exceeds its 160 KB budget on a large sprint.
- **Mitigation:** One row per item and totals only. A 50-item fixture asserts the section stays under 12 KB.
- **Risk:** The Reporter keeps reading the counters out of habit.
- **Mitigation:** The template comment and `reporter.md` both name the bundle section, and a content test pins both.

## 2. The Truth (Executable Tests)

### 2.1 Acceptance Criteria (Gherkin)

**SPIDR coverage.**

| Axis | Cover | Reason |
|---|---|---|
| Paths | T | Metrics available, and metrics not measured |
| Interfaces | F | One surface: the Reporter bundle (the template and `reporter.md` are text it reads, pinned by content tests) |
| Data | F | The bundle renders whatever contract C2 holds; data variety is covered in STORY-064-01 |
| Rules | T | Disagreement lines appear only where `disagrees` is true; required close rows survive |

```gherkin
Feature: Sprint report reads derived metrics

  @paths
  Scenario: The bundle carries a Measured Metrics section
    Given a fixture sprint with token-ledger.jsonl, state.json and a sprint_metrics result for two items
    When prep_reporter_context runs for the sprint
    Then the bundle contains "## Measured Metrics" after "## Token Ledger Digest (orchestrator window)"
    And it lists both items with dispatches, rework and tokens

  @rules
  Scenario: Only disagreeing items name their counter
    Given STORY-A has derived rework 2, git rework 2 and state.json counters summing to 0
    And STORY-B agrees on all three
    When the bundle is built
    Then it contains "STORY-A: derived 2, git 2, state.json counter 0"
    And no disagreement line names STORY-B

  @paths
  Scenario: Metrics not measured never fail the bundle
    Given sprint_metrics reports dispatch data "not measured"
    When prep_reporter_context runs
    Then it exits 0 and the Measured Metrics section states "dispatch data: not measured"

  @rules
  Scenario: The report template keeps the rows close requires
    Given the canonical sprint_report.md
    Then it contains every row in close_sprint.mjs requiredMetricRows
    And it contains "Rework rounds (measured)", "Subagent tokens (measured)" and "First-pass success rate (state.json counters)"
    And reporter.md step 6 names the "## Measured Metrics" bundle section
```

### 2.2 Verification Steps (Manual)
- [ ] Build the bundle for SPRINT-44 from the canonical scripts and read the Measured Metrics section against the holdout recount.

## 3. The Implementation Guide

### 3.1 Context & Files

| Item | Value |
|---|---|
| Primary File | `cleargate-cli/scaffold/core/.cleargate/scripts/prep_reporter_context.mjs` |
| Related Files | `cleargate-cli/scaffold/core/.cleargate/templates/sprint_report.md`, `cleargate-cli/scaffold/hosts/claude/.claude/agents/reporter.md`, `cleargate-cli/scaffold/hosts/codex/.codex/agents/reporter.toml` (generated by `npm run gen:codex`, never hand-edited) |
| Test Files | `cleargate-cli/test/scripts/prep-reporter-measured-metrics.red.node.test.ts`, `cleargate-cli/test/agents/reporter-measured-metrics.red.node.test.ts`, `cleargate-cli/test/scripts/test_prep_reporter_context.node.test.ts`, `cleargate-cli/test/agents/reporter-content.node.test.ts` |
| New Files Needed | Yes — the two red test files only; no new source file (CR:spec-clarification SC-2) |

### 3.2 Technical Logic
- Mirror the existing `count_tokens.mjs` child-process call (`prep_reporter_context.mjs` around line 247) for `sprint_metrics.mjs --json`, forwarding `CLEARGATE_SPRINT_DIR`.
- Render from contract C2 fields only. Never re-derive anything.
- Template and `reporter.md` edits are text, pinned by the two content tests.

## 4. Quality Gates

### 4.1 Minimum Test Expectations

| Test Type | Minimum Count | Notes |
|---|---|---|
| Unit tests | 2 | Section rendering; disagreement-line filter — epic level Unit |
| Integration tests | 1 | Fixture sprint through `prep_reporter_context.mjs` as a child process — epic level Integration, journey "Close a sprint with true numbers" |
| E2E / acceptance tests | 4 | 1 per Gherkin scenario in §2.1 |

### 4.2 Definition of Done (The Gate)
- [ ] Minimum test expectations (§4.1) met.
- [ ] All Gherkin scenarios from §2.1 covered.
- [ ] Peer/Architect Review passed.

## Existing Surfaces

- **Surface:** `cleargate-cli/scaffold/core/.cleargate/scripts/prep_reporter_context.mjs:18-26` — the bundle's section list; the token digest child-process call is the pattern to copy.
- **Coverage of this requirement:** ≥80% extension — one more section in an existing builder.
- **Surface:** `cleargate-cli/scaffold/core/.cleargate/templates/sprint_report.md:64-100` — §3 Execution Metrics.
- **Coverage of this requirement:** partial — rows added; required rows kept.

## Prior work

- [[EPIC-013]] — Sprint Report v2 and first-pass rate definition.
- [[CR-036]] — Reporter token diet and the bundle budget.
- [[CR-129]] — Draft; structured goal verdict in the same report, not touched here.

## Why not simpler?

- **Smallest existing surface that could carry this:** the Reporter reading `metrics.json` directly.
- **Why isn't extension / parameterization / config sufficient?** The Reporter starts cold and reads only its bundle (CR-036), so a number outside the bundle does not reach the report. Adding one bundle section is that extension. The template and `reporter.md` change only so the Reporter knows which rows the section fills.

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
