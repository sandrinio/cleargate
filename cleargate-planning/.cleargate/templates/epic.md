<instructions>
FOLLOW THIS EXACT STRUCTURE. Output sections in order.
YAML Frontmatter: Epic ID, Status, Ambiguity, Context Source, Owner, Target Date.
§0 Agent Handoff: XML block specifically formulated for AI coding agents to ingest.
§1 Problem & Value: Why (problem), What (solution), Success Metrics.
§2 Scope Boundaries: IN-SCOPE checkboxes, OUT-OF-SCOPE list.
§3 The Reality Check (Context): Constraints table.
§4 Technical Grounding: Verified files and data changes.
§5 Acceptance Criteria: Gherkin scenarios (happy path + error cases).
§6 AI Interrogation Loop: Explicit questions the Planning AI needs the Human to answer.
Output location: .cleargate/delivery/pending-sync/EPIC-{NNN}_{epic_name}.md

Codebase research is mandatory. Do NOT guess at affected files.

POST-WRITE BRIEF
After Writing this document, render a Brief in chat with the following sections,
mechanically extracted from the document's own structure:

  - Prior work       ← cleargate-wiki-query result (cite [[IDs]] or write "none found")
  - Summary          ← §1 Problem & Value
  - Open Questions   ← §6 AI Interrogation Loop
  - Edge Cases       ← §2 OUT-OF-SCOPE list + §5 error scenarios
  - Risks            ← §3 The Reality Check
  - Existing Surfaces ← §3.5 Existing Surfaces
  - Why not simpler? ← §3.6 Why not simpler?
  - Ambiguity        ← bottom-of-doc ambiguity gate block

Halt for human review. When ambiguity reaches 🟢, proceed to call cleargate_push_item.
Do NOT ask separately for push confirmation — Brief approval covers it.

Do NOT output these instructions.
</instructions>

---
epic_id: "EPIC-{ID}"
parent_cleargate_id: null  # canonical cleargate-id of parent work item; null for top-level
sprint_cleargate_id: null  # canonical cleargate-id of owning sprint; null for off-sprint items
carry_over: false  # set true to skip lifecycle reconciliation at sprint close
status: "Draft"
ambiguity: "🔴 High"
context_source: "PROPOSAL-{ID}.md"
owner: "{PM/PO name}"
target_date: "{YYYY-MM-DD}"
created_at: "2026-04-17T00:00:00Z"
updated_at: "2026-04-17T00:00:00Z"
created_at_version: "strategy-phase-pre-init"
updated_at_version: "strategy-phase-pre-init"
server_pushed_at_version: null
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
# Sync attribution. Optional; stamped by `cleargate push` / `cleargate pull`.
pushed_by: null            # set by push: which user pushed
pushed_at: null            # set by push: ISO-8601 timestamp
last_pulled_by: null       # set by pull: which user pulled
last_pulled_at: null       # set by pull: ISO-8601 timestamp
last_remote_update: null   # set by pull: server's last-modified timestamp
source: "local-authored"   # flips to "remote-authored" on intake
last_synced_status: null   # required for conflict-detector; status at last sync
last_synced_body_sha: null # sha256 of body at last sync
---

# EPIC-{ID}: {Epic Name}

## 0. AI Coding Agent Handoff
*(This section is strictly for downstream AI execution agents. It contains zero business fluff.)*

```xml
<agent_context>
  <objective>{1 sentence strict technical objective}</objective>
  <architecture_rules>
    <rule>Must use existing {Component/Pattern}</rule>
    <rule>No changes to {Protected Area}</rule>
  </architecture_rules>
  <target_files>
    <file path="src/..." action="modify|create" />
  </target_files>
</agent_context>
```

## 1. Problem & Value

**Why are we doing this?**
{1-2 sentences explaining the user pain or business value.}

**Success Metrics (North Star):**
- Metric 1: {Quantifiable outcome}

## 2. Scope Boundaries

**✅ IN-SCOPE (Build This)**
- [ ] {Technical capability 1}
- [ ] {Technical capability 2}

**❌ OUT-OF-SCOPE (Do NOT Build This)**
- {Explicitly excluded capability to prevent scope creep / AI hallucination}

## 3. The Reality Check (Context)

| Constraint Type | Limit / Rule |
|---|---|
| Performance | {e.g., Must complete in < 200ms} |
| Security | {e.g., No PII in logs} |

## 3.5 Existing Surfaces

> L1 reuse audit. List source-tree implementations the epic could extend. Cite file:line.

- **Surface:** `path/to/file.ext:NN` — {what it does}
- **Coverage of this epic's scope:** {≥80% extension / partial / none — and why}

## 3.6 Why not simpler?

> L2 / L3 right-size + justify-complexity. Answer both.

- **Smallest existing surface that could carry this epic:** {citation or "none — net-new abstraction required"}
- **Why isn't extension / parameterization / config sufficient?** {one paragraph}

## 4. Technical Grounding (The "Shadow Spec")
*(AI Planning Engine: Populate this strictly from the approved proposal.md)*

**Affected Files:**
- `path/to/file.ext` — {Why it changes}

**Data Changes:**
- Table/Entity: {New column/field}

## 5. Acceptance Criteria

```gherkin
Feature: {Epic Name}
  Scenario: {Scenario Name}
    Given {precondition}
    When {action}
    Then {outcome}
```

## 6. AI Interrogation Loop (Human Input Required)
*(AI Planning Engine: List edge cases, contradictions, or missing details found while drafting. The Epic stays 🔴 until the Human answers all of these.)*

- **AI Question:** "{e.g., You mentioned we need to send an email, but src/services/email doesn't support templates yet. Should we build the template engine first, or hardcode this one?}"
- **Human Answer:** {Waiting for user}

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)
**Current Status: 🔴 High Ambiguity**

*Evaluate each criterion against its literal text. If you substituted an interpretation, leave the box unchecked and surface the substitution in the Brief.*

Requirements to pass to Green (Ready for Coding Agent):
- [ ] Proposal document has `approved: true`.
- [ ] The `<agent_context>` block is complete and validated.
- [ ] §4 Technical Grounding contains 100% real, verified file paths.
- [ ] §6 AI Interrogation Loop is empty (all human answers integrated into the spec).
- [ ] 0 "TBDs" exist in the document.
- [ ] §3.5 Existing Surfaces cites at least one source-tree path or explicitly states "none — net-new."
- [ ] §3.6 Why not simpler? has both sub-bullets answered.
