# Deploying ClearGate Admin UI on Coolify

End-to-end runbook. Assumes a fresh Coolify project and a running MCP instance (deployed via `mcp/coolify/DEPLOYMENT.md`). Target domain: `admin.cleargate.<your-domain>`.

**Total time-to-deploy from blank Coolify project: ≤ 10 minutes.**
*(Record actual time in §10 after your first deployment.)*

---

## 0. Prerequisites

- Coolify running on your VPS with access to the internet.
- MCP already deployed and healthy at `https://mcp.cleargate.<your-domain>/health`.
- A domain you control. We'll expose the Admin UI at `admin.cleargate.<your-domain>`.
- DNS CNAME (or A-record) for `admin.cleargate.<your-domain>` pointing to the Coolify host IP.
- Two GitHub OAuth apps registered (see below):
  - **Web OAuth app** — for Admin UI browser login (this runbook).
  - **Device OAuth app** — for CLI `cleargate-admin login` device flow (STORY-005-06).

### Register the GitHub Web OAuth App

1. GitHub → Settings → Developer settings → OAuth Apps → New OAuth App.
2. **Application name:** `ClearGate Admin UI (prod)`.
3. **Homepage URL:** `https://admin.cleargate.<your-domain>`.
4. **Authorization callback URL:** `https://admin.cleargate.<your-domain>/auth/callback/github`.
5. Save. Copy the **Client ID** and generate a **Client Secret**.

---

## 1. Provision the Coolify App

