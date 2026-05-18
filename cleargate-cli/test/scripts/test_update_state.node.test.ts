import { describe, test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';

/**
 * test_update_state.test.ts — STORY-022-02 acceptance tests for update_state.mjs
 *
 * Gherkin scenarios (§2.1):
 *   Scenario 2: v1 state.json migrates additively on first read under new code
 *   Scenario 3: --lane sets the field on a single story
 *   Scenario 4: --lane-demote flips lane to standard with reason
 *   Scenario 5: Idempotency — re-reading a v2 state.json does not double-migrate
 *
 * Uses spawnSync to invoke update_state.mjs directly, real tmpdir filesystem.
 * CLEARGATE_STATE_FILE env var controls the state file path per update_state.mjs contract.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

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

// Resolve repo root: cleargate-cli/test/scripts/ → up 3 → repo root
// Path: test/scripts → test → cleargate-cli → repo-root
const REPO_ROOT = path.resolve(__dirname, '..', '..', '..');
const UPDATE_STATE_SCRIPT = path.join(REPO_ROOT, '.cleargate', 'scripts', 'update_state.mjs');
const FIXTURE_V1 = path.join(__dirname, 'fixtures', 'state-v1.json');

/** Run update_state.mjs with given args and CLEARGATE_STATE_FILE pointing at stateFile. */
function runUpdateState(stateFile: string, args: string[]): {
  status: number | null;
  stdout: string;
  stderr: string;
} {
  // Use '/usr/bin/env node' to avoid vitest's loader-wrapped process.execPath, which
  // causes CJS/ESM resolution failures when spawning .mjs files from a vitest context.
  const result = spawnSync(
    '/usr/bin/env',
    ['node', UPDATE_STATE_SCRIPT, ...args],
    {
      encoding: 'utf8',
      timeout: 10_000,
      env: { ...process.env, CLEARGATE_STATE_FILE: stateFile },
    },
  );
  return {
    status: result.status,
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
  };
}

// ─── Scenario 2: v1 state.json migrates additively on first read ─────────────

describe('Scenario 2: v1 state.json migrates additively on first read under new code', () => {
  let tmpDir: string;
  let stateFile: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cg-migrate-test-'));
    stateFile = path.join(tmpDir, 'state.json');
    // Copy the canonical v1 fixture (3 stories, no lane fields)
    fs.copyFileSync(FIXTURE_V1, stateFile);
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  test('exits 0 after migrating v1 state.json', () => {
    // Invoke with an idempotent state transition to trigger migration without side effects
    const result = runUpdateState(stateFile, ['STORY-TEST-01', 'Ready to Bounce']);
    // idempotent no-op is exit 0
    assert.strictEqual(result.status, 0);
  });

  test('on-disk state.json is updated to schema_version: 2', () => {
    runUpdateState(stateFile, ['STORY-TEST-01', 'Ready to Bounce']);
    const state = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
    assert.strictEqual(state.schema_version, 2);
  });

  test('every story has lane: "standard" and lane_assigned_by: "migration-default"', () => {
    runUpdateState(stateFile, ['STORY-TEST-01', 'Ready to Bounce']);
    const state = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
    for (const [storyId, story] of Object.entries(state.stories as Record<string, Record<string, unknown>>)) {
      assert.strictEqual(story.lane, `${storyId} lane`, 'standard');
      assert.strictEqual(story.lane_assigned_by, `${storyId} lane_assigned_by`, 'migration-default');
      assert.strictEqual(story.lane_demoted_at, `${storyId} lane_demoted_at`, null);
      assert.strictEqual(story.lane_demotion_reason, `${storyId} lane_demotion_reason`, null);
    }
  });

  test('no other pre-existing field on any story is mutated', () => {
    const before = JSON.parse(fs.readFileSync(FIXTURE_V1, 'utf8'));
    runUpdateState(stateFile, ['STORY-TEST-01', 'Ready to Bounce']);
    const after = JSON.parse(fs.readFileSync(stateFile, 'utf8'));

    // For each story in the v1 fixture, the pre-existing fields must be unchanged.
    // The idempotent no-op does NOT update updated_at (no state change), so all fields preserved.
    for (const storyId of Object.keys(before.stories)) {
      const bStory = before.stories[storyId] as Record<string, unknown>;
      const aStory = after.stories[storyId] as Record<string, unknown>;
      for (const field of ['state', 'qa_bounces', 'arch_bounces', 'worktree', 'updated_at', 'notes']) {
        assert.deepStrictEqual(aStory[field], `${storyId}.${field}`, bStory[field]);
      }
    }
  });

  test('emits a stderr log line for the migration with sprint ID and story count', () => {
    const result = runUpdateState(stateFile, ['STORY-TEST-01', 'Ready to Bounce']);
    assert.ok(String(result.stderr).includes('migration: schema_version 1 → 2 for sprint SPRINT-TEST (3 stories defaulted to lane: standard)'));
  });
});

// ─── Scenario 3: --lane sets the field on a single story ─────────────────────

describe('Scenario 3: --lane sets the field on a single story', () => {
  let tmpDir: string;
  let stateFile: string;

  // Build a v2 state.json with two stories, both at lane: "standard"
  function makeV2State() {
    return {
      schema_version: 2,
      sprint_id: 'SPRINT-TEST',
      execution_mode: 'v2',
      sprint_status: 'Active',
      stories: {
        'STORY-TEST-01': {
          state: 'Ready to Bounce',
          qa_bounces: 0,
          arch_bounces: 0,
          worktree: null,
          updated_at: '2026-01-01T00:00:00.000Z',
          notes: '',
          lane: 'standard',
          lane_assigned_by: 'migration-default',
          lane_demoted_at: null,
          lane_demotion_reason: null,
        },
        'STORY-TEST-02': {
          state: 'Bouncing',
          qa_bounces: 0,
          arch_bounces: 0,
          worktree: null,
          updated_at: '2026-01-01T00:00:00.000Z',
          notes: '',
          lane: 'standard',
          lane_assigned_by: 'migration-default',
          lane_demoted_at: null,
          lane_demotion_reason: null,
        },
      },
      last_action: 'init',
      updated_at: '2026-01-01T00:00:00.000Z',
    };
  }

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cg-lane-test-'));
    stateFile = path.join(tmpDir, 'state.json');
    fs.writeFileSync(stateFile, JSON.stringify(makeV2State(), null, 2) + '\n', 'utf8');
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  test('exits 0 when --lane fast is applied to an existing story', () => {
    const result = runUpdateState(stateFile, ['STORY-TEST-01', '--lane', 'fast']);
    assert.strictEqual(result.status, 0);
  });

  test('STORY-TEST-01 lane becomes "fast"', () => {
    runUpdateState(stateFile, ['STORY-TEST-01', '--lane', 'fast']);
    const state = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
    assert.strictEqual(state.stories['STORY-TEST-01'].lane, 'fast');
  });

  test('STORY-TEST-01 lane_assigned_by becomes "human-override"', () => {
    runUpdateState(stateFile, ['STORY-TEST-01', '--lane', 'fast']);
    const state = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
    assert.strictEqual(state.stories['STORY-TEST-01'].lane_assigned_by, 'human-override');
  });

  test('STORY-TEST-02 is not mutated', () => {
    const before = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
    runUpdateState(stateFile, ['STORY-TEST-01', '--lane', 'fast']);
    const after = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
    // lane, lane_assigned_by, state, counters all unchanged for the OTHER story
    assert.strictEqual(after.stories['STORY-TEST-02'].lane, before.stories['STORY-TEST-02'].lane);
    assert.strictEqual(after.stories['STORY-TEST-02'].state, before.stories['STORY-TEST-02'].state);
    assert.strictEqual(after.stories['STORY-TEST-02'].qa_bounces, before.stories['STORY-TEST-02'].qa_bounces);
  });

  test('rejects an invalid lane value with exit 2', () => {
    const result = runUpdateState(stateFile, ['STORY-TEST-01', '--lane', 'turbo']);
    assert.strictEqual(result.status, 2);
  });
});

// ─── Scenario 4: --lane-demote flips lane to standard with reason ─────────────

describe('Scenario 4: --lane-demote flips lane to standard with reason', () => {
  let tmpDir: string;
  let stateFile: string;

  function makeV2FastState() {
    return {
      schema_version: 2,
      sprint_id: 'SPRINT-TEST',
      execution_mode: 'v2',
      sprint_status: 'Active',
      stories: {
        'STORY-TEST-01': {
          state: 'Bouncing',
          qa_bounces: 1,
          arch_bounces: 0,
          worktree: null,
          updated_at: '2026-01-01T00:00:00.000Z',
          notes: '',
          lane: 'fast',
          lane_assigned_by: 'human-override',
          lane_demoted_at: null,
          lane_demotion_reason: null,
        },
      },
      last_action: 'lane-set',
      updated_at: '2026-01-01T00:00:00.000Z',
    };
  }

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cg-demote-test-'));
    stateFile = path.join(tmpDir, 'state.json');
    fs.writeFileSync(stateFile, JSON.stringify(makeV2FastState(), null, 2) + '\n', 'utf8');
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  test('exits 0', () => {
    const result = runUpdateState(stateFile, ['STORY-TEST-01', '--lane-demote', 'pre-gate scanner failed']);
    assert.strictEqual(result.status, 0);
  });

  test('lane becomes "standard"', () => {
    runUpdateState(stateFile, ['STORY-TEST-01', '--lane-demote', 'pre-gate scanner failed']);
    const state = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
    assert.strictEqual(state.stories['STORY-TEST-01'].lane, 'standard');
  });

  test('lane_demoted_at is populated with an ISO timestamp', () => {
    runUpdateState(stateFile, ['STORY-TEST-01', '--lane-demote', 'pre-gate scanner failed']);
    const state = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
    const demotedAt = state.stories['STORY-TEST-01'].lane_demoted_at as string;
    assert.ok(demotedAt);
    // Must be parseable as ISO date
    expect(() => new Date(demotedAt).toISOString()).not.toThrow();
  });

  test('lane_demotion_reason is "pre-gate scanner failed"', () => {
    runUpdateState(stateFile, ['STORY-TEST-01', '--lane-demote', 'pre-gate scanner failed']);
    const state = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
    assert.strictEqual(state.stories['STORY-TEST-01'].lane_demotion_reason, 'pre-gate scanner failed');
  });

  test('qa_bounces and arch_bounces are reset to 0', () => {
    runUpdateState(stateFile, ['STORY-TEST-01', '--lane-demote', 'pre-gate scanner failed']);
    const state = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
    assert.strictEqual(state.stories['STORY-TEST-01'].qa_bounces, 0);
    assert.strictEqual(state.stories['STORY-TEST-01'].arch_bounces, 0);
  });

  test('rejects --lane-demote with no reason argument (exit 2)', () => {
    const result = runUpdateState(stateFile, ['STORY-TEST-01', '--lane-demote']);
    assert.strictEqual(result.status, 2);
  });
});

// ─── Scenario 5: Idempotency — re-reading a v2 state.json does not double-migrate ─

describe('Scenario 5: Idempotency — re-reading a v2 state.json does not double-migrate', () => {
  let tmpDir: string;
  let stateFile: string;

  function makeV2State() {
    return {
      schema_version: 2,
      sprint_id: 'SPRINT-TEST',
      execution_mode: 'v2',
      sprint_status: 'Active',
      stories: {
        'STORY-TEST-01': {
          state: 'Ready to Bounce',
          qa_bounces: 0,
          arch_bounces: 0,
          worktree: null,
          updated_at: '2026-01-01T00:00:00.000Z',
          notes: '',
          lane: 'standard',
          lane_assigned_by: 'migration-default',
          lane_demoted_at: null,
          lane_demotion_reason: null,
        },
      },
      last_action: 'init',
      updated_at: '2026-01-01T00:00:00.000Z',
    };
  }

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cg-idempotent-test-'));
    stateFile = path.join(tmpDir, 'state.json');
    fs.writeFileSync(stateFile, JSON.stringify(makeV2State(), null, 2) + '\n', 'utf8');
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  test('no migration log line is emitted for a v2 state.json', () => {
    const result = runUpdateState(stateFile, ['STORY-TEST-01', 'Ready to Bounce']);
    assert.ok(!String(result.stderr).includes('migration:'));
  });

  test('on-disk state.json is byte-equal after a no-op invocation', () => {
    const before = fs.readFileSync(stateFile, 'utf8');
    runUpdateState(stateFile, ['STORY-TEST-01', 'Ready to Bounce']);
    const after = fs.readFileSync(stateFile, 'utf8');
    // The no-op (already in that state) should not rewrite the file
    assert.strictEqual(after, before);
  });

  test('running update twice on a v2 file produces no additional migration log', () => {
    // First run (no-op state transition)
    const result1 = runUpdateState(stateFile, ['STORY-TEST-01', 'Ready to Bounce']);
    assert.ok(!String(result1.stderr).includes('migration:'));
    // Second run
    const result2 = runUpdateState(stateFile, ['STORY-TEST-01', 'Ready to Bounce']);
    assert.ok(!String(result2.stderr).includes('migration:'));
  });
});
