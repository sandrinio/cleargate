import { describe, test, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';

/**
 * mcp-client del() unit tests — STORY-006-05
 *
 * Tests:
 *   1. del() calls DELETE with Bearer auth header
 *   2. del() 401 → re-exchange + retry once
 *   3. del() handles 204 No Content (no schema parse needed)
 *   4. del() 401 twice → throws AuthError
 *   5. del() 403 → throws ForbiddenError (no retry)
 *   6. del() non-204 non-200 non-401 non-403 → throws NetworkError
 */
import {
  del,
  _setBaseUrl,
  _setFetch,
  _resetState,
} from '../../src/lib/mcp-client.js';
import { AuthError, ForbiddenError, NetworkError } from '../../src/lib/errors.js';

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
  return mock.fn(() => {
    const next = queue.shift();
    if (next !== undefined) return next;
    return Promise.resolve(makeFetchResponse(500, { error: 'seqFn: out of responses' }));
  });
}

const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

describe('mcp-client del()', () => {
  beforeEach(() => {
    _resetState();
    _setBaseUrl('http://mcp.test');
  });

  test('happy path: calls DELETE with Bearer header and handles 204', async () => {
    const mockFetch = seqFn(
      // 1. exchange (no cached token)
      Promise.resolve(makeFetchResponse(200, { admin_token: 'tok-del', expires_at: expiresAt })),
      // 2. DELETE → 204
      Promise.resolve(makeFetchResponse(204)),
    );
    _setFetch(mockFetch as unknown as typeof fetch);
    await del('/tokens/some-token-id');

    assert.strictEqual(mockFetch.mock.calls.length, 2);
    const [url, init] = mockFetch.mock.calls[1]?.arguments as [string, RequestInit];
    assert.strictEqual(url, 'http://mcp.test/admin-api/v1/tokens/some-token-id');
    assert.strictEqual(init.method, 'DELETE');
    expect((init.headers as Record<string, string>)['Authorization']).toBe('Bearer tok-del');
  });

  test('also handles 200 OK as success', async () => {
    const mockFetch = seqFn(
      Promise.resolve(makeFetchResponse(200, { admin_token: 'tok-ok', expires_at: expiresAt })),
      Promise.resolve(makeFetchResponse(200)),
    );
    _setFetch(mockFetch as unknown as typeof fetch);
    await expect(del('/tokens/token-id')).resolves.toBeUndefined();
  });

  test('401 → re-exchange + retry once → succeeds on second DELETE', async () => {
    const mockFetch = seqFn(
      // 1. initial exchange
      Promise.resolve(makeFetchResponse(200, { admin_token: 'tok-old', expires_at: expiresAt })),
      // 2. DELETE → 401
      Promise.resolve(makeFetchResponse(401)),
      // 3. re-exchange
      Promise.resolve(makeFetchResponse(200, { admin_token: 'tok-new', expires_at: expiresAt })),
      // 4. retry DELETE → 204
      Promise.resolve(makeFetchResponse(204)),
    );
    _setFetch(mockFetch as unknown as typeof fetch);
    await del('/tokens/tok-id');
    assert.strictEqual(mockFetch.mock.calls.length, 4);
  });

  test('401 twice → throws AuthError (only one retry)', async () => {
    const mockFetch = seqFn(
      Promise.resolve(makeFetchResponse(200, { admin_token: 'tok-exp', expires_at: expiresAt })),
      Promise.resolve(makeFetchResponse(401)),
      Promise.resolve(makeFetchResponse(200, { admin_token: 'tok-exp2', expires_at: expiresAt })),
      Promise.resolve(makeFetchResponse(401)),
    );
    _setFetch(mockFetch as unknown as typeof fetch);
    await expect(del('/tokens/tid')).rejects.toThrow(AuthError);
    assert.strictEqual(mockFetch.mock.calls.length, 4);
  });

  test('403 → throws ForbiddenError (no retry)', async () => {
    const mockFetch = seqFn(
      Promise.resolve(makeFetchResponse(200, { admin_token: 'tok-ok', expires_at: expiresAt })),
      Promise.resolve(makeFetchResponse(403)),
    );
    _setFetch(mockFetch as unknown as typeof fetch);
    await expect(del('/tokens/tid')).rejects.toThrow(ForbiddenError);
    assert.strictEqual(mockFetch.mock.calls.length, 2);
  });

  test('500 → throws NetworkError', async () => {
    const mockFetch = seqFn(
      Promise.resolve(makeFetchResponse(200, { admin_token: 'tok-ok', expires_at: expiresAt })),
      Promise.resolve(makeFetchResponse(500)),
    );
    _setFetch(mockFetch as unknown as typeof fetch);
    await expect(del('/tokens/tid')).rejects.toThrow(NetworkError);
  });

  test('uses flat path (not nested under /projects/:pid)', async () => {
    const mockFetch = seqFn(
      Promise.resolve(makeFetchResponse(200, { admin_token: 'tok-flat', expires_at: expiresAt })),
      Promise.resolve(makeFetchResponse(204)),
    );
    _setFetch(mockFetch as unknown as typeof fetch);
    await del('/tokens/flat-id');

    const [url] = mockFetch.mock.calls[1]?.arguments as [string];
    // Must NOT contain /projects/ in the DELETE path
    assert.ok(!String(url).includes('/projects/'));
    assert.ok(String(url).includes('/tokens/flat-id'));
  });
});
