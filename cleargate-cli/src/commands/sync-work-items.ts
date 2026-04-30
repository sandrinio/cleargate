/**
 * sync-work-items.ts — STORY-023-01
 *
 * `cleargate sync work-items` — push all local work items (every status)
 * to the MCP cleargate_sync_work_items tool without requiring a PM adapter.
 *
 * Behaviour contract (EPIC-023 §2.1):
 *   - Status-blind: every item syncs (Draft, Approved, Verified, etc.)
 *   - Idempotent: skip if file_sha === last_synced_body_sha
 *   - Batch cap = 100 items per request
 *   - Atomic write-back to local frontmatter on accepted items
 *   - Prints "→ View synced items: <url>" on success
 *   - Conflicts/errors → stderr; exit 1 only if MCP call itself threw
 *   - No network traffic when 0 items changed
 *
 * Wire format: EPIC-023 §2.3. project_id NOT in the body — JWT carries it.
 *
 * MCP URL config: mirrors push.ts resolveMcp() pattern.
 *
 * No top-level await (FLASHCARD #tsup #cjs #esm).
 */

import { resolveIdentity } from '../lib/identity.js';
import { resolveActiveSprintDir, appendSyncLog } from '../lib/sync-log.js';
import { createMcpClient } from '../lib/mcp-client.js';
import type { McpClient } from '../lib/mcp-client.js';
import { acquireAccessToken, AcquireError } from '../auth/acquire.js';
import { loadConfig } from '../config.js';
import { syncWorkItems } from '../lib/sync/work-items.js';
import { adminUrl } from '../lib/admin-url.js';

// ── Options ────────────────────────────────────────────────────────────────────

export interface SyncWorkItemsOptions {
  projectRoot?: string;
  env?: NodeJS.ProcessEnv;
  /** Profile for token acquisition. Defaults to 'default'. */
  profile?: string;
  /** Test seam: inject McpClient directly (prevents token-from-env requirement) */
  mcp?: McpClient;
  /** Test seam: stdout writer */
  stdout?: (s: string) => void;
  /** Test seam: stderr writer */
  stderr?: (s: string) => void;
  /** Test seam: override process.exit */
  exit?: (code: number) => never;
  /** Test seam: override now() for timestamps */
  now?: () => string;
  /** Test seam: override adminUrl() return value */
  adminUrlFn?: () => string;
}

// ── Handler ────────────────────────────────────────────────────────────────────

export async function syncWorkItemsHandler(opts: SyncWorkItemsOptions = {}): Promise<void> {
  const projectRoot = opts.projectRoot ?? process.cwd();
  const env = opts.env ?? process.env;
  const stdout = opts.stdout ?? ((s: string) => process.stdout.write(s));
  const stderr = opts.stderr ?? ((s: string) => process.stderr.write(s));
  const exit = opts.exit ?? ((c: number): never => process.exit(c));
  const nowFn = opts.now ?? (() => new Date().toISOString());
  const adminUrlFn = opts.adminUrlFn ?? adminUrl;

  // ── Resolve MCP client (same pattern as push.ts) ──────────────────────────
  async function resolveMcp(): Promise<McpClient> {
    if (opts.mcp) return opts.mcp;

    let baseUrl: string | undefined = env['CLEARGATE_MCP_URL'];
    if (!baseUrl || !baseUrl.trim()) {
      try {
        const cfg = loadConfig({ env });
        baseUrl = cfg.mcpUrl;
      } catch {
        // Config absent — fall through
      }
    }
    if (!baseUrl || !baseUrl.trim()) {
      stderr(
        'Error: MCP URL not configured. Set CLEARGATE_MCP_URL env var or run `cleargate join <invite-url>`.\n',
      );
      exit(2);
      throw new Error('unreachable');
    }

    let accessToken: string;
    try {
      accessToken = await acquireAccessToken({
        mcpUrl: baseUrl.trim(),
        profile: opts.profile ?? 'default',
        env,
      });
    } catch (err) {
      if (err instanceof AcquireError) {
        stderr(`Error: ${err.message}\n`);
      } else {
        stderr(`Error: ${String(err)}\n`);
      }
      exit(2);
      throw new Error('unreachable');
    }

    return createMcpClient({ baseUrl: baseUrl.trim(), token: accessToken });
  }

  // ── Identity + sprint (for sync-log) ──────────────────────────────────────
  const identity = resolveIdentity(projectRoot);
  const sprintRoot = resolveActiveSprintDir(projectRoot);

  // ── Resolve MCP (checks URL + token before doing any work) ────────────────
  let mcp: McpClient;
  try {
    mcp = await resolveMcp();
  } catch (err) {
    // Re-throw any __exit-tagged error (thrown by the exit seam) so the
    // test harness can observe the exit code. Also re-throw 'unreachable'
    // sentinels from resolveMcp's post-exit throw.
    const e = err as Error & { __exit?: boolean };
    if (e.__exit || e.message === 'unreachable') {
      throw err;
    }
    stderr(`Error: ${e.message}\n`);
    exit(1);
    return;
  }

  // ── Run sync driver ────────────────────────────────────────────────────────
  let result;
  try {
    result = await syncWorkItems({ projectRoot, mcp, stdout, stderr, now: nowFn });
  } catch (err) {
    // MCP transport error — exit 1
    stderr(`Error: ${(err as Error).message}\n`);
    exit(1);
    return;
  }

  // ── No changes path ────────────────────────────────────────────────────────
  if (result.accepted === 0 && result.conflicts === 0 && result.errors === 0) {
    stdout('sync: 0 items changed (nothing to push)\n');
    return;
  }

  // ── Summary line ──────────────────────────────────────────────────────────
  stdout(
    `sync: ${result.accepted} accepted, ${result.conflicts} conflicts, ${result.errors} errors\n`,
  );

  // ── Per-conflict details → stderr ─────────────────────────────────────────
  for (const conflict of result.conflictItems) {
    stderr(
      `conflict: ${conflict.cleargate_id} — local_sha=${conflict.local_sha.slice(0, 8)}… ` +
        `remote_sha=${conflict.remote_sha.slice(0, 8)}… divergence_path=${conflict.divergence_path}\n`,
    );
  }

  // ── Per-error details → stderr ────────────────────────────────────────────
  for (const error of result.errorItems) {
    stderr(`error: ${error.cleargate_id} — code=${error.code} message=${error.message}\n`);
  }

  // ── Admin URL on success (at least one accepted item) ─────────────────────
  if (result.accepted > 0) {
    stdout(`→ View synced items: ${adminUrlFn()}\n`);
  }

  // ── Sync-log entry (one per invocation — per architect recommendation §5) ─
  try {
    await appendSyncLog(sprintRoot, {
      ts: nowFn(),
      actor: identity.email,
      op: 'push',
      target: 'work-items-batch',
      result: 'ok',
      detail: `accepted=${result.accepted} conflicts=${result.conflicts} errors=${result.errors}`,
    });
  } catch {
    // Sync-log write failure is non-fatal
  }

  // ── Exit code: 1 only if all batches errored (no accepted, has errors) ────
  // Per story §1.2: "exit 1 only if all batches errored or the MCP call itself threw"
  if (result.errors > 0 && result.accepted === 0 && result.conflicts === 0) {
    exit(1);
  }
}
