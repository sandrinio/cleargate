---
type: epic
id: "EPIC-000"
parent: ""
children: 
  - "[[STORY-000-01]]"
  - "[[STORY-000-02]]"
  - "[[STORY-000-03]]"
  - "[[STORY-000-04]]"
status: "Completed"
remote_id: ""
raw_path: ".cleargate/delivery/archive/EPIC-000_CLI_Package_Scaffold.md"
last_ingest: "2026-08-30T22:18:10.906Z"
last_ingest_commit: "2691d20a51eb6e8211a9ec862c0ec0ddf8c09601"
repo: "planning"
---

# EPIC-000: `cleargate-cli` Package Scaffold

## 0. AI Coding Agent Handoff

```xml
<agent_context>
  <objective>Scaffold the cleargate-cli npm package — shared foundation for EPIC-001 (stamp), EPIC-002 (wiki), EPIC-005 (join/admin). Ships a Commander-based CLI with config loader, auth/token-store abstraction, and MCP-client stub. Publishable to npm as @cleargate/cli.</objective>
  <architecture_rules>
    <rule>Package path: cleargate-cli/ (sibling of mcp/ and admin/).</rule>
    <rule>Published as @cleargate/cli (scoped).</rule>
    <rule>Three usage modes supported: npx one-off, local devDep, global install.</rule>
    <rule>Zero business logic in EPIC-000 — pure scaffold and shared plumbing.</rule>
    <rule>TypeScript strict.

[+3,833 bytes not shown — read .cleargate/delivery/archive/EPIC-000_CLI_Package_Scaffold.md]

## Blast radius
Affects: [[STORY-000-01]], [[STORY-000-02]], [[STORY-000-03]], [[STORY-000-04]]
