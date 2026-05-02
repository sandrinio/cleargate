---
epic_id: "EPIC-TEST-BOTH"
parent_cleargate_id: null
sprint_cleargate_id: "SPRINT-20"
status: "Draft"
ambiguity: "🟢 Low"
context_source: "PROPOSAL-001.md"
---

# EPIC-TEST-BOTH: Test Epic with Both Code-Truth Sections

## 1. Problem & Value

Why we are doing this: to test the CR-028 readiness criteria.

## 2. Scope Boundaries

**IN-SCOPE:**
- [ ] Test capability

**OUT-OF-SCOPE:**
- Nothing excluded

## 3. The Reality Check (Context)

| Constraint Type | Limit / Rule |
|---|---|
| Performance | Must complete in < 200ms |

## Existing Surfaces

> L1 reuse audit. Existing source-tree implementations.

- **Surface:** `cleargate-cli/src/lib/readiness-predicates.ts:1` — predicate evaluator
- **Coverage of this epic's scope:** ≥80% extension — this epic extends the evaluator, not rebuilds

## Why not simpler?

> L2 / L3 right-size + justify-complexity.

- **Smallest existing surface that could carry this epic:** `cleargate-cli/src/lib/readiness-predicates.ts`
- **Why isn't extension / parameterization / config sufficient?** New predicate shapes for section detection require engine-level changes, not config alone.

## 4. Technical Grounding

**Affected Files:**
- `cleargate-cli/src/lib/readiness-predicates.ts` — extended

## 5. Acceptance Criteria

```gherkin
Feature: Code-truth triage
  Scenario: Epic with both sections passes gate
    Given an epic with Existing Surfaces and Why not simpler? sections
    When the readiness gate is checked
    Then both criteria pass
```
