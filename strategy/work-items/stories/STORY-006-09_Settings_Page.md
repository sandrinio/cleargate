---
story_id: "STORY-006-09"
parent_epic_ref: "EPIC-006"
status: "Draft"
ambiguity: "🟢 Low"
complexity_label: "L2"
context_source: "PROPOSAL-003_MCP_Adapter.md, EPIC-006, EPIC-003 (admin_users schema), STORY-003-11 (bootstrap)"
design_guide_ref: "../../knowledge/design-guide.md"
sprint_id: "SPRINT-04"
created_at: "2026-04-17T00:00:00Z"
updated_at: "2026-04-18T18:00:00Z"
created_at_version: "strategy-phase-pre-init"
updated_at_version: "strategy-phase-pre-init"
depends_on: ["STORY-006-02"]
---

# STORY-006-09: Settings Page (Root-Only Admin User Management)

**Complexity:** L2. **Full-stack story** — ships both the MCP admin-API endpoints for `admin_users` CRUD (gap in SPRINT-02's EPIC-004 decomposition) AND the `/settings` UI. Mirrors the STORY-005-06 pattern where the CLI story owned its backing endpoints.

## 1. The Spec

`/settings` — root-only page to manage the `admin_users` table. List current admins; add a new admin by GitHub handle; toggle `is_root` on any admin; disable/enable an admin (soft-delete via `disabled_at`). Non-root admins who navigate to `/settings` see a 403 page.

### MCP-side endpoints (new this sprint)

The EPIC-004 decomposition (STORY-004-01..07 + STORY-004-08 from SPRINT-03/04) did not include admin-users CRUD. Ship the missing routes here, under `/admin-api/v1/admin-users/*`, gated by the existing admin-JWT middleware (STORY-004-01) **plus** a new `is_root`-required sub-middleware for mutating actions.

**Routes** (v1, minimal):

- `GET /admin-api/v1/admin-users` — list all admin_users rows. Any admin can read.
  ```ts
  Array<{ id, github_handle, github_user_id, is_root, disabled_at, created_at, created_by }>
  ```
- `POST /admin-api/v1/admin-users` — **root-only**. Body `{ github_handle, is_root }`. Resolves `github_user_id` by calling `https://api.github.com/users/:handle` (no auth required; rate-limited). On success: inserts row, writes audit with `tool_name="admin_users.create"`.
- `PATCH /admin-api/v1/admin-users/:id` — **root-only**. Body `{ is_root?, disabled_at? }`. Audit `tool_name="admin_users.update"`.
- `DELETE /admin-api/v1/admin-users/:id` — **root-only**. Soft-delete = sets `disabled_at` (MCP policy: never hard-delete admin rows; preserves audit context). Idempotent. Audit `tool_name="admin_users.disable"`.

**Invariants**:
- Cannot disable or demote yourself. (Prevents lockout.) Return 400 `self_modification_forbidden`.
- At least one `is_root=true AND disabled_at IS NULL` row must remain. Any PATCH or DELETE that would violate this returns 400 `last_root_protection`.
- `github_handle` is unique (DB constraint); duplicates return 409.
- GitHub handle resolution: if GitHub `GET /users/:handle` returns 404, return 422 `github_user_not_found` and do not create the row.

### Admin UI — `/settings`

- Page gated: SSR load calls `GET /admin-api/v1/admin-users`; on any response it reads `sessionUser.is_root` (from STORY-006-02's session store). Non-root → render "Root admin required" banner with Home link. Do not 302-redirect; SSR renders the 403 page directly so shareable URL still works.
- Table (Design Guide §6.7) with columns: `Avatar + Handle` · `Role` (Root / Admin pill) · `Status` (Active / Disabled pill) · `Added by` · `Added at` · actions.
- Actions per row (root only):
  - `Toggle root` — confirm dialog "Grant root privileges to <handle>?" / "Revoke root from <handle>?"
  - `Disable` / `Enable` — confirm dialog.
  - Both disabled when targeting self (grayed out with tooltip "You can't modify your own admin row").
- Add-admin CTA opens a form modal: input `github_handle` + checkbox `is_root`. Validates handle format (GitHub handles: `[a-zA-Z0-9-]{1,39}`) client-side, then POST.
- Empty state: impossible (self is always a row), but defensive: "No admins yet — something is wrong" + link to docs.

### Data shapes

Consumed as above; no new DB schema (table already exists via STORY-003-01 + STORY-003-11).

## 2. Acceptance

```gherkin
Scenario: Root admin lists admins
  Given my admin_users row has is_root=true
  And the table has 3 admin_users rows
  When I visit /settings
  Then the table renders 3 rows with handle + role + status

Scenario: Non-root admin sees 403 page
  Given my admin_users row has is_root=false
  When I visit /settings
  Then a 403 page renders with "Root admin required"
  And the /settings route returns HTTP 403 (SSR)
  And no admin_users list is leaked in the response

Scenario: Root adds an admin
  Given I am root and the GitHub user "alice" exists
  When I click Add admin, enter "alice", uncheck is_root, submit
  Then POST /admin-api/v1/admin-users is called with { github_handle: "alice", is_root: false }
  And the server resolves alice's github_user_id via GitHub API
  And a new row appears in the list
  And an audit row with tool_name="admin_users.create" is written

Scenario: GitHub user not found
  When I try to add a handle "definitely-not-a-real-user-xyz"
  Then the modal shows an inline error "GitHub user not found"
  And no row is created

Scenario: Duplicate handle
  When I try to add a handle already in admin_users
  Then the modal shows "Already an admin"
  And no duplicate row is created

Scenario: Toggle root
  Given alice is is_root=false
  When I click "Grant root" on her row, confirm
  Then PATCH /admin-api/v1/admin-users/:aliceId with { is_root: true }
  And her row pill updates to "Root"

Scenario: Cannot demote self
  Given I am the only is_root=true admin
  And I try to toggle my own is_root off
  Then the action is disabled in the UI (grayed with tooltip)
  And the API would return 400 last_root_protection if called

Scenario: Cannot disable self
  When I click Disable on my own row
  Then the action is disabled in the UI
  And the API returns 400 self_modification_forbidden if forced

Scenario: Last-root protection
  Given I am the only is_root=true admin
  And no other is_root candidates exist
  When I attempt to demote or disable via the API directly
  Then the server returns 400 last_root_protection

Scenario: Disable admin
  Given alice is active
  When I click Disable on alice, confirm
  Then DELETE /admin-api/v1/admin-users/:aliceId returns 200
  And alice's status pill flips to "Disabled"
  And alice can no longer log in via GitHub OAuth (/auth/exchange returns 403)

Scenario: Enable admin
  Given alice is disabled
  When I click Enable on alice, confirm
  Then PATCH with { disabled_at: null } is called
  And alice's status pill flips to "Active"

Scenario: Audit rows written for every mutation
  After a create/update/disable cycle
  Then audit_log contains three rows with tool_names in {admin_users.create, admin_users.update, admin_users.disable}

Scenario: Handle validation
  When I submit a handle with invalid characters
  Then inline "Invalid GitHub handle" error shows
  And POST is not called
```

## 3. Implementation

**MCP**
- `mcp/src/admin-api/admin-users.ts` — 4 route handlers + `is_root` middleware wrapper.
- `mcp/src/admin-api/admin-users.test.ts` — integration tests against real Postgres 18 matrix: create/list/patch/delete, last-root protection, self-modification guard, duplicate handle, GitHub-404 path (mock GitHub API call).
- Register routes in `mcp/src/admin-api/index.ts`.
- Response schemas + snapshot-drift test extension (`cleargate-cli/src/admin-api/__tests__/snapshot-drift.test.ts`).
- Optional helper: `mcp/src/github/resolve-user.ts` — fetch-based helper for GitHub handle → user_id resolution. Cache-free in v1; 5-minute Redis cache as v1.1.

**Admin UI**
- `admin/src/routes/settings/+page.server.ts` — SSR loads admin_users list; reads `locals.sessionUser.is_root`; returns 403 for non-root.
- `admin/src/routes/settings/+page.svelte` — table + CTAs. Uses existing `ConfirmDialog`, `StatusPill`, `Modal` primitives.
- `admin/src/lib/components/AddAdminModal.svelte` + unit test.
- `admin/src/lib/mcp-client.ts` — `listAdmins`, `addAdmin`, `updateAdmin`, `disableAdmin`, `enableAdmin`.

## 4. Quality Gates

- All thirteen acceptance scenarios pass (MCP integration + UI Playwright).
- Last-root protection covered by two tests: concurrent demotion of two roots → one succeeds, one 400s; self-demotion of sole root → 400.
- 403 page does not leak admin_users data in its SSR response body.
- Every mutation path writes an audit row; test explicitly verifies via `audit_log` query.
- GitHub API call is retried once on network error; second failure returns 503 `github_upstream_error`.
- Typed client snapshot-drift green.

## 5. Open questions

1. **GitHub user ID caching.** First lookup is synchronous; re-adding the same handle re-calls GitHub. Acceptable for a v1 low-frequency admin-management flow. Redis cache is a v1.1 optimization.
2. **Role naming clarity.** "Admin" vs "Root" — potentially confusing with EPIC-004's "admin" JWT role. Settle on pills: `Root` (full power) vs `Admin` (standard). Document in the page's helper text.
3. **Email for added admins.** No email notification when a new admin is added. Out of scope for v1; GitHub user can just log in. A transactional-email integration is v1.1+.

## Ambiguity Gate

🟢 — `admin_users` schema exists (STORY-003-01); bootstrap seeds the first root (STORY-003-11); the gap was just CRUD routes, which this story fills.
