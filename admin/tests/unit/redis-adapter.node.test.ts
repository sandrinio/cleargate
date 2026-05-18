import { describe, test, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';

/**
 * Unit tests for redis-adapter — STORY-006-02
 *
 * Gherkin: "No Redis-key collision with existing prefixes"
 * Tests: session CRUD + key-namespace guard (only cg_session:* written).
 *
 * STORY-028-07: ioredis is redirected to src/lib/__mocks__/ioredis.ts via loader hooks.
 * Uses __ioredisState__.store as the shared in-memory store.
 */
// Import the shared ioredis state from our mock
import { __ioredisState__ } from '../../src/lib/__mocks__/ioredis.ts';
// Convenience alias
const store = __ioredisState__.store;

// Set REDIS_URL before importing the adapter
process.env['REDIS_URL'] = 'redis://localhost:6379';

// Import AFTER mocking ioredis
import { createRedisAdapter, _resetRedisClient } from '../../src/lib/auth/redis-adapter.js';

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
      const calls = (actual as { mock: { calls: { arguments: unknown[] }[] } }).mock.calls;
      assert.deepStrictEqual(calls[calls.length - 1]?.arguments, expectedArgs);
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
        async toThrow(msg?: string) {
          if (!msg) await assert.rejects(p);
          else await assert.rejects(p, new RegExp(esc(msg)));
        },
        async toSatisfy(predicate: (val: unknown) => boolean) {
          let err: unknown;
          try { await p; } catch(e) { err = e; }
          assert.ok(predicate(err), `Rejected value did not satisfy predicate. Got: ${String(err)}`);
        },
      };
    },
  };
}


describe('Redis adapter — key-namespace guard', () => {
  beforeEach(() => {
    // Clear in-memory store (shared with __ioredisState__)
    Object.keys(store).forEach((k) => delete store[k]);
    // Reset redis client so each test gets a fresh connection
    _resetRedisClient();
  });

  test('createSession writes only cg_session:* keys', async () => {
    const adapter = createRedisAdapter();

    // Seed a user first
    store['cg_user:user-123'] = { value: JSON.stringify({
      id: 'user-123', email: 'alice@example.com', emailVerified: null,
      name: 'alice', github_handle: 'alice', github_user_id: '42', avatar_url: null,
    }) };

    const session = await adapter.createSession!({
      sessionToken: 'abc123token',
      userId: 'user-123',
      expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    // Verify the session returned correctly
    assert.strictEqual(session.sessionToken, 'abc123token');
    assert.strictEqual(session.userId, 'user-123');

    // Assert only cg_session:* keys were written by createSession
    // (use the store directly since we no longer have mock.fn call tracking)
    const allKeys = Object.keys(store);
    const adapterWrittenKeys = allKeys.filter((k) => !k.startsWith('cg_user:'));
    expect(adapterWrittenKeys.every((k) => k.startsWith('cg_session:'))).toBe(true);

    // Assert NO collision with MCP-owned prefixes
    expect(adapterWrittenKeys.some((k) => k.startsWith('rev:'))).toBe(false);
    expect(adapterWrittenKeys.some((k) => k.startsWith('rl:'))).toBe(false);
    expect(adapterWrittenKeys.some((k) => k.startsWith('idem:'))).toBe(false);
    expect(adapterWrittenKeys.some((k) => k.startsWith('member_invite:'))).toBe(false);
  });

  test('getSessionAndUser round-trips a session correctly', async () => {
    const adapter = createRedisAdapter();
    const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    // Seed user
    store['cg_user:user-456'] = { value: JSON.stringify({
      id: 'user-456', email: 'bob@example.com', emailVerified: null,
      name: 'bob', github_handle: 'bob', github_user_id: '99', avatar_url: null,
    }) };

    await adapter.createSession!({
      sessionToken: 'tok-round-trip',
      userId: 'user-456',
      expires,
    });

    const result = await adapter.getSessionAndUser!('tok-round-trip');
    assert.notStrictEqual(result, null);
    assert.strictEqual(result!.session.sessionToken, 'tok-round-trip');
    assert.strictEqual(result!.session.userId, 'user-456');
    assert.strictEqual(result!.user.email, 'bob@example.com');
  });

  test('deleteSession removes the cg_session:* key from Redis', async () => {
    const adapter = createRedisAdapter();
    const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    // Seed user
    store['cg_user:user-789'] = { value: JSON.stringify({
      id: 'user-789', email: 'carol@example.com', emailVerified: null,
      name: 'carol', github_handle: 'carol', github_user_id: '77', avatar_url: null,
    }) };

    await adapter.createSession!({
      sessionToken: 'tok-to-delete',
      userId: 'user-789',
      expires,
    });

    // Verify it exists
    assert.notStrictEqual(store['cg_session:tok-to-delete'], undefined);

    await adapter.deleteSession!('tok-to-delete');

    // Verify it's gone
    assert.strictEqual(store['cg_session:tok-to-delete'], undefined);
  });

  test('createSession sets Redis TTL matching session expires', async () => {
    const adapter = createRedisAdapter();
    const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    // Seed user
    store['cg_user:user-ttl'] = { value: JSON.stringify({
      id: 'user-ttl', email: 'ttl@example.com', emailVerified: null,
      name: 'ttl-user', github_handle: 'ttl', github_user_id: '55', avatar_url: null,
    }) };

    await adapter.createSession!({
      sessionToken: 'tok-ttl',
      userId: 'user-ttl',
      expires,
    });

    // Check the TTL by looking at the stored session's expiresAt
    const sessionKey = Object.keys(store).find((k) => k.startsWith('cg_session:'));
    assert.notStrictEqual(sessionKey, undefined);
    const sessionEntry = store[sessionKey!];
    assert.notStrictEqual(sessionEntry, undefined);
    // TTL should be at least 604800 seconds (7 days) from now
    const expectedMinExpiry = Date.now() + 604800 * 1000;
    assert.ok((sessionEntry.expiresAt ?? 0) >= expectedMinExpiry - 1000); // 1s tolerance
  });

  test('session JSON contains github_handle and github_user_id for M1 exchange contract', async () => {
    const adapter = createRedisAdapter();
    const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    // Seed user with github fields directly into the shared ioredis store
    store['cg_user:user-contract'] = { value: JSON.stringify({
      id: 'user-contract',
      email: 'octocat@example.com',
      emailVerified: null,
      name: 'The Octocat',
      github_handle: 'octocat',
      github_user_id: '1',
      avatar_url: 'https://github.com/octocat.png',
    }) };

    await adapter.createSession!({
      sessionToken: 'tok-contract',
      userId: 'user-contract',
      expires,
    });

    // Read back the raw JSON stored in Redis
    const raw = store['cg_session:tok-contract'];
    assert.notStrictEqual(raw, undefined);
    const sessionData = JSON.parse(raw.value);

    // M1 contract fields must be present
    assert.strictEqual(sessionData.github_handle, 'octocat');
    assert.strictEqual(sessionData.github_user_id, '1');
    assert.notStrictEqual(sessionData.expires_at, undefined);
    assert.notStrictEqual(sessionData.issued_at, undefined);
  });
});
