# SPRINT-08 Report: End-to-End Production Readiness

**Status:** SHIPPED (all 4 stories, live in production)
**Window:** 2026-04-20 → 2026-04-21 (single-day sprint; 4-story EPIC-011; M1+M2 parallel → M3 → M4 ops)
**Headline:** ClearGate v1-alpha is demonstrably shippable. A brand-new laptop runs `npm install cleargate && cleargate join <invite> && cleargate sync` against prod TLS and exits 0 with zero env-var paste. Admin UI + MCP live behind Coolify TLS at `admin.cleargate.soula.ge` and `cleargate-mcp.soula.ge`, fronted by 105 items bulk-pushed and rendering with full markdown.

---

## Stories Delivered

| Story | Title | L | Commit(s) | QA |
|---|---|---|---|---|
| STORY-011-01 | Wire `acquireAccessToken` into sync/pull/push/sync-log/conflicts/mcp-client | L1 | `b884a35` | APPROVED (766 pass / 0 fail / 4 skip) |
| STORY-011-02 | Service-token middleware on `/mcp` (JWT → service-token → 401) | L2 | `5cf11cb` (mcp) | APPROVED |
| STORY-011-03 | `cleargate admin bootstrap-root <handle>` CLI — idempotent + `--force` | L2 | `030b682` + `ceeb451` (mcp) | APPROVED (789 pass / 0 fail / 4 skip; 23 new tests) |
| STORY-011-04 | Coolify prod deploy + OAuth registration + E2E smoke drill | L2 (ops) | see "Hotfixes" | Human-validated (live drill green) |

**Totals:** 4 of 4 shipped. Zero carried over. 1 × L1 + 3 × L2 as planned.

---

## Risks — As Shipped

| ID | Risk | Outcome | Evidence |
|---|---|---|---|
| R1 | Single-flight cache key collision across profiles | **Mitigated** | `${profile}::${mcpUrl}` key; test `cleargate-cli/test/auth/acquire.test.ts:250` seeds profileA+profileB → asserts 2 fetch calls |
| R2 | bcrypt DoS via unbounded compare loop | **Mitigated** | Shape guard `^[A-Za-z0-9_-]{40,}$` (not `cg_` — matches live `generatePlaintext()` base64url) rejects JWT-shaped + garbage pre-bcrypt; rate-limit 600/min in front |
| R3 | bcrypt timing side-channel on zero-rows | **Mitigated** | `FIXTURE_HASH` always-run branch in `mcp/src/auth/service-token.ts`; Gherkin timing test p99 within 2× p50 |
| R4 | `pg` bloats CLI tarball | **Mitigated** | ~8.6 KB dist delta vs. 200 KB budget; pinned `^8.12.0` to match mcp |
| R5 | DATABASE_URL password leak in pg error strings | **Mitigated** | `scrubPassword` regex + unit test in `bootstrap-root.test.ts` |
| R6 | Two prod GitHub OAuth apps must be registered by human | **Hit — handled by operator** | Both apps registered during M4 kickoff |
| R7 | Coolify deploy surfaces latent env/CORS regressions | **Hit-and-handled** | 11 in-sprint hotfix commits (next section); all resolved before sprint close per DoD |
| R8 | Service-token chain order breaks JWT path | **Mitigated** | Integration tests in `mcp/src/auth/service-token.test.ts`; `0afa113` caught a separate `client_id` bug at smoke-test time, not a chain-order regression |

R7 was the story of this sprint. The risk was priced in ("hotfix in-sprint, not deferred"), and the mitigation worked: every surfaced regression was diagnosed + patched + re-deployed inside the M4 window.

---

## What We Built (Business↔IT value)

The four gaps that individually blocked 100% of day-one usage — CLI ignoring the keychain, Admin-UI tokens being dead props, first-root-admin requiring `docker exec psql`, and nothing actually running on a domain — are all closed. A deployed, TLS-fronted ClearGate instance now accepts invites, verifies both JWT and service-token auth paths, seeds the first admin idempotently, and rendered 105 pre-existing archive items (titles, frontmatter, markdown body) in the production Admin UI on first push. The value unlock is not per-story; it is the five-minute onboarding claim becoming demonstrably true against a live URL.

---

## Hotfixes + Surprises (M4 prod-smoke phase)

Each discovered during M4 execution and patched inside the sprint window.

- `92dc75c` (mcp) — `package-lock.json` out-of-sync with `package.json` (SPRINT-07 added `@linear/sdk` without regenerating lockfile). `npm ci` rebuilt.
- `87b4ff4` (outer) + `ceeb451` (mcp) — dropped `mcp/` from root workspaces + `admin/Dockerfile` because the cleargate-admin mirror repo does not contain the nested `mcp/` tree.
- `93ed1bb` — build `cleargate-cli` **before** `admin` in the Dockerfile; `cleargate/admin-api` import resolution depends on `cleargate-cli/dist/`.
- `d8e3c2e` — switched admin MCP-URL resolution from `import.meta.env` to `$env/dynamic/public`; intermediate-variable indirection was breaking Vite's static replacement.
- `7b65ada` — `NODE_ENV=production` in the Dockerfile **builder stage** (was `development`). SSR and client chunks were generating mismatched `__sveltekit_*` var names → client crashed on hydration.
- `d93600a` — read `SESSION_COOKIE_DOMAIN` env in auth hooks so `cg_session` scopes to `.soula.ge` for cross-subdomain cookies to MCP.
- `0afa113` (mcp) — service-token claims must **omit** `client_id: 'service-token'`; `items.updated_by_client_id` is `uuid()` with FK to `clients.id`, and the string `"service-token"` violated the type on `push_item` INSERT.
- `e9f6b76` — CLI `push.ts` derives `payload.title` from body H1 when frontmatter lacks a `title:` key; 0 of 65 archive items had one, and the admin UI was rendering empty rows.
- `b81f381` (mcp) — `list_items` returns `current_payload` on `ItemSummaryDto` so admin can render without a second fetch.
- `e56b7b5` + `a853393` + `07a9c03` — admin UI adopts `PayloadViewer`, renders `payload.body` in a Content card, and wires `marked` + `isomorphic-dompurify` for sanitized markdown.

