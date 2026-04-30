/**
 * Tests for CR-018: token-ledger.sh per-turn delta math.
 *
 * All 7 scenarios (6 mandatory + 1 mixed-format):
 *   1. Single-session multi-fire: 3 rows, sum(delta.*) == last session_total.*
 *   2. Multi-session sprint: 2 sessions × 2 fires, sum(delta.input) == sum(last-session_total per session)
 *   3. First row in session: delta == session_total (no prior .session-totals.json entry)
 *   4. Reporter on new-format ledger: delta.* sums match expected totals
 *   5. Reporter on pre-0.9.0 ledger: last-row-trick fallback + format caveat
 *   6. State file persists across fires; concurrent fires don't corrupt .session-totals.json
 *   7. Mixed-format ledger: format='mixed', caveat includes both counts, math correct
 *
 * Uses the same harness pattern as token-ledger-regression.test.ts:
 *   - Real bash execution via execFileSync
 *   - Synthetic transcript fixtures written to os.tmpdir()
 *   - Hook patched by replacing the REPO_ROOT assignment line
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { execFileSync } from 'node:child_process';
import { sumDeltas } from '../../src/lib/ledger.js';

const HOOK_PATH = path.resolve(
  path.dirname(new URL(import.meta.url).pathname),
  '../../..',
  '.claude/hooks/token-ledger.sh'
);

// ─── Transcript helpers ────────────────────────────────────────────────────────

interface TranscriptTurn {
  type: 'user' | 'assistant';
  message: {
    content: string | Array<{ type: string; text: string }>;
    usage?: {
      input_tokens: number;
      output_tokens: number;
      cache_creation_input_tokens?: number;
      cache_read_input_tokens?: number;
    };
    model?: string;
  };
}

function makeTranscript(turns: TranscriptTurn[]): string {
  return turns.map((t) => JSON.stringify(t)).join('\n') + '\n';
}

function makeAssistantTurn(
  inputTokens = 100,
  outputTokens = 50,
  cacheCreation = 0,
  cacheRead = 0
): TranscriptTurn {
  return {
    type: 'assistant',
    message: {
      content: 'response',
      model: 'claude-sonnet-4-6',
      usage: {
        input_tokens: inputTokens,
        output_tokens: outputTokens,
        cache_creation_input_tokens: cacheCreation,
        cache_read_input_tokens: cacheRead,
      },
    },
  };
}

function makeUserTurn(content: string): TranscriptTurn {
  return { type: 'user', message: { content } };
}

// ─── Hook environment ──────────────────────────────────────────────────────────

interface HookEnv {
  tmpDir: string;
  sprintRunsDir: string;
  sentinelPath: string;
  hookLogDir: string;
  hookLog: string;
  sprintDir: string;
}

const TEST_SPRINT_ID = 'SPRINT-15';

function makeHookEnv(): HookEnv {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ledger-delta-test-'));
  const sprintRunsDir = path.join(tmpDir, '.cleargate', 'sprint-runs');
  fs.mkdirSync(sprintRunsDir, { recursive: true });
  const sentinelPath = path.join(sprintRunsDir, '.active');
  const hookLogDir = path.join(tmpDir, '.cleargate', 'hook-log');
  fs.mkdirSync(hookLogDir, { recursive: true });
  const hookLog = path.join(hookLogDir, 'token-ledger.log');
  const sprintDir = path.join(sprintRunsDir, TEST_SPRINT_ID);
  fs.mkdirSync(sprintDir, { recursive: true });
  fs.writeFileSync(sentinelPath, TEST_SPRINT_ID, 'utf-8');
  return { tmpDir, sprintRunsDir, sentinelPath, hookLogDir, hookLog, sprintDir };
}

/**
 * Run the hook. Patches REPO_ROOT by replacing the line in a temp hook copy.
 * Supports pre-seeding a .session-totals.json state.
 */
