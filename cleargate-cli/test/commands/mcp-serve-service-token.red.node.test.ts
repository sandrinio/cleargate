/**
 * mcp-serve-service-token.red.node.test.ts — CR-065 QA-RED
 *
 * Failing tests (RED phase) for CR-065: `cleargate mcp serve` service-token
 * env-var auth for Claude Desktop / Claude Code stdio clients.
 *
 * Scenarios covered (§4 Verification Protocol + M1.md test shape):
 *
 *   Scenario 1 — env var set → ServiceTokenFetcher used → keychain NOT accessed
 *     CLEARGATE_SERVICE_TOKEN is set. stderr contains "auth mode = service-token".
 *     createStore (keychain) is NOT called. First /mcp POST Authorization header
 *     is "Bearer <env-value>".
 *
 *   Scenario 2 — env var unset → falls back to existing AuthFetcher (keychain)
 *     CLEARGATE_SERVICE_TOKEN absent. stderr contains "auth mode = keychain-refresh".
 *     createStore IS called. Behavior identical to pre-CR baseline.
 *
 *   Scenario 3 — env var empty string → treated as unset → keychain mode
 *     CLEARGATE_SERVICE_TOKEN=''. stderr says "auth mode = keychain-refresh".
 *     createStore IS called (empty string must not activate service-token branch).
 *
 *   Scenario 4 — service-token mode, /mcp returns 401 → actionable error + exit non-zero
 *     CLEARGATE_SERVICE_TOKEN set. /mcp responds 401. stderr contains literal
 *     "CLEARGATE_SERVICE_TOKEN rejected by /mcp (401)". exit code non-zero.
 *     No retry attempt, no keychain fallback.
 *
 *   Scenario 5 — header literal "Bearer ${CLEARGATE_SERVICE_TOKEN}" (string-match)
 *     When CLEARGATE_SERVICE_TOKEN='tok-abc', the Authorization header sent to
 *     /mcp is exactly "Bearer tok-abc". Asserts the literal Bearer prefix.
 *
 * PRE-FIX state (baseline, no implementation):
 *   Scenarios 1, 3, 4, 5 FAIL because:
 *     - ServiceTokenFetcher module doesn't exist → import error
 *     - mcp-serve.ts has no env-var branch → env var ignored
 *     - no "auth mode" stderr output
 *     - no service-token 401 fail-fast path
 *   Scenario 2 is preserved for regression: unset env must keep existing behavior.
 *
 * Runner: tsx --test (node:test)
 * Naming: *.red.node.test.ts (immutable post-Red, per FLASHCARD 2026-05-04 #naming #red-green)
 * Forbidden: DO NOT edit implementation files (mcp-serve.ts, refresh.ts).
 */

import { describe, it, after, before } from 'node:test';
import assert from 'node:assert/strict';
import { Readable } from 'node:stream';
import { mcpServeHandler } from '../../src/commands/mcp-serve.js';
import type { TokenStore } from '../../src/auth/token-store.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const BASE_URL = 'https://cleargate-mcp.soula.ge';

/** Minimal in-memory token store. Tracks whether load() was called. */
function makeStore(initialRefresh: string | null): TokenStore & { loadCalled: boolean; saved: string[] } {
  let stored = initialRefresh;
  const saved: string[] = [];
  let loadCalled = false;
  return {
    backend: 'file',
    async load() {
      loadCalled = true;
      return stored;
    },
    async save(_p: string, t: string) {
      stored = t;
      saved.push(t);
    },
    async remove() {
      stored = null;
    },
    get loadCalled() { return loadCalled; },
    saved,
  } as unknown as TokenStore & { loadCalled: boolean; saved: string[] };
}

interface FetchCall {
  url: string;
  method: string;
  headers: Record<string, string>;
  body: string;
}

