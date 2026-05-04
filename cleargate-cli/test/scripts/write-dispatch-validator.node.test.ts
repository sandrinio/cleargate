/**
 * write-dispatch-validator.node.test.ts — CR-044 acceptance tests for write_dispatch.sh
 * agent_type validator.
 *
 * Gherkin scenarios (CR-044 §4):
 *   Scenario 1: all valid agent types accepted (developer|architect|qa|reporter|devops|cleargate-wiki-contradict)
 *   Scenario 2: unknown agent_type rejected with exit 3 and stderr "invalid agent_type"
 *   Scenario 3: qa-red accepted — this variant is reusing 'qa' agent_type per CR-043 contract
 *               (DevOps adds 'devops' not 'qa-red'); instead verify 'devops' specifically accepted
 *
 * NOTE: write_dispatch.sh requires an active sprint sentinel (.cleargate/sprint-runs/.active)
 * to succeed. We create a minimal temp repo structure with the sentinel so the validator
 * block (which runs before the sentinel check) can be tested for agent_type validation.
 *
 * The script exit codes are:
 *   0  — success (valid agent_type + sentinel found + dispatch file written)
 *   1  — missing required args
 *   2  — no .active sprint sentinel found
 *   3  — invalid agent_type (added by CR-044)
 *
 * We test that 'devops' exits 0 (not 3) given a valid sentinel, and that unknown
 * types exit 3 (before the sentinel check — validator runs first).
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

interface RunResult {
  status: number | null;
  stdout: string;
  stderr: string;
}

/**
 * Run write_dispatch.sh with a temporary repo root that has a valid .active sentinel.
 * Sets ORCHESTRATOR_PROJECT_DIR to tmpDir so the script uses our fixture, not the real repo.
 */
function runWithSentinel(workItemId: string, agentType: string): RunResult {
  // Create a temp dir that looks like a minimal ClearGate repo
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cg-dispatch-test-'));
  const sprintRunsDir = path.join(tmpDir, '.cleargate', 'sprint-runs');
  const hookLogDir = path.join(tmpDir, '.cleargate', 'hook-log');
  fs.mkdirSync(sprintRunsDir, { recursive: true });
  fs.mkdirSync(hookLogDir, { recursive: true });

  // Write the .active sentinel
  fs.writeFileSync(path.join(sprintRunsDir, '.active'), 'SPRINT-TEST\n');

  // Create sprint dir
  fs.mkdirSync(path.join(sprintRunsDir, 'SPRINT-TEST'), { recursive: true });

  try {
    const result = spawnSync('bash', [WRITE_DISPATCH_SCRIPT, workItemId, agentType], {
      encoding: 'utf8',
      timeout: 10_000,
      env: {
        ...process.env,
        ORCHESTRATOR_PROJECT_DIR: tmpDir,
        CLAUDE_SESSION_ID: 'test-session-123',
      },
    });
    return {
      status: result.status ?? -1,
      stdout: result.stdout ?? '',
      stderr: result.stderr ?? '',
    };
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

/**
 * Run write_dispatch.sh WITHOUT a sentinel (to test that invalid agent_type exits 3,
 * which happens BEFORE the sentinel check).
 */
function runWithoutSentinel(workItemId: string, agentType: string): RunResult {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cg-dispatch-nosent-'));
  const hookLogDir = path.join(tmpDir, '.cleargate', 'hook-log');
  fs.mkdirSync(hookLogDir, { recursive: true });
  // No .active sentinel — the script should exit 3 before it reaches the sentinel check

  try {
    const result = spawnSync('bash', [WRITE_DISPATCH_SCRIPT, workItemId, agentType], {
      encoding: 'utf8',
      timeout: 10_000,
      env: {
        ...process.env,
        ORCHESTRATOR_PROJECT_DIR: tmpDir,
        CLAUDE_SESSION_ID: 'test-session-456',
      },
    });
    return {
      status: result.status ?? -1,
      stdout: result.stdout ?? '',
      stderr: result.stderr ?? '',
    };
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

describe('write_dispatch.sh agent_type validator (CR-044)', () => {
  it('accepts devops agent_type with exit 0', () => {
    // devops is a valid agent_type added by CR-044
    const result = runWithSentinel('CR-044', 'devops');
    assert.strictEqual(result.status, 0, `Expected exit 0 but got ${result.status}. stderr: ${result.stderr}`);
    assert.ok(!result.stderr.includes('invalid agent_type'), `Unexpected stderr: ${result.stderr}`);
  });

  it('accepts all pre-existing valid agent types with exit 0', () => {
    // Verify all valid types still pass (regression guard)
    const validTypes = ['developer', 'architect', 'qa', 'reporter', 'cleargate-wiki-contradict'];
    for (const agentType of validTypes) {
      const result = runWithSentinel('CR-044', agentType);
      assert.strictEqual(
        result.status,
        0,
        `Expected exit 0 for agent_type='${agentType}' but got ${result.status}. stderr: ${result.stderr}`,
      );
    }
  });

  it('rejects unknown agent_type with exit 3 and stderr containing "invalid agent_type"', () => {
    // The validator block runs before the sentinel check, so no sentinel needed
    const result = runWithoutSentinel('CR-044', 'bogus-agent-xyz');
    assert.strictEqual(
      result.status,
      3,
      `Expected exit 3 for unknown agent_type but got ${result.status}. stderr: ${result.stderr}`,
    );
    assert.ok(
      result.stderr.includes('invalid agent_type'),
      `Expected stderr to contain "invalid agent_type" but got: ${result.stderr}`,
    );
    assert.ok(
      result.stderr.includes('bogus-agent-xyz'),
      `Expected stderr to contain the rejected agent_type but got: ${result.stderr}`,
    );
  });
});
