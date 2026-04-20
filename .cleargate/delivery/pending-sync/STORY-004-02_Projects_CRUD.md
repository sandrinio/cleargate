---
story_id: STORY-004-02
parent_epic_ref: EPIC-004
status: Draft
ambiguity: 🟢 Low
complexity_label: L2
context_source: PROPOSAL-003_MCP_Adapter.md
created_at: 2026-04-17T00:00:00Z
updated_at: 2026-04-17T00:00:00Z
created_at_version: strategy-phase-pre-init
updated_at_version: strategy-phase-pre-init
depends_on:
  - STORY-003-01
  - STORY-004-01
approved: true
pushed_by: sandrinio@github.local
pushed_at: 2026-04-20T19:45:44.516Z
push_version: 2
---

# STORY-004-02: Projects CRUD Endpoints

**Complexity:** L2.

## 1. The Spec
`/admin-api/v1/projects` routes: `GET` (list my projects), `POST` (create), `GET /:id` (detail), `DELETE /:id` (soft-delete via `deleted_at`).

### Detailed Requirements
- Each admin sees only projects they own (filter by `created_by`)
- Create: generates `project_id` UUID + creates initial `members` row for creator as user role
- Soft-delete only — data retained for 30-day grace

## 2. Acceptance
```gherkin
Scenario: Create and list
  When POST /admin-api/v1/projects {name:"X"} then GET /admin-api/v1/projects
  Then new project is in the list

Scenario: Soft-delete hides from list
  When DELETE /admin-api/v1/projects/:id then GET /admin-api/v1/projects
  Then project not listed but row exists with deleted_at set
```

## 3. Implementation
- `mcp/src/admin-api/projects.ts`

## Ambiguity Gate
🟢.
