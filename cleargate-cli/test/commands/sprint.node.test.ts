/**
 * sprint.node.test.ts — CR-050 node:test caller migration tests.
 *
 * Verifies that sprint init + sprint close pass the NEW canonical interface
 * to run_script.sh after CR-050 migration:
 *   - arg[1] is 'node' (explicit interpreter)
 *   - arg[2] is an absolute path ending in the script name
 *
 * These are the post-migration "green" tests. The vitest tests in sprint.test.ts
 * still exist and test other behaviors; this file focuses exclusively on
 * the CR-050 call-site migration assertions.
 *
 * HYBRID PATTERN: spawnFn capture (no real git/no real scripts invoked).
 * The capture-mock verifies arg structure; the shim-removal.red.node.test.ts
 * verifies real wrapper behavior end-to-end.
 *
 * No vitest. Uses node:test + node:assert/strict per FLASHCARD #node-test.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

import { sprintInitHandler, sprintCloseHandler } from '../../src/commands/sprint.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Resolve repo root: cleargate-cli/test/commands/ → up 3 → repo root
const REPO_ROOT = path.resolve(__dirname, '..', '..', '..');

// Fixture paths — reuse SPRINT-99 fixtures from src/commands/fixtures/
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
