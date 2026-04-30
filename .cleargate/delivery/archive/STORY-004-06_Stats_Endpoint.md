---
story_id: STORY-004-06
parent_epic_ref: EPIC-004
parent_cleargate_id: "EPIC-004"
status: Abandoned
ambiguity: 🟢 Low
complexity_label: L2
context_source: PROPOSAL-003_MCP_Adapter.md
created_at: 2026-04-17T00:00:00Z
updated_at: 2026-04-17T00:00:00Z
created_at_version: strategy-phase-pre-init
updated_at_version: strategy-phase-pre-init
depends_on:
  - STORY-003-09
  - STORY-004-01
approved: true
pushed_by: sandrinio@github.local
pushed_at: 2026-04-20T19:45:23.295Z
push_version: 2
---

# STORY-004-06: Stats Endpoint

**Complexity:** L2.

## 1. The Spec
`GET /projects/:pid/stats?window=7d|30d|90d`. Live aggregation from `audit_log`:
- `requests_per_day: [{date, count}]`
- `error_rate: float`
- `top_items: [{cleargate_id, writes}]` (top 10 by write volume)

### Detailed Requirements
- Live query (no precomputed rollups in v1)
- p95 < 500ms for 90d window (index on `audit_log(project_id, timestamp DESC)`)

## 2. Acceptance
```gherkin
Scenario: 30-day window
  Given 30 days of audit rows
  When GET .../stats?window=30d
  Then response has 30 entries in requests_per_day + top_items (≤10) + error_rate
```

## 3. Implementation
- `mcp/src/admin-api/stats.ts`

## 4. Quality Gates
- Performance test: seed 10k rows, assert p95 < 500ms

## Ambiguity Gate
🟢.
