import { describe, test } from 'node:test';
import assert from 'node:assert/strict';

/**
 * Required-env preflight unit tests — STORY-006-10
 *
 * Tests that checkEnv() throws EnvError for each missing required variable
 * and does NOT throw when all vars are present.
 */
import { checkEnv, EnvError } from '../../src/lib/server/env.js';

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
      const calls = (actual as { mock: { calls: { arguments: unknown[] }[] } }).mock.calls;
      assert.deepStrictEqual(calls[calls.length - 1]?.arguments, expectedArgs);
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
        async toThrow(msg?: string) {
          if (!msg) await assert.rejects(p);
          else await assert.rejects(p, new RegExp(esc(msg)));
        },
        async toSatisfy(predicate: (val: unknown) => boolean) {
          let err: unknown;
          try { await p; } catch(e) { err = e; }
          assert.ok(predicate(err), `Rejected value did not satisfy predicate. Got: ${String(err)}`);
        },
      };
    },
  };
}


const ALL_REQUIRED = {
  CLEARGATE_GITHUB_WEB_CLIENT_ID: 'test-client-id',
  CLEARGATE_GITHUB_WEB_CLIENT_SECRET: 'test-client-secret',
  AUTH_SECRET: 'a-very-long-auth-secret-string-32-bytes',
  REDIS_URL: 'redis://localhost:6379',
  PUBLIC_MCP_URL: 'http://localhost:3001',
  NODE_ENV: 'test',
};

describe('checkEnv (STORY-006-10)', () => {
  test('passes when all required vars are present', () => {
    expect(() => checkEnv(ALL_REQUIRED)).not.toThrow();
  });

  test('Scenario: Env-var preflight — throws EnvError if CLEARGATE_GITHUB_WEB_CLIENT_ID is missing', () => {
    const env = { ...ALL_REQUIRED };
    delete (env as Partial<typeof env>)['CLEARGATE_GITHUB_WEB_CLIENT_ID'];
    expect(() => checkEnv(env)).toThrow(EnvError);
    expect(() => checkEnv(env)).toThrow('missing required env: CLEARGATE_GITHUB_WEB_CLIENT_ID');
  });

  test('throws EnvError if CLEARGATE_GITHUB_WEB_CLIENT_SECRET is missing', () => {
    const env = { ...ALL_REQUIRED };
    delete (env as Partial<typeof env>)['CLEARGATE_GITHUB_WEB_CLIENT_SECRET'];
    expect(() => checkEnv(env)).toThrow(EnvError);
    expect(() => checkEnv(env)).toThrow('missing required env: CLEARGATE_GITHUB_WEB_CLIENT_SECRET');
  });

  test('throws EnvError if AUTH_SECRET is missing', () => {
    const env = { ...ALL_REQUIRED };
    delete (env as Partial<typeof env>)['AUTH_SECRET'];
    expect(() => checkEnv(env)).toThrow(EnvError);
    expect(() => checkEnv(env)).toThrow('missing required env: AUTH_SECRET');
  });

  test('throws EnvError if REDIS_URL is missing', () => {
    const env = { ...ALL_REQUIRED };
    delete (env as Partial<typeof env>)['REDIS_URL'];
    expect(() => checkEnv(env)).toThrow(EnvError);
    expect(() => checkEnv(env)).toThrow('missing required env: REDIS_URL');
  });

  test('throws EnvError if PUBLIC_MCP_URL is missing', () => {
    const env = { ...ALL_REQUIRED };
    delete (env as Partial<typeof env>)['PUBLIC_MCP_URL'];
    expect(() => checkEnv(env)).toThrow(EnvError);
    expect(() => checkEnv(env)).toThrow('missing required env: PUBLIC_MCP_URL');
  });

  test('throws if CLEARGATE_DISABLE_AUTH=1 is set in production', () => {
    const env = { ...ALL_REQUIRED, NODE_ENV: 'production', CLEARGATE_DISABLE_AUTH: '1' };
    expect(() => checkEnv(env)).toThrow(EnvError);
    expect(() => checkEnv(env)).toThrow('CLEARGATE_DISABLE_AUTH=1 is forbidden in NODE_ENV=production');
  });

  test('allows CLEARGATE_DISABLE_AUTH=1 in non-production environments', () => {
    const env = { ...ALL_REQUIRED, NODE_ENV: 'development', CLEARGATE_DISABLE_AUTH: '1' };
    expect(() => checkEnv(env)).not.toThrow();
  });

  test('error message includes "missing required env:" prefix for container log detection', () => {
    const env = { ...ALL_REQUIRED };
    delete (env as Partial<typeof env>)['AUTH_SECRET'];
    let caughtError: Error | null = null;
    try {
      checkEnv(env);
    } catch (err) {
      caughtError = err as Error;
    }
    assert.notStrictEqual(caughtError, null);
    assert.match(String(caughtError!.message), /^missing required env:/);
  });
});
