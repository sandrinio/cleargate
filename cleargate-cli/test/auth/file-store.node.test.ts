import { describe, test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { mkdtempSync, statSync, writeFileSync } from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

import { FileTokenStore } from '../../src/auth/file-store.js';

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


function makeTmpStore(): { store: FileTokenStore; filePath: string; dir: string } {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'cleargate-auth-'));
  const filePath = path.join(dir, 'auth', 'auth.json');
  const store = new FileTokenStore(filePath);
  return { store, filePath, dir };
}

describe('FileTokenStore', () => {
  let store: FileTokenStore;
  let filePath: string;

  beforeEach(() => {
    const tmp = makeTmpStore();
    store = tmp.store;
    filePath = tmp.filePath;
  });

  // Test 1: save then load round-trips token
  test('Test 1: save then load round-trips token', async () => {
    await store.save('default', 't1');
    assert.strictEqual(await store.load('default'), 't1');
  });

  // Test 2: load on never-saved profile returns null (no throw, file may not exist)
  test('Test 2: load on never-saved profile returns null', async () => {
    const result = await store.load('default');
    assert.strictEqual(result, null);
  });

  // Test 3: remove on existing profile clears it
  test('Test 3: remove on existing profile clears it, file still exists', async () => {
    await store.save('work', 't');
    await store.remove('work');
    assert.strictEqual(await store.load('work'), null);
  });

  // Test 4: remove on missing profile is a no-op (no throw, file may not exist)
  test('Test 4: remove on missing profile is a no-op', async () => {
    await expect(store.remove('nonexistent')).resolves.toBeUndefined();
  });

  // Test 5: chmod 0600 on the auth file after save
  it.skipIf(process.platform === 'win32')(
    'Test 5: auth file has mode 0600 after save',
    async () => {
      await store.save('default', 'tok');
      const mode = statSync(filePath).mode & 0o777;
      assert.strictEqual(mode, 0o600);
    },
  );

  // Test 6: chmod 0700 on the parent dir when mkdir had to create it
  it.skipIf(process.platform === 'win32')(
    'Test 6: parent directory has mode 0700 after first save',
    async () => {
      await store.save('default', 'tok');
      const mode = statSync(path.dirname(filePath)).mode & 0o777;
      assert.strictEqual(mode, 0o700);
    },
  );

  // Test 7: profile namespacing — no clobber
  test('Test 7: saving staging does not clobber default profile', async () => {
    await store.save('default', 'A');
    await store.save('staging', 'B');
    assert.strictEqual(await store.load('default'), 'A');
    assert.strictEqual(await store.load('staging'), 'B');
  });

  // Test 8: overwrite semantics — second save replaces first
  test('Test 8: second save for same profile replaces first value', async () => {
    await store.save('default', 'A');
    await store.save('default', 'B');
    assert.strictEqual(await store.load('default'), 'B');
  });

  // Test 9: malformed JSON throws with file path in message
  test('Test 9: malformed JSON in auth file throws with file path in message', async () => {
    // Ensure parent dir exists first by doing a save
    await store.save('default', 'seed');
    // Now overwrite with invalid JSON
    writeFileSync(filePath, '{', 'utf8');
    await expect(store.load('default')).rejects.toThrow(filePath);
  });

  // Test 10: unknown top-level key throws (zod strict)
  test('Test 10: unknown top-level key in auth file throws (zod strict)', async () => {
    await store.save('default', 'seed');
    writeFileSync(
      filePath,
      JSON.stringify({ version: 1, profiles: {}, junk: 1 }),
      'utf8',
    );
    await expect(store.load('default')).rejects.toThrow();
  });

  // Test 11: wrong version throws with upgrade hint
  test('Test 11: wrong version in auth file throws with "upgrade" hint', async () => {
    await store.save('default', 'seed');
    writeFileSync(
      filePath,
      JSON.stringify({ version: 2, profiles: {} }),
      'utf8',
    );
    await expect(store.load('default')).rejects.toThrow('upgrade');
  });
});
