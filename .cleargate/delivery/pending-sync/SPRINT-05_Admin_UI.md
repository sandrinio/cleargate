---
sprint_id: "SPRINT-05"
remote_id: null
source_tool: "local"
status: "Planned"
start_date: null
end_date: null
activated_at: null
completed_at: null
synced_at: null
created_at: "2026-04-18T18:00:00Z"
updated_at: "2026-04-19T00:00:00Z"
created_at_version: "strategy-phase-pre-init"
updated_at_version: "strategy-phase-pre-init"
deferred_from: "SPRINT-04"
deferred_reason: "EPIC-002 Knowledge Wiki prioritized into SPRINT-04 (no admin-UI deadline; wiki unblocks session-start awareness immediately)"
---

# SPRINT-05: Admin UI (SvelteKit + DaisyUI + GitHub OAuth)

## Sprint Goal

Ship **EPIC-006 (Admin UI)** end-to-end on SvelteKit 2 + Svelte 5 + Tailwind v4 + DaisyUI 5 with the custom **`cleargate` theme** from the [Design Guide](../../knowledge/design-guide.md), and close out the two OAuth-path items deferred from SPRINT-03 (`POST /admin-api/v1/auth/exchange` for the UI session → admin-JWT handoff, and `cleargate-admin login` for the CLI device flow). After this sprint, a root admin can (a) log in at `admin.cleargate.<domain>` via GitHub OAuth and drive every EPIC-004 surface visually (projects · members · tokens · items · audit · stats · settings), and (b) alternatively log in from a terminal via `cleargate-admin login` without needing to hand-paste `CLEARGATE_ADMIN_TOKEN`. The admin container ships to Coolify with a repeatable runbook. This closes PROPOSAL-003's v0.1 admin-surface scope — after SPRINT-04, every Admin API endpoint has at least one documented client path.

## Consolidated Deliverables

### EPIC-006 — Admin UI (10 stories)
- [`STORY-006-01`](STORY-006-01_SvelteKit_Scaffold.md): SvelteKit + DaisyUI + Tailwind scaffold — `admin/` package, custom `cleargate` theme registered per Design Guide §2.2, Inter Variable self-hosted, shell layout (72px top bar + inset sidebar) per §7.1 · L2
- [`STORY-006-02`](STORY-006-02_GitHub_OAuth_Session.md): GitHub OAuth + Redis session — `@auth/sveltekit` + custom Redis adapter (shared MCP Redis), session cookie → admin-JWT via `POST /admin-api/v1/auth/exchange` · L3
- [`STORY-006-03`](STORY-006-03_Dashboard.md): Dashboard — `/` route listing projects with member counts + actionable empty state · L1
- [`STORY-006-04`](STORY-006-04_Project_Detail_Members.md): Project detail + members — overview page + members page with invite modal (copyable URL) and remove-member flow · L2
- [`STORY-006-05`](STORY-006-05_Tokens_Page.md): Tokens page + one-time-display modal — plaintext shown once, "I've saved it" gate + `beforeunload` warning · L2
- [`STORY-006-06`](STORY-006-06_Items_Browser_History.md): Items browser + version history — paginated list + timeline view (last 10 versions) · L2
- [`STORY-006-07`](STORY-006-07_Audit_Viewer.md): Audit log viewer — date-range picker, user + tool filters, cursor pagination · L2
- [`STORY-006-08`](STORY-006-08_Stats_Page.md): Stats page — Chart.js bar chart (requests/day), error rate, top-10 items for 7d/30d/90d windows · L2
- [`STORY-006-09`](STORY-006-09_Settings_Page.md): Settings page — root-only `admin_users` management; non-root 403 · L1
- [`STORY-006-10`](STORY-006-10_Dockerfile_Coolify.md): Admin Dockerfile + Coolify runbook — Node 24 alpine multi-stage, `admin.cleargate.<domain>` TLS, env-var checklist, health endpoint · L2

