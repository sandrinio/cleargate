/**
 * Unit tests for cleargate join — all scenarios from W4.md R-1 through R-15
 * plus missing-positional scenario.
 *
 * fetch and createTokenStore are injected via the JoinOptions test seams;
 * no module mocking needed.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { joinHandler, type JoinOptions } from '../../src/commands/join.js';

const VALID_UUID = '12345678-1234-4234-8234-123456789abc';
const FAKE_REFRESH_TOKEN = 'FAKE_REFRESH_TOKEN_xyz_not_a_real_jwt';
const MCP_BASE = 'https://mcp.example.com';
const FULL_URL = `${MCP_BASE}/join/${VALID_UUID}`;

/** A FakeTokenStore whose save() is a vitest spy */
function makeFakeStore() {
  const save = vi.fn<[string, string], Promise<void>>().mockResolvedValue(undefined);
  const load = vi.fn<[string], Promise<string | null>>().mockResolvedValue(null);
  const remove = vi.fn<[string], Promise<void>>().mockResolvedValue(undefined);
  return {
    save,
    load,
    remove,
    backend: 'file' as const,
  };
}

function makeSuccessResponse(overrides: Record<string, unknown> = {}): Response {
  const body = {
    refresh_token: FAKE_REFRESH_TOKEN,
    refresh_token_expires_in: 7_776_000,
    project_id: '00000000-0000-4000-8000-000000000001',
    project_name: 'cleargate-core',
    member_id: '00000000-0000-4000-8000-000000000002',
    member_role: 'user',
    ...overrides,
  };
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
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
    ...partial,
    // expose captured arrays so tests can assert
    capturedStdout,
    capturedStderr,
    get exitCode() { return exitCode; },
  };
}

/** Run handler; swallows the mock EXIT error; returns whether it exited */
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

// ─── R-1: Happy path, full URL ────────────────────────────────────────────────
describe('R-1: happy path — full URL', () => {
  it('calls fetch with the correct POST URL', async () => {
    const store = makeFakeStore();
    const fetchFn = vi.fn<Parameters<typeof fetch>, ReturnType<typeof fetch>>()
      .mockResolvedValue(makeSuccessResponse());
    const opts = makeOpts({
      inviteUrl: FULL_URL,
      fetch: fetchFn,
      createStore: async () => store,
    });
    await run(opts);
    expect(fetchFn).toHaveBeenCalledWith(FULL_URL, { method: 'POST' });
  });

  it('saves the refresh token under the default profile', async () => {
    const store = makeFakeStore();
    const opts = makeOpts({
      fetch: vi.fn<Parameters<typeof fetch>, ReturnType<typeof fetch>>().mockResolvedValue(makeSuccessResponse()),
      createStore: async () => store,
    });
    await run(opts);
    expect(store.save).toHaveBeenCalledWith('default', FAKE_REFRESH_TOKEN);
  });

  it('stdout contains joined project line', async () => {
    const store = makeFakeStore();
    const opts = makeOpts({
      fetch: vi.fn<Parameters<typeof fetch>, ReturnType<typeof fetch>>().mockResolvedValue(makeSuccessResponse()),
      createStore: async () => store,
    });
    await run(opts);
    const allStdout = opts.capturedStdout.join('');
    expect(allStdout).toContain("joined project 'cleargate-core' as 'test-box'");
  });

  it('stdout contains refresh token saved line', async () => {
    const store = makeFakeStore();
    const opts = makeOpts({
      fetch: vi.fn<Parameters<typeof fetch>, ReturnType<typeof fetch>>().mockResolvedValue(makeSuccessResponse()),
      createStore: async () => store,
    });
    await run(opts);
    const allStdout = opts.capturedStdout.join('');
    expect(allStdout).toContain('refresh token saved to file');
  });

  it('no stderr on success', async () => {
    const store = makeFakeStore();
    const opts = makeOpts({
      fetch: vi.fn<Parameters<typeof fetch>, ReturnType<typeof fetch>>().mockResolvedValue(makeSuccessResponse()),
      createStore: async () => store,
    });
    await run(opts);
    expect(opts.capturedStderr.join('')).toBe('');
  });

  it('no exit on success', async () => {
    const store = makeFakeStore();
    const opts = makeOpts({
      fetch: vi.fn<Parameters<typeof fetch>, ReturnType<typeof fetch>>().mockResolvedValue(makeSuccessResponse()),
      createStore: async () => store,
    });
    await run(opts);
    expect(opts.exitCode).toBeUndefined();
  });
});

