# STORY-047-05 — Architect Post-Flight Report

**Story:** Broker — verify-client + fail-closed + short-TTL verify cache + project_id stamping
**Repo:** connector (broker edge) · **Branch:** story/STORY-047-05 · **Commit:** `13a881171cf66b88f4161ed9ef132d0d3ea39c28`
**Result: PASS** · redTestsUnmodified: **true**

## Self-gate (re-run, serial, local-only)
- `npm run build --workspace=shared` → clean (run before typecheck/test).
- `npm run typecheck --workspace=broker` → pass (exit 0, no diagnostics).
- `npm test --workspace=broker` → **39 pass / 0 fail / 0 skipped / 0 todo**. The new verify-client suite is 8/8 green (6 Gherkin + timeout variant + registry stamp); 31 pre-existing tests unregressed. Timeout test fires the bounded request timeout (~2006ms) — fail-closed via AbortController, as designed.

## Five-point final gate

1. **redTestsUnmodified = true.** Branch was created fresh from main (`8473301`); the red test + impl landed in a single commit (cross-repo local-only flow committed QA-Red authoring + Dev impl together — no separate QA-Red commit exists on this branch, confirmed via reflog). Inspected the full red-test content: 8 well-formed cases covering all 6 §2.1 Gherkin scenarios + a timeout variant + the registry defense-in-depth stamp. **No `.skip` / `.todo` / `.only`**, real assertions throughout. The `runVerify` helper recognizes SUCCESS **only** on a non-empty `project_id` binding (lines 161-165), so any fail-open implementation fails — acceptance is genuinely load-bearing, not weakened. Request-count assertions enforce cache-hit (count stays 1), invalidate re-hit (count→2), and no-caching-on-denial (count→2). Service-token header is asserted (lines 211-215). Dev added impl only; did not edit/skip any scenario (corroborated by Dev report: clean `ERR_MODULE_NOT_FOUND` red baseline pre-impl).

2. **File surface matches §3.1.** Exactly 3 files, all on-surface:
   - `broker/src/auth/verify-client.ts` (new) — verify-client factory.
   - `broker/src/registry.ts` (modify) — +10 lines, the §3.2-specified fail-closed guard ONLY.
   - `broker/test/verify-client.red.node.test.ts` (new). The `.red.` infix supersedes the §3.1 `verify-client.node.test.ts` name per CR-043 immutability + the sprint Test Stack red-naming (`*.red.node.test.ts`); Dev report flags this deviation correctly. Not an off-surface concern.
   - `ws-gateway.ts` untouched (047-07 owns the gateway→verify-client wiring) — verified no leak.

3. **No new runtime dependency.** No `package.json` touched. Implementation uses only Node-24 built-ins: `node:crypto` (SHA-256), global `fetch`, `AbortController`, `setTimeout`.

4. **Cross-Cutting Rules honored.**
   - R1 (mcp=authority / broker verifies, never mints): broker POSTs `{credential, kind, connector_meta?}` to `{mcp}/admin-api/v1/connections/verify` with its own scoped service token; holds no signing secret / no DB creds.
   - R3 (fail-closed everywhere): all six enumerated doubt cases (network error, timeout/abort, non-2xx, unparsable body, `valid!==true`, `valid:true` lacking non-empty `project_id`) return `null` and are **never cached**; `registry.register` throws on absent/empty `project_id` as a second line of defense.
   - R6 (EPIC-027 boundary): all code under `connector/`.
   - R8 (retire M0 stub): correctly deferred — `auth-stub.ts` left in place; this story adds the real client alongside it.
   - R2 / R4 / R5 (indexed verify / Redis key shape / additive migrations): **N/A** — this story touches no DB and no Redis (HTTP-out + in-process `Map` cache; `db_write_set: []`).

5. **Boundary.** Nothing under `cleargate-cli/src` or `.claude/`; no PM-tool SDK import in any of the 3 files (grep clean).

## Notes (non-blocking)
- The registry red test builds `badEntry` with `connectionId` (camelCase) while `RegistryEntry` uses `connection_id`; the entry is cast `as unknown as RegistryEntry` and the guard throws on the empty `project_id` **before** reading `connection_id`, so the fail-closed path is still validated correctly. Harmless.
- `project_id` is sourced exclusively from the verify response (`shapeBinding`), never from client input — meets the §3.2 defense-in-depth intent.
- Service token sent in BOTH `authorization: Bearer` and `x-service-token` headers; the 047-03 mcp contract reads the auth header. Belt-and-suspenders, not a contract violation.

**Verdict: PASS.** Story is ready for §C.7 merge (DevOps owns the `Done` transition).
