import { describe, test } from 'node:test';
import assert from 'node:assert/strict';

/**
 * gate-run.test.ts — unit tests for `cleargate gate <name>` command handler.
 *
 * STORY-018-03 Gherkin scenarios:
 *   1. Configured gate runs the user's command
 *   2. Configured gate propagates non-zero exit
 *   3. Missing config is friendly, not fatal
 *   4. Missing key with --strict fails
 *   5. Unknown gate name rejected
 *   6. Agent wording updated (grep-test — no npm test / npm run typecheck)
 *   7. Meta-repo workflow preserved (reads actual .cleargate/config.yml)
 *
 * FLASHCARD #cli #test-seam #exit: exitFn throws in tests; extract validation
 *   into value-returning fn and call exitFn only at handler top-level after
 *   spawnSync completes.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { gateRunHandler } from '../../src/commands/gate-run.js';
import type { GateRunCliOptions } from '../../src/commands/gate-run.js';
import { loadWikiConfig } from '../../src/lib/wiki-config.js';
import type { WikiConfig } from '../../src/lib/wiki-config.js';

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

// Repo root — three levels up from test/commands/
const REPO_ROOT = path.resolve(__dirname, '../../..');

// ─── Test seam helpers ────────────────────────────────────────────────────────

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
    outStr: () => out.join('\n'),
    errStr: () => err.join('\n'),
  };
}

function makeConfigLoader(gates: Partial<WikiConfig['gates']>): (repoRoot: string) => WikiConfig {
  return (_repoRoot: string) => ({
    wiki: { index_token_ceiling: 8000 },
    gates,
  });
}

// ─── Scenario 1: Configured gate runs the user's command ─────────────────────

describe('Scenario 1: Configured gate runs the user\'s command', () => {
  test('calls spawnFn with the configured command string, shell:true, and correct cwd', () => {
    const { exitFn, getCode } = makeExitSeam();
    const cap = makeCapture();

    const spawnCalls: Array<{ cmd: string; opts: Record<string, unknown> }> = [];
    const spawnFn = ((cmd: string, opts: unknown) => {
      spawnCalls.push({ cmd, opts: opts as Record<string, unknown> });
      return { status: 0, error: undefined };
    }) as unknown as typeof spawnSync;

    const cli: GateRunCliOptions = {
      cwd: '/fake/cwd',
      stdout: cap.stdout,
      stderr: cap.stderr,
      exit: exitFn,
      spawnFn,
      configLoader: makeConfigLoader({ test: 'echo TEST_RAN' }),
    };

    try {
      gateRunHandler('test', {}, cli);
    } catch { /* expected — exitFn throws */ }

    expect(getCode()).toBe(0);
    assert.strictEqual((spawnCalls).length, 1);
    assert.strictEqual(spawnCalls[0]!.cmd, 'echo TEST_RAN');
    assert.deepStrictEqual(spawnCalls[0]!.opts, { shell: true, stdio: 'inherit', cwd: '/fake/cwd' });
  });
});

// ─── Scenario 2: Configured gate propagates non-zero exit ────────────────────

describe('Scenario 2: Configured gate propagates non-zero exit', () => {
  test('exits with code 7 when spawnFn returns status 7', () => {
    const { exitFn, getCode } = makeExitSeam();
    const cap = makeCapture();

    const spawnFn = ((_cmd: string, _opts: unknown) => {
      return { status: 7, error: undefined };
    }) as unknown as typeof spawnSync;

    const cli: GateRunCliOptions = {
      cwd: '/fake/cwd',
      stdout: cap.stdout,
      stderr: cap.stderr,
      exit: exitFn,
      spawnFn,
      configLoader: makeConfigLoader({ test: 'exit 7' }),
    };

    try {
      gateRunHandler('test', {}, cli);
    } catch { /* expected */ }

    expect(getCode()).toBe(7);
  });
});

// ─── Scenario 3: Missing config is friendly, not fatal ───────────────────────

describe('Scenario 3: Missing config is friendly, not fatal', () => {
  test('prints a friendly message to stdout and exits 0 when gate not configured', () => {
    const { exitFn, getCode } = makeExitSeam();
    const cap = makeCapture();

    const cli: GateRunCliOptions = {
      cwd: '/fake/cwd',
      stdout: cap.stdout,
      stderr: cap.stderr,
      exit: exitFn,
      spawnFn: (() => { throw new Error('should not spawn'); }) as unknown as typeof spawnSync,
      configLoader: makeConfigLoader({}),
    };

    try {
      gateRunHandler('precommit', {}, cli);
    } catch { /* expected */ }

    expect(getCode()).toBe(0);
    expect(cap.outStr()).toContain('gate "precommit" not configured');
    expect(cap.outStr()).toContain('add gates.precommit to .cleargate/config.yml');
    expect(cap.errStr()).toBe('');
  });
});