function runHook(
  env: HookEnv,
  transcript: string,
  sessionId: string,
  sessionTotals?: Record<string, unknown>
): {
  ledgerPath: string;
  sessionTotalsPath: string;
  getAllRows: () => Record<string, unknown>[];
  getLastRow: () => Record<string, unknown> | null;
  getSessionTotals: () => Record<string, unknown> | null;
} {
  const transcriptFile = path.join(env.tmpDir, `transcript-${sessionId}.jsonl`);
  fs.writeFileSync(transcriptFile, transcript, 'utf-8');

  // Pre-seed session totals if provided
  const sessionTotalsPath = path.join(env.sprintDir, '.session-totals.json');
  if (sessionTotals !== undefined) {
    fs.writeFileSync(sessionTotalsPath, JSON.stringify(sessionTotals), 'utf-8');
  }

  const payload = JSON.stringify({
    session_id: sessionId,
    transcript_path: transcriptFile,
    hook_event_name: 'SubagentStop',
  });

  const hookContent = fs.readFileSync(HOOK_PATH, 'utf-8');
  const patchedHook = hookContent.replace(
    /^REPO_ROOT=".+?"$/m,
    `REPO_ROOT="${env.tmpDir}"`
  );

  const patchedHookPath = path.join(env.tmpDir, `token-ledger-patched-${sessionId}.sh`);
  fs.writeFileSync(patchedHookPath, patchedHook, { mode: 0o755 });

  try {
    execFileSync('bash', [patchedHookPath], {
      input: payload,
      env: { ...process.env, PATH: process.env.PATH },
      stdio: ['pipe', 'pipe', 'pipe'],
    });
  } catch {
    // Hook errors are logged; still check the ledger
  }

  const ledgerPath = path.join(env.sprintDir, 'token-ledger.jsonl');

  return {
    ledgerPath,
    sessionTotalsPath,
    getAllRows: (): Record<string, unknown>[] => {
      if (!fs.existsSync(ledgerPath)) return [];
      const lines = fs.readFileSync(ledgerPath, 'utf-8').trim().split('\n').filter(Boolean);
      return lines.flatMap((l) => {
        try { return [JSON.parse(l) as Record<string, unknown>]; } catch { return []; }
      });
    },
    getLastRow: (): Record<string, unknown> | null => {
      if (!fs.existsSync(ledgerPath)) return null;
      const lines = fs.readFileSync(ledgerPath, 'utf-8').trim().split('\n').filter(Boolean);
      if (lines.length === 0) return null;
      try { return JSON.parse(lines[lines.length - 1]) as Record<string, unknown>; } catch { return null; }
    },
    getSessionTotals: (): Record<string, unknown> | null => {
      if (!fs.existsSync(sessionTotalsPath)) return null;
      try { return JSON.parse(fs.readFileSync(sessionTotalsPath, 'utf-8')) as Record<string, unknown>; } catch { return null; }
    },
  };
}

// ─── Test suite ───────────────────────────────────────────────────────────────

let env: HookEnv;

beforeEach(() => {
  env = makeHookEnv();
});

afterEach(() => {
  fs.rmSync(env.tmpDir, { recursive: true, force: true });
});

/**
 * Scenario 1: Single-session multi-fire.
 *
 * Given a single session that fires SubagentStop 3 times
 * Each fire appends more tokens to the transcript cumulative totals
 * Then each row has a delta reflecting only the increment since prior fire
 * And sum of delta.* across all 3 rows equals the last row's session_total.*
 */
