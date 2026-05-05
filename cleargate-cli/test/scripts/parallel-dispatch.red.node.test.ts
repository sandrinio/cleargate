/**
 * parallel-dispatch.red.node.test.ts — BUG-029 Red tests (QA-Red authored, immutable post-Red).
 *
 * Root cause (BUG-029 §6 Spike Findings):
 *
 *   1. `write_dispatch.sh:110` — DISPATCH_TARGET="${SPRINT_DIR}/.dispatch-${SESSION_ID}.json"
 *      Single filename per orchestrator session. Two parallel Task() spawns from the same
 *      session compute identical target paths; the atomic mv at line 130 makes the second
 *      write silently overwrite the first.
 *
 *   2. `pending-task-sentinel.sh:186` — SENTINEL_FILE="${SPRINT_DIR}/.pending-task-${TURN_INDEX}.json"
 *      Two Agent calls in a single assistant message share one turn_index; both sentinels
 *      collide on the same filename, second overwrites first.
 *
 *   3. `token-ledger.sh:121` — newest-file lookup (ls -t .dispatch-*.json | head -1).
 *      When two dispatch markers exist in the sprint dir (one per story), the SubagentStop
 *      for STORY-A reads whichever file is newest — may grab STORY-B's marker, mis-attributing
 *      the ledger row.
 *
 * Acceptance scenarios (BUG-029 §5 Verification Protocol + Spike §6):
 *
 *   Scenario 1 — write_dispatch parallel call collision:
 *     Two invocations of write_dispatch.sh with the same CLAUDE_SESSION_ID must each
 *     produce a DISTINCT on-disk dispatch marker. Pre-fix: second invocation overwrites
 *     the first; only one file survives.
 *
 *   Scenario 2 — pending-task-sentinel parallel turn collision:
 *     Two sentinel writes at the same TURN_INDEX must each produce a distinct sentinel.
 *     Pre-fix: the second write overwrites the first (identical filename keyed by turn_index).
 *
 *   Scenario 3 — token-ledger SubagentStop matches by (work_item, agent) tuple:
 *     Fixture: two dispatch markers on disk in the same sprint dir (STORY-A and STORY-B,
 *     same session). SubagentStop fires for STORY-A's developer. Hook must read STORY-A's
 *     marker, not STORY-B's. Pre-fix: newest-file lookup grabs STORY-B's marker (written
 *     last), so the ledger row is mis-attributed.
 *
 * BASELINE FAIL CONTRACT:
 *   Scenario 1 FAILS: two calls with same SESSION_ID → same target filename → only one file,
 *     count != 2, STORY-B's content overwrites STORY-A's.
 *   Scenario 2 FAILS: two writes with same TURN_INDEX → same filename → only one file.
 *   Scenario 3 FAILS: newest-file lookup returns STORY-B's marker, not STORY-A's, when
 *     STORY-B's file is newer on disk (written last).
 *
 * IMMUTABILITY: this file is sealed post-Red per CR-043 protocol. Devs must NOT modify it.
 * QA-RED AMEND (round 2, 2026-05-05): CR-043 overridden for structural-error fix in Scenario 2 Test 1.
 *   Scenario 2 Test 1 now invokes pending-task-sentinel.sh directly (Option A) instead of
 *   fs.writeFileSync, so the hook collision is observable. Other scenarios unchanged.
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

// Resolve repo root: cleargate-cli/test/scripts/ → up 3 → repo root
const REPO_ROOT = path.resolve(__dirname, '..', '..', '..');
const WRITE_DISPATCH_SCRIPT = path.join(REPO_ROOT, '.cleargate', 'scripts', 'write_dispatch.sh');
const TOKEN_LEDGER_HOOK = path.join(
  REPO_ROOT,
  'cleargate-planning',
  '.claude',
  'hooks',
  'token-ledger.sh',
);
const SENTINEL_SCRIPT = path.join(
  REPO_ROOT,
  'cleargate-planning',
  '.claude',
  'hooks',
  'pending-task-sentinel.sh',
);

// ---------------------------------------------------------------------------
// Shared fixture helpers
// ---------------------------------------------------------------------------

interface FixtureEnv {
  tmpDir: string;
  sprintRunsDir: string;
  sprintDir: string;
  hookLogDir: string;
  hookLog: string;
  ledgerPath: string;
}

const TEST_SPRINT_ID = 'SPRINT-BUG029';

/**
 * Create a minimal ClearGate fixture repo with an active sprint sentinel.
 * Returns paths to the key directories/files.
 */
