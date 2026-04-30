---
story_id: STORY-003-05
parent_epic_ref: EPIC-003
parent_cleargate_id: "EPIC-003"
status: Abandoned
ambiguity: 🟢 Low
complexity_label: L2
context_source: PROPOSAL-003_MCP_Adapter.md
created_at: 2026-04-17T00:00:00Z
updated_at: 2026-04-17T00:00:00Z
created_at_version: strategy-phase-pre-init
updated_at_version: strategy-phase-pre-init
approved: true
pushed_by: sandrinio@github.local
pushed_at: 2026-04-20T19:45:10.727Z
push_version: 2
---

# STORY-003-05: `list_items` Tool (Cursor Pagination)

**Complexity:** L2.

## 1. The Spec
Paginated list. Args: `type?` filter, `updated_since?` (ISO), `limit` (default 50, max 200), `cursor?`. Returns `{ items: [...], next_cursor }`.

### Detailed Requirements
- Cursor = base64 of `(updated_at, id)` of the last item returned
- Ordering: `updated_at DESC, id DESC` (stable)
- Scoped to JWT's `project_id`
- `type` filter uses `items.type`

## 2. Acceptance
```gherkin
Scenario: First page
  Given 120 items in project
  When list_items(limit=50)
  Then 50 returned, next_cursor present

Scenario: Follow cursor
  When list_items(limit=50, cursor=<prev>)
  Then next 50 returned without duplicates

Scenario: Filter by type
  Given mix of epic/story items
  When list_items(type="epic")
  Then only epic items returned
```

## 3. Implementation
- `mcp/src/tools/list-items.ts`
- `mcp/src/db/queries/list-items.ts` — keyset pagination

## 4. Quality Gates
- Integration: 200 items, walk all pages, assert no duplicates, no skips

## Ambiguity Gate
🟢.
