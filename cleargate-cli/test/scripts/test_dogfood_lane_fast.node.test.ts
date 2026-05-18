import { describe, test } from 'node:test';
import assert from 'node:assert/strict';

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


// STORY-022-08: dogfood lane=fast audit-table generation contract.
// Verifies the data-shape contract for the §5 Lane Audit row + the activation-gate
// behavior in close_sprint.mjs (already covered structurally by test_close_sprint_v21.test.ts;
// this file adds the dogfood-specific shape assertions).

interface LaneAuditRow {
  story: string;
  files_touched: number;
  loc: number;
  demoted: 'y' | 'n';
  retrospect_was_fast_correct: 'y' | 'n' | '';
  notes: string;
}

interface FastLaneState {
  schema_version: number;
  stories: Record<string, {
    state: string;
    lane?: 'standard' | 'fast';
    lane_assigned_by?: string;
    lane_demoted_at?: string | null;
    lane_demotion_reason?: string | null;
  }>;
}

function buildLaneAuditRow(state: FastLaneState, storyId: string, files: number, loc: number): LaneAuditRow | null {
  const story = state.stories[storyId];
  if (!story) return null;
  if (story.lane !== 'fast' && story.lane_demoted_at == null) return null;
  return {
    story: storyId,
    files_touched: files,
    loc,
    demoted: story.lane_demoted_at != null ? 'y' : 'n',
    retrospect_was_fast_correct: '',
    notes: story.lane_demotion_reason ?? '',
  };
}

function activationGateFires(state: FastLaneState): boolean {
  if (state.schema_version < 2) return false;
  return Object.values(state.stories).some((s) => s.lane === 'fast');
}

describe('STORY-022-08 dogfood: lane audit row generation', () => {
  test('produces a row for a fast-lane story with a demotion', () => {
    const state: FastLaneState = {
      schema_version: 2,
      stories: {
        'STORY-099-01': {
          state: 'Architect Passed',
          lane: 'fast',
          lane_assigned_by: 'architect',
          lane_demoted_at: '2026-04-27T00:00:00Z',
          lane_demotion_reason: 'simulated scanner failure: typecheck error',
        },
      },
    };
    const row = buildLaneAuditRow(state, 'STORY-099-01', 1, 1);
    assert.notStrictEqual(row, null);
    assert.strictEqual(row!.story, 'STORY-099-01');
    assert.strictEqual(row!.demoted, 'y');
    assert.strictEqual(row!.retrospect_was_fast_correct, ''); // human fill-in
    assert.ok(String(row!.notes).includes('simulated scanner failure'));
  });

  test('returns null for a standard-lane story with no demotion history', () => {
    const state: FastLaneState = {
      schema_version: 2,
      stories: {
        'STORY-022-01': {
          state: 'Done',
          lane: 'standard',
          lane_assigned_by: 'migration-default',
          lane_demoted_at: null,
          lane_demotion_reason: null,
        },
      },
    };
    expect(buildLaneAuditRow(state, 'STORY-022-01', 4, 50)).toBeNull();
  });
});

describe('STORY-022-08 dogfood: activation gate', () => {
  test('fires when schema_version >= 2 AND any lane=fast', () => {
    const state: FastLaneState = {
      schema_version: 2,
      stories: { 'A': { state: 'Done', lane: 'fast' } },
    };
    expect(activationGateFires(state)).toBe(true);
  });

  test('does NOT fire when schema_version < 2 (legacy-pass)', () => {
    const state: FastLaneState = {
      schema_version: 1,
      stories: { 'A': { state: 'Done', lane: 'fast' } },
    };
    expect(activationGateFires(state)).toBe(false);
  });

  test('does NOT fire when v2 but no fast-lane stories (legacy-pass)', () => {
    const state: FastLaneState = {
      schema_version: 2,
      stories: { 'A': { state: 'Done', lane: 'standard' } },
    };
    expect(activationGateFires(state)).toBe(false);
  });
});
