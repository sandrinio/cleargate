---
type: sprint
id: "SPRINT-02"
parent: ""
children: []
status: "Completed"
remote_id: ""
raw_path: ".cleargate/delivery/archive/SPRINT-02_Admin_API.md"
last_ingest: "2026-08-30T22:18:10.906Z"
last_ingest_commit: "e2fef1f5c8d58f66c94aa3418a1150ece11573d2"
repo: "planning"
---

# SPRINT-02: Admin API

## Sprint Goal
Expose the admin-scoped REST surface on the MCP server — projects/members/tokens CRUD, audit log query, and stats — so that EPIC-005 (Admin CLI) and EPIC-006 (Admin UI) have a typed, OpenAPI-documented backend to build against.

## Consolidated Deliverables

- `STORY-004-01`: Admin JWT scope + middleware — ✅ Done 2026-04-17 (401 on bad token, 403+audit on wrong role, nullable `audit_log.project_id` migration, `dev-issue-token --role=admin`)
- `STORY-004-02`: Projects CRUD — ✅ Done 2026-04-17 (`GET/POST /projects`, `GET/DELETE /projects/:id`, soft-delete, 404-not-403 on non-owned, seed member row for creator)
- `STORY-004-03`: Members CRUD — ✅ Done 2026-04-17 (Redis-backed invite with 24h TTL; status=pending derived from `member_invite:<mid>` key; FK cascade on member delete)
- `STORY-004-04`: Tokens CRUD — ✅ Done 2026-04-17 (43-char base64url plaintext once, bcrypt-12 hash, `rev:token:<id>` Redis key with expiry-aware TTL, idempotent DELETE)
- `STORY-004-05`: Audit log query — ✅ Done 2026-04-17 (base64url JSON cursor `{ts,id}`, Postgres row-constructor tuple comparison, 200-row cap, 7-day default)
- `STORY-004-06`: Stats endpoint — ✅ Done 2026-04-17

[+7,675 bytes not shown — read .cleargate/delivery/archive/SPRINT-02_Admin_API.md]

## Blast radius
Affects: no parent/child refs declared in frontmatter
