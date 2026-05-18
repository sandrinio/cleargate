import { describe, test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';

/**
 * dedupe-frontmatter.test.ts — BUG-025
 *
 * Regression tests for .cleargate/scripts/dedupe_frontmatter.mjs.
 * Asserts that:
 *   1. Files with duplicate frontmatter keys are deduped (last occurrence kept).
 *   2. Running the script N=3 times produces a stable result (idempotent).
 *   3. Files without duplicates are left byte-identical.
 *   4. --dry-run prints but does NOT write.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import * as url from 'node:url';
import { spawnSync } from 'node:child_process';

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


const __testDirname = path.dirname(url.fileURLToPath(import.meta.url));
const SCRIPT_PATH = path.resolve(
  __testDirname,
  '../../../.cleargate/scripts/dedupe_frontmatter.mjs',
);

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cg-dedupe-test-'));
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

function writeFixture(filename: string, content: string): string {
  const filePath = path.join(tmpDir, filename);
  fs.writeFileSync(filePath, content, 'utf8');
  return filePath;
}

function runDedupe(extraArgs: string[] = []): { stdout: string; stderr: string; status: number | null } {
  const result = spawnSync('node', [SCRIPT_PATH, ...extraArgs, tmpDir], {
    encoding: 'utf8',
    timeout: 15000,
  });
  return { stdout: result.stdout ?? '', stderr: result.stderr ?? '', status: result.status };
}

// ─── Scenario: File with duplicate parent_cleargate_id ────────────────────────

describe('BUG-025: dedupe_frontmatter.mjs', () => {
  test('Scenario: file with duplicate parent_cleargate_id is deduped — last occurrence kept', () => {
    const content = [
      '---',
      'bug_id: BUG-025',
      'parent_cleargate_id: "SPRINT-19 close pipeline diagnosis"',
      'parent_cleargate_id: null',
      'status: Triaged',
      '---',
      '',
      '# BUG-025 body',
      '',
    ].join('\n');
    const filePath = writeFixture('BUG-025_dup.md', content);

    runDedupe();

    const after = fs.readFileSync(filePath, 'utf8');
    const matches = after.match(/^parent_cleargate_id:/gm);
    assert.notStrictEqual(matches, null);
    assert.strictEqual(matches!.length, 1);

    // Last occurrence wins: null (it came after the string value)
    assert.ok(String(after).includes('parent_cleargate_id: null'));
    assert.ok(!String(after).includes('"SPRINT-19 close pipeline diagnosis"'));
  });

  test('Scenario: N=3 invocations produce stable result (idempotent)', () => {
    const content = [
      '---',
      'bug_id: BUG-025',
      'parent_cleargate_id: "SPRINT-19 close pipeline"',
      'parent_cleargate_id: null',
      'sprint_cleargate_id: "SPRINT-20"',
      'sprint_cleargate_id: "SPRINT-19"',
      'status: Triaged',
      '---',
      '',
      '# BUG-025 body',
      '',
    ].join('\n');
    const filePath = writeFixture('BUG-025_n3.md', content);

    runDedupe(); // run 1
    const afterRun1 = fs.readFileSync(filePath, 'utf8');

    runDedupe(); // run 2
    const afterRun2 = fs.readFileSync(filePath, 'utf8');

    runDedupe(); // run 3
    const afterRun3 = fs.readFileSync(filePath, 'utf8');

    // Stable after run 1 — runs 2 and 3 are no-ops
    assert.strictEqual(afterRun2, afterRun1);
    assert.strictEqual(afterRun3, afterRun1);

    // Only one of each key
    expect(afterRun3.match(/^parent_cleargate_id:/gm)!.length).toBe(1);
    expect(afterRun3.match(/^sprint_cleargate_id:/gm)!.length).toBe(1);
  });

  test('Scenario: file without duplicates is left byte-identical', () => {
    const content = [
      '---',
      'bug_id: BUG-025',
      'parent_cleargate_id: null',
      'sprint_cleargate_id: "SPRINT-20"',
      'status: Triaged',
      '---',
      '',
      '# BUG-025 no-dup body',
      '',
    ].join('\n');
    const filePath = writeFixture('BUG-025_nodups.md', content);
    const before = fs.readFileSync(filePath, 'utf8');

    runDedupe();

    const after = fs.readFileSync(filePath, 'utf8');
    assert.strictEqual(after, before);
  });

  test('Scenario: --dry-run prints would-rewrite but does NOT write', () => {
    const content = [
      '---',
      'bug_id: BUG-025',
      'parent_cleargate_id: "first"',
      'parent_cleargate_id: "second"',
      'status: Triaged',
      '---',
      '',
      '# dry run body',
      '',
    ].join('\n');
    const filePath = writeFixture('BUG-025_dryrun.md', content);
    const before = fs.readFileSync(filePath, 'utf8');

    const { stdout } = runDedupe(['--dry-run']);

    // stdout contains would-rewrite marker
    assert.ok(String(stdout).includes('would-rewrite'));

    // File must be unchanged
    const after = fs.readFileSync(filePath, 'utf8');
    assert.strictEqual(after, before);
  });

  test('Scenario: multi-line value following a duplicate key is also dropped', () => {
    // Test that continuation lines of the earlier occurrence are dropped too
    const content = [
      '---',
      'story_id: STORY-042-01',
      'draft_tokens:',
      '  input: 100',
      '  output: 50',
      'draft_tokens:',
      '  input: 200',
      '  output: 75',
      'status: Draft',
      '---',
      '',
      '# Multi-line value dedup',
      '',
    ].join('\n');
    const filePath = writeFixture('STORY-042-01_multiline.md', content);

    runDedupe();

    const after = fs.readFileSync(filePath, 'utf8');
    // Only one draft_tokens key
    const matches = after.match(/^draft_tokens:/gm);
    assert.notStrictEqual(matches, null);
    assert.strictEqual(matches!.length, 1);
    // The kept occurrence has input: 200 (last)
    assert.ok(String(after).includes('input: 200'));
    assert.ok(!String(after).includes('input: 100'));
  });
});
