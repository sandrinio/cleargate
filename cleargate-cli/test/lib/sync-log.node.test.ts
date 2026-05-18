import { describe, test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';

/**
 * sync-log.test.ts — STORY-010-01 §4 quality gates, sync-log section.
 *
 * Tests 5–8 per plan:
 *   5. append creates file + parent dir
 *   6. append-preserves-order and is append-only
 *   7. readSyncLog filters by actor / op / target
 *   8. readSyncLog tolerates malformed line
 */
import * as fs from 'node:fs';
import * as fsPromises from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';
import { appendSyncLog, readSyncLog, resolveActiveSprintDir, type SyncLogEntry } from '../../src/lib/sync-log.js';

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
  return fs.mkdtempSync(path.join(os.tmpdir(), 'cg-sync-log-test-'));
}

function cleanup(dir: string): void {
  fs.rmSync(dir, { recursive: true, force: true });
}

function makeEntry(overrides: Partial<SyncLogEntry> = {}): SyncLogEntry {
  return {
    ts: '2026-04-19T12:00:00Z',
    actor: 'a@x.com',
    op: 'push',
    target: 'STORY-042-01',
    result: 'ok',
    ...overrides,
  };
}

describe('Scenario: sync-log append creates missing file', () => {
  let tmpDir: string;
  let sprintRoot: string;

  beforeEach(() => {
    tmpDir = makeTmpDir();
    sprintRoot = path.join(tmpDir, '.cleargate', 'sprint-runs', 'SPRINT-06');
    // Do NOT pre-create sprintRoot — test proves creation
  });

  afterEach(() => cleanup(tmpDir));

  test('append creates file + parent dir when absent', async () => {
    await appendSyncLog(sprintRoot, makeEntry({ op: 'push', target: 'STORY-042-01', result: 'ok' }));

    const logPath = path.join(sprintRoot, 'sync-log.jsonl');
    expect(fs.existsSync(logPath)).toBe(true);

    const raw = fs.readFileSync(logPath, 'utf8').trim();
    const parsed = JSON.parse(raw) as SyncLogEntry;
    assert.strictEqual(parsed.op, 'push');
    assert.strictEqual(parsed.target, 'STORY-042-01');
    assert.strictEqual(parsed.result, 'ok');
  });
});

describe('Scenario: append-preserves-order and is append-only', () => {
  let tmpDir: string;
  let sprintRoot: string;

  beforeEach(() => {
    tmpDir = makeTmpDir();
    sprintRoot = path.join(tmpDir, 'sprint');
    fs.mkdirSync(sprintRoot, { recursive: true });
  });

  afterEach(() => cleanup(tmpDir));

  test('two sequential appends + manual sentinel + third append all survive', async () => {
    const logPath = path.join(sprintRoot, 'sync-log.jsonl');

    await appendSyncLog(sprintRoot, makeEntry({ ts: '2026-04-19T10:00:00Z', actor: 'first@x.com' }));
    await appendSyncLog(sprintRoot, makeEntry({ ts: '2026-04-19T11:00:00Z', actor: 'second@x.com' }));

    // Manual sentinel appended directly — must survive
    await fsPromises.appendFile(logPath, '{"sentinel":true}\n', 'utf8');

    await appendSyncLog(sprintRoot, makeEntry({ ts: '2026-04-19T12:00:00Z', actor: 'third@x.com' }));

    const raw = fs.readFileSync(logPath, 'utf8');
    const lines = raw.trim().split('\n').filter((l) => l.trim() !== '');
    assert.strictEqual((lines).length, 4);

    // Sentinel survives
    assert.strictEqual(lines[2], '{"sentinel":true}');

    // All 3 appended entries present
    const actors = lines
      .filter((l) => !l.includes('sentinel'))
      .map((l) => (JSON.parse(l) as SyncLogEntry).actor);
    assert.ok(String(actors).includes('first@x.com'));
    assert.ok(String(actors).includes('second@x.com'));
    assert.ok(String(actors).includes('third@x.com'));
  });
});

