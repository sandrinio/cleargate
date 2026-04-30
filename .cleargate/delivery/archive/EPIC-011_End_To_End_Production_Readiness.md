---
epic_id: EPIC-011
status: "Completed"
ambiguity: 🟢 Low
context_source: ../archive/PROPOSAL-003_MCP_Adapter.md
owner: Vibe Coder (sandro.suladze@gmail.com)
target_date: null
created_at: 2026-04-20T13:30:00Z
updated_at: 2026-04-20T13:30:00Z
created_at_version: post-SPRINT-06
updated_at_version: post-SPRINT-06
depends_on_epics:
  - EPIC-003
  - EPIC-004
  - EPIC-005
  - EPIC-006
  - EPIC-010
scope_version: v1
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-04-20T13:11:40Z
stamp_error: no ledger rows for work_item_id EPIC-011
draft_tokens:
  input: null
  output: null
  cache_creation: null
  cache_read: null
  model: null
  last_stamp: 2026-04-20T13:11:35Z
  sessions: []
approved: true
pushed_by: sandrinio@github.local
pushed_at: 2026-04-20T19:46:08.015Z
push_version: 3
sprint_cleargate_id: "SPRINT-06"
---

# EPIC-011: End-to-End Production Readiness (Auth + Bootstrap + Deploy)

## 0. AI Coding Agent Handoff

```xml
<agent_context>
  <objective>Close the four remaining blockers that prevent a brand-new real user from successfully onboarding onto a deployed ClearGate instance: (1) CLI commands must use the refresh-token-in-keychain that `cleargate join` produces (not a pasted env JWT); (2) Admin-UI-issued project service tokens must authenticate against MCP (currently stored but never verified); (3) first-root-admin seeding must be a CLI command, not a raw psql INSERT; (4) MCP + Admin must actually run on Coolify behind `admin.cleargate.<domain>` + `mcp.cleargate.<domain>` with TLS. After this Epic, `npm install cleargate && cleargate init && cleargate join <url> && cleargate sync` is the complete day-one experience.</objective>
  <architecture_rules>
    <rule>Reuse existing JWT issuance (`mcp/src/auth/jwt.ts`) and token store (`cleargate-cli/src/auth/factory.ts`) — do not introduce a second auth path.</rule>
    <rule>Service-token middleware verifies `Authorization: Bearer <plaintext>` via bcrypt-compare against `tokens.token_hash`; on match, issues a short-lived access JWT with `role: 'user'` and the matched member's project_id. No direct tokens-table lookup in route handlers; middleware sets `request.claims`.</rule>
    <rule>CLI token resolver: env `CLEARGATE_MCP_TOKEN` first (CI / dev short-circuit), then keychain refresh-token via `acquireAccessToken`, else fail with actionable error. Same resolver shared across `sync`/`pull`/`push`/`sync-log`/`conflicts`/`whoami`.</rule>
    <rule>Bootstrap command is idempotent: re-running with the same GitHub handle must not create a duplicate admin_users row; re-running with a new handle when a root already exists refuses unless `--force` is passed.</rule>
    <rule>Coolify deployment artifacts (Dockerfile, runbook) already exist from SPRINT-06 STORY-006-10; this Epic executes them, does not rewrite them.</rule>
    <rule>Two separate GitHub OAuth apps (web callback + device flow) remain the only login paths; this Epic does not add email / SSO / password login (deferred by 2026-04-20 triage).</rule>
    <rule>No new runtime dependencies. bcrypt is already pinned in mcp/ for password-hash operations; reuse.</rule>
  </architecture_rules>
  <target_files>
    <file path="cleargate-cli/src/commands/sync.ts" action="modify" />
    <file path="cleargate-cli/src/commands/pull.ts" action="modify" />
    <file path="cleargate-cli/src/commands/push.ts" action="modify" />
    <file path="cleargate-cli/src/commands/sync-log.ts" action="modify" />
    <file path="cleargate-cli/src/commands/conflicts.ts" action="modify" />
    <file path="cleargate-cli/src/lib/mcp-client.ts" action="modify" />
    <file path="cleargate-cli/src/auth/acquire.ts" action="modify" />
    <file path="mcp/src/auth/service-token.ts" action="create" />
    <file path="mcp/src/auth/service-token.test.ts" action="create" />
    <file path="mcp/src/auth/middleware.ts" action="modify" />
    <file path="cleargate-cli/src/commands/bootstrap-root.ts" action="create" />
    <file path="cleargate-cli/src/commands/bootstrap-root.test.ts" action="create" />
    <file path="cleargate-cli/src/cli.ts" action="modify" />
    <file path="admin/coolify/DEPLOYMENT.md" action="modify" />
    <file path="mcp/coolify/DEPLOYMENT.md" action="modify" />
  </target_files>
</agent_context>
```

