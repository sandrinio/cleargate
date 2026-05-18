/**
 * setup-node-test-hooks.mjs — STORY-028-07
 *
 * Node.js module loader hooks for admin/ test suite.
 * Registered via `register()` in setup-node-test.mjs.
 *
 * Handles:
 *   1. SvelteKit virtual module paths ($env, $app) → pass through to mock.module
 *      IMPORTANT: We do NOT resolve these to stub files here. Instead we leave
 *      them as-is so that mock.module('$app/navigation', ...) can intercept them.
 *      The tsconfig.json paths handle resolution for TypeScript type-checking only.
 *      At RUNTIME for tests that DON'T mock these, they'll fail — but all component
 *      tests that use $app/navigation DO mock it via mock.module().
 *   2. .svelte component files → compiled via svelte/compiler `compile()`
 *   3. .svelte.js rune-mode JS files → compiled via svelte/compiler `compileModule()`
 *   4. .svelte.ts rune-mode TS files → TypeScript-stripped via esbuild, then svelte `compileModule()`
 */

import { fileURLToPath, pathToFileURL } from 'node:url';
import * as path from 'node:path';
import * as fs from 'node:fs';

// Admin root = tests/../ = admin/
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ADMIN_ROOT = path.resolve(__dirname, '..');
const MOCKS_DIR = path.join(ADMIN_ROOT, 'src', 'lib', '__mocks__');

// SvelteKit virtual module fallbacks (used when NOT mocked via mock.module)
const VIRTUAL_FALLBACKS = {
  '$env/dynamic/public': path.join(MOCKS_DIR, 'env-dynamic-public.ts'),
  '$env/static/public': path.join(MOCKS_DIR, 'env-dynamic-public.ts'),
  '$app/navigation': path.join(MOCKS_DIR, 'app-navigation.ts'),
  '$app/stores': path.join(MOCKS_DIR, 'app-stores.ts'),
  // chart.js/auto: redirect dynamic import to test-controllable mock
  // The RequestsChart component lazy-imports chart.js/auto in onMount
  'chart.js/auto': path.join(MOCKS_DIR, 'chart-js-auto.ts'),
  // ioredis: redirect to in-memory mock to prevent real Redis connections
  // redis-adapter.ts uses 'import Redis from "ioredis"' (static import)
  'ioredis': path.join(MOCKS_DIR, 'ioredis.ts'),
};

// Local module overrides — redirect to mock files in __mocks__/ directory
// These allow components to call mock functions set up in tests via __mockFns__ pattern
const LIB_DIR = path.join(ADMIN_ROOT, 'src', 'lib');
const LOCAL_MOCK_OVERRIDES = {
  // mcp-client is mocked during tests to avoid real HTTP calls
  [path.join(LIB_DIR, 'mcp-client.ts')]: path.join(MOCKS_DIR, 'mcp-client.ts'),
  [path.join(LIB_DIR, 'mcp-client.js')]: path.join(MOCKS_DIR, 'mcp-client.ts'),
};

// Ensure app-environment stub exists.
// AUTO-CREATE NOTE (STORY-028-08 / Directive 4): this file is committed to the repo at
// src/lib/__mocks__/app-environment.ts, but this guard creates it at import-time if absent
// (e.g. fresh checkout where the file was never committed, or git clean -fx). The guard is
// a safety net — the committed file is always the authoritative source.
const appEnvStub = path.join(MOCKS_DIR, 'app-environment.ts');
if (!fs.existsSync(appEnvStub)) {
  fs.writeFileSync(appEnvStub, 'export const browser = true;\nexport const building = false;\nexport const dev = true;\n');
}
VIRTUAL_FALLBACKS['$app/environment'] = appEnvStub;

// Lazy compiler cache
let svelteCompiler = null;
let esbuild = null;

async function getSvelteCompiler() {
  if (!svelteCompiler) {
    svelteCompiler = await import('svelte/compiler');
  }
  return svelteCompiler;
}

