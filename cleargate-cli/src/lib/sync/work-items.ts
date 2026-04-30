/**
 * work-items.ts — STORY-023-01
 *
 * Sync driver for `cleargate sync work-items`.
 *
 * Walks .cleargate/delivery/{pending-sync,archive}/ for *.md files,
 * computes sha256(body + serializeFrontmatter(fm)) for each, skips
 * items whose sha matches last_synced_body_sha in frontmatter (idempotent),
 * batches changed items (cap=100 per request), and calls
 * cleargate_sync_work_items on the MCP server.
 *
 * After each accepted item in the response, atomically writes back
 * last_synced_body_sha + server_pushed_at_version to the local file.
 *
 * Wire format: EPIC-023 §2.3 — project_id NOT in the body (JWT-derived).
 *
 * Token safety: JWT tokens (eyJ…) NEVER written to stdout/stderr/sync-log
 * (FLASHCARD 2026-04-18 #cli #plaintext-redact).
 *
 * No top-level await (FLASHCARD #tsup #cjs #esm).
 */

import * as fs from 'node:fs';
import * as fsPromises from 'node:fs/promises';
import * as path from 'node:path';
import { createHash } from 'node:crypto';
import { parseFrontmatter } from '../../wiki/parse-frontmatter.js';
import { serializeFrontmatter } from '../frontmatter-yaml.js';
import type { McpClient } from '../mcp-client.js';

// ── Batch cap (EPIC-023 §2.3: max 100 items per request) ─────────────────────

const BATCH_SIZE = 100;

// ── Wire types (EPIC-023 §2.3 / §2.4) ─────────────────────────────────────────

export interface SyncItemPayload {
  cleargate_id: string;
  type: string;
  status: string;
  frontmatter: Record<string, unknown>;
  body: string;
  file_sha: string;
  last_synced_body_sha: string | null;
}

export interface AcceptedItem {
  cleargate_id: string;
  version: number;
  pushed_at: string;
  body_sha: string;
}

export interface ConflictItem {
  cleargate_id: string;
  local_sha: string;
  remote_sha: string;
  divergence_path: string;
}

export interface ErrorItem {
  cleargate_id: string;
  code: string;
  message: string;
}

export interface SyncWorkItemsResponse {
  accepted: AcceptedItem[];
  conflicts: ConflictItem[];
  errors: ErrorItem[];
}

export interface SyncWorkItemsResult {
  accepted: number;
  conflicts: number;
  errors: number;
  conflictItems: ConflictItem[];
  errorItems: ErrorItem[];
}

// ── Options ────────────────────────────────────────────────────────────────────

export interface SyncWorkItemsOpts {
  projectRoot: string;
  mcp: McpClient;
  /** Test seam: stdout writer */
  stdout?: (s: string) => void;
  /** Test seam: stderr writer */
  stderr?: (s: string) => void;
  /** Test seam: override now() for timestamps */
  now?: () => string;
}

// ── Internal shape for a changed work item ─────────────────────────────────────

interface WorkItemFile {
  localPath: string;
  fm: Record<string, unknown>;
  body: string;
  cleargate_id: string;
  type: string;
  file_sha: string;
  last_synced_body_sha: string | null;
}

// ── SHA computation ─────────────────────────────────────────────────────────────

/**
 * Attribution fields written back by the CLI after a successful sync.
 * These are EXCLUDED from the sha computation so that write-back does not
 * dirty the sha on the next run (idempotency requirement, EPIC-023 §2.1).
 *
 * The server-side sha computation also strips these fields before computing
 * body_sha (STORY-023-02 mcp/src/utils/serialize-frontmatter.ts must do the
 * same for idempotency to hold end-to-end).
 */
const ATTRIBUTION_FIELDS: ReadonlySet<string> = new Set([
  'last_synced_body_sha',
  'server_pushed_at_version',
]);

