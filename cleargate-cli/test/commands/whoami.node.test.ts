import { describe, test, afterEach } from 'node:test';
import assert from 'node:assert/strict';

/**
 * whoami.test.ts — CR-011
 *
 * Tests for `cleargate whoami --json` mode.
 * 4 scenarios per CR §4 acceptance step 4:
 *  1. Member state → {state, email, project_id, expires_at}
 *  2. Pre-member (no auth file) → {state: 'pre-member'}, no PII
 *  3. Pre-member (expired JWT) → {state: 'pre-member'}, no PII
 *  4. Pre-member (malformed JWT) → {state: 'pre-member'}, no PII
 *
 * Also tests backward compat: --json absent → existing network path still wired.
 */

import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { Buffer } from 'node:buffer';
import { whoamiHandler } from '../../src/commands/whoami.js';

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
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cg-whoami-test-'));
  tmpDirs.push(dir);
  return dir;
}

afterEach(() => {
  for (const dir of tmpDirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

function buildFakeJwt(payload: Record<string, unknown>): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${header}.${body}.fakesig`;
}

function writeAuthFile(
  cleargateHome: string,
  profile: string,
  refreshToken: string,
): void {
  fs.mkdirSync(cleargateHome, { recursive: true });
  fs.writeFileSync(
    path.join(cleargateHome, 'auth.json'),
    JSON.stringify({ version: 1, profiles: { [profile]: { refreshToken } } }),
    'utf8',
  );
}

function makeOpts(overrides: Partial<Parameters<typeof whoamiHandler>[0]> = {}) {
  const out: string[] = [];
  const err: string[] = [];
  return {
    profile: 'default',
    out,
    err,
    opts: {
      profile: 'default',
      ...overrides,
      stdout: (s: string) => out.push(s),
      stderr: (s: string) => err.push(s),
      exit: (_code: number) => { throw new Error(`exit(${_code})`); },
      ...overrides,
    } as Parameters<typeof whoamiHandler>[0],
  };
}

// ─── Scenario 1: Member state → full JSON object ──────────────────────────────

describe('Scenario: whoami --json in member state', () => {
  test('emits {state, email, project_id, expires_at} JSON when JWT is valid', async () => {
    const dir = makeTmpDir();
    const home = path.join(dir, '.cleargate');

    const nowMs = 1_700_000_000_000;
    const futureExp = Math.floor(nowMs / 1000) + 7 * 24 * 3600;

    const jwt = buildFakeJwt({
      sub: 'member-uuid-abc',
      project_id: 'project-123',
      exp: futureExp,
      type: 'refresh',
    });
    writeAuthFile(home, 'default', jwt);

    const out: string[] = [];
    await whoamiHandler({
      profile: 'default',
      json: true,
      cleargateHome: home,
      now: () => nowMs,
      stdout: (s) => out.push(s),
      stderr: (_s) => undefined,
      exit: (_c) => { throw new Error(`exit(${_c})`); },
    });

    assert.strictEqual((out).length, 1);
    const parsed = JSON.parse(out[0]!) as Record<string, unknown>;
    assert.strictEqual(parsed['state'], 'member');
    assert.strictEqual(parsed['email'], 'member-uuid-abc');
    assert.strictEqual(parsed['project_id'], 'project-123');
    assert.strictEqual(typeof parsed['expires_at'], 'string');
    // Must not have extra PII keys beyond the declared contract
    expect(Object.keys(parsed).sort()).toEqual(['email', 'expires_at', 'project_id', 'state'].sort());
  });
});

// ─── Scenario 2: Pre-member (no auth file) → {state: 'pre-member'} ───────────

describe('Scenario: whoami --json in pre-member state (no auth file)', () => {
  test('emits {state: "pre-member"} with no PII when auth file is absent', async () => {
    const dir = makeTmpDir();
    const home = path.join(dir, '.cleargate-nonexistent');

    const out: string[] = [];
    await whoamiHandler({
      profile: 'default',
      json: true,
      cleargateHome: home,
      stdout: (s) => out.push(s),
      stderr: (_s) => undefined,
      exit: (_c) => { throw new Error(`exit(${_c})`); },
    });

    assert.strictEqual((out).length, 1);
    const parsed = JSON.parse(out[0]!) as Record<string, unknown>;
    assert.strictEqual(parsed['state'], 'pre-member');
    // No PII fields
    assert.strictEqual(parsed['email'], undefined);
    assert.strictEqual(parsed['project_id'], undefined);
    assert.strictEqual(parsed['expires_at'], undefined);
    expect(Object.keys(parsed)).toEqual(['state']);
  });
});

// ─── Scenario 3: Pre-member (expired JWT) → {state: 'pre-member'} ────────────

describe('Scenario: whoami --json in pre-member state (expired JWT)', () => {
  test('emits {state: "pre-member"} when stored JWT is expired', async () => {
    const dir = makeTmpDir();
    const home = path.join(dir, '.cleargate');

    const expiredExp = Math.floor(Date.now() / 1000) - 3600;
    const jwt = buildFakeJwt({
      sub: 'member-uuid',
      project_id: 'proj',
      exp: expiredExp,
    });
    writeAuthFile(home, 'default', jwt);

    const out: string[] = [];
    await whoamiHandler({
      profile: 'default',
      json: true,
      cleargateHome: home,
      stdout: (s) => out.push(s),
      stderr: (_s) => undefined,
      exit: (_c) => { throw new Error(`exit(${_c})`); },
    });

    assert.strictEqual((out).length, 1);
    const parsed = JSON.parse(out[0]!) as Record<string, unknown>;
    assert.strictEqual(parsed['state'], 'pre-member');
    expect(Object.keys(parsed)).toEqual(['state']);
  });
});

// ─── Scenario 4: Pre-member (malformed JWT) → {state: 'pre-member'} ──────────

describe('Scenario: whoami --json in pre-member state (malformed JWT)', () => {
  test('emits {state: "pre-member"} when stored token is not a valid JWT', async () => {
    const dir = makeTmpDir();
    const home = path.join(dir, '.cleargate');

    writeAuthFile(home, 'default', 'not-a-jwt');

    const out: string[] = [];
    await whoamiHandler({
      profile: 'default',
      json: true,
      cleargateHome: home,
      stdout: (s) => out.push(s),
      stderr: (_s) => undefined,
      exit: (_c) => { throw new Error(`exit(${_c})`); },
    });

    assert.strictEqual((out).length, 1);
    const parsed = JSON.parse(out[0]!) as Record<string, unknown>;
    assert.strictEqual(parsed['state'], 'pre-member');
    expect(Object.keys(parsed)).toEqual(['state']);
  });
});

// ─── Backward compat: --json absent → network path ───────────────────────────

describe('Backward compat: whoami without --json uses network path', () => {
  test('calls exit(5) when mcpUrl is not configured (no join performed)', async () => {
    const err: string[] = [];
    let exitCode: number | undefined;

    await whoamiHandler({
      profile: 'default',
      json: false,
      stdout: (_s) => undefined,
      stderr: (s) => err.push(s),
      exit: (c) => { exitCode = c; throw new Error(`exit(${c})`); },
    }).catch(() => {
      // Expected: exit throws
    });

    assert.strictEqual(exitCode, 5);
    expect(err.join('')).toContain('mcpUrl');
  });
});
