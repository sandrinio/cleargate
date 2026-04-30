---
story_id: STORY-005-03
parent_epic_ref: EPIC-005
parent_cleargate_id: "EPIC-005"
sprint_cleargate_id: "SPRINT-03"
status: Completed
ambiguity: 🟢 Low
complexity_label: L1
context_source: PROPOSAL-003_MCP_Adapter.md
sprint_id: SPRINT-03
shipped_commit: fb7be36
completed_at: 2026-04-18T11:30:00Z
created_at: 2026-04-17T00:00:00Z
updated_at: 2026-04-18T18:00:00Z
created_at_version: strategy-phase-pre-init
updated_at_version: strategy-phase-pre-init
depends_on:
  - STORY-004-04
approved: true
pushed_by: sandrinio@github.local
pushed_at: 2026-04-20T19:43:59.283Z
push_version: 3
---

# STORY-005-03: `cleargate-admin issue-token`

**Complexity:** L1.

## 1. The Spec
Calls `POST /projects/:pid/tokens`; prints plaintext token with a prominent "save now, never shown again" warning.

### Args
`--project`, `--member-id`, `--name`

## 2. Acceptance
```gherkin
Scenario: Issue
  When cleargate-admin issue-token --project <id> --member-id <mid> --name "bot"
  Then stdout contains plaintext token + warning
```

## 3. Implementation
- `mcp/scripts/commands/issue-token.ts`

## Ambiguity Gate
🟢.
