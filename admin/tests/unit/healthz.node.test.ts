import { describe, test, beforeEach, afterEach, mock } from 'node:test';
import assert from 'node:assert/strict';

/**
 * Health endpoint unit tests — STORY-006-10
 *
 * Tests the GET /health handler (via the +server.ts route) and the
 * underlying health-check helper functions.
 *
 * STORY-028-07: ioredis is redirected to src/lib/__mocks__/ioredis.ts via loader hooks.
 * Use __ioredisState__.methodOverrides to control connect/ping/disconnect behavior.
 */
import { __ioredisState__ } from '../../src/lib/__mocks__/ioredis.ts';

process.env['REDIS_URL'] = 'redis://localhost:6379';

import { checkRedis, checkMcp } from '../../src/lib/server/health-checks.js';
import { GET } from '../../src/routes/health/+server.js';

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


describe('GET /health (STORY-006-10)', () => {
  const savedEnv = { ...process.env };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockFetch: any;
  let origFetch: typeof globalThis.fetch;

  beforeEach(() => {
    process.env['REDIS_URL'] = 'redis://localhost:6379';
    process.env['PUBLIC_MCP_URL'] = 'http://localhost:3001';
    // Reset ioredis method overrides — healthy defaults (no overrides = default no-op behavior)
    __ioredisState__.methodOverrides = {};
    // Healthy MCP default
    mockFetch = mock.fn(() => Promise.resolve(new Response('ok', { status: 200 })));
    origFetch = globalThis.fetch;
    globalThis.fetch = mockFetch;
  });

  afterEach(() => {
    for (const key of ['REDIS_URL', 'PUBLIC_MCP_URL']) {
      if (savedEnv[key] !== undefined) {
        process.env[key] = savedEnv[key];
      } else {
        delete process.env[key];
      }
    }
    globalThis.fetch = origFetch;
    __ioredisState__.methodOverrides = {};
  });

  test('Scenario: Health endpoint boots — returns 200 with status ok and both checks ok', async () => {
    const response = await GET({ url: new URL('http://localhost/health') } as Parameters<typeof GET>[0]);

    assert.strictEqual(response.status, 200);
    const body = await response.json() as {
      status: string;
      checks: { redis: string; mcp: string };
      version: string;
      time: string;
    };
    assert.strictEqual(body.status, 'ok');
    assert.strictEqual(body.checks.redis, 'ok');
    assert.strictEqual(body.checks.mcp, 'ok');
    assert.strictEqual(typeof body.version, 'string');
    assert.strictEqual(typeof body.time, 'string');
    expect(response.headers.get('content-type')).toContain('application/json');
  });

  test('Scenario: Health endpoint degrades gracefully without MCP — 200 with checks.mcp = "fail"', async () => {
    mockFetch.mock.mockImplementation(() => Promise.reject(new Error('Connection refused')));

    const response = await GET({ url: new URL('http://localhost/health') } as Parameters<typeof GET>[0]);

    assert.strictEqual(response.status, 200);
    const body = await response.json() as { status: string; checks: { redis: string; mcp: string } };
    assert.strictEqual(body.status, 'ok');
    assert.strictEqual(body.checks.redis, 'ok');
    assert.strictEqual(body.checks.mcp, 'fail');
  });

  test('Scenario: Health endpoint fails if Redis is down — 503 with checks.redis = "fail"', async () => {
    // Override connect to reject — simulates ECONNREFUSED
    __ioredisState__.methodOverrides.connect = () => Promise.reject(new Error('ECONNREFUSED'));

    const response = await GET({ url: new URL('http://localhost/health') } as Parameters<typeof GET>[0]);

    assert.strictEqual(response.status, 503);
    const body = await response.json() as { status: string; checks: { redis: string; mcp: string } };
    assert.strictEqual(body.status, 'fail');
    assert.strictEqual(body.checks.redis, 'fail');
  });

  test('response body includes version and time fields', async () => {
    const response = await GET({ url: new URL('http://localhost/health') } as Parameters<typeof GET>[0]);
    const body = await response.json() as { version: string; time: string };
    assert.notStrictEqual(body.version, undefined);
    // time must be a valid ISO 8601 string
    expect(new Date(body.time).toISOString()).toBe(body.time);
  });

  test('checkMcp returns "skipped" when empty URL is provided', async () => {
    const result = await checkMcp('');
    assert.strictEqual(result, 'skipped');
  });

  test('checkRedis returns "fail" when empty URL is provided', async () => {
    const result = await checkRedis('');
    assert.strictEqual(result, 'fail');
  });
});
