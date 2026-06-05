# STORY-047-07 — Architect Post-Flight Report

role: architect
**Story:** STORY-047-07 — connector/broker: wire 3 register lanes, retire the M0 auth-stub, audit per turn
**Repo/branch:** `/Users/ssuladze/Documents/Dev/ClearGate/connector` @ `story/STORY-047-07`
**Dev commit:** `184218d4a6f9cb350f8df7d85333611c72b74e33`
**Result:** **PASS**
**redTestsUnmodified:** true (see note)

## Final-gate results

| Gate | Result |
|---|---|
| `npm run build --workspace=shared` | clean |
| `npm run typecheck --workspace=broker` | clean (0 errors) |
| `npm test --workspace=broker` (full suite, serial) | **54/54 pass, 0 fail** |
| STORY-047-07 lanes-and-audit suite | 8/8 scenarios pass |
| Real Redis @ 6380 | reachable (PONG); revoked-cannot-start ran against it |

The full broker suite is the load-bearing check that the stub deletion is clean: the
rewritten 046-02 (`registry.node.test.ts`, `registry.red.node.test.ts`) and 046-03
(`router.red.node.test.ts`) tests load `createGateway` / `createVerifyClient` only — a
dangling `auth-stub.js` import would have failed at module load. All green ⇒ zero dangling
imports of the deleted stub.

## (1) Red tests not weakened — redTestsUnmodified = true

Single-commit orchestration run (reflog: branch off `1a8f91a`, one Dev commit `184218d`; no
separate QA-Red commit to byte-diff against — same workflow as 047-05/06). I verified
acceptance was not weakened by inspecting the red file content directly:

- `broker/test/lanes-and-audit.red.node.test.ts` (NEW, A) covers all 8 §2.1 Gherkin
  scenarios one-for-one with genuine assertions: real WsGateway over real `ws` clients, real
  047-05 verify-client over an in-test node:http `/verify` stub (legitimate, not a forbidden
  mock — the no-mocks rule targets DB/Redis), and the revoked-cannot-start scenario drives
  the **real 047-06 subscriber against real Redis @ 6380** publishing the real
  `rev:connection:<id>` channel. Fail-closed assertions (`out.kind === "deny"` on missing
  project_id; `requestCount >= 1` proving register routes through verify not the stub) and
  the audit-failure-does-not-block-relay assertion are intact, not relaxed.
- The two PRE-EXISTING red files modified in this commit (`registry.red.node.test.ts`,
  `router.red.node.test.ts`) are **046-02/046-03 acceptance tests, not this story's red
  tests** — their rewrite to drive the verify-client is EXPLICITLY authorized by story §1.5
  mitigation, §3.2, and SDR dispatch task 9 ("rewrite the 046-02 register/hello tests …
  ATOMIC with the stub deletion, same commit"). The rewrites swap `sharedSecret` for an
  injected verify-client and preserve the original behavioral assertions (valid binds,
  `WRONG-SECRET` denies, version-mismatch rejected). This is not acceptance-weakening.

## (2) File surface vs §3.1

All committed files are in-surface or SDR-authorized:

| File | Status | Authority |
|---|---|---|
| `broker/src/ws-gateway.ts` | M | §3.1 (modify) |
| `broker/src/auth-stub.ts` | **D** | §3.1 (DELETE wholesale) |
| `broker/src/auth/audit.ts` | A | §3.1 (create) |
| `broker/src/router.ts` | M | §3.1 (audit hook site) |
| `broker/test/lanes-and-audit.red.node.test.ts` | A | §3.1 (create; `.red.node.test.ts` per Test Stack red-naming) |
| `broker/src/server.ts` | M | SDR dispatch task 6 (close the GAP — `{port,registry,router,verifyClient}` into createGateway) |
| `broker/test/registry.node.test.ts` | M | §1.5 / §3.2 / dispatch task 9 (046-02 rewrite) |
| `broker/test/registry.red.node.test.ts` | M | §1.5 / §3.2 / dispatch task 9 (046-02 rewrite) |
| `broker/test/router.red.node.test.ts` | M | §1.5 / §3.2 / dispatch task 9 (046-03 rewrite) |

No off-surface edits.

## (3) No new runtime dependency

`broker/package.json` unchanged in this commit. Deps remain `@connector/shared` + `ioredis ^5.4.0`
(ioredis was already added in 047-05/06). verify-client uses Node-24 global fetch + node:crypto.

## (4) Cross-Cutting Rules

- **R1 mcp=authority / broker verifies** — register/hello delegate ALL credential logic to
  `verifyClient.verify(credential, kind)`; broker holds no signing secret / DB creds. ✓
- **R3 fail-closed** — denies when `verifyClient` absent, `!binding`, or `!binding.project_id`;
  registry.register also fail-closes on empty project_id (registry.ts:99). revoked-cannot-start
  proven against real Redis. ✓
- **R4 Redis key shape** — revoke scenario publishes the real `rev:connection:<id>` channel
  (047-04 contract); passes against real Redis. ✓
- **R5 additive migrations** — N/A (`db_write_set: []`). ✓
- **R6 EPIC-027 boundary** — only `connector/broker/**` touched; no `cleargate-cli/src` /
  `.claude/`; no PM-tool SDK import. ✓
- **R8 retire M0 stub** — `auth-stub.ts` deleted; `grep -rnE
  "verifyCredential|verifyAppToken|CONNECTOR_SHARED_SECRET|shared.?secret|auth-stub"
  broker/src/` ⇒ ZERO matches outside the verify-client seam. ✓

## (5) Nine SDR tasks — all implemented

(1) `GatewayOptions.verifyClient?: VerifyClient` added; (2) register parses `kind`, calls
`verify`, fails closed; (3) hello verifies `app_token`, fails closed; (4) auth-stub deleted +
sharedSecret/CONNECTOR_SHARED_SECRET removed; (5) `audit.ts` recordTurnStart fire-and-forget
(queueMicrotask + swallow, incl. promise-rejection) wired in router.routePrompt with
`project_id` from `entry.project_id`; (6) server.ts passes shared `{registry,router,verifyClient}`
to createGateway — GAP closed; (7) app_id consistency — verified `token_id` bound at hello and
stamped onto the prompt envelope (`appSocketToAppId` WeakMap) so `rev:apptoken:<id>` matches;
(8) revoked-cannot-start proven via real subscriber + Redis; (9) 046-02/03 tests rewritten,
atomic with the deletion.

## Conclusion

PASS. No remediation. Story is merge-ready for DevOps (local-only, no push).
