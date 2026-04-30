---
story_id: STORY-011-02
parent_epic_ref: EPIC-011
parent_cleargate_id: EPIC-011
status: Completed
ambiguity: 🟢 Low
complexity_label: L2
context_source: ./EPIC-011_End_To_End_Production_Readiness.md
actor: CI pipeline / bot calling MCP with a plaintext service token
created_at: 2026-04-20T13:45:00Z
updated_at: 2026-04-20T13:45:00Z
created_at_version: post-SPRINT-06
updated_at_version: post-SPRINT-06
stamp_error: no ledger rows for work_item_id STORY-011-02
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-04-20T13:24:17Z
  sessions: []
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-04-20T13:45:01Z
approved: true
pushed_by: sandrinio@github.local
pushed_at: 2026-04-20T19:45:48.391Z
push_version: 3
---

# STORY-011-02: Service-token middleware — verify plaintext project tokens

**Complexity:** L2 — new Fastify preHandler middleware, no schema changes. Reuses existing `tokens` table + `bcrypt` dep + JwtService.

## 1. The Spec

### 1.1 User Story
As a CI pipeline or script that holds a plaintext project token issued from the Admin UI's "Issue token" modal, I want to call `/mcp` tool endpoints with `Authorization: Bearer <plaintext>` and have MCP verify the token by bcrypt-comparing against the stored hash, so that service-style auth works without needing a Keychain or refresh-token flow.

### 1.2 Detailed Requirements