### EPIC-004 — Admin API (1 closeout, deferred from SPRINT-03)
- [`STORY-004-08`](STORY-004-08_Auth_Exchange.md): `POST /admin-api/v1/auth/exchange` — session cookie → short-lived admin JWT, sliding-session TTL bump, anonymous-bucket rate-limited · L2 · **blocks STORY-006-02**

### EPIC-005 — Admin CLI (1 closeout, deferred from SPRINT-03)
- [`STORY-005-06`](STORY-005-06_Admin_CLI_Login.md): `cleargate-admin login` — GitHub device flow + two backing MCP routes (`/auth/device/start`, `/auth/device/poll`); writes `~/.cleargate/admin-auth.json` · L2 · **parallelizable with EPIC-006; does not block UI**

**Total: 12 stories across 3 Epics.**

## Risks & Dependencies

| Risk | Mitigation |
|---|---|
| **Design Guide drift — stock DaisyUI themes sneak in.** EPIC-006 §6 Q1 earlier pointed at `corporate`; the locked decision (Design Guide §2.2) is the custom `cleargate` theme. A Developer unfamiliar with the override could wire `corporate` by accident and everything still renders, just wrong. | STORY-006-01 establishes theme tokens; **every subsequent 006-0x story's DoD requires a visual-regression check: the page uses `bg-base-300` cream canvas, primary `#E85C2F`, and `--radius-box: 1.5rem` radii.** Architect plans must include "token compliance" in the checklist per the SPRINT-03 retro fix. Grep gate: no `theme: "corporate"`, `theme: "light"`, or `theme: "dark"` strings anywhere under `admin/`. |
| **Two separate GitHub OAuth apps required.** UI needs a web OAuth app (callback URL `https://admin.cleargate.<domain>/auth/callback/github`); CLI device flow needs a device-enabled OAuth app (no callback). A single app will not support both grant types. | Register **both** apps pre-sprint and record IDs in a secrets doc: `CLEARGATE_GITHUB_WEB_CLIENT_ID` / `..._SECRET` for the UI (STORY-006-02) and `CLEARGATE_GITHUB_CLI_CLIENT_ID` for the device flow (STORY-005-06, public client — no secret). Both live in Coolify env; dev uses `.env.local`. M1 architect confirms both exist before dispatching Developer on the dependent stories. |
| **Admin-UI → MCP CORS.** `admin.cleargate.<domain>` calling `mcp.cleargate.<domain>/admin-api/v1/*` is a cross-origin request; current MCP Fastify config may not have CORS wired (SPRINT-01/02 tested same-origin via tools/CLI only). | STORY-006-02 or STORY-004-08 (whichever lands first) registers `@fastify/cors` on `/admin-api/v1/*` with origin allowlist pulled from `CLEARGATE_ADMIN_ORIGIN` env var (single string or comma-separated). Credentials allowed for cookie-bearing exchange route; non-credentialed for other admin-api calls (JWT is `Authorization` header, not cookie). |
| **Redis session adapter sharing Redis with MCP.** SPRINT-01/02 own Redis keyspace (`rev:token:*`, rate-limit buckets). Adding `cg_session:*` risks key collisions or flush-all-on-deploy pain. | **Key namespace convention:** `cg_session:<value>` for UI sessions; Redis DB index stays at 0 (single DB policy from SPRINT-01). Architect W2 greps existing `rev:*` and `rl:*` prefixes and confirms `cg_session:*` is unused. Admin container's Redis config reads `REDIS_URL` env; ops adds the admin pod to the same Redis instance on Coolify. |
| **Chart.js bundle size.** ~70 KB gzipped just for the chart bar — non-trivial on the 90+ Lighthouse budget from EPIC-006 §1. | STORY-006-08 lazy-imports Chart.js via dynamic `import('chart.js')` inside the stats route's client code; dashboard and other pages do not pay the cost. Assertion: `/` (dashboard) network tab shows no `chart.js` chunk request. |
| **Silent admin-JWT refresh cadence.** JWT is 15 min (STORY-004-08); UI must refresh before expiry or every nth request errors with 401. | STORY-006-02 middleware wraps `mcp-client.ts` — on 401, call `POST /admin-api/v1/auth/exchange` once, retry the original request, then fail. Proactive refresh 2 min before `expires_at` via a `setTimeout` tied to the cached exchange response. |
| **One-time-display modal regression.** SPRINT-02 STORY-004-04 already enforces server-side "plaintext once"; UI must not store plaintext in localStorage/session for convenience. | STORY-006-05 test asserts `window.localStorage` + `window.sessionStorage` never receive the plaintext token value; `beforeunload` guard re-verified after close-button enable. |
| **E2E testing infra on SvelteKit.** Existing MCP + CLI tests run under Vitest; EPIC-006 needs a browser runner (Playwright) for OAuth-flow + modal-gate assertions. Setup cost is real. | Ship Playwright in STORY-006-01 scaffold (one config file + one smoke test). Per-story E2E limited to critical flows: OAuth happy path, token modal, audit filters. Don't over-index — unit tests still own logic branches. |
| **Mobile layout — explicit non-goal but half-working states look buggy.** EPIC-006 §2 excludes mobile polish but stakeholders may hit the site from a phone during demo. | Architect plans include a "mobile < 640px" acceptance row per page: content reachable (scrollable), no horizontal scroll, modals full-screen. Not pixel-perfect; just not broken. Deferred polish explicitly tagged `v1.1`. |
| **SvelteKit 2 + Svelte 5 sharp edges.** Svelte 5 runes syntax differs from Svelte 4; LLM-trained examples frequently mix them. | Flashcard pre-read mandatory: any `$:` reactive blocks → `$state`/`$derived` runes per Svelte 5. First `.svelte` file under `admin/` that an agent writes gets a flashcard-style note if a Svelte-4 pattern leaks in. STORY-006-01 README notes the rune-only policy. |

