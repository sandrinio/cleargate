---
story_id: "STORY-006-05"
parent_epic_ref: "EPIC-006"
status: "Draft"
ambiguity: "🟢 Low"
complexity_label: "L2"
context_source: "PROPOSAL-003_MCP_Adapter.md"
created_at: "2026-04-17T00:00:00Z"
updated_at: "2026-04-17T00:00:00Z"
created_at_version: "strategy-phase-pre-init"
updated_at_version: "strategy-phase-pre-init"
depends_on: ["STORY-004-04", "STORY-006-02"]
---

# STORY-006-05: Tokens Page + One-Time-Display Modal

**Complexity:** L2.

## 1. The Spec
`/projects/[id]/tokens` lists tokens (id, name, last_used_at, expires_at) and provides issue form. On issue: modal shows plaintext token; "I've saved it" checkbox required before close; `beforeunload` warns on navigation.

## 2. Acceptance
```gherkin
Scenario: Issue modal
  When I click Issue, submit name
  Then modal shows plaintext token
  And Close button is disabled until "I've saved it" is ticked

Scenario: Modal closed without tick
  Given modal open with plaintext
  When user attempts to navigate away
  Then browser confirms navigation
```

## 3. Implementation
- `admin/src/routes/projects/[id]/tokens/+page.svelte`
- `admin/src/lib/components/TokenModal.svelte`

## Ambiguity Gate
🟢.
