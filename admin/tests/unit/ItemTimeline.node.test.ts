import { describe, test } from 'node:test';
import assert from 'node:assert/strict';

/**
 * Unit tests for ItemTimeline component — STORY-006-06
 *
 * Scenarios:
 *   - Renders entries in descending version order (newest first)
 *   - Single version shows "Only one version exists"
 *   - Empty versions shows fallback text
 *   - Shows pruning meta line when totalPushed > versions.length
 *   - Entry header contains version number, author, time-ago
 *   - Keyboard Enter toggles expand (via keydown)
 *   - Clicking header toggles expand
 *   - Diff summary shown in collapsed header
 */

import { render, fireEvent } from '@testing-library/svelte';
import ItemTimeline from '../../src/lib/components/ItemTimeline.svelte';

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


const NOW = new Date('2026-04-19T12:00:00.000Z');

function makeVersion(v: number, overrides: Record<string, unknown> = {}) {
  return {
    version: v,
    pushed_by_member_id: `member-uuid-${v}-abcd`,
    pushed_at: new Date(NOW.getTime() - v * 60 * 60 * 1000).toISOString(),
    status: 'synced',
    diff_summary: v > 1 ? `changed: status` : null,
    ...overrides,
  };
}

describe('ItemTimeline', () => {
  test('shows "Only one version exists" for a single version', () => {
    const { getByTestId } = render(ItemTimeline, {
      props: { versions: [makeVersion(1)] },
    });
    expect(getByTestId('single-version-msg').textContent).toContain('Only one version exists');
  });

  test('shows empty fallback when no versions', () => {
    const { getByTestId } = render(ItemTimeline, {
      props: { versions: [] },
    });
    expect(getByTestId('empty-timeline')).toBeTruthy();
  });

  test('renders entries in descending version order (newest first)', () => {
    const versions = [makeVersion(1), makeVersion(3), makeVersion(2)];
    const { getAllByTestId } = render(ItemTimeline, {
      props: { versions },
    });
    const entries = getAllByTestId('timeline-entry');
    // First entry should be v3, last v1
    expect(entries[0].getAttribute('data-version')).toBe('3');
    expect(entries[2].getAttribute('data-version')).toBe('1');
  });

  test('shows pruning meta line when totalPushed > versions.length', () => {
    const versions = Array.from({ length: 10 }, (_, i) => makeVersion(i + 1));
    const { getByTestId } = render(ItemTimeline, {
      props: { versions, totalPushed: 15 },
    });
    const meta = getByTestId('pruning-meta');
    assert.ok(String(meta.textContent).includes('Showing last 10 versions'));
  });

  test('does NOT show pruning meta when totalPushed equals versions.length', () => {
    const versions = Array.from({ length: 7 }, (_, i) => makeVersion(i + 1));
    const { queryByTestId } = render(ItemTimeline, {
      props: { versions, totalPushed: 7 },
    });
    expect(queryByTestId('pruning-meta')).toBeNull();
  });

  test('entry header contains version number label', () => {
    const { getAllByTestId } = render(ItemTimeline, {
      props: { versions: [makeVersion(1), makeVersion(2)] },
    });
    const labels = getAllByTestId('entry-label');
    // Newest (v2) should be first
    assert.ok(String(labels[0].textContent).includes('v2'));
    assert.ok(String(labels[1].textContent).includes('v1'));
  });

  test('clicking entry header toggles expanded state', async () => {
    const versions = [makeVersion(1), makeVersion(2)];
    const { getAllByTestId, queryByTestId } = render(ItemTimeline, {
      props: { versions },
    });
    const headers = getAllByTestId('timeline-entry-header');
    // Initially not expanded
    expect(queryByTestId('expanded-payload')).toBeNull();
    // Click — but since payload is undefined in this test, expanded-payload won't appear
    // Just verify aria-expanded changes
    expect(headers[0].getAttribute('aria-expanded')).toBe('false');
    await fireEvent.click(headers[0]);
    expect(headers[0].getAttribute('aria-expanded')).toBe('true');
  });

  test('keyboard Enter toggles expand on header', async () => {
    const versions = [makeVersion(1), makeVersion(2)];
    const { getAllByTestId } = render(ItemTimeline, {
      props: { versions },
    });
    const headers = getAllByTestId('timeline-entry-header');
    expect(headers[0].getAttribute('aria-expanded')).toBe('false');
    await fireEvent.keyDown(headers[0], { key: 'Enter' });
    expect(headers[0].getAttribute('aria-expanded')).toBe('true');
    await fireEvent.keyDown(headers[0], { key: 'Enter' });
    expect(headers[0].getAttribute('aria-expanded')).toBe('false');
  });

  test('shows server-provided diff_summary in header', () => {
    const versions = [
      makeVersion(1, { diff_summary: null }),
      makeVersion(2, { diff_summary: 'changed: status, assignee' }),
    ];
    const { getAllByTestId } = render(ItemTimeline, {
      props: { versions },
    });
    const summaries = getAllByTestId('diff-summary');
    // The newest (v2) has diff summary
    assert.ok(String(summaries[0].textContent).includes('changed: status, assignee'));
  });
});
