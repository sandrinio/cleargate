/**
 * gate.node.test.ts — CR-050 node:test caller migration tests.
 *
 * Verifies that gate qa + gate arch pass the NEW canonical interface
 * to run_script.sh after CR-050 migration:
 *   - arg[1] is 'bash' (explicit interpreter for .sh scripts)
 *   - arg[2] is an absolute path ending in pre_gate_runner.sh
 *
 * HYBRID PATTERN: spawnFn capture — verifies arg structure without running real scripts.
 * No vitest. Uses node:test + node:assert/strict per FLASHCARD #node-test.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

import { gateQaHandler, gateArchHandler } from '../../src/commands/gate.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Fixture paths
const FIXTURE_V2 = path.resolve(__dirname, '../../src/commands/fixtures/SPRINT-99-v2.md');

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

function makeCaptureSpawnFn(returnVal: { status: number; error: null }): CaptureSpawnFn {
  const calls: SpawnArgs[] = [];
  const fn = (cmd: string, args: string[], opts: Record<string, unknown>) => {
    calls.push([cmd, args, opts]);
    return { ...returnVal, stdout: '', stderr: '' };
  };
  (fn as CaptureSpawnFn).calls = calls;
  return fn as unknown as CaptureSpawnFn;
}

// ─── gate qa caller tests ─────────────────────────────────────────────────────

describe('CR-050 gate qa — canonical call form (args[1]=bash, args[2]=abs-path)', () => {
  it('gate qa passes bash as arg[1] after run_script.sh (CR-050 migration)', () => {
    const { exitFn } = makeExitSeam();
    const spawnCapture = makeCaptureSpawnFn({ status: 0, error: null });

    try {
      gateQaHandler(
        { worktree: '/some/worktree', branch: 'story/STORY-99-01' },
        {
          sprintFilePath: FIXTURE_V2,
          sprintId: 'SPRINT-99',
          exit: exitFn,
          spawnFn: spawnCapture as never,
          runScriptPath: '/fake/run_script.sh',
          cwd: '/some/project',
        },
      );
    } catch {
      // swallow exit
    }

    assert.ok(spawnCapture.calls.length >= 1, 'Expected spawnFn to be called at least once');
    const [cmd, args] = spawnCapture.calls[0]!;
    assert.strictEqual(cmd, 'bash', 'Expected bash as spawn command');
    assert.strictEqual(args[0], '/fake/run_script.sh', 'Expected run_script.sh as args[0]');
    assert.strictEqual(
      args[1],
      'bash',
      `Expected 'bash' as args[1] (CR-050 explicit interpreter for .sh) but got '${args[1]}'`
    );
    assert.ok(
      typeof args[2] === 'string' && path.isAbsolute(args[2]) && args[2].endsWith('pre_gate_runner.sh'),
      `Expected args[2] to be an absolute path ending in pre_gate_runner.sh but got '${args[2]}'`
    );
    assert.strictEqual(
      args[2],
      '/some/project/.cleargate/scripts/pre_gate_runner.sh',
      `Expected absolute canonical path for pre_gate_runner.sh`
    );
    assert.strictEqual(args[3], 'qa', 'Expected mode as args[3]');
  });
});

// ─── gate arch caller tests ───────────────────────────────────────────────────

describe('CR-050 gate arch — canonical call form (args[1]=bash, args[2]=abs-path)', () => {
  it('gate arch passes bash as arg[1] after run_script.sh (CR-050 migration)', () => {
    const { exitFn } = makeExitSeam();
    const spawnCapture = makeCaptureSpawnFn({ status: 0, error: null });

    try {
      gateArchHandler(
        { worktree: '/some/worktree', branch: 'story/STORY-99-01' },
        {
          sprintFilePath: FIXTURE_V2,
          sprintId: 'SPRINT-99',
          exit: exitFn,
          spawnFn: spawnCapture as never,
          runScriptPath: '/fake/run_script.sh',
          cwd: '/some/project',
        },
      );
    } catch {
      // swallow exit
    }

    assert.ok(spawnCapture.calls.length >= 1, 'Expected spawnFn to be called at least once');
    const [cmd, args] = spawnCapture.calls[0]!;
    assert.strictEqual(cmd, 'bash', 'Expected bash as spawn command');
    assert.strictEqual(args[0], '/fake/run_script.sh', 'Expected run_script.sh as args[0]');
    assert.strictEqual(
      args[1],
      'bash',
      `Expected 'bash' as args[1] (CR-050 explicit interpreter for .sh) but got '${args[1]}'`
    );
    assert.ok(
      typeof args[2] === 'string' && path.isAbsolute(args[2]) && args[2].endsWith('pre_gate_runner.sh'),
      `Expected args[2] to be an absolute path ending in pre_gate_runner.sh but got '${args[2]}'`
    );
    assert.strictEqual(
      args[2],
      '/some/project/.cleargate/scripts/pre_gate_runner.sh',
      `Expected absolute canonical path for pre_gate_runner.sh`
    );
    assert.strictEqual(args[3], 'arch', 'Expected mode as args[3]');
  });
});
