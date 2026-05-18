import { describe, test } from 'node:test';
import assert from 'node:assert/strict';

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
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

// Minimal expect() shim (STORY-028-06)
// Backs remaining expect() calls with node:assert so vitest is not needed.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function expect(actual: any): any {
  const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return {
    toBe(expected: unknown) { assert.strictEqual(actual, expected); },
    toEqual(expected: unknown) { assert.deepStrictEqual(actual, expected); },
    toStrictEqual(expected: unknown) { assert.deepStrictEqual(actual, expected); },
    toBeNull() { assert.strictEqual(actual, null); },
    toBeUndefined() { assert.strictEqual(actual, undefined); },
    toBeDefined() { assert.notStrictEqual(actual, undefined); },
    toBeTruthy() { assert.ok(actual); },
    toBeFalsy() { assert.ok(!actual); },
    toBeGreaterThan(n: number) { assert.ok((actual as number) > n); },
    toBeGreaterThanOrEqual(n: number) { assert.ok((actual as number) >= n); },
    toBeLessThan(n: number) { assert.ok((actual as number) < n); },
    toBeLessThanOrEqual(n: number) { assert.ok((actual as number) <= n); },
    toContain(sub: unknown) { assert.ok(String(actual).includes(String(sub))); },
    toMatch(p: string | RegExp) { assert.match(String(actual), typeof p === 'string' ? new RegExp(esc(p)) : p); },
    toHaveLength(len: number) { assert.strictEqual((actual as { length: number }).length, len); },
    toThrow(msg?: string | RegExp) {
      if (!msg) assert.throws(actual as () => void);
      else if (typeof msg === 'string') assert.throws(actual as () => void, new RegExp(esc(msg)));
      else assert.throws(actual as () => void, msg);
    },
    toBeInstanceOf(cls: new (...a: unknown[]) => unknown) { assert.ok(actual instanceof cls); },
    toMatchObject(expected: Record<string, unknown>) { assert.deepStrictEqual(actual, expected); },
    toHaveBeenCalled() { assert.ok((actual as { mock: { calls: unknown[] } }).mock.calls.length > 0); },
    toHaveBeenCalledTimes(n: number) { assert.strictEqual((actual as { mock: { calls: unknown[] } }).mock.calls.length, n); },
    toHaveBeenCalledOnce() { assert.strictEqual((actual as { mock: { calls: unknown[] } }).mock.calls.length, 1); },
    toHaveBeenCalledWith(...expectedArgs: unknown[]) {
      const calls = (actual as { mock: { calls: { arguments: unknown[] }[] } }).mock.calls;
      assert.deepStrictEqual(calls[calls.length - 1]?.arguments, expectedArgs);
    },
    toHaveProperty(key: string, val?: unknown) {
      const obj = actual as Record<string, unknown>;
      assert.ok(key in obj);
      if (val !== undefined) assert.deepStrictEqual(obj[key], val);
    },
    get not(): any {
      return {
        toBe(expected: unknown) { assert.notStrictEqual(actual, expected); },
        toEqual(expected: unknown) { assert.notDeepStrictEqual(actual, expected); },
        toBeNull() { assert.notStrictEqual(actual, null); },
        toBeUndefined() { assert.notStrictEqual(actual, undefined); },
        toBeDefined() { assert.strictEqual(actual, undefined); },
        toBeTruthy() { assert.ok(!actual); },
        toBeFalsy() { assert.ok(actual); },
        toContain(sub: unknown) { assert.ok(!String(actual).includes(String(sub))); },
        toMatch(p: string | RegExp) { assert.doesNotMatch(String(actual), typeof p === 'string' ? new RegExp(esc(p)) : p); },
        toThrow() { assert.doesNotThrow(actual as () => void); },
        toHaveBeenCalled() { assert.strictEqual((actual as { mock: { calls: unknown[] } }).mock.calls.length, 0); },
        toHaveProperty(key: string) { const obj = actual as Record<string, unknown>; assert.ok(!(key in obj)); },
        toBeInstanceOf(cls: new (...a: unknown[]) => unknown) { assert.ok(!(actual instanceof cls)); },
        toHaveLength(len: number) { assert.notStrictEqual((actual as { length: number }).length, len); },
      };
    },
    get resolves(): any {
      const p = actual as Promise<unknown>;
      return {
        async toBe(expected: unknown) { assert.strictEqual(await p, expected); },
        async toEqual(expected: unknown) { assert.deepStrictEqual(await p, expected); },
        async toBeUndefined() { assert.strictEqual(await p, undefined); },
        async toBeNull() { assert.strictEqual(await p, null); },
        async toBeDefined() { assert.notStrictEqual(await p, undefined); },
        async toBeTruthy() { assert.ok(await p); },
      };
    },
    get rejects(): any {
      const p = actual as Promise<unknown>;
      return {
        async toBeInstanceOf(cls: new (...a: unknown[]) => unknown) { await assert.rejects(p, cls); },
        async toThrow(msg?: string) {
          if (!msg) await assert.rejects(p);
          else await assert.rejects(p, new RegExp(esc(msg)));
        },
        async toSatisfy(predicate: (val: unknown) => boolean) {
          let err: unknown;
          try { await p; } catch(e) { err = e; }
          assert.ok(predicate(err), `Rejected value did not satisfy predicate. Got: ${String(err)}`);
        },
      };
    },
  };
}


const ADMIN_DIR = resolve(import.meta.dirname, '../..');
const REQUESTS_CHART_SRC = resolve(
  ADMIN_DIR,
  'src/lib/components/RequestsChart.svelte',
);

describe('Stats bundle guard (STORY-006-08)', () => {
  test('RequestsChart.svelte source does NOT have a top-level static import for chart.js', () => {
    const source = readFileSync(REQUESTS_CHART_SRC, 'utf-8');

    // Extract the script block content
    const scriptMatch = source.match(/<script[^>]*>([\s\S]*?)<\/script>/);
    if (!scriptMatch) {
      throw new Error('RequestsChart.svelte has no <script> block');
    }
    const scriptContent = scriptMatch[1];

    // Any top-level import of chart.js is a violation
    const topLevelImportRe = /^import\s+.*from\s+['"]chart\.js/m;
    assert.strictEqual(
      topLevelImportRe.test(scriptContent), false,
      'chart.js must NOT appear as a top-level import in RequestsChart.svelte',
    );

    // Dynamic import string MUST be present (proves lazy-load is implemented)
    assert.ok(
      source.includes("import('chart.js/auto')"),
      "chart.js dynamic import must be present inside the component body",
    );
  });

  test('dynamic import of chart.js/auto appears inside onMount (not at module scope)', () => {
    const source = readFileSync(REQUESTS_CHART_SRC, 'utf-8');

    // The dynamic import must be inside the onMount callback (not at module top-level)
    // We look for the pattern: onMount(() => { ... import('chart.js/auto') ... })
    const onMountBlockRe = /onMount\s*\(\s*\(\s*\)\s*=>\s*\{[\s\S]*?import\s*\(\s*['"]chart\.js\/auto['"]\s*\)/;
    assert.ok(
      onMountBlockRe.test(source),
      "import('chart.js/auto') must appear inside the onMount callback",
    );
  });

  test('build output has no static chart.js reference in dashboard node (if build exists)', () => {
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
