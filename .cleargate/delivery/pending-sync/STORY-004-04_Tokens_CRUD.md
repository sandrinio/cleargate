---
story_id: STORY-004-04
parent_epic_ref: EPIC-004
status: Draft
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
pushed_at: 2026-04-20T19:44:59.172Z
push_version: 2
---

# STORY-004-04: Tokens CRUD (One-Time-Display)

**Complexity:** L2.

## 1. The Spec
`GET /projects/:pid/tokens` (list by metadata), `POST /projects/:pid/tokens` (issue, plaintext returned once), `DELETE /tokens/:tid` (revoke).

### Detailed Requirements
- POST returns `{ id, name, token: "<plaintext>" }` exactly once; DB stores bcrypt hash + metadata
- GET never returns plaintext or hash — only id + name + created_at + expires_at + last_used_at
- DELETE adds to Redis revocation set with TTL = token remaining life

## 2. Acceptance
```gherkin
Scenario: Issue + list
  When POST .../tokens {member_id,name:"bot"}
  Then response has plaintext token
  And GET .../tokens shows the token by id+name but no plaintext

Scenario: Revoke propagates
  Given an active token T
  When DELETE /tokens/T
  Then any MCP call using T returns 401 within 1s
```

## 3. Implementation
- `mcp/src/admin-api/tokens.ts`

## Ambiguity Gate
🟢.
