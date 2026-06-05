# STORY-047-06 — Developer Report (rework attempt 2)

**Story:** Broker M1 — revoke-subscriber (PSUBSCRIBE rev:*) + kill-in-flight + whole-tenant kill
**Repo:** connector (broker workspace) · **Branch:** story/STORY-047-06 · **Mode:** local-only, never pushed
**Result:** done — typecheck clean, 46/46 broker tests pass (7/7 revoke scenarios + 8/8 verify-client, no regressions).

## What this rework fixed

Round-1 adversarial verify FALSIFIED commit `a4c5155`: the resubscribe cache-flush (§2.1 scenario 7,
§1.5 risk-2, Cross-Cutting Rule #3 fail-closed) was **implemented but inert**.

Root cause: `revoke-subscriber.ts` `flushVerifyCache()` called `verifyClient.invalidate({})` expecting
"drop everything", but the MERGED 047-05 `verify-client.ts` `invalidate()` had **no flush-all branch** —
an empty subject skipped every delete path and silently no-opped. A revoke missed during a subscriber-
connection gap therefore survived in the positive cache for the full TTL (default 30_000ms) — the exact
fail-open posture the story exists to close.

## Fix (2 files, minimal)

1. **`broker/src/auth/verify-client.ts`** — added a real **flush-all** branch to `invalidate()`:
   a subject with no targeted ids (`invalidate({})`, or null/undefined) now `cache.clear()`s the entire
   positive cache and returns. Targeted subjects (`{token_id}` / `{connection_id}` / `{credential_hash}`)
   still drop only their matching entries — the existing 047-05 targeted-invalidate test
   (`invalidate({token_id, connection_id})`) is unaffected (verified green). Doc on `InvalidateSubject`
   and the `invalidate` contract updated to document the flush-all semantic.
2. **`broker/src/auth/revoke-subscriber.ts`** — corrected the stale comment that asserted the
   verify-client "treats invalidate({}) as drop everything" as an *assumption*; it is now a documented,
   real contract of the 047-05 client. No behavioral change to the subscriber — `flushVerifyCache()`
   already called `invalidate({})`; that call is now genuinely effective.

The QA fix-direction also asked to strengthen scenario 7 to prime a cache entry and assert it is empty
after resubscribe. That test (`revoke-subscriber.red.node.test.ts`) is **frozen acceptance** (HARD RULE —
Developer must not edit red tests); strengthening it is a QA-Red task. The production-correctness half of
the fix (real flush-all) is applied here, so the resubscribe path is now genuinely fail-closed:
`resubscribe()` → `flushVerifyCache()` → `invalidate({})` → `cache.clear()`. A re-verify after resubscribe
with mcp unreachable now correctly fail-closes to null (the QA reproduction would no longer reproduce).

## What held from attempt 1 (unchanged, all green)
- One dedicated `new Redis()` subscriber + one `PSUBSCRIBE rev:*` on that single connection (DoD grep clean;
  no second subscribe on a request-path client). `server.ts` starts it at boot.
- In-flight turns genuinely killed via `relay.forceKill` (046-03 path), asserted gone via `getInFlight`.
- Targeted `invalidate({connection_id})` / `invalidate({token_id})` per-subject cache drops work.
- rev:project drops ALL matching connections + sets `isProjectRevoked`; `:clear` lifts it.
- Idempotent teardown (force-kill then natural turn_end is a no-op). Drop latency measured into audit row.
- Real Redis @ redis://localhost:6380, no mocks (before() asserts PING→PONG; tests open their own publisher).

## Files changed (this rework)
- `broker/src/auth/verify-client.ts`
- `broker/src/auth/revoke-subscriber.ts`

(The prior commit `a4c5155` already landed `revoke-subscriber.ts` net-new, `registry.ts` unbindApp,
router/relay reuse, `server.ts` wiring, and the ioredis package.json/package-lock deltas — this rework
amends that single story commit.)

## Deviation from story surface
- §3.1 did **not** list `verify-client.ts` (it belongs to merged 047-05). Editing it was authorized by
  the SDR dispatch ("a flush/invalidate-all hook") and the QA round-1 fix-direction ("add a real flush-all
  method to the 047-05 verify-client"). The edit is purely additive (a new flush-all branch); no existing
  047-05 behavior or test regressed.
- Test file is `revoke-subscriber.red.node.test.ts` (story §3.1 named `revoke-subscriber.node.test.ts`) —
  QA-Red naming; the broker test glob `test/**/*.node.test.ts` covers it. Not a defect.

## Test result
`npm test --workspace=broker` (REDIS_URL=redis://localhost:6380): **tests 46, pass 46, fail 0, skipped 0**.
`npm run typecheck --workspace=broker`: clean (`tsc --noEmit`).
