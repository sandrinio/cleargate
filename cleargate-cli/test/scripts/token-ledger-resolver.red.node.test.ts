/**
 * token-ledger-resolver.red.node.test.ts — BUG-027 Red tests (QA-Red authored, immutable post-Red).
 *
 * Acceptance scenarios (BUG-027 §5 Verification Protocol + M1.md BUG-027 blueprint):
 *
 *   Scenario 1: Sentinel-first resolution — when .active → SPRINT-NN AND most-recent
 *               dispatch-marker in hook-log names work_item=EPIC-002, resolver MUST return
 *               EPIC-002 even when transcript contains EPIC-001. Currently FAILS because hook
 *               falls through to transcript grep when no dispatch JSON file is present.
 *
 *   Scenario 2: Multi-epic transcript regression — when transcript contains both EPIC-001 and
 *               EPIC-002 (in lexical-first order EPIC-001 comes first), sentinel + dispatch-marker
 *               log line must override transcript grep. Currently FAILS because the hook greps
 *               the transcript and returns EPIC-001 (first match).
 *
 *   Scenario 3: No-sentinel fallback — when .active is absent, fallback path runs but must
 *               prefer the most-recent dispatch-marker log line over the raw transcript grep.
 *               Currently FAILS because without .active the hook uses _off-sprint bucket and
 *               still falls to transcript grep with no prior-ledger-row lookup.
 *
 *   Scenario 4: Snapshot-lock supersede — token-ledger.bug-027.sh must exist as the new
 *               authoritative baseline; hooks-snapshots.test.ts:136 must reference bug-027.sh
 *               not cr-044.sh for byte-equality. Currently FAILS because bug-027.sh does not
 *               exist (not yet created by Developer).
 *
 * BASELINE FAIL CONTRACT:
 *   All 4 scenarios must FAIL on the clean baseline:
 *   - Scenarios 1-2 fail: transcript grep returns EPIC-001 (first lexical match) instead of
 *     EPIC-002 (from prior ledger row / dispatch-marker log line). The hook has no ledger-row
 *     lookup step before transcript grep.
 *   - Scenario 3 fails: no-sentinel path also has no ledger-row lookup; transcript grep
 *     dominates and returns EPIC-001.
 *   - Scenario 4 fails: token-ledger.bug-027.sh does not exist; snapshot assertion would fail.
 *
 * Root cause clarification (M1.md "Gotchas"):
 *   The fallback grep target is ${TRANSCRIPT_PATH} (the orchestrator's transcript), NOT the
 *   archive directory. The 12 EPIC-001 misattributions occurred because EPIC-001 appeared
 *   lexically first in the orchestrator's transcript content (sprint plan read-backs, prior
 *   context) while EPIC-002 was the actual in-scope epic.
 *
 *   The fix (Option A from M1 open decisions): before the transcript grep, read the most-recent
 *   ledger row from ${LEDGER} (the file the hook is about to append to) and reuse its
 *   work_item_id. This correctly attributes orchestrator-architect coordination calls to the
 *   same work item as the last subagent dispatch, which is always the in-scope epic.
 *
 * IMMUTABILITY: this file is sealed post-Red per CR-043 protocol. Devs must NOT modify it.
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Resolve paths: test/scripts/ → up 3 = repo root; hook lives in canonical location
const REPO_ROOT = path.resolve(__dirname, '..', '..', '..');
const HOOK_PATH = path.join(
  REPO_ROOT,
  'cleargate-planning',
  '.claude',
  'hooks',
  'token-ledger.sh'
);
const SNAPSHOTS_DIR = path.join(REPO_ROOT, 'cleargate-cli', 'test', 'snapshots', 'hooks');

// ---------------------------------------------------------------------------
// Transcript & fixture helpers (mirrors token-ledger-attribution.test.ts pattern)
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Fixture environment helpers
// ---------------------------------------------------------------------------

interface HookEnv {
  tmpDir: string;
  sprintRunsDir: string;
  sentinelPath: string;
  hookLogDir: string;
  hookLog: string;
  sprintId: string;
  sprintDir: string;
  ledgerPath: string;
}

const TEST_SPRINT_ID = 'SPRINT-NN';

/** Create a full fixture environment. */
function makeHookEnv(withActiveSentinel = true): HookEnv {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ledger-resolver-bug027-'));
  const sprintRunsDir = path.join(tmpDir, '.cleargate', 'sprint-runs');
  fs.mkdirSync(sprintRunsDir, { recursive: true });
  const sentinelPath = path.join(sprintRunsDir, '.active');
  const hookLogDir = path.join(tmpDir, '.cleargate', 'hook-log');
  fs.mkdirSync(hookLogDir, { recursive: true });
  const hookLog = path.join(hookLogDir, 'token-ledger.log');
  const sprintDir = path.join(sprintRunsDir, TEST_SPRINT_ID);
  fs.mkdirSync(sprintDir, { recursive: true });
  const ledgerPath = path.join(sprintDir, 'token-ledger.jsonl');

  if (withActiveSentinel) {
    fs.writeFileSync(sentinelPath, TEST_SPRINT_ID, 'utf-8');
  }

  return { tmpDir, sprintRunsDir, sentinelPath, hookLogDir, hookLog, sprintId: TEST_SPRINT_ID, sprintDir, ledgerPath };
}

