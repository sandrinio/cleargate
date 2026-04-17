---
story_id: "STORY-006-04"
parent_epic_ref: "EPIC-006"
status: "Draft"
ambiguity: "🟢 Low"
complexity_label: "L2"
context_source: "PROPOSAL-003_MCP_Adapter.md"
created_at: "2026-04-17T00:00:00Z"
updated_at: "2026-04-17T00:00:00Z"
created_at_version: "strategy-phase-pre-init"
updated_at_version: "strategy-phase-pre-init"
depends_on: ["STORY-004-03", "STORY-006-02"]
---

# STORY-006-04: Project Detail + Members Page

**Complexity:** L2.

## 1. The Spec
`/projects/[id]` shows project overview (name, created_at, stats summary links). `/projects/[id]/members` lists members with invite and remove UI. Invite modal shows invite URL (copyable) on success.

## 2. Acceptance
```gherkin
Scenario: Invite flow
  When I fill invite form (email + role) and submit
  Then a modal shows the invite URL with "Copy" button

Scenario: Remove member
  When I click remove on a member and confirm
  Then the member disappears from the list
  And their tokens are revoked
```

## 3. Implementation
- `admin/src/routes/projects/[id]/+page.svelte`
- `admin/src/routes/projects/[id]/members/+page.svelte`

## Ambiguity Gate
🟢.
