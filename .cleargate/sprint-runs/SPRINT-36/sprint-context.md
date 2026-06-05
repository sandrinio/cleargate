---
sprint_id: "SPRINT-36"
created_at: "2026-06-04T14:52:20.371Z"
last_updated: "2026-06-04T14:52:20.371Z"
---

# Sprint Context

Per-sprint audit artefact. Populated at sprint init (M1 planning) and re-touched after each story merges. Referenced from every Developer/QA/Architect task brief so all agents start from the same baseline.

## Sprint Goal

Replace the M0 shared-secret stub with real, revocable, attributable identity — `mcp` mints + verifies all credentials, the broker **verifies (never mints)** and reacts to revocation **instantly** (kills in-flight turns) — across the pairing / member / app-token register lanes, so the relay loop is safe to expose beyond a single trusted machine.

## Locked Versions

Frozen dependency versions for this sprint. Orchestrator populates from `package.json` snapshots at sprint init; Developers must not upgrade these mid-sprint without an explicit CR.

| Package | Version |
|---------|---------|
| Node    | `>=24.0.0` |
| TypeScript | `^5.8.0` |
| (add rows per workspace below) |  |

## Test Stack

Repo-derived test conventions. Written best-effort by `cleargate init` (detector); the
orchestrator may correct any field per-sprint. Agents read this block as OVERRIDING their
built-in defaults — Developer/QA/Architect use these values, not any hardcoded runner.

**CROSS-REPO sprint — two runners. Use the runner for the repo the story lives in:**

| Field | `mcp/` (identity authority) | `connector/broker/` (verifying edge) |
|-------|------|------|
| Backend runner    | `npm test` → `node --test --test-concurrency=1 --experimental-test-module-mocks --env-file=.env --import tsx/esm 'src/**/*.node.test.ts' 'scripts/**/*.node.test.ts' 'test/**/*.node.test.ts'` | `npm test` → `tsx --test --test-concurrency=1 --test-reporter=spec 'src/**/*.node.test.ts' 'test/**/*.node.test.ts'` |
| Frontend runner   | n/a | n/a |
| Typecheck command | `npm run typecheck` (`tsc --noEmit`) | `npm run typecheck` (`tsc --noEmit`) |
| Red-test naming   | `*.red.node.test.ts` | `*.red.node.test.ts` |

**Real infra, NO mocks (DoD) — THIS RUN'S PORTS (remapped to avoid host conflicts; stack is already UP):** **Postgres 18.4** at `localhost:5433` (container `cleargate-postgres`, db/user/pw `cleargate`/`cleargate`/`dev-only-password`) and **Redis 8.8** at `localhost:6380` (container `cleargate-redis`). `mcp/.env` is already repointed (`DATABASE_URL=…@localhost:5433/cleargate`, `REDIS_URL=redis://localhost:6380`). **The broker (047-05/06) must also use `REDIS_URL=redis://localhost:6380`** — same Redis instance, since mcp publishes and the broker subscribes. Do NOT `docker compose up` the mcp redis/postgres (host 5432/6379 are taken by unrelated containers) — the standalone containers are the stack. The connector `shared` package must be built (`npm run build --workspace=shared`) before broker red tests, or they fail `ERR_MODULE_NOT_FOUND` instead of the intended missing-impl failure. Broker test scripts glob BOTH `src/**` and `test/**` — put red tests where the package globs.

_If unresolved at init: leave the table stubbed. The pre-gate scan emits a one-line
"test_stack unresolved — populate sprint_context.md §Test Stack" advisory and treats the
typecheck/test gate as advisory (not FAIL) until populated. (§0.5 backstop decision.)_

## Cross-Cutting Rules

Sprint-wide architecture rules every story MUST honour (from EPIC-047 + SPRINT-36 §2.3 + capacity design review).

1. **`mcp` = single identity authority.** `mcp` mints AND verifies all credentials (pairing codes, member tokens, app tokens). The broker **verifies, never mints**, and holds **no signing secret and no DB creds** — only its own scoped service token + a Redis subscriber connection.
2. **Indexed verify, O(1) — never a whole-table scan.** Do NOT inherit the whole-table bcrypt scan at `mcp/src/auth/service-token.ts:65-97`. Verify is an indexed lookup on a **non-secret selector**, then a single-row bcrypt compare. This is both the post-deploy-reconnect-storm fix and a tenant-isolation fix. App tokens are production credentials → bcrypt cost-12.
3. **Fail-closed everywhere.** Connect/verify fails closed when `mcp` is unreachable. A revoked credential reaches **zero** Connectors AND a revoke **kills the in-flight turn** — a connect-time check alone is insufficient: revocation rides Redis pub/sub (047-04 publish) → a dedicated broker `PSUBSCRIBE rev:*` subscriber (047-06) that drops in-flight turns. Measure the drop latency in tests.
4. **Redis key shape — verify before assuming.** The live store currently writes `revoked:<jti>` keys; match the **real** channel/key shape — don't assume `rev:` without grepping the existing revocation code first.
5. **Additive migrations only.** Drizzle, existing convention; new tables (`connections`/`pairings`/`app_tokens`), no destructive change; real Postgres-18 tests.
6. **EPIC-027 boundary.** All code lands under `mcp/**` or `connector/**`. No PM-tool SDK. **Nothing** enters the shipped `cleargate-cli/src` or `.claude/` planning payload.
7. **Cross-repo execution.** `mcp` stories → branch in `/Users/ssuladze/Documents/Dev/ClearGate/mcp` (own git, origin `sandrinio/cleargate-mcp`); connector stories → branch in `/Users/ssuladze/Documents/Dev/ClearGate/connector` (own git). Merges are **local-only, never pushed** (owner releases). Path prefix `connector/…` in a story = the connector **repo root**, not a nested dir.
8. **Retire the M0 stub.** The EPIC-046 `auth-stub.ts` is removed wholesale in 047-07 (grep-verifiable) once all 3 register lanes verify for real.