/**
 * Plant a pre-existing ledger row in the sprint's token-ledger.jsonl.
 * This simulates a prior subagent dispatch row that correctly tagged EPIC-002.
 */
function plantLedgerRow(env: HookEnv, workItemId: string, agentType = 'architect'): void {
  const row = JSON.stringify({
    ts: '2026-05-04T23:00:00Z',
    sprint_id: env.sprintId,
    story_id: '',
    work_item_id: workItemId,
    agent_type: agentType,
    session_id: 'prior-session-id',
    transcript: '/tmp/prior-transcript.jsonl',
    sentinel_started_at: '',
    delta_from_turn: 0,
    delta: { input: 100, output: 50, cache_creation: 0, cache_read: 0 },
    session_total: { input: 100, output: 50, cache_creation: 0, cache_read: 0 },
    model: 'claude-sonnet-4-6',
    turns: 1,
  });
  fs.writeFileSync(env.ledgerPath, row + '\n', 'utf-8');
}

/**
 * Plant a dispatch-marker log line in the hook log.
 * Simulates the log line written by the hook when a dispatch file was consumed
 * by a prior SubagentStop fire.
 */
function plantDispatchMarkerLogLine(env: HookEnv, workItemId: string, agentType = 'architect'): void {
  const logLine = `[2026-05-04T23:00:00Z] dispatch-marker: session=prior-session work_item=${workItemId} agent=${agentType}\n`;
  fs.appendFileSync(env.hookLog, logLine, 'utf-8');
}

/**
 * Run the hook with a synthetic transcript against a patched fixture environment.
 * Returns the last ledger row written (or null if ledger is empty/absent).
 */
