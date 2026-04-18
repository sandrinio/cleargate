<instructions>
FOLLOW THIS EXACT STRUCTURE. Output sections in order 1-4.
YAML Frontmatter: Story ID, Parent Epic, Status, Ambiguity, Context Source (MUST link to approved proposal.md), Actor, Complexity Label.
§1 The Spec: User Story + Detailed Requirements + Out of Scope.
§2 The Truth: Gherkin acceptance criteria + manual verification steps.
§3 Implementation Guide: Files to modify, technical logic, API contract. Sourced from approved proposal.md.
§4 Quality Gates: Minimum test expectations + Definition of Done checklist.
Output location: .cleargate/delivery/pending-sync/STORY-{EpicID}-{StoryID}-{StoryName}.md

Document Hierarchy Position: LEVEL 2 (Proposal → Epic → Story)

Complexity Labels:
L1: Trivial — Single file, <1hr, known pattern
L2: Standard — 2-3 files, known pattern, ~2-4hr (default)
L3: Complex — Cross-cutting, spike may be needed, ~1-2 days
L4: Uncertain — Requires probing/spiking, >2 days

Do NOT output these instructions.
</instructions>

---
story_id: "STORY-{EpicID}-{StoryID}-{StoryName}"
parent_epic_ref: "EPIC-{ID}"
status: "Draft"
ambiguity: "🔴 High"
context_source: "PROPOSAL-{ID}.md"
actor: "{Persona Name}"
complexity_label: "L2"
---

# STORY-{EpicID}-{StoryID}: {Story Name}
**Complexity:** {L1/L2/L3/L4} — {brief description}

## 1. The Spec (The Contract)

### 1.1 User Story
As a {Persona}, I want to {Action}, so that {Benefit}.

### 1.2 Detailed Requirements
- Requirement 1: {Specific behavior}
- Requirement 2: {Specific data or constraint}

### 1.3 Out of Scope
{What this story explicitly does NOT do.}

## 2. The Truth (Executable Tests)

### 2.1 Acceptance Criteria (Gherkin)

```gherkin
Feature: {Story Name}

  Scenario: {Happy Path}
    Given {precondition}
    When {user action}
    Then {system response}

  Scenario: {Edge Case / Error}
    Given {precondition}
    When {invalid action}
    Then {error message}
```

### 2.2 Verification Steps (Manual)
- [ ] {e.g., "Verify API returns 200 for valid input"}
- [ ] {e.g., "Verify UI renders correctly on mobile"}

## 3. The Implementation Guide

### 3.1 Context & Files

| Item | Value |
|---|---|
| Primary File | `{filepath/to/main/component.ts}` |
| Related Files | `{filepath/to/api/service.ts}`, `{filepath/to/types.ts}` |
| New Files Needed | Yes/No — {Name of file} |

### 3.2 Technical Logic
{Describe the logic flow, e.g., "Use the existing useAuth hook to check permissions."}

### 3.3 API Contract (if applicable)

| Endpoint | Method | Auth | Request Shape | Response Shape |
|---|---|---|---|---|
| `/api/resource` | GET/POST | Bearer/None | `{ id: string }` | `{ status: string }` |

## 4. Quality Gates

### 4.1 Minimum Test Expectations

| Test Type | Minimum Count | Notes |
|---|---|---|
| Unit tests | {N} | {e.g., "1 per exported function"} |
| E2E / acceptance tests | {N} | {e.g., "1 per Gherkin scenario in §2.1"} |

### 4.2 Definition of Done (The Gate)
- [ ] Minimum test expectations (§4.1) met.
- [ ] All Gherkin scenarios from §2.1 covered.
- [ ] Peer/Architect Review passed.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🔴 High Ambiguity**

Requirements to pass to Green (Ready for Execution):
- [ ] Gherkin scenarios completely cover all detailed requirements in §1.2.
- [ ] Implementation Guide (§3) maps to specific, verified file paths from the approved proposal.
- [ ] No "TBDs" exist anywhere in the specification or technical logic.