describe('Scenario: sync-log filters', () => {
  let tmpDir: string;
  let sprintRoot: string;

  beforeEach(async () => {
    tmpDir = makeTmpDir();
    sprintRoot = path.join(tmpDir, 'sprint');
    fs.mkdirSync(sprintRoot, { recursive: true });

    // Seed 6 entries: 2 actors, 3 ops
    const entries: SyncLogEntry[] = [
      makeEntry({ ts: '2026-04-19T01:00:00Z', actor: 'a@x.com', op: 'push', target: 'STORY-001-01' }),
      makeEntry({ ts: '2026-04-19T02:00:00Z', actor: 'b@x.com', op: 'pull', target: 'STORY-002-01' }),
      makeEntry({ ts: '2026-04-19T03:00:00Z', actor: 'a@x.com', op: 'pull', target: 'STORY-003-01' }),
      makeEntry({ ts: '2026-04-19T04:00:00Z', actor: 'b@x.com', op: 'sync-status', target: 'STORY-004-01' }),
      makeEntry({ ts: '2026-04-19T05:00:00Z', actor: 'a@x.com', op: 'push', target: 'STORY-005-01' }),
      makeEntry({ ts: '2026-04-19T06:00:00Z', actor: 'b@x.com', op: 'push', target: 'STORY-006-01' }),
    ];
    for (const entry of entries) {
      await appendSyncLog(sprintRoot, entry);
    }
  });

  afterEach(() => cleanup(tmpDir));

  test('filter by actor returns only that actor\'s entries, newest-first', async () => {
    const results = await readSyncLog(sprintRoot, { actor: 'a@x.com' });
    assert.strictEqual((results).length, 3);
    expect(results.every((e) => e.actor === 'a@x.com')).toBe(true);
    // newest-first
    assert.strictEqual(results[0].ts > results[1].ts, true);
    assert.strictEqual(results[1].ts > results[2].ts, true);
  });

  test('filter by op returns only that op', async () => {
    const results = await readSyncLog(sprintRoot, { op: 'push' });
    assert.strictEqual((results).length, 3);
    expect(results.every((e) => e.op === 'push')).toBe(true);
  });

  test('filter by target returns only that target', async () => {
    const results = await readSyncLog(sprintRoot, { target: 'STORY-001-01' });
    assert.strictEqual((results).length, 1);
    assert.strictEqual(results[0].target, 'STORY-001-01');
  });

  test('no filter returns all 6 entries, newest-first', async () => {
    const results = await readSyncLog(sprintRoot);
    assert.strictEqual((results).length, 6);
    assert.strictEqual(results[0].ts, '2026-04-19T06:00:00Z');
    assert.strictEqual(results[5].ts, '2026-04-19T01:00:00Z');
  });
});

describe('Scenario: readSyncLog tolerates malformed line', () => {
  let tmpDir: string;
  let sprintRoot: string;

  beforeEach(() => {
    tmpDir = makeTmpDir();
    sprintRoot = path.join(tmpDir, 'sprint');
    fs.mkdirSync(sprintRoot, { recursive: true });
  });

  afterEach(() => cleanup(tmpDir));

  test('skips malformed JSON lines and returns only valid entries', async () => {
    const logPath = path.join(sprintRoot, 'sync-log.jsonl');

    await appendSyncLog(sprintRoot, makeEntry({ ts: '2026-04-19T10:00:00Z', target: 'STORY-001-01' }));
    await fsPromises.appendFile(logPath, '{not-json}\n', 'utf8');
    await appendSyncLog(sprintRoot, makeEntry({ ts: '2026-04-19T11:00:00Z', target: 'STORY-002-01' }));

    const results = await readSyncLog(sprintRoot);
    assert.strictEqual((results).length, 2);
    expect(results.map((e) => e.target)).toContain('STORY-001-01');
    expect(results.map((e) => e.target)).toContain('STORY-002-01');
  });

  test('never throws on malformed line', async () => {
    const logPath = path.join(sprintRoot, 'sync-log.jsonl');
    await fsPromises.writeFile(logPath, '{totally-invalid}\n{also-bad}\n', 'utf8');

    await expect(readSyncLog(sprintRoot)).resolves.toEqual([]);
  });
});

describe('resolveActiveSprintDir', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = makeTmpDir();
  });

  afterEach(() => cleanup(tmpDir));

  test('returns _off-sprint when no sprint dirs exist', () => {
    const result = resolveActiveSprintDir(tmpDir);
    assert.ok(String(result).includes('_off-sprint'));
    expect(fs.existsSync(result)).toBe(true);
  });

  test('returns newest sprint dir by mtime', async () => {
    const sprintRunsRoot = path.join(tmpDir, '.cleargate', 'sprint-runs');
    const sprint06 = path.join(sprintRunsRoot, 'SPRINT-06');
    const sprint07 = path.join(sprintRunsRoot, 'SPRINT-07');

    fs.mkdirSync(sprint06, { recursive: true });
    // Small delay to get distinct mtimes
    await new Promise((r) => setTimeout(r, 10));
    fs.mkdirSync(sprint07, { recursive: true });

    const result = resolveActiveSprintDir(tmpDir);
    assert.ok(String(result).includes('SPRINT-07'));
  });
});

describe('JWT redaction', () => {
  let tmpDir: string;
  let sprintRoot: string;

  beforeEach(() => {
    tmpDir = makeTmpDir();
    sprintRoot = path.join(tmpDir, 'sprint');
    fs.mkdirSync(sprintRoot, { recursive: true });
  });

  afterEach(() => cleanup(tmpDir));

  test('redacts JWT tokens in detail field before writing', async () => {
    const fakeJwt = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ0ZXN0In0.fakeSig';
    await appendSyncLog(sprintRoot, makeEntry({ detail: `token: ${fakeJwt}` }));

    const logPath = path.join(sprintRoot, 'sync-log.jsonl');
    const raw = fs.readFileSync(logPath, 'utf8');
    assert.ok(!String(raw).includes(fakeJwt));
    assert.ok(String(raw).includes('[REDACTED]'));
  });
});
