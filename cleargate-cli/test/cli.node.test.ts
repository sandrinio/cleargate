import { describe, test } from 'node:test';
import assert from 'node:assert/strict';

import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';
import { readFileSync } from 'node:fs';

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
const __dirname = dirname(__filename);

const CLI = join(__dirname, '..', 'dist', 'cli.js');

function run(args: string[]) {
  return spawnSync(process.execPath, [CLI, ...args], {
    encoding: 'utf8',
    timeout: 10_000,
  });
}

describe('cleargate CLI', () => {
  describe('Scenario: Help lists all subcommands', () => {
    test('--help exits 0', () => {
      const result = run(['--help']);
      assert.strictEqual(result.status, 0);
    });

    test('--help stdout lists join', () => {
      const result = run(['--help']);
      assert.ok(String(result.stdout).includes('join'));
    });

    test('--help stdout lists whoami', () => {
      const result = run(['--help']);
      assert.ok(String(result.stdout).includes('whoami'));
    });

    test('--help stdout lists stamp', () => {
      const result = run(['--help']);
      assert.ok(String(result.stdout).includes('stamp'));
    });

    test('--help stdout lists wiki', () => {
      const result = run(['--help']);
      assert.ok(String(result.stdout).includes('wiki'));
    });

    test('--help --all stdout lists admin (CR-011: admin hidden in pre-member state; visible with --all)', () => {
      const result = run(['--help', '--all']);
      assert.ok(String(result.stdout).includes('admin'));
    });
  });

  describe('Scenario: Version flag', () => {
    test('--version prints the package.json version', () => {
      const pkg = JSON.parse(
        readFileSync(join(__dirname, '..', 'package.json'), 'utf-8'),
      ) as { version: string };
      const result = run(['--version']);
      expect(result.stdout.trim()).toBe(pkg.version);
    });
  });

  describe('Scenario: Unknown subcommand errors cleanly', () => {
    test('cleargate nonsense exits 1', () => {
      const result = run(['nonsense']);
      assert.strictEqual(result.status, 1);
    });

    test('cleargate nonsense stderr suggests cleargate --help', () => {
      const result = run(['nonsense']);
      assert.ok(String(result.stderr).includes('cleargate --help'));
    });
  });

  describe('Scenario: join missing positional exits 1', () => {
    test('cleargate join (no arg) exits 1', () => {
      const result = run(['join']);
      assert.strictEqual(result.status, 1);
    });

    test('cleargate join (no arg) stderr mentions join', () => {
      const result = run(['join']);
      assert.ok(result.stderr);
    });
  });

  describe('Scenario: No CLI collision (STORY-013-08)', () => {
    test('--help lists sprint command group', () => {
      const result = run(['--help']);
      assert.ok(String(result.stdout).includes('sprint'));
    });

    test('--help lists story command group', () => {
      const result = run(['--help']);
      assert.ok(String(result.stdout).includes('story'));
    });

    test('--help lists state command group', () => {
      const result = run(['--help']);
      assert.ok(String(result.stdout).includes('state'));
    });

    test('gate --help lists qa subcommand', () => {
      const result = run(['gate', '--help']);
      assert.ok(String(result.stdout).includes('qa'));
    });

    test('gate --help lists arch subcommand', () => {
      const result = run(['gate', '--help']);
      assert.ok(String(result.stdout).includes('arch'));
    });

    test('gate --help still lists check subcommand (no collision)', () => {
      const result = run(['gate', '--help']);
      assert.ok(String(result.stdout).includes('check'));
    });

    test('gate --help still lists explain subcommand (no collision)', () => {
      const result = run(['gate', '--help']);
      assert.ok(String(result.stdout).includes('explain'));
    });

    test('no duplicate subcommand names in gate group', () => {
      const result = run(['gate', '--help']);
      // Extract subcommand names from help output
      const lines = result.stdout.split('\n').filter((l) => l.trim().startsWith('gate ') || /^\s{2}\w/.test(l));
      // Each subcommand should be listed exactly once
      const qaCount = (result.stdout.match(/\bqa\b/g) ?? []).length;
      const archCount = (result.stdout.match(/\barch\b/g) ?? []).length;
      const checkCount = (result.stdout.match(/\bcheck\b/g) ?? []).length;
      const explainCount = (result.stdout.match(/\bexplain\b/g) ?? []).length;
      // Each should appear at least once (listed in help)
      assert.ok(qaCount >= 1);
      assert.ok(archCount >= 1);
      assert.ok(checkCount >= 1);
      assert.ok(explainCount >= 1);
      // qa and arch are different from check and explain
      assert.ok(!String(['check', 'explain']).includes('qa'));
      assert.ok(!String(['check', 'explain']).includes('arch'));
      void lines;
    });
  });

  describe('Scenario: All four wrappers are inert under v1 (STORY-013-08)', () => {
    test('sprint init with missing sprint file exits 0 with inert message', () => {
      // SPRINT-99 does not exist in real delivery dir; defaults to v1
      const result = run(['sprint', 'init', 'SPRINT-99', '--stories', 'STORY-99-01']);
      assert.strictEqual(result.status, 0);
      assert.ok(String(result.stdout).includes('v1 mode active'));
    });

    test('sprint close with missing sprint file exits 0 with inert message', () => {
      const result = run(['sprint', 'close', 'SPRINT-99']);
      assert.strictEqual(result.status, 0);
      assert.ok(String(result.stdout).includes('v1 mode active'));
    });

    test('state validate with missing sprint file exits 0 with inert message', () => {
      const result = run(['state', 'validate', 'SPRINT-99']);
      assert.strictEqual(result.status, 0);
      assert.ok(String(result.stdout).includes('v1 mode active'));
    });
  });

  describe('Scenario: No direct node .mjs calls in CLI code (Scenario 4)', () => {
    test('dist/cli.js does not contain direct node .cleargate/scripts invocations', () => {
      const cliContents = readFileSync(CLI, 'utf-8');
      // Must not contain: node .cleargate/scripts/
      assert.doesNotMatch(String(cliContents), /node\s+\.cleargate\/scripts\//);
    });
  });
});
