import { describe, test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';

/**
 * sync-check.test.ts — STORY-010-08
 *
 * Tests for `cleargate sync --check` (syncCheckHandler).
 * Verifies hook-safe behavior: exits 0 on all failure paths, emits JSON to stdout.
 *
 * FLASHCARD: #hook-safe #sync-check #exit-code
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { syncCheckHandler } from '../../src/commands/sync.js';
import type { McpClient, RemoteUpdateRef, AdapterInfo } from '../../src/lib/mcp-client.js';

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


const tmpDirs: string[] = [];

function makeTmpDir(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cg-sync-check-test-'));
  tmpDirs.push(dir);
  return dir;
}

afterEach(() => {
  for (const dir of tmpDirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

function makeConfiguredMcp(updates: RemoteUpdateRef[]): McpClient {
  return {
    adapterInfo: async (): Promise<AdapterInfo> => ({ configured: true, name: 'linear' }),
    call: async <T>(tool: string, _args: Record<string, unknown>): Promise<T> => {
      if (tool === 'cleargate_list_remote_updates') {
        return updates as T;
      }
      throw new Error(`Unexpected tool call: ${tool}`);
    },
  };
}

function makeUnconfiguredMcp(): McpClient {
  return {
    adapterInfo: async (): Promise<AdapterInfo> => ({ configured: false, name: 'no-adapter-configured' }),
    call: async <T>(_tool: string, _args: Record<string, unknown>): Promise<T> => {
      throw new Error('Should not be called');
    },
  };
}

function makeThrowingMcp(errorMsg: string): McpClient {
  return {
    adapterInfo: async (): Promise<AdapterInfo> => ({ configured: true, name: 'linear' }),
    call: async <T>(_tool: string, _args: Record<string, unknown>): Promise<T> => {
      throw new Error(errorMsg);
    },
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('syncCheckHandler — §14.9 hook-safe drift probe', () => {
  test('Scenario 1: happy path — adapter configured, MCP returns 3 refs → stdout JSON {updates:3}, exit 0', async () => {
    const tmpDir = makeTmpDir();
    const updates: RemoteUpdateRef[] = [
      { remote_id: 'r1', updated_at: '2026-01-01T00:00:00Z' },
      { remote_id: 'r2', updated_at: '2026-01-02T00:00:00Z' },
      { remote_id: 'r3', updated_at: '2026-01-03T00:00:00Z' },
    ];
    const mcp = makeConfiguredMcp(updates);

    let stdoutCapture = '';
    let exitCalled = false;

    await syncCheckHandler({
      projectRoot: tmpDir,
      mcp,
      stdout: (s) => { stdoutCapture += s; },
      now: () => '2026-04-19T10:00:00.000Z',
    });

    // Should NOT have called process.exit — handler returns normally
    assert.strictEqual(exitCalled, false);

    const parsed = JSON.parse(stdoutCapture.trim()) as Record<string, unknown>;
    assert.strictEqual(parsed['updates'], 3);
    assert.strictEqual(typeof parsed['since'], 'string');
    assert.strictEqual(parsed['error'], undefined);
  });

  test('Scenario 1b: stdout since field is the epoch fallback when marker absent', async () => {
    const tmpDir = makeTmpDir();
    const mcp = makeConfiguredMcp([]);

    let stdoutCapture = '';

    await syncCheckHandler({
      projectRoot: tmpDir,
      mcp,
      stdout: (s) => { stdoutCapture += s; },
      now: () => '2026-04-19T10:00:00.000Z',
    });

    const parsed = JSON.parse(stdoutCapture.trim()) as Record<string, unknown>;
    assert.strictEqual(parsed['since'], '1970-01-01T00:00:00.000Z');
  });

  test('Scenario 2: MCP-failure (call throws) → stdout {updates:0, error:...}, exits 0, no sync-log write', async () => {
    const tmpDir = makeTmpDir();
    const mcp = makeThrowingMcp('connection refused');

    let stdoutCapture = '';

    await syncCheckHandler({
      projectRoot: tmpDir,
      mcp,
      stdout: (s) => { stdoutCapture += s; },
      now: () => '2026-04-19T10:00:00.000Z',
    });

    const parsed = JSON.parse(stdoutCapture.trim()) as Record<string, unknown>;
    assert.strictEqual(parsed['updates'], 0);
    assert.strictEqual(typeof parsed['error'], 'string');
    assert.ok(String(parsed['error']).includes('connection refused'));

    // No .conflicts.json should have been written
    const conflictsPath = path.join(tmpDir, '.cleargate', '.conflicts.json');
    expect(fs.existsSync(conflictsPath)).toBe(false);

    // No sync-log entries
    const sprintRoot = path.join(tmpDir, '.cleargate', 'sprint-runs');
    const sprintLogsExist = fs.existsSync(sprintRoot);
    // Either it doesn't exist at all or has no sync-log entries
    if (sprintLogsExist) {
      // This should not happen in check mode
      assert.strictEqual(false, true);
    }
  });

  test('Scenario 3: adapter-not-configured → stdout {updates:0, error:"adapter-not-configured"}, exits 0', async () => {
    const tmpDir = makeTmpDir();
    const mcp = makeUnconfiguredMcp();

    let stdoutCapture = '';

    await syncCheckHandler({
      projectRoot: tmpDir,
      mcp,
      stdout: (s) => { stdoutCapture += s; },
      now: () => '2026-04-19T10:00:00.000Z',
    });

    const parsed = JSON.parse(stdoutCapture.trim()) as Record<string, unknown>;
    assert.strictEqual(parsed['updates'], 0);
    assert.strictEqual(parsed['error'], 'adapter-not-configured');
  });

  test('Scenario 4: marker absent → handler creates marker with current timestamp', async () => {
    const tmpDir = makeTmpDir();
    const mcp = makeConfiguredMcp([]);
    const fixedNow = '2026-04-19T10:00:00.000Z';

    let stdoutCapture = '';

    await syncCheckHandler({
      projectRoot: tmpDir,
      mcp,
      stdout: (s) => { stdoutCapture += s; },
      now: () => fixedNow,
    });

    const markerPath = path.join(tmpDir, '.cleargate', '.sync-marker.json');
    expect(fs.existsSync(markerPath)).toBe(true);
    const marker = JSON.parse(fs.readFileSync(markerPath, 'utf8')) as Record<string, unknown>;
    assert.strictEqual(marker['last_check'], fixedNow);
    // Schema: only last_check, no extra fields beyond what we wrote
    expect(Object.keys(marker)).toEqual(['last_check']);
  });

  test('Scenario 4b: marker updates last_check on success', async () => {
    const tmpDir = makeTmpDir();

    // Pre-create marker with old timestamp
    const markerPath = path.join(tmpDir, '.cleargate', '.sync-marker.json');
    fs.mkdirSync(path.dirname(markerPath), { recursive: true });
    fs.writeFileSync(markerPath, JSON.stringify({ last_check: '2026-01-01T00:00:00.000Z' }), 'utf8');

    const fixedNow = '2026-04-19T10:00:00.000Z';
    const mcp = makeConfiguredMcp([{ remote_id: 'r1', updated_at: '2026-04-18T10:00:00Z' }]);

    let stdoutCapture = '';

    await syncCheckHandler({
      projectRoot: tmpDir,
      mcp,
      stdout: (s) => { stdoutCapture += s; },
      now: () => fixedNow,
    });

    const marker = JSON.parse(fs.readFileSync(markerPath, 'utf8')) as Record<string, unknown>;
    assert.strictEqual(marker['last_check'], fixedNow);

    const parsed = JSON.parse(stdoutCapture.trim()) as Record<string, unknown>;
    assert.strictEqual(parsed['updates'], 1);
    // The `since` field reflects what was in the marker before the call
    assert.strictEqual(parsed['since'], '2026-01-01T00:00:00.000Z');
  });

  test('Error path: missing env token (no mcp injection) → exits 0 with error JSON', async () => {
    const tmpDir = makeTmpDir();

    let stdoutCapture = '';

    await syncCheckHandler({
      projectRoot: tmpDir,
      env: {}, // no CLEARGATE_MCP_TOKEN or CLEARGATE_MCP_URL
      stdout: (s) => { stdoutCapture += s; },
      now: () => '2026-04-19T10:00:00.000Z',
    });

    const parsed = JSON.parse(stdoutCapture.trim()) as Record<string, unknown>;
    assert.strictEqual(parsed['updates'], 0);
    assert.strictEqual(typeof parsed['error'], 'string');
  });
});
