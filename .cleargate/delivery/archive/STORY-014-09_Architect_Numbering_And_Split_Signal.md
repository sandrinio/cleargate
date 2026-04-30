---
story_id: STORY-014-09
parent_epic_ref: EPIC-014
parent_cleargate_id: EPIC-014
sprint_cleargate_id: SPRINT-09
status: Completed
ambiguity: 🟢 Low
context_source: "EPIC-014 §2 IN-SCOPE C1+C2 + SPRINT-09 REPORT.md §5 Handoffs (stream-timeouts on L3) + FLASHCARD.md `#protocol #section-numbering`"
actor: Developer Agent
complexity_label: L2
milestone: M2
parallel_eligible: y
expected_bounce_exposure: low
approved: true
approved_at: 2026-04-21T12:00:00Z
approved_by: sandro
stamp_error: no ledger rows for work_item_id STORY-014-09
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-04-21T12:44:46Z
  sessions: []
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-04-30T11:01:46Z
---

# STORY-014-09: Architect numbering resolver + L3-split signal in story template
**Complexity:** L2 — two small doc edits (architect.md + story.md) and a protocol note; no code.

## 1. The Spec

### 1.1 User Story
As an Architect agent producing a milestone plan, I want a rule that says "before writing per-story blueprints, audit `cleargate-protocol.md` for the highest-numbered section and rewrite any stale §N references in the story text to the correct next-free number", so the recurring `§10/§11/§12` drift (hit twice in SPRINT-09) stops wasting tokens. AND: at decomposition time, I want the Granularity Rubric to flag L3 + `expected_bounce_exposure: high` as a split-candidate, since all three SPRINT-09 stream-timeouts landed on that combination.

### 1.2 Detailed Requirements
- Append `## Protocol Numbering Resolver` section to `.claude/agents/architect.md`:
  - Rule: grep `.cleargate/knowledge/cleargate-protocol.md` for `^## (\d+)\. ` and take max.
  - For each story in the milestone, grep the story file for `§\d+` references in prose; if any reference a section ≤ the current max but the section text doesn't match, flag as "stale § reference" and rewrite in the plan.
  - Include a short example: "Story text says §10 but max is §15; use §16 (next free) in the plan."
- Extend `.cleargate/templates/story.md` Granularity Rubric (§0 instructions block):
  - Existing rubric already flags L4 as split-candidate. ADD: "AND: `complexity_label: L3` + `expected_bounce_exposure: high` → consider splitting into two L2 stories. Rationale: L3+high stories hit wall-time limits during developer agent runs (observed in SPRINT-09 on stories 013-02, 013-03, 013-04)."
- Three-surface landing: architect.md mirror + story.md mirror.

### 1.3 Out of Scope
- Auto-rewriting story files at decomposition time (the rubric is a suggestion to the human/orchestrator, not a mutator).
- Making the numbering resolver a separate script — it's a prose rule in architect.md.

## 2. The Truth

### 2.1 Acceptance Criteria (Gherkin)

```gherkin
Feature: Architect numbering + L3 split signal

  Scenario: Architect resolves stale §§ references
    Given story text cites "protocol §10" and protocol's highest shipped section is §15
    When Architect produces the milestone plan
    Then the plan references §16 (next free)
    And includes a note: "STORY text cites §10 — stale, rewritten to §16"

  Scenario: Rubric flags L3 + high exposure
    Given a draft story with complexity_label: L3 and expected_bounce_exposure: high
    When decomposition reviews the rubric
    Then the rubric surfaces "consider splitting into two L2 stories"

  Scenario: Rubric does not flag L3 + low/med exposure
    Given a draft story with complexity_label: L3 and expected_bounce_exposure: low
    When decomposition reviews the rubric
    Then no split suggestion fires

  Scenario: Existing L4 split rule still applies
    Given a draft story with complexity_label: L4
    When decomposition reviews the rubric
    Then the existing L4-split suggestion still fires
```

### 2.2 Verification Steps (Manual)
- [ ] Grep architect.md + story.md for the new content on both surfaces.
- [ ] `diff` pairs.
- [ ] Architect dry-run against a synthetic story with a stale § reference → plan cites corrected number.

## 3. The Implementation Guide

### 3.1 Context & Files

| Item | Value |
|---|---|
| Modified | `.claude/agents/architect.md` (new subsection) |
| Modified | `.cleargate/templates/story.md` (rubric extension) |
| Mirrors | `cleargate-planning/` copies of both |

### 3.2 Technical Logic
No code. Prose changes to agent spec + template. MANIFEST regenerates.

## 4. Quality Gates

### 4.1 Minimum Test Expectations

| Test Type | Minimum Count | Notes |
|---|---|---|
| Grep-based bash test | 4 | §2.1 scenarios via `test_architect_numbering.sh` |

### 4.2 Definition of Done
- [ ] All 4 scenarios pass.
- [ ] Three-surface diff clean.
- [ ] MANIFEST regenerated.
- [ ] Commit: `feat(EPIC-014): STORY-014-09 architect numbering + split signal`.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🟢 Low**
