import { describe, test, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';

/**
 * Unit tests for mcp-client — STORY-006-02
 *
 * Tests: happy path · 401 retry once · 401 twice → AuthError · 403 → ForbiddenError
 *        · network error → NetworkError · proactive refresh fires 2 min before expiry
 */
import {
  exchange,
  get,
  signOut,
  _setBaseUrl,
  _setFetch,
  _resetState,
} from '../../src/lib/mcp-client.js';
import { AuthError, ForbiddenError, NetworkError } from '../../src/lib/errors.js';
import { z } from 'zod';

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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        async toThrow(msg?: string | RegExp | (new (...a: any[]) => Error)) {
          if (!msg) await assert.rejects(p);
          else if (typeof msg === 'function') await assert.rejects(p, msg);
          else if (typeof msg === 'string') await assert.rejects(p, new RegExp(esc(msg)));
          else await assert.rejects(p, msg);
        },
        async toMatchObject(expected: Record<string, unknown>) {
          let err: unknown;
          try { await p; } catch(e) { err = e; }
          assert.ok(err instanceof Error, `Expected promise to reject with an error. Got: ${String(err)}`);
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const errRecord = err as unknown as Record<string, any>;
          for (const [k, v] of Object.entries(expected)) {
            assert.deepStrictEqual(errRecord[k], v,
              `Expected error.${k} === ${JSON.stringify(v)}, got ${JSON.stringify(errRecord[k])}`);
          }
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


function makeFetchResponse(status: number, body?: unknown): Response {
  return {
    status,
    ok: status >= 200 && status < 300,
    json: async () => body,
  } as unknown as Response;
}

/** Creates a mock.fn() that returns responses from a queue sequentially. */
function seqFn(...responses: Promise<Response>[]): ReturnType<typeof mock.fn> {
  const queue = [...responses];
  const fn = mock.fn(() => {
    const next = queue.shift();
    if (next !== undefined) return next;
    return Promise.resolve(makeFetchResponse(500, { error: 'seqFn: out of responses' }));
  });
  return fn;
}

describe('mcp-client', () => {
  beforeEach(() => {
    _resetState();
    _setBaseUrl('http://mcp.test');
  });

  // -------------------------------------------------------------------------
  // exchange()
  // -------------------------------------------------------------------------
  describe('exchange()', () => {
    test('happy path: returns { admin_token, expires_at } and caches token', async () => {
      const mockFetch = mock.fn(() => Promise.resolve(
        makeFetchResponse(200, {
          admin_token: 'tok-abc',
          expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
        }),
      ));
      _setFetch(mockFetch as unknown as typeof fetch);

      const result = await exchange();
      assert.strictEqual(result.admin_token, 'tok-abc');
      assert.notStrictEqual(result.expires_at, undefined);
      expect(mockFetch).toHaveBeenCalledOnce();

      // Verify the call was to the right endpoint with credentials: 'include'
      const [url, init] = (mockFetch.mock.calls[0]?.arguments as unknown) as [string, RequestInit];
      assert.strictEqual(url, 'http://mcp.test/admin-api/v1/auth/exchange');
      expect((init as RequestInit).method).toBe('POST');
      expect((init as RequestInit).credentials).toBe('include');
    });

    test('401 → throws AuthError with code "session_expired"', async () => {
      _setFetch(mock.fn(() => Promise.resolve(makeFetchResponse(401))) as unknown as typeof fetch);

      await expect(exchange()).rejects.toThrow(AuthError);
      await expect(exchange()).rejects.toMatchObject({ code: 'session_expired' });
    });

    test('403 → throws ForbiddenError with code "not_authorized"', async () => {
      _setFetch(mock.fn(() => Promise.resolve(makeFetchResponse(403))) as unknown as typeof fetch);

      await expect(exchange()).rejects.toThrow(ForbiddenError);
      await expect(exchange()).rejects.toMatchObject({ code: 'not_authorized' });
    });

    test('5xx → throws NetworkError', async () => {
      _setFetch(mock.fn(() => Promise.resolve(makeFetchResponse(500))) as unknown as typeof fetch);

      await expect(exchange()).rejects.toThrow(NetworkError);
      await expect(exchange()).rejects.toMatchObject({ status: 500 });
    });
  });

  // -------------------------------------------------------------------------
  // get()
  // -------------------------------------------------------------------------
  describe('get()', () => {
    const schema = z.object({ id: z.string() });
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    test('happy path: exchanges then GETs, returns parsed body', async () => {
      const mockFetch = seqFn(
        // First call: exchange
        Promise.resolve(makeFetchResponse(200, { admin_token: 'tok-get', expires_at: expiresAt })),
        // Second call: actual GET
        Promise.resolve(makeFetchResponse(200, { id: 'proj-1' })),
      );
      _setFetch(mockFetch as unknown as typeof fetch);

      const result = await get('/projects/proj-1', schema);
      assert.deepStrictEqual(result, { id: 'proj-1' });
      assert.strictEqual(mockFetch.mock.calls.length, 2);
    });

    test('401 on first GET → re-exchanges → retries and succeeds', async () => {
      const mockFetch = seqFn(
        // 1. Initial exchange (no cached token)
        Promise.resolve(makeFetchResponse(200, { admin_token: 'tok-old', expires_at: expiresAt })),
        // 2. GET → 401 (token expired server-side)
        Promise.resolve(makeFetchResponse(401)),
        // 3. Re-exchange
        Promise.resolve(makeFetchResponse(200, { admin_token: 'tok-new', expires_at: expiresAt })),
        // 4. Retry GET → 200
        Promise.resolve(makeFetchResponse(200, { id: 'proj-2' })),
      );
      _setFetch(mockFetch as unknown as typeof fetch);

      const result = await get('/projects/proj-2', schema);
      assert.deepStrictEqual(result, { id: 'proj-2' });
      assert.strictEqual(mockFetch.mock.calls.length, 4);
    });

    test('401 twice → throws AuthError (only one retry)', async () => {
      const mockFetch = seqFn(
        // 1. Initial exchange
        Promise.resolve(makeFetchResponse(200, { admin_token: 'tok-expired', expires_at: expiresAt })),
        // 2. GET → 401
        Promise.resolve(makeFetchResponse(401)),
        // 3. Re-exchange
        Promise.resolve(makeFetchResponse(200, { admin_token: 'tok-also-expired', expires_at: expiresAt })),
        // 4. Retry GET → 401 again
        Promise.resolve(makeFetchResponse(401)),
      );
      _setFetch(mockFetch as unknown as typeof fetch);

      await expect(get('/projects/proj-3', schema)).rejects.toThrow(AuthError);
      assert.strictEqual(mockFetch.mock.calls.length, 4);
    });

    test('403 on GET → throws ForbiddenError (no retry)', async () => {
      const mockFetch = seqFn(
        Promise.resolve(makeFetchResponse(200, { admin_token: 'tok-ok', expires_at: expiresAt })),
        Promise.resolve(makeFetchResponse(403)),
      );
      _setFetch(mockFetch as unknown as typeof fetch);

      await expect(get('/projects', schema)).rejects.toThrow(ForbiddenError);
      // Only 2 calls: exchange + GET (no retry on 403)
      assert.strictEqual(mockFetch.mock.calls.length, 2);
    });

    test('network error (non-401/403) → throws NetworkError', async () => {
      const mockFetch = seqFn(
        Promise.resolve(makeFetchResponse(200, { admin_token: 'tok-ok', expires_at: expiresAt })),
        Promise.resolve(makeFetchResponse(503)),
      );
      _setFetch(mockFetch as unknown as typeof fetch);

      await expect(get('/projects', schema)).rejects.toThrow(NetworkError);
    });
  });

  // -------------------------------------------------------------------------
  // signOut()
  // -------------------------------------------------------------------------
  describe('signOut()', () => {
    test('clears cached token and cancels refresh timer', async () => {
      mock.timers.enable({ apis: ['setTimeout'] });
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
      const mockFetch = mock.fn(() => Promise.resolve(
        makeFetchResponse(200, { admin_token: 'tok-to-clear', expires_at: expiresAt })),
      );
      _setFetch(mockFetch as unknown as typeof fetch);

      await exchange();
      signOut();

      // After signOut, next exchange should call fetch again (token was cleared)
      const mockFetch2 = mock.fn(() => Promise.resolve(
        makeFetchResponse(200, { admin_token: 'tok-fresh', expires_at: expiresAt })),
      );
      _setFetch(mockFetch2 as unknown as typeof fetch);

      // Trigger a get() — should call exchange first (since state was cleared)
      const schema = z.object({ id: z.string() });
      const mockFetch3 = seqFn(
        Promise.resolve(makeFetchResponse(200, { admin_token: 'tok-fresh', expires_at: expiresAt })),
        Promise.resolve(makeFetchResponse(200, { id: 'ok' })),
      );
      _setFetch(mockFetch3 as unknown as typeof fetch);
      await get('/test', schema);
      // exchange was called again (2 total fetch calls: exchange + GET)
      assert.strictEqual(mockFetch3.mock.calls.length, 2);
      mock.timers.reset();
    });
  });

  // -------------------------------------------------------------------------
  // Proactive refresh timer
  // -------------------------------------------------------------------------
  describe('proactive refresh', () => {
    test('fires 2 minutes before expiry', async () => {
      mock.timers.enable({ apis: ['setTimeout'] });

      const expiryMs = 15 * 60 * 1000; // 15 min from now
      const expiresAt = new Date(Date.now() + expiryMs).toISOString();

      let exchangeCallCount = 0;
      const mockFetch = mock.fn(async () => {
        exchangeCallCount++;
        return makeFetchResponse(200, {
          admin_token: `tok-${exchangeCallCount}`,
          expires_at: new Date(Date.now() + expiryMs).toISOString(),
        });
      });
      _setFetch(mockFetch as unknown as typeof fetch);

      // First exchange — sets up the proactive refresh timer
      await exchange();
      assert.strictEqual(exchangeCallCount, 1);

      // Advance time to just before 2 min before expiry (should NOT fire)
      mock.timers.tick(expiryMs - 2 * 60 * 1000 - 100);
      await Promise.resolve(); // flush microtasks
      assert.strictEqual(exchangeCallCount, 1);

      // Advance past the 2-min threshold (should fire proactive refresh)
      mock.timers.tick(200);
      await Promise.resolve(); // flush microtasks
      assert.strictEqual(exchangeCallCount, 2);

      mock.timers.reset();
    });
  });
});
