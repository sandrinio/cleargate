/**
 * pull.ts — STORY-010-04
 *
 * `cleargate pull <ID-or-remote_id>` — targeted single-item pull.
 *
 * --comments flag: reserved for STORY-010-06; emits a warn-level message and
 * proceeds without comment pull. Does NOT error. Does NOT accept silently.
 *
 * No top-level await (FLASHCARD #tsup #cjs #esm).
 */

import * as fs from 'node:fs';
import * as fsPromises from 'node:fs/promises';
import * as path from 'node:path';
import { resolveIdentity } from '../lib/identity.js';
import { resolveActiveSprintDir, appendSyncLog, type SyncLogEntry } from '../lib/sync-log.js';
import { hashNormalized } from '../lib/sha256.js';
import { parseFrontmatter } from '../wiki/parse-frontmatter.js';
import { serializeFrontmatter } from '../lib/frontmatter-yaml.js';
import { createMcpClient } from '../lib/mcp-client.js';
import type { McpClient, RemoteItem } from '../lib/mcp-client.js';

export interface PullOptions {
  comments?: boolean;
  projectRoot?: string;
  env?: NodeJS.ProcessEnv;
  /** Test seam: inject McpClient directly */
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

export async function pullHandler(idOrRemoteId: string, opts: PullOptions = {}): Promise<void> {
  const projectRoot = opts.projectRoot ?? process.cwd();
  const env = opts.env ?? process.env;
  const stdout = opts.stdout ?? ((s: string) => process.stdout.write(s));
  const stderr = opts.stderr ?? ((s: string) => process.stderr.write(s));
  const exit = opts.exit ?? ((c: number): never => process.exit(c));
  const nowFn = opts.now ?? (() => new Date().toISOString());

  if (opts.comments) {
    stderr(
      '--comments: implemented in STORY-010-06; this run pulls item only\n',
    );
    // Proceed without comment pull
  }

  // Identity
  const identity = resolveIdentity(projectRoot);
  const sprintRoot = resolveActiveSprintDir(projectRoot);

  // MCP client
  let mcp: McpClient;
  if (opts.mcp) {
    mcp = opts.mcp;
  } else {
    const token = env['CLEARGATE_MCP_TOKEN'];
    if (!token || !token.trim()) {
      stderr(
        'Error: CLEARGATE_MCP_TOKEN is not set. ' +
        'Export your MCP JWT before running pull: export CLEARGATE_MCP_TOKEN=<token>\n',
      );
      exit(2);
      return;
    }
    const baseUrl = env['CLEARGATE_MCP_URL'];
    if (!baseUrl || !baseUrl.trim()) {
      stderr(
        'Error: MCP URL not configured. Set CLEARGATE_MCP_URL env var or run `cleargate join <invite-url>`.\n',
      );
      exit(2);
      return;
    }
    mcp = createMcpClient({ baseUrl: baseUrl.trim(), token: token.trim() });
  }

  // Resolve the remote_id to pull
  // If idOrRemoteId looks like a remote ID (e.g. LIN-1042) use directly;
  // otherwise try to find local file with matching story_id / epic_id / etc.
  const remoteId = await resolveRemoteId(idOrRemoteId, projectRoot);
  if (!remoteId) {
    stderr(`Error: cannot resolve "${idOrRemoteId}" to a remote_id. Check that the item has been pushed first.\n`);
    exit(1);
    return;
  }

  // Pull from MCP
  const remoteItem = await mcp.call<RemoteItem | null>('cleargate_pull_item', { remote_id: remoteId });
  if (!remoteItem) {
    stderr(`Error: item ${remoteId} not found on MCP server.\n`);
    exit(1);
    return;
  }

  // Find the local file
  const localPath = await findLocalFile(remoteId, projectRoot);

  if (!localPath) {
    stderr(`Error: no local file found with remote_id "${remoteId}".\n`);
    exit(1);
    return;
  }

  // Read current state and check idempotency
  const rawContent = await fsPromises.readFile(localPath, 'utf8');
  const { fm, body } = parseFrontmatter(rawContent);

  const currentBodySha = hashNormalized(body);
  const remoteBodySha = hashNormalized(remoteItem.body ?? '');
  const currentStatus = typeof fm['status'] === 'string' ? fm['status'] : '';
  const lastPulledAt = typeof fm['last_pulled_at'] === 'string' ? fm['last_pulled_at'] : null;

  // Idempotency check: if nothing changed since last pull, skip
  const isNoOp =
    currentBodySha === remoteBodySha &&
    currentStatus === remoteItem.status &&
    typeof fm['last_synced_body_sha'] === 'string' &&
    fm['last_synced_body_sha'] === remoteBodySha &&
    lastPulledAt !== null;

  const now = nowFn();

  if (isNoOp) {
    const entry: SyncLogEntry = {
      ts: now,
      actor: identity.email,
      op: 'pull',
      target: getItemId(fm),
      remote_id: remoteId,
      result: 'no-op',
    };
    await appendSyncLog(sprintRoot, entry);
    stdout(`pull: ${remoteId} no-op (no changes)\n`);
    return;
  }

  // Apply the pull
  const updatedFm: Record<string, unknown> = {
    ...fm,
    status: remoteItem.status,
    last_pulled_by: identity.email,
    last_pulled_at: now,
    last_remote_update: remoteItem.updated_at,
    last_synced_status: remoteItem.status,
    last_synced_body_sha: remoteBodySha,
  };

  const newBody = remoteItem.body ?? '';
  const newContent = serializeFrontmatter(updatedFm) + '\n\n' + newBody;
  await writeAtomic(localPath, newContent);

  const entry: SyncLogEntry = {
    ts: now,
    actor: identity.email,
    op: 'pull',
    target: getItemId(fm),
    remote_id: remoteId,
    result: 'ok',
  };
  await appendSyncLog(sprintRoot, entry);

  stdout(`pull: ${remoteId} applied to ${path.relative(projectRoot, localPath)}\n`);
}

// ── Helpers ───────────────────────────────────────────────────────────────────

async function resolveRemoteId(idOrRemoteId: string, projectRoot: string): Promise<string | null> {
  // If it looks like a remote ID pattern (e.g. LIN-NNNN, GH-NNNN, JIRA-123)
  if (/^[A-Z]+-\d+/.test(idOrRemoteId)) {
    return idOrRemoteId;
  }
  // Try to find a local work item with matching ID, read its remote_id
  const pendingSync = path.join(projectRoot, '.cleargate', 'delivery', 'pending-sync');
  let entries: fs.Dirent[];
  try {
    entries = await fsPromises.readdir(pendingSync, { withFileTypes: true });
  } catch {
    return null;
  }
  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith('.md')) continue;
    try {
      const raw = await fsPromises.readFile(path.join(pendingSync, entry.name), 'utf8');
      const { fm } = parseFrontmatter(raw);
      for (const key of ['story_id', 'epic_id', 'proposal_id', 'cr_id', 'bug_id']) {
        if (fm[key] === idOrRemoteId && typeof fm['remote_id'] === 'string') {
          return fm['remote_id'];
        }
      }
    } catch {
      // skip malformed
    }
  }
  return null;
}

async function findLocalFile(remoteId: string, projectRoot: string): Promise<string | null> {
  const pendingSync = path.join(projectRoot, '.cleargate', 'delivery', 'pending-sync');
  let entries: fs.Dirent[];
  try {
    entries = await fsPromises.readdir(pendingSync, { withFileTypes: true });
  } catch {
    return null;
  }
  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith('.md')) continue;
    const fullPath = path.join(pendingSync, entry.name);
    try {
      const raw = await fsPromises.readFile(fullPath, 'utf8');
      const { fm } = parseFrontmatter(raw);
      if (fm['remote_id'] === remoteId) return fullPath;
    } catch {
      // skip malformed
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
