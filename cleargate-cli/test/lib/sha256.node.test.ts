import { describe, test, afterEach } from 'node:test';
import assert from 'node:assert/strict';

/**
 * sha256.test.ts — STORY-009-01
 *
 * Tests every Gherkin scenario for the sha256.ts library.
 */

import * as os from 'os';
import * as fs from 'fs';
import * as path from 'path';
import { hashNormalized, hashFile, shortHash } from '../../src/lib/sha256.js';

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
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cg-sha256-test-'));
  tmpDirs.push(dir);
  return dir;
}

afterEach(() => {
  for (const dir of tmpDirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

describe('hashNormalized', () => {
  test('CRLF collapses to LF before hashing', () => {
    // Gherkin: CRLF normalizes to LF before hashing
    const crlfHash = hashNormalized('foo\r\nbar\r\n');
    const lfHash = hashNormalized('foo\nbar\n');
    assert.strictEqual(crlfHash, lfHash);
    assert.strictEqual((crlfHash).length, 64);
  });

  test('leading BOM is stripped before hashing', () => {
    // Gherkin: Leading BOM stripped
    const bomHash = hashNormalized('\ufeffhello\n');
    const plainHash = hashNormalized('hello\n');
    assert.strictEqual(bomHash, plainHash);
  });

  test('trailing newline is enforced before hashing', () => {
    // Gherkin: Trailing newline enforced
    const withoutNewline = hashNormalized('hello');
    const withNewline = hashNormalized('hello\n');
    assert.strictEqual(withoutNewline, withNewline);
  });

  test('returns 64 hex characters', () => {
    const result = hashNormalized('test content\n');
    assert.match(String(result), /^[0-9a-f]{64}$/);
  });

  test('Buffer input is handled the same as string', () => {
    const str = 'hello\nworld\n';
    const buf = Buffer.from(str, 'utf-8');
    expect(hashNormalized(buf)).toBe(hashNormalized(str));
  });

  test('BOM + CRLF + no trailing newline — all three normalizations applied', () => {
    // Cross-platform fixture: Windows-authored file with BOM + CRLF + no trailing \n
    const windowsContent = '\ufeffhello\r\nworld';
    const normalized = hashNormalized('hello\nworld\n');
    expect(hashNormalized(windowsContent)).toBe(normalized);
  });
});

describe('hashFile', () => {
  test('roundtrips through fs — CRLF + BOM file hashes same as normalized string', async () => {
    // Gherkin: hashFile: roundtrips through fs
    const dir = makeTmpDir();
    const filePath = path.join(dir, 'test.txt');
    // Write a file with BOM + CRLF + no trailing newline (Windows-style)
    const windowsContent = '\ufeffhello\r\nworld';
    fs.writeFileSync(filePath, windowsContent, 'utf-8');

    const fileHash = await hashFile(filePath);
    const expectedHash = hashNormalized('hello\nworld\n');
    assert.strictEqual(fileHash, expectedHash);
  });
});

describe('shortHash', () => {
  test('returns the first 8 hex characters', () => {
    // Gherkin: shortHash: 8 hex chars
    const full = 'a1b2c3d4e5f6789012345678901234567890123456789012345678901234abcd';
    expect(shortHash(full)).toBe('a1b2c3d4');
    expect(shortHash(full)).toHaveLength(8);
  });

  test('works with a real SHA256 hash', () => {
    const full = hashNormalized('hello\n');
    const short = shortHash(full);
    assert.strictEqual((short).length, 8);
    assert.match(String(short), /^[0-9a-f]{8}$/);
    expect(full.startsWith(short)).toBe(true);
  });
});
