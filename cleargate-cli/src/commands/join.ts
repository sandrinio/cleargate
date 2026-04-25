/**
 * `cleargate join` — two-step identity-bound workspace invitation redemption.
 *
 * Flow:
 *  1. Parse invite URL/token.
 *  2. Pick provider (--auth flag, interactive picker, or error in non-interactive mode).
 *  3. POST /join/:token/challenge { provider } → get challengeId + clientHints.
 *  4. Drive provider flow:
 *     - GitHub: client-side device-flow polling (via identity-flow.startDeviceFlow).
 *     - Email: OTP prompt with 3-in-process retries (OD-3 resolution).
 *  5. POST /join/:token/complete { challenge_id, proof } → get refresh_token.
 *  6. Seat token via TokenStore.
 *
 * CR-006 EPIC-019.
 */
import * as os from 'node:os';
import { loadConfig } from '../config.js';
import { createTokenStore } from '../auth/factory.js';
import {
  pickProvider,
  startDeviceFlow,
  mapProviderError,
  DeviceFlowError,
  IdentityFlowError,
  type Provider,
} from '../auth/identity-flow.js';
import * as readline from 'node:readline';
import { Readable } from 'node:stream';

const UUID_V4_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// GitHub device-flow token endpoint (same as admin-login)
const GITHUB_DEVICE_FLOW_URL = 'https://github.com/login/oauth/access_token';

export interface JoinOptions {
  inviteUrl: string;
  profile: string;
  mcpUrlFlag?: string;
  /** Identity provider (--auth flag): 'github' | 'email'. */
  auth?: string;
  /** Non-interactive CI mode (--non-interactive flag). */
  nonInteractive?: boolean;
  /** Pre-seeded OTP code for non-interactive email auth (--code flag). */
  code?: string;
  /** Test seam: replaces globalThis.fetch */
  fetch?: typeof globalThis.fetch;
  /** Test seam: replaces createTokenStore */
  createStore?: typeof createTokenStore;
  /** Test seam: replaces os.hostname() */
  hostname?: () => string;
  /** Test seam: replaces process.stdout.write */
  stdout?: (s: string) => void;
  /** Test seam: replaces process.stderr.write */
  stderr?: (s: string) => void;
  /** Test seam: replaces process.exit */
  exit?: (code: number) => never;
  /** Test seam: replaces process.stdin for interactive prompts */
  stdin?: NodeJS.ReadableStream;
  /** Test seam: whether stdin is a TTY (default: process.stdin.isTTY) */
  isTTY?: boolean;
  /** Test seam: sleepFn for device-flow polling (default: real setTimeout) */
  sleepFn?: (ms: number) => Promise<void>;
  /** Test seam: override device-flow poll interval in ms (0 = instant in tests) */
  intervalOverrideMs?: number;
}

