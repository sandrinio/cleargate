import { describe, test, beforeEach, afterEach, mock } from 'node:test';
import assert from 'node:assert/strict';

/**
 * Unit tests for `cleargate join` — two-step identity-bound join flow.
 *
 * JC-01..JC-11: new two-step scenarios.
 * R-1..R-16 (legacy single-shot): rewritten onto the two-step happy path or
 * mapped to mapProviderError unit coverage.
 *
 * All HTTP calls are mocked via the fetch seam in JoinOptions.
 * Stdin interactions use injected Readable streams.
 *
 * CR-006 EPIC-019.
 */
import { Readable } from 'node:stream';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { joinHandler, type JoinOptions } from '../../src/commands/join.js';

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


// Per-test tmp dir for the config file — keeps joinHandler's saveConfig() out
// of the user's real ~/.cleargate/ directory. Set in beforeEach, cleaned in
// afterEach. Tests inherit it via makeOpts().configPath default.
let TEST_CONFIG_PATH: string;
beforeEach(() => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cleargate-join-test-'));
  TEST_CONFIG_PATH = path.join(dir, 'config.json');
});
afterEach(() => {
  try {
    fs.rmSync(path.dirname(TEST_CONFIG_PATH), { recursive: true, force: true });
  } catch {
    // best-effort cleanup
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

const VALID_UUID = '12345678-1234-4234-8234-123456789abc';
const FAKE_REFRESH_TOKEN = 'FAKE_REFRESH_TOKEN_xyz_not_a_real_jwt';
const FAKE_ACCESS_TOKEN = 'gho_FakeGitHubAccessToken_NEVER_LOG';
const MCP_BASE = 'https://mcp.example.com';
const FULL_URL = `${MCP_BASE}/join/${VALID_UUID}`;
const GITHUB_TOKEN_URL = 'https://github.com/login/oauth/access_token';

const CHALLENGE_ID = '00000000-0000-4000-8000-000000000099';

// ─────────────────────────────────────────────────────────────────────────────
// Response factories
// ─────────────────────────────────────────────────────────────────────────────

function makeJson(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function mockChallengeResponse(provider: 'github' | 'email', overrides: Record<string, unknown> = {}): Response {
  const githubHints = {
    device_code: 'test-device-code',
    user_code: 'ABCD-1234',
    verification_uri: 'https://github.com/login/device',
    expires_in: 900,
    interval: 5,
  };
  const emailHints = { sent_to: 'a***@example.com' };
  const body = {
    challenge_id: CHALLENGE_ID,
    provider,
    expires_in: 600,
    client_hints: provider === 'github' ? githubHints : emailHints,
    ...overrides,
  };
  return makeJson(200, body);
}

function mockCompleteResponse(overrides: Record<string, unknown> = {}): Response {
  const body = {
    refresh_token: FAKE_REFRESH_TOKEN,
    refresh_token_expires_in: 7_776_000,
    project_id: '00000000-0000-4000-8000-000000000001',
    project_name: 'cleargate-core',
    member_id: '00000000-0000-4000-8000-000000000002',
    member_role: 'user',
    ...overrides,
  };
  return makeJson(200, body);
}

function mockGitHubPending(): Response {
  return new Response(JSON.stringify({ error: 'authorization_pending' }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
}

function mockGitHubSuccess(): Response {
  return new Response(JSON.stringify({ access_token: FAKE_ACCESS_TOKEN }), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/** A FakeTokenStore whose save() is a vitest spy */
function makeFakeStore() {
  const save = mock.fn(() => Promise.resolve(undefined as void));
  const load = mock.fn(() => Promise.resolve(null as string | null));
  const remove = mock.fn(() => Promise.resolve(undefined as void));
  return {
    save,
    load,
    remove,
    backend: 'file' as const,
  };
}

function makeReadable(lines: string[]): Readable {
  return Readable.from(lines.map((l) => l + '\n').join(''));
}

/**
 * Creates a Readable that emits lines on-demand (no buffering ahead).
 * Use for tests where two readline interfaces read from the same stream sequentially.
 * Each line is emitted asynchronously via process.nextTick so that readline
 * interfaces created after a previous one is closed can still read subsequent lines.
 */
function makeReadableSequential(lines: string[]): Readable {
  const { PassThrough } = require('node:stream') as typeof import('node:stream');
  const stream = new PassThrough();
  let idx = 0;
  function writeNext() {
    if (idx < lines.length) {
      stream.push(lines[idx]! + '\n');
      idx++;
    } else {
      stream.push(null);
    }
  }
  // Write first line immediately, subsequent lines after a tick gap
  stream.on('resume', () => {
    // When stream is resumed (readline reads from it), write the next line
    process.nextTick(writeNext);
  });
  return stream;
}

/** Builds a minimal JoinOptions with captured stdout/stderr and a mocked exit */
function makeOpts(partial: Partial<JoinOptions> = {}): JoinOptions & {
  capturedStdout: string[];
  capturedStderr: string[];
  exitCode: number | undefined;
} {
  const capturedStdout: string[] = [];
  const capturedStderr: string[] = [];
  let exitCode: number | undefined;

  return {
    inviteUrl: FULL_URL,
    profile: 'default',
    hostname: () => 'test-box',
    stdout: (s) => { capturedStdout.push(s); },
    stderr: (s) => { capturedStderr.push(s); },
    exit: (c) => {
      exitCode = c;
      throw new Error(`EXIT:${c}`);
    },
    // Default: non-TTY so no interactive picker
    isTTY: false,
    // Fast device-flow polling in tests
    intervalOverrideMs: 0,
    // Route saveConfig + loadConfig at a tmp file so tests don't touch the
    // real ~/.cleargate/config.json. Overridable per test via `partial`.
    configPath: TEST_CONFIG_PATH,
    ...partial,
    capturedStdout,
    capturedStderr,
    get exitCode() { return exitCode; },
  };
}

/** Run handler; swallows the mock EXIT error */
async function run(opts: JoinOptions & { capturedStdout: string[]; capturedStderr: string[]; exitCode: number | undefined }): Promise<void> {
  try {
    await joinHandler(opts);
  } catch (err) {
    if (err instanceof Error && err.message.startsWith('EXIT:')) {
      return;
    }
    throw err;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// JC-01: GitHub happy path
// ─────────────────────────────────────────────────────────────────────────────

describe('JC-01: cleargate join <url> --auth github happy path', () => {
  test('JC-01: GitHub happy path → seats refresh_token', async () => {
    const store = makeFakeStore();
    let fetchCall = 0;
    const fetchFn = mock.fn((url: string) => {
      fetchCall++;
      if (url.includes('/challenge')) return Promise.resolve(mockChallengeResponse('github'));
      if (url === GITHUB_TOKEN_URL) {
        // First poll: pending; second: success
        if (fetchCall === 2) return Promise.resolve(mockGitHubPending());
        return Promise.resolve(mockGitHubSuccess());
      }
      if (url.includes('/complete')) return Promise.resolve(mockCompleteResponse());
      return Promise.reject(new Error(`Unexpected fetch: ${url}`));
    });

    const opts = makeOpts({ auth: 'github', fetch: fetchFn, createStore: async () => store });
    await run(opts);

    assert.strictEqual(opts.exitCode, undefined);
    assert.deepStrictEqual(store.save.mock.calls[store.save.mock.calls.length - 1].arguments, ['default', FAKE_REFRESH_TOKEN]);

    // Proof uses access_token (OD-2 fix)
    const completeCall = fetchFn.mock.calls.find((c) => (c[0] as string).includes('/complete'));
    const completeBody = JSON.parse((completeCall?.[1] as RequestInit | undefined)?.body as string ?? '{}') as {
      challenge_id: string;
      proof: Record<string, string>;
    };
    assert.strictEqual(completeBody.challenge_id, CHALLENGE_ID);
    assert.ok(completeBody.proof['access_token']);
    assert.strictEqual(completeBody.proof['code'], undefined); // NOT the old code shape

    // GitHub access_token NEVER appears in stdout/stderr (FLASHCARD #plaintext-redact)
    const allOutput = [...opts.capturedStdout, ...opts.capturedStderr].join('');
    assert.ok(!String(allOutput).includes(FAKE_ACCESS_TOKEN));
    assert.ok(!String(allOutput).includes('gho_'));
  });

  test('JC-01b: stdout contains browser instructions and success message', async () => {
    const store = makeFakeStore();
    const fetchFn = mock.fn((url: string) => {
      if (url.includes('/challenge')) return Promise.resolve(mockChallengeResponse('github'));
      if (url === GITHUB_TOKEN_URL) return Promise.resolve(mockGitHubSuccess());
      if (url.includes('/complete')) return Promise.resolve(mockCompleteResponse());
      return Promise.reject(new Error(`Unexpected: ${url}`));
    });

    const opts = makeOpts({ auth: 'github', fetch: fetchFn, createStore: async () => store });
    await run(opts);

    const allStdout = opts.capturedStdout.join('');
    assert.ok(String(allStdout).includes('https://github.com/login/device'));
    assert.ok(String(allStdout).includes('ABCD-1234'));
    assert.ok(String(allStdout).includes('Waiting for authorization'));
    assert.ok(String(allStdout).includes("joined project 'cleargate-core' as 'test-box'"));
    assert.ok(String(allStdout).includes('refresh token saved to file'));
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// JC-02: Email happy path
// ─────────────────────────────────────────────────────────────────────────────

describe('JC-02: cleargate join <url> --auth email happy path', () => {
  test('JC-02: email happy path — reads OTP from stdin, seats refresh_token', async () => {
    const store = makeFakeStore();
    const fetchFn = mock.fn((url: string) => {
      if (url.includes('/challenge')) return Promise.resolve(mockChallengeResponse('email'));
      if (url.includes('/complete')) return Promise.resolve(mockCompleteResponse());
      return Promise.reject(new Error(`Unexpected: ${url}`));
    });

    const opts = makeOpts({
      auth: 'email',
      fetch: fetchFn,
      createStore: async () => store,
      stdin: makeReadable(['123456']),
    });
    await run(opts);

    assert.strictEqual(opts.exitCode, undefined);
    assert.deepStrictEqual(store.save.mock.calls[store.save.mock.calls.length - 1].arguments, ['default', FAKE_REFRESH_TOKEN]);

    // Proof uses code field for email
    const completeCall = fetchFn.mock.calls.find((c) => (c[0] as string).includes('/complete'));
    const completeBody = JSON.parse((completeCall?.[1] as RequestInit | undefined)?.body as string ?? '{}') as {
      challenge_id: string;
      proof: Record<string, string>;
    };
    assert.strictEqual(completeBody.proof['code'], '123456');
  });

  test('JC-02b: stdout contains sent_to hint and Enter code prompt', async () => {
    const store = makeFakeStore();
    const fetchFn = mock.fn((url: string) => {
      if (url.includes('/challenge')) return Promise.resolve(mockChallengeResponse('email'));
      if (url.includes('/complete')) return Promise.resolve(mockCompleteResponse());
      return Promise.reject(new Error(`Unexpected: ${url}`));
    });

    const opts = makeOpts({
      auth: 'email',
      fetch: fetchFn,
      createStore: async () => store,
      stdin: makeReadable(['123456']),
    });
    await run(opts);

    const allStdout = opts.capturedStdout.join('');
    assert.ok(String(allStdout).includes('a***@example.com'));
    assert.ok(String(allStdout).includes('Enter code:'));

    // OTP itself must NOT appear in stdout
    assert.ok(!String(allStdout).includes('123456'));
  });

  test('JC-02c: OTP never appears in stderr (FLASHCARD #plaintext-redact)', async () => {
    const store = makeFakeStore();
    const fetchFn = mock.fn((url: string) => {
      if (url.includes('/challenge')) return Promise.resolve(mockChallengeResponse('email'));
      if (url.includes('/complete')) return Promise.resolve(mockCompleteResponse());
      return Promise.reject(new Error(`Unexpected: ${url}`));
    });

    const opts = makeOpts({
      auth: 'email',
      fetch: fetchFn,
      createStore: async () => store,
      stdin: makeReadable(['123456']),
    });
    await run(opts);

    expect(opts.capturedStderr.join('')).not.toContain('123456');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// JC-03: Interactive picker
// ─────────────────────────────────────────────────────────────────────────────

describe('JC-03: cleargate join <url> (no --auth) + TTY + interactive picker', () => {
  test('JC-03: picker choice 2 (email) → proceeds with email flow', async () => {
    const store = makeFakeStore();
    const fetchFn = mock.fn((url: string) => {
      if (url.includes('/challenge')) return Promise.resolve(mockChallengeResponse('email'));
      if (url.includes('/complete')) return Promise.resolve(mockCompleteResponse());
      return Promise.reject(new Error(`Unexpected: ${url}`));
    });

    // Use PassThrough to write lines lazily so readline doesn't buffer ahead.
    // promptPicker reads '2' and closes its interface; then the OTP loop
    // creates a new interface and reads '123456'.
    const { PassThrough } = await import('node:stream');
    const stdinStream = new PassThrough();

    // Queue lines: picker choice first, then OTP after a tick
    const lineQueue = ['2\n', '123456\n'];
    let lineIdx = 0;

    // Write the first line immediately (picker will read it)
    stdinStream.write(lineQueue[lineIdx++]);

    // After any readable event, push the next queued line with a tick delay
    stdinStream.on('resume', () => {
      if (lineIdx < lineQueue.length) {
        const line = lineQueue[lineIdx++];
        setTimeout(() => stdinStream.write(line), 5);
      }
    });

    const opts = makeOpts({
      fetch: fetchFn,
      createStore: async () => store,
      isTTY: true,
      stdin: stdinStream,
    });
    await run(opts);

    assert.strictEqual(opts.exitCode, undefined);
    const allStdout = opts.capturedStdout.join('');
    assert.ok(String(allStdout).includes('How would you like to verify your email?'));
    assert.ok(String(allStdout).includes('GitHub OAuth'));
    assert.ok(String(allStdout).includes('Email magic-link'));
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// JC-04: provider_not_allowed on /challenge
// ─────────────────────────────────────────────────────────────────────────────

describe('JC-04: server returns 400 provider_not_allowed on /challenge', () => {
  test('JC-04: exits 9 with provider hint', async () => {
    const fetchFn = mock.fn(() => Promise.resolve(
      makeJson(400, { error: 'provider_not_allowed' })),
    );
    const opts = makeOpts({ auth: 'github', fetch: fetchFn });
    await run(opts);

    assert.strictEqual(opts.exitCode, 9);
    expect(opts.capturedStderr.join('')).toContain('different provider');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// JC-05: wrong OTP → 3 retries then bail
// ─────────────────────────────────────────────────────────────────────────────

describe('JC-05: wrong OTP code → 3 retries then exit 12', () => {
  test('JC-05: 3 wrong attempts → exits 12 with "3 tries" message', async () => {
    const fetchFn = mock.fn((url: string) => {
      if (url.includes('/challenge')) return Promise.resolve(mockChallengeResponse('email'));
      // Always 502 provider_error on complete
      return Promise.resolve(makeJson(502, { error: 'provider_error' }));
    });

    const opts = makeOpts({
      auth: 'email',
      fetch: fetchFn,
      stdin: makeReadable(['111111', '222222', '333333']),
    });
    await run(opts);

    assert.strictEqual(opts.exitCode, 12);
    expect(opts.capturedStderr.join('')).toContain('3 tries');

    // 3 /complete calls made (one per attempt)
    const completeCalls = fetchFn.mock.calls.filter((c) => (c[0] as string).includes('/complete'));
    assert.strictEqual((completeCalls).length, 3);
  });

  test('JC-05b: retry stderr messages count down', async () => {
    const fetchFn = mock.fn((url: string) => {
      if (url.includes('/challenge')) return Promise.resolve(mockChallengeResponse('email'));
      return Promise.resolve(makeJson(502, { error: 'provider_error' }));
    });

    const opts = makeOpts({
      auth: 'email',
      fetch: fetchFn,
      stdin: makeReadable(['111111', '222222', '333333']),
    });
    await run(opts);

    const allStderr = opts.capturedStderr.join('');
    assert.ok(String(allStderr).includes("didn't match"));
    // The retry countdown messages should appear for attempts 1 and 2
    assert.ok(String(allStderr).includes('2 attempts remaining'));
    assert.ok(String(allStderr).includes('1 attempt remaining'));
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// JC-06: challenge_expired on /complete
// ─────────────────────────────────────────────────────────────────────────────

describe('JC-06: challenge_expired on /complete → exits 3', () => {
  test('JC-06: exits 3 with "code expired" message', async () => {
    const fetchFn = mock.fn((url: string) => {
      if (url.includes('/challenge')) return Promise.resolve(mockChallengeResponse('email'));
      return Promise.resolve(makeJson(410, { error: 'challenge_expired' }));
    });

    const opts = makeOpts({
      auth: 'email',
      fetch: fetchFn,
      stdin: makeReadable(['123456']),
    });
    await run(opts);

    assert.strictEqual(opts.exitCode, 3);
    expect(opts.capturedStderr.join('')).toContain('expired');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// JC-07: --non-interactive without --auth → exit 1
// ─────────────────────────────────────────────────────────────────────────────

describe('JC-07: --non-interactive without --auth → exits 1', () => {
  test('JC-07: exits 1 with "--auth required" message', async () => {
    const opts = makeOpts({ nonInteractive: true });
    await run(opts);

    assert.strictEqual(opts.exitCode, 1);
    expect(opts.capturedStderr.join('')).toContain('--auth required');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// JC-08: --auth email --non-interactive without --code → exit 1
// ─────────────────────────────────────────────────────────────────────────────

describe('JC-08: --auth email --non-interactive without --code → exits 1', () => {
  test('JC-08: exits 1 with "--code required" message', async () => {
    const opts = makeOpts({ auth: 'email', nonInteractive: true });
    await run(opts);

    assert.strictEqual(opts.exitCode, 1);
    expect(opts.capturedStderr.join('')).toContain('--code required');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// JC-09: Plaintext redact
// ─────────────────────────────────────────────────────────────────────────────

describe('JC-09: plaintext-redact (FLASHCARD #cli #plaintext-redact)', () => {
  test('JC-09: GitHub access_token never appears in stdout/stderr', async () => {
    const store = makeFakeStore();
    const fetchFn = mock.fn((url: string) => {
      if (url.includes('/challenge')) return Promise.resolve(mockChallengeResponse('github'));
      if (url === GITHUB_TOKEN_URL) return Promise.resolve(mockGitHubSuccess());
      if (url.includes('/complete')) return Promise.resolve(mockCompleteResponse());
      return Promise.reject(new Error(`Unexpected: ${url}`));
    });

    const opts = makeOpts({ auth: 'github', fetch: fetchFn, createStore: async () => store });
    await run(opts);

    const allOutput = [...opts.capturedStdout, ...opts.capturedStderr].join('');
    assert.ok(!String(allOutput).includes(FAKE_ACCESS_TOKEN));
    assert.ok(!String(allOutput).includes('gho_'));
  });

  test('JC-09b: email OTP never appears in stdout/stderr', async () => {
    const store = makeFakeStore();
    const fetchFn = mock.fn((url: string) => {
      if (url.includes('/challenge')) return Promise.resolve(mockChallengeResponse('email'));
      if (url.includes('/complete')) return Promise.resolve(mockCompleteResponse());
      return Promise.reject(new Error(`Unexpected: ${url}`));
    });

    const opts = makeOpts({
      auth: 'email',
      fetch: fetchFn,
      createStore: async () => store,
      stdin: makeReadable(['123456']),
    });
    await run(opts);

    const allOutput = [...opts.capturedStdout, ...opts.capturedStderr].join('');
    assert.ok(!String(allOutput).includes('123456'));
  });

  test('JC-09c: refresh_token never appears in stdout/stderr', async () => {
    const store = makeFakeStore();
    const fetchFn = mock.fn((url: string) => {
      if (url.includes('/challenge')) return Promise.resolve(mockChallengeResponse('github'));
      if (url === GITHUB_TOKEN_URL) return Promise.resolve(mockGitHubSuccess());
      if (url.includes('/complete')) return Promise.resolve(mockCompleteResponse());
      return Promise.reject(new Error(`Unexpected: ${url}`));
    });

    const opts = makeOpts({ auth: 'github', fetch: fetchFn, createStore: async () => store });
    await run(opts);

    const allOutput = [...opts.capturedStdout, ...opts.capturedStderr].join('');
    assert.ok(!String(allOutput).includes(FAKE_REFRESH_TOKEN));
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// JC-10: Stale CLI — identity_proof_required → exit 11
// ─────────────────────────────────────────────────────────────────────────────

describe('JC-10: server returns 400 identity_proof_required → exits 11 with upgrade hint', () => {
  test('JC-10: exits 11 with upgrade message', async () => {
    const fetchFn = mock.fn((url: string) => {
      if (url.includes('/challenge')) return Promise.resolve(mockChallengeResponse('github'));
      if (url === GITHUB_TOKEN_URL) return Promise.resolve(mockGitHubSuccess());
      if (url.includes('/complete')) return Promise.resolve(makeJson(400, { error: 'identity_proof_required' }));
      return Promise.reject(new Error(`Unexpected: ${url}`));
    });

    const opts = makeOpts({ auth: 'github', fetch: fetchFn });
    await run(opts);

    assert.strictEqual(opts.exitCode, 11);
    expect(opts.capturedStderr.join('')).toContain('upgrade');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// JC-11: --auth github --non-interactive → exits 1
// ─────────────────────────────────────────────────────────────────────────────

describe('JC-11: --auth github --non-interactive → exits 1 (requires browser)', () => {
  test('JC-11: exits 1 with browser required message', async () => {
    const opts = makeOpts({ auth: 'github', nonInteractive: true });
    await run(opts);

    assert.strictEqual(opts.exitCode, 1);
    expect(opts.capturedStderr.join('')).toContain('browser');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// JC-02 CI: non-interactive email with --code
// ─────────────────────────────────────────────────────────────────────────────

describe('JC-02-CI: --auth email --non-interactive --code 123456', () => {
  test('JC-02-CI: CI mode with --code → succeeds without stdin prompt', async () => {
    const store = makeFakeStore();
    const fetchFn = mock.fn((url: string) => {
      if (url.includes('/challenge')) return Promise.resolve(mockChallengeResponse('email'));
      if (url.includes('/complete')) return Promise.resolve(mockCompleteResponse());
      return Promise.reject(new Error(`Unexpected: ${url}`));
    });

    const opts = makeOpts({
      auth: 'email',
      nonInteractive: true,
      code: '123456',
      fetch: fetchFn,
      createStore: async () => store,
    });
    await run(opts);

    assert.strictEqual(opts.exitCode, undefined);
    assert.deepStrictEqual(store.save.mock.calls[store.save.mock.calls.length - 1].arguments, ['default', FAKE_REFRESH_TOKEN]);
    // No "Enter code:" prompt in CI mode
    expect(opts.capturedStdout.join('')).not.toContain('Enter code:');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// R-1 regression: full URL happy path (two-step)
// ─────────────────────────────────────────────────────────────────────────────

describe('R-1: happy path — full URL (two-step flow)', () => {
  test('R-1: calls /challenge then /complete, saves refresh token', async () => {
    const store = makeFakeStore();
    const fetchFn = mock.fn((url: string) => {
      if (url.includes('/challenge')) return Promise.resolve(mockChallengeResponse('github'));
      if (url === GITHUB_TOKEN_URL) return Promise.resolve(mockGitHubSuccess());
      if (url.includes('/complete')) return Promise.resolve(mockCompleteResponse());
      return Promise.reject(new Error(`Unexpected: ${url}`));
    });

    const opts = makeOpts({ auth: 'github', fetch: fetchFn, createStore: async () => store });
    await run(opts);

    assert.strictEqual(opts.exitCode, undefined);
    assert.deepStrictEqual(store.save.mock.calls[store.save.mock.calls.length - 1].arguments, ['default', FAKE_REFRESH_TOKEN]);
    expect(opts.capturedStdout.join('')).toContain("joined project 'cleargate-core' as 'test-box'");
    expect(opts.capturedStdout.join('')).toContain('refresh token saved to file');
    expect(opts.capturedStderr.join('')).toBe('');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// R-2: bare UUID
// ─────────────────────────────────────────────────────────────────────────────

describe('R-2: happy path — bare UUID', () => {
  test('R-2: calls /challenge with base URL from mcpUrlFlag', async () => {
    const store = makeFakeStore();
    const fetchFn = mock.fn((url: string) => {
      if (url.includes('/challenge')) return Promise.resolve(mockChallengeResponse('github'));
      if (url === GITHUB_TOKEN_URL) return Promise.resolve(mockGitHubSuccess());
      if (url.includes('/complete')) return Promise.resolve(mockCompleteResponse());
      return Promise.reject(new Error(`Unexpected: ${url}`));
    });

    const opts = makeOpts({
      inviteUrl: VALID_UUID,
      mcpUrlFlag: MCP_BASE,
      auth: 'github',
      fetch: fetchFn,
      createStore: async () => store,
    });
    await run(opts);

    assert.strictEqual(opts.exitCode, undefined);
    const challengeCall = fetchFn.mock.calls.find((c) => (c[0] as string).includes('/challenge'));
    assert.strictEqual(challengeCall?.[0], `${MCP_BASE}/join/${VALID_UUID}/challenge`);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// R-3..R-5: URL parsing errors
// ─────────────────────────────────────────────────────────────────────────────

describe('R-3: bare UUID — no mcpUrl', () => {
  test('R-3: exits 5 when mcpUrl is absent', async () => {
    const opts = makeOpts({ inviteUrl: VALID_UUID });
    await run(opts);
    assert.strictEqual(opts.exitCode, 5);
    expect(opts.capturedStderr.join('')).toContain('mcpUrl');
  });
});

describe('R-4: invalid URL format', () => {
  test('R-4: exits 5 for gibberish input', async () => {
    const opts = makeOpts({ inviteUrl: 'not-a-url' });
    await run(opts);
    assert.strictEqual(opts.exitCode, 5);
    expect(opts.capturedStderr.join('')).toContain('invalid invite URL or token format');
  });
});

describe('R-5: URL with wrong path', () => {
  test('R-5: exits 5 for /invite/ path', async () => {
    const opts = makeOpts({ inviteUrl: `${MCP_BASE}/invite/${VALID_UUID}` });
    await run(opts);
    assert.strictEqual(opts.exitCode, 5);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// R-6..R-10: /challenge error responses
// ─────────────────────────────────────────────────────────────────────────────

describe('R-6: 410 invite_expired on /challenge', () => {
  test('R-6: exits 3 with invite expired message', async () => {
    const opts = makeOpts({
      auth: 'github',
      fetch: mock.fn(() => Promise.resolve(makeJson(410, { error: 'invite_expired' }))),
    });
    await run(opts);
    assert.strictEqual(opts.exitCode, 3);
    expect(opts.capturedStderr.join('')).toContain('invite expired');
  });
});

describe('R-7: 410 invite_already_consumed on /challenge', () => {
  test('R-7: exits 3 with already consumed message', async () => {
    const opts = makeOpts({
      auth: 'github',
      fetch: mock.fn(() => Promise.resolve(makeJson(410, { error: 'invite_already_consumed' }))),
    });
    await run(opts);
    assert.strictEqual(opts.exitCode, 3);
    expect(opts.capturedStderr.join('')).toContain('already consumed');
  });
});

describe('R-8: 404 on /challenge', () => {
  test('R-8: exits 4 with invite not found', async () => {
    const opts = makeOpts({
      auth: 'github',
      fetch: mock.fn(() => Promise.resolve(makeJson(404, { error: 'not_found' }))),
    });
    await run(opts);
    assert.strictEqual(opts.exitCode, 4);
    expect(opts.capturedStderr.join('')).toContain('not found');
  });
});

describe('R-9: 429 on /challenge', () => {
  test('R-9: exits 8 with retry hint', async () => {
    const opts = makeOpts({
      auth: 'github',
      fetch: mock.fn(() => Promise.resolve(
        new Response(JSON.stringify({ error: 'too_many_requests' })), {
          status: 429,
          headers: { 'content-type': 'application/json', 'retry-after': '600' },
        }),
      ),
    });
    await run(opts);
    assert.strictEqual(opts.exitCode, 8);
  });
});

describe('R-10: 5xx on /challenge', () => {
  test('R-10: exits 6 on 503', async () => {
    const opts = makeOpts({
      auth: 'github',
      fetch: mock.fn(() => Promise.resolve(makeJson(503, { error: 'server_down' }))),
    });
    await run(opts);
    assert.strictEqual(opts.exitCode, 6);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// R-11: Network failure
// ─────────────────────────────────────────────────────────────────────────────

describe('R-11: network failure on /challenge', () => {
  test('R-11: exits 2 with cannot reach message', async () => {
    const opts = makeOpts({
      auth: 'github',
      fetch: mock.fn(() => Promise.reject(new Error('ECONNREFUSED'))),
    });
    await run(opts);
    assert.strictEqual(opts.exitCode, 2);
    expect(opts.capturedStderr.join('')).toContain('cannot reach');
    expect(opts.capturedStderr.join('')).toContain('ECONNREFUSED');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// R-13: --profile staging
// ─────────────────────────────────────────────────────────────────────────────

describe('R-13: --profile staging routes save correctly', () => {
  test('R-13: calls store.save with (staging, token)', async () => {
    const store = makeFakeStore();
    const fetchFn = mock.fn((url: string) => {
      if (url.includes('/challenge')) return Promise.resolve(mockChallengeResponse('github'));
      if (url === GITHUB_TOKEN_URL) return Promise.resolve(mockGitHubSuccess());
      if (url.includes('/complete')) return Promise.resolve(mockCompleteResponse());
      return Promise.reject(new Error(`Unexpected: ${url}`));
    });

    const opts = makeOpts({
      profile: 'staging',
      auth: 'github',
      fetch: fetchFn,
      createStore: async () => store,
    });
    await run(opts);

    assert.deepStrictEqual(store.save.mock.calls[store.save.mock.calls.length - 1].arguments, ['staging', FAKE_REFRESH_TOKEN]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// R-14: Plaintext redaction (already covered by JC-09)
// ─────────────────────────────────────────────────────────────────────────────

describe('R-14: refresh_token never leaks to stdout/stderr', () => {
  beforeEach(() => { process.env['CLEARGATE_LOG_LEVEL'] = 'debug'; });
  afterEach(() => { delete process.env['CLEARGATE_LOG_LEVEL']; });

  test('R-14: refresh_token not in any output', async () => {
    const store = makeFakeStore();
    const fetchFn = mock.fn((url: string) => {
      if (url.includes('/challenge')) return Promise.resolve(mockChallengeResponse('github'));
      if (url === GITHUB_TOKEN_URL) return Promise.resolve(mockGitHubSuccess());
      if (url.includes('/complete')) return Promise.resolve(mockCompleteResponse());
      return Promise.reject(new Error(`Unexpected: ${url}`));
    });

    const opts = makeOpts({ auth: 'github', fetch: fetchFn, createStore: async () => store });
    await run(opts);

    const allOutput = [...opts.capturedStdout, ...opts.capturedStderr].join('');
    assert.ok(!String(allOutput).includes(FAKE_REFRESH_TOKEN));
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// R-15: Hostname in success message
// ─────────────────────────────────────────────────────────────────────────────

describe('R-15: hostname appears in success message', () => {
  test('R-15: stdout uses supplied hostname', async () => {
    const store = makeFakeStore();
    const fetchFn = mock.fn((url: string) => {
      if (url.includes('/challenge')) return Promise.resolve(mockChallengeResponse('github'));
      if (url === GITHUB_TOKEN_URL) return Promise.resolve(mockGitHubSuccess());
      if (url.includes('/complete')) return Promise.resolve(mockCompleteResponse());
      return Promise.reject(new Error(`Unexpected: ${url}`));
    });

    const opts = makeOpts({
      hostname: () => 'my-laptop.local',
      auth: 'github',
      fetch: fetchFn,
      createStore: async () => store,
    });
    await run(opts);

    expect(opts.capturedStdout.join('')).toContain("as 'my-laptop.local'");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// R-16: Unhandled exception from store.save
// ─────────────────────────────────────────────────────────────────────────────

describe('R-16: unhandled exception from store.save exits 99', () => {
  test('R-16: exits 99 when store.save rejects', async () => {
    const store = makeFakeStore();
    store.save.mockRejectedValue(new Error('keychain busted'));
    const fetchFn = mock.fn((url: string) => {
      if (url.includes('/challenge')) return Promise.resolve(mockChallengeResponse('github'));
      if (url === GITHUB_TOKEN_URL) return Promise.resolve(mockGitHubSuccess());
      if (url.includes('/complete')) return Promise.resolve(mockCompleteResponse());
      return Promise.reject(new Error(`Unexpected: ${url}`));
    });

    const opts = makeOpts({ auth: 'github', fetch: fetchFn, createStore: async () => store });
    await run(opts);

    assert.strictEqual(opts.exitCode, 99);
    expect(opts.capturedStderr.join('')).toContain('cleargate: internal error: keychain busted');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// URL edge cases
// ─────────────────────────────────────────────────────────────────────────────

describe('URL edge case: query params stripped from fetch URL', () => {
  test('challenge URL is clean — built from origin + /join/ + token', async () => {
    const store = makeFakeStore();
    const fetchFn = mock.fn((url: string) => {
      if (url.includes('/challenge')) return Promise.resolve(mockChallengeResponse('github'));
      if (url === GITHUB_TOKEN_URL) return Promise.resolve(mockGitHubSuccess());
      if (url.includes('/complete')) return Promise.resolve(mockCompleteResponse());
      return Promise.reject(new Error(`Unexpected: ${url}`));
    });

    const opts = makeOpts({
      inviteUrl: `${MCP_BASE}/join/${VALID_UUID}?utm=x`,
      auth: 'github',
      fetch: fetchFn,
      createStore: async () => store,
    });
    await run(opts);

    const challengeCall = fetchFn.mock.calls.find((c) => (c[0] as string).includes('/challenge'));
    assert.strictEqual(challengeCall?.[0], `${MCP_BASE}/join/${VALID_UUID}/challenge`);
  });
});

describe('URL edge case: trailing segment rejected', () => {
  test('exits 5 for path /join/<uuid>/trailing', async () => {
    const opts = makeOpts({ inviteUrl: `${MCP_BASE}/join/${VALID_UUID}/trailing` });
    await run(opts);
    assert.strictEqual(opts.exitCode, 5);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 403 email_mismatch on /complete
// ─────────────────────────────────────────────────────────────────────────────

describe('403 email_mismatch on /complete', () => {
  test('exits 10 with re-issue message', async () => {
    const fetchFn = mock.fn((url: string) => {
      if (url.includes('/challenge')) return Promise.resolve(mockChallengeResponse('github'));
      if (url === GITHUB_TOKEN_URL) return Promise.resolve(mockGitHubSuccess());
      if (url.includes('/complete')) return Promise.resolve(makeJson(403, { error: 'email_mismatch' }));
      return Promise.reject(new Error(`Unexpected: ${url}`));
    });

    const opts = makeOpts({ auth: 'github', fetch: fetchFn });
    await run(opts);

    assert.strictEqual(opts.exitCode, 10);
    expect(opts.capturedStderr.join('')).toContain('re-issue');
  });
});
