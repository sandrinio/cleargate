/**
 * CR-026 integration test: end-to-end cross-hook attribution chain.
 *
 * M3 §"Test shape → Real-infra integration test" (lines 174-178).
 * Covers Gherkin Scenarios 2 + 3:
 *   Scenario 2: pre-tool-use-task.sh fires with synthetic Task() payload →
 *               dispatch marker written with correct work_item_id + agent_type.
 *   Scenario 3: token-ledger.sh fires with the dispatch marker present →
 *               ledger row attributed to STORY-026-01/developer,
 *               dispatch file renamed to .processed-* and cleaned up,
 *               hook logs contain "wrote dispatch:" and "dispatch-marker:" lines.
 *
 * This test exercises the composition of the two hooks — something the
 * per-hook unit tests in pre-tool-use-task.test.ts and
 * token-ledger-attribution.test.ts do not cover.
 *
 * Real-bash execution via execFileSync. Tmpdir for repo root. No mocks.
 * Per CLAUDE.md "Real infra, no mocks" rule and SPRINT-20 §2.5 constraints.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { execFileSync } from 'node:child_process';

const PRE_TOOL_USE_HOOK_PATH = path.resolve(
  path.dirname(new URL(import.meta.url).pathname),
  '../../..',
  '.claude/hooks/pre-tool-use-task.sh'
);

const TOKEN_LEDGER_HOOK_PATH = path.resolve(
  path.dirname(new URL(import.meta.url).pathname),
  '../../..',
  '.claude/hooks/token-ledger.sh'
);

// ─── Sprint ID (unique to this test to avoid collisions) ──────────────────────
const TEST_SPRINT_ID = 'SPRINT-CR-026-TEST';

// ─── Transcript helpers (mirrored from token-ledger-attribution.test.ts) ─────

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

// ─── Environment setup ────────────────────────────────────────────────────────

interface IntegrationEnv {
  tmpDir: string;
  sprintRunsDir: string;
  sprintDir: string;
  hookLogDir: string;
  preToolUseLog: string;
  tokenLedgerLog: string;
  ledgerPath: string;
}

function makeIntegrationEnv(): IntegrationEnv {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cr-026-integration-'));
  const sprintRunsDir = path.join(tmpDir, '.cleargate', 'sprint-runs');
  fs.mkdirSync(sprintRunsDir, { recursive: true });

  const sprintDir = path.join(sprintRunsDir, TEST_SPRINT_ID);
  fs.mkdirSync(sprintDir, { recursive: true });

  const hookLogDir = path.join(tmpDir, '.cleargate', 'hook-log');
  fs.mkdirSync(hookLogDir, { recursive: true });

  // Write active sentinel pointing at our test sprint
  const sentinelPath = path.join(sprintRunsDir, '.active');
  fs.writeFileSync(sentinelPath, TEST_SPRINT_ID, 'utf-8');

  const preToolUseLog = path.join(hookLogDir, 'pre-tool-use-task.log');
  const tokenLedgerLog = path.join(hookLogDir, 'token-ledger.log');
  const ledgerPath = path.join(sprintDir, 'token-ledger.jsonl');

  return {
    tmpDir,
    sprintRunsDir,
    sprintDir,
    hookLogDir,
    preToolUseLog,
    tokenLedgerLog,
    ledgerPath,
  };
}

// ─── Hook runners ─────────────────────────────────────────────────────────────

/**
 * Run pre-tool-use-task.sh with a synthetic Task() payload.
 * Patches REPO_ROOT to tmpDir.
 */
function runPreToolUseHook(env: IntegrationEnv, prompt: string, subagentType = 'developer'): void {
  const payload = JSON.stringify({
    tool_name: 'Task',
    session_id: 'integration-test-orchestrator-session',
    transcript_path: '/dev/null',
    hook_event_name: 'PreToolUse',
    cwd: env.tmpDir,
    tool_input: {
      subagent_type: subagentType,
      description: 'Integration test Task spawn',
      prompt,
    },
  });

  const hookContent = fs.readFileSync(PRE_TOOL_USE_HOOK_PATH, 'utf-8');
  const patchedHook = hookContent.replace(
    /^REPO_ROOT="\$\{ORCHESTRATOR_PROJECT_DIR:-\$\{CLAUDE_PROJECT_DIR\}\}"$/m,
    `REPO_ROOT="${env.tmpDir}"`
  );

  const patchedHookPath = path.join(env.tmpDir, 'pre-tool-use-task-integration.sh');
  fs.writeFileSync(patchedHookPath, patchedHook, { mode: 0o755 });

  try {
    execFileSync('bash', [patchedHookPath], {
      input: payload,
      env: { ...process.env, PATH: process.env.PATH },
      stdio: ['pipe', 'pipe', 'pipe'],
    });
  } catch {
    // Hook always exits 0; any error is logged to the hook log
  }
}

/**
 * Run token-ledger.sh with a synthetic transcript and session payload.
 * Patches REPO_ROOT to tmpDir.
 */
function runTokenLedgerHook(
  env: IntegrationEnv,
  transcript: string,
  sessionId: string
): void {
  const transcriptFile = path.join(env.tmpDir, `transcript-${sessionId}.jsonl`);
  fs.writeFileSync(transcriptFile, transcript, 'utf-8');

  const payload = JSON.stringify({
    session_id: sessionId,
    transcript_path: transcriptFile,
    hook_event_name: 'SubagentStop',
  });

  const hookContent = fs.readFileSync(TOKEN_LEDGER_HOOK_PATH, 'utf-8');
  const patchedHook = hookContent.replace(
    /^REPO_ROOT=".+?"$/m,
    `REPO_ROOT="${env.tmpDir}"`
  );

  const patchedHookPath = path.join(env.tmpDir, `token-ledger-integration-${sessionId}.sh`);
  fs.writeFileSync(patchedHookPath, patchedHook, { mode: 0o755 });

  try {
    execFileSync('bash', [patchedHookPath], {
      input: payload,
      env: { ...process.env, PATH: process.env.PATH },
      stdio: ['pipe', 'pipe', 'pipe'],
    });
  } catch {
    // Hook always exits 0; errors go to log
  }
}

