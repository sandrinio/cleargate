import { describe, test, mock } from 'node:test';
import assert from 'node:assert/strict';

/**
 * refresh.test.ts — BUG-019 unit coverage for token-refresh logic.
 */
import {
  refreshAccessToken,
  AuthFetcher,
  RefreshError,
} from '../../src/auth/refresh.js';

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


const BASE_URL = 'https://cleargate-mcp.soula.ge';

function mockFetch(impl: (req: Request) => Promise<Response>): typeof globalThis.fetch {
  return ((input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' || input instanceof URL ? String(input) : input.url;
    const req = new Request(url, init);
    return impl(req);
  }) as typeof globalThis.fetch;
}

describe('refreshAccessToken', () => {
  test('returns parsed body on 200', async () => {
    const fetchFn = mockFetch(async () =>
      new Response(
        JSON.stringify({
          token_type: 'Bearer',
          access_token: 'A',
          refresh_token: 'R',
          expires_in: 900,
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      ),
    );
    const out = await refreshAccessToken(BASE_URL, 'refresh-X', { fetch: fetchFn });
    assert.strictEqual(out.access_token, 'A');
    assert.strictEqual(out.refresh_token, 'R');
    assert.strictEqual(out.expires_in, 900);
  });

  test('throws RefreshError on 401 invalid_token', async () => {
    const fetchFn = mockFetch(async () =>
      new Response(JSON.stringify({ error: 'invalid_token' }), {
        status: 401,
        headers: { 'content-type': 'application/json' },
      }),
    );
    await expect(refreshAccessToken(BASE_URL, 'bad', { fetch: fetchFn })).rejects.toBeInstanceOf(
      RefreshError,
    );
  });

  test('throws on malformed body', async () => {
    const fetchFn = mockFetch(async () =>
      new Response(JSON.stringify({ token_type: 'Bearer' }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    );
    await expect(refreshAccessToken(BASE_URL, 'x', { fetch: fetchFn })).rejects.toBeInstanceOf(
      RefreshError,
    );
  });
});

describe('AuthFetcher', () => {
  test('caches access token and persists rotated refresh token on first call', async () => {
    let callCount = 0;
    const fetchFn = mockFetch(async () => {
      callCount++;
      return new Response(
        JSON.stringify({
          token_type: 'Bearer',
          access_token: `A${callCount}`,
          refresh_token: `R${callCount}`,
          expires_in: 900,
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      );
    });

    const saved: string[] = [];
    let stored = 'R0';
    const fetcher = new AuthFetcher({
      baseUrl: BASE_URL,
      fetch: fetchFn,
      now: () => 1_000_000,
      loadRefresh: async () => stored,
      saveRefresh: async (t) => {
        saved.push(t);
        stored = t;
      },
    });

    const a1 = await fetcher.getAccessToken();
    assert.strictEqual(a1, 'A1');
    assert.deepStrictEqual(saved, ['R1']);
    // Second call within validity window — cache hit, no extra fetch.
    const a2 = await fetcher.getAccessToken();
    assert.strictEqual(a2, 'A1');
    assert.strictEqual(callCount, 1);
  });

  test('refreshes when within skew window of expiry', async () => {
    let callCount = 0;
    const fetchFn = mockFetch(async () => {
      callCount++;
      return new Response(
        JSON.stringify({
          token_type: 'Bearer',
          access_token: `A${callCount}`,
          refresh_token: `R${callCount}`,
          expires_in: 100,
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      );
    });

    let stored = 'R0';
    let now = 1_000_000;
    const fetcher = new AuthFetcher({
      baseUrl: BASE_URL,
      fetch: fetchFn,
      now: () => now,
      loadRefresh: async () => stored,
      saveRefresh: async (t) => {
        stored = t;
      },
      skewSeconds: 30,
    });

    expect(await fetcher.getAccessToken()).toBe('A1');
    // Advance past skew but not past expiry — should refresh.
    now += 75_000;
    expect(await fetcher.getAccessToken()).toBe('A2');
    assert.strictEqual(callCount, 2);
  });

  test('invalidate() forces refresh on next call', async () => {
    let callCount = 0;
    const fetchFn = mockFetch(async () => {
      callCount++;
      return new Response(
        JSON.stringify({
          token_type: 'Bearer',
          access_token: `A${callCount}`,
          refresh_token: `R${callCount}`,
          expires_in: 900,
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      );
    });
    let stored = 'R0';
    const fetcher = new AuthFetcher({
      baseUrl: BASE_URL,
      fetch: fetchFn,
      now: () => 1_000_000,
      loadRefresh: async () => stored,
      saveRefresh: async (t) => {
        stored = t;
      },
    });
    await fetcher.getAccessToken();
    fetcher.invalidate();
    await fetcher.getAccessToken();
    assert.strictEqual(callCount, 2);
  });

  test('throws RefreshError when keychain has no refresh token', async () => {
    const fetcher = new AuthFetcher({
      baseUrl: BASE_URL,
      fetch: mock.fn() as never,
      now: () => 1_000_000,
      loadRefresh: async () => null,
      saveRefresh: async () => undefined,
    });
    await expect(fetcher.getAccessToken()).rejects.toBeInstanceOf(RefreshError);
  });

  test('coalesces concurrent getAccessToken calls into a single network request', async () => {
    let callCount = 0;
    const fetchFn = mockFetch(async () => {
      callCount++;
      // Slow response so two callers can race
      await new Promise((r) => setTimeout(r, 5));
      return new Response(
        JSON.stringify({
          token_type: 'Bearer',
          access_token: `A${callCount}`,
          refresh_token: `R${callCount}`,
          expires_in: 900,
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      );
    });
    let stored = 'R0';
    const fetcher = new AuthFetcher({
      baseUrl: BASE_URL,
      fetch: fetchFn,
      now: () => 1_000_000,
      loadRefresh: async () => stored,
      saveRefresh: async (t) => {
        stored = t;
      },
    });
    const [a, b] = await Promise.all([fetcher.getAccessToken(), fetcher.getAccessToken()]);
    assert.strictEqual(a, b);
    assert.strictEqual(callCount, 1);
  });
});
