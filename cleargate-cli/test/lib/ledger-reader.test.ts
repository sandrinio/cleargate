/**
 * Tests for STORY-008-04: ledger-reader.ts
 *
 * Uses real fs under os.tmpdir(). No fs mocks.
 * Tests match Architect's plan scenarios 9 + 10 and Gherkin "Reader groups by session".
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { readLedgerForWorkItem } from '../../src/lib/ledger-reader.js';
import type { LedgerRow } from '../../src/lib/ledger-reader.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeTmpSprintRuns(): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ledger-reader-test-'));
  return root;
}

function writeJsonl(dir: string, sprintId: string, rows: Partial<LedgerRow>[]): string {
  const sprintDir = path.join(dir, sprintId);
  fs.mkdirSync(sprintDir, { recursive: true });
  const ledger = path.join(sprintDir, 'token-ledger.jsonl');
  const lines = rows.map((r) => JSON.stringify(r)).join('\n') + '\n';
  fs.writeFileSync(ledger, lines, 'utf-8');
  return ledger;
}

function makeRow(overrides: Partial<LedgerRow> = {}): LedgerRow {
  return {
    ts: '2026-04-19T12:00:00Z',
    sprint_id: 'SPRINT-05',
    agent_type: 'developer',
    story_id: '',
    work_item_id: 'EPIC-008',
    session_id: 'session-A',
    transcript: '/tmp/t.jsonl',
    input: 100,
    output: 50,
    cache_creation: 0,
    cache_read: 0,
    model: 'claude-sonnet-4-6',
    turns: 3,
    ...overrides,
  };
}

let tmpRoot: string;

beforeEach(() => {
  tmpRoot = makeTmpSprintRuns();
});

afterEach(() => {
  fs.rmSync(tmpRoot, { recursive: true, force: true });
});

// ─── Scenario: Reader groups by session ───────────────────────────────────────

describe('readLedgerForWorkItem', () => {
  it('groups rows into 2 session buckets with aggregated totals (Gherkin: Reader groups by session)', () => {
    // Gherkin: Given ledger rows exist for EPIC-008 across 2 sessions
    //          When readLedgerForWorkItem("EPIC-008")
    //          Then the result groups rows into 2 session buckets with aggregated totals

    const rowA1 = makeRow({ session_id: 'session-A', sprint_id: 'SPRINT-04', ts: '2026-04-18T10:00:00Z', input: 100, output: 50 });
    const rowA2 = makeRow({ session_id: 'session-A', sprint_id: 'SPRINT-04', ts: '2026-04-18T10:05:00Z', input: 200, output: 80 });
    const rowB1 = makeRow({ session_id: 'session-B', sprint_id: 'SPRINT-05', ts: '2026-04-19T09:00:00Z', input: 300, output: 120, turns: 5 });

    writeJsonl(tmpRoot, 'SPRINT-04', [rowA1, rowA2]);
    writeJsonl(tmpRoot, 'SPRINT-05', [rowB1]);

    const buckets = readLedgerForWorkItem('EPIC-008', { sprintRunsRoot: tmpRoot });

    expect(buckets).toHaveLength(2);

    // Buckets are sorted by earliest row ts — session-A is older
    const bucketA = buckets.find((b) => b.session_id === 'session-A');
    const bucketB = buckets.find((b) => b.session_id === 'session-B');

    expect(bucketA).toBeDefined();
    expect(bucketA!.rows).toHaveLength(2);
    expect(bucketA!.totals.input).toBe(300);
    expect(bucketA!.totals.output).toBe(130);
    expect(bucketA!.totals.turns).toBe(6); // 3 + 3 default

    expect(bucketB).toBeDefined();
    expect(bucketB!.rows).toHaveLength(1);
    expect(bucketB!.totals.input).toBe(300);
    expect(bucketB!.totals.output).toBe(120);
    expect(bucketB!.totals.turns).toBe(5);
  });

  it('single-sprint read returns matching rows only', () => {
    const epRow = makeRow({ work_item_id: 'EPIC-008', story_id: '', session_id: 'sess-1' });
    const stRow = makeRow({ work_item_id: 'STORY-008-04', story_id: 'STORY-008-04', session_id: 'sess-2' });

    writeJsonl(tmpRoot, 'SPRINT-05', [epRow, stRow]);

    const buckets = readLedgerForWorkItem('EPIC-008', { sprintRunsRoot: tmpRoot });

    expect(buckets).toHaveLength(1);
    expect(buckets[0].session_id).toBe('sess-1');
    expect(buckets[0].rows).toHaveLength(1);
  });

  it('multi-sprint scan finds rows across sprint directories', () => {
    const sprint4Row = makeRow({ work_item_id: 'EPIC-008', sprint_id: 'SPRINT-04', ts: '2026-04-18T00:00:00Z', session_id: 'old-session' });
    const sprint5Row = makeRow({ work_item_id: 'EPIC-008', sprint_id: 'SPRINT-05', ts: '2026-04-19T00:00:00Z', session_id: 'new-session' });

    writeJsonl(tmpRoot, 'SPRINT-04', [sprint4Row]);
    writeJsonl(tmpRoot, 'SPRINT-05', [sprint5Row]);

    const buckets = readLedgerForWorkItem('EPIC-008', { sprintRunsRoot: tmpRoot });

    expect(buckets).toHaveLength(2);
    expect(buckets.map((b) => b.session_id)).toContain('old-session');
    expect(buckets.map((b) => b.session_id)).toContain('new-session');
  });

  it('since filter excludes rows before the cutoff', () => {
    const oldRow = makeRow({ ts: '2026-04-18T00:00:00Z', session_id: 'sess-old' });
    const newRow = makeRow({ ts: '2026-04-19T12:00:00Z', session_id: 'sess-new' });

    writeJsonl(tmpRoot, 'SPRINT-05', [oldRow, newRow]);

    const buckets = readLedgerForWorkItem('EPIC-008', {
      sprintRunsRoot: tmpRoot,
      since: '2026-04-19T00:00:00Z',
    });

    expect(buckets).toHaveLength(1);
    expect(buckets[0].session_id).toBe('sess-new');
  });

  it('defaults work_item_id from story_id for pre-fix rows (backward compat)', () => {
    // Pre-STORY-008-04 rows only have story_id, no work_item_id
    const legacyRow = {
      ts: '2026-04-17T00:00:00Z',
      sprint_id: 'SPRINT-04',
      agent_type: 'developer',
      story_id: 'STORY-004-01',
      // work_item_id intentionally absent
      session_id: 'legacy-sess',
      transcript: '/tmp/t.jsonl',
      input: 50,
      output: 20,
      cache_creation: 0,
      cache_read: 0,
      model: 'claude-opus-4',
      turns: 2,
    };

    writeJsonl(tmpRoot, 'SPRINT-04', [legacyRow]);

    const buckets = readLedgerForWorkItem('STORY-004-01', { sprintRunsRoot: tmpRoot });

    expect(buckets).toHaveLength(1);
    expect(buckets[0].rows[0].work_item_id).toBe('STORY-004-01');
  });

  it('returns empty array when sprint-runs root does not exist', () => {
    const result = readLedgerForWorkItem('EPIC-008', { sprintRunsRoot: '/nonexistent/path/sprint-runs' });
    expect(result).toEqual([]);
  });

  it('returns empty array when no rows match the workItemId', () => {
    const row = makeRow({ work_item_id: 'STORY-001-01', story_id: 'STORY-001-01' });
    writeJsonl(tmpRoot, 'SPRINT-05', [row]);

    const buckets = readLedgerForWorkItem('EPIC-999', { sprintRunsRoot: tmpRoot });
    expect(buckets).toEqual([]);
  });
});
