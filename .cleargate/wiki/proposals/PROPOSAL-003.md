---
type: proposal
id: "PROPOSAL-003"
parent: ""
children: []
status: "Abandoned"
remote_id: ""
raw_path: ".cleargate/delivery/archive/PROPOSAL-003_MCP_Adapter.md"
last_ingest: "2026-08-30T22:18:10.906Z"
last_ingest_commit: "c5daa2e17d44c5de50c683745851916812069428"
repo: "planning"
---

# PROPOSAL-003: ClearGate MCP — Remote Hub + Admin UI on Coolify VPS

## 1. Initiative & Context

### 1.1 Objective
Build the ClearGate backend as **two cooperating services on Coolify VPS**:

1. **ClearGate MCP** — a remote MCP server (Streamable HTTP) acting as a multi-tenant, versioned item hub. Generic adapter interface; v1 ships no PM-tool adapters and stores items itself.
2. **ClearGate Admin** — a small SvelteKit web app for managing projects, members, tokens, and viewing audit logs + basic stats. GitHub OAuth login.

v1 integrates with **Chyro only** (Chyro is an MCP client). PM-tool adapters (Linear, Jira, Azure DevOps) and webhook receivers are deferred to v1.1.

### 1.2 The "Why" for Remote

- **Multi-tenant collaboration.** Multiple Vibe Coders + Chyro share one project backlog; everyone sees the same authoritative state.
- **Centralized credentials.** Tokens (and future PM secrets in v1.1) managed in one place, not scattered across machines.
- **Operational visibility.** Audit log and basic stats answer "who did what and is the system healthy?" — impossible with bundled stdio MCP.
- **Decoupled integrations.** Chyro talks to MCP via standard MCP protocol; same surface as future Linear/Jira adapters in v1.1.

[+24,035 bytes not shown — read .cleargate/delivery/archive/PROPOSAL-003_MCP_Adapter.md]

## Blast radius
Affects: no parent/child refs declared in frontmatter
