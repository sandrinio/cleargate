---
story_id: STORY-008-07
parent_epic_ref: EPIC-008
status: Draft
ambiguity: 🟢 Low
complexity_label: L2
context_source: PROPOSAL-005_Token_Cost_And_Readiness_Gates.md
created_at: 2026-04-19T00:00:00Z
updated_at: 2026-04-19T00:00:00Z
created_at_version: post-SPRINT-04
updated_at_version: post-SPRINT-04
approved: true
pushed_by: sandrinio@github.local
pushed_at: 2026-04-20T19:44:03.288Z
push_version: 3
---

# STORY-008-07: Template Stubs + Protocol §12 + Wiki-Lint Enforcement

**Complexity:** L2 — template edits + protocol authoring + wiki-lint extension.

## 1. The Spec

### 1.1 User Story
As a Vibe Coder, I want every new work-item draft to carry predictable `draft_tokens` + `cached_gate_result` stubs, the protocol to document the new lifecycle, and `wiki lint` to refuse 🟢-candidate documents whose gate is failing or stale — so that the gate system is enforceable at Gate 1 and Gate 3.

### 1.2 Detailed Requirements

**Template stubs (all 7 files under `.cleargate/templates/`):** add to the YAML frontmatter:

```yaml
draft_tokens:
  input: null
  output: null
  cache_read: null
  cache_creation: null
  model: null
  sessions: []
cached_gate_result:
  pass: null
  failing_criteria: []
  last_gate_check: null
```

**Protocol §12 "Token Cost Stamping & Readiness Gates"** in `.cleargate/knowledge/cleargate-protocol.md`:
- Subsection 12.1 Overview — two-capability bundle rationale.
- Subsection 12.2 Token stamp semantics — idempotency, cross-session accumulation, `sessions[]` shape.
- Subsection 12.3 Readiness gates — central file location, closed-set predicates, severity model (advisory for Proposals, enforcing for Epic/Story/CR/Bug).
- Subsection 12.4 Enforcement points — `wiki lint` (v1). MCP-push enforcement deferred.
- Subsection 12.5 Hook lifecycle — PostToolUse chain + SessionStart summary; failure visibility via hook-log + staleness lint.
- Also extend §4 (Phase Gates) with a one-liner: "Gate 2 (Ambiguity) is machine-checked via `cleargate gate check`; see §12."
- Also extend §10.8 (wiki-lint enforcement) with the new gate-check hook.

**Wiki-lint extension** in `cleargate-cli/src/wiki/lint.ts`:
- For every 🟢-candidate document (status = "Ready" / "Active" / ambiguity = "🟢 Low"):
  - If `cached_gate_result.pass == false` AND work-item type is Epic/Story/CR/Bug → lint error.
  - If `cached_gate_result.last_gate_check < frontmatter.updated_at` → lint error (staleness, all types).
- Diagnostics cite the failing criterion IDs.

### 1.3 Out of Scope
MCP-push enforcement (deferred per PROP-005 Q10).

## 2. The Truth

### 2.1 Acceptance Criteria

```gherkin
Feature: Template stubs + protocol + wiki-lint enforcement

  Scenario: All 7 templates have stubs
    When I grep frontmatter of each template
    Then each contains draft_tokens + cached_gate_result stubs

  Scenario: Protocol §12 exists
    When I grep cleargate-protocol.md for "## 12."
    Then §12 is present with the 5 subsections from §1.2

  Scenario: wiki lint refuses failing Epic
    Given EPIC-Z.md has cached_gate_result.pass = false AND status = "Ready"
    When cleargate wiki lint
    Then exit non-zero
    And diagnostic names EPIC-Z + failing criterion IDs

  Scenario: wiki lint tolerates failing Proposal (advisory)
    Given PROPOSAL-Z.md has cached_gate_result.pass = false
    When cleargate wiki lint
    Then exit code reflects other lints only (advisory doesn't block)

  Scenario: wiki lint refuses stale gate
    Given EPIC-Z.md has cached_gate_result.last_gate_check = "2026-04-18" and updated_at = "2026-04-19"
    When cleargate wiki lint
    Then exit non-zero
    And diagnostic cites "stale gate — last_gate_check < updated_at"
```

### 2.2 Verification Steps
- [ ] Manual diff on template frontmatter.
- [ ] `cleargate wiki lint` run against current repo before/after — before: clean; after: flags any existing 🟢 items with missing `cached_gate_result` (expected: initial migration pass).

## 3. Implementation

| Item | Value |
|---|---|
| Primary Files | 7 templates + `cleargate-protocol.md` + `cleargate-cli/src/wiki/lint.ts` |
| Related | `cleargate-cli/src/wiki/lint-checks.ts` (existing — add new checks here) |

## 4. Quality Gates

| Test Type | Min | Notes |
|---|---|---|
| Lint unit tests | 4 | enforcing-fail, advisory-warn, staleness, null-ok-on-drafts |
| Template grep test | 1 | All 7 templates carry both stubs |

## Ambiguity Gate
🟢 — EPIC-008 §6 Q1 + Q6 resolved 2026-04-19: protocol §12 confirmed (EPIC-001 keeps §11, EPIC-009 takes §13); templates carry the `cached_gate_result` stub.
