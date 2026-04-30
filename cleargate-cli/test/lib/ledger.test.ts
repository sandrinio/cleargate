/**
 * Tests for CR-018: cleargate-cli/src/lib/ledger.ts — sumDeltas()
 *
 * Pure unit tests (no bash, no real fs). Covers:
 *   1. Delta-only input (post-0.9.0 rows) — format: 'delta'
 *   2. Flat-only input (pre-0.9.0 rows) — format: 'pre-0.9.0', last-row trick
 *   3. Mixed-format input — format: 'mixed', caveat string
 *   4. Empty array — zero totals, format: 'delta'
 *   5. Malformed rows — graceful skip, no throw
 */
import { describe, it, expect } from 'vitest';
import { sumDeltas } from '../../src/lib/ledger.js';
import type { SumResult } from '../../src/lib/ledger.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeDeltaRow(overrides: {
  session_id?: string;
  ts?: string;
  delta?: { input: number; output: number; cache_creation: number; cache_read: number };
  session_total?: { input: number; output: number; cache_creation: number; cache_read: number };
}) {
  return {
    ts: overrides.ts ?? '2026-04-30T10:00:00Z',
    sprint_id: 'SPRINT-15',
    story_id: 'STORY-015-01',
    work_item_id: 'STORY-015-01',
    agent_type: 'developer',
    session_id: overrides.session_id ?? 'session-A',
    model: 'claude-sonnet-4-6',
    turns: 5,
    delta: overrides.delta ?? { input: 100, output: 200, cache_creation: 300, cache_read: 400 },
    session_total: overrides.session_total ?? { input: 100, output: 200, cache_creation: 300, cache_read: 400 },
  };
}

