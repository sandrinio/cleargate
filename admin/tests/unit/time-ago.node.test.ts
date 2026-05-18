import { describe, test } from 'node:test';
import assert from 'node:assert/strict';

/**
 * Unit tests for time-ago utility — STORY-006-03
 *
 * Tests: seconds → "just now", minutes, hours, days, > 30 days → calendar date
 * Uses fixed clock (now seam) for determinism.
 */
import { relative } from '../../src/lib/utils/time-ago.js';

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


const NOW = new Date('2026-04-20T12:00:00Z');

function ago(ms: number): Date {
  return new Date(NOW.getTime() - ms);
}

describe('relative time formatter', () => {
  test('returns "just now" for 0 seconds ago', () => {
    expect(relative(ago(0), NOW)).toBe('just now');
  });

  test('returns "just now" for 30 seconds ago', () => {
    expect(relative(ago(30_000), NOW)).toBe('just now');
  });

  test('returns "just now" for 59 seconds ago', () => {
    expect(relative(ago(59_000), NOW)).toBe('just now');
  });

  test('returns "1 min ago" for 60 seconds ago', () => {
    expect(relative(ago(60_000), NOW)).toBe('1 min ago');
  });

  test('returns "5 min ago" for 5 minutes ago', () => {
    expect(relative(ago(5 * 60_000), NOW)).toBe('5 min ago');
  });

  test('returns "59 min ago" for 59 minutes ago', () => {
    expect(relative(ago(59 * 60_000), NOW)).toBe('59 min ago');
  });

  test('returns "1 hour ago" for 60 minutes ago', () => {
    expect(relative(ago(60 * 60_000), NOW)).toBe('1 hour ago');
  });

  test('returns "2 hours ago" for 2 hours ago', () => {
    expect(relative(ago(2 * 60 * 60_000), NOW)).toBe('2 hours ago');
  });

  test('returns "23 hours ago" for 23 hours ago', () => {
    expect(relative(ago(23 * 60 * 60_000), NOW)).toBe('23 hours ago');
  });

  test('returns "1 day ago" for 24 hours ago', () => {
    expect(relative(ago(24 * 60 * 60_000), NOW)).toBe('1 day ago');
  });

  test('returns "3 days ago" for 3 days ago', () => {
    expect(relative(ago(3 * 24 * 60 * 60_000), NOW)).toBe('3 days ago');
  });

  test('returns "30 days ago" for exactly 30 days ago', () => {
    expect(relative(ago(30 * 24 * 60 * 60_000), NOW)).toBe('30 days ago');
  });

  test('returns calendar date for > 30 days ago', () => {
    // 31 days before 2026-04-20 is 2026-03-20
    const date = new Date('2026-03-20T12:00:00Z');
    expect(relative(date, NOW)).toBe('on 2026-03-20');
  });

  test('accepts a string date input', () => {
    expect(relative('2026-04-20T11:55:00Z', NOW)).toBe('5 min ago');
  });

  test('accepts a Date object input', () => {
    const d = new Date('2026-04-20T11:00:00Z');
    expect(relative(d, NOW)).toBe('1 hour ago');
  });
});
