/**
 * sync-log.ts — append-only JSONL sync audit log.
 *
 * STORY-010-01: defines types + appendSyncLog + readSyncLog + resolveActiveSprintDir.
 *
 * Atomicity guarantee for appendSyncLog:
 *   Uses fs.promises.appendFile with default flag 'a' (O_APPEND).
 *   POSIX guarantees that concurrent O_APPEND writes ≤ PIPE_BUF (4 KB) are atomic
 *   — a sync-log line is < 500 bytes so lines from concurrent writers never interleave.
 *   We deliberately use appendFile (not read-then-write) to preserve this guarantee.
 *
 * Token redaction:
 *   detail fields containing JWT tokens (eyJ…) are redacted before writing.
 */

import * as fs from 'node:fs';
import * as fsPromises from 'node:fs/promises';
import * as path from 'node:path';

// ── Types ────────────────────────────────────────────────────────────────────

/** R-014 rule ID constant (defined here for STORY-010-08 to wire into lint pipeline). */
export const R014 = 'sync-attribution-missing' as const;

export type SyncLogOp =
  | 'push'
  | 'pull'
  | 'pull-intake'    // STORY-010-05: stakeholder proposal intake
  | 'pull-comments'  // STORY-010-06: comment snapshot pull
  | 'push-revert'
  | 'sync-status'
  | 'conflict-remote-wins'
  | 'conflict-refused';

export type SyncLogResult =
  | 'ok'
  | 'no-op'
  | 'error-not-found'
  | 'error-transport'
  | 'skipped-rate-limit'
  | 'halted';

export interface SyncLogEntry {
  ts: string;
  actor: string;
  op: SyncLogOp;
  target: string;
  remote_id?: string;
  result: SyncLogResult;
  detail?: string;
}

// ── Active-sprint resolution ─────────────────────────────────────────────────

/**
 * Resolve the active sprint directory under .cleargate/sprint-runs/.
 *
 * Strategy: scan sprint-runs/* (excluding _off-sprint), pick the entry with the
 * newest mtime. If none exist, create and return _off-sprint/.
 *
 * Open Decision (flagged to orchestrator): story §1.2 says "read INDEX.md for
 * active sprint", but INDEX.md has no machine-readable status:active field —
 * only execution_order integers inside sprint frontmatter. Newest-mtime dir is
 * the reliable signal available today.
 */
export function resolveActiveSprintDir(
  projectRoot: string,
  _opts?: { now?: () => string },
): string {
  const sprintRunsRoot = path.join(projectRoot, '.cleargate', 'sprint-runs');
  const offSprint = path.join(sprintRunsRoot, '_off-sprint');

  if (!fs.existsSync(sprintRunsRoot)) {
    fs.mkdirSync(sprintRunsRoot, { recursive: true });
    fs.mkdirSync(offSprint, { recursive: true });
    return offSprint;
  }

  const entries = fs.readdirSync(sprintRunsRoot, { withFileTypes: true });
  const sprintDirs = entries
    .filter((e) => e.isDirectory() && e.name !== '_off-sprint')
    .map((e) => {
      const fullPath = path.join(sprintRunsRoot, e.name);
      const stat = fs.statSync(fullPath);
      return { name: e.name, fullPath, mtimeMs: stat.mtimeMs };
    })
    .sort((a, b) => b.mtimeMs - a.mtimeMs);

  if (sprintDirs.length === 0) {
    if (!fs.existsSync(offSprint)) {
      fs.mkdirSync(offSprint, { recursive: true });
    }
    return offSprint;
  }

  return sprintDirs[0].fullPath;
}

// ── JWT redaction ─────────────────────────────────────────────────────────────

function redactDetail(detail: string | undefined): string | undefined {
  if (detail === undefined) return undefined;
  return detail.replace(/eyJ[A-Za-z0-9._-]+/g, '[REDACTED]');
}

// ── Append ────────────────────────────────────────────────────────────────────

/**
 * Append one JSONL entry to <sprintRoot>/sync-log.jsonl.
 * Creates the file and parent directory if absent.
 * Uses O_APPEND for POSIX atomicity — never read-modify-write.
 */
export async function appendSyncLog(
  sprintRoot: string,
  entry: SyncLogEntry,
): Promise<void> {
  const logPath = path.join(sprintRoot, 'sync-log.jsonl');

  // Ensure directory exists
  await fsPromises.mkdir(sprintRoot, { recursive: true });

  const safeEntry: SyncLogEntry = {
    ...entry,
    detail: redactDetail(entry.detail),
  };

  const line = JSON.stringify(safeEntry) + '\n';

  // appendFile with flag 'a' → O_APPEND; POSIX guarantees line-atomicity for <PIPE_BUF writes
  await fsPromises.appendFile(logPath, line, { encoding: 'utf8' });
}

// ── Read ──────────────────────────────────────────────────────────────────────

/**
 * Read and optionally filter sync-log entries, returning newest-first.
 * Skips malformed lines silently — partial writes never crash the reader.
 */
export async function readSyncLog(
  sprintRoot: string,
  filters?: { actor?: string; op?: SyncLogOp; target?: string },
): Promise<SyncLogEntry[]> {
  const logPath = path.join(sprintRoot, 'sync-log.jsonl');

  let raw: string;
  try {
    raw = await fsPromises.readFile(logPath, 'utf8');
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      return [];
    }
    throw err;
  }

  const entries: SyncLogEntry[] = [];
  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    if (trimmed === '') continue;
    try {
      const parsed = JSON.parse(trimmed) as SyncLogEntry;
      entries.push(parsed);
    } catch {
      // malformed line — skip silently
    }
  }

  // Apply filters
  let result = entries;
  if (filters?.actor !== undefined) {
    result = result.filter((e) => e.actor === filters.actor);
  }
  if (filters?.op !== undefined) {
    result = result.filter((e) => e.op === filters.op);
  }
  if (filters?.target !== undefined) {
    result = result.filter((e) => e.target === filters.target);
  }

  // Newest first (entries are appended oldest-first)
  return result.reverse();
}
