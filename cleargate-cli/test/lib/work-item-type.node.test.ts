import { describe, test } from 'node:test';
import assert from 'node:assert/strict';

/**
 * work-item-type.test.ts — Tests for CR-030 work-item-type extensions.
 *
 * Scenarios:
 *   1. detectWorkItemTypeFromFm({ initiative_id: 'INITIATIVE-001' }) → 'initiative'
 *   2. detectWorkItemTypeFromFm({ sprint_id: 'SPRINT-21' }) → 'sprint'
 *   3. detectWorkItemType('INITIATIVE-001_foo.md') → 'initiative'
 *      detectWorkItemType('SPRINT-21_foo.md') → 'sprint'
 *   4. WORK_ITEM_TRANSITIONS.initiative deep-equals ['ready-for-decomposition']
 *      WORK_ITEM_TRANSITIONS.sprint deep-equals ['ready-for-execution']
 *   5. detectWorkItemType('STORY-NNN-NN') still returns 'story' (regression — INITIATIVE- not a substring of STORY-)
 *   6. All 5 existing types still detected correctly (regression)
 *   7. detectWorkItemTypeFromFm with no known key → null
 *   8. FM_KEY_MAP order: initiative_id returns 'initiative', not swallowed by other keys
 *  12. PREFIX_MAP: 7 entries total post-CR-030
 */

import {
  detectWorkItemTypeFromFm,
  detectWorkItemType,
  WORK_ITEM_TRANSITIONS,
} from '../../src/lib/work-item-type.js';

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
      const calls = (actual as { mock: { calls: Array<{arguments: unknown[]}> } }).mock.calls;
      assert.deepStrictEqual(calls[calls.length - 1].arguments, expectedArgs);
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
        async toThrow(msg?: string | RegExp | (new (...a: unknown[]) => unknown)) {
          if (!msg) await assert.rejects(p);
          else if (typeof msg === 'string') await assert.rejects(p, new RegExp(esc(msg)));
          else await assert.rejects(p, msg as RegExp);
        },
        async toSatisfy(predicate: (val: unknown) => boolean) {
          let err: unknown;
          try { await p; } catch(e) { err = e; }
          assert.ok(predicate(err), `Rejected value did not satisfy predicate. Got: ${String(err)}`);
        },
        async toMatchObject(expected: Record<string, unknown>) {
          let err: unknown;
          try { await p; } catch(e) { err = e; }
          const errObj = err as Record<string, unknown>;
          for (const [k, v] of Object.entries(expected)) {
            if (typeof v === 'string' && (v as any).__isStringContaining) {
              assert.ok(String(errObj[k]).includes((v as any).__value), `Expected ${k} to contain "${(v as any).__value}"`);
            } else {
              assert.deepStrictEqual(errObj[k], v, `Expected ${k} to equal ${String(v)}`);
            }
          }
        },
      };
    },
  };
}
// expect.stringContaining — creates a partial string matcher for use in toMatchObject
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(expect as any).stringContaining = (str: string) => ({ __isStringContaining: true, __value: str });


describe('work-item-type — CR-030 new types', () => {
  test('detectWorkItemTypeFromFm({ initiative_id }) → initiative', () => {
    expect(detectWorkItemTypeFromFm({ initiative_id: 'INITIATIVE-001' })).toBe('initiative');
  });

  test('detectWorkItemTypeFromFm({ sprint_id }) → sprint', () => {
    expect(detectWorkItemTypeFromFm({ sprint_id: 'SPRINT-21' })).toBe('sprint');
  });

  test('detectWorkItemType from INITIATIVE- prefix → initiative', () => {
    expect(detectWorkItemType('INITIATIVE-001_foo.md')).toBe('initiative');
  });

  test('detectWorkItemType from SPRINT- prefix → sprint', () => {
    expect(detectWorkItemType('SPRINT-21_foo.md')).toBe('sprint');
  });

  test('WORK_ITEM_TRANSITIONS.initiative → [ready-for-decomposition]', () => {
    assert.deepStrictEqual(WORK_ITEM_TRANSITIONS['initiative'], ['ready-for-decomposition']);
  });

  test('WORK_ITEM_TRANSITIONS.sprint → [ready-for-execution]', () => {
    assert.deepStrictEqual(WORK_ITEM_TRANSITIONS['sprint'], ['ready-for-execution']);
  });

  test('detectWorkItemType STORY- still returns story (regression — INITIATIVE- not a substring of STORY-)', () => {
    expect(detectWorkItemType('STORY-008-03')).toBe('story');
    expect(detectWorkItemType('STORY-042-01_foo.md')).toBe('story');
  });

  test('detectWorkItemTypeFromFm with no known key → null', () => {
    expect(detectWorkItemTypeFromFm({ title: 'No ID' })).toBeNull();
    expect(detectWorkItemTypeFromFm({})).toBeNull();
  });

  test('all 5 existing types still detected correctly from FM keys (regression)', () => {
    expect(detectWorkItemTypeFromFm({ story_id: 'STORY-001-01' })).toBe('story');
    expect(detectWorkItemTypeFromFm({ epic_id: 'EPIC-001' })).toBe('epic');
    expect(detectWorkItemTypeFromFm({ proposal_id: 'PROPOSAL-001' })).toBe('proposal');
    expect(detectWorkItemTypeFromFm({ cr_id: 'CR-001' })).toBe('cr');
    expect(detectWorkItemTypeFromFm({ bug_id: 'BUG-001' })).toBe('bug');
  });

  test('all 5 existing types still detected correctly from prefix (regression)', () => {
    expect(detectWorkItemType('EPIC-008')).toBe('epic');
    expect(detectWorkItemType('PROPOSAL-005')).toBe('proposal');
    expect(detectWorkItemType('CR-001')).toBe('cr');
    expect(detectWorkItemType('BUG-001')).toBe('bug');
    expect(detectWorkItemType('UNKNOWN-123')).toBeNull();
  });

  test('WORK_ITEM_TRANSITIONS has 7 entries total post-CR-030', () => {
    const keys = Object.keys(WORK_ITEM_TRANSITIONS);
    assert.strictEqual((keys).length, 7);
    assert.ok(String(keys).includes('initiative'));
    assert.ok(String(keys).includes('sprint'));
  });
});
