import { describe, test, afterEach, mock } from 'node:test';
import assert from 'node:assert/strict';

/**
 * story.test.ts — unit tests for `cleargate story start|complete` handlers.
 *
 * STORY-014-07 scenarios (5, per §2.1):
 *   1. start STORY-XX-01 → 3-step spawn sequence + state.json worktree field.
 *   2. complete STORY-XX-01 → 6-step spawn sequence in order.
 *   3. complete refuses when rev-list count = 0 → exit 1 + stderr message.
 *   4. v1-inert for both commands.
 *   5. Merge conflict → stderr diagnostic + `git merge --abort` suggestion + exit 1.
 *
 * IMPORTANT: All tests use synthetic SPRINT-99 fixture, never SPRINT-09/10 state.
 */

import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { storyStartHandler, storyCompleteHandler } from '../../src/commands/story.js';
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

/** Seed a sprint-runs/<id>/state.json in a temp cwd for start-handler tests. */
function seedTempSprintState(sprintId: string, storyId: string): {
  cwd: string;
  stateFile: string;
  cleanup: () => void;
} {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'cg-story-test-'));
  const runDir = path.join(cwd, '.cleargate', 'sprint-runs', sprintId);
  fs.mkdirSync(runDir, { recursive: true });
  const stateFile = path.join(runDir, 'state.json');
  const initial = {
    schema_version: 2,
    sprint_id: sprintId,
    execution_mode: 'v2',
    sprint_status: 'Active',
    stories: {
      [storyId]: {
        state: 'Bouncing', // update_state.mjs already flipped this
        qa_bounces: 0,
        arch_bounces: 0,
        worktree: null,
        updated_at: '2026-04-21T10:00:00Z',
        notes: '',
        lane: 'standard',
        lane_assigned_by: 'migration-default',
        lane_demoted_at: null,
        lane_demotion_reason: null,
      },
    },
    last_action: 'test-seed',
    updated_at: '2026-04-21T10:00:00Z',
  };
  fs.writeFileSync(stateFile, JSON.stringify(initial, null, 2) + '\n', 'utf8');
  return {
    cwd,
    stateFile,
    cleanup: () => { fs.rmSync(cwd, { recursive: true, force: true }); },
  };
}

// Track temp dirs for cleanup
const tempDirs: Array<() => void> = [];
afterEach(() => {
  while (tempDirs.length) {
    const fn = tempDirs.pop();
    try { fn?.(); } catch { /* swallow */ }
  }
});

// ─── Scenario 1: story start — 3-step spawn + state.json mutation ─────────────

describe('Scenario 1: story start — 3-step spawn + state.json mutation', () => {
  test('spawns git worktree add, update_state.mjs, then writes worktree field', () => {
    const seed = seedTempSprintState('SPRINT-99', 'STORY-99-01');
    tempDirs.push(seed.cleanup);

    const { exitFn, getCode } = makeExitSeam();
    const cap = makeCapture();
    const spawnMock = mock.fn(() => ({ 
      status: 0,
      error: null,
      stdout: '',
      stderr: '',
    }));

    try {
      storyStartHandler(
        { storyId: 'STORY-99-01' },
        {
          sprintFilePath: FIXTURE_V2,
          sprintId: 'SPRINT-99',
          cwd: seed.cwd,
          stdout: cap.stdout,
          stderr: cap.stderr,
          exit: exitFn,
          spawnFn: spawnMock as never,
        },
      );
    } catch { /* expected exit */ }

    expect(getCode()).toBe(0);

    // Assert exactly 2 spawns (step 3 is fs write, not a spawn).
    assert.strictEqual(spawnMock.mock.calls.length, 2);

    // Step 1: git worktree add <path> -b story/<ID> <sprintBranch>
    const [cmd1, args1] = spawnMock.mock.calls[0].arguments as [string, string[]];
    assert.strictEqual(cmd1, 'git');
    assert.strictEqual(args1[0], 'worktree');
    assert.strictEqual(args1[1], 'add');
    assert.ok(String(args1[2]).includes('.worktrees'));
    assert.ok(String(args1[2]).includes('STORY-99-01'));
    assert.strictEqual(args1[3], '-b');
    assert.strictEqual(args1[4], 'story/STORY-99-01');
    assert.strictEqual(args1[5], 'sprint/S-99');

    // Step 2: bash run_script.sh update_state.mjs STORY-99-01 Bouncing
    const [cmd2, args2] = spawnMock.mock.calls[1].arguments as [string, string[]];
    assert.strictEqual(cmd2, 'bash');
    // args2[0] is runScript path, args2[1..] are script args
    assert.strictEqual(args2[1], 'update_state.mjs');
    assert.strictEqual(args2[2], 'STORY-99-01');
    assert.strictEqual(args2[3], 'Bouncing');

    // Step 3: state.json worktree field mutated.
    const state = JSON.parse(fs.readFileSync(seed.stateFile, 'utf8'));
    assert.strictEqual(state.stories['STORY-99-01'].worktree, '.worktrees/STORY-99-01');
    // State field untouched by the CLI second pass (update_state.mjs owns it;
    // the seed already has "Bouncing" to reflect the 2-pass ordering).
    assert.strictEqual(state.stories['STORY-99-01'].state, 'Bouncing');
  });
});

