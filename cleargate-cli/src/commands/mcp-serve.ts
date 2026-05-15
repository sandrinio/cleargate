/**
 * `cleargate mcp serve` — stdio↔HTTP MCP proxy with auto-refresh auth.
 *
 * BUG-019 fix. Claude Code spawns this as a stdio MCP server (see
 * inject-mcp-json.ts). Each line on stdin is a JSON-RPC message; the proxy
 * POSTs it to the cleargate-mcp HTTPS `/mcp` endpoint with `Authorization:
 * Bearer <access_token>`, then writes the response (single JSON OR SSE-framed
 * data events) back to stdout, one JSON-RPC message per line.
 *
 * Auth model (CR-065):
 *   service-token mode (CLEARGATE_SERVICE_TOKEN set + non-empty):
 *     - token passed verbatim as Bearer on every /mcp POST.
 *     - no keychain access, no refresh logic.
 *     - on 401 from /mcp: print actionable error and exit non-zero.
 *
 *   keychain-refresh mode (CLEARGATE_SERVICE_TOKEN unset or empty):
 *     - boot: load refresh_token from keychain → POST /auth/refresh → cache
 *       access_token + persist rotated refresh_token.
 *     - per-request: lazy refresh ~60s before access expiry; on 401 invalidate
 *       and retry once.
 *     - if refresh itself fails (no token / revoked): print actionable hint to
 *       stderr and exit non-zero so Claude Code surfaces "auth failed".
 *
 * Notification messages (id-less JSON-RPC) get no stdout response per spec.
 *
 * Streaming: stateless server returns single JSON for cleargate's tools. SSE
 * is handled defensively for forward-compat (parses `data:` events line-wise).
 */
import * as readline from 'node:readline';
import { Readable } from 'node:stream';
import { loadConfig } from '../config.js';
import { createTokenStore } from '../auth/factory.js';
import { AuthFetcher, RefreshError } from '../auth/refresh.js';
import type { TokenFetcher } from '../auth/refresh.js';
import { ServiceTokenFetcher } from '../auth/service-token-fetcher.js';

export interface McpServeOptions {
  profile: string;
  /** Override baseUrl (defaults to canonical hosted server). */
  mcpUrlFlag?: string;
  /** Test seam: replaces globalThis.fetch. */
  fetch?: typeof globalThis.fetch;
  /** Test seam: replaces createTokenStore. */
  createStore?: typeof createTokenStore;
  /** Test seam: input stream (default process.stdin). */
  stdin?: NodeJS.ReadableStream;
  /** Test seam: output writer (default process.stdout.write). */
  stdout?: (s: string) => void;
  /** Test seam: stderr writer. */
  stderr?: (s: string) => void;
  /** Test seam: process.exit replacement. */
  exit?: (code: number) => never;
  /** Test seam: replaces Date.now in AuthFetcher. */
  now?: () => number;
  /** Test seam: keychain service override (forwarded to TokenStore). */
  keychainService?: string;
  /** Test seam: forced TokenStore backend (forwarded). */
  forceBackend?: 'keychain' | 'file';
}

const DEFAULT_BASE_URL = 'https://cleargate-mcp.soula.ge';

/** Sentinel error type used to signal a service-token 401 up through proxyOne. */
class ServiceToken401Error extends Error {
  constructor() {
    super('service-token-401');
    this.name = 'ServiceToken401Error';
  }
}

