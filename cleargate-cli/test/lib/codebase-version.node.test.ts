import { describe, test, afterEach } from 'node:test';
import assert from 'node:assert/strict';

import * as os from 'os';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import { getCodebaseVersion, type ExecFn } from '../../src/lib/codebase-version.js';

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


function makeTmpDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'cg-cv-test-'));
}

function initGitRepo(dir: string): void {
  execSync('git init', { cwd: dir, stdio: 'pipe' });
  execSync('git config user.email "test@test.com"', { cwd: dir, stdio: 'pipe' });
  execSync('git config user.name "Test"', { cwd: dir, stdio: 'pipe' });
}

function makeCommit(dir: string, filename = 'README.md', content = 'hello'): string {
  fs.writeFileSync(path.join(dir, filename), content);
  execSync('git add .', { cwd: dir, stdio: 'pipe' });
  execSync('git commit -m "init"', { cwd: dir, stdio: 'pipe' });
  return execSync('git rev-parse --short HEAD', { cwd: dir, encoding: 'utf8' }).trim();
}

/** exec seam that returns non-zero (git not available) */
const noGitExec: ExecFn = (_cmd, _args) => ({ stdout: '', code: 128 });

const tmpDirs: string[] = [];

function trackTmp(dir: string): string {
  tmpDirs.push(dir);
  return dir;
}

afterEach(() => {
  for (const dir of tmpDirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

describe('getCodebaseVersion', () => {
  test('clean git returns short sha', () => {
    const dir = trackTmp(makeTmpDir());
    initGitRepo(dir);
    const sha = makeCommit(dir);

    const result = getCodebaseVersion({ cwd: dir });

    assert.strictEqual(result.sha, sha);
    assert.strictEqual(result.dirty, false);
    assert.strictEqual(result.version_string, sha);
    // sha should be 7 hex chars (git default)
    assert.match(String(result.version_string), /^[0-9a-f]{7}$/);
  });

  test('dirty git returns sha-dirty', () => {
    const dir = trackTmp(makeTmpDir());
    initGitRepo(dir);
    const sha = makeCommit(dir);

    // Add an untracked file to make it dirty
    fs.writeFileSync(path.join(dir, 'dirty.txt'), 'unstaged');

    const result = getCodebaseVersion({ cwd: dir });

    assert.strictEqual(result.sha, sha);
    assert.strictEqual(result.dirty, true);
    assert.strictEqual(result.version_string, `${sha}-dirty`);
  });

  test('no git, package.json present returns version', () => {
    const dir = trackTmp(makeTmpDir());
    fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ version: '1.4.2' }));

    // Use exec seam so git fails — simulates no-git environment
    const result = getCodebaseVersion({ cwd: dir, exec: noGitExec });

    assert.strictEqual(result.sha, null);
    assert.strictEqual(result.dirty, false);
    assert.strictEqual(result.package_version, '1.4.2');
    assert.strictEqual(result.version_string, '1.4.2');
  });

  test('no git, no package.json returns unknown with warning', () => {
    const dir = trackTmp(makeTmpDir());
    const warnings: string[] = [];
    const origWarn = console.warn;
    console.warn = (...args: unknown[]) => { warnings.push(args.join(' ')); };

    try {
      // Use exec seam so git fails — simulates no-git environment
      const result = getCodebaseVersion({ cwd: dir, exec: noGitExec });
      assert.strictEqual(result.sha, null);
      assert.strictEqual(result.dirty, false);
      assert.strictEqual(result.package_version, null);
      assert.strictEqual(result.version_string, 'unknown');
      assert.ok(warnings.length > 0);
    } finally {
      console.warn = origWarn;
    }
  });

  test('monorepo walk-up finds parent package.json', () => {
    const parentDir = trackTmp(makeTmpDir());
    const subDir = path.join(parentDir, 'packages', 'sub');
    fs.mkdirSync(subDir, { recursive: true });
    fs.writeFileSync(path.join(parentDir, 'package.json'), JSON.stringify({ version: '2.3.4' }));
    // No package.json in subDir itself

    // Use exec seam so git fails — simulates no-git environment
    const result = getCodebaseVersion({ cwd: subDir, exec: noGitExec });

    assert.strictEqual(result.package_version, '2.3.4');
    assert.strictEqual(result.version_string, '2.3.4');
  });

  test('exec seam injectable — no real git call made', () => {
    const dir = trackTmp(makeTmpDir());
    const callLog: Array<{ cmd: string; args: string[] }> = [];

    const fakeExec: ExecFn = (cmd, args) => {
      callLog.push({ cmd, args });
      if (args[0] === 'rev-parse') {
        return { stdout: 'a3f2e91', code: 0 };
      }
      if (args[0] === 'status') {
        return { stdout: '', code: 0 };
      }
      return { stdout: '', code: 1 };
    };

    const result = getCodebaseVersion({ cwd: dir, exec: fakeExec });

    assert.strictEqual(result.sha, 'a3f2e91');
    assert.strictEqual(result.dirty, false);
    assert.strictEqual(result.version_string, 'a3f2e91');
    // Must have used the seam, not real git
    assert.ok(callLog.length > 0);
    expect(callLog.every(c => c.cmd === 'git')).toBe(true);
  });
});
