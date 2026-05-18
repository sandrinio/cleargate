import { describe, test, afterEach } from 'node:test';
import assert from 'node:assert/strict';

/**
 * test_prep_reporter_context.test.ts — CR-035 smoke tests
 *
 * Verifies that prep_reporter_context.mjs buildTokenLedgerDigest() emits
 * the session-totals delta (sprint_work_tokens / sprint_total_tokens /
 * reporter_pass_tokens) when called with a fixture sprint directory.
 *
 * Two scenarios:
 *   1. Positive: fixture with token-ledger.jsonl (3 dev rows + 1 reporter row)
 *      + .session-totals.json (UUID-keyed map). Digest contains correct numbers.
 *   2. Missing .session-totals.json fallback: digest emits null for sprint_total
 *      and a legacy-fallback note.
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

// cleargate-cli/test/scripts/ → up 3 → repo root
const REPO_ROOT = path.resolve(__dirname, '..', '..', '..');
const PREP_REPORTER_SCRIPT = path.join(
  REPO_ROOT,
  '.cleargate',
  'scripts',
  'prep_reporter_context.mjs',
);

const tmpDirs: string[] = [];

function makeTmpDir(): string {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'cg-prep-reporter-'));
  tmpDirs.push(d);
  return d;
}

afterEach(() => {
  for (const d of tmpDirs.splice(0)) {
    fs.rmSync(d, { recursive: true, force: true });
  }
});

/**
 * Build a minimal ledger row.
 * agent_type controls filtering (reporter rows are excluded from sprint_work).
 */
function makeLedgerRow(opts: {
  agentType: string;
  input: number;
  output: number;
  cacheCreation: number;
  cacheRead: number;
}): string {
  return JSON.stringify({
    ts: '2026-05-03T10:00:00Z',
    sprint_id: 'SPRINT-fixture',
    story_id: 'STORY-001-01',
    work_item_id: 'STORY-001-01',
    agent_type: opts.agentType,
    session_id: 'aaaaaaaa-0000-0000-0000-000000000000',
    transcript: '/dev/null',
    sentinel_started_at: '',
    delta_from_turn: 0,
    delta: {
      input: opts.input,
      output: opts.output,
      cache_creation: opts.cacheCreation,
      cache_read: opts.cacheRead,
    },
    session_total: {
      input: opts.input,
      output: opts.output,
      cache_creation: opts.cacheCreation,
      cache_read: opts.cacheRead,
    },
    model: 'claude-opus-4-7',
    turns: 10,
  });
}

/**
 * Scenario 1: positive — session-totals.json present (UUID-keyed map).
 *
 * Ledger: 3 dev rows + 1 reporter row.
 *   dev deltas: 100+200+300 input, 1000+2000+3000 output, 0 cacheCreation, 0 cacheRead
 *   reporter delta: 50 input, 500 output, 0 cacheCreation, 0 cacheRead
 *
 * sprint_work_tokens = sum(all ledger deltas) - reporter_sum
 *   all_sum = (100+200+300+50)+(1000+2000+3000+500) = 650+6500 = 7150
 *   reporter_sum = 50+500 = 550
 *   sprint_work_tokens = 7150 - 550 = 6600
 *
 * .session-totals.json: { "uuid-1": { input:1000, output:20000, cache_creation:5000, cache_read:0 } }
 *   sprint_total_tokens = 1000+20000+5000+0 = 26000
 *
 * reporter_pass_tokens = null (always)
 */
