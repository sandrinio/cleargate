/**
 * push.ts — STORY-010-07
 *
 * `cleargate push <file>` — push a local work item to the MCP server.
 * `cleargate push --revert <ID-or-remote_id>` — soft-revert a pushed item.
 *
 * Pre-push gate (client-side):
 *   Reads local frontmatter. If approved !== true, exits 1 with a clear message
 *   BEFORE any MCP call. Zero network traffic on refusal.
 *
 * Attribution write-back:
 *   On success, writes pushed_by + pushed_at from MCP response back into the
 *   local frontmatter atomically (.tmp + rename). Appends sync-log entry op='push'.
 *
 * Soft revert (--revert):
 *   Calls cleargate_sync_status with new_status='archived-without-shipping'.
 *   Does NOT delete the remote item. Does NOT clear local remote_id.
 *   Guards against reverting status='done' items unless --force is passed.
 *   Appends sync-log entry op='push-revert'.
 *
 * Token safety:
 *   JWT tokens (eyJ…) are NEVER written to stdout, stderr, or sync-log.
 *   redactDetail in appendSyncLog covers the detail field.
 *
 * No top-level await (FLASHCARD #tsup #cjs #esm).
 */

import * as fs from 'node:fs';
import * as fsPromises from 'node:fs/promises';
import * as path from 'node:path';
import { resolveIdentity } from '../lib/identity.js';
import { resolveActiveSprintDir, appendSyncLog, type SyncLogEntry } from '../lib/sync-log.js';
import { parseFrontmatter } from '../wiki/parse-frontmatter.js';
import { serializeFrontmatter } from '../lib/frontmatter-yaml.js';
import { createMcpClient } from '../lib/mcp-client.js';
import type { McpClient } from '../lib/mcp-client.js';
import { acquireAccessToken, AcquireError } from '../auth/acquire.js';
import { loadConfig } from '../config.js';

// ── Response shapes ─────────────────────────────────────────────────────────────

interface PushItemResult {
  version: number;
  updated_at: string;
  pushed_by: string;
  pushed_at: string;
}

// ── Options ─────────────────────────────────────────────────────────────────────

export interface PushOptions {
  /** --revert <ID-or-remote_id>: soft-revert a pushed item */
  revert?: string;
  /** --force: bypass "done" guard on revert */
  force?: boolean;
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
}

// ── Handler ──────────────────────────────────────────────────────────────────────

