/**
 * cleargate whoami — smoke-test command that proves the stored refresh token
 * can be exchanged for a short-lived MCP access token, decodes the JWT payload
 * (no verification — just introspection), and prints identity fields.
 *
 * This is the first command to exercise the acquireAccessToken flow end-to-end;
 * sync/pull/push will be wired in follow-up stories.
 */
import { Buffer } from 'node:buffer';
import { loadConfig, requireMcpUrl } from '../config.js';
import { acquireAccessToken, AcquireError } from '../auth/acquire.js';

export interface WhoamiOptions {
  profile: string;
  mcpUrlFlag?: string;
  /** Test seam: replaces globalThis.fetch */
  fetch?: typeof globalThis.fetch;
  stdout?: (s: string) => void;
  stderr?: (s: string) => void;
  exit?: (code: number) => never;
}

function decodeJwtPayload(jwt: string): Record<string, unknown> | null {
  const parts = jwt.split('.');
  if (parts.length !== 3) return null;
  try {
    const json = Buffer.from(parts[1]!, 'base64url').toString('utf8');
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export async function whoamiHandler(opts: WhoamiOptions): Promise<void> {
  const stdout = opts.stdout ?? ((s) => process.stdout.write(s));
  const stderr = opts.stderr ?? ((s) => process.stderr.write(s));
  const exit = opts.exit ?? ((c: number): never => process.exit(c));

  const cfg = loadConfig({ flags: { profile: opts.profile, mcpUrl: opts.mcpUrlFlag } });
  let mcpUrl: string;
  try {
    mcpUrl = requireMcpUrl(cfg);
  } catch (err) {
    stderr(`cleargate: ${err instanceof Error ? err.message : String(err)}\n`);
    exit(5);
    return;
  }

  let accessToken: string;
  try {
    accessToken = await acquireAccessToken({
      mcpUrl,
      profile: opts.profile,
      fetch: opts.fetch,
    });
  } catch (err) {
    if (err instanceof AcquireError) {
      stderr(`cleargate: ${err.message}\n`);
      exit(err.code === 'transport' ? 2 : 5);
      return;
    }
    stderr(`cleargate: internal error: ${err instanceof Error ? err.message : String(err)}\n`);
    exit(99);
    return;
  }

  const claims = decodeJwtPayload(accessToken);
  if (!claims) {
    stderr('cleargate: access token received but could not decode payload.\n');
    exit(7);
    return;
  }

  stdout(
    [
      `mcp_url:    ${mcpUrl}`,
      `profile:    ${opts.profile}`,
      `member_id:  ${claims.sub ?? '?'}`,
      `project_id: ${claims.project_id ?? '?'}`,
      `role:       ${claims.role ?? '?'}`,
      `expires_at: ${typeof claims.exp === 'number' ? new Date(claims.exp * 1000).toISOString() : '?'}`,
      '',
    ].join('\n'),
  );
}
