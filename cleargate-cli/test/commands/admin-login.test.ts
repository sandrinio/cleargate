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
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { adminLoginHandler } from '../../src/commands/admin-login.js';

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
  const fetchMock = vi.fn().mockImplementation((url: string, init?: RequestInit) => {
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
  it('L-1: happy path — start → pending → success → writes admin-auth.json', async () => {
    const { fetchMock } = buildFetch(
      START_SUCCESS_BODY,
      [POLL_PENDING_BODY, POLL_SUCCESS_BODY],
    );
    const { stdout, stderr, stdoutLines, stderrLines } = buildCollectors();
    const exitMock = vi.fn() as unknown as (code: number) => never;
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
    expect(exitMock).not.toHaveBeenCalled();

    // stdout has the URL and code
    const stdoutText = stdoutLines.join('\n');
    expect(stdoutText).toContain(FAKE_VERIFICATION_URI);
    expect(stdoutText).toContain(FAKE_USER_CODE);
    expect(stdoutText).toContain('Logged in successfully');
    expect(stdoutText).toContain(FAKE_EXPIRES_AT);

    // No secrets in stdout/stderr
    expect(stdoutText).not.toContain(FAKE_ADMIN_TOKEN);
    const stderrText = stderrLines.join('\n');
    expect(stderrText).not.toContain(FAKE_ADMIN_TOKEN);
    expect(stderrText).not.toContain('gho_');

    // File written correctly
    expect(fs.existsSync(authFilePath)).toBe(true);
    const fileContent = JSON.parse(fs.readFileSync(authFilePath, 'utf8')) as { version: number; token: string };
    expect(fileContent.version).toBe(1);
    expect(fileContent.token).toBe(FAKE_ADMIN_TOKEN);

    // File permissions: 600
    const stat = fs.statSync(authFilePath);
    const mode = stat.mode & 0o777;
    expect(mode).toBe(0o600);

    // fetch called: 1 start + 2 polls
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  // L-2: Start failure — network error → exit 3
  it('L-2: start network failure → exit 3', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error('ECONNREFUSED'));
    const { stdout, stderr, stderrLines } = buildCollectors();
    const exitMock = vi.fn() as unknown as (code: number) => never;

    await adminLoginHandler({
      mcpUrl: MCP_BASE,
      fetch: fetchMock,
      stdout,
      stderr,
      exit: exitMock,
      authFilePath: path.join(tmpDir, 'admin-auth.json'),
      intervalOverrideMs: 0,
    });

    expect(exitMock).toHaveBeenCalledWith(3);
    expect(stderrLines.join('\n')).toContain('cannot reach');
  });

  // L-3: Poll access_denied → exit 5
  it('L-3: poll access_denied → exit 5 with "access denied" message', async () => {
    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (typeof url === 'string' && url.includes('/start')) {
        return Promise.resolve(makeResponse(200, START_SUCCESS_BODY));
      }
      return Promise.resolve(makeResponse(403, { error: 'access_denied' }));
    });
    const { stdout, stderr, stderrLines } = buildCollectors();
    const exitMock = vi.fn() as unknown as (code: number) => never;

    await adminLoginHandler({
      mcpUrl: MCP_BASE,
      fetch: fetchMock,
      stdout,
      stderr,
      exit: exitMock,
      authFilePath: path.join(tmpDir, 'admin-auth.json'),
      intervalOverrideMs: 0,
    });

    expect(exitMock).toHaveBeenCalledWith(5);
    expect(stderrLines.join('\n')).toMatch(/access denied/i);
    // File NOT written
    expect(fs.existsSync(path.join(tmpDir, 'admin-auth.json'))).toBe(false);
  });

  // L-4: Polling respects interval
  it('L-4: polling calls fetch once per interval cycle', async () => {
    const { fetchMock, calls } = buildFetch(
      START_SUCCESS_BODY,
      [POLL_PENDING_BODY, POLL_PENDING_BODY, POLL_SUCCESS_BODY],
    );
    const { stdout, stderr } = buildCollectors();
    const exitMock = vi.fn() as unknown as (code: number) => never;

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
    expect(pollCalls).toHaveLength(3);
  });

  // L-5: Non-admin user → exit 4
  it('L-5: non-admin user → exit 4 with not authorized message', async () => {
    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (typeof url === 'string' && url.includes('/start')) {
        return Promise.resolve(makeResponse(200, START_SUCCESS_BODY));
      }
      return Promise.resolve(makeResponse(403, { error: 'not_admin' }));
    });
    const { stdout, stderr, stderrLines } = buildCollectors();
    const exitMock = vi.fn() as unknown as (code: number) => never;

    await adminLoginHandler({
      mcpUrl: MCP_BASE,
      fetch: fetchMock,
      stdout,
      stderr,
      exit: exitMock,
      authFilePath: path.join(tmpDir, 'admin-auth.json'),
      intervalOverrideMs: 0,
    });

    expect(exitMock).toHaveBeenCalledWith(4);
    expect(stderrLines.join('\n')).toMatch(/not authorized as an admin/i);
  });

  // L-6: Device code expired → exit 5
  it('L-6: device code expired → exit 5 with expired message', async () => {
    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (typeof url === 'string' && url.includes('/start')) {
        return Promise.resolve(makeResponse(200, START_SUCCESS_BODY));
      }
      return Promise.resolve(makeResponse(410, { error: 'expired_token' }));
    });
    const { stdout, stderr, stderrLines } = buildCollectors();
    const exitMock = vi.fn() as unknown as (code: number) => never;

    await adminLoginHandler({
      mcpUrl: MCP_BASE,
      fetch: fetchMock,
      stdout,
      stderr,
      exit: exitMock,
      authFilePath: path.join(tmpDir, 'admin-auth.json'),
      intervalOverrideMs: 0,
    });

    expect(exitMock).toHaveBeenCalledWith(5);
    expect(stderrLines.join('\n')).toMatch(/expired/i);
  });

  // L-7: Secrets never leak to stdout/stderr
  it('L-7: admin_token NEVER appears in stdout or stderr', async () => {
    const { fetchMock } = buildFetch(START_SUCCESS_BODY, [POLL_SUCCESS_BODY]);
    const { stdout, stderr, stdoutLines, stderrLines } = buildCollectors();
    const exitMock = vi.fn() as unknown as (code: number) => never;

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
    expect(allOutput).not.toContain(FAKE_ADMIN_TOKEN);
    // User code MUST appear (it's not a secret)
    expect(allOutput).toContain(FAKE_USER_CODE);
  });

  // L-8: User denies in browser (access_denied) → exit 5
  it('L-8: user denies in browser → exit 5', async () => {
    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (typeof url === 'string' && url.includes('/start')) {
        return Promise.resolve(makeResponse(200, START_SUCCESS_BODY));
      }
      return Promise.resolve(makeResponse(403, { error: 'access_denied' }));
    });
    const { stdout, stderr } = buildCollectors();
    const exitMock = vi.fn() as unknown as (code: number) => never;

    await adminLoginHandler({
      mcpUrl: MCP_BASE,
      fetch: fetchMock,
      stdout,
      stderr,
      exit: exitMock,
      authFilePath: path.join(tmpDir, 'admin-auth.json'),
      intervalOverrideMs: 0,
    });

    expect(exitMock).toHaveBeenCalledWith(5);
  });

  // L-9: Server 503 (not configured) → exit 6
  it('L-9: server returns 503 on start → exit 6', async () => {
    const fetchMock = vi.fn().mockResolvedValue(makeResponse(503, { error: 'device_flow_not_configured' }));
    const { stdout, stderr, stderrLines } = buildCollectors();
    const exitMock = vi.fn() as unknown as (code: number) => never;

    await adminLoginHandler({
      mcpUrl: MCP_BASE,
      fetch: fetchMock,
      stdout,
      stderr,
      exit: exitMock,
      authFilePath: path.join(tmpDir, 'admin-auth.json'),
      intervalOverrideMs: 0,
    });

    expect(exitMock).toHaveBeenCalledWith(6);
    expect(stderrLines.join('\n')).toMatch(/not configured/i);
  });

  // L-11: slow_down — interval bumps up, never down
  it('L-11: slow_down — interval bumps up on retry_after increase, never decreases', async () => {
    // Server responds: pending (retry_after=3s), pending (retry_after=6s slow_down), then success.
    // We inject a sleepFn seam to capture each call's ms argument (no real waiting).
    const sleepCalls: number[] = [];
    const sleepFn = vi.fn().mockImplementation((ms: number) => {
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
    const exitMock = vi.fn() as unknown as (code: number) => never;
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

    expect(exitMock).not.toHaveBeenCalled();

    // sleep should have been called 3 times (once per poll iteration before each fetch)
    expect(sleepCalls).toHaveLength(3);

    // First sleep uses baseline (100ms); subsequent ones are bumped by retry_after * 1000.
    expect(sleepCalls[0]).toBe(100);    // baseline
    expect(sleepCalls[1]).toBe(3000);   // bumped after first pending (retry_after=3 → 3000ms > 100ms)
    expect(sleepCalls[2]).toBe(6000);   // bumped after second pending (retry_after=6 → 6000ms > 3000ms)

    // Never-decrease guard: calls are strictly increasing — no value went down.
    for (let i = 1; i < sleepCalls.length; i++) {
      expect(sleepCalls[i]).toBeGreaterThanOrEqual(sleepCalls[i - 1]!);
    }
  });

  // L-10: admin-auth.json shape + chmod 600
  it('L-10: admin-auth.json has { version: 1, token } and is chmod 600', async () => {
    const { fetchMock } = buildFetch(START_SUCCESS_BODY, [POLL_SUCCESS_BODY]);
    const { stdout, stderr } = buildCollectors();
    const exitMock = vi.fn() as unknown as (code: number) => never;
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
    expect(content).toEqual({ version: 1, token: FAKE_ADMIN_TOKEN });

    const stat = fs.statSync(authFilePath);
    expect(stat.mode & 0o777).toBe(0o600);
  });
});
