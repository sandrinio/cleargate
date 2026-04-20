---
sprint_id: "SPRINT-08"
remote_id: null
source_tool: "local"
status: "Active"
start_date: "2026-04-20"
end_date: null
activated_at: "2026-04-20T14:00:00Z"
completed_at: null
synced_at: null
created_at: "2026-04-20T14:00:00Z"
updated_at: "2026-04-20T14:00:00Z"
created_at_version: "post-SPRINT-06"
updated_at_version: "post-SPRINT-06"
context_source: "EPIC-011_End_To_End_Production_Readiness.md"
epics: ["EPIC-011"]
---

# SPRINT-08: End-to-End Production Readiness

## Sprint Goal

Ship **EPIC-011 (End-to-End Production Readiness)** — close the four remaining onboarding blockers (CLI wire-up · service-token middleware · bootstrap-root CLI · Coolify deploy execution) so that a brand-new user can run `npm install cleargate && cleargate init && cleargate join <invite-url> && cleargate sync` against a production `mcp.cleargate.<domain>` + `admin.cleargate.<domain>` in under 5 minutes. After this sprint, ClearGate v1-alpha is demonstrably shippable.

## Consolidated Deliverables

### EPIC-011 — End-to-End Production Readiness (4 stories)

- [`STORY-011-01`](STORY-011-01_Wire_Acquire_Into_CLI.md): Wire `acquireAccessToken` into sync / pull / push / sync-log / conflicts / mcp-client — single-flight cache, env-first fallback, clear `no-stored-token` error · **L1**
- [`STORY-011-02`](STORY-011-02_Service_Token_Middleware.md): Service-token middleware on `/mcp` — bcrypt-compare plaintext Bearer against `tokens.token_hash`, chain order JWT → service-token → 401, pino redaction holds · **L2**
- [`STORY-011-03`](STORY-011-03_Bootstrap_Root_Admin.md): `cleargate admin bootstrap-root <handle>` — idempotent SQL via `pg`, refuses second root without `--force`, scrubs DATABASE_URL password from errors · **L2**
- [`STORY-011-04`](STORY-011-04_Coolify_Deploy_Execution.md): Coolify deploy execution — register 2 prod GitHub OAuth apps, provision subdomains with TLS, run bootstrap-root, E2E onboarding verification, record time-to-deploy · **L2** (ops-heavy; zero new code)

**Total: 4 stories, 1 Epic. Complexity: 1 × L1 + 3 × L2.**

## Milestones

- **M1 — STORY-011-01** (CLI wire-up). Unblocks all production CLI flows. Fully parallelizable with M2.
- **M2 — STORY-011-02** (service-token middleware). Validates CI-style Bearer auth. Parallelizable with M1.
- **M3 — STORY-011-03** (bootstrap-root CLI). Depends on nothing; feeds M4.
- **M4 — STORY-011-04** (Coolify deploy execution). Requires M1 + M2 + M3 merged first — the prod smoke test directly exercises all three.

## Risks & Dependencies

**Status legend:** `open` · `mitigated` · `hit-and-handled` · `did-not-fire`. QA updates column at each milestone; reporter audits at sprint close.

