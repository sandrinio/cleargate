/**
 * inject-mcp-json.ts — write or merge `.mcp.json` so Claude Code registers the
 * cleargate MCP server. Called from `init` Step 7. (BUG-017)
 *
 * Behavior:
 *   - Greenfield: writes `{ mcpServers: { cleargate: { type, url } } }`.
 *   - Existing without `mcpServers`: adds `mcpServers.cleargate`.
 *   - Existing with other servers: leaves them alone, sets/replaces `mcpServers.cleargate`.
 *   - Idempotent: re-running on identical state produces byte-identical output.
 *
 * NOTE: this writes the HTTP transport entry. Claude Code's HTTP MCP transport
 * cannot drive auth against the cleargate server today (BUG-019). The 0.7.0
 * shipment is knowingly transitional — the long-term fix is a stdio shim
 * (`cleargate mcp serve`) that this same file will switch to once shipped.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';

export interface McpServerEntry {
  type?: 'http' | 'sse' | 'stdio';
  url?: string;
  command?: string;
  args?: string[];
  headers?: Record<string, string>;
}

export interface McpJsonShape {
  mcpServers?: Record<string, McpServerEntry>;
  [k: string]: unknown;
}

/**
 * Pure merge: returns the new file content given the previous parse and the
 * desired cleargate entry. Stable JSON formatting (2-space indent + trailing
 * newline) for byte-equality on idempotent re-runs.
 */
export function mergeMcpJson(existing: McpJsonShape | null, entry: McpServerEntry): string {
  const next: McpJsonShape = existing ? { ...existing } : {};
  const servers: Record<string, McpServerEntry> = { ...(next.mcpServers ?? {}) };
  servers.cleargate = entry;
  next.mcpServers = servers;
  return JSON.stringify(next, null, 2) + '\n';
}

/**
 * Build the stdio entry for a given pinned cleargate version.
 *
 * BUG-019 + post-0.8.0 fix: prior 0.8.0 used `command: "cleargate"` which
 * required a global install. Most users `npx cleargate init` — no global
 * binary on PATH — so Claude Code's spawn failed. Switching to `npx -y
 * cleargate@<pin>` works for both populations (cached after first hit).
 * Pinning the version is the CR-009 resolver pattern: `.mcp.json` doesn't
 * float past the cleargate version that wrote it.
 */
export function buildStdioEntry(pinVersion: string): McpServerEntry {
  return {
    command: 'npx',
    args: ['-y', `cleargate@${pinVersion}`, 'mcp', 'serve'],
  };
}

/**
 * Default stdio entry exported for tests. Production callers should pass an
 * explicit pin (init reads pkg.version).
 */
export const STDIO_ENTRY_DEFAULT: McpServerEntry = buildStdioEntry('latest');

/**
 * Filesystem-side entry point. Reads `<cwd>/.mcp.json` if present, merges,
 * writes back. Returns one of {created, updated, unchanged} for caller logging.
 *
 * @param cwd          target directory
 * @param pinVersion   cleargate version to pin in the npx invocation; the
 *                     init pipeline passes pkg.version. Defaults to `latest`
 *                     for callers that don't have a version handy (tests).
 */
export function injectMcpJson(
  cwd: string,
  pinVersion: string = 'latest',
): 'created' | 'updated' | 'unchanged' {
  const dst = path.join(cwd, '.mcp.json');
  const entry: McpServerEntry = buildStdioEntry(pinVersion);

  let existing: McpJsonShape | null = null;
  let existingRaw: string | null = null;
  if (fs.existsSync(dst)) {
    existingRaw = fs.readFileSync(dst, 'utf8');
    try {
      existing = JSON.parse(existingRaw) as McpJsonShape;
    } catch {
      // Malformed — surface to caller via stderr; safest move is to refuse
      // overwrite. Caller decides whether to abort or continue with a warning.
      throw new Error(
        `inject-mcp-json: ${dst} is not valid JSON; refusing to overwrite. Fix or remove the file and re-run init.`,
      );
    }
  }

  const next = mergeMcpJson(existing, entry);

  if (existingRaw !== null && existingRaw === next) {
    return 'unchanged';
  }

  fs.writeFileSync(dst, next);
  return existingRaw === null ? 'created' : 'updated';
}