function makeFetch(impl: (call: FetchCall) => Promise<Response>): {
  fn: typeof globalThis.fetch;
  calls: FetchCall[];
} {
  const calls: FetchCall[] = [];
  const fn: typeof globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' || input instanceof URL ? String(input) : (input as Request).url;
    const method = init?.method ?? 'GET';
    const rawHeaders = init?.headers ?? {};
    const headers: Record<string, string> = {};
    if (rawHeaders instanceof Headers) {
      rawHeaders.forEach((v, k) => { headers[k] = v; });
    } else if (Array.isArray(rawHeaders)) {
      for (const [k, v] of rawHeaders) headers[k] = v;
    } else {
      Object.assign(headers, rawHeaders);
    }
    const body = typeof init?.body === 'string' ? init.body : '';
    const call: FetchCall = { url, method, headers, body };
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

/** Standard successful refresh response. */
function refreshResp(): Response {
  return jsonResp({
    token_type: 'Bearer',
    access_token: 'access-tok',
    refresh_token: 'refresh-rotated',
    expires_in: 3600,
  });
}

/** Single-line JSON-RPC request. */
const MCP_REQUEST = JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'tools/list', params: {} });

function makeInputStream(lines: string[]): Readable {
  const r = new Readable({ read() {} });
  for (const l of lines) r.push(l + '\n');
  r.push(null);
  return r;
}

// ─── Scenario 1 — env var set → service-token mode ───────────────────────────
//
// PRE-FIX: mcp-serve.ts has no CLEARGATE_SERVICE_TOKEN env branch.
//   - createStore IS called (keychain path unconditionally runs)
//   - stderr does NOT emit "auth mode = service-token"
//   - Authorization header is the keychain access token, NOT the env value
//
// This test FAILS pre-fix on ALL three assertions:
//   assert 1a: "auth mode = service-token" absent from stderr
//   assert 1b: createStore WAS called (keychain accessed despite env var being set)
//   assert 1c: Authorization header is keychain token, not env value

describe('CR-065 Scenario 1 — CLEARGATE_SERVICE_TOKEN set → service-token mode', () => {
  const SERVICE_TOKEN = 'svc-tok-scenario-1-abc';
  let storeCalled = false;
  let stderrLines: string[] = [];
  let fetchCalls: FetchCall[] = [];

  before(async () => {
    process.env['CLEARGATE_SERVICE_TOKEN'] = SERVICE_TOKEN;

    const { fn, calls } = makeFetch(async (call) => {
      if (call.url.endsWith('/auth/refresh')) return refreshResp();
      if (call.url.endsWith('/mcp')) {
        return jsonResp({ jsonrpc: '2.0', id: 1, result: { tools: [] } });
      }
      return new Response('not found', { status: 404 });
    });
    fetchCalls = calls;

    const stderrOut: string[] = [];
    stderrLines = stderrOut;

    await mcpServeHandler({
      profile: 'default',
      fetch: fn,
      createStore: async () => {
        storeCalled = true;
        return makeStore('refresh-token-should-not-be-used');
      },
      stdin: makeInputStream([MCP_REQUEST]),
      stdout: () => {},
      stderr: (s: string) => { stderrOut.push(s); },
      exit: (c: number) => { throw new Error(`exit(${c})`); },
    });
  });

  after(() => {
    delete process.env['CLEARGATE_SERVICE_TOKEN'];
  });

  it('stderr contains "auth mode = service-token"', () => {
    const fullStderr = stderrLines.join('');
    assert.ok(
      fullStderr.includes('auth mode = service-token'),
      `CR-065 Scenario 1 FAIL: "auth mode = service-token" not in stderr.\n` +
      `Received stderr: ${JSON.stringify(fullStderr)}\n` +
      `PRE-FIX: mcp-serve.ts has no env-var branch; env var is silently ignored.`
    );
  });

  it('createStore (keychain) is NOT called when env var is set', () => {
    assert.equal(
      storeCalled,
      false,
      `CR-065 Scenario 1 FAIL: createStore was called even though CLEARGATE_SERVICE_TOKEN is set.\n` +
      `PRE-FIX: unconditional \`const store = await createTokenStore(...)\` runs before env-var check.`
    );
  });

  it('Authorization header sent to /mcp is "Bearer <env-value>"', () => {
    const mcpCall = fetchCalls.find((c) => c.url.endsWith('/mcp'));
    assert.ok(mcpCall, 'CR-065 Scenario 1 FAIL: no /mcp POST recorded.');
    const auth = mcpCall!.headers['Authorization'] ?? mcpCall!.headers['authorization'] ?? '';
    assert.equal(
      auth,
      `Bearer ${SERVICE_TOKEN}`,
      `CR-065 Scenario 1 FAIL: Authorization header is "${auth}", expected "Bearer ${SERVICE_TOKEN}".\n` +
      `PRE-FIX: header uses keychain access token, not the env-var value.`
    );
  });
});

