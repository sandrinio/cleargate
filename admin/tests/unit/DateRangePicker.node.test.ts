import { describe, test, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';

/**
 * Unit tests for DateRangePicker — STORY-006-07
 *
 * Scenarios:
 *   - Renders From/To date inputs
 *   - Preset buttons exist and fire onchange with correct UTC values
 *   - "Last 7d" preset emits a range ~7 days wide
 *   - "Last 30d" preset emits a range ~30 days wide
 *   - Validation: to < from shows error, valid range does not
 *   - Emits UTC ISO-8601 from local date input values
 */
import { render, fireEvent } from '@testing-library/svelte';
import DateRangePicker from '../../src/lib/components/DateRangePicker.svelte';

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


const DAY_MS = 24 * 60 * 60 * 1000;

describe('DateRangePicker', () => {
  test('renders From and To date inputs', () => {
    const { getByTestId } = render(DateRangePicker);
    expect(getByTestId('date-from')).toBeTruthy();
    expect(getByTestId('date-to')).toBeTruthy();
  });

  test('renders all preset buttons', () => {
    const { getByText, getByTestId } = render(DateRangePicker);
    expect(getByText('Today')).toBeTruthy();
    expect(getByTestId('preset-24h')).toBeTruthy();
    expect(getByTestId('preset-7d')).toBeTruthy();
    expect(getByTestId('preset-30d')).toBeTruthy();
  });

  test('"Last 7d" preset calls onchange with range ~7 days wide (UTC)', async () => {
    const onchange = mock.fn();
    const { getByTestId } = render(DateRangePicker, { props: { onchange } });
    const before = Date.now();
    await fireEvent.click(getByTestId('preset-7d'));
    const after = Date.now();

    expect(onchange).toHaveBeenCalledOnce();
    const { from, to } = onchange.mock.calls[0]?.arguments[0] as { from: string; to: string };

    const fromMs = new Date(from).getTime();
    const toMs = new Date(to).getTime();
    const windowMs = toMs - fromMs;

    // Window should be ~7d ± a few ms of clock drift
    const expected = 7 * DAY_MS;
    assert.ok(windowMs >= expected - 1000);
    assert.ok(windowMs <= expected + 1000);

    // to should be close to "now"
    assert.ok(toMs >= before);
    assert.ok(toMs <= after + 100);

    // Values should be valid ISO-8601
    assert.match(String(from), /^\d{4}-\d{2}-\d{2}T/);
    assert.match(String(to), /^\d{4}-\d{2}-\d{2}T/);
  });

  test('"Last 30d" preset calls onchange with range ~30 days wide', async () => {
    const onchange = mock.fn();
    const { getByTestId } = render(DateRangePicker, { props: { onchange } });
    await fireEvent.click(getByTestId('preset-30d'));

    expect(onchange).toHaveBeenCalledOnce();
    const { from, to } = onchange.mock.calls[0]?.arguments[0] as { from: string; to: string };
    const windowMs = new Date(to).getTime() - new Date(from).getTime();
    const expected = 30 * DAY_MS;
    assert.ok(windowMs >= expected - 1000);
    assert.ok(windowMs <= expected + 1000);
  });

  test('"Last 24h" preset calls onchange with range ~24 hours wide', async () => {
    const onchange = mock.fn();
    const { getByTestId } = render(DateRangePicker, { props: { onchange } });
    await fireEvent.click(getByTestId('preset-24h'));

    expect(onchange).toHaveBeenCalledOnce();
    const { from, to } = onchange.mock.calls[0]?.arguments[0] as { from: string; to: string };
    const windowMs = new Date(to).getTime() - new Date(from).getTime();
    const expected = 24 * 60 * 60 * 1000;
    assert.ok(windowMs >= expected - 1000);
    assert.ok(windowMs <= expected + 1000);
  });

  test('shows validation error when to is before from', async () => {
    const onchange = mock.fn();
    const { getByTestId } = render(DateRangePicker, {
      props: {
        from: '2026-04-10T00:00:00.000Z',
        to: '2026-04-15T23:59:59.999Z',
        onchange,
      },
    });

    // Set from to a date AFTER to
    const fromInput = getByTestId('date-from') as HTMLInputElement;
    await fireEvent.change(fromInput, { target: { value: '2026-04-20' } });

    // Error message should appear
    const errorEl = getByTestId('drp-error');
    assert.ok(errorEl);
    assert.ok(String(errorEl.textContent).includes('"From" must be before "To"'));

    // onchange should NOT be called for invalid range
    assert.strictEqual(onchange.mock.calls.length, 0);
  });

  test('does not show validation error for a valid range', async () => {
    const onchange = mock.fn();
    const { getByTestId, queryByTestId } = render(DateRangePicker, {
      props: {
        from: '2026-04-01T00:00:00.000Z',
        to: '2026-04-07T23:59:59.999Z',
        onchange,
      },
    });

    // Adjust from to a valid earlier date
    const fromInput = getByTestId('date-from') as HTMLInputElement;
    await fireEvent.change(fromInput, { target: { value: '2026-03-25' } });

    expect(queryByTestId('drp-error')).toBeNull();
    expect(onchange).toHaveBeenCalledOnce();
  });

  test('emits UTC ISO-8601 string from local date input', async () => {
    const onchange = mock.fn();
    const { getByTestId } = render(DateRangePicker, {
      props: { onchange },
    });

    // Set from and to via date inputs
    const fromInput = getByTestId('date-from');
    const toInput = getByTestId('date-to');
    await fireEvent.change(fromInput, { target: { value: '2026-04-11' } });
    await fireEvent.change(toInput, { target: { value: '2026-04-18' } });

    assert.ok(onchange.mock.calls.length > 0);
    const { from, to } = onchange.mock.calls[onchange.mock.calls.length - 1]?.arguments[0] as { from: string; to: string };

    // Should be valid ISO-8601
    assert.match(String(from), /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    assert.match(String(to), /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);

    // from should be start-of-day, to should be end-of-day
    const fromDate = new Date(from);
    const toDate = new Date(to);
    expect(fromDate.getSeconds()).toBe(0);
    expect(toDate.getSeconds()).toBe(59);
    expect(toDate.getMilliseconds()).toBe(999);
  });
});