**Dependencies:**
- SPRINT-03 shipped EPIC-000 (`cleargate-cli`), EPIC-004 (full Admin API surface), EPIC-005 (admin CLI 4 commands + `cleargate join`). No new database schema required — `admin_users` + `sessions` expectations from EPIC-004 already exist.
- New infra: **two GitHub OAuth apps** (web + device), Coolify sub-domain `admin.cleargate.<domain>` with TLS, Redis accessibility from the admin pod (same instance as MCP).
- New runtime deps: `@sveltejs/kit` ^2 · `svelte` ^5 · `vite` · `tailwindcss` ^4.2 · `daisyui` ^5.5 · `@fontsource-variable/inter` · `@auth/sveltekit` · `@auth/core` · `ioredis` · `lucide-svelte` · `chart.js` ^4 (lazy). Dev deps: `@playwright/test`, `vitest` (reuse pin from `mcp/`).
- MCP-side new dep: `@fastify/cors`.

## Metrics & Metadata

- **Expected Impact:** Closes PROPOSAL-003's v0.1 admin surface. Every EPIC-004 endpoint now has a visual path *and* a CLI path. Unblocks the public v0.9 "headless + UI alpha" — a root admin can on-board a team via UI, rotate tokens visibly, inspect audit history, and grant admin rights to a second human via `/settings`. EPIC-001 (`cleargate stamp`) and EPIC-002 (wiki) remain the only unshipped Epics after this sprint.
- **Priority Alignment:** Platform priority = **High** (closes v0.1 scope; unblocks public demo). Codebase priority = **High** (every admin-authored flow that survives past alpha touches this UI).

---

## Execution Guidelines (Local Annotation — Not Pushed)

### Starting Point

**M1 — STORY-004-08 (auth/exchange) lands first.** It is the only hard prerequisite for STORY-006-02; without it, the UI cannot issue admin-scoped calls, which blocks every subsequent EPIC-006 story. STORY-005-06 (CLI login) is **parallelizable with M1–M5** and should be assigned to a second Developer track so the OAuth-path closeout doesn't queue behind UI work.

