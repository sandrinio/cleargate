/**
 * story.test.ts — unit tests for `cleargate story start|complete` handlers.
 *
 * STORY-014-07 scenarios (5, per §2.1):
 *   1. start STORY-XX-01 → 3-step spawn sequence + state.json worktree field.
 *   2. complete STORY-XX-01 → 6-step spawn sequence in order.
 *   3. complete refuses when rev-list count = 0 → exit 1 + stderr message.
 *   4. v1-inert for both commands.
 *   5. Merge conflict → stderr diagnostic + `git merge --abort` suggestion + exit 1.
 *
 * IMPORTANT: All tests use synthetic SPRINT-99 fixture, never SPRINT-09/10 state.
 */

import { describe, it, expect, vi, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { storyStartHandler, storyCompleteHandler } from '../../src/commands/story.js';
import { V1_INERT_MESSAGE } from '../../src/commands/execution-mode.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const FIXTURE_V1 = path.resolve(
  __dirname,
  '../../src/commands/fixtures/SPRINT-99-v1.md',
);
const FIXTURE_V2 = path.resolve(
  __dirname,
  '../../src/commands/fixtures/SPRINT-99-v2.md',
);

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeExitSeam() {
  let code: number | null = null;
  const exitFn = (c: number): never => {
    code = c;
    throw new Error(`exit:${c}`);
  };
  return { exitFn, getCode: () => code };
}

function makeCapture() {
  const out: string[] = [];
  const err: string[] = [];
  return {
    stdout: (s: string) => { out.push(s); },
    stderr: (s: string) => { err.push(s); },
    getOut: () => out,
    getErr: () => err,
  };
}

/** Seed a sprint-runs/<id>/state.json in a temp cwd for start-handler tests. */
function seedTempSprintState(sprintId: string, storyId: string): {
  cwd: string;
  stateFile: string;
  cleanup: () => void;
} {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'cg-story-test-'));
  const runDir = path.join(cwd, '.cleargate', 'sprint-runs', sprintId);
  fs.mkdirSync(runDir, { recursive: true });
  const stateFile = path.join(runDir, 'state.json');
  const initial = {
    schema_version: 2,
    sprint_id: sprintId,
    execution_mode: 'v2',
    sprint_status: 'Active',
    stories: {
      [storyId]: {
        state: 'Bouncing', // update_state.mjs already flipped this
        qa_bounces: 0,
        arch_bounces: 0,
        worktree: null,
        updated_at: '2026-04-21T10:00:00Z',
        notes: '',
        lane: 'standard',
        lane_assigned_by: 'migration-default',
        lane_demoted_at: null,
        lane_demotion_reason: null,
      },
    },
    last_action: 'test-seed',
    updated_at: '2026-04-21T10:00:00Z',
  };
  fs.writeFileSync(stateFile, JSON.stringify(initial, null, 2) + '\n', 'utf8');
  return {
    cwd,
    stateFile,
    cleanup: () => { fs.rmSync(cwd, { recursive: true, force: true }); },
  };
}

// Track temp dirs for cleanup
const tempDirs: Array<() => void> = [];
afterEach(() => {
  while (tempDirs.length) {
    const fn = tempDirs.pop();
    try { fn?.(); } catch { /* swallow */ }
  }
});

// ─── Scenario 1: story start — 3-step spawn + state.json mutation ─────────────

describe('Scenario 1: story start — 3-step spawn + state.json mutation', () => {
  it('spawns git worktree add, update_state.mjs, then writes worktree field', () => {
    const seed = seedTempSprintState('SPRINT-99', 'STORY-99-01');
    tempDirs.push(seed.cleanup);

    const { exitFn, getCode } = makeExitSeam();
    const cap = makeCapture();
    const spawnMock = vi.fn().mockReturnValue({
      status: 0,
      error: null,
      stdout: '',
      stderr: '',
    });

    try {
      storyStartHandler(
        { storyId: 'STORY-99-01' },
        {
          sprintFilePath: FIXTURE_V2,
          sprintId: 'SPRINT-99',
          cwd: seed.cwd,
          stdout: cap.stdout,
          stderr: cap.stderr,
          exit: exitFn,
          spawnFn: spawnMock as never,
        },
      );
    } catch { /* expected exit */ }

    expect(getCode()).toBe(0);

    // Assert exactly 2 spawns (step 3 is fs write, not a spawn).
    expect(spawnMock).toHaveBeenCalledTimes(2);

    // Step 1: git worktree add <path> -b story/<ID> <sprintBranch>
    const [cmd1, args1] = spawnMock.mock.calls[0] as [string, string[]];
    expect(cmd1).toBe('git');
    expect(args1[0]).toBe('worktree');
    expect(args1[1]).toBe('add');
    expect(args1[2]).toContain('.worktrees');
    expect(args1[2]).toContain('STORY-99-01');
    expect(args1[3]).toBe('-b');
    expect(args1[4]).toBe('story/STORY-99-01');
    expect(args1[5]).toBe('sprint/S-99');

    // Step 2: bash run_script.sh update_state.mjs STORY-99-01 Bouncing
    const [cmd2, args2] = spawnMock.mock.calls[1] as [string, string[]];
    expect(cmd2).toBe('bash');
    // args2[0] is runScript path, args2[1..] are script args
    expect(args2[1]).toBe('update_state.mjs');
    expect(args2[2]).toBe('STORY-99-01');
    expect(args2[3]).toBe('Bouncing');

    // Step 3: state.json worktree field mutated.
    const state = JSON.parse(fs.readFileSync(seed.stateFile, 'utf8'));
    expect(state.stories['STORY-99-01'].worktree).toBe('.worktrees/STORY-99-01');
    // State field untouched by the CLI second pass (update_state.mjs owns it;
    // the seed already has "Bouncing" to reflect the 2-pass ordering).
    expect(state.stories['STORY-99-01'].state).toBe('Bouncing');
  });
});

