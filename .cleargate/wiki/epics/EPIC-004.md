---
type: epic
id: "EPIC-004"
parent: ""
children: 
  - "[[STORY-004-01]]"
  - "[[STORY-004-02]]"
  - "[[STORY-004-03]]"
  - "[[STORY-004-04]]"
  - "[[STORY-004-05]]"
  - "[[STORY-004-06]]"
  - "[[STORY-004-07]]"
  - "[[STORY-004-08]]"
  - "[[STORY-004-09]]"
status: "Completed"
remote_id: ""
raw_path: ".cleargate/delivery/archive/EPIC-004_Admin_API.md"
last_ingest: "2026-08-24T09:45:20.081Z"
last_ingest_commit: "2691d20a51eb6e8211a9ec862c0ec0ddf8c09601"
repo: "planning"
---

# EPIC-004: Admin API

## 0. AI Coding Agent Handoff

```xml
<agent_context>
  <objective>Expose administrative endpoints from the MCP server that the SvelteKit Admin UI (EPIC-006) and cleargate-admin CLI (EPIC-005) consume. CRUD for projects, members, tokens; audit log query; basic stats. Gated by admin-scoped JWT (role=admin).</objective>
  <architecture_rules>
    <rule>All /admin-api/* routes require a JWT with role=admin. Non-admin JWTs get 403.</rule>
    <rule>Token plaintext returned ONCE on issue; afterwards only the hash is stored and the ID + metadata are retrievable.</rule>
    <rule>Audit log read-only through this API — never mutable except by internal audit middleware.</rule>
    <rule>Rate-limit admin endpoints separately (30 req/min default per PROP-003).</rule>
    <rule>Cross-project isolation still applies — admins belong to all projects they own; responses are filtered by admin's project memberships.</rule>
  </architecture_rules>
  <target_files>
    <file path="mcp/src/auth/admin-middleware.ts" action="create" />
    <file path="mcp/src/admin-api/index.ts" action="create" />
    <file path="mcp/src/admin-api/projects.ts" action="create" />
    <file

[+6,774 bytes not shown — read .cleargate/delivery/archive/EPIC-004_Admin_API.md]

## Blast radius
Affects: [[STORY-004-01]], [[STORY-004-02]], [[STORY-004-03]], [[STORY-004-04]], [[STORY-004-05]], [[STORY-004-06]], [[STORY-004-07]], [[STORY-004-08]], [[STORY-004-09]]