// ─── R-2: Happy path, bare UUID ───────────────────────────────────────────────
describe('R-2: happy path — bare UUID', () => {
  it('calls fetch with base URL from mcpUrlFlag', async () => {
    const store = makeFakeStore();
    const fetchFn = vi.fn<Parameters<typeof fetch>, ReturnType<typeof fetch>>()
      .mockResolvedValue(makeSuccessResponse());
    const opts = makeOpts({
      inviteUrl: VALID_UUID,
      mcpUrlFlag: MCP_BASE,
      fetch: fetchFn,
      createStore: async () => store,
    });
    await run(opts);
    expect(fetchFn).toHaveBeenCalledWith(`${MCP_BASE}/join/${VALID_UUID}`, { method: 'POST' });
  });

  it('saves refresh token on bare UUID success', async () => {
    const store = makeFakeStore();
    const opts = makeOpts({
      inviteUrl: VALID_UUID,
      mcpUrlFlag: MCP_BASE,
      fetch: vi.fn<Parameters<typeof fetch>, ReturnType<typeof fetch>>().mockResolvedValue(makeSuccessResponse()),
      createStore: async () => store,
    });
    await run(opts);
    expect(store.save).toHaveBeenCalledWith('default', FAKE_REFRESH_TOKEN);
  });
});

// ─── R-3: Bare UUID but no mcpUrl configured ──────────────────────────────────
describe('R-3: bare UUID — no mcpUrl', () => {
  it('exits 5 when mcpUrl is absent', async () => {
    const opts = makeOpts({
      inviteUrl: VALID_UUID,
      // no mcpUrlFlag; config file won't exist in test env
    });
    await run(opts);
    expect(opts.exitCode).toBe(5);
  });

  it('stderr mentions mcpUrl', async () => {
    const opts = makeOpts({
      inviteUrl: VALID_UUID,
    });
    await run(opts);
    expect(opts.capturedStderr.join('')).toContain('mcpUrl');
  });
});

// ─── R-4: Invalid URL format ──────────────────────────────────────────────────
describe('R-4: invalid URL format', () => {
  it('exits 5 for gibberish input', async () => {
    const opts = makeOpts({ inviteUrl: 'not-a-url' });
    await run(opts);
    expect(opts.exitCode).toBe(5);
  });

  it('stderr mentions invalid invite URL', async () => {
    const opts = makeOpts({ inviteUrl: 'not-a-url' });
    await run(opts);
    expect(opts.capturedStderr.join('')).toContain('invalid invite URL or token format');
  });
});

// ─── R-5: URL with wrong path ─────────────────────────────────────────────────
describe('R-5: URL with wrong path (old /invite/ path)', () => {
  it('exits 5 for /invite/ path', async () => {
    const opts = makeOpts({ inviteUrl: `${MCP_BASE}/invite/${VALID_UUID}` });
    await run(opts);
    expect(opts.exitCode).toBe(5);
  });
});

// ─── R-6: 410 invite_expired ──────────────────────────────────────────────────
describe('R-6: 410 invite_expired', () => {
  it('exits 3', async () => {
    const opts = makeOpts({
      fetch: vi.fn<Parameters<typeof fetch>, ReturnType<typeof fetch>>().mockResolvedValue(
        new Response(JSON.stringify({ error: 'invite_expired' }), {
          status: 410,
          headers: { 'content-type': 'application/json' },
        }),
      ),
    });
    await run(opts);
    expect(opts.exitCode).toBe(3);
  });

  it('stderr contains invite expired', async () => {
    const opts = makeOpts({
      fetch: vi.fn<Parameters<typeof fetch>, ReturnType<typeof fetch>>().mockResolvedValue(
        new Response(JSON.stringify({ error: 'invite_expired' }), {
          status: 410,
          headers: { 'content-type': 'application/json' },
        }),
      ),
    });
    await run(opts);
    expect(opts.capturedStderr.join('')).toContain('invite expired');
  });

  it('store.save is NOT called on expired invite', async () => {
    const store = makeFakeStore();
    const opts = makeOpts({
      fetch: vi.fn<Parameters<typeof fetch>, ReturnType<typeof fetch>>().mockResolvedValue(
        new Response(JSON.stringify({ error: 'invite_expired' }), { status: 410 }),
      ),
      createStore: async () => store,
    });
    await run(opts);
    expect(store.save).not.toHaveBeenCalled();
  });
});

// ─── R-7: 410 invite_already_consumed ────────────────────────────────────────
describe('R-7: 410 invite_already_consumed', () => {
  it('exits 3', async () => {
    const opts = makeOpts({
      fetch: vi.fn<Parameters<typeof fetch>, ReturnType<typeof fetch>>().mockResolvedValue(
        new Response(JSON.stringify({ error: 'invite_already_consumed' }), { status: 410 }),
      ),
    });
    await run(opts);
    expect(opts.exitCode).toBe(3);
  });

  it('stderr contains invite already consumed', async () => {
    const opts = makeOpts({
      fetch: vi.fn<Parameters<typeof fetch>, ReturnType<typeof fetch>>().mockResolvedValue(
        new Response(JSON.stringify({ error: 'invite_already_consumed' }), { status: 410 }),
      ),
    });
    await run(opts);
    expect(opts.capturedStderr.join('')).toContain('invite already consumed');
  });
});

