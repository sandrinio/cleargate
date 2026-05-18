import { describe, test, mock } from 'node:test';
import assert from 'node:assert/strict';

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

import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { sprintInitHandler, sprintCloseHandler } from '../../src/commands/sprint.js';
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
  test('exit code is 0', () => {
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

  test('stdout contains inert message', () => {
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

  test('no subprocess is spawned under v1', () => {
    const { exitFn } = makeExitSeam();
    const cap = makeCapture();
    const spawnMock = mock.fn(() => ({ status: 0, error: null }));

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

    assert.strictEqual(spawnMock.mock.calls.length, 0);
  });
});

// ─── Scenario 2: v2 mode routes to script — sprint init ──────────────────────

describe('Scenario: v2 mode routes to script (sprint init)', () => {
  test('run_script.sh init_sprint.mjs is invoked via spawnFn', () => {
    const { exitFn } = makeExitSeam();
    const cap = makeCapture();
    const spawnMock = mock.fn(() => ({ status: 0, error: null }));

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
    const [cmd, args] = spawnMock.mock.calls[0].arguments as [string, string[]];
    assert.strictEqual(cmd, 'bash');
    assert.strictEqual(args[0], '/fake/run_script.sh');
    assert.strictEqual(args[1], 'init_sprint.mjs');
    assert.strictEqual(args[2], 'SPRINT-99');
  });

  test('exit code reflects script exit code', () => {
    const { exitFn, getCode } = makeExitSeam();
    const cap = makeCapture();
    const spawnMock = mock.fn(() => ({ status: 42, error: null }));

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

// ─── STORY-026-01: skill load directive on sprint init ───────────────────────

describe('Scenario (STORY-026-01): sprint init success emits skill load directive', () => {
  test('stdout contains "→ Load skill: sprint-execution" when init script exits 0', () => {
    const { exitFn } = makeExitSeam();
    const cap = makeCapture();
    const spawnMock = mock.fn(() => ({ status: 0, error: null }));

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

    expect(cap.getOut().join(' ')).toContain('→ Load skill: sprint-execution');
  });
});

describe('Scenario (STORY-026-01): sprint init failure stays quiet on skill directive', () => {
  test('stdout does NOT contain "Load skill: sprint-execution" when init script exits non-zero', () => {
    const { exitFn, getCode } = makeExitSeam();
    const cap = makeCapture();
    const spawnMock = mock.fn(() => ({ status: 1, error: null }));

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

    expect(getCode()).toBe(1);
    expect(cap.getOut().join(' ')).not.toContain('Load skill: sprint-execution');
  });
});

// ─── Sprint close v1-inert ────────────────────────────────────────────────────

describe('sprint close — v1-inert path', () => {
  test('exits 0 and prints inert message', () => {
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
  test('invokes run_script.sh close_sprint.mjs', () => {
    const { exitFn } = makeExitSeam();
    const cap = makeCapture();
    const spawnMock = mock.fn(() => ({ status: 0, error: null }));

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
    const [, args] = spawnMock.mock.calls[0].arguments as [string, string[]];
    assert.strictEqual(args[1], 'close_sprint.mjs');
    assert.strictEqual(args[2], 'SPRINT-99');
  });
});

// ─── Scenario 5: flag-flip roundtrip ─────────────────────────────────────────

describe('Scenario: flag-flip roundtrip', () => {
  test('v1 fixture → inert, v2 fixture → routes to script', () => {
    const spawnMock = mock.fn(() => ({ status: 0, error: null }));

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
    assert.strictEqual(spawnMock.mock.calls.length, 0);

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
  test('exits 0 with inert message when sprint file does not exist', () => {
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
  test('spawns close_sprint.mjs with --assume-ack as the last arg', () => {
    const { exitFn } = makeExitSeam();
    const cap = makeCapture();
    const spawnMock = mock.fn(() => ({ status: 0, error: null }));

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
    const [, args] = spawnMock.mock.calls[0].arguments as [string, string[]];
    assert.strictEqual(args[1], 'close_sprint.mjs');
    assert.strictEqual(args[2], 'SPRINT-99');
    assert.strictEqual(args[args.length - 1], '--assume-ack');
  });

  test('does not append --assume-ack when flag is absent', () => {
    const { exitFn } = makeExitSeam();
    const spawnMock = mock.fn(() => ({ status: 0, error: null }));

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
    const [, args] = spawnMock.mock.calls[0].arguments as [string, string[]];
    assert.ok(!String(args).includes('--assume-ack'));
  });
});
