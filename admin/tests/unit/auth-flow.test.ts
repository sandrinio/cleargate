/**
 * Unit tests for auth flow session shape — STORY-006-02
 *
 * Validates that the session JSON written to Redis matches the M1 contract:
 * { github_handle: string, github_user_id: string, expires_at: ISO-8601 }
 *
 * Uses a manual in-memory Redis store (same pattern as redis-adapter.test.ts).
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

// In-memory store shared with redis mock
const store: Record<string, string> = {};

// Minimal Redis mock for this test
const redisMock = {
  get: vi.fn(async (key: string) => store[key] ?? null),
  set: vi.fn(async (key: string, value: string) => {
    store[key] = value;
    return 'OK';
  }),
  del: vi.fn(async (key: string) => {
    delete store[key];
    return 1;
  }),
};

vi.mock('ioredis', () => ({ default: vi.fn(() => redisMock) }));
process.env['REDIS_URL'] = 'redis://localhost:6379';

import { createRedisAdapter, _resetRedisClient } from '../../src/lib/auth/redis-adapter.js';

describe('auth flow session shape matches M1 contract', () => {
  beforeEach(() => {
    Object.keys(store).forEach((k) => delete store[k]);
    vi.clearAllMocks();
    _resetRedisClient();
  });

  it('createSession writes github_handle + github_user_id + expires_at to Redis', async () => {
    const adapter = createRedisAdapter();

    // Simulate what @auth/sveltekit does after GitHub OAuth:
    // 1. createUser is called with the extended profile
    const user = {
      id: 'user-octocat',
      email: 'octocat@example.com',
      emailVerified: null,
      name: 'The Octocat',
      image: 'https://github.com/images/error/octocat_happy.gif',
      github_handle: 'octocat',
      github_user_id: '1',
      avatar_url: 'https://github.com/images/error/octocat_happy.gif',
    };

    await adapter.createUser!(user as import('@auth/core/adapters').AdapterUser);

    // 2. createSession is called by @auth/sveltekit with the session token
    const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await adapter.createSession!({
      sessionToken: 'session-token-octocat',
      userId: 'user-octocat',
      expires,
    });

    // 3. Assert the raw Redis entry matches M1 contract
    const rawSession = store['cg_session:session-token-octocat'];
    expect(rawSession).toBeDefined();

    const sessionData = JSON.parse(rawSession);

    // M1 contract fields (required by mcp/src/admin-api/auth-exchange.ts)
    expect(sessionData.github_handle).toBe('octocat');
    expect(sessionData.github_user_id).toBe('1');
    expect(sessionData.expires_at).toBeDefined();
    expect(() => new Date(sessionData.expires_at)).not.toThrow();

    // expires_at should be an ISO-8601 string
    expect(sessionData.expires_at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
  });

  it('session key prefix is cg_session: (never rev:, rl:, idem:)', async () => {
    const adapter = createRedisAdapter();

    await adapter.createUser!({
      id: 'user-prefixcheck',
      email: 'prefix@example.com',
      emailVerified: null,
      name: 'prefixcheck',
      github_handle: 'prefixcheck',
      github_user_id: '2',
    } as import('@auth/core/adapters').AdapterUser);

    await adapter.createSession!({
      sessionToken: 'tok-prefix',
      userId: 'user-prefixcheck',
      expires: new Date(Date.now() + 86400000),
    });

    const sessionKeys = Object.keys(store).filter((k) => !k.startsWith('cg_user:'));
    expect(sessionKeys.length).toBeGreaterThan(0);
    expect(sessionKeys.every((k) => k.startsWith('cg_session:'))).toBe(true);
    expect(sessionKeys.some((k) => k.startsWith('rev:'))).toBe(false);
    expect(sessionKeys.some((k) => k.startsWith('rl:'))).toBe(false);
    expect(sessionKeys.some((k) => k.startsWith('idem:'))).toBe(false);
  });

  it('deleteSession removes exactly the cg_session:* key', async () => {
    const adapter = createRedisAdapter();

    await adapter.createUser!({
      id: 'user-del',
      email: 'del@example.com',
      emailVerified: null,
      name: 'del-user',
      github_handle: 'del-user',
      github_user_id: '3',
    } as import('@auth/core/adapters').AdapterUser);

    await adapter.createSession!({
      sessionToken: 'tok-del',
      userId: 'user-del',
      expires: new Date(Date.now() + 86400000),
    });

    expect(store['cg_session:tok-del']).toBeDefined();
    await adapter.deleteSession!('tok-del');
    expect(store['cg_session:tok-del']).toBeUndefined();
  });
});
