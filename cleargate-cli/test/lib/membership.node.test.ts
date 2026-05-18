import { describe, test, afterEach } from 'node:test';
import assert from 'node:assert/strict';

/**
 * membership.test.ts — CR-011
 *
 * Unit tests for getMembershipState() across 5 cases:
 *  1. File missing → pre-member
 *  2. Malformed JSON → pre-member
 *  3. Malformed JWT (not a JWT) → pre-member
 *  4. Expired JWT → pre-member
 *  5. Valid (non-expired) JWT → member
 */

import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { getMembershipState, decodeJwtPayload } from '../../src/lib/membership.js';

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


// ─── Helpers ──────────────────────────────────────────────────────────────────

const tmpDirs: string[] = [];

function makeTmpDir(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cg-membership-test-'));
  tmpDirs.push(dir);
  return dir;
}

afterEach(() => {
  for (const dir of tmpDirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

/**
 * Build a minimal JWT (HS256 shape) with the given payload.
 * We don't sign it — getMembershipState only decodes, never verifies sig.
 */
function buildFakeJwt(payload: Record<string, unknown>): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = 'fakesig';
  return `${header}.${body}.${sig}`;
}

/**
 * Write an auth.json file with the given refresh token for the given profile.
 */
function writeAuthFile(
  cleargateHome: string,
  profile: string,
  refreshToken: string,
): void {
  fs.mkdirSync(cleargateHome, { recursive: true });
  const authFile = {
    version: 1,
    profiles: {
      [profile]: { refreshToken },
    },
  };
  fs.writeFileSync(
    path.join(cleargateHome, 'auth.json'),
    JSON.stringify(authFile, null, 2),
    'utf8',
  );
}

// ─── Scenario 1: File missing → pre-member ────────────────────────────────────

describe('Scenario: File missing → pre-member', () => {
  test('returns pre-member when auth.json does not exist', () => {
    const dir = makeTmpDir();
    const nonExistentHome = path.join(dir, 'nonexistent');

    const result = getMembershipState({ cleargateHome: nonExistentHome });

    assert.deepStrictEqual(result, { state: 'pre-member' });
  });
});

// ─── Scenario 2: Malformed JSON → pre-member ─────────────────────────────────

describe('Scenario: Malformed JSON → pre-member', () => {
  test('returns pre-member when auth.json contains invalid JSON', () => {
    const dir = makeTmpDir();
    const home = path.join(dir, '.cleargate');
    fs.mkdirSync(home, { recursive: true });
    fs.writeFileSync(path.join(home, 'auth.json'), '{ invalid json !!!', 'utf8');

    const result = getMembershipState({ cleargateHome: home });

    assert.deepStrictEqual(result, { state: 'pre-member' });
  });

  test('returns pre-member when auth.json has wrong version', () => {
    const dir = makeTmpDir();
    const home = path.join(dir, '.cleargate');
    fs.mkdirSync(home, { recursive: true });
    fs.writeFileSync(
      path.join(home, 'auth.json'),
      JSON.stringify({ version: 99, profiles: {} }),
      'utf8',
    );

    const result = getMembershipState({ cleargateHome: home });

    assert.deepStrictEqual(result, { state: 'pre-member' });
  });

  test('returns pre-member when profile is absent from auth.json', () => {
    const dir = makeTmpDir();
    const home = path.join(dir, '.cleargate');
    writeAuthFile(home, 'other-profile', buildFakeJwt({ sub: 'user', project_id: 'p1', exp: Math.floor(Date.now() / 1000) + 3600 }));

    const result = getMembershipState({ cleargateHome: home, profile: 'default' });

    assert.deepStrictEqual(result, { state: 'pre-member' });
  });
});

// ─── Scenario 3: Malformed JWT → pre-member ──────────────────────────────────

describe('Scenario: Malformed JWT → pre-member', () => {
  test('returns pre-member when refresh token is not a valid JWT (not 3 parts)', () => {
    const dir = makeTmpDir();
    const home = path.join(dir, '.cleargate');
    writeAuthFile(home, 'default', 'not-a-jwt-token');

    const result = getMembershipState({ cleargateHome: home });

    assert.deepStrictEqual(result, { state: 'pre-member' });
  });

  test('returns pre-member when JWT payload is not valid base64url JSON', () => {
    const dir = makeTmpDir();
    const home = path.join(dir, '.cleargate');
    writeAuthFile(home, 'default', 'header.!!!invalid_base64!!!.sig');

    const result = getMembershipState({ cleargateHome: home });

    assert.deepStrictEqual(result, { state: 'pre-member' });
  });

  test('returns pre-member when JWT payload has no exp claim', () => {
    const dir = makeTmpDir();
    const home = path.join(dir, '.cleargate');
    const jwt = buildFakeJwt({ sub: 'user', project_id: 'p1' }); // no exp

    writeAuthFile(home, 'default', jwt);

    const result = getMembershipState({ cleargateHome: home });

    assert.deepStrictEqual(result, { state: 'pre-member' });
  });
});

// ─── Scenario 4: Expired JWT → pre-member ────────────────────────────────────

describe('Scenario: Expired JWT → pre-member', () => {
  test('returns pre-member when JWT exp is in the past', () => {
    const dir = makeTmpDir();
    const home = path.join(dir, '.cleargate');

    const expiredExp = Math.floor(Date.now() / 1000) - 3600; // 1 hour ago
    const jwt = buildFakeJwt({
      sub: 'user-uuid-123',
      project_id: 'proj-abc',
      exp: expiredExp,
      type: 'refresh',
    });

    writeAuthFile(home, 'default', jwt);

    const result = getMembershipState({ cleargateHome: home });

    assert.deepStrictEqual(result, { state: 'pre-member' });
  });

  test('returns pre-member when JWT exp equals now (boundary condition)', () => {
    const dir = makeTmpDir();
    const home = path.join(dir, '.cleargate');
    const nowMs = 1_700_000_000_000;
    const expiredExp = Math.floor(nowMs / 1000); // exp == now means expired

    const jwt = buildFakeJwt({
      sub: 'user-uuid-123',
      project_id: 'proj-abc',
      exp: expiredExp,
    });

    writeAuthFile(home, 'default', jwt);

    const result = getMembershipState({ cleargateHome: home, now: () => nowMs });

    assert.deepStrictEqual(result, { state: 'pre-member' });
  });
});

// ─── Scenario 5: Valid JWT → member ──────────────────────────────────────────

describe('Scenario: Valid (non-expired) JWT → member', () => {
  test('returns member state with email, project_id, expires_at from JWT claims', () => {
    const dir = makeTmpDir();
    const home = path.join(dir, '.cleargate');

    const nowMs = 1_700_000_000_000;
    const futureExp = Math.floor(nowMs / 1000) + 7 * 24 * 3600; // 7 days from now

    const jwt = buildFakeJwt({
      sub: 'user-uuid-456',
      project_id: 'project-xyz',
      exp: futureExp,
      type: 'refresh',
    });

    writeAuthFile(home, 'default', jwt);

    const result = getMembershipState({ cleargateHome: home, now: () => nowMs });

    assert.strictEqual(result.state, 'member');
    if (result.state === 'member') {
      assert.strictEqual(result.email, 'user-uuid-456');
      assert.strictEqual(result.project_id, 'project-xyz');
      assert.strictEqual(result.expires_at, new Date(futureExp * 1000).toISOString());
    }
  });

  test('returns member state for non-default profile when that profile has a valid token', () => {
    const dir = makeTmpDir();
    const home = path.join(dir, '.cleargate');

    const nowMs = 1_700_000_000_000;
    const futureExp = Math.floor(nowMs / 1000) + 3600;

    const jwt = buildFakeJwt({
      sub: 'user-work',
      project_id: 'work-project',
      exp: futureExp,
    });

    fs.mkdirSync(home, { recursive: true });
    const authFile = {
      version: 1,
      profiles: {
        default: { refreshToken: 'not-a-jwt' }, // default profile is pre-member
        work: { refreshToken: jwt },
      },
    };
    fs.writeFileSync(path.join(home, 'auth.json'), JSON.stringify(authFile), 'utf8');

    const defaultResult = getMembershipState({ cleargateHome: home, profile: 'default', now: () => nowMs });
    assert.deepStrictEqual(defaultResult, { state: 'pre-member' });

    const workResult = getMembershipState({ cleargateHome: home, profile: 'work', now: () => nowMs });
    assert.strictEqual(workResult.state, 'member');
  });
});

// ─── decodeJwtPayload helper tests ────────────────────────────────────────────

describe('decodeJwtPayload helper', () => {
  test('returns null for tokens with fewer than 3 parts', () => {
    expect(decodeJwtPayload('only.two')).toBeNull();
    expect(decodeJwtPayload('onlyone')).toBeNull();
  });

  test('returns null when payload part is not valid base64url JSON', () => {
    expect(decodeJwtPayload('header.!!!.sig')).toBeNull();
  });

  test('decodes a valid JWT payload', () => {
    const payload = { sub: 'test', exp: 9999999999, project_id: 'p1' };
    const jwt = buildFakeJwt(payload);
    const decoded = decodeJwtPayload(jwt);
    assert.deepStrictEqual(decoded, payload);
  });
});
