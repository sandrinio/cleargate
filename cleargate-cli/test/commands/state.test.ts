/**
 * state.test.ts — unit tests for `cleargate state update|validate` command handlers.
 *
 * STORY-013-08 scenarios covered:
 *   - state update v1-inert path
 *   - state update v2-active path (run_script.sh update_state.mjs)
 *   - state validate v1-inert path
 *   - state validate v2-active path (run_script.sh validate_state.mjs)
 *
 * IMPORTANT: All tests use synthetic SPRINT-99 fixture, never SPRINT-09 state.
 */

import { describe, it, expect, vi } from 'vitest';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { stateUpdateHandler, stateValidateHandler } from '../../src/commands/state.js';
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

// ─── state update — v1-inert ──────────────────────────────────────────────────

describe('state update — v1-inert path', () => {
  it('exits 0 and prints inert message', () => {
    const { exitFn, getCode } = makeExitSeam();
    const cap = makeCapture();

    try {
      stateUpdateHandler(
        { storyId: 'STORY-99-01', newState: 'In Progress' },
        {
          sprintFilePath: FIXTURE_V1,
          sprintId: 'SPRINT-99',
          stdout: cap.stdout,
          stderr: cap.stderr,
          exit: exitFn,
        },
      );
    } catch { /* expected */ }

    expect(getCode()).toBe(0);
    expect(cap.getOut().join(' ')).toContain('v1 mode active');
    expect(cap.getOut().join(' ')).toContain(V1_INERT_MESSAGE);
  });

  it('does not spawn any subprocess', () => {
    const { exitFn } = makeExitSeam();
    const spawnMock = vi.fn().mockReturnValue({ status: 0, error: null });

    try {
      stateUpdateHandler(
        { storyId: 'STORY-99-01', newState: 'In Progress' },
        {
          sprintFilePath: FIXTURE_V1,
          sprintId: 'SPRINT-99',
          exit: exitFn,
          spawnFn: spawnMock as never,
        },
      );
    } catch { /* expected */ }

    expect(spawnMock).not.toHaveBeenCalled();
  });
});

// ─── state update — v2-active ─────────────────────────────────────────────────

describe('state update — v2-active path', () => {
  it('invokes run_script.sh update_state.mjs with story-id and new-state', () => {
    const { exitFn } = makeExitSeam();
    const spawnMock = vi.fn().mockReturnValue({ status: 0, error: null });

    try {
      stateUpdateHandler(
        { storyId: 'STORY-99-01', newState: 'In Progress' },
        {
          sprintFilePath: FIXTURE_V2,
          sprintId: 'SPRINT-99',
          exit: exitFn,
          spawnFn: spawnMock as never,
          runScriptPath: '/fake/run_script.sh',
        },
      );
    } catch { /* expected */ }

    expect(spawnMock).toHaveBeenCalledOnce();
    const [cmd, args] = spawnMock.mock.calls[0] as [string, string[]];
    expect(cmd).toBe('bash');
    expect(args[0]).toBe('/fake/run_script.sh');
    expect(args[1]).toBe('update_state.mjs');
    expect(args[2]).toBe('STORY-99-01');
    expect(args[3]).toBe('In Progress');
  });

  it('propagates exit code from script', () => {
    const { exitFn, getCode } = makeExitSeam();
    const spawnMock = vi.fn().mockReturnValue({ status: 5, error: null });

    try {
      stateUpdateHandler(
        { storyId: 'STORY-99-01', newState: 'In Progress' },
        {
          sprintFilePath: FIXTURE_V2,
          sprintId: 'SPRINT-99',
          exit: exitFn,
          spawnFn: spawnMock as never,
          runScriptPath: '/fake/run_script.sh',
        },
      );
    } catch { /* expected */ }

    expect(getCode()).toBe(5);
  });
});

// ─── state validate — v1-inert ────────────────────────────────────────────────

describe('state validate — v1-inert path', () => {
  it('exits 0 and prints inert message', () => {
    const { exitFn, getCode } = makeExitSeam();
    const cap = makeCapture();

    try {
      stateValidateHandler(
        { sprintId: 'SPRINT-99' },
        {
          sprintFilePath: FIXTURE_V1,
          stdout: cap.stdout,
          stderr: cap.stderr,
          exit: exitFn,
        },
      );
    } catch { /* expected */ }

    expect(getCode()).toBe(0);
    expect(cap.getOut().join(' ')).toContain('v1 mode active');
  });
});

// ─── state validate — v2-active ───────────────────────────────────────────────

describe('state validate — v2-active path', () => {
  it('invokes run_script.sh validate_state.mjs with sprint-id', () => {
    const { exitFn } = makeExitSeam();
    const spawnMock = vi.fn().mockReturnValue({ status: 0, error: null });

    try {
      stateValidateHandler(
        { sprintId: 'SPRINT-99' },
        {
          sprintFilePath: FIXTURE_V2,
          exit: exitFn,
          spawnFn: spawnMock as never,
          runScriptPath: '/fake/run_script.sh',
        },
      );
    } catch { /* expected */ }

    expect(spawnMock).toHaveBeenCalledOnce();
    const [cmd, args] = spawnMock.mock.calls[0] as [string, string[]];
    expect(cmd).toBe('bash');
    expect(args[0]).toBe('/fake/run_script.sh');
    expect(args[1]).toBe('validate_state.mjs');
    expect(args[2]).toBe('SPRINT-99');
  });
});
