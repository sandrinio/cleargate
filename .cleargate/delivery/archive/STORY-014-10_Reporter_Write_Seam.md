---
story_id: STORY-014-10
parent_epic_ref: EPIC-014
parent_cleargate_id: EPIC-014
sprint_cleargate_id: SPRINT-09
status: Completed
ambiguity: 🟢 Low
context_source: EPIC-014 §2 IN-SCOPE C4 + SPRINT-09 + CG_TEST Reporter runs both hit the Write harness guard
actor: Developer Agent
complexity_label: L2
milestone: M2
parallel_eligible: y
expected_bounce_exposure: low
approved: true
approved_at: 2026-04-21T12:00:00Z
approved_by: sandro
stamp_error: no ledger rows for work_item_id STORY-014-10
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-04-21T12:45:08Z
  sessions: []
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-04-30T11:01:46Z
---

# STORY-014-10: Reporter Write-seam fix (`--report-body-stdin`)
**Complexity:** L2 — reporter.md clarification + close_sprint.mjs extension.

## 1. The Spec

### 1.1 User Story
As an orchestrator, I want a reliable path for Reporter output to land on disk even when the agent's tool harness blocks `Write`, so the REPORT.md file always exists after close. Currently the orchestrator has to persist inline content itself (observed in both SPRINT-09 and CG_TEST SPRINT-01).

### 1.2 Detailed Requirements
- Amend `.claude/agents/reporter.md`:
  - Explicitly list `Write` among the Reporter's allowed tools (make sure the frontmatter `tools:` line includes it).
  - Add a fallback note: "If Write is blocked, return the full REPORT.md body on stdout between `===REPORT-BEGIN===` and `===REPORT-END===` delimiters — orchestrator pipes it into `close_sprint.mjs --report-body-stdin`."
- Extend `.cleargate/scripts/close_sprint.mjs` with a new `--report-body-stdin <sprint-id>` mode:
  - Reads REPORT.md body from stdin.
  - Writes atomically to `.cleargate/sprint-runs/<id>/REPORT.md`.
  - After write, continues with Step 5 (sprint_status flip) + Step 6 (suggest_improvements). Essentially replaces the Reporter-was-run precondition.
- Three-surface landing: reporter.md + close_sprint.mjs + mirrors.

### 1.3 Out of Scope
- Changing the Reporter spec significantly (same template, same §§1-6 structure).
- Auto-detecting when Write is blocked — orchestrator decides.

## 2. The Truth

### 2.1 Acceptance Criteria (Gherkin)

```gherkin
Feature: Reporter Write-seam

  Scenario: Reporter writes REPORT.md directly (primary path)
    Given Reporter is spawned normally with Write allowed
    When Reporter completes
    Then REPORT.md exists at .cleargate/sprint-runs/<id>/REPORT.md

  Scenario: Stdin fallback when Write is blocked
    Given Reporter returned the report inline (Write harness blocked)
    When orchestrator pipes the content into close_sprint.mjs --report-body-stdin <id>
    Then REPORT.md is written atomically
    And the script continues with Step 5 + Step 6 (state flip + suggest_improvements)

  Scenario: Stdin mode refuses empty input
    Given close_sprint.mjs --report-body-stdin receives empty stdin
    Then it exits non-zero
    And stderr says "empty report body — refusing to write"

  Scenario: Stdin mode refuses when REPORT.md already exists
    Given REPORT.md already exists in the sprint dir
    When close_sprint.mjs --report-body-stdin runs
    Then it exits non-zero with "REPORT.md already exists — delete it or skip stdin mode"
    (Prevents accidental overwrites of a Reporter-written file.)
```

### 2.2 Verification Steps (Manual)
- [ ] Smoke with a mock REPORT body piped in.
- [ ] `diff` reporter.md + close_sprint.mjs mirrors.

## 3. The Implementation Guide

### 3.1 Context & Files

| Item | Value |
|---|---|
| Modified | `.claude/agents/reporter.md` (tools line + fallback note) |
| Modified | `.cleargate/scripts/close_sprint.mjs` (new mode) |
| Mirrors | `cleargate-planning/` copies |
| Test | `.cleargate/scripts/test/test_report_body_stdin.sh` |

### 3.2 Technical Logic
Parse argv for `--report-body-stdin`. When present: read stdin fully (`process.stdin`), atomic write via M1 tmp+rename to REPORT.md path. Refuse if empty or if file exists. Then proceed with Steps 5 + 6.

## 4. Quality Gates

### 4.1 Minimum Test Expectations

| Test Type | Minimum Count | Notes |
|---|---|---|
| Gherkin bash | 4 | §2.1 scenarios |
| Three-surface diff | 2 | reporter.md + script |

### 4.2 Definition of Done
- [ ] All 4 scenarios pass.
- [ ] Reporter still writes directly when allowed (primary path remains green).
- [ ] Commit: `feat(EPIC-014): STORY-014-10 reporter write-seam`.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟢 Low**
