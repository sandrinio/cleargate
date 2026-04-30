---
story_id: STORY-006-02
parent_epic_ref: EPIC-006
parent_cleargate_id: "EPIC-006"
sprint_cleargate_id: "SPRINT-04"
status: Draft
ambiguity: 🟢 Low
complexity_label: L3
context_source: PROPOSAL-003_MCP_Adapter.md, EPIC-006 §6.3-6.4, design-guide.md
design_guide_ref: ../../knowledge/design-guide.md
sprint_id: SPRINT-04
created_at: 2026-04-17T00:00:00Z
updated_at: 2026-04-18T18:00:00Z
created_at_version: strategy-phase-pre-init
updated_at_version: strategy-phase-pre-init
depends_on:
  - STORY-006-01
  - STORY-004-08
blocks:
  - STORY-006-03
  - STORY-006-04
  - STORY-006-05
  - STORY-006-06
  - STORY-006-07
  - STORY-006-08
  - STORY-006-09
approved: true
pushed_by: sandrinio@github.local
pushed_at: 2026-04-20T19:45:50.317Z
push_version: 2
---

# STORY-006-02: GitHub OAuth + Redis Session + Typed MCP Client

**Complexity:** L3 — custom Redis adapter for `@auth/sveltekit`, session-cookie contract with the MCP-side exchange route, exchange-on-401 retry middleware inside the typed MCP client, CORS coordination, and the `/login` page. Touches server + client boundaries and owns the cookie/key shapes that STORY-004-08 reads.

## 1. The Spec

Wire GitHub OAuth as the only login path. `@auth/sveltekit` with a custom **Redis session adapter** (shared Redis with MCP — same `REDIS_URL`). On successful OAuth, write a session record to Redis at `cg_session:<cookie_value>` and set the `cg_session` cookie. The UI then calls `POST /admin-api/v1/auth/exchange` (STORY-004-08) which returns a short-lived admin JWT; subsequent admin-API calls attach it as `Authorization: Bearer <jwt>`. On 401, the typed MCP client silently re-calls `/auth/exchange` once and retries; on still-401 or 403, clears session + redirects to `/login`.

### Detailed Requirements

