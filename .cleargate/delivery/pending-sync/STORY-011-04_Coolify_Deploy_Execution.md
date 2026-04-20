---
story_id: STORY-011-04
parent_epic_ref: EPIC-011
status: Ready
ambiguity: 🟢 Low
complexity_label: L2
context_source: ./EPIC-011_End_To_End_Production_Readiness.md
actor: Ops operator promoting ClearGate from localhost to public subdomains
created_at: 2026-04-20T13:58:00Z
updated_at: 2026-04-20T13:58:00Z
created_at_version: post-SPRINT-06
updated_at_version: post-SPRINT-06
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-04-20T13:31:51Z
stamp_error: no ledger rows for work_item_id STORY-011-04
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-04-20T13:31:41Z
  sessions: []
---

# STORY-011-04: Execute Coolify deploy of MCP + Admin behind TLS

**Complexity:** L2 — ops-heavy. Zero new code. All artifacts (Dockerfiles, runbooks, envs, bootstrap command from STORY-011-03) already exist. The "work" is: register two GitHub OAuth apps, push images, set envs, run bootstrap, verify E2E onboarding, and record observed time-to-deploy in both runbooks.

## 1. The Spec

### 1.1 User Story
As the Ops operator who owns the production domain, I want to execute the already-written Coolify deploy runbooks for MCP and Admin, register the two production GitHub OAuth apps, and verify that a fresh user can onboard end-to-end from `npm install cleargate` to a successful `cleargate sync`, so that we can declare `v1-alpha` demonstrably shippable and move marketing / onboarding conversations out of localhost.

### 1.2 Detailed Requirements

- **GitHub OAuth app registration (production):**
  - **Web OAuth app** — Homepage: `https://admin.cleargate.<domain>`, Authorization callback: `https://admin.cleargate.<domain>/auth/callback/github`. Record the Client ID + Client Secret into Coolify's admin-service secret env.
  - **Device OAuth app** — Public client, no secret, device-flow enabled. Record the Client ID into Coolify's mcp-service env as `CLEARGATE_GITHUB_CLI_CLIENT_ID`.
  - Both apps' names include the string `(prod)` to distinguish from any local-dev apps.
- **Subdomain provisioning:**
  - DNS CNAME (or A-record) for `admin.cleargate.<domain>` → Coolify host.
  - DNS CNAME (or A-record) for `mcp.cleargate.<domain>` → Coolify host.
  - Both subdomains served by Coolify/Traefik with valid Let's Encrypt TLS certs.
- **Deploy order:** MCP first, verify `/health`, then Admin. Do NOT deploy Admin against a non-healthy MCP — the health check short-circuits and the OAuth exchange route will 502.
- **Env-var checklist** (from existing runbooks, treated as the contract):
  - MCP service gets all envs listed in `mcp/coolify/DEPLOYMENT.md` §2 (DATABASE_URL, REDIS_URL, JWT secrets, GitHub device client id, `CLEARGATE_ADMIN_ORIGIN=https://admin.cleargate.<domain>`).
  - Admin service gets all envs listed in `admin/coolify/DEPLOYMENT.md` §2 (`PUBLIC_MCP_URL=https://mcp.cleargate.<domain>`, REDIS_URL, AUTH_SECRET, web OAuth client + secret, `CLEARGATE_ADMIN_ORIGIN`, `SESSION_COOKIE_NAME`).
  - `CLEARGATE_DISABLE_AUTH` MUST NOT be set in either service.
