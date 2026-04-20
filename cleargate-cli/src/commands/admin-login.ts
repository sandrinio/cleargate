/**
 * `cleargate admin login` — GitHub OAuth device flow for admin CLI login.
 *
 * Flow:
 *  1. POST <mcp-url>/admin-api/v1/auth/device/start → gets device_code + user_code + verification_uri.
 *  2. Prints the verification URL and user code for the operator to open in a browser.
 *  3. Polls POST /admin-api/v1/auth/device/poll every `interval` seconds.
 *  4. On success: writes ~/.cleargate/admin-auth.json { version: 1, token: <admin_jwt> } at chmod 600.
 *  5. On failure: prints a clear error message and exits with appropriate exit code.
 *
 * Exit codes (per STORY-005-06 spec):
 *  0 — success
 *  3 — network error (unreachable)
 *  4 — auth rejected (non-admin GitHub user — not_admin)
 *  5 — device-flow timeout or user denied (expired_token / access_denied)
 *  6 — other device-flow error
 *  99 — unhandled
 *
 * Secrets NEVER appear on stdout/stderr: neither the GitHub access token
 * (server-side only) nor the admin JWT.
 *
 * STORY-005-06.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface DeviceStartResponse {
  device_code: string;
  user_code: string;
  verification_uri: string;
  expires_in: number;
  interval: number;
}

export interface DevicePollPendingResponse {
  pending: true;
  retry_after?: number;
}

export interface DevicePollSuccessResponse {
  pending: false;
  admin_token: string;
  expires_at: string;
  admin_user_id: string;
}

export type DevicePollResponse = DevicePollPendingResponse | DevicePollSuccessResponse;

// ─────────────────────────────────────────────────────────────────────────────
// Options / seams
// ─────────────────────────────────────────────────────────────────────────────

export interface AdminLoginOptions {
  mcpUrl?: string;
  env?: NodeJS.ProcessEnv;
  homedir?: () => string;
  fetch?: typeof globalThis.fetch;
  stdout?: (msg: string) => void;
  stderr?: (msg: string) => void;
  exit?: (code: number) => never;
  /** Override polling interval in milliseconds (used in tests to avoid real waits) */
  intervalOverrideMs?: number;
  /** Override admin-auth file path */
  authFilePath?: string;
  /** Override sleep implementation — injected in tests to capture interval values */
  sleepFn?: (ms: number) => Promise<void>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const DEFAULT_MCP_URL = 'http://localhost:3000';

