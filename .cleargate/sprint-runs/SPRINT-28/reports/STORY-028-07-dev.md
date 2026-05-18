# STORY-028-07 Developer Report — admin/ vitest elimination

## Conversion Statistics

- **Total test files converted:** 34 vitest `.test.ts` → node:test `.node.test.ts`
- **Red test files (immutable):** 1 (`TokenIssuedModal.cr061.red.node.test.ts` — renamed from `.red.test.ts`)
- **vitest.config.ts:** deleted
- **vitest removed from devDependencies:** yes
- **`npm test` result:** 268 pass, 0 fail

## Svelte Compatibility Preflight

Node.js module loader hooks (`tests/setup-node-test-hooks.mjs`) handle:
1. `.svelte` component files → `svelte/compiler compile()`
2. `.svelte.js` rune-mode files → `svelte/compiler compileModule()`
3. `.svelte.ts` rune-mode TS files → esbuild TS strip → `svelte/compiler compileModule()`
4. Virtual module fallbacks: `$app/navigation`, `$env/dynamic/public`, `$app/stores`, `chart.js/auto`, `ioredis`
5. Local override redirects: `mcp-client.ts` → `__mocks__/mcp-client.ts` (for component tests only; skipped when importer is a test file)

The `--conditions browser` flag is required to get Svelte client-side rendering (not SSR).

## Manual Fix Report Summary

Key issues discovered and fixed:

1. **`mock.module()` cannot intercept static ESM imports** — root architectural challenge. Solution: `__overrides__` mutable shared state pattern in stub files (app-navigation, env-dynamic-public, mcp-client, clipboard, toast, ioredis, chart-js-auto).

2. **`mock.calls[i]` is an object** — node:test returns `{ arguments: [...], error, result, stack }`, not a plain array. All expect shim `toHaveBeenCalledWith` implementations updated + direct `.mock.calls[i][0]` patterns corrected.

3. **`mock.module()` format** — node v25 requires `{ exports: {...} }`, not factory functions.

4. **`mock.timers.enable()` API** — requires `{ apis: [...] }` object, not plain array. `clearTimeout` is not a valid API name.

5. **SvelteKit virtual modules** — `$env/dynamic/public`, `$types`, `$app/*` needed stubs for both runtime (loader hooks) and compile-time (`sveltekit-virtual.d.ts`). Replaced `extends: ".svelte-kit/tsconfig.json"` with explicit compiler options.

6. **ioredis static import** — `health-checks.ts` uses static ioredis import. Added `ioredis` to VIRTUAL_FALLBACKS. Extended `__ioredisState__` with `methodOverrides` for per-test control of `connect()`/`ping()`/`disconnect()`.

7. **mcp-client mock redirect** — `LOCAL_MOCK_OVERRIDES` hook intercepts mcp-client.ts for component tests but NOT for mcp-client.node.test.ts (importer detection via `context.parentURL`).

8. **Mock type annotations** — `mock.fn()` inferred as `Mock<() => undefined>` conflicts with component props expecting `() => Promise<void>`. Fixed with explicit type params or `mock.fn(() => Promise.resolve(undefined))`.

9. **`expect(val, msg)` two-arg pattern** — expect shim only accepts one arg; converted to `assert.ok(val, msg)`.

10. **`rejects.toThrow(ErrorClass)` pattern** — shim's `toThrow` only handled `string | RegExp`; added Error constructor type.

## Files Changed

New files created: `admin/tests/run-tests.mjs`, `admin/tests/setup-node-test.mjs`, `admin/tests/setup-node-test-hooks.mjs`, `admin/tests/mock-overrides.ts`, `admin/src/sveltekit-virtual.d.ts`, `admin/src/lib/__mocks__/{app-environment,app-navigation,chart-js-auto,env-dynamic-public,ioredis,mcp-client}.ts`.

Modified: `admin/package.json`, `admin/tsconfig.json`, `admin/src/lib/utils/clipboard.ts`, `admin/src/lib/stores/toast.svelte.ts`, `admin/src/lib/__mocks__/app-navigation.ts`, `admin/src/lib/__mocks__/env-dynamic-public.ts`.

Deleted: `admin/vitest.config.ts`, all 34 `admin/tests/unit/*.test.ts` vitest files.

Added: 34 `admin/tests/unit/*.node.test.ts` converted files.
