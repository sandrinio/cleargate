/**
 * sync.ts — STORY-010-04
 *
 * `cleargate sync` — canonical 6-step driver:
 *   1. Identity + sprint resolve
 *   2. List remote updates + pull each item
 *   (3. STORY-010-05 insertion point: runIntakeBranch)
 *   4. Classify conflicts per local work items
 *   5. Resolve (merge prompt / silent merge / remote-wins / refuse)
 *   6. Apply + log
 *
 * R2 invariant: ALL pulls complete before ANY push begins.
 *
 * --dry-run: steps 1–4 only; zero fs writes; zero sync-log entries.
 *
 * No top-level await (FLASHCARD #tsup #cjs #esm).
 */

import * as fs from 'node:fs';
import * as fsPromises from 'node:fs/promises';
import * as path from 'node:path';
import { resolveIdentity } from '../lib/identity.js';
import { resolveActiveSprintDir, appendSyncLog, type SyncLogEntry } from '../lib/sync-log.js';
import { classify } from '../lib/conflict-detector.js';
import type { SinceLastSync, LocalSnapshot, RemoteSnapshot } from '../lib/conflict-detector.js';
import { promptThreeWayMerge } from '../lib/merge-helper.js';
import { hashNormalized } from '../lib/sha256.js';
import { parseFrontmatter } from '../wiki/parse-frontmatter.js';
import { serializeFrontmatter } from '../lib/frontmatter-yaml.js';
import { createMcpClient } from '../lib/mcp-client.js';
import type { McpClient, RemoteItem, RemoteUpdateRef } from '../lib/mcp-client.js';
import { runIntakeBranch } from '../lib/intake.js';
import type { IntakeResult } from '../lib/intake.js';
import { resolveActiveItems } from '../lib/active-criteria.js';
import type { LocalWorkItemRef } from '../lib/active-criteria.js';
import { writeCommentCache } from '../lib/comments-cache.js';
import { renderCommentsSection } from '../lib/wiki-comments-render.js';
import type { RemoteComment } from '../lib/mcp-client.js';

// ── Public Options ─────────────────────────────────────────────────────────────

export interface SyncOptions {
  dryRun?: boolean;
  projectRoot?: string;
  env?: NodeJS.ProcessEnv;
  /** Test seam: inject McpClient directly (bypasses resolveMcpClient) */
  mcp?: McpClient;
  /** Test seam: override process.stdin for merge prompt */
  stdin?: NodeJS.ReadableStream;
  /** Test seam: stdout writer */
  stdout?: (s: string) => void;
  /** Test seam: stderr writer */
  stderr?: (s: string) => void;
  /** Test seam: override process.exit */
  exit?: (code: number) => never;
  /** Test seam: override now() for timestamps */
  now?: () => string;
}

// ── ConflictJson shape ────────────────────────────────────────────────────────

export interface ConflictEntry {
  item_id: string;
  remote_id: string;
  state: string;
  resolution: string;
  reason: string;
  local_path: string;
}

export interface ConflictsJson {
  generated_at: string;
  sprint_id: string;
  unresolved: ConflictEntry[];
}

// ── Main handler ──────────────────────────────────────────────────────────────