| ID | Risk | Mitigation | Owner | Status |
|---|---|---|---|---|
| R1 | **Single-flight cache key collision across profiles.** In-memory cache in `acquireAccessToken` keyed only on `mcpUrl` would collapse two different profiles' tokens in the same CLI run. | Cache key = `${profile}::${mcpUrl}`. Unit test seeds two profiles in the same invocation; asserts two distinct `/auth/refresh` round-trips. Architect M1 plan names this explicitly. | **STORY-011-01** | `open` |
| R2 | **bcrypt.compare linear scan becomes O(n) on tokens.** Project with 500 CI tokens → 500 bcrypt compares per invalid Bearer call. Attacker can DoS. | SELECT scopes to non-revoked non-expired only (small set in practice). Add a "shape guard" before loop: plaintext must match `^[A-Za-z0-9_-]{40,}$` regex (matches `mcp/src/admin-api/tokens.ts:47-49` `generatePlaintext()` which emits ~43-char base64url with no prefix) — rejects JWT-looking strings + obvious garbage before entering bcrypt. Rate-limit on MCP's existing anonymous bucket (600/min post-SPRINT-06 bump) kills the DoS vector. | **STORY-011-02** | `open` |
| R3 | **bcrypt timing side-channel.** "No rows returned" (fast) vs "rows returned, no match" (slow) leaks existence of any tokens for a project. | Always run at least one bcrypt.compare against a well-known fixture hash when no candidate rows exist, so the code path's wall-clock is roughly constant. Scenario already in STORY-011-02 Gherkin (bcrypt timing test). | **STORY-011-02** | `open` |
| R4 | **`pg` added as cleargate-cli runtime dep.** First net-new runtime dep since SPRINT-03. Must not balloon install size or introduce native-build requirement. | Pin `pg: ^8.12.0` (matches `mcp/package.json` pin — already vendored at root node_modules). `@types/pg: ^8.11.10` is devDep only. Confirm `npm pack --dry-run` shows ≤ 200KB delta on the published tarball. Architect M3 verifies pre-merge. | **STORY-011-03** | `open` |
| R5 | **DATABASE_URL password leak in error paths.** `pg` error messages sometimes echo the full connection string. | Scrubber wraps `pg.Client` errors: `err.message.replace(/:\/\/[^@]+@/, '://***@')` before print. Gherkin scenario "password scrubbed" locks this behavior. | **STORY-011-03** | `open` |
| R6 | **Two GitHub OAuth apps (prod) must be registered by the human operator**, not the agent. Missing registration = M4 halts with no recovery inside the sprint. | SPRINT-08 pre-flight: before spawning the M4 developer agent, the orchestrator confirms with the Vibe Coder that both prod OAuth apps exist + credentials are captured in Coolify. If not, M4 is flagged as "blocked on ops" and the sprint reports success on M1–M3 with M4 deferred to SPRINT-08-continuation. | **STORY-011-04** + **orchestrator** | `open` |
| R7 | **Coolify deploy may surface latent env or CORS regressions** that the post-SPRINT-06 hotfixes missed. | M4 DoD includes the 7-item E2E smoke checklist (subdomain TLS, OAuth round-trip, clean-laptop drill, service-token curl, keychain rotation, `/auth/refresh` count, placeholder-free runbook). Any regression → hotfix in-sprint before sprint close, not deferred. | **STORY-011-04** | `open` |
| R8 | **Service-token middleware chain order accidentally breaks JWT path.** Fastify preHandler chain is sensitive — registering service-token before JWT verify, or returning early from JWT verify's failure branch without try-service-token, regresses the common case silently. | STORY-011-02 Gherkin locks two scenarios: (a) valid JWT still works; (b) JWT-shaped-but-invalid falls through to service-token path. Both MUST pass as integration tests against real Postgres. | **STORY-011-02** | `open` |

**Dependencies:**

- SPRINT-06 shipped all 13 Admin UI stories + post-sprint hotfixes (hotfix commit `98507d2` on outer, `c8c171e` on mcp/).
- SPRINT-07 shipped EPIC-010 (Multi-Participant MCP Sync) — all 8 stories. Sync is live; this sprint does not touch the sync layer.
- Existing infra: `tokens` + `members` + `admin_users` tables (no migrations in this sprint). `bcrypt` pinned in `mcp/package.json`. `JwtService` in `mcp/src/auth/jwt.ts`. `acquireAccessToken` in `cleargate-cli/src/auth/acquire.ts` (shipped as hotfix `98507d2`).
- New deps: `pg: ^8.13.1` + `@types/pg: ^8.11.10` in `cleargate-cli/` (STORY-011-03).
- External infra: production-registered GitHub Web OAuth app (admin callback), production-registered GitHub Device OAuth app (device flow), DNS for `admin.cleargate.<domain>` + `mcp.cleargate.<domain>`, Coolify project with both subdomain services. All this is ops-hands work, not agent work — orchestrator validates presence before M4 kick-off.

