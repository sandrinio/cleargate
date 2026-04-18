import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createAdminApiClient } from '../../src/admin-api/client.js';
import { AdminApiError } from '../../src/admin-api/errors.js';

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
  return vi.fn().mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    headers: { get: (_: string) => contentType },
    json: () => Promise.resolve(body),
  } as unknown as Response);
}

describe('AdminApiClient', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  // C-1: happy path createProject
  it('C-1: createProject calls POST /admin-api/v1/projects with correct headers and body', async () => {
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
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`${BASE_URL}/admin-api/v1/projects`);
    expect((init.method as string).toUpperCase()).toBe('POST');
    expect((init.headers as Record<string, string>)['Authorization']).toBe(`Bearer ${TOKEN}`);
    expect((init.headers as Record<string, string>)['Content-Type']).toBe('application/json');
    expect(JSON.parse(init.body as string)).toEqual({ name: 'foo' });
    expect(result).toEqual(projectData);
  });

  // C-2: camelCase → snake_case conversion for inviteMember
  it('C-2: inviteMember converts camelCase to snake_case in wire body', async () => {
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

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(init.body as string) as Record<string, unknown>;
    expect(body['display_name']).toBe('X');
    expect(body).not.toHaveProperty('displayName');
  });

  // C-2 extra: displayName absent → display_name absent from body
  it('C-2b: inviteMember omits display_name when displayName is absent', async () => {
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

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(init.body as string) as Record<string, unknown>;
    expect(body).not.toHaveProperty('display_name');
  });

  // C-3: DELETE omits Content-Type
  it('C-3: revokeToken calls DELETE with no Content-Type header and resolves to undefined', async () => {
    const fetchMock = mockResponse(204, null, '');
    const client = makeClient(fetchMock);

    const result = await client.revokeToken({ tokenId: 'tok-uuid' });

    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`${BASE_URL}/admin-api/v1/tokens/tok-uuid`);
    expect((init.method as string).toUpperCase()).toBe('DELETE');
    expect((init.headers as Record<string, string>)['content-type']).toBeUndefined();
    expect((init.headers as Record<string, string>)['Content-Type']).toBeUndefined();
    expect(result).toBeUndefined();
  });

  // C-4: 401 → AdminApiError kind 'auth'
  it('C-4: 401 response throws AdminApiError with kind=auth and status=401', async () => {
    const fetchMock = mockResponse(401, { error: 'unauthorized' });
    const client = makeClient(fetchMock);

    await expect(client.createProject({ name: 'foo' })).rejects.toSatisfy(
      (err: unknown) =>
        err instanceof AdminApiError && err.kind === 'auth' && err.status === 401,
    );
  });

  // C-5: 403 → kind 'forbidden'
  it('C-5: 403 response throws AdminApiError with kind=forbidden', async () => {
    const fetchMock = mockResponse(403, { error: 'forbidden' });
    const client = makeClient(fetchMock);

    await expect(client.createProject({ name: 'foo' })).rejects.toSatisfy(
      (err: unknown) =>
        err instanceof AdminApiError && err.kind === 'forbidden' && err.status === 403,
    );
  });

  // C-6: 404 → kind 'not_found'
  it('C-6: 404 response throws AdminApiError with kind=not_found', async () => {
    const fetchMock = mockResponse(404, { error: 'not_found' });
    const client = makeClient(fetchMock);

    await expect(client.createProject({ name: 'foo' })).rejects.toSatisfy(
      (err: unknown) =>
        err instanceof AdminApiError && err.kind === 'not_found' && err.status === 404,
    );
  });

  // C-7: 400 → kind 'invalid_request', details equals body.details
  it('C-7: 400 response throws AdminApiError with kind=invalid_request and details', async () => {
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
  it('C-8: fetch throws → AdminApiError with kind=network and status=null', async () => {
    const fetchMock = vi.fn().mockRejectedValue(new Error('ECONNREFUSED'));
    const client = makeClient(fetchMock);

    await expect(client.createProject({ name: 'foo' })).rejects.toSatisfy(
      (err: unknown) =>
        err instanceof AdminApiError && err.kind === 'network' && err.status === null,
    );
  });
});