## 1. Problem & Value

**Why are we doing this?**
SPRINT-06 shipped all 13 Admin UI stories + post-sprint hotfixes, and SPRINT-07 shipped the Multi-Participant MCP Sync layer. Both sprints passed QA, 262 admin tests and 248 MCP tests are green, and the UI renders cleanly in the browser. But a brand-new user **cannot actually onboard** today, because four independent gaps intersect at the moment they try:

- They run `cleargate join <invite-url>` — it succeeds, refresh token lands in their Keychain — but every subsequent CLI command (sync/pull/push) ignores the Keychain and instead demands `CLEARGATE_MCP_TOKEN=<15-min-JWT>` pasted by hand.
- They fall back to the Admin UI, click "Issue token" on a project — plaintext shown, saved — but no MCP middleware actually verifies it. The token is a dead prop.
- They (or their admin) try to seed themselves as the first root admin — the only path is `docker exec mcp-postgres-1 psql -c "INSERT …"` with raw UUIDs. Undocumented. Not a product.
- They visit `admin.cleargate.<domain>` — but nothing's deployed. Everything runs on localhost only.

Each gap in isolation is small; collectively they block 100% of day-one use cases. This Epic closes all four in a single coherent stretch so v1-alpha becomes demonstrably shippable.

**Success Metrics (North Star):**
- From a blank laptop with no prior ClearGate state: (a) clone a test repo, (b) `npm install cleargate`, (c) `cleargate init`, (d) `cleargate join <invite-url>`, (e) `cleargate sync` successfully reaches the deployed MCP and exits 0. Total time < 5 minutes.
- `cleargate whoami` works after `cleargate join` without any env var pasting.
- An admin runs `cleargate-admin bootstrap-root <handle>` on a fresh MCP and logs into `admin.cleargate.<domain>` immediately afterwards.
- A CI pipeline runs `CLEARGATE_MCP_TOKEN=<plaintext-from-tokens-modal> cleargate sync` and it works — the plaintext gets verified by the service-token middleware.
- `admin.cleargate.<domain>` + `mcp.cleargate.<domain>` both resolve, TLS valid, OAuth round-trip succeeds against production-registered GitHub apps.

## 2. Scope Boundaries

**✅ IN-SCOPE (Build This — 4 Stories)**

- [ ] **Story 1: Wire `acquireAccessToken` into all CLI commands.** Sync, pull, push, sync-log, conflicts, mcp-client. Remove the `CLEARGATE_MCP_TOKEN`-only path; keep env as a fallback but let keychain refresh-token be the primary path. Unit tests exercise both paths.
- [ ] **Story 2: Service-token middleware.** New `mcp/src/auth/service-token.ts` that exposes a Fastify preHandler: extracts Bearer, bcrypt-compares against `tokens.token_hash`, loads the matched row's member, issues a synthetic `request.claims` (role, sub, project_id) with the SAME shape as `verifyAccess` returns. Wired into the `/mcp` tool endpoints so plaintext project tokens authenticate. Middleware chain order: try JWT first, fall through to service-token on JWT-verify failure, else 401.
- [ ] **Story 3: `cleargate-admin bootstrap-root <handle>` command.** New CLI subcommand that INSERTs (or UPDATEs via ON CONFLICT) a `admin_users` row with `is_root: true`. Reads `DATABASE_URL` from env or a `--database-url` flag. Idempotent. Refuses to create a second root unless `--force`. Replaces the `docker exec psql INSERT` manual step; becomes the documented first-run step.
- [ ] **Story 4: Coolify deploy execution.** Register two production GitHub OAuth apps (web callback + device-flow); provision `admin.cleargate.<domain>` + `mcp.cleargate.<domain>` subdomains on Coolify with TLS; push the MCP and Admin Docker images; set all required envs per the runbooks; execute the bootstrap command for the first root admin. Record observed time-to-deploy in both runbooks. Verify end-to-end: OAuth round-trip works, `cleargate join` works, `cleargate sync` works against `mcp.cleargate.<domain>`.

**❌ OUT-OF-SCOPE (Do NOT Build This — v1.1)**

