---
type: epic
id: "EPIC-001"
parent: ""
children: 
  - "[[STORY-001-01]]"
  - "[[STORY-001-02]]"
  - "[[STORY-001-03]]"
  - "[[STORY-001-04]]"
  - "[[STORY-001-05]]"
  - "[[STORY-001-06]]"
status: "Abandoned"
remote_id: ""
raw_path: ".cleargate/delivery/archive/EPIC-001_Document_Metadata_Lifecycle.md"
last_ingest: "2026-08-30T22:18:10.906Z"
last_ingest_commit: "2691d20a51eb6e8211a9ec862c0ec0ddf8c09601"
repo: "planning"
---

# EPIC-001: Document Metadata Lifecycle

## 0. AI Coding Agent Handoff

```xml
<agent_context>
  <objective>Implement automatic stamping of created_at, updated_at, created_at_version, updated_at_version (and pushed_at_version on push) into the YAML frontmatter of every ClearGate document. Ship the cleargate stamp CLI + codebase-version helper + MCP push-time integration.</objective>
  <architecture_rules>
    <rule>Flat string versions, not rich objects (PROP-001 Q1 resolved).</rule>
    <rule>Idempotent: re-stamping must never change created_at.</rule>
    <rule>Server does not stamp on behalf of clients for local files — the CLI does.

[+7,899 bytes not shown — read .cleargate/delivery/archive/EPIC-001_Document_Metadata_Lifecycle.md]

## Blast radius
Affects: [[STORY-001-01]], [[STORY-001-02]], [[STORY-001-03]], [[STORY-001-04]], [[STORY-001-05]], [[STORY-001-06]]
