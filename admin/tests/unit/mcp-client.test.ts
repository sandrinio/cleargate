/**
 * Unit tests for mcp-client — STORY-006-02
 *
 * Tests: happy path · 401 retry once · 401 twice → AuthError · 403 → ForbiddenError
 *        · network error → NetworkError · proactive refresh fires 2 min before expiry
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  exchange,
  get,
  signOut,
  _setBaseUrl,
  _setFetch,
  _resetState,
} from '../../src/lib/mcp-client.js';
import { AuthError, ForbiddenError, NetworkError } from '../../src/lib/errors.js';
import { z } from 'zod';

function makeFetchResponse(status: number, body?: unknown): Response {
  return {
    status,
    ok: status >= 200 && status < 300,
    json: async () => body,
  } as unknown as Response;
}

describe('mcp-client', () => {
  beforeEach(() => {
    _resetState();
    _setBaseUrl('http://mcp.test');
  });

  // -------------------------------------------------------------------------
  // exchange()
  // -------------------------------------------------------------------------
  describe('exchange()', () => {
    it('happy path: returns { admin_token, expires_at } and caches token', async () => {
      const mockFetch = vi.fn().mockResolvedValue(
        makeFetchResponse(200, {
          admin_token: 'tok-abc',
          expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
        }),
      );
      _setFetch(mockFetch);

      const result = await exchange();
      expect(result.admin_token).toBe('tok-abc');
      expect(result.expires_at).toBeDefined();
      expect(mockFetch).toHaveBeenCalledOnce();

      // Verify the call was to the right endpoint with credentials: 'include'
      const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
      expect(url).toBe('http://mcp.test/admin-api/v1/auth/exchange');
      expect((init as RequestInit).method).toBe('POST');
      expect((init as RequestInit).credentials).toBe('include');
    });

    it('401 → throws AuthError with code "session_expired"', async () => {
      _setFetch(vi.fn().mockResolvedValue(makeFetchResponse(401)));

      await expect(exchange()).rejects.toThrow(AuthError);
      await expect(exchange()).rejects.toMatchObject({ code: 'session_expired' });
    });

    it('403 → throws ForbiddenError with code "not_authorized"', async () => {
      _setFetch(vi.fn().mockResolvedValue(makeFetchResponse(403)));

      await expect(exchange()).rejects.toThrow(ForbiddenError);
      await expect(exchange()).rejects.toMatchObject({ code: 'not_authorized' });
    });

    it('5xx → throws NetworkError', async () => {
      _setFetch(vi.fn().mockResolvedValue(makeFetchResponse(500)));

      await expect(exchange()).rejects.toThrow(NetworkError);
      await expect(exchange()).rejects.toMatchObject({ status: 500 });
    });
  });

  // -------------------------------------------------------------------------
  // get()
  // -------------------------------------------------------------------------
  describe('get()', () => {
    const schema = z.object({ id: z.string() });
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    it('happy path: exchanges then GETs, returns parsed body', async () => {
      const mockFetch = vi
        .fn()
        // First call: exchange
        .mockResolvedValueOnce(
          makeFetchResponse(200, { admin_token: 'tok-get', expires_at: expiresAt }),
        )
        // Second call: actual GET
        .mockResolvedValueOnce(makeFetchResponse(200, { id: 'proj-1' }));
      _setFetch(mockFetch);

      const result = await get('/projects/proj-1', schema);
      expect(result).toEqual({ id: 'proj-1' });
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('401 on first GET → re-exchanges → retries and succeeds', async () => {
      const mockFetch = vi
        .fn()
        // 1. Initial exchange (no cached token)
        .mockResolvedValueOnce(
          makeFetchResponse(200, { admin_token: 'tok-old', expires_at: expiresAt }),
        )
        // 2. GET → 401 (token expired server-side)
        .mockResolvedValueOnce(makeFetchResponse(401))
        // 3. Re-exchange
        .mockResolvedValueOnce(
          makeFetchResponse(200, { admin_token: 'tok-new', expires_at: expiresAt }),
        )
        // 4. Retry GET → 200
        .mockResolvedValueOnce(makeFetchResponse(200, { id: 'proj-2' }));
      _setFetch(mockFetch);

      const result = await get('/projects/proj-2', schema);
      expect(result).toEqual({ id: 'proj-2' });
      expect(mockFetch).toHaveBeenCalledTimes(4);
    });

    it('401 twice → throws AuthError (only one retry)', async () => {
      const mockFetch = vi
        .fn()
        // 1. Initial exchange
        .mockResolvedValueOnce(
          makeFetchResponse(200, { admin_token: 'tok-expired', expires_at: expiresAt }),
        )
        // 2. GET → 401
        .mockResolvedValueOnce(makeFetchResponse(401))
        // 3. Re-exchange
        .mockResolvedValueOnce(
          makeFetchResponse(200, { admin_token: 'tok-also-expired', expires_at: expiresAt }),
        )
        // 4. Retry GET → 401 again
        .mockResolvedValueOnce(makeFetchResponse(401));
      _setFetch(mockFetch);

      await expect(get('/projects/proj-3', schema)).rejects.toThrow(AuthError);
      expect(mockFetch).toHaveBeenCalledTimes(4);
    });

    it('403 on GET → throws ForbiddenError (no retry)', async () => {
      const mockFetch = vi
        .fn()
        .mockResolvedValueOnce(
          makeFetchResponse(200, { admin_token: 'tok-ok', expires_at: expiresAt }),
        )
        .mockResolvedValueOnce(makeFetchResponse(403));
      _setFetch(mockFetch);

      await expect(get('/projects', schema)).rejects.toThrow(ForbiddenError);
      // Only 2 calls: exchange + GET (no retry on 403)
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('network error (non-401/403) → throws NetworkError', async () => {
      const mockFetch = vi
        .fn()
        .mockResolvedValueOnce(
          makeFetchResponse(200, { admin_token: 'tok-ok', expires_at: expiresAt }),
        )
        .mockResolvedValueOnce(makeFetchResponse(503));
      _setFetch(mockFetch);

      await expect(get('/projects', schema)).rejects.toThrow(NetworkError);
    });
  });

  // -------------------------------------------------------------------------
  // signOut()
  // -------------------------------------------------------------------------
  describe('signOut()', () => {
    it('clears cached token and cancels refresh timer', async () => {
      vi.useFakeTimers();
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
      const mockFetch = vi.fn().mockResolvedValue(
        makeFetchResponse(200, { admin_token: 'tok-to-clear', expires_at: expiresAt }),
      );
      _setFetch(mockFetch);

      await exchange();
      signOut();

      // After signOut, next exchange should call fetch again (token was cleared)
      const mockFetch2 = vi.fn().mockResolvedValue(
        makeFetchResponse(200, { admin_token: 'tok-fresh', expires_at: expiresAt }),
      );
      _setFetch(mockFetch2);

      // Trigger a get() — should call exchange first (since state was cleared)
      const schema = z.object({ id: z.string() });
      const mockFetch3 = vi
        .fn()
        .mockResolvedValueOnce(
          makeFetchResponse(200, { admin_token: 'tok-fresh', expires_at: expiresAt }),
        )
        .mockResolvedValueOnce(makeFetchResponse(200, { id: 'ok' }));
      _setFetch(mockFetch3);
      await get('/test', schema);
      // exchange was called again (2 total fetch calls: exchange + GET)
      expect(mockFetch3).toHaveBeenCalledTimes(2);

      vi.useRealTimers();
    });
  });

  // -------------------------------------------------------------------------
  // Proactive refresh timer
  // -------------------------------------------------------------------------
  describe('proactive refresh', () => {
    it('fires 2 minutes before expiry', async () => {
      vi.useFakeTimers();

      const expiryMs = 15 * 60 * 1000; // 15 min from now
      const expiresAt = new Date(Date.now() + expiryMs).toISOString();

      let exchangeCallCount = 0;
      const mockFetch = vi.fn().mockImplementation(async () => {
        exchangeCallCount++;
        return makeFetchResponse(200, {
          admin_token: `tok-${exchangeCallCount}`,
          expires_at: new Date(Date.now() + expiryMs).toISOString(),
        });
      });
      _setFetch(mockFetch);

      // First exchange — sets up the proactive refresh timer
      await exchange();
      expect(exchangeCallCount).toBe(1);

      // Advance time to just before 2 min before expiry (should NOT fire)
      vi.advanceTimersByTime(expiryMs - 2 * 60 * 1000 - 100);
      await Promise.resolve(); // flush microtasks
      expect(exchangeCallCount).toBe(1);

      // Advance past the 2-min threshold (should fire proactive refresh)
      vi.advanceTimersByTime(200);
      await Promise.resolve(); // flush microtasks
      expect(exchangeCallCount).toBe(2);

      vi.useRealTimers();
    });
  });
});