- **First-root bootstrap:** after both services report healthy, run `cleargate admin bootstrap-root <owner-github-handle> --database-url <DATABASE_URL>` from the Coolify host (or any machine that can reach the MCP Postgres). Idempotent — safe to re-run if ambiguous.
- **End-to-end onboarding verification** (the success bar):
  1. Visit `https://admin.cleargate.<domain>` → redirects to `/login` → "Sign in with GitHub" → lands on dashboard.
  2. On the dashboard, create a demo project and invite a second test GitHub handle.
  3. On a clean laptop (no prior ClearGate state, no env vars): `npm install -D cleargate && npx cleargate init && npx cleargate join <invite-url> && npx cleargate sync --check` — all commands exit 0.
  4. MCP logs show exactly one `POST /auth/refresh` per CLI invocation (validates STORY-011-01 single-flight).
  5. Admin UI's tokens modal issues a plaintext project token; `curl -H "Authorization: Bearer <plaintext>" https://mcp.cleargate.<domain>/mcp -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'` returns a tools list (validates STORY-011-02 service-token middleware).
- **Time-to-deploy measurement:** start a stopwatch when clicking "Deploy" on the first Coolify app; stop when step 5 succeeds. Record the measured value in both `admin/coolify/DEPLOYMENT.md` §10 and `mcp/coolify/DEPLOYMENT.md` §10 (whichever section holds the retro table). Target: ≤ 30 minutes first-time, ≤ 10 minutes on re-deploy.
- **Runbook updates (committed artifact):**
  - Replace the "bootstrap admin" bullet in both runbooks' post-deploy checklist with the `cleargate admin bootstrap-root` line from STORY-011-03 (carries over any substitutions that STORY-011-03 left for this story).
  - Fill in §10 Retro / Time-to-Deploy table with operator name, ISO date, measured duration, and a one-paragraph "Issues encountered" note (or "none" if nothing deviated).
  - Add a single "Verified E2E onboarding on <date>" line referencing this story.

### 1.3 Out of Scope

Horizontal scaling (single-instance only in v1). Blue/green deploys. Coolify → k8s migration. Multi-region. Backup strategy (Postgres/Redis backups are a Coolify-admin concern, not an app concern). Any code changes to MCP or Admin — all fixes for deploy-blocking bugs are already in via the post-SPRINT-06 hotfixes. Non-production environment (staging). Password-manager / 1Password integration for the OAuth client secrets. Domain purchase.

## 2. The Truth

### 2.1 Acceptance Criteria

```gherkin
Feature: Coolify production deploy verified end-to-end

  Scenario: Both subdomains resolve with valid TLS
    Given DNS has propagated for admin.cleargate.<domain> and mcp.cleargate.<domain>
    When I curl https://admin.cleargate.<domain>/health and https://mcp.cleargate.<domain>/health
    Then both return HTTP 200 with {"status": "ok"}
    And both TLS certs are issued by Let's Encrypt and not expired

  Scenario: Admin UI OAuth web flow completes
    Given the production web OAuth app is registered and env-configured
    And my GitHub handle is in admin_users as root (via bootstrap-root)
    When I visit https://admin.cleargate.<domain>/login and click "Sign in with GitHub"
    Then GitHub redirects back to /auth/callback/github
    And I land on /projects (dashboard) with my handle in the top-right

  Scenario: CLI onboarding works end-to-end against production
    Given a brand-new laptop with no ClearGate state and CLEARGATE_MCP_TOKEN unset
    When I run `npm install -D cleargate && npx cleargate init && npx cleargate join <invite-url> && npx cleargate sync --check`
    Then every command exits 0
    And sync --check prints JSON with {"status": "ok", "pending": 0} or similar empty-state output
    And the macOS keychain holds a rotated refresh token

  Scenario: Service token authenticates CI-style calls
    Given an Admin UI-issued plaintext project token P
    When I curl -H "Authorization: Bearer P" -X POST https://mcp.cleargate.<domain>/mcp with a tools/list body
    Then MCP returns 200 with a valid tools/list payload

  Scenario: CLEARGATE_DISABLE_AUTH guard holds
    Given both production services are running
    When I inspect the running containers' environment
    Then CLEARGATE_DISABLE_AUTH is NOT set on either service

  Scenario: Both runbooks record the measured deploy time
    Given the deploy was executed and verified
    When I open admin/coolify/DEPLOYMENT.md and mcp/coolify/DEPLOYMENT.md
    Then §10 Retro table in each has operator name, ISO date, measured duration, and "Issues encountered" notes filled in (no "*(fill in after first deployment)*" placeholders remaining)
    And both files reference `cleargate admin bootstrap-root` (not `docker exec psql INSERT`)

  Scenario: Deploy runbooks are self-contained
    Given a reader has only access to the committed runbooks
    When they follow the steps top-to-bottom
    Then every referenced env var, command, and URL is present in the runbook
    And there are no placeholder markers (to-do, to-be-determined, fill-in-after) in either file