## Metrics & Metadata

- **Expected Impact:** ClearGate becomes demonstrably shippable as v1-alpha. The four CLI commands that matter (`join` / `whoami` / `sync` / `push`) work end-to-end from a fresh laptop against production. Service-token middleware closes the "tokens stored but never verified" dead-prop gap from SPRINT-06. Bootstrap-root turns the first-install story from `docker exec psql INSERT …` into a single idempotent CLI line.
- **Priority Alignment:** Platform priority = **Critical** (onboarding is 0% working today despite 13 passing admin UI stories). Codebase priority = **High** (every line of code touched is wire-up of already-shipped components; no new architecture).

---

## Execution Guidelines (Local Annotation — Not Pushed)

### Starting Point

**M1 and M2 run in parallel as two developer tracks.**

- **Track A — M1 (STORY-011-01):** Pure CLI-side wire-up. No MCP changes. Integration tests already have shape (mock `acquireAccessToken`, assert call count = 1). Expected duration: 2–3 hours including test writing.
- **Track B — M2 (STORY-011-02):** New middleware file under `mcp/src/auth/` + chain modification + integration tests against real Postgres (docker-compose). No CLI changes. Expected duration: 3–4 hours.

After M1 and M2 both land + QA-approved, **M3 (STORY-011-03)** runs as a third track against a local Postgres. Expected duration: 2–3 hours.

**M4 (STORY-011-04)** runs LAST, after M1/M2/M3 all merged. Its entire value is the prod smoke test which exercises all three prior stories. Before spawning M4's developer, orchestrator confirms with Vibe Coder:
- [ ] Two prod GitHub OAuth apps registered (web + device).
- [ ] DNS records exist for `admin.cleargate.<domain>` + `mcp.cleargate.<domain>`.
- [ ] Coolify project created with two services (MCP + Admin).

If any of the above are missing, M4 is flagged `blocked-on-ops` and the sprint closes on M1–M3 passing. M4 becomes SPRINT-08-continuation or merges into SPRINT-09.

### Relevant Context

- **CLAUDE.md** — entire "How work gets done" section governs four-agent loop.
- **EPIC-011** — all architectural rules, target file list, and interrogation-loop answers live there.
- **Post-SPRINT-06 hotfix commit** `98507d2` (outer) — landed `acquireAccessToken`, `whoami`, CORS + rate-limit bumps, Vite env fix, audit-page loop fix, live-smoke harness.
- **FLASHCARD.md** — grep for `#auth`, `#service-token`, `#bootstrap`, `#coolify`, `#pg` before each story start.
- **STORY-011-03** adds `pg` as a cleargate-cli runtime dep. This is explicitly authorized by EPIC-011 §0 agent_context target_files and is the only new runtime dep in this sprint.

### Constraints

- Zero new MCP architecture. The service-token path reuses `tokens` table (existing) + `bcrypt` (pinned) + `JwtService` (existing). No new schema. No new tables.
- Zero new deps on the admin/ package. All admin-side work was completed in SPRINT-06 + post-sprint hotfixes.
- Service-token middleware NEVER wired to `/admin-api/v1/*` — admin routes stay JWT-only. Tokens are member-scoped; mixing would require schema change.
- Bootstrap-root command NEVER deletes rows. Promotion via `--force` only sets `is_root=true`; does not demote or revoke other roots.
- Coolify deploy NEVER sets `CLEARGATE_DISABLE_AUTH=1` in either production service. That env is dev-only.
- Every story commit format: `feat(epic-011): STORY-011-NN <short desc>`. Per CLAUDE.md commit conventions.
- Every agent invocation MUST grep `.cleargate/FLASHCARD.md` for relevant tags before starting, per flashcard protocol.
