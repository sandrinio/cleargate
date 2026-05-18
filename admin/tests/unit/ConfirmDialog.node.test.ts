import { describe, test, mock } from 'node:test';
import assert from 'node:assert/strict';

/**
 * Unit tests for ConfirmDialog component — STORY-006-04
 *
 * Scenarios covered:
 *   - Dialog renders when open=true, hidden when open=false
 *   - onconfirm callback fires when Confirm is clicked
 *   - onclose callback fires when Cancel is clicked
 *   - confirmVariant='danger' uses btn-error class (DG §6.7)
 *   - confirmVariant='default' uses btn-primary class (DG §6.7)
 *   - confirmLabel prop customises button text
 */
import { render, fireEvent } from '@testing-library/svelte';
import ConfirmDialog from '../../src/lib/components/ConfirmDialog.svelte';

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


const baseProps = {
  open: true,
  title: 'Delete this?',
  message: 'This action cannot be undone.',
  onclose: () => {},
  onconfirm: () => {},
};

describe('ConfirmDialog', () => {
  test('renders the title and message when open=true', () => {
    const { getByText } = render(ConfirmDialog, { props: baseProps });
    expect(getByText('Delete this?')).toBeTruthy();
    expect(getByText('This action cannot be undone.')).toBeTruthy();
  });

  test('does not render content when open=false', () => {
    const { queryByText } = render(ConfirmDialog, {
      props: { ...baseProps, open: false },
    });
    expect(queryByText('Delete this?')).toBeNull();
  });

  test('calls onconfirm when the confirm button is clicked', async () => {
    const onconfirm = mock.fn();
    const onclose = mock.fn();
    const { getByText } = render(ConfirmDialog, {
      props: { ...baseProps, onconfirm, onclose },
    });
    await fireEvent.click(getByText('Confirm'));
    expect(onconfirm).toHaveBeenCalledOnce();
  });

  test('calls onclose when Cancel is clicked', async () => {
    const onclose = mock.fn();
    const { getByText } = render(ConfirmDialog, {
      props: { ...baseProps, onclose },
    });
    await fireEvent.click(getByText('Cancel'));
    expect(onclose).toHaveBeenCalledOnce();
  });

  test('also calls onclose after confirm (dialog auto-closes)', async () => {
    const onconfirm = mock.fn();
    const onclose = mock.fn();
    const { getByText } = render(ConfirmDialog, {
      props: { ...baseProps, onconfirm, onclose },
    });
    await fireEvent.click(getByText('Confirm'));
    expect(onclose).toHaveBeenCalledOnce();
  });

  test('uses btn-error class for danger variant (DG §6.7)', () => {
    const { getByText } = render(ConfirmDialog, {
      props: { ...baseProps, confirmVariant: 'danger', confirmLabel: 'Delete' },
    });
    const btn = getByText('Delete');
    expect(btn.classList.contains('btn-error')).toBe(true);
  });

  test('uses btn-primary class for default variant (DG §6.7)', () => {
    const { getByText } = render(ConfirmDialog, {
      props: { ...baseProps, confirmVariant: 'default', confirmLabel: 'Confirm' },
    });
    const btn = getByText('Confirm');
    expect(btn.classList.contains('btn-primary')).toBe(true);
  });

  test('renders custom confirmLabel text', () => {
    const { getByText } = render(ConfirmDialog, {
      props: { ...baseProps, confirmLabel: 'Yes, remove it' },
    });
    expect(getByText('Yes, remove it')).toBeTruthy();
  });
});
