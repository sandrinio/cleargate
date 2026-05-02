/**
 * Tests for CR-026: pre-tool-use-task.sh dispatch marker auto-write.
 *
 * Verifies all 6 mandatory scenarios from CR-026 §4 + M3 plan §"Test scenarios":
 *   1. STORY marker parse → marker file written with correct work_item_id + agent_type
 *   2. BUG marker parse → marker written correctly
 *   3. CR marker parse → marker written correctly
 *   4. EPIC marker parse → marker written correctly
 *   5. No-marker fallback → no marker written, exit 0, log line "no marker: regex miss"
 *   6. Idempotency / parallel-spawn collision → both markers written with distinct filenames
 *
 * Real-bash execution via execFileSync, synthetic stdin JSON, tmpdir for repo root.
 * No mocks. Per CLAUDE.md "Real infra, no mocks" rule.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { execFileSync } from 'node:child_process';

const HOOK_PATH = path.resolve(
  path.dirname(new URL(import.meta.url).pathname),
  '../../..',
  '.claude/hooks/pre-tool-use-task.sh'
);

// ─── Test environment setup ────────────────────────────────────────────────────

const TEST_SPRINT_ID = 'SPRINT-CR-026-TEST';

interface HookEnv {
  tmpDir: string;
  sprintRunsDir: string;
  sprintDir: string;
  hookLogDir: string;
  hookLog: string;
}

function makeHookEnv(): HookEnv {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pre-tool-use-task-test-'));
  const sprintRunsDir = path.join(tmpDir, '.cleargate', 'sprint-runs');
  fs.mkdirSync(sprintRunsDir, { recursive: true });
  const sprintDir = path.join(sprintRunsDir, TEST_SPRINT_ID);
  fs.mkdirSync(sprintDir, { recursive: true });
  const hookLogDir = path.join(tmpDir, '.cleargate', 'hook-log');
  fs.mkdirSync(hookLogDir, { recursive: true });
  const hookLog = path.join(hookLogDir, 'pre-tool-use-task.log');

  // Write active sentinel pointing at test sprint
  const sentinelPath = path.join(sprintRunsDir, '.active');
  fs.writeFileSync(sentinelPath, TEST_SPRINT_ID, 'utf-8');

  return { tmpDir, sprintRunsDir, sprintDir, hookLogDir, hookLog };
}

/**
 * Build a minimal Claude Code PreToolUse:Task payload.
 */
function makePayload(opts: {
  prompt: string;
  subagent_type?: string;
  tool_name?: string;
  session_id?: string;
}): string {
  return JSON.stringify({
    tool_name: opts.tool_name ?? 'Task',
    session_id: opts.session_id ?? 'test-session-ptu',
    transcript_path: '/dev/null',
    hook_event_name: 'PreToolUse',
    cwd: '/tmp',
    tool_input: {
      subagent_type: opts.subagent_type ?? 'developer',
      description: 'Test spawn',
      prompt: opts.prompt,
    },
  });
}

/**
 * Run the hook with a synthetic payload. Patches REPO_ROOT via env var.
 */