describe('Scenario 1: single-session multi-fire', () => {
  it('3 fires produce per-turn deltas; sum(delta) == last session_total', () => {
    const sessionId = 'session-multi-fire';

    // Fire 1: 3 assistant turns each 100 input, 50 output → cumulative = {300, 150}
    // No prior state → delta == session_total
    const transcript1 = makeTranscript([
      makeUserTurn('STORY=015-01\nDeveloper agent.'),
      makeAssistantTurn(100, 50, 0, 0),  // turn 0
      makeUserTurn('turn2'),
      makeAssistantTurn(100, 50, 0, 0),  // turn 1
      makeUserTurn('turn3'),
      makeAssistantTurn(100, 50, 0, 0),  // turn 2
    ]);

    const result1 = runHook(env, transcript1, sessionId);
    const row1 = result1.getLastRow()!;

    expect(row1['delta']).toMatchObject({ input: 300, output: 150 });
    expect(row1['session_total']).toMatchObject({ input: 300, output: 150 });

    // Fire 2: transcript grows by 2 more turns (200 more input, 100 more output → cumulative 500, 250)
    const transcript2 = makeTranscript([
      makeUserTurn('STORY=015-01\nDeveloper agent.'),
      makeAssistantTurn(100, 50, 0, 0),  // turn 0
      makeUserTurn('t2'),
      makeAssistantTurn(100, 50, 0, 0),  // turn 1
      makeUserTurn('t3'),
      makeAssistantTurn(100, 50, 0, 0),  // turn 2
      makeUserTurn('t4'),
      makeAssistantTurn(100, 50, 0, 0),  // turn 3
      makeUserTurn('t5'),
      makeAssistantTurn(100, 50, 0, 0),  // turn 4
    ]);

    // The hook auto-reads the state file it wrote on fire 1
    const result2 = runHook(env, transcript2, sessionId);
    const allRows2 = result2.getAllRows();
    const row2 = allRows2[allRows2.length - 1]!;

    // delta = 500 - 300 = 200 input, 250 - 150 = 100 output
    expect(row2['delta']).toMatchObject({ input: 200, output: 100 });
    expect(row2['session_total']).toMatchObject({ input: 500, output: 250 });

    // Fire 3: 2 more turns → cumulative 700, 350
    const transcript3 = makeTranscript([
      makeUserTurn('STORY=015-01\nDeveloper agent.'),
      makeAssistantTurn(100, 50, 0, 0),
      makeUserTurn('t2'),
      makeAssistantTurn(100, 50, 0, 0),
      makeUserTurn('t3'),
      makeAssistantTurn(100, 50, 0, 0),
      makeUserTurn('t4'),
      makeAssistantTurn(100, 50, 0, 0),
      makeUserTurn('t5'),
      makeAssistantTurn(100, 50, 0, 0),
      makeUserTurn('t6'),
      makeAssistantTurn(100, 50, 0, 0),
      makeUserTurn('t7'),
      makeAssistantTurn(100, 50, 0, 0),
    ]);

    const result3 = runHook(env, transcript3, sessionId);
    const allRows3 = result3.getAllRows();
    const row3 = allRows3[allRows3.length - 1]!;

    // delta = 700 - 500 = 200
    expect(row3['delta']).toMatchObject({ input: 200, output: 100 });
    expect(row3['session_total']).toMatchObject({ input: 700, output: 350 });

    // Key assertion: sum(delta.input) across 3 rows == last session_total.input
    const totalDeltaInput =
      (row1['delta'] as Record<string, number>)['input'] +
      (row2['delta'] as Record<string, number>)['input'] +
      (row3['delta'] as Record<string, number>)['input'];
    const lastSessionTotalInput = (row3['session_total'] as Record<string, number>)['input'];

    expect(totalDeltaInput).toBe(lastSessionTotalInput); // 300 + 200 + 200 = 700
  });
});

/**
 * Scenario 2: Multi-session sprint.
 *
 * 2 sessions × 2 fires → 4 rows.
 * sum(all delta.input) == sum(last-session_total.input per session).
 */
describe('Scenario 2: multi-session sprint', () => {
  it('4 rows across 2 sessions; sum(delta.input) == sum of last session_total per session', () => {
    const sessionA = 'session-alpha';
    const sessionB = 'session-beta';

    // Transcript 1: 2 turns × 200 input = 400 cumulative
    const transcript1 = makeTranscript([
      makeUserTurn('STORY=015-02\nDeveloper.'),
      makeAssistantTurn(200, 100, 0, 0),
      makeUserTurn('t2'),
      makeAssistantTurn(200, 100, 0, 0),
    ]);

    // Transcript 2: 4 turns × 200 input = 800 cumulative
    const transcript2 = makeTranscript([
      makeUserTurn('STORY=015-02\nDeveloper.'),
      makeAssistantTurn(200, 100, 0, 0),
      makeUserTurn('t2'),
      makeAssistantTurn(200, 100, 0, 0),
      makeUserTurn('t3'),
      makeAssistantTurn(200, 100, 0, 0),
      makeUserTurn('t4'),
      makeAssistantTurn(200, 100, 0, 0),
    ]);

    // Fire 1 for session A: delta = 400 (no prior state)
    const resultA1 = runHook(env, transcript1, sessionA);
    const rowA1 = resultA1.getLastRow()!;
    expect((rowA1['delta'] as Record<string, number>)['input']).toBe(400);

    // Fire 1 for session B: delta = 400 (B has no prior state; A's state is in file keyed by A)
    const resultB1 = runHook(env, transcript1, sessionB);
    const allRowsB1 = resultB1.getAllRows();
    const rowB1 = allRowsB1[allRowsB1.length - 1]!;
    expect((rowB1['delta'] as Record<string, number>)['input']).toBe(400);

    // Fire 2 for session A: prior=400, now=800 → delta=400
    const resultA2 = runHook(env, transcript2, sessionA);
    const allRowsA2 = resultA2.getAllRows();
    const rowA2 = allRowsA2[allRowsA2.length - 1]!;
    expect((rowA2['delta'] as Record<string, number>)['input']).toBe(400); // 800 - 400
    expect((rowA2['session_total'] as Record<string, number>)['input']).toBe(800);

    // Fire 2 for session B: prior=400, now=800 → delta=400
    const resultB2 = runHook(env, transcript2, sessionB);
    const allRowsB2 = resultB2.getAllRows();
    const rowB2 = allRowsB2[allRowsB2.length - 1]!;
    expect((rowB2['delta'] as Record<string, number>)['input']).toBe(400); // 800 - 400
    expect((rowB2['session_total'] as Record<string, number>)['input']).toBe(800);

    // sum(delta.input for all 4 rows) == sum(last session_total per session)
    const allDeltaInput =
      (rowA1['delta'] as Record<string, number>)['input'] +
      (rowB1['delta'] as Record<string, number>)['input'] +
      (rowA2['delta'] as Record<string, number>)['input'] +
      (rowB2['delta'] as Record<string, number>)['input']; // 400+400+400+400 = 1600

    const lastTotalA = (rowA2['session_total'] as Record<string, number>)['input']; // 800
    const lastTotalB = (rowB2['session_total'] as Record<string, number>)['input']; // 800
    expect(allDeltaInput).toBe(lastTotalA + lastTotalB); // 1600 == 1600
  });
});