## Active FLASHCARD Tags

FLASHCARD tags that appear in any story's `<agent_context>` for this sprint. Auto-populated by grepping `.cleargate/FLASHCARD.md` at sprint init. Agents: grep the flashcard file for each tag listed here before starting work.

- `#cross-repo` — export `ORCHESTRATOR_PROJECT_DIR`; every dispatch carries code-repo root + branch + SHA + path-prefix mapping (QA/Dev packs assume meta paths, absent here).
- `#connector #test-harness` — build `shared` (`npm run build --workspace=shared`) before broker red tests; test scripts glob `src/**` AND `test/**`; extend glob in the same commit if adding a test dir.
- `#auth #schema` — indexed verify replaces the bcrypt whole-table scan; non-secret selector → single-row compare.
- `#redis #test-harness` — match real `revoked:<jti>` key shape; hand-rolled WS stub frames must branch on payload length (<126 vs 126-65535).

## Adjacent Implementations (Reuse First)

Exported helpers and modules from already-merged stories in this sprint. The Architect updates this section after each story merges. Developers check here before writing new helpers — if the module already exists, import it; duplication is a kick-back criterion.

| Story | Module / Export | Path |
|-------|----------------|------|
| 047-01 | `verifyAppToken(db, { token_id, secret })` — indexed O(1) verify primitive (single token_id lookup + one bcrypt.compare, fail-closed, timing-flattened). **047-03's `/verify` apptoken kind MUST consume this — do not re-implement.** | `mcp/src/auth/credential-verify.ts` |
| 047-01 | `connections` / `pairings` / `app_tokens` Drizzle tables (snake_case; `app_tokens.token_id` UNIQUE; `pairings` partial idx on `consumed_at IS NULL`; `created_by` additive). 047-02 INSERT/UPDATEs these; 047-03/04 reference. Schema is FROZEN — additive migrations only. | `mcp/src/db/schema.ts` (migration `0010_demonic_tana_nile.sql`) |
| 047-01/BUG-035 | `scopedCleanup(db, adminIds)` (covers app_tokens/connections/pairings/projects/members/admin_users, FK-ordered, scoped by created_by) · `uniqueAdminId(label)` · `scopedCleanupByHandle(db, handles)`. **Every wave-2+ test MUST route fixture cleanup through these — NO unconditional `DELETE FROM <table>` (re-introduces the cross-file FK race).** | `mcp/test/support/db-fixture.ts` |
| 047-02 | Admin-API route module: pairing + app-token **mint / list / revoke** + atomic one-time consume. **Revoke handlers write `rev:apptoken:<id>` / `rev:pairing:<id>` INLINE via `redis.set(...'EX',revocationTtlSec())`** — **047-04 adds the `publish` call right after these key writes** (key-before-publish ordering). Dual-auth `row.owner(=project.createdBy) || row.createdBy === callerId`. DTO field-pick `toAppTokenDto`/`toPairingDto` (metadata-only, no hash/plaintext). Registered in `index.ts`. | `mcp/src/admin-api/connections.ts` (+`index.ts`; migration `0011_free_lake` added app_tokens.name/expiresAt/memberId, pairings.label/revokedAt) |
| 047-04 | `publishRevocation(redis, { kind, id, revokedAt })` — the SOLE `redis.publish` site. **Channel contract the broker (047-06) PSUBSCRIBEs:** `rev:connection:<id>` / `rev:apptoken:<id>` / `rev:project:<id>`; body `{ kind, id, revoked_at }` (ISO). Key-write-before-publish; publish errors propagate (not swallowed). | `mcp/src/auth/revocation.ts` |
| 047-05 (connector) | `createVerifyClient(opts): VerifyClient` — `verify(credential, kind, meta?)` (fail-closed, SHA-256-keyed short-TTL positive cache, broker service token in header, `project_id` from response only) + `invalidate(subject: InvalidateSubject)` (by token_id/connection_id/credential_hash — 047-06 calls this on revoke). **047-07 wires `ws-gateway.ts` register/hello → `verify()` across the 3 lanes** (and deletes `auth-stub.ts`). `registry.register()` fail-closes on absent `project_id`. | `connector/broker/src/auth/verify-client.ts` |

## Mid-Sprint Amendments

_(populated by Architect on CR:scope-change or CR:approach-change; never rewrite, only append. Format: '<ISO-ts> · <ID> · <one-line note>')_
