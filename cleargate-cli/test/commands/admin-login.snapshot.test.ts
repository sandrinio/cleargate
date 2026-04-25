/**
 * Snapshot regression test for `cleargate admin login` CLI stdout.
 *
 * R-03: Admin-login UX is a byte-identical-preservation contract.
 * This test captures the EXACT stdout lines of the L-1 happy path
 * and locks them against the GitHubProvider refactor.
 *
 * Run BEFORE any server-side refactor to capture pre-refactor bytes.
 * Re-run AFTER refactor — must stay green (same output).
 *
 * CR-004 EPIC-019.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { adminLoginHandler } from '../../src/commands/admin-login.js';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers (copied from admin-login.test.ts to avoid import coupling)
// ─────────────────────────────────────────────────────────────────────────────

const MCP_BASE = 'http://localhost:3000';
const FAKE_DEVICE_CODE = 'test-device-code-snapshot';
const FAKE_USER_CODE = 'SNAP-1234';
const FAKE_VERIFICATION_URI = 'https://github.com/login/device';
const FAKE_ADMIN_TOKEN = 'eyJ_FAKE_SNAPSHOT_TOKEN';
const FAKE_EXPIRES_AT = '2099-01-01T00:00:00.000Z'; // fixed ISO so snapshot is deterministic
const FAKE_ADMIN_USER_ID = '00000000-0000-4000-8000-000000000099';

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

function buildFetch(startBody: unknown, pollBodies: unknown[]) {
  let pollIndex = 0;
  return vi.fn().mockImplementation((url: string) => {
    if (typeof url === 'string' && url.includes('/auth/device/start')) {
      return Promise.resolve(makeResponse(200, startBody));
    }
    if (typeof url === 'string' && url.includes('/auth/device/poll')) {
      const body = pollBodies[Math.min(pollIndex, pollBodies.length - 1)];
      pollIndex++;
      return Promise.resolve(makeResponse(200, body));
    }
    return Promise.reject(new Error(`Unexpected fetch: ${String(url)}`));
  });
}

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'admin-login-snapshot-test-'));
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

// ─────────────────────────────────────────────────────────────────────────────
// Snapshot test
// ─────────────────────────────────────────────────────────────────────────────

describe('adminLoginHandler stdout snapshot', () => {
  /**
   * L-snapshot: Happy-path stdout must match exact byte sequence.
   * This test is the regression contract for R-03: any change to
   * the printed lines will fail here and require an explicit snapshot update.
   */
  it('L-snapshot: happy path stdout is byte-identical to pre-refactor output', async () => {
    const fetchMock = buildFetch(START_SUCCESS_BODY, [POLL_PENDING_BODY, POLL_SUCCESS_BODY]);
    const stdoutLines: string[] = [];
    const stderrLines: string[] = [];
    const exitMock = vi.fn() as unknown as (code: number) => never;
    const authFilePath = path.join(tmpDir, 'admin-auth.json');

    await adminLoginHandler({
      mcpUrl: MCP_BASE,
      fetch: fetchMock,
      stdout: (msg) => stdoutLines.push(msg),
      stderr: (msg) => stderrLines.push(msg),
      exit: exitMock,
      authFilePath,
      intervalOverrideMs: 0,
    });

    expect(exitMock).not.toHaveBeenCalled();
    expect(stderrLines).toHaveLength(0);

    // Snapshot the exact stdout lines.
    // IMPORTANT: admin_token must NOT appear in any line (secrets guard).
    const stdoutText = stdoutLines.join('\n');
    expect(stdoutText).not.toContain(FAKE_ADMIN_TOKEN);

    // Exact snapshot — updating this requires an intentional `vitest --update-snapshots`.
    expect(stdoutLines).toMatchInlineSnapshot(`
      [
        "Open the following URL in your browser and enter the code:",
        "  URL:  https://github.com/login/device",
        "  Code: SNAP-1234",
        "  (Code expires in 15 minutes)",
        "Waiting for authorization...",
        "Logged in successfully. Token expires 2099-01-01T00:00:00.000Z.",
        "Credentials saved to ${authFilePath} (chmod 600).",
      ]
    `);
  });
});
