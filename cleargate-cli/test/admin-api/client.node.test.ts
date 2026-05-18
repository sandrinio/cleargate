import { describe, test, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';

import { createAdminApiClient } from '../../src/admin-api/client.js';
import { AdminApiError } from '../../src/admin-api/errors.js';

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


const BASE_URL = 'https://cleargate-mcp.example.com';
const TOKEN = 'test-admin-jwt';

function makeClient(fetchMock: typeof fetch) {
  return createAdminApiClient({
    baseUrl: BASE_URL,
    token: TOKEN,
    fetch: fetchMock,
  });
}

function mockResponse(status: number, body: unknown, contentType = 'application/json') {
  const jsonBody = JSON.stringify(body);
  return mock.fn(() => Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    headers: { get: (_: string) => contentType },
    json: () => Promise.resolve(body),
  } as unknown as Response));
}

describe('AdminApiClient', () => {
  beforeEach(() => {
    mock.restoreAll();
  });

  // C-1: happy path createProject
  test('C-1: createProject calls POST /admin-api/v1/projects with correct headers and body', async () => {
    const projectData = {
      id: 'proj-uuid',
      name: 'foo',
      created_by: 'admin-uuid',
      created_at: '2024-01-01T00:00:00.000Z',
      deleted_at: null,
    };
    const fetchMock = mockResponse(201, projectData);
    const client = makeClient(fetchMock);

    const result = await client.createProject({ name: 'foo' });

    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0].arguments as [string, RequestInit];
    assert.strictEqual(url, `${BASE_URL}/admin-api/v1/projects`);
    expect((init.method as string).toUpperCase()).toBe('POST');
    expect((init.headers as Record<string, string>)['Authorization']).toBe(`Bearer ${TOKEN}`);
    expect((init.headers as Record<string, string>)['Content-Type']).toBe('application/json');
    expect(JSON.parse(init.body as string)).toEqual({ name: 'foo' });
    assert.deepStrictEqual(result, projectData);
  });

  // C-2: camelCase → snake_case conversion for inviteMember
  test('C-2: inviteMember converts camelCase to snake_case in wire body', async () => {
    const memberData = {
      id: 'm-uuid',
      project_id: 'p-uuid',
      email: 'user@example.com',
      role: 'user',
      display_name: 'X',
      created_at: '2024-01-01T00:00:00.000Z',
      status: 'pending',
    };
    const inviteData = {
      member: memberData,
      invite_url: 'https://example.com/invite/abc',
      invite_token: 'abc',
      invite_expires_in: 86400,
    };
    const fetchMock = mockResponse(201, inviteData);
    const client = makeClient(fetchMock);

    await client.inviteMember({
      projectId: 'p-uuid',
      email: 'user@example.com',
      role: 'user',
      displayName: 'X',
    });

    const [, init] = fetchMock.mock.calls[0].arguments as [string, RequestInit];
    const body = JSON.parse(init.body as string) as Record<string, unknown>;
    assert.strictEqual(body['display_name'], 'X');
    assert.ok(!('displayName' in (body)));
  });

  // C-2 extra: displayName absent → display_name absent from body
  test('C-2b: inviteMember omits display_name when displayName is absent', async () => {
    const memberData = {
      id: 'm-uuid',
      project_id: 'p-uuid',
      email: 'user@example.com',
      role: 'user',
      display_name: null,
      created_at: '2024-01-01T00:00:00.000Z',
      status: 'pending',
    };
    const inviteData = {
      member: memberData,
      invite_url: 'https://example.com/invite/abc',
      invite_token: 'abc',
      invite_expires_in: 86400,
    };
    const fetchMock = mockResponse(201, inviteData);
    const client = makeClient(fetchMock);

    await client.inviteMember({
      projectId: 'p-uuid',
      email: 'user@example.com',
      role: 'user',
    });

    const [, init] = fetchMock.mock.calls[0].arguments as [string, RequestInit];
    const body = JSON.parse(init.body as string) as Record<string, unknown>;
    assert.ok(!('display_name' in (body)));
  });

  // C-3: DELETE omits Content-Type
  test('C-3: revokeToken calls DELETE with no Content-Type header and resolves to undefined', async () => {
    const fetchMock = mockResponse(204, null, '');
    const client = makeClient(fetchMock);

    const result = await client.revokeToken({ tokenId: 'tok-uuid' });

    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0].arguments as [string, RequestInit];
    assert.strictEqual(url, `${BASE_URL}/admin-api/v1/tokens/tok-uuid`);
    expect((init.method as string).toUpperCase()).toBe('DELETE');
    expect((init.headers as Record<string, string>)['content-type']).toBeUndefined();
    expect((init.headers as Record<string, string>)['Content-Type']).toBeUndefined();
    assert.strictEqual(result, undefined);
  });

  // C-4: 401 → AdminApiError kind 'auth'
  test('C-4: 401 response throws AdminApiError with kind=auth and status=401', async () => {
    const fetchMock = mockResponse(401, { error: 'unauthorized' });
    const client = makeClient(fetchMock);

    await expect(client.createProject({ name: 'foo' })).rejects.toSatisfy(
      (err: unknown) =>
        err instanceof AdminApiError && err.kind === 'auth' && err.status === 401,
    );
  });

  // C-5: 403 → kind 'forbidden'
  test('C-5: 403 response throws AdminApiError with kind=forbidden', async () => {
    const fetchMock = mockResponse(403, { error: 'forbidden' });
    const client = makeClient(fetchMock);

    await expect(client.createProject({ name: 'foo' })).rejects.toSatisfy(
      (err: unknown) =>
        err instanceof AdminApiError && err.kind === 'forbidden' && err.status === 403,
    );
  });

  // C-6: 404 → kind 'not_found'
  test('C-6: 404 response throws AdminApiError with kind=not_found', async () => {
    const fetchMock = mockResponse(404, { error: 'not_found' });
    const client = makeClient(fetchMock);

    await expect(client.createProject({ name: 'foo' })).rejects.toSatisfy(
      (err: unknown) =>
        err instanceof AdminApiError && err.kind === 'not_found' && err.status === 404,
    );
  });

  // C-7: 400 → kind 'invalid_request', details equals body.details
  test('C-7: 400 response throws AdminApiError with kind=invalid_request and details', async () => {
    const details = { name: ['Too long'] };
    const fetchMock = mockResponse(400, { error: 'invalid_request', details });
    const client = makeClient(fetchMock);

    await expect(client.createProject({ name: 'x'.repeat(300) })).rejects.toSatisfy(
      (err: unknown) =>
        err instanceof AdminApiError &&
        err.kind === 'invalid_request' &&
        err.status === 400 &&
        JSON.stringify(err.details) === JSON.stringify(details),
    );
  });

  // C-8: fetch throws → kind 'network', status null
  test('C-8: fetch throws → AdminApiError with kind=network and status=null', async () => {
    const fetchMock = mock.fn(() => Promise.reject(new Error('ECONNREFUSED')));
    const client = makeClient(fetchMock);

    await expect(client.createProject({ name: 'foo' })).rejects.toSatisfy(
      (err: unknown) =>
        err instanceof AdminApiError && err.kind === 'network' && err.status === null,
    );
  });
});
