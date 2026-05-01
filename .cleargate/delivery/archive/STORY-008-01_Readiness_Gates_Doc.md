---
story_id: STORY-008-01
carry_over: true
parent_epic_ref: EPIC-008
parent_cleargate_id: "EPIC-008"
status: "Abandoned"
ambiguity: 🟢 Low
complexity_label: L2
context_source: PROPOSAL-005_Token_Cost_And_Readiness_Gates.md
created_at: 2026-04-19T00:00:00Z
updated_at: 2026-04-19T00:00:00Z
created_at_version: post-SPRINT-04
updated_at_version: post-SPRINT-04
approved: true
pushed_by: sandrinio@github.local
pushed_at: 2026-04-20T19:43:22.126Z
push_version: 3
---

# STORY-008-01: Author `readiness-gates.md` (central gate specifications)

**Complexity:** L2 — authoritative YAML doc; requires careful per-template predicate authoring.

## 1. The Spec

### 1.1 User Story
As a ClearGate agent evaluating a work item, I want all gate criteria defined in one canonical file so that I can evaluate "is this ready?" deterministically without per-template guesswork.

### 1.2 Detailed Requirements
- Create `.cleargate/knowledge/readiness-gates.md` with a YAML block declaring one entry per `{work_item_type, transition}` pair.
- Cover all 6 transitions from EPIC-008 §4:
  - `proposal.ready-for-decomposition` (advisory)
  - `epic.ready-for-decomposition` (enforcing)
  - `epic.ready-for-coding` (enforcing)
  - `story.ready-for-execution` (enforcing)
  - `cr.ready-to-apply` (enforcing)
  - `bug.ready-for-fix` (enforcing)
- Each criterion has `id`, `check` (using only the 6 closed-set predicate shapes from EPIC-008 §4), and `severity` (`advisory | enforcing`).
- Document the predicate grammar in a `## Predicate Vocabulary` section — one paragraph per predicate shape with an example.
- Include a `## Severity Model` section explaining the advisory-vs-enforcing split and why Proposals never block `approved: true`.

### 1.3 Out of Scope
No implementation — pure authoring. Evaluator code lives in STORY-008-02.

## 2. The Truth

### 2.1 Acceptance Criteria

```gherkin
Feature: readiness-gates.md authoring

  Scenario: All 6 transitions present
    When I grep the YAML block for `work_item_type:`
    Then I find exactly 6 entries covering proposal, epic×2, story, cr, bug

  Scenario: Every predicate uses closed-set grammar
    When I extract every `check:` line
    Then each matches one of the 6 predicate shapes in EPIC-008 §4
    And no `check:` uses shell, network, or arbitrary code syntax

  Scenario: Proposal transition is advisory
    When I read the proposal.ready-for-decomposition entry
    Then its `severity` is "advisory"

  Scenario: Epic/Story/CR/Bug transitions are enforcing
    When I read all non-proposal entries
    Then every `severity` is "enforcing"
```

### 2.2 Verification Steps
- [ ] Manual diff review: every criterion maps to a real section/field in its target template.
- [ ] Load the file in `js-yaml` parse — zero errors.

## 3. Implementation

| Item | Value |
|---|---|
| Primary File | `.cleargate/knowledge/readiness-gates.md` |
| New File? | Yes |

Use YAML inside fenced ```yaml blocks so the file is both human-readable and machine-parseable. Predicate evaluator (STORY-008-02) reads the YAML blocks.

## 4. Quality Gates

| Test Type | Min | Notes |
|---|---|---|
| Doc review | — | Vibe Coder reviews for correctness before merge |
| YAML parse test | 1 | Unit test loads + asserts shape in STORY-008-02 |

## Ambiguity Gate
🟢.
