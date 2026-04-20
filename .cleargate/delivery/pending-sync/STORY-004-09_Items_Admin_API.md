---
story_id: STORY-004-09
parent_epic_ref: EPIC-004
status: Ready
ambiguity: 🟢 Low
complexity_label: L1
context_source: ../archive/PROPOSAL-003_MCP_Adapter.md
actor: MCP server (admin-api)
created_at: 2026-04-20T06:15:00Z
updated_at: 2026-04-20T06:15:00Z
created_at_version: post-SPRINT-05
updated_at_version: post-SPRINT-05
stamp_error: no ledger rows for work_item_id STORY-004-09
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-04-20T07:56:48Z
  sessions: []
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-04-20T08:57:29Z
---

# STORY-004-09: Items Admin API — list + version history

**Complexity:** L1 — two read-only GET endpoints backed by existing `items` + `item_versions` tables; no new schema, no new auth shape. Unblocks STORY-006-06 (items browser UI).

## 1. The Spec

Surfaces two read-only endpoints under `/admin-api/v1/*` using existing JWT + rate-limit middleware.

### 1.1 `GET /admin-api/v1/projects/:project_id/items`

Paginated list of items in a project.

**Query params:**
- `cursor?: string` — opaque cursor; `null` on first page.
- `limit?: number` — default 50, max 200.
- `type?: "epic" | "story" | "cr" | "bug" | "proposal"` — optional type filter.

**Response (200):**
```json
{
  "items": [
    {
      "id": "<uuid>",
      "cleargate_id": "STORY-042-01",
      "type": "story",
      "title": "…",
      "status": "…",
      "remote_id": "LIN-1042" | null,
      "last_pushed_at": "2026-04-19T10:00:00Z" | null,
      "pushed_by_member_id": "<uuid>" | null,
      "version": 7,
      "updated_at": "2026-04-19T10:00:00Z"
    }
  ],
  "next_cursor": "<opaque>" | null
}
```

Order: `updated_at DESC`. Cursor encodes `{ updated_at, id }` as opaque base64; never expose offsets.

### 1.2 `GET /admin-api/v1/items/:cleargate_id/versions`

Version history for one item. Flat path (matches SPRINT-07 flat-DELETE convention).

**Query params:**
- `limit?: number` — default 10, max 50.

**Response (200):**
```json
{
  "versions": [
    {
      "version": 7,
      "pushed_by_member_id": "<uuid>" | null,
      "pushed_at": "2026-04-19T10:00:00Z",
      "status": "…",
      "diff_summary": "…" | null
    }
  ]
}
```

Order: `version DESC`.

### 1.3 Error cases

- `401` — no JWT / invalid JWT.
- `403` — JWT valid but caller not a member of the project (list) OR not a member of the item's project (versions).
- `404` — project or cleargate_id not found.
- `400` — invalid cursor / limit > max / invalid type.

## 2. The Truth

### 2.1 Acceptance Criteria

```gherkin
Feature: Items admin list + version history

  Scenario: List items paginated
    Given project P has 120 items
    When GET /admin-api/v1/projects/P/items?limit=50
    Then response has items.length = 50
    And response has next_cursor (non-null)
    And fetching with that cursor returns the next 50

  Scenario: List empty project
    Given project P has no items
    When GET /admin-api/v1/projects/P/items
    Then response has items.length = 0
    And next_cursor is null

  Scenario: Type filter
    When GET /admin-api/v1/projects/P/items?type=story
    Then response contains only items with type == "story"

  Scenario: Invalid limit
    When GET /admin-api/v1/projects/P/items?limit=500
    Then response is 400 with message "limit exceeds max 200"

  Scenario: Non-member 403
    Given caller's member_id is not in project P
    When GET /admin-api/v1/projects/P/items
    Then response is 403

  Scenario: List sorted by updated_at DESC
    Given P has 3 items with distinct updated_at
    When GET /admin-api/v1/projects/P/items
    Then items[0].updated_at > items[1].updated_at > items[2].updated_at

  Scenario: Version history for existing item
    Given STORY-042-01 has 7 versions
    When GET /admin-api/v1/items/STORY-042-01/versions
    Then response has versions.length = 7 (or limit if lower)
    And versions[0].version > versions[1].version

  Scenario: Version history default limit 10
    Given STORY-042-01 has 50 versions
    When GET /admin-api/v1/items/STORY-042-01/versions
    Then response has versions.length = 10

  Scenario: Version history cap at 50
    When GET /admin-api/v1/items/STORY-042-01/versions?limit=500
    Then response is 400

  Scenario: Version history unknown cleargate_id
    When GET /admin-api/v1/items/STORY-999-99/versions
    Then response is 404

  Scenario: Unauthenticated request
    Given no JWT provided
    When any endpoint is called
    Then response is 401
```

### 2.2 Verification Steps

- `rg "eyJ" <audit_log rows after a query>` returns 0 (tokens never logged).
- OpenAPI snapshot regenerated to include both new paths.

## 3. Implementation

**Files touched:**

- `mcp/src/admin-api/items.ts` — **new** — two route handlers + Zod request/response schemas.
- `mcp/src/admin-api/items.test.ts` — **new** — integration tests against real Postgres (no mocks; CLAUDE.md rule).
- `mcp/src/admin-api/index.ts` — **modified** — register the two new routes under `/admin-api/v1/*`.
- `mcp/src/admin-api/openapi.ts` — **modified** — add both paths + response schemas.
- `mcp/src/admin-api/openapi.test.ts` — **modified** — add both paths to the path-list assertion.
- `mcp/src/admin-api/__snapshots__/openapi.test.ts.snap` — **regenerated** via `--update-snapshots`.
- `cleargate-cli/src/admin-api/responses.ts` — **modified** — export `ItemSummarySchema`, `ItemVersionSchema`, `ItemsListResponseSchema`, `ItemVersionsResponseSchema` so the UI (STORY-006-06) can import them.
- `cleargate-cli/test/admin-api/snapshot-drift.test.ts` — **modified** — extend coverage to new schemas.

| Item | Value |
|---|---|
| Auth | Reuse EPIC-003 admin JWT middleware (same as other admin-api routes). |
| Rate limit | Reuse existing per-project read bucket. |
| Deps | None new. |
| DB queries | Raw SQL via existing `items` + `item_versions` tables; parameterized. |

## 4. Quality Gates

| Test Type | Min | Notes |
|---|---|---|
| Integration — list | 4 | Paginated / empty / type-filter / invalid-limit |
| Integration — versions | 3 | Default limit / cap enforcement / unknown CLID 404 |
| Integration — auth | 2 | 401 no-JWT / 403 non-member |
| OpenAPI snapshot | 1 | Regenerated clean |

### 4.2 Definition of Done

- [ ] `npm run typecheck` + `npm test` green in `mcp/`.
- [ ] `npm run typecheck` + `npm test` green in `cleargate-cli/`.
- [ ] OpenAPI snapshot regenerated + snapshot-drift test passes in both repos.
- [ ] `list_tools` / admin-api route listing includes both new paths.
- [ ] No tokens appear in logs (grep assertion in one test).

## Ambiguity Gate

🟢 — prerequisite for STORY-006-06; clear scope; no ambiguity. Authored inline by orchestrator 2026-04-20 after M4 architect flagged the missing endpoints.
