/**
 * cleargate whoami — smoke-test command that proves the stored refresh token
 * can be exchanged for a short-lived MCP access token, decodes the JWT payload
 * (no verification — just introspection), and prints identity fields.
 *
 * CR-011: adds --json mode. When --json flag is present, skip network entirely;
 * call getMembershipState() and emit JSON to stdout. Existing non-JSON path
 * (network whoami) remains unchanged for backward compat.
 *
 * This is the first command to exercise the acquireAccessToken flow end-to-end;
 * sync/pull/push will be wired in follow-up stories.
 */
import { loadConfig, requireMcpUrl } from '../config.js';
import { acquireAccessToken, AcquireError } from '../auth/acquire.js';
import { decodeJwtPayload, getMembershipState } from '../lib/membership.js';

export interface WhoamiOptions {
  profile: string;
  mcpUrlFlag?: string;
  /** CR-011: emit JSON state instead of making a network call */
  json?: boolean;
  /** Test seam: replaces globalThis.fetch */
  fetch?: typeof globalThis.fetch;
  stdout?: (s: string) => void;
  stderr?: (s: string) => void;
  exit?: (code: number) => never;
  /** Test seam: override ~/.cleargate home path for getMembershipState */
  cleargateHome?: string;
  /** Test seam: override clock for expiry check */
  now?: () => number;
}

export async function whoamiHandler(opts: WhoamiOptions): Promise<void> {
  const stdout = opts.stdout ?? ((s) => process.stdout.write(s));
  const stderr = opts.stderr ?? ((s) => process.stderr.write(s));
  const exit = opts.exit ?? ((c: number): never => process.exit(c));

  // CR-011: --json mode — cheap-path, no network call.
  if (opts.json) {
    const state = getMembershipState({
      profile: opts.profile,
      cleargateHome: opts.cleargateHome,
      now: opts.now,
    });
    stdout(JSON.stringify(state) + '\n');
    return;
  }

  // Existing network path (backward compat).
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
      `member_id:  ${claims['sub'] ?? '?'}`,
      `project_id: ${claims['project_id'] ?? '?'}`,
      `role:       ${claims['role'] ?? '?'}`,
      `expires_at: ${typeof claims['exp'] === 'number' ? new Date(claims['exp'] as number * 1000).toISOString() : '?'}`,
      '',
    ].join('\n'),
  );
}
