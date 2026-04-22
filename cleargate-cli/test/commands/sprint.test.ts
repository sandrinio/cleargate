/**
 * sprint.test.ts — unit tests for `cleargate sprint init|close` command handlers.
 *
 * STORY-013-08 Gherkin scenarios covered:
 *   Scenario 1 (partial): v1 mode inert — sprint init with SPRINT-99-v1.md fixture → exit 0 + inert message
 *   Scenario 2 (partial): v2 mode routes to script — sprint init with SPRINT-99-v2.md fixture → spawnFn called
 *   Scenario 5 (partial): flag-flip roundtrip — v1 vs v2 sprint file yields different behavior
 *
 * Also covers:
 *   - sprint close v1-inert path
 *   - sprint close v2-active path
 *   - Missing sprint file defaults to v1 (safe default per §19.5)
 *
 * IMPORTANT: All tests use synthetic SPRINT-99 fixture files, never SPRINT-09 state.
 */

import { describe, it, expect, vi } from 'vitest';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { sprintInitHandler, sprintCloseHandler } from '../../src/commands/sprint.js';
import { V1_INERT_MESSAGE } from '../../src/commands/execution-mode.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Fixture paths — SPRINT-99 only, never SPRINT-09
const FIXTURE_V1 = path.resolve(
  __dirname,
  '../../src/commands/fixtures/SPRINT-99-v1.md',
);
const FIXTURE_V2 = path.resolve(
  __dirname,
  '../../src/commands/fixtures/SPRINT-99-v2.md',
);

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeExitSeam(): { exitFn: (code: number) => never; getCode: () => number | null } {
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

// ─── Scenario 1: v1 mode inert — sprint init ─────────────────────────────────

describe('Scenario: v1 mode inert (sprint init)', () => {
  it('exit code is 0', () => {
    const { exitFn, getCode } = makeExitSeam();
    const cap = makeCapture();
    try {
      sprintInitHandler(
        { sprintId: 'SPRINT-99', stories: 'STORY-99-01' },
        {
          sprintFilePath: FIXTURE_V1,
          stdout: cap.stdout,
          stderr: cap.stderr,
          exit: exitFn,
        },
      );
    } catch (e) {
      expect((e as Error).message).toBe('exit:0');
    }
    expect(getCode()).toBe(0);
  });

  it('stdout contains inert message', () => {
    const { exitFn } = makeExitSeam();
    const cap = makeCapture();
    try {
      sprintInitHandler(
        { sprintId: 'SPRINT-99', stories: 'STORY-99-01' },
        {
          sprintFilePath: FIXTURE_V1,
          stdout: cap.stdout,
          stderr: cap.stderr,
          exit: exitFn,
        },
      );
    } catch {
      // swallow exit
    }
    expect(cap.getOut().join(' ')).toContain('v1 mode active');
    expect(cap.getOut().join(' ')).toContain(V1_INERT_MESSAGE);
  });

  it('no subprocess is spawned under v1', () => {
    const { exitFn } = makeExitSeam();
    const cap = makeCapture();
    const spawnMock = vi.fn().mockReturnValue({ status: 0, error: null });

    try {
      sprintInitHandler(
        { sprintId: 'SPRINT-99', stories: 'STORY-99-01' },
        {
          sprintFilePath: FIXTURE_V1,
          stdout: cap.stdout,
          stderr: cap.stderr,
          exit: exitFn,
          spawnFn: spawnMock as never,
        },
      );
    } catch {
      // swallow exit
    }

    expect(spawnMock).not.toHaveBeenCalled();
  });
});

// ─── Scenario 2: v2 mode routes to script — sprint init ──────────────────────

describe('Scenario: v2 mode routes to script (sprint init)', () => {
  it('run_script.sh init_sprint.mjs is invoked via spawnFn', () => {
    const { exitFn } = makeExitSeam();
    const cap = makeCapture();
    const spawnMock = vi.fn().mockReturnValue({ status: 0, error: null });

    try {
      sprintInitHandler(
        { sprintId: 'SPRINT-99', stories: 'STORY-99-01' },
        {
          sprintFilePath: FIXTURE_V2,
          stdout: cap.stdout,
          stderr: cap.stderr,
          exit: exitFn,
          spawnFn: spawnMock as never,
          runScriptPath: '/fake/run_script.sh',
        },
      );
    } catch {
      // swallow exit
    }

    expect(spawnMock).toHaveBeenCalledOnce();
    const [cmd, args] = spawnMock.mock.calls[0] as [string, string[]];
    expect(cmd).toBe('bash');
    expect(args[0]).toBe('/fake/run_script.sh');
    expect(args[1]).toBe('init_sprint.mjs');
    expect(args[2]).toBe('SPRINT-99');
  });

  it('exit code reflects script exit code', () => {
    const { exitFn, getCode } = makeExitSeam();
    const cap = makeCapture();
    const spawnMock = vi.fn().mockReturnValue({ status: 42, error: null });

    try {
      sprintInitHandler(
        { sprintId: 'SPRINT-99', stories: 'STORY-99-01' },
        {
          sprintFilePath: FIXTURE_V2,
          stdout: cap.stdout,
          stderr: cap.stderr,
          exit: exitFn,
          spawnFn: spawnMock as never,
          runScriptPath: '/fake/run_script.sh',
        },
      );
    } catch {
      // swallow exit
    }

    expect(getCode()).toBe(42);
  });
});

// ─── Sprint close v1-inert ────────────────────────────────────────────────────

describe('sprint close — v1-inert path', () => {
  it('exits 0 and prints inert message', () => {
    const { exitFn, getCode } = makeExitSeam();
    const cap = makeCapture();

    try {
      sprintCloseHandler(
        { sprintId: 'SPRINT-99' },
        {
          sprintFilePath: FIXTURE_V1,
          stdout: cap.stdout,
          stderr: cap.stderr,
          exit: exitFn,
        },
      );
    } catch {
      // swallow exit
    }

    expect(getCode()).toBe(0);
    expect(cap.getOut().join(' ')).toContain('v1 mode active');
  });
});

// ─── Sprint close v2-active ───────────────────────────────────────────────────

describe('sprint close — v2-active path', () => {
  it('invokes run_script.sh close_sprint.mjs', () => {
    const { exitFn } = makeExitSeam();
    const cap = makeCapture();
    const spawnMock = vi.fn().mockReturnValue({ status: 0, error: null });

    try {
      sprintCloseHandler(
        { sprintId: 'SPRINT-99' },
        {
          sprintFilePath: FIXTURE_V2,
          stdout: cap.stdout,
          stderr: cap.stderr,
          exit: exitFn,
          spawnFn: spawnMock as never,
          runScriptPath: '/fake/run_script.sh',
        },
      );
    } catch {
      // swallow exit
    }

    expect(spawnMock).toHaveBeenCalledOnce();
    const [, args] = spawnMock.mock.calls[0] as [string, string[]];
    expect(args[1]).toBe('close_sprint.mjs');
    expect(args[2]).toBe('SPRINT-99');
  });
});

// ─── Scenario 5: flag-flip roundtrip ─────────────────────────────────────────

describe('Scenario: flag-flip roundtrip', () => {
  it('v1 fixture → inert, v2 fixture → routes to script', () => {
    const spawnMock = vi.fn().mockReturnValue({ status: 0, error: null });

    // v1 → inert
    const outV1: string[] = [];
    try {
      sprintInitHandler(
        { sprintId: 'SPRINT-99', stories: 'STORY-99-01' },
        {
          sprintFilePath: FIXTURE_V1,
          stdout: (s) => outV1.push(s),
          exit: (c) => { throw new Error(`exit:${c}`); },
          spawnFn: spawnMock as never,
          runScriptPath: '/fake/run_script.sh',
        },
      );
    } catch { /* expected */ }

    expect(outV1.join(' ')).toContain('v1 mode active');
    expect(spawnMock).not.toHaveBeenCalled();

    spawnMock.mockClear();

    // v2 → routes
    try {
      sprintInitHandler(
        { sprintId: 'SPRINT-99', stories: 'STORY-99-01' },
        {
          sprintFilePath: FIXTURE_V2,
          stdout: () => {},
          exit: (c) => { throw new Error(`exit:${c}`); },
          spawnFn: spawnMock as never,
          runScriptPath: '/fake/run_script.sh',
        },
      );
    } catch { /* expected */ }

    expect(spawnMock).toHaveBeenCalledOnce();
  });
});

// ─── Missing sprint file defaults to v1 ──────────────────────────────────────

describe('Missing sprint file defaults to v1', () => {
  it('exits 0 with inert message when sprint file does not exist', () => {
    const { exitFn, getCode } = makeExitSeam();
    const cap = makeCapture();

    try {
      sprintInitHandler(
        { sprintId: 'SPRINT-99', stories: 'STORY-99-01' },
        {
          sprintFilePath: '/nonexistent/path/SPRINT-99.md',
          stdout: cap.stdout,
          stderr: cap.stderr,
          exit: exitFn,
        },
      );
    } catch {
      // swallow exit
    }

    expect(getCode()).toBe(0);
    expect(cap.getOut().join(' ')).toContain('v1 mode active');
  });
});

// ─── Scenario: sprint close --assume-ack propagates (STORY-014-06) ───────────

describe('Scenario: sprint close --assume-ack propagates', () => {
  it('spawns close_sprint.mjs with --assume-ack as the last arg', () => {
    const { exitFn } = makeExitSeam();
    const cap = makeCapture();
    const spawnMock = vi.fn().mockReturnValue({ status: 0, error: null });

    try {
      sprintCloseHandler(
        { sprintId: 'SPRINT-99', assumeAck: true },
        {
          sprintFilePath: FIXTURE_V2,
          stdout: cap.stdout,
          stderr: cap.stderr,
          exit: exitFn,
          spawnFn: spawnMock as never,
          runScriptPath: '/fake/run_script.sh',
        },
      );
    } catch {
      // swallow exit
    }

    expect(spawnMock).toHaveBeenCalledOnce();
    const [, args] = spawnMock.mock.calls[0] as [string, string[]];
    expect(args[1]).toBe('close_sprint.mjs');
    expect(args[2]).toBe('SPRINT-99');
    expect(args[args.length - 1]).toBe('--assume-ack');
  });

  it('does not append --assume-ack when flag is absent', () => {
    const { exitFn } = makeExitSeam();
    const spawnMock = vi.fn().mockReturnValue({ status: 0, error: null });

    try {
      sprintCloseHandler(
        { sprintId: 'SPRINT-99' },
        {
          sprintFilePath: FIXTURE_V2,
          stdout: () => {},
          exit: exitFn,
          spawnFn: spawnMock as never,
          runScriptPath: '/fake/run_script.sh',
        },
      );
    } catch {
      // swallow exit
    }

    expect(spawnMock).toHaveBeenCalledOnce();
    const [, args] = spawnMock.mock.calls[0] as [string, string[]];
    expect(args).not.toContain('--assume-ack');
  });
});
