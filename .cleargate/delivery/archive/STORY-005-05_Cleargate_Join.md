---
story_id: STORY-005-05
parent_epic_ref: EPIC-005
status: Completed
ambiguity: 🟢 Low
complexity_label: L2
context_source: PROPOSAL-003_MCP_Adapter.md
sprint_id: SPRINT-03
shipped_commit: 13460ed
completed_at: 2026-04-18T17:30:00Z
created_at: 2026-04-17T00:00:00Z
updated_at: 2026-04-18T18:00:00Z
created_at_version: strategy-phase-pre-init
updated_at_version: strategy-phase-pre-init
depends_on:
  - STORY-000-04
  - STORY-003-13
approved: true
pushed_by: sandrinio@github.local
pushed_at: 2026-04-20T19:44:15.038Z
push_version: 3
---

# STORY-005-05: `cleargate join <invite-url>`

**Complexity:** L2.

## 1. The Spec
Vibe Coder CLI. POSTs invite token to `/join/:invite_token`, receives refresh token, stores in keychain (file fallback). Prints confirmation with project name and machine label.

### Args
`<invite-url>`, `--profile` (default "default")

## 2. Acceptance
```gherkin
Scenario: Join
  Given a valid invite URL
  When cleargate join <url>
  Then a refresh token is saved under the active TokenStore (keychain or file)
  And stdout prints "joined project 'X' as 'machine-label'"

Scenario: Expired invite
  Given invite older than 24h
  When cleargate join <url>
  Then exit 3 with "invite expired"
```

## 3. Implementation
- `cleargate-cli/src/commands/join.ts`

## Ambiguity Gate
🟢.
