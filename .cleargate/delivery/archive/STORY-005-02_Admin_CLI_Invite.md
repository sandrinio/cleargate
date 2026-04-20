---
story_id: STORY-005-02
parent_epic_ref: EPIC-005
status: Completed
ambiguity: 🟢 Low
complexity_label: L1
context_source: PROPOSAL-003_MCP_Adapter.md
sprint_id: SPRINT-03
shipped_commit: a578d7f
completed_at: 2026-04-18T11:00:00Z
created_at: 2026-04-17T00:00:00Z
updated_at: 2026-04-18T18:00:00Z
created_at_version: strategy-phase-pre-init
updated_at_version: strategy-phase-pre-init
depends_on:
  - STORY-004-03
approved: true
pushed_by: sandrinio@github.local
pushed_at: 2026-04-20T19:43:12.482Z
push_version: 3
---

# STORY-005-02: `cleargate-admin invite`

**Complexity:** L1.

## 1. The Spec
Calls `POST /projects/:pid/members`; prints the invite URL.

### Args
`--project`, `--email`, `--role` (default: user), `--display-name?`

## 2. Acceptance
```gherkin
Scenario: Invite
  When cleargate-admin invite --project <id> --email v@e.com --role user
  Then stdout contains the invite URL
```

## 3. Implementation
- `mcp/scripts/commands/invite.ts`

## Ambiguity Gate
🟢.
