/**
 * refresh.test.ts — BUG-019 unit coverage for token-refresh logic.
 */
import { describe, it, expect, vi } from 'vitest';
import {
  refreshAccessToken,
  AuthFetcher,
  RefreshError,
} from '../../src/auth/refresh.js';

const BASE_URL = 'https://cleargate-mcp.soula.ge';

function mockFetch(impl: (req: Request) => Promise<Response>): typeof globalThis.fetch {
  return ((input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' || input instanceof URL ? String(input) : input.url;
    const req = new Request(url, init);
    return impl(req);
  }) as typeof globalThis.fetch;
}

describe('refreshAccessToken', () => {
  it('returns parsed body on 200', async () => {
    const fetchFn = mockFetch(async () =>
      new Response(
        JSON.stringify({
          token_type: 'Bearer',
          access_token: 'A',
          refresh_token: 'R',
          expires_in: 900,
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      ),
    );
    const out = await refreshAccessToken(BASE_URL, 'refresh-X', { fetch: fetchFn });
    expect(out.access_token).toBe('A');
    expect(out.refresh_token).toBe('R');
    expect(out.expires_in).toBe(900);
  });

  it('throws RefreshError on 401 invalid_token', async () => {
    const fetchFn = mockFetch(async () =>
      new Response(JSON.stringify({ error: 'invalid_token' }), {
        status: 401,
        headers: { 'content-type': 'application/json' },
      }),
    );
    await expect(refreshAccessToken(BASE_URL, 'bad', { fetch: fetchFn })).rejects.toBeInstanceOf(
      RefreshError,
    );
  });

  it('throws on malformed body', async () => {
    const fetchFn = mockFetch(async () =>
      new Response(JSON.stringify({ token_type: 'Bearer' }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      }),
    );
    await expect(refreshAccessToken(BASE_URL, 'x', { fetch: fetchFn })).rejects.toBeInstanceOf(
      RefreshError,
    );
  });
});

describe('AuthFetcher', () => {
  it('caches access token and persists rotated refresh token on first call', async () => {
    let callCount = 0;
    const fetchFn = mockFetch(async () => {
      callCount++;
      return new Response(
        JSON.stringify({
          token_type: 'Bearer',
          access_token: `A${callCount}`,
          refresh_token: `R${callCount}`,
          expires_in: 900,
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      );
    });

    const saved: string[] = [];
    let stored = 'R0';
    const fetcher = new AuthFetcher({
      baseUrl: BASE_URL,
      fetch: fetchFn,
      now: () => 1_000_000,
      loadRefresh: async () => stored,
      saveRefresh: async (t) => {
        saved.push(t);
        stored = t;
      },
    });

    const a1 = await fetcher.getAccessToken();
    expect(a1).toBe('A1');
    expect(saved).toEqual(['R1']);
    // Second call within validity window — cache hit, no extra fetch.
    const a2 = await fetcher.getAccessToken();
    expect(a2).toBe('A1');
    expect(callCount).toBe(1);
  });

  it('refreshes when within skew window of expiry', async () => {
    let callCount = 0;
    const fetchFn = mockFetch(async () => {
      callCount++;
      return new Response(
        JSON.stringify({
          token_type: 'Bearer',
          access_token: `A${callCount}`,
          refresh_token: `R${callCount}`,
          expires_in: 100,
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      );
    });

    let stored = 'R0';
    let now = 1_000_000;
    const fetcher = new AuthFetcher({
      baseUrl: BASE_URL,
      fetch: fetchFn,
      now: () => now,
      loadRefresh: async () => stored,
      saveRefresh: async (t) => {
        stored = t;
      },
      skewSeconds: 30,
    });

    expect(await fetcher.getAccessToken()).toBe('A1');
    // Advance past skew but not past expiry — should refresh.
    now += 75_000;
    expect(await fetcher.getAccessToken()).toBe('A2');
    expect(callCount).toBe(2);
  });

  it('invalidate() forces refresh on next call', async () => {
    let callCount = 0;
    const fetchFn = mockFetch(async () => {
      callCount++;
      return new Response(
        JSON.stringify({
          token_type: 'Bearer',
          access_token: `A${callCount}`,
          refresh_token: `R${callCount}`,
          expires_in: 900,
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      );
    });
    let stored = 'R0';
    const fetcher = new AuthFetcher({
      baseUrl: BASE_URL,
      fetch: fetchFn,
      now: () => 1_000_000,
      loadRefresh: async () => stored,
      saveRefresh: async (t) => {
        stored = t;
      },
    });
    await fetcher.getAccessToken();
    fetcher.invalidate();
    await fetcher.getAccessToken();
    expect(callCount).toBe(2);
  });

  it('throws RefreshError when keychain has no refresh token', async () => {
    const fetcher = new AuthFetcher({
      baseUrl: BASE_URL,
      fetch: vi.fn() as never,
      now: () => 1_000_000,
      loadRefresh: async () => null,
      saveRefresh: async () => undefined,
    });
    await expect(fetcher.getAccessToken()).rejects.toBeInstanceOf(RefreshError);
  });

  it('coalesces concurrent getAccessToken calls into a single network request', async () => {
    let callCount = 0;
    const fetchFn = mockFetch(async () => {
      callCount++;
      // Slow response so two callers can race
      await new Promise((r) => setTimeout(r, 5));
      return new Response(
        JSON.stringify({
          token_type: 'Bearer',
          access_token: `A${callCount}`,
          refresh_token: `R${callCount}`,
          expires_in: 900,
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      );
    });
    let stored = 'R0';
    const fetcher = new AuthFetcher({
      baseUrl: BASE_URL,
      fetch: fetchFn,
      now: () => 1_000_000,
      loadRefresh: async () => stored,
      saveRefresh: async (t) => {
        stored = t;
      },
    });
    const [a, b] = await Promise.all([fetcher.getAccessToken(), fetcher.getAccessToken()]);
    expect(a).toBe(b);
    expect(callCount).toBe(1);
  });
});
