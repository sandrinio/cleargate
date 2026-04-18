import * as os from 'node:os';
import { loadConfig } from '../config.js';
import { createTokenStore } from '../auth/factory.js';

const UUID_V4_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export interface JoinOptions {
  inviteUrl: string;
  profile: string;
  mcpUrlFlag?: string;
  /** Test seam: replaces globalThis.fetch */
  fetch?: typeof globalThis.fetch;
  /** Test seam: replaces createTokenStore */
  createStore?: typeof createTokenStore;
  /** Test seam: replaces os.hostname() */
  hostname?: () => string;
  /** Test seam: replaces process.stdout.write */
  stdout?: (s: string) => void;
  /** Test seam: replaces process.stderr.write */
  stderr?: (s: string) => void;
  /** Test seam: replaces process.exit */
  exit?: (code: number) => never;
}

export async function joinHandler(opts: JoinOptions): Promise<void> {
  const fetchFn = opts.fetch ?? globalThis.fetch;
  const stdout = opts.stdout ?? ((s) => process.stdout.write(s));
  const stderr = opts.stderr ?? ((s) => process.stderr.write(s));
  const exit = opts.exit ?? ((c: number): never => process.exit(c));
  const hostname = opts.hostname ?? (() => os.hostname());

  // ── Parse inviteUrl → { token, baseUrl } ──────────────────────────────────
  let token: string;
  let baseUrl: string;

  try {
    if (UUID_V4_RE.test(opts.inviteUrl)) {
      // Bare UUID form — requires mcpUrl from config
      token = opts.inviteUrl;
      const cfg = loadConfig({
        flags: { profile: opts.profile, mcpUrl: opts.mcpUrlFlag },
      });
      if (!cfg.mcpUrl) {
        stderr(
          'cleargate: bare invite token requires mcpUrl. Pass --mcp-url <url> or set CLEARGATE_MCP_URL.\n',
        );
        exit(5);
        return; // unreachable — satisfies TypeScript after mock exit
      }
      baseUrl = cfg.mcpUrl;
    } else {
      // Full URL form: https://host/join/<uuid>
      const url = new URL(opts.inviteUrl);
      const m = url.pathname.match(/^\/join\/([0-9a-f-]{36})$/i);
      if (!m || !UUID_V4_RE.test(m[1]!)) {
        throw new Error('bad path');
      }
      token = m[1]!;
      baseUrl = url.origin;
    }
  } catch {
    stderr('cleargate: invalid invite URL or token format.\n');
    exit(5);
    return; // unreachable
  }

  // ── POST /join/:token ──────────────────────────────────────────────────────
  let response: Response;
  try {
    response = await fetchFn(`${baseUrl}/join/${token}`, { method: 'POST' });
  } catch (err) {
    stderr(
      `cleargate: cannot reach ${baseUrl} (${err instanceof Error ? err.message : String(err)}).\n`,
    );
    exit(2);
    return; // unreachable
  }

  // ── Error status handling ──────────────────────────────────────────────────
  if (response.status === 410) {
    const body = (await response.json().catch(() => ({}))) as {
      error?: string;
    };
    if (body.error === 'invite_expired') {
      stderr('cleargate: invite expired. Request a new invite.\n');
    } else {
      stderr('cleargate: invite already consumed. Request a new invite.\n');
    }
    exit(3);
    return;
  }

  if (response.status === 404) {
    stderr('cleargate: invite not found.\n');
    exit(4);
    return;
  }

  if (response.status === 429) {
    const retry = response.headers.get('retry-after') ?? '900';
    stderr(`cleargate: too many requests. Retry after ${retry}s.\n`);
    exit(8);
    return;
  }

  if (response.status >= 500) {
    stderr(`cleargate: server error ${response.status}.\n`);
    exit(6);
    return;
  }

  if (!response.ok) {
    stderr(`cleargate: unexpected status ${response.status}.\n`);
    exit(7);
    return;
  }

  // ── 200 — extract with named field access (NEVER spread) ──────────────────
  let rawBody: unknown;
  try {
    rawBody = await response.json();
  } catch {
    stderr('cleargate: server returned non-JSON response.\n');
    exit(7);
    return;
  }

  const b = rawBody as {
    refresh_token?: unknown;
    project_name?: unknown;
    member_role?: unknown;
  };

  if (typeof b.refresh_token !== 'string' || typeof b.project_name !== 'string') {
    stderr('cleargate: server returned unexpected response shape.\n');
    exit(7);
    return;
  }

  // ── Seat the refresh token ─────────────────────────────────────────────────
  // Named field access — b.refresh_token is a bare string, never logged
  const refreshToken: string = b.refresh_token;
  const projectName: string = b.project_name;

  try {
    const store = await (opts.createStore ?? createTokenStore)();
    await store.save(opts.profile, refreshToken);

    // ── Success output (D10) ─────────────────────────────────────────────────
    stdout(`joined project '${projectName}' as '${hostname()}'\n`);
    stdout(`refresh token saved to ${store.backend}.\n`);
  } catch (err) {
    stderr(
      `cleargate: internal error: ${err instanceof Error ? err.message : String(err)}\n`,
    );
    exit(99);
  }
}