// ─── Scenario 2: story complete — 6-step spawn sequence in order ──────────────

describe('Scenario 2: story complete — 6-step spawn sequence in order', () => {
  test('fires rev-list, checkout, merge, worktree remove, branch -d, update_state.mjs', () => {
    const { exitFn, getCode } = makeExitSeam();
    const cap = makeCapture();
    // Mock: step 1 (rev-list) returns count=1; all others return 0.
    let callIdx = 0;
    const spawnMock = mock.fn(() => {
      const idx = callIdx++;
      if (idx === 0) {
        return { status: 0, error: null, stdout: '1\n', stderr: '' };
      }
      return { status: 0, error: null, stdout: '', stderr: '' };
    });

    try {
      storyCompleteHandler(
        { storyId: 'STORY-99-01' },
        {
          sprintFilePath: FIXTURE_V2,
          sprintId: 'SPRINT-99',
          cwd: '/tmp/does-not-matter-for-mocked-spawn',
          stdout: cap.stdout,
          stderr: cap.stderr,
          exit: exitFn,
          spawnFn: spawnMock as never,
        },
      );
    } catch { /* expected exit */ }

    expect(getCode()).toBe(0);
    assert.strictEqual(spawnMock.mock.calls.length, 6);

    // Step 1: git rev-list --count sprint/S-99..story/STORY-99-01
    const [cmd1, args1] = spawnMock.mock.calls[0].arguments as [string, string[]];
    assert.strictEqual(cmd1, 'git');
    assert.strictEqual(args1[0], 'rev-list');
    assert.strictEqual(args1[1], '--count');
    assert.strictEqual(args1[2], 'sprint/S-99..story/STORY-99-01');

    // Step 2: git -C <cwd> checkout sprint/S-99
    const [cmd2, args2] = spawnMock.mock.calls[1].arguments as [string, string[]];
    assert.strictEqual(cmd2, 'git');
    assert.strictEqual(args2[0], '-C');
    assert.strictEqual(args2[2], 'checkout');
    assert.strictEqual(args2[3], 'sprint/S-99');

    // Step 3: git merge story/STORY-99-01 --no-ff -m "merge: story/... → sprint/..."
    const [cmd3, args3] = spawnMock.mock.calls[2].arguments as [string, string[]];
    assert.strictEqual(cmd3, 'git');
    assert.strictEqual(args3[0], 'merge');
    assert.strictEqual(args3[1], 'story/STORY-99-01');
    assert.strictEqual(args3[2], '--no-ff');
    assert.strictEqual(args3[3], '-m');
    assert.ok(String(args3[4]).includes('merge:'));
    assert.ok(String(args3[4]).includes('story/STORY-99-01'));
    assert.ok(String(args3[4]).includes('sprint/S-99'));

    // Step 4: git worktree remove .worktrees/STORY-99-01
    const [cmd4, args4] = spawnMock.mock.calls[3].arguments as [string, string[]];
    assert.strictEqual(cmd4, 'git');
    assert.strictEqual(args4[0], 'worktree');
    assert.strictEqual(args4[1], 'remove');
    assert.ok(String(args4[2]).includes('STORY-99-01'));

    // Step 5: git branch -d story/STORY-99-01
    const [cmd5, args5] = spawnMock.mock.calls[4].arguments as [string, string[]];
    assert.strictEqual(cmd5, 'git');
    assert.strictEqual(args5[0], 'branch');
    assert.strictEqual(args5[1], '-d');
    assert.strictEqual(args5[2], 'story/STORY-99-01');

    // Step 6: bash run_script.sh update_state.mjs STORY-99-01 Done
    const [cmd6, args6] = spawnMock.mock.calls[5].arguments as [string, string[]];
    assert.strictEqual(cmd6, 'bash');
    assert.strictEqual(args6[1], 'update_state.mjs');
    assert.strictEqual(args6[2], 'STORY-99-01');
    assert.strictEqual(args6[3], 'Done');
  });
});

// ─── Scenario 3: complete refuses when rev-list count = 0 ────────────────────

