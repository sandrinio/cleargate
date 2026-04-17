---
story_id: "STORY-006-06"
parent_epic_ref: "EPIC-006"
status: "Draft"
ambiguity: "🟢 Low"
complexity_label: "L2"
context_source: "PROPOSAL-003_MCP_Adapter.md"
created_at: "2026-04-17T00:00:00Z"
updated_at: "2026-04-17T00:00:00Z"
created_at_version: "strategy-phase-pre-init"
updated_at_version: "strategy-phase-pre-init"
depends_on: ["STORY-003-05", "STORY-003-04"]
---

# STORY-006-06: Items Browser + Version History

**Complexity:** L2.

## 1. The Spec
`/projects/[id]/items` lists items (paginated, filterable by type). `/projects/[id]/items/[clid]` shows the item's current payload and version history (last 10) as a collapsible timeline.

## 2. Acceptance
```gherkin
Scenario: Browse
  Given 120 items
  When I open /projects/:pid/items
  Then paginated list with 50 per page + cursor "Next"

Scenario: View history
  When I open /projects/:pid/items/EPIC-042
  Then current payload + up to 10 versions shown in a timeline
```

## 3. Implementation
- `admin/src/routes/projects/[id]/items/+page.svelte`
- `admin/src/routes/projects/[id]/items/[clid]/+page.svelte`

## Ambiguity Gate
🟢.
