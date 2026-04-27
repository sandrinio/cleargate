/**
 * refresh.ts — token refresh exchange against the cleargate MCP server.
 *
 * `cleargate join` saves a refresh token to the OS keychain. To talk to the
 * `/mcp` HTTP endpoint Claude Code (or any client) needs a short-lived
 * access token. This module exchanges refresh→access via POST /auth/refresh,
 * persists the rotated refresh token back to the keychain, and exposes a
 * small `AuthFetcher` that lazy-refreshes before token expiry and on 401.
 *
 * BUG-019 — used by `cleargate mcp serve` (and any future surfaces).
 */

export interface RefreshExchangeResponse {
  token_type: 'Bearer';
  access_token: string;
  expires_in: number;
  refresh_token: string;
}

export interface RefreshDeps {
  fetch?: typeof globalThis.fetch;
  /** Wall-clock for tests. Default: () => Date.now(). */
  now?: () => number;
}

/**
 * One-shot refresh. Throws on non-2xx. Caller is responsible for persisting
 * the rotated refresh token.
 */
export async function refreshAccessToken(
  baseUrl: string,
  refreshToken: string,
  deps: RefreshDeps = {},
): Promise<RefreshExchangeResponse> {
  const fetchFn = deps.fetch ?? globalThis.fetch;
  const res = await fetchFn(`${baseUrl}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });

  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new RefreshError(res.status, body.error ?? 'unknown_error');
  }

  const json = (await res.json()) as RefreshExchangeResponse;
  if (
    typeof json.access_token !== 'string' ||
    typeof json.refresh_token !== 'string' ||
    typeof json.expires_in !== 'number'
  ) {
    throw new RefreshError(500, 'malformed_response');
  }
  return json;
}

export class RefreshError extends Error {
  constructor(public status: number, public code: string) {
    super(`refresh failed: ${status} ${code}`);
    this.name = 'RefreshError';
  }
}

/**
 * Caching wrapper. Maintains a single live access token. Refreshes when:
 *   - no token cached yet
 *   - cached token is within `skewSeconds` of expiry (default 60s)
 *   - caller signals 401 via {@link AuthFetcher.invalidate}.
 *
 * Persists the rotated refresh token via the injected `saveRefresh` callback.
 */
export interface AuthFetcherOptions extends RefreshDeps {
  baseUrl: string;
  loadRefresh: () => Promise<string | null>;
  saveRefresh: (token: string) => Promise<void>;
  /** Refresh `skewSeconds` before access expiry. Default: 60. */
  skewSeconds?: number;
}

export class AuthFetcher {
  private accessToken: string | null = null;
  private accessExpiresAt = 0;
  private inflight: Promise<string> | null = null;

  constructor(private readonly opts: AuthFetcherOptions) {}

  /** Returns a fresh access token, refreshing if needed. */
  async getAccessToken(): Promise<string> {
    const now = (this.opts.now ?? (() => Date.now()))();
    const skewMs = (this.opts.skewSeconds ?? 60) * 1000;
    if (this.accessToken && now < this.accessExpiresAt - skewMs) {
      return this.accessToken;
    }
    if (this.inflight) return this.inflight;

    this.inflight = this.refreshNow().finally(() => {
      this.inflight = null;
    });
    return this.inflight;
  }

  /** Force the next call to refresh. Used after a 401. */
  invalidate(): void {
    this.accessToken = null;
    this.accessExpiresAt = 0;
  }

  private async refreshNow(): Promise<string> {
    const stored = await this.opts.loadRefresh();
    if (!stored) {
      throw new RefreshError(401, 'no_refresh_token');
    }
    const exchanged = await refreshAccessToken(this.opts.baseUrl, stored, {
      ...(this.opts.fetch ? { fetch: this.opts.fetch } : {}),
      ...(this.opts.now ? { now: this.opts.now } : {}),
    });
    await this.opts.saveRefresh(exchanged.refresh_token);
    const now = (this.opts.now ?? (() => Date.now()))();
    this.accessToken = exchanged.access_token;
    this.accessExpiresAt = now + exchanged.expires_in * 1000;
    return exchanged.access_token;
  }
}