function runHookAndGetLastRow(
  env: HookEnv,
  transcript: string,
  sessionId = 'test-session-bug027'
): Record<string, unknown> | null {
  const transcriptFile = path.join(env.tmpDir, `transcript-${sessionId}.jsonl`);
  fs.writeFileSync(transcriptFile, transcript, 'utf-8');

  const payload = JSON.stringify({
    session_id: sessionId,
    transcript_path: transcriptFile,
    hook_event_name: 'SubagentStop',
  });

  // Patch REPO_ROOT assignment in the hook copy to point at our tmp fixture.
  const hookContent = fs.readFileSync(HOOK_PATH, 'utf-8');
  const patchedHook = hookContent.replace(
    /^REPO_ROOT=".+?"$/m,
    `REPO_ROOT="${env.tmpDir}"`
  );

  const patchedHookPath = path.join(env.tmpDir, `token-ledger-patched-${sessionId}.sh`);
  fs.writeFileSync(patchedHookPath, patchedHook, { mode: 0o755 });

  try {
    spawnSync('bash', [patchedHookPath], {
      input: payload,
      env: { ...process.env, PATH: process.env.PATH },
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout: 15_000,
    });
  } catch {
    // Hook errors are logged; still check the ledger
  }

  // Pick the ledger path: sentinel present → sprintDir/token-ledger.jsonl; absent → _off-sprint
  const sprintLedger = env.ledgerPath;
  const offSprintLedger = path.join(env.sprintRunsDir, '_off-sprint', 'token-ledger.jsonl');

  let ledgerToRead: string | null = null;
  if (fs.existsSync(sprintLedger)) {
    ledgerToRead = sprintLedger;
  } else if (fs.existsSync(offSprintLedger)) {
    ledgerToRead = offSprintLedger;
  }

  if (!ledgerToRead) return null;

  const lines = fs.readFileSync(ledgerToRead, 'utf-8').trim().split('\n').filter(Boolean);
  if (lines.length === 0) return null;

  try {
    return JSON.parse(lines[lines.length - 1]) as Record<string, unknown>;
  } catch {
    return null;
  }
}

/** Clean up tmp fixture directory. */
function cleanup(env: HookEnv): void {
  fs.rmSync(env.tmpDir, { recursive: true, force: true });
}

// ---------------------------------------------------------------------------
// Scenario 1: Sentinel-first resolution
//
// Fixture: .active → SPRINT-NN; prior ledger row has work_item_id=EPIC-002;
//          dispatch-marker log line says EPIC-002; NO dispatch JSON file.
//          Transcript contains EPIC-001 (from a plan read-back) — the bug source.
//
// Expected (post-fix): last row.work_item_id === "EPIC-002"
// Current behavior (pre-fix): row.work_item_id === "EPIC-001" (transcript grep wins)
//
// This test FAILS on the clean baseline because the hook has no ledger-row lookup step.
// ---------------------------------------------------------------------------

describe('BUG-027 Scenario 1: sentinel-first resolution — prior ledger row overrides transcript grep', () => {
  let env: HookEnv;

  before(() => {
    env = makeHookEnv(true); // .active sentinel present
  });

  after(() => {
    cleanup(env);
  });

  it('resolver returns EPIC-002 (from prior ledger row), NOT EPIC-001 (from transcript)', () => {
    // Plant prior ledger row: a previous subagent dispatch correctly tagged EPIC-002
    plantLedgerRow(env, 'EPIC-002', 'architect');

    // Also plant a dispatch-marker log line for belt-and-suspenders
    plantDispatchMarkerLogLine(env, 'EPIC-002', 'architect');

    // Transcript: NO dispatch ID in the first user message (simulates orchestrator-architect
    // coordination call between subagent dispatches — the exact bug scenario).
    // However, the transcript body contains EPIC-001 references from a prior sprint plan read.
    // EPIC-001 is lexically before EPIC-002, so the raw grep would pick EPIC-001.
    const transcript = makeTranscript([
      makeUserTurn(
        'You are the architect agent. Review the following context for M1 planning. ' +
        'Note: EPIC-001 was completed in SPRINT-01 (see archive/EPIC-001_*.md). ' +
        'The current active epic is EPIC-002.'
      ),
      makeAssistantTurn(200, 150),
      makeUserTurn(
        'Proceed with architecting EPIC-002 stories. Reference: EPIC-001 baseline for context.'
      ),
      makeAssistantTurn(300, 200),
    ]);

    // No dispatch file written (simulates coordination call, not a fresh subagent dispatch)

    const row = runHookAndGetLastRow(env, transcript, 'session-bug027-s1');

    assert.ok(row !== null, 'Expected a ledger row to be written');

    // POST-FIX assertion: resolver should use prior ledger row's work_item_id = EPIC-002.
    // PRE-FIX behavior: hook greps transcript, finds EPIC-001 first (lexically), returns EPIC-001.
    // This assertion FAILS on the clean baseline — that is the intended Red state.
    assert.strictEqual(
      row['work_item_id'],
      'EPIC-002',
      `Expected work_item_id='EPIC-002' from prior ledger row lookup, ` +
      `but got '${row['work_item_id']}'. ` +
      `This is the BUG-027 misattribution: transcript grep returned EPIC-001 ` +
      `(lexically first) instead of using the prior ledger row's attribution.`
    );
  });

  it('resolver does NOT emit "work_item_id fallback grep" in hook log when prior row exists', () => {
    plantLedgerRow(env, 'EPIC-002', 'architect');
    plantDispatchMarkerLogLine(env, 'EPIC-002', 'architect');

    const transcript = makeTranscript([
      makeUserTurn(
        'Orchestrator coordination. EPIC-001 is archived. EPIC-002 is active.'
      ),
      makeAssistantTurn(100, 80),
    ]);

    runHookAndGetLastRow(env, transcript, 'session-bug027-s1b');

    // Post-fix: when ledger row lookup succeeds, we should NOT fall through to the grep
    // fallback (which emits the "work_item_id fallback grep:" log line).
    // Pre-fix: the grep fires and emits the log line (observable misattribution signal).
    if (fs.existsSync(env.hookLog)) {
      const logContent = fs.readFileSync(env.hookLog, 'utf-8');
      // This assertion FAILS on the clean baseline (grep fires and emits the line).
      assert.ok(
        !logContent.includes('work_item_id fallback grep: EPIC-001'),
        `Expected hook log to NOT contain "work_item_id fallback grep: EPIC-001" ` +
        `(that is the BUG-027 symptom), but found it in:\n${logContent}`
      );
    }
  });
});

