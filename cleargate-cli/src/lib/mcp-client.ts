/**
 * mcp-client.ts — STORY-010-04
 *
 * Minimal JSON-RPC-over-HTTP client for ClearGate's MCP server.
 *
 * Token acquisition: reads CLEARGATE_MCP_TOKEN env var (dev short-circuit).
 * STORY-004-08 will replace this with a full /auth/exchange flow.
 *
 * MCP endpoint: reads CLEARGATE_MCP_URL env var or mcpUrl from ~/.cleargate/config.json.
 *
 * Flashcard: no pre-existing MCP client in cleargate-cli — built from scratch here.
 * No top-level await (FLASHCARD #tsup #cjs #esm).
 */

import { loadConfig } from '../config.js';

// ── Wire types (re-exported for consumers) ───────────────────────────────────

export interface RemoteUpdateRef {
  remote_id: string;
  updated_at: string;
}

export interface RemoteItem {
  remote_id: string;
  title: string;
  body: string | null;
  status: string;
  assignees: string[];
  labels: string[];
  updated_at: string;
  source_tool: string;
  raw: unknown;
}

export interface RemoteComment {
  id: string;
  author_email: string | null;
  author_name: string;
  body: string;
  created_at: string;
  remote_id: string;
}

export interface AdapterInfo {
  configured: boolean;
  name: 'linear' | 'jira' | 'github-projects' | 'no-adapter-configured';
}

// ── McpClient interface ───────────────────────────────────────────────────────

export interface McpClient {
  call<T>(tool: string, args: Record<string, unknown>): Promise<T>;
  adapterInfo(): Promise<AdapterInfo>;
}

export interface McpClientOptions {
  baseUrl: string;
  token: string;
  /** Test seam: override globalThis.fetch */
  fetch?: typeof globalThis.fetch;
}

// ── JSON-RPC envelope ─────────────────────────────────────────────────────────

interface JsonRpcRequest {
  jsonrpc: '2.0';
  method: 'tools/call';
  params: {
    name: string;
    arguments: Record<string, unknown>;
  };
  id: number;
}

interface JsonRpcResponse<T> {
  jsonrpc: '2.0';
  id: number;
  result?: {
    content?: Array<{ type: 'text'; text: string }>;
    structuredContent?: T;
  };
  error?: {
    code: number;
    message: string;
  };
}

let _reqId = 1;

// ── Factory ───────────────────────────────────────────────────────────────────

/**
 * createMcpClient — build a JSON-RPC client for the ClearGate MCP server.
 *
 * Sends POST to ${baseUrl}/mcp with Authorization: Bearer <token>.
 * Parses the StreamableHTTP response (may be plain JSON or SSE stream).
 */
export function createMcpClient(opts: McpClientOptions): McpClient {
  const fetchFn = opts.fetch ?? globalThis.fetch;

  async function call<T>(tool: string, args: Record<string, unknown>): Promise<T> {
    const body: JsonRpcRequest = {
      jsonrpc: '2.0',
      method: 'tools/call',
      params: { name: tool, arguments: args },
      id: _reqId++,
    };

    let response: Response;
    try {
      response = await fetchFn(`${opts.baseUrl}/mcp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json, text/event-stream',
          'Authorization': `Bearer ${opts.token}`,
        },
        body: JSON.stringify(body),
      });
    } catch (err) {
      throw new Error(`MCP transport error calling ${tool}: ${String(err)}`);
    }

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new Error(`MCP HTTP ${response.status} calling ${tool}: ${text.slice(0, 256)}`);
    }

    const text = await response.text();

    // Handle SSE stream: extract last JSON from event-stream data lines
    let jsonText = text;
    const contentType = response.headers.get('content-type') ?? '';
    if (contentType.includes('text/event-stream')) {
      const dataLines = text
        .split('\n')
        .filter((l) => l.startsWith('data: '))
        .map((l) => l.slice('data: '.length).trim())
        .filter((l) => l !== '' && l !== '[DONE]');
      if (dataLines.length === 0) {
        throw new Error(`MCP SSE response for ${tool} contained no data lines`);
      }
      jsonText = dataLines[dataLines.length - 1];
    }

    let parsed: JsonRpcResponse<T>;
    try {
      parsed = JSON.parse(jsonText) as JsonRpcResponse<T>;
    } catch {
      throw new Error(`MCP response for ${tool} is not valid JSON: ${jsonText.slice(0, 256)}`);
    }

    if (parsed.error) {
      throw new Error(`MCP tool ${tool} returned error ${parsed.error.code}: ${parsed.error.message}`);
    }

    // structuredContent preferred; fall back to parsing text content
    if (parsed.result?.structuredContent !== undefined) {
      return parsed.result.structuredContent as T;
    }

    const textContent = parsed.result?.content?.find((c) => c.type === 'text')?.text;
    if (textContent !== undefined) {
      try {
        return JSON.parse(textContent) as T;
      } catch {
        throw new Error(`MCP tool ${tool} text content is not valid JSON: ${textContent.slice(0, 256)}`);
      }
    }

    throw new Error(`MCP tool ${tool} returned no content`);
  }

  async function adapterInfo(): Promise<AdapterInfo> {
    return call<AdapterInfo>('cleargate_adapter_info', {});
  }

  return { call, adapterInfo };
}

// ── URL + token resolution ────────────────────────────────────────────────────

export interface ResolveMcpClientOpts {
  env?: NodeJS.ProcessEnv;
  /** Test seam: override fetch */
  fetch?: typeof globalThis.fetch;
}

/**
 * Resolve base URL and JWT token from env, then create an McpClient.
 *
 * URL resolution: CLEARGATE_MCP_URL env > mcpUrl in ~/.cleargate/config.json (via loadConfig).
 * Token: CLEARGATE_MCP_TOKEN env (mandatory; no fallback; no prompt — orchestrator decision).
 *
 * Throws with a clear message on missing config so the CLI can exit(2).
 */
export function resolveMcpClient(opts: ResolveMcpClientOpts = {}): McpClient {
  const env = opts.env ?? process.env;

  // Token — mandatory
  const token = env['CLEARGATE_MCP_TOKEN'];
  if (!token || !token.trim()) {
    throw new Error(
      'CLEARGATE_MCP_TOKEN is not set. ' +
      'Export your MCP JWT before running sync: export CLEARGATE_MCP_TOKEN=<token>',
    );
  }

  // URL — env first, then config file
  let baseUrl: string | undefined = env['CLEARGATE_MCP_URL'];
  if (!baseUrl || !baseUrl.trim()) {
    try {
      const cfg = loadConfig({ env });
      baseUrl = cfg.mcpUrl;
    } catch {
      // Config file absent or invalid — fall through to error below
    }
  }

  if (!baseUrl || !baseUrl.trim()) {
    throw new Error(
      'MCP URL not configured. Set CLEARGATE_MCP_URL env var or run `cleargate join <invite-url>`.',
    );
  }

  return createMcpClient({ baseUrl: baseUrl.trim(), token: token.trim(), fetch: opts.fetch });
}
