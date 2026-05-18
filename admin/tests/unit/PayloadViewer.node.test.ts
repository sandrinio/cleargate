import { describe, test } from 'node:test';
import assert from 'node:assert/strict';

/**
 * Unit tests for PayloadViewer component — STORY-006-06
 *
 * Scenarios covered:
 *   - Renders keys with their values
 *   - Redacts fields matching the redaction list (password, secret, token, api_key)
 *   - Short values shown without truncation
 *   - Long values (>240 chars) show "Show more" button
 *   - Clicking "Show more" reveals full value
 *   - Redacted fields show ••••• and NOT the actual value in the header
 */

import { render, fireEvent } from '@testing-library/svelte';
import PayloadViewer from '../../src/lib/components/PayloadViewer.svelte';

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


const LONG_STRING = 'x'.repeat(300);

describe('PayloadViewer', () => {
  test('renders payload keys', () => {
    const { getByTestId } = render(PayloadViewer, {
      props: { payload: { title: 'Test Story', status: 'draft' } },
    });
    const viewer = getByTestId('payload-viewer');
    assert.ok(String(viewer.textContent).includes('title'));
    assert.ok(String(viewer.textContent).includes('status'));
  });

  test('renders short values without truncation', () => {
    const { container } = render(PayloadViewer, {
      props: { payload: { title: 'Hello' } },
    });
    const text = container.textContent ?? '';
    assert.ok(String(text).includes('Hello'));
    expect(container.querySelector('[data-testid="show-more-btn"]')).toBeNull();
  });

  test('shows "Show more" button for long string values', () => {
    const { getByTestId } = render(PayloadViewer, {
      props: { payload: { description: LONG_STRING } },
    });
    expect(getByTestId('show-more-btn')).toBeTruthy();
  });

  test('expanding a long value reveals full content', async () => {
    const { getByTestId, container } = render(PayloadViewer, {
      props: { payload: { description: LONG_STRING } },
    });
    const btn = getByTestId('show-more-btn');
    await fireEvent.click(btn);
    // After expand, the full string should be in the dom
    assert.ok(String(container.textContent).includes(LONG_STRING.slice(250))); // some later part
    expect(getByTestId('show-less-btn')).toBeTruthy();
  });

  test('redacts "password" field to •••••', () => {
    const { getByTestId, container } = render(PayloadViewer, {
      props: { payload: { password: 'supersecret123' } },
    });
    expect(getByTestId('redacted-value').textContent).toContain('•••••');
    // Actual value must NOT appear
    assert.ok(!String(container.textContent).includes('supersecret123'));
  });

  test('redacts "secret" field to •••••', () => {
    const { getByTestId, container } = render(PayloadViewer, {
      props: { payload: { secret: 'my-secret-value' } },
    });
    expect(getByTestId('redacted-value').textContent).toContain('•••••');
    assert.ok(!String(container.textContent).includes('my-secret-value'));
  });

  test('redacts "token" field to •••••', () => {
    const { container } = render(PayloadViewer, {
      props: { payload: { token: 'bearer-xyz' } },
    });
    assert.ok(!String(container.textContent).includes('bearer-xyz'));
    assert.ok(String(container.textContent).includes('•••••'));
  });

  test('redacts "api_key" field to •••••', () => {
    const { container } = render(PayloadViewer, {
      props: { payload: { api_key: 'sk-abc123' } },
    });
    assert.ok(!String(container.textContent).includes('sk-abc123'));
    assert.ok(String(container.textContent).includes('•••••'));
  });

  test('does not redact non-sensitive fields', () => {
    const { container } = render(PayloadViewer, {
      props: { payload: { title: 'open-title', description: 'open-desc' } },
    });
    assert.ok(String(container.textContent).includes('open-title'));
    assert.ok(String(container.textContent).includes('open-desc'));
  });

  test('renders null value as JSON null', () => {
    const { container } = render(PayloadViewer, {
      props: { payload: { optional_field: null } },
    });
    assert.ok(String(container.textContent).includes('null'));
  });
});
