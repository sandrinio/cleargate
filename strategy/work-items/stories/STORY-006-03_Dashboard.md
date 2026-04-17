---
story_id: "STORY-006-03"
parent_epic_ref: "EPIC-006"
status: "Draft"
ambiguity: "🟢 Low"
complexity_label: "L1"
context_source: "PROPOSAL-003_MCP_Adapter.md"
created_at: "2026-04-17T00:00:00Z"
updated_at: "2026-04-17T00:00:00Z"
created_at_version: "strategy-phase-pre-init"
updated_at_version: "strategy-phase-pre-init"
depends_on: ["STORY-006-02", "STORY-004-02"]
---

# STORY-006-03: Dashboard (Projects List)

**Complexity:** L1.

## 1. The Spec
`/` route: lists projects via `GET /admin-api/v1/projects`. Shows name, member count, last activity. "New project" CTA. Empty state: actionable message.

## 2. Acceptance
```gherkin
Scenario: List projects
  Given admin with 3 projects
  When I visit /
  Then 3 rows rendered with name + member count

Scenario: Empty state
  Given admin with no projects
  When I visit /
  Then actionable empty state with "Create your first project →"
```

## 3. Implementation
- `admin/src/routes/+page.svelte`
- `admin/src/lib/mcp-client.ts` — typed wrapper

## Ambiguity Gate
🟢.
