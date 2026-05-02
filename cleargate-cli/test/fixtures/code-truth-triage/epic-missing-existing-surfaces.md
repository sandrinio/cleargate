---
epic_id: "EPIC-TEST-MISSING-SURFACES"
parent_cleargate_id: null
sprint_cleargate_id: "SPRINT-20"
status: "Draft"
ambiguity: "🟡 Medium"
context_source: "PROPOSAL-001.md"
---

# EPIC-TEST-MISSING-SURFACES: Test Epic Missing Existing Surfaces

## 1. Problem & Value

Why we are doing this: to test the reuse-audit-recorded criterion failure case.

## 2. Scope Boundaries

**IN-SCOPE:**
- [ ] Test capability

**OUT-OF-SCOPE:**
- Existing Surfaces section — intentionally absent to trigger failing gate

## 3. The Reality Check (Context)

| Constraint Type | Limit / Rule |
|---|---|
| Performance | Must complete in < 200ms |

## Why not simpler?

> L2 / L3 right-size + justify-complexity.

- **Smallest existing surface that could carry this epic:** none — net-new abstraction required
- **Why isn't extension / parameterization / config sufficient?** This is a net-new capability with no prior implementation.

## 4. Technical Grounding

**Affected Files:**
- `cleargate-cli/src/lib/new-module.ts` — created

## 5. Acceptance Criteria

```gherkin
Feature: Reuse-audit failure
  Scenario: Epic missing Existing Surfaces fails gate
    Given an epic without an Existing Surfaces section
    When the readiness gate is checked
    Then reuse-audit-recorded criterion fails
```