1. Coolify → Projects → your project → `+ New` → Application.
2. Source: **Public Repository** (or Private if you've linked GitHub).
3. Repository URL: `https://github.com/sandrinio/cleargate-mcp.git`
   *(or your fork — the monorepo root)*.
4. Branch: `main`.
5. Build Pack: **Dockerfile**.
6. Dockerfile path: `admin/Dockerfile`.
7. Build context: `/` (monorepo root — required for workspace deps).
8. Port exposed: **3000**.
9. Domain: `admin.cleargate.<your-domain>` — enable "Generate SSL certificate" (Traefik + Let's Encrypt).
10. Health check path: `/health`.

---

## 2. Configure Environment Variables

In the app's **Environment Variables** tab, set all of the following (Runtime flavor). Vars marked **SECRET** should be set as masked secrets in Coolify — they will never appear in build logs.

| Variable | Example / Notes | Type |
|---|---|---|
| `NODE_ENV` | `production` | PUBLIC |
| `PORT` | `3000` | PUBLIC |
| `PUBLIC_MCP_URL` | `https://mcp.cleargate.<your-domain>` | PUBLIC |
| `REDIS_URL` | *(internal Coolify Redis URL — same instance as MCP)* | **SECRET** |
| `AUTH_SECRET` | *(32+ random bytes — generate below)* | **SECRET** |
| `CLEARGATE_GITHUB_WEB_CLIENT_ID` | *(from web OAuth app)* | PUBLIC-ISH |
| `CLEARGATE_GITHUB_WEB_CLIENT_SECRET` | *(from web OAuth app)* | **SECRET** |
| `CLEARGATE_ADMIN_ORIGIN` | `https://admin.cleargate.<your-domain>` | PUBLIC |
| `SESSION_COOKIE_NAME` | `cg_session` | PUBLIC |

Generate `AUTH_SECRET`:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
```

> **Secret hygiene:** Coolify stores env vars encrypted at rest and does not embed them in image layers. Never commit real values to `.env` or `env.example`.

### MCP-side env vars (for cross-reference — set on the MCP service, not here)

The following must be set on the MCP Coolify service for Admin UI to work:

| Variable | Notes |
|---|---|
| `CLEARGATE_ADMIN_ORIGIN` | `https://admin.cleargate.<your-domain>` (enables CORS on admin-api routes) |
| `CLEARGATE_GITHUB_CLI_CLIENT_ID` | Device-flow OAuth app Client ID (STORY-005-06) |

MCP routes added in SPRINT-06 that must be live before admin deploys:
- `POST /admin-api/v1/auth/exchange`
- `POST /admin-api/v1/auth/device/start`
- `POST /admin-api/v1/auth/device/poll`
- `GET /admin-api/v1/admin-users`
- `POST /admin-api/v1/admin-users`
- `PATCH /admin-api/v1/admin-users/:id`
- `DELETE /admin-api/v1/admin-users/:id`
- `GET /admin-api/v1/users/me`

**Runbook ordering: redeploy MCP first, verify `/health`, THEN deploy admin.**

---

## 3. Health Check Configuration

The `admin/Dockerfile` declares:
```
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://127.0.0.1:3000/health || exit 1
```

In Coolify's health check settings, also configure:
- Path: `/health`
- Interval: 30s
- 5 consecutive fails → container restart.

The `/health` endpoint returns:
```json
{ "status": "ok", "version": "0.1.0", "time": "<iso>", "checks": { "redis": "ok", "mcp": "ok" } }
```
Redis failure → HTTP 503 (triggers Coolify restart). MCP failure → HTTP 200 with `checks.mcp: "fail"` (degrade-warn, admin still serves `/login`).

---

## 4. Deploy

1. Save all env vars.
2. Click **Deploy**.
3. Watch the build log. You should see:
   - npm workspaces install + SvelteKit vite build completing.
   - Image layers cached on subsequent deploys.
4. After deploy, wait for the health check to go green (≤ 30s).

---

## 5. First-Deploy Smoke Test

```bash
# 1. Health endpoint
curl -s https://admin.cleargate.<your-domain>/health | jq .
# Expected: { "status": "ok", "checks": { "redis": "ok", "mcp": "ok" } }

# 2. Root redirect
curl -sI https://admin.cleargate.<your-domain>/ | grep location
# Expected: location: /login

# 3. Login page renders
curl -sI https://admin.cleargate.<your-domain>/login
# Expected: HTTP 200
```

OAuth round-trip (browser):
1. Navigate to `https://admin.cleargate.<your-domain>/`.
2. Verify redirect to `/login`.
3. Click "Sign in with GitHub".
4. Authorize the app.
5. Verify redirect to dashboard (if your GitHub handle is a registered admin) or 403 page.

---

## 6. Rollback

Coolify provides one-click rollback:
1. Coolify → your admin app → Deployments tab.
2. Find the previous successful deployment.
3. Click **Rollback**.

Session cookies remain valid after rollback (Redis is shared); no session invalidation is needed. Users experience a brief reconnect at most.

Alternatively, revert the source commit and push to main — Coolify auto-redeploys if auto-deploy is enabled.

---

## 7. Post-Deploy Checklist

- [ ] `CLEARGATE_DISABLE_AUTH` is NOT set (or not `1`) in production env.
- [ ] TLS cert issued by Let's Encrypt (Traefik auto-provisions — check Coolify's SSL tab).
- [ ] HTTP → HTTPS redirect enforced (Traefik default).
- [ ] Bootstrap admin account exists in MCP DB (run MCP bootstrap script if needed).
- [ ] `CLEARGATE_ADMIN_BOOTSTRAP_GH_USER` unset from MCP env after first boot.
- [ ] Auto-deploy enabled in Coolify (push to main → rebuild).
- [ ] Monitor logs via Coolify's built-in log viewer (pino JSON stdout → captured automatically).

---

## 8. Scaling Notes

Current v1 design assumes one Admin UI instance. SvelteKit adapter-node is stateless (session state in Redis); horizontal scaling is safe:

- Session cookies reference Redis keys — all instances share the same Redis.
- No in-memory state that diverges across instances.
- Coolify's Traefik load-balancer can front multiple replicas.

---

## 9. Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| 502 on `/auth/exchange` | MCP CORS misconfigured | Check `CLEARGATE_ADMIN_ORIGIN` on MCP service matches admin origin exactly (no trailing slash) |
| "not authorized" on login | GitHub handle not in admin_users table | Run bootstrap: `docker exec <mcp-container> node scripts/bootstrap-admin.js <gh_handle>` |
| Stuck login loop | Stale `cg_session` cookie | Clear `cg_session` cookie in browser devtools; also flush Redis key if needed |
| `/health` → 503 | Redis unreachable | Check `REDIS_URL` is correct internal Coolify URL; verify Redis service is running |
| Container exits immediately | Missing required env var | Check container logs for `missing required env: <VAR>` line; add the missing var in Coolify |
| `uid=0` in container | Non-root user not set | Should not happen with this Dockerfile; verify `USER node` is in runtime stage |
| Build fails: "workspace not found" | Build context not set to `/` | Set Coolify build context to `/` (monorepo root), not `admin/` |

---

## 10. Retro / Time-to-Deploy Record

*Fill in after first deployment:*

| Field | Value |
|---|---|
| Deployed by | *(operator name)* |
| Date | *(YYYY-MM-DD)* |
| Time to deploy (from blank Coolify project) | *(measured time, target ≤ 10 min)* |
| Issues encountered | *(any deviations from this runbook)* |

---

## Mobile note

Mobile polish is a non-goal for v1. Core flows are usable at 390px viewport width. Refinements planned for v1.1.
