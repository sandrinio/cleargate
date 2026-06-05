# QA Verification — STORY-047-06 (Broker revoke-subscriber — kill-in-flight + whole-tenant kill)

**Verdict:** ✅ GREEN (attempt 2, one rework) · Dev commit `ffceed7`
**Method:** story-loop adversarial multi-lens (acceptance-trace · kill-inflight-failclosed · whole-tenant-audit-grep), all PASS + orchestrator authoritative broker gate (46/46 ×2, real Redis :6380).

## Verified (real Redis :6380 — test PUBLISHes real `rev:*`, no mocks)
- **Kill-in-flight is real, not vacuous.** `revoke-subscriber.ts` snapshots in-flight turn ids and force-kills via `relay.forceKill` (`relay.ts:186-198`: marks cancelled **and** deletes tracking = terminate, not drain), drops the registry entry, invalidates the cache. Adversarial probe: a racing `prompt` *after* the drop fast-fails `error:offline` (`router.ts:167-170`). Drop latency measured + asserted bounded.
- **Idempotent teardown**: force-kill then a natural `turn_end` for the same turn → no throw, turn stays gone (`forceKill`/`relayTurnEnd` no-op on absent).
- **Fail-closed resubscribe genuinely EMPTIES the cache** (strongest probe): primed a real positive binding via a fake mcp `/verify` (network hit #1), confirmed a cache hit, called `resubscribe()`, then the next verify **re-hit the network** (#2) — cache actually cleared, not just a hook fired. `verify-client.ts:247-253` flush-all branch.
- **Exactly ONE dedicated subscriber connection**: one `new Redis(...)` (`:307`, guarded), one `psubscribe(rev:*)` (`:334`; `resubscribe` re-issues on the *same* `sub`). Broker had no request-path Redis client → nothing to collide with. `parseRevokeChannel('revoked:jti…')→null` (rejects the other live key shape, Cross-Cutting #4).
- **Whole-tenant kill is tenant-isolated**: 2 conns in P + 1 in Q each streaming → both P conns + turns killed, **Q untouched**, `isProjectRevoked(Q)===false`. `rev:project:<P>:clear` flips `isProjectRevoked(P)` back to false. **Audit row** records `{subject_kind, subject_id, project_id, turns_killed (exact), drop_latency_ms (numeric ≥0), at (ISO)}`; `project_id` captured before the drop.
- No weakened/skipped/vacuous tests (7 scenarios, real assertions); EPIC-027 boundary respected; ioredis `^5.4.0` + lockfile committed.

## Carried forward to 047-07 (integration items the lenses flagged — NOT 047-06 defects; §1.3 defers gateway/lane wiring)
1. **`server.ts` instance unification**: it creates local relay/router and wires them into `revokeSubscriber`, but calls `createGateway({port})` WITHOUT passing that router — so on the production boot path the gateway doesn't route turns into the relay the subscriber kills. 047-07 must make the gateway, router, relay, and subscriber share the SAME instances (else end-to-end kill-in-flight doesn't fire in prod). 047-06 is tested at the sound relay/router unit seam.
2. **apptoken turn-matching**: the handler matches turns by `rec.app_id===tokenId` (SDR assumption that an app-token's in-flight turns carry the token id as `app_id`). 047-07 must honor this when wiring the app `hello` lane.

## DoD trace
7 scenarios green (real Redis) ✓ · all Gherkin ✓ · one PSUBSCRIBE/dedicated conn (grep) ✓ · kill-in-flight terminates a streaming turn (measured) ✓ · whole-tenant drop-all + refusal set + clear ✓ · cache invalidate on revoke + resubscribe flush ✓ · audit row complete ✓ · idempotent teardown ✓.
