import { describe, test } from 'node:test';
import assert from 'node:assert/strict';

/**
 * Unit tests for ValueChip component — STORY-006-08
 *
 * Scenarios:
 *   - Renders label and value correctly
 *   - Applies Design Guide §6.3 classes (rounded-full bg-accent text-accent-content
 *     text-sm font-semibold px-3 py-1 tabular-nums)
 *   - Renders optional hint when provided
 *   - Does not render hint element when hint is absent
 */
import { render } from '@testing-library/svelte';
import ValueChip from '../../src/lib/components/ValueChip.svelte';

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


describe('ValueChip', () => {
  test('renders the value text', () => {
    const { getByTestId } = render(ValueChip, {
      props: { label: 'Requests', value: '1234' },
    });
    const valueEl = getByTestId('value-chip-value');
    expect(valueEl.textContent?.trim()).toBe('1234');
  });

  test('renders the label text', () => {
    const { getByTestId } = render(ValueChip, {
      props: { label: 'Error rate', value: '2.3%' },
    });
    const labelEl = getByTestId('value-chip-label');
    expect(labelEl.textContent?.trim()).toBe('Error rate');
  });

  test('applies Design Guide §6.3 classes on value element', () => {
    const { getByTestId } = render(ValueChip, {
      props: { label: 'Requests', value: '42' },
    });
    const valueEl = getByTestId('value-chip-value');
    assert.ok(valueEl.classList.contains('rounded-full'), 'rounded-full');
    assert.ok(valueEl.classList.contains('bg-accent'), 'bg-accent');
    assert.ok(valueEl.classList.contains('text-accent-content'), 'text-accent-content');
    assert.ok(valueEl.classList.contains('text-sm'), 'text-sm');
    assert.ok(valueEl.classList.contains('font-semibold'), 'font-semibold');
    assert.ok(valueEl.classList.contains('px-3'), 'px-3');
    assert.ok(valueEl.classList.contains('py-1'), 'py-1');
    assert.ok(valueEl.classList.contains('tabular-nums'), 'tabular-nums');
  });

  test('renders hint text when hint prop is provided', () => {
    const { getByTestId } = render(ValueChip, {
      props: { label: 'Requests', value: '100', hint: 'over 7 days' },
    });
    const hintEl = getByTestId('value-chip-hint');
    expect(hintEl.textContent?.trim()).toBe('over 7 days');
  });

  test('does not render hint element when hint is not provided', () => {
    const { queryByTestId } = render(ValueChip, {
      props: { label: 'Requests', value: '100' },
    });
    expect(queryByTestId('value-chip-hint')).toBeNull();
  });

  test('renders "—" as value string for empty/null-like display', () => {
    const { getByTestId } = render(ValueChip, {
      props: { label: 'Error rate', value: '—' },
    });
    expect(getByTestId('value-chip-value').textContent?.trim()).toBe('—');
  });
});
