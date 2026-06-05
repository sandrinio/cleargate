# STORY-047-05 — Developer Report

**Story:** Broker — verify-client + fail-closed + short-TTL verify cache + project_id stamping
**Repo:** connector (broker edge) · **Branch:** story/STORY-047-05 · **Lane:** standard
**Result:** done — typecheck pass, 39/39 broker tests green (8 in the new verify-client suite + 31 pre-existing, no regressions).

## What was built

### `connector/broker/src/auth/verify-client.ts` (NEW)
`createVerifyClient({ serviceToken, mcpBaseUrl, ttlMs?, requestTimeoutMs? })` → `VerifyClient` with an in-process
positive cache (`Map<credentialHash, CacheRecord>`). The raw credential is **never** stored as a key — entries are
keyed by `SHA-256(credential)` via `node:crypto`.

`verify(credential, kind, connector_meta?)`:
1. Hash credential → cache hit (non-expired) returns the binding with **no network call**.
2. Miss → `POST {mcp}/admin-api/v1/connections/verify` with the broker service token in BOTH `authorization: Bearer …`
   and `x-service-token` headers (the red stub reads either), body `{ credential, kind, connector_meta? }`, under a
   bounded `AbortController` timeout (default 2000ms, `requestTimeoutMs` override).
3. **Fail closed (return `null`, never cache)** on ANY of: network error, timeout/abort, non-2xx, unparsable JSON,
   `valid !== true`, or `valid:true` lacking a non-empty `project_id`.
4. Success (`valid:true` + non-empty `project_id`) → store `{project_id, scopes, token_id?, connection_id?, member_id?,
   protocol_version?, expiresAt: now+TTL}` and return the binding.
5. `invalidate(subject)` deletes matching entries by `credential_hash` and/or `token_id`/`connection_id` — exposed for
   047-06's revoke subscriber; this story does **not** subscribe.

TTL: `ttlMs` arg → `BROKER_VERIFY_CACHE_TTL_MS` env → hardcoded 30 000ms fallback.

### `connector/broker/src/registry.ts` (MODIFY)
`MemoryRegistry.register()` now **throws (fails closed)** when `entry.project_id` is absent/empty — defense-in-depth so a
missing project never silently binds. This is the only registry change; no verify/cache/service-token logic leaks in (a
single comment references the verify-client by name). Existing register call sites all pass non-empty `project_id`
(`proj-1`, `claims.project_id` = `stub-project-1`), so no regression.

## Key decisions
- **Service token sent in two headers** (`authorization` Bearer + `x-service-token`) — covers both header conventions;
  the 047-03 mcp contract uses the broker service token in the auth header and the red stub accepts either.
- **Separate bounded request timeout (2000ms default) independent of `ttlMs`** — the timeout-variant red test passes
  `ttlMs: 30_000` against a never-responding stub and expects fail-closed; the request timeout (not the cache TTL) is
  what fires. 2000ms keeps the suite snappy while staying production-sane for a rare connect-time hop.
- **`null` return = fail-closed denial** (not a thrown error) for `verify`; the red `runVerify` helper tolerates both,
  and `null` keeps the gateway-wiring (047-07) branch-on-result simple.
- Honored `exactOptionalPropertyTypes` / `noUncheckedIndexedAccess` — optional binding fields are conditionally assigned,
  never set to `undefined`.

## Deviations from story surface
- Test file is `verify-client.red.node.test.ts` (QA-Red frozen), not the `verify-client.node.test.ts` named in §3.1 —
  the red file is the actual acceptance and was left untouched (not edited/skipped). No separate dev-authored test file
  was added; the frozen red suite fully covers all 6 Gherkin scenarios + timeout variant + the registry stamp.
- No DB/Redis touched (`db_write_set: []`) — cache is in-process, verify is HTTP-out via global fetch.

## Gates
- `npm run build --workspace=shared` → clean (run before each typecheck/test).
- `npm run typecheck --workspace=broker` → pass.
- `npm test --workspace=broker` → 39 pass, 0 fail.
- Red baseline confirmed pre-impl: whole `verify-client.red.node.test.ts` failed `ERR_MODULE_NOT_FOUND` (missing module).
