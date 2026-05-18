import { describe, test, mock } from 'node:test';
import assert from 'node:assert/strict';

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

import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { stateUpdateHandler, stateValidateHandler } from '../../src/commands/state.js';
import { V1_INERT_MESSAGE } from '../../src/commands/execution-mode.js';

// Minimal expect() shim (STORY-028-06)
// Backs remaining expect() calls with node:assert so vitest is not needed.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function expect(actual: any): any {
  const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return {
    toBe(expected: unknown) { assert.strictEqual(actual, expected); },
    toEqual(expected: unknown) { assert.deepStrictEqual(actual, expected); },
    toStrictEqual(expected: unknown) { assert.deepStrictEqual(actual, expected); },
    toBeNull() { assert.strictEqual(actual, null); },
    toBeUndefined() { assert.strictEqual(actual, undefined); },
    toBeDefined() { assert.notStrictEqual(actual, undefined); },
    toBeTruthy() { assert.ok(actual); },
    toBeFalsy() { assert.ok(!actual); },
    toBeGreaterThan(n: number) { assert.ok((actual as number) > n); },
    toBeGreaterThanOrEqual(n: number) { assert.ok((actual as number) >= n); },
    toBeLessThan(n: number) { assert.ok((actual as number) < n); },
    toBeLessThanOrEqual(n: number) { assert.ok((actual as number) <= n); },
    toContain(sub: unknown) { assert.ok(String(actual).includes(String(sub))); },
    toMatch(p: string | RegExp) { assert.match(String(actual), typeof p === 'string' ? new RegExp(esc(p)) : p); },
    toHaveLength(len: number) { assert.strictEqual((actual as { length: number }).length, len); },
    toThrow(msg?: string | RegExp) {
      if (!msg) assert.throws(actual as () => void);
      else if (typeof msg === 'string') assert.throws(actual as () => void, new RegExp(esc(msg)));
      else assert.throws(actual as () => void, msg);
    },
    toBeInstanceOf(cls: new (...a: unknown[]) => unknown) { assert.ok(actual instanceof cls); },
    toMatchObject(expected: Record<string, unknown>) { assert.deepStrictEqual(actual, expected); },
    toHaveBeenCalled() { assert.ok((actual as { mock: { calls: unknown[] } }).mock.calls.length > 0); },
    toHaveBeenCalledTimes(n: number) { assert.strictEqual((actual as { mock: { calls: unknown[] } }).mock.calls.length, n); },
    toHaveBeenCalledOnce() { assert.strictEqual((actual as { mock: { calls: unknown[] } }).mock.calls.length, 1); },
    toHaveBeenCalledWith(...expectedArgs: unknown[]) {
      const calls = (actual as { mock: { calls: Array<{arguments: unknown[]}> } }).mock.calls;
      assert.deepStrictEqual(calls[calls.length - 1].arguments, expectedArgs);
    },
    toHaveProperty(key: string, val?: unknown) {
      const obj = actual as Record<string, unknown>;
      assert.ok(key in obj);
      if (val !== undefined) assert.deepStrictEqual(obj[key], val);
    },
    get not(): any {
      return {
        toBe(expected: unknown) { assert.notStrictEqual(actual, expected); },
        toEqual(expected: unknown) { assert.notDeepStrictEqual(actual, expected); },
        toBeNull() { assert.notStrictEqual(actual, null); },
        toBeUndefined() { assert.notStrictEqual(actual, undefined); },
        toBeDefined() { assert.strictEqual(actual, undefined); },
        toBeTruthy() { assert.ok(!actual); },
        toBeFalsy() { assert.ok(actual); },
        toContain(sub: unknown) { assert.ok(!String(actual).includes(String(sub))); },
        toMatch(p: string | RegExp) { assert.doesNotMatch(String(actual), typeof p === 'string' ? new RegExp(esc(p)) : p); },
        toThrow() { assert.doesNotThrow(actual as () => void); },
        toHaveBeenCalled() { assert.strictEqual((actual as { mock: { calls: unknown[] } }).mock.calls.length, 0); },
        toHaveProperty(key: string) { const obj = actual as Record<string, unknown>; assert.ok(!(key in obj)); },
        toBeInstanceOf(cls: new (...a: unknown[]) => unknown) { assert.ok(!(actual instanceof cls)); },
        toHaveLength(len: number) { assert.notStrictEqual((actual as { length: number }).length, len); },
      };
    },
    get resolves(): any {
      const p = actual as Promise<unknown>;
      return {
        async toBe(expected: unknown) { assert.strictEqual(await p, expected); },
        async toEqual(expected: unknown) { assert.deepStrictEqual(await p, expected); },
        async toBeUndefined() { assert.strictEqual(await p, undefined); },
        async toBeNull() { assert.strictEqual(await p, null); },
        async toBeDefined() { assert.notStrictEqual(await p, undefined); },
        async toBeTruthy() { assert.ok(await p); },
      };
    },
    get rejects(): any {
      const p = actual as Promise<unknown>;
      return {
        async toBeInstanceOf(cls: new (...a: unknown[]) => unknown) { await assert.rejects(p, cls); },
        async toThrow(msg?: string | RegExp | (new (...a: unknown[]) => unknown)) {
          if (!msg) await assert.rejects(p);
          else if (typeof msg === 'string') await assert.rejects(p, new RegExp(esc(msg)));
          else await assert.rejects(p, msg as RegExp);
        },
        async toSatisfy(predicate: (val: unknown) => boolean) {
          let err: unknown;
          try { await p; } catch(e) { err = e; }
          assert.ok(predicate(err), `Rejected value did not satisfy predicate. Got: ${String(err)}`);
        },
        async toMatchObject(expected: Record<string, unknown>) {
          let err: unknown;
          try { await p; } catch(e) { err = e; }
          const errObj = err as Record<string, unknown>;
          for (const [k, v] of Object.entries(expected)) {
            if (typeof v === 'string' && (v as any).__isStringContaining) {
              assert.ok(String(errObj[k]).includes((v as any).__value), `Expected ${k} to contain "${(v as any).__value}"`);
            } else {
              assert.deepStrictEqual(errObj[k], v, `Expected ${k} to equal ${String(v)}`);
            }
          }
        },
      };
    },
  };
}
// expect.stringContaining — creates a partial string matcher for use in toMatchObject
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(expect as any).stringContaining = (str: string) => ({ __isStringContaining: true, __value: str });


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
  test('exits 0 and prints inert message', () => {
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

  test('does not spawn any subprocess', () => {
    const { exitFn } = makeExitSeam();
    const spawnMock = mock.fn(() => ({ status: 0, error: null }));

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

    assert.strictEqual(spawnMock.mock.calls.length, 0);
  });
});