describe('CR-035 Scenario 1: session-totals.json present — digest contains correct split numbers', () => {
  test('sprint_work_tokens reflects non-reporter delta sum', () => {
    const tmpSprintDir = makeTmpDir();
    const sprintId = 'SPRINT-fixture';

    // Write token-ledger.jsonl: 3 dev rows + 1 reporter row
    const devRow1 = makeLedgerRow({ agentType: 'developer', input: 100, output: 1000, cacheCreation: 0, cacheRead: 0 });
    const devRow2 = makeLedgerRow({ agentType: 'developer', input: 200, output: 2000, cacheCreation: 0, cacheRead: 0 });
    const devRow3 = makeLedgerRow({ agentType: 'qa', input: 300, output: 3000, cacheCreation: 0, cacheRead: 0 });
    const reporterRow = makeLedgerRow({ agentType: 'reporter', input: 50, output: 500, cacheCreation: 0, cacheRead: 0 });
    fs.writeFileSync(
      path.join(tmpSprintDir, 'token-ledger.jsonl'),
      [devRow1, devRow2, devRow3, reporterRow].join('\n') + '\n',
    );

    // Write .session-totals.json as UUID-keyed map
    fs.writeFileSync(
      path.join(tmpSprintDir, '.session-totals.json'),
      JSON.stringify({
        'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee': {
          input: 1000,
          output: 20000,
          cache_creation: 5000,
          cache_read: 0,
          last_ts: '2026-05-03T10:00:00Z',
          last_turn_index: 0,
        },
      }),
    );

    // Write minimal sprint file so prep_reporter_context.mjs doesn't bail
    const pendingSyncDir = makeTmpDir();
    fs.writeFileSync(
      path.join(pendingSyncDir, `${sprintId}_fixture.md`),
      '---\nsprint_id: SPRINT-fixture\nstatus: Active\nstarted_at: 2026-05-03\n---\n# Sprint fixture\n',
    );

    const result = spawnSync(
      process.execPath,
      [PREP_REPORTER_SCRIPT, sprintId],
      {
        encoding: 'utf8',
        env: {
          ...process.env,
          CLEARGATE_SPRINT_DIR: tmpSprintDir,
          CLEARGATE_PENDING_SYNC_DIR: pendingSyncDir,
        },
      },
    );

    // The script writes .reporter-context.md; read it back
    const contextPath = path.join(tmpSprintDir, '.reporter-context.md');
    expect(fs.existsSync(contextPath), `Expected ${contextPath} to exist. stderr: ${result.stderr}`).toBe(true);

    const context = fs.readFileSync(contextPath, 'utf8');

    // sprint_work_tokens = 7150 - 550 = 6600
    assert.ok(String(context).includes('sprint_work_tokens: 6,600'));

    // sprint_total_tokens = 1000+20000+5000+0 = 26,000
    assert.ok(String(context).includes('sprint_total_tokens: 26,000'));

    // reporter_pass_tokens is always null
    assert.ok(String(context).includes('reporter_pass_tokens: null'));
  });
});

/**
 * Scenario 2: missing .session-totals.json — legacy fallback.
 *
 * Same ledger as Scenario 1 but no .session-totals.json.
 * sprint_total_tokens should be null with a legacy-fallback note in the digest.
 */
describe('CR-035 Scenario 2: .session-totals.json absent — digest emits null + legacy note', () => {
  test('sprint_total_tokens is null and legacy note is present', () => {
    const tmpSprintDir = makeTmpDir();
    const sprintId = 'SPRINT-fixture';

    // Write token-ledger.jsonl (no reporter row this time — simpler)
    const devRow = makeLedgerRow({ agentType: 'developer', input: 100, output: 1000, cacheCreation: 0, cacheRead: 0 });
    fs.writeFileSync(
      path.join(tmpSprintDir, 'token-ledger.jsonl'),
      devRow + '\n',
    );

    // No .session-totals.json written

    const pendingSyncDir = makeTmpDir();
    fs.writeFileSync(
      path.join(pendingSyncDir, `${sprintId}_fixture.md`),
      '---\nsprint_id: SPRINT-fixture\nstatus: Active\nstarted_at: 2026-05-03\n---\n# Sprint fixture\n',
    );

    const result = spawnSync(
      process.execPath,
      [PREP_REPORTER_SCRIPT, sprintId],
      {
        encoding: 'utf8',
        env: {
          ...process.env,
          CLEARGATE_SPRINT_DIR: tmpSprintDir,
          CLEARGATE_PENDING_SYNC_DIR: pendingSyncDir,
        },
      },
    );

    const contextPath = path.join(tmpSprintDir, '.reporter-context.md');
    expect(fs.existsSync(contextPath), `Expected ${contextPath} to exist. stderr: ${result.stderr}`).toBe(true);

    const context = fs.readFileSync(contextPath, 'utf8');

    // sprint_total_tokens should be null with a fallback note
    assert.ok(String(context).includes('sprint_total_tokens: null'));
    assert.ok(String(context).includes('legacy-fallback'));

    // reporter_pass_tokens is always null
    assert.ok(String(context).includes('reporter_pass_tokens: null'));
  });
});