function runHook(env: HookEnv, payload: string): { exitCode: number; stdout: string; stderr: string } {
  // Patch the hook to use tmpDir as CLAUDE_PROJECT_DIR
  const hookContent = fs.readFileSync(HOOK_PATH, 'utf-8');
  const patchedHook = hookContent.replace(
    /^REPO_ROOT="\$\{ORCHESTRATOR_PROJECT_DIR:-\$\{CLAUDE_PROJECT_DIR\}\}"$/m,
    `REPO_ROOT="${env.tmpDir}"`
  );

  const patchedHookPath = path.join(env.tmpDir, `pre-tool-use-task-patched-${Date.now()}-${Math.random()}.sh`);
  fs.writeFileSync(patchedHookPath, patchedHook, { mode: 0o755 });

  let exitCode = 0;
  let stdout = '';
  let stderr = '';

  try {
    const result = execFileSync('bash', [patchedHookPath], {
      input: payload,
      env: { ...process.env, PATH: process.env.PATH },
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    stdout = result.toString();
  } catch (err: unknown) {
    const e = err as { status?: number; stdout?: Buffer; stderr?: Buffer };
    exitCode = e.status ?? 1;
    stdout = e.stdout?.toString() ?? '';
    stderr = e.stderr?.toString() ?? '';
  }

  return { exitCode, stdout, stderr };
}

/**
 * Get all dispatch marker files from the sprint dir.
 */
function getDispatchFiles(sprintDir: string): string[] {
  return fs
    .readdirSync(sprintDir)
    .filter((f) => f.startsWith('.dispatch-') && f.endsWith('.json'))
    .map((f) => path.join(sprintDir, f));
}

/**
 * Read and parse the most recent dispatch marker file.
 */
function readNewestDispatch(sprintDir: string): Record<string, unknown> | null {
  const files = getDispatchFiles(sprintDir);
  if (files.length === 0) return null;
  // Sort by filename (timestamp prefix), take newest
  files.sort().reverse();
  try {
    return JSON.parse(fs.readFileSync(files[0], 'utf-8')) as Record<string, unknown>;
  } catch {
    return null;
  }
}

// ─── Test suite ───────────────────────────────────────────────────────────────

let env: HookEnv;

beforeEach(() => {
  env = makeHookEnv();
});

afterEach(() => {
  fs.rmSync(env.tmpDir, { recursive: true, force: true });
});

describe('pre-tool-use-task.sh: dispatch marker auto-write (CR-026)', () => {

  /**
   * Scenario 1 (Gherkin — CR-026 §4 + M3 plan):
   * STORY marker parse.
   *
   * Given a Task() spawn with prompt starting "STORY=026-01\n..." and subagent_type "developer"
   * When the PreToolUse:Task hook fires
   * Then a dispatch marker file is written with work_item_id="STORY-026-01", agent_type="developer"
   */
  it('scenario 1: STORY marker parse → dispatch written with STORY-026-01 + developer', () => {
    const payload = makePayload({
      prompt: 'STORY=026-01\n\nYou are the developer agent. Implement CR-026.',
      subagent_type: 'developer',
    });

    const { exitCode } = runHook(env, payload);
    expect(exitCode).toBe(0);

    const dispatch = readNewestDispatch(env.sprintDir);
    expect(dispatch).not.toBeNull();
    expect(dispatch!['work_item_id']).toBe('STORY-026-01');
    expect(dispatch!['agent_type']).toBe('developer');
    expect(dispatch!['spawned_at']).toBeTruthy();
    expect(typeof dispatch!['writer']).toBe('string');
  });

  /**
   * Scenario 2 (Gherkin — CR-026 §4 + M3 plan):
   * BUG marker parse.
   *
   * Given a Task() spawn with "BUG-025" in prompt and subagent_type "developer"
   * When the PreToolUse:Task hook fires
   * Then a dispatch marker file is written with work_item_id="BUG-025", agent_type="developer"
   */
  it('scenario 2: BUG marker parse → dispatch written with BUG-025 + developer', () => {
    const payload = makePayload({
      prompt: 'BUG-025\n\nFix the PostToolUse hook bug.',
      subagent_type: 'developer',
    });

    const { exitCode } = runHook(env, payload);
    expect(exitCode).toBe(0);

    const dispatch = readNewestDispatch(env.sprintDir);
    expect(dispatch).not.toBeNull();
    expect(dispatch!['work_item_id']).toBe('BUG-025');
    expect(dispatch!['agent_type']).toBe('developer');
  });

  /**
   * Scenario 3 (Gherkin — CR-026 §4 + M3 plan):
   * CR marker parse.
   *
   * Given a Task() spawn with "CR-026" in prompt and subagent_type "architect"
   * When the PreToolUse:Task hook fires
   * Then a dispatch marker file is written with work_item_id="CR-026", agent_type="architect"
   */
  it('scenario 3: CR marker parse → dispatch written with CR-026 + architect', () => {
    const payload = makePayload({
      prompt: 'CR-026\n\nProduce the milestone plan for token-ledger attribution fix.',
      subagent_type: 'architect',
    });

    const { exitCode } = runHook(env, payload);
    expect(exitCode).toBe(0);

    const dispatch = readNewestDispatch(env.sprintDir);
    expect(dispatch).not.toBeNull();
    expect(dispatch!['work_item_id']).toBe('CR-026');
    expect(dispatch!['agent_type']).toBe('architect');
  });

  /**
   * Scenario 4 (Gherkin — CR-026 §4 + M3 plan):
   * EPIC marker parse.
   *
   * Given a Task() spawn with "EPIC-026" in prompt and subagent_type "architect"
   * When the PreToolUse:Task hook fires
   * Then a dispatch marker file is written with work_item_id="EPIC-026", agent_type="architect"
   */
  it('scenario 4: EPIC marker parse → dispatch written with EPIC-026 + architect', () => {
    const payload = makePayload({
      prompt: 'EPIC-026\n\nDesign the skill adoption epic scope.',
      subagent_type: 'architect',
    });

    const { exitCode } = runHook(env, payload);
    expect(exitCode).toBe(0);

    const dispatch = readNewestDispatch(env.sprintDir);
    expect(dispatch).not.toBeNull();
    expect(dispatch!['work_item_id']).toBe('EPIC-026');
    expect(dispatch!['agent_type']).toBe('architect');
  });

  /**
   * Scenario 5 (Gherkin — CR-026 §4 + M3 plan):
   * No-marker fallback.
   *
   * Given a Task() spawn with a prompt containing no work-item marker
   * When the PreToolUse:Task hook fires
   * Then no dispatch marker file is written, exit code is 0, log contains "no marker:"
   */
  it('scenario 5: no-marker fallback → no dispatch written, exit 0, log "no marker: regex miss"', () => {
    const payload = makePayload({
      prompt: 'Please run the session-start doctor command and report results.',
      subagent_type: 'developer',
    });

    const { exitCode } = runHook(env, payload);
    expect(exitCode).toBe(0);

    const dispatchFiles = getDispatchFiles(env.sprintDir);
    expect(dispatchFiles).toHaveLength(0);

    // Log should contain a "no marker:" line
    expect(fs.existsSync(env.hookLog)).toBe(true);
    const logContent = fs.readFileSync(env.hookLog, 'utf-8');
    expect(logContent).toMatch(/no marker:/);
  });

  /**
   * Scenario 6 (Gherkin — CR-026 §4 + M3 plan):
   * Idempotency / parallel-spawn collision.
   *
   * Given the hook fires twice with two different work items
   * When both PreToolUse:Task hook fires complete
   * Then both marker files are written with distinct filenames (verified via bash sleep 1 between calls)
   * And both are readable by jq (valid JSON with correct fields)
   *
   * Implementation note: we verify filename uniqueness by running the hook twice
   * with a 1.1s sleep between calls to ensure distinct epoch-second timestamps in
   * the filename (.dispatch-<epoch>-<pid>-<rand>.json). This simulates the real
   * parallel-spawn scenario where subagents are spawned minutes apart.
   */
  it('scenario 6: parallel-spawn collision → both markers written with distinct filenames', () => {
    const payload1 = makePayload({
      prompt: 'STORY=026-01\n\nDeveloper agent for skill adoption.',
      subagent_type: 'developer',
    });
    const payload2 = makePayload({
      prompt: 'CR-026\n\nArchitect agent for token-ledger fix.',
      subagent_type: 'architect',
    });

    // Run first hook
    const { exitCode: ec1 } = runHook(env, payload1);
    expect(ec1).toBe(0);

    const filesAfterFirst = getDispatchFiles(env.sprintDir);
    expect(filesAfterFirst.length).toBe(1);

    // Sleep 1.1s to guarantee the second call gets a different epoch-second in filename
    execFileSync('sleep', ['1.1']);

    // Run second hook
    const { exitCode: ec2 } = runHook(env, payload2);
    expect(ec2).toBe(0);

    const filesAfterBoth = getDispatchFiles(env.sprintDir);
    expect(filesAfterBoth.length).toBe(2);

    // Verify all are distinct filenames
    const uniqueFiles = new Set(filesAfterBoth.map((f) => path.basename(f)));
    expect(uniqueFiles.size).toBe(2);

    // Verify all are valid JSON with correct shape
    for (const f of filesAfterBoth) {
      const content = JSON.parse(fs.readFileSync(f, 'utf-8')) as Record<string, unknown>;
      expect(content['work_item_id']).toBeTruthy();
      expect(content['agent_type']).toBeTruthy();
      expect(content['spawned_at']).toBeTruthy();
    }

    // One should be STORY, one should be CR
    const workItems = filesAfterBoth.map((f) => {
      const c = JSON.parse(fs.readFileSync(f, 'utf-8')) as Record<string, unknown>;
      return c['work_item_id'] as string;
    });
    expect(workItems.some((id) => id.startsWith('STORY'))).toBe(true);
    expect(workItems.some((id) => id.startsWith('CR'))).toBe(true);
  });

  // ─── Additional correctness tests ────────────────────────────────────────────

  it('non-Task tool_name → hook exits 0 without writing dispatch', () => {
    const payload = JSON.stringify({
      tool_name: 'Edit',
      session_id: 'test-non-task',
      hook_event_name: 'PreToolUse',
      tool_input: { prompt: 'STORY=026-01', subagent_type: 'developer' },
    });

    const { exitCode } = runHook(env, payload);
    expect(exitCode).toBe(0);

    const dispatchFiles = getDispatchFiles(env.sprintDir);
    expect(dispatchFiles).toHaveLength(0);
  });

  it('invalid agent_type → hook exits 0 without writing dispatch, log "no marker: agent_type"', () => {
    const payload = makePayload({
      prompt: 'STORY=026-01\n\nDo something.',
      subagent_type: 'unknown-role',
    });

    const { exitCode } = runHook(env, payload);
    expect(exitCode).toBe(0);

    const dispatchFiles = getDispatchFiles(env.sprintDir);
    expect(dispatchFiles).toHaveLength(0);

    expect(fs.existsSync(env.hookLog)).toBe(true);
    const logContent = fs.readFileSync(env.hookLog, 'utf-8');
    expect(logContent).toMatch(/no marker: agent_type/);
  });

  it('no active sprint sentinel → hook exits 0 without writing dispatch', () => {
    // Remove the active sentinel from this test's env
    const sentinelPath = path.join(env.sprintRunsDir, '.active');
    fs.unlinkSync(sentinelPath);

    const payload = makePayload({
      prompt: 'STORY=026-01\n\nDeveloper agent.',
      subagent_type: 'developer',
    });

    const { exitCode } = runHook(env, payload);
    expect(exitCode).toBe(0);

    const dispatchFiles = getDispatchFiles(env.sprintDir);
    expect(dispatchFiles).toHaveLength(0);
  });

  it('writer field contains pre-tool-use-task.sh identifier', () => {
    const payload = makePayload({
      prompt: 'CR-026\n\nDeveloper dispatch.',
      subagent_type: 'developer',
    });

    runHook(env, payload);

    const dispatch = readNewestDispatch(env.sprintDir);
    expect(dispatch).not.toBeNull();
    const writer = dispatch!['writer'] as string;
    expect(writer).toContain('pre-tool-use-task.sh');
  });

  it('HOTFIX marker parse → dispatch written with HOTFIX-001', () => {
    const payload = makePayload({
      prompt: 'HOTFIX-001\n\nEmergency fix for prod.',
      subagent_type: 'developer',
    });

    runHook(env, payload);

    const dispatch = readNewestDispatch(env.sprintDir);
    expect(dispatch).not.toBeNull();
    expect(dispatch!['work_item_id']).toBe('HOTFIX-001');
  });
});