/**
 * Compute the canonical file sha per EPIC-023 §2.3:
 *   sha256(body + serializeFrontmatter(fm_without_attribution_fields))
 *
 * Attribution fields (last_synced_body_sha, server_pushed_at_version) are
 * excluded so that write-back after a successful sync does not immediately
 * dirty the sha on the next invocation (idempotency).
 *
 * IMPORTANT: Server reimplements byte-identical in
 * mcp/src/utils/serialize-frontmatter.ts — DO NOT change the
 * serializer options, field exclusions, or sha ordering.
 */
function computeFileSha(fm: Record<string, unknown>, body: string): string {
  const fmForSha: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(fm)) {
    if (!ATTRIBUTION_FIELDS.has(key)) {
      fmForSha[key] = value;
    }
  }
  return createHash('sha256')
    .update(body + serializeFrontmatter(fmForSha))
    .digest('hex');
}

// ── Item-type resolver ─────────────────────────────────────────────────────────

function getItemType(fm: Record<string, unknown>): string {
  const typeMap: Record<string, string> = {
    story_id: 'story',
    epic_id: 'epic',
    proposal_id: 'proposal',
    cr_id: 'cr',
    bug_id: 'bug',
    initiative_id: 'initiative',
  };
  for (const [key, type] of Object.entries(typeMap)) {
    if (typeof fm[key] === 'string' && fm[key]) return type;
  }
  // Fall back to cleargate_id prefix pattern
  const cgId = typeof fm['cleargate_id'] === 'string' ? (fm['cleargate_id'] as string) : '';
  if (cgId.startsWith('STORY-')) return 'story';
  if (cgId.startsWith('EPIC-')) return 'epic';
  if (cgId.startsWith('PROPOSAL-')) return 'proposal';
  if (cgId.startsWith('CR-')) return 'cr';
  if (cgId.startsWith('BUG-')) return 'bug';
  if (cgId.startsWith('HOTFIX-')) return 'hotfix';
  return 'story';
}

// ── Item ID resolver ────────────────────────────────────────────────────────────

function getItemId(fm: Record<string, unknown>): string | null {
  // cleargate_id is the canonical identifier per EPIC-023 §2.3
  if (typeof fm['cleargate_id'] === 'string' && fm['cleargate_id']) {
    return fm['cleargate_id'] as string;
  }
  for (const key of ['story_id', 'epic_id', 'proposal_id', 'cr_id', 'bug_id']) {
    if (typeof fm[key] === 'string' && fm[key]) return fm[key] as string;
  }
  return null;
}

// ── Directory walker ────────────────────────────────────────────────────────────

async function walkDeliveryDirs(projectRoot: string): Promise<WorkItemFile[]> {
  const dirs = [
    path.join(projectRoot, '.cleargate', 'delivery', 'pending-sync'),
    path.join(projectRoot, '.cleargate', 'delivery', 'archive'),
  ];

  const results: WorkItemFile[] = [];

  for (const dir of dirs) {
    let entries: fs.Dirent[];
    try {
      entries = await fsPromises.readdir(dir, { withFileTypes: true });
    } catch {
      // Directory doesn't exist — skip
      continue;
    }

    for (const entry of entries) {
      if (!entry.isFile() || !entry.name.endsWith('.md')) continue;

      const fullPath = path.join(dir, entry.name);
      try {
        const raw = await fsPromises.readFile(fullPath, 'utf8');
        const { fm, body } = parseFrontmatter(raw);

        const cleargate_id = getItemId(fm);
        if (!cleargate_id) continue; // skip files without a recognisable ID

        const type = getItemType(fm);
        const file_sha = computeFileSha(fm, body);
        const last_synced_body_sha =
          typeof fm['last_synced_body_sha'] === 'string'
            ? fm['last_synced_body_sha']
            : null;

        results.push({
          localPath: fullPath,
          fm,
          body,
          cleargate_id,
          type,
          file_sha,
          last_synced_body_sha,
        });
      } catch {
        // Defensively skip malformed files — don't abort the whole sync
      }
    }
  }

  return results;
}

