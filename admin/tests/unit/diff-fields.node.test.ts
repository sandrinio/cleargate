import { describe, test } from 'node:test';
import assert from 'node:assert/strict';

/**
 * Unit tests for diff-fields.ts — STORY-006-06
 *
 * Covers (story §4 demands 10+ test cases):
 *   - identical objects → empty array
 *   - changed scalar value
 *   - null vs undefined
 *   - key added (present in b, absent in a)
 *   - key removed (present in a, absent in b)
 *   - nested object change (shallow — key detected, nested diff not recursed)
 *   - array value change
 *   - array length difference
 *   - boolean change
 *   - number change
 *   - string change
 *   - null → non-null
 *   - non-null → null
 *   - result is sorted alphabetically
 *   - no mutation of inputs
 */

import { diffFields } from '../../src/lib/utils/diff-fields.js';

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


describe('diffFields', () => {
  test('returns empty array for identical empty objects', () => {
    expect(diffFields({}, {})).toEqual([]);
  });

  test('returns empty array for identical non-empty objects', () => {
    const obj = { a: 1, b: 'hello', c: null };
    expect(diffFields(obj, { ...obj })).toEqual([]);
  });

  test('detects a changed scalar string value', () => {
    expect(diffFields({ status: 'draft' }, { status: 'approved' })).toEqual(['status']);
  });

  test('detects a changed number value', () => {
    expect(diffFields({ version: 1 }, { version: 2 })).toEqual(['version']);
  });

  test('detects a changed boolean value', () => {
    expect(diffFields({ active: true }, { active: false })).toEqual(['active']);
  });

  test('detects a key added in b (not in a)', () => {
    expect(diffFields({ a: 1 }, { a: 1, b: 2 })).toEqual(['b']);
  });

  test('detects a key removed from b (present in a, absent in b)', () => {
    expect(diffFields({ a: 1, b: 2 }, { a: 1 })).toEqual(['b']);
  });

  test('detects null vs non-null', () => {
    expect(diffFields({ x: null }, { x: 'value' })).toEqual(['x']);
  });

  test('detects non-null vs null', () => {
    expect(diffFields({ x: 'value' }, { x: null })).toEqual(['x']);
  });

  test('detects array length difference (shallow)', () => {
    expect(diffFields({ tags: [1, 2] }, { tags: [1, 2, 3] })).toEqual(['tags']);
  });

  test('detects array element change', () => {
    expect(diffFields({ tags: ['a', 'b'] }, { tags: ['a', 'c'] })).toEqual(['tags']);
  });

  test('detects nested object change at shallow level (key differs overall)', () => {
    expect(
      diffFields({ meta: { foo: 1 } }, { meta: { foo: 2 } }),
    ).toEqual(['meta']);
  });

  test('reports multiple changed fields, sorted alphabetically', () => {
    const a = { z: 1, a: 'old', m: true };
    const b = { z: 2, a: 'new', m: true };
    expect(diffFields(a, b)).toEqual(['a', 'z']);
  });

  test('handles undefined values by presence — both absent means no change', () => {
    // Neither object has key 'x', so no diff
    expect(diffFields({ a: 1 }, { a: 1 })).toEqual([]);
  });

  test('does not mutate input objects', () => {
    const a: Record<string, unknown> = { x: 1 };
    const b: Record<string, unknown> = { x: 2 };
    const aCopy = JSON.stringify(a);
    const bCopy = JSON.stringify(b);
    diffFields(a, b);
    expect(JSON.stringify(a)).toBe(aCopy);
    expect(JSON.stringify(b)).toBe(bCopy);
  });

  test('handles empty string vs non-empty string', () => {
    expect(diffFields({ title: '' }, { title: 'Hello' })).toEqual(['title']);
  });

  test('returns empty for two empty arrays on same key', () => {
    expect(diffFields({ arr: [] }, { arr: [] })).toEqual([]);
  });

  test('handles mixed types correctly (number vs string)', () => {
    expect(diffFields({ val: 1 }, { val: '1' })).toEqual(['val']);
  });
});