/**
 * Scenario 3: First row in session.
 *
 * Given no prior .session-totals.json entry for this session_id
 * Then delta == session_total for that row.
 */
describe('Scenario 3: first row in session (delta == session_total)', () => {
  it('no prior state → delta equals session_total', () => {
    const sessionId = 'session-first-fire';

    const transcript = makeTranscript([
      makeUserTurn('STORY=015-03\nDeveloper.'),
      makeAssistantTurn(500, 300, 1000, 5000),
      makeUserTurn('t2'),
      makeAssistantTurn(500, 300, 1000, 5000),
    ]);

    // Explicitly no prior session-totals.json
    const result = runHook(env, transcript, sessionId);
    const row = result.getLastRow();

    expect(row).not.toBeNull();
    const delta = row!['delta'] as Record<string, number>;
    const sessionTotal = row!['session_total'] as Record<string, number>;

    expect(delta['input']).toBe(sessionTotal['input']);
    expect(delta['output']).toBe(sessionTotal['output']);
    expect(delta['cache_creation']).toBe(sessionTotal['cache_creation']);
    expect(delta['cache_read']).toBe(sessionTotal['cache_read']);
  });

  it('.session-totals.json is created on first fire', () => {
    const sessionId = 'session-creates-state';
    const transcript = makeTranscript([
      makeUserTurn('STORY=015-03\nDeveloper.'),
      makeAssistantTurn(100, 50),
    ]);

    // No pre-existing state file
    const result = runHook(env, transcript, sessionId);
    const sessionTotals = result.getSessionTotals();

    expect(sessionTotals).not.toBeNull();
    expect(typeof sessionTotals![sessionId]).toBe('object');
    const entry = sessionTotals![sessionId] as Record<string, unknown>;
    expect(entry['input']).toBe(100);
    expect(entry['output']).toBe(50);
  });
});

/**
 * Scenario 4: Reporter on new-format ledger.
 *
 * Given a ledger with delta rows only
 * When sumDeltas() is called
 * Then format = 'delta', totals match expected.
 */
describe('Scenario 4: Reporter on new-format ledger (sumDeltas)', () => {
  it('delta-format ledger sums correctly via sumDeltas', () => {
    const rows = [
      {
        ts: '2026-04-30T10:00:00Z',
        sprint_id: 'SPRINT-15',
        story_id: 'STORY-015-04',
        work_item_id: 'STORY-015-04',
        agent_type: 'developer',
        session_id: 'sess-x',
        delta: { input: 271, output: 18607, cache_creation: 78726, cache_read: 1701009 },
        session_total: { input: 600, output: 204694, cache_creation: 865995, cache_read: 18711104 },
        model: 'claude-sonnet-4-6',
        turns: 17,
      },
      {
        ts: '2026-04-30T11:00:00Z',
        sprint_id: 'SPRINT-15',
        story_id: 'STORY-015-04',
        work_item_id: 'STORY-015-04',
        agent_type: 'qa',
        session_id: 'sess-y',
        delta: { input: 100, output: 500, cache_creation: 1000, cache_read: 5000 },
        session_total: { input: 200, output: 1000, cache_creation: 2000, cache_read: 10000 },
        model: 'claude-sonnet-4-6',
        turns: 5,
      },
    ];

    const result = sumDeltas(rows);

    expect(result.format).toBe('delta');
    expect(result.totals.input).toBe(371);           // 271 + 100
    expect(result.totals.output).toBe(19107);        // 18607 + 500
    expect(result.totals.cache_creation).toBe(79726); // 78726 + 1000
    expect(result.totals.cache_read).toBe(1706009);  // 1701009 + 5000
    expect(result.pre_v2_caveat).toBeUndefined();
  });
});

