/**
 * acquireAccessToken — resolve a short-lived MCP access-token JWT.
 *
 * Resolution order (first success wins):
 *   1. CLEARGATE_MCP_TOKEN env var — CI / dev short-circuit (assumed JWT, not verified locally).
 *   2. In-memory single-flight cache (keyed by `${profile}::${mcpUrl}`) — returns cached token
 *      if still valid (expires 60s before access token's `exp` claim).
 *   3. Stored refresh token (keychain/file) + POST /auth/refresh → rotates refresh token, returns access token.
 *
 * Errors surface to caller with a clear message so command handlers can exit cleanly.
 *
 * Lives here (not in mcp-client.ts) because the refresh flow needs TokenStore + mcpUrl and
 * mcp-client.ts is kept thin (just: host, bearer, JSON-RPC).
 */
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { createTokenStore } from './factory.js';
import type { TokenStore } from './token-store.js';

// ── In-memory + on-disk single-flight cache ──────────────────────────────────
// In-memory: process-local; naturally cleared when the Node CLI exits.
// On-disk:   ~/.cleargate/access-token.json (mode 0600), survives across CLI
//            invocations. Critical because each `cleargate` call is a fresh
//            process — without a disk cache every call hits keychain to load
//            the refresh token, then rotates it via /auth/refresh, which
//            re-saves to keychain and resets the macOS ACL → re-prompt loop.
// Key: `${profile}::${mcpUrl}` — two profiles in same process never collide.
// Env-token path (CLEARGATE_MCP_TOKEN) bypasses both caches entirely.

const CACHE = new Map<string, { accessToken: string; expiresAtMs: number }>();

interface DiskCacheEntry {
  accessToken: string;
  expiresAtMs: number;
}
interface DiskCacheFile {
  version: 1;
  entries: Record<string, DiskCacheEntry>;
}

function defaultDiskCachePath(env: NodeJS.ProcessEnv = process.env): string | null {
  // Test override: setting CLEARGATE_DISK_CACHE_PATH=off disables the disk
  // cache entirely; setting it to a path uses that file instead of the home dir.
  const override = env['CLEARGATE_DISK_CACHE_PATH'];
  if (override === 'off') return null;
  if (typeof override === 'string' && override.length > 0) return override;
  const home = os.homedir();
  if (!home) return null;
  return path.join(home, '.cleargate', 'access-token.json');
}

function readDiskCache(filePath: string): DiskCacheFile {
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    const parsed = JSON.parse(raw) as unknown;
    if (
      parsed !== null &&
      typeof parsed === 'object' &&
      (parsed as { version?: unknown }).version === 1 &&
      typeof (parsed as { entries?: unknown }).entries === 'object' &&
      (parsed as { entries?: unknown }).entries !== null
    ) {
      return parsed as DiskCacheFile;
    }
  } catch {
    // ENOENT, parse error, schema mismatch — treat as empty
  }
  return { version: 1, entries: {} };
}

function writeDiskCache(filePath: string, data: DiskCacheFile): void {
  const dir = path.dirname(filePath);
  try {
    fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
    try {
      fs.chmodSync(dir, 0o700);
    } catch {
      // existing dir with custom mode — leave alone
    }
    const tmpPath = path.join(dir, '.access-token.json.tmp');
    fs.writeFileSync(tmpPath, JSON.stringify(data, null, 2) + '\n', { mode: 0o600 });
    fs.chmodSync(tmpPath, 0o600);
    fs.renameSync(tmpPath, filePath);
    fs.chmodSync(filePath, 0o600);
  } catch {
    // Disk-cache failures are non-fatal — the next call just refreshes again.
  }
}

/** Test seam: clear the in-memory acquire cache between tests. */
export function __resetAcquireCache(): void {
  CACHE.clear();
}

/** Decode a JWT payload without verifying the signature (CLI-side only). */
function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const padded = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const json = Buffer.from(padded, 'base64').toString('utf8');
    return JSON.parse(json) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export interface AcquireOptions {
  mcpUrl: string;
  profile: string;
  /** Force a fresh /auth/refresh even if the cache has a valid entry. */
  forceRefresh?: boolean;
  /** Test seam: overrides globalThis.fetch */
  fetch?: typeof globalThis.fetch;
  /** Test seam: overrides createTokenStore */
  createStore?: () => Promise<TokenStore>;
  /** Test seam: overrides process.env lookup */
  env?: NodeJS.ProcessEnv;
  /** Test seam: overrides Date.now() for expiry calculations. */
  now?: () => number;
  /** Test seam: overrides ~/.cleargate/access-token.json path. */
  diskCachePath?: string | null;
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
  const nowFn = opts.now ?? Date.now;

  // 1. Env short-circuit — CI / dev / manual paste. Assumed to be a valid JWT.
  // Env tokens are NOT cached — they have no known exp without decoding + the
  // env is set per-invocation in CI anyway.
  const envToken = env['CLEARGATE_MCP_TOKEN'];
  if (envToken && envToken.length > 0) {
    return envToken;
  }

  // 2a. In-memory cache check (skip when forceRefresh is set).
  const cacheKey = `${opts.profile}::${opts.mcpUrl}`;
  if (!opts.forceRefresh) {
    const cached = CACHE.get(cacheKey);
    if (cached && nowFn() < cached.expiresAtMs) {
      return cached.accessToken;
    }
  }

  // 2b. On-disk cache check — survives across CLI invocations and avoids
  //     the keychain re-prompt loop that comes from per-call refresh-token
  //     rotation. Disabled by passing diskCachePath: null (tests) or
  //     CLEARGATE_DISK_CACHE_PATH=off in the real process env.
  //     Note: consults process.env (not opts.env) because tests deliberately
  //     pass empty `env: {}` to suppress CLEARGATE_MCP_TOKEN, but still want
  //     the disk-cache override picked up from the test runner's env.
  const diskCachePath =
    opts.diskCachePath === undefined ? defaultDiskCachePath() : opts.diskCachePath;
  if (!opts.forceRefresh && diskCachePath) {
    const file = readDiskCache(diskCachePath);
    const entry = file.entries[cacheKey];
    if (entry && nowFn() < entry.expiresAtMs) {
      // Promote into in-memory cache for the rest of this process's lifetime.
      CACHE.set(cacheKey, entry);
      return entry.accessToken;
    }
  }

  // 3. Stored refresh token → POST /auth/refresh.
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

  const accessToken = body.access_token;

  // 4. Cache the new access token (expire 60s before the JWT exp claim) in
  //    BOTH the in-memory map and on disk. The disk cache is what stops the
  //    keychain re-prompt loop on subsequent CLI invocations.
  const payload = decodeJwtPayload(accessToken);
  const exp = payload?.exp;
  if (typeof exp === 'number' && Number.isFinite(exp)) {
    const expiresAtMs = (exp - 60) * 1000;
    const entry: DiskCacheEntry = { accessToken, expiresAtMs };
    CACHE.set(cacheKey, entry);
    if (diskCachePath) {
      const file = readDiskCache(diskCachePath);
      file.entries[cacheKey] = entry;
      writeDiskCache(diskCachePath, file);
    }
  }
  // If exp is missing or non-numeric, do NOT cache — next call will re-refresh.

  return accessToken;
}