function makeFixtureEnv(): FixtureEnv {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cg-bug029-'));
  const sprintRunsDir = path.join(tmpDir, '.cleargate', 'sprint-runs');
  const sprintDir = path.join(sprintRunsDir, TEST_SPRINT_ID);
  const hookLogDir = path.join(tmpDir, '.cleargate', 'hook-log');

  fs.mkdirSync(sprintRunsDir, { recursive: true });
  fs.mkdirSync(sprintDir, { recursive: true });
  fs.mkdirSync(hookLogDir, { recursive: true });

  // Write .active sentinel
  fs.writeFileSync(path.join(sprintRunsDir, '.active'), TEST_SPRINT_ID, 'utf-8');

  // Write a minimal package.json so write_dispatch.sh can read the version
  const pkgJsonDir = path.join(tmpDir, 'cleargate-cli');
  fs.mkdirSync(pkgJsonDir, { recursive: true });
  fs.writeFileSync(
    path.join(pkgJsonDir, 'package.json'),
    JSON.stringify({ version: '0.11.3-test' }),
    'utf-8',
  );

  const hookLog = path.join(hookLogDir, 'write_dispatch.log');
  const ledgerPath = path.join(sprintDir, 'token-ledger.jsonl');

  return { tmpDir, sprintRunsDir, sprintDir, hookLogDir, hookLog, ledgerPath };
}

/** Recursively remove fixture dir. */
function cleanupFixture(env: FixtureEnv): void {
  fs.rmSync(env.tmpDir, { recursive: true, force: true });
}

/**
 * Invoke write_dispatch.sh once with given args + shared session ID.
 * Returns { status, stdout, stderr, dispatchFiles } where dispatchFiles are all
 * .dispatch-*.json files present in sprintDir after the call.
 */
function invokeWriteDispatch(
  env: FixtureEnv,
  workItemId: string,
  agentType: string,
  sessionId: string,
): { status: number; stdout: string; stderr: string } {
  const result = spawnSync('bash', [WRITE_DISPATCH_SCRIPT, workItemId, agentType], {
    encoding: 'utf8',
    timeout: 10_000,
    env: {
      ...process.env,
      ORCHESTRATOR_PROJECT_DIR: env.tmpDir,
      CLAUDE_SESSION_ID: sessionId,
    },
  });
  return {
    status: result.status ?? -1,
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
  };
}

/**
 * List all .dispatch-*.json files currently in the sprint dir.
 */
function listDispatchFiles(env: FixtureEnv): string[] {
  return fs
    .readdirSync(env.sprintDir)
    .filter((f) => f.startsWith('.dispatch-') && f.endsWith('.json'))
    .map((f) => path.join(env.sprintDir, f));
}

/**
 * Read content of a dispatch JSON file.
 */
function readDispatchFile(filePath: string): Record<string, unknown> {
  return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as Record<string, unknown>;
}

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

/**
 * Run the token-ledger SubagentStop hook against a patched fixture environment.
 * Patches REPO_ROOT in the hook copy to point at our fixture tmpDir.
 * Returns the last ledger row appended (or null if none).
 */
function runTokenLedgerHook(
  env: FixtureEnv,
  transcript: string,
  sessionId: string,
): Record<string, unknown> | null {
  const transcriptFile = path.join(env.tmpDir, `transcript-${sessionId}.jsonl`);
  fs.writeFileSync(transcriptFile, transcript, 'utf-8');

  const payload = JSON.stringify({
    session_id: sessionId,
    transcript_path: transcriptFile,
    hook_event_name: 'SubagentStop',
  });

  // Patch the hook: replace the REPO_ROOT assignment so it uses our tmp fixture.
  const hookContent = fs.readFileSync(TOKEN_LEDGER_HOOK, 'utf-8');
  const patchedHook = hookContent.replace(
    /^REPO_ROOT=".+?"$/m,
    `REPO_ROOT="${env.tmpDir}"`,
  );

  const patchedHookPath = path.join(env.tmpDir, `token-ledger-patched-${sessionId}.sh`);
  fs.writeFileSync(patchedHookPath, patchedHook, { mode: 0o755 });

  // Delete NODE_TEST_CONTEXT so nested child processes don't see it and silently skip
  // (per flashcard 2026-05-04 #node-test #child-process).
  const childEnv = { ...process.env };
  delete childEnv['NODE_TEST_CONTEXT'];

  spawnSync('bash', [patchedHookPath], {
    input: payload,
    env: childEnv,
    stdio: ['pipe', 'pipe', 'pipe'],
    timeout: 15_000,
  });

  if (!fs.existsSync(env.ledgerPath)) return null;

  const lines = fs.readFileSync(env.ledgerPath, 'utf-8').trim().split('\n').filter(Boolean);
  if (lines.length === 0) return null;

  try {
    return JSON.parse(lines[lines.length - 1]) as Record<string, unknown>;
  } catch {
    return null;
  }
}

