/**
 * story.node.test.ts — CR-050 + CR-055 node:test caller integration tests.
 *
 * Verifies that story start (step 2) + story complete (step 6) pass the NEW
 * canonical interface to run_script.sh after CR-050 migration:
 *   - arg[1] is 'node' (explicit interpreter for .mjs scripts)
 *   - arg[2] is an absolute path ending in update_state.mjs
 *
 * CR-055: Adds wrapScript-based scenario invoking the real wrapper end-to-end.
 *
 * No vitest. Uses node:test + node:assert/strict per FLASHCARD #node-test.
 */

import { describe, it, after } from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

import { storyStartHandler, storyCompleteHandler } from '../../src/commands/story.js';
import { wrapScript } from '../helpers/wrap-script.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const FIXTURE_V2 = path.resolve(__dirname, '../../src/commands/fixtures/SPRINT-99-v2.md');

// Live run_script.sh wrapper for CR-055 wrapScript-based integration tests.
const LIVE_WRAPPER = path.resolve(__dirname, '..', '..', '..', '.cleargate', 'scripts', 'run_script.sh');

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeExitSeam(): { exitFn: (code: number) => never; getCode: () => number | null } {
  let code: number | null = null;
  const exitFn = (c: number): never => {
    code = c;
    throw new Error(`exit:${c}`);
  };
  return { exitFn, getCode: () => code };
}

type SpawnArgs = [string, string[], Record<string, unknown>];
type CaptureSpawnFn = typeof spawnSync & { calls: SpawnArgs[] };

/**
 * Create a spawnFn that captures all calls and returns different values per call.
 * callReturns[i] is returned for the i-th call; if fewer entries than calls, last entry repeats.
 */
function makeMultiCaptureSpawnFn(callReturns: Array<{ status: number; error: null; stdout?: string; stderr?: string }>): CaptureSpawnFn {
  const calls: SpawnArgs[] = [];
  const fn = (cmd: string, args: string[], opts: Record<string, unknown>) => {
    calls.push([cmd, args, opts]);
    const idx = Math.min(calls.length - 1, callReturns.length - 1);
    return { stdout: '', stderr: '', ...callReturns[idx] };
  };
  (fn as CaptureSpawnFn).calls = calls;
  return fn as unknown as CaptureSpawnFn;
}

/** Seed a minimal state.json in a tmp cwd so story start step 3 can read it. */
function seedSprintState(sprintId: string, storyId: string): { cwd: string; cleanup: () => void } {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'cg-story-node-test-'));
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
        state: 'Bouncing',
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
    cleanup: () => fs.rmSync(cwd, { recursive: true, force: true }),
  };
}

const tempDirs: Array<() => void> = [];
after(() => {
  for (const cleanup of tempDirs) {
    try { cleanup(); } catch { /* ignore */ }
  }
});

// ─── story start step 2 caller tests ─────────────────────────────────────────

describe('CR-050 story start step 2 — canonical call form (args[1]=node, args[2]=abs-path)', () => {
  it('story start step 2 passes node as arg[1] after run_script.sh (CR-050 migration)', () => {
    const seed = seedSprintState('SPRINT-99', 'STORY-99-01');
    tempDirs.push(seed.cleanup);

    const { exitFn } = makeExitSeam();
    // Call 0 = git worktree add (step 1), Call 1 = run_script.sh update_state.mjs (step 2)
    const spawnCapture = makeMultiCaptureSpawnFn([
      { status: 0, error: null, stdout: '', stderr: '' }, // step 1: git
      { status: 0, error: null, stdout: '', stderr: '' }, // step 2: run_script.sh
    ]);

    try {
      storyStartHandler(
        { storyId: 'STORY-99-01' },
        {
          sprintFilePath: FIXTURE_V2,
          sprintId: 'SPRINT-99',
          cwd: seed.cwd,
          exit: exitFn,
          spawnFn: spawnCapture as never,
          // No runScriptPath override — handler will resolve from seed.cwd
        },
      );
    } catch {
      // swallow exit
    }

    // step 2 is spawnCapture.calls[1] (index 1)
    assert.ok(spawnCapture.calls.length >= 2, `Expected at least 2 spawns but got ${spawnCapture.calls.length}`);
    const [cmd, args] = spawnCapture.calls[1]!;
    assert.strictEqual(cmd, 'bash', 'Expected bash as spawn command for step 2');
    assert.strictEqual(
      args[1],
      'node',
      `Expected 'node' as args[1] (CR-050 explicit interpreter) but got '${args[1]}'`
    );
    assert.ok(
      typeof args[2] === 'string' && path.isAbsolute(args[2]) && args[2].endsWith('update_state.mjs'),
      `Expected args[2] to be an absolute path ending in update_state.mjs but got '${args[2]}'`
    );
    assert.ok(
      args[2]!.includes('.cleargate/scripts/update_state.mjs'),
      `Expected path to include .cleargate/scripts/update_state.mjs but got '${args[2]}'`
    );
    assert.strictEqual(args[3], 'STORY-99-01', 'Expected story ID as args[3]');
    assert.strictEqual(args[4], 'Bouncing', 'Expected Bouncing as args[4] for step 2');
  });
});

