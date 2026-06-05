# STORY-047-03 — Architect Post-Flight Final Gate

role: architect
Story: STORY-047-03 — POST /admin-api/v1/connections/verify (per-kind, fail-closed, project_id-always)
Repo: mcp @ `story/STORY-047-03`  ·  Dev commits: `2de167a` (route+tests) → `d9a2cda` (rework: deterministic rate-limit via cached svc-token auth)
Self-gate: typecheck CLEAN · `npm test` serial = **548 passed / 0 failed / 1 skipped** (real PG18@5433 + Redis8@6380)

## Result: PASS

## Gate checks

### (1) Red tests byte-unchanged — redTestsUnmodified: true (with caveat)
- The red suite `test/connections-verify-endpoint.red.node.test.ts` was introduced by `2de167a` and is **NOT touched by `d9a2cda`** (rework commit changed only `src/admin-api/index.ts`). Confirmed: `git show d9a2cda --name-only` = `src/admin-api/index.ts` only.
- **Caveat (workflow, not acceptance):** this branch has **no separate QA-Red baseline commit** — the red test arrived in the Developer's first commit `2de167a` bundled with the impl (reflog: `checkout main → 2de167a → d9a2cda`). There is therefore no on-branch QA-Red SHA to byte-diff against. I judged the suite directly: it is a genuine, unweakened acceptance suite — 10 §2.1 scenarios + the indexed-lookup invariant (Scenario 4 scan-probe denies correct-secret/unknown-selector) + the pool-headroom INVARIANT with a real positive control (burst must reach a MOUNTED route, else RED). No assertion is softened; all run against real PG/Redis; the one allowed stub is the dead-port fail-closed handle. The rework commit demonstrably did not weaken it.

### (2) File surface vs §3.1 (+ SDR additions)
Six files; all justified:
- `src/admin-api/connections.ts` — §3.1 (verify route + per-kind dispatch + SDR-1b mint-format fix). ✓
- `src/db/client.ts` — §3.1 (pool headroom; `buildVerifyPool` + `VERIFY_POOL_MAX`, falls back to `PG_POOL_MAX` so the test pin is honored). ✓
- `test/connections-verify-endpoint.red.node.test.ts` — §3.1 (create). ✓
- `src/admin-api/index.ts` — SDR-approved registration (`registerConnectionsVerifyRoute` on a scoped instance: service-token preHandler FIRST, dedicated `bucket:'verify'` limiter SECOND; d9a2cda added a short-TTL Redis positive cache `verify:svcauth:<sha256>` to make Scenario 9 deterministic — only successful resolutions cached, revoke still lands via `rev:token:<id>` re-check + TTL). ✓
- `src/middleware/rate-limit.ts` — additive optional `bucket?` param → `rl:anon:verify:<ip>`; default key shape unchanged for all existing callers. Faithful to SDR-2 ("dedicated limiter keyed on a verify-specific bucket"); §3.1 listed it reuse-only but the bucket isolation is the minimal extension SDR demanded. Not drift. ✓
- `src/server.ts` — production wiring of `buildVerifyPool`/`verifyDb` into `registerAdminApi` + onClose `verifyPool.end()`. Necessary so the new pool option is not dead code in prod; analogous to the approved index.ts registration. ✓
**No off-surface drift.**

### (3) No new runtime dependency
`git diff a0c7f1a..d9a2cda -- package.json package-lock.json` = empty. All primitives composed from main (`verifyAppToken`, `JwtService.verifyAccess`, `RevocationStore.isRevoked`, `buildAnonymousRateLimit`, `buildServiceTokenAuth`, atomic pairing consume). No reimplementation. ✓

### (4) Cross-Cutting Rules
- **Rule 2 (indexed verify):** app_token → `verifyAppToken(db,{token_id:selector,secret})` (connections.ts:655); pairing → `WHERE pairings.id = selector` PK O(1) (`:611`). No whole-table scan; Scenario-4 scan-probe pins this at the boundary. ✓
- **Rule 3 (fail-closed):** single try/catch (`:516–543`) → 200 `{valid:false}`, never 5xx, never valid:true; `no_project_binding` coercion (`:541`). Scenario 7 (dead-port) passes for all 3 kinds. ✓
- **Rule 4 (Redis key shape):** member `revoked:<jti>` (`:446`); app_token `rev:apptoken:<id>` (`:668`). Matches live shapes. ✓
- **Rule 5 (additive):** no migration touched; pool is config-only. ✓
- **SDR-1b mint↔verify consistency:** mint now emits `<id>.<secret>` / `<token_id>.<secret>`, hashing the **secret only** (connections.ts mint diff). The 047-02 lifecycle red test was correctly NOT touched — its assertions are format-agnostic (code/token presence+length; stored hash is bcrypt-of-secret; no-leak), so they still pass. SDR's worry about "opaque-form assertions" did not materialize. Full 047-02 lifecycle suite is green. ✓

### (5) Boundary
No files under `cleargate-cli/src` or `.claude/`; no PM-tool SDK import in the diff. ✓

## Notes for orchestrator
- Workflow flag (non-blocking): QA-Red and Developer work landed in one commit (`2de167a`) — no discrete QA-Red baseline SHA on this branch. Acceptance is sound (suite is strong + unweakened, full gate green), but the "byte-diff vs QA-Red commit" check could not be mechanical. Recommend the orchestration ensure QA-Red commits before Dev on future stories so the immutability diff is verifiable, not inferred.