// ===========================================================================
// Scenario 1 — write_dispatch.sh parallel call collision
//
// Two invocations with the same CLAUDE_SESSION_ID must each produce a distinct
// on-disk dispatch marker file.
//
// Expected (post-fix): 2 distinct .dispatch-*.json files in sprintDir, each
//   with its own work_item_id.
// Pre-fix behavior: DISPATCH_TARGET="${SPRINT_DIR}/.dispatch-${SESSION_ID}.json"
//   — same filename for both calls; second mv overwrites first; only 1 file
//   survives and it has STORY-B's content.
//
// This test FAILS on the clean baseline.
// ===========================================================================

describe('BUG-029 Scenario 1: write_dispatch.sh parallel-session collision', () => {
  let env: FixtureEnv;

  before(() => {
    env = makeFixtureEnv();
  });

  after(() => {
    cleanupFixture(env);
  });

  it('two parallel write_dispatch.sh calls with same SESSION_ID produce two distinct dispatch files', () => {
    const sharedSessionId = 'orch-session-bug029-s1';

    // First call — STORY-A developer dispatch
    const r1 = invokeWriteDispatch(env, 'STORY-A', 'developer', sharedSessionId);
    assert.strictEqual(
      r1.status,
      0,
      `write_dispatch.sh STORY-A failed with exit ${r1.status}. stderr: ${r1.stderr}`,
    );

    // Second call — STORY-B developer dispatch (same session ID — parallel Task() pattern)
    const r2 = invokeWriteDispatch(env, 'STORY-B', 'developer', sharedSessionId);
    assert.strictEqual(
      r2.status,
      0,
      `write_dispatch.sh STORY-B failed with exit ${r2.status}. stderr: ${r2.stderr}`,
    );

    const dispatchFiles = listDispatchFiles(env);

    // POST-FIX assertion: each call must create its own file → 2 distinct files.
    // PRE-FIX behavior: DISPATCH_TARGET is keyed on SESSION_ID alone → both calls target
    //   ".dispatch-orch-session-bug029-s1.json"; second mv overwrites first → only 1 file.
    // This assertion FAILS on the clean baseline.
    assert.strictEqual(
      dispatchFiles.length,
      2,
      `Expected 2 distinct dispatch files (one per parallel Task dispatch), ` +
        `but found ${dispatchFiles.length}. ` +
        `This is the BUG-029 collision: write_dispatch.sh:110 uses ` +
        `'.dispatch-\${SESSION_ID}.json' (single filename), so the second ` +
        `mv silently overwrites the first. ` +
        `Existing files: ${JSON.stringify(dispatchFiles.map((f) => path.basename(f)))}`,
    );
  });

  it('each dispatch file contains the correct work_item_id for its story', () => {
    const sharedSessionId = 'orch-session-bug029-s1b';

    // Write both dispatches
    invokeWriteDispatch(env, 'STORY-A', 'developer', sharedSessionId);
    invokeWriteDispatch(env, 'STORY-B', 'developer', sharedSessionId);

    const dispatchFiles = listDispatchFiles(env);

    // Skip content check if the collision already collapsed to 1 file
    // (the count test above already caught that; here we assert both IDs are present)
    const workItemIds = dispatchFiles
      .map((f) => {
        try {
          return readDispatchFile(f)['work_item_id'] as string;
        } catch {
          return '';
        }
      })
      .filter(Boolean);

    // POST-FIX: both STORY-A and STORY-B IDs must be present.
    // PRE-FIX: only STORY-B (the second write) survives; STORY-A is overwritten.
    // This assertion FAILS on the clean baseline.
    assert.ok(
      workItemIds.includes('STORY-A'),
      `Expected dispatch file for STORY-A to survive, but found only: ${JSON.stringify(workItemIds)}. ` +
        `BUG-029: the first dispatch marker was overwritten by the second.`,
    );
    assert.ok(
      workItemIds.includes('STORY-B'),
      `Expected dispatch file for STORY-B to be present, but found only: ${JSON.stringify(workItemIds)}.`,
    );
  });
});