async function getEsbuild() {
  if (!esbuild) {
    esbuild = await import('esbuild');
  }
  return esbuild;
}

export async function resolve(specifier, context, nextResolve) {
  // SvelteKit virtual module fallbacks
  // These are used when a component imports $app/$env WITHOUT an explicit mock.module()
  if (VIRTUAL_FALLBACKS[specifier]) {
    return {
      url: pathToFileURL(VIRTUAL_FALLBACKS[specifier]).href,
      shortCircuit: true,
    };
  }

  // First resolve the specifier normally, then check if we have a local override
  const resolved = await nextResolve(specifier, context);

  // Check if the resolved URL maps to a file we want to override.
  // IMPORTANT: Skip the override when the importer is a test file itself (*.node.test.ts,
  // *.test.ts) — those files import the REAL module under test and inject mocks via _setFetch,
  // constructor params, etc. Only redirect for non-test importers (i.e. components).
  const parentUrl = context.parentURL ?? '';
  const importerIsTestFile = parentUrl.includes('.node.test.ts') ||
    (parentUrl.includes('.test.ts') && !parentUrl.includes('.node.test.ts'));

  if (!importerIsTestFile && resolved.url?.startsWith('file://')) {
    const resolvedPath = fileURLToPath(resolved.url);
    if (LOCAL_MOCK_OVERRIDES[resolvedPath]) {
      return {
        url: pathToFileURL(LOCAL_MOCK_OVERRIDES[resolvedPath]).href,
        shortCircuit: true,
      };
    }
  }

  return resolved;
}

export async function load(url, context, nextLoad) {
  // Strip query strings for file path resolution
  const cleanUrl = url.split('?')[0];

  // Handle .svelte component files
  if (cleanUrl.endsWith('.svelte')) {
    const filePath = fileURLToPath(cleanUrl);
    const source = fs.readFileSync(filePath, 'utf8');

    const { compile } = await getSvelteCompiler();

    const result = compile(source, {
      filename: filePath,
      generate: 'client',
      dev: false,
    });

    // The compiled output may have `import ... from '$app/navigation'` etc.
    // These virtual paths need to be resolvable. Our resolve() hook maps them
    // to stub files. The compiled code keeps the virtual path which our hook resolves.
    // This is correct — do NOT rewrite the paths here.

    return {
      format: 'module',
      source: result.js.code,
      shortCircuit: true,
    };
  }

  // Handle .svelte.js rune-mode JS files (e.g. props.svelte.js from @testing-library)
  if (cleanUrl.endsWith('.svelte.js')) {
    const filePath = fileURLToPath(cleanUrl);
    const rawSource = fs.readFileSync(filePath, 'utf8');

    const { compileModule } = await getSvelteCompiler();

    const result = compileModule(rawSource, {
      filename: filePath,
      generate: 'client',
    });

    return {
      format: 'module',
      source: result.js.code,
      shortCircuit: true,
    };
  }

  // Handle .svelte.ts rune-mode TypeScript files
  // These need TypeScript stripping before svelte compilation
  if (cleanUrl.endsWith('.svelte.ts')) {
    const filePath = fileURLToPath(cleanUrl);
    const rawSource = fs.readFileSync(filePath, 'utf8');

    // Step 1: Strip TypeScript types with esbuild (transpile-only, no bundle)
    const eb = await getEsbuild();
    const tsResult = await eb.transform(rawSource, {
      loader: 'ts',
      format: 'esm',
      target: 'esnext',
    });
    const jsSource = tsResult.code;

    // Step 2: Compile the TypeScript-stripped JS as a Svelte module
    const { compileModule } = await getSvelteCompiler();

    const svelteResult = compileModule(jsSource, {
      filename: filePath.replace(/\.ts$/, '.js'), // tell svelte it's JS
      generate: 'client',
    });

    return {
      format: 'module',
      source: svelteResult.js.code,
      shortCircuit: true,
    };
  }

  return nextLoad(url, context);
}
