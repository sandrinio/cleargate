import { describe, test } from 'node:test';
import assert from 'node:assert/strict';

/**
 * STORY-016-03: CHANGELOG.md format + tarball inclusion tests
 * Four scenarios matching Gherkin §2.1
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { execSync } from 'node:child_process';

import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
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


// Resolve paths relative to this test file:
// cleargate-cli/test/ -> cleargate-cli/ -> repo root
const cliDir = path.resolve(__dirname, '..');
const repoRoot = path.resolve(cliDir, '..');
const changelogPath = path.join(cliDir, 'CHANGELOG.md');
const packageJsonPath = path.join(cliDir, 'package.json');

/** Common-Changelog heading regex — single source of truth */
const HEADING_RE = /^## \[(\d+\.\d+\.\d+)\] — \d{4}-\d{2}-\d{2}$/m;
const HEADING_RE_ALL = /^## \[(\d+\.\d+\.\d+)\] — \d{4}-\d{2}-\d{2}$/gm;

describe('CHANGELOG.md format contract (STORY-016-03)', () => {
  test('Scenario: CHANGELOG exists and parses — at least one ## [X.Y.Z] heading found, no parse error', () => {
    expect(() => fs.accessSync(changelogPath)).not.toThrow();
    const contents = fs.readFileSync(changelogPath, 'utf-8');
    assert.ok(contents);
    const match = HEADING_RE.test(contents);
    assert.strictEqual(match, true);
  });

  test('Scenario: Topmost version matches package.json — first ## [X.Y.Z] heading equals package.json version', () => {
    const contents = fs.readFileSync(changelogPath, 'utf-8');
    const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8')) as { version: string };
    const packageVersion = pkg.version;

    const allMatches = [...contents.matchAll(HEADING_RE_ALL)];
    assert.ok(allMatches.length > 0);

    const topmostVersion = allMatches[0][1];
    assert.strictEqual(topmostVersion, packageVersion);
  });

  test('Scenario: Versions descending — each ## [X.Y.Z] heading is strictly less than its predecessor by semver', () => {
    const contents = fs.readFileSync(changelogPath, 'utf-8');
    const allMatches = [...contents.matchAll(HEADING_RE_ALL)];
    assert.ok(allMatches.length > 1);

    const versions = allMatches.map(m => m[1]);

    for (let i = 1; i < versions.length; i++) {
      const prev = versions[i - 1].split('.').map(Number);
      const curr = versions[i].split('.').map(Number);
      const prevGtCurr = compareSemverParts(prev, curr) > 0;
      assert.strictEqual(prevGtCurr, true);
    }
  });

  test('Scenario: Tarball includes CHANGELOG — npm pack --dry-run output lists CHANGELOG.md', () => {
    const output = execSync(
      'npm pack --workspace=cleargate-cli --dry-run 2>&1',
      { cwd: repoRoot, encoding: 'utf-8' },
    );
    assert.match(String(output), /CHANGELOG\.md/);
  });
});

/** Compare two semver arrays [major, minor, patch]. Returns >0 if a > b, <0 if a < b, 0 if equal. */
function compareSemverParts(a: number[], b: number[]): number {
  for (let i = 0; i < 3; i++) {
    if ((a[i] ?? 0) !== (b[i] ?? 0)) {
      return (a[i] ?? 0) - (b[i] ?? 0);
    }
  }
  return 0;
}
