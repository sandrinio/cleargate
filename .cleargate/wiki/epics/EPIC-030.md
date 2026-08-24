---
type: epic
id: "EPIC-030"
parent: ""
children: []
status: "Draft"
remote_id: ""
raw_path: ".cleargate/delivery/pending-sync/EPIC-030_AI_Driven_Sprint_Planning.md"
last_ingest: "2026-08-24T09:45:20.081Z"
last_ingest_commit: "f66e7744668126504eed66de8d74c5743f50136e"
repo: "planning"
---

# EPIC-030: AI-Driven Sprint Planning Orchestration

## 0. AI Coding Agent Handoff

```xml
<agent_context>
  <objective>Replace judgment-based sprint planning with a four-mechanism deterministic orchestration layer: prioritized backlog grooming, conflict-graph parallel selection, drift bounding at session-start, and out-of-sprint research spikes.</objective>
  <architecture_rules>
    <rule>Must extend existing Sprint Plan Template §2 SDR — algorithm output writes into existing slots (Phase Plan, Merge Ordering, Lane Audit), does not replace the template structure.</rule>
    <rule>Must reuse wiki topic-page mechanism (cleargate wiki query --persist) for spike findings — no new artifact type.</rule>
    <rule>Must reuse cleargate doctor --session-start surface for drift checks — extends, does not fork.</rule>
    <rule>No PM-tool push for spike artifacts — wiki topics are local-only.</rule>
    <rule>Algorithm is advisory in v1 mode (warn + render Brief), enforcing in v2 mode (halt on drift / unjustified spike / capacity overflow).

[+25,601 bytes not shown — read .cleargate/delivery/pending-sync/EPIC-030_AI_Driven_Sprint_Planning.md]

## Blast radius
Affects: no parent/child refs declared in frontmatter