### Relevant Context

- **Design Guide:** `knowledge/design-guide.md` is authoritative for color tokens, typography, radius, elevation, and component patterns. Do not substitute stock DaisyUI themes. Every EPIC-006 story's Architect plan must cite the exact §-numbers it consumes.
- **Admin API contract:** `mcp/src/admin-api/schemas.ts` (Zod source) + `mcp/src/admin-api/__snapshots__/openapi.test.ts.snap` (hand-authored OpenAPI 3.1) — the UI's typed `mcp-client.ts` imports request/response Zod schemas directly (same pattern as `cleargate-cli/src/admin-api/client.ts` from SPRINT-03 M3). Snapshot-drift test (`cleargate-cli/src/admin-api/__tests__/snapshot-drift.test.ts`) extends to cover the new auth endpoints.
- **Session storage:** shared Redis instance with MCP (`REDIS_URL`). Key namespace: `cg_session:<cookie_value>` → JSON `{ github_handle, github_user_id, expires_at }`. Cookie name: `cg_session`. Adapter lives at `admin/src/lib/auth/redis-adapter.ts` (STORY-006-02 owns the shape; STORY-004-08 must read the same shape).
- **Admin-JWT issuance:** existing `issueAdminToken()` in `mcp/src/auth/admin-jwt.ts` (STORY-004-01). STORY-004-08 and STORY-005-06 both reuse it — **do not duplicate JWT signing**.
- **CORS:** currently absent on `/admin-api/v1/*`. Add `@fastify/cors` in either STORY-004-08 or STORY-006-02 (whichever architect plan dispatches first) with origin from `CLEARGATE_ADMIN_ORIGIN`. Credentialed for `/auth/exchange` only; non-credentialed elsewhere.
- **OAuth apps registration:** pre-sprint ops task. Web app callback: `https://admin.cleargate.<domain>/auth/callback/github`. Device app: no callback. Both scope `read:user`.
- **Lighthouse budget:** 90+ on `/` (dashboard). STORY-006-08 (stats) exempted — Chart.js lazy-load covers its cost.
- **Install modes:** admin/ is NOT a published npm package — it ships as a Docker image only. No `npx @cleargate/admin`.

### Constraints

- **No stock DaisyUI theme.** No `theme: "corporate"`, `theme: "light"`, `theme: "dark"` under `admin/`. Grep is a QA gate.
- **No Svelte 4 patterns.** Rune syntax only (`$state`, `$derived`, `$effect`). No `$:` reactive blocks.
- **No plaintext secrets in localStorage or sessionStorage.** Tokens exist only as in-memory Svelte state inside the modal component, lost on unmount.
- **No SSO / SAML / password auth.** GitHub OAuth is the only v1 login path.
- **No i18n.** English-only v1; i18n hooks can land in v1.1 without schema change.
- **No background workers / cron inside the admin container.** All compute is request-scoped; scheduled roll-ups are a stats-v2 item for v1.1.
- **No dark mode.** `cleargate-dark` theme variant deferred to v1.1 (Design Guide §2.2 notes the planned token shape).
- **No admin mobile polish.** Usable, not optimized.
- **No third-party analytics / telemetry.** pino logs to stdout, Coolify captures — that is the entire observability stack for v1.

### Milestones within sprint

