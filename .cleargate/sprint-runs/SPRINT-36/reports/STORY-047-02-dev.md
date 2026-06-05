# STORY-047-02 — Developer Report

**Repo:** `mcp` (identity authority) · **Branch:** `story/STORY-047-02` · **Commit:** `fb50e05`
**Status:** done · **Typecheck:** pass · **Tests:** 531 passed, 0 failed, 1 skipped (pre-existing) — deterministic across 3 serial `npm test` runs

## What I built

Pairing-code + app-token lifecycle on the `mcp` identity authority: mint / one-time
atomic consume / dual-authority revoke, surfaced as admin-API routes. No verify
endpoint, no pub/sub (those are 047-03 / 047-04).

### Routes (`src/admin-api/connections.ts`, registered in `admin-api/index.ts`)
- `POST /projects/:pid/pairings` — operator mints a one-time short-TTL code; bcrypt cost-12 hash stored, plaintext `code` returned once (201).
- `GET /projects/:pid/pairings` — metadata only (no codeHash/plaintext).
- `POST /pairings/:id/consume` — load-bearing atomic op: `UPDATE pairings SET consumed_at=NOW() WHERE id=$1 AND consumed_at IS NULL AND revoked_at IS NULL AND expires_at > now() RETURNING id`. Zero rows ⇒ 409 reject (exactly-once / TOCTOU-safe).
- `DELETE /pairings/:id` — revoke (operator OR minting owner), idempotent 204, sets `revoked_at` + inline `rev:pairing:<id>` Redis key.
- `POST /projects/:pid/app-tokens` — operator mints durable scoped token for a project member; `randomBytes`→bcrypt cost-12, stores non-secret `token_id` selector + `bcryptHash`, plaintext `token` returned once (201).
- `GET /projects/:pid/app-tokens` — metadata only (no bcryptHash/plaintext).
- `DELETE /app-tokens/:id` — revoke (operator OR minting owner), idempotent 204, sets `revoked_at` + inline `rev:apptoken:<id>` Redis key.

### Schema (`src/db/schema.ts` + additive migration `0011_free_lake.sql`)
Tables `pairings`/`app_tokens`/`connections` are frozen from 047-01. Added ONLY the
nullable/defaulted columns the §3.3 contract needed:
- `app_tokens`: `member_id` (uuid → members, nullable), `name` (text), `expires_at` (timestamptz)
- `pairings`: `label` (text), `revoked_at` (timestamptz), `created_at` (timestamptz default now NOT NULL)

Journal tail confirmed at idx 10 before generate; new migration landed as `0011`. No
drops, no NOT-NULL-without-default on existing data, no redefinition of any 047-01 column.

## Key decisions
- **Revoke authority = operator OR minting owner.** Operator path resolves through `projects.created_by` (mirrors `tokens.ts:159/168`); owner path checks the credential's `created_by`. Credential DELETE routes are by-id (no `:pid`) and join the credential to its project to resolve the operator; non-owner-non-operator → 404 `not_found`, credential stays active.
- **rev: keys written INLINE** via `redis.set('rev:apptoken:<id>'|'rev:pairing:<id>', '1', 'EX', ttl)` — NOT routed through `auth/revocation.ts` (refresh-jti-only store; per-credential keys clone `tokens.ts:181-186`).
- **No PUBLISH** anywhere — grep-verified the commit is clean (only negating comments). Pub/sub is 047-04.
- **Consume modeled as a distinct state from revoke** — `consumed_at` (success) vs `revoked_at` (terminal kill); a revoked/expired code cannot be consumed.
- **token_id selector** generated as `at_<base64url(9 bytes)>` (non-secret), persisted so 047-03's indexed `verifyAppToken` can O(1) lookup. Did NOT touch `src/auth/credential-verify.ts` (047-03's primitive).
- **Commit scoping:** staged only the 7 story-surface files; left the pre-existing untracked `.cleargate/` orchestration-artifact dir unstaged (not part of this story).

## Deviation from story surface
- §3.1 lists `mcp/test/connections-lifecycle.node.test.ts` as the test file; the acceptance tests were delivered by QA-Red as `connections-lifecycle.red.node.test.ts` (frozen — not edited/weakened). Made all 7 §2.1 scenarios pass against it; committed it on the branch for QA-Verify. No production behavior deviation.

## Tests
All 7 Gherkin scenarios covered by the red file and green. Full `npm test`: 531 pass / 0 fail / 1 skipped (pre-existing), deterministic across 3 serial runs vs real Postgres 18 @5433 + Redis 8 @6380.