// ─── story complete step 6 caller tests ──────────────────────────────────────

describe('CR-050 story complete step 6 — canonical call form (args[1]=node, args[2]=abs-path)', () => {
  it('story complete step 6 passes node as arg[1] after run_script.sh (CR-050 migration)', () => {
    const { exitFn } = makeExitSeam();
    // Steps: 1=rev-list, 2=checkout, 3=merge, 4=worktree remove, 5=branch -d, 6=update_state.mjs
    const spawnCapture = makeMultiCaptureSpawnFn([
      { status: 0, error: null, stdout: '1\n', stderr: '' }, // step 1: rev-list (non-zero count)
      { status: 0, error: null, stdout: '', stderr: '' },    // step 2: checkout
      { status: 0, error: null, stdout: '', stderr: '' },    // step 3: merge
      { status: 0, error: null, stdout: '', stderr: '' },    // step 4: worktree remove
      { status: 0, error: null, stdout: '', stderr: '' },    // step 5: branch -d
      { status: 0, error: null, stdout: '', stderr: '' },    // step 6: run_script.sh
    ]);

    try {
      storyCompleteHandler(
        { storyId: 'STORY-99-01' },
        {
          sprintFilePath: FIXTURE_V2,
          sprintId: 'SPRINT-99',
          cwd: '/tmp/story-test-cwd',
          exit: exitFn,
          spawnFn: spawnCapture as never,
        },
      );
    } catch {
      // swallow exit
    }

    // step 6 is spawnCapture.calls[5] (index 5)
    assert.ok(spawnCapture.calls.length >= 6, `Expected at least 6 spawns but got ${spawnCapture.calls.length}`);
    const [cmd, args] = spawnCapture.calls[5]!;
    assert.strictEqual(cmd, 'bash', 'Expected bash as spawn command for step 6');
    assert.strictEqual(
      args[1],
      'node',
      `Expected 'node' as args[1] (CR-050 explicit interpreter) but got '${args[1]}'`
    );
    assert.ok(
      typeof args[2] === 'string' && path.isAbsolute(args[2]) && args[2].endsWith('update_state.mjs'),
      `Expected args[2] to be an absolute path ending in update_state.mjs but got '${args[2]}'`
    );
    assert.ok(
      args[2]!.includes('.cleargate/scripts/update_state.mjs'),
      `Expected path to include .cleargate/scripts/update_state.mjs but got '${args[2]}'`
    );
    assert.strictEqual(args[3], 'STORY-99-01', 'Expected story ID as args[3]');
    assert.strictEqual(args[4], 'Done', 'Expected Done as args[4] for step 6');
  });
});

// ─── CR-055 wrapScript — real wrapper integration ─────────────────────────────

describe('CR-055 story — wrapScript end-to-end: real wrapper integration', () => {
  it('wrapper exits 0 when invoked with node -e process.exit(0) (story explicit-node interface)', async () => {
    const result = await wrapScript({
      wrapper: LIVE_WRAPPER,
      args: ['node', '-e', 'process.exit(0)'],
      env: {
        AGENT_TYPE: 'developer',
        WORK_ITEM_ID: 'CR-055',
      },
    });

    assert.strictEqual(
      result.exitCode,
      0,
      `Expected exit 0 from 'node -e process.exit(0)' via real wrapper but got ${result.exitCode}. ` +
        `This tests the explicit-node interface form used by story start/complete callers. ` +
        `stderr: ${result.stderr}`
    );
    assert.strictEqual(
      result.incidentJson,
      undefined,
      'Expected no incident JSON on success but got one'
    );
  });
});