// ─── Scenario 2 — env var unset → keychain-refresh mode (regression) ─────────
//
// This scenario must behave identically to pre-CR behavior.
// PRE-FIX state: this test PASSES (env var absent → existing code runs unchanged).
// POST-FIX state: this test must STILL PASS (regression gate).
//
// It is included in the RED file as a wiring-soundness regression anchor:
// if the implementation accidentally breaks the unset-env path, QA-Verify catches it.

describe('CR-065 Scenario 2 — CLEARGATE_SERVICE_TOKEN unset → keychain-refresh mode', () => {
  let storeCalled = false;
  let stderrLines: string[] = [];
  let fetchCalls: FetchCall[] = [];

  before(async () => {
    delete process.env['CLEARGATE_SERVICE_TOKEN'];

    const { fn, calls } = makeFetch(async (call) => {
      if (call.url.endsWith('/auth/refresh')) return refreshResp();
      if (call.url.endsWith('/mcp')) {
        return jsonResp({ jsonrpc: '2.0', id: 1, result: { tools: [] } });
      }
      return new Response('not found', { status: 404 });
    });
    fetchCalls = calls;

    const stderrOut: string[] = [];
    stderrLines = stderrOut;

    await mcpServeHandler({
      profile: 'default',
      fetch: fn,
      createStore: async () => {
        storeCalled = true;
        return makeStore('refresh-initial');
      },
      stdin: makeInputStream([MCP_REQUEST]),
      stdout: () => {},
      stderr: (s: string) => { stderrOut.push(s); },
      exit: (c: number) => { throw new Error(`exit(${c})`); },
    });
  });

  it('createStore (keychain) IS called when env var is unset', () => {
    assert.equal(
      storeCalled,
      true,
      `CR-065 Scenario 2 REGRESSION: createStore was NOT called when CLEARGATE_SERVICE_TOKEN is unset.\n` +
      `The unset env-var path must be byte-identical to pre-CR behavior.`
    );
  });

  it('stderr contains "auth mode = keychain-refresh"', () => {
    const fullStderr = stderrLines.join('');
    assert.ok(
      fullStderr.includes('auth mode = keychain-refresh'),
      `CR-065 Scenario 2 FAIL: "auth mode = keychain-refresh" not in stderr.\n` +
      `Received stderr: ${JSON.stringify(fullStderr)}\n` +
      `PRE-FIX: no auth-mode boot log exists; this assertion fails until CR-065 is implemented.`
    );
  });

  it('/auth/refresh is called (keychain path runs boot-time refresh)', () => {
    const refreshCall = fetchCalls.find((c) => c.url.endsWith('/auth/refresh'));
    assert.ok(
      refreshCall,
      `CR-065 Scenario 2 REGRESSION: /auth/refresh was not called.\n` +
      `The keychain boot-time refresh must still run when env var is unset.`
    );
  });
});

// ─── Scenario 3 — env var empty string → treated as unset → keychain mode ────
//
// §4 failure-mode verification line: "CLEARGATE_SERVICE_TOKEN= cleargate mcp serve"
// expects "auth mode = keychain-refresh". Empty string MUST NOT activate the
// service-token branch. Implementation must check `serviceToken.length > 0`.
//
// PRE-FIX: env var is ignored entirely → keychain runs (accidentally "correct"
// for the store-call assertion) but "auth mode = keychain-refresh" is NOT emitted.
// So assertion 3b FAILS pre-fix.

