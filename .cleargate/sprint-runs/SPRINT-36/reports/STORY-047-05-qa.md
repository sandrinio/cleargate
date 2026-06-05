# QA Verification — STORY-047-05 (Broker verify-client + fail-closed + cache + project_id stamp)

**Verdict:** ✅ GREEN (attempt 1, no rework) · Dev commit `13a8811`
**Method:** story-loop adversarial multi-lens (acceptance-trace · fail-closed-cache-security · quarantine-grep-timeout), all PASS + orchestrator authoritative broker gate (39/39 ×2).

## Verified (real in-test `node:http` fake-mcp server — not a mocked fetch)
- **All 6 §2.1 Gherkin** covered. Fail-closed proven on all six denial paths (unreachable, timeout, non-2xx, malformed body, `valid:false`, `valid:true` w/o `project_id`) — each denies **and caches nothing**, proven via 2nd-presentation `requestCount` increment (a poisoned cache would short-circuit the 2nd call). Cache write is gated behind a non-null binding (`if(!binding) return null` precedes `cache.set`).
- **SHA-256 credential keying** (`node:crypto`) — raw credential is never a map key (probe: `invalidate({credential_hash})` drops the entry). Distinct creds → distinct keys.
- **`invalidate(subject)`** drops by `credential_hash`, `connection_id` alone, or `token_id` alone — the hook 047-06's revoke-subscriber calls; a stale positive does not survive a revoke.
- **`project_id` from the response only** — a client-injected `connector_meta.project_id` is ignored; bind uses the verify response value. `registry.ts` `register()` throws (fail closed) on absent/empty `project_id`.
- **Service token in the auth header** (`Authorization: Bearer <svc>` + `x-service-token`) — inspected on the request the stub captured. **Bounded 2s `AbortController` timeout** genuinely fires (2074ms timeout test). TTL default 30s, env `BROKER_VERIFY_CACHE_TTL_MS`.
- **Quarantine:** verify/cache/service-token logic confined to `broker/src/auth/verify-client.ts` (grep-clean — no leak into `ws-gateway.ts`); `registry.ts` change limited to consuming `project_id` + fail-closed. `auth-stub.ts` untouched (047-07 retires it). 8 self-authored adversarial probes (string `"true"`, numeric/null `project_id`, 403-with-valid-body, unparsable body, TTL expiry, client-input injection) all denied.

## Notes (non-blocking)
- A lens left an untracked `broker/test/_qa-adversarial-047-05.scratch.test.ts` — orchestrator removed it before the gate; not in the commit (which the DevOps diff confirms: 3 files only).
- Test `:402` builds a bad registry entry with camelCase `connectionId` (vs interface `connection_id`), cast `as unknown` — sound because the registry throws on `project_id:""` first.
- Authoritative gate: `npm test --workspace=broker` (after `npm run build --workspace=shared`) ×2 → 39/39 both.

## DoD trace
6 scenarios green ✓ · all Gherkin ✓ · verify/cache/service-token confined to verify-client.ts (grep) ✓ · fail-closed never-fail-open on all error paths ✓ · denial never cached ✓ · project_id from response, fail-closed if absent ✓ · invalidate hook exposed for 047-06 ✓ · no DB/Redis (db_write_set:[]) ✓.
