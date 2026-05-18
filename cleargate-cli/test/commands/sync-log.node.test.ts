import { describe, test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';

/**
 * sync-log.test.ts (command) — STORY-010-04
 *
 * Tests for `cleargate sync-log` CLI wrapper.
 *
 * Tests:
 *   1. actorFilter — --actor filter returns only that actor
 *   2. opLimitFilter — --op + --limit caps and orders newest-first
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { syncLogHandler } from '../../src/commands/sync-log.js';
import { appendSyncLog, type SyncLogEntry } from '../../src/lib/sync-log.js';

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


function makeTmpDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'cg-sync-log-cmd-test-'));
}

function cleanup(dir: string): void {
  fs.rmSync(dir, { recursive: true, force: true });
}

function makeEntry(overrides: Partial<SyncLogEntry> = {}): SyncLogEntry {
  return {
    ts: '2026-04-19T12:00:00Z',
    actor: 'a@x.com',
    op: 'push',
    target: 'STORY-001-01',
    result: 'ok',
    ...overrides,
  };
}

async function seedLog(sprintRoot: string, entries: SyncLogEntry[]): Promise<void> {
  for (const entry of entries) {
    await appendSyncLog(sprintRoot, entry);
  }
}

// ── Test 1: actor filter ────────────────────────────────────────────────────────

describe('Scenario: sync-log --actor filter', () => {
  let tmpDir: string;
  let sprintRoot: string;

  beforeEach(async () => {
    tmpDir = makeTmpDir();
    // Create a sprint dir so resolveActiveSprintDir returns it
    sprintRoot = path.join(tmpDir, '.cleargate', 'sprint-runs', 'SPRINT-07');
    fs.mkdirSync(sprintRoot, { recursive: true });

    const entries: SyncLogEntry[] = [];
    for (let i = 1; i <= 20; i++) {
      entries.push(makeEntry({
        ts: `2026-04-19T${String(i).padStart(2, '0')}:00:00Z`,
        actor: i % 2 === 0 ? 'alice@x.com' : 'bob@x.com',
        op: 'push',
        target: `STORY-001-${String(i).padStart(2, '0')}`,
      }));
    }
    await seedLog(sprintRoot, entries);
  });

  afterEach(() => cleanup(tmpDir));

  test('actorFilter: --actor a@x.com returns only alice entries', async () => {
    const stdoutLines: string[] = [];

    await syncLogHandler({
      projectRoot: tmpDir,
      actor: 'alice@x.com',
      stdout: (s) => stdoutLines.push(s),
      stderr: () => {},
    });

    const combined = stdoutLines.join('');
    assert.ok(String(combined).includes('alice@x.com'));
    assert.ok(!String(combined).includes('bob@x.com'));

    // Count lines — should be 10 (every even i from 1-20)
    const lines = stdoutLines.filter((l) => l.trim() !== '').join('\n').split('\n').filter((l) => l.trim() !== '');
    assert.strictEqual(lines.length, 10);
  });
});

// ── Test 2: op + limit filter ─────────────────────────────────────────────────

describe('Scenario: sync-log --op + --limit filter', () => {
  let tmpDir: string;
  let sprintRoot: string;

  beforeEach(async () => {
    tmpDir = makeTmpDir();
    sprintRoot = path.join(tmpDir, '.cleargate', 'sprint-runs', 'SPRINT-07');
    fs.mkdirSync(sprintRoot, { recursive: true });

    const entries: SyncLogEntry[] = [];
    for (let i = 1; i <= 20; i++) {
      entries.push(makeEntry({
        ts: `2026-04-19T${String(i).padStart(2, '0')}:00:00Z`,
        op: i % 3 === 0 ? 'pull' : 'push',
        target: `STORY-001-${String(i).padStart(2, '0')}`,
      }));
    }
    await seedLog(sprintRoot, entries);
  });

  afterEach(() => cleanup(tmpDir));

  test('opLimitFilter: --op push --limit 5 caps at 5 and orders newest-first', async () => {
    const stdoutLines: string[] = [];

    await syncLogHandler({
      projectRoot: tmpDir,
      op: 'push',
      limit: 5,
      stdout: (s) => stdoutLines.push(s),
      stderr: () => {},
    });

    const lines = stdoutLines.join('').split('\n').filter((l) => l.trim() !== '');
    assert.ok(lines.length <= 5);
    assert.ok(lines.length > 0);

    // All lines should be push entries (contain 'push')
    for (const line of lines) {
      assert.ok(String(line).includes('push'));
    }

    // Newest-first: first line should have a later timestamp than last line
    if (lines.length >= 2) {
      const firstTs = lines[0].split('  ')[0];
      const lastTs = lines[lines.length - 1].split('  ')[0];
      assert.strictEqual(firstTs >= lastTs, true);
    }
  });

  test('emptyFilter: no entries match returns helpful message', async () => {
    const stdoutLines: string[] = [];

    await syncLogHandler({
      projectRoot: tmpDir,
      op: 'push-revert',  // no entries with this op
      stdout: (s) => stdoutLines.push(s),
      stderr: () => {},
    });

    expect(stdoutLines.join('')).toContain('No sync-log entries');
  });
});
