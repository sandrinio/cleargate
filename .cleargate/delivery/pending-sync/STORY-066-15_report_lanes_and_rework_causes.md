---
story_id: STORY-066-15
parent_epic_ref: EPIC-066
parent_cleargate_id: null
sprint_cleargate_id: null
carry_over: false
area: sprint-execution,reporting
status: Draft
approved: true
approved_by: sandrinio
approved_at: 2026-11-15T09:05:00Z
ambiguity: 🟢 Low
context_source: "SPRINT-46 Goal check (d) sandbox run 1, finding S16 (.cleargate/field-trials/2026-11-sandbox-s46.md; sandbox SPRINT-01_REPORT.md and sprint_metrics.mjs SPRINT-01 --json); EPIC-066 success metric 'dispatches per item by lane'; owner /goal 2026-11-15: 'file any findings and fix them. run e2e tests until we achieve the goal. then ship npm and github. make decisions yourself' (decisions delegated; recorded in sprint-context Mid-Sprint Amendments)"
actor: Reporter writing the sprint report, and the human reading it at Gate 4
complexity_label: L1
parallel_eligible: y
expected_bounce_exposure: low
lane: standard
db_write_set: []
deferred_verification: []
created_at: 2026-11-15T09:00:00.000Z
updated_at: 2026-11-15T09:00:00.000Z
created_at_version: strategy-phase-pre-init
updated_at_version: strategy-phase-pre-init
server_pushed_at_version: null
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-11-15T08:59:47Z
  transition: ready-for-execution
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
stamp_error: no ledger rows for work_item_id STORY-066-15
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-11-15T08:59:37Z
  sessions: []
---

# STORY-066-15: The sprint report shows dispatches by lane and rework by defect location
**Complexity:** L1 — two output lines in the Reporter's context bundle and the prompt and template rows that use them; no new script.

## 1. The Spec (The Contract)

### 1.1 User Story
As the human reading the sprint report at Gate 4, I want it to show how many agent dispatches each lane's items took and where the rework came from (code, red test, spec), so that I can see whether the three build paths cost what they should without running `sprint_metrics.mjs` myself.

### 1.2 Detailed Requirements
- Requirement 1: `prep_reporter_context.mjs` `renderMeasuredMetrics` adds, after the `Totals:` line and only when dispatch data is measured, one line per lane in `doc.by_lane`, in the order fast, standard, runtime, then any other lane: `By lane: <lane> — <items> items, <dispatches> dispatches, <per_item> per item.` A lane whose `dispatches` is `not measured` prints `not measured` for its numbers. The per-item table and every existing line stay byte-identical.
- Requirement 2: after the lane lines, one line from `doc.totals.rework_by_defect_in`: `Rework by defect location: code <n>, red-test <n>, spec <n>, unknown <n>.` When the key is absent the line reads `Rework by defect location: not measured.`
- Requirement 3: `reporter.md` §3 Execution Metrics tells the Reporter to fill a `Dispatches by lane` row and a `Rework by defect location` row from those bundle lines (writing `not measured` where the bundle does), and to say in one sentence per lane which path its items ran (fast: Developer then merge; standard: QA-Red, Developer, QA-Verify; runtime: story plan, QA-Red, Developer, QA-Verify, post-flight), taking the stage lists from the bundle or `segment_stages.mjs`, not inventing them. `templates/sprint_report.md` §3 gains the two rows. `reporter.toml` is regenerated.

### 1.3 Out of Scope
- How `sprint_metrics.mjs` counts dispatches, phases or rework (STORY-066-10; the phase gap for hand dispatches is in `intake.md`).
- Changing the per-item table's columns (a sealed test pins it).
- Whether a rework cause is right: STORY-066-13 fixes the `defect_in: none` booking at its source.

### 1.4 Open Questions

> Resolve every entry before flipping ambiguity to 🟢. Each entry pairs a question with a recommended answer.

- **Question:** Add a Lane column to the per-item table, or separate lines?
- **Recommended:** Separate lines after `Totals:`. `test/scripts/prep-reporter-measured-metrics.red.node.test.ts` is sealed and pins the table; new lines leave it unchanged and keep the bundle's existing readers working.
- **Human decision:** Resolved by the orchestrator under the owner's delegation (/goal, 2026-11-15) per the recommendation.