// ─── state update — v2-active ─────────────────────────────────────────────────

describe('state update — v2-active path', () => {
  test('invokes run_script.sh update_state.mjs with story-id and new-state', () => {
    const { exitFn } = makeExitSeam();
    const spawnMock = mock.fn(() => ({ status: 0, error: null }));

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
    const [cmd, args] = spawnMock.mock.calls[0].arguments as [string, string[]];
    assert.strictEqual(cmd, 'bash');
    assert.strictEqual(args[0], '/fake/run_script.sh');
    assert.strictEqual(args[1], 'update_state.mjs');
    assert.strictEqual(args[2], 'STORY-99-01');
    assert.strictEqual(args[3], 'In Progress');
  });

  test('propagates exit code from script', () => {
    const { exitFn, getCode } = makeExitSeam();
    const spawnMock = mock.fn(() => ({ status: 5, error: null }));

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
  test('exits 0 and prints inert message', () => {
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
  test('invokes run_script.sh validate_state.mjs with sprint-id', () => {
    const { exitFn } = makeExitSeam();
    const spawnMock = mock.fn(() => ({ status: 0, error: null }));

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
    const [cmd, args] = spawnMock.mock.calls[0].arguments as [string, string[]];
    assert.strictEqual(cmd, 'bash');
    assert.strictEqual(args[0], '/fake/run_script.sh');
    assert.strictEqual(args[1], 'validate_state.mjs');
    assert.strictEqual(args[2], 'SPRINT-99');
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
  test('routes to v2 using the sprint ID from .active sentinel', () => {
    const tmpCwd = makeTempCwd({ sentinelId: 'SPRINT-99', fixtureSource: FIXTURE_V2 });
    const { exitFn } = makeExitSeam();
    const spawnMock = mock.fn(() => ({ status: 0, error: null }));

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
    const [, args] = spawnMock.mock.calls[0].arguments as [string, string[]];
    assert.strictEqual(args[1], 'update_state.mjs');
    assert.strictEqual(args[2], 'STORY-99-01');
  });
});

describe('Scenario: state update --sprint flag overrides sentinel (STORY-014-06)', () => {
  test('uses the explicit --sprint SPRINT-NEW over .active = SPRINT-OLD', () => {
    // .active says SPRINT-OLD; provide v1 fixture for SPRINT-OLD so we can
    // detect that the handler used SPRINT-NEW (v2) instead.
    const tmpCwd = makeTempCwd({ sentinelId: 'SPRINT-OLD', fixtureSource: FIXTURE_V1 });

    // Also plant a v2 fixture for SPRINT-NEW so execution-mode returns v2
    const pendingSyncDir = path.join(tmpCwd, '.cleargate', 'delivery', 'pending-sync');
    const v2Content = fs.readFileSync(FIXTURE_V2, 'utf8');
    fs.writeFileSync(path.join(pendingSyncDir, 'SPRINT-NEW.md'), v2Content, 'utf8');

    const { exitFn } = makeExitSeam();
    const spawnMock = mock.fn(() => ({ status: 0, error: null }));

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
    const [, args] = spawnMock.mock.calls[0].arguments as [string, string[]];
    assert.strictEqual(args[1], 'update_state.mjs');
    assert.strictEqual(args[2], 'STORY-NEW-01');
  });
});

describe('Scenario: state update falls to v1-inert when no sprint context (STORY-014-06)', () => {
  test('prints v1 inert message and exits 0 when .active is empty and no --sprint flag', () => {
    const tmpCwd = makeTempCwd({ sentinelId: null, fixtureSource: FIXTURE_V1 });
    const { exitFn, getCode } = makeExitSeam();
    const cap = makeCapture();
    const spawnMock = mock.fn(() => ({ status: 0, error: null }));

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
    assert.strictEqual(spawnMock.mock.calls.length, 0);
  });
});
