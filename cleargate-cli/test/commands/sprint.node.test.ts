/**
 * sprint.node.test.ts — CR-050 + CR-055 node:test caller integration tests.
 *
 * Verifies that sprint init + sprint close pass the NEW canonical interface
 * to run_script.sh after CR-050 migration:
 *   - arg[1] is 'node' (explicit interpreter)
 *   - arg[2] is an absolute path ending in the script name
 *
 * CR-055: Adds wrapScript-based scenarios that invoke the real wrapper end-to-end,
 * exercising the interface-level path that spawnFn-arg-capture cannot cover.
 *
 * No vitest. Uses node:test + node:assert/strict per FLASHCARD #node-test.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

import { sprintInitHandler, sprintCloseHandler } from '../../src/commands/sprint.js';
import { wrapScript } from '../helpers/wrap-script.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Resolve repo root: cleargate-cli/test/commands/ → up 3 → repo root
const REPO_ROOT = path.resolve(__dirname, '..', '..', '..');

// Fixture paths — reuse SPRINT-99 fixtures from src/commands/fixtures/
const FIXTURE_V2 = path.resolve(__dirname, '../../src/commands/fixtures/SPRINT-99-v2.md');

// Live run_script.sh wrapper for CR-055 wrapScript-based integration tests.
// Resolves from cleargate-cli/test/commands/ → up 3 → repo root → .cleargate/scripts/
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

function makeCaptureSpawnFn(returnVal: { status: number; error: null }): CaptureSpawnFn {
  const calls: SpawnArgs[] = [];
  const fn = (cmd: string, args: string[], opts: Record<string, unknown>) => {
    calls.push([cmd, args, opts]);
    return { ...returnVal, stdout: '', stderr: '' };
  };
  (fn as CaptureSpawnFn).calls = calls;
  return fn as unknown as CaptureSpawnFn;
}

// ─── sprint init caller tests ─────────────────────────────────────────────────

describe('CR-050 sprint init — canonical call form (args[1]=node, args[2]=abs-path)', () => {
  it('sprint init passes node as arg[1] after run_script.sh (CR-050 migration)', () => {
    const { exitFn } = makeExitSeam();
    const spawnCapture = makeCaptureSpawnFn({ status: 0, error: null });

    try {
      sprintInitHandler(
        { sprintId: 'SPRINT-99', stories: 'STORY-99-01' },
        {
          sprintFilePath: FIXTURE_V2,
          exit: exitFn,
          spawnFn: spawnCapture as never,
          runScriptPath: '/fake/run_script.sh',
          cwd: REPO_ROOT,
        },
      );
    } catch {
      // swallow exit
    }

    assert.ok(spawnCapture.calls.length >= 1, 'Expected spawnFn to be called at least once');
    const [cmd, args] = spawnCapture.calls[spawnCapture.calls.length - 1]!;
    assert.strictEqual(cmd, 'bash', 'Expected bash as spawn command');
    assert.strictEqual(args[0], '/fake/run_script.sh', 'Expected run_script.sh as args[0]');
    assert.strictEqual(
      args[1],
      'node',
      `Expected 'node' as args[1] (CR-050 explicit interpreter) but got '${args[1]}'`
    );
    assert.ok(
      typeof args[2] === 'string' && path.isAbsolute(args[2]) && args[2].endsWith('init_sprint.mjs'),
      `Expected args[2] to be an absolute path ending in init_sprint.mjs but got '${args[2]}'`
    );
    assert.strictEqual(args[3], 'SPRINT-99', 'Expected sprint ID as args[3]');
  });

  it('sprint init args[2] is under cwd/.cleargate/scripts/ (canonical location)', () => {
    const { exitFn } = makeExitSeam();
    const spawnCapture = makeCaptureSpawnFn({ status: 0, error: null });

    try {
      sprintInitHandler(
        { sprintId: 'SPRINT-99', stories: 'STORY-99-01' },
        {
          sprintFilePath: FIXTURE_V2,
          exit: exitFn,
          spawnFn: spawnCapture as never,
          runScriptPath: '/fake/run_script.sh',
          cwd: '/some/project',
        },
      );
    } catch {
      // swallow exit
    }

    assert.ok(spawnCapture.calls.length >= 1);
    const [, args] = spawnCapture.calls[spawnCapture.calls.length - 1]!;
    assert.strictEqual(
      args[2],
      '/some/project/.cleargate/scripts/init_sprint.mjs',
      `Expected absolute canonical path but got '${args[2]}'`
    );
  });
});

// ─── sprint close caller tests ────────────────────────────────────────────────

describe('CR-050 sprint close — canonical call form (args[1]=node, args[2]=abs-path)', () => {
  it('sprint close passes node as arg[1] after run_script.sh (CR-050 migration)', () => {
    const { exitFn } = makeExitSeam();
    const spawnCapture = makeCaptureSpawnFn({ status: 0, error: null });

    try {
      sprintCloseHandler(
        { sprintId: 'SPRINT-99' },
        {
          sprintFilePath: FIXTURE_V2,
          exit: exitFn,
          spawnFn: spawnCapture as never,
          runScriptPath: '/fake/run_script.sh',
          cwd: REPO_ROOT,
        },
      );
    } catch {
      // swallow exit
    }

    assert.ok(spawnCapture.calls.length >= 1, 'Expected spawnFn to be called at least once');
    const [cmd, args] = spawnCapture.calls[spawnCapture.calls.length - 1]!;
    assert.strictEqual(cmd, 'bash', 'Expected bash as spawn command');
    assert.strictEqual(args[0], '/fake/run_script.sh', 'Expected run_script.sh as args[0]');
    assert.strictEqual(
      args[1],
      'node',
      `Expected 'node' as args[1] (CR-050 explicit interpreter) but got '${args[1]}'`
    );
    assert.ok(
      typeof args[2] === 'string' && path.isAbsolute(args[2]) && args[2].endsWith('close_sprint.mjs'),
      `Expected args[2] to be an absolute path ending in close_sprint.mjs but got '${args[2]}'`
    );
    assert.strictEqual(args[3], 'SPRINT-99', 'Expected sprint ID as args[3]');
  });

  it('sprint close args[2] is under cwd/.cleargate/scripts/ (canonical location)', () => {
    const { exitFn } = makeExitSeam();
    const spawnCapture = makeCaptureSpawnFn({ status: 0, error: null });

    try {
      sprintCloseHandler(
        { sprintId: 'SPRINT-99' },
        {
          sprintFilePath: FIXTURE_V2,
          exit: exitFn,
          spawnFn: spawnCapture as never,
          runScriptPath: '/fake/run_script.sh',
          cwd: '/some/project',
        },
      );
    } catch {
      // swallow exit
    }

    assert.ok(spawnCapture.calls.length >= 1);
    const [, args] = spawnCapture.calls[spawnCapture.calls.length - 1]!;
    assert.strictEqual(
      args[2],
      '/some/project/.cleargate/scripts/close_sprint.mjs',
      `Expected absolute canonical path but got '${args[2]}'`
    );
  });
});

// ─── CR-055 wrapScript — real wrapper integration ─────────────────────────────
//
// Invokes run_script.sh end-to-end via wrapScript to verify the wrapper accepts
// the explicit-node interface form (arg[1]=node) that sprint callers use.
// Catches interface-level regressions that spawnFn-arg-capture cannot detect.

describe('CR-055 sprint — wrapScript end-to-end: real wrapper integration', () => {
  it('wrapper exits 0 when invoked with node -e process.exit(0) (sprint explicit-node interface)', async () => {
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
        `This tests the explicit-node interface form used by sprint init/close callers. ` +
        `stderr: ${result.stderr}`
    );
    assert.strictEqual(
      result.incidentJson,
      undefined,
      'Expected no incident JSON on success but got one (wrapper wrote error JSON unexpectedly)'
    );
  });
});
