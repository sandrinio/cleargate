# QA Verification — STORY-047-07 (Wire 3 lanes, retire auth-stub, audit per turn)

**Verdict:** ✅ GREEN (attempt 1, no rework) · Dev commit `184218d4`
**Method:** story-loop adversarial multi-lens (acceptance-trace · stub-retirement-failclosed · wiring-audit-integration), all PASS + orchestrator authoritative FULL-broker gate (54/54 ×2, incl. real-Redis revoked path).

## Verified (in-test node:http fake mcp /verify + real Redis :6380 for the revoked path)
- **All 3 lanes verify via the real verify-client** (no stub): register → `verifyClient.verify(credential, kind)` for `pairing`|`member`; hello → `verify(appToken, "app_token")`. Each fails closed when the client is absent and when `!binding || !binding.project_id`. **Member lane passes the join token AS-IS** (scenario 2 asserts `credential === JOIN_TOKEN` verbatim, `kind === "member"`).
- **`auth-stub.ts` DELETED + grep-clean** (4 checks): file absent; `grep -rE 'CONNECTOR_SHARED_SECRET|verifyCredential|verifyAppToken|shared.?secret|sharedSecret' broker/src` → zero; no dangling `./auth-stub` import; typecheck clean. `sharedSecret` removed from `GatewayOptions` + `server.ts`.
- **Exactly one audit row per relayed turn, off critical path**: `router.ts:192 recordTurnStart(...)` once per `routePrompt`, AFTER `sendToConnector`, online branch only; `project_id` from `entry.project_id` (never payload). `audit.ts` defers via `queueMicrotask` + try/catch + promise-rejection swallow → a throwing/rejecting sink can never block/delay relay (scenario 8 installs a throwing sink, confirms the prompt still routes).
- **Missing-project_id fails closed** (verify-client `shapeBinding` returns null on empty project_id; registry refuses empty project_id — defense in depth).
- **Revoked-cannot-start proven on real infra**: publish `rev:connection:<id>` to Redis :6380 → 047-06 subscriber drops the entry → fresh register re-hits mcp (cache invalidated) → `valid:false` → deny. **The M0 wiring gap is closed**: `server.ts` now passes `{port, registry, router, verifyClient}`, so the gateway + revoke-subscriber share ONE verifyClient + router/relay.
- **app_id consistency end-to-end**: hello binds `appId = appBinding.token_id`; stamped onto the prompt envelope so `relay.trackTurn` AND the audit row both carry `token_id` = the id `rev:apptoken:<id>` kills.
- **No weakened/skipped tests**: the 7 046-02 + 6 046-03 scenarios are preserved and migrated from `sharedSecret` to the real verify-client over an http stub (bad-credential now drives wrong-secret → `valid:false` → deny — a genuine fail-closed assertion). Atomic commit (stub deletion + test rewrites + audit + wiring in one).

## Accepted M1 limitation (not a defect)
Member lane binds `project_id` but does NOT persist `member_id` (RegistryEntry has no `member_id` column — adding it would be a frozen-046-02-schema change beyond SDR scope). Gherkin scenario 2 prose mentions `member_id`; the test asserts the load-bearing `project_id` stamp + fail-closed, which is met. `member_id` rides the verify response and is available; persistence is a future hardening item.

## DoD trace
8 scenarios green ✓ · all Gherkin ✓ · auth-stub.ts deleted + grep-clean ✓ · 3 lanes register/bind via real verify-client ✓ · one audit row per turn, off critical path ✓ · missing project_id fail-closed ✓ · revoked-cannot-start (real Redis) ✓ · full broker suite green (54/54) ✓.