// ─── R-8: 404 ─────────────────────────────────────────────────────────────────
describe('R-8: 404', () => {
  it('exits 4', async () => {
    const opts = makeOpts({
      fetch: vi.fn<Parameters<typeof fetch>, ReturnType<typeof fetch>>().mockResolvedValue(
        new Response(JSON.stringify({ error: 'not_found' }), { status: 404 }),
      ),
    });
    await run(opts);
    expect(opts.exitCode).toBe(4);
  });

  it('stderr contains invite not found', async () => {
    const opts = makeOpts({
      fetch: vi.fn<Parameters<typeof fetch>, ReturnType<typeof fetch>>().mockResolvedValue(
        new Response(JSON.stringify({ error: 'not_found' }), { status: 404 }),
      ),
    });
    await run(opts);
    expect(opts.capturedStderr.join('')).toContain('invite not found');
  });
});

// ─── R-9: 429 ─────────────────────────────────────────────────────────────────
describe('R-9: 429 rate limited', () => {
  it('exits 8', async () => {
    const opts = makeOpts({
      fetch: vi.fn<Parameters<typeof fetch>, ReturnType<typeof fetch>>().mockResolvedValue(
        new Response(null, {
          status: 429,
          headers: { 'retry-after': '600' },
        }),
      ),
    });
    await run(opts);
    expect(opts.exitCode).toBe(8);
  });

  it('stderr mentions Retry after 600s', async () => {
    const opts = makeOpts({
      fetch: vi.fn<Parameters<typeof fetch>, ReturnType<typeof fetch>>().mockResolvedValue(
        new Response(null, {
          status: 429,
          headers: { 'retry-after': '600' },
        }),
      ),
    });
    await run(opts);
    expect(opts.capturedStderr.join('')).toContain('Retry after 600s');
  });
});

// ─── R-10: 5xx ────────────────────────────────────────────────────────────────
describe('R-10: 5xx server error', () => {
  it('exits 6 on 503', async () => {
    const opts = makeOpts({
      fetch: vi.fn<Parameters<typeof fetch>, ReturnType<typeof fetch>>().mockResolvedValue(
        new Response(null, { status: 503 }),
      ),
    });
    await run(opts);
    expect(opts.exitCode).toBe(6);
  });

  it('stderr contains server error 503', async () => {
    const opts = makeOpts({
      fetch: vi.fn<Parameters<typeof fetch>, ReturnType<typeof fetch>>().mockResolvedValue(
        new Response(null, { status: 503 }),
      ),
    });
    await run(opts);
    expect(opts.capturedStderr.join('')).toContain('server error 503');
  });
});

// ─── R-11: Network failure ────────────────────────────────────────────────────
describe('R-11: network failure', () => {
  it('exits 2', async () => {
    const opts = makeOpts({
      fetch: vi.fn<Parameters<typeof fetch>, ReturnType<typeof fetch>>().mockRejectedValue(
        new Error('ECONNREFUSED'),
      ),
    });
    await run(opts);
    expect(opts.exitCode).toBe(2);
  });

  it('stderr contains cannot reach', async () => {
    const opts = makeOpts({
      fetch: vi.fn<Parameters<typeof fetch>, ReturnType<typeof fetch>>().mockRejectedValue(
        new Error('ECONNREFUSED'),
      ),
    });
    await run(opts);
    expect(opts.capturedStderr.join('')).toContain('cannot reach');
  });

  it('stderr contains the inner error message', async () => {
    const opts = makeOpts({
      fetch: vi.fn<Parameters<typeof fetch>, ReturnType<typeof fetch>>().mockRejectedValue(
        new Error('ECONNREFUSED'),
      ),
    });
    await run(opts);
    expect(opts.capturedStderr.join('')).toContain('ECONNREFUSED');
  });
});

// ─── R-12: Response shape missing refresh_token ───────────────────────────────
describe('R-12: missing refresh_token in response', () => {
  it('exits 7', async () => {
    const opts = makeOpts({
      fetch: vi.fn<Parameters<typeof fetch>, ReturnType<typeof fetch>>().mockResolvedValue(
        new Response(JSON.stringify({ project_name: 'X' }), { status: 200 }),
      ),
    });
    await run(opts);
    expect(opts.exitCode).toBe(7);
  });

  it('stderr mentions unexpected response shape', async () => {
    const opts = makeOpts({
      fetch: vi.fn<Parameters<typeof fetch>, ReturnType<typeof fetch>>().mockResolvedValue(
        new Response(JSON.stringify({ project_name: 'X' }), { status: 200 }),
      ),
    });
    await run(opts);
    expect(opts.capturedStderr.join('')).toContain('unexpected response shape');
  });
});

