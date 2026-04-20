---
epic_id: EPIC-004
status: Completed
ambiguity: 🟢 Low
context_source: PROPOSAL-003_MCP_Adapter.md
owner: Vibe Coder (ssuladze@exadel.com)
target_date: 2026-04-18
completed_in_sprints:
  - SPRINT-02
  - SPRINT-03
completed_at: 2026-04-18T13:00:00Z
completion_notes: 6/7 stories shipped in SPRINT-02; STORY-004-07 (invite storage retrofit to Postgres) closed in SPRINT-03.
created_at: 2026-04-17T00:00:00Z
updated_at: 2026-04-18T18:00:00Z
created_at_version: strategy-phase-pre-init
updated_at_version: strategy-phase-pre-init
resolved_at: 2026-04-17T00:00:00Z
resolved_by: Vibe Coder (ssuladze@exadel.com)
approved: true
pushed_by: sandrinio@github.local
pushed_at: 2026-04-20T19:43:37.681Z
push_version: 3
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
    <file path="mcp/src/admin-api/members.ts" action="create" />
    <file path="mcp/src/admin-api/tokens.ts" action="create" />
    <file path="mcp/src/admin-api/audit.ts" action="create" />
    <file path="mcp/src/admin-api/stats.ts" action="create" />
    <file path="mcp/src/server.ts" action="modify" />
  </target_files>
