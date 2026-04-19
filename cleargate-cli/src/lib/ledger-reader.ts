/**
 * ledger-reader.ts — STORY-008-04
 *
 * Read-only library for scanning token-ledger.jsonl files across all sprint-run
 * directories and grouping rows by session for per-work-item cost attribution.
 *
 * Node built-ins only. No runtime deps.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

// ─── Public types ─────────────────────────────────────────────────────────────

export interface LedgerRow {
  ts: string;
  sprint_id: string;
  agent_type: string;
  /** Populated only for STORY-* items (backward compat; empty string for non-story items) */
  story_id: string;
  /** Always populated when detection succeeded. Equals story_id for STORY items. */
  work_item_id: string;
  session_id: string;
  transcript: string;
  input: number;
  output: number;
  cache_creation: number;
  cache_read: number;
  model: string;
  turns: number;
}

export interface SessionBucket {
  session_id: string;
  rows: LedgerRow[];
  totals: {
    input: number;
    output: number;
    cache_creation: number;
    cache_read: number;
    turns: number;
  };
}

export interface ReadLedgerOptions {
  /** ISO timestamp string; rows with ts < since are excluded */
  since?: string;
  /**
   * Root directory for sprint-runs/. Defaults to
   * <repo_root>/.cleargate/sprint-runs where repo_root is resolved by
   * walking up from cwd to find .cleargate/.
   * Override in tests to avoid touching the real repo.
   */
  sprintRunsRoot?: string;
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

/**
 * Walk up from cwd until we find a directory containing `.cleargate/sprint-runs/`.
 * Returns the sprint-runs path or null if not found.
 */
function findSprintRunsRoot(startDir: string): string | null {
  let dir = startDir;
  while (true) {
    const candidate = path.join(dir, '.cleargate', 'sprint-runs');
    if (fs.existsSync(candidate)) {
      return candidate;
    }
    const parent = path.dirname(dir);
    if (parent === dir) {
      return null;
    }
    dir = parent;
  }
}

function normalizeRow(raw: Record<string, unknown>): LedgerRow {
  // work_item_id may be absent in pre-STORY-008-04 rows; default from story_id.
  const story_id = typeof raw['story_id'] === 'string' ? raw['story_id'] : '';
  const work_item_id =
    typeof raw['work_item_id'] === 'string' && raw['work_item_id'] !== ''
      ? raw['work_item_id']
      : story_id;

  return {
    ts: typeof raw['ts'] === 'string' ? raw['ts'] : '',
    sprint_id: typeof raw['sprint_id'] === 'string' ? raw['sprint_id'] : '',
    agent_type: typeof raw['agent_type'] === 'string' ? raw['agent_type'] : 'unknown',
    story_id,
    work_item_id,
    session_id: typeof raw['session_id'] === 'string' ? raw['session_id'] : '',
    transcript: typeof raw['transcript'] === 'string' ? raw['transcript'] : '',
    input: typeof raw['input'] === 'number' ? raw['input'] : 0,
    output: typeof raw['output'] === 'number' ? raw['output'] : 0,
    cache_creation: typeof raw['cache_creation'] === 'number' ? raw['cache_creation'] : 0,
    cache_read: typeof raw['cache_read'] === 'number' ? raw['cache_read'] : 0,
    model: typeof raw['model'] === 'string' ? raw['model'] : '',
    turns: typeof raw['turns'] === 'number' ? raw['turns'] : 0,
  };
}

function rowMatchesWorkItem(row: LedgerRow, workItemId: string): boolean {
  return row.work_item_id === workItemId || row.story_id === workItemId;
}

function buildBucket(session_id: string, rows: LedgerRow[]): SessionBucket {
  const totals = rows.reduce(
    (acc, r) => ({
      input: acc.input + r.input,
      output: acc.output + r.output,
      cache_creation: acc.cache_creation + r.cache_creation,
      cache_read: acc.cache_read + r.cache_read,
      turns: acc.turns + r.turns,
    }),
    { input: 0, output: 0, cache_creation: 0, cache_read: 0, turns: 0 }
  );
  return { session_id, rows, totals };
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Scan all sprint-runs/<sprint>/token-ledger.jsonl files and return rows
 * matching the given workItemId, grouped by session_id.
 *
 * Rows are compared by work_item_id first, then story_id (for backward compat
 * with pre-STORY-008-04 rows that lack work_item_id).
 *
 * Pre-fix rows (missing work_item_id) default work_item_id from story_id.
 *
 * @param workItemId  e.g. "STORY-008-04", "EPIC-008", "PROPOSAL-042"
 * @param opts        optional filters and path overrides
 * @returns           array of SessionBucket, one per unique session_id, sorted
 *                    by the ts of the earliest row in each bucket
 */
export function readLedgerForWorkItem(
  workItemId: string,
  opts: ReadLedgerOptions = {}
): SessionBucket[] {
  // Resolve sprint-runs root
  let sprintRunsRoot: string;
  if (opts.sprintRunsRoot) {
    sprintRunsRoot = opts.sprintRunsRoot;
  } else {
    const found = findSprintRunsRoot(process.cwd());
    if (!found) {
      return [];
    }
    sprintRunsRoot = found;
  }

  if (!fs.existsSync(sprintRunsRoot)) {
    return [];
  }

  // Collect all token-ledger.jsonl files across all sprint dirs
  let ledgerFiles: string[];
  try {
    const entries = fs.readdirSync(sprintRunsRoot, { withFileTypes: true });
    ledgerFiles = entries
      .filter((e) => e.isDirectory())
      .map((e) => path.join(sprintRunsRoot, e.name, 'token-ledger.jsonl'))
      .filter((f) => fs.existsSync(f));
  } catch {
    return [];
  }

  // Parse matching rows from each file
  const matchingRows: LedgerRow[] = [];

  for (const ledgerFile of ledgerFiles) {
    let content: string;
    try {
      content = fs.readFileSync(ledgerFile, 'utf-8');
    } catch {
      continue;
    }

    const lines = content.split('\n').filter((l) => l.trim() !== '');
    for (const line of lines) {
      let raw: Record<string, unknown>;
      try {
        raw = JSON.parse(line) as Record<string, unknown>;
      } catch {
        continue;
      }

      const row = normalizeRow(raw);

      // Apply since filter
      if (opts.since && row.ts < opts.since) {
        continue;
      }

      if (rowMatchesWorkItem(row, workItemId)) {
        matchingRows.push(row);
      }
    }
  }

  // Group by session_id
  const sessionMap = new Map<string, LedgerRow[]>();
  for (const row of matchingRows) {
    const key = row.session_id || '(unknown-session)';
    const existing = sessionMap.get(key);
    if (existing) {
      existing.push(row);
    } else {
      sessionMap.set(key, [row]);
    }
  }

  // Build buckets and sort by earliest row ts within each bucket
  const buckets = Array.from(sessionMap.entries()).map(([session_id, rows]) => {
    rows.sort((a, b) => a.ts.localeCompare(b.ts));
    return buildBucket(session_id, rows);
  });

  // Sort buckets by earliest row ts
  buckets.sort((a, b) => {
    const aTs = a.rows[0]?.ts ?? '';
    const bTs = b.rows[0]?.ts ?? '';
    return aTs.localeCompare(bTs);
  });

  return buckets;
}