describe('CR-065 Scenario 3 — CLEARGATE_SERVICE_TOKEN="" treated as unset', () => {
  let storeCalled = false;
  let stderrLines: string[] = [];

  before(async () => {
    process.env['CLEARGATE_SERVICE_TOKEN'] = '';

    const { fn } = makeFetch(async (call) => {
      if (call.url.endsWith('/auth/refresh')) return refreshResp();
      if (call.url.endsWith('/mcp')) {
        return jsonResp({ jsonrpc: '2.0', id: 1, result: { tools: [] } });
      }
      return new Response('not found', { status: 404 });
    });

    const stderrOut: string[] = [];
    stderrLines = stderrOut;

    await mcpServeHandler({
      profile: 'default',
      fetch: fn,
      createStore: async () => {
        storeCalled = true;
        return makeStore('refresh-initial');
      },
      stdin: makeInputStream([MCP_REQUEST]),
      stdout: () => {},
      stderr: (s: string) => { stderrOut.push(s); },
      exit: (c: number) => { throw new Error(`exit(${c})`); },
    });
  });

  after(() => {
    delete process.env['CLEARGATE_SERVICE_TOKEN'];
  });

  it('createStore IS called (empty string must not activate service-token branch)', () => {
    assert.equal(
      storeCalled,
      true,
      `CR-065 Scenario 3 FAIL: createStore was NOT called for CLEARGATE_SERVICE_TOKEN=""\n` +
      `Empty string must be treated as unset; keychain path must still run.`
    );
  });

  it('stderr contains "auth mode = keychain-refresh" for empty env var', () => {
    const fullStderr = stderrLines.join('');
    assert.ok(
      fullStderr.includes('auth mode = keychain-refresh'),
      `CR-065 Scenario 3 FAIL: "auth mode = keychain-refresh" not in stderr for CLEARGATE_SERVICE_TOKEN="".\n` +
      `Received stderr: ${JSON.stringify(fullStderr)}\n` +
      `PRE-FIX: no auth-mode boot log exists → this assertion fails before CR-065 is implemented.`
    );
  });
});

// ─── Scenario 4 — service-token mode, /mcp 401 → fail-fast + actionable error ─
//
// §4 failure-mode: CLEARGATE_SERVICE_TOKEN=not-a-real-token → /mcp → 401
// Expected: stderr contains "CLEARGATE_SERVICE_TOKEN rejected by /mcp (401)"
//           exit code is non-zero
//           no retry, no keychain fallback
//
// PRE-FIX: env var ignored → keychain path runs → boot refresh succeeds with
// mock store → no "CLEARGATE_SERVICE_TOKEN rejected" message → exit not called
// This test FAILS pre-fix on ALL three assertions.

