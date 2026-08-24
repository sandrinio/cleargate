---
type: sprint
id: "SPRINT-27"
parent: ""
children: []
status: "Completed"
remote_id: ""
raw_path: ".cleargate/delivery/archive/SPRINT-27_MCP_Type_Agnostic_And_Console_Connection.md"
last_ingest: "2026-08-24T09:45:20.081Z"
last_ingest_commit: "46d8e1d2bd30047a674f31bb09b263dbdfbe39de"
repo: "planning"
---

# SPRINT-27: MCP Type-Agnostic Sync + Sprint Artifact Push + Admin-Console Connection UX

## 0. Stakeholder Brief

- **Sprint Goal:** Open MCP to any work-item type, prove it by syncing ClearGate's own sprint plans + reports to MCP, lock the codebase/PM-tool boundary, and give the admin console a copy-paste "connect an external agent" snippet that works for both HTTP and stdio (Claude Desktop) clients.
- **Business Outcome:** (a) New artifact classes (sprints, sprint reports, future adapter-imported issues) sync without any MCP code change. (b) Sprint reports become wiki-visible and MCP-queryable — historical sprint context is no longer locked in `sprint-runs/`. (c) External-agent onboarding drops from "read docs + extract token + hand-craft JSON" to "click 'Issue token' → copy snippet → paste" for Cursor/Cline/curl AND Claude Desktop / Claude Code. (d) Member management stops 500-ing when a member has authored items.
- **Risks (top 3):** EPIC-027 stories serialize on `push-item.ts` (bounce-exposure compounds); CR-063 + CR-064 both edit `close_sprint.mjs` Gate-4 pipeline (merge order matters); CR-065 is auth-adjacent — service-token consumer path is net-new in the CLI bridge though server-side verification already exists.

[+39,999 bytes not shown — read .cleargate/delivery/archive/SPRINT-27_MCP_Type_Agnostic_And_Console_Connection.md]

## Blast radius
Affects: no parent/child refs declared in frontmatter
