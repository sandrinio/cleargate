/**
 * Unit tests for redis-adapter — STORY-006-02
 *
 * Gherkin: "No Redis-key collision with existing prefixes"
 * Tests: session CRUD + key-namespace guard (only cg_session:* written).
 *
 * Uses a manual in-memory Redis mock (no ioredis-mock dependency needed).
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

// ---------------------------------------------------------------------------
// In-memory Redis mock
// ---------------------------------------------------------------------------
const store: Record<string, { value: string; expiresAt?: number }> = {};

const redisMock = {
  get: vi.fn(async (key: string) => {
    const entry = store[key];
    if (!entry) return null;
    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      delete store[key];
      return null;
    }
    return entry.value;
  }),
  set: vi.fn(async (key: string, value: string, ...args: unknown[]) => {
    const ttlIdx = (args as string[]).findIndex((a) => a === 'EX');
    let expiresAt: number | undefined;
    if (ttlIdx !== -1) {
      const ttlSec = Number(args[ttlIdx + 1]);
      expiresAt = Date.now() + ttlSec * 1000;
    }
    // Handle KEEPTTL — keep existing TTL
    const keepTtlIdx = (args as string[]).findIndex((a) => a === 'KEEPTTL');
    if (keepTtlIdx !== -1 && store[key]) {
      expiresAt = store[key].expiresAt;
    }
    store[key] = { value, expiresAt };
    return 'OK';
  }),
  del: vi.fn(async (key: string) => {
    const existed = key in store;
    delete store[key];
    return existed ? 1 : 0;
  }),
  keys: vi.fn(async (pattern: string) => {
    const regex = new RegExp('^' + pattern.replace('*', '.*') + '$');
    return Object.keys(store).filter((k) => regex.test(k));
  }),
};

// Mock ioredis so createRedisAdapter uses our mock
vi.mock('ioredis', () => {
  return {
    default: vi.fn(() => redisMock),
  };
});

// Set REDIS_URL before importing the adapter
process.env['REDIS_URL'] = 'redis://localhost:6379';

// Import AFTER mocking ioredis
import { createRedisAdapter, _resetRedisClient } from '../../src/lib/auth/redis-adapter.js';

describe('Redis adapter — key-namespace guard', () => {
  beforeEach(() => {
    // Clear in-memory store and reset mock call counts
    Object.keys(store).forEach((k) => delete store[k]);
    vi.clearAllMocks();
    _resetRedisClient();
  });

  it('createSession writes only cg_session:* keys', async () => {
    const adapter = createRedisAdapter();

    // Seed a user first (needed by createSession to populate session JSON)
    await redisMock.set(
      'cg_user:user-123',
      JSON.stringify({
        id: 'user-123',
        email: 'alice@example.com',
        emailVerified: null,
        name: 'alice',
        github_handle: 'alice',
        github_user_id: '42',
        avatar_url: 'https://github.com/alice.png',
      }),
    );

    const session = await adapter.createSession!({
      sessionToken: 'abc123token',
      userId: 'user-123',
      expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    // Verify the session returned correctly
    expect(session.sessionToken).toBe('abc123token');
    expect(session.userId).toBe('user-123');

    // Assert only cg_session:* keys were written by createSession
    const allWrittenKeys = redisMock.set.mock.calls.map((c) => c[0] as string);
    // Filter out the manual user seed we did above
    const adapterWrittenKeys = allWrittenKeys.filter((k) => !k.startsWith('cg_user:'));
    expect(adapterWrittenKeys.every((k) => k.startsWith('cg_session:'))).toBe(true);

    // Assert NO collision with MCP-owned prefixes
    expect(adapterWrittenKeys.some((k) => k.startsWith('rev:'))).toBe(false);
    expect(adapterWrittenKeys.some((k) => k.startsWith('rl:'))).toBe(false);
    expect(adapterWrittenKeys.some((k) => k.startsWith('idem:'))).toBe(false);
    expect(adapterWrittenKeys.some((k) => k.startsWith('member_invite:'))).toBe(false);
  });

  it('getSessionAndUser round-trips a session correctly', async () => {
    const adapter = createRedisAdapter();
    const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    // Seed user
    await redisMock.set(
      'cg_user:user-456',
      JSON.stringify({
        id: 'user-456',
        email: 'bob@example.com',
        emailVerified: null,
        name: 'bob',
        github_handle: 'bob',
        github_user_id: '99',
        avatar_url: null,
      }),
    );

    await adapter.createSession!({
      sessionToken: 'tok-round-trip',
      userId: 'user-456',
      expires,
    });

    const result = await adapter.getSessionAndUser!('tok-round-trip');
    expect(result).not.toBeNull();
    expect(result!.session.sessionToken).toBe('tok-round-trip');
    expect(result!.session.userId).toBe('user-456');
    expect(result!.user.email).toBe('bob@example.com');
  });

  it('deleteSession removes the cg_session:* key from Redis', async () => {
    const adapter = createRedisAdapter();
    const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    // Seed user
    await redisMock.set(
      'cg_user:user-789',
      JSON.stringify({
        id: 'user-789',
        email: 'carol@example.com',
        emailVerified: null,
        name: 'carol',
        github_handle: 'carol',
        github_user_id: '77',
        avatar_url: null,
      }),
    );

    await adapter.createSession!({
      sessionToken: 'tok-to-delete',
      userId: 'user-789',
      expires,
    });

    // Verify it exists
    expect(store['cg_session:tok-to-delete']).toBeDefined();

    await adapter.deleteSession!('tok-to-delete');

    // Verify it's gone
    expect(store['cg_session:tok-to-delete']).toBeUndefined();
  });

  it('createSession sets Redis TTL matching session expires', async () => {
    const adapter = createRedisAdapter();
    const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    // Seed user
    await redisMock.set(
      'cg_user:user-ttl',
      JSON.stringify({
        id: 'user-ttl',
        email: 'ttl@example.com',
        emailVerified: null,
        name: 'ttl-user',
        github_handle: 'ttl-user',
        github_user_id: '55',
        avatar_url: null,
      }),
    );

    await adapter.createSession!({
      sessionToken: 'tok-ttl',
      userId: 'user-ttl',
      expires,
    });

    // Find the SET call for the session key
    const sessionSetCall = redisMock.set.mock.calls.find((c) =>
      (c[0] as string).startsWith('cg_session:'),
    );
    expect(sessionSetCall).toBeDefined();

    const exArg = sessionSetCall?.find((a) => a === 'EX');
    expect(exArg).toBe('EX');
    const ttlArg = Number(sessionSetCall?.[sessionSetCall.indexOf('EX') + 1]);
    // TTL should be at least 604800 (7 days in seconds)
    expect(ttlArg).toBeGreaterThanOrEqual(604800);
  });

  it('session JSON contains github_handle and github_user_id for M1 exchange contract', async () => {
    const adapter = createRedisAdapter();
    const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    // Seed user with github fields
    await redisMock.set(
      'cg_user:user-contract',
      JSON.stringify({
        id: 'user-contract',
        email: 'contract@example.com',
        emailVerified: null,
        name: 'octocat',
        github_handle: 'octocat',
        github_user_id: '1',
        avatar_url: 'https://github.com/images/error/octocat_happy.gif',
      }),
    );

    await adapter.createSession!({
      sessionToken: 'tok-contract',
      userId: 'user-contract',
      expires,
    });

    // Read back the raw JSON stored in Redis
    const raw = store['cg_session:tok-contract'];
    expect(raw).toBeDefined();
    const sessionData = JSON.parse(raw.value);

    // M1 contract fields must be present
    expect(sessionData.github_handle).toBe('octocat');
    expect(sessionData.github_user_id).toBe('1');
    expect(sessionData.expires_at).toBeDefined();
    expect(sessionData.issued_at).toBeDefined();
  });
});
