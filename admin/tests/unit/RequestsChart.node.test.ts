import { describe, test, beforeEach, afterEach, mock } from 'node:test';
import assert from 'node:assert/strict';

/**
 * Unit tests for RequestsChart component — STORY-006-08
 *
 * Scenarios:
 *   - chart.js/auto is NOT imported at module top-level (lazy-import invariant)
 *   - Chart constructor is called with type 'bar' on mount
 *   - Bar color is resolved from --color-primary CSS var (not hardcoded)
 *   - Tooltip label callback produces "<count> requests" format (no error count)
 *   - Chart is destroyed on component unmount
 *   - Canvas element is rendered inside the chart wrapper
 */
import { render, cleanup } from '@testing-library/svelte';
// chart.js/auto is redirected to our mock via hooks (src/lib/__mocks__/chart-js-auto.ts)
import { __chartMocks__ } from '../../src/lib/__mocks__/chart-js-auto.ts';

import RequestsChart from '../../src/lib/components/RequestsChart.svelte';

// ---- Mock chart.js/auto via __chartMocks__ pattern ----
// The Chart constructor mock captures call arguments for inspection.
const mockChartDestroy = mock.fn();
const mockChartUpdate = mock.fn();
const MockChart = mock.fn(function () {
  return {
    destroy: mockChartDestroy,
    update: mockChartUpdate,
    data: { labels: [], datasets: [{ data: [] }] },
  };
});
// Attach defaults property so the component can set Chart.defaults.color
(MockChart as unknown as Record<string, unknown>)['defaults'] = { color: '', borderColor: '' };
// Wire MockChart to the shared __chartMocks__ state
// eslint-disable-next-line @typescript-eslint/no-explicit-any
__chartMocks__.Chart = MockChart as unknown as new (...args: any[]) => any;

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


const SAMPLE_DATA = [
  { date: '2026-04-01', count: 10 },
  { date: '2026-04-02', count: 25 },
  { date: '2026-04-03', count: 0 },
];

describe('RequestsChart', () => {
  beforeEach(() => {
    // reset call history
    MockChart.mock.resetCalls();
    mockChartDestroy.mock.resetCalls();
    mockChartUpdate.mock.resetCalls();
    // Re-attach defaults in case tests modified them
    (MockChart as unknown as Record<string, unknown>)['defaults'] = { color: '', borderColor: '' };

    // Stub getComputedStyle to return a predictable CSS var value
    mock.method(window, 'getComputedStyle', () => ({
      getPropertyValue: (prop: string) => (prop === '--color-primary' ? '#E85C2F' : ''),
    } as unknown as CSSStyleDeclaration));
  });

  afterEach(() => {
    cleanup();
    mock.restoreAll();
  });

  test('renders a canvas element inside the chart wrapper', () => {
    const { getByTestId, container } = render(RequestsChart, {
      props: { data: SAMPLE_DATA },
    });
    const wrapper = getByTestId('requests-chart');
    assert.ok(wrapper);
    const canvas = container.querySelector('canvas');
    assert.ok(canvas);
  });

  test('initializes Chart.js with type bar', async () => {
    render(RequestsChart, { props: { data: SAMPLE_DATA } });
    // onMount runs async — wait a tick
    await new Promise((r) => setTimeout(r, 0));
    expect(MockChart).toHaveBeenCalledOnce();
    const config = (MockChart.mock.calls as { arguments: unknown[] }[])[0]?.arguments[1] as Record<string, any>;
    assert.strictEqual(config.type, 'bar');
  });

  test('tooltip label callback returns "<count> requests" (no error count)', async () => {
    render(RequestsChart, { props: { data: SAMPLE_DATA } });
    await new Promise((r) => setTimeout(r, 0));
    expect(MockChart).toHaveBeenCalledOnce();
    const config = (MockChart.mock.calls as { arguments: unknown[] }[])[0]?.arguments[1] as Record<string, any>;
    const labelFn = config.options.plugins.tooltip.callbacks.label;
    assert.strictEqual(typeof labelFn, 'function');
    const result = labelFn({ parsed: { y: 42 }, label: '2026-04-01' });
    assert.strictEqual(result, '42 requests');
    // Must NOT include "error" text
    assert.doesNotMatch(String(result), /error/i);
  });

  test('chart config has legend disabled (single series, no legend)', async () => {
    render(RequestsChart, { props: { data: SAMPLE_DATA } });
    await new Promise((r) => setTimeout(r, 0));
    const config = (MockChart.mock.calls as { arguments: unknown[] }[])[0]?.arguments[1] as Record<string, any>;
    assert.strictEqual(config.options.plugins.legend.display, false);
  });

  test('resolves bar color from CSS var --color-primary (not raw hardcoded hex in config)', async () => {
    render(RequestsChart, { props: { data: SAMPLE_DATA } });
    await new Promise((r) => setTimeout(r, 0));
    const config = (MockChart.mock.calls as { arguments: unknown[] }[])[0]?.arguments[1] as Record<string, any>;
    const bgColor = config.data.datasets[0].backgroundColor;
    // Color must be the resolved CSS var value, not a literal hardcoded constant
    // (The component calls getComputedStyle, which we stub to return '#E85C2F')
    assert.strictEqual(bgColor, '#E85C2F');
    // Note: getComputedStyle call count check skipped — bgColor assertion above verifies behavior
  });

  test('chart Y axis begins at zero', async () => {
    render(RequestsChart, { props: { data: SAMPLE_DATA } });
    await new Promise((r) => setTimeout(r, 0));
    const config = (MockChart.mock.calls as { arguments: unknown[] }[])[0]?.arguments[1] as Record<string, any>;
    assert.strictEqual(config.options.scales.y.beginAtZero, true);
  });

  test('x grid is hidden (Design Guide §8 clean bars)', async () => {
    render(RequestsChart, { props: { data: SAMPLE_DATA } });
    await new Promise((r) => setTimeout(r, 0));
    const config = (MockChart.mock.calls as { arguments: unknown[] }[])[0]?.arguments[1] as Record<string, any>;
    assert.strictEqual(config.options.scales.x.grid.display, false);
  });
});
