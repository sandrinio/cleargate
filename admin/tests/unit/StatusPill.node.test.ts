import { describe, test } from 'node:test';
import assert from 'node:assert/strict';

/**
 * Unit tests for StatusPill component — STORY-006-04
 *
 * Scenarios covered:
 *   - All four status variants render with correct semantic class tokens (DG §6.2)
 *   - Default label is capitalised status string
 *   - Optional label override is displayed
 */
import { render } from '@testing-library/svelte';
import StatusPill from '../../src/lib/components/StatusPill.svelte';

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


describe('StatusPill', () => {
  test('renders "Active" variant with bg-success class (DG §6.2 green)', () => {
    const { getByText } = render(StatusPill, { props: { status: 'active' } });
    const el = getByText('Active');
    expect(el.classList.contains('bg-success')).toBe(true);
    expect(el.classList.contains('text-success-content')).toBe(true);
  });

  test('renders "Pending" variant with bg-warning class (DG §6.2 amber)', () => {
    const { getByText } = render(StatusPill, { props: { status: 'pending' } });
    const el = getByText('Pending');
    expect(el.classList.contains('bg-warning')).toBe(true);
    expect(el.classList.contains('text-warning-content')).toBe(true);
  });

  test('renders "Expired" variant with bg-error class (DG §6.2 red)', () => {
    const { getByText } = render(StatusPill, { props: { status: 'expired' } });
    const el = getByText('Expired');
    expect(el.classList.contains('bg-error')).toBe(true);
    expect(el.classList.contains('text-error-content')).toBe(true);
  });

  test('renders "Revoked" variant with bg-neutral class (DG §6.2 gray)', () => {
    const { getByText } = render(StatusPill, { props: { status: 'revoked' } });
    const el = getByText('Revoked');
    expect(el.classList.contains('bg-neutral')).toBe(true);
    expect(el.classList.contains('text-neutral-content')).toBe(true);
  });

  test('uses DG §6.2 base classes on all variants', () => {
    const statuses = ['active', 'pending', 'expired', 'revoked'] as const;
    for (const status of statuses) {
      const { container } = render(StatusPill, { props: { status } });
      const el = container.querySelector('span')!;
      assert.ok(el.classList.contains('rounded-full'), `${status}: rounded-full`);
      assert.ok(el.classList.contains('text-xs'), `${status}: text-xs`);
      assert.ok(el.classList.contains('font-semibold'), `${status}: font-semibold`);
      assert.ok(el.classList.contains('px-2.5'), `${status}: px-2.5`);
      assert.ok(el.classList.contains('py-0.5'), `${status}: py-0.5`);
    }
  });

  test('renders custom label override instead of status name', () => {
    const { getByText } = render(StatusPill, {
      props: { status: 'active', label: 'Joined' },
    });
    expect(getByText('Joined')).toBeTruthy();
  });
});