// ===========================================================================
// Scenario 2 — pending-task-sentinel.sh parallel turn collision
//
// Two sentinel writes with the same TURN_INDEX must produce two distinct files.
//
// The pending-task-sentinel.sh hook writes:
//   ${SPRINT_DIR}/.pending-task-${TURN_INDEX}.json
//
// When two Agent calls fire in the same assistant message, both see the same
// TURN_INDEX (count of assistant turns at dispatch time).  The second write's
// `mv` silently overwrites the first → only one sentinel survives.
//
// This test directly simulates the file-write collision without spawning the
// hook (hook requires stdin pipe + live Claude session state not available in
// tests). We write two JSON files at the same TURN_INDEX to verify the naming
// scheme allows or prevents collision.
//
// Expected (post-fix): filename includes uniquifier beyond TURN_INDEX
//   (e.g. ".pending-task-0-$$-RANDOM.json") → 2 distinct files.
// Pre-fix: ".pending-task-0.json" — second write overwrites first → 1 file.
//
// This test FAILS on the clean baseline because the sentinel naming scheme
// does not include a uniquifier beyond TURN_INDEX.
// ===========================================================================

describe('BUG-029 Scenario 2: pending-task-sentinel TURN_INDEX collision', () => {
  let env: FixtureEnv;

  before(() => {
    env = makeFixtureEnv();
  });

  after(() => {
    cleanupFixture(env);
  });

  it('two sentinel writes at the same TURN_INDEX produce two distinct files (not one overwrite)', () => {
    // QA-RED AMEND (2026-05-05): invoke pending-task-sentinel.sh directly (Option A)
    // instead of fs.writeFileSync. This lets the hook collision be observable: pre-fix
    // the hook writes .pending-task-0.json for BOTH calls (overwrite → 1 file); post-fix
    // the hook appends a uniquifier (e.g. PID+RANDOM) so both coexist (2 files).
    //
    // Both calls share the same transcript (0 assistant turns → TURN_INDEX=0).
    // SKIP_FLASHCARD_GATE=1 bypasses the flashcard gate (no STORY-*-dev.md in fixture).
    //
    // POST-FIX assertion: 2 distinct .pending-task-*.json files.
    // PRE-FIX behavior: 1 file (second hook invocation overwrites first).
    // This test FAILS on the clean baseline.

    // Create a minimal transcript with 0 assistant turns so TURN_INDEX=0 for both calls.
    const transcriptPath = path.join(env.tmpDir, 'transcript-sentinel-s2t1.jsonl');
    fs.writeFileSync(
      transcriptPath,
      JSON.stringify({ type: 'user', message: { content: 'trigger' } }) + '\n',
      'utf-8',
    );

    const childEnv = {
      ...process.env,
      ORCHESTRATOR_PROJECT_DIR: env.tmpDir,
      SKIP_FLASHCARD_GATE: '1',
      // Clear NODE_TEST_CONTEXT so nested bash children don't see test context.
      NODE_TEST_CONTEXT: undefined as unknown as string,
    };
    // Remove NODE_TEST_CONTEXT entirely from the env object.
    delete childEnv['NODE_TEST_CONTEXT'];

    // Build hook input payloads for STORY-A and STORY-B.
    const payloadA = JSON.stringify({
      hook_event_name: 'PreToolUse',
      tool_name: 'Task',
      session_id: 'session-s2-a',
      transcript_path: transcriptPath,
      tool_input: {
        subagent_type: 'developer',
        prompt: 'STORY=STORY-A\nImplement feature A.',
        description: 'Developer for STORY-A',
      },
    });
    const payloadB = JSON.stringify({
      hook_event_name: 'PreToolUse',
      tool_name: 'Task',
      session_id: 'session-s2-b',
      transcript_path: transcriptPath,
      tool_input: {
        subagent_type: 'developer',
        prompt: 'STORY=STORY-B\nImplement feature B.',
        description: 'Developer for STORY-B',
      },
    });

    // First hook fire — STORY-A Task dispatch
    const rA = spawnSync('bash', [SENTINEL_SCRIPT], {
      input: payloadA,
      encoding: 'utf8',
      timeout: 10_000,
      env: childEnv,
    });
    assert.strictEqual(
      rA.status,
      0,
      `pending-task-sentinel.sh (STORY-A) exited ${rA.status}. stderr: ${rA.stderr}`,
    );

    // Second hook fire — STORY-B Task dispatch (same TURN_INDEX=0, same transcript)
    const rB = spawnSync('bash', [SENTINEL_SCRIPT], {
      input: payloadB,
      encoding: 'utf8',
      timeout: 10_000,
      env: childEnv,
    });
    assert.strictEqual(
      rB.status,
      0,
      `pending-task-sentinel.sh (STORY-B) exited ${rB.status}. stderr: ${rB.stderr}`,
    );

    const sentinelFiles = fs
      .readdirSync(env.sprintDir)
      .filter((f) => f.startsWith('.pending-task-') && f.endsWith('.json'));

    assert.strictEqual(
      sentinelFiles.length,
      2,
      `Expected 2 distinct sentinel files for two parallel Task() dispatches at TURN_INDEX=0, ` +
        `but found ${sentinelFiles.length}. ` +
        `This is the BUG-029 pending-task collision: pending-task-sentinel.sh:186 uses ` +
        `'.pending-task-\${TURN_INDEX}.json', so two parallel Task() calls in the same ` +
        `assistant message share the same filename; the second mv silently overwrites the first. ` +
        `Fix: add uniquifier suffix (e.g. \${TURN_INDEX}-\$\$-\${RANDOM}) to the sentinel filename.`,
    );
  });

  it('surviving sentinel after collision contains STORY-B (second write wins — first attribution lost)', () => {
    const TURN_INDEX = 1;
    const collisionName = path.join(env.sprintDir, `.pending-task-${TURN_INDEX}.json`);

    const sentinelA = JSON.stringify({
      agent_type: 'developer',
      work_item_id: 'STORY-A',
      turn_index: TURN_INDEX,
      started_at: '2026-05-05T00:42:33Z',
    });
    const sentinelB = JSON.stringify({
      agent_type: 'developer',
      work_item_id: 'STORY-B',
      turn_index: TURN_INDEX,
      started_at: '2026-05-05T00:42:33Z',
    });

    fs.writeFileSync(collisionName, sentinelA, 'utf-8');
    fs.writeFileSync(collisionName, sentinelB, 'utf-8'); // overwrites

    const content = JSON.parse(fs.readFileSync(collisionName, 'utf-8')) as Record<
      string,
      unknown
    >;

    // Pre-fix: second write wins → STORY-B survives; STORY-A attribution is silently lost.
    // This test DOCUMENTS the bug (doesn't assert the post-fix state), so it PASSES on
    // clean baseline — it simply confirms the silent overwrite behaviour.
    // However, combined with the count-test above, the overall scenario is "FAIL" because
    // a correct implementation would prevent the overwrite entirely.
    assert.strictEqual(
      content['work_item_id'],
      'STORY-B',
      `Expected the surviving sentinel to contain STORY-B (second write), ` +
        `but got '${content['work_item_id']}'. The overwrite pattern is different from expected.`,
    );
    // Belt-and-suspenders: confirm STORY-A's attribution is gone.
    // Post-fix: this assertion becomes meaningless (both files exist); pre-fix it passes.
    assert.notEqual(
      content['work_item_id'],
      'STORY-A',
      `STORY-A must NOT be the surviving content — A was overwritten by B.`,
    );
  });
});

