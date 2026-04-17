---
story_id: "STORY-006-09"
parent_epic_ref: "EPIC-006"
status: "Draft"
ambiguity: "🟢 Low"
complexity_label: "L1"
context_source: "PROPOSAL-003_MCP_Adapter.md"
created_at: "2026-04-17T00:00:00Z"
updated_at: "2026-04-17T00:00:00Z"
created_at_version: "strategy-phase-pre-init"
updated_at_version: "strategy-phase-pre-init"
depends_on: ["STORY-006-02"]
---

# STORY-006-09: Settings Page (Root Admin Only)

**Complexity:** L1.

## 1. The Spec
`/settings` — root-only. Manage `admin_users` (add/remove by GitHub handle, toggle `is_root`). Non-root admin sees 403.

## 2. Acceptance
```gherkin
Scenario: Root can manage admins
  Given is_root=true
  When I add a new admin by GH handle
  Then admin_users row inserted and they can now log in

Scenario: Non-root 403
  Given is_root=false
  When I visit /settings
  Then status 403 with friendly message
```

## 3. Implementation
- `admin/src/routes/settings/+page.svelte`

## Ambiguity Gate
🟢.
