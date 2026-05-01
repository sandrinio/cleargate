---
story_id: STORY-013-05_Orchestrator_Interrupt_Handling
parent_epic_ref: EPIC-013
parent_cleargate_id: EPIC-013
status: Done
ambiguity: 🟢 Low
context_source: "EPIC-013_Execution_Phase_v2.md §4.2 rows 'Circuit breaker' + 'User walkthrough on sprint branch' + 'Mid-sprint CR triage'; V-Bounce Engine skills/agent-team/SKILL.md §§ 'Step 2f: Green Phase Circuit Breaker', 'Step 5.7: User Walkthrough', 'Mid-Sprint Change Requests' at HEAD 2b8477ab"
actor: Developer Agent
complexity_label: L3
approved: true
approved_at: 2026-04-21T00:00:00Z
completed_at: 2026-04-21T08:30:00Z
approved_by: sandro
milestone: M2
parallel_eligible: n
expected_bounce_exposure: med
created_at: 2026-04-21T00:00:00Z
updated_at: 2026-04-21T00:00:00Z
created_at_version: post-SPRINT-08
updated_at_version: post-SPRINT-08
stamp_error: no ledger rows for work_item_id STORY-013-05_Orchestrator_Interrupt_Handling
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-04-21T05:52:04Z
  sessions: []
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-04-21T00:00:01Z
---

# STORY-013-05: Orchestrator Interrupt Handling (circuit breaker + walkthrough + mid-sprint CR triage)
**Complexity:** L3 — cross-cutting rule change across developer.md + architect.md + two new protocol sections; defines event-type vocabulary downstream stories consume.

## 1. The Spec (The Contract)

### 1.1 User Story
As a ClearGate orchestrator running under `execution_mode: v2`, I want explicit rules for (a) runaway-Developer circuit-breaker, (b) user walkthrough on the sprint branch before merge-to-main, and (c) mid-sprint change-request triage, so that interrupts during execution are classified, routed, and counted consistently, and the resulting event types (`UR:*`, `CR:*`, circuit-breaker categories) are reused by Sprint Report v2 (STORY-013-07) and Sprint Design Review (STORY-013-09).