function makeFlatRow(overrides: {
  session_id?: string;
  ts?: string;
  input?: number;
  output?: number;
  cache_creation?: number;
  cache_read?: number;
}) {
  return {
    ts: overrides.ts ?? '2026-04-20T10:00:00Z',
    sprint_id: 'SPRINT-14',
    story_id: 'STORY-014-01',
    work_item_id: 'STORY-014-01',
    agent_type: 'developer',
    session_id: overrides.session_id ?? 'session-X',
    model: 'claude-sonnet-4-5',
    turns: 8,
    input: overrides.input ?? 1000,
    output: overrides.output ?? 2000,
    cache_creation: overrides.cache_creation ?? 3000,
    cache_read: overrides.cache_read ?? 4000,
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('sumDeltas: delta-only input (post-0.9.0)', () => {
  it('sums delta.* across all rows when all rows have delta blocks', () => {
    const rows = [
      makeDeltaRow({ session_id: 'A', delta: { input: 100, output: 200, cache_creation: 300, cache_read: 400 } }),
      makeDeltaRow({ session_id: 'A', delta: { input: 150, output: 250, cache_creation: 350, cache_read: 450 } }),
      makeDeltaRow({ session_id: 'B', delta: { input: 50,  output: 100, cache_creation: 150, cache_read: 200 } }),
    ];

    const result: SumResult = sumDeltas(rows);

    expect(result.format).toBe('delta');
    expect(result.totals.input).toBe(300);       // 100+150+50
    expect(result.totals.output).toBe(550);      // 200+250+100
    expect(result.totals.cache_creation).toBe(800); // 300+350+150
    expect(result.totals.cache_read).toBe(1050); // 400+450+200
    expect(result.pre_v2_caveat).toBeUndefined();
  });

  it('single row: totals equal that row delta', () => {
    const rows = [
      makeDeltaRow({ delta: { input: 271, output: 18607, cache_creation: 78726, cache_read: 1701009 } }),
    ];

    const result = sumDeltas(rows);

    expect(result.format).toBe('delta');
    expect(result.totals.input).toBe(271);
    expect(result.totals.output).toBe(18607);
    expect(result.totals.cache_creation).toBe(78726);
    expect(result.totals.cache_read).toBe(1701009);
  });
});

describe('sumDeltas: flat-only input (pre-0.9.0)', () => {
  it('uses last-row-per-session trick: picks max ts row per session_id', () => {
    // Session-X has 2 rows (cumulative snapshots); only the last (higher ts) counts.
    // Session-Y has 1 row.
    const rows = [
      makeFlatRow({ session_id: 'session-X', ts: '2026-04-20T10:00:00Z', input: 1000, output: 2000, cache_creation: 3000, cache_read: 4000 }),
      makeFlatRow({ session_id: 'session-X', ts: '2026-04-20T11:00:00Z', input: 2000, output: 4000, cache_creation: 6000, cache_read: 8000 }), // last row for X
      makeFlatRow({ session_id: 'session-Y', ts: '2026-04-20T12:00:00Z', input: 500,  output: 1000, cache_creation: 1500, cache_read: 2000 }), // only row for Y
    ];

    const result = sumDeltas(rows);

    expect(result.format).toBe('pre-0.9.0');
    // last row for X: input=2000; only row for Y: input=500 → total = 2500
    expect(result.totals.input).toBe(2500);
    expect(result.totals.output).toBe(5000);      // 4000 + 1000
    expect(result.totals.cache_creation).toBe(7500); // 6000 + 1500
    expect(result.totals.cache_read).toBe(10000); // 8000 + 2000
    expect(result.pre_v2_caveat).toBeDefined();
    expect(result.pre_v2_caveat).toMatch(/pre-0\.9\.0 flat-field rows/);
    expect(result.pre_v2_caveat).toMatch(/last-row-per-session trick/);
  });

  it('single session with single row: totals equal that row flat fields', () => {
    const rows = [
      makeFlatRow({ session_id: 'solo', input: 800, output: 1600, cache_creation: 2400, cache_read: 3200 }),
    ];

    const result = sumDeltas(rows);

    expect(result.format).toBe('pre-0.9.0');
    expect(result.totals.input).toBe(800);
    expect(result.totals.output).toBe(1600);
    expect(result.pre_v2_caveat).toBeDefined();
  });

  it('reads from fixture file representing synthesized SPRINT-14 rows', async () => {
    const fs = await import('node:fs');
    const path = await import('node:path');
    const fixtureFile = path.resolve(
      path.dirname(new URL(import.meta.url).pathname),
      'fixtures/ledger-pre-v2-sample.jsonl'
    );
    const rawLines = fs.readFileSync(fixtureFile, 'utf-8').trim().split('\n').filter(Boolean);
    const rows = rawLines.map((l) => JSON.parse(l));

    const result = sumDeltas(rows);

    expect(result.format).toBe('pre-0.9.0');
    // Fixture has 4 unique session_ids; sums last-row per session.
    // aaaa-1111-bbbb-2222: last row input=2400, output=18600, cc=90000, cr=1760000
    // cccc-3333-dddd-4444: last row input=500,  output=4200,  cc=19000, cr=380000
    // eeee-5555-ffff-6666: last row input=1600, output=22800, cc=104000, cr=2040000
    // gggg-7777-hhhh-8888: last row input=3100, output=27000, cc=125000, cr=2450000
    // iiii-9999-jjjj-0000: last row input=600,  output=5500,  cc=25000,  cr=490000
    expect(result.totals.input).toBe(2400 + 500 + 1600 + 3100 + 600);  // = 8200
    expect(result.pre_v2_caveat).toBeDefined();
  });
});

describe('sumDeltas: mixed-format input', () => {
  it('returns format: mixed, caveat includes both counts, totals combine delta + flat last-row trick', () => {
    // 2 delta rows (different sessions) + 2 flat rows in one session (last-row trick applies)
    const rows = [
      makeDeltaRow({ session_id: 'delta-A', delta: { input: 100, output: 200, cache_creation: 300, cache_read: 400 } }),
      makeDeltaRow({ session_id: 'delta-B', delta: { input: 50,  output: 100, cache_creation: 150, cache_read: 200 } }),
      makeFlatRow({ session_id: 'flat-X', ts: '2026-04-20T10:00:00Z', input: 1000, output: 2000, cache_creation: 3000, cache_read: 4000 }),
      makeFlatRow({ session_id: 'flat-X', ts: '2026-04-20T11:00:00Z', input: 1500, output: 2500, cache_creation: 3500, cache_read: 4500 }), // last row
    ];

    const result = sumDeltas(rows);

    expect(result.format).toBe('mixed');
    // delta-A: input=100, output=200, cc=300, cr=400
    // delta-B: input=50,  output=100, cc=150, cr=200
    // flat-X last-row: input=1500, output=2500, cc=3500, cr=4500
    expect(result.totals.input).toBe(1650);          // 100 + 50 + 1500
    expect(result.totals.output).toBe(2800);         // 200 + 100 + 2500
    expect(result.totals.cache_creation).toBe(3950); // 300 + 150 + 3500
    expect(result.totals.cache_read).toBe(5100);     // 400 + 200 + 4500
    expect(result.pre_v2_caveat).toBeDefined();
    expect(result.pre_v2_caveat).toMatch(/Mixed format ledger/);
    expect(result.pre_v2_caveat).toMatch(/2 delta rows/);
    expect(result.pre_v2_caveat).toMatch(/2 pre-0\.9\.0 rows/);
    expect(result.pre_v2_caveat).toMatch(/last-row trick/);
  });
});

describe('sumDeltas: edge cases', () => {
  it('empty array returns zero totals and format: delta', () => {
    const result = sumDeltas([]);
    expect(result.format).toBe('delta');
    expect(result.totals.input).toBe(0);
    expect(result.totals.output).toBe(0);
    expect(result.totals.cache_creation).toBe(0);
    expect(result.totals.cache_read).toBe(0);
    expect(result.pre_v2_caveat).toBeUndefined();
  });

  it('malformed rows (not objects) are skipped gracefully without throwing', () => {
    const rows = [
      'this is a string, not an object',
      42,
      null,
      makeDeltaRow({ delta: { input: 100, output: 50, cache_creation: 200, cache_read: 300 } }),
    ];

    let threw = false;
    let result: SumResult | null = null;
    try {
      result = sumDeltas(rows as unknown[]);
    } catch {
      threw = true;
    }

    expect(threw).toBe(false);
    expect(result).not.toBeNull();
    // Only the valid delta row should contribute
    expect(result!.totals.input).toBe(100);
    expect(result!.format).toBe('delta');
  });

  it('row with partial delta (missing a field) is treated as flat row (not delta)', () => {
    const partialDeltaRow = {
      ts: '2026-04-30T10:00:00Z',
      session_id: 'session-partial',
      delta: { input: 100, output: 200 }, // missing cache_creation and cache_read
      input: 500,
      output: 1000,
      cache_creation: 1500,
      cache_read: 2000,
    };

    const result = sumDeltas([partialDeltaRow]);

    // partial delta doesn't satisfy isTokenCounts → treated as flat row
    expect(result.format).toBe('pre-0.9.0');
    expect(result.totals.input).toBe(500); // flat fields used
  });
});