1. **M1 — Auth prerequisite (STORY-004-08):** `POST /admin-api/v1/auth/exchange` against real Postgres + Redis + a seeded session row. Blocks STORY-006-02. Ships `@fastify/cors` registration as a side effect. Single-story milestone so the UI track can start M2 as soon as this commits.
2. **M2 — Foundation (STORY-006-01 → STORY-006-02):** scaffold first, then OAuth session. Sequential — 02 depends on 01's theme tokens + shell + mcp-client stub + Playwright config. After M2 closes, a real GitHub OAuth happy-path E2E passes in Playwright (session cookie set → exchange → admin JWT in memory → authenticated `GET /admin-api/v1/projects` returns `[]`).
3. **M3 — CRUD pages (STORY-006-03, 006-04, 006-05):** parallelizable across three Developer subagents. Each story consumes the shell + mcp-client + exchange middleware from M2. STORY-006-05 (tokens modal) is the riskiest — the plaintext-once discipline has QA gates.
4. **M4 — Read-only views (STORY-006-06, 006-07, 006-08):** parallelizable across three subagents. STORY-006-08 (stats) lazy-imports Chart.js; bundle assertion per §Risk row 5.
5. **M5 — Admin management + deploy (STORY-006-09 → STORY-006-10):** sequential. Settings page first (small L1), then Dockerfile + Coolify runbook. M5 closes with a live `https://admin.cleargate.<domain>` at HTTPS plus an `admin/coolify/DEPLOYMENT.md` rerunnable by ops.

**Parallel track — STORY-005-06 (CLI login):** runs alongside M2/M3 on a separate Developer assignment. Does not consume UI infrastructure; depends only on SPRINT-03 admin-auth file shape. Lands whenever QA is green.

**End-to-end exit criteria (after M5 + parallel track close):**
- A cold `admin.cleargate.<domain>` browser session → GitHub login → project create → token issue (modal shown) → token reload (no plaintext) → audit row visible on `/projects/:id/audit` within 5s.
- A cold shell → `cleargate-admin login` → GitHub device flow in browser → `~/.cleargate/admin-auth.json` written → `cleargate-admin create-project` succeeds without `CLEARGATE_ADMIN_TOKEN`.

### Sprint Definition of Done

**Engineering DoD**
- [ ] All 12 Stories merged (10 EPIC-006 + 1 EPIC-004 closeout (004-08) + 1 EPIC-005 closeout (005-06))
- [ ] `npm run typecheck` clean in `admin/`, `mcp/`, `cleargate-cli/` (workspace)
- [ ] `npm test` passes in `admin/` — unit suites for `mcp-client.ts` (fetch mocked, exchange-on-401 retry), Redis session adapter (ioredis mocked), and one component test per interactive component (TokenModal, DateRangePicker, RequestsChart)
- [ ] Playwright E2E passes: OAuth happy path · non-admin rejection · token modal + reload flow · audit filter roundtrip · stats chart render
- [ ] `npm test` in `mcp/` still green, with new `admin-api/auth-exchange.test.ts` + `admin-api/auth-device.test.ts` integration suites
- [ ] `npm test` in `cleargate-cli/` still green, with new `scripts/commands/login.test.ts` unit suite (per STORY-005-06)
- [ ] Design-Guide compliance grep: `rg "theme: \"(corporate|light|dark)\"" admin/` returns zero matches
- [ ] Svelte-5 rune grep: `rg "^\s*\$:" admin/src` returns zero matches (no Svelte-4 reactive blocks)
- [ ] Bundle assertion: dashboard route (`/`) does not load `chart.js` — verified via Playwright network inspection
- [ ] Lighthouse CI on `/` scores ≥ 90 performance (headless Chrome in Playwright, `admin.cleargate.<domain>` local preview)

**Ops DoD**
- [ ] Two GitHub OAuth apps registered (web + device); IDs captured in a Coolify secrets note
- [ ] Coolify service for `admin.cleargate.<domain>` deployed with TLS (subdomain + cert issued)
- [ ] Coolify service for MCP redeployed with the new `/admin-api/v1/auth/{exchange,device/*}` routes + `@fastify/cors` env wiring (`CLEARGATE_ADMIN_ORIGIN=https://admin.cleargate.<domain>`)
- [ ] `admin/coolify/DEPLOYMENT.md` runbook executed end-to-end; recorded time-to-deploy from blank Coolify project
- [ ] Two-terminal E2E run by hand in prod-like env: UI admin logs in, issues token, sees modal; CLI admin logs in via device flow in the second terminal, runs `create-project`
- [ ] First npm publish of `@cleargate/cli@0.1.0-alpha.1` (SPRINT-03 carryover) — manual, maintainer machine, verify `npx` on cold shell