// ─── Scenario 2: story complete — 6-step spawn sequence in order ──────────────

describe('Scenario 2: story complete — 6-step spawn sequence in order', () => {
  it('fires rev-list, checkout, merge, worktree remove, branch -d, update_state.mjs', () => {
    const { exitFn, getCode } = makeExitSeam();
    const cap = makeCapture();
    // Mock: step 1 (rev-list) returns count=1; all others return 0.
    let callIdx = 0;
    const spawnMock = vi.fn().mockImplementation(() => {
      const idx = callIdx++;
      if (idx === 0) {
        return { status: 0, error: null, stdout: '1\n', stderr: '' };
      }
      return { status: 0, error: null, stdout: '', stderr: '' };
    });

    try {
      storyCompleteHandler(
        { storyId: 'STORY-99-01' },
        {
          sprintFilePath: FIXTURE_V2,
          sprintId: 'SPRINT-99',
          cwd: '/tmp/does-not-matter-for-mocked-spawn',
          stdout: cap.stdout,
          stderr: cap.stderr,
          exit: exitFn,
          spawnFn: spawnMock as never,
        },
      );
    } catch { /* expected exit */ }

    expect(getCode()).toBe(0);
    expect(spawnMock).toHaveBeenCalledTimes(6);

    // Step 1: git rev-list --count sprint/S-99..story/STORY-99-01
    const [cmd1, args1] = spawnMock.mock.calls[0] as [string, string[]];
    expect(cmd1).toBe('git');
    expect(args1[0]).toBe('rev-list');
    expect(args1[1]).toBe('--count');
    expect(args1[2]).toBe('sprint/S-99..story/STORY-99-01');

    // Step 2: git -C <cwd> checkout sprint/S-99
    const [cmd2, args2] = spawnMock.mock.calls[1] as [string, string[]];
    expect(cmd2).toBe('git');
    expect(args2[0]).toBe('-C');
    expect(args2[2]).toBe('checkout');
    expect(args2[3]).toBe('sprint/S-99');

    // Step 3: git merge story/STORY-99-01 --no-ff -m "merge: story/... → sprint/..."
    const [cmd3, args3] = spawnMock.mock.calls[2] as [string, string[]];
    expect(cmd3).toBe('git');
    expect(args3[0]).toBe('merge');
    expect(args3[1]).toBe('story/STORY-99-01');
    expect(args3[2]).toBe('--no-ff');
    expect(args3[3]).toBe('-m');
    expect(args3[4]).toContain('merge:');
    expect(args3[4]).toContain('story/STORY-99-01');
    expect(args3[4]).toContain('sprint/S-99');

    // Step 4: git worktree remove .worktrees/STORY-99-01
    const [cmd4, args4] = spawnMock.mock.calls[3] as [string, string[]];
    expect(cmd4).toBe('git');
    expect(args4[0]).toBe('worktree');
    expect(args4[1]).toBe('remove');
    expect(args4[2]).toContain('STORY-99-01');

    // Step 5: git branch -d story/STORY-99-01
    const [cmd5, args5] = spawnMock.mock.calls[4] as [string, string[]];
    expect(cmd5).toBe('git');
    expect(args5[0]).toBe('branch');
    expect(args5[1]).toBe('-d');
    expect(args5[2]).toBe('story/STORY-99-01');

    // Step 6: bash run_script.sh update_state.mjs STORY-99-01 Done
    const [cmd6, args6] = spawnMock.mock.calls[5] as [string, string[]];
    expect(cmd6).toBe('bash');
    expect(args6[1]).toBe('update_state.mjs');
    expect(args6[2]).toBe('STORY-99-01');
    expect(args6[3]).toBe('Done');
  });
});

// ─── Scenario 3: complete refuses when rev-list count = 0 ────────────────────

