---
type: proposal
id: "PROPOSAL-003"
parent: ""
children: []
cites: []
cited_by: []
status: "Abandoned"
remote_id: ""
raw_path: ".cleargate/delivery/archive/PROPOSAL-003_MCP_Adapter.md"
last_ingest: "2026-11-12T19:31:58.580Z"
last_ingest_commit: "c5daa2e17d44c5de50c683745851916812069428"
repo: "planning"
---

# PROPOSAL-003: ClearGate MCP — Remote Hub + Admin UI on Coolify VPS

**Status:** Abandoned · **Sprint:** none · **Gate:** not run

## Initiative & Context
### 1.1 Objective
Build the ClearGate backend as **two cooperating services on Coolify VPS**:

1. **ClearGate MCP** — a remote MCP server (Streamable HTTP) acting as a multi-tenant, versioned item hub. Generic adapter interface; v1 ships no PM-tool adapters and stores items itself.
2. **ClearGate Admin** — a small SvelteKit web app for managing projects, members, tokens, and viewing audit logs + basic stats. GitHub OAuth login.

[+1,268 bytes not shown — read .cleargate/delivery/archive/PROPOSAL-003_MCP_Adapter.md]

## Technical Architecture & Constraints
### 2.1 High-Level Diagram

```
                ┌──────────────────────────────────────────────────────────┐
                │                  Coolify VPS                             │
                │                                                          │
                │  ┌─────────────────────────┐  ┌─────────────────────┐    │
                │  │  ClearGate MCP          │  │  ClearGate Admin    │    │
```

[+16,246 bytes not shown — read .cleargate/delivery/archive/PROPOSAL-003_MCP_Adapter.md]

## Scope Impact (Touched Files & Data)
### 3.1 New Repository Layout

```
mcp/                                 (already created)
├── README.md                        (already created — to be updated)
├── package.json
├── tsconfig.json
├── Dockerfile
├── docker-compose.yml               (local dev: Postgres + Redis + MCP)
├── .env.example
├── drizzle.config.ts
├── src/
│   ├── server.ts                    (Fastify + MCP HTTP entry)
│   ├── config.ts
```

[+3,187 bytes not shown — read .cleargate/delivery/archive/PROPOSAL-003_MCP_Adapter.md]

## AI Interrogation Loop — Pre-Resolved per Conversation
Decisions confirmed by Vibe Coder during the design conversation that produced this proposal. Listed for audit trail.

### Core architecture
1. **MCP role in v1** — RESOLVED: stateful versioned hub (not stateless proxy). Source of truth for v1.
2. **PM-tool adapters in v1** — RESOLVED: none. Chyro-only. Linear/Jira/Azure DevOps as MCP-to-MCP adapters in v1.1.
3.

[+2,140 bytes not shown — read .cleargate/delivery/archive/PROPOSAL-003_MCP_Adapter.md]

## Approval Gate — PASSED
Approved by Vibe Coder on 2026-04-17. Scaffolding of `mcp/` and `admin/` per §3.1 authorized. Architecture confirmed: two separate Coolify apps (mcp + admin), shared Postgres + Redis.

<!-- BEGIN relations -->
## Relations
- Parent: none
<!-- END relations -->
