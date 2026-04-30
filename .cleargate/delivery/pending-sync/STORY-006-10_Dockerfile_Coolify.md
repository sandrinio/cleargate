---
story_id: STORY-006-10
parent_epic_ref: EPIC-006
parent_cleargate_id: "EPIC-006"
sprint_cleargate_id: "SPRINT-04"
status: Draft
ambiguity: 🟢 Low
complexity_label: L2
context_source: PROPOSAL-003_MCP_Adapter.md, EPIC-006 §6 Q7, STORY-003-12 (MCP Coolify precedent)
design_guide_ref: ../../knowledge/design-guide.md
sprint_id: SPRINT-04
created_at: 2026-04-17T00:00:00Z
updated_at: 2026-04-18T18:00:00Z
created_at_version: strategy-phase-pre-init
updated_at_version: strategy-phase-pre-init
depends_on:
  - STORY-006-01
  - STORY-006-02
  - STORY-006-09
cached_gate_result:
  pass: true
  failing_criteria: []
  last_gate_check: 2026-04-20T11:26:35Z
approved: true
pushed_by: sandrinio@github.local
pushed_at: 2026-04-20T19:44:36.477Z
push_version: 2
---

# STORY-006-10: Admin Dockerfile + Coolify Deploy Runbook

**Complexity:** L2. Last story in the sprint. Ships the container + the runbook and closes the Ops DoD items.

## 1. The Spec

Multi-stage Dockerfile building `admin/` with `@sveltejs/adapter-node`, final stage `node:24-alpine`, + `admin/coolify/DEPLOYMENT.md` runbook modeled on `mcp/coolify/DEPLOYMENT.md` (from STORY-003-12). Ship a `/health` endpoint. Cover the env-var checklist for Coolify secrets. Verify that a cold `docker run` against a staged env reaches `/login`.

### Detailed Requirements — Dockerfile

- **Stage 1: `build`** — `node:24-alpine`. Copy workspace root `package.json` + `package-lock.json` + `cleargate-cli/`, `admin/` directories. `npm ci --workspace admin --include-workspace-root`. `npm run build --workspace admin`. Output: `admin/build/`.
- **Stage 2: `runtime`** — `node:24-alpine`. Non-root user (`node`). Copy `admin/build/`, `admin/package.json`, and the subset of `node_modules` needed by adapter-node (use `npm ci --omit=dev --workspace admin` or copy `admin/build/` + hoisted `node_modules`). Expose `PORT` (default 3000). `CMD ["node", "admin/build"]`.
- Image size target: ≤ 180 MB (scaffold + adapter-node; MCP is ~150 MB per STORY-003-12).
- Security: non-root user; no shell history; no build tools in runtime stage.
- Multi-arch: build for `linux/amd64` and `linux/arm64`. Coolify on Hetzner uses amd64; arm64 is for Apple Silicon local dev.

### Detailed Requirements — health endpoint