// ---------------------------------------------------------------------------
// Scenario 2: Multi-epic transcript regression
//
// Fixture: .active → SPRINT-NN; prior ledger row has EPIC-002;
//          transcript explicitly contains BOTH EPIC-001 and EPIC-002 (EPIC-001 first).
//
// Expected (post-fix): work_item_id === "EPIC-002" (from ledger row)
// Current behavior: work_item_id === "EPIC-001" (first match in transcript grep)
//
// This test FAILS on the clean baseline.
// ---------------------------------------------------------------------------

describe('BUG-027 Scenario 2: multi-epic transcript — sentinel+dispatch-marker overrides lexical-first grep', () => {
  let env: HookEnv;

  before(() => {
    env = makeHookEnv(true);
  });

  after(() => {
    cleanup(env);
  });

  it('returns EPIC-002 when transcript has EPIC-001 before EPIC-002 but prior ledger row says EPIC-002', () => {
    // Prior ledger row correctly attributed to EPIC-002
    plantLedgerRow(env, 'EPIC-002', 'developer');

    // Transcript: contains EPIC-001 FIRST, then EPIC-002.
    // This is the exact multi-epic scenario from the dogfood: the sprint plan includes
    // references to prior epics (EPIC-001 depends-on context), making EPIC-001 lexically
    // appear before EPIC-002 in the transcript.
    const transcript = makeTranscript([
      makeUserTurn(
        'Sprint M1 context: This sprint (SPRINT-NN) continues from EPIC-001 (completed). ' +
        'Active scope: EPIC-002. All new stories are under EPIC-002.'
      ),
      makeAssistantTurn(400, 300),
      makeUserTurn(
        'Here are the EPIC-002 stories for this sprint. EPIC-001 context: archived. ' +
        'EPIC-002 blueprint: see pending-sync/EPIC-002_*.md.'
      ),
      makeAssistantTurn(500, 400),
    ]);

    const row = runHookAndGetLastRow(env, transcript, 'session-bug027-s2');

    assert.ok(row !== null, 'Expected a ledger row to be written');

    // POST-FIX: ledger-row lookup returns EPIC-002 before transcript grep runs.
    // PRE-FIX: transcript grep returns EPIC-001 (first lexical match in multi-epic transcript).
    // FAILS on clean baseline.
    assert.strictEqual(
      row['work_item_id'],
      'EPIC-002',
      `Expected work_item_id='EPIC-002' (from prior ledger row), ` +
      `but got '${row['work_item_id']}'. ` +
      `Multi-epic regression: EPIC-001 appears first in transcript ` +
      `(${'"EPIC-001 (completed)"'}) before EPIC-002.`
    );
  });

  it('returns EPIC-002 when transcript mentions EPIC-001 only in archive path references', () => {
    plantLedgerRow(env, 'EPIC-002', 'architect');

    // Worst-case: multiple EPIC-001 mentions vs a single EPIC-002 mention
    const transcript = makeTranscript([
      makeUserTurn(
        'Read archive/EPIC-001_Knowledge_Wiki.md. Cross-check with EPIC-001 stories done in SPRINT-04.'
      ),
      makeAssistantTurn(200, 100),
      makeUserTurn('Summary of EPIC-001 complete. Now plan EPIC-002 stories.'),
      makeAssistantTurn(300, 200),
    ]);

    const row = runHookAndGetLastRow(env, transcript, 'session-bug027-s2b');

    assert.ok(row !== null, 'Expected a ledger row to be written');

    // POST-FIX: EPIC-002 from prior ledger row wins.
    // PRE-FIX: EPIC-001 wins (more occurrences, lexically first, grep first-match).
    // FAILS on clean baseline.
    assert.strictEqual(
      row['work_item_id'],
      'EPIC-002',
      `Expected work_item_id='EPIC-002' but got '${row['work_item_id']}'. ` +
      `Transcript had multiple EPIC-001 references vs one EPIC-002 reference.`
    );
  });
});