### 1.5 Risks

> Risks specific to this Story (cross-story risks belong in the Sprint Design Review).

- **Risk:** the template row breaks a canonical-vs-live template parity test.
- **Mitigation:** those are rule-18 known reds until the Gate 4 live re-sync; QA-Verify names any that start.

## 2. The Truth (Executable Tests)

### 2.1 Acceptance Criteria (Gherkin)

**SPIDR coverage.** One row per axis. `T` = at least one scenario below carries the axis tag
(`@paths`, `@interfaces`, `@data`, `@rules`). `F` = no scenario carries it, and the row states
why. There is no Spike row: open discovery is chartered as a SPIKE item (`templates/spike.md`)
before this item is written.

| Axis | Cover | Reason |
|---|---|---|
| Paths | F | One path: the bundle renders the metrics document. |
| Interfaces | F | One interface: the bundle's `## Measured Metrics` section. |
| Data | T | Measured vs not-measured lanes, and a metrics document with or without `rework_by_defect_in`. |
| Rules | T | Existing lines stay byte-identical; the Reporter copies, never invents, the numbers. |

```gherkin
Feature: The sprint report shows dispatches by lane and rework by defect location

  @data
  Scenario Outline: The bundle renders the lane and rework lines
    Given a sprint_metrics document whose by_lane is <by_lane> and whose totals.rework_by_defect_in is <rework>
    When prep_reporter_context.mjs renders the Measured Metrics section
    Then it contains <lane_lines>
    And it contains <rework_line>

    Examples:
      | by_lane                                                   | rework                                   | lane_lines                                                                                         | rework_line                                                                 |
      | fast 1/1/1, standard 2/14/7, runtime 1/7/7                | code 3, red-test 1, spec 0, unknown 0    | "By lane: fast — 1 items, 1 dispatches, 1 per item." first and "By lane: runtime — 1 items, 7 dispatches, 7 per item." last | "Rework by defect location: code 3, red-test 1, spec 0, unknown 0."          |
      | standard with dispatches "not measured"                   | absent                                   | "By lane: standard — 2 items, not measured dispatches, not measured per item."                      | "Rework by defect location: not measured."                                   |

  @rules
  Scenario: Existing bundle lines are unchanged
    Given the sealed fixture of prep-reporter-measured-metrics.red.node.test.ts
    When the section is rendered
    Then the per-item table, the Totals line and the First-pass line are byte-identical to today

  @rules
  Scenario: The Reporter prompt and template carry the two rows
    Given the canonical reporter.md, its generated reporter.toml and templates/sprint_report.md
    Then reporter.md §3 names the "Dispatches by lane" and "Rework by defect location" rows, says to copy them from the bundle and write "not measured" where the bundle does, and asks for one sentence per lane on the path it ran
    And sprint_report.md §3 has both rows
    And reporter.toml carries the same reporter.md text
```

### 2.2 Verification Steps (Manual)
- [x] Goal check (d): the sandbox re-run's `SPRINT-01_REPORT.md` §3 shows dispatches by lane and rework by defect location matching `sprint_metrics.mjs SPRINT-01 --json`.

## 3. The Implementation Guide

### 3.1 Context & Files

> **Pre-commit gate input:** this table is the authoritative file surface for the story's commit (cleargate-enforcement.md §6, always enforced). Every file staged in this story's commit must appear in the Value column, or be covered by `.cleargate/scripts/surface-whitelist.txt`. Non-path rows (e.g. "Mirrors", "New Files Needed: Yes/No") are ignored by the parser.

| Item | Value |
|---|---|
| Primary File | `cleargate-cli/scaffold/core/.cleargate/scripts/prep_reporter_context.mjs` |
| Related Files | `cleargate-cli/scaffold/hosts/claude/.claude/agents/reporter.md`, `cleargate-cli/scaffold/hosts/codex/.codex/agents/reporter.toml`, `cleargate-cli/scaffold/core/.cleargate/templates/sprint_report.md`, `cleargate-cli/test/scripts/prep-reporter-lanes.red.node.test.ts` |
| New Files Needed | Yes — the red test file |

