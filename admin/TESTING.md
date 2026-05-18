# admin/ Testing Guide

## Test runner

admin/ uses node:test exclusively (EPIC-028, 2026-05-18). vitest is eliminated.

**Run command:**
```bash
node --conditions browser --import tsx tests/run-tests.mjs
```

Or via npm:
```bash
npm test
```

## `--conditions browser` flag

The `--conditions browser` flag is **required** for admin/ tests. Without it, Svelte components and browser-only APIs (e.g. `window`, `document`, `navigator`) are unavailable, causing test failures.

How it works:
1. Node resolves `package.json` `"exports"` conditions — `"browser"` condition routes imports to browser-compatible builds.
2. `setup-node-test.mjs` (loaded via `--import tsx tests/run-tests.mjs`) detects the browser condition and bootstraps jsdom, setting `global.window`, `global.document`, and other browser globals.

## jsdom bootstrap (`setup-node-test.mjs`)

`tests/setup-node-test.mjs` is loaded at test startup. It:
1. Installs jsdom globally (`global.window = new JSDOM(...).window`).
2. Registers `tests/setup-node-test-hooks.mjs` as a module loader hook via `module.register()`.

## Module loader hooks (`setup-node-test-hooks.mjs`)

`tests/setup-node-test-hooks.mjs` is registered as a Node.js module loader hook. It:
1. Resolves SvelteKit virtual modules (`$app/navigation`, `$app/environment`, `$env/dynamic/public`, etc.) to stub files in `src/lib/__mocks__/`.
2. Compiles `.svelte` component files via `svelte/compiler`.
3. Compiles `.svelte.ts` rune-mode files via esbuild + `svelte/compiler`.

**Auto-create:** At import-time, setup-node-test-hooks.mjs checks whether `src/lib/__mocks__/app-environment.ts` exists and creates it if absent (writing `export const browser = true; export const building = false; export const dev = true;`). This ensures the file is always present, even in fresh checkouts that pre-date the stub. In practice the file is committed to the repo and this is only a safety net.

## `__overrides__` pattern

Static ESM imports cannot be intercepted at test time because the module is bound at parse time, before any test setup runs. For modules like `toast.svelte.ts` and `clipboard.ts` that are statically imported by components and make side-effectful calls (showing toasts, writing to clipboard), we use the `__overrides__` pattern:

### Pattern structure

1. **`src/lib/__mocks__/<module>.ts`** — a drop-in mock stub that reads from a mutable `__overrides__` object:
   ```ts
   export const __overrides__: Record<string, unknown> = {};

   export function toast(msg: string) {
     return typeof __overrides__['toast'] === 'function'
       ? (__overrides__['toast'] as (m: string) => void)(msg)
       : undefined;
   }
   ```

2. **Production seam in `src/lib/<module>.ts`** — exports a mutable `__overrides__` object that tests can set:
   ```ts
   // __overrides__ seam — for test isolation only; do not call in production code
   export const __overrides__: Record<string, unknown> = {};
   ```
   The real implementation checks `__overrides__` first:
   ```ts
   export function toast(msg: string) {
     if (typeof __overrides__['toast'] === 'function') {
       return (__overrides__['toast'] as (m: string) => void)(msg);
     }
     // real implementation...
   }
   ```

3. **Test usage:**
   ```ts
   import { __overrides__ } from '$lib/toast.svelte.js';

   test('shows error toast on failure', async () => {
     const calls: string[] = [];
     __overrides__['toast'] = (msg: string) => calls.push(msg);
     try {
       // ... trigger the component action ...
       assert.ok(calls.some(m => m.includes('Error')));
     } finally {
       delete __overrides__['toast']; // cleanup
     }
   });
   ```

### Why this pattern?

The loader hook in `setup-node-test-hooks.mjs` redirects **component** imports to `__mocks__/` stubs (via `LOCAL_MOCK_OVERRIDES`). However, for modules that are statically imported (not dynamically injected), the test file itself gets the real module. The `__overrides__` seam in the production source is the escape hatch — it lets tests intercept calls without module-loader magic.

**Known debt:** The two prod-source seams (`toast.svelte.ts`, `clipboard.ts`) are accepted as technical debt. A SPRINT-29 CR is planned to refactor these toward constructor DI, eliminating the prod seam entirely.

### Affected modules (as of EPIC-028)

| Module | Mock stub | Prod seam |
|--------|-----------|-----------|
| `src/lib/toast.svelte.ts` | `src/lib/__mocks__/mcp-client.ts` | yes — `__overrides__` exported |
| `src/lib/clipboard.ts` | N/A (redirected via hooks) | yes — `__overrides__` exported |

## File naming

All test files: `*.node.test.ts`

- `tests/unit/` — unit tests for components and utilities
- `tests/e2e/` — Playwright end-to-end tests (separate runner: `npm run e2e`)

## Adding new tests

1. Create `tests/unit/<feature>.node.test.ts`.
2. Import from `node:test` and `node:assert/strict`.
3. For components that use `$app` or `$env` virtuals — no extra setup needed; the loader hook handles resolution.
4. For components with static imports of side-effectful modules — use the `__overrides__` pattern.
5. Run: `npm test`.