// ─── Scenario 4: Missing key with --strict fails ──────────────────────────────

describe('Scenario 4: Missing key with --strict fails', () => {
  test('exits 1 and emits message to stderr when gate not configured and --strict', () => {
    const { exitFn, getCode } = makeExitSeam();
    const cap = makeCapture();

    const cli: GateRunCliOptions = {
      cwd: '/fake/cwd',
      stdout: cap.stdout,
      stderr: cap.stderr,
      exit: exitFn,
      spawnFn: (() => { throw new Error('should not spawn'); }) as unknown as typeof spawnSync,
      configLoader: makeConfigLoader({}),
    };

    try {
      gateRunHandler('precommit', { strict: true }, cli);
    } catch { /* expected */ }

    expect(getCode()).toBe(1);
    expect(cap.errStr()).toContain('gate "precommit" not configured');
    expect(cap.errStr()).toContain('add gates.precommit to .cleargate/config.yml');
  });
});

// ─── Scenario 5: Unknown gate name rejected ───────────────────────────────────

describe('Scenario 5: Unknown gate name rejected', () => {
  test('exits 2 and emits unknown gate message to stderr for an unrecognised name', () => {
    const { exitFn, getCode } = makeExitSeam();
    const cap = makeCapture();

    const cli: GateRunCliOptions = {
      cwd: '/fake/cwd',
      stdout: cap.stdout,
      stderr: cap.stderr,
      exit: exitFn,
      spawnFn: (() => { throw new Error('should not spawn'); }) as unknown as typeof spawnSync,
      configLoader: makeConfigLoader({}),
    };

    try {
      gateRunHandler('frobnicate', {}, cli);
    } catch { /* expected */ }

    expect(getCode()).toBe(2);
    expect(cap.errStr()).toContain("unknown gate name 'frobnicate'");
    expect(cap.errStr()).toContain('precommit, test, typecheck, lint');
  });
});

// ─── Scenario 6: Agent wording updated ───────────────────────────────────────

describe('Scenario 6: Agent wording updated', () => {
  test('developer.md contains cleargate gate test/typecheck and not npm test/npm run typecheck', () => {
    const devMd = fs.readFileSync(
      path.resolve(REPO_ROOT, 'cleargate-planning/.claude/agents/developer.md'),
      'utf8',
    );
    assert.doesNotMatch(String(devMd), /npm test(?!\s*needs)/);
    assert.ok(!String(devMd).includes('npm run typecheck'));
    assert.ok(String(devMd).includes('cleargate gate test'));
    assert.ok(String(devMd).includes('cleargate gate typecheck'));
  });

  test('qa.md contains cleargate gate test/typecheck and not npm test/npm run typecheck', () => {
    const qaMd = fs.readFileSync(
      path.resolve(REPO_ROOT, 'cleargate-planning/.claude/agents/qa.md'),
      'utf8',
    );
    assert.doesNotMatch(String(qaMd), /npm test(?!\s*needs)/);
    assert.ok(!String(qaMd).includes('npm run typecheck'));
    assert.ok(String(qaMd).includes('cleargate gate test'));
    assert.ok(String(qaMd).includes('cleargate gate typecheck'));
  });
});

// ─── Scenario 7: Meta-repo workflow preserved ─────────────────────────────────

describe('Scenario 7: Meta-repo workflow preserved', () => {
  test('this repo\'s .cleargate/config.yml has gates.precommit with typecheck + test', () => {
    const configPath = path.resolve(REPO_ROOT, '.cleargate/config.yml');
    expect(fs.existsSync(configPath)).toBe(true);

    const config = loadWikiConfig(REPO_ROOT);

    assert.notStrictEqual(config.gates.precommit, undefined);
    assert.ok(String(config.gates.precommit).includes('npm run typecheck'));
    assert.ok(String(config.gates.precommit).includes('npm test'));
    assert.notStrictEqual(config.gates.test, undefined);
    assert.notStrictEqual(config.gates.typecheck, undefined);
    assert.notStrictEqual(config.gates.lint, undefined);
  });
});
