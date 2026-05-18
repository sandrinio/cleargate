import { describe, test, afterEach } from 'node:test';
import assert from 'node:assert/strict';

/**
 * stamp.test.ts — unit tests for `cleargate stamp <file>` command handler
 *
 * Covers all 6 Gherkin scenarios from STORY-001-05 acceptance criteria:
 *   1. stamp on fresh file stamps all 4 fields
 *   2. stamp on already-stamped file advances updated_at only
 *   3. stamp --dry-run prints diff and leaves file untouched
 *   4. stamp on archive path is noop-archive
 *   5. stamp with non-existent file exits 1 with stderr message
 *   6. stamp exit code is 0 on success, 1 on read failure
 */
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { stampHandler } from '../../src/commands/stamp.js';
import { parseFrontmatter } from '../../src/wiki/parse-frontmatter.js';
import type { CodebaseVersion } from '../../src/lib/codebase-version.js';

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


// ------------------------------------------------------------------ fixtures

const FIXED_NOW_1 = new Date('2026-01-01T10:00:00.000Z');
const FIXED_NOW_2 = new Date('2026-01-01T10:05:00.000Z');

const FIXED_VERSION: CodebaseVersion = {
  sha: 'deadbeef',
  dirty: false,
  tag: null,
  package_version: null,
  version_string: 'deadbeef',
};

/** File without any timestamp fields */
const FRESH_FILE = `---
story_id: "STORY-001-99"
title: "Test Story"
status: "Draft"
---

# Test Story

Body content.
`;

/** File already stamped */
const STAMPED_FILE = `---
story_id: "STORY-001-99"
title: "Test Story"
status: "Draft"
created_at: "2026-01-01T09:00:00Z"
updated_at: "2026-01-01T09:00:00Z"
created_at_version: "aabbccdd"
updated_at_version: "aabbccdd"
---

# Test Story

Body content.
`;

// ------------------------------------------------------------------ helpers

const tmpDirs: string[] = [];

function makeTmpDir(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cg-stamp-cmd-test-'));
  tmpDirs.push(dir);
  return dir;
}

function writeFile(filePath: string, content: string): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, 'utf8');
}

function readFile(filePath: string): string {
  return fs.readFileSync(filePath, 'utf8');
}

