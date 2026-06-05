# QA Verification — STORY-047-03 (Verify Endpoint — the identity chokepoint)

**Verdict:** ✅ GREEN (attempt 2, one rework) · Dev commit `d9a2cda`
**Method:** story-loop adversarial multi-lens (acceptance-trace · fail-closed-security · indexed-noscan-authpool), all PASS + Architect postflight PASS + orchestrator authoritative serial gate. Self-gate: 548 passed / 0 failed serial.

## Resolved design (orchestrator decision, executed)
Credential wire format `<selector>.<secret>` (pairing: `<id>.<secret>`, app_token: `<token_id>.<secret>`; member: raw JWT). 047-02's mint was adjusted to emit the combined form (`connections.ts:182 ${row.id}.${secret}`, `:349 ${tokenId}.${secret}`; `codeHash`/`bcryptHash` still hash the secret only) — verified non-regressing: 047-02 lifecycle suite 7/7. This is what makes the indexed O(1) lookup possible (vs a forbidden whole-table bcrypt scan).

## Verified (3 lenses + postflight)
- **Fail-closed (the headline) is REAL.** A 2nd app-instance with `deadDb` (port→1, conn-refused) + `deadRedis` (`enableOfflineQueue:false`) → for all 3 kinds, `statusCode<500 && valid===false`. The throw fires in the **auth preHandler** (`await redis.get(cacheKey)`, dead redis) and is coerced to `200 {valid:false}` — the catch-all lives at the handler **and** every preHandler (a 5xx there would be read by the broker as retry-into-open). No path emits `valid:true` or 5xx.
- **No whole-table scan.** Behavioral probe `apptok_does_not_exist_<rand>.<TARGET_SECRET>` → `valid:false`; a scan refactor would match the real row's secret and return `valid:true` → genuine falsifier. The literal pg-query/bcrypt call-count spy is owned by 047-01's `credential-verify-trace` for the primitive `verifyAppToken`, which this endpoint composes. Pairing verify is an indexed PK lookup, not a `codeHash` scan.
- **Rate-limit independence.** 200-req burst trips the `verify` bucket (`rl:anon:verify:<ip>`, 100/60s, ≥1×429); `/auth/exchange` (default `rl:anon:<ip>`) is NOT 429 — distinct keys, proven independent. A verify connect-storm cannot DoS the other anon routes.
- **Service-token required.** No-auth and garbage-token both 401/403, and the pairing is asserted NOT consumed → auth precedes the limiter precedes credential logic.
- **project_id always / per-kind dispatch / atomic pairing consume / member JWT+jti-revocation / app_token rev: check** all covered across the 10 §2.1 scenarios. Pool headroom via `buildVerifyPool`/`VERIFY_POOL_MAX`. No skip/only/todo; no test deleted/weakened; cleanup via `scopedCleanup`.

## Notes
- Cross-lens DB contamination recurred (3 sibling lens procs on shared PG+Redis → FK 23503 + `rl:anon:verify:` bucket bleed). Lenses diagnosed it correctly (`ps aux` showed the siblings), drained + flushed, and got 4/4 isolated green. Harness noise, not a defect — the standing per-process-DB-isolation follow-up (BUG-035 §5.4).
- Surface slightly broader than story §3.1 (added `index.ts` preHandler ordering, `rate-limit.ts` bucket param, `server.ts` verifyDb wiring, `client.ts` buildVerifyPool) — necessary to wire service-token auth + dedicated limiter + verify pool; Architect postflight blessed it.
- Test file named `*.red.node.test.ts` (story spec'd no `.red.` infix) — cosmetic; matches the runner glob, runs, green.

## DoD trace
10 integration scenarios green (real PG18+Redis8) ✓ · all Gherkin ✓ · fail-closed (sim PG/Redis error → valid:false, never valid:true/5xx) ✓ · app_token uses indexed credential-verify (no scan, grep+probe) ✓ · service-token-gated ✓ · verify limiter independent ✓ · pool headroom ✓ · project_id always ✓ · db_write_set pairings+connections ✓ · typecheck clean.