// ---------------------------------------------------------------------------
// Scenario 3: No-sentinel fallback
//
// Fixture: NO .active sentinel; transcript contains EPIC-001 and EPIC-002;
//          the hook-log already has a dispatch-marker line naming EPIC-002.
//
// Expected (post-fix): the fallback path uses dispatch-marker log line, returns EPIC-002
//   (or at minimum does NOT return EPIC-001 when EPIC-002 also appears in transcript).
// Current behavior: no .active → _off-sprint bucket; transcript grep → EPIC-001.
//
// The M1 plan states: "No-sentinel fallback — when .active is absent, fallback path runs
// but prefers dispatch-marker over transcript grep."
//
// This test FAILS on the clean baseline.
// ---------------------------------------------------------------------------

describe('BUG-027 Scenario 3: no-sentinel fallback — dispatch-marker log overrides transcript grep', () => {
  let env: HookEnv;

  before(() => {
    // withActiveSentinel=false — no .active file
    env = makeHookEnv(false);
    // Create the _off-sprint ledger directory (hook will mkdir -p it)
    const offSprintDir = path.join(env.sprintRunsDir, '_off-sprint');
    fs.mkdirSync(offSprintDir, { recursive: true });
  });

  after(() => {
    cleanup(env);
  });

  it('returns work_item_id from dispatch-marker log, not transcript grep, when .active is absent', () => {
    // Plant dispatch-marker log line naming EPIC-002 (from a prior fire that DID have a dispatch JSON)
    plantDispatchMarkerLogLine(env, 'EPIC-002', 'architect');

    // Transcript: EPIC-001 appears first (the bug pattern)
    const transcript = makeTranscript([
      makeUserTurn(
        'No active sprint. Context: EPIC-001 is the first epic we shipped. ' +
        'EPIC-002 work is ongoing.'
      ),
      makeAssistantTurn(150, 100),
    ]);

    const row = runHookAndGetLastRow(env, transcript, 'session-bug027-s3');

    assert.ok(row !== null, 'Expected a ledger row to be written (in _off-sprint)');

    // POST-FIX: dispatch-marker log line read for EPIC-002 attribution.
    // PRE-FIX: transcript grep → EPIC-001.
    // FAILS on clean baseline.
    assert.strictEqual(
      row['work_item_id'],
      'EPIC-002',
      `Expected work_item_id='EPIC-002' (from dispatch-marker log line), ` +
      `but got '${row['work_item_id']}'. ` +
      `No-sentinel path still fell through to transcript grep and returned EPIC-001.`
    );
  });

  it('_off-sprint bucket row was written (not silently dropped)', () => {
    const transcript = makeTranscript([
      makeUserTurn('Off-sprint context: EPIC-001 mentioned.'),
      makeAssistantTurn(100, 50),
    ]);

    const row = runHookAndGetLastRow(env, transcript, 'session-bug027-s3b');

    // Basic sanity: row must be written even without .active
    assert.ok(row !== null, 'Expected a row in _off-sprint bucket even without .active sentinel');
    assert.strictEqual(
      row['sprint_id'],
      '_off-sprint',
      `Expected sprint_id='_off-sprint' but got '${row['sprint_id']}'`
    );
  });
});

