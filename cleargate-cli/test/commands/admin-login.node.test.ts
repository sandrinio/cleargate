import { describe, test, beforeEach, afterEach, mock } from 'node:test';
import assert from 'node:assert/strict';

/**
 * Unit tests for `cleargate admin login` — GitHub OAuth device flow.
 *
 * All HTTP calls are mocked via the fetch seam in AdminLoginOptions.
 * File I/O uses a temp directory via the authFilePath seam.
 *
 * STORY-005-06 Gherkin scenarios covered:
 *  - L-1: Happy path: start → print user_code → poll-pending → poll-success → writes admin-auth.json
 *  - L-2: Start failure (network) → exit 3
 *  - L-3: Poll access_denied → exit 5 with error message
 *  - L-4: Polling respects interval (doesn't spam — timer fires at specified interval)
 *  - L-5: Non-admin user → exit 4 with error message
 *  - L-6: Device code expired → exit 5 with error message
 *  - L-7: Secrets never leak to stdout/stderr
 *  - L-8: User denies in browser (access_denied) → exit 5
 *  - L-9: Server 503 (not configured) → exit 6
 *  - L-10: admin-auth.json written at correct path with { version: 1, token } and chmod 600
 */
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { adminLoginHandler } from '../../src/commands/admin-login.js';

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


// ─────────────────────────────────────────────────────────────────────────────
// Test helpers
// ─────────────────────────────────────────────────────────────────────────────

interface FetchCall {
  url: string;
  init?: RequestInit;
}

const MCP_BASE = 'http://localhost:3000';
const FAKE_DEVICE_CODE = 'test-device-code-abc';
const FAKE_USER_CODE = 'ABCD-1234';
const FAKE_VERIFICATION_URI = 'https://github.com/login/device';
const FAKE_ADMIN_TOKEN = 'eyJ_FAKE_ADMIN_JWT_NOT_REAL';
const FAKE_EXPIRES_AT = new Date(Date.now() + 900_000).toISOString();
const FAKE_ADMIN_USER_ID = '00000000-0000-4000-8000-000000000001';

const START_SUCCESS_BODY = {
  device_code: FAKE_DEVICE_CODE,
  user_code: FAKE_USER_CODE,
  verification_uri: FAKE_VERIFICATION_URI,
  expires_in: 900,
  interval: 5,
};

const POLL_PENDING_BODY = { pending: true, retry_after: 5 };
const POLL_SUCCESS_BODY = {
  pending: false,
  admin_token: FAKE_ADMIN_TOKEN,
  expires_at: FAKE_EXPIRES_AT,
  admin_user_id: FAKE_ADMIN_USER_ID,
};

function makeResponse(status: number, body: unknown): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(body),
    headers: { get: () => 'application/json' },
  } as unknown as Response;
}

/** Build a fetch mock that returns `startBody` on start and cycles through `pollBodies` on poll. */
function buildFetch(startBody: unknown, pollBodies: unknown[], startStatus = 200) {
  let pollIndex = 0;
  const calls: FetchCall[] = [];
  const fetchMock = mock.fn((url: string, init?: RequestInit) => {
    calls.push({ url, init });
    if (typeof url === 'string' && url.includes('/auth/device/start')) {
      return Promise.resolve(makeResponse(startStatus, startBody));
    }
    if (typeof url === 'string' && url.includes('/auth/device/poll')) {
      const body = pollBodies[Math.min(pollIndex, pollBodies.length - 1)];
      pollIndex++;
      return Promise.resolve(makeResponse(200, body));
    }
    return Promise.reject(new Error(`Unexpected fetch: ${String(url)}`));
  });
  return { fetchMock, calls };
}

function buildCollectors() {
  const stdoutLines: string[] = [];
  const stderrLines: string[] = [];
  return {
    stdout: (msg: string) => stdoutLines.push(msg),
    stderr: (msg: string) => stderrLines.push(msg),
    stdoutLines,
    stderrLines,
  };
}

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'admin-login-test-'));
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tests
// ─────────────────────────────────────────────────────────────────────────────