// ── Atomic write-back ──────────────────────────────────────────────────────────

async function writeAtomic(filePath: string, content: string): Promise<void> {
  await fsPromises.mkdir(path.dirname(filePath), { recursive: true });
  const tmpPath = `${filePath}.tmp.${Date.now()}`;
  await fsPromises.writeFile(tmpPath, content, 'utf8');
  await fsPromises.rename(tmpPath, filePath);
}

// ── Main driver ─────────────────────────────────────────────────────────────────

/**
 * syncWorkItems — push all changed local work items to the MCP server.
 *
 * Status-blind: every status syncs (EPIC-023 §2.1). No approved: gate.
 * Idempotent: skip if file_sha === last_synced_body_sha.
 * Batch cap: 100 items per request.
 */
export async function syncWorkItems(opts: SyncWorkItemsOpts): Promise<SyncWorkItemsResult> {
  const { projectRoot, mcp } = opts;

  // Walk all delivery dirs
  const allItems = await walkDeliveryDirs(projectRoot);

  // Filter to changed items (status-blind, sha-based delta)
  const changedItems = allItems.filter(
    (item) => item.file_sha !== item.last_synced_body_sha,
  );

  // No changes: exit immediately without any MCP call
  if (changedItems.length === 0) {
    return { accepted: 0, conflicts: 0, errors: 0, conflictItems: [], errorItems: [] };
  }

  // Split into batches of BATCH_SIZE
  const batches: WorkItemFile[][] = [];
  for (let i = 0; i < changedItems.length; i += BATCH_SIZE) {
    batches.push(changedItems.slice(i, i + BATCH_SIZE));
  }

  const result: SyncWorkItemsResult = {
    accepted: 0,
    conflicts: 0,
    errors: 0,
    conflictItems: [],
    errorItems: [],
  };

  for (const batch of batches) {
    // Build wire payload (EPIC-023 §2.3 — no project_id; JWT carries it)
    const items: SyncItemPayload[] = batch.map((item) => ({
      cleargate_id: item.cleargate_id,
      type: item.type,
      status: typeof item.fm['status'] === 'string' ? (item.fm['status'] as string) : '',
      frontmatter: item.fm,
      body: item.body,
      file_sha: item.file_sha,
      // FLASHCARD #cli #commander #optional-key: null not undefined for Zod nullable
      last_synced_body_sha: item.last_synced_body_sha,
    }));

    let response: SyncWorkItemsResponse;
    try {
      response = await mcp.call<SyncWorkItemsResponse>('cleargate_sync_work_items', { items });
    } catch (err) {
      // MCP transport error — propagate upward so the command can exit 1
      throw err;
    }

    result.accepted += response.accepted.length;
    result.conflicts += response.conflicts.length;
    result.errors += response.errors.length;
    result.conflictItems.push(...response.conflicts);
    result.errorItems.push(...response.errors);

    // Attribution write-back for accepted items (atomic, per-item)
    // FLASHCARD 2026-04-19 #cli #frontmatter #parse:
    // parseFrontmatter strips one leading blank — write back as
    // serializeFrontmatter(fm) + '\n\n' + body (mirrors push.ts:256)
    for (const accepted of response.accepted) {
      const workItem = batch.find((i) => i.cleargate_id === accepted.cleargate_id);
      if (!workItem) continue;

      const updatedFm: Record<string, unknown> = {
        ...workItem.fm,
        last_synced_body_sha: accepted.body_sha,
        server_pushed_at_version: accepted.version,
      };
      const newContent = serializeFrontmatter(updatedFm) + '\n\n' + workItem.body;
      try {
        await writeAtomic(workItem.localPath, newContent);
      } catch {
        // Non-fatal: write-back failure doesn't abort the batch
      }
    }
  }

  return result;
}