### 1.2 Detailed Requirements
- **Circuit breaker** in `developer.md`: after ~50 tool calls with no successful test run OR 2 consecutive identical failures, Developer halts and writes `STORY-NNN-NN-dev-blockers.md` to `.cleargate/sprint-runs/<id>/reports/` with three required sections: `## Test-Pattern`, `## Spec-Gap`, `## Environment` (one sentence or `N/A` each). Rule is informational under v1, enforcing under v2.
- **Blockers triage** in `architect.md`: category routing — Test-Pattern → re-launch Developer with fixture hint; Spec-Gap → return to orchestrator with user question; Environment → pre-gate re-run. 3 consecutive circuit-breaker hits on same story → state flips to `Escalated` via `update_state.mjs` (reuse M1 script).
- **Protocol §2 "User Walkthrough on Sprint Branch (v2)"**: after all stories merged into `sprint/S-XX` and before sprint→main merge, user tests running app. Feedback split into `UR:review-feedback` (enhancement, does NOT count against correction tax) and `UR:bug` (DOES count against Bug-Fix Tax). Each logged in sprint markdown §4 Execution Log with `UR` event prefix.
- **Protocol §3 "Mid-Sprint Change Request Triage (v2)"**: user input during a bounce is classified into one of four categories — `CR:bug`, `CR:spec-clarification`, `CR:scope-change`, `CR:approach-change` — each with defined routing and bounce-counter effect. Table ports V-Bounce `mid-sprint-triage.md` at pinned SHA.
- **Event-type vocabulary is locked by this story.** Every subsequent M2 story consumes these exact tokens (cross-story risk #2 in M2 plan).
- **Three-surface landing (R9)** for all five touched files (developer.md + architect.md + protocol.md + 3 cleargate-planning/ mirrors).

### 1.3 Out of Scope
- Orchestrator implementation of the 50-tool-call heuristic — that's enforced by the orchestrator runtime (Claude Code session), not by this story. Story ships the rule and Blockers Report shape; orchestrator enforcement is out-of-band.
- Token-ledger integration with `UR`/`CR` events — that's STORY-013-07's Sprint Report v2.
- CLI wrappers for invoking circuit-breaker recipes — that's STORY-013-08.

## 2. The Truth (Executable Tests)

### 2.1 Acceptance Criteria (Gherkin)

```gherkin
Feature: Orchestrator interrupt handling

  Scenario: Circuit breaker on runaway Developer
    Given Developer on STORY-014-04 has executed 50 tool calls with no successful test run
    When the orchestrator observes the 51st tool call
    Then Developer writes STORY-014-04-dev-blockers.md under .cleargate/sprint-runs/<id>/reports/
    And the report contains `## Test-Pattern`, `## Spec-Gap`, `## Environment` sections
    And orchestrator reads blockers and routes per the matching architect.md triage rule
    And no auto-retry of the same approach occurs

  Scenario: User walkthrough splits enhancement from bug
    Given all stories in sprint/S-XX are merged onto sprint branch
    When user gives feedback A = "copy should say 'Sign in' not 'Log in'"
    And feedback B = "create-project button 500s on submit"
    Then feedback A is logged in sprint markdown §4 as UR:review-feedback and does NOT increment Bug-Fix Tax
    And feedback B is logged as UR:bug and IS counted toward Bug-Fix Tax
    And sprint does NOT merge to main until both resolved on sprint branch

  Scenario: Mid-sprint change request classified
    Given user injects feedback "this endpoint needs to also return the project slug" during a QA bounce
    When orchestrator invokes protocol §3 triage
    Then the event is classified as CR:scope-change
    And its bounce-counter effect matches the §3 table entry
    And the event is logged in sprint markdown §4 with CR event prefix
```

### 2.2 Verification Steps (Manual)
- [ ] Grep `.claude/agents/developer.md` for `## Circuit Breaker` and three required Blockers Report sections.
- [ ] Grep `.claude/agents/architect.md` for `## Blockers Triage` with three category routings.
- [ ] Grep `.cleargate/knowledge/cleargate-protocol.md` for `## 16. User Walkthrough on Sprint Branch (v2)` and `## 17. Mid-Sprint Change Request Triage (v2)`.
- [ ] `diff` all three live files vs cleargate-planning/ mirrors — empty.
- [ ] Bash test script `.cleargate/scripts/test/test_interrupt_contract.sh` — all 3 Gherkin scenarios pass via grep-based checks.

## 3. The Implementation Guide

See **M2 plan §STORY-013-05** at `.cleargate/sprint-runs/S-09/plans/M2.md` (lines 25–57). Plan specifies append sites (developer.md line 68, architect.md after line 48, protocol.md after §1), exact section numbering (§§2–17, NOT "§§12–13" from stale story text), and the Blockers Report directory path `.cleargate/sprint-runs/<id>/reports/` (distinct from pre-gate scanner's `.cleargate/reports/`).

### 3.1 Context & Files

| Item | Value |
|---|---|
| Primary File (agent spec) | `.claude/agents/developer.md` — append `## Circuit Breaker` after `## Worktree Contract` |
| Primary File (agent spec) | `.claude/agents/architect.md` — append `## Blockers Triage` after `## Adjacent Implementation Check` |
| Primary File (protocol) | `.cleargate/knowledge/cleargate-protocol.md` — append `## 16. User Walkthrough on Sprint Branch (v2)` + `## 17. Mid-Sprint Change Request Triage (v2)` |
| Mirrors | `cleargate-planning/` copies of all three |
| Test file | `.cleargate/scripts/test/test_interrupt_contract.sh` |
| New Files Needed | One (the bash test script); all other changes are appends to existing files |

### 3.2 Technical Logic
Verbatim port of V-Bounce rule prose with `vbounce` → `cleargate` rename. Circuit-breaker threshold (50 tool calls) is a rule in prose; Claude Code does not expose a tool-call counter to the agent, so enforcement is orchestrator-observed (M2 plan cross-story risk #10).

## 4. Quality Gates

### 4.1 Minimum Test Expectations

| Test Type | Minimum Count | Notes |
|---|---|---|
| Gherkin grep-based tests | 3 | All §2.1 scenarios via `test_interrupt_contract.sh` |
| Three-surface diff checks | 3 | developer.md, architect.md, protocol.md all byte-identical vs cleargate-planning/ |

### 4.2 Definition of Done
- [ ] All three §2.1 scenarios pass.
- [ ] Three-surface landing verified with `diff`.
- [ ] `npm run typecheck` in `cleargate-cli/` green.
- [ ] Flashcards flagged in dev+QA reports (field exists after 013-06; for 013-05 itself, append to `.cleargate/FLASHCARD.md` manually if any surprises surface).
- [ ] Commit: `feat(EPIC-013): STORY-013-05 orchestrator interrupt handling`.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟢 Low Ambiguity (Ready for Execution)**

- [x] Gherkin scenarios cover §1.2 requirements.
- [x] M2 plan grounds all file paths, line numbers, and section numbering.
- [x] Event-type vocabulary explicitly enumerated in §1.2.
- [x] Cross-story-risk mitigations referenced (numbering §1.2, vocabulary cross-story risk #2, orchestrator-observed enforcement #10).