describe('Scenario 3: complete refuses when rev-list count = 0', () => {
  test('exits 1 with "no commits on story branch — nothing to merge"', () => {
    const { exitFn, getCode } = makeExitSeam();
    const cap = makeCapture();
    const spawnMock = mock.fn(() => ({
      status: 0,
      error: null,
      stdout: '0\n',
      stderr: '',
    }));

    try {
      storyCompleteHandler(
        { storyId: 'STORY-99-01' },
        {
          sprintFilePath: FIXTURE_V2,
          sprintId: 'SPRINT-99',
          cwd: '/tmp/irrelevant-cwd',
          stdout: cap.stdout,
          stderr: cap.stderr,
          exit: exitFn,
          spawnFn: spawnMock as never,
        },
      );
    } catch { /* expected exit */ }

    expect(getCode()).toBe(1);
    // Only step 1 (rev-list) ran; subsequent steps skipped.
    assert.strictEqual(spawnMock.mock.calls.length, 1);
    expect(cap.getErr().join('\n')).toContain('no commits on story branch');
    expect(cap.getErr().join('\n')).toContain('nothing to merge');
  });
});

// ─── Scenario 4: v1-inert for both commands ───────────────────────────────────

describe('Scenario 4: v1-inert for both commands', () => {
  test('story start under v1 prints inert message + exits 0 + no spawn', () => {
    const { exitFn, getCode } = makeExitSeam();
    const cap = makeCapture();
    const spawnMock = mock.fn();

    try {
      storyStartHandler(
        { storyId: 'STORY-99-01' },
        {
          sprintFilePath: FIXTURE_V1,
          sprintId: 'SPRINT-99',
          stdout: cap.stdout,
          stderr: cap.stderr,
          exit: exitFn,
          spawnFn: spawnMock as never,
        },
      );
    } catch { /* expected exit */ }

    expect(getCode()).toBe(0);
    assert.strictEqual(spawnMock.mock.calls.length, 0);
    expect(cap.getOut().join(' ')).toContain('v1 mode active');
    expect(cap.getOut().join(' ')).toContain(V1_INERT_MESSAGE);
  });

  test('story complete under v1 prints inert message + exits 0 + no spawn', () => {
    const { exitFn, getCode } = makeExitSeam();
    const cap = makeCapture();
    const spawnMock = mock.fn();

    try {
      storyCompleteHandler(
        { storyId: 'STORY-99-01' },
        {
          sprintFilePath: FIXTURE_V1,
          sprintId: 'SPRINT-99',
          stdout: cap.stdout,
          stderr: cap.stderr,
          exit: exitFn,
          spawnFn: spawnMock as never,
        },
      );
    } catch { /* expected exit */ }

    expect(getCode()).toBe(0);
    assert.strictEqual(spawnMock.mock.calls.length, 0);
    expect(cap.getOut().join(' ')).toContain('v1 mode active');
  });
});

// ─── Scenario 5: merge conflict surfaces cleanly ─────────────────────────────

describe('Scenario 5: merge conflict surfaces cleanly', () => {
  test('exits 1 + suggests `git merge --abort` when merge returns non-zero', () => {
    const { exitFn, getCode } = makeExitSeam();
    const cap = makeCapture();
    // Mock sequence: rev-list=1, checkout=0, merge=1 (conflict).
    let callIdx = 0;
    const spawnMock = mock.fn(() => {
      const idx = callIdx++;
      if (idx === 0) {
        return { status: 0, error: null, stdout: '1\n', stderr: '' };
      }
      if (idx === 1) {
        return { status: 0, error: null, stdout: '', stderr: '' };
      }
      // idx === 2 → merge step
      return {
        status: 1,
        error: null,
        stdout: '',
        stderr: 'CONFLICT (content): Merge conflict in foo.txt\n',
      };
    });

    try {
      storyCompleteHandler(
        { storyId: 'STORY-99-01' },
        {
          sprintFilePath: FIXTURE_V2,
          sprintId: 'SPRINT-99',
          cwd: '/tmp/irrelevant-cwd',
          stdout: cap.stdout,
          stderr: cap.stderr,
          exit: exitFn,
          spawnFn: spawnMock as never,
        },
      );
    } catch { /* expected exit */ }

    expect(getCode()).toBe(1);
    // Only 3 calls — merge was step 3, aborted before worktree remove.
    assert.strictEqual(spawnMock.mock.calls.length, 3);

    const errText = cap.getErr().join('\n');
    assert.ok(String(errText).includes('merge conflict'));
    assert.ok(String(errText).includes('git merge --abort'));
    // Conflict markers are NOT auto-aborted — the orchestrator UX decision.
    // (We cannot assert on filesystem here since spawn is mocked; the decision
    // manifests as "no `git merge --abort` spawn was issued".)
    const gitArgs = spawnMock.mock.calls.map((c) => (c as [string, string[]])[1]);
    const hasAbort = gitArgs.some(
      (args) => args[0] === 'merge' && args.includes('--abort'),
    );
    assert.strictEqual(hasAbort, false);
  });
});
