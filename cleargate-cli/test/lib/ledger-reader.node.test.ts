import { describe, test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';

/**
 * Tests for STORY-008-04: ledger-reader.ts
 *
 * Uses real fs under os.tmpdir(). No fs mocks.
 * Tests match Architect's plan scenarios 9 + 10 and Gherkin "Reader groups by session".
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { readLedgerForWorkItem } from '../../src/lib/ledger-reader.js';
import type { LedgerRow } from '../../src/lib/ledger-reader.js';

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


// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeTmpSprintRuns(): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ledger-reader-test-'));
  return root;
}

function writeJsonl(dir: string, sprintId: string, rows: Partial<LedgerRow>[]): string {
  const sprintDir = path.join(dir, sprintId);
  fs.mkdirSync(sprintDir, { recursive: true });
  const ledger = path.join(sprintDir, 'token-ledger.jsonl');
  const lines = rows.map((r) => JSON.stringify(r)).join('\n') + '\n';
  fs.writeFileSync(ledger, lines, 'utf-8');
  return ledger;
}

function makeRow(overrides: Partial<LedgerRow> = {}): LedgerRow {
  return {
    ts: '2026-04-19T12:00:00Z',
    sprint_id: 'SPRINT-05',
    agent_type: 'developer',
    story_id: '',
    work_item_id: 'EPIC-008',
    session_id: 'session-A',
    transcript: '/tmp/t.jsonl',
    input: 100,
    output: 50,
    cache_creation: 0,
    cache_read: 0,
    model: 'claude-sonnet-4-6',
    turns: 3,
    ...overrides,
  };
}

let tmpRoot: string;

beforeEach(() => {
  tmpRoot = makeTmpSprintRuns();
});

afterEach(() => {
  fs.rmSync(tmpRoot, { recursive: true, force: true });
});

// ─── Scenario: Reader groups by session ───────────────────────────────────────

describe('readLedgerForWorkItem', () => {
  test('groups rows into 2 session buckets with aggregated totals (Gherkin: Reader groups by session)', () => {
    // Gherkin: Given ledger rows exist for EPIC-008 across 2 sessions
    //          When readLedgerForWorkItem("EPIC-008")
    //          Then the result groups rows into 2 session buckets with aggregated totals

    const rowA1 = makeRow({ session_id: 'session-A', sprint_id: 'SPRINT-04', ts: '2026-04-18T10:00:00Z', input: 100, output: 50 });
    const rowA2 = makeRow({ session_id: 'session-A', sprint_id: 'SPRINT-04', ts: '2026-04-18T10:05:00Z', input: 200, output: 80 });
    const rowB1 = makeRow({ session_id: 'session-B', sprint_id: 'SPRINT-05', ts: '2026-04-19T09:00:00Z', input: 300, output: 120, turns: 5 });

    writeJsonl(tmpRoot, 'SPRINT-04', [rowA1, rowA2]);
    writeJsonl(tmpRoot, 'SPRINT-05', [rowB1]);

    const buckets = readLedgerForWorkItem('EPIC-008', { sprintRunsRoot: tmpRoot });

    assert.strictEqual((buckets).length, 2);

    // Buckets are sorted by earliest row ts — session-A is older
    const bucketA = buckets.find((b) => b.session_id === 'session-A');
    const bucketB = buckets.find((b) => b.session_id === 'session-B');

    assert.notStrictEqual(bucketA, undefined);
    assert.strictEqual((bucketA!.rows).length, 2);
    assert.strictEqual(bucketA!.totals.input, 300);
    assert.strictEqual(bucketA!.totals.output, 130);
    assert.strictEqual(bucketA!.totals.turns, 6); // 3 + 3 default

    assert.notStrictEqual(bucketB, undefined);
    assert.strictEqual((bucketB!.rows).length, 1);
    assert.strictEqual(bucketB!.totals.input, 300);
    assert.strictEqual(bucketB!.totals.output, 120);
    assert.strictEqual(bucketB!.totals.turns, 5);
  });

  test('single-sprint read returns matching rows only', () => {
    const epRow = makeRow({ work_item_id: 'EPIC-008', story_id: '', session_id: 'sess-1' });
    const stRow = makeRow({ work_item_id: 'STORY-008-04', story_id: 'STORY-008-04', session_id: 'sess-2' });

    writeJsonl(tmpRoot, 'SPRINT-05', [epRow, stRow]);

    const buckets = readLedgerForWorkItem('EPIC-008', { sprintRunsRoot: tmpRoot });

    assert.strictEqual((buckets).length, 1);
    assert.strictEqual(buckets[0].session_id, 'sess-1');
    assert.strictEqual((buckets[0].rows).length, 1);
  });

  test('multi-sprint scan finds rows across sprint directories', () => {
    const sprint4Row = makeRow({ work_item_id: 'EPIC-008', sprint_id: 'SPRINT-04', ts: '2026-04-18T00:00:00Z', session_id: 'old-session' });
    const sprint5Row = makeRow({ work_item_id: 'EPIC-008', sprint_id: 'SPRINT-05', ts: '2026-04-19T00:00:00Z', session_id: 'new-session' });

    writeJsonl(tmpRoot, 'SPRINT-04', [sprint4Row]);
    writeJsonl(tmpRoot, 'SPRINT-05', [sprint5Row]);

    const buckets = readLedgerForWorkItem('EPIC-008', { sprintRunsRoot: tmpRoot });

    assert.strictEqual((buckets).length, 2);
    expect(buckets.map((b) => b.session_id)).toContain('old-session');
    expect(buckets.map((b) => b.session_id)).toContain('new-session');
  });

  test('since filter excludes rows before the cutoff', () => {
    const oldRow = makeRow({ ts: '2026-04-18T00:00:00Z', session_id: 'sess-old' });
    const newRow = makeRow({ ts: '2026-04-19T12:00:00Z', session_id: 'sess-new' });

    writeJsonl(tmpRoot, 'SPRINT-05', [oldRow, newRow]);

    const buckets = readLedgerForWorkItem('EPIC-008', {
      sprintRunsRoot: tmpRoot,
      since: '2026-04-19T00:00:00Z',
    });

    assert.strictEqual((buckets).length, 1);
    assert.strictEqual(buckets[0].session_id, 'sess-new');
  });

  test('defaults work_item_id from story_id for pre-fix rows (backward compat)', () => {
    // Pre-STORY-008-04 rows only have story_id, no work_item_id
    const legacyRow = {
      ts: '2026-04-17T00:00:00Z',
      sprint_id: 'SPRINT-04',
      agent_type: 'developer',
      story_id: 'STORY-004-01',
      // work_item_id intentionally absent
      session_id: 'legacy-sess',
      transcript: '/tmp/t.jsonl',
      input: 50,
      output: 20,
      cache_creation: 0,
      cache_read: 0,
      model: 'claude-opus-4',
      turns: 2,
    };

    writeJsonl(tmpRoot, 'SPRINT-04', [legacyRow]);

    const buckets = readLedgerForWorkItem('STORY-004-01', { sprintRunsRoot: tmpRoot });

    assert.strictEqual((buckets).length, 1);
    assert.strictEqual(buckets[0].rows[0].work_item_id, 'STORY-004-01');
  });

  test('returns empty array when sprint-runs root does not exist', () => {
    const result = readLedgerForWorkItem('EPIC-008', { sprintRunsRoot: '/nonexistent/path/sprint-runs' });
    assert.deepStrictEqual(result, []);
  });

  test('returns empty array when no rows match the workItemId', () => {
    const row = makeRow({ work_item_id: 'STORY-001-01', story_id: 'STORY-001-01' });
    writeJsonl(tmpRoot, 'SPRINT-05', [row]);

    const buckets = readLedgerForWorkItem('EPIC-999', { sprintRunsRoot: tmpRoot });
    assert.deepStrictEqual(buckets, []);
  });
});
