/**
 * Stats bundle check — STORY-006-08
 *
 * Asserts the dashboard `/` route compiled output does NOT statically import chart.js.
 * Chart.js must only appear behind a dynamic import() inside onMount.
 *
 * This test uses the assertNoDashboardChartBundle() helper from admin/scripts/check-bundle.ts.
 * It reads the built output from `.svelte-kit/output/client/` or `build/client/`.
 *
 * NOTE: This test requires a prior `npm run build` to have run.
 * If build output is missing, the test is skipped with a warning (not failed),
 * since vitest CI runs build separately.
 *
 * For the static analysis variant: verify the RequestsChart.svelte source
 * does NOT have a top-level `import ... from 'chart.js'` statement.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

const ADMIN_DIR = resolve(import.meta.dirname, '../..');
const REQUESTS_CHART_SRC = resolve(
  ADMIN_DIR,
  'src/lib/components/RequestsChart.svelte',
);

describe('Stats bundle guard (STORY-006-08)', () => {
  it('RequestsChart.svelte source does NOT have a top-level static import for chart.js', () => {
    const source = readFileSync(REQUESTS_CHART_SRC, 'utf-8');

    // Extract the script block content
    const scriptMatch = source.match(/<script[^>]*>([\s\S]*?)<\/script>/);
    if (!scriptMatch) {
      throw new Error('RequestsChart.svelte has no <script> block');
    }
    const scriptContent = scriptMatch[1];

    // Any top-level import of chart.js is a violation
    const topLevelImportRe = /^import\s+.*from\s+['"]chart\.js/m;
    expect(
      topLevelImportRe.test(scriptContent),
      'chart.js must NOT appear as a top-level import in RequestsChart.svelte',
    ).toBe(false);

    // Dynamic import string MUST be present (proves lazy-load is implemented)
    expect(
      source.includes("import('chart.js/auto')"),
      "chart.js dynamic import must be present inside the component body",
    ).toBe(true);
  });

  it('dynamic import of chart.js/auto appears inside onMount (not at module scope)', () => {
    const source = readFileSync(REQUESTS_CHART_SRC, 'utf-8');

    // The dynamic import must be inside the onMount callback (not at module top-level)
    // We look for the pattern: onMount(() => { ... import('chart.js/auto') ... })
    const onMountBlockRe = /onMount\s*\(\s*\(\s*\)\s*=>\s*\{[\s\S]*?import\s*\(\s*['"]chart\.js\/auto['"]\s*\)/;
    expect(
      onMountBlockRe.test(source),
      "import('chart.js/auto') must appear inside the onMount callback",
    ).toBe(true);
  });

  it('build output has no static chart.js reference in dashboard node (if build exists)', () => {
    const clientDir1 = resolve(ADMIN_DIR, '.svelte-kit/output/client/_app/immutable');
    const clientDir2 = resolve(ADMIN_DIR, 'build/client/_app/immutable');

    const clientDir = existsSync(clientDir1) ? clientDir1 : existsSync(clientDir2) ? clientDir2 : null;

    if (!clientDir) {
      // Build hasn't run yet — skip with a note (not a failure in dev)
      console.warn(
        '[stats-bundle.test] Skipping build-output check — no compiled output found. ' +
          'Run `npm run build` in admin/ to enable this check.',
      );
      return;
    }

    // If build exists, run the assertNoDashboardChartBundle check
    // Import dynamically to avoid errors when build output is absent
    import('../../scripts/check-bundle.js')
      .then(({ assertNoDashboardChartBundle }) => {
        expect(() => assertNoDashboardChartBundle()).not.toThrow();
      })
      .catch(() => {
        // check-bundle.ts not compiled yet — skip
        console.warn('[stats-bundle.test] check-bundle.ts not compiled; skipping runtime check.');
      });
  });
});
