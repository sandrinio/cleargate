---
type: epic
id: "EPIC-002"
parent: ""
children: 
  - "[[STORY-002-01]]"
  - "[[STORY-002-02]]"
  - "[[STORY-002-03]]"
  - "[[STORY-002-04]]"
  - "[[STORY-002-05]]"
  - "[[STORY-002-06]]"
  - "[[STORY-002-07]]"
  - "[[STORY-002-08]]"
  - "[[STORY-002-09]]"
status: "Completed"
remote_id: ""
raw_path: ".cleargate/delivery/archive/EPIC-002_Knowledge_Wiki_Layer.md"
last_ingest: "2026-08-24T09:45:20.081Z"
last_ingest_commit: "2691d20a51eb6e8211a9ec862c0ec0ddf8c09601"
repo: "planning"
---

# EPIC-002: Knowledge Wiki Layer

## 0. AI Coding Agent Handoff

```xml
<agent_context>
  <objective>Ship the Karpathy-style compiled awareness layer at .cleargate/wiki/. Three subagents (ingest/query/lint) maintain index.md + log.md + per-item pages + synthesis pages (product-state, roadmap, active-sprint, open-gates) + filed-back topic pages. PostToolUse hook + protocol rule trigger ingest; lint blocks Gate 1 and Gate 3 on drift.</objective>
  <architecture_rules>
    <rule>Wiki is derived; raw files (.cleargate/delivery, .cleargate/plans) are source of truth. On conflict, lint rebuilds from raw.</rule>
    <rule>Raw → wiki is a compile step (Karpathy framing). Rebuild is always safe and idempotent.</rule>
    <rule>Wiki pages hold metadata + summary + edges only — NOT full raw content (PROP-002 Q1). Exception: wiki/topics/ pages hold synthesis prose filed back from query results.</rule>
    <rule>wiki/ is committed to git (PROP-002 Q2).

[+16,986 bytes not shown — read .cleargate/delivery/archive/EPIC-002_Knowledge_Wiki_Layer.md]

## Blast radius
Affects: [[STORY-002-01]], [[STORY-002-02]], [[STORY-002-03]], [[STORY-002-04]], [[STORY-002-05]], [[STORY-002-06]], [[STORY-002-07]], [[STORY-002-08]], [[STORY-002-09]]
