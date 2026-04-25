/**
 * Shared identity-flow helpers for `cleargate join` and `cleargate admin login`.
 *
 * Exposes:
 *  - pickProvider     — flag > required_provider pin > interactive picker > error
 *  - promptPicker     — numbered list via node:readline (no new dep)
 *  - startDeviceFlow  — GitHub device-flow poll loop (admin-login + member join)
 *  - promptEmailOTP   — 6-digit OTP prompt with up to 3 retries (OD-3)
 *  - mapProviderError — HTTP-status + error-code → { message, exitCode, retryable }
 *  - IdentityFlowError, DeviceFlowError typed error classes
 *
 * Test seams: functions that read from stdin or prompt accept
 * `{ stdin: NodeJS.ReadableStream, stdout: (s: string) => void }` as an
 * options object so tests can inject a pre-seeded Readable and capture output
 * without real TTY interaction.
 *
 * No new npm dependencies — uses only node:readline (built-in).
 *
 * CR-006 EPIC-019.
 */
import * as readline from 'node:readline';
import { Readable } from 'node:stream';

// ─────────────────────────────────────────────────────────────────────────────
// Error classes
// ─────────────────────────────────────────────────────────────────────────────

export class IdentityFlowError extends Error {
  constructor(
    public readonly code: string,
    message?: string,
  ) {
    super(message ?? code);
    this.name = 'IdentityFlowError';
  }
}