afterEach(() => {
  for (const dir of tmpDirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

// ------------------------------------------------------------------ tests

describe('stampHandler', () => {
  // Scenario 1: Stamp a fresh file — all 4 fields populated
  test('stamp on fresh file stamps all 4 fields', async () => {
    const dir = makeTmpDir();
    const filePath = path.join(dir, 'fresh.md');
    writeFile(filePath, FRESH_FILE);

    const out: string[] = [];
    const exitCodes: number[] = [];

    await stampHandler(
      filePath,
      {},
      {
        cwd: dir,
        now: () => FIXED_NOW_1,
        getVersion: () => FIXED_VERSION,
        stdout: (s) => out.push(s),
        exit: (code) => { exitCodes.push(code); throw new Error(`exit(${code})`); },
      },
    );

    // Exit should NOT have been called (success path)
    assert.strictEqual((exitCodes).length, 0);

    // Parse the written file to verify frontmatter
    const written = readFile(filePath);
    const { fm } = parseFrontmatter(written);

    assert.strictEqual(fm['created_at'], '2026-01-01T10:00:00Z');
    assert.strictEqual(fm['updated_at'], '2026-01-01T10:00:00Z');
    assert.strictEqual(fm['created_at_version'], 'deadbeef');
    assert.strictEqual(fm['updated_at_version'], 'deadbeef');

    // stdout should contain the summary line
    expect(out.some((l) => l.includes('[stamped]'))).toBe(true);
    expect(out.some((l) => l.includes('created'))).toBe(true);
  });

  // Scenario 2: Re-stamp advances updated_at only
  test('stamp on already-stamped file advances updated_at only', async () => {
    const dir = makeTmpDir();
    const filePath = path.join(dir, 'stamped.md');
    writeFile(filePath, STAMPED_FILE);

    const out: string[] = [];

    await stampHandler(
      filePath,
      {},
      {
        cwd: dir,
        now: () => FIXED_NOW_2,
        getVersion: () => FIXED_VERSION,
        stdout: (s) => out.push(s),
        exit: (code) => { throw new Error(`unexpected exit(${code})`); },
      },
    );

    const written = readFile(filePath);
    const { fm } = parseFrontmatter(written);

    // created_at must be preserved from original
    assert.strictEqual(fm['created_at'], '2026-01-01T09:00:00Z');
    assert.strictEqual(fm['created_at_version'], 'aabbccdd');

    // updated_at must advance
    assert.strictEqual(fm['updated_at'], '2026-01-01T10:05:00Z');
    assert.strictEqual(fm['updated_at_version'], 'deadbeef');

    expect(out.some((l) => l.includes('[stamped]'))).toBe(true);
    expect(out.some((l) => l.includes('updated'))).toBe(true);
  });

  // Scenario 3: --dry-run prints diff and leaves file untouched
  test('stamp --dry-run prints diff and leaves file untouched', async () => {
    const dir = makeTmpDir();
    const filePath = path.join(dir, 'fresh.md');
    writeFile(filePath, FRESH_FILE);

    const bytesBefore = readFile(filePath);
    const out: string[] = [];

    await stampHandler(
      filePath,
      { dryRun: true },
      {
        cwd: dir,
        now: () => FIXED_NOW_1,
        getVersion: () => FIXED_VERSION,
        stdout: (s) => out.push(s),
        exit: (code) => { throw new Error(`unexpected exit(${code})`); },
      },
    );

    // File must be byte-identical
    expect(readFile(filePath)).toBe(bytesBefore);

    // stdout must contain diff markers
    const combined = out.join('\n');
    assert.ok(String(combined).includes('---'));
    assert.ok(String(combined).includes('+++'));
    // The diff should show added fields (+ prefix)
    assert.match(String(combined), /\+created_at/);
  });

  // Scenario 4: Archive path is noop-archive
  test('stamp on archive path is noop-archive', async () => {
    const dir = makeTmpDir();
    const archiveDir = path.join(dir, '.cleargate', 'delivery', 'archive');
    fs.mkdirSync(archiveDir, { recursive: true });
    const filePath = path.join(archiveDir, 'STORY-001-99.md');
    writeFile(filePath, FRESH_FILE);

    const bytesBefore = readFile(filePath);
    const out: string[] = [];

    await stampHandler(
      filePath,
      {},
      {
        cwd: dir,
        now: () => FIXED_NOW_1,
        getVersion: () => FIXED_VERSION,
        stdout: (s) => out.push(s),
        exit: (code) => { throw new Error(`unexpected exit(${code})`); },
      },
    );

    // File must be unchanged
    expect(readFile(filePath)).toBe(bytesBefore);

    // stdout should indicate noop-archive
    expect(out.some((l) => l.includes('noop-archive'))).toBe(true);
  });

  // Scenario 5: Non-existent file exits 1 with stderr message
  test('stamp with non-existent file exits 1 with stderr message', async () => {
    const dir = makeTmpDir();
    const filePath = path.join(dir, 'does-not-exist.md');

    const exitCodes: number[] = [];

    await expect(
      stampHandler(
        filePath,
        {},
        {
          cwd: dir,
          now: () => FIXED_NOW_1,
          stdout: () => {},
          exit: (code) => { exitCodes.push(code); throw new Error(`exit(${code})`); },
        },
      ),
    ).rejects.toThrow('exit(1)');

    assert.deepStrictEqual(exitCodes, [1]);
  });

  // Scenario 6: Exit code is 0 on success, 1 on read failure
  test('stamp exit code is 0 on success and 1 on read failure', async () => {
    const dir = makeTmpDir();

    // Success path
    const successFile = path.join(dir, 'success.md');
    writeFile(successFile, FRESH_FILE);

    const successExitCodes: number[] = [];
    await stampHandler(
      successFile,
      {},
      {
        cwd: dir,
        now: () => FIXED_NOW_1,
        getVersion: () => FIXED_VERSION,
        stdout: () => {},
        exit: (code) => { successExitCodes.push(code); throw new Error(`exit(${code})`); },
      },
    );
    // No exit called on success
    assert.strictEqual((successExitCodes).length, 0);

    // Failure path: non-existent file
    const missingFile = path.join(dir, 'missing.md');
    const failExitCodes: number[] = [];
    await expect(
      stampHandler(
        missingFile,
        {},
        {
          cwd: dir,
          now: () => FIXED_NOW_1,
          stdout: () => {},
          exit: (code) => { failExitCodes.push(code); throw new Error(`exit(${code})`); },
        },
      ),
    ).rejects.toThrow('exit(1)');
    assert.deepStrictEqual(failExitCodes, [1]);
  });
});
