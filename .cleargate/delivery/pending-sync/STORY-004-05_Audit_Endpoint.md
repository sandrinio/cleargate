---
story_id: "STORY-004-05"
parent_epic_ref: "EPIC-004"
status: "Draft"
ambiguity: "🟢 Low"
complexity_label: "L2"
context_source: "PROPOSAL-003_MCP_Adapter.md"
created_at: "2026-04-17T00:00:00Z"
updated_at: "2026-04-17T00:00:00Z"
created_at_version: "strategy-phase-pre-init"
updated_at_version: "strategy-phase-pre-init"
depends_on: ["STORY-003-09", "STORY-004-01"]
---

# STORY-004-05: Audit Log Query Endpoint

**Complexity:** L2.

## 1. The Spec
`GET /projects/:pid/audit?from&to&user&tool&cursor&limit`. Cursor pagination (timestamp + id). Results filtered by project + filters.

### Detailed Requirements
- Default window: last 7 days if `from` omitted
- Max `limit`: 200
- Cursor format: base64 of `(timestamp, id)` tuple
- Response: `{ rows: [...], next_cursor }`

## 2. Acceptance
```gherkin
Scenario: Paginate
  Given 500 audit rows in last 30 days
  When repeated GET with next_cursor until none
  Then all 500 rows returned with no dupes

Scenario: Filter by tool
  When GET .../audit?tool=push_item&limit=50
  Then all rows have tool=push_item
```

## 3. Implementation
- `mcp/src/admin-api/audit.ts`

## Ambiguity Gate
🟢.
