---
story_id: "STORY-006-07"
parent_epic_ref: "EPIC-006"
status: "Draft"
ambiguity: "🟢 Low"
complexity_label: "L2"
context_source: "PROPOSAL-003_MCP_Adapter.md"
created_at: "2026-04-17T00:00:00Z"
updated_at: "2026-04-17T00:00:00Z"
created_at_version: "strategy-phase-pre-init"
updated_at_version: "strategy-phase-pre-init"
depends_on: ["STORY-004-05", "STORY-006-02"]
---

# STORY-006-07: Audit Log Viewer

**Complexity:** L2.

## 1. The Spec
`/projects/[id]/audit` — date-range picker + user + tool filters. Cursor pagination. Rows show timestamp, actor, tool, target, result. Auto-refresh on filter change.

## 2. Acceptance
```gherkin
Scenario: Filter and paginate
  Given 500 audit rows in the last 30 days
  When I filter tool=push_item, from=7d ago
  Then rows match filters with cursor-based pagination
```

## 3. Implementation
- `admin/src/routes/projects/[id]/audit/+page.svelte`
- `admin/src/lib/components/DateRangePicker.svelte`

## Ambiguity Gate
🟢.
