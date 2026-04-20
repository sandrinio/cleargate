/**
 * mcp-client del() unit tests — STORY-006-05
 *
 * Tests:
 *   1. del() calls DELETE with Bearer auth header
 *   2. del() 401 → re-exchange + retry once
 *   3. del() handles 204 No Content (no schema parse needed)
 *   4. del() 401 twice → throws AuthError
 *   5. del() 403 → throws ForbiddenError (no retry)
 *   6. del() non-204 non-200 non-401 non-403 → throws NetworkError
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  del,
  _setBaseUrl,
  _setFetch,
  _resetState,
} from '../../src/lib/mcp-client.js';
import { AuthError, ForbiddenError, NetworkError } from '../../src/lib/errors.js';

function makeFetchResponse(status: number, body?: unknown): Response {
  return {
    status,
    ok: status >= 200 && status < 300,
    json: async () => body,
  } as unknown as Response;
}

const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

describe('mcp-client del()', () => {
  beforeEach(() => {
    _resetState();
    _setBaseUrl('http://mcp.test');
  });

  it('happy path: calls DELETE with Bearer header and handles 204', async () => {
    const mockFetch = vi
      .fn()
      // 1. exchange (no cached token)
      .mockResolvedValueOnce(
        makeFetchResponse(200, { admin_token: 'tok-del', expires_at: expiresAt }),
      )
      // 2. DELETE → 204
      .mockResolvedValueOnce(makeFetchResponse(204));

    _setFetch(mockFetch);
    await del('/tokens/some-token-id');

    expect(mockFetch).toHaveBeenCalledTimes(2);
    const [url, init] = mockFetch.mock.calls[1] as [string, RequestInit];
    expect(url).toBe('http://mcp.test/admin-api/v1/tokens/some-token-id');
    expect(init.method).toBe('DELETE');
    expect((init.headers as Record<string, string>)['Authorization']).toBe('Bearer tok-del');
  });

  it('also handles 200 OK as success', async () => {
    const mockFetch = vi
      .fn()
      .mockResolvedValueOnce(
        makeFetchResponse(200, { admin_token: 'tok-ok', expires_at: expiresAt }),
      )
      .mockResolvedValueOnce(makeFetchResponse(200));

    _setFetch(mockFetch);
    await expect(del('/tokens/token-id')).resolves.toBeUndefined();
  });

  it('401 → re-exchange + retry once → succeeds on second DELETE', async () => {
    const mockFetch = vi
      .fn()
      // 1. initial exchange
      .mockResolvedValueOnce(
        makeFetchResponse(200, { admin_token: 'tok-old', expires_at: expiresAt }),
      )
      // 2. DELETE → 401
      .mockResolvedValueOnce(makeFetchResponse(401))
      // 3. re-exchange
      .mockResolvedValueOnce(
        makeFetchResponse(200, { admin_token: 'tok-new', expires_at: expiresAt }),
      )
      // 4. retry DELETE → 204
      .mockResolvedValueOnce(makeFetchResponse(204));

    _setFetch(mockFetch);
    await del('/tokens/tok-id');
    expect(mockFetch).toHaveBeenCalledTimes(4);
  });

  it('401 twice → throws AuthError (only one retry)', async () => {
    const mockFetch = vi
      .fn()
      .mockResolvedValueOnce(
        makeFetchResponse(200, { admin_token: 'tok-exp', expires_at: expiresAt }),
      )
      .mockResolvedValueOnce(makeFetchResponse(401))
      .mockResolvedValueOnce(
        makeFetchResponse(200, { admin_token: 'tok-exp2', expires_at: expiresAt }),
      )
      .mockResolvedValueOnce(makeFetchResponse(401));

    _setFetch(mockFetch);
    await expect(del('/tokens/tid')).rejects.toThrow(AuthError);
    expect(mockFetch).toHaveBeenCalledTimes(4);
  });

  it('403 → throws ForbiddenError (no retry)', async () => {
    const mockFetch = vi
      .fn()
      .mockResolvedValueOnce(
        makeFetchResponse(200, { admin_token: 'tok-ok', expires_at: expiresAt }),
      )
      .mockResolvedValueOnce(makeFetchResponse(403));

    _setFetch(mockFetch);
    await expect(del('/tokens/tid')).rejects.toThrow(ForbiddenError);
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it('500 → throws NetworkError', async () => {
    const mockFetch = vi
      .fn()
      .mockResolvedValueOnce(
        makeFetchResponse(200, { admin_token: 'tok-ok', expires_at: expiresAt }),
      )
      .mockResolvedValueOnce(makeFetchResponse(500));

    _setFetch(mockFetch);
    await expect(del('/tokens/tid')).rejects.toThrow(NetworkError);
  });

  it('uses flat path (not nested under /projects/:pid)', async () => {
    const mockFetch = vi
      .fn()
      .mockResolvedValueOnce(
        makeFetchResponse(200, { admin_token: 'tok-flat', expires_at: expiresAt }),
      )
      .mockResolvedValueOnce(makeFetchResponse(204));

    _setFetch(mockFetch);
    await del('/tokens/flat-id');

    const [url] = mockFetch.mock.calls[1] as [string];
    // Must NOT contain /projects/ in the DELETE path
    expect(url).not.toContain('/projects/');
    expect(url).toContain('/tokens/flat-id');
  });
});
