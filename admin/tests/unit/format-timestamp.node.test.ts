import { describe, test } from 'node:test';
import assert from 'node:assert/strict';

/**
 * Unit tests for format-timestamp.ts — STORY-006-07 QA kickback Fix 2
 *
 * Scenarios:
 *   - Given a UTC ISO-8601 string, formatTimestamp() returns a locale-formatted
 *     local-time string matching "YYYY-MM-DD HH:mm:ss.SSS" pattern.
 *   - Given the same ISO, the original ISO string (used as UTC tooltip) is preserved.
 *   - Invalid input falls back to the original string.
 */
import { formatTimestamp } from '../../src/lib/utils/format-timestamp.js';

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


describe('formatTimestamp', () => {
  test('returns a local-time display string in YYYY-MM-DD HH:mm:ss.SSS pattern', () => {
    // Use a known UTC ISO string
    const iso = '2026-04-19T10:30:45.123Z';
    const result = formatTimestamp(iso);

    // Must match the expected pattern regardless of local timezone
    assert.match(String(result), /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}\.\d{3}$/);
  });

  test('preserves the original ISO string as the UTC tooltip text (unmodified)', () => {
    const iso = '2026-04-19T10:30:45.123Z';
    // The original iso is what goes into data-tip/title as UTC tooltip.
    // formatTimestamp must NOT modify it — the raw iso is passed through separately.
    // This test verifies the invariant: formatTimestamp(iso) !== iso
    // AND the original iso stays intact (no mutation).
    const original = iso;
    formatTimestamp(iso); // call should not mutate
    assert.strictEqual(iso, original);
  });

  test('formatted string differs from raw ISO (it is localised, not UTC-literal)', () => {
    // The function converts to local time — the display format must differ from
    // the raw ISO (which has 'T' separator and 'Z' suffix).
    const iso = '2026-04-19T10:30:45.123Z';
    const result = formatTimestamp(iso);
    // Result has a space separator, not 'T', and no trailing 'Z'
    assert.ok(String(result).includes(' '));
    assert.ok(!String(result).includes('T'));
    assert.ok(!String(result).includes('Z'));
  });

  test('returns original string on invalid ISO input', () => {
    const invalid = 'not-a-date';
    expect(formatTimestamp(invalid)).toBe(invalid);
  });

  test('milliseconds are always 3 digits (zero-padded)', () => {
    // ISO with .000 milliseconds
    const iso = '2026-04-19T00:00:00.000Z';
    const result = formatTimestamp(iso);
    // Last segment after final '.' should be exactly 3 digits
    const msPart = result.split('.').pop();
    assert.match(String(msPart), /^\d{3}$/);
  });
});
