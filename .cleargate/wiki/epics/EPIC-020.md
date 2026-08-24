---
type: epic
id: "EPIC-020"
parent: ""
children: 
  - "[[STORY-020-01]]"
  - "[[STORY-020-02]]"
  - "[[STORY-020-03]]"
status: "Completed"
remote_id: ""
raw_path: ".cleargate/delivery/archive/EPIC-020_Wiki_Contradiction_Detection.md"
last_ingest: "2026-08-24T09:45:20.081Z"
last_ingest_commit: "6aff4e920b21cae00c271fb74009ee9e3ed09312"
repo: "planning"
---

# EPIC-020: Wiki Contradiction Detection (Advisory v1)

## 0. AI Coding Agent Handoff

```xml
<agent_context>
  <objective>Add a semantic contradiction-check phase to wiki-ingest so Draft/In-Review work items are screened against their cited neighborhood; emit advisory findings to wiki/contradictions.md without blocking any gate.</objective>
  <architecture_rules>
    <rule>Read-only subagent — Write/Edit/Bash forbidden in cleargate-wiki-contradict.md.</rule>
    <rule>Neighborhood-scoping is mandatory: full-corpus scans are forbidden. The subagent receives an explicit list of pages from the ingest caller.</rule>
    <rule>Idempotency via last_contradict_sha is mandatory — skip the LLM call when raw SHA matches.</rule>
    <rule>v1 always exits 0. No gate (1, 2, or 3) is blocked by a contradiction finding.</rule>
    <rule>Schema delta to §10.4 is additive only — pages without last_contradict_sha must continue to pass lint.</rule>
    <rule>No changes to .claude/hooks/stamp-and-gate.sh in v1.

[+10,249 bytes not shown — read .cleargate/delivery/archive/EPIC-020_Wiki_Contradiction_Detection.md]

## Blast radius
Affects: [[STORY-020-01]], [[STORY-020-02]], [[STORY-020-03]]
