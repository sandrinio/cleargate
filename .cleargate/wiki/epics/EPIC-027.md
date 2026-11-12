---
type: epic
id: "EPIC-027"
parent: ""
children: 
  - "[[CR-064]]"
  - "[[STORY-027-01]]"
  - "[[STORY-027-02]]"
  - "[[STORY-027-03]]"
  - "[[STORY-027-04]]"
  - "[[STORY-027-05]]"
cites: 
  - "[[EPIC-010]]"
cited_by: 
  - "[[CR-064]]"
  - "[[CR-092]]"
  - "[[PROPOSAL-074]]"
  - "[[SPRINT-27]]"
status: "Completed"
remote_id: ""
raw_path: ".cleargate/delivery/archive/EPIC-027_MCP_Type_Agnostic_Sync_And_Universal_Payload.md"
last_ingest: "2026-11-12T20:33:09.611Z"
last_ingest_commit: "a743603981ddb8788e7bde8cc42dc1fe5ef1a8f4"
repo: "planning"
parent_cleargate_id: "EPIC-010"
---

# EPIC-027: MCP Type-Agnostic Sync & Universal Payload Contract

**Status:** Completed · **Sprint:** none · **Gate:** pass

## Objective
Relax MCP push-item type validation to an open normalized string, formalize a minimum payload contract (title + status), extract ClearGate-specific gates from the universal push path, and surface a three-layer structured error model (L1 reject codes / L2 warnings / L3 draft-time lint).

## Problem & Value
**Why are we doing this?**
Today MCP `cleargate_push_item` enforces a closed six-type Zod enum at `mcp/src/tools/push-item.ts:7-14`. Every new artifact class (sprints, sprint reports, adapter-imported issue types from Jira/Azure/Linear) requires a schema migration and coordinated CLI/server release.

[+2,122 bytes not shown — read .cleargate/delivery/archive/EPIC-027_MCP_Type_Agnostic_Sync_And_Universal_Payload.md]

## Scope
**In:**
- [ ] Open `type` Zod validator: `z.string().min(1).max(64).regex(/^[a-z][a-z0-9_-]*$/)` after server-side normalize (`trim().toLowerCase().replace(/\s+/g, '-')`).
**Out:**
- Actual Jira / Azure DevOps adapter implementations (separate Epic, builds on this contract).
- Admin console UI for adapter credential configuration (next Admin UI epic).

[+2,846 bytes not shown — read .cleargate/delivery/archive/EPIC-027_MCP_Type_Agnostic_Sync_And_Universal_Payload.md]

## Architecture rules
- CLI and agent surfaces (cleargate-cli, .claude/agents, repo scripts) MUST NOT import a PM-tool SDK (no @linear/sdk, no jira-client, no azure-devops). They speak only to MCP.
- PM-tool adapters live exclusively at mcp/src/adapters/. Credentials are stored against the project row in the admin DB. Configuration happens only through the admin console UI — never via CLI flags or env vars.
- items.type column stays text + JSONB payload — no DB CHECK/ENUM.

[+528 bytes not shown — read .cleargate/delivery/archive/EPIC-027_MCP_Type_Agnostic_Sync_And_Universal_Payload.md]

## Decisions
- Should `MCP_MAX_PAYLOAD_BYTES` default to 1 MB, or higher (e.g. 4 MB to accommodate large sprint reports with embedded artifacts)? Recommendation:… → 1 MB default, `MCP_MAX_PAYLOAD_BYTES` env override.
- Should `KNOWN_TYPES` live (a) in `mcp/src/lib/payload-contract.ts` server-side only (Admin UI fetches via endpoint), or (b) in a shared `@cleargate/types` published… → Shared npm package `@cleargate/types` consumed by MCP + CLI + UI (path b).

[+2,199 bytes not shown — read .cleargate/delivery/archive/EPIC-027_MCP_Type_Agnostic_Sync_And_Universal_Payload.md]

<!-- BEGIN relations -->
## Relations
- Parent: none
- Children (6): [[CR-064]], [[STORY-027-01]], [[STORY-027-02]], [[STORY-027-03]], [[STORY-027-04]], [[STORY-027-05]]
- Cites (1): [[EPIC-010]]
- Cited by (4): [[CR-064]], [[CR-092]], [[PROPOSAL-074]], [[SPRINT-27]]
<!-- END relations -->