/** Sleep helper — exported so tests can spy on it. */
export function sleep(ms: number): Promise<void> {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

function resolveMcpUrl(mcpUrlFlag?: string, env?: NodeJS.ProcessEnv): string {
  return (
    mcpUrlFlag ??
    (env ?? process.env)['CLEARGATE_MCP_URL'] ??
    DEFAULT_MCP_URL
  ).replace(/\/$/, '');
}

function resolveAuthFilePath(opts: AdminLoginOptions): string {
  if (opts.authFilePath) return opts.authFilePath;
  const homedirFn = opts.homedir ?? os.homedir;
  return path.join(homedirFn(), '.cleargate', 'admin-auth.json');
}

function writeAdminAuth(filePath: string, token: string): void {
  const dir = path.dirname(filePath);
  fs.mkdirSync(dir, { recursive: true });
  const payload = JSON.stringify({ version: 1, token }, null, 2);
  fs.writeFileSync(filePath, payload, { encoding: 'utf8', mode: 0o600 });
  // Explicit chmod in case the file already existed with wider permissions
  fs.chmodSync(filePath, 0o600);
}

// ─────────────────────────────────────────────────────────────────────────────
// Main handler
// ─────────────────────────────────────────────────────────────────────────────

export async function adminLoginHandler(opts: AdminLoginOptions = {}): Promise<void> {
  const fetchFn = opts.fetch ?? globalThis.fetch;
  const stdout = opts.stdout ?? ((msg: string) => process.stdout.write(msg + '\n'));
  const stderr = opts.stderr ?? ((msg: string) => process.stderr.write(msg + '\n'));
  const exitFn = opts.exit ?? ((code: number): never => process.exit(code));
  const sleepFn = opts.sleepFn ?? sleep;
  const mcpBase = resolveMcpUrl(opts.mcpUrl, opts.env);

  // ── Step 1: Start device flow ──────────────────────────────────────────────
  let startData: DeviceStartResponse;
  try {
    const startRes = await fetchFn(`${mcpBase}/admin-api/v1/auth/device/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    });

    if (!startRes.ok) {
      const body = (await startRes.json().catch(() => ({}))) as { error?: string };
      if (startRes.status === 503) {
        stderr('cleargate: error: device flow not configured on the server (CLEARGATE_GITHUB_CLI_CLIENT_ID not set).');
        return exitFn(6);
      }
      stderr(`cleargate: error: server error ${startRes.status}: ${body.error ?? 'unknown'}`);
      return exitFn(6);
    }

    startData = (await startRes.json()) as DeviceStartResponse;
  } catch (err) {
    stderr(`cleargate: error: cannot reach ${mcpBase} (${err instanceof Error ? err.message : String(err)})`);
    return exitFn(3);
  }

  // ── Step 2: Display instructions ───────────────────────────────────────────
  stdout(`Open the following URL in your browser and enter the code:`);
  stdout(`  URL:  ${startData.verification_uri}`);
  stdout(`  Code: ${startData.user_code}`);
  stdout(`  (Code expires in ${Math.floor(startData.expires_in / 60)} minutes)`);
  stdout('Waiting for authorization...');

  // ── Step 3: Poll until success, timeout, or denial ─────────────────────────
  // currentInterval is mutable: server may send slow_down (retry_after bump).
  let currentInterval = opts.intervalOverrideMs ?? Math.max(startData.interval, 5) * 1000;
  const expiresAtMs = Date.now() + startData.expires_in * 1000;

  // Give 10 seconds of grace beyond expires_in for round-trip latency
  const deadline = expiresAtMs + 10_000;

  let successData: DevicePollSuccessResponse | null = null;

  while (Date.now() < deadline) {
    await sleepFn(currentInterval);

    let pollRes: Response;
    try {
      pollRes = await fetchFn(`${mcpBase}/admin-api/v1/auth/device/poll`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ device_code: startData.device_code }),
      });
    } catch (err) {
      stderr(`cleargate: error: network error while polling (${err instanceof Error ? err.message : String(err)})`);
      return exitFn(3);
    }

    // Handle terminal error responses
    if (pollRes.status === 403) {
      const body = (await pollRes.json().catch(() => ({}))) as { error?: string };
      if (body.error === 'access_denied') {
        stderr('cleargate: error: access denied — you declined authorization in the browser.');
        return exitFn(5);
      }
      // not_admin
      stderr('cleargate: error: your GitHub account is not authorized as an admin user.');
      return exitFn(4);
    }
    if (pollRes.status === 410) {
      stderr('cleargate: error: device code expired — please run `cleargate admin login` again.');
      return exitFn(5);
    }
    if (!pollRes.ok) {
      const body = (await pollRes.json().catch(() => ({}))) as { error?: string };
      stderr(`cleargate: error: unexpected server response ${pollRes.status}: ${body.error ?? 'unknown'}`);
      return exitFn(6);
    }

    const pollBody = (await pollRes.json()) as DevicePollResponse;

    if (pollBody.pending) {
      // Apply slow_down: only bump UP, never decrease.
      // Skip bump when intervalOverrideMs is provided without a sleepFn — those
      // callers use intervalOverrideMs: 0 as a test seam and don't expect bumps.
      const shouldApplyBump = opts.sleepFn !== undefined || opts.intervalOverrideMs === undefined;
      if (shouldApplyBump && pollBody.retry_after !== undefined) {
        const bumped = pollBody.retry_after * 1000;
        if (bumped > currentInterval) {
          currentInterval = bumped;
        }
      }
      continue;
    }

    // Success!
    successData = pollBody;
    break;
  }

  if (!successData) {
    stderr('cleargate: error: timed out waiting for authorization. Please try again.');
    return exitFn(5);
  }

  // ── Step 4: Write admin-auth.json ──────────────────────────────────────────
  const authFilePath = resolveAuthFilePath(opts);
  try {
    writeAdminAuth(authFilePath, successData.admin_token);
  } catch (err) {
    stderr(`cleargate: error: failed to write ${authFilePath}: ${err instanceof Error ? err.message : String(err)}`);
    return exitFn(99);
  }

  // ── Step 5: Success message (no secrets in output) ─────────────────────────
  stdout(`Logged in successfully. Token expires ${successData.expires_at}.`);
  stdout(`Credentials saved to ${authFilePath} (chmod 600).`);
}