// ─── R-13: --profile staging routes save ─────────────────────────────────────
describe('R-13: --profile staging routes save correctly', () => {
  it('calls store.save with (staging, token)', async () => {
    const store = makeFakeStore();
    const opts = makeOpts({
      profile: 'staging',
      fetch: vi.fn<Parameters<typeof fetch>, ReturnType<typeof fetch>>().mockResolvedValue(makeSuccessResponse()),
      createStore: async () => store,
    });
    await run(opts);
    expect(store.save).toHaveBeenCalledWith('staging', FAKE_REFRESH_TOKEN);
  });
});

// ─── R-14: Plaintext redaction ───────────────────────────────────────────────
describe('R-14: refresh_token never leaks to stdout/stderr', () => {
  beforeEach(() => {
    process.env['CLEARGATE_LOG_LEVEL'] = 'debug';
  });
  afterEach(() => {
    delete process.env['CLEARGATE_LOG_LEVEL'];
  });

  it('stdout does not contain the raw refresh token', async () => {
    const store = makeFakeStore();
    const opts = makeOpts({
      fetch: vi.fn<Parameters<typeof fetch>, ReturnType<typeof fetch>>().mockResolvedValue(makeSuccessResponse()),
      createStore: async () => store,
    });
    await run(opts);
    const allOutput = [...opts.capturedStdout, ...opts.capturedStderr].join('');
    expect(allOutput).not.toContain(FAKE_REFRESH_TOKEN);
  });

  it('stderr does not contain the raw refresh token', async () => {
    const store = makeFakeStore();
    const opts = makeOpts({
      fetch: vi.fn<Parameters<typeof fetch>, ReturnType<typeof fetch>>().mockResolvedValue(makeSuccessResponse()),
      createStore: async () => store,
    });
    await run(opts);
    expect(opts.capturedStderr.join('')).not.toContain(FAKE_REFRESH_TOKEN);
  });
});

// ─── R-15: Hostname in success message ───────────────────────────────────────
describe('R-15: hostname appears in success message', () => {
  it('stdout uses the supplied hostname', async () => {
    const store = makeFakeStore();
    const opts = makeOpts({
      hostname: () => 'my-laptop.local',
      fetch: vi.fn<Parameters<typeof fetch>, ReturnType<typeof fetch>>().mockResolvedValue(makeSuccessResponse()),
      createStore: async () => store,
    });
    await run(opts);
    expect(opts.capturedStdout.join('')).toContain("as 'my-laptop.local'");
  });
});

// ─── URL edge cases ───────────────────────────────────────────────────────────
describe('URL edge case: query params stripped from fetch URL', () => {
  it('token is extracted from URL path ignoring query string', async () => {
    const store = makeFakeStore();
    const fetchFn = vi.fn<Parameters<typeof fetch>, ReturnType<typeof fetch>>()
      .mockResolvedValue(makeSuccessResponse());
    const opts = makeOpts({
      inviteUrl: `${MCP_BASE}/join/${VALID_UUID}?utm=x`,
      fetch: fetchFn,
      createStore: async () => store,
    });
    await run(opts);
    // The POST URL must be clean — built from url.origin + /join/ + token
    expect(fetchFn).toHaveBeenCalledWith(FULL_URL, { method: 'POST' });
  });
});

describe('URL edge case: trailing segment rejected', () => {
  it('exits 5 for path /join/<uuid>/trailing', async () => {
    const opts = makeOpts({
      inviteUrl: `${MCP_BASE}/join/${VALID_UUID}/trailing`,
    });
    await run(opts);
    expect(opts.exitCode).toBe(5);
  });
});

// ─── R-16: Unhandled exception (D13) ─────────────────────────────────────────
describe('R-16: unhandled exception from store.save exits 99', () => {
  it('exits 99 when store.save rejects unexpectedly', async () => {
    const store = makeFakeStore();
    store.save.mockRejectedValue(new Error('keychain busted'));
    const opts = makeOpts({
      fetch: vi.fn<Parameters<typeof fetch>, ReturnType<typeof fetch>>().mockResolvedValue(
        makeSuccessResponse(),
      ),
      createStore: async () => store,
    });
    await run(opts);
    expect(opts.exitCode).toBe(99);
  });

  it('stderr contains "cleargate: internal error: keychain busted"', async () => {
    const store = makeFakeStore();
    store.save.mockRejectedValue(new Error('keychain busted'));
    const opts = makeOpts({
      fetch: vi.fn<Parameters<typeof fetch>, ReturnType<typeof fetch>>().mockResolvedValue(
        makeSuccessResponse(),
      ),
      createStore: async () => store,
    });
    await run(opts);
    expect(opts.capturedStderr.join('')).toContain(
      'cleargate: internal error: keychain busted',
    );
  });
});
