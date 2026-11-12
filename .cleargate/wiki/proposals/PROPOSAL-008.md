---
type: proposal
id: "PROPOSAL-008"
parent: ""
children: []
cites: []
cited_by: []
status: "Draft"
remote_id: ""
raw_path: ".cleargate/delivery/archive/PROPOSAL-008_Project_Config_MCP_Authority.md"
last_ingest: "2026-11-12T19:31:58.580Z"
last_ingest_commit: "24c383f4fdb142f48f20a752f8bff2f11e043115"
repo: "planning"
sprint_cleargate_id: "SPRINT-06"
---

# PROPOSAL-008: Project Config as MCP-Authoritative, UI-Editable, Pulled to Local

**Status:** Draft · **Sprint:** SPRINT-06 · **Gate:** pass

## Initiative & Context
### 1.1 Objective

Make **project configuration** — the set of non-work-item settings that govern how a ClearGate project runs (participant roster, remote PM tool mapping, invite/gate/sync policies, feature flags, theme/brand metadata) — **authoritative on the MCP server**, **editable via the Admin UI**, and **synced down to every participant's local scaffold** as a read-only snapshot (`.cleargate/.project-config.json`).

[+3,840 bytes not shown — read .cleargate/delivery/archive/PROPOSAL-008_Project_Config_MCP_Authority.md]

## Technical Architecture & Constraints
### 2.1 Dependencies

- **PROP-003** (hard) — extends the existing MCP adapter and Admin API surface.
- **PROP-007** (hard) — reuses the identity/sync-log/SessionStart-pull machinery introduced in EPIC-010. No point building a second pull pipeline.
- **PROP-004** (soft) — public discoverability already exposes project display metadata; this proposal formalizes the storage.

[+7,707 bytes not shown — read .cleargate/delivery/archive/PROPOSAL-008_Project_Config_MCP_Authority.md]

## Scope Impact (Touched Files & Data)
### 3.1 Known Files — must be modified

**MCP server:**
- `mcp/src/db/migrations/<N>_project_config.sql` — new tables.
- `mcp/src/db/schema.ts` — Drizzle table definitions.
- `mcp/src/endpoints/admin/project-config.ts` — GET / PATCH handlers.
- `mcp/src/endpoints/admin/project-config-audit.ts` — audit GET.
- `mcp/src/mcp-tools/pull-project-config.ts` — new MCP tool.

[+1,943 bytes not shown — read .cleargate/delivery/archive/PROPOSAL-008_Project_Config_MCP_Authority.md]

## AI Interrogation Loop (Human Input Required)
*(The AI's open questions on this Proposal. The Proposal stays at Draft until all are answered.)*

1. **Q — Sequencing vs PROP-007.** PROP-007 (EPIC-010) is queued as SPRINT-07, ahead of SPRINT-06 (Admin UI).

[+4,641 bytes not shown — read .cleargate/delivery/archive/PROPOSAL-008_Project_Config_MCP_Authority.md]

## Approval Gate
(Vibe Coder: Review this proposal. It defines the config-plane counterpart to PROP-007's work-item-plane. Confirm scope against §1.4 — especially the **stays local** column — before approving. If the architecture is correct, answer the questions in §4 and set `approved: true` in the YAML frontmatter. Only then is the AI authorized to decompose into Epics/Stories.)

<!-- BEGIN relations -->
## Relations
- Parent: none
<!-- END relations -->