export async function mcpServeHandler(opts: McpServeOptions): Promise<void> {
  const fetchFn = opts.fetch ?? globalThis.fetch;
  const stdout = opts.stdout ?? ((s) => process.stdout.write(s));
  const stderr = opts.stderr ?? ((s) => process.stderr.write(s));
  const exit = opts.exit ?? ((c: number): never => process.exit(c));

  const cfg = loadConfig({
    flags: { profile: opts.profile, mcpUrl: opts.mcpUrlFlag },
  });
  const baseUrl = cfg.mcpUrl ?? DEFAULT_BASE_URL;

  // CR-065: service-token branch — checked BEFORE touching the keychain.
  const serviceToken = process.env['CLEARGATE_SERVICE_TOKEN'] ?? '';
  let fetcher: TokenFetcher;
  let isServiceTokenMode: boolean;

  if (serviceToken.length > 0) {
    // Service-token mode: bypass keychain entirely.
    isServiceTokenMode = true;
    fetcher = new ServiceTokenFetcher(serviceToken);
    stderr('cleargate mcp serve: auth mode = service-token\n');
  } else {
    // Keychain-refresh mode: existing path, byte-identical to pre-CR.
    isServiceTokenMode = false;
    const store = await (opts.createStore ?? createTokenStore)({
      ...(opts.keychainService !== undefined ? { keychainService: opts.keychainService } : {}),
      ...(opts.forceBackend !== undefined ? { forceBackend: opts.forceBackend } : {}),
    });

    const authFetcher = new AuthFetcher({
      baseUrl,
      loadRefresh: () => store.load(opts.profile),
      saveRefresh: (t) => store.save(opts.profile, t),
      ...(opts.fetch !== undefined ? { fetch: opts.fetch } : {}),
      ...(opts.now !== undefined ? { now: opts.now } : {}),
    });

    fetcher = authFetcher;
    stderr('cleargate mcp serve: auth mode = keychain-refresh\n');

    // Boot-time refresh so failures surface early (Claude Code shows auth-failed).
    try {
      await authFetcher.getAccessToken();
    } catch (err) {
      if (err instanceof RefreshError) {
        stderr(
          `cleargate mcp serve: refresh failed (${err.status} ${err.code}). ` +
            `Run \`cleargate join <invite-url>\` to re-authenticate.\n`,
        );
      } else {
        stderr(
          `cleargate mcp serve: ${err instanceof Error ? err.message : String(err)}\n`,
        );
      }
      return exit(1);
    }
  }

  const inputStream = (opts.stdin as Readable | undefined) ?? process.stdin;
  const rl = readline.createInterface({
    input: inputStream,
    output: undefined,
    terminal: false,
  });

  for await (const line of rl) {
    if (!line.trim()) continue;
    try {
      await proxyOne(
        line,
        baseUrl,
        fetcher,
        isServiceTokenMode,
        fetchFn,
        stdout,
        stderr,
      );
    } catch (err) {
      if (err instanceof ServiceToken401Error) {
        // Fail fast in service-token mode: print actionable error and exit.
        stderr(
          `cleargate mcp serve: CLEARGATE_SERVICE_TOKEN rejected by /mcp (401). ` +
            `Issue a new token in the admin console: Tokens → Issue → copy snippet.\n`,
        );
        return exit(1);
      }
      // Emit an internal-error JSON-RPC response if we have an id; otherwise
      // log and continue.
      const errMsg = err instanceof Error ? err.message : String(err);
      stderr(`cleargate mcp serve: proxy error: ${errMsg}\n`);
      const id = extractId(line);
      if (id !== undefined) {
        stdout(
          JSON.stringify({
            jsonrpc: '2.0',
            id,
            error: { code: -32603, message: `proxy error: ${errMsg}` },
          }) + '\n',
        );
      }
    }
  }
}

async function proxyOne(
  line: string,
  baseUrl: string,
  fetcher: TokenFetcher,
  isServiceTokenMode: boolean,
  fetchFn: typeof globalThis.fetch,
  stdout: (s: string) => void,
  stderr: (s: string) => void,
): Promise<void> {
  let parsed: { id?: unknown };
  try {
    parsed = JSON.parse(line) as { id?: unknown };
  } catch {
    stderr(`cleargate mcp serve: ignoring non-JSON line: ${line.slice(0, 80)}\n`);
    return;
  }
  const isNotification = !('id' in parsed) || parsed.id === undefined || parsed.id === null;

  let access = await fetcher.getAccessToken();
  let res = await postFrame(baseUrl, line, access, fetchFn);

  if (res.status === 401) {
    if (isServiceTokenMode) {
      // Fail fast in service-token mode — throw sentinel; no retry, no fallback.
      throw new ServiceToken401Error();
    }
    // Keychain mode: invalidate + retry once (existing behavior).
    (fetcher as AuthFetcher).invalidate();
    access = await fetcher.getAccessToken();
    res = await postFrame(baseUrl, line, access, fetchFn);
  }

  if (isNotification) {
    // No response body expected. Drain to free the connection.
    await res.arrayBuffer().catch(() => undefined);
    return;
  }

  const ct = res.headers.get('content-type') ?? '';
  if (ct.includes('text/event-stream')) {
    await streamSse(res, stdout);
  } else {
    const text = await res.text();
    if (text.length > 0) stdout(text + '\n');
  }
}

async function postFrame(
  baseUrl: string,
  body: string,
  accessToken: string,
  fetchFn: typeof globalThis.fetch,
): Promise<Response> {
  return fetchFn(`${baseUrl}/mcp`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json, text/event-stream',
      Authorization: `Bearer ${accessToken}`,
    },
    body,
  });
}

async function streamSse(res: Response, stdout: (s: string) => void): Promise<void> {
  if (!res.body) return;
  const reader = res.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let buf = '';
  for (;;) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    let nl: number;
    while ((nl = buf.indexOf('\n')) !== -1) {
      const ln = buf.slice(0, nl);
      buf = buf.slice(nl + 1);
      if (ln.startsWith('data:')) {
        const payload = ln.slice(5).trim();
        if (payload) stdout(payload + '\n');
      }
      // ignore comments + event/id lines for our minimal proxy
    }
  }
}

function extractId(line: string): unknown {
  try {
    const obj = JSON.parse(line) as { id?: unknown };
    return 'id' in obj ? obj.id : undefined;
  } catch {
    return undefined;
  }
}
