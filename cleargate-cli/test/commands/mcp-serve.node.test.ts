import { describe, test } from 'node:test';
import assert from 'node:assert/strict';

/**
 * mcp-serve.test.ts — BUG-019 unit coverage for the stdio↔HTTP MCP proxy.
 */
import { Readable } from 'node:stream';
import { mcpServeHandler } from '../../src/commands/mcp-serve.js';
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


const BASE_URL = 'https://cleargate-mcp.soula.ge';

function makeStore(initialRefresh: string | null): TokenStore & { saved: string[] } {
  let stored = initialRefresh;
  const saved: string[] = [];
  return {
    backend: 'file',
    async load() {
      return stored;
    },
    async save(_p, t) {
      stored = t;
      saved.push(t);
    },
    async remove() {
      stored = null;
    },
    saved,
  } as TokenStore & { saved: string[] };
}

interface FetchCall {
  url: string;
  init: RequestInit | undefined;
  body: string;
}

function makeFetch(impl: (call: FetchCall) => Promise<Response>): {
  fn: typeof globalThis.fetch;
  calls: FetchCall[];
} {
  const calls: FetchCall[] = [];
  const fn: typeof globalThis.fetch = (async (input, init) => {
    const url = typeof input === 'string' || input instanceof URL ? String(input) : input.url;
    const body = typeof init?.body === 'string' ? init.body : '';
    const call = { url, init, body };
    calls.push(call);
    return impl(call);
  }) as typeof globalThis.fetch;
  return { fn, calls };
}

function jsonResp(obj: unknown, status = 200): Response {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

describe('mcpServeHandler', () => {
  test('happy path: refreshes on boot, proxies one stdin frame to /mcp, writes response to stdout', async () => {
    const store = makeStore('refresh-initial');
    const out: string[] = [];
    const err: string[] = [];

    const { fn: fetchFn } = makeFetch(async ({ url }) => {
      if (url.endsWith('/auth/refresh')) {
        return jsonResp({
          token_type: 'Bearer',
          access_token: 'access-1',
          refresh_token: 'refresh-rotated',
          expires_in: 900,
        });
      }
      if (url.endsWith('/mcp')) {
        return jsonResp({ jsonrpc: '2.0', id: 1, result: { ok: true } });
      }
      throw new Error(`unexpected url ${url}`);
    });

    const stdin = Readable.from([
      JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list' }) + '\n',
    ]);

    await mcpServeHandler({
      profile: 'default',
      mcpUrlFlag: BASE_URL,
      fetch: fetchFn,
      createStore: async () => store,
      stdin,
      stdout: (s) => out.push(s),
      stderr: (s) => err.push(s),
      exit: ((c: number) => {
        throw new Error(`unexpected exit(${c})`);
      }) as never,
    });

    assert.deepStrictEqual(store.saved, ['refresh-rotated']);
    const written = out.join('');
    assert.ok(String(written).includes('"id":1'));
    assert.ok(String(written).includes('"ok":true'));
    expect(err.join('')).toBe('');
  });

  test('on boot refresh failure: writes actionable hint to stderr and exits non-zero', async () => {
    const store = makeStore('expired-refresh');
    const err: string[] = [];
    let exitCode: number | undefined;

    const { fn: fetchFn } = makeFetch(async ({ url }) => {
      if (url.endsWith('/auth/refresh')) {
        return jsonResp({ error: 'invalid_token' }, 401);
      }
      throw new Error('should not reach /mcp');
    });

    await mcpServeHandler({
      profile: 'default',
      mcpUrlFlag: BASE_URL,
      fetch: fetchFn,
      createStore: async () => store,
      stdin: Readable.from(['']),
      stdout: () => undefined,
      stderr: (s) => err.push(s),
      exit: ((c: number) => {
        exitCode = c;
        return undefined as never;
      }) as never,
    });

    assert.strictEqual(exitCode, 1);
    expect(err.join('')).toMatch(/refresh failed/);
    expect(err.join('')).toMatch(/cleargate join/);
  });

  test('401 on /mcp triggers one refresh + one retry', async () => {
    const store = makeStore('refresh-1');
    const out: string[] = [];

    let mcpCalls = 0;
    let refreshCalls = 0;
    const { fn: fetchFn } = makeFetch(async ({ url }) => {
      if (url.endsWith('/auth/refresh')) {
        refreshCalls++;
        return jsonResp({
          token_type: 'Bearer',
          access_token: `access-${refreshCalls}`,
          refresh_token: `refresh-${refreshCalls + 1}`,
          expires_in: 900,
        });
      }
      if (url.endsWith('/mcp')) {
        mcpCalls++;
        if (mcpCalls === 1) {
          return new Response('expired', { status: 401 });
        }
        return jsonResp({ jsonrpc: '2.0', id: 7, result: 'ok' });
      }
      throw new Error(`unexpected ${url}`);
    });

    await mcpServeHandler({
      profile: 'default',
      mcpUrlFlag: BASE_URL,
      fetch: fetchFn,
      createStore: async () => store,
      stdin: Readable.from([
        JSON.stringify({ jsonrpc: '2.0', id: 7, method: 'tools/call' }) + '\n',
      ]),
      stdout: (s) => out.push(s),
      stderr: () => undefined,
      exit: ((c: number) => {
        throw new Error(`unexpected exit(${c})`);
      }) as never,
    });

    assert.strictEqual(refreshCalls, 2); // boot + 401-retry
    assert.strictEqual(mcpCalls, 2);
    expect(out.join('')).toContain('"id":7');
  });

  test('notification (no id) request: forwards but writes nothing to stdout', async () => {
    const store = makeStore('refresh');
    const out: string[] = [];

    const { fn: fetchFn, calls } = makeFetch(async ({ url }) => {
      if (url.endsWith('/auth/refresh')) {
        return jsonResp({
          token_type: 'Bearer',
          access_token: 'access',
          refresh_token: 'r2',
          expires_in: 900,
        });
      }
      if (url.endsWith('/mcp')) {
        return new Response('', { status: 202 });
      }
      throw new Error(url);
    });

    await mcpServeHandler({
      profile: 'default',
      mcpUrlFlag: BASE_URL,
      fetch: fetchFn,
      createStore: async () => store,
      stdin: Readable.from([
        JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }) + '\n',
      ]),
      stdout: (s) => out.push(s),
      stderr: () => undefined,
      exit: ((c: number) => {
        throw new Error(`unexpected exit(${c})`);
      }) as never,
    });

    expect(calls.some((c) => c.url.endsWith('/mcp'))).toBe(true);
    expect(out.join('')).toBe('');
  });
});