- `admin/src/routes/health/+server.ts` — GET returns `{ status: "ok", version: "<pkg-version>", time: "<iso>" }` with HTTP 200. No auth required.
- Checks: app booted (trivially true once the handler runs); Redis reachable (`PING` with 500ms timeout); MCP reachable (HEAD `PUBLIC_MCP_URL/health` with 500ms timeout, optional — warn-don't-fail if MCP is down so admin can still render `/login`).
- Response includes `checks: { redis: "ok" | "fail", mcp: "ok" | "fail" | "skipped" }`.

### Detailed Requirements — runbook

`admin/coolify/DEPLOYMENT.md`, structure:

1. **Prerequisites**
   - Coolify instance reachable.
   - Subdomain `admin.cleargate.<domain>` reserved; DNS A-record → Coolify host IP.
   - Two GitHub OAuth apps registered (web + device; device lives in STORY-005-06 but listed here for one-stop ops).
   - MCP already deployed via `mcp/coolify/DEPLOYMENT.md` (STORY-003-12 + SPRINT-03 invite migration + SPRINT-04 /auth/exchange).
2. **Env vars** (table):
   - `PORT` — 3000
   - `PUBLIC_MCP_URL` — `https://mcp.cleargate.<domain>`
   - `REDIS_URL` — same instance as MCP
   - `SESSION_COOKIE_NAME` — `cg_session`
   - `GITHUB_WEB_CLIENT_ID` / `GITHUB_WEB_CLIENT_SECRET` — from web OAuth app
   - `AUTH_SECRET` — `@auth/sveltekit` secret (>= 32 bytes, generated fresh)
   - `NODE_ENV` — `production`
   - *(for MCP side, listed for cross-reference)* `CLEARGATE_ADMIN_ORIGIN=https://admin.cleargate.<domain>`, `CLEARGATE_GITHUB_CLI_CLIENT_ID`
3. **Build + deploy steps**
   - Coolify "Dockerfile" deploy type pointing at this repo + `admin/Dockerfile`.
   - TLS: Let's Encrypt via Coolify auto-provisioning. Ensure domain is validated.
   - Health check: `GET /health` every 30s; 5 consecutive fails → restart.
   - Log target: Coolify built-in (pino stdout → captured automatically).
4. **First-deploy smoke**
   - `curl https://admin.cleargate.<domain>/health` → 200.
   - Browser → `https://admin.cleargate.<domain>/` → redirects to `/login`.
   - OAuth round-trip: GitHub login → dashboard.
5. **Rollback**
   - Coolify "Revert to previous deployment" button. Session cookies remain valid because Redis is shared; no session invalidation needed on rollback.
6. **Troubleshooting**
   - 502 on `/auth/exchange` → MCP CORS misconfigured: check `CLEARGATE_ADMIN_ORIGIN` on MCP service matches admin origin exactly.
   - "not authorized" on login → run bootstrap-admin against MCP: `docker exec <mcp-container> node scripts/bootstrap-admin.js <gh_handle>`.
   - Stuck login loop → clear `cg_session` cookie + Redis key; re-auth.

### Mobile-first small detail

Runbook includes a note: "Mobile polish is non-goal for v1. Core flows usable at 390px; tune in v1.1."

## 2. Acceptance

```gherkin
Scenario: Docker build succeeds
  When I run `docker build -f admin/Dockerfile -t cleargate-admin:test .`
  Then the build completes without errors
  And the resulting image size is ≤ 180 MB
  And the image runs as non-root (HEALTHCHECK or runtime check)

Scenario: Multi-arch build
  When I run `docker buildx build --platform linux/amd64,linux/arm64 ...`
  Then both platform variants build successfully

Scenario: Health endpoint boots
  Given the container is running with REDIS_URL + PUBLIC_MCP_URL set to valid services
  When I GET /health
  Then HTTP 200 and body { status: "ok", checks: { redis: "ok", mcp: "ok" } }

Scenario: Health endpoint degrades gracefully without MCP
  Given MCP is unreachable
  When I GET /health
  Then HTTP 200 with checks.mcp = "fail"
  And the page / is still reachable and redirects to /login

Scenario: Health endpoint fails if Redis is down
  Given REDIS_URL points to nothing
  When I GET /health
  Then HTTP 503 with checks.redis = "fail"
  And Coolify health-check triggers a restart after 5 consecutive fails

Scenario: Container redirects unauthenticated users
  When I GET / (no cookie)
  Then HTTP 302 redirect to /login within 2 seconds of first request

Scenario: Cold Coolify deploy reaches /login
  Given a fresh Coolify project per DEPLOYMENT.md
  When deploy completes
  Then https://admin.cleargate.<domain>/ redirects to /login over HTTPS
  And the cert is issued by Let's Encrypt
  And https is enforced (http → https redirect)

Scenario: DEPLOYMENT.md runbook is executable end-to-end
  When a fresh operator follows the runbook with no prior context
  Then a deployed admin UI reachable at https://admin.cleargate.<domain>/login results
  And total time-to-deploy is captured in the runbook retro section

Scenario: Env-var preflight
  Given one of the required env vars is missing at container start
  Then the container exits 1 with a clear log line "missing required env: <VAR>"
  And does not silently start with default values

Scenario: Non-root user
  When I exec into the running container and check id
  Then uid is not 0
```

## 3. Implementation

- `admin/Dockerfile` (multi-stage)
- `admin/.dockerignore` — exclude node_modules, tests, e2e artifacts, .git
- `admin/src/routes/health/+server.ts` + unit test
- `admin/src/lib/server/env.ts` — required-env preflight check, loaded at app boot. Throw on missing var. Unit test.
- `admin/coolify/DEPLOYMENT.md` — full runbook per §1
- `admin/coolify/env.example` — template for ops (never commit real secrets)
- Update root `README.md` (if it exists) or `admin/README.md` with a "Deploy to Coolify" link to the runbook

## 4. Quality Gates

- All ten acceptance scenarios pass.
- Image size assertion via CI: `docker image inspect cleargate-admin:test --format='{{.Size}}'` ≤ 180 MB.
- Dockerfile scanned by Trivy or `docker scout` at CI time — zero HIGH/CRITICAL vulns. (Same bar as MCP, STORY-003-12.)
- Runbook executed end-to-end by someone other than the Developer (the orchestrator / ops proxy) before sprint close. Time-to-deploy recorded in retro.
- Env-var preflight: unit test asserts app exits on missing `GITHUB_WEB_CLIENT_ID` / `AUTH_SECRET` / `REDIS_URL` / `PUBLIC_MCP_URL`.

## 5. Open questions

1. **Build cache strategy on Coolify.** Coolify rebuilds from scratch by default; layer cache available via BuildKit cache mount. Architect M5 decides whether to add `--mount=type=cache,target=/root/.npm`. Low-priority perf win.
2. **Multi-arch CI.** v1 skips CI multi-arch builds (ops builds on Coolify host, which is amd64). If Apple-Silicon local dev breaks, add a dev Makefile target. v1.1.
3. **Observability add-ons.** Coolify captures pino stdout. Sentry / Datadog / OTEL are explicitly out of scope per EPIC-006 Q8. Reaffirm here.
4. **Graceful shutdown.** `adapter-node` SIGTERM handling: `@sveltejs/adapter-node` handles this by default; verify at M5. If it doesn't, wrap `build/index.js` with a small `process.on('SIGTERM', ...)` shutdown to drain in-flight requests ≤ 10s.

## Ambiguity Gate

🟢 — Coolify + Node 24 alpine pattern already proven for MCP (STORY-003-12). Only perf/CI polish is open, with safe defaults.
