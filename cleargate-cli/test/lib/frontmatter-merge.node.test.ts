import { describe, test } from 'node:test';
import assert from 'node:assert/strict';

/**
 * frontmatter-merge.test.ts — STORY-010-04
 *
 * Tests for mergeFrontmatterConflict().
 *
 * Tests:
 *   1. timestampWin — newer ISO timestamp wins on pushed_at
 *   2. nonTsMarker — non-timestamp scalar conflict gets git markers
 *   3. agreementNoMarker — matching values have no markers
 *   4. newRemoteFieldAdded — new field from remote is included
 *   5. newerLocalTimestampWins — when local is newer, local wins
 */

import { mergeFrontmatterConflict, TIMESTAMP_FIELDS } from '../../src/lib/frontmatter-merge.js';
import { parseFrontmatter } from '../../src/wiki/parse-frontmatter.js';

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


function makeFrontmatterBlock(fields: Record<string, unknown>): string {
  const lines = ['---'];
  for (const [key, val] of Object.entries(fields)) {
    if (val === null) {
      lines.push(`${key}: null`);
    } else if (typeof val === 'boolean') {
      lines.push(`${key}: ${val}`);
    } else {
      lines.push(`${key}: "${val}"`);
    }
  }
  lines.push('---', '');
  return lines.join('\n');
}

// ── Test 1: timestamp newer wins ──────────────────────────────────────────────

describe('Scenario: Frontmatter merge prefers newer timestamp', () => {
  test('timestampWin: remote pushed_at wins when newer', () => {
    const localBlock = makeFrontmatterBlock({
      story_id: 'STORY-042-01',
      pushed_at: '2026-04-19T14:00:00Z',
    });
    const remoteBlock = makeFrontmatterBlock({
      story_id: 'STORY-042-01',
      pushed_at: '2026-04-19T15:00:00Z',
    });

    const result = mergeFrontmatterConflict(localBlock, remoteBlock);
    const { fm } = parseFrontmatter(result);

    // Newer timestamp should win
    assert.strictEqual(fm['pushed_at'], '2026-04-19T15:00:00Z');
    // No conflict markers
    assert.ok(!String(result).includes('<<<<<<<'));
  });

  test('localTimestampWins: local last_pulled_at wins when newer', () => {
    const localBlock = makeFrontmatterBlock({
      story_id: 'STORY-042-01',
      last_pulled_at: '2026-04-19T16:00:00Z',
    });
    const remoteBlock = makeFrontmatterBlock({
      story_id: 'STORY-042-01',
      last_pulled_at: '2026-04-19T12:00:00Z',
    });

    const result = mergeFrontmatterConflict(localBlock, remoteBlock);
    const { fm } = parseFrontmatter(result);

    assert.strictEqual(fm['last_pulled_at'], '2026-04-19T16:00:00Z');
    assert.ok(!String(result).includes('<<<<<<<'));
  });

  test('updatedAtUsesNewerValue: updated_at in TIMESTAMP_FIELDS', () => {
    expect(TIMESTAMP_FIELDS.has('updated_at')).toBe(true);
    expect(TIMESTAMP_FIELDS.has('pushed_at')).toBe(true);
    expect(TIMESTAMP_FIELDS.has('last_pulled_at')).toBe(true);
    expect(TIMESTAMP_FIELDS.has('last_remote_update')).toBe(true);
  });
});

// ── Test 2: non-timestamp conflict uses markers ───────────────────────────────

describe('Scenario: Frontmatter merge preserves non-ts conflict as marker', () => {
  test('nonTsMarker: title conflict returns git-style markers', () => {
    const localBlock = makeFrontmatterBlock({
      story_id: 'STORY-042-01',
      title: 'Local Title',
    });
    const remoteBlock = makeFrontmatterBlock({
      story_id: 'STORY-042-01',
      title: 'Remote Title',
    });

    const result = mergeFrontmatterConflict(localBlock, remoteBlock);

    // Result should contain conflict markers
    assert.ok(String(result).includes('<<<<<<<'));
    assert.ok(String(result).includes('======='));
    assert.ok(String(result).includes('>>>>>>>'));
    assert.ok(String(result).includes('Local Title'));
    assert.ok(String(result).includes('Remote Title'));
  });

  test('statusConflictGetsMarkers: status is not a timestamp field', () => {
    const localBlock = makeFrontmatterBlock({
      story_id: 'STORY-042-01',
      status: 'in-progress',
    });
    const remoteBlock = makeFrontmatterBlock({
      story_id: 'STORY-042-01',
      status: 'done',
    });

    const result = mergeFrontmatterConflict(localBlock, remoteBlock);
    assert.ok(String(result).includes('<<<<<<<'));
  });
});

// ── Test 3: matching values — no markers ──────────────────────────────────────

describe('Scenario: Matching values produce no conflict markers', () => {
  test('agreementNoMarker: same values on both sides are preserved without markers', () => {
    const localBlock = makeFrontmatterBlock({
      story_id: 'STORY-042-01',
      status: 'todo',
      pushed_at: '2026-04-19T14:00:00Z',
    });
    const remoteBlock = makeFrontmatterBlock({
      story_id: 'STORY-042-01',
      status: 'todo',
      pushed_at: '2026-04-19T14:00:00Z',
    });

    const result = mergeFrontmatterConflict(localBlock, remoteBlock);
    assert.ok(!String(result).includes('<<<<<<<'));
    const { fm } = parseFrontmatter(result);
    assert.strictEqual(fm['status'], 'todo');
  });
});

// ── Test 4: new remote field added ────────────────────────────────────────────

describe('Scenario: New remote field is added to merged result', () => {
  test('newRemoteFieldAdded: field only in remote appears in result', () => {
    const localBlock = makeFrontmatterBlock({
      story_id: 'STORY-042-01',
    });
    const remoteBlock = makeFrontmatterBlock({
      story_id: 'STORY-042-01',
      remote_id: 'LIN-1042',
    });

    const result = mergeFrontmatterConflict(localBlock, remoteBlock);
    const { fm } = parseFrontmatter(result);
    assert.strictEqual(fm['remote_id'], 'LIN-1042');
  });
});
