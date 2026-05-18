import { describe, test, afterEach } from 'node:test';
import assert from 'node:assert/strict';

import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { loadAdminAuth } from '../../src/admin-api/admin-auth.js';

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
  return mkdtempSync(path.join(os.tmpdir(), 'cleargate-admin-auth-'));
}

function writeAuthFile(dir: string, content: unknown, mode = 0o600): string {
  const filePath = path.join(dir, 'admin-auth.json');
  writeFileSync(filePath, JSON.stringify(content), { mode });
  return filePath;
}

describe('loadAdminAuth', () => {
  // A-1: env present → returns env token, file not read
  test('A-1: env present returns token from env and does not read file', () => {
    const tmpDir = makeTmpDir();
    // Pass a filePath that doesn't exist — would throw ENOENT if file read was attempted
    const nonExistentPath = path.join(tmpDir, 'nonexistent.json');

    const result = loadAdminAuth({
      env: { CLEARGATE_ADMIN_TOKEN: 'env-token-abc' },
      filePath: nonExistentPath,
    });

    assert.deepStrictEqual(result, { token: 'env-token-abc', source: 'env' });
  });

  // A-2: env absent, file present (valid) → returns file token
  test('A-2: env absent, valid file returns token from file', () => {
    const tmpDir = makeTmpDir();
    const filePath = writeAuthFile(tmpDir, { version: 1, token: 'file-token-xyz' });

    const result = loadAdminAuth({
      env: {},
      filePath,
    });

    assert.deepStrictEqual(result, { token: 'file-token-xyz', source: 'file' });
  });

  // A-3: env absent, file absent → throws with exact message
  test('A-3: env absent, file absent throws literal error message', () => {
    const tmpDir = makeTmpDir();
    const nonExistentPath = path.join(tmpDir, 'nonexistent.json');

    expect(() =>
      loadAdminAuth({ env: {}, filePath: nonExistentPath }),
    ).toThrow(
      'No admin token. Set CLEARGATE_ADMIN_TOKEN or write ~/.cleargate/admin-auth.json (chmod 600). See README §admin-jwt.',
    );
  });

  // A-4: file malformed JSON → throws with file path in message
  test('A-4: malformed JSON in file throws error with file path', () => {
    const tmpDir = makeTmpDir();
    const filePath = path.join(tmpDir, 'admin-auth.json');
    writeFileSync(filePath, 'not valid json', { mode: 0o600 });

    expect(() =>
      loadAdminAuth({ env: {}, filePath }),
    ).toThrow(filePath);
  });

  // A-5: file zod-strict violation → throws
  test('A-5: file with extra unknown key fails strict validation and throws', () => {
    const tmpDir = makeTmpDir();
    const filePath = writeAuthFile(tmpDir, { version: 1, token: 'valid', extra: 1 });

    expect(() =>
      loadAdminAuth({ env: {}, filePath }),
    ).toThrow();
  });

  // Chmod warn: file too permissive → warn called
  test('chmod warn: world-readable file triggers warn callback', () => {
    const tmpDir = makeTmpDir();
    const filePath = writeAuthFile(tmpDir, { version: 1, token: 'tok' }, 0o644);
    const warn = (msg: string) => { warnMessages.push(msg); };
    const warnMessages: string[] = [];

    loadAdminAuth({ env: {}, filePath, warn });

    assert.ok(warnMessages.length > 0);
    assert.ok(String(warnMessages[0]).includes('group/world readable'));
  });
});