describe('adminLoginHandler', () => {
  // L-1: Happy path
  test('L-1: happy path — start → pending → success → writes admin-auth.json', async () => {
    const { fetchMock } = buildFetch(
      START_SUCCESS_BODY,
      [POLL_PENDING_BODY, POLL_SUCCESS_BODY],
    );
    const { stdout, stderr, stdoutLines, stderrLines } = buildCollectors();
    const exitMock = mock.fn() as unknown as (code: number) => never;
    const authFilePath = path.join(tmpDir, 'admin-auth.json');

    await adminLoginHandler({
      mcpUrl: MCP_BASE,
      fetch: fetchMock,
      stdout,
      stderr,
      exit: exitMock,
      authFilePath,
      intervalOverrideMs: 0, // no wait in tests
    });

    // Exit was not called (success path doesn't call exit)
    assert.strictEqual(exitMock.mock.calls.length, 0);

    // stdout has the URL and code
    const stdoutText = stdoutLines.join('\n');
    assert.ok(String(stdoutText).includes(FAKE_VERIFICATION_URI));
    assert.ok(String(stdoutText).includes(FAKE_USER_CODE));
    assert.ok(String(stdoutText).includes('Logged in successfully'));
    assert.ok(String(stdoutText).includes(FAKE_EXPIRES_AT));

    // No secrets in stdout/stderr
    assert.ok(!String(stdoutText).includes(FAKE_ADMIN_TOKEN));
    const stderrText = stderrLines.join('\n');
    assert.ok(!String(stderrText).includes(FAKE_ADMIN_TOKEN));
    assert.ok(!String(stderrText).includes('gho_'));

    // File written correctly
    expect(fs.existsSync(authFilePath)).toBe(true);
    const fileContent = JSON.parse(fs.readFileSync(authFilePath, 'utf8')) as { version: number; token: string };
    assert.strictEqual(fileContent.version, 1);
    assert.strictEqual(fileContent.token, FAKE_ADMIN_TOKEN);

    // File permissions: 600
    const stat = fs.statSync(authFilePath);
    const mode = stat.mode & 0o777;
    assert.strictEqual(mode, 0o600);

    // fetch called: 1 start + 2 polls
    assert.strictEqual(fetchMock.mock.calls.length, 3);
  });

  // L-2: Start failure — network error → exit 3
  test('L-2: start network failure → exit 3', async () => {
    const fetchMock = mock.fn(() => Promise.reject(new Error('ECONNREFUSED')));
    const { stdout, stderr, stderrLines } = buildCollectors();
    const exitMock = mock.fn() as unknown as (code: number) => never;

    await adminLoginHandler({
      mcpUrl: MCP_BASE,
      fetch: fetchMock,
      stdout,
      stderr,
      exit: exitMock,
      authFilePath: path.join(tmpDir, 'admin-auth.json'),
      intervalOverrideMs: 0,
    });

    assert.deepStrictEqual(exitMock.mock.calls[exitMock.mock.calls.length - 1].arguments, [3]);
    expect(stderrLines.join('\n')).toContain('cannot reach');
  });

  // L-3: Poll access_denied → exit 5
  test('L-3: poll access_denied → exit 5 with "access denied" message', async () => {
    const fetchMock = mock.fn((url: string) => {
      if (typeof url === 'string' && url.includes('/start')) {
        return Promise.resolve(makeResponse(200, START_SUCCESS_BODY));
      }
      return Promise.resolve(makeResponse(403, { error: 'access_denied' }));
    });
    const { stdout, stderr, stderrLines } = buildCollectors();
    const exitMock = mock.fn() as unknown as (code: number) => never;

    await adminLoginHandler({
      mcpUrl: MCP_BASE,
      fetch: fetchMock,
      stdout,
      stderr,
      exit: exitMock,
      authFilePath: path.join(tmpDir, 'admin-auth.json'),
      intervalOverrideMs: 0,
    });

    assert.deepStrictEqual(exitMock.mock.calls[exitMock.mock.calls.length - 1].arguments, [5]);
    expect(stderrLines.join('\n')).toMatch(/access denied/i);
    // File NOT written
    expect(fs.existsSync(path.join(tmpDir, 'admin-auth.json'))).toBe(false);
  });

  // L-4: Polling respects interval
  test('L-4: polling calls fetch once per interval cycle', async () => {
    const { fetchMock, calls } = buildFetch(
      START_SUCCESS_BODY,
      [POLL_PENDING_BODY, POLL_PENDING_BODY, POLL_SUCCESS_BODY],
    );
    const { stdout, stderr } = buildCollectors();
    const exitMock = mock.fn() as unknown as (code: number) => never;

    await adminLoginHandler({
      mcpUrl: MCP_BASE,
      fetch: fetchMock,
      stdout,
      stderr,
      exit: exitMock,
      authFilePath: path.join(tmpDir, 'admin-auth.json'),
      intervalOverrideMs: 0,
    });

    // 1 start + 3 polls = 4 total calls
    const pollCalls = calls.filter((c) => c.url.includes('/poll'));
    assert.strictEqual((pollCalls).length, 3);
  });

  // L-5: Non-admin user → exit 4
  test('L-5: non-admin user → exit 4 with not authorized message', async () => {
    const fetchMock = mock.fn((url: string) => {
      if (typeof url === 'string' && url.includes('/start')) {
        return Promise.resolve(makeResponse(200, START_SUCCESS_BODY));
      }
      return Promise.resolve(makeResponse(403, { error: 'not_admin' }));
    });
    const { stdout, stderr, stderrLines } = buildCollectors();
    const exitMock = mock.fn() as unknown as (code: number) => never;

    await adminLoginHandler({
      mcpUrl: MCP_BASE,
      fetch: fetchMock,
      stdout,
      stderr,
      exit: exitMock,
      authFilePath: path.join(tmpDir, 'admin-auth.json'),
      intervalOverrideMs: 0,
    });

    assert.deepStrictEqual(exitMock.mock.calls[exitMock.mock.calls.length - 1].arguments, [4]);
    expect(stderrLines.join('\n')).toMatch(/not authorized as an admin/i);
  });

  // L-6: Device code expired → exit 5
  test('L-6: device code expired → exit 5 with expired message', async () => {
    const fetchMock = mock.fn((url: string) => {
      if (typeof url === 'string' && url.includes('/start')) {
        return Promise.resolve(makeResponse(200, START_SUCCESS_BODY));
      }
      return Promise.resolve(makeResponse(410, { error: 'expired_token' }));
    });
    const { stdout, stderr, stderrLines } = buildCollectors();
    const exitMock = mock.fn() as unknown as (code: number) => never;

    await adminLoginHandler({
      mcpUrl: MCP_BASE,
      fetch: fetchMock,
      stdout,
      stderr,
      exit: exitMock,
      authFilePath: path.join(tmpDir, 'admin-auth.json'),
      intervalOverrideMs: 0,
    });

    assert.deepStrictEqual(exitMock.mock.calls[exitMock.mock.calls.length - 1].arguments, [5]);
    expect(stderrLines.join('\n')).toMatch(/expired/i);
  });

  // L-7: Secrets never leak to stdout/stderr
  test('L-7: admin_token NEVER appears in stdout or stderr', async () => {
    const { fetchMock } = buildFetch(START_SUCCESS_BODY, [POLL_SUCCESS_BODY]);
    const { stdout, stderr, stdoutLines, stderrLines } = buildCollectors();
    const exitMock = mock.fn() as unknown as (code: number) => never;

    await adminLoginHandler({
      mcpUrl: MCP_BASE,
      fetch: fetchMock,
      stdout,
      stderr,
      exit: exitMock,
      authFilePath: path.join(tmpDir, 'admin-auth.json'),
      intervalOverrideMs: 0,
    });

    const allOutput = [...stdoutLines, ...stderrLines].join('\n');
    // Admin token must NOT appear
    assert.ok(!String(allOutput).includes(FAKE_ADMIN_TOKEN));
    // User code MUST appear (it's not a secret)
    assert.ok(String(allOutput).includes(FAKE_USER_CODE));
  });

  // L-8: User denies in browser (access_denied) → exit 5
  test('L-8: user denies in browser → exit 5', async () => {
    const fetchMock = mock.fn((url: string) => {
      if (typeof url === 'string' && url.includes('/start')) {
        return Promise.resolve(makeResponse(200, START_SUCCESS_BODY));
      }
      return Promise.resolve(makeResponse(403, { error: 'access_denied' }));
    });
    const { stdout, stderr } = buildCollectors();
    const exitMock = mock.fn() as unknown as (code: number) => never;

    await adminLoginHandler({
      mcpUrl: MCP_BASE,
      fetch: fetchMock,
      stdout,
      stderr,
      exit: exitMock,
      authFilePath: path.join(tmpDir, 'admin-auth.json'),
      intervalOverrideMs: 0,
    });

    assert.deepStrictEqual(exitMock.mock.calls[exitMock.mock.calls.length - 1].arguments, [5]);
  });

  // L-9: Server 503 (not configured) → exit 6
  test('L-9: server returns 503 on start → exit 6', async () => {
    const fetchMock = mock.fn(() => Promise.resolve(makeResponse(503, { error: 'device_flow_not_configured' })));
    const { stdout, stderr, stderrLines } = buildCollectors();
    const exitMock = mock.fn() as unknown as (code: number) => never;

    await adminLoginHandler({
      mcpUrl: MCP_BASE,
      fetch: fetchMock,
      stdout,
      stderr,
      exit: exitMock,
      authFilePath: path.join(tmpDir, 'admin-auth.json'),
      intervalOverrideMs: 0,
    });

    assert.deepStrictEqual(exitMock.mock.calls[exitMock.mock.calls.length - 1].arguments, [6]);
    expect(stderrLines.join('\n')).toMatch(/not configured/i);
  });

  // L-11: slow_down — interval bumps up, never down
  test('L-11: slow_down — interval bumps up on retry_after increase, never decreases', async () => {
    // Server responds: pending (retry_after=3s), pending (retry_after=6s slow_down), then success.
    // We inject a sleepFn seam to capture each call's ms argument (no real waiting).
    const sleepCalls: number[] = [];
    const sleepFn = mock.fn((ms: number) => {
      sleepCalls.push(ms);
      return Promise.resolve();
    });

    const pollBodies = [
      { pending: true, retry_after: 3 },   // first poll: retry_after=3s → 3000ms > 100ms baseline → bump
      { pending: true, retry_after: 6 },   // second poll: slow_down → 6000ms > 3000ms → bump again
      POLL_SUCCESS_BODY,
    ];

    const { fetchMock } = buildFetch(START_SUCCESS_BODY, pollBodies);
    const { stdout, stderr } = buildCollectors();
    const exitMock = mock.fn() as unknown as (code: number) => never;
    const authFilePath = path.join(tmpDir, 'admin-auth-L11.json');

    await adminLoginHandler({
      mcpUrl: MCP_BASE,
      fetch: fetchMock,
      stdout,
      stderr,
      exit: exitMock,
      authFilePath,
      intervalOverrideMs: 100, // baseline — bump logic applies because sleepFn is also provided
      sleepFn,
    });

    assert.strictEqual(exitMock.mock.calls.length, 0);

    // sleep should have been called 3 times (once per poll iteration before each fetch)
    assert.strictEqual((sleepCalls).length, 3);

    // First sleep uses baseline (100ms); subsequent ones are bumped by retry_after * 1000.
    assert.strictEqual(sleepCalls[0], 100);    // baseline
    assert.strictEqual(sleepCalls[1], 3000);   // bumped after first pending (retry_after=3 → 3000ms > 100ms)
    assert.strictEqual(sleepCalls[2], 6000);   // bumped after second pending (retry_after=6 → 6000ms > 3000ms)

    // Never-decrease guard: calls are strictly increasing — no value went down.
    for (let i = 1; i < sleepCalls.length; i++) {
      assert.ok(sleepCalls[i] >= sleepCalls[i - 1]!);
    }
  });

  // L-10: admin-auth.json shape + chmod 600
  test('L-10: admin-auth.json has { version: 1, token } and is chmod 600', async () => {
    const { fetchMock } = buildFetch(START_SUCCESS_BODY, [POLL_SUCCESS_BODY]);
    const { stdout, stderr } = buildCollectors();
    const exitMock = mock.fn() as unknown as (code: number) => never;
    const authFilePath = path.join(tmpDir, 'admin-auth.json');

    await adminLoginHandler({
      mcpUrl: MCP_BASE,
      fetch: fetchMock,
      stdout,
      stderr,
      exit: exitMock,
      authFilePath,
      intervalOverrideMs: 0,
    });

    const content = JSON.parse(fs.readFileSync(authFilePath, 'utf8')) as unknown;
    assert.deepStrictEqual(content, { version: 1, token: FAKE_ADMIN_TOKEN });

    const stat = fs.statSync(authFilePath);
    assert.strictEqual(stat.mode & 0o777, 0o600);
  });
});
