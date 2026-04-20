/**
 * acquireAccessToken — resolve a short-lived MCP access-token JWT.
 *
 * Resolution order (first success wins):
 *   1. CLEARGATE_MCP_TOKEN env var — CI / dev short-circuit (assumed JWT, not verified locally).
 *   2. Stored refresh token (keychain/file) + POST /auth/refresh → rotates refresh token, returns access token.
 *
 * Errors surface to caller with a clear message so command handlers can exit cleanly.
 *
 * Lives here (not in mcp-client.ts) because the refresh flow needs TokenStore + mcpUrl and
 * mcp-client.ts is kept thin (just: host, bearer, JSON-RPC).
 */
import { createTokenStore } from './factory.js';
import type { TokenStore } from './token-store.js';

export interface AcquireOptions {
  mcpUrl: string;
  profile: string;
  /** Test seam: overrides globalThis.fetch */
  fetch?: typeof globalThis.fetch;
  /** Test seam: overrides createTokenStore */
  createStore?: () => Promise<TokenStore>;
  /** Test seam: overrides process.env lookup */
  env?: NodeJS.ProcessEnv;
}

export class AcquireError extends Error {
  constructor(
    message: string,
    public readonly code:
      | 'env_token'
      | 'no_stored_token'
      | 'invalid_token'
      | 'token_revoked'
      | 'transport'
      | 'unexpected_status'
      | 'bad_response',
  ) {
    super(message);
    this.name = 'AcquireError';
  }
}

/**
 * Returns a bearer string suitable for Authorization headers against /mcp and
 * /admin-api. Rotates the stored refresh token on success.
 */
export async function acquireAccessToken(opts: AcquireOptions): Promise<string> {
  const env = opts.env ?? process.env;

  // 1. Env short-circuit — CI / dev / manual paste. Assumed to be a valid JWT.
  const envToken = env['CLEARGATE_MCP_TOKEN'];
  if (envToken && envToken.length > 0) {
    return envToken;
  }

  // 2. Stored refresh token → POST /auth/refresh.
  const store = await (opts.createStore ?? createTokenStore)();
  const stored = await store.load(opts.profile);
  if (!stored) {
    throw new AcquireError(
      `No stored credentials for profile '${opts.profile}'. Run \`cleargate join <invite-url>\` first, or export CLEARGATE_MCP_TOKEN.`,
      'no_stored_token',
    );
  }

  const fetchFn = opts.fetch ?? globalThis.fetch;

  let response: Response;
  try {
    response = await fetchFn(`${opts.mcpUrl}/auth/refresh`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ refresh_token: stored }),
    });
  } catch (err) {
    throw new AcquireError(
      `cannot reach ${opts.mcpUrl} (${err instanceof Error ? err.message : String(err)})`,
      'transport',
    );
  }

  if (response.status === 401) {
    const body = (await response.json().catch(() => ({}))) as { error?: string };
    if (body.error === 'token_revoked') {
      throw new AcquireError(
        'refresh token was revoked. Run `cleargate join <invite-url>` to re-authenticate.',
        'token_revoked',
      );
    }
    throw new AcquireError(
      'refresh token is invalid or expired. Run `cleargate join <invite-url>` to re-authenticate.',
      'invalid_token',
    );
  }

  if (!response.ok) {
    throw new AcquireError(`unexpected status ${response.status} from /auth/refresh`, 'unexpected_status');
  }

  const body = (await response.json().catch(() => null)) as
    | { access_token?: unknown; refresh_token?: unknown }
    | null;
  if (
    !body ||
    typeof body.access_token !== 'string' ||
    typeof body.refresh_token !== 'string' ||
    body.access_token.length === 0 ||
    body.refresh_token.length === 0
  ) {
    throw new AcquireError('server returned unexpected /auth/refresh response shape', 'bad_response');
  }

  // Rotate — store the new refresh token so the next call uses a fresh jti.
  await store.save(opts.profile, body.refresh_token);

  return body.access_token;
}