export class DeviceFlowError extends Error {
  constructor(
    public readonly code:
      | 'access_denied'
      | 'expired_token'
      | 'not_admin'
      | 'timeout'
      | 'unreachable'
      | 'server_error',
    message?: string,
  ) {
    super(message ?? code);
    this.name = 'DeviceFlowError';
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type Provider = 'github' | 'email';

export interface PickProviderOptions {
  /** Explicit --auth flag value (wins over everything). */
  flag?: string;
  /** Is the process running in a real TTY? */
  isTTY?: boolean;
  /** Available providers (default: ['github', 'email']). */
  available?: Provider[];
  /** Stdin stream for interactive picker (test seam). */
  stdin?: NodeJS.ReadableStream;
  /** Stdout function for interactive picker (test seam). */
  stdout?: (s: string) => void;
}

export interface StartDeviceFlowOptions {
  /** The device_code from the challenge client_hints. */
  deviceCode: string;
  /** Poll interval in seconds (from client_hints). */
  interval: number;
  /** How long until the device code expires in seconds. */
  expiresIn: number;
  /**
   * Function to POST to the poll endpoint.
   * Returns a Response-like object with status + json().
   */
  fetchPoll: (deviceCode: string) => Promise<{ status: number; json: () => Promise<unknown> }>;
  /**
   * Sleep implementation — injected in tests to avoid real waits.
   * Defaults to real setTimeout.
   */
  sleepFn?: (ms: number) => Promise<void>;
  /**
   * Override the base interval in milliseconds (used in tests — set to 0 to skip waits).
   * When provided, overrides `interval` from the server. Bump logic still applies if sleepFn is also provided.
   */
  intervalOverrideMs?: number;
  /**
   * Grace period beyond expiresIn before declaring timeout.
   * Default: 10_000ms (10 seconds for round-trip latency).
   */
  deadlineGraceMs?: number;
}

export interface StartDeviceFlowResult {
  /** GitHub access_token returned by device-flow polling. */
  accessToken: string;
}

export interface PromptEmailOTPOptions {
  /** Masked email shown to user, e.g. "a***@example.com". */
  sentTo: string;
  /** Pre-seeded code (CI / --code flag). If provided, skips prompt entirely. */
  code?: string;
  /** Number of in-process retries. Default: 3. */
  maxRetries?: number;
  /**
   * Function that performs one POST /complete attempt with the given OTP code.
   * Returns an object indicating success or a known error code.
   */
  attemptComplete: (code: string) => Promise<{ success: boolean; errorCode?: string }>;
  /** Stdin stream (test seam — default: process.stdin). */
  stdin?: NodeJS.ReadableStream;
  /** Stdout function (test seam). */
  stdout?: (s: string) => void;
  /** Stderr function (test seam). */
  stderr?: (s: string) => void;
}

export interface MapProviderErrorResult {
  message: string;
  exitCode: number;
  retryable: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// pickProvider
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Resolves which provider to use for a join flow.
 *
 * Priority: flag > interactive picker > error (non-TTY)
 * Throws IdentityFlowError('provider_required') when non-interactive and no flag.
 * Throws IdentityFlowError('provider_unknown') when flag names an unrecognised provider.
 */
export async function pickProvider(opts: PickProviderOptions): Promise<Provider> {
  const available: Provider[] = opts.available ?? ['github', 'email'];

  if (opts.flag !== undefined) {
    const flagLower = opts.flag.toLowerCase() as Provider;
    if (!available.includes(flagLower)) {
      throw new IdentityFlowError(
        'provider_unknown',
        `cleargate: unknown provider '${opts.flag}'. Available: ${available.join(', ')}`,
      );
    }
    return flagLower;
  }

  // No flag — need TTY for interactive picker
  if (!opts.isTTY) {
    throw new IdentityFlowError(
      'provider_required',
      'cleargate: --auth required in non-interactive mode',
    );
  }

  // Auto-select if only one provider
  if (available.length === 1) {
    return available[0]!;
  }

  return promptPicker(available, opts);
}

// ─────────────────────────────────────────────────────────────────────────────
// promptPicker
// ─────────────────────────────────────────────────────────────────────────────

const PROVIDER_LABELS: Record<Provider, string> = {
  github: 'GitHub OAuth',
  email: 'Email magic-link',
};

/**
 * Interactive numbered-list picker using node:readline.
 * Renders "How would you like to verify your email?" + numbered list.
 */
export async function promptPicker(
  options: Provider[],
  { stdin, stdout }: { stdin?: NodeJS.ReadableStream; stdout?: (s: string) => void } = {},
): Promise<Provider> {
  const write = stdout ?? ((s: string) => process.stdout.write(s));

  write('How would you like to verify your email?\n');
  options.forEach((p, i) => {
    write(`  ${i + 1}. ${PROVIDER_LABELS[p]}\n`);
  });
  write(`Choice [1-${options.length}]: `);

  const inputStream = (stdin as Readable | undefined) ?? process.stdin;

  return new Promise<Provider>((resolve, reject) => {
    let settled = false;
    const rl = readline.createInterface({
      input: inputStream,
      output: undefined,
      terminal: false,
    });

    rl.once('line', (line) => {
      settled = true;
      rl.close();
      const idx = parseInt(line.trim(), 10) - 1;
      if (isNaN(idx) || idx < 0 || idx >= options.length) {
        reject(
          new IdentityFlowError(
            'invalid_choice',
            `cleargate: invalid choice '${line.trim()}'. Enter a number between 1 and ${options.length}.`,
          ),
        );
        return;
      }
      resolve(options[idx]!);
    });

    rl.once('error', (err) => {
      if (!settled) {
        settled = true;
        reject(err);
      }
    });
    rl.once('close', () => {
      // Only reject if we haven't already resolved/rejected from the line event
      if (!settled) {
        settled = true;
        reject(new IdentityFlowError('provider_required', 'cleargate: no provider selected'));
      }
    });
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// startDeviceFlow
// ─────────────────────────────────────────────────────────────────────────────

function defaultSleep(ms: number): Promise<void> {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

/**
 * Polls fetchPoll until the device is authorized or an error terminal state is reached.
 *
 * Used for both admin-login (polls /admin-api/v1/auth/device/poll) and
 * member-join GitHub flow (polls https://github.com/login/oauth/access_token).
 *
 * Returns { accessToken } on success.
 * Throws DeviceFlowError on terminal failure.
 */
export async function startDeviceFlow(opts: StartDeviceFlowOptions): Promise<StartDeviceFlowResult> {
  const sleepFn = opts.sleepFn ?? defaultSleep;
  let currentIntervalMs =
    opts.intervalOverrideMs !== undefined
      ? opts.intervalOverrideMs
      : Math.max(opts.interval, 5) * 1000;

  const expiresAtMs = Date.now() + opts.expiresIn * 1000;
  const deadline = expiresAtMs + (opts.deadlineGraceMs ?? 10_000);

  while (Date.now() < deadline) {
    await sleepFn(currentIntervalMs);

    let pollRes: { status: number; json: () => Promise<unknown> };
    try {
      pollRes = await opts.fetchPoll(opts.deviceCode);
    } catch {
      throw new DeviceFlowError('unreachable');
    }

    if (pollRes.status === 403) {
      let body: Record<string, unknown> = {};
      try {
        body = (await pollRes.json()) as Record<string, unknown>;
      } catch {
        // ignore parse failure
      }
      if (body['error'] === 'access_denied') {
        throw new DeviceFlowError('access_denied');
      }
      // not_admin
      throw new DeviceFlowError('not_admin');
    }

    if (pollRes.status === 410) {
      throw new DeviceFlowError('expired_token');
    }

    if (!pollRes.status || pollRes.status < 200 || pollRes.status >= 300) {
      if (pollRes.status >= 500 || pollRes.status < 100) {
        throw new DeviceFlowError('server_error');
      }
    }

    let body: Record<string, unknown>;
    try {
      body = (await pollRes.json()) as Record<string, unknown>;
    } catch {
      throw new DeviceFlowError('server_error');
    }

    // Handle GitHub's device-flow pending responses
    const errorField = body['error'];
    if (typeof errorField === 'string') {
      if (errorField === 'authorization_pending') {
        // keep polling
        continue;
      }
      if (errorField === 'slow_down') {
        // bump interval if retry_after is larger
        const retryAfter = body['interval'];
        if (typeof retryAfter === 'number') {
          const bumped = retryAfter * 1000;
          if (bumped > currentIntervalMs) {
            currentIntervalMs = bumped;
          }
        } else {
          // default slow_down bump: +5s
          currentIntervalMs += 5_000;
        }
        continue;
      }
      if (errorField === 'access_denied') {
        throw new DeviceFlowError('access_denied');
      }
      if (errorField === 'expired_token') {
        throw new DeviceFlowError('expired_token');
      }
      // unknown error — treat as server error
      throw new DeviceFlowError('server_error');
    }

    // Handle MCP server's pending response shape { pending: true, retry_after? }
    if (body['pending'] === true) {
      const shouldApplyBump =
        opts.sleepFn !== undefined || opts.intervalOverrideMs === undefined;
      if (shouldApplyBump && typeof body['retry_after'] === 'number') {
        const bumped = (body['retry_after'] as number) * 1000;
        if (bumped > currentIntervalMs) {
          currentIntervalMs = bumped;
        }
      }
      continue;
    }

    // Success — extract access_token (GitHub device-flow: access_token field)
    if (typeof body['access_token'] === 'string') {
      return { accessToken: body['access_token'] as string };
    }

    // MCP server success shape (admin_token for admin-login)
    if (typeof body['admin_token'] === 'string') {
      return { accessToken: body['admin_token'] as string };
    }

    throw new DeviceFlowError('server_error');
  }

  throw new DeviceFlowError('timeout');
}

// ─────────────────────────────────────────────────────────────────────────────
// promptEmailOTP
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Prompts user for a 6-digit OTP code and attempts /complete up to maxRetries (default: 3) times.
 *
 * OD-3 resolution: 3 in-process retries for interactive UX; same challenge_id is reused each time.
 * Server MagicLinkProvider treats each /complete as independent — 502 on first attempt
 * does NOT burn the challenge (verified mcp/src/routes/join.ts:244-255).
 *
 * If `code` is provided (CI / --code flag), it is used directly without any prompt or retry.
 *
 * Returns the final code string on success.
 * Throws IdentityFlowError('otp_max_retries') after maxRetries failures.
 * Throws IdentityFlowError('otp_expired') on 410 challenge_expired.
 */
export async function promptEmailOTP(opts: PromptEmailOTPOptions): Promise<string> {
  const write = opts.stdout ?? ((s: string) => process.stdout.write(s));
  const writeErr = opts.stderr ?? ((s: string) => process.stderr.write(s));
  const maxRetries = opts.maxRetries ?? 3;

  write(`We sent a 6-digit code to ${opts.sentTo}.\n`);

  // CI mode: use provided code directly (no prompt, no retry)
  if (opts.code !== undefined) {
    const result = await opts.attemptComplete(opts.code);
    if (result.success) {
      return opts.code;
    }
    if (result.errorCode === 'challenge_expired') {
      throw new IdentityFlowError(
        'otp_expired',
        `cleargate: code expired. Re-run \`cleargate join <url>\` to start over`,
      );
    }
    throw new IdentityFlowError(
      'otp_failed',
      `cleargate: code didn't match. Re-run \`cleargate join <url>\` to try again`,
    );
  }

  const inputStream = (opts.stdin as Readable | undefined) ?? process.stdin;

  // Create a single readline interface that persists across all retry attempts.
  // Each readLineFromRl() call reads exactly one line from the interface.
  const rl = readline.createInterface({
    input: inputStream,
    output: undefined,
    terminal: false,
  });

  // Collect queued lines from the rl interface
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
    // Drain any pending waiters with empty string (stream ended)
    for (const waiter of lineWaiters.splice(0)) {
      waiter('');
    }
  });

  function readNextLine(): Promise<string> {
    if (lineQueue.length > 0) {
      return Promise.resolve(lineQueue.shift()!);
    }
    if (rlClosed) {
      return Promise.resolve('');
    }
    return new Promise<string>((resolve) => {
      lineWaiters.push(resolve);
    });
  }

  try {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      write('Enter code: ');
      const code = (await readNextLine()).trim();

      const result = await opts.attemptComplete(code);

      if (result.success) {
        return code;
      }

      if (result.errorCode === 'challenge_expired') {
        throw new IdentityFlowError(
          'otp_expired',
          `cleargate: code expired. Re-run \`cleargate join <url>\` to start over`,
        );
      }

      if (attempt < maxRetries) {
        writeErr(`cleargate: code didn't match. ${maxRetries - attempt} attempt${maxRetries - attempt === 1 ? '' : 's'} remaining.\n`);
      }
    }
  } finally {
    rl.close();
  }

  throw new IdentityFlowError(
    'otp_max_retries',
    `cleargate: code didn't match after ${maxRetries} tries. Run \`cleargate join <url>\` again to get a new code.`,
  );
}

// readLine is no longer used (replaced by shared rl in promptEmailOTP)
// Kept as a dead-code stub for any future one-shot callers.

// ─────────────────────────────────────────────────────────────────────────────
// mapProviderError
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Maps server HTTP status + error code pairs into user-readable messages and exit codes.
 *
 * Error table per M3 §2:
 *  400 invalid_request          → exit 7
 *  400 provider_not_allowed     → exit 9
 *  400 provider_unknown         → exit 9
 *  400 identity_proof_required  → exit 11 (stale CLI upgrade hint)
 *  403 email_mismatch           → exit 10
 *  404 not_found                → exit 4
 *  410 invite_expired           → exit 3
 *  410 invite_already_consumed  → exit 3
 *  410 challenge_expired        → exit 3
 *  429                          → exit 8
 *  502 provider_error           → exit 12
 *  >=500 (other)                → exit 6
 */
export function mapProviderError(
  httpStatus: number,
  errorCode: string,
  retryAfterSeconds?: number,
): MapProviderErrorResult {
  if (httpStatus === 400) {
    switch (errorCode) {
      case 'provider_not_allowed':
        return {
          message:
            'cleargate: this invite requires a different provider — re-run with `--auth <pinned>`',
          exitCode: 9,
          retryable: true,
        };
      case 'provider_unknown':
        return {
          message:
            'cleargate: server does not have that provider registered — contact the project admin',
          exitCode: 9,
          retryable: false,
        };
      case 'identity_proof_required':
        return {
          message: 'cleargate: this CLI is out of date — please upgrade and retry (`npm i -g cleargate@latest`)',
          exitCode: 11,
          retryable: false,
        };
      default:
        return {
          message: 'cleargate: invalid request to server (please file a bug)',
          exitCode: 7,
          retryable: false,
        };
    }
  }

  if (httpStatus === 403 && errorCode === 'email_mismatch') {
    return {
      message:
        'cleargate: verified email does not match the invitee — ask your admin to re-issue the invite',
      exitCode: 10,
      retryable: false,
    };
  }

  if (httpStatus === 404) {
    return {
      message: 'cleargate: invite not found',
      exitCode: 4,
      retryable: false,
    };
  }

  if (httpStatus === 410) {
    switch (errorCode) {
      case 'invite_expired':
        return {
          message: 'cleargate: invite expired. Request a new invite',
          exitCode: 3,
          retryable: false,
        };
      case 'invite_already_consumed':
        return {
          message: 'cleargate: invite already consumed. Request a new invite',
          exitCode: 3,
          retryable: false,
        };
      case 'challenge_expired':
        return {
          message: 'cleargate: code expired. Re-run `cleargate join <url>` to start over',
          exitCode: 3,
          retryable: false,
        };
      default:
        return {
          message: 'cleargate: invite no longer valid. Request a new invite',
          exitCode: 3,
          retryable: false,
        };
    }
  }

  if (httpStatus === 429) {
    const retryHint = retryAfterSeconds !== undefined ? `${retryAfterSeconds}` : '900';
    return {
      message: `cleargate: too many requests. Retry after ${retryHint}s`,
      exitCode: 8,
      retryable: true,
    };
  }

  if (httpStatus === 502 && errorCode === 'provider_error') {
    return {
      message: "cleargate: code didn't match. Try again, or restart with `cleargate join <url>`",
      exitCode: 12,
      retryable: true,
    };
  }

  if (httpStatus >= 500) {
    return {
      message: `cleargate: server error ${httpStatus}`,
      exitCode: 6,
      retryable: false,
    };
  }

  return {
    message: `cleargate: unexpected error ${httpStatus} ${errorCode}`,
    exitCode: 7,
    retryable: false,
  };
}
