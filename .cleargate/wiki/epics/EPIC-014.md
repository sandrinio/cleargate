---
type: epic
id: "EPIC-014"
parent: ""
children: 
  - "[[STORY-014-01]]"
  - "[[STORY-014-02]]"
  - "[[STORY-014-03]]"
  - "[[STORY-014-04]]"
  - "[[STORY-014-05]]"
  - "[[STORY-014-06]]"
  - "[[STORY-014-07]]"
  - "[[STORY-014-08]]"
  - "[[STORY-014-09]]"
  - "[[STORY-014-10]]"
status: "Completed"
remote_id: ""
raw_path: ".cleargate/delivery/archive/EPIC-014_Execution_V2_Polish.md"
last_ingest: "2026-08-30T22:18:10.906Z"
last_ingest_commit: "89539e8bfcdb817b90712e9e148c6e392145214e"
repo: "planning"
---

# EPIC-014: Execution v2 Polish & Efficiency Fixes

## 0. AI Coding Agent Handoff

```xml
<agent_context>
  <objective>Close the CLI gaps, add the safety gates, and eliminate the manual bash choreography that SPRINT-09 and CG_TEST SPRINT-01 revealed in the v2 execution scaffold — without changing the protocol or four-agent contract.</objective>
  <architecture_rules>
    <rule>No new runtime dependencies. Node built-ins + git + bash only (same as EPIC-013).</rule>
    <rule>Three-surface landing (R9) on every story: `.cleargate/`, `cleargate-planning/`, and `cleargate-cli/` where applicable.</rule>
    <rule>All behavioral changes gated behind `execution_mode: v2`. Under v1, behavior is unchanged.</rule>
    <rule>Reuse M1/M2 scripts from EPIC-013 — do NOT reimplement `run_script.sh`, `update_state.mjs`, `close_sprint.mjs`, `pending-task-sentinel.sh`, etc.

[+14,397 bytes not shown — read .cleargate/delivery/archive/EPIC-014_Execution_V2_Polish.md]

## Blast radius
Affects: [[STORY-014-01]], [[STORY-014-02]], [[STORY-014-03]], [[STORY-014-04]], [[STORY-014-05]], [[STORY-014-06]], [[STORY-014-07]], [[STORY-014-08]], [[STORY-014-09]], [[STORY-014-10]]