export async function joinHandler(opts: JoinOptions): Promise<void> {
  const fetchFn = opts.fetch ?? globalThis.fetch;
  const stdout = opts.stdout ?? ((s) => process.stdout.write(s));
  const stderr = opts.stderr ?? ((s) => process.stderr.write(s));
  const exit = opts.exit ?? ((c: number): never => process.exit(c));
  const hostname = opts.hostname ?? (() => os.hostname());
  const isTTY = opts.isTTY ?? (process.stdin.isTTY === true);

  // ── Parse inviteUrl → { token, baseUrl } ──────────────────────────────────
  let token: string;
  let baseUrl: string;

  try {
    if (UUID_V4_RE.test(opts.inviteUrl)) {
      // Bare UUID form — requires mcpUrl from config
      token = opts.inviteUrl;
      const cfg = loadConfig({
        flags: { profile: opts.profile, mcpUrl: opts.mcpUrlFlag },
      });
      if (!cfg.mcpUrl) {
        stderr(
          'cleargate: bare invite token requires mcpUrl. Pass --mcp-url <url> or set CLEARGATE_MCP_URL.\n',
        );
        exit(5);
        return;
      }
      baseUrl = cfg.mcpUrl;
    } else {
      // Full URL form: https://host/join/<uuid>
      const url = new URL(opts.inviteUrl);
      const m = url.pathname.match(/^\/join\/([0-9a-f-]{36})$/i);
      if (!m || !UUID_V4_RE.test(m[1]!)) {
        throw new Error('bad path');
      }
      token = m[1]!;
      baseUrl = url.origin;
    }
  } catch {
    stderr('cleargate: invalid invite URL or token format.\n');
    exit(5);
    return;
  }

  // ── Non-interactive guards ────────────────────────────────────────────────
  if (opts.nonInteractive && !opts.auth) {
    stderr('cleargate: --auth required in non-interactive mode\n');
    exit(1);
    return;
  }
  if (opts.nonInteractive && opts.auth === 'email' && !opts.code) {
    stderr('cleargate: --code required for email provider in non-interactive mode\n');
    exit(1);
    return;
  }
  if (opts.nonInteractive && opts.auth === 'github') {
    stderr('cleargate: GitHub auth requires browser interaction; use `--auth email` for non-interactive flows\n');
    exit(1);
    return;
  }

  // ── Pick provider ─────────────────────────────────────────────────────────
  let provider: Provider;
  try {
    provider = await pickProvider({
      flag: opts.auth,
      isTTY: !opts.nonInteractive && isTTY,
      available: ['github', 'email'],
      stdin: opts.stdin,
      stdout,
    });
  } catch (err) {
    if (err instanceof IdentityFlowError) {
      stderr(`${err.message}\n`);
      exit(1);
      return;
    }
    throw err;
  }

  // ── POST /challenge ────────────────────────────────────────────────────────
  let challengeRes: Response;
  try {
    challengeRes = await fetchFn(`${baseUrl}/join/${token}/challenge`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ provider }),
    });
  } catch (err) {
    stderr(
      `cleargate: cannot reach ${baseUrl} (${err instanceof Error ? err.message : String(err)}).\n`,
    );
    exit(2);
    return;
  }

  if (!challengeRes.ok) {
    const body = (await challengeRes.json().catch(() => ({}))) as { error?: string };
    const { message, exitCode } = mapProviderError(
      challengeRes.status,
      body.error ?? '',
      parseRetryAfter(challengeRes),
    );
    stderr(`${message}\n`);
    exit(exitCode);
    return;
  }

  let challengeBody: {
    challenge_id: string;
    provider: Provider;
    expires_in: number;
    client_hints: Record<string, unknown>;
  };
  try {
    challengeBody = (await challengeRes.json()) as typeof challengeBody;
  } catch {
    stderr('cleargate: server returned non-JSON response.\n');
    exit(7);
    return;
  }

  const challengeId = challengeBody.challenge_id;
  const clientHints = challengeBody.client_hints;

  // ── Drive provider-specific completion + POST /complete ────────────────────
  let completeRawBody: unknown;

  if (provider === 'github') {
    // ── GitHub device-flow: poll GitHub client-side, then POST /complete ──────
    const deviceCode = clientHints['device_code'] as string;
    const userCode = clientHints['user_code'] as string;
    const verificationUri = clientHints['verification_uri'] as string;
    const expiresIn = typeof clientHints['expires_in'] === 'number' ? clientHints['expires_in'] as number : 900;
    const interval = typeof clientHints['interval'] === 'number' ? clientHints['interval'] as number : 5;

    stdout(`Open the following URL in your browser and enter the code:\n`);
    stdout(`  URL:  ${verificationUri}\n`);
    stdout(`  Code: ${userCode}\n`);
    stdout(`  (Code expires in ${Math.floor(expiresIn / 60)} minutes)\n`);
    stdout('Waiting for authorization...\n');

    let accessToken: string;
    try {
      const result = await startDeviceFlow({
        deviceCode,
        interval,
        expiresIn,
        fetchPoll: async (dc) => {
          const res = await fetchFn(GITHUB_DEVICE_FLOW_URL, {
            method: 'POST',
            headers: {
              Accept: 'application/json',
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              device_code: dc,
              grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
            }),
          });
          return {
            status: res.status,
            json: () => res.json() as Promise<unknown>,
          };
        },
        ...(opts.sleepFn !== undefined ? { sleepFn: opts.sleepFn } : {}),
        ...(opts.intervalOverrideMs !== undefined ? { intervalOverrideMs: opts.intervalOverrideMs } : {}),
      });
      accessToken = result.accessToken;
    } catch (err) {
      if (err instanceof DeviceFlowError) {
        switch (err.code) {
          case 'access_denied':
            stderr('cleargate: access denied — you declined authorization in the browser.\n');
            exit(5);
            return;
          case 'expired_token':
            stderr('cleargate: device code expired — please re-run `cleargate join <url>`.\n');
            exit(5);
            return;
          case 'unreachable':
            stderr('cleargate: cannot reach GitHub. Check your connection and retry.\n');
            exit(2);
            return;
          default:
            stderr(`cleargate: GitHub device flow error: ${err.code}\n`);
            exit(6);
            return;
        }
      }
      stderr('cleargate: unexpected error during GitHub device flow\n');
      exit(6);
      return;
    }

    // POST /complete with access_token proof (OD-2 fix: server member-mode accepts access_token)
    // FLASHCARD 2026-04-18 #cli #plaintext-redact: named field access only, never log accessToken
    let completeRes: Response;
    try {
      completeRes = await fetchFn(`${baseUrl}/join/${token}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ challenge_id: challengeId, proof: { access_token: accessToken } }),
      });
    } catch (err) {
      stderr(`cleargate: cannot reach ${baseUrl} (${err instanceof Error ? err.message : String(err)}).\n`);
      exit(2);
      return;
    }

    if (!completeRes.ok) {
      const body = (await completeRes.json().catch(() => ({}))) as { error?: string };
      const { message, exitCode } = mapProviderError(
        completeRes.status,
        body.error ?? '',
        parseRetryAfter(completeRes),
      );
      stderr(`${message}\n`);
      exit(exitCode);
      return;
    }

    try {
      completeRawBody = await completeRes.json();
    } catch {
      stderr('cleargate: server returned non-JSON response.\n');
      exit(7);
      return;
    }
  } else {
    // ── Email magic-link: prompt for OTP with 3 retries (OD-3) ──────────────
    const sentTo = typeof clientHints['sent_to'] === 'string' ? clientHints['sent_to'] as string : '(unknown)';
    const maxRetries = 3;

    stdout(`We sent a 6-digit code to ${sentTo}.\n`);

    // CI mode: use pre-seeded code directly
    if (opts.code !== undefined) {
      let completeRes: Response;
      try {
        completeRes = await fetchFn(`${baseUrl}/join/${token}/complete`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({ challenge_id: challengeId, proof: { code: opts.code } }),
        });
      } catch (err) {
        stderr(`cleargate: cannot reach ${baseUrl} (${err instanceof Error ? err.message : String(err)}).\n`);
        exit(2);
        return;
      }

      if (!completeRes.ok) {
        const body = (await completeRes.json().catch(() => ({}))) as { error?: string };
        const { message, exitCode } = mapProviderError(
          completeRes.status,
          body.error ?? '',
          parseRetryAfter(completeRes),
        );
        stderr(`${message}\n`);
        exit(exitCode);
        return;
      }

      try {
        completeRawBody = await completeRes.json();
      } catch {
        stderr('cleargate: server returned non-JSON response.\n');
        exit(7);
        return;
      }
    } else {
      // Interactive: prompt up to maxRetries times
      const inputStream = (opts.stdin as Readable | undefined) ?? process.stdin;

      const rl = readline.createInterface({
        input: inputStream,
        output: undefined,
        terminal: false,
      });

      // Queue-based line reading (pattern from identity-flow.ts)
      const lineQueue: string[] = [];
      const lineWaiters: Array<(line: string) => void> = [];
      let rlClosed = false;

      rl.on('line', (line) => {
        const waiter = lineWaiters.shift();
        if (waiter) {
          waiter(line);
        } else {
          lineQueue.push(line);
        }
      });

      rl.once('close', () => {
        rlClosed = true;
        for (const waiter of lineWaiters.splice(0)) {
          waiter('');
        }
      });

      function readNextLine(): Promise<string> {
        if (lineQueue.length > 0) return Promise.resolve(lineQueue.shift()!);
        if (rlClosed) return Promise.resolve('');
        return new Promise<string>((resolve) => { lineWaiters.push(resolve); });
      }

      let succeeded = false;

      try {
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
          stdout('Enter code: ');
          const otpCode = (await readNextLine()).trim();

          let completeRes: Response;
          try {
            completeRes = await fetchFn(`${baseUrl}/join/${token}/complete`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
              body: JSON.stringify({ challenge_id: challengeId, proof: { code: otpCode } }),
            });
          } catch (err) {
            stderr(`cleargate: cannot reach ${baseUrl} (${err instanceof Error ? err.message : String(err)}).\n`);
            exit(2);
            return;
          }

          if (completeRes.ok) {
            try {
              completeRawBody = await completeRes.json();
            } catch {
              stderr('cleargate: server returned non-JSON response.\n');
              exit(7);
              return;
            }
            succeeded = true;
            break;
          }

          const body = (await completeRes.json().catch(() => ({}))) as { error?: string };
          const errorCode = body.error ?? '';

          // Terminal errors (don't retry)
          if (completeRes.status === 410 || errorCode === 'challenge_expired') {
            const { message, exitCode } = mapProviderError(completeRes.status, errorCode, parseRetryAfter(completeRes));
            stderr(`${message}\n`);
            exit(exitCode);
            return;
          }

          if (completeRes.status === 403 || (completeRes.status >= 400 && completeRes.status < 500 && errorCode !== 'provider_error')) {
            const { message, exitCode } = mapProviderError(completeRes.status, errorCode, parseRetryAfter(completeRes));
            stderr(`${message}\n`);
            exit(exitCode);
            return;
          }

          // Retryable (502 provider_error = wrong code)
          if (attempt < maxRetries) {
            stderr(`cleargate: code didn't match. ${maxRetries - attempt} attempt${maxRetries - attempt === 1 ? '' : 's'} remaining.\n`);
          }
        }
      } finally {
        rl.close();
      }

      if (!succeeded) {
        stderr(`cleargate: code didn't match after ${maxRetries} tries. Run \`cleargate join <url>\` again to get a new code.\n`);
        exit(12);
        return;
      }
    }
  }

  // ── Seat the refresh token ─────────────────────────────────────────────────
  const b = completeRawBody as {
    refresh_token?: unknown;
    project_name?: unknown;
    member_role?: unknown;
  };

  if (typeof b.refresh_token !== 'string' || typeof b.project_name !== 'string') {
    stderr('cleargate: server returned unexpected response shape.\n');
    exit(7);
    return;
  }

  // Named field access — b.refresh_token is a bare string, never logged
  const refreshToken: string = b.refresh_token;
  const projectName: string = b.project_name;

  try {
    const store = await (opts.createStore ?? createTokenStore)();
    await store.save(opts.profile, refreshToken);

    // ── Success output ─────────────────────────────────────────────────────
    stdout(`joined project '${projectName}' as '${hostname()}'\n`);
    stdout(`refresh token saved to ${store.backend}.\n`);
  } catch (err) {
    stderr(
      `cleargate: internal error: ${err instanceof Error ? err.message : String(err)}\n`,
    );
    exit(99);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function parseRetryAfter(res: Response): number | undefined {
  const hdr = res.headers?.get?.('retry-after');
  if (!hdr) return undefined;
  const n = parseInt(hdr, 10);
  return isNaN(n) ? undefined : n;
}
