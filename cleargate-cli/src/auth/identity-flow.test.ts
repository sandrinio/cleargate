/**
 * Unit tests for identity-flow helpers.
 *
 * All stdin interactions use injected Readable.from() seams.
 * No real TTY, no real network calls.
 *
 * CR-006 EPIC-019.
 */
import { describe, it, expect, vi } from 'vitest';
import { Readable } from 'node:stream';
import {
  pickProvider,
  promptPicker,
  startDeviceFlow,
  promptEmailOTP,
  mapProviderError,
  IdentityFlowError,
  DeviceFlowError,
} from './identity-flow.js';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function makeReadable(lines: string[]): Readable {
  return Readable.from(lines.map((l) => l + '\n').join(''));
}

function makeStdout() {
  const lines: string[] = [];
  const write = (s: string) => { lines.push(s); };
  return { write, lines };
}

// ─────────────────────────────────────────────────────────────────────────────
// pickProvider
// ─────────────────────────────────────────────────────────────────────────────

describe('pickProvider', () => {
  it('flag wins — returns github', async () => {
    const result = await pickProvider({ flag: 'github', isTTY: false });
    expect(result).toBe('github');
  });

  it('flag wins — returns email', async () => {
    const result = await pickProvider({ flag: 'email', isTTY: false });
    expect(result).toBe('email');
  });

  it('unknown flag → throws IdentityFlowError(provider_unknown)', async () => {
    await expect(pickProvider({ flag: 'google', isTTY: false })).rejects.toMatchObject({
      code: 'provider_unknown',
    });
  });

  it('no flag, non-TTY → throws IdentityFlowError(provider_required)', async () => {
    await expect(pickProvider({ isTTY: false })).rejects.toMatchObject({
      code: 'provider_required',
    });
  });

  it('no flag, TTY, single provider → auto-selects without prompt', async () => {
    const result = await pickProvider({
      isTTY: true,
      available: ['email'],
    });
    expect(result).toBe('email');
  });

  it('no flag, TTY, multi-provider → interactive picker (selects option 2)', async () => {
    const { write } = makeStdout();
    const result = await pickProvider({
      isTTY: true,
      available: ['github', 'email'],
      stdin: makeReadable(['2']),
      stdout: write,
    });
    expect(result).toBe('email');
  });

  it('no flag, TTY, multi-provider → interactive picker (selects option 1)', async () => {
    const { write } = makeStdout();
    const result = await pickProvider({
      isTTY: true,
      available: ['github', 'email'],
      stdin: makeReadable(['1']),
      stdout: write,
    });
    expect(result).toBe('github');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// promptPicker
// ─────────────────────────────────────────────────────────────────────────────

describe('promptPicker', () => {
  it('renders numbered list and returns selected provider', async () => {
    const { write, lines } = makeStdout();
    const result = await promptPicker(['github', 'email'], {
      stdin: makeReadable(['1']),
      stdout: write,
    });
    expect(result).toBe('github');
    expect(lines.join('')).toContain('GitHub OAuth');
    expect(lines.join('')).toContain('Email magic-link');
  });

  it('invalid choice → throws IdentityFlowError(invalid_choice)', async () => {
    const { write } = makeStdout();
    await expect(
      promptPicker(['github', 'email'], {
        stdin: makeReadable(['5']),
        stdout: write,
      }),
    ).rejects.toMatchObject({ code: 'invalid_choice' });
  });

  it('prompt includes "How would you like to verify your email?"', async () => {
    const { write, lines } = makeStdout();
    await promptPicker(['github', 'email'], {
      stdin: makeReadable(['1']),
      stdout: write,
    });
    expect(lines.join('')).toContain('How would you like to verify your email?');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// startDeviceFlow
// ─────────────────────────────────────────────────────────────────────────────

describe('startDeviceFlow — happy path', () => {
  it('pending then access_token → returns accessToken', async () => {
    let call = 0;
    const fetchPoll = vi.fn().mockImplementation(() => {
      call++;
      if (call === 1) {
        return Promise.resolve({
          status: 200,
          json: () => Promise.resolve({ error: 'authorization_pending' }),
        });
      }
      return Promise.resolve({
        status: 200,
        json: () => Promise.resolve({ access_token: 'gho_abc123' }),
      });
    });

    const result = await startDeviceFlow({
      deviceCode: 'test-device-code',
      interval: 5,
      expiresIn: 600,
      fetchPoll,
      intervalOverrideMs: 0,
    });

    expect(result.accessToken).toBe('gho_abc123');
    expect(fetchPoll).toHaveBeenCalledTimes(2);
  });

  it('admin_token shape (MCP server) → returns accessToken', async () => {
    const fetchPoll = vi.fn().mockResolvedValue({
      status: 200,
      json: () => Promise.resolve({ pending: false, admin_token: 'eyJ_admin_jwt', expires_at: '2099-01-01T00:00:00Z', admin_user_id: 'uuid' }),
    });

    const result = await startDeviceFlow({
      deviceCode: 'test-code',
      interval: 5,
      expiresIn: 600,
      fetchPoll,
      intervalOverrideMs: 0,
    });

    expect(result.accessToken).toBe('eyJ_admin_jwt');
  });
});

describe('startDeviceFlow — slow_down interval bump', () => {
  it('bumps interval on slow_down, never decreases', async () => {
    const sleepCalls: number[] = [];
    const sleepFn = vi.fn().mockImplementation((ms: number) => {
      sleepCalls.push(ms);
      return Promise.resolve();
    });

    let call = 0;
    const fetchPoll = vi.fn().mockImplementation(() => {
      call++;
      if (call === 1) {
        return Promise.resolve({
          status: 200,
          json: () => Promise.resolve({ error: 'slow_down', interval: 10 }),
        });
      }
      return Promise.resolve({
        status: 200,
        json: () => Promise.resolve({ access_token: 'gho_done' }),
      });
    });

    await startDeviceFlow({
      deviceCode: 'dc',
      interval: 5,
      expiresIn: 600,
      fetchPoll,
      sleepFn,
      intervalOverrideMs: 100,
    });

    // First sleep at baseline (100ms), second at 10s bump
    expect(sleepCalls[0]).toBe(100);
    expect(sleepCalls[1]).toBe(10_000);
  });
});

describe('startDeviceFlow — error terminal states', () => {
  it('access_denied → throws DeviceFlowError(access_denied)', async () => {
    const fetchPoll = vi.fn().mockResolvedValue({
      status: 200,
      json: () => Promise.resolve({ error: 'access_denied' }),
    });

    await expect(
      startDeviceFlow({ deviceCode: 'dc', interval: 5, expiresIn: 600, fetchPoll, intervalOverrideMs: 0 }),
    ).rejects.toMatchObject({ code: 'access_denied' });
  });

  it('expired_token → throws DeviceFlowError(expired_token)', async () => {
    const fetchPoll = vi.fn().mockResolvedValue({
      status: 200,
      json: () => Promise.resolve({ error: 'expired_token' }),
    });

    await expect(
      startDeviceFlow({ deviceCode: 'dc', interval: 5, expiresIn: 600, fetchPoll, intervalOverrideMs: 0 }),
    ).rejects.toMatchObject({ code: 'expired_token' });
  });

  it('403 access_denied → throws DeviceFlowError(access_denied)', async () => {
    const fetchPoll = vi.fn().mockResolvedValue({
      status: 403,
      json: () => Promise.resolve({ error: 'access_denied' }),
    });

    await expect(
      startDeviceFlow({ deviceCode: 'dc', interval: 5, expiresIn: 600, fetchPoll, intervalOverrideMs: 0 }),
    ).rejects.toMatchObject({ code: 'access_denied' });
  });

  it('403 not_admin → throws DeviceFlowError(not_admin)', async () => {
    const fetchPoll = vi.fn().mockResolvedValue({
      status: 403,
      json: () => Promise.resolve({ error: 'not_admin' }),
    });

    await expect(
      startDeviceFlow({ deviceCode: 'dc', interval: 5, expiresIn: 600, fetchPoll, intervalOverrideMs: 0 }),
    ).rejects.toMatchObject({ code: 'not_admin' });
  });

  it('410 → throws DeviceFlowError(expired_token)', async () => {
    const fetchPoll = vi.fn().mockResolvedValue({
      status: 410,
      json: () => Promise.resolve({ error: 'expired_token' }),
    });

    await expect(
      startDeviceFlow({ deviceCode: 'dc', interval: 5, expiresIn: 600, fetchPoll, intervalOverrideMs: 0 }),
    ).rejects.toMatchObject({ code: 'expired_token' });
  });

  it('fetch throws → throws DeviceFlowError(unreachable)', async () => {
    const fetchPoll = vi.fn().mockRejectedValue(new Error('ECONNREFUSED'));

    await expect(
      startDeviceFlow({ deviceCode: 'dc', interval: 5, expiresIn: 600, fetchPoll, intervalOverrideMs: 0 }),
    ).rejects.toMatchObject({ code: 'unreachable' });
  });

  it('expiresIn=0 → times out immediately → throws DeviceFlowError(timeout)', async () => {
    const fetchPoll = vi.fn().mockResolvedValue({
      status: 200,
      json: () => Promise.resolve({ error: 'authorization_pending' }),
    });

    await expect(
      startDeviceFlow({
        deviceCode: 'dc',
        interval: 5,
        expiresIn: 0,
        fetchPoll,
        intervalOverrideMs: 0,
        deadlineGraceMs: 0,
      }),
    ).rejects.toMatchObject({ code: 'timeout' });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// promptEmailOTP
// ─────────────────────────────────────────────────────────────────────────────

describe('promptEmailOTP — CI mode (code provided)', () => {
  it('uses provided code without prompting', async () => {
    const stdout = makeStdout();
    const attemptComplete = vi.fn().mockResolvedValue({ success: true });

    const code = await promptEmailOTP({
      sentTo: 'a***@example.com',
      code: '123456',
      attemptComplete,
      stdout: stdout.write,
    });

    expect(code).toBe('123456');
    expect(attemptComplete).toHaveBeenCalledWith('123456');
    // Prompt ("Enter code:") should NOT have been written — CI mode skips it
    expect(stdout.lines.join('')).not.toContain('Enter code:');
  });

  it('CI mode failure → throws IdentityFlowError(otp_failed)', async () => {
    const attemptComplete = vi.fn().mockResolvedValue({ success: false, errorCode: 'provider_error' });

    await expect(
      promptEmailOTP({
        sentTo: 'a***@example.com',
        code: '000000',
        attemptComplete,
        stdout: makeStdout().write,
      }),
    ).rejects.toMatchObject({ code: 'otp_failed' });
  });

  it('CI mode challenge_expired → throws IdentityFlowError(otp_expired)', async () => {
    const attemptComplete = vi.fn().mockResolvedValue({ success: false, errorCode: 'challenge_expired' });

    await expect(
      promptEmailOTP({
        sentTo: 'a***@example.com',
        code: '123456',
        attemptComplete,
        stdout: makeStdout().write,
      }),
    ).rejects.toMatchObject({ code: 'otp_expired' });
  });
});

describe('promptEmailOTP — interactive mode with retries (OD-3)', () => {
  it('happy path: correct code on first try', async () => {
    const stdout = makeStdout();
    const stderr = makeStdout();
    const attemptComplete = vi.fn().mockResolvedValue({ success: true });

    const code = await promptEmailOTP({
      sentTo: 'a***@example.com',
      attemptComplete,
      stdin: makeReadable(['123456']),
      stdout: stdout.write,
      stderr: stderr.write,
    });

    expect(code).toBe('123456');
    expect(stdout.lines.join('')).toContain('We sent a 6-digit code to a***@example.com');
    expect(stdout.lines.join('')).toContain('Enter code:');
  });

  it('wrong code first, correct on second → retries', async () => {
    const stderr = makeStdout();
    let call = 0;
    const attemptComplete = vi.fn().mockImplementation(() => {
      call++;
      return Promise.resolve({ success: call > 1 });
    });

    const code = await promptEmailOTP({
      sentTo: 'a***@example.com',
      attemptComplete,
      stdin: makeReadable(['wrong1', '654321']),
      stdout: makeStdout().write,
      stderr: stderr.write,
    });

    expect(code).toBe('654321');
    expect(attemptComplete).toHaveBeenCalledTimes(2);
    expect(stderr.lines.join('')).toContain("didn't match");
  });

  it('all retries exhausted → throws IdentityFlowError(otp_max_retries)', async () => {
    const attemptComplete = vi.fn().mockResolvedValue({ success: false, errorCode: 'provider_error' });

    await expect(
      promptEmailOTP({
        sentTo: 'a***@example.com',
        maxRetries: 3,
        attemptComplete,
        stdin: makeReadable(['111111', '222222', '333333']),
        stdout: makeStdout().write,
        stderr: makeStdout().write,
      }),
    ).rejects.toMatchObject({ code: 'otp_max_retries' });

    expect(attemptComplete).toHaveBeenCalledTimes(3);
  });

  it('challenge_expired mid-retry → throws IdentityFlowError(otp_expired)', async () => {
    const attemptComplete = vi.fn().mockResolvedValue({ success: false, errorCode: 'challenge_expired' });

    await expect(
      promptEmailOTP({
        sentTo: 'a***@example.com',
        attemptComplete,
        stdin: makeReadable(['123456']),
        stdout: makeStdout().write,
        stderr: makeStdout().write,
      }),
    ).rejects.toMatchObject({ code: 'otp_expired' });
  });

  it('OTP code never appears in stdout after readline reads it', async () => {
    const stdout = makeStdout();
    const attemptComplete = vi.fn().mockResolvedValue({ success: true });

    await promptEmailOTP({
      sentTo: 'a***@example.com',
      attemptComplete,
      stdin: makeReadable(['123456']),
      stdout: stdout.write,
      stderr: makeStdout().write,
    });

    // The OTP itself should not be echoed to stdout (only the prompt is written)
    expect(stdout.lines.join('')).not.toContain('123456');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// mapProviderError — table-driven
// ─────────────────────────────────────────────────────────────────────────────

describe('mapProviderError — table-driven', () => {
  const cases: [number, string, number, boolean][] = [
    [400, 'invalid_request', 7, false],
    [400, 'provider_not_allowed', 9, true],
    [400, 'provider_unknown', 9, false],
    [400, 'identity_proof_required', 11, false],
    [403, 'email_mismatch', 10, false],
    [404, 'not_found', 4, false],
    [410, 'invite_expired', 3, false],
    [410, 'invite_already_consumed', 3, false],
    [410, 'challenge_expired', 3, false],
    [502, 'provider_error', 12, true],
    [503, 'server_down', 6, false],
    [500, 'unknown', 6, false],
  ];

  cases.forEach(([status, code, exitCode, retryable]) => {
    it(`${status} ${code} → exitCode ${exitCode}, retryable=${String(retryable)}`, () => {
      const result = mapProviderError(status, code);
      expect(result.exitCode).toBe(exitCode);
      expect(result.retryable).toBe(retryable);
      expect(result.message).toBeTruthy();
    });
  });

  it('429 → exit 8, message contains retry seconds', () => {
    const result = mapProviderError(429, 'too_many_requests', 300);
    expect(result.exitCode).toBe(8);
    expect(result.message).toContain('300');
  });
});
