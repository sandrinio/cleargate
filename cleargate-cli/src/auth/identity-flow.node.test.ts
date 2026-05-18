import { describe, test, mock } from 'node:test';
import assert from 'node:assert/strict';

/**
 * Unit tests for identity-flow helpers.
 *
 * All stdin interactions use injected Readable.from() seams.
 * No real TTY, no real network calls.
 *
 * CR-006 EPIC-019.
 */
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
  test('flag wins — returns github', async () => {
    const result = await pickProvider({ flag: 'github', isTTY: false });
    assert.strictEqual(result, 'github');
  });

  test('flag wins — returns email', async () => {
    const result = await pickProvider({ flag: 'email', isTTY: false });
    assert.strictEqual(result, 'email');
  });

  test('unknown flag → throws IdentityFlowError(provider_unknown)', async () => {
    await expect(pickProvider({ flag: 'google', isTTY: false })).rejects.toMatchObject({
      code: 'provider_unknown',
    });
  });

  test('no flag, non-TTY → throws IdentityFlowError(provider_required)', async () => {
    await expect(pickProvider({ isTTY: false })).rejects.toMatchObject({
      code: 'provider_required',
    });
  });

  test('no flag, TTY, single provider → auto-selects without prompt', async () => {
    const result = await pickProvider({
      isTTY: true,
      available: ['email'],
    });
    assert.strictEqual(result, 'email');
  });

  test('no flag, TTY, multi-provider → interactive picker (selects option 2)', async () => {
    const { write } = makeStdout();
    const result = await pickProvider({
      isTTY: true,
      available: ['github', 'email'],
      stdin: makeReadable(['2']),
      stdout: write,
    });
    assert.strictEqual(result, 'email');
  });

  test('no flag, TTY, multi-provider → interactive picker (selects option 1)', async () => {
    const { write } = makeStdout();
    const result = await pickProvider({
      isTTY: true,
      available: ['github', 'email'],
      stdin: makeReadable(['1']),
      stdout: write,
    });
    assert.strictEqual(result, 'github');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// promptPicker
// ─────────────────────────────────────────────────────────────────────────────

describe('promptPicker', () => {
  test('renders numbered list and returns selected provider', async () => {
    const { write, lines } = makeStdout();
    const result = await promptPicker(['github', 'email'], {
      stdin: makeReadable(['1']),
      stdout: write,
    });
    assert.strictEqual(result, 'github');
    expect(lines.join('')).toContain('GitHub OAuth');
    expect(lines.join('')).toContain('Email magic-link');
  });

  test('invalid choice → throws IdentityFlowError(invalid_choice)', async () => {
    const { write } = makeStdout();
    await expect(
      promptPicker(['github', 'email'], {
        stdin: makeReadable(['5']),
        stdout: write,
      }),
    ).rejects.toMatchObject({ code: 'invalid_choice' });
  });

  test('prompt includes "How would you like to verify your email?"', async () => {
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
  test('pending then access_token → returns accessToken', async () => {
    let call = 0;
    const fetchPoll = mock.fn(() => {
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

    assert.strictEqual(result.accessToken, 'gho_abc123');
    assert.strictEqual(fetchPoll.mock.calls.length, 2);
  });

  test('admin_token shape (MCP server) → returns accessToken', async () => {
    const fetchPoll = mock.fn(() => Promise.resolve({
      status: 200,
      json: ()) => Promise.resolve({ pending: false, admin_token: 'eyJ_admin_jwt', expires_at: '2099-01-01T00:00:00Z', admin_user_id: 'uuid' }),
    });

    const result = await startDeviceFlow({
      deviceCode: 'test-code',
      interval: 5,
      expiresIn: 600,
      fetchPoll,
      intervalOverrideMs: 0,
    });

    assert.strictEqual(result.accessToken, 'eyJ_admin_jwt');
  });
});

describe('startDeviceFlow — slow_down interval bump', () => {
  test('bumps interval on slow_down, never decreases', async () => {
    const sleepCalls: number[] = [];
    const sleepFn = mock.fn((ms: number) => {
      sleepCalls.push(ms);
      return Promise.resolve();
    });

    let call = 0;
    const fetchPoll = mock.fn(() => {
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
    assert.strictEqual(sleepCalls[0], 100);
    assert.strictEqual(sleepCalls[1], 10_000);
  });
});

describe('startDeviceFlow — error terminal states', () => {
  test('access_denied → throws DeviceFlowError(access_denied)', async () => {
    const fetchPoll = mock.fn(() => Promise.resolve({
      status: 200,
      json: ()) => Promise.resolve({ error: 'access_denied' }),
    });

    await expect(
      startDeviceFlow({ deviceCode: 'dc', interval: 5, expiresIn: 600, fetchPoll, intervalOverrideMs: 0 }),
    ).rejects.toMatchObject({ code: 'access_denied' });
  });

  test('expired_token → throws DeviceFlowError(expired_token)', async () => {
    const fetchPoll = mock.fn(() => Promise.resolve({
      status: 200,
      json: ()) => Promise.resolve({ error: 'expired_token' }),
    });

    await expect(
      startDeviceFlow({ deviceCode: 'dc', interval: 5, expiresIn: 600, fetchPoll, intervalOverrideMs: 0 }),
    ).rejects.toMatchObject({ code: 'expired_token' });
  });

  test('403 access_denied → throws DeviceFlowError(access_denied)', async () => {
    const fetchPoll = mock.fn(() => Promise.resolve({
      status: 403,
      json: ()) => Promise.resolve({ error: 'access_denied' }),
    });

    await expect(
      startDeviceFlow({ deviceCode: 'dc', interval: 5, expiresIn: 600, fetchPoll, intervalOverrideMs: 0 }),
    ).rejects.toMatchObject({ code: 'access_denied' });
  });

  test('403 not_admin → throws DeviceFlowError(not_admin)', async () => {
    const fetchPoll = mock.fn(() => Promise.resolve({
      status: 403,
      json: ()) => Promise.resolve({ error: 'not_admin' }),
    });

    await expect(
      startDeviceFlow({ deviceCode: 'dc', interval: 5, expiresIn: 600, fetchPoll, intervalOverrideMs: 0 }),
    ).rejects.toMatchObject({ code: 'not_admin' });
  });

  test('410 → throws DeviceFlowError(expired_token)', async () => {
    const fetchPoll = mock.fn(() => Promise.resolve({
      status: 410,
      json: ()) => Promise.resolve({ error: 'expired_token' }),
    });

    await expect(
      startDeviceFlow({ deviceCode: 'dc', interval: 5, expiresIn: 600, fetchPoll, intervalOverrideMs: 0 }),
    ).rejects.toMatchObject({ code: 'expired_token' });
  });

  test('fetch throws → throws DeviceFlowError(unreachable)', async () => {
    const fetchPoll = mock.fn(() => Promise.reject(new Error('ECONNREFUSED')));

    await expect(
      startDeviceFlow({ deviceCode: 'dc', interval: 5, expiresIn: 600, fetchPoll, intervalOverrideMs: 0 }),
    ).rejects.toMatchObject({ code: 'unreachable' });
  });

  test('expiresIn=0 → times out immediately → throws DeviceFlowError(timeout)', async () => {
    const fetchPoll = mock.fn(() => Promise.resolve({
      status: 200,
      json: ()) => Promise.resolve({ error: 'authorization_pending' }),
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
  test('uses provided code without prompting', async () => {
    const stdout = makeStdout();
    const attemptComplete = mock.fn(() => Promise.resolve({ success: true }));

    const code = await promptEmailOTP({
      sentTo: 'a***@example.com',
      code: '123456',
      attemptComplete,
      stdout: stdout.write,
    });

    assert.strictEqual(code, '123456');
    assert.deepStrictEqual(attemptComplete.mock.calls[attemptComplete.mock.calls.length - 1], ['123456']);
    // Prompt ("Enter code:") should NOT have been written — CI mode skips it
    expect(stdout.lines.join('')).not.toContain('Enter code:');
  });

  test('CI mode failure → throws IdentityFlowError(otp_failed)', async () => {
    const attemptComplete = mock.fn(() => Promise.resolve({ success: false, errorCode: 'provider_error' }));

    await expect(
      promptEmailOTP({
        sentTo: 'a***@example.com',
        code: '000000',
        attemptComplete,
        stdout: makeStdout().write,
      }),
    ).rejects.toMatchObject({ code: 'otp_failed' });
  });

  test('CI mode challenge_expired → throws IdentityFlowError(otp_expired)', async () => {
    const attemptComplete = mock.fn(() => Promise.resolve({ success: false, errorCode: 'challenge_expired' }));

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
  test('happy path: correct code on first try', async () => {
    const stdout = makeStdout();
    const stderr = makeStdout();
    const attemptComplete = mock.fn(() => Promise.resolve({ success: true }));

    const code = await promptEmailOTP({
      sentTo: 'a***@example.com',
      attemptComplete,
      stdin: makeReadable(['123456']),
      stdout: stdout.write,
      stderr: stderr.write,
    });

    assert.strictEqual(code, '123456');
    expect(stdout.lines.join('')).toContain('We sent a 6-digit code to a***@example.com');
    expect(stdout.lines.join('')).toContain('Enter code:');
  });

  test('wrong code first, correct on second → retries', async () => {
    const stderr = makeStdout();
    let call = 0;
    const attemptComplete = mock.fn(() => {
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

    assert.strictEqual(code, '654321');
    assert.strictEqual(attemptComplete.mock.calls.length, 2);
    expect(stderr.lines.join('')).toContain("didn't match");
  });

  test('all retries exhausted → throws IdentityFlowError(otp_max_retries)', async () => {
    const attemptComplete = mock.fn(() => Promise.resolve({ success: false, errorCode: 'provider_error' }));

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

    assert.strictEqual(attemptComplete.mock.calls.length, 3);
  });

  test('challenge_expired mid-retry → throws IdentityFlowError(otp_expired)', async () => {
    const attemptComplete = mock.fn(() => Promise.resolve({ success: false, errorCode: 'challenge_expired' }));

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

  test('OTP code never appears in stdout after readline reads it', async () => {
    const stdout = makeStdout();
    const attemptComplete = mock.fn(() => Promise.resolve({ success: true }));

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
    test(`${status} ${code} → exitCode ${exitCode}, retryable=${String(retryable)}`, () => {
      const result = mapProviderError(status, code);
      assert.strictEqual(result.exitCode, exitCode);
      assert.strictEqual(result.retryable, retryable);
      assert.ok(result.message);
    });
  });

  test('429 → exit 8, message contains retry seconds', () => {
    const result = mapProviderError(429, 'too_many_requests', 300);
    assert.strictEqual(result.exitCode, 8);
    assert.ok(String(result.message).includes('300'));
  });
});