---

## What Surprised Us

1. **Service-token `client_id` string violated a UUID FK we didn't know existed.** `AccessClaims.client_id` is plumbed into `items.updated_by_client_id` on every `push_item`. Service-token synthetic claims needed to **omit** the field — not set it to `'service-token'`. Caught only when a live push_item failed with an FK violation; no mocked test reached it. A string-shaped claim field can silently have a typed FK waiting downstream.
2. **NODE_ENV split-brain in the Dockerfile builder.** Coolify injects `NODE_ENV=production` at build time. SvelteKit + Vite react by generating different internal variable names for SSR vs. client bundles. The bundles compiled cleanly, shipped cleanly, and crashed on first hydration with a silent reference error.
3. **`import.meta.env` + intermediate variable = Vite static replacement silently breaks.** The admin code indirected `PUBLIC_MCP_URL` through a local const; Vite's replacer didn't trace it. Rule: always `$env/dynamic/public` for runtime-configurable envs.
4. **Zero of 65 archive work items had a `title:` frontmatter key.** Push path assumed it; admin UI rendered 65 empty rows. The title is the body's H1 in every file. Templates never required `title:`, and nobody noticed until 105 items were staring back empty.
5. **Package-lock drift from a different sprint.** SPRINT-07 added `@linear/sdk` without regenerating `mcp/package-lock.json`. `npm ci` broke on first Coolify build. Invisible on dev machines because `npm install` reconciles lazily.
6. **Root-workspaces claiming a nested `mcp/` that doesn't exist in the deploy mirror.** Outer repo lists `mcp/` in its workspaces array for local dev; the cleargate-admin deploy mirror does not ship `mcp/`, and `npm install` exploded looking for the missing workspace. Split the deploy artifact from dev convenience.
7. **`current_payload` eager-return was the pragmatic fix over a new endpoint.** Admin couldn't render without a second fetch; the proper `GET /admin-api/v1/items/:clid` endpoint stays deferred. Perf-vs-endpoint-count tradeoff to revisit in SPRINT-09.

---

## Metrics

- **Commits (outer):** 11 between `98507d2` and `07a9c03` — 7 M4 hotfixes, 3 SPRINT-08 stories + scaffold, 1 post-SPRINT-06 tail.
- **Commits (mcp):** 5 since sprint start — `5cf11cb` (M2), `ceeb451` (M3 runbook), `92dc75c` (lockfile), `0afa113` (FK fix), `b81f381` (admin payload plumbing).
- **Lines changed:**
  - Outer: ~993 lines STORY-011-01 · ~675 lines STORY-011-03 · ~1,406 lines sprint artifacts + E2E harness · ~6,500 lines across the 7 M4 hotfix commits (most lockfile + workspace churn, not prod code).
  - MCP: ~596 lines STORY-011-02 · ~98 lines service-token FK fix + admin payload plumbing.
- **Tests added:** 766 → 789 in CLI (23 new; `bootstrap-root.test.ts` 416 lines + `acquire.test.ts` 383 lines + `sync-acquire.test.ts` 354 lines). MCP gained `service-token.test.ts` at 419 lines.
- **Time-to-deploy (M4):** first successful prod `cleargate sync --check` reached in one evening of hotfix iteration; exact wall-clock not instrumented (gap for SPRINT-09).
- **Token ledger:** 5 rows, all tagged `agent_type: architect` against `work_item_id: EPIC-010` (mis-tagged — per flashcard `2026-04-19 #reporting #hooks #ledger #subagent-attribution`). Per-story / per-agent cost is **not computable from this sprint's ledger**.

---

## Carry-Forward into SPRINT-09 (EPIC-012 already Ready)

1. **Sprint-artifact sync.** 5 sprint files + REPORT.md + architect plans + FLASHCARD.md cannot be pushed via `push_item` — MCP enum lacks `"sprint"` and `"project-metadata"`. EPIC-012 in `pending-sync` with 5 stories covers this.
2. **Admin UI polish.** (a) `By <uuid>` on item detail should resolve to `github_handle`; (b) version-timeline row click → show payload for that version (requires `/items/:clid/versions` to return payload); (c) `GET /admin-api/v1/items/:cleargate_id` single-item endpoint (list-and-filter-by-200 workaround still in place).
3. **Test debt.** Auth-exchange rate-limit test stale (expects 60/min, prod is 600 since SPRINT-06 bump). Inter Variable font 404s (cosmetic). STORY-008-03 legitimately fails readiness gate on historical TBDs in body.
4. **Drafts that stay drafts.** PROPOSAL-008 + CR-001 remain `approved: false` — correct; no action needed.

---

## Closing

SPRINT-08 shipped the production-readiness stretch it was planned to ship, on a one-day calendar, with all four risks that could have deferred M4 (R6, R7 especially) handled in-sprint. The four-agent loop produced M1–M3 cleanly; M4 was human-driven and surfaced 11 regressions that were all patched before sprint close. ClearGate v1-alpha is live.

Next up: **SPRINT-09 / EPIC-012** (MCP enum closures for sprint-artifact sync + admin polish + test-debt catchup). Plan lives in `.cleargate/delivery/pending-sync/`.