**OAuth flow**
- Provider: GitHub, scope `read:user`. App credentials via `GITHUB_WEB_CLIENT_ID` + `GITHUB_WEB_CLIENT_SECRET` env vars (the **web** OAuth app; the CLI device app is a separate registration owned by STORY-005-06).
- Callback: `/auth/callback/github` on `admin.cleargate.<domain>` (configured at the GitHub app registration).
- Post-OAuth handler: (a) resolve GitHub `login` (handle) + `id`, (b) look up `admin_users` via the MCP admin API (a new read-only helper route *or* via the exchange route's 403 response — see §5 Q1), (c) on authorized: write session; on not-authorized: redirect to `/login?error=not_authorized`. **Do not set the session cookie on the unauthorized path.**

**Session record (Redis)**
- Key: `cg_session:<cookie_value>` where `<cookie_value>` is a 32-byte random URL-safe string generated server-side.
- Value: JSON `{ github_handle, github_user_id, avatar_url, expires_at, issued_at }`. `expires_at` = 7 days.
- TTL: Redis-side TTL matching `expires_at`. Sliding renewal: STORY-004-08's exchange route bumps TTL by 15 minutes on each call (sliding-session). On idle > 7 days the session auto-expires.
- **Key-namespace check:** the architect's M2 plan greps existing Redis prefixes (`rev:*`, `rl:*`, `idem:*`, `member_invite:*` — the last will be zero after STORY-004-07) and confirms `cg_session:*` is unused.

**Cookie contract**
- Name: `cg_session` (STORY-004-08 reads this name). HttpOnly, Secure, SameSite=Lax, Path=`/`, Domain inferred (no explicit domain — keeps localhost dev working).
- Max-Age matches `expires_at`.

**Typed MCP client (`admin/src/lib/mcp-client.ts`)**
- Base URL: `PUBLIC_MCP_URL` env (build-time).
- Auth state: cached admin JWT in a Svelte store `authToken` — initialized to `null`, populated on first exchange call.
- Exchange call: `POST ${PUBLIC_MCP_URL}/admin-api/v1/auth/exchange` with `credentials: "include"` (browser attaches `cg_session` cookie cross-origin). On 401 or 403 → throw typed `AuthError`, caller redirects to `/login`.
- Request wrapper `callAdmin<T>(path, init)`:
  1. Attach `Authorization: Bearer ${authToken}` if present.
  2. On 401: call exchange once, retry original request once. If second attempt still 401 → throw `AuthError`, caller redirects.
  3. On 403: throw `ForbiddenError` — UI shows inline banner ("your session lost admin access").
  4. On network error: throw `NetworkError` with retry-after hint.
- Proactive refresh: on each successful exchange, read `expires_at` from the response; set a `setTimeout` to refresh 2 minutes before expiry. Clear timer on logout / page unload.
- Typed request/response schemas imported from `@cleargate/cli`'s admin-api client module (workspace dep — reuse the snapshot-drift-tested Zod schemas from SPRINT-03 M3).

**CORS (MCP-side)**
- `@fastify/cors` registered on `/admin-api/v1/*`. Origin allowlist from `CLEARGATE_ADMIN_ORIGIN` (single string or comma-separated). Credentials: `true` (required for cookie-bearing exchange). Allowed headers: `Authorization, Content-Type`. Allowed methods: `GET, POST, PUT, PATCH, DELETE, OPTIONS`.
- **Decision point:** CORS plumbing ships here *if* STORY-004-08 landed without it. If STORY-004-08 included it (architect M1 folded it into the exchange-route setup), this story verifies and extends. Grep `mcp/src/admin-api/index.ts` at M2 plan time.

**`/login` page**
- Single page, no shell (or minimal shell). Centered card: ClearGate logo + "Sign in with GitHub" primary button (pill, terracotta primary per Design Guide §6.4). Below: 12 px muted text "ClearGate Admin is restricted to approved GitHub users."
- Reads `?error=not_authorized` and shows a toast ("Your GitHub account is not on the admin allowlist. Contact the root admin.").
- On successful OAuth round-trip, redirects to `/` and the shell takes over.

**`/logout` route**
- `POST /logout` (CSRF-protected via SameSite=Lax + origin check). Deletes `cg_session:<value>` from Redis, clears cookie, redirects to `/login`. UI wiring: avatar dropdown in the shell (placeholder added by STORY-006-01) gets a "Sign out" item in this story.

**Bootstrap path**
- The first admin must exist in `admin_users` before OAuth can work (catch-22 otherwise). STORY-003-11 (SPRINT-01) ships `scripts/bootstrap-admin.ts` which reads `CLEARGATE_ADMIN_BOOTSTRAP_GH_USER` and upserts an `admin_users` row with `is_root=true`. This story documents the bootstrap requirement in `admin/coolify/DEPLOYMENT.md` placeholder (STORY-006-10 completes it) and asserts in a Playwright E2E that a pre-seeded admin completes the OAuth round-trip.

## 2. Acceptance

```gherkin
Scenario: Admin bootstraps + completes first OAuth login
  Given admin_users has my github_handle with is_root=true (seeded via bootstrap-admin.ts)
  And GITHUB_WEB_CLIENT_ID + GITHUB_WEB_CLIENT_SECRET are set
  When I visit /login and complete the GitHub OAuth consent
  Then I land on / with a valid cg_session cookie
  And cg_session:<value> exists in Redis with TTL ~7 days
  And authToken in memory is a valid 15-min admin JWT
  And the top-bar avatar shows my GitHub avatar

Scenario: Non-admin GitHub user rejected at OAuth callback
  Given admin_users does NOT contain my github_handle
  When I attempt GitHub OAuth
  Then I land on /login?error=not_authorized
  And no cg_session cookie is set
  And no admin JWT is issued
  And a toast shows "not on the admin allowlist"

Scenario: Admin JWT expiry triggers silent re-exchange
  Given a valid cg_session cookie + an expired admin JWT (15 min past issuance)
  When the UI calls GET /admin-api/v1/projects
  Then the typed client receives 401 once
  And calls POST /admin-api/v1/auth/exchange successfully
  And retries the original request with a fresh JWT
  And the UI never sees the 401 (no redirect, no flash)

Scenario: Session expired → redirect to login
  Given cg_session cookie present but its Redis entry has been deleted
  When the UI calls any admin-api endpoint
  Then the typed client receives 401 on exchange
  And clears authToken + cookie
  And the UI redirects to /login?error=session_expired

Scenario: Logout clears both Redis and cookie
  Given an authenticated session
  When I click "Sign out"
  Then POST /logout returns 204
  And cg_session:<value> is absent from Redis
  And the cg_session cookie is cleared
  And I land on /login

Scenario: CORS allows the exchange call from admin origin only
  Given CLEARGATE_ADMIN_ORIGIN=https://admin.cleargate.soula.ge
  When the admin UI at that origin calls POST /admin-api/v1/auth/exchange with credentials
  Then the preflight passes and the call returns 200 with Access-Control-Allow-Credentials: true
  And a request from https://evil.example fails preflight (no Access-Control-Allow-Origin for that origin)

Scenario: No Redis-key collision with existing prefixes
  When I scan Redis keys after login
  Then `cg_session:*` does not overlap any `rev:*`, `rl:*`, `idem:*` keys

Scenario: Proactive refresh fires 2 minutes before expiry
  Given an admin JWT with expires_at = now + 15 min
  When 13 minutes pass
  Then the typed client calls POST /auth/exchange
  And authToken is replaced before any UI request hits 401
```

## 3. Implementation

**Admin app**
- `admin/src/hooks.server.ts` — mount `@auth/sveltekit` with GitHub provider, wire custom Redis adapter, add request hook that reads `cg_session` + resolves session for SSR.
- `admin/src/lib/auth/redis-adapter.ts` — ioredis wrapper implementing `get`, `set` (with TTL), `delete` against `cg_session:*` keys.
- `admin/src/lib/auth/callback.ts` — post-OAuth logic: GitHub handle resolution + admin_users check (via exchange-route 403 signal — see §5 Q1).
- `admin/src/lib/mcp-client.ts` — typed fetch wrapper, exchange-on-401 retry, proactive refresh timer, typed error classes (`AuthError`, `ForbiddenError`, `NetworkError`).
- `admin/src/lib/stores/auth.ts` — `authToken`, `sessionUser` (avatar/handle) Svelte stores.
- `admin/src/routes/login/+page.svelte` — login card.
- `admin/src/routes/login/+page.server.ts` — reads `?error` query param.
- `admin/src/routes/logout/+server.ts` — POST handler.
- `admin/src/routes/auth/callback/github/+server.ts` — OAuth callback.
- Update `admin/src/routes/+layout.svelte` (from STORY-006-01) — avatar dropdown "Sign out" item wired.

**MCP app** (extend STORY-004-08 output)
- `mcp/src/admin-api/cors.ts` — `@fastify/cors` registration with origin allowlist from `CLEARGATE_ADMIN_ORIGIN`. If 004-08 already shipped this, extend the allowlist logic to support comma-separated multi-origin.

**Tests**
- `admin/tests/auth/redis-adapter.test.ts` — vitest + ioredis-mock covering set/get/delete with TTL.
- `admin/tests/auth/mcp-client.test.ts` — fetch-mocked matrix: happy path · 401 retry · 401 twice → AuthError · 403 → ForbiddenError · network error · proactive refresh timer fires.
- `admin/tests/e2e/oauth-happy-path.spec.ts` — Playwright; uses a MSW-style GitHub OAuth stub + real MCP against docker-compose Postgres 18 + Redis 8.
- `admin/tests/e2e/oauth-rejected.spec.ts` — non-admin GitHub user → `/login?error=not_authorized`.

## 4. Quality Gates

- All nine scenarios above pass. Playwright E2E runs against a docker-composed MCP; no mocks in the E2E tier.
- **No plaintext secrets in logs**: pino + Playwright stdout capture assertions — neither the admin JWT nor the session cookie value appears in captured output.
- **No localStorage/sessionStorage writes** for JWT: `window.localStorage` + `.sessionStorage` are empty after login (regression gate for STORY-006-05).
- **CORS regression**: MCP integration test adds a wrong-origin preflight asserting 403/blocked.
- **Typecheck + svelte-check**: zero errors/warnings.
- **Bundle budget**: exchange-on-401 logic + auth stores ≤ 5 KB gzipped delta on main chunk.

## 5. Open questions

1. **admin_users lookup strategy.** Two options:
   - (a) Add a read-only `GET /admin-api/v1/admin-users/me?handle=<h>` helper route (small MCP addition — could land in STORY-006-09's full-stack story).
   - (b) Rely on STORY-004-08's exchange route returning 403 for unknown handles — the login callback tentatively writes the session then immediately tries exchange; on 403, deletes the session and redirects.
   Default pick: **(b)** — simpler, reuses existing surface, matches the "single gate" principle. Architect M2 confirms.
2. **Session expiry vs. JWT expiry mismatch.** Session TTL 7d; JWT TTL 15min. Sliding-session bumps on each exchange. If the admin leaves the tab open 8 days without interaction, the session expires mid-use. Acceptable for v1 (forces a re-login); note in README.
3. **CORS multi-origin support.** Prod will have one origin (`admin.cleargate.<domain>`); dev wants `http://localhost:5173`. Comma-separate `CLEARGATE_ADMIN_ORIGIN` and trim each entry. Architect confirms at M2.

## Ambiguity Gate

🟢 — EPIC-006 §§6.3–6.4 locked the session + JWT contract; STORY-004-08 owns the exchange side; STORY-006-01 ships the shell/login-card stub. Only admin_users lookup path (Q1) is open; default answer is the safer choice.