- Email / magic-link / password login (deferred by 2026-04-20 triage — GitHub-only in v1).
- SSO / SAML / OIDC via Okta / Azure AD / Google (v1.1+).
- `cleargate sync --watch` long-running daemon.
- Webhook-driven PM-tool push (polling remains the only path).
- Multi-remote federation (one ClearGate project still maps to one PM project).
- Top-level `/projects` and `/audit` routes in Admin UI (deferred; dashboard covers projects, audit is per-project).
- Inter Variable font self-hosting fix (cosmetic — system font fallback is acceptable).
- `GET /admin-api/v1/items/:cleargate_id` single-item endpoint (the list-and-filter-by-200 workaround stays).
- Token-ledger `delta_from_turn` sentinel correction (telemetry gap, non-blocking for user flow).
- Lighthouse CI wiring.
- Items.test.ts parallel-FK isolation.
- Mobile-polish on any admin page.
- Dark mode.

## 3. The Reality Check (Context)

**Operating constraints (authoritative — enforced by tests and deployment runbooks):**

- Token resolver order is env → keychain → fail. Reversing it would let a stale env var silently override a fresh keychain entry, which bit us during post-SPRINT-06 debugging.
- Service-token middleware runs AFTER JWT verify attempt — plaintext tokens are the fallback path, not the primary one. This keeps the common case (Bearer JWT from `acquireAccessToken`) zero-overhead.
- Bootstrap command is idempotent: re-running with the same handle is a no-op, never an error. Prevents foot-guns during re-deploys.
- Every new MCP endpoint and middleware inherits rate limits from EPIC-003's existing buckets; no new bucket configurations.
- Coolify deployment uses the already-shipped Dockerfiles (admin/Dockerfile + mcp/Dockerfile) unchanged; runbook adjustments are text-only.
- Tokens never logged: the service-token middleware's log lines MUST NOT include the plaintext or the hash — grep assertion per the SPRINT-07 `#tokens-never-in-log` discipline.
- Single-admin-user is the v1 default; `--force` is the only path past the "refusing to create a second root admin" guard.

| Constraint | Rule |
|---|---|
| Auth paths | GitHub OAuth (Admin UI) + GitHub device flow (CLI admin) + invite → refresh token + service token. No email / password. |
| JWT TTL | Access 15 min; refresh 90 days. Rotated on every `/auth/refresh`. Service tokens issue the same 15-min access JWT. |
| Rate limits | Admin bucket 600/min, service bucket 600/min, anonymous bucket 600/min (bumped post-SPRINT-06 from 30/60). |
| Deploy topology | Two domains behind Coolify TLS: `admin.cleargate.<domain>` (SvelteKit adapter-node) + `mcp.cleargate.<domain>` (Fastify). Shared Postgres 18 + Redis 8. |
| CORS | `CLEARGATE_ADMIN_ORIGIN` env on MCP lists exactly the allowed admin UI origin(s), comma-separated. OPTIONS preflight handled at root via onRequest hook (SPRINT-06 STORY-006-09 pattern). |
| Bootstrap | `cleargate-admin bootstrap-root <handle> [--force]`. Idempotent. Reads DATABASE_URL from env / --database-url flag. |
| First OAuth app | Web callback: `https://admin.cleargate.<domain>/auth/callback/github`. Device-flow: public client, no secret. |
| Middleware chain on /mcp | require-auth (JWT first) → on JWT failure, try service-token middleware → on both failures, 401. No third path. |
| Logging | Pino redact covers all `authorization` headers + any `token`/`refresh_token`/`access_token` keys in bodies. No plaintext or hash in logs. |
| Session cookies | `cg_session` HttpOnly+Secure+SameSite=Lax, 7-day TTL, shared Redis with MCP under `cg_session:*` prefix. |

## 4. Technical Grounding

**Affected Files** (complete list for the four stories):

