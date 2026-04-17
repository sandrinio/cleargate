---
story_id: "STORY-006-02"
parent_epic_ref: "EPIC-006"
status: "Draft"
ambiguity: "🟢 Low"
complexity_label: "L3"
context_source: "PROPOSAL-003_MCP_Adapter.md"
created_at: "2026-04-17T00:00:00Z"
updated_at: "2026-04-17T00:00:00Z"
created_at_version: "strategy-phase-pre-init"
updated_at_version: "strategy-phase-pre-init"
depends_on: ["STORY-006-01", "STORY-004-01"]
---

# STORY-006-02: GitHub OAuth + Redis Session

**Complexity:** L3 — custom session adapter.

## 1. The Spec
`@auth/sveltekit` with GitHub provider. Custom Redis adapter for session storage (shared Redis with MCP). After OAuth, exchange session cookie → admin JWT via MCP's `/admin-api/v1/auth/exchange`.

### Detailed Requirements
- Only whitelisted `admin_users.github_handle` can log in
- Session cookie: HttpOnly, Secure, SameSite=Lax
- Admin JWT cached in memory; silent refresh via middleware

## 2. Acceptance
```gherkin
Scenario: Allowed GH user logs in
  Given admin_users has my github_handle
  When I complete GH OAuth
  Then I land on / with a valid session + admin JWT

Scenario: Non-allowed user rejected
  When a non-whitelisted GH user attempts login
  Then /login shows "not authorized" and no session is created
```

## 3. Implementation
- `admin/src/hooks.server.ts`
- `admin/src/lib/auth/redis-adapter.ts`
- `admin/src/routes/login/+page.svelte`

## Ambiguity Gate
🟢.
