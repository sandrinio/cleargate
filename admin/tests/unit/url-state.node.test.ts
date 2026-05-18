import { describe, test } from 'node:test';
import assert from 'node:assert/strict';

/**
 * Unit tests for url-state.ts — STORY-006-07
 *
 * Covers:
 *   - parseFilters: null when param absent, value when present
 *   - filtersToParams: omits null fields, serialises all fields
 *   - Roundtrip: serialize → parse → equals original (0 filters, all filters, cursor)
 *   - defaultFilters: 7d window, all other fields null
 *   - clamp30d: no clamp when window ≤ 30d, clamps when > 30d, returns clamped flag
 */
import {
  parseFilters,
  filtersToParams,
  defaultFilters,
  clamp30d,
  buildAuditQueryString,
} from '../../src/lib/utils/url-state.js';
import type { AuditFilters } from '../../src/lib/utils/url-state.js';

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


// ── parseFilters ──────────────────────────────────────────────────────────────

describe('parseFilters', () => {
  test('returns all-null filters when params are empty', () => {
    const result = parseFilters(new URLSearchParams(''));
    assert.deepStrictEqual(result, { from: null, to: null, user: null, tool: null, cursor: null });
  });

  test('parses all fields when all params present', () => {
    const params = new URLSearchParams({
      from: '2026-04-01T00:00:00.000Z',
      to: '2026-04-07T23:59:59.999Z',
      user: 'uuid-abc',
      tool: 'push_item',
      cursor: 'eyJ0cyI6MTIzfQ',
    });
    const result = parseFilters(params);
    assert.deepStrictEqual(result, {
      from: '2026-04-01T00:00:00.000Z',
      to: '2026-04-07T23:59:59.999Z',
      user: 'uuid-abc',
      tool: 'push_item',
      cursor: 'eyJ0cyI6MTIzfQ',
    });
  });

  test('ignores unknown params', () => {
    const params = new URLSearchParams({ unknown: 'value', from: '2026-04-01T00:00:00.000Z' });
    const result = parseFilters(params);
    assert.strictEqual(result.from, '2026-04-01T00:00:00.000Z');
    // 'unknown' key should not appear in the typed result
    const resultRecord = result as unknown as Record<string, unknown>;
    assert.strictEqual(resultRecord['unknown'], undefined);
  });
});

// ── filtersToParams ───────────────────────────────────────────────────────────

describe('filtersToParams', () => {
  test('omits null fields', () => {
    const filters: AuditFilters = { from: null, to: null, user: null, tool: null, cursor: null };
    const params = filtersToParams(filters);
    expect(params.toString()).toBe('');
  });

  test('serialises all non-null fields', () => {
    const filters: AuditFilters = {
      from: '2026-04-01T00:00:00.000Z',
      to: '2026-04-07T23:59:59.999Z',
      user: 'uuid-abc',
      tool: 'push_item',
      cursor: 'eyJ0cyI6MTIzfQ',
    };
    const params = filtersToParams(filters);
    expect(params.get('from')).toBe('2026-04-01T00:00:00.000Z');
    expect(params.get('to')).toBe('2026-04-07T23:59:59.999Z');
    expect(params.get('user')).toBe('uuid-abc');
    expect(params.get('tool')).toBe('push_item');
    expect(params.get('cursor')).toBe('eyJ0cyI6MTIzfQ');
  });
});

// ── Roundtrip ─────────────────────────────────────────────────────────────────

describe('roundtrip: filtersToParams → parseFilters', () => {
  test('zero filters roundtrip', () => {
    const original: AuditFilters = { from: null, to: null, user: null, tool: null, cursor: null };
    const result = parseFilters(filtersToParams(original));
    assert.deepStrictEqual(result, original);
  });

  test('all filters roundtrip', () => {
    const original: AuditFilters = {
      from: '2026-04-01T00:00:00.000Z',
      to: '2026-04-07T23:59:59.999Z',
      user: 'uuid-abc',
      tool: 'push_item',
      cursor: 'eyJ0cyI6MTIzfQ',
    };
    const result = parseFilters(filtersToParams(original));
    assert.deepStrictEqual(result, original);
  });

  test('cursor absent roundtrip', () => {
    const original: AuditFilters = {
      from: '2026-04-01T00:00:00.000Z',
      to: '2026-04-07T23:59:59.999Z',
      user: null,
      tool: 'list_items',
      cursor: null,
    };
    const result = parseFilters(filtersToParams(original));
    assert.deepStrictEqual(result, original);
  });

  test('cursor present roundtrip', () => {
    const original: AuditFilters = {
      from: '2026-04-10T00:00:00.000Z',
      to: '2026-04-17T23:59:59.999Z',
      user: 'member-uuid-999',
      tool: null,
      cursor: 'abc123==',
    };
    const result = parseFilters(filtersToParams(original));
    assert.deepStrictEqual(result, original);
  });
});

