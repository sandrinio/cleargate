/**
 * token-ledger-devops.node.test.ts — CR-044 acceptance tests for token-ledger.sh
 * devops agent_type attribution.
 *
 * Gherkin scenarios (CR-044 §4.3):
 *   Scenario 1: devops dispatch attributed via dispatch marker (primary path)
 *     - Write .dispatch-<session>.json with agent_type=devops
 *     - Fire hook with transcript
 *     - Assert ledger row has agent_type=devops
 *
 *   Scenario 2: legacy fallback recognizes "role: devops" in transcript
 *     - No dispatch marker present
 *     - Transcript contains "role: devops" role marker
 *     - Fire hook
 *     - Assert ledger row has agent_type=devops (from L227 list edit)
 *
 * Uses the same harness pattern as token-ledger-delta.test.ts:
 *   - Real bash execution via execFileSync
 *   - Synthetic transcript fixtures written to os.tmpdir()
 *   - Hook patched by replacing the REPO_ROOT assignment line
 *
 * Key: uses node:test runner (*.node.test.ts naming per SPRINT-22 frontmatter constraint).
 */
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Canonical hook path (cleargate-planning is source of truth)
const HOOK_PATH = path.resolve(
  __dirname,
  '..', '..', '..',
  'cleargate-planning', '.claude', 'hooks', 'token-ledger.sh',
);

const TEST_SPRINT_ID = 'SPRINT-TEST-DEVOPS';

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
      content: 'devops agent response',
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
  sprintDir: string;
  hookLogDir: string;
}

function makeHookEnv(): HookEnv {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cg-devops-hook-test-'));
  const sprintRunsDir = path.join(tmpDir, '.cleargate', 'sprint-runs');
  const hookLogDir = path.join(tmpDir, '.cleargate', 'hook-log');
  const sprintDir = path.join(sprintRunsDir, TEST_SPRINT_ID);

  fs.mkdirSync(sprintDir, { recursive: true });
  fs.mkdirSync(hookLogDir, { recursive: true });
  fs.writeFileSync(path.join(sprintRunsDir, '.active'), TEST_SPRINT_ID, 'utf-8');

  return { tmpDir, sprintRunsDir, sprintDir, hookLogDir };
}

function cleanupHookEnv(env: HookEnv): void {
  fs.rmSync(env.tmpDir, { recursive: true, force: true });
}

/**
 * Run the hook with a given transcript and optional dispatch marker.
 * Returns the last row written to the ledger, or null if none.
 */
function runHook(
  env: HookEnv,
  transcript: string,
  sessionId: string,
  dispatchMarker?: { agent_type: string; work_item_id: string },
): Record<string, unknown> | null {
  const transcriptFile = path.join(env.tmpDir, `transcript-${sessionId}.jsonl`);
  fs.writeFileSync(transcriptFile, transcript, 'utf-8');

  // Write dispatch marker if provided
  if (dispatchMarker) {
    const dispatchPath = path.join(env.sprintDir, `.dispatch-${sessionId}.json`);
    fs.writeFileSync(
      dispatchPath,
      JSON.stringify({
        agent_type: dispatchMarker.agent_type,
        work_item_id: dispatchMarker.work_item_id,
        spawned_at: new Date().toISOString(),
        session_id: sessionId,
        writer: 'test-fixture',
      }),
      'utf-8',
    );
  }

  const payload = JSON.stringify({
    session_id: sessionId,
    transcript_path: transcriptFile,
    hook_event_name: 'SubagentStop',
  });

  // Patch REPO_ROOT in hook to point at our temp dir
  const hookContent = fs.readFileSync(HOOK_PATH, 'utf-8');
  const patchedHook = hookContent.replace(
    /^REPO_ROOT=".+?"$/m,
    `REPO_ROOT="${env.tmpDir}"`,
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
    // Hook errors are logged internally; check the ledger regardless
  }

  const ledgerPath = path.join(env.sprintDir, 'token-ledger.jsonl');
  if (!fs.existsSync(ledgerPath)) return null;

  const rows = fs
    .readFileSync(ledgerPath, 'utf-8')
    .trim()
    .split('\n')
    .filter((l) => l.trim())
    .map((l) => {
      try {
        return JSON.parse(l) as Record<string, unknown>;
      } catch {
        return null;
      }
    })
    .filter(Boolean) as Record<string, unknown>[];

  return rows[rows.length - 1] ?? null;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('token-ledger.sh devops attribution (CR-044)', () => {
  it('attributes devops dispatch via dispatch marker (primary path)', () => {
    const env = makeHookEnv();
    try {
      const transcript = makeTranscript([
        makeUserTurn('CR=044\nSPRINT-22 — DevOps dispatch for CR-044.'),
        makeAssistantTurn(500, 200),
      ]);

      // Write dispatch marker with agent_type=devops
      const row = runHook(env, transcript, 'devops-session-primary', {
        agent_type: 'devops',
        work_item_id: 'CR-044',
      });

      assert.ok(row !== null, 'Expected a ledger row to be written');
      assert.strictEqual(
        row['agent_type'],
        'devops',
        `Expected agent_type=devops but got: ${row['agent_type']}`,
      );
      assert.strictEqual(
        row['work_item_id'],
        'CR-044',
        `Expected work_item_id=CR-044 but got: ${row['work_item_id']}`,
      );
    } finally {
      cleanupHookEnv(env);
    }
  });

  it('legacy fallback recognizes "role: devops" in transcript (L227 list edit)', () => {
    const env = makeHookEnv();
    try {
      // No dispatch marker — legacy fallback path will scan transcript
      // The transcript contains "role: devops" which must match the L227 loop
      const transcript = makeTranscript([
        makeUserTurn('CR=044\nrole: devops\nSPRINT-22 DevOps dispatch for CR-044.'),
        makeAssistantTurn(300, 150),
      ]);

      // No dispatch marker provided — legacy fallback kicks in
      const row = runHook(env, transcript, 'devops-session-legacy');

      assert.ok(row !== null, 'Expected a ledger row to be written');
      assert.strictEqual(
        row['agent_type'],
        'devops',
        `Expected agent_type=devops from legacy fallback but got: ${row['agent_type']}. ` +
          `This validates the L227 list edit adding 'devops' to the role iteration loop.`,
      );
    } finally {
      cleanupHookEnv(env);
    }
  });
});
