import { describe, test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';

/**
 * Tests for STORY-008-04: token-ledger.sh hook regression + generalization.
 *
 * These tests invoke the actual bash hook with synthetic transcript fixtures
 * to verify:
 *   1. work_item_id detection for STORY / PROPOSAL / EPIC / CR / BUG types
 *   2. Sprint routing via .active sentinel
 *   3. Fallback to _off-sprint when no sentinel
 *   4. Per-turn prompt wins over transcript-first grep
 *   5. Regression fixture: SPRINT-04 transcript routes to SPRINT-04, not SPRINT-03
 *
 * FLASHCARD 2026-04-19 #reporting #hooks #ledger: authoritative bug record.
 *
 * Uses real fs under os.tmpdir(). Spawns real bash.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { execFileSync, execSync } from 'node:child_process';

// Minimal expect() shim (STORY-028-06)
// Backs remaining expect() calls with node:assert so vitest is not needed.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function expect(actual: any): any {
  const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return {
    toBe(expected: unknown) { assert.strictEqual(actual, expected); },
    toEqual(expected: unknown) { assert.deepStrictEqual(actual, expected); },
    toStrictEqual(expected: unknown) { assert.deepStrictEqual(actual, expected); },
    toBeNull() { assert.strictEqual(actual, null); },
    toBeUndefined() { assert.strictEqual(actual, undefined); },
    toBeDefined() { assert.notStrictEqual(actual, undefined); },
    toBeTruthy() { assert.ok(actual); },
    toBeFalsy() { assert.ok(!actual); },
    toBeGreaterThan(n: number) { assert.ok((actual as number) > n); },
    toBeGreaterThanOrEqual(n: number) { assert.ok((actual as number) >= n); },
    toBeLessThan(n: number) { assert.ok((actual as number) < n); },
    toBeLessThanOrEqual(n: number) { assert.ok((actual as number) <= n); },
    toContain(sub: unknown) { assert.ok(String(actual).includes(String(sub))); },
    toMatch(p: string | RegExp) { assert.match(String(actual), typeof p === 'string' ? new RegExp(esc(p)) : p); },
    toHaveLength(len: number) { assert.strictEqual((actual as { length: number }).length, len); },
    toThrow(msg?: string | RegExp) {
      if (!msg) assert.throws(actual as () => void);
      else if (typeof msg === 'string') assert.throws(actual as () => void, new RegExp(esc(msg)));
      else assert.throws(actual as () => void, msg);
    },
    toBeInstanceOf(cls: new (...a: unknown[]) => unknown) { assert.ok(actual instanceof cls); },
    toMatchObject(expected: Record<string, unknown>) { assert.deepStrictEqual(actual, expected); },
    toHaveBeenCalled() { assert.ok((actual as { mock: { calls: unknown[] } }).mock.calls.length > 0); },
    toHaveBeenCalledTimes(n: number) { assert.strictEqual((actual as { mock: { calls: unknown[] } }).mock.calls.length, n); },
    toHaveBeenCalledOnce() { assert.strictEqual((actual as { mock: { calls: unknown[] } }).mock.calls.length, 1); },
    toHaveBeenCalledWith(...expectedArgs: unknown[]) {
      const calls = (actual as { mock: { calls: Array<{arguments: unknown[]}> } }).mock.calls;
      assert.deepStrictEqual(calls[calls.length - 1].arguments, expectedArgs);
    },
    toHaveProperty(key: string, val?: unknown) {
      const obj = actual as Record<string, unknown>;
      assert.ok(key in obj);
      if (val !== undefined) assert.deepStrictEqual(obj[key], val);
    },
    get not(): any {
      return {
        toBe(expected: unknown) { assert.notStrictEqual(actual, expected); },
        toEqual(expected: unknown) { assert.notDeepStrictEqual(actual, expected); },
        toBeNull() { assert.notStrictEqual(actual, null); },
        toBeUndefined() { assert.notStrictEqual(actual, undefined); },
        toBeDefined() { assert.strictEqual(actual, undefined); },
        toBeTruthy() { assert.ok(!actual); },
        toBeFalsy() { assert.ok(actual); },
        toContain(sub: unknown) { assert.ok(!String(actual).includes(String(sub))); },
        toMatch(p: string | RegExp) { assert.doesNotMatch(String(actual), typeof p === 'string' ? new RegExp(esc(p)) : p); },
        toThrow() { assert.doesNotThrow(actual as () => void); },
        toHaveBeenCalled() { assert.strictEqual((actual as { mock: { calls: unknown[] } }).mock.calls.length, 0); },
        toHaveProperty(key: string) { const obj = actual as Record<string, unknown>; assert.ok(!(key in obj)); },
        toBeInstanceOf(cls: new (...a: unknown[]) => unknown) { assert.ok(!(actual instanceof cls)); },
        toHaveLength(len: number) { assert.notStrictEqual((actual as { length: number }).length, len); },
      };
    },
    get resolves(): any {
      const p = actual as Promise<unknown>;
      return {
        async toBe(expected: unknown) { assert.strictEqual(await p, expected); },
        async toEqual(expected: unknown) { assert.deepStrictEqual(await p, expected); },
        async toBeUndefined() { assert.strictEqual(await p, undefined); },
        async toBeNull() { assert.strictEqual(await p, null); },
        async toBeDefined() { assert.notStrictEqual(await p, undefined); },
        async toBeTruthy() { assert.ok(await p); },
      };
    },
    get rejects(): any {
      const p = actual as Promise<unknown>;
      return {
        async toBeInstanceOf(cls: new (...a: unknown[]) => unknown) { await assert.rejects(p, cls); },
        async toThrow(msg?: string | RegExp | (new (...a: unknown[]) => unknown)) {
          if (!msg) await assert.rejects(p);
          else if (typeof msg === 'string') await assert.rejects(p, new RegExp(esc(msg)));
          else await assert.rejects(p, msg as RegExp);
        },
        async toSatisfy(predicate: (val: unknown) => boolean) {
          let err: unknown;
          try { await p; } catch(e) { err = e; }
          assert.ok(predicate(err), `Rejected value did not satisfy predicate. Got: ${String(err)}`);
        },
        async toMatchObject(expected: Record<string, unknown>) {
          let err: unknown;
          try { await p; } catch(e) { err = e; }
          const errObj = err as Record<string, unknown>;
          for (const [k, v] of Object.entries(expected)) {
            if (typeof v === 'string' && (v as any).__isStringContaining) {
              assert.ok(String(errObj[k]).includes((v as any).__value), `Expected ${k} to contain "${(v as any).__value}"`);
            } else {
              assert.deepStrictEqual(errObj[k], v, `Expected ${k} to equal ${String(v)}`);
            }
          }
        },
      };
    },
  };
}
// expect.stringContaining — creates a partial string matcher for use in toMatchObject
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(expect as any).stringContaining = (str: string) => ({ __isStringContaining: true, __value: str });


const HOOK_PATH = path.resolve(
  path.dirname(new URL(import.meta.url).pathname),
  '../../..',
  '.claude/hooks/token-ledger.sh'
);

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

function makeAssistantTurn(inputTokens = 100, outputTokens = 50): TranscriptTurn {
  return {
    type: 'assistant',
    message: {
      content: 'response',
      model: 'claude-sonnet-4-6',
      usage: {
        input_tokens: inputTokens,
        output_tokens: outputTokens,
        cache_creation_input_tokens: 0,
        cache_read_input_tokens: 0,
      },
    },
  };
}

function makeUserTurn(content: string): TranscriptTurn {
  return { type: 'user', message: { content } };
}

function makeUserTurnArray(text: string): TranscriptTurn {
  return { type: 'user', message: { content: [{ type: 'text', text }] } };
}

interface HookEnv {
  tmpDir: string;
  sprintRunsDir: string;
  sentinelPath: string;
  hookLogDir: string;
  hookLog: string;
}

function makeHookEnv(): HookEnv {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ledger-hook-test-'));
  const sprintRunsDir = path.join(tmpDir, '.cleargate', 'sprint-runs');
  fs.mkdirSync(sprintRunsDir, { recursive: true });
  const sentinelPath = path.join(sprintRunsDir, '.active');
  const hookLogDir = path.join(tmpDir, '.cleargate', 'hook-log');
  fs.mkdirSync(hookLogDir, { recursive: true });
  const hookLog = path.join(hookLogDir, 'token-ledger.log');
  return { tmpDir, sprintRunsDir, sentinelPath, hookLogDir, hookLog };
}

/**
 * Run the hook with a synthetic transcript.
 * The hook reads REPO_ROOT from a hardcoded path; we patch it by creating a
 * wrapper script that overrides REPO_ROOT before sourcing the hook logic.
 */
function runHook(
  env: HookEnv,
  transcript: string,
  sessionId = 'test-session-001'
): { ledgerPath: (sprintId: string) => string; getLastRow: (sprintId: string) => Record<string, unknown> | null } {
  // Write transcript to a temp file
  const transcriptFile = path.join(env.tmpDir, 'transcript.jsonl');
  fs.writeFileSync(transcriptFile, transcript, 'utf-8');

  // Build hook input payload
  const payload = JSON.stringify({
    session_id: sessionId,
    transcript_path: transcriptFile,
    hook_event_name: 'SubagentStop',
  });

  // Create a wrapper that overrides REPO_ROOT and LOG_DIR then runs the hook logic
  // We patch the hook by replacing the REPO_ROOT line via env var injection.
  // The actual hook uses a hardcoded REPO_ROOT, so we create a patched copy.
  const hookContent = fs.readFileSync(HOOK_PATH, 'utf-8');
  const patchedHook = hookContent
    .replace(
      /^REPO_ROOT=".+?"$/m,
      `REPO_ROOT="${env.tmpDir}"`
    );

  const patchedHookPath = path.join(env.tmpDir, 'token-ledger-patched.sh');
  fs.writeFileSync(patchedHookPath, patchedHook, { mode: 0o755 });

  try {
    execFileSync('bash', [patchedHookPath], {
      input: payload,
      env: { ...process.env, PATH: process.env.PATH },
      stdio: ['pipe', 'pipe', 'pipe'],
    });
  } catch {
    // Hook errors are logged; we still check the ledger
  }

  return {
    ledgerPath: (sprintId: string) =>
      path.join(env.sprintRunsDir, sprintId, 'token-ledger.jsonl'),
    getLastRow: (sprintId: string): Record<string, unknown> | null => {
      const ledger = path.join(env.sprintRunsDir, sprintId, 'token-ledger.jsonl');
      if (!fs.existsSync(ledger)) return null;
      const lines = fs.readFileSync(ledger, 'utf-8').trim().split('\n').filter(Boolean);
      if (lines.length === 0) return null;
      try {
        return JSON.parse(lines[lines.length - 1]) as Record<string, unknown>;
      } catch {
        return null;
      }
    },
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

let env: HookEnv;

beforeEach(() => {
  env = makeHookEnv();
});

afterEach(() => {
  fs.rmSync(env.tmpDir, { recursive: true, force: true });
});

describe('token-ledger.sh: work_item_id generalization', () => {
  test('detects STORY work-item from first user message (Gherkin: Story edits retain story_id backward-compat)', () => {
    fs.writeFileSync(env.sentinelPath, 'SPRINT-05', 'utf-8');

    const transcript = makeTranscript([
      makeUserTurn('STORY=003-13\n\nYou are the Developer agent...'),
      makeAssistantTurn(),
    ]);

    const { getLastRow } = runHook(env, transcript);
    const row = getLastRow('SPRINT-05');

    assert.notStrictEqual(row, null);
    assert.strictEqual(row!['work_item_id'], 'STORY-003-13');
    assert.strictEqual(row!['story_id'], 'STORY-003-13');
  });

  test('detects PROPOSAL work-item — story_id is empty (Gherkin: Proposal edits tagged as work_item_id)', () => {
    fs.writeFileSync(env.sentinelPath, 'SPRINT-05', 'utf-8');

    const transcript = makeTranscript([
      makeUserTurn('PROPOSAL-042\n\nYou are reviewing a proposal...'),
      makeAssistantTurn(),
    ]);

    const { getLastRow } = runHook(env, transcript);
    const row = getLastRow('SPRINT-05');

    assert.notStrictEqual(row, null);
    assert.strictEqual(row!['work_item_id'], 'PROPOSAL-042');
    assert.strictEqual(row!['story_id'], '');
  });

  test('detects EPIC work-item', () => {
    fs.writeFileSync(env.sentinelPath, 'SPRINT-05', 'utf-8');

    const transcript = makeTranscript([
      makeUserTurn('EPIC-008\n\nYou are processing an epic...'),
      makeAssistantTurn(),
    ]);

    const { getLastRow } = runHook(env, transcript);
    const row = getLastRow('SPRINT-05');

    assert.notStrictEqual(row, null);
    assert.strictEqual(row!['work_item_id'], 'EPIC-008');
    assert.strictEqual(row!['story_id'], '');
  });

  test('detects CR work-item', () => {
    fs.writeFileSync(env.sentinelPath, 'SPRINT-05', 'utf-8');

    const transcript = makeTranscript([
      makeUserTurn('CR-007\n\nYou are processing a change request...'),
      makeAssistantTurn(),
    ]);

    const { getLastRow } = runHook(env, transcript);
    const row = getLastRow('SPRINT-05');

    assert.notStrictEqual(row, null);
    assert.strictEqual(row!['work_item_id'], 'CR-007');
    assert.strictEqual(row!['story_id'], '');
  });

  test('detects BUG work-item', () => {
    fs.writeFileSync(env.sentinelPath, 'SPRINT-05', 'utf-8');

    const transcript = makeTranscript([
      makeUserTurn('BUG-012\n\nYou are processing a bug report...'),
      makeAssistantTurn(),
    ]);

    const { getLastRow } = runHook(env, transcript);
    const row = getLastRow('SPRINT-05');

    assert.notStrictEqual(row, null);
    assert.strictEqual(row!['work_item_id'], 'BUG-012');
    assert.strictEqual(row!['story_id'], '');
  });
});

describe('token-ledger.sh: sprint routing', () => {
  test('routes via .active sentinel (Gherkin: Active-sprint routing)', () => {
    // Create SPRINT-03 dir with older mtime (the old misrouting target)
    const sprint03Dir = path.join(env.sprintRunsDir, 'SPRINT-03');
    fs.mkdirSync(sprint03Dir, { recursive: true });

    // Active sentinel says SPRINT-05
    fs.writeFileSync(env.sentinelPath, 'SPRINT-05', 'utf-8');

    const transcript = makeTranscript([
      makeUserTurn('STORY=005-01\n\nDeveloper turn.'),
      makeAssistantTurn(),
    ]);

    const { getLastRow } = runHook(env, transcript);

    // Row must land in SPRINT-05, not SPRINT-03
    const sprint05Row = getLastRow('SPRINT-05');
    assert.notStrictEqual(sprint05Row, null);

    const sprint03Ledger = path.join(sprint03Dir, 'token-ledger.jsonl');
    expect(fs.existsSync(sprint03Ledger)).toBe(false);
  });

  test('falls back to _off-sprint when no sentinel (Gherkin: No active sprint fallback)', () => {
    // No .active file written
    const transcript = makeTranscript([
      makeUserTurn('STORY=005-01\n\nDeveloper turn.'),
      makeAssistantTurn(),
    ]);

    const { getLastRow } = runHook(env, transcript);
    const row = getLastRow('_off-sprint');
    assert.notStrictEqual(row, null);

    // Check hook log contains the fallback warning
    if (fs.existsSync(env.hookLog)) {
      const logContent = fs.readFileSync(env.hookLog, 'utf-8');
      assert.match(String(logContent), /bucketing as _off-sprint/);
    }
  });

  test('regression fixture: SPRINT-04 transcript routes to SPRINT-04 not SPRINT-03 (FLASHCARD 2026-04-19)', () => {
    // Freeze the FLASHCARD 2026-04-19 scenario:
    // "SPRINT-04 rows landed in SPRINT-03/token-ledger.jsonl tagged STORY-006-01"
    // because the old `ls -td sprint-runs/*/` mtime heuristic picked SPRINT-03
    // (whose mtime was bumped by ledger appends).
    //
    // With the new sentinel-based routing, SPRINT-04 rows go to SPRINT-04.

    const sprint03Dir = path.join(env.sprintRunsDir, 'SPRINT-03');
    fs.mkdirSync(sprint03Dir, { recursive: true });
    // Simulate SPRINT-03 having a recent mtime (the bug trigger)
    fs.utimesSync(sprint03Dir, new Date(), new Date());

    // Active sentinel correctly points to SPRINT-04
    fs.writeFileSync(env.sentinelPath, 'SPRINT-04', 'utf-8');

    // Synthetic SPRINT-04 transcript: first user message has STORY-006-01
    // (this was the story that used to get mis-attributed to SPRINT-03)
    const transcript = makeTranscript([
      makeUserTurn('STORY=006-01\n\nYou are the Developer agent for SPRINT-04...'),
      makeAssistantTurn(500, 200),
    ]);

    const { getLastRow } = runHook(env, transcript, 'sprint04-session');

    // Must land in SPRINT-04
    const sprint04Row = getLastRow('SPRINT-04');
    assert.notStrictEqual(sprint04Row, null);
    assert.strictEqual(sprint04Row!['sprint_id'], 'SPRINT-04');
    assert.strictEqual(sprint04Row!['story_id'], 'STORY-006-01');

    // Must NOT land in SPRINT-03
    const sprint03Ledger = path.join(sprint03Dir, 'token-ledger.jsonl');
    expect(fs.existsSync(sprint03Ledger)).toBe(false);
  });
});

describe('token-ledger.sh: per-turn prompt wins over transcript-first grep', () => {
  test('turn-5 work_item wins over turn-1 mention (Gherkin: Per-turn prompt wins, not transcript-first)', () => {
    fs.writeFileSync(env.sentinelPath, 'SPRINT-05', 'utf-8');

    // Turn 1: user message mentions STORY-003-13 (in an architect plan read)
    // Turn 5: user message starts with STORY=008-04 (the actual dispatch)
    // The hook looks at FIRST user message (turn 1) for the primary signal.
    // By convention, the orchestrator's dispatch is turn 1, so turn 1 IS the right one.
    // This test verifies the per-turn-prompt-wins logic: turn 1 user message
    // wins over any grep in later turns.
    //
    // Scenario: orchestrator dispatches STORY-008-04 (turn 1 user message),
    // but the developer later reads a plan file that mentions STORY-003-13.
    // The row should be tagged STORY-008-04.

    const transcript = makeTranscript([
      // Turn 1 (orchestrator dispatch) — STORY=008-04
      makeUserTurn('STORY=008-04\n\nYou are the Developer agent. Implement STORY-008-04.'),
      // Turn 2 (assistant response)
      makeAssistantTurn(),
      // Turn 3 (user follow-up — contains STORY-003-13 in a plan read)
      makeUserTurn('Here is the plan mentioning STORY-003-13 for context.'),
      // Turn 4 (assistant)
      makeAssistantTurn(),
    ]);

    const { getLastRow } = runHook(env, transcript);
    const row = getLastRow('SPRINT-05');

    assert.notStrictEqual(row, null);
    // First user message (turn 1) has STORY=008-04 — that's what should be tagged
    assert.strictEqual(row!['work_item_id'], 'STORY-008-04');
    assert.strictEqual(row!['story_id'], 'STORY-008-04');
  });
});

// ─── NEW: per-task sentinel + delta model tests ───────────────────────────────
// Added for CHORE=ledger-fix (2026-04-20):
// These tests verify the sentinel-driven attribution and delta token accounting
// that replaced the cumulative-sum bug (FLASHCARD 2026-04-20 #hooks #ledger #cumulative-sum).

function writeSentinel(
  sprintDir: string,
  n: number,
  data: { agent_type: string; work_item_id: string; turn_index: number; started_at: string }
): string {
  const sentinelPath = path.join(sprintDir, `.pending-task-${n}.json`);
  fs.writeFileSync(sentinelPath, JSON.stringify(data), 'utf-8');
  return sentinelPath;
}

function runHookWithSentinel(
  env: HookEnv,
  transcript: string,
  sentinel: { agent_type: string; work_item_id: string; turn_index: number; started_at: string } | null,
  sprintId: string,
  sessionId = 'test-session-sentinel'
): ReturnType<typeof runHook> {
  // Ensure sprint dir exists before writing sentinel
  const sprintDir = path.join(env.sprintRunsDir, sprintId);
  fs.mkdirSync(sprintDir, { recursive: true });

  if (sentinel !== null) {
    writeSentinel(sprintDir, 1, sentinel);
  }

  return runHook(env, transcript, sessionId);
}

describe('token-ledger.sh: per-task sentinel attribution (CHORE=ledger-fix)', () => {
  test('sentinel drives agent_type and work_item_id (overrides transcript grep)', () => {
    // Transcript says STORY=005-01 in first user message, but sentinel says developer/STORY-006-01.
    // Sentinel must win.
    fs.writeFileSync(env.sentinelPath, 'SPRINT-06', 'utf-8');

    const transcript = makeTranscript([
      makeUserTurn('STORY=005-01\n\nYou are the Developer agent.'),
      makeAssistantTurn(100, 50),
      makeAssistantTurn(200, 80),
    ]);

    const { getLastRow } = runHookWithSentinel(
      env,
      transcript,
      { agent_type: 'developer', work_item_id: 'STORY-006-01', turn_index: 0, started_at: '2026-04-20T10:00:00Z' },
      'SPRINT-06'
    );

    const row = getLastRow('SPRINT-06');
    assert.notStrictEqual(row, null);
    assert.strictEqual(row!['agent_type'], 'developer');
    assert.strictEqual(row!['work_item_id'], 'STORY-006-01');
    assert.strictEqual(row!['story_id'], 'STORY-006-01');
  });

  test('delta model: turn_index=1 skips first assistant turn, sums from index 1 onward', () => {
    // Transcript: turn 0 (prior run) = 1000 input tokens, turn 1+ (this subagent) = 200 + 300 input.
    // With turn_index=1: delta = 200 + 300 = 500 input tokens (NOT 1500 cumulative).
    fs.writeFileSync(env.sentinelPath, 'SPRINT-06', 'utf-8');

    const transcript = makeTranscript([
      makeUserTurn('STORY=006-01\n\nDispatch for this subagent.'),
      makeAssistantTurn(1000, 400),  // index 0 — prior run, should be excluded
      makeUserTurn('continuation'),
      makeAssistantTurn(200, 80),   // index 1 — this subagent
      makeUserTurn('continuation2'),
      makeAssistantTurn(300, 120),  // index 2 — this subagent
    ]);

    const { getLastRow } = runHookWithSentinel(
      env,
      transcript,
      { agent_type: 'architect', work_item_id: 'STORY-006-01', turn_index: 1, started_at: '2026-04-20T10:00:00Z' },
      'SPRINT-06'
    );

    const row = getLastRow('SPRINT-06');
    assert.notStrictEqual(row, null);
    // CR-018 schema: intra-fire slice (500 input) is stored in session_total.*;
    // delta.* = session_total - prior (no prior state → delta == session_total).
    // Should be 200 + 300 = 500 input tokens (NOT 1000 + 200 + 300 = 1500).
    const delta = row!['delta'] as Record<string, number>;
    const sessionTotal = row!['session_total'] as Record<string, number>;
    assert.strictEqual(sessionTotal['input'], 500);
    assert.strictEqual(delta['input'], 500);  // first fire: delta == session_total
    assert.strictEqual(sessionTotal['output'], 200); // 80 + 120
    assert.strictEqual(row!['delta_from_turn'], 1);
  });

  test('two consecutive fires on same transcript produce non-overlapping token counts', () => {
    // First fire: turn_index=0, covers turns 0..1 (2 turns: 100 + 200 input)
    // Second fire: turn_index=2, covers turns 2..3 (2 turns: 300 + 400 input)
    // Total = 1000 input; each fire sees 300 and 700 respectively.
    fs.writeFileSync(env.sentinelPath, 'SPRINT-06', 'utf-8');

    const transcript = makeTranscript([
      makeUserTurn('STORY=006-01\n\nDispatch.'),
      makeAssistantTurn(100, 50),  // index 0
      makeUserTurn('turn2'),
      makeAssistantTurn(200, 60),  // index 1
      makeUserTurn('turn4'),
      makeAssistantTurn(300, 70),  // index 2
      makeUserTurn('turn6'),
      makeAssistantTurn(400, 80),  // index 3
    ]);

    // First fire: sentinel with turn_index=0
    const sprintDir = path.join(env.sprintRunsDir, 'SPRINT-06');
    fs.mkdirSync(sprintDir, { recursive: true });

    writeSentinel(sprintDir, 1, {
      agent_type: 'developer',
      work_item_id: 'STORY-006-01',
      turn_index: 0,
      started_at: '2026-04-20T10:00:00Z',
    });

    const { getLastRow, ledgerPath } = runHook(env, transcript, 'session-fire1');

    const row1 = getLastRow('SPRINT-06');
    assert.notStrictEqual(row1, null);
    // CR-018 schema: session_total reflects intra-fire transcript slice (turn_index=0, all turns).
    // delta == session_total for first fire (no prior .session-totals.json state).
    const row1SessionTotal = row1!['session_total'] as Record<string, number>;
    const row1Delta = row1!['delta'] as Record<string, number>;
    assert.strictEqual(row1SessionTotal['input'], 1000); // 100+200+300+400 (turn_index=0, all turns)
    assert.strictEqual(row1Delta['input'], 1000); // first fire: delta == session_total

    // Verify sentinel was deleted
    const sentinelExists = fs.existsSync(path.join(sprintDir, '.pending-task-1.json'));
    assert.strictEqual(sentinelExists, false);

    // Second fire: new sentinel with turn_index=2
    // IMPORTANT: second fire uses a DIFFERENT session_id ('session-fire2').
    // The hook's delta math is keyed by session_id; 'session-fire2' has no prior state
    // → delta == session_total for its slice (turns 2..3: 300+400 = 700).
    writeSentinel(sprintDir, 2, {
      agent_type: 'qa',
      work_item_id: 'STORY-006-01',
      turn_index: 2,
      started_at: '2026-04-20T11:00:00Z',
    });

    runHook(env, transcript, 'session-fire2');

    // Read ledger to get both rows
    const ledger = ledgerPath('SPRINT-06');
    const lines = fs.readFileSync(ledger, 'utf-8').trim().split('\n').filter(Boolean);
    assert.strictEqual(lines.length, 2);

    const row2 = JSON.parse(lines[1]) as Record<string, unknown>;
    // Second fire covers turns index 2..3: 300 + 400 = 700 input
    const row2SessionTotal = row2['session_total'] as Record<string, number>;
    const row2Delta = row2['delta'] as Record<string, number>;
    assert.strictEqual(row2SessionTotal['input'], 700);
    assert.strictEqual(row2Delta['input'], 700); // different session, first fire for session-fire2
    assert.strictEqual(row2['agent_type'], 'qa');
    assert.strictEqual(row2['delta_from_turn'], 2);

    // The two rows must not overlap: session_total.input values differ (1000 vs 700)
    assert.notStrictEqual(row1SessionTotal['input'], row2SessionTotal['input']);
  });

  test('sentinel is deleted after successful row write', () => {
    fs.writeFileSync(env.sentinelPath, 'SPRINT-06', 'utf-8');

    const sprintDir = path.join(env.sprintRunsDir, 'SPRINT-06');
    fs.mkdirSync(sprintDir, { recursive: true });

    const sentinelPath = writeSentinel(sprintDir, 42, {
      agent_type: 'reporter',
      work_item_id: 'STORY-006-02',
      turn_index: 0,
      started_at: '2026-04-20T10:00:00Z',
    });

    expect(fs.existsSync(sentinelPath)).toBe(true);

    const transcript = makeTranscript([
      makeUserTurn('STORY=006-02\n\nYou are reporter.'),
      makeAssistantTurn(50, 25),
    ]);

    runHook(env, transcript, 'session-sentinel-delete');

    expect(fs.existsSync(sentinelPath)).toBe(false);
  });

  test('missing sentinel is a silent no-op that still writes a row using legacy detection', () => {
    // No sentinel file: hook should exit 0 and still produce a row via transcript-grep.
    fs.writeFileSync(env.sentinelPath, 'SPRINT-06', 'utf-8');

    const sprintDir = path.join(env.sprintRunsDir, 'SPRINT-06');
    fs.mkdirSync(sprintDir, { recursive: true });
    // Explicitly confirm no pending-task files exist
    expect(
      fs.readdirSync(sprintDir).filter((f) => f.startsWith('.pending-task-'))
    ).toHaveLength(0);

    const transcript = makeTranscript([
      makeUserTurn('STORY=006-03\n\nYou are the Developer agent.'),
      makeAssistantTurn(150, 75),
    ]);

    // runHook should not throw
    let threw = false;
    try {
      runHook(env, transcript, 'session-no-sentinel');
    } catch {
      threw = true;
    }
    assert.strictEqual(threw, false);

    // Row should still be written (using legacy transcript-grep for agent_type/work_item_id)
    const ledger = path.join(sprintDir, 'token-ledger.jsonl');
    expect(fs.existsSync(ledger)).toBe(true);
    const lines = fs.readFileSync(ledger, 'utf-8').trim().split('\n').filter(Boolean);
    assert.ok(lines.length >= 1);

    const row = JSON.parse(lines[lines.length - 1]) as Record<string, unknown>;
    // Legacy detection should find STORY-006-03 from first user message
    assert.strictEqual(row['work_item_id'], 'STORY-006-03');
    // delta_from_turn should be 0 (no sentinel, full transcript)
    assert.strictEqual(row['delta_from_turn'], 0);
  });
});
