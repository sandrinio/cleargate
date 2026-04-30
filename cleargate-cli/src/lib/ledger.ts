/**
 * ledger.ts — CR-018
 *
 * Sprint-wide cost math: parses token-ledger.jsonl rows and sums delta tokens
 * for the Reporter agent. Distinct from ledger-reader.ts (per-work-item
 * attribution lookup); this file provides sumDeltas() for sprint-total cost.
 *
 * Format detection handles three cases:
 *   'delta'     — all rows carry delta.* blocks (post-0.9.0)
 *   'pre-0.9.0' — all rows use flat input/output/cache_* fields (pre-0.9.0)
 *   'mixed'     — some rows have delta, others don't (SPRINT-15 cutover window)
 */

// ─── Public types ─────────────────────────────────────────────────────────────

/** Token counts block (used in both delta and session_total). */
export interface TokenCounts {
  input: number;
  output: number;
  cache_creation: number;
  cache_read: number;
}

/** Full post-0.9.0 ledger row shape. */
export interface LedgerRowV2 {
  ts: string;
  sprint_id: string;
  story_id: string;
  work_item_id: string;
  agent_type: string;
  session_id: string;
  transcript?: string;
  sentinel_started_at?: string;
  delta_from_turn?: number;
  delta: TokenCounts;
  session_total: TokenCounts;
  model: string;
  turns: number;
}

/** Result returned by sumDeltas(). */
export interface SumResult {
  /** Aggregated token totals across all rows (using appropriate format). */
  totals: TokenCounts;
  /** How the totals were computed. */
  format: 'delta' | 'pre-0.9.0' | 'mixed';
  /**
   * Present when format is 'pre-0.9.0' or 'mixed'.
   * Reporter should paste this verbatim into REPORT.md §3.
   */
  pre_v2_caveat?: string;
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

function isTokenCounts(v: unknown): v is TokenCounts {
  if (typeof v !== 'object' || v === null) return false;
  const obj = v as Record<string, unknown>;
  return (
    typeof obj['input'] === 'number' &&
    typeof obj['output'] === 'number' &&
    typeof obj['cache_creation'] === 'number' &&
    typeof obj['cache_read'] === 'number'
  );
}

function hasDelta(row: Record<string, unknown>): boolean {
  return isTokenCounts(row['delta']);
}

function zeroCounts(): TokenCounts {
  return { input: 0, output: 0, cache_creation: 0, cache_read: 0 };
}

function addCounts(a: TokenCounts, b: TokenCounts): TokenCounts {
  return {
    input: a.input + b.input,
    output: a.output + b.output,
    cache_creation: a.cache_creation + b.cache_creation,
    cache_read: a.cache_read + b.cache_read,
  };
}

/**
 * Last-row-per-session trick for pre-0.9.0 flat-field rows.
 * Groups rows by session_id, takes the row with max ts per group,
 * and sums the flat input/output/cache_* fields across those last rows.
 */
function lastRowTrickForFlatRows(rows: Record<string, unknown>[]): TokenCounts {
  const sessionMap = new Map<string, Record<string, unknown>>();

  for (const row of rows) {
    const sessionId = typeof row['session_id'] === 'string' ? row['session_id'] : '(unknown)';
    const existing = sessionMap.get(sessionId);
    if (!existing) {
      sessionMap.set(sessionId, row);
    } else {
      const existingTs = typeof existing['ts'] === 'string' ? existing['ts'] : '';
      const rowTs = typeof row['ts'] === 'string' ? row['ts'] : '';
      if (rowTs > existingTs) {
        sessionMap.set(sessionId, row);
      }
    }
  }

  let totals = zeroCounts();
  for (const row of sessionMap.values()) {
    totals = addCounts(totals, {
      input: typeof row['input'] === 'number' ? row['input'] : 0,
      output: typeof row['output'] === 'number' ? row['output'] : 0,
      cache_creation: typeof row['cache_creation'] === 'number' ? row['cache_creation'] : 0,
      cache_read: typeof row['cache_read'] === 'number' ? row['cache_read'] : 0,
    });
  }
  return totals;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Compute sprint-wide token totals from an array of raw ledger rows (parsed JSONL).
 *
 * Format-detection algorithm (mandatory):
 *   1. Classify each row: has `delta` object with 4 numeric fields → v2; else → flat/legacy.
 *   2. All v2       → format='delta',    sum delta.* directly.
 *   3. All flat     → format='pre-0.9.0', group by session_id, last-row-per-session trick.
 *   4. Mixed        → format='mixed',    delta rows contribute delta.*; flat rows within
 *                     each session use last-row trick scoped to flat rows only.
 *
 * Malformed or unrecognisable rows are skipped with a console.warn.
 *
 * @param rows  Array of parsed JSON objects (unknown type for defensive parsing).
 */
export function sumDeltas(rows: unknown[]): SumResult {
  // Filter to recognisable objects; skip malformed rows.
  const validRows: Record<string, unknown>[] = [];
  for (const raw of rows) {
    if (typeof raw === 'object' && raw !== null && !Array.isArray(raw)) {
      validRows.push(raw as Record<string, unknown>);
    } else {
      console.warn('[ledger.ts] sumDeltas: skipping malformed row (not an object):', raw);
    }
  }

  if (validRows.length === 0) {
    return { totals: zeroCounts(), format: 'delta' };
  }

  const deltaRows = validRows.filter(hasDelta);
  const flatRows = validRows.filter((r) => !hasDelta(r));

  // All rows are v2 (delta) format
  if (flatRows.length === 0) {
    let totals = zeroCounts();
    for (const row of deltaRows) {
      const d = row['delta'] as TokenCounts;
      totals = addCounts(totals, d);
    }
    return { totals, format: 'delta' };
  }

  // All rows are pre-0.9.0 flat format
  if (deltaRows.length === 0) {
    const totals = lastRowTrickForFlatRows(flatRows);
    return {
      totals,
      format: 'pre-0.9.0',
      pre_v2_caveat:
        '**Ledger format note:** This sprint\'s token-ledger.jsonl uses pre-0.9.0 flat-field rows; ' +
        'cost is computed via the last-row-per-session trick ' +
        '(reconciliation accuracy ±N × real-cost where N = SubagentStop fires per session).',
    };
  }

  // Mixed format: both delta rows and flat rows in same ledger (e.g. SPRINT-15 cutover)
  // Delta rows → sum delta.*
  // Flat rows  → group by session_id, last-row trick (scoped to flat rows only)
  let totals = zeroCounts();

  // Sum delta rows directly
  for (const row of deltaRows) {
    const d = row['delta'] as TokenCounts;
    totals = addCounts(totals, d);
  }

  // Apply last-row trick to flat rows
  const flatTotals = lastRowTrickForFlatRows(flatRows);
  totals = addCounts(totals, flatTotals);

  const caveat =
    `Mixed format ledger: ${deltaRows.length} delta rows + ${flatRows.length} pre-0.9.0 rows; ` +
    `flat segment uses last-row trick.`;

  return {
    totals,
    format: 'mixed',
    pre_v2_caveat: caveat,
  };
}
