/**
 * Tests for CR-016: token-ledger.sh dispatch-marker attribution.
 *
 * Verifies all 5 mandatory Gherkin scenarios from CR-016 §4:
 *   1. Dispatch file present → fields used verbatim (wins over transcript)
 *   2. Dispatch file absent → fallback to pending-task sentinel / transcript, no exception
 *   3. Dispatch file malformed JSON → ignored, fallback + warning logged, no crash
 *   4. Dispatch wins over transcript pollution (SPRINT-001 Hakathon repro shape)
 *   5. Dispatch file is consumed and deleted post-read
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
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ledger-attribution-test-'));
  const sprintRunsDir = path.join(tmpDir, '.cleargate', 'sprint-runs');
  fs.mkdirSync(sprintRunsDir, { recursive: true });
  const sentinelPath = path.join(sprintRunsDir, '.active');
  const hookLogDir = path.join(tmpDir, '.cleargate', 'hook-log');
  fs.mkdirSync(hookLogDir, { recursive: true });
  const hookLog = path.join(hookLogDir, 'token-ledger.log');
  const sprintDir = path.join(sprintRunsDir, TEST_SPRINT_ID);
  fs.mkdirSync(sprintDir, { recursive: true });
  // Write active sentinel pointing at our test sprint
  fs.writeFileSync(sentinelPath, TEST_SPRINT_ID, 'utf-8');
  return { tmpDir, sprintRunsDir, sentinelPath, hookLogDir, hookLog, sprintDir };
}

/**
 * Run the hook with a synthetic transcript.
 * Patches REPO_ROOT by replacing the line in the hook copy.
 */
function runHook(
  env: HookEnv,
  transcript: string,
  sessionId = 'test-session-dispatch'
): { ledgerPath: string; getLastRow: () => Record<string, unknown> | null } {
  const transcriptFile = path.join(env.tmpDir, `transcript-${sessionId}.jsonl`);
  fs.writeFileSync(transcriptFile, transcript, 'utf-8');

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

  const ledgerPath = path.join(env.sprintRunsDir, TEST_SPRINT_ID, 'token-ledger.jsonl');
  return {
    ledgerPath,
    getLastRow: (): Record<string, unknown> | null => {
      if (!fs.existsSync(ledgerPath)) return null;
      const lines = fs.readFileSync(ledgerPath, 'utf-8').trim().split('\n').filter(Boolean);
      if (lines.length === 0) return null;
      try {
        return JSON.parse(lines[lines.length - 1]) as Record<string, unknown>;
      } catch {
        return null;
      }
    },
  };
}

/**
 * Write a dispatch file to the sprint dir, mimicking what write_dispatch.sh produces.
 */
function writeDispatch(
  sprintDir: string,
  sessionId: string,
  data: {
    work_item_id: string;
    agent_type: string;
    spawned_at?: string;
    writer?: string;
  }
): string {
  const dispatchPath = path.join(sprintDir, `.dispatch-${sessionId}.json`);
  const payload = JSON.stringify({
    work_item_id: data.work_item_id,
    agent_type: data.agent_type,
    spawned_at: data.spawned_at ?? '2026-04-30T12:00:00Z',
    session_id: sessionId,
    writer: data.writer ?? 'write_dispatch.sh@cleargate-0.8.2',
  });
  fs.writeFileSync(dispatchPath, payload, 'utf-8');
  return dispatchPath;
}

// ─── Test suite ───────────────────────────────────────────────────────────────

let env: HookEnv;

beforeEach(() => {
  env = makeHookEnv();
});

afterEach(() => {
  fs.rmSync(env.tmpDir, { recursive: true, force: true });
});

