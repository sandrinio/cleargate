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
cites: []
cited_by: 
  - "[[EPIC-002]]"
status: "Completed"
remote_id: ""
raw_path: ".cleargate/delivery/archive/EPIC-004_Admin_API.md"
last_ingest: "2026-11-12T21:25:29.802Z"
last_ingest_commit: "2691d20a51eb6e8211a9ec862c0ec0ddf8c09601"
repo: "planning"
---

# EPIC-004: Admin API

**Status:** Completed · **Sprint:** none · **Gate:** not run

## Objective
Expose administrative endpoints from the MCP server that the SvelteKit Admin UI (EPIC-006) and cleargate-admin CLI (EPIC-005) consume. CRUD for projects, members, tokens; audit log query; basic stats. Gated by admin-scoped JWT (role=admin).

## Problem & Value
**Why are we doing this?**
The MCP stores projects/members/tokens/audit, but without an API to manage them, operations are SQL-only. The Admin UI (EPIC-006) and CLI (EPIC-005) both depend on this API to read and mutate administrative state.

[+372 bytes not shown — read .cleargate/delivery/archive/EPIC-004_Admin_API.md]

## Scope
**In:**
- [ ] Admin JWT middleware (verifies role=admin, attaches `admin_user_id`)
- [ ] Projects: `GET /admin-api/projects` (list), `POST /admin-api/projects` (create), `GET /:id`, `DELETE /:id`
- [ ] Members: `GET /admin-api/projects/:pid/members`, `POST` (invite), `DELETE /members/:mid`
- [ ]
**Out:**
- Admin UI itself (EPIC-006)
- Admin CLI (EPIC-005)
- GitHub OAuth flow (lives in EPIC-006 — UI-side)
- Bulk import/export (v1.1)
- Precomputed stats rollups (v1.1 optimization)

[+459 bytes not shown — read .cleargate/delivery/archive/EPIC-004_Admin_API.md]

## Architecture rules
- All /admin-api/* routes require a JWT with role=admin. Non-admin JWTs get 403.
- Token plaintext returned ONCE on issue; afterwards only the hash is stored and the ID + metadata are retrievable.
- Audit log read-only through this API — never mutable except by internal audit middleware.
- Rate-limit admin endpoints separately (30 req/min default per PROP-003).
- Cross-project isolation still applies — admins belong to all projects they own; responses are filtered by admin's project memberships.

## Decisions
All 7 questions resolved 2026-04-17 by Vibe Coder (accept all recommendations).

1. **Admin JWT issuance** — **Resolved:** single admin JWT works for both UI sessions and CLI. CLI gets it from a "copy admin token" button in the UI. Simpler than a separate CLI login flow.
2. **Token plaintext display UX** — **Resolved:** API returns plaintext in response body; UI handles the modal with "I've saved it" gate. API concern ends at plaintext-once.
3.

[+732 bytes not shown — read .cleargate/delivery/archive/EPIC-004_Admin_API.md]

<!-- BEGIN relations -->
## Relations
- Parent: none
- Children (9): [[STORY-004-01]], [[STORY-004-02]], [[STORY-004-03]], [[STORY-004-04]], [[STORY-004-05]], [[STORY-004-06]], [[STORY-004-07]], [[STORY-004-08]], [[STORY-004-09]]
- Cited by (1): [[EPIC-002]]
<!-- END relations -->