export async function syncHandler(opts: SyncOptions = {}): Promise<void> {
  const projectRoot = opts.projectRoot ?? process.cwd();
  const env = opts.env ?? process.env;
  const dryRun = opts.dryRun ?? false;
  const stdout = opts.stdout ?? ((s: string) => process.stdout.write(s));
  const stderr = opts.stderr ?? ((s: string) => process.stderr.write(s));
  const exit = opts.exit ?? ((c: number): never => process.exit(c));
  const nowFn = opts.now ?? (() => new Date().toISOString());

  // ── Step 1: Identity + sprint resolve ───────────────────────────────────────
  const identity = resolveIdentity(projectRoot);
  const sprintRoot = resolveActiveSprintDir(projectRoot);
  const sprintId = path.basename(sprintRoot);

  // ── MCP client setup ────────────────────────────────────────────────────────
  let mcp: McpClient;
  if (opts.mcp) {
    mcp = opts.mcp;
  } else {
    const token = env['CLEARGATE_MCP_TOKEN'];
    if (!token || !token.trim()) {
      stderr(
        'Error: CLEARGATE_MCP_TOKEN is not set. ' +
        'Export your MCP JWT before running sync: export CLEARGATE_MCP_TOKEN=<token>\n',
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

  // ── Pre-flight: adapter-info probe ──────────────────────────────────────────
  let adapterInfo: { configured: boolean; name: string };
  try {
    adapterInfo = await mcp.adapterInfo();
  } catch {
    // Tool may not exist on older MCP versions — warn and proceed
    adapterInfo = { configured: true, name: 'unknown' };
  }

  if (!adapterInfo.configured || adapterInfo.name === 'no-adapter-configured') {
    stderr(
      'Error: ClearGate MCP has no PM adapter configured (LINEAR_API_KEY missing server-side). ' +
      'Sync cannot proceed.\n',
    );
    exit(2);
    return;
  }

  // ── Step 2: List remote updates + pull ──────────────────────────────────────
  // Read last_remote_sync from wiki meta or use epoch
  const wikiMetaPath = path.join(projectRoot, '.cleargate', 'wiki', 'meta.json');
  let lastRemoteSync = '1970-01-01T00:00:00.000Z';
  try {
    const metaRaw = await fsPromises.readFile(wikiMetaPath, 'utf8');
    const meta = JSON.parse(metaRaw) as Record<string, unknown>;
    if (typeof meta['last_remote_sync'] === 'string') {
      lastRemoteSync = meta['last_remote_sync'];
    }
  } catch {
    // No meta file — start from epoch
  }

  const remoteRefs = await mcp.call<RemoteUpdateRef[]>(
    'cleargate_list_remote_updates',
    { since: lastRemoteSync },
  );

  // Pull each item — all awaited BEFORE any push (R2 invariant)
  const pulled: RemoteItem[] = [];
  for (const ref of remoteRefs) {
    const item = await mcp.call<RemoteItem | null>(
      'cleargate_pull_item',
      { remote_id: ref.remote_id },
    );
    if (item !== null) {
      pulled.push(item);
    }
  }

  // ── Step 3: Stakeholder proposal intake (STORY-010-05) ──────────────────────
  const labelFilter = (opts.env ?? process.env)['CLEARGATE_PROPOSAL_LABEL'] ?? 'cleargate:proposal';
  let intakeResult: IntakeResult = { created: 0, items: [] };
  try {
    intakeResult = await runIntakeBranch({
      mcp,
      identity,
      sprintRoot,
      projectRoot,
      dryRun,
      labelFilter,
      now: nowFn,
    });
  } catch (err) {
    // Non-fatal: intake errors do not abort the main sync loop
    stderr(`warn: intake branch failed: ${String(err)}\n`);
  }

  // Emit R10 warning if present
  if (intakeResult.warning) {
    stderr(`${intakeResult.warning}\n`);
  }

  // ── Step 3b: Pull comments for active items (STORY-010-06) ─────────────────
  // Load all local items first (needed for active-criteria + wiki render).
  const localItems = await scanLocalItems(projectRoot);

  if (!dryRun) {
    const localRefs: LocalWorkItemRef[] = localItems.map(({ fm }) => ({
      primaryId: getItemId(fm),
      remoteId: typeof fm['remote_id'] === 'string' && fm['remote_id'] ? fm['remote_id'] : undefined,
      lastRemoteUpdate: typeof fm['last_remote_update'] === 'string' ? fm['last_remote_update'] : undefined,
    }));

    const activeSet = await resolveActiveItems(projectRoot, localRefs, nowFn);

    for (const remoteId of activeSet) {
      try {
        const comments = await mcp.call<RemoteComment[]>(
          'cleargate_pull_comments',
          { remote_id: remoteId },
        );
        await writeCommentCache(projectRoot, remoteId, comments);
        await renderCommentsSection({ projectRoot, remoteId, comments, localItems });
      } catch (err: unknown) {
        // R4 mitigation: per-item try/catch — do NOT break the outer loop
        const errMsg = err instanceof Error ? err.message : String(err);
        if (/MCP HTTP 429/.test(errMsg)) {
          // Find primary ID for logging
          const localRef = localRefs.find((r) => r.remoteId === remoteId);
          const target = localRef?.primaryId ?? remoteId;
          await appendSyncLog(sprintRoot, {
            ts: nowFn(),
            actor: identity.email,
            op: 'pull-comments',
            target,
            remote_id: remoteId,
            result: 'skipped-rate-limit',
            detail: '429',
          });
        } else {
          // Other errors: log as error-transport, continue
          const localRef = localRefs.find((r) => r.remoteId === remoteId);
          const target = localRef?.primaryId ?? remoteId;
          await appendSyncLog(sprintRoot, {
            ts: nowFn(),
            actor: identity.email,
            op: 'pull-comments',
            target,
            remote_id: remoteId,
            result: 'error-transport',
            detail: errMsg.slice(0, 200),
          });
        }
      }
    }
  }

  // ── Step 4: Classify local work items ───────────────────────────────────────
  // localItems already loaded above for comment-pull; reuse here.
  const conflictsJson: ConflictEntry[] = [];

  // Maps for tracking what to apply
  type QueuedPull = { item: RemoteItem; localPath: string; fm: Record<string, unknown>; body: string };
  type QueuedPush = { localPath: string; fm: Record<string, unknown>; body: string; itemId: string };

  const pullQueue: QueuedPull[] = [];
  const pushQueue: QueuedPush[] = [];

  const pulledByRemoteId = new Map<string, RemoteItem>();
  for (const item of pulled) {
    pulledByRemoteId.set(item.remote_id, item);
  }

  let dryRunPulls = 0;
  let dryRunPushes = 0;
  let dryRunConflicts = 0;

  for (const { localPath, fm, body } of localItems) {
    const remoteIdVal = fm['remote_id'];
    if (typeof remoteIdVal !== 'string' || !remoteIdVal) continue;

    const remoteItem = pulledByRemoteId.get(remoteIdVal);
    if (!remoteItem) continue;

    const lastBodySha = typeof fm['last_synced_body_sha'] === 'string' ? fm['last_synced_body_sha'] : null;
    const localBodySha = hashNormalized(body);
    const remoteBodySha = hashNormalized(remoteItem.body ?? '');

    const localSnap: LocalSnapshot = {
      updated_at: typeof fm['updated_at'] === 'string' ? fm['updated_at'] : '1970-01-01T00:00:00Z',
      body_sha: localBodySha,
      status: typeof fm['status'] === 'string' ? fm['status'] : '',
      deleted: false,
    };

    const remoteSnap: RemoteSnapshot = {
      updated_at: remoteItem.updated_at,
      body_sha: remoteBodySha,
      status: remoteItem.status,
      deleted: false,
    };

    const since: SinceLastSync = {
      last_pushed_at: typeof fm['pushed_at'] === 'string' ? fm['pushed_at'] : null,
      last_pulled_at: typeof fm['last_pulled_at'] === 'string' ? fm['last_pulled_at'] : null,
      last_remote_update: typeof fm['last_remote_update'] === 'string' ? fm['last_remote_update'] : null,
      last_body_sha: lastBodySha,
      last_synced_status: typeof fm['last_synced_status'] === 'string' ? fm['last_synced_status'] : null,
    };

    const classification = classify(localSnap, remoteSnap, since);

    if (dryRun) {
      if (classification.resolution === 'pull') dryRunPulls++;
      else if (classification.resolution === 'push') dryRunPushes++;
      else if (classification.resolution === 'refuse' || classification.resolution === 'halt') dryRunConflicts++;
      continue;
    }

    // ── Step 5: Resolve ──────────────────────────────────────────────────────
    switch (classification.resolution) {
      case 'pull':
      case 'merge-silent':
      case 'remote-wins':
        pullQueue.push({ item: remoteItem, localPath, fm, body });
        break;

      case 'push':
        if (fm['approved'] === true) {
          pushQueue.push({ localPath, fm, body, itemId: getItemId(fm) });
        }
        break;

      case 'merge': {
        // Three-way merge prompt
        const mergeResult = await promptThreeWayMerge({
          local: body,
          remote: remoteItem.body ?? '',
          base: '',
          itemId: getItemId(fm),
          stdin: opts.stdin ?? process.stdin,
          stdout,
        });
        if (mergeResult.resolution === 'aborted') {
          conflictsJson.push({
            item_id: getItemId(fm),
            remote_id: remoteIdVal,
            state: classification.state,
            resolution: classification.resolution,
            reason: classification.reason,
            local_path: localPath,
          });
        } else {
          // Apply merge result
          pullQueue.push({
            item: { ...remoteItem, body: mergeResult.body },
            localPath,
            fm,
            body,
          });
        }
        break;
      }

      case 'refuse':
      case 'halt':
        conflictsJson.push({
          item_id: getItemId(fm),
          remote_id: remoteIdVal,
          state: classification.state,
          resolution: classification.resolution,
          reason: classification.reason,
          local_path: localPath,
        });
        // Do NOT abort — continue processing remaining items (AC §2.1)
        break;

      default:
        break;
    }
  }

  // ── dry-run summary and early exit ──────────────────────────────────────────
  if (dryRun) {
    stdout(
      `Would pull: ${dryRunPulls}, push: ${dryRunPushes}, ` +
      `intake: ${intakeResult.created}, conflicts: ${dryRunConflicts}\n`,
    );
    return;
  }

  // ── Step 6: Apply + log ──────────────────────────────────────────────────────
  // R2: ALL pulls applied before pushes
  for (const { item, localPath, fm } of pullQueue) {
    await applyPull(item, localPath, fm, identity.email, nowFn);

    const entry: SyncLogEntry = {
      ts: nowFn(),
      actor: identity.email,
      op: 'pull',
      target: getItemId(fm),
      remote_id: item.remote_id,
      result: 'ok',
    };
    await appendSyncLog(sprintRoot, entry);
  }

  for (const { localPath, fm, body, itemId } of pushQueue) {
    // Push item to MCP
    await mcp.call('push_item', {
      cleargate_id: itemId,
      type: typeof fm['story_id'] === 'string' ? 'story'
        : typeof fm['epic_id'] === 'string' ? 'epic'
        : typeof fm['proposal_id'] === 'string' ? 'proposal'
        : 'story',
      payload: fm,
    });

    // Stamp last_synced_status + last_synced_body_sha so classify() sees a clean
    // baseline on the next sync run (mirrors the pull-apply path at applyPull:393-394).
    const pushedFm: Record<string, unknown> = {
      ...fm,
      last_synced_status: fm['status'],
      last_synced_body_sha: hashNormalized(body),
    };
    const newContent = serializeFrontmatter(pushedFm) + '\n\n' + body;
    await writeAtomic(localPath, newContent);

    const entry: SyncLogEntry = {
      ts: nowFn(),
      actor: identity.email,
      op: 'push',
      target: itemId,
      result: 'ok',
    };
    await appendSyncLog(sprintRoot, entry);
  }

  // Log conflicts
  for (const c of conflictsJson) {
    const entry: SyncLogEntry = {
      ts: nowFn(),
      actor: identity.email,
      op: 'conflict-refused',
      target: c.item_id,
      remote_id: c.remote_id,
      result: 'halted',
      detail: c.reason,
    };
    await appendSyncLog(sprintRoot, entry);
  }

  // Atomic-write .conflicts.json
  const conflictsFile = path.join(projectRoot, '.cleargate', '.conflicts.json');
  const conflictsContent: ConflictsJson = {
    generated_at: nowFn(),
    sprint_id: sprintId,
    unresolved: conflictsJson,
  };
  await writeAtomic(conflictsFile, JSON.stringify(conflictsContent, null, 2) + '\n');

  // Update wiki meta last_remote_sync
  try {
    await fsPromises.mkdir(path.dirname(wikiMetaPath), { recursive: true });
    let meta: Record<string, unknown> = {};
    try {
      const raw = await fsPromises.readFile(wikiMetaPath, 'utf8');
      meta = JSON.parse(raw) as Record<string, unknown>;
    } catch {
      // New meta
    }
    meta['last_remote_sync'] = nowFn();
    await writeAtomic(wikiMetaPath, JSON.stringify(meta, null, 2) + '\n');
  } catch {
    // Non-fatal
  }

  const totalPulls = pullQueue.length;
  const totalPushes = pushQueue.length;
  const totalConflicts = conflictsJson.length;
  stdout(`sync: pulled ${totalPulls}, pushed ${totalPushes}, conflicts ${totalConflicts}\n`);

  // Print intake summary (orchestrator stdout format)
  if (intakeResult.created > 0) {
    const plural = intakeResult.created === 1 ? 'proposal' : 'proposals';
    const inlineList = intakeResult.items
      .map((item) => `${item.proposalId} (${item.remoteId} '${item.title}')`)
      .join(', ');
    stdout(`📥 ${intakeResult.created} new stakeholder ${plural} pulled: ${inlineList}\n`);
    stdout(`  — review at .cleargate/delivery/pending-sync/\n`);
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Apply a remote item to the local file: update frontmatter + body. */
async function applyPull(
  item: RemoteItem,
  localPath: string,
  fm: Record<string, unknown>,
  actorEmail: string,
  nowFn: () => string,
): Promise<void> {
  const now = nowFn();
  const updatedFm: Record<string, unknown> = {
    ...fm,
    status: item.status,
    last_pulled_by: actorEmail,
    last_pulled_at: now,
    last_remote_update: item.updated_at,
    last_synced_status: item.status,
    last_synced_body_sha: hashNormalized(item.body ?? ''),
  };

  const newBody = item.body ?? '';
  const newContent = serializeFrontmatter(updatedFm) + '\n\n' + newBody;
  await writeAtomic(localPath, newContent);
}

/** Atomic write: write to .tmp file then rename. */
async function writeAtomic(filePath: string, content: string): Promise<void> {
  await fsPromises.mkdir(path.dirname(filePath), { recursive: true });
  const tmpPath = `${filePath}.tmp.${Date.now()}`;
  await fsPromises.writeFile(tmpPath, content, 'utf8');
  await fsPromises.rename(tmpPath, filePath);
}

interface LocalWorkItem {
  localPath: string;
  fm: Record<string, unknown>;
  body: string;
}

/** Scan .cleargate/delivery/pending-sync/ for tracked work items with remote_id. */
async function scanLocalItems(projectRoot: string): Promise<LocalWorkItem[]> {
  const pendingSync = path.join(projectRoot, '.cleargate', 'delivery', 'pending-sync');
  const results: LocalWorkItem[] = [];

  let entries: fs.Dirent[];
  try {
    entries = await fsPromises.readdir(pendingSync, { withFileTypes: true });
  } catch {
    return results;
  }

  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith('.md')) continue;
    const fullPath = path.join(pendingSync, entry.name);
    try {
      const raw = await fsPromises.readFile(fullPath, 'utf8');
      const { fm, body } = parseFrontmatter(raw);
      if (typeof fm['remote_id'] === 'string' && fm['remote_id']) {
        results.push({ localPath: fullPath, fm, body });
      }
    } catch {
      // Skip malformed files
    }
  }

  return results;
}

/** Extract primary item ID from frontmatter. */
function getItemId(fm: Record<string, unknown>): string {
  for (const key of ['story_id', 'epic_id', 'proposal_id', 'cr_id', 'bug_id']) {
    const val = fm[key];
    if (typeof val === 'string' && val) return val;
  }
  return 'unknown';
}
