/**
 * story.test.ts — unit tests for `cleargate story start|complete` command handlers.
 *
 * STORY-013-08 scenarios covered:
 *   - story start v1-inert path
 *   - story start v2-active path (git worktree add)
 *   - story complete v1-inert path
 *   - story complete v2-active path (run_script.sh complete_story.mjs)
 *   - story complete when complete_story.mjs is absent → "not yet implemented"
 *
 * IMPORTANT: All tests use synthetic SPRINT-99 fixture, never SPRINT-09 state.
 */

import { describe, it, expect, vi } from 'vitest';
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

// ─── story start — v1-inert ───────────────────────────────────────────────────

describe('story start — v1-inert path', () => {
  it('exits 0 and prints inert message', () => {
    const { exitFn, getCode } = makeExitSeam();
    const cap = makeCapture();

    try {
      storyStartHandler(
        { storyId: 'STORY-99-01' },
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
      storyStartHandler(
        { storyId: 'STORY-99-01' },
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

// ─── story start — v2-active ──────────────────────────────────────────────────

describe('story start — v2-active path', () => {
  it('calls git worktree add', () => {
    const { exitFn } = makeExitSeam();
    const spawnMock = vi.fn().mockReturnValue({ status: 0, error: null });

    try {
      storyStartHandler(
        { storyId: 'STORY-99-01' },
        {
          sprintFilePath: FIXTURE_V2,
          sprintId: 'SPRINT-99',
          exit: exitFn,
          spawnFn: spawnMock as never,
        },
      );
    } catch { /* expected */ }

    expect(spawnMock).toHaveBeenCalledOnce();
    const [cmd, args] = spawnMock.mock.calls[0] as [string, string[]];
    expect(cmd).toBe('git');
    expect(args[0]).toBe('worktree');
    expect(args[1]).toBe('add');
    // worktree path should include the story ID
    expect(args[2]).toContain('STORY-99-01');
  });
});

// ─── story complete — v1-inert ────────────────────────────────────────────────

describe('story complete — v1-inert path', () => {
  it('exits 0 and prints inert message', () => {
    const { exitFn, getCode } = makeExitSeam();
    const cap = makeCapture();

    try {
      storyCompleteHandler(
        { storyId: 'STORY-99-01' },
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

// ─── story complete — v2-active ───────────────────────────────────────────────

describe('story complete — v2-active path (with fake run_script.sh)', () => {
  it('invokes run_script.sh complete_story.mjs', () => {
    const { exitFn } = makeExitSeam();
    const cap = makeCapture();
    const spawnMock = vi.fn().mockReturnValue({ status: 0, error: null });

    try {
      storyCompleteHandler(
        { storyId: 'STORY-99-01' },
        {
          sprintFilePath: FIXTURE_V2,
          sprintId: 'SPRINT-99',
          stdout: cap.stdout,
          stderr: cap.stderr,
          exit: exitFn,
          spawnFn: spawnMock as never,
          // Provide runScriptPath to bypass the stub-script existence check
          runScriptPath: '/fake/run_script.sh',
        },
      );
    } catch { /* expected */ }

    expect(spawnMock).toHaveBeenCalledOnce();
    const [, args] = spawnMock.mock.calls[0] as [string, string[]];
    expect(args[1]).toBe('complete_story.mjs');
    expect(args[2]).toBe('STORY-99-01');
  });
});

// ─── story complete — stub absent ────────────────────────────────────────────

describe('story complete — stub absent (no runScriptPath override)', () => {
  it('exits 1 with "not yet implemented" when complete_story.mjs is absent', () => {
    const { exitFn, getCode } = makeExitSeam();
    const cap = makeCapture();
    // Use a temp cwd where complete_story.mjs does not exist
    try {
      storyCompleteHandler(
        { storyId: 'STORY-99-01' },
        {
          sprintFilePath: FIXTURE_V2,
          sprintId: 'SPRINT-99',
          cwd: '/tmp/nonexistent-cwd-sprint99',
          stdout: cap.stdout,
          stderr: cap.stderr,
          exit: exitFn,
        },
      );
    } catch { /* expected */ }

    expect(getCode()).toBe(1);
    expect(cap.getErr().join(' ')).toContain('not yet implemented');
  });
});
