---
story_id: STORY-004-03
parent_epic_ref: EPIC-004
status: Abandoned
ambiguity: 🟢 Low
complexity_label: L2
context_source: PROPOSAL-003_MCP_Adapter.md
created_at: 2026-04-17T00:00:00Z
updated_at: 2026-04-17T00:00:00Z
created_at_version: strategy-phase-pre-init
updated_at_version: strategy-phase-pre-init
depends_on:
  - STORY-004-01
approved: true
pushed_by: sandrinio@github.local
pushed_at: 2026-04-20T19:45:29.172Z
push_version: 2
---

# STORY-004-03: Members CRUD Endpoints

**Complexity:** L2.

## 1. The Spec
`GET /projects/:pid/members`, `POST /projects/:pid/members` (invite), `DELETE /members/:mid`. Role immutable — no PATCH.

### Detailed Requirements
- Invite: body `{ email, role, display_name? }` — creates `members` row + an opaque invite token (UUID) with 24h TTL, returns invite URL
- Remove: deletes `members` + cascades tokens (revoked)

## 2. Acceptance
```gherkin
Scenario: Invite
  When POST /projects/:pid/members {email:"v@e.com",role:"user"}
  Then response contains invite URL
  And GET .../members lists the member (role=user, status=pending)

Scenario: Remove cascades
  Given a member with an active token
  When DELETE /members/:mid
  Then the member's tokens are revoked immediately
```

## 3. Implementation
- `mcp/src/admin-api/members.ts`

## Ambiguity Gate
🟢.
