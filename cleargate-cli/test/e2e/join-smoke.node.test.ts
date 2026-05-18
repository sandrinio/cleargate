import { describe, test, before } from 'node:test';
import assert from 'node:assert/strict';

/**
 * R-16: End-to-end smoke for `cleargate join`.
 *
 * Runs ONLY when CLEARGATE_E2E=1 is set. Requires:
 *   - docker-compose up (Postgres 18 + Redis 8) with MCP server running at
 *     process.env.MCP_BASE_URL (default: http://localhost:3000)
 *   - An admin JWT obtainable via POST /admin/auth (dev-issue-token credentials)
 *
 * Sequence:
 *   1. Issue an admin JWT
 *   2. Create a project via POST /admin-api/v1/projects
 *   3. Create a member + invite via POST /admin-api/v1/projects/:pid/members
 *   4. Call joinHandler in-process with the invite URL
 *   5. Assert stdout contains "joined project"
 *   6. Assert the refresh token was saved to the FileTokenStore
 *   7. Assert POST /auth/refresh with that token returns 200 + access_token
 */
import * as os from 'node:os';
import * as path from 'node:path';
import * as fs from 'node:fs/promises';
import { joinHandler } from '../../src/commands/join.js';
import { FileTokenStore } from '../../src/auth/file-store.js';

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


const E2E = !!process.env['CLEARGATE_E2E'];
const MCP_BASE = process.env['MCP_BASE_URL'] ?? 'http://localhost:3000';
const ADMIN_URL = process.env['CLEARGATE_ADMIN_URL'] ?? 'http://localhost:3001';

describe('R-16: join smoke (real infra)', () => {
  if (!E2E) return; // skip all if E2E not enabled
  let adminToken: string;
  let projectId: string;
  let inviteUrl: string;
  let refreshToken: string | null;
  let tmpAuthFile: string;

  before(async () => {
    // 1. Issue admin token
    const issueRes = await fetch(`${ADMIN_URL}/admin/auth/token`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        username: process.env['ADMIN_USERNAME'] ?? 'admin',
        password: process.env['ADMIN_PASSWORD'] ?? 'admin',
      }),
    });
    if (!issueRes.ok) {
      throw new Error(`Admin auth failed: ${issueRes.status}`);
    }
    const issueBody = (await issueRes.json()) as { token: string };
    adminToken = issueBody.token;

    // 2. Create project
    const projectRes = await fetch(`${ADMIN_URL}/admin-api/v1/projects`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ name: `smoke-${Date.now()}`, slug: `smoke-${Date.now()}` }),
    });
    if (!projectRes.ok) {
      throw new Error(`Create project failed: ${projectRes.status}`);
    }
    const projectBody = (await projectRes.json()) as { id: string };
    projectId = projectBody.id;

    // 3. Create member + invite
    const memberRes = await fetch(
      `${ADMIN_URL}/admin-api/v1/projects/${projectId}/members`,
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          email: `smoke-${Date.now()}@example.com`,
          role: 'user',
          display_name: 'Smoke Tester',
        }),
      },
    );
    if (!memberRes.ok) {
      throw new Error(`Create member failed: ${memberRes.status}`);
    }
    const memberBody = (await memberRes.json()) as { invite_url: string };
    inviteUrl = memberBody.invite_url;

    // Prepare temp auth file (so we don't touch the real ~/.cleargate/auth.json)
    tmpAuthFile = path.join(os.tmpdir(), `cleargate-e2e-${Date.now()}.json`);
  });

  test('joinHandler stdout contains "joined project"', async () => {
    const store = new FileTokenStore(tmpAuthFile);
    const capturedStdout: string[] = [];
    const capturedStderr: string[] = [];

    await joinHandler({
      inviteUrl,
      profile: 'default',
      createStore: async () => store,
      stdout: (s) => { capturedStdout.push(s); },
      stderr: (s) => { capturedStderr.push(s); },
    });

    expect(capturedStdout.join('')).toContain('joined project');
    expect(capturedStderr.join('')).toBe('');
  });

  test('refresh token is persisted in FileTokenStore', async () => {
    const store = new FileTokenStore(tmpAuthFile);
    refreshToken = await store.load('default');
    assert.strictEqual(typeof refreshToken, 'string');
    assert.ok(refreshToken!.length > 20);
  });

  test('refresh token exchanges for access_token at /auth/refresh', async () => {
    assert.ok(refreshToken);
    const refreshRes = await fetch(`${MCP_BASE}/auth/refresh`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
    assert.strictEqual(refreshRes.status, 200);
    const body = (await refreshRes.json()) as { access_token?: string };
    assert.strictEqual(typeof body.access_token, 'string');
  });

  test('cleanup temp auth file', async () => {
    await fs.rm(tmpAuthFile, { force: true });
  });
});
