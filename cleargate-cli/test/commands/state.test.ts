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
import * as fs from 'node:fs';
import * as os from 'node:os';
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

// ─── STORY-014-06: sentinel fallback scenarios ────────────────────────────────

/**
 * Build a temp CWD with:
 *   - `.cleargate/sprint-runs/.active` set to `sentinelId` (or empty when null)
 *   - `.cleargate/delivery/pending-sync/` containing a copy of the sprint fixture
 *     named `SPRINT-99.md` (for discovery by `discoverSprintFile`)
 */
function makeTempCwd(opts: {
  sentinelId: string | null;
  fixtureSource: string;
}): string {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cg-state-test-'));
  const sprintRunsDir = path.join(tmpDir, '.cleargate', 'sprint-runs');
  const pendingSyncDir = path.join(tmpDir, '.cleargate', 'delivery', 'pending-sync');
  fs.mkdirSync(sprintRunsDir, { recursive: true });
  fs.mkdirSync(pendingSyncDir, { recursive: true });

  // Write .active sentinel
  const activePath = path.join(sprintRunsDir, '.active');
  if (opts.sentinelId !== null) {
    fs.writeFileSync(activePath, opts.sentinelId + '\n', 'utf8');
  } else {
    fs.writeFileSync(activePath, '', 'utf8');
  }

  // Copy the sprint fixture to pending-sync so discovery finds it
  // The sentinel ID always resolves to SPRINT-99 in our fixture setup
  const fixtureContent = fs.readFileSync(opts.fixtureSource, 'utf8');
  fs.writeFileSync(path.join(pendingSyncDir, 'SPRINT-99.md'), fixtureContent, 'utf8');

  return tmpDir;
}

describe('Scenario: state update reads .active when no --sprint flag (STORY-014-06)', () => {
  it('routes to v2 using the sprint ID from .active sentinel', () => {
    const tmpCwd = makeTempCwd({ sentinelId: 'SPRINT-99', fixtureSource: FIXTURE_V2 });
    const { exitFn } = makeExitSeam();
    const spawnMock = vi.fn().mockReturnValue({ status: 0, error: null });

    try {
      stateUpdateHandler(
        { storyId: 'STORY-99-01', newState: 'Done' },
        {
          // No sprintId — must be resolved from sentinel
          cwd: tmpCwd,
          exit: exitFn,
          spawnFn: spawnMock as never,
          runScriptPath: '/fake/run_script.sh',
        },
      );
    } catch { /* expected */ }

    expect(spawnMock).toHaveBeenCalledOnce();
    const [, args] = spawnMock.mock.calls[0] as [string, string[]];
    expect(args[1]).toBe('update_state.mjs');
    expect(args[2]).toBe('STORY-99-01');
  });
});

describe('Scenario: state update --sprint flag overrides sentinel (STORY-014-06)', () => {
  it('uses the explicit --sprint SPRINT-NEW over .active = SPRINT-OLD', () => {
    // .active says SPRINT-OLD; provide v1 fixture for SPRINT-OLD so we can
    // detect that the handler used SPRINT-NEW (v2) instead.
    const tmpCwd = makeTempCwd({ sentinelId: 'SPRINT-OLD', fixtureSource: FIXTURE_V1 });

    // Also plant a v2 fixture for SPRINT-NEW so execution-mode returns v2
    const pendingSyncDir = path.join(tmpCwd, '.cleargate', 'delivery', 'pending-sync');
    const v2Content = fs.readFileSync(FIXTURE_V2, 'utf8');
    fs.writeFileSync(path.join(pendingSyncDir, 'SPRINT-NEW.md'), v2Content, 'utf8');

    const { exitFn } = makeExitSeam();
    const spawnMock = vi.fn().mockReturnValue({ status: 0, error: null });

    try {
      stateUpdateHandler(
        { storyId: 'STORY-NEW-01', newState: 'Done' },
        {
          cwd: tmpCwd,
          sprintId: 'SPRINT-NEW',  // explicit flag wins
          exit: exitFn,
          spawnFn: spawnMock as never,
          runScriptPath: '/fake/run_script.sh',
        },
      );
    } catch { /* expected */ }

    // Should have spawned (v2 mode) because SPRINT-NEW has execution_mode: v2
    expect(spawnMock).toHaveBeenCalledOnce();
    const [, args] = spawnMock.mock.calls[0] as [string, string[]];
    expect(args[1]).toBe('update_state.mjs');
    expect(args[2]).toBe('STORY-NEW-01');
  });
});

describe('Scenario: state update falls to v1-inert when no sprint context (STORY-014-06)', () => {
  it('prints v1 inert message and exits 0 when .active is empty and no --sprint flag', () => {
    const tmpCwd = makeTempCwd({ sentinelId: null, fixtureSource: FIXTURE_V1 });
    const { exitFn, getCode } = makeExitSeam();
    const cap = makeCapture();
    const spawnMock = vi.fn().mockReturnValue({ status: 0, error: null });

    try {
      stateUpdateHandler(
        { storyId: 'STORY-XX-01', newState: 'Done' },
        {
          cwd: tmpCwd,
          // No sprintId, .active is empty
          stdout: cap.stdout,
          stderr: cap.stderr,
          exit: exitFn,
          spawnFn: spawnMock as never,
          runScriptPath: '/fake/run_script.sh',
        },
      );
    } catch { /* expected */ }

    expect(getCode()).toBe(0);
    expect(cap.getOut().join(' ')).toContain(V1_INERT_MESSAGE);
    expect(spawnMock).not.toHaveBeenCalled();
  });
});