export async function pushHandler(fileOrId: string, opts: PushOptions = {}): Promise<void> {
  const projectRoot = opts.projectRoot ?? process.cwd();
  const env = opts.env ?? process.env;
  const stdout = opts.stdout ?? ((s: string) => process.stdout.write(s));
  const stderr = opts.stderr ?? ((s: string) => process.stderr.write(s));
  const exit = opts.exit ?? ((c: number): never => process.exit(c));
  const nowFn = opts.now ?? (() => new Date().toISOString());

  // Identity
  const identity = resolveIdentity(projectRoot);
  const sprintRoot = resolveActiveSprintDir(projectRoot);

  // MCP client — resolved lazily and asynchronously via acquireAccessToken.
  // STORY-011-01: approved gate in handlePush runs BEFORE this, so no network
  // traffic happens on refusal (STORY-010-07 invariant preserved).
  async function resolveMcp(): Promise<McpClient> {
    if (opts.mcp) return opts.mcp;
    // Resolve base URL
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
    // Acquire token
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

  // ── Revert path ───────────────────────────────────────────────────────────────
  if (opts.revert !== undefined) {
    await handleRevert(opts.revert, {
      projectRoot,
      identity,
      sprintRoot,
      nowFn,
      force: opts.force ?? false,
      resolveMcp,
      stdout,
      stderr,
      exit,
    });
    return;
  }

  // ── Push path ─────────────────────────────────────────────────────────────────
  await handlePush(fileOrId, {
    projectRoot,
    identity,
    sprintRoot,
    nowFn,
    resolveMcp,
    stdout,
    stderr,
    exit,
  });
}

// ── Push implementation ───────────────────────────────────────────────────────

interface PushCtx {
  projectRoot: string;
  identity: { email: string };
  sprintRoot: string;
  nowFn: () => string;
  resolveMcp: () => Promise<McpClient>;
  stdout: (s: string) => void;
  stderr: (s: string) => void;
  exit: (code: number) => never;
}

async function handlePush(filePath: string, ctx: PushCtx): Promise<void> {
  const { projectRoot, identity, sprintRoot, nowFn, resolveMcp, stdout, stderr, exit } = ctx;

  // Resolve path (absolute or relative to projectRoot)
  const resolvedPath = path.isAbsolute(filePath)
    ? filePath
    : path.resolve(projectRoot, filePath);

  let rawContent: string;
  try {
    rawContent = await fsPromises.readFile(resolvedPath, 'utf8');
  } catch {
    stderr(`Error: cannot read file "${resolvedPath}".\n`);
    exit(1);
    return;
  }

  let fm: Record<string, unknown>;
  let body: string;
  try {
    ({ fm, body } = parseFrontmatter(rawContent));
  } catch (err) {
    stderr(`Error: cannot parse frontmatter in "${resolvedPath}": ${(err as Error).message}\n`);
    exit(1);
    return;
  }

  // ── Client-side approved gate (BEFORE any MCP call) ─────────────────────────
  // STORY-010-07: if approved !== true, refuse and exit without network call.
  if (fm['approved'] !== true) {
    const itemId = getItemId(fm);
    stderr(
      `Error: push refused — ${itemId} has approved: false. ` +
      `Set approved: true in frontmatter after review.\n`,
    );
    exit(1);
    return;
  }

  const itemId = getItemId(fm);
  const type = getItemType(fm);
  if (!type) {
    stderr(`Error: cannot determine item type from frontmatter in "${resolvedPath}".\n`);
    exit(1);
    return;
  }

  // Derive title from body's first H1 if frontmatter lacks one.
  // ClearGate templates put the human-readable title in `# {ID}: {Name}`,
  // not in a `title:` frontmatter field. Admin UI reads payload.title for
  // item rows; without this, every row renders with an empty heading.
  const payloadForPush: Record<string, unknown> = { ...fm };
  if (typeof payloadForPush['title'] !== 'string' || payloadForPush['title'].length === 0) {
    const h1 = body.match(/^#\s+(.+?)\s*$/m)?.[1]?.trim();
    if (h1) payloadForPush['title'] = h1;
  }

  // MCP call
  const mcp = await resolveMcp();

  let result: PushItemResult;
  try {
    result = await mcp.call<PushItemResult>('push_item', {
      cleargate_id: itemId,
      type,
      payload: payloadForPush,
      ...(typeof fm['remote_id'] === 'string' ? { remote_id: fm['remote_id'] } : {}),
    });
  } catch (err) {
    stderr(`Error: push_item failed: ${(err as Error).message}\n`);
    exit(1);
    return;
  }

  // ── Attribution write-back (atomic) ──────────────────────────────────────────
  const updatedFm: Record<string, unknown> = {
    ...fm,
    pushed_by: result.pushed_by,
    pushed_at: result.pushed_at,
    ...(result.version !== undefined ? { push_version: result.version } : {}),
  };
  const newContent = serializeFrontmatter(updatedFm) + '\n\n' + body;
  await writeAtomic(resolvedPath, newContent);

  // Sync-log
  const now = nowFn();
  const entry: SyncLogEntry = {
    ts: now,
    actor: identity.email,
    op: 'push',
    target: itemId,
    result: 'ok',
    // Note: pushed_by and pushed_at go in frontmatter, NOT in sync-log detail
    // to prevent any accidental token leakage via the detail field.
  };
  await appendSyncLog(sprintRoot, entry);

  stdout(`push: ${itemId} → version ${result.version} (pushed_by: ${result.pushed_by})\n`);
}

// ── Revert implementation ─────────────────────────────────────────────────────

interface RevertCtx {
  projectRoot: string;
  identity: { email: string };
  sprintRoot: string;
  nowFn: () => string;
  force: boolean;
  resolveMcp: () => Promise<McpClient>;
  stdout: (s: string) => void;
  stderr: (s: string) => void;
  exit: (code: number) => never;
}

async function handleRevert(idOrRemoteId: string, ctx: RevertCtx): Promise<void> {
  const { projectRoot, identity, sprintRoot, nowFn, force, resolveMcp, stdout, stderr, exit } = ctx;

  // Resolve to local file
  const resolved = await resolveLocalItem(idOrRemoteId, projectRoot);
  if (!resolved) {
    stderr(`Error: cannot resolve "${idOrRemoteId}" to a local work item.\n`);
    exit(1);
    return;
  }

  const { localPath, fm } = resolved;
  const itemId = getItemId(fm);
  const localStatus = typeof fm['status'] === 'string' ? fm['status'] : '';

  // Guard: refuse to revert "done" items without --force
  if (localStatus === 'done' && !force) {
    stderr(`Error: refusing to revert shipped item. Pass --force to override.\n`);
    exit(1);
    return;
  }

  // Call sync_status with new_status='archived-without-shipping'
  const mcp = await resolveMcp();
  try {
    await mcp.call('sync_status', {
      cleargate_id: itemId,
      new_status: 'archived-without-shipping',
    });
  } catch (err) {
    stderr(`Error: sync_status revert failed: ${(err as Error).message}\n`);
    exit(1);
    return;
  }

  // DO NOT clear local remote_id — item stays traceable
  // DO NOT overwrite local status — sync will pull the server state back

  // Sync-log
  const now = nowFn();
  const remoteId = typeof fm['remote_id'] === 'string' ? fm['remote_id'] : undefined;
  const entry: SyncLogEntry = {
    ts: now,
    actor: identity.email,
    op: 'push-revert',
    target: itemId,
    ...(remoteId !== undefined ? { remote_id: remoteId } : {}),
    result: 'ok',
  };
  await appendSyncLog(sprintRoot, entry);

  stdout(`push --revert: ${itemId} → archived-without-shipping\n`);
  void localPath; // referenced for clarity; not needed after initial read
}

// ── Helpers ───────────────────────────────────────────────────────────────────

async function resolveLocalItem(
  idOrRemoteId: string,
  projectRoot: string,
): Promise<{ localPath: string; fm: Record<string, unknown> } | null> {
  const pendingSync = path.join(projectRoot, '.cleargate', 'delivery', 'pending-sync');
  const archive = path.join(projectRoot, '.cleargate', 'delivery', 'archive');

  for (const dir of [pendingSync, archive]) {
    let entries: fs.Dirent[];
    try {
      entries = await fsPromises.readdir(dir, { withFileTypes: true });
    } catch {
      continue;
    }

    for (const entry of entries) {
      if (!entry.isFile() || !entry.name.endsWith('.md')) continue;
      const fullPath = path.join(dir, entry.name);
      try {
        const raw = await fsPromises.readFile(fullPath, 'utf8');
        const { fm } = parseFrontmatter(raw);

        // Match by remote_id
        if (fm['remote_id'] === idOrRemoteId) {
          return { localPath: fullPath, fm };
        }

        // Match by primary item ID (story_id, epic_id, etc.)
        for (const key of ['story_id', 'epic_id', 'proposal_id', 'cr_id', 'bug_id']) {
          if (fm[key] === idOrRemoteId) {
            return { localPath: fullPath, fm };
          }
        }
      } catch {
        // skip malformed
      }
    }
  }

  return null;
}

async function writeAtomic(filePath: string, content: string): Promise<void> {
  await fsPromises.mkdir(path.dirname(filePath), { recursive: true });
  const tmpPath = `${filePath}.tmp.${Date.now()}`;
  await fsPromises.writeFile(tmpPath, content, 'utf8');
  await fsPromises.rename(tmpPath, filePath);
}

function getItemId(fm: Record<string, unknown>): string {
  for (const key of ['story_id', 'epic_id', 'proposal_id', 'cr_id', 'bug_id']) {
    const val = fm[key];
    if (typeof val === 'string' && val) return val;
  }
  return 'unknown';
}

function getItemType(fm: Record<string, unknown>): string | null {
  const typeMap: Record<string, string> = {
    story_id: 'story',
    epic_id: 'epic',
    proposal_id: 'proposal',
    cr_id: 'cr',
    bug_id: 'bug',
  };
  for (const [key, type] of Object.entries(typeMap)) {
    if (typeof fm[key] === 'string' && fm[key]) return type;
  }
  return null;
}