/**
 * Scenario 5: Reporter on pre-0.9.0 ledger.
 *
 * Given a ledger with flat-field rows only (no delta block)
 * When sumDeltas() is called
 * Then format = 'pre-0.9.0', last-row-trick applied, caveat string present.
 */
describe('Scenario 5: Reporter on pre-0.9.0 ledger (flat fields)', () => {
  it('flat-field ledger uses last-row trick and returns format caveat', () => {
    // Same session, 2 cumulative rows → only last row counted
    const rows = [
      {
        ts: '2026-04-20T10:00:00Z',
        sprint_id: 'SPRINT-14',
        story_id: 'STORY-014-01',
        work_item_id: 'STORY-014-01',
        agent_type: 'developer',
        session_id: 'legacy-session-1',
        input: 1200,
        output: 9800,
        cache_creation: 45000,
        cache_read: 880000,
        model: 'claude-sonnet-4-5',
        turns: 8,
      },
      {
        ts: '2026-04-20T10:45:00Z',  // later → this is the "last row"
        sprint_id: 'SPRINT-14',
        story_id: 'STORY-014-01',
        work_item_id: 'STORY-014-01',
        agent_type: 'developer',
        session_id: 'legacy-session-1',
        input: 2400,      // cumulative (higher than fire 1)
        output: 18600,
        cache_creation: 90000,
        cache_read: 1760000,
        model: 'claude-sonnet-4-5',
        turns: 16,
      },
    ];

    const result = sumDeltas(rows);

    expect(result.format).toBe('pre-0.9.0');
    // Last row for legacy-session-1 → input=2400
    expect(result.totals.input).toBe(2400);
    expect(result.totals.output).toBe(18600);
    expect(result.pre_v2_caveat).toBeDefined();
    expect(result.pre_v2_caveat).toContain('pre-0.9.0 flat-field rows');
    expect(result.pre_v2_caveat).toContain('last-row-per-session trick');
  });
});

/**
 * Scenario 6: State file persists across hook fires; concurrent fires don't corrupt.
 *
 * Race two parallel hook invocations and assert .session-totals.json is valid JSON
 * after both complete (no corruption from concurrent writes).
 */