- `cleargate-cli/src/commands/sync.ts` — modify: swap env-only token path to `acquireAccessToken`.
- `cleargate-cli/src/commands/pull.ts` — modify: same swap.
- `cleargate-cli/src/commands/push.ts` — modify: same swap.
- `cleargate-cli/src/commands/sync-log.ts` — modify: same swap.
- `cleargate-cli/src/commands/conflicts.ts` — modify: same swap.
- `cleargate-cli/src/lib/mcp-client.ts` — modify: accept `accessToken` arg from caller instead of reading env directly; keep env fallback inside the shared resolver only.
- `cleargate-cli/src/auth/acquire.ts` — modify: add a one-shot cache (in-memory, scoped per CLI invocation) so a single command doesn't double-refresh.
- `mcp/src/auth/service-token.ts` — create: `buildServiceTokenAuth(jwt, db)` returns a preHandler. bcrypt-compares incoming Bearer against non-revoked `tokens.token_hash`, matches → reads member → issues `request.claims` as if `verifyAccess` produced them.
- `mcp/src/auth/service-token.test.ts` — create: integration tests. Happy path (valid plaintext → claims set), invalid plaintext → 401, revoked token → 401, expired token → 401, pino redaction grep.
- `mcp/src/auth/middleware.ts` — modify: chain service-token after JWT verify. On JWT verify failure, try service-token before returning 401.
- `cleargate-cli/src/commands/bootstrap-root.ts` — create: `bootstrapRootHandler({ handle, force, databaseUrl })`. Direct SQL via `pg` library (already in mcp/ workspace, will need to be added or re-imported in cleargate-cli).
- `cleargate-cli/src/commands/bootstrap-root.test.ts` — create: unit tests for idempotency, force flag, missing handle, missing DATABASE_URL.
- `cleargate-cli/src/cli.ts` — modify: register `bootstrap-root` under the `admin` subcommand group.
- `admin/coolify/DEPLOYMENT.md` — modify: add "bootstrap-root command" step; add "record observed time-to-deploy"; cross-reference to mcp/coolify/DEPLOYMENT.md.
- `mcp/coolify/DEPLOYMENT.md` — modify: add env-var checklist row for `CLEARGATE_MCP_TOKEN` (for initial smoke), bootstrap command step, link to admin/coolify/DEPLOYMENT.md.

**Data Changes:** none. No new tables, no new columns, no migrations. `admin_users` + `tokens` + `members` + `projects` shapes are untouched; this Epic only wires up middleware + commands against existing schema.

## 5. Acceptance Criteria

```gherkin
Feature: End-to-end production readiness

  Scenario: CLI command uses keychain refresh token automatically
    Given `cleargate join <invite-url>` succeeded and refresh token is in the keychain
    And CLEARGATE_MCP_TOKEN is NOT set
    When I run `cleargate sync --check`
    Then the command exits 0
    And MCP logs show a POST /auth/refresh followed by an authenticated /admin-api/v1/list_remote_updates call
    And the refresh token in the keychain has been rotated

  Scenario: CLEARGATE_MCP_TOKEN env still works as a CI short-circuit
    Given CLEARGATE_MCP_TOKEN is set to a valid JWT
    And the keychain is empty
    When I run `cleargate sync --check`
    Then the command exits 0
    And MCP logs show NO POST /auth/refresh (the env token was used directly)

  Scenario: CLI errors clearly when no auth source is available
    Given CLEARGATE_MCP_TOKEN is NOT set
    And the keychain is empty
    When I run `cleargate sync`
    Then the command exits non-zero
    And stderr includes "Run `cleargate join <invite-url>` first, or export CLEARGATE_MCP_TOKEN"

  Scenario: Service token authenticates a raw MCP tool call
    Given the Admin UI issued a project token and showed plaintext P to the operator
    When a client sends POST /mcp with Authorization: Bearer P
    Then MCP responds with a valid tools/list payload (not 401)
    And request.claims are populated with the matched member's member_id, project_id, role='user'

  Scenario: Revoked service token is rejected
    Given a service token that has been revoked via Admin UI
    When a client sends any /mcp request with that plaintext
    Then MCP responds 401 with {"error": "invalid_token"}

  Scenario: bootstrap-root creates the first root admin
    Given admin_users table is empty
    When I run `cleargate-admin bootstrap-root sandrinio`
    Then admin_users has exactly one row with github_handle='sandrinio' and is_root=true
    And stdout prints "Bootstrapped root admin 'sandrinio'."

  Scenario: bootstrap-root is idempotent
    Given admin_users has a row {github_handle='sandrinio', is_root=true}
    When I run `cleargate-admin bootstrap-root sandrinio` again
    Then admin_users still has exactly one sandrinio row
    And stdout prints "Root admin 'sandrinio' already exists; no change."

  Scenario: bootstrap-root refuses a second root without --force
    Given admin_users has one root admin already
    When I run `cleargate-admin bootstrap-root another-user`
    Then the command exits non-zero
    And stderr includes "refusing to create a second root admin; pass --force to override"

  Scenario: Coolify-deployed admin UI completes OAuth round trip
    Given admin.cleargate.<domain> resolves with valid TLS
    And mcp.cleargate.<domain> resolves with valid TLS
    And the production GitHub OAuth web app is configured
    When I visit https://admin.cleargate.<domain>/login and click "Sign in with GitHub"
    Then I am redirected to github.com, authorise, and land on the dashboard
    And the dashboard loads projects via /admin-api/v1/projects successfully

  Scenario: Production Vibe Coder onboarding end-to-end
    Given MCP + Admin are deployed to Coolify
    And bootstrap-root has seeded the first root
    And the root admin created a project 'demo' and invited ops-test@company.com
    When ops-test runs `npm install -D cleargate && npx cleargate init && npx cleargate join <invite-url> && npx cleargate sync`
    Then every command exits 0
    And sync emits a summary "Would pull: 0, push: 0, intake: 0, conflicts: 0" (empty state, no errors)
    And ~/.cleargate/auth.json (or keychain) holds a rotated refresh token

  Scenario: Error path — CI uses service token via env
    Given a CI pipeline has CLEARGATE_MCP_TOKEN set to a plaintext service token (NOT a JWT)
    When the pipeline runs `cleargate push <story-file>`
    Then MCP's service-token middleware verifies the token via bcrypt
    And the push succeeds
    And no JWT verification is attempted before the service-token path
```