// ---------------------------------------------------------------------------
// Scenario 4: Snapshot-lock supersede
//
// The Developer must:
//   (a) Create cleargate-cli/test/snapshots/hooks/token-ledger.bug-027.sh
//   (b) Update hooks-snapshots.test.ts line 136 to assert live == bug-027.sh (not cr-044.sh)
//   (c) Demote cr-044 assertion to existence-only
//
// This test asserts the new baseline file exists. FAILS on clean baseline because
// token-ledger.bug-027.sh has not been created yet.
// ---------------------------------------------------------------------------

describe('BUG-027 Scenario 4: snapshot-lock supersede — token-ledger.bug-027.sh must exist', () => {
  it('token-ledger.bug-027.sh snapshot file exists (new authoritative baseline)', () => {
    const snapshotPath = path.join(SNAPSHOTS_DIR, 'token-ledger.bug-027.sh');

    // POST-FIX: Developer cp's the updated hook to this path.
    // PRE-FIX: file does not exist.
    // FAILS on clean baseline.
    assert.ok(
      fs.existsSync(snapshotPath),
      `token-ledger.bug-027.sh not found at ${snapshotPath}. ` +
      `Developer must run: cp cleargate-planning/.claude/hooks/token-ledger.sh ` +
      `cleargate-cli/test/snapshots/hooks/token-ledger.bug-027.sh ` +
      `after implementing the BUG-027 fix.`
    );
  });

  it('live hook matches bug-027.sh snapshot byte-for-byte', () => {
    const livePath = path.join(
      REPO_ROOT,
      'cleargate-planning',
      '.claude',
      'hooks',
      'token-ledger.sh'
    );
    const snapshotPath = path.join(SNAPSHOTS_DIR, 'token-ledger.bug-027.sh');

    assert.ok(fs.existsSync(livePath), `live hook not found: ${livePath}`);

    // FAILS on clean baseline: bug-027.sh does not exist.
    assert.ok(
      fs.existsSync(snapshotPath),
      `BUG-027 snapshot not found: ${snapshotPath}`
    );

    const live = fs.readFileSync(livePath);
    const snapshot = fs.readFileSync(snapshotPath);

    // FAILS if hook was updated (BUG-027 fix applied) but snapshot not regenerated,
    // OR if snapshot does not yet exist.
    assert.ok(
      live.equals(snapshot),
      `Live hook does not match token-ledger.bug-027.sh byte-for-byte. ` +
      `After applying the BUG-027 fix, run: ` +
      `cp cleargate-planning/.claude/hooks/token-ledger.sh ` +
      `cleargate-cli/test/snapshots/hooks/token-ledger.bug-027.sh`
    );
  });

  it('cr-044 snapshot still exists (demoted to existence-only, not deleted)', () => {
    const cr044Path = path.join(SNAPSHOTS_DIR, 'token-ledger.cr-044.sh');
    // The cr-044 file must NOT be deleted — it is demoted to existence-only per M1 plan.
    assert.ok(
      fs.existsSync(cr044Path),
      `token-ledger.cr-044.sh must still exist (historical baseline, existence-only check). ` +
      `Do not delete it — demote the byte-equality assertion only.`
    );
  });
});