describe('Scenario 6: concurrent hook fires — atomic state write', () => {
  it('two parallel hook fires produce valid, non-corrupt .session-totals.json', { timeout: 30000 }, async () => {
    const sessionA = 'concurrent-session-A';
    const sessionB = 'concurrent-session-B';

    const transcript = makeTranscript([
      makeUserTurn('STORY=015-06\nDeveloper.'),
      makeAssistantTurn(100, 50),
    ]);

    const transcriptFileA = path.join(env.tmpDir, `transcript-${sessionA}.jsonl`);
    const transcriptFileB = path.join(env.tmpDir, `transcript-${sessionB}.jsonl`);
    fs.writeFileSync(transcriptFileA, transcript, 'utf-8');
    fs.writeFileSync(transcriptFileB, transcript, 'utf-8');

    const hookContent = fs.readFileSync(HOOK_PATH, 'utf-8');
    const patchedHook = hookContent.replace(
      /^REPO_ROOT=".+?"$/m,
      `REPO_ROOT="${env.tmpDir}"`
    );
    const patchedHookPathA = path.join(env.tmpDir, 'hook-concurrent-A.sh');
    const patchedHookPathB = path.join(env.tmpDir, 'hook-concurrent-B.sh');
    fs.writeFileSync(patchedHookPathA, patchedHook, { mode: 0o755 });
    fs.writeFileSync(patchedHookPathB, patchedHook, { mode: 0o755 });

    const payloadA = JSON.stringify({ session_id: sessionA, transcript_path: transcriptFileA, hook_event_name: 'SubagentStop' });
    const payloadB = JSON.stringify({ session_id: sessionB, transcript_path: transcriptFileB, hook_event_name: 'SubagentStop' });

    // Spawn both hook invocations concurrently using node:child_process spawn
    const { spawn } = await import('node:child_process');

    const procA = spawn('bash', [patchedHookPathA], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, PATH: process.env.PATH },
    });
    const procB = spawn('bash', [patchedHookPathB], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, PATH: process.env.PATH },
    });

    procA.stdin!.write(payloadA);
    procA.stdin!.end();
    procB.stdin!.write(payloadB);
    procB.stdin!.end();

    await Promise.all([
      new Promise<void>((resolve) => procA.on('close', () => resolve())),
      new Promise<void>((resolve) => procB.on('close', () => resolve())),
    ]);

    // Verify .session-totals.json is valid JSON (not corrupted by concurrent writes)
    const sessionTotalsPath = path.join(env.sprintDir, '.session-totals.json');
    expect(fs.existsSync(sessionTotalsPath)).toBe(true);

    let parsedTotals: Record<string, unknown> | null = null;
    let parseError: Error | null = null;
    try {
      parsedTotals = JSON.parse(fs.readFileSync(sessionTotalsPath, 'utf-8')) as Record<string, unknown>;
    } catch (e) {
      parseError = e as Error;
    }

    expect(parseError).toBeNull();
    expect(parsedTotals).not.toBeNull();
    // At least one of the two session entries should be present (or both)
    const hasA = sessionA in parsedTotals!;
    const hasB = sessionB in parsedTotals!;
    expect(hasA || hasB).toBe(true);
  });
});

/**
 * Scenario 7: Mixed-format ledger (beyond Architect's 6 mandatory scenarios).
 *
 * Given a ledger with both delta rows and flat-field rows
 * When sumDeltas() is called
 * Then format = 'mixed', caveat includes both counts, totals combine delta + flat last-row trick.
 */
describe('Scenario 7: mixed-format ledger (SPRINT-15 cutover case)', () => {
  it('returns format: mixed with caveat and correct math', () => {
    const rows = [
      // Pre-0.9.0 flat rows (2 fires of same session → last row counts)
      {
        ts: '2026-04-29T10:00:00Z',
        session_id: 'legacy-session',
        story_id: 'STORY-015-01',
        work_item_id: 'STORY-015-01',
        agent_type: 'developer',
        input: 1000, output: 2000, cache_creation: 3000, cache_read: 4000,
        model: 'claude-sonnet-4-5', turns: 5,
      },
      {
        ts: '2026-04-29T11:00:00Z',
        session_id: 'legacy-session',
        story_id: 'STORY-015-01',
        work_item_id: 'STORY-015-01',
        agent_type: 'developer',
        input: 2000, output: 4000, cache_creation: 6000, cache_read: 8000, // cumulative last row
        model: 'claude-sonnet-4-5', turns: 10,
      },
      // Post-0.9.0 delta row
      {
        ts: '2026-04-30T10:00:00Z',
        session_id: 'delta-session',
        story_id: 'STORY-015-02',
        work_item_id: 'STORY-015-02',
        agent_type: 'developer',
        delta: { input: 300, output: 600, cache_creation: 900, cache_read: 1200 },
        session_total: { input: 300, output: 600, cache_creation: 900, cache_read: 1200 },
        model: 'claude-sonnet-4-6', turns: 3,
      },
    ];

    const result = sumDeltas(rows);

    expect(result.format).toBe('mixed');
    // flat legacy-session last row: input=2000; delta-session: input=300 → total=2300
    expect(result.totals.input).toBe(2300);
    expect(result.totals.output).toBe(4600);       // 4000 + 600
    expect(result.totals.cache_creation).toBe(6900); // 6000 + 900
    expect(result.totals.cache_read).toBe(9200);   // 8000 + 1200
    expect(result.pre_v2_caveat).toBeDefined();
    expect(result.pre_v2_caveat).toMatch(/Mixed format ledger/);
    expect(result.pre_v2_caveat).toMatch(/1 delta rows/);
    expect(result.pre_v2_caveat).toMatch(/2 pre-0\.9\.0 rows/);
    expect(result.pre_v2_caveat).toMatch(/last-row trick/);
  });
});
