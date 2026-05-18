import { describe, test, beforeEach, afterEach, mock } from 'node:test';
import assert from 'node:assert/strict';

/**
 * Unit tests for WindowSelector component — STORY-006-08
 *
 * Scenarios:
 *   - Renders all three window buttons (7d / 30d / 90d)
 *   - Default active window is 30d when no URL param set
 *   - Active button has btn-primary class; inactive buttons have btn-ghost
 *   - Clicking a button calls goto with updated ?window= param
 *   - aria-pressed reflects active state correctly
 */
import { render, fireEvent } from '@testing-library/svelte';
import WindowSelector from '../../src/lib/components/WindowSelector.svelte';

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


// $app/stores page stub uses URL http://localhost/ (no ?window param) — default 30d
// $app/navigation goto is spied on via __overrides__ pattern (STORY-028-07: ESM static import compat)
import { __overrides__ as navOverrides } from '../../src/lib/__mocks__/app-navigation.ts';

const gotoMock = mock.fn();

describe('WindowSelector', () => {
  beforeEach(() => {
    gotoMock.mock.resetCalls();
    navOverrides.goto = gotoMock as unknown as (...args: unknown[]) => unknown;
  });

  afterEach(() => {
    navOverrides.goto = undefined;
  });

  test('renders all three window buttons', () => {
    const { getByTestId } = render(WindowSelector);
    expect(getByTestId('window-btn-7d')).toBeTruthy();
    expect(getByTestId('window-btn-30d')).toBeTruthy();
    expect(getByTestId('window-btn-90d')).toBeTruthy();
  });

  test('default active window is 30d (no URL param)', () => {
    const { getByTestId } = render(WindowSelector);
    // Active button has btn-primary
    assert.ok(getByTestId('window-btn-30d').classList.contains('btn-primary'), '30d is active');
    // Inactive buttons have btn-ghost
    assert.ok(getByTestId('window-btn-7d').classList.contains('btn-ghost'), '7d is inactive');
    assert.ok(getByTestId('window-btn-90d').classList.contains('btn-ghost'), '90d is inactive');
  });

  test('aria-pressed is true only on the active window button', () => {
    const { getByTestId } = render(WindowSelector);
    expect(getByTestId('window-btn-30d').getAttribute('aria-pressed')).toBe('true');
    expect(getByTestId('window-btn-7d').getAttribute('aria-pressed')).toBe('false');
    expect(getByTestId('window-btn-90d').getAttribute('aria-pressed')).toBe('false');
  });

  test('clicking 7d button calls goto with ?window=7d', async () => {
    const { getByTestId } = render(WindowSelector);
    await fireEvent.click(getByTestId('window-btn-7d'));
    expect(gotoMock).toHaveBeenCalledOnce();
    const calledUrl: string = gotoMock.mock.calls[0]?.arguments[0];
    assert.ok(String(calledUrl).includes('window=7d'));
  });

  test('clicking 90d button calls goto with ?window=90d', async () => {
    const { getByTestId } = render(WindowSelector);
    await fireEvent.click(getByTestId('window-btn-90d'));
    expect(gotoMock).toHaveBeenCalledOnce();
    const calledUrl: string = gotoMock.mock.calls[0]?.arguments[0];
    assert.ok(String(calledUrl).includes('window=90d'));
  });

  test('goto is called with keepFocus option', async () => {
    const { getByTestId } = render(WindowSelector);
    await fireEvent.click(getByTestId('window-btn-7d'));
    const opts = gotoMock.mock.calls[0]?.arguments[1];
    assert.deepStrictEqual(opts, { keepFocus: true, noScroll: true });
  });

  test('has role="group" with aria-label on the container', () => {
    const { container } = render(WindowSelector);
    const group = container.querySelector('[role="group"]');
    assert.ok(group);
    expect(group?.getAttribute('aria-label')).toBe('Time window');
  });
});
