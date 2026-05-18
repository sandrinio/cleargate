import { describe, test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

/**
 * acquire.test.ts — STORY-011-01
 *
 * Unit tests for acquireAccessToken: env-first, keychain-fallback, cache-hit,
 * cache-expiry, revoked/expired error paths, cache key per profile (R1).
 */


import { acquireAccessToken, AcquireError, __resetAcquireCache } from '../../src/auth/acquire.js';
import type { TokenStore } from '../../src/auth/token-store.js';

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


// ── Helpers ───────────────────────────────────────────────────────────────────

class FakeTokenStore implements TokenStore {
  readonly backend = 'file' as const;
  private readonly data = new Map<string, string>();
  public saveCalls = 0;

  seed(profile: string, token: string): void {
    this.data.set(profile, token);
  }

  async save(profile: string, token: string): Promise<void> {
    this.saveCalls++;
    this.data.set(profile, token);
  }

  async load(profile: string): Promise<string | null> {
    return this.data.get(profile) ?? null;
  }

  async remove(profile: string): Promise<void> {
    this.data.delete(profile);
  }
}

/**
 * Build a JWT with the given payload for test purposes.
 * Signature is fake — the CLI never verifies locally.
 */
function makeFakeJwt(payload: Record<string, unknown>): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${header}.${body}.fakesig`;
}

function makeStore(profile: string, refreshToken: string): FakeTokenStore {
  const store = new FakeTokenStore();
  store.seed(profile, refreshToken);
  return store;
}

type FetchSpy = {
  fn: typeof globalThis.fetch;
  calls: number;
};

/**
 * Create a fetch spy that returns a successful /auth/refresh response.
 * accessJwt should be a real JWT with an `exp` claim for cache tests.
 */
function makeSuccessFetch(accessJwt: string, newRefreshToken = 'rt_new'): FetchSpy {
  let calls = 0;
  const fn = async (_url: RequestInfo | URL, _init?: RequestInit): Promise<Response> => {
    calls++;
    return new Response(
      JSON.stringify({ access_token: accessJwt, refresh_token: newRefreshToken }),
      { status: 200, headers: { 'content-type': 'application/json' } },
    );
  };
  return { fn: fn as typeof globalThis.fetch, get calls() { return calls; } };
}

function make401Fetch(error: string): typeof globalThis.fetch {
  return async (_url: RequestInfo | URL, _init?: RequestInit): Promise<Response> => {
    return new Response(
      JSON.stringify({ error }),
      { status: 401, headers: { 'content-type': 'application/json' } },
    );
  };
}

function makeNetworkErrorFetch(): typeof globalThis.fetch {
  return async (): Promise<Response> => {
    throw new Error('ECONNREFUSED');
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

beforeEach(() => {
  __resetAcquireCache();
  // Disable on-disk access-token cache for tests — exercise the in-memory
  // cache + fetch-spy semantics without touching the real ~/.cleargate dir.
  process.env['CLEARGATE_DISK_CACHE_PATH'] = 'off';
});

describe('acquireAccessToken', () => {

  // Gherkin: sync prefers env over keychain
  test('Scenario: env short-circuit — returns env token without calling fetch', async () => {
    const spy = makeSuccessFetch(makeFakeJwt({ sub: 'u1', exp: 9999999999 }));
    const result = await acquireAccessToken({
      mcpUrl: 'https://mcp.example.com',
      profile: 'default',
      env: { CLEARGATE_MCP_TOKEN: 'eyJenv.token.here' },
      fetch: spy.fn,
      createStore: async () => new FakeTokenStore(),
    });
    assert.strictEqual(result, 'eyJenv.token.here');
    assert.strictEqual(spy.calls, 0);
  });

  // Gherkin: sync uses keychain when env is empty
  test('Scenario: keychain fallback — calls fetch when env is empty', async () => {
    const nowSec = Math.floor(Date.now() / 1000);
    const accessJwt = makeFakeJwt({ sub: 'u1', exp: nowSec + 3600 });
    const spy = makeSuccessFetch(accessJwt);
    const store = makeStore('default', 'rt_stored');

    const result = await acquireAccessToken({
      mcpUrl: 'https://mcp.example.com',
      profile: 'default',
      env: {},
      fetch: spy.fn,
      createStore: async () => store,
    });

    assert.strictEqual(result, accessJwt);
    assert.strictEqual(spy.calls, 1);
    // Refresh token should have been rotated
    assert.strictEqual(store.saveCalls, 1);
  });

  // Gherkin: sync with no credentials errors clearly
  test('Scenario: no stored credentials — throws AcquireError with correct message', async () => {
    const store = new FakeTokenStore(); // empty store
    await expect(
      acquireAccessToken({
        mcpUrl: 'https://mcp.example.com',
        profile: 'default',
        env: {},
        fetch: async () => new Response('', { status: 200 }),
        createStore: async () => store,
      }),
    ).rejects.toThrow(AcquireError);

    await expect(
      acquireAccessToken({
        mcpUrl: 'https://mcp.example.com',
        profile: 'default',
        env: {},
        fetch: async () => new Response('', { status: 200 }),
        createStore: async () => store,
      }),
    ).rejects.toMatchObject({
      code: 'no_stored_token',
      message: expect.stringContaining('Run `cleargate join <invite-url>` first, or export CLEARGATE_MCP_TOKEN'),
    });
  });

  // Gherkin: Revoked refresh token surfaces cleanly
  test('Scenario: revoked refresh token — throws AcquireError with token_revoked code', async () => {
    const store = makeStore('default', 'rt_revoked');
    await expect(
      acquireAccessToken({
        mcpUrl: 'https://mcp.example.com',
        profile: 'default',
        env: {},
        fetch: make401Fetch('token_revoked'),
        createStore: async () => store,
      }),
    ).rejects.toMatchObject({
      code: 'token_revoked',
      message: expect.stringContaining('refresh token was revoked'),
    });
  });

  test('invalid_token (401 without token_revoked) — throws AcquireError with invalid_token code', async () => {
    const store = makeStore('default', 'rt_invalid');
    await expect(
      acquireAccessToken({
        mcpUrl: 'https://mcp.example.com',
        profile: 'default',
        env: {},
        fetch: make401Fetch('expired'),
        createStore: async () => store,
      }),
    ).rejects.toMatchObject({ code: 'invalid_token' });
  });

  test('transport error — throws AcquireError with transport code', async () => {
    const store = makeStore('default', 'rt_x');
    await expect(
      acquireAccessToken({
        mcpUrl: 'https://mcp.example.com',
        profile: 'default',
        env: {},
        fetch: makeNetworkErrorFetch(),
        createStore: async () => store,
      }),
    ).rejects.toMatchObject({ code: 'transport' });
  });

  // Gherkin: Multiple MCP calls share one refresh — cache hit
  test('Scenario: cache hit — second call does not call fetch again', async () => {
    const nowSec = Math.floor(Date.now() / 1000);
    const accessJwt = makeFakeJwt({ sub: 'u1', exp: nowSec + 3600 });
    const spy = makeSuccessFetch(accessJwt);
    const store = makeStore('default', 'rt_stored');

    const first = await acquireAccessToken({
      mcpUrl: 'https://mcp.example.com',
      profile: 'default',
      env: {},
      fetch: spy.fn,
      createStore: async () => store,
    });
    const second = await acquireAccessToken({
      mcpUrl: 'https://mcp.example.com',
      profile: 'default',
      env: {},
      fetch: spy.fn,
      createStore: async () => store,
    });

    assert.strictEqual(first, accessJwt);
    assert.strictEqual(second, accessJwt);
    assert.strictEqual(spy.calls, 1); // only one fetch call — second hit the cache
  });

  // Cache key per profile (R1 mitigation)
  test('Scenario R1: different profiles get separate cache entries — two fetch calls', async () => {
    const nowSec = Math.floor(Date.now() / 1000);
    const jwtA = makeFakeJwt({ sub: 'userA', exp: nowSec + 3600 });
    const jwtB = makeFakeJwt({ sub: 'userB', exp: nowSec + 3600 });

    let fetchCalls = 0;
    const profileFetch: typeof globalThis.fetch = async (_url, init) => {
      fetchCalls++;
      const body = init?.body ? JSON.parse(init.body as string) as { refresh_token: string } : { refresh_token: '' };
      // Return different JWT based on which refresh token was used
      const jwt = body.refresh_token === 'rt_profile_a' ? jwtA : jwtB;
      return new Response(
        JSON.stringify({ access_token: jwt, refresh_token: 'rt_new' }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      );
    };

    const storeA = makeStore('profileA', 'rt_profile_a');
    const storeB = makeStore('profileB', 'rt_profile_b');

    const resultA = await acquireAccessToken({
      mcpUrl: 'https://mcp.example.com',
      profile: 'profileA',
      env: {},
      fetch: profileFetch,
      createStore: async () => storeA,
    });
    const resultB = await acquireAccessToken({
      mcpUrl: 'https://mcp.example.com',
      profile: 'profileB',
      env: {},
      fetch: profileFetch,
      createStore: async () => storeB,
    });

    assert.strictEqual(resultA, jwtA);
    assert.strictEqual(resultB, jwtB);
    assert.strictEqual(fetchCalls, 2); // each profile triggers its own fetch
  });

  // Cache expiry 60s before exp
  test('Scenario: cache expires 60s before token exp — re-fetches after window passes', async () => {
    // Token exp is 90 seconds from "now"
    // Initial "now" = 0ms; expiresAtMs = (90 - 60) * 1000 = 30_000ms
    // Second call at now=25_000 → still valid → cache hit
    // Third call at now=31_000 → expired → re-fetch

    const nowSec = 1_000_000; // arbitrary base
    const exp = nowSec + 90;
    const accessJwt = makeFakeJwt({ sub: 'u1', exp });

    let fetchCalls = 0;
    const spy: typeof globalThis.fetch = async () => {
      fetchCalls++;
      return new Response(
        JSON.stringify({ access_token: accessJwt, refresh_token: 'rt_new' }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      );
    };
    const store = makeStore('default', 'rt_stored');

    const baseMs = nowSec * 1000;

    // First call — populates cache (expiresAtMs = (nowSec + 90 - 60) * 1000 = baseMs + 30_000)
    await acquireAccessToken({
      mcpUrl: 'https://mcp.example.com',
      profile: 'default',
      env: {},
      fetch: spy,
      createStore: async () => store,
      now: () => baseMs,
    });
    assert.strictEqual(fetchCalls, 1);

    // Second call — 25s later — still within cache window
    const result2 = await acquireAccessToken({
      mcpUrl: 'https://mcp.example.com',
      profile: 'default',
      env: {},
      fetch: spy,
      createStore: async () => store,
      now: () => baseMs + 25_000,
    });
    assert.strictEqual(result2, accessJwt);
    assert.strictEqual(fetchCalls, 1); // no re-fetch

    // Third call — 31s later — cache has expired (> 30s buffer)
    await acquireAccessToken({
      mcpUrl: 'https://mcp.example.com',
      profile: 'default',
      env: {},
      fetch: spy,
      createStore: async () => store,
      now: () => baseMs + 31_000,
    });
    assert.strictEqual(fetchCalls, 2); // re-fetched
  });

  test('no exp in JWT payload — does not cache; always re-fetches', async () => {
    const noExpJwt = makeFakeJwt({ sub: 'u1' }); // no exp
    let fetchCalls = 0;
    const spy: typeof globalThis.fetch = async () => {
      fetchCalls++;
      return new Response(
        JSON.stringify({ access_token: noExpJwt, refresh_token: 'rt_new' }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      );
    };
    const store1 = makeStore('default', 'rt_stored');
    const store2 = makeStore('default', 'rt_new');

    await acquireAccessToken({
      mcpUrl: 'https://mcp.example.com', profile: 'default',
      env: {}, fetch: spy, createStore: async () => store1,
    });
    await acquireAccessToken({
      mcpUrl: 'https://mcp.example.com', profile: 'default',
      env: {}, fetch: spy, createStore: async () => store2,
    });

    assert.strictEqual(fetchCalls, 2); // not cached
  });

  // Gherkin: conflicts --refresh re-exchanges (forceRefresh bypass)
  test('Scenario: forceRefresh bypasses valid cache entry', async () => {
    const nowSec = Math.floor(Date.now() / 1000);
    const accessJwt = makeFakeJwt({ sub: 'u1', exp: nowSec + 3600 });
    let fetchCalls = 0;
    const spy: typeof globalThis.fetch = async () => {
      fetchCalls++;
      return new Response(
        JSON.stringify({ access_token: accessJwt, refresh_token: 'rt_new' }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      );
    };
    const store = makeStore('default', 'rt_stored');

    // First call — populates cache
    await acquireAccessToken({
      mcpUrl: 'https://mcp.example.com', profile: 'default',
      env: {}, fetch: spy, createStore: async () => store,
    });
    assert.strictEqual(fetchCalls, 1);

    // Second call with forceRefresh — bypasses cache even though it's valid
    const store2 = makeStore('default', 'rt_new');
    await acquireAccessToken({
      mcpUrl: 'https://mcp.example.com', profile: 'default',
      env: {}, fetch: spy, createStore: async () => store2,
      forceRefresh: true,
    });
    assert.strictEqual(fetchCalls, 2);
  });
});
