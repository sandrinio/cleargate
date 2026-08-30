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
status: "Completed"
remote_id: ""
raw_path: ".cleargate/delivery/archive/EPIC-003_MCP_Server_Core.md"
last_ingest: "2026-08-30T22:18:10.906Z"
last_ingest_commit: "2691d20a51eb6e8211a9ec862c0ec0ddf8c09601"
repo: "planning"
---

# EPIC-003: MCP Server Core

## 0. AI Coding Agent Handoff

```xml
<agent_context>
  <objective>Build the ClearGate MCP server: Fastify + @modelcontextprotocol/sdk over Streamable HTTP, backed by Postgres (Drizzle) and Redis, serving four tools (push_item / pull_item / list_items / sync_status) with versioned item storage, JWT bearer auth, multi-tenant by project, rate limit, idempotency, and audit log.</objective>
  <architecture_rules>
    <rule>No Chyro-specific code. MCP is generic — Chyro is just one client.</rule>
    <rule>No PM-tool adapters in v1 (deferred to v1.1). MCP is canonical store in v1.</rule>
    <rule>All storage writes scoped to project_id from JWT claims — never accept project_id from request body.</rule>
    <rule>Server timestamps items; client clocks are not trusted.</rule>
    <rule>Last 10 versions per item retained; older pruned.</rule>
    <rule>Token plaintext never persisted — bcrypt hashes only.</rule>
    <rule>Authorization header scrubbed from all log output via pino redaction.</rule>
  </architecture_rules>
  <target_files>
    <file path="mcp/src/db/schema.ts" action="create" />
    <file path="mcp/src/db/client.ts" action="create" />
    <file

[+9,161 bytes not shown — read .cleargate/delivery/archive/EPIC-003_MCP_Server_Core.md]

## Blast radius
Affects: [[STORY-003-01]], [[STORY-003-02]], [[STORY-003-03]], [[STORY-003-04]], [[STORY-003-05]], [[STORY-003-06]], [[STORY-003-07]], [[STORY-003-08]], [[STORY-003-09]], [[STORY-003-10]], [[STORY-003-11]], [[STORY-003-12]], [[STORY-003-13]]