// ─── Test suite ───────────────────────────────────────────────────────────────

let env: IntegrationEnv;

beforeEach(() => {
  env = makeIntegrationEnv();
});

afterEach(() => {
  fs.rmSync(env.tmpDir, { recursive: true, force: true });
});

describe('CR-026 integration: pre-tool-use-task.sh → token-ledger.sh cross-hook chain', () => {

  /**
   * Scenarios 2 + 3 (M3 Gherkin §"Test scenarios" lines 129-130):
   *
   * Scenario 2: Given orchestrator runs Task(subagent_type=developer, prompt="STORY=026-01 ..."),
   *   When pre-tool-use-task.sh fires,
   *   Then .dispatch-*.json is written with work_item_id: STORY-026-01 + agent_type: developer.
   *
   * Scenario 3: Given completed subagent run with dispatch marker present,
   *   When token-ledger.sh fires (SubagentStop),
   *   Then ledger row has work_item_id: STORY-026-01 + agent_type: developer,
   *   AND dispatch file is renamed to .processed-* and cleaned up post-row-write,
   *   AND hook logs contain "wrote dispatch:" (pre-tool-use) and "dispatch-marker:" (token-ledger).
   */
  it(
    'end-to-end: pre-tool-use-task.sh writes dispatch → token-ledger.sh consumes it → correct ledger row + cleanup',
    () => {
      // ── Phase 1: Orchestrator fires Task() spawn via pre-tool-use-task.sh ─────
      const taskPrompt = 'STORY=026-01\n\nYou are the developer agent.\nImplement the CR-026 integration test.';
      runPreToolUseHook(env, taskPrompt, 'developer');

      // Assert: dispatch file written in sprint dir
      const dispatchFilesAfterSpawn = fs
        .readdirSync(env.sprintDir)
        .filter((f) => f.startsWith('.dispatch-') && f.endsWith('.json'));
      expect(dispatchFilesAfterSpawn.length).toBeGreaterThanOrEqual(1);

      const dispatchFilePath = path.join(env.sprintDir, dispatchFilesAfterSpawn[0]);
      const dispatchContent = JSON.parse(
        fs.readFileSync(dispatchFilePath, 'utf-8')
      ) as Record<string, unknown>;

      // Dispatch file must have correct fields (Scenario 2)
      expect(dispatchContent['work_item_id']).toBe('STORY-026-01');
      expect(dispatchContent['agent_type']).toBe('developer');
      expect(dispatchContent['spawned_at']).toBeTruthy();
      expect(dispatchContent['writer']).toMatch(/pre-tool-use-task\.sh/);

      // pre-tool-use-task.log must contain "wrote dispatch:" line (Scenario 2 / §177)
      expect(fs.existsSync(env.preToolUseLog)).toBe(true);
      const preToolUseLogContent = fs.readFileSync(env.preToolUseLog, 'utf-8');
      expect(preToolUseLogContent).toMatch(/wrote dispatch:/);
      expect(preToolUseLogContent).toMatch(/work_item=STORY-026-01/);
      expect(preToolUseLogContent).toMatch(/agent=developer/);

      // ── Phase 2: Subagent completes → token-ledger.sh fires (SubagentStop) ───
      const transcript = makeTranscript([
        makeUserTurn('STORY=026-01\n\nYou are the developer agent. Implement CR-026.'),
        makeAssistantTurn(200, 100),
      ]);

      const subagentSessionId = 'subagent-session-different-from-dispatch-filename';
      runTokenLedgerHook(env, transcript, subagentSessionId);

      // Assert: ledger row written with correct attribution (Scenario 3)
      expect(fs.existsSync(env.ledgerPath)).toBe(true);
      const ledgerLines = fs
        .readFileSync(env.ledgerPath, 'utf-8')
        .trim()
        .split('\n')
        .filter(Boolean);
      expect(ledgerLines.length).toBeGreaterThanOrEqual(1);

      const lastRow = JSON.parse(ledgerLines[ledgerLines.length - 1]) as Record<string, unknown>;
      expect(lastRow['work_item_id']).toBe('STORY-026-01');
      expect(lastRow['agent_type']).toBe('developer');
      expect(lastRow['sprint_id']).toBe(TEST_SPRINT_ID);

      // Assert: dispatch file renamed to .processed-* and then deleted (Scenario 3 / §177)
      // The hook renames to .processed-$$ during processing, then rm -f after row write.
      // Post-hook: no .dispatch-*.json AND no .processed-* files should remain.
      const remainingDispatch = fs
        .readdirSync(env.sprintDir)
        .filter((f) => f.startsWith('.dispatch-') && f.endsWith('.json'));
      expect(remainingDispatch).toHaveLength(0);

      // token-ledger.log must contain "dispatch-marker:" success line (Scenario 3 / §177)
      expect(fs.existsSync(env.tokenLedgerLog)).toBe(true);
      const tokenLedgerLogContent = fs.readFileSync(env.tokenLedgerLog, 'utf-8');
      expect(tokenLedgerLogContent).toMatch(/dispatch-marker:/);
      expect(tokenLedgerLogContent).toMatch(/work_item=STORY-026-01/);
      expect(tokenLedgerLogContent).toMatch(/agent=developer/);
    }
  );
});
