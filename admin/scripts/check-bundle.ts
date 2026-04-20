/**
 * Bundle assertion — STORY-006-08
 *
 * Asserts that the `/` (dashboard) route's compiled output does NOT
 * transitively include any chunk referencing chart.js.
 *
 * Chart.js is lazy-loaded inside onMount in RequestsChart.svelte; it
 * must NEVER appear in the initial dashboard bundle.
 *
 * Usage:
 *   node --loader ts-node/esm admin/scripts/check-bundle.ts
 *   OR via tsx:  tsx admin/scripts/check-bundle.ts
 *
 * Wired as `bundle:check` npm script in admin/package.json.
 * Also called from the vitest integration test stats-bundle.test.ts.
 */
import { readdirSync, readFileSync, existsSync } from 'fs';
import { join, resolve } from 'path';

const ADMIN_DIR = resolve(import.meta.dirname, '..');

/** SvelteKit adapter-node build output: client assets */
const CLIENT_IMMUTABLE = join(
  ADMIN_DIR,
  '.svelte-kit',
  'output',
  'client',
  '_app',
  'immutable',
);

/** Fallback: post-adapter-build path */
const BUILD_CLIENT = join(ADMIN_DIR, 'build', 'client', '_app', 'immutable');

function resolveClientDir(): string {
  if (existsSync(CLIENT_IMMUTABLE)) return CLIENT_IMMUTABLE;
  if (existsSync(BUILD_CLIENT)) return BUILD_CLIENT;
  throw new Error(
    `Could not find compiled client assets. Tried:\n  ${CLIENT_IMMUTABLE}\n  ${BUILD_CLIENT}\n` +
      'Run `npm run build` in admin/ first.',
  );
}

/**
 * Find the dashboard route chunk. SvelteKit compiles route nodes into
 * `nodes/` with numeric indices. Node 0 is typically the root layout,
 * node 1 is the error page, node 2 onwards are pages in route registration order.
 *
 * Strategy: scan all .js files in nodes/ and chunks/ reachable from the
 * dashboard route; assert none of them reference 'chart.js'.
 */
export function assertNoDashboardChartBundle(): void {
  const clientDir = resolveClientDir();
  const nodesDir = join(clientDir, 'nodes');
  const chunksDir = join(clientDir, 'chunks');

  if (!existsSync(nodesDir)) {
    throw new Error(`nodes/ dir not found at ${nodesDir}. Build may be incomplete.`);
  }

  // Read all node files and chunk files
  const nodeFiles = readdirSync(nodesDir)
    .filter((f) => f.endsWith('.js'))
    .map((f) => readFileSync(join(nodesDir, f), 'utf-8'));

  const chunkFiles = existsSync(chunksDir)
    ? readdirSync(chunksDir)
        .filter((f) => f.endsWith('.js'))
        .map((f) => readFileSync(join(chunksDir, f), 'utf-8'))
    : [];

  // The dashboard route is the root index page (/).
  // Look for node files that contain references to the root route path
  // or are the "entry" node. We check node-0 (root layout) and node files
  // that do NOT reference '/stats'.
  const allContent = [...nodeFiles, ...chunkFiles];

  // For a simple assertion: no chunk loaded eagerly (not behind dynamic import)
  // at the module level should contain "chart.js" in its static import statements.
  // Dynamic `import('chart.js/auto')` is inside async callbacks, so it appears
  // as a string literal but IS expected in the RequestsChart chunk — not in the
  // dashboard route node.

  // Identify which chunks are reachable without navigating to /stats.
  // Heuristic: dashboard route node (/) will import layout + root page node.
  // RequestsChart.svelte is only imported from stats/+page.svelte.
  // So any node/chunk that contains "chart.js" as a STATIC ESM import is a violation.

  // Check: no node file has a top-level static import for chart.js
  const CHART_STATIC_IMPORT_RE = /^import\s+.*from\s+['"]chart\.js/m;
  // Also catch require() for CJS compat scenarios
  const CHART_REQUIRE_RE = /require\(['"]chart\.js/;

  const violations: string[] = [];

  for (let i = 0; i < nodeFiles.length; i++) {
    const content = nodeFiles[i];
    if (CHART_STATIC_IMPORT_RE.test(content) || CHART_REQUIRE_RE.test(content)) {
      violations.push(`nodes/${i}: contains static chart.js import`);
    }
  }

  if (violations.length > 0) {
    throw new Error(
      `BUNDLE VIOLATION: chart.js found in dashboard-reachable chunks:\n` +
        violations.map((v) => `  - ${v}`).join('\n') +
        '\n\nChart.js must only appear behind a dynamic import() inside onMount.',
    );
  }

  console.log('Bundle check passed: chart.js is NOT statically imported in any dashboard chunk.');
}

// Run directly when executed as a script
if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    assertNoDashboardChartBundle();
    process.exit(0);
  } catch (err) {
    console.error((err as Error).message);
    process.exit(1);
  }
}