describe('CR-065 Scenario 4 — service-token 401 → actionable error + non-zero exit', () => {
  const BAD_TOKEN = 'not-a-real-token-scenario-4';
  let exitCode: number | null = null;
  let stderrLines: string[] = [];
  let fetchCalls: FetchCall[] = [];
  let mcpCallCount = 0;

  before(async () => {
    process.env['CLEARGATE_SERVICE_TOKEN'] = BAD_TOKEN;
    exitCode = null;
    mcpCallCount = 0;

    const { fn, calls } = makeFetch(async (call) => {
      if (call.url.endsWith('/auth/refresh')) return refreshResp();
      if (call.url.endsWith('/mcp')) {
        mcpCallCount++;
        return new Response('Unauthorized', { status: 401 });
      }
      return new Response('not found', { status: 404 });
    });
    fetchCalls = calls;

    const stderrOut: string[] = [];
    stderrLines = stderrOut;

    let caughtExit = false;
    try {
      await mcpServeHandler({
        profile: 'default',
        fetch: fn,
        createStore: async () => makeStore(null),
        stdin: makeInputStream([MCP_REQUEST]),
        stdout: () => {},
        stderr: (s: string) => { stderrOut.push(s); },
        exit: (c: number): never => {
          exitCode = c;
          caughtExit = true;
          throw new Error(`process.exit(${c})`);
        },
      });
    } catch (err) {
      if (!(err instanceof Error && err.message.startsWith('process.exit'))) {
        throw err;
      }
    }
  });

  after(() => {
    delete process.env['CLEARGATE_SERVICE_TOKEN'];
  });

  it('stderr contains the literal "CLEARGATE_SERVICE_TOKEN rejected by /mcp (401)"', () => {
    const fullStderr = stderrLines.join('');
    assert.ok(
      fullStderr.includes('CLEARGATE_SERVICE_TOKEN rejected by /mcp (401)'),
      `CR-065 Scenario 4 FAIL: actionable error message absent from stderr.\n` +
      `Received stderr: ${JSON.stringify(fullStderr)}\n` +
      `Expected to contain: "CLEARGATE_SERVICE_TOKEN rejected by /mcp (401)"\n` +
      `PRE-FIX: env var ignored → no service-token 401 handler exists.`
    );
  });

  it('exit is called with non-zero code', () => {
    assert.ok(
      exitCode !== null && exitCode !== 0,
      `CR-065 Scenario 4 FAIL: exit was not called with a non-zero code.\n` +
      `exitCode received: ${exitCode}\n` +
      `PRE-FIX: keychain path succeeds (mock store returns null refresh → RefreshError), wrong path.`
    );
  });

  it('/mcp is called at most once (no retry on 401 in service-token mode)', () => {
    assert.ok(
      mcpCallCount <= 1,
      `CR-065 Scenario 4 FAIL: /mcp was called ${mcpCallCount} times; expected at most 1 (no retry).\n` +
      `Service-token mode must fail fast on first 401 with no retry.`
    );
  });
});

// ─── Scenario 5 — header literal "Bearer ${CLEARGATE_SERVICE_TOKEN}" ──────────
//
// The M1 blueprint mandates the env-var name as a string literal (not constant
// import). This test verifies the actual Bearer token value sent on the wire
// is the verbatim env var value — the "Bearer " prefix is prepended, nothing else.
//
// PRE-FIX: env var is ignored → Authorization header uses keychain access token
// ("access-tok" from the mock refresh response), NOT the env value.
// This test FAILS pre-fix because the header is "Bearer access-tok" not "Bearer tok-abc".

describe('CR-065 Scenario 5 — Authorization header is "Bearer <env-value>" verbatim', () => {
  const TOKEN = 'tok-abc-scenario-5-verbatim';
  let fetchCalls: FetchCall[] = [];

  before(async () => {
    process.env['CLEARGATE_SERVICE_TOKEN'] = TOKEN;

    const { fn, calls } = makeFetch(async (call) => {
      if (call.url.endsWith('/auth/refresh')) return refreshResp();
      if (call.url.endsWith('/mcp')) {
        return jsonResp({ jsonrpc: '2.0', id: 1, result: { tools: [] } });
      }
      return new Response('not found', { status: 404 });
    });
    fetchCalls = calls;

    await mcpServeHandler({
      profile: 'default',
      fetch: fn,
      createStore: async () => makeStore('should-not-be-used'),
      stdin: makeInputStream([MCP_REQUEST]),
      stdout: () => {},
      stderr: () => {},
      exit: (c: number): never => { throw new Error(`exit(${c})`); },
    });
  });

  after(() => {
    delete process.env['CLEARGATE_SERVICE_TOKEN'];
  });

  it('Authorization header on /mcp POST is exactly "Bearer <CLEARGATE_SERVICE_TOKEN value>"', () => {
    const mcpCall = fetchCalls.find((c) => c.url.endsWith('/mcp'));
    assert.ok(mcpCall, 'CR-065 Scenario 5 FAIL: no /mcp POST recorded.');

    const auth = mcpCall!.headers['Authorization'] ?? mcpCall!.headers['authorization'] ?? '';
    assert.equal(
      auth,
      `Bearer ${TOKEN}`,
      `CR-065 Scenario 5 FAIL: Authorization header is "${auth}".\n` +
      `Expected: "Bearer ${TOKEN}"\n` +
      `PRE-FIX: keychain path produces "Bearer access-tok" (from mock refresh response), ignoring env var.`
    );
  });
});