// ===========================================================================
// Scenario 3 — token-ledger SubagentStop matches by (work_item, agent) tuple
//
// Fixture: two dispatch markers on disk in the same sprint dir — one for
//   STORY-A (written first, older mtime) and one for STORY-B (written last,
//   newer mtime). Both are valid JSON with correct work_item_id and agent_type.
//
// SubagentStop fires for STORY-A's developer. The transcript's first user
//   message says "STORY=A developer" (orchestrator dispatch prompt for STORY-A).
//
// Expected (post-fix): hook reads STORY-A's marker (matches by work_item_id
//   extracted from transcript), ledger row work_item_id === "STORY-A".
//
// Pre-fix behavior: token-ledger.sh:121 uses newest-file lookup
//   (ls -t .dispatch-*.json | head -1) — grabs STORY-B's marker because it
//   was written last (newer mtime); ledger row work_item_id === "STORY-B".
//   This is a mis-attribution.
//
// This test FAILS on the clean baseline because the hook uses mtime-based
// lookup rather than content-based (work_item_id, agent_type) matching.
// ===========================================================================

describe('BUG-029 Scenario 3: token-ledger SubagentStop matches dispatch marker by (work_item, agent) tuple', () => {
  let env: FixtureEnv;

  before(() => {
    env = makeFixtureEnv();
  });

  after(() => {
    cleanupFixture(env);
  });

  it('hook attributes the ledger row to STORY-A, not STORY-B, when STORY-A dispatch fires SubagentStop', () => {
    // Write STORY-A dispatch first (older mtime — will NOT be newest-file result)
    const dispatchA = path.join(env.sprintDir, '.dispatch-1746403353-1001-1111.json');
    fs.writeFileSync(
      dispatchA,
      JSON.stringify({
        work_item_id: 'STORY-A',
        agent_type: 'developer',
        spawned_at: '2026-05-05T00:42:33Z',
        session_id: 'orch-session-bug029',
        writer: 'write_dispatch.sh@cleargate-0.11.3',
      }),
      'utf-8',
    );

    // Ensure STORY-A's file has an older mtime by sleeping briefly
    // (file system mtime granularity is typically 1s on macOS HFS+)
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 50); // ~50ms pause

    // Write STORY-B dispatch second (newer mtime — IS the newest-file result)
    const dispatchB = path.join(env.sprintDir, '.dispatch-1746403353-1002-2222.json');
    fs.writeFileSync(
      dispatchB,
      JSON.stringify({
        work_item_id: 'STORY-B',
        agent_type: 'developer',
        spawned_at: '2026-05-05T00:42:33Z',
        session_id: 'orch-session-bug029',
        writer: 'write_dispatch.sh@cleargate-0.11.3',
      }),
      'utf-8',
    );

    // Build a transcript where the first user message is the orchestrator's dispatch
    // prompt for STORY-A (the SubagentStop fires for STORY-A's subagent).
    const transcript = makeTranscript([
      makeUserTurn(
        // The orchestrator dispatch prompt for STORY-A — contains STORY-A's work_item_id.
        // This is how the hook should identify which dispatch marker to consume.
        'STORY=A\nMode: VERIFY\nYou are the developer for STORY-A. Implement the feature.',
      ),
      makeAssistantTurn(200, 150),
      makeUserTurn('Additional context for STORY-A. Reference STORY-B only for cross-check.'),
      makeAssistantTurn(300, 200),
    ]);

    // Run the SubagentStop hook for STORY-A's session
    const row = runTokenLedgerHook(env, transcript, 'session-story-a-dev');

    assert.ok(row !== null, 'Expected a ledger row to be written by the SubagentStop hook');

    // POST-FIX assertion: hook must match the dispatch marker by (work_item_id, agent_type)
    //   from the transcript → consume STORY-A's .dispatch-...-1001-1111.json.
    //   ledger row.work_item_id must be "STORY-A".
    //
    // PRE-FIX behavior: newest-file lookup (ls -t | head -1) picks STORY-B's file
    //   (written last, newer mtime) → row.work_item_id === "STORY-B" — mis-attribution.
    //
    // This assertion FAILS on the clean baseline.
    assert.strictEqual(
      row['work_item_id'],
      'STORY-A',
      `Expected ledger row work_item_id='STORY-A' (SubagentStop fired for STORY-A's developer), ` +
        `but got '${row['work_item_id']}'. ` +
        `This is the BUG-029 mis-attribution: token-ledger.sh:121 uses newest-file lookup ` +
        `(ls -t .dispatch-*.json | head -1), which grabbed STORY-B's marker because ` +
        `STORY-B was written last (newer mtime). ` +
        `Fix: replace newest-file lookup with content-based matching on (work_item_id, agent_type) ` +
        `extracted from the SubagentStop transcript's first user message.`,
    );
  });

  it('STORY-B dispatch marker remains on disk after STORY-A SubagentStop consumes only STORY-A marker', () => {
    // After Scenario 3's fix, consuming STORY-A's dispatch marker must NOT accidentally
    // delete or consume STORY-B's marker (which belongs to a different parallel subagent).

    // Reset: clean sprint dir for this test, write fresh markers.
    const sprintFiles = fs.readdirSync(env.sprintDir);
    for (const f of sprintFiles) {
      if (f.startsWith('.dispatch-')) {
        fs.rmSync(path.join(env.sprintDir, f), { force: true });
      }
    }
    // Clear ledger
    if (fs.existsSync(env.ledgerPath)) {
      fs.rmSync(env.ledgerPath, { force: true });
    }

    const dispatchA2 = path.join(env.sprintDir, '.dispatch-1746403400-2001-3333.json');
    fs.writeFileSync(
      dispatchA2,
      JSON.stringify({
        work_item_id: 'STORY-A',
        agent_type: 'developer',
        spawned_at: '2026-05-05T00:43:20Z',
        session_id: 'orch-session-bug029-2',
        writer: 'write_dispatch.sh@cleargate-0.11.3',
      }),
      'utf-8',
    );

    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 50); // ensure mtime ordering

    const dispatchB2 = path.join(env.sprintDir, '.dispatch-1746403400-2002-4444.json');
    fs.writeFileSync(
      dispatchB2,
      JSON.stringify({
        work_item_id: 'STORY-B',
        agent_type: 'developer',
        spawned_at: '2026-05-05T00:43:20Z',
        session_id: 'orch-session-bug029-2',
        writer: 'write_dispatch.sh@cleargate-0.11.3',
      }),
      'utf-8',
    );

    // SubagentStop fires for STORY-A
    const transcript = makeTranscript([
      makeUserTurn('STORY=A developer dispatch. Implement STORY-A.'),
      makeAssistantTurn(100, 80),
    ]);
    runTokenLedgerHook(env, transcript, 'session-story-a-dev-2');

    // POST-FIX: only STORY-A's dispatch file was consumed; STORY-B's must remain.
    // PRE-FIX: newest-file lookup consumed STORY-B's file (the newest) — STORY-B's
    //   marker is gone and STORY-B will have no attribution when its SubagentStop fires.
    //
    // This assertion FAILS on the clean baseline.
    const remainingDispatchFiles = listDispatchFiles(env);
    const remainingWorkItems = remainingDispatchFiles.map((f) => {
      try {
        const content = JSON.parse(
          fs.readFileSync(f.replace('.json', '.processed-0'), 'utf-8').toString() ||
            fs.readFileSync(f, 'utf-8'),
        ) as Record<string, unknown>;
        return content['work_item_id'] as string;
      } catch {
        // File may have been renamed to .processed-<pid> by the hook
        return null;
      }
    });

    // The hook renames the consumed file to .processed-*, so we check what was NOT renamed.
    // After fix: STORY-B's .dispatch-...-2002-4444.json still exists as-is.
    // After fix: STORY-A's .dispatch-...-2001-3333.json was renamed to .processed-*.
    const survivingDispatch = fs
      .readdirSync(env.sprintDir)
      .filter((f) => f.startsWith('.dispatch-') && f.endsWith('.json'));

    // POST-FIX: exactly 1 dispatch file remains (STORY-B's — untouched).
    // PRE-FIX: STORY-B's file was consumed by the newest-file lookup; 0 dispatch files remain,
    //   and STORY-B has no marker for attribution when its SubagentStop fires.
    //
    // This assertion FAILS on the clean baseline (0 files remain, not 1).
    assert.strictEqual(
      survivingDispatch.length,
      1,
      `Expected exactly 1 dispatch file to remain after STORY-A's SubagentStop (STORY-B's marker), ` +
        `but found ${survivingDispatch.length}. ` +
        `BUG-029: the newest-file lookup consumed STORY-B's marker (the newest file) ` +
        `instead of STORY-A's, leaving STORY-B without a dispatch marker for its SubagentStop.`,
    );

    if (survivingDispatch.length === 1) {
      const survivingContent = JSON.parse(
        fs.readFileSync(path.join(env.sprintDir, survivingDispatch[0]), 'utf-8'),
      ) as Record<string, unknown>;
      assert.strictEqual(
        survivingContent['work_item_id'],
        'STORY-B',
        `Expected the surviving dispatch marker to be for STORY-B, ` +
          `but it contains work_item_id='${survivingContent['work_item_id']}'.`,
      );
    }
  });
});
