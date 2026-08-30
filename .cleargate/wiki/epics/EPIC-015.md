---
type: epic
id: "EPIC-015"
parent: ""
children: 
  - "[[STORY-015-01]]"
  - "[[STORY-015-02]]"
  - "[[STORY-015-03]]"
  - "[[STORY-015-04]]"
status: "Completed"
remote_id: ""
raw_path: ".cleargate/delivery/archive/EPIC-015_Wiki_Index_Hygiene_And_Scale.md"
last_ingest: "2026-08-30T22:18:10.906Z"
last_ingest_commit: "2691d20a51eb6e8211a9ec862c0ec0ddf8c09601"
repo: "planning"
---

# EPIC-015: Wiki Index Hygiene & Scale

## 0. AI Coding Agent Handoff

```xml
<agent_context>
  <objective>Reshape .cleargate/wiki/index.md from a flat 151-row table into a scale-ready hierarchical index and fix the stale frontmatter that causes half its rows to lie about status.</objective>
  <architecture_rules>
    <rule>Source of truth stays the raw-item frontmatter in .cleargate/delivery/{pending-sync,archive}/; index.md is derived</rule>
    <rule>No retrieval augmentation (BM25, vector, embeddings) — this epic stays inside Karpathy's flat-index regime</rule>
    <rule>Status vocabulary remains protocol-defined (Draft / Ready / Approved / Completed / Done).

[+9,230 bytes not shown — read .cleargate/delivery/archive/EPIC-015_Wiki_Index_Hygiene_And_Scale.md]

## Blast radius
Affects: [[STORY-015-01]], [[STORY-015-02]], [[STORY-015-03]], [[STORY-015-04]]
