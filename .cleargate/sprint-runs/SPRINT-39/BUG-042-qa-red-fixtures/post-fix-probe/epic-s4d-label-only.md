---
epic_id: EPIC-RED04D
parent_ref: null
parent_cleargate_id: null
sprint_cleargate_id: null
carry_over: false
status: Draft
ambiguity: 🔴 High
context_source: QA-Red fixture for BUG-042 reproduction — not a real work item.
owner: qa-red
approved_by: qa-red-fixture
approved_at: 2026-08-27T00:00:00Z
target_date: 2026-08-27
created_at: 2026-08-27T00:00:00Z
updated_at: 2026-08-27T00:00:00Z
created_at_version: strategy-phase-pre-init
updated_at_version: strategy-phase-pre-init
server_pushed_at_version: null
draft_tokens:
  input: null
  output: null
  cache_read: null
  cache_creation: null
  model: null
  sessions: []
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-08-27T08:37:05Z
  transition: ready-for-decomposition
pushed_by: null
pushed_at: null
last_pulled_by: null
last_pulled_at: null
last_remote_update: null
source: local-authored
last_synced_status: null
last_synced_body_sha: null
---

# EPIC-RED04D: QA-Red fixture — empty Affected Files

## 0. AI Coding Agent Handoff

```xml
<agent_context>
  <objective>Synthetic fixture for BUG-042 red-phase reproduction.</objective>
  <architecture_rules>
    <rule>None — synthetic.</rule>
  </architecture_rules>
  <target_files>
    <file path="src/..." action="modify" />
  </target_files>
</agent_context>
```

## 1. Problem & Value

**Why are we doing this?**
Synthetic fixture, not a real epic.

**Success Metrics (North Star):**
- Metric 1: n/a

## 2. Scope Boundaries

**✅ IN-SCOPE (Build This)**
- [ ] Synthetic capability

**❌ OUT-OF-SCOPE (Do NOT Build This)**
- Everything else

## 3. The Reality Check (Context)

| Constraint Type | Limit / Rule |
|---|---|
| Security | No PII in logs |

## Existing Surfaces

- **Surface:** `.cleargate/knowledge/readiness-gates.md` — evalSection, positional heading split.
- **Coverage of this epic's scope:** none — synthetic fixture.

## Prior work

- none found

## Why not simpler?

- **Smallest existing surface that could carry this epic:** none — synthetic fixture.
- **Why isn't extension / parameterization / config sufficient?** Synthetic fixture; not a real design decision.

## 4. Technical Grounding (The "Shadow Spec")

**Affected Files:**

## 5. Acceptance Criteria

```gherkin
Feature: QA-Red fixture
  Scenario: Synthetic
    Given a synthetic fixture
    When gate check runs
    Then the result is recorded
```

## 6. AI Interrogation Loop (Human Input Required)

- **AI Question:** none.
- **Human Answer:** n/a — synthetic fixture, no open interrogation.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🔴 High Ambiguity**

Requirements to pass to Green (Ready for Coding Agent):
- [ ] `approved: true` is set in the YAML frontmatter.
- [ ] The `<agent_context>` block is complete and validated.
- [ ] §4 Technical Grounding contains 100% real, verified file paths.
- [ ] §6 AI Interrogation Loop is empty (all human answers integrated into the spec).
- [ ] 0 "TBDs" exist in the document.
- [ ] Existing Surfaces cites at least one source-tree path or explicitly states "none — net-new."
- [ ] Why not simpler? has both sub-bullets answered.
