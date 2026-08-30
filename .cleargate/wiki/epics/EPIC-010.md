---
type: epic
id: "EPIC-010"
parent: ""
children: 
  - "[[STORY-010-01]]"
  - "[[STORY-010-02]]"
  - "[[STORY-010-03]]"
  - "[[STORY-010-04]]"
  - "[[STORY-010-05]]"
  - "[[STORY-010-06]]"
  - "[[STORY-010-07]]"
  - "[[STORY-010-08]]"
status: "Completed"
remote_id: ""
raw_path: ".cleargate/delivery/archive/EPIC-010_Multi_Participant_MCP_Sync.md"
last_ingest: "2026-08-30T22:18:10.906Z"
last_ingest_commit: "a743603981ddb8788e7bde8cc42dc1fe5ef1a8f4"
repo: "planning"
---

# EPIC-010: Multi-Participant MCP Sync (v1)

## 0. AI Coding Agent Handoff

```xml
<agent_context>
  <objective>Ship bidirectional MCP sync v1 so Business (PM/BA/Stakeholders/SME) and IT (Vibe Coders) collaborate on the same backlog from their native tools. Deliver: (1) participant identity at `cleargate init` with env/git fallbacks; (2) four new MCP tools (pull_item, list_remote_updates, pull_comments, detect_new_items); (3) `cleargate sync` driver with three-way-merge conflict resolution; (4) sync-log + frontmatter attribution (pushed_by, last_pulled_by, last_remote_update); (5) stakeholder-authored-proposal intake via `cleargate:proposal` label polling; (6) read-only comments pulled to wiki for active items; (7) soft-revert via `cleargate push --revert`; (8) Protocol §14 "Multi-Participant Sync"; (9) daily-throttled SessionStart pull suggestion. Single-remote only.</objective>
  <architecture_rules>
    <rule>MCP stays a pure adapter — no business logic server-side.

[+26,849 bytes not shown — read .cleargate/delivery/archive/EPIC-010_Multi_Participant_MCP_Sync.md]

## Blast radius
Affects: [[STORY-010-01]], [[STORY-010-02]], [[STORY-010-03]], [[STORY-010-04]], [[STORY-010-05]], [[STORY-010-06]], [[STORY-010-07]], [[STORY-010-08]]
