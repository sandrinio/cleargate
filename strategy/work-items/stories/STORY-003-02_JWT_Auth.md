---
story_id: "STORY-003-02"
parent_epic_ref: "EPIC-003"
status: "Draft"
ambiguity: "🟢 Low"
complexity_label: "L3"
context_source: "PROPOSAL-003_MCP_Adapter.md"
created_at: "2026-04-17T00:00:00Z"
updated_at: "2026-04-17T00:00:00Z"
created_at_version: "strategy-phase-pre-init"
updated_at_version: "strategy-phase-pre-init"
---

# STORY-003-02: JWT Issue / Verify / Refresh

**Complexity:** L3 — auth is security-critical.

## 1. The Spec
Implement JWT issue + verify using `jose`. Refresh-token endpoint `POST /auth/refresh` exchanges a valid refresh token for a fresh 15-min access JWT. Refresh tokens rotate on use; old refresh tokens revoke.

### Detailed Requirements
- Access JWT contains: `sub`, `project_id`, `client_id`, `role`, `exp`, `iat`
- Access TTL: `ACCESS_TOKEN_TTL_SECONDS` (default 900)
- Refresh TTL: `REFRESH_TOKEN_TTL_DAYS` (default 90)
- Refresh rotation: exchanging R1 revokes R1, issues R2
- Revocation list: Redis set `revoked:<token_id>` with TTL = remaining life

## 2. Acceptance
```gherkin
Scenario: Refresh returns valid access token
  Given a non-expired refresh token
  When POST /auth/refresh with the refresh token
  Then response contains an access JWT with exp ~15 min from now
  And old refresh token is marked revoked in Redis

Scenario: Revoked token rejected
  When POST /auth/refresh with a revoked token
  Then status is 401

Scenario: Expired token rejected
  When POST /auth/refresh with an expired refresh token
  Then status is 401
```

## 3. Implementation
- `mcp/src/auth/jwt.ts` — `issueAccess`, `issueRefresh`, `verify`
- `mcp/src/auth/refresh-endpoint.ts` — Fastify route
- `mcp/src/auth/revocation.ts` — Redis-backed revocation

## 4. Quality Gates
- Unit: token roundtrip, expired handling, tampered signature rejected
- Integration: full refresh cycle against Redis

## Ambiguity Gate
🟢 — per EPIC-003 Q8/Q10.
