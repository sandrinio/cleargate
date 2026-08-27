---
type: epic
id: "EPIC-054"
parent: ""
children: []
status: "Draft"
remote_id: ""
raw_path: ".cleargate/delivery/pending-sync/EPIC-054_Spike_And_Task_Decomposition_Surfaces.md"
last_ingest: "2026-08-25T19:14:08.376Z"
last_ingest_commit: ""
repo: "planning"
---

# EPIC-054: Spike & Task Decomposition Surfaces — Discovery Before, Execution Within

## 0. AI Coding Agent Handoff
*(This section is strictly for downstream AI execution agents. It contains zero business fluff.)*

```xml
<agent_context>
  <objective>Add the two missing decomposition surfaces — a pre-sprint SPIKE charter type for bounded discovery, and a Task Breakdown section inside Story/CR/Bug for L3 execution sequencing — without adding a second granularity to the sprint execution machine.</objective>
  <architecture_rules>
    <rule>The atomic execution unit stays the Story. Nothing in this epic may add a second unit to state.json, worktree cutting, dispatch markers, or token-ledger attribution.</rule>
    <rule>Tasks are a template section, never a pushed work item. They get no id, no remote id, no lifecycle state.</rule>
    <rule>Spikes run pre-sprint. A spike never enters the five-agent loop and its prototype code never merges to a sprint branch.</rule>
    <rule>Every template edit lands in BOTH the live tree (.cleargate/templates/, .claude/) and the canonical mirror (cleargate-planning/**).

[+27,484 bytes not shown — read .cleargate/delivery/pending-sync/EPIC-054_Spike_And_Task_Decomposition_Surfaces.md]

## Blast radius
Affects: no parent/child refs declared in frontmatter