describe('Scenario 3: complete refuses when rev-list count = 0', () => {
  it('exits 1 with "no commits on story branch — nothing to merge"', () => {
    const { exitFn, getCode } = makeExitSeam();
    const cap = makeCapture();
    const spawnMock = vi.fn().mockReturnValue({
      status: 0,
      error: null,
      stdout: '0\n',
      stderr: '',
    });

    try {
      storyCompleteHandler(
        { storyId: 'STORY-99-01' },
        {
          sprintFilePath: FIXTURE_V2,
          sprintId: 'SPRINT-99',
          cwd: '/tmp/irrelevant-cwd',
          stdout: cap.stdout,
          stderr: cap.stderr,
          exit: exitFn,
          spawnFn: spawnMock as never,
        },
      );
    } catch { /* expected exit */ }

    expect(getCode()).toBe(1);
    // Only step 1 (rev-list) ran; subsequent steps skipped.
    expect(spawnMock).toHaveBeenCalledTimes(1);
    expect(cap.getErr().join('\n')).toContain('no commits on story branch');
    expect(cap.getErr().join('\n')).toContain('nothing to merge');
  });
});

// ─── Scenario 4: v1-inert for both commands ───────────────────────────────────

describe('Scenario 4: v1-inert for both commands', () => {
  it('story start under v1 prints inert message + exits 0 + no spawn', () => {
    const { exitFn, getCode } = makeExitSeam();
    const cap = makeCapture();
    const spawnMock = vi.fn();

    try {
      storyStartHandler(
        { storyId: 'STORY-99-01' },
        {
          sprintFilePath: FIXTURE_V1,
          sprintId: 'SPRINT-99',
          stdout: cap.stdout,
          stderr: cap.stderr,
          exit: exitFn,
          spawnFn: spawnMock as never,
        },
      );
    } catch { /* expected exit */ }

    expect(getCode()).toBe(0);
    expect(spawnMock).not.toHaveBeenCalled();
    expect(cap.getOut().join(' ')).toContain('v1 mode active');
    expect(cap.getOut().join(' ')).toContain(V1_INERT_MESSAGE);
  });

  it('story complete under v1 prints inert message + exits 0 + no spawn', () => {
    const { exitFn, getCode } = makeExitSeam();
    const cap = makeCapture();
    const spawnMock = vi.fn();

    try {
      storyCompleteHandler(
        { storyId: 'STORY-99-01' },
        {
          sprintFilePath: FIXTURE_V1,
          sprintId: 'SPRINT-99',
          stdout: cap.stdout,
          stderr: cap.stderr,
          exit: exitFn,
          spawnFn: spawnMock as never,
        },
      );
    } catch { /* expected exit */ }

    expect(getCode()).toBe(0);
    expect(spawnMock).not.toHaveBeenCalled();
    expect(cap.getOut().join(' ')).toContain('v1 mode active');
  });
});

// ─── Scenario 5: merge conflict surfaces cleanly ─────────────────────────────

describe('Scenario 5: merge conflict surfaces cleanly', () => {
  it('exits 1 + suggests `git merge --abort` when merge returns non-zero', () => {
    const { exitFn, getCode } = makeExitSeam();
    const cap = makeCapture();
    // Mock sequence: rev-list=1, checkout=0, merge=1 (conflict).
    let callIdx = 0;
    const spawnMock = vi.fn().mockImplementation(() => {
      const idx = callIdx++;
      if (idx === 0) {
        return { status: 0, error: null, stdout: '1\n', stderr: '' };
      }
      if (idx === 1) {
        return { status: 0, error: null, stdout: '', stderr: '' };
      }
      // idx === 2 → merge step
      return {
        status: 1,
        error: null,
        stdout: '',
        stderr: 'CONFLICT (content): Merge conflict in foo.txt\n',
      };
    });

    try {
      storyCompleteHandler(
        { storyId: 'STORY-99-01' },
        {
          sprintFilePath: FIXTURE_V2,
          sprintId: 'SPRINT-99',
          cwd: '/tmp/irrelevant-cwd',
          stdout: cap.stdout,
          stderr: cap.stderr,
          exit: exitFn,
          spawnFn: spawnMock as never,
        },
      );
    } catch { /* expected exit */ }

    expect(getCode()).toBe(1);
    // Only 3 calls — merge was step 3, aborted before worktree remove.
    expect(spawnMock).toHaveBeenCalledTimes(3);

    const errText = cap.getErr().join('\n');
    expect(errText).toContain('merge conflict');
    expect(errText).toContain('git merge --abort');
    // Conflict markers are NOT auto-aborted — the orchestrator UX decision.
    // (We cannot assert on filesystem here since spawn is mocked; the decision
    // manifests as "no `git merge --abort` spawn was issued".)
    const gitArgs = spawnMock.mock.calls.map((c) => (c as [string, string[]])[1]);
    const hasAbort = gitArgs.some(
      (args) => args[0] === 'merge' && args.includes('--abort'),
    );
    expect(hasAbort).toBe(false);
  });
});
