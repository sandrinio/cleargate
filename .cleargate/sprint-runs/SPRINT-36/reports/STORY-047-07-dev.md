# STORY-047-07 — Developer Report

**Repo:** connector (broker edge) · **Branch:** story/STORY-047-07 · **Commit:** 184218d4a6f9cb350f8df7d85333611c72b74e33
**Status:** done · **Typecheck:** pass · **Tests:** 54 passed, 0 failed (broker workspace, full suite)

## What was built (FINAL story of SPRINT-36 — make the broker's auth real + close the 047-06 gap)

1. **3 register lanes through the real verify-client** (`ws-gateway.ts`):
   - `register` parses a new `kind` field (`pairing` | `member`, default `pairing`) and calls `verifyClient.verify(credential, kind)`. Member lane passes the cleargate join access token **as-is** (no derived credential — EPIC-047 §6).
   - `hello` calls `verifyClient.verify(appToken, "app_token")`.
   - All three lanes **fail closed** (sendError unauthorized) on invalid/revoked OR absent/empty `project_id`, and on a missing verify-client. The authoritative `project_id` from the verify response is stamped into the registry entry.
   - The message handler was converted to async (verify is a network round-trip); a top-level catch guarantees an unexpected throw fails closed rather than crashing the socket.

2. **Stub retired wholesale**: `git rm broker/src/auth-stub.ts`; removed the import, `GatewayOptions.sharedSecret`, all `CONNECTOR_SHARED_SECRET` usage, and the stub doc-comments in `ws-gateway.ts`/`server.ts`. Grep of `broker/src/**` for `verifyCredential|verifyAppToken|CONNECTOR_SHARED_SECRET|shared[._-]?[Ss]ecret` returns **zero** hits outside the verify-client seam (scenario 4 passes).

3. **Per-turn audit** (`broker/src/auth/audit.ts`, net-new): `recordTurnStart({connection_id, app_id, project_id, turn_id, ts})` — **fire-and-forget**, deferred via `queueMicrotask` + try/catch + promise-rejection swallow so a throwing/rejecting sink **never** blocks or delays the relay. Exposes `__setAuditSink`/`__resetAuditSink` test seams. Wired into `router.routePrompt` **after** `sendToConnector`; `project_id` sourced from `entry.project_id` (never the opaque payload).

4. **Closed the 047-06 gap** (`server.ts`): the gateway now boots with `{ port, registry, router, verifyClient }` (previously only `{ port }`). The registry/relay/router/verifyClient are built first and shared by both the gateway and the revoke-subscriber, so the production boot path routes prompts through the same relay the subscriber kills and verifies via the same client whose cache it invalidates.

5. **App_id consistency** (SDR note 7): at `hello`, the verified app_id (= `binding.token_id`) is recorded per app socket; on `prompt` the gateway overrides the (spoofable) payload `app_id` with the verified value before routing, so the relay tracks turns under the token id and 047-06's `rev:apptoken:<id>` kill predicate (`rec.app_id === tokenId`) drops exactly that app's in-flight turns.

## Tests

`broker/test/lanes-and-audit.red.node.test.ts` (frozen, untouched, md5 7ab86d71…) — all 8 scenarios pass, including `revoked-cannot-start` against **real Redis @ localhost:6380** (real 047-06 subscriber + real 047-04 `rev:connection:<id>` publish) and `audit-failure-does-not-block-relay` (throwing sink → turn still relays). Verified red→green: at baseline all 8 were RED with the frozen file unchanged; only the src wiring made them green.

## Deviation from the story surface (flagged — orchestrator-anticipated)

The story §3.1 surface lists 4 files. The dispatch additionally mandates "rewrite the 046-02 register/hello tests that imported the stub … ATOMIC with the stub deletion" and "run the FULL broker suite green (nothing still imports the deleted stub)". Deleting the stub + removing `sharedSecret` breaks **three** prior-story test files that were coupled to it:
- `broker/test/registry.node.test.ts` (046-02 dev copy — editable)
- `broker/test/registry.red.node.test.ts` (046-02 QA-Red — a `*.red.node.test.ts`)
- `broker/test/router.red.node.test.ts` (046-03 QA-Red — a `*.red.node.test.ts`)

All three were rewritten to inject a real verify-client over an in-test `mcp /verify` http stub (the 047-05 pattern), preserving **every** behavioral assertion (a valid credential binds; `WRONG-SECRET` is rejected fail-closed; routing/relay/cancel/turn_end/opaque-payload all unchanged). **Two of these are `*.red.node.test.ts` files**, which the general Forbidden-Surfaces rule freezes — but they belong to already-merged stories 046-02/046-03, not to STORY-047-07, and the story's own §1.5 mitigation + the authoritative dispatch explicitly require this rewrite as the atomic counterpart to the wholesale stub deletion. **This story's own frozen red file (`lanes-and-audit.red.node.test.ts`) was NOT touched.** No installed pre-commit hook in this repo; verified manually.

## Notes
- `no-cross-talk` (046-03 router.red) flaked once (1016ms, the documented loopback-coalescing race) then passed 4/4 on re-run — not a regression; the app_id override does not affect turn_id-based fan-out.
- LOCAL-ONLY: one commit on the story branch, **not pushed**.
- No Script Incidents.