// ── defaultFilters ────────────────────────────────────────────────────────────

describe('defaultFilters', () => {
  test('returns 7-day window ending at now', () => {
    const now = new Date('2026-04-18T12:00:00.000Z');
    const result = defaultFilters(now);
    assert.strictEqual(result.to, '2026-04-18T12:00:00.000Z');
    const fromDate = new Date(result.from!);
    const expectedFrom = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    expect(fromDate.getTime()).toBe(expectedFrom.getTime());
  });

  test('has null user, tool, cursor', () => {
    const result = defaultFilters();
    assert.strictEqual(result.user, null);
    assert.strictEqual(result.tool, null);
    assert.strictEqual(result.cursor, null);
  });
});

// ── clamp30d ──────────────────────────────────────────────────────────────────

describe('clamp30d', () => {
  test('does not clamp when window is exactly 30d', () => {
    const to = new Date('2026-04-18T00:00:00.000Z');
    const from = new Date(to.getTime() - 30 * 24 * 60 * 60 * 1000);
    const filters: AuditFilters = {
      from: from.toISOString(),
      to: to.toISOString(),
      user: null,
      tool: null,
      cursor: null,
    };
    const { clamped } = clamp30d(filters);
    assert.strictEqual(clamped, false);
  });

  test('does not clamp when window is < 30d', () => {
    const to = new Date('2026-04-18T00:00:00.000Z');
    const from = new Date(to.getTime() - 7 * 24 * 60 * 60 * 1000);
    const filters: AuditFilters = {
      from: from.toISOString(),
      to: to.toISOString(),
      user: null,
      tool: null,
      cursor: null,
    };
    const { clamped, filters: result } = clamp30d(filters);
    assert.strictEqual(clamped, false);
    assert.strictEqual(result.from, filters.from);
  });

  test('clamps from to to - 30d when window exceeds 30d', () => {
    const to = new Date('2026-04-18T00:00:00.000Z');
    const from = new Date(to.getTime() - 60 * 24 * 60 * 60 * 1000); // 60 days
    const filters: AuditFilters = {
      from: from.toISOString(),
      to: to.toISOString(),
      user: null,
      tool: null,
      cursor: null,
    };
    const { clamped, filters: result } = clamp30d(filters);
    assert.strictEqual(clamped, true);
    const expectedFrom = new Date(to.getTime() - 30 * 24 * 60 * 60 * 1000);
    expect(new Date(result.from!).getTime()).toBe(expectedFrom.getTime());
    // to unchanged
    assert.strictEqual(result.to, to.toISOString());
  });

  test('returns clamped: false when from or to is null', () => {
    const filters: AuditFilters = { from: null, to: null, user: null, tool: null, cursor: null };
    const { clamped } = clamp30d(filters);
    assert.strictEqual(clamped, false);
  });

  test('does not mutate input filters', () => {
    const to = new Date('2026-04-18T00:00:00.000Z');
    const from = new Date(to.getTime() - 60 * 24 * 60 * 60 * 1000);
    const original: AuditFilters = {
      from: from.toISOString(),
      to: to.toISOString(),
      user: null,
      tool: null,
      cursor: null,
    };
    const originalFrom = original.from;
    clamp30d(original);
    assert.strictEqual(original.from, originalFrom); // not mutated
  });
});

// ── buildAuditQueryString ─────────────────────────────────────────────────────

describe('buildAuditQueryString', () => {
  test('returns empty string for null-only filters', () => {
    const filters: AuditFilters = { from: null, to: null, user: null, tool: null, cursor: null };
    expect(buildAuditQueryString(filters)).toBe('');
  });

  test('returns query string prefixed with ? when filters exist', () => {
    const filters: AuditFilters = {
      from: '2026-04-01T00:00:00.000Z',
      to: null,
      user: null,
      tool: null,
      cursor: null,
    };
    const qs = buildAuditQueryString(filters);
    expect(qs.startsWith('?')).toBe(true);
    assert.ok(String(qs).includes('from='));
  });
});