- New middleware factory `buildServiceTokenAuth(jwt: JwtService, db: Database)` in `mcp/src/auth/service-token.ts`.
- The middleware:
  1. Reads `Authorization: Bearer <value>`; if missing, does NOT fail (it's a fallback, not primary).
  2. If the value has the shape of a JWT (three dot-separated parts, each base64url), skip — let the JWT path handle it.
  3. Otherwise, treat as plaintext candidate. SELECT all non-revoked, non-expired rows from `tokens` (small set — project-scoped). `bcrypt.compare(plaintext, row.token_hash)` for each; first match wins.
  4. On match: load the member (`SELECT * FROM members WHERE id = token.member_id`), construct an `AccessClaims`-shaped `request.claims = { sub: member.id, project_id: member.project_id, role: member.role, client_id: 'service-token', jti: token.id, exp: <now + 15m> }`, update `tokens.last_used_at = now()`, continue.
  5. On no match: do NOT fail here — the outer `require-auth` chain handles 401.
- Middleware chain order in `buildRequireAuth`: try JWT verify first; on failure, try service-token; on both failures, return 401. Existing tests for JWT-verify paths stay green.
- Service tokens NEVER log the plaintext or the hash. Pino redact config extended if needed (verify existing `authorization` header redact covers it; add `req.body.token` paths only if bodies are logged — they shouldn't be).
- The middleware is wired into the existing `/mcp` JSON-RPC endpoint registration in `mcp/src/mcp/transport.ts` (where `buildRequireAuth` is registered today).
- NOT wired into `/admin-api/v1/*` — admin routes stay JWT-only because admin role isn't expressible from a `tokens` row (tokens are member-scoped, not admin-scoped).

### 1.3 Out of Scope

Admin-api route coverage (tokens are member-scoped, not admin-scoped — mixing would require a schema change). Token-usage analytics beyond `last_used_at`. Revocation UX changes (Admin UI already has Revoke button from STORY-006-05).

## 2. The Truth

### 2.1 Acceptance Criteria

```gherkin
Feature: Service-token middleware on /mcp

  Scenario: Valid plaintext authenticates
    Given the Admin UI issued a project token and showed plaintext P
    When POST /mcp with Authorization: Bearer P and a tools/list JSON-RPC body
    Then the response is 200 with a valid tools/list payload
    And request.claims.sub equals the matched member's UUID
    And request.claims.project_id equals the matched member's project_id
    And request.claims.role equals the matched member's role (user|service)
    And tokens.last_used_at was updated

  Scenario: Revoked token is rejected
    Given a token whose revoked_at is non-NULL
    When POST /mcp with that plaintext
    Then the response is 401 with {"error": "invalid_token"}

  Scenario: Expired token is rejected
    Given a token whose expires_at is in the past
    When POST /mcp with that plaintext
    Then the response is 401 with {"error": "invalid_token"}

  Scenario: JWT path still works (no regression)
    Given a valid access JWT from /auth/refresh
    When POST /mcp with Authorization: Bearer <jwt>
    Then the response is 200 and request.claims.client_id is NOT 'service-token'

  Scenario: JWT-shaped-but-invalid falls through to service-token path
    Given a string that looks like a JWT but fails signature verification
    When POST /mcp with that Bearer
    Then the service-token path attempts bcrypt-compare (no match expected)
    And the final response is 401

  Scenario: Malformed Bearer rejected cleanly
    Given no Authorization header at all
    When POST /mcp
    Then the response is 401 with {"error": "missing_token"}

  Scenario: Tokens never appear in logs
    Given the test captures pino output via a Writable stream
    When POST /mcp with a canary plaintext Bearer
    Then the captured log output does NOT contain the plaintext
    And it does NOT contain any bcrypt hash starting with $2a$ or $2b$

  Scenario: bcrypt timing doesn't leak
    Given 100 concurrent calls with invalid plaintexts
    When they all complete
    Then all respond 401 within the same p99 bound (no obvious short-circuit timing difference between "no rows" and "rows but no match")
```

### 2.2 Verification Steps

- [ ] Live curl: issue a token via Admin UI, copy plaintext, `curl -H "Authorization: Bearer <plaintext>" -X POST http://localhost:3000/mcp -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'` → returns tools list.
- [ ] `rg "\$2[ab]\$" mcp/src/admin-api/tokens.ts mcp/src/auth/service-token.ts` returns only bcrypt.hash/compare invocations, no string literals.
- [ ] Live log grep during a test invocation returns zero plaintext matches.

## 3. Implementation

**Files touched:**

- `mcp/src/auth/service-token.ts` — **new** — `buildServiceTokenAuth(jwt, db)` preHandler factory. Helper `looksLikeJwt(s)` returns true for 3-part base64url. bcrypt-compare loop over non-revoked rows. Sets `request.claims` + updates `last_used_at`.
- `mcp/src/auth/service-token.test.ts` — **new** — integration tests against real Postgres (seeded member + token). All 8 Gherkin scenarios mapped. Includes pino capture test + 100-concurrent-invalid stress.
- `mcp/src/auth/middleware.ts` — **modified** — `buildRequireAuth` now accepts an optional service-token preHandler; on JWT verify failure, tries service-token before returning 401.
- `mcp/src/mcp/transport.ts` (or wherever `buildRequireAuth` is wired for `/mcp`) — **modified** — construct both middlewares, register the chain.
- `mcp/src/admin-api/tokens.ts` — **unchanged** — the POST handler already generates plaintext + stores hash; this story just reads them.

**Consumes:** `tokens` + `members` tables (existing). `bcrypt` npm dep (already pinned). `JwtService` + existing pino logger config.

## 4. Quality Gates

| Test Type | Min | Notes |
|---|---|---|
| Integration — happy path | 1 | Valid plaintext → claims populated |
| Integration — rejected cases | 3 | Revoked / expired / no-match |
| Integration — chain order | 2 | JWT path still works / JWT-shape fallthrough |
| Integration — logging | 1 | Pino capture + grep canary plaintext + bcrypt pattern |
| Integration — last_used_at | 1 | Updated on match |
| Unit — looksLikeJwt | 3 | 3-part / 2-part / empty |

### 4.2 Definition of Done

- [ ] `npm run typecheck` + `npm test` green in `mcp/`.
- [ ] Live curl against running MCP with a real Admin-UI-issued plaintext token returns a valid `tools/list` response.
- [ ] Pino captured-output grep asserts no plaintext leak AND no bcrypt-hash leak.
- [ ] Existing JWT-path tests (SPRINT-01 middleware tests) still pass unchanged.
- [ ] No new runtime deps.

## Ambiguity Gate

🟢 — scope is one new middleware file + one-line wiring + tests. bcrypt + tokens table + JwtService all exist. Middleware-chain ordering rule (JWT → service → 401) is clear from the Epic's architecture rule.
