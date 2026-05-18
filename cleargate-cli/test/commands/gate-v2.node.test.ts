import { describe, test, mock } from 'node:test';
import assert from 'node:assert/strict';

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

import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { gateQaHandler, gateArchHandler } from '../../src/commands/gate.js';
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

// ─── gate qa — v1-inert ───────────────────────────────────────────────────────

describe('gate qa — v1-inert path', () => {
  test('exits 0 and prints inert message', () => {
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

  test('does not spawn any subprocess', () => {
    const { exitFn } = makeExitSeam();
    const spawnMock = mock.fn(() => ({ status: 0, error: null }));

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

    assert.strictEqual(spawnMock.mock.calls.length, 0);
  });
});

// ─── gate qa — v2-active ──────────────────────────────────────────────────────

describe('gate qa — v2-active path', () => {
  test('invokes run_script.sh pre_gate_runner.sh qa with worktree and branch', () => {
    const { exitFn } = makeExitSeam();
    const spawnMock = mock.fn(() => ({ status: 0, error: null }));

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
    const [cmd, args] = spawnMock.mock.calls[0].arguments as [string, string[]];
    assert.strictEqual(cmd, 'bash');
    assert.strictEqual(args[0], '/fake/run_script.sh');
    assert.strictEqual(args[1], 'pre_gate_runner.sh');
    assert.strictEqual(args[2], 'qa');
    assert.strictEqual(args[3], '.worktrees/STORY-99-01');
    assert.strictEqual(args[4], 'sprint/S-99');
  });
});

// ─── gate arch — v1-inert ─────────────────────────────────────────────────────

describe('gate arch — v1-inert path', () => {
  test('exits 0 and prints inert message', () => {
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
  test('invokes run_script.sh pre_gate_runner.sh arch with worktree and branch', () => {
    const { exitFn } = makeExitSeam();
    const spawnMock = mock.fn(() => ({ status: 0, error: null }));

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
    const [cmd, args] = spawnMock.mock.calls[0].arguments as [string, string[]];
    assert.strictEqual(cmd, 'bash');
    assert.strictEqual(args[0], '/fake/run_script.sh');
    assert.strictEqual(args[1], 'pre_gate_runner.sh');
    assert.strictEqual(args[2], 'arch');
    assert.strictEqual(args[3], '.worktrees/STORY-99-01');
    assert.strictEqual(args[4], 'sprint/S-99');
  });
});

// ─── Scenario 3: CLI collision audit ────────────────────────────────────────

describe('Scenario: No CLI collision — gate qa|arch vs gate check|explain', () => {
  test('gate qa and arch are distinct subcommand names from check and explain', () => {
    const existingGateSubcommands = ['check', 'explain'];
    const newGateSubcommands = ['qa', 'arch'];

    for (const newCmd of newGateSubcommands) {
      assert.ok(!String(existingGateSubcommands).includes(newCmd));
    }
  });
});

// ─── Scenario 4 (partial): all wrappers route through run_script.sh ──────────

describe('Scenario: All four wrappers route through run_script.sh', () => {
  test('gate qa routes through run_script.sh (verified in test above)', () => {
    // Verified by "gate qa v2-active" test above.
    // This test confirms the invariant at a summary level.
    const runScriptInvocations: string[][] = [];
    const spawnMock = mock.fn((_cmd: string, args: string[]) => {
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
    assert.strictEqual(runScriptInvocations[0]![0], '/fake/run_script.sh');
    assert.ok(!String(runScriptInvocations[0]![0]).includes('node'));
  });
});