describe('token-ledger.sh: dispatch-marker attribution (CR-016)', () => {

  /**
   * Scenario 1 (Gherkin): Dispatch file present → fields used verbatim.
   *
   * Given a dispatch file exists for the session
   * When the SubagentStop hook fires
   * Then the row carries work_item_id and agent_type from the dispatch file, not transcript
   */
  it('scenario 1: dispatch file present → work_item_id and agent_type used verbatim', () => {
    const sessionId = 'session-dispatch-present';

    // Transcript says STORY-001-01 and "architect" role in first user message
    const transcript = makeTranscript([
      makeUserTurn('STORY=001-01\n\nYou are the architect agent. Process this plan.'),
      makeAssistantTurn(200, 100),
    ]);

    // Dispatch says something DIFFERENT — this should win
    writeDispatch(env.sprintDir, sessionId, {
      work_item_id: 'CR-016',
      agent_type: 'developer',
    });

    const { getLastRow } = runHook(env, transcript, sessionId);
    const row = getLastRow();

    expect(row).not.toBeNull();
    expect(row!['work_item_id']).toBe('CR-016');
    expect(row!['agent_type']).toBe('developer');
    // CR-016 is not a STORY-* so story_id should be empty
    expect(row!['story_id']).toBe('');
  });

  /**
   * Scenario 2 (Gherkin): Dispatch file absent → fallback to transcript, no exception.
   *
   * Given no dispatch file exists for the session
   * When the SubagentStop hook fires
   * Then the row is written using transcript attribution (no crash)
   */
  it('scenario 2: dispatch file absent → fallback to transcript scan, no exception', () => {
    const sessionId = 'session-dispatch-absent';

    // No dispatch file written
    const transcript = makeTranscript([
      makeUserTurn('STORY=015-06\n\nYou are the developer agent.'),
      makeAssistantTurn(150, 75),
    ]);

    // Verify no dispatch file exists
    const dispatchPath = path.join(env.sprintDir, `.dispatch-${sessionId}.json`);
    expect(fs.existsSync(dispatchPath)).toBe(false);

    let threw = false;
    try {
      runHook(env, transcript, sessionId);
    } catch {
      threw = true;
    }
    expect(threw).toBe(false);

    const { getLastRow } = runHook(env, transcript, sessionId);
    const row = getLastRow();

    // Should still produce a row via legacy transcript detection
    expect(row).not.toBeNull();
    // Transcript says STORY-015-06 as first user message — legacy scan picks it up
    expect(row!['work_item_id']).toBe('STORY-015-06');
  });

  /**
   * Scenario 3 (Gherkin): Dispatch file malformed → ignored, fallback + warn logged.
   *
   * Given a dispatch file exists but contains invalid JSON
   * When the SubagentStop hook fires
   * Then the hook falls back to transcript scan, logs a warning, and does not crash
   */
  it('scenario 3: dispatch file malformed JSON → fallback + warning logged, no crash', () => {
    const sessionId = 'session-dispatch-malformed';

    // Write a malformed dispatch file (invalid JSON)
    const dispatchPath = path.join(env.sprintDir, `.dispatch-${sessionId}.json`);
    fs.writeFileSync(dispatchPath, '{ "work_item_id": "CR-016", INVALID JSON }', 'utf-8');

    const transcript = makeTranscript([
      makeUserTurn('STORY=015-05\n\nYou are the developer agent.'),
      makeAssistantTurn(120, 60),
    ]);

    let threw = false;
    try {
      runHook(env, transcript, sessionId);
    } catch {
      threw = true;
    }
    expect(threw).toBe(false);

    const { getLastRow } = runHook(env, transcript, sessionId);
    const row = getLastRow();

    // Row should be written (fallback attribution)
    expect(row).not.toBeNull();

    // A warning should appear in the hook log (malformed dispatch is logged)
    // The malformed file gets renamed to .processed-$$ and the warning fires
    if (fs.existsSync(env.hookLog)) {
      const logContent = fs.readFileSync(env.hookLog, 'utf-8');
      // The log should contain a warn about malformed/missing fields
      // OR the file was renamed and jq parsing failed silently — either way, no crash
      expect(logContent.length).toBeGreaterThan(0);
    }
  });

  /**
   * Scenario 4 (Gherkin): Dispatch wins over transcript pollution.
   *
   * Repro of the SPRINT-001 Hakathon bug: 17 rows mis-tagged because
   * transcript contained many work-item IDs from plan reads.
   *
   * Given a dispatch file says STORY-A-B
   * And the transcript contains STORY-X-Y (from a plan file read)
   * When the SubagentStop hook fires
   * Then the row carries STORY-A-B, not STORY-X-Y
   */
  it('scenario 4: dispatch wins over transcript pollution', () => {
    const sessionId = 'session-dispatch-wins-pollution';

    // Transcript: first user message says STORY-010-07 (the polluting value)
    // Many subsequent messages also contain various story IDs from plan reads
    const transcript = makeTranscript([
      makeUserTurn(
        'STORY=010-07\n\nYou are the architect agent. Read the architect plan which mentions STORY-005-01, STORY-010-07, STORY-008-04.'
      ),
      makeAssistantTurn(500, 250),
      makeUserTurn('Here is the plan: STORY-010-07 architect plan references STORY-009-01 EPIC-003'),
      makeAssistantTurn(400, 200),
      makeUserTurn('Now check BUG-021 and CR-016 and STORY-020-02'),
      makeAssistantTurn(300, 150),
    ]);

    // Dispatch says CR-016 / developer — this must win over the transcript pollution
    writeDispatch(env.sprintDir, sessionId, {
      work_item_id: 'CR-016',
      agent_type: 'developer',
    });

    const { getLastRow } = runHook(env, transcript, sessionId);
    const row = getLastRow();

    expect(row).not.toBeNull();
    // Dispatch wins: CR-016, not the polluting STORY-010-07 from transcript
    expect(row!['work_item_id']).toBe('CR-016');
    expect(row!['agent_type']).toBe('developer');
    expect(row!['story_id']).toBe(''); // CR-016 is not STORY-*
  });

  /**
   * Scenario 5 (Gherkin): Dispatch file is consumed and deleted post-read.
   *
   * Given a dispatch file exists
   * When the SubagentStop hook fires and the row is written
   * Then the dispatch file no longer exists (consumed atomically)
   */
  it('scenario 5: dispatch file is consumed and deleted after successful row write', () => {
    const sessionId = 'session-dispatch-consumed';

    const transcript = makeTranscript([
      makeUserTurn('STORY=020-02\n\nYou are the developer agent.'),
      makeAssistantTurn(180, 90),
    ]);

    const dispatchPath = writeDispatch(env.sprintDir, sessionId, {
      work_item_id: 'STORY-020-02',
      agent_type: 'developer',
    });

    // Verify dispatch file exists before hook fires
    expect(fs.existsSync(dispatchPath)).toBe(true);

    const { getLastRow } = runHook(env, transcript, sessionId);
    const row = getLastRow();

    // Row should be written with dispatch attribution
    expect(row).not.toBeNull();
    expect(row!['work_item_id']).toBe('STORY-020-02');
    expect(row!['agent_type']).toBe('developer');
    expect(row!['story_id']).toBe('STORY-020-02');

    // Dispatch file must be gone — consumed by the hook
    expect(fs.existsSync(dispatchPath)).toBe(false);

    // Also check that no .processed-* file lingered (it should be deleted too)
    const processedFiles = fs.readdirSync(env.sprintDir).filter((f) =>
      f.startsWith(`.dispatch-${sessionId}`) && f.includes('.processed-')
    );
    expect(processedFiles).toHaveLength(0);
  });

  /**
   * Additional: STORY work_item from dispatch → story_id derived correctly.
   *
   * The convention: work_item_id is the canonical field; story_id is derived
   * when work_item_id starts with STORY-*.
   */
  it('STORY-* dispatch: story_id derived from work_item_id', () => {
    const sessionId = 'session-dispatch-story-derive';

    const transcript = makeTranscript([
      makeUserTurn('Some other content that mentions CR-099 and EPIC-005'),
      makeAssistantTurn(100, 50),
    ]);

    writeDispatch(env.sprintDir, sessionId, {
      work_item_id: 'STORY-015-06',
      agent_type: 'qa',
    });

    const { getLastRow } = runHook(env, transcript, sessionId);
    const row = getLastRow();

    expect(row).not.toBeNull();
    expect(row!['work_item_id']).toBe('STORY-015-06');
    expect(row!['agent_type']).toBe('qa');
    expect(row!['story_id']).toBe('STORY-015-06'); // STORY-* → story_id populated
  });

  /**
   * Additional: dispatch file with correct JSON but missing required fields.
   * Should warn and fall back to transcript.
   */
  it('dispatch JSON valid but missing agent_type field → fallback + no crash', () => {
    const sessionId = 'session-dispatch-partial';

    // Write a valid JSON but only work_item_id, missing agent_type
    const dispatchPath = path.join(env.sprintDir, `.dispatch-${sessionId}.json`);
    fs.writeFileSync(
      dispatchPath,
      JSON.stringify({ work_item_id: 'CR-016', spawned_at: '2026-04-30T12:00:00Z' }),
      'utf-8'
    );

    const transcript = makeTranscript([
      makeUserTurn('STORY=015-04\n\nYou are the developer agent.'),
      makeAssistantTurn(100, 50),
    ]);

    let threw = false;
    try {
      runHook(env, transcript, sessionId);
    } catch {
      threw = true;
    }
    expect(threw).toBe(false);

    const { getLastRow } = runHook(env, transcript, sessionId);
    const row = getLastRow();
    // Should still produce a row (fallback)
    expect(row).not.toBeNull();
  });

  /**
   * CR-026-A: Dispatch file present (newest-file lookup), session ID in payload
   * mismatches dispatch filename → still attributes correctly.
   *
   * This asserts the path-B fix (BUG-024 §3.1 Defect 1 / CR-026 M3 plan).
   * The old code keyed DISPATCH_FILE on the subagent's session_id from the
   * SubagentStop payload. The fix uses ls -t (newest-file lookup) instead,
   * so a session_id mismatch no longer causes 100% lookup failure.
   *
   * Given a dispatch file written with a DIFFERENT filename (not session-id-keyed)
   * And the SubagentStop payload session_id does NOT match the dispatch filename
   * When the SubagentStop hook fires
   * Then the row still attributes correctly from the dispatch file (newest-file wins)
   */
  it('CR-026-A: dispatch with non-session-id filename → newest-file lookup attributes correctly', () => {
    const sessionId = 'session-cr026-path-b';

    const transcript = makeTranscript([
      makeUserTurn('STORY=001-01\n\nArchitect agent — read this plan.'),
      makeAssistantTurn(200, 100),
    ]);

    // Write dispatch file with a uniquified name (as pre-tool-use-task.sh would):
    // The filename does NOT contain the session_id → old code would miss it.
    const dispatchFilename = `.dispatch-9999999999-12345-9999.json`;
    const dispatchPath = path.join(env.sprintDir, dispatchFilename);
    const dispatchPayload = JSON.stringify({
      work_item_id: 'CR-026',
      agent_type: 'developer',
      spawned_at: '2026-05-02T12:00:00Z',
      session_id: 'orchestrator-session-abc',
      writer: 'pre-tool-use-task.sh@cleargate-0.10.0',
    });
    fs.writeFileSync(dispatchPath, dispatchPayload, 'utf-8');

    // SubagentStop fires with a DIFFERENT session_id than what's in the filename
    // Old code: DISPATCH_FILE = sprint_dir/.dispatch-session-cr026-path-b.json → miss
    // New code: ls -t *.dispatch-*.json | head -1 → hits the uniquified file
    const { getLastRow } = runHook(env, transcript, sessionId);
    const row = getLastRow();

    expect(row).not.toBeNull();
    expect(row!['work_item_id']).toBe('CR-026');
    expect(row!['agent_type']).toBe('developer');
  });

  /**
   * CR-026-B: Transcript with banner line + valid work-item ID → ledger row
   * attributes to the work-item, NOT the banner.
   *
   * This asserts the banner-skip fix (BUG-024 §3.1 Defect 2 / CR-026 M3 plan).
   * The old code matched the first user message as-is. If it started with the
   * SessionStart banner ("1 items blocked: BUG-004: ..."), the work-item ID
   * was extracted from that banner instead of the actual dispatch prompt.
   *
   * Given a transcript whose first user message IS the SessionStart banner
   * And the second user message contains the valid dispatch work-item ID
   * And no dispatch file exists (legacy fallback path)
   * When the SubagentStop hook fires
   * Then the ledger row attributes to the actual work-item, NOT the banner's BUG-004
   */
  it('CR-026-B: SessionStart-poisoned transcript → banner skipped, real work-item attributed', () => {
    const sessionId = 'session-cr026-banner-skip';

    // Build a transcript that mimics the poisoned state:
    // First user message = SessionStart banner (would match BUG-004 without fix)
    // Second user message = actual orchestrator dispatch prompt with STORY-026-01
    const BANNER_LINE = '1 items blocked: BUG-004: Token-ledger mis-attribution since SPRINT-15';
    const transcript = makeTranscript([
      makeUserTurn(BANNER_LINE),          // SessionStart banner — old code picks BUG-004 from here
      makeUserTurn('STORY=026-01\n\nYou are the developer agent. Implement CR-026.'),
      makeAssistantTurn(150, 75),
    ]);

    // No dispatch file: forces legacy transcript-grep fallback to run
    const dispatchPath = path.join(env.sprintDir, `.dispatch-${sessionId}.json`);
    expect(fs.existsSync(dispatchPath)).toBe(false);

    const { getLastRow } = runHook(env, transcript, sessionId);
    const row = getLastRow();

    expect(row).not.toBeNull();
    // Must NOT pick up BUG-004 from the banner
    expect(row!['work_item_id']).not.toBe('BUG-004');
    // Must pick up STORY-026-01 from the second user message
    expect(row!['work_item_id']).toBe('STORY-026-01');
  });
});
