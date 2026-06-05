# STORY-047-02 — Architect Post-Flight Review

role: architect
Story: STORY-047-02 (mcp pairing-code + app-token lifecycle)
Sprint: SPRINT-36 · EPIC-047 · M1 Connector Identity
Dev commit: `fb50e05b676e18e6ea81570cbbf3e866fea02ae6`
Branch: `story/STORY-047-02` (mcp repo) · LOCAL-ONLY (not pushed)

## Result: PASS

## Self-gate (real infra @ :5433 / :6380)
- Migration 0011 applied (`npm run db:migrate` → success; journal idx 11, tag `0011_free_lake`).
- `npm run typecheck` (tsc --noEmit): clean.
- `npm test` (serial, `--test-concurrency=1`) run 3×: **531 pass / 0 fail / 1 skipped / 532 total** each run — deterministic. The 1 skip is the pre-existing `delivers to verified inbox without exception` mailer test (unrelated to 047-02). The 7-scenario STORY-047-02 suite passed all three runs.

## Gate (1) redTestsUnmodified — TRUE
On this branch the QA-Red red tests and the Dev impl live in a single commit (`fb50e05`); `test/connections-lifecycle.red.node.test.ts` is change-type **A (added)**, not **M (modified)** — the Dev did not edit/weaken a pre-existing QA-Red file. Content inspection confirms the acceptance is genuine, not gutted: 7 real scenarios covering every §2.1 Gherkin, real Postgres+Redis (no mocks), `scopedCleanup` (no unconditional DELETE), a true `Promise.all` concurrent-consume race asserting exactly-one-winner, list-DTO omission assertions (plaintext + bcryptHash absent from raw body), and a positive-control anchor in Scenario 7 that forces RED on a clean baseline (guards against false-green non-owner-rejected). No `.skip` / `it.todo` / tautologies. Naming `*.red.node.test.ts` matches the §Test-Stack red-test convention.

## Gate (2) file surface vs §3.1 + SDR additions — MATCH
- `src/admin-api/connections.ts` (new route module) — §3.1 ✓
- `src/admin-api/index.ts` (M) — `registerConnectionsRoutes` imported + mounted in the authed scope alongside tokens (line 141), exactly the SDR-required registration ("unregistered routes never mount") ✓
- `src/db/schema.ts` (M) + `0011_free_lake.sql` + meta snapshot/journal — SDR-approved additive columns ✓
- `test/connections-lifecycle.red.node.test.ts` (new) — §3.1 ✓
No off-surface edits.

## Gate (3) no new runtime dependency — CLEAN
`package.json` untouched in the commit. `connections.ts` imports only already-present deps (`node:crypto`, `fastify`, `drizzle-orm`, `zod`, `bcrypt`, `ioredis`) — same set tokens.ts uses.

## Gate (4) Cross-Cutting Rules — all honored
- **R1 mcp=authority / R2 indexed verify:** persists non-secret `token_id` (`at_<base64url>`, UNIQUE-indexed) + bcrypt cost-12 hash so 047-03's `verifyAppToken` does an O(1) lookup. This story does NOT verify — it only persists (verify primitive `credential-verify.ts` left untouched). ✓
- **R3 fail-closed:** revoke writes `revoked_at` AND the inline `rev:apptoken:<id>` / `rev:pairing:<id>` Redis key (`.set(..., 'EX', revocationTtlSec(expiresAt))`). PUBLISH correctly deferred to 047-04 — `connections.ts` contains zero `.publish`/`PSUBSCRIBE` (the only "PUBLISH" hits are comments asserting its deliberate absence). ✓
- **R4 Redis key shape:** matches the live `tokens.ts:181-186` `rev:<kind>:<id>` shape (clone), not an assumed shape. ✓
- **R5 additive migration:** 0011 adds 5 nullable columns + `pairings.created_at NOT NULL DEFAULT now()` (DEFAULT backfills existing rows → safe on populated table). No DROP / column-narrowing / retroactive NOT-NULL-without-default. ✓
- Atomic one-time consume: single `UPDATE pairings SET consumed_at=now() WHERE id=$1 AND consumed_at IS NULL AND revoked_at IS NULL AND expires_at > now() RETURNING id`; zero rows ⇒ 409 reject. Concurrent-race test green. ✓
- Dual-auth revoke: `(row.owner === callerId || row.createdBy === callerId)` — correctly *widens* tokens.ts's single-owner check to the SDR-mandated operator-OR-minting-owner; non-owner-non-operator → 404 not_found, credential stays active. Idempotent 2nd revoke → 204. ✓
- List DTOs metadata-only (`toAppTokenDto`/`toPairingDto` omit bcryptHash/codeHash/plaintext); asserted by test. ✓

## Gate (5) boundary — CLEAN
No files under `cleargate-cli/src` or `.claude/`. No PM-tool SDK import. All changes under `mcp/**`.

## Notes / observations (non-blocking)
- `consume` returns 409 on already-consumed; the test asserts `>=400`, so the specific code is fine.
- Pairing mint bcrypts the code (`codeHash`) — consistent with the no-plaintext-at-rest requirement; the consume route here authorizes by id, with secret-verify deferred to the 047-03 verify lane (in scope per §1.3).
