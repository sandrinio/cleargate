/**
 * mcp-serve.test.ts — BUG-019 unit coverage for the stdio↔HTTP MCP proxy.
 */
import { describe, it, expect } from 'vitest';
import { Readable } from 'node:stream';
import { mcpServeHandler } from '../../src/commands/mcp-serve.js';
import type { TokenStore } from '../../src/auth/token-store.js';

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
  it('happy path: refreshes on boot, proxies one stdin frame to /mcp, writes response to stdout', async () => {
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

    expect(store.saved).toEqual(['refresh-rotated']);
    const written = out.join('');
    expect(written).toContain('"id":1');
    expect(written).toContain('"ok":true');
    expect(err.join('')).toBe('');
  });

  it('on boot refresh failure: writes actionable hint to stderr and exits non-zero', async () => {
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

    expect(exitCode).toBe(1);
    expect(err.join('')).toMatch(/refresh failed/);
    expect(err.join('')).toMatch(/cleargate join/);
  });

  it('401 on /mcp triggers one refresh + one retry', async () => {
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

    expect(refreshCalls).toBe(2); // boot + 401-retry
    expect(mcpCalls).toBe(2);
    expect(out.join('')).toContain('"id":7');
  });

  it('notification (no id) request: forwards but writes nothing to stdout', async () => {
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