```

### 2.2 Verification Steps

- [ ] `dig +short admin.cleargate.<domain>` and `dig +short mcp.cleargate.<domain>` both return the Coolify host IP.
- [ ] `curl -sSfI https://admin.cleargate.<domain>/health` and `curl -sSfI https://mcp.cleargate.<domain>/health` both return HTTP 200.
- [ ] `openssl s_client -connect admin.cleargate.<domain>:443 -servername admin.cleargate.<domain> </dev/null 2>/dev/null | openssl x509 -noout -issuer -dates` shows Let's Encrypt issuer and future `notAfter`.
- [ ] OAuth round-trip in a real browser: cold cookie jar, complete the GitHub login, land on the dashboard, verify `/admin-api/v1/projects` returns project list in devtools.
- [ ] Clean laptop drill: delete `~/.cleargate/` + clear macOS keychain entry `security delete-generic-password -s cleargate` → run the 4-command onboarding → all exit 0.
- [ ] `rg -n "to-do|to-be-determined|fill in after" admin/coolify/DEPLOYMENT.md mcp/coolify/DEPLOYMENT.md` returns zero matches.
- [ ] `rg -n "docker exec.*psql.*INSERT" admin/coolify/DEPLOYMENT.md mcp/coolify/DEPLOYMENT.md` returns zero matches.

## 3. Implementation

**Files touched (all text-only — zero code):**

- `admin/coolify/DEPLOYMENT.md` — **modified** — (a) §7 Post-Deploy Checklist: replace the bootstrap bullet to use `cleargate admin bootstrap-root`. (b) §10 Retro: fill in operator / date / time-to-deploy / issues. (c) add "Verified E2E on <YYYY-MM-DD> via STORY-011-04" line above §Mobile-note.
- `mcp/coolify/DEPLOYMENT.md` — **modified** — same three edits against whatever the equivalent sections are in the MCP runbook (map by heading names if numbering differs).

**Operational actions (not committed as artifact, but required for DoD):**

- Two GitHub OAuth apps registered under the production org's GitHub Developer Settings. Client IDs committed to Coolify env (not to the repo). Web secret committed to Coolify as a masked secret.
- DNS records in the domain registrar for `admin.cleargate.<domain>` + `mcp.cleargate.<domain>`.
- Coolify services (MCP + Admin) created, envs populated, deployed, green-health.
- `cleargate admin bootstrap-root <owner-handle> --database-url <DATABASE_URL>` executed once and recorded.

**Consumes:**
- STORY-011-01's wire-up (CLI uses keychain, no env paste needed in the onboarding drill).
- STORY-011-02's service-token middleware (validates the Bearer-token verification scenario).
- STORY-011-03's bootstrap-root command (seeds the first root without raw psql).
- Already-shipped: `admin/Dockerfile`, `mcp/Dockerfile`, `admin/coolify/DEPLOYMENT.md` §0-9, `mcp/coolify/DEPLOYMENT.md` §0-9.

**Does NOT consume:** the four-agent loop ever produces code here. This story's Developer agent role is "execute runbooks + update retro tables + verify E2E". No `npm test` run because there are no new tests.

## 4. Quality Gates

| Check | Min | Notes |
|---|---|---|
| Runbook lint | 2 | Both files have §10 retro filled; zero placeholder-marker strings (to-do / to-be-determined / fill-in-after) |
| Bootstrap reference | 2 | Both files reference `cleargate admin bootstrap-root`; zero `docker exec … psql … INSERT` matches |
| TLS / health | 2 | Both subdomains return 200 on /health over HTTPS with LE cert |
| E2E onboarding | 1 | Clean-laptop 4-command drill exits 0 end-to-end |
| OAuth web flow | 1 | Browser login → dashboard loads projects |
| Service-token flow | 1 | curl with Admin-issued plaintext token returns tools/list |

### 4.2 Definition of Done

- [ ] Both production subdomains serve HTTPS with valid Let's Encrypt certs.
- [ ] Both `/health` endpoints return 200 in a scripted curl over HTTPS.
- [ ] OAuth round-trip verified in a browser (cold cookie jar → dashboard).
- [ ] Clean-laptop onboarding drill (no env vars, no keychain entries) completes all 4 CLI commands with exit 0.
- [ ] Service-token curl test against `https://mcp.cleargate.<domain>/mcp` returns a valid tools/list payload.
- [ ] `admin/coolify/DEPLOYMENT.md` §10 + `mcp/coolify/DEPLOYMENT.md` §10 have operator / date / measured-duration / issues filled in — no placeholder strings remain.
- [ ] Both runbooks reference `cleargate admin bootstrap-root` and contain zero `docker exec … psql … INSERT` strings.
- [ ] `CLEARGATE_DISABLE_AUTH` is NOT set in either Coolify service's production env.
- [ ] MCP logs show exactly one `/auth/refresh` per `cleargate sync --check` invocation (validates STORY-011-01 wire-up against prod).

## Ambiguity Gate

🟢 — scope is execute-and-document. All artifacts exist. The remaining work is: register two OAuth apps, point DNS, fill envs, click Deploy, run bootstrap, verify, and write the retro row. No code path decisions, no schema changes, no new tests.
