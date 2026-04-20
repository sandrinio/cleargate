/**
 * Typed MCP admin-API client — STORY-006-02
 *
 * Module-level state only. NEVER localStorage/sessionStorage.
 * Token is lost on page unload; reload triggers fresh exchange.
 *
 * Exchange: POST /admin-api/v1/auth/exchange with cg_session cookie.
 * 401 retry: exactly ONE retry. Second 401 surfaces as AuthError.
 * Proactive refresh: 2 min before expires_at via setTimeout.
 */
import type { ZodSchema } from 'zod';
import { AuthExchangeResponseSchema } from 'cleargate/admin-api';
import { AuthError, ForbiddenError, NetworkError } from './errors.js';

// Module-level state — never persisted to storage
let adminToken: string | null = null;
let expiresAt: Date | null = null;
let refreshTimer: ReturnType<typeof setTimeout> | null = null;

/** Injected base URL — defaults to env var at runtime */
let _baseUrl: string = '';

function getBaseUrl(): string {
  if (_baseUrl) return _baseUrl;
  // In SvelteKit, PUBLIC_ env vars are available via $env/static/public.
  // We read from import.meta.env for Vite builds, or process.env for tests.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const metaEnv = (import.meta as unknown as { env?: Record<string, string> }).env;
  if (metaEnv) {
    return metaEnv['VITE_MCP_URL'] ?? metaEnv['PUBLIC_MCP_URL'] ?? 'http://localhost:3001';
  }
  return process.env['VITE_MCP_URL'] ?? process.env['PUBLIC_MCP_URL'] ?? 'http://localhost:3001';
}

/** Override base URL (used in tests) */
export function _setBaseUrl(url: string): void {
  _baseUrl = url;
}

/** Override fetch (used in tests) */
let _fetch: typeof fetch = globalThis.fetch;
export function _setFetch(f: typeof fetch): void {
  _fetch = f;
}

/** Reset module state (used in tests) */
export function _resetState(): void {
  adminToken = null;
  expiresAt = null;
  if (refreshTimer) {
    clearTimeout(refreshTimer);
    refreshTimer = null;
  }
  _baseUrl = '';
  _fetch = globalThis.fetch;
}

function scheduleRefresh(at: Date): void {
  if (refreshTimer) clearTimeout(refreshTimer);
  const ms = at.getTime() - Date.now() - 2 * 60 * 1000; // 2 min before expiry
  if (ms > 0) {
    refreshTimer = setTimeout(() => {
      exchange().catch((err) => {
        // Proactive refresh failed — clear state so next caller triggers re-exchange
        adminToken = null;
        expiresAt = null;
        refreshTimer = null;
        console.error('[mcp-client] proactive refresh failed:', err);
      });
    }, ms);
  }
}

/**
 * Exchange the cg_session cookie for a short-lived admin_token.
 * The browser sends the HttpOnly cookie automatically when credentials: 'include'.
 */
export async function exchange(): Promise<{ admin_token: string; expires_at: string }> {
  const baseUrl = getBaseUrl();
  const res = await _fetch(`${baseUrl}/admin-api/v1/auth/exchange`, {
    method: 'POST',
    credentials: 'include',
  });

  if (res.status === 401) throw new AuthError('session_expired', 'Session expired — please log in again');
  if (res.status === 403) throw new ForbiddenError('not_authorized', 'GitHub account is not on the admin allowlist');
  if (!res.ok) throw new NetworkError(res.status, `Exchange failed with HTTP ${res.status}`);

  const body = AuthExchangeResponseSchema.parse(await res.json());
  adminToken = body.admin_token;
  expiresAt = new Date(body.expires_at);
  scheduleRefresh(expiresAt);
  return body;
}

/**
 * Authenticated GET with 401-retry-once pattern.
 */
export async function get<T>(path: string, schema: ZodSchema<T>): Promise<T> {
  if (!adminToken) await exchange();

  const baseUrl = getBaseUrl();
  let res = await _fetch(`${baseUrl}/admin-api/v1${path}`, {
    headers: { Authorization: `Bearer ${adminToken}` },
    credentials: 'include',
  });

  if (res.status === 401) {
    // One retry after re-exchange
    await exchange();
    res = await _fetch(`${baseUrl}/admin-api/v1${path}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
      credentials: 'include',
    });
    if (res.status === 401) throw new AuthError('session_expired', 'Session expired after retry');
  }

  if (res.status === 403) throw new ForbiddenError('forbidden', 'Forbidden');
  if (!res.ok) throw new NetworkError(res.status);

  return schema.parse(await res.json());
}

/**
 * Authenticated POST with 401-retry-once pattern.
 */
export async function post<T>(path: string, body: unknown, schema: ZodSchema<T>): Promise<T> {
  if (!adminToken) await exchange();

  const baseUrl = getBaseUrl();
  let res = await _fetch(`${baseUrl}/admin-api/v1${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${adminToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
    credentials: 'include',
  });

  if (res.status === 401) {
    await exchange();
    res = await _fetch(`${baseUrl}/admin-api/v1${path}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      credentials: 'include',
    });
    if (res.status === 401) throw new AuthError('session_expired', 'Session expired after retry');
  }

  if (res.status === 403) throw new ForbiddenError('forbidden', 'Forbidden');
  if (!res.ok) throw new NetworkError(res.status);

  return schema.parse(await res.json());
}

/**
 * Clear in-memory token and cancel proactive refresh timer.
 * Call on user sign-out or page unload.
 */
export function signOut(): void {
  adminToken = null;
  expiresAt = null;
  if (refreshTimer) {
    clearTimeout(refreshTimer);
    refreshTimer = null;
  }
}

/** Expose current token for server-side SSR usage */
export function getAdminToken(): string | null {
  return adminToken;
}

/**
 * Legacy default export for backward compat with STORY-006-01 stub consumers.
 * @deprecated Use named exports directly.
 */
export const mcpClient = {
  exchange,
  get,
  post,
  signOut,
};
