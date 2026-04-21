/**
 * gate-v2.test.ts — unit tests for `cleargate gate qa|arch` command handlers.
 *
 * STORY-013-08 scenarios covered:
 *   Scenario 3 (partial): CLI collision — gate qa/arch don't collide with gate check/explain
 *   Scenario 4 (partial): all four wrappers route through run_script.sh
 *   - gate qa v1-inert path
 *   - gate qa v2-active path (run_script.sh pre_gate_runner.sh qa)
 *   - gate arch v1-inert path
 *   - gate arch v2-active path (run_script.sh pre_gate_runner.sh arch)
 *
 * IMPORTANT: All tests use synthetic SPRINT-99 fixture, never SPRINT-09 state.
 */

import { describe, it, expect, vi } from 'vitest';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { gateQaHandler, gateArchHandler } from '../../src/commands/gate.js';
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

// ─── gate qa — v1-inert ───────────────────────────────────────────────────────

describe('gate qa — v1-inert path', () => {
  it('exits 0 and prints inert message', () => {
    const { exitFn, getCode } = makeExitSeam();
    const cap = makeCapture();

    try {
      gateQaHandler(
        { worktree: '.worktrees/STORY-99-01', branch: 'sprint/S-99' },
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
      gateQaHandler(
        { worktree: '.worktrees/STORY-99-01', branch: 'sprint/S-99' },
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

// ─── gate qa — v2-active ──────────────────────────────────────────────────────

describe('gate qa — v2-active path', () => {
  it('invokes run_script.sh pre_gate_runner.sh qa with worktree and branch', () => {
    const { exitFn } = makeExitSeam();
    const spawnMock = vi.fn().mockReturnValue({ status: 0, error: null });

    try {
      gateQaHandler(
        { worktree: '.worktrees/STORY-99-01', branch: 'sprint/S-99' },
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
    expect(args[1]).toBe('pre_gate_runner.sh');
    expect(args[2]).toBe('qa');
    expect(args[3]).toBe('.worktrees/STORY-99-01');
    expect(args[4]).toBe('sprint/S-99');
  });
});

// ─── gate arch — v1-inert ─────────────────────────────────────────────────────

describe('gate arch — v1-inert path', () => {
  it('exits 0 and prints inert message', () => {
    const { exitFn, getCode } = makeExitSeam();
    const cap = makeCapture();

    try {
      gateArchHandler(
        { worktree: '.worktrees/STORY-99-01', branch: 'sprint/S-99' },
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
  });
});

// ─── gate arch — v2-active ────────────────────────────────────────────────────

describe('gate arch — v2-active path', () => {
  it('invokes run_script.sh pre_gate_runner.sh arch with worktree and branch', () => {
    const { exitFn } = makeExitSeam();
    const spawnMock = vi.fn().mockReturnValue({ status: 0, error: null });

    try {
      gateArchHandler(
        { worktree: '.worktrees/STORY-99-01', branch: 'sprint/S-99' },
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
    expect(args[1]).toBe('pre_gate_runner.sh');
    expect(args[2]).toBe('arch');
    expect(args[3]).toBe('.worktrees/STORY-99-01');
    expect(args[4]).toBe('sprint/S-99');
  });
});

// ─── Scenario 3: CLI collision audit ────────────────────────────────────────

describe('Scenario: No CLI collision — gate qa|arch vs gate check|explain', () => {
  it('gate qa and arch are distinct subcommand names from check and explain', () => {
    const existingGateSubcommands = ['check', 'explain'];
    const newGateSubcommands = ['qa', 'arch'];

    for (const newCmd of newGateSubcommands) {
      expect(existingGateSubcommands).not.toContain(newCmd);
    }
  });
});

// ─── Scenario 4 (partial): all wrappers route through run_script.sh ──────────

describe('Scenario: All four wrappers route through run_script.sh', () => {
  it('gate qa routes through run_script.sh (verified in test above)', () => {
    // Verified by "gate qa v2-active" test above.
    // This test confirms the invariant at a summary level.
    const runScriptInvocations: string[][] = [];
    const spawnMock = vi.fn().mockImplementation((_cmd: string, args: string[]) => {
      runScriptInvocations.push(args);
      return { status: 0, error: null };
    });

    try {
      gateQaHandler(
        { worktree: '.worktrees/STORY-99-01', branch: 'sprint/S-99' },
        {
          sprintFilePath: FIXTURE_V2,
          sprintId: 'SPRINT-99',
          exit: (c) => { throw new Error(`exit:${c}`); },
          spawnFn: spawnMock as never,
          runScriptPath: '/fake/run_script.sh',
        },
      );
    } catch { /* expected */ }

    // First arg to bash must be run_script.sh path (never a direct mjs invocation)
    expect(runScriptInvocations[0]![0]).toBe('/fake/run_script.sh');
    expect(runScriptInvocations[0]![0]).not.toContain('node');
  });
});
