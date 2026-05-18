import { describe, test, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';

/**
 * Unit tests for auth flow session shape — STORY-006-02
 *
 * Validates that the session JSON written to Redis matches the M1 contract:
 * { github_handle: string, github_user_id: string, expires_at: ISO-8601 }
 *
 * STORY-028-07: ioredis redirected to src/lib/__mocks__/ioredis.ts via loader hooks.
 */
import { __ioredisState__ } from '../../src/lib/__mocks__/ioredis.ts';
// Use the shared ioredis store
const store = __ioredisState__.store;

process.env['REDIS_URL'] = 'redis://localhost:6379';

import { createRedisAdapter, _resetRedisClient } from '../../src/lib/auth/redis-adapter.js';

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


describe('auth flow session shape matches M1 contract', () => {
  beforeEach(() => {
    Object.keys(store).forEach((k) => delete store[k]);
    _resetRedisClient();
  });

  test('createSession writes github_handle + github_user_id + expires_at to Redis', async () => {
    const adapter = createRedisAdapter();

    // Simulate what @auth/sveltekit does after GitHub OAuth:
    // 1. createUser is called with the extended profile
    const user = {
      id: 'user-octocat',
      email: 'octocat@example.com',
      emailVerified: null,
      name: 'The Octocat',
      image: 'https://github.com/images/error/octocat_happy.gif',
      github_handle: 'octocat',
      github_user_id: '1',
      avatar_url: 'https://github.com/images/error/octocat_happy.gif',
    };

    await adapter.createUser!(user as import('@auth/core/adapters').AdapterUser);

    // 2. createSession is called by @auth/sveltekit with the session token
    const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await adapter.createSession!({
      sessionToken: 'session-token-octocat',
      userId: 'user-octocat',
      expires,
    });

    // 3. Assert the raw Redis entry matches M1 contract
    const rawEntry = store['cg_session:session-token-octocat'];
    assert.notStrictEqual(rawEntry, undefined);

    const sessionData = JSON.parse(rawEntry.value);

    // M1 contract fields (required by mcp/src/admin-api/auth-exchange.ts)
    assert.strictEqual(sessionData.github_handle, 'octocat');
    assert.strictEqual(sessionData.github_user_id, '1');
    assert.notStrictEqual(sessionData.expires_at, undefined);
    expect(() => new Date(sessionData.expires_at)).not.toThrow();

    // expires_at should be an ISO-8601 string
    assert.match(String(sessionData.expires_at), /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  });

  test('session key prefix is cg_session: (never rev:, rl:, idem:)', async () => {
    const adapter = createRedisAdapter();

    await adapter.createUser!({
      id: 'user-prefixcheck',
      email: 'prefix@example.com',
      emailVerified: null,
      name: 'prefixcheck',
      github_handle: 'prefixcheck',
      github_user_id: '2',
    } as import('@auth/core/adapters').AdapterUser);

    await adapter.createSession!({
      sessionToken: 'tok-prefix',
      userId: 'user-prefixcheck',
      expires: new Date(Date.now() + 86400000),
    });

    const sessionKeys = Object.keys(store).filter((k) => !k.startsWith('cg_user:'));
    assert.ok(sessionKeys.length > 0);
    expect(sessionKeys.every((k) => k.startsWith('cg_session:'))).toBe(true);
    expect(sessionKeys.some((k) => k.startsWith('rev:'))).toBe(false);
    expect(sessionKeys.some((k) => k.startsWith('rl:'))).toBe(false);
    expect(sessionKeys.some((k) => k.startsWith('idem:'))).toBe(false);
  });

  test('deleteSession removes exactly the cg_session:* key', async () => {
    const adapter = createRedisAdapter();

    await adapter.createUser!({
      id: 'user-del',
      email: 'del@example.com',
      emailVerified: null,
      name: 'del-user',
      github_handle: 'del-user',
      github_user_id: '3',
    } as import('@auth/core/adapters').AdapterUser);

    await adapter.createSession!({
      sessionToken: 'tok-del',
      userId: 'user-del',
      expires: new Date(Date.now() + 86400000),
    });

    assert.notStrictEqual(store['cg_session:tok-del'], undefined);
    await adapter.deleteSession!('tok-del');
    assert.strictEqual(store['cg_session:tok-del'], undefined);
  });
});