### 3.2 Technical Logic
1. `renderMeasuredMetrics` (`prep_reporter_context.mjs:388`): after the `Totals:` push (`:459-466`), when `!DNM`, push the lane lines from `doc.by_lane` (fixed order fast, standard, runtime, then the rest sorted) and the rework line from `totals.rework_by_defect_in`, through `mmNum` so `not measured` and numbers format as elsewhere; then a blank line. Nothing else moves.
2. `reporter.md` §3 (`:128-136`): one sentence adding the two rows and the per-lane path sentence. `templates/sprint_report.md` §3 (`:64`): two rows after `Fast-Track Ratio`. `npm run gen:codex` regenerates `reporter.toml`; `npm run prebuild` (`build-codex-payload.mjs --check`).

### 3.3 API Contract (if applicable)

| Endpoint | Method | Auth | Request Shape | Response Shape |
|---|---|---|---|---|
| `prep_reporter_context.mjs` bundle `## Measured Metrics` | file | None | `sprint_metrics.mjs --json` | gains `By lane: …` lines and one `Rework by defect location: …` line |

## 4. Quality Gates

### 4.1 Minimum Test Expectations

> Epic Testing Strategy levels: Unit (render the section from a fixture metrics document, as `prep-reporter-measured-metrics.red.node.test.ts` does).

| Test Type | Minimum Count | Notes |
|---|---|---|
| Unit tests | 3 | Lane and rework lines (both Examples); existing lines unchanged; prompt, render and template rows. |
| E2E / acceptance tests | 3 | One per Gherkin scenario (the outline counts once). |

### 4.2 Definition of Done (The Gate)
- [x] Minimum test expectations (§4.1) met.
- [x] All Gherkin scenarios from §2.1 covered.
- [x] `build-codex-payload.mjs --check` passes; `prep-reporter-measured-metrics.red` stays green.
- [x] Goal check (d) re-run shows both rows in the sandbox report.
- [x] Peer/Architect Review passed.

## Existing Surfaces

- **Surface:** `cleargate-cli/scaffold/core/.cleargate/scripts/prep_reporter_context.mjs:388-480` — `renderMeasuredMetrics`, the only place the Reporter receives `sprint_metrics.mjs` numbers; it renders neither `by_lane` nor `rework_by_defect_in`.
- **Surface:** `cleargate-cli/scaffold/core/.cleargate/scripts/sprint_metrics.mjs:460-477` — computes `by_lane`; `totals.rework_by_defect_in` (STORY-066-10).
- **Surface:** `cleargate-cli/scaffold/hosts/claude/.claude/agents/reporter.md:128-136` — §3 Execution Metrics fill rules.
- **Surface:** `cleargate-cli/scaffold/core/.cleargate/templates/sprint_report.md:64` — §3 Execution Metrics table.
- **Coverage of this requirement:** partial. The numbers exist in the metrics document; they never reach the report.

## Prior work

- [[EPIC-066]] — parent; "dispatches per item by lane" is its success metric.
- [[STORY-066-10]] — added `by_lane` and `rework_by_defect_in` to `sprint_metrics.mjs` and its own table printer, not to the Reporter's bundle.
- [[STORY-064-02]] — the sprint report reads derived metrics (`## Measured Metrics` in the bundle) that this story extends.
- [[STORY-066-13]] — fixes the `defect_in: none` booking that put false `code` rework into the sandbox report.
- [[CR-120]], [[STORY-064-01]] — the per-dispatch ledger and the dispatch/rework counting rules behind the numbers.
- cleargate-wiki-query 2026-11-15: no prior item puts `by_lane` or `rework_by_defect_in` into the Reporter bundle.

## Why not simpler?

- **Smallest existing surface that could carry this:** `renderMeasuredMetrics` and the §3 fill rule in `reporter.md`, plus the template rows.
- **Why isn't extension / parameterization / config sufficient?** The Reporter reads only the bundle; without the lines there, it either omits the metric (sandbox run) or re-derives it, which `reporter.md` forbids. No flag adds a line to the bundle.

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