</agent_context>
```

## 1. Problem & Value

**Why are we doing this?**
The MCP stores projects/members/tokens/audit, but without an API to manage them, operations are SQL-only. The Admin UI (EPIC-006) and CLI (EPIC-005) both depend on this API to read and mutate administrative state.

**Success Metrics (North Star):**
- Admin UI can list, create, and delete projects via the API.
- Tokens can be issued (plaintext returned once), listed (ID + metadata only), and revoked.
- Audit log queryable with filters (date range + user + tool) and paginated.
- Stats page loads key metrics (req/day, error rate, top items) in under 500ms for a 90-day audit window.

## 2. Scope Boundaries

**✅ IN-SCOPE**
- [ ] Admin JWT middleware (verifies role=admin, attaches `admin_user_id`)
- [ ] Projects: `GET /admin-api/projects` (list), `POST /admin-api/projects` (create), `GET /:id`, `DELETE /:id`
- [ ] Members: `GET /admin-api/projects/:pid/members`, `POST` (invite), `DELETE /members/:mid`
- [ ] Tokens: `GET /admin-api/projects/:pid/tokens` (metadata only), `POST` (issue → plaintext once), `DELETE /tokens/:tid`
- [ ] Audit: `GET /admin-api/projects/:pid/audit?from&to&user&tool&cursor&limit` — cursor-paginated
- [ ] Stats: `GET /admin-api/projects/:pid/stats?window=7d|30d|90d` — requests/day, error rate, top items
- [ ] Rate-limit configured per-role (admin: 30/min)
- [ ] OpenAPI / JSON Schema spec for each endpoint (for EPIC-006 UI typing)

**❌ OUT-OF-SCOPE (deferred)**
- Admin UI itself (EPIC-006)
- Admin CLI (EPIC-005)
- GitHub OAuth flow (lives in EPIC-006 — UI-side)
- Bulk import/export (v1.1)
- Precomputed stats rollups (v1.1 optimization)

## 3. The Reality Check (Context)

| Constraint | Rule |
|---|---|
| Auth scope | Admin-role JWT required on every endpoint. |
| Token safety | bcrypt hash only in DB; plaintext returned once in response to POST /tokens, never retrievable again. |
| Performance | Audit query p95 < 500ms for 90-day window (index on `audit_log(project_id, timestamp DESC)`). |
| Cross-project | Admin can only see projects they own (joined via `admin_users` → `projects.created_by`). Filter every list query. |
| Rate limit | 30 req/min per admin. |
| Back-compat | API is versioned via path (`/admin-api/v1/*`) to allow breaking changes later. |

## 4. Technical Grounding

**OpenAPI-style endpoint surface (outline):**

| Method | Path | Role | Body / Query |
|---|---|---|---|
| GET | `/admin-api/v1/projects` | admin | — |
| POST | `/admin-api/v1/projects` | admin | `{ name }` |
| GET | `/admin-api/v1/projects/:id` | admin | — |
| DELETE | `/admin-api/v1/projects/:id` | admin | — |
| GET | `/admin-api/v1/projects/:pid/members` | admin | — |
| POST | `/admin-api/v1/projects/:pid/members` | admin | `{ email, role, display_name? }` |
| DELETE | `/admin-api/v1/members/:mid` | admin | — |
| GET | `/admin-api/v1/projects/:pid/tokens` | admin | — |
| POST | `/admin-api/v1/projects/:pid/tokens` | admin | `{ member_id, name, expires_at? }` → **`{ token: "<plaintext>", id, ... }` once** |
| DELETE | `/admin-api/v1/tokens/:tid` | admin | — |
| GET | `/admin-api/v1/projects/:pid/audit` | admin | `?from&to&user&tool&cursor&limit` |
| GET | `/admin-api/v1/projects/:pid/stats` | admin | `?window=7d\|30d\|90d` |

**Dependency:** EPIC-003 must reach 🟢 (schema exists) before this Epic starts implementation.

## 5. Acceptance Criteria

```gherkin
Feature: Admin API

  Scenario: Non-admin rejected
    Given a user JWT (role=user)
    When calling GET /admin-api/v1/projects
    Then status is 403

  Scenario: Create project + first token
    Given an admin JWT
    When POST /admin-api/v1/projects { name: "ClearGate Core" }
    And POST /admin-api/v1/projects/:pid/tokens { member_id, name: "vibe-coder-1" }
    Then second response body includes { token, id }
    And subsequent GET /tokens lists only the id + name + created_at (no token plaintext)

  Scenario: Revoke propagates immediately
    Given an active token T
    When DELETE /admin-api/v1/tokens/T
    Then T in Redis revocation set
    And any MCP call using T returns 401 within 1 second

  Scenario: Audit query with filters
    Given 100 audit rows across 7 days
    When GET /admin-api/v1/projects/:pid/audit?from=<d1>&to=<d2>&tool=push_item&limit=20
    Then response contains at most 20 rows in the range matching tool
    And a next_cursor is returned if more exist

  Scenario: Stats window
    Given audit rows in the last 30 days
    When GET /admin-api/v1/projects/:pid/stats?window=30d
    Then response contains requests_per_day (30 items), error_rate, top_items (10)

  Scenario: Cross-project isolation
    Given admin A owns project P
    And admin B owns project Q (A does not own Q)
    When A calls GET /admin-api/v1/projects/Q/audit
    Then status is 403
```

## 6. AI Interrogation Loop — RESOLVED

All 7 questions resolved 2026-04-17 by Vibe Coder (accept all recommendations).

1. **Admin JWT issuance** — **Resolved:** single admin JWT works for both UI sessions and CLI. CLI gets it from a "copy admin token" button in the UI. Simpler than a separate CLI login flow.
2. **Token plaintext display UX** — **Resolved:** API returns plaintext in response body; UI handles the modal with "I've saved it" gate. API concern ends at plaintext-once.
3. **Audit pagination** — **Resolved:** cursor-based (timestamp + id). Stable across inserts, no duplicates, scales.
4. **Stats aggregation** — **Resolved:** live query in v1 (simplicity). Precompute only if p95 breaches 500ms in prod.
5. **Member role change** — **Resolved:** immutable in v1. Delete + re-invite to change role. Simpler audit semantics.
6. **Deleting a project** — **Resolved:** soft-delete via `deleted_at` column; all child queries filter `WHERE deleted_at IS NULL`. Hard-delete after 30-day grace period via a separate admin command.
7. **OpenAPI spec** — **Resolved:** generate from Zod schemas via `zod-to-openapi`. Serve at `/admin-api/v1/openapi.json`. Admin UI and CLI consume it for typed clients.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)

**Current Status: 🟢 Low Ambiguity — READY (pending EPIC-003 🟢)**

Gate requirements:
- [x] PROPOSAL-003 has `approved: true`
- [x] `<agent_context>` block complete
- [x] §6 AI Interrogation Loop resolved
- [x] OpenAPI generation approach locked (`zod-to-openapi`)
- [ ] EPIC-003 reached 🟢 and schema implemented (implementation-time dependency)
