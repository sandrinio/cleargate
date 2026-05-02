---
story_id: "STORY-TEST-MISSING-SIMPLER"
parent_epic_ref: "EPIC-001"
parent_cleargate_id: null
sprint_cleargate_id: "SPRINT-20"
status: "Draft"
ambiguity: "🟡 Medium"
context_source: "PROPOSAL-001.md"
complexity_label: "L2"
---

# STORY-TEST-MISSING-SIMPLER: Test Story Missing Why not simpler?

## 1. The Spec (The Contract)

### 1.1 User Story
As a developer, I want to extend the predicate evaluator, so that new criteria can be checked.

### 1.2 Detailed Requirements
- Requirement 1: Predicate evaluator must handle new body-contains shapes

### 1.3 Out of Scope
Why not simpler? section — intentionally absent to trigger failing gate.

### 1.6 Existing Surfaces

> L1 reuse audit.

- **Surface:** `cleargate-cli/src/lib/readiness-predicates.ts:1` — predicate evaluator
- **Coverage of this requirement:** ≥80% — this story extends the evaluator

## 2. The Truth (Executable Tests)

### 2.1 Acceptance Criteria (Gherkin)

```gherkin
Feature: Simplest-form-justified failure
  Scenario: Story missing Why not simpler? fails gate
    Given a story without a Why not simpler? section
    When the readiness gate is checked
    Then simplest-form-justified criterion fails
```

## 3. The Implementation Guide

### 3.1 Context & Files

| Item | Value |
|---|---|
| Primary File | `cleargate-cli/src/lib/readiness-predicates.ts` |

## 4. Quality Gates

### 4.1 Minimum Test Expectations

| Test Type | Minimum Count | Notes |
|---|---|---|
| Unit tests | 1 | 1 per new predicate shape |

### 4.2 Definition of Done (The Gate)
- [ ] Minimum test expectations met.
- [ ] All Gherkin scenarios covered.