**SPRINT-03 carryover (close before or during SPRINT-04 kickoff, not blocking SPRINT-04 engineering start)**
- [ ] Three-install-mode matrix smoke passes (`npx`, `npm i -D`, `npm i -g` all print matching `--version`)
- [ ] Two-terminal E2E for `cleargate join` recorded
- [ ] `cleargate-cli/README.md` expansion (install modes, admin-JWT sourcing, `cleargate join` usage, TokenStore backends, troubleshooting)
- [ ] MCP Coolify redeploy (SPRINT-03 `invites` migration + `/join/:invite_token` route) — fold into the SPRINT-04 MCP redeploy above
- [ ] Fix `.claude/hooks/token-ledger.sh` to capture all agent types (SPRINT-03 REPORT.md loop-got-wrong #1) — **gate for reliable cost reporting on this sprint's REPORT**
- [ ] Commit currently-untracked `.cleargate/sprint-runs/SPRINT-03/plans/W2.md`
- [ ] Strip the 🟡 ambiguity marker text from STORY-000-04 body (frontmatter already Done)

### Scope adjustments to watch for mid-sprint

- **If `@auth/sveltekit` Redis adapter is brittle** → fall back to in-memory sessions + a custom cookie-only approach signed via `jose`. Drops the "shared Redis with MCP" benefit (session invalidation on admin-user deactivation no longer cross-cuts); accept the tradeoff and add it to v1.1 tech-debt list.
- **If GitHub device flow requires org approval** (happens on some OAuth app scopes) → STORY-005-06 may need to request app-install approval; schedule ops ticket, don't block the sprint on it. `cleargate-admin login` ships behind a docs note if blocked.
- **If Chart.js lazy-import still blows the Lighthouse budget** → swap to a minimal SVG bar chart (no lib). EPIC-006 Q2 override from stock decision already named Chart.js; document the revert if triggered.
- **If Playwright-in-CI is slow** (> 3 min per full suite) → keep full suite local; CI runs a smoke-only subset (OAuth + modal). Document split in `admin/README.md`.
- **If CORS preflight breaks same-origin-looking dev workflows** (`localhost:5173` vs `localhost:3000`) → add a wildcard dev-only origin gated on `NODE_ENV=development` — not a prod code path.

### Commit cadence

One commit per Story = 12 commits. Tests must pass before each commit. Setup commits allowed for (a) workspace-level `admin/` addition to root `package.json` (lands with STORY-006-01), (b) `@fastify/cors` wiring if architect M1 decides to split it (lands with STORY-004-08 or 006-02). Budget: up to 2 setup commits + 12 story commits = **14 commits max**. STORY-005-06 commits to the `mcp-cleargate/cli` workspace root (new `scripts/commands/login.*` in mcp plus any shared helpers in `cleargate-cli/src/admin-api/`); both repos' tests must be green for a single logical commit.

### Next Sprint Preview

**SPRINT-05** = EPIC-001 (Document Metadata Lifecycle) — 6 Stories. `cleargate stamp` CLI + `stamp-frontmatter` helper + `codebase-version` helper + MCP push-time `server_pushed_at_version` + Protocol §11. After SPRINT-05, Sponsored-doc hooks carry frontmatter through the full Plan → Execute → Deliver loop.

**SPRINT-06** = EPIC-002 (Knowledge Wiki Layer) — 9 Stories. `wiki-ingest` / `wiki-query` / `wiki-lint` subagents + `cleargate wiki {build,ingest,lint}` CLI + init-writes-PostToolUse-hook + synthesis templates + Protocol §10.
