---
type: epic
id: "EPIC-003"
parent: ""
children: 
  - "[[STORY-003-01]]"
  - "[[STORY-003-02]]"
  - "[[STORY-003-03]]"
  - "[[STORY-003-04]]"
  - "[[STORY-003-05]]"
  - "[[STORY-003-06]]"
  - "[[STORY-003-07]]"
  - "[[STORY-003-08]]"
  - "[[STORY-003-09]]"
  - "[[STORY-003-10]]"
  - "[[STORY-003-11]]"
  - "[[STORY-003-12]]"
  - "[[STORY-003-13]]"
cites: []
cited_by: 
  - "[[EPIC-002]]"
status: "Completed"
remote_id: ""
raw_path: ".cleargate/delivery/archive/EPIC-003_MCP_Server_Core.md"
last_ingest: "2026-11-12T21:25:29.802Z"
last_ingest_commit: "2691d20a51eb6e8211a9ec862c0ec0ddf8c09601"
repo: "planning"
---

# EPIC-003: MCP Server Core

**Status:** Completed · **Sprint:** none · **Gate:** not run

## Objective
Build the ClearGate MCP server: Fastify + @modelcontextprotocol/sdk over Streamable HTTP, backed by Postgres (Drizzle) and Redis, serving four tools (push_item / pull_item / list_items / sync_status) with versioned item storage, JWT bearer auth, multi-tenant by project, rate limit, idempotency, and audit log.

## Problem & Value
**Why are we doing this?**
Without a running MCP server, ClearGate has no backbone — Claude Code and Chyro cannot exchange work items. The MCP is the central hub holding the canonical state (in v1) and enforcing multi-tenant auth, conflict policy, and audit.

[+399 bytes not shown — read .cleargate/delivery/archive/EPIC-003_MCP_Server_Core.md]

## Scope
**In:**
- [ ] Postgres schema + Drizzle migrations for all tables in PROPOSAL-003 §2.7
- [ ] JWT issue + verify + refresh endpoint
- [ ] Bearer JWT middleware that validates + attaches `{project_id, member_id, role, client_id}` to request
- [ ] Four MCP tools
**Out:**
- Admin API endpoints (projects / members / tokens CRUD) — that is EPIC-004
- Admin UI — that is EPIC-006
- Admin CLI (`cleargate-admin`) — that is EPIC-005
- Any PM-tool adapter (Linear, Jira, Azure DevOps)
- Webhook receiver
- OAuth 2.1 (bearer JWT

[+765 bytes not shown — read .cleargate/delivery/archive/EPIC-003_MCP_Server_Core.md]

## Architecture rules
- No Chyro-specific code. MCP is generic — Chyro is just one client.
- No PM-tool adapters in v1 (deferred to v1.1). MCP is canonical store in v1.
- All storage writes scoped to project_id from JWT claims — never accept project_id from request body.
- Server timestamps items; client clocks are not trusted.
- Last 10 versions per item retained; older pruned.
- Token plaintext never persisted — bcrypt hashes only.
- Authorization header scrubbed from all log output via pino redaction.

## Decisions
All 10 questions resolved 2026-04-17 by Vibe Coder (accept all recommendations).

1. **Story execution order** — **Resolved:** schema-first → JWT → tools (03-06) → middleware (07-09) → transport (10) → bootstrap (11) → deploy (12). Every other Story depends on DB types.
2. **Test strategy** — **Resolved:** Vitest unit tests for pure logic + integration tests against real containerized Postgres + Redis (via dev `docker-compose.yml`). Mocks hide migration and SQL bugs.
3.

[+1,259 bytes not shown — read .cleargate/delivery/archive/EPIC-003_MCP_Server_Core.md]

<!-- BEGIN relations -->
## Relations
- Parent: none
- Children (13): [[STORY-003-01]], [[STORY-003-02]], [[STORY-003-03]], [[STORY-003-04]], [[STORY-003-05]], [[STORY-003-06]], [[STORY-003-07]], [[STORY-003-08]], [[STORY-003-09]], [[STORY-003-10]], [[STORY-003-11]], [[STORY-003-12]], [[STORY-003-13]]
- Cited by (1): [[EPIC-002]]
<!-- END relations -->
