# STORY-028-05 Dev Report — mcp/ vitest → node:test conversion

**Status:** done  
**Story:** STORY-028-05  
**Sprint:** SPRINT-28  

## Conversion Summary

- **Vitest files converted:** 50 (all `*.test.ts` in `mcp/src/` and `mcp/scripts/`)
- **Auto-converted by codemod (STORY-028-04):** 8 files (only 7 matchers handled)
- **Manually converted:** 42 files (toMatchObject, toContain, toBeInstanceOf, etc.)
- **Pre-existing .node.test.ts (mcp/test/):** 18 files (untouched)
- **Total .node.test.ts post-conversion:** 68 files

## Key Fixes Applied

1. **`mock.module()` requires `--experimental-test-module-mocks`** flag — added to test script.
2. **`--test-concurrency=1`** — DB integration tests share a single Postgres/Redis; parallel file execution caused cross-test contamination.
3. **`beforeAll`/`afterAll` → `before`/`after`** — node:test uses different lifecycle hook names.
4. **Mock `AdminApiError` used `errorType` not `kind`** — the real class uses `.kind`; updated 4 command test mocks.
5. **`assert.throws(fn, 'string')` is ambiguous** in node:test — replaced with RegExp in registry test.
6. **Residual `expect()` calls** in jwt.test, idempotency.test, pull-item.test, sync-status.test — converted to `assert.rejects()`.
7. **`it.skipIf()` (vitest API)** in live SMTP test — replaced with `{ skip: !process.env.VAR }` option.
8. **`@hono/node-server` socket.destroySoon** — Hono adapter calls `socket.destroySoon()` on Fastify's inject() fake socket after 500ms timer. Fixed by adding a no-op `destroySoon` via Fastify's `onRequest` hook in service-token.node.test.ts.
9. **`vi.mock()` comment in production file** — `linear-adapter.ts` had `vi.mock()` in a JSDoc comment; replaced with neutral wording.

## File Changes

- `mcp/package.json` — removed `vitest` devDependency, updated test script to `node --test --test-concurrency=1 --experimental-test-module-mocks --env-file=.env --import tsx/esm`
- `mcp/vitest.config.ts` — deleted
- 50 `*.test.ts` files — renamed and converted to `*.node.test.ts`
- `mcp/src/adapters/linear-adapter.ts` — comment updated (vi.mock() reference removed)

## Test Results

- **Tests:** 506 total (505 pass, 0 fail, 1 skipped)
- **Skipped:** ResendMailer live SMTP test (requires `CLEARGATE_RESEND_LIVE=1`)
- **Exit code:** 0
- **Typecheck:** clean (tsc --noEmit no errors)

## Deviations from Plan

- None material. The codemod handled 8 files; 42 required manual conversion (expected per Architect plan which said "manually fix MANUAL-FIX-REQUIRED files").
- `--test-concurrency=1` added (not explicitly in plan but required for DB isolation, matches vitest's `singleFork: true` behavior).
- Socket teardown fix (onRequest hook) is an improvement over the Architect's "pre-existing warnings are OK" note — we actually fixed it rather than tolerating failures.
