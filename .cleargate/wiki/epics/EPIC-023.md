---
type: epic
id: "EPIC-023"
parent: ""
children: 
  - "[[STORY-023-01]]"
  - "[[STORY-023-02]]"
  - "[[STORY-023-03]]"
  - "[[STORY-023-04]]"
status: "Completed"
remote_id: ""
raw_path: ".cleargate/delivery/archive/EPIC-023_MCP_Native_Source_Of_Truth.md"
last_ingest: "2026-08-24T09:45:20.081Z"
last_ingest_commit: "5f8134f8b1ea5ad975d5687114fbf0f84ca1f53e"
repo: "planning"
---

# EPIC-023: MCP as Native Source of Truth — Work-Item Sync v2

## 0. AI Coding Agent Handoff

> ⚠️ **Framing note (2026-04-30):** This EPIC uses an "umbrella + sub-epics" structure. PROPOSAL-013 §2.5 frames the same scope as **4 sibling EPICs** (023/024/025/026). Reconcile at SPRINT-17 prep before drafting EPIC-024 — pick one framing and propagate.

```xml
<agent_context>
  <objective>Replace PmAdapter indirection in cleargate-cli sync paths with direct MCP DB queries; ship cleargate sync command that pushes work items (all statuses) to the MCP items table without requiring a PM adapter to be wired.</objective>
  <architecture_rules>
    <rule>PmAdapter interface stays in mcp/src/adapters/ — it is NOT removed; CLI stops reaching for it in sync flows. Admin-panel code may still use it later.</rule>
    <rule>Sync is status-blind: Draft, In-Review, Triaged, Approved, Done, Verified, Abandoned all sync. No pre-flight approved gate on cleargate sync (that gate lives on cleargate push and is admin-panel's filtering concern).</rule>
    <rule>Wire format is defined in EPIC-023 §2 (below).

[+11,598 bytes not shown — read .cleargate/delivery/archive/EPIC-023_MCP_Native_Source_Of_Truth.md]

## Blast radius
Affects: [[STORY-023-01]], [[STORY-023-02]], [[STORY-023-03]], [[STORY-023-04]]