## 6. AI Interrogation Loop — RESOLVED

*All scope-level questions were resolved 2026-04-20 via chat triage with Vibe Coder (sandro.suladze@gmail.com). Summary:*

1. **Why skip the Proposal gate?** — User explicitly triaged this Epic directly from a chat conversation reviewing post-SPRINT-06 gaps. Context is the SPRINT-06 REPORT.md carry-forward section + live hot-debugging session that surfaced the four concrete blockers. Risk of skipping is low because scope is mechanical (wire-up of existing components, no new architecture).

2. **Email / password / SSO login?** — OUT. Triaged on 2026-04-20: GitHub OAuth + device flow remain the only login paths in v1. If a real user surfaces without a GitHub account, file PROPOSAL-008 then; not before.

3. **Middleware ordering: JWT-first or service-token-first?** — JWT first. The common case is Bearer JWT from `acquireAccessToken` (every `cleargate sync`); service-token is the CI/bot fallback. Order reflects frequency. The service-token path is a try/catch after JWT verify fails.

4. **Bootstrap command location: CLI or psql docs?** — CLI command (`cleargate-admin bootstrap-root`). Psql is not a product interface; wrapping it in a CLI subcommand makes the ops story idempotent, tested, and documentable in the runbook as a single copy-pasteable line.

5. **Service-token plaintext format.** — Reuse the existing `generatePlaintext()` in `mcp/src/admin-api/tokens.ts` — already ships via the Admin UI "Issue token" modal. Don't change the wire format; add the consumer.

6. **Coolify app registration owner.** — Ops task, not engineering. The sprint ships a checklist in the runbook; the actual GitHub OAuth app registration is manual in the `github.com/settings/developers` UI, done by whoever owns the production domain.

7. **Sprint placement.** — Goes into **SPRINT-08** as the single epic. All four stories sized L1–L2; full sprint fits in 1–2 days of focused work. No SPRINT-09 items bleed into this Epic.

8. **Carry-forward from SPRINT-06 REPORT.md.** — Items listed in SPRINT-06 REPORT §Carry-Forward that are NOT in this Epic (Lighthouse, items single-item endpoint, items.test.ts parallel-FK isolation, ledger delta fix, inter-font self-host, top-level nav routes) are explicitly deferred to SPRINT-09+ as separate CRs / stories. This Epic closes only the P0 onboarding-blocker set.

---

## ClearGate Ambiguity Gate (🟢 / 🟡 / 🔴)

**Current Status: 🟢 Low Ambiguity — READY for Story decomposition**

Gate requirements (all met 2026-04-20):

- [x] Context lineage documented (PROPOSAL-003 approved ancestor + SPRINT-06 REPORT.md carry-forward §)
- [x] `<agent_context>` block complete with 4-rule architecture + 15 target files
- [x] §4 Technical Grounding enumerates all affected files; no Data Changes required
- [x] §2 scope is 4 stories, each independently testable
- [x] §6 AI Interrogation Loop answered (8 answers; zero open questions)
- [x] Scope split v1 vs v1.1 explicit
- [x] No placeholder tokens in body

Downstream: architect produces SPRINT-08 M1 plan from the 4-story slicing in §2 IN-SCOPE; stories draft into `.cleargate/delivery/pending-sync/STORY-011-0N_*.md`. Sprint plan `SPRINT-08_End_To_End_Production_Readiness.md` frames milestones + DoD.
