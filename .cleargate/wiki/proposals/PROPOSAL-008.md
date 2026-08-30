---
type: proposal
id: "PROPOSAL-008"
parent: ""
children: []
status: "Draft"
remote_id: ""
raw_path: ".cleargate/delivery/archive/PROPOSAL-008_Project_Config_MCP_Authority.md"
last_ingest: "2026-08-30T22:18:10.906Z"
last_ingest_commit: "24c383f4fdb142f48f20a752f8bff2f11e043115"
repo: "planning"
---

# PROPOSAL-008: Project Config as MCP-Authoritative, UI-Editable, Pulled to Local

## 1. Initiative & Context

### 1.1 Objective

Make **project configuration** — the set of non-work-item settings that govern how a ClearGate project runs (participant roster, remote PM tool mapping, invite/gate/sync policies, feature flags, theme/brand metadata) — **authoritative on the MCP server**, **editable via the Admin UI**, and **synced down to every participant's local scaffold** as a read-only snapshot (`.cleargate/.project-config.json`). Local agents consult the snapshot for policy decisions; changes happen in the UI (or via an admin CLI), not by hand-editing local files.

### 1.2 The "Why"

[+19,503 bytes not shown — read .cleargate/delivery/archive/PROPOSAL-008_Project_Config_MCP_Authority.md]

## Blast radius
Affects: no parent/child refs declared in frontmatter
