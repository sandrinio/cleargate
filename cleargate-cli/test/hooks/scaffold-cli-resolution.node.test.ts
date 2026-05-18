import { describe, test, afterEach } from 'node:test';
import assert from 'node:assert/strict';

/**
 * scaffold-cli-resolution.test.ts — BUG-006 + CR-009 contract
 *
 * `cleargate init` must produce hook scripts with a three-branch resolver:
 *   1. meta-repo-local dist (dogfood — fast path for the meta-repo)
 *   2. on-PATH binary (`npm i -g cleargate` / shim)
 *   3. pinned npx invocation (always works wherever Node is present — CR-009)
 *
 * The scripts must NOT silent-exit when no branch resolves (CR-009 replaced
 * the old BUG-006 `exit 0` silent-no-op with the npx tail-branch).
 *
 * Note: CR-009 intentionally places the dist check FIRST (not second as in
 * the pre-CR-009 BUG-006 resolver), because the dist path is the fastest
 * resolution path in the meta-repo dogfood case and is always absent in
 * non-dogfood repos (making it a safe first-check).
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { fileURLToPath } from 'node:url';
import { copyPayload } from '../../src/init/copy-payload.js';

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


const PAYLOAD_DIR = path.resolve(
  __dirname,
  '../../templates/cleargate-planning',
);

const tmpDirs: string[] = [];

afterEach(() => {
  for (const dir of tmpDirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

function makeTmpDir(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cg-scaffold-'));
  tmpDirs.push(dir);
  return dir;
}

const HOOKS_THAT_INVOKE_CLI = ['stamp-and-gate.sh', 'session-start.sh'];

describe('cleargate init scaffold — CLI resolution (BUG-006 + CR-009)', () => {
  test('CR-009: every CLI-invoking hook has a three-branch resolver (dist → PATH → npx)', () => {
    const tmp = makeTmpDir();
    // copyPayload without pinVersion leaves __CLEARGATE_VERSION__ placeholder intact
    // (that is expected in the template; init substitutes it at runtime)
    copyPayload(PAYLOAD_DIR, tmp, { force: true, pinVersion: '0.5.0' });

    for (const hookFile of HOOKS_THAT_INVOKE_CLI) {
      const body = fs.readFileSync(
        path.join(tmp, '.claude/hooks', hookFile),
        'utf8',
      );

      // Branch 1: dist check
      assert.ok(String(body, `${hookFile} missing dist check`).includes(
        'cleargate-cli/dist/cli.js',
      ));

      // Branch 2: PATH check
      assert.match(String(body, `${hookFile} missing 'command -v cleargate' resolver`), 
        /command -v cleargate/,
      );

      // Branch 3: npx tail — must not be exit 0 (the old BUG-006 no-op)
      assert.doesNotMatch(String(body, `${hookFile} must not have silent exit 0 as fallback`), 
        /^else\s*\n\s*exit 0/m,
      );
      assert.ok(String(body, `${hookFile} missing npx tail-branch`).includes('npx -y'));

      // Pin comment present (required by R-12 / sed-rewrite contract)
      assert.ok(String(body, `${hookFile} missing cleargate-pin comment`).includes(
        '# cleargate-pin:',
      ));
    }
  });

  test('CR-009: dist branch appears before PATH branch in resolver chain', () => {
    const tmp = makeTmpDir();
    copyPayload(PAYLOAD_DIR, tmp, { force: true, pinVersion: '0.5.0' });

    for (const hookFile of HOOKS_THAT_INVOKE_CLI) {
      const body = fs.readFileSync(
        path.join(tmp, '.claude/hooks', hookFile),
        'utf8',
      );

      const distIdx = body.indexOf('cleargate-cli/dist/cli.js');
      const pathIdx = body.indexOf('command -v cleargate');

      assert.ok(distIdx >= 0, `${hookFile}: dist branch must appear in file`);
      assert.ok(pathIdx >= 0, `${hookFile}: PATH branch must appear in file`);
      assert.ok(distIdx < pathIdx, `${hookFile}: dist branch (idx ${distIdx}) must precede PATH branch (idx ${pathIdx})`);
    }
  });

  test('init payload does not bundle the CLI dist (target repos resolve via PATH or npx)', () => {
    const tmp = makeTmpDir();
    copyPayload(PAYLOAD_DIR, tmp, { force: true });
    expect(
      fs.existsSync(path.join(tmp, 'cleargate-cli', 'dist', 'cli.js')),
      'init payload must not ship the CLI dist into target repos',
    ).toBe(false);
  });
});
