import { describe, test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';

/**
 * conflicts.test.ts — STORY-010-04
 *
 * Tests for `cleargate conflicts` (read-only).
 *
 * Tests:
 *   1. lists — reads .conflicts.json, prints unresolved items, no mutations
 *   2. emptyFile — empty unresolved array exits 0, prints "No unresolved conflicts"
 *   3. noFile — missing file exits 0 with message
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { conflictsHandler } from '../../src/commands/conflicts.js';
import type { ConflictsJson } from '../../src/commands/sync.js';

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
  return fs.mkdtempSync(path.join(os.tmpdir(), 'cg-conflicts-test-'));
}

function cleanup(dir: string): void {
  fs.rmSync(dir, { recursive: true, force: true });
}

function writeConflictsJson(tmpDir: string, data: ConflictsJson): void {
  const cgDir = path.join(tmpDir, '.cleargate');
  fs.mkdirSync(cgDir, { recursive: true });
  fs.writeFileSync(path.join(cgDir, '.conflicts.json'), JSON.stringify(data, null, 2), 'utf8');
}

function snapshotDir(dir: string): Record<string, string> {
  const result: Record<string, string> = {};
  if (!fs.existsSync(dir)) return result;
  function walk(d: string) {
    for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
      const fullPath = path.join(d, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
      } else {
        result[fullPath] = fs.readFileSync(fullPath, 'utf8');
      }
    }
  }
  walk(dir);
  return result;
}

// ── Test 1: lists unresolved items ────────────────────────────────────────────

describe('Scenario: conflicts command lists unresolved', () => {
  let tmpDir: string;

  beforeEach(() => { tmpDir = makeTmpDir(); });
  afterEach(() => cleanup(tmpDir));

  test('lists: stdout contains both items, no files modified', async () => {
    const data: ConflictsJson = {
      generated_at: '2026-04-19T16:00:00Z',
      sprint_id: 'SPRINT-07',
      unresolved: [
        {
          item_id: 'STORY-042-01',
          remote_id: 'LIN-1042',
          state: 'local-delete-remote-edit',
          resolution: 'refuse',
          reason: 'local deletion conflicts with remote edit',
          local_path: '.cleargate/delivery/pending-sync/STORY-042-01.md',
        },
        {
          item_id: 'STORY-042-02',
          remote_id: 'LIN-1043',
          state: 'remote-delete-local-edit',
          resolution: 'refuse',
          reason: 'remote deletion conflicts with local edit',
          local_path: '.cleargate/delivery/pending-sync/STORY-042-02.md',
        },
      ],
    };

    writeConflictsJson(tmpDir, data);

    // Snapshot before
    const before = snapshotDir(tmpDir);

    const stdoutLines: string[] = [];
    let exitCode: number | undefined;

    await conflictsHandler({
      projectRoot: tmpDir,
      stdout: (s) => stdoutLines.push(s),
      stderr: () => {},
      exit: (c) => { exitCode = c; return undefined as never; },
    });

    // Should exit 1 (there are unresolved conflicts)
    assert.strictEqual(exitCode, 1);

    const combined = stdoutLines.join('');
    assert.ok(String(combined).includes('STORY-042-01'));
    assert.ok(String(combined).includes('STORY-042-02'));
    assert.ok(String(combined).includes('remote-delete'));

    // No files modified
    const after = snapshotDir(tmpDir);
    // Only the conflicts.json we created should be there — no new files
    expect(Object.keys(after)).toEqual(Object.keys(before));
    for (const [key, val] of Object.entries(before)) {
      assert.strictEqual(after[key], val);
    }
  });
});

// ── Test 2: empty unresolved array ────────────────────────────────────────────

describe('Scenario: conflicts command with empty conflicts', () => {
  let tmpDir: string;

  beforeEach(() => { tmpDir = makeTmpDir(); });
  afterEach(() => cleanup(tmpDir));

  test('emptyFile: prints "No unresolved conflicts", exits 0', async () => {
    writeConflictsJson(tmpDir, {
      generated_at: '2026-04-19T16:00:00Z',
      sprint_id: 'SPRINT-07',
      unresolved: [],
    });

    const stdoutLines: string[] = [];
    let exitCode: number | undefined;

    await conflictsHandler({
      projectRoot: tmpDir,
      stdout: (s) => stdoutLines.push(s),
      stderr: () => {},
      exit: (c) => { exitCode = c; return undefined as never; },
    });

    assert.strictEqual(exitCode, 0);
    expect(stdoutLines.join('')).toContain('No unresolved conflicts');
  });
});

// ── Test 3: no file ────────────────────────────────────────────────────────────

describe('Scenario: conflicts command without .conflicts.json', () => {
  let tmpDir: string;

  beforeEach(() => { tmpDir = makeTmpDir(); });
  afterEach(() => cleanup(tmpDir));

  test('noFile: exits 0 with helpful message', async () => {
    const stdoutLines: string[] = [];
    let exitCode: number | undefined;

    await conflictsHandler({
      projectRoot: tmpDir,
      stdout: (s) => stdoutLines.push(s),
      stderr: () => {},
      exit: (c) => { exitCode = c; return undefined as never; },
    });

    assert.strictEqual(exitCode, 0);
    expect(stdoutLines.join('')).toContain('No conflicts file found');
  });
});
