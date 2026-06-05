# STORY-047-04 — Developer Report

**Story:** mcp — revocation publish on Redis pub/sub (per-subject + whole-tenant channels)
**Sprint:** SPRINT-36 (EPIC-047, M1 Connector Identity)
**Repo/branch:** `mcp` @ `story/STORY-047-04` (local-only, never pushed)
**Lane:** standard

## What was built

Added the PUBLISH side of credential revocation propagation. A revoke now writes its
existing `rev:` key AND publishes a revoke message on a Redis pub/sub channel so the
broker subscriber (STORY-047-06) can drop the revoked subject in real time.

1. **`src/auth/revocation.ts`** — added `export async function publishRevocation(redis, { kind, id, revokedAt })`.
   - Channel: `rev:<kind>:<id>` (kinds: `connection` / `apptoken` / `project`), mirroring the
     existing `rev:token:<id>` convention.
   - Body: `JSON.stringify({ kind, id, revoked_at: revokedAt.toISOString() })`.
   - Publish-only: does NOT write or clobber the `rev:` key (that contract is owned by the
     revoke handlers).
   - Publish failure SURFACES — the rejection propagates (no catch-and-ignore), so a revoke is
     never falsely reported complete with the propagation half missing.
   - Accepts a minimal `RevocationPublisher` interface (`publish` only), so the shared ioredis
     connection works (publishing needs no dedicated connection — only the broker's subscriber
     does, in 047-06) and the test's failing-publish stub also satisfies the type.
   - Exported `RevocationKind` type alongside.

2. **`src/admin-api/connections.ts`** — wired a `publishRevocation(deps.redis, { kind:'apptoken', id, revokedAt })`
   call into the app-token revoke handler IMMEDIATELY AFTER the existing
   `redis.set('rev:apptoken:'+id, '1', 'EX', revocationTtlSec(...))` key write (key-before-publish
   ordering). Captured a single `revokedAt = new Date()` and reused it for both the DB `revokedAt`
   column and the publish body for consistency.

## Files changed
- `mcp/src/auth/revocation.ts` (added `publishRevocation`, `RevocationKind`, `RevocationPublisher`)
- `mcp/src/admin-api/connections.ts` (import + publish call in app-token revoke handler)
- `mcp/test/revocation-publish.red.node.test.ts` (frozen acceptance — committed unmodified)

## Key decisions
- Kept `redis.publish(...)` in EXACTLY ONE file (`revocation.ts`) per the DoD grep; `connections.ts`
  calls the helper, never `.publish` directly.
- The whole-tenant (`rev:project:<id>`) and connection (`rev:connection:<id>`) channels have no
  route yet (land in 047-03/07); the helper supports all three kinds and the Gherkin for those two
  is satisfied by invoking `publishRevocation` directly against real Redis with a real subscriber.
- Did NOT add subscribe/psubscribe (047-06) and did NOT change the `rev:` key contract (value `'1'`,
  EX = remaining life).

## Plan deviation (logged)
Per SDR dispatch: this story edits `connections.ts` (STORY-047-02's file) in addition to
`revocation.ts`, because per-credential revoke lives inline in `connections.ts` — NOT in
`revocation.ts` (which is refresh-jti-only). Orchestrator-confirmed (acceptable because wave 2 is
serial and 047-02 is merged to main). The story's §3.2 "extend revocation.ts" prose was superseded
by the SDR design (add `publishRevocation` helper + wire it from `connections.ts`).

## Test result
- Migrations: applied (0001–0011) to fresh DB at localhost:5433.
- Typecheck: PASS (`tsc --noEmit`, clean).
- Full suite (`npm test`, serial): **537 passed, 0 failed, 1 skipped** (skip is a pre-existing
  unrelated email-delivery test, not mine). All 6 STORY-047-04 scenarios green.
- Stash-verify: with `revocation.ts` + `connections.ts` changes stashed, all 6 red tests FAIL with
  the clean `publishRevocation must be exported … (not-yet-implemented)` missing-export signal;
  restored after.
- DoD grep: the only `.publish(` in `src/` is `src/auth/revocation.ts:42`; no-vitest guard clean.
