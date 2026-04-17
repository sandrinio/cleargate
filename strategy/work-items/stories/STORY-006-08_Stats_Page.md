---
story_id: "STORY-006-08"
parent_epic_ref: "EPIC-006"
status: "Draft"
ambiguity: "🟢 Low"
complexity_label: "L2"
context_source: "PROPOSAL-003_MCP_Adapter.md"
created_at: "2026-04-17T00:00:00Z"
updated_at: "2026-04-17T00:00:00Z"
created_at_version: "strategy-phase-pre-init"
updated_at_version: "strategy-phase-pre-init"
depends_on: ["STORY-004-06", "STORY-006-02"]
---

# STORY-006-08: Stats Page (Chart.js)

**Complexity:** L2.

## 1. The Spec
`/projects/[id]/stats` — window selector (7d / 30d / 90d), renders a bar chart of requests/day + error rate + top items list using **Chart.js** (per EPIC-006 Q2 override).

## 2. Acceptance
```gherkin
Scenario: Render 30-day chart
  Given 30d of audit data
  When I open /projects/:pid/stats?window=30d
  Then Chart.js bar chart renders within 1s
  And error rate + top items list display
```

## 3. Implementation
- `admin/src/routes/projects/[id]/stats/+page.svelte`
- `admin/src/lib/components/RequestsChart.svelte` — Chart.js wrapper

## Ambiguity Gate
🟢.
