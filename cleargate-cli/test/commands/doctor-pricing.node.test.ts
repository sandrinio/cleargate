import { describe, test, afterEach } from 'node:test';
import assert from 'node:assert/strict';

/**
 * doctor-pricing.test.ts — STORY-008-06
 *
 * Tests for `cleargate doctor --pricing <file>` mode.
 * Named cases follow the Gherkin scenarios from the story.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { runPricing } from '../../src/commands/doctor.js';

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


const tmpDirs: string[] = [];

function makeTmpDir(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cg-doctor-pricing-'));
  tmpDirs.push(dir);
  return dir;
}

afterEach(() => {
  for (const dir of tmpDirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

function makeNeverExit(): (code: number) => never {
  return (code: number) => {
    throw new Error(`exit(${code})`);
  };
}

function writeWorkItemFile(
  dir: string,
  name: string,
  draftTokens: Record<string, unknown> | null
): string {
  const filePath = path.join(dir, name);
  const draftTokensLine = draftTokens !== null
    ? `draft_tokens: ${JSON.stringify(draftTokens)}`
    : 'draft_tokens:';
  const content = `---
epic_id: "EPIC-008"
status: "Active"
${draftTokensLine}
---

# Test Epic
`;
  fs.writeFileSync(filePath, content, 'utf-8');
  return filePath;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('doctor --pricing', () => {
  test('outputs USD string (nonzero) given populated draft_tokens with known model', async () => {
    const dir = makeTmpDir();
    const filePath = writeWorkItemFile(dir, 'EPIC-008.md', {
      input: 1_000_000,
      output: 500_000,
      cache_read: 200_000,
      cache_creation: 100_000,
      model: 'claude-opus-4-7',
      last_stamp: '2026-04-19T10:00:00Z',
      sessions: [],
    });

    const out: string[] = [];
    const err: string[] = [];
    const exitCodes: number[] = [];

    await runPricing(
      filePath,
      dir,
      (s) => out.push(s),
      (s) => err.push(s),
      (code) => { exitCodes.push(code); throw new Error(`exit(${code})`); }
    );

    // Should not exit
    assert.strictEqual((exitCodes).length, 0);
    assert.strictEqual((out).length, 1);
    const line = out[0]!;
    assert.ok(String(line).includes('EPIC-008.md'));
    assert.ok(String(line).includes('claude-opus-4-7'));
    assert.ok(String(line).includes('$'));

    // USD should be nonzero
    const match = line.match(/\$(\d+\.\d+)/);
    assert.ok(match);
    const usd = parseFloat(match![1]!);
    assert.ok(usd > 0);
  });

  test('exits 1 and emits stamp-tokens hint when draft_tokens is null/empty', async () => {
    const dir = makeTmpDir();
    const filePath = writeWorkItemFile(dir, 'EPIC-008-null.md', null);

    const out: string[] = [];
    const err: string[] = [];
    let exitCode = -1;

    try {
      await runPricing(
        filePath,
        dir,
        (s) => out.push(s),
        (s) => err.push(s),
        (code) => { exitCode = code; throw new Error(`exit(${code})`); }
      );
    } catch {
      // Expected: exit throws
    }

    assert.strictEqual(exitCode, 1);
    const allOut = out.join('\n');
    assert.ok(String(allOut).includes('run cleargate stamp-tokens first'));
  });

  test('warns about unknown model and shows $0.0000', async () => {
    const dir = makeTmpDir();
    const filePath = writeWorkItemFile(dir, 'EPIC-008-unknown.md', {
      input: 100_000,
      output: 50_000,
      cache_read: 0,
      cache_creation: 0,
      model: 'claude-future-xyz',
      last_stamp: '2026-04-19T10:00:00Z',
      sessions: [],
    });

    const out: string[] = [];
    const err: string[] = [];
    let exitCode = -1;

    // runPricing does NOT exit for unknown model — it just warns
    // but should NOT throw
    await runPricing(
      filePath,
      dir,
      (s) => out.push(s),
      (s) => err.push(s),
      (code) => { exitCode = code; throw new Error(`exit(${code})`); }
    );

    // Should not exit
    assert.strictEqual(exitCode, -1);
    // stderr should contain warning about unknown model
    const errOut = err.join('\n');
    assert.ok(String(errOut).includes('unknown model'));
    // stdout should show $0.0000
    expect(out.join('\n')).toContain('$0.0000');
  });

  test('exits 2 with error when file does not exist (STORY-014-01: file-not-found is config-error)', async () => {
    const dir = makeTmpDir();
    let exitCode = -1;
    const err: string[] = [];

    try {
      await runPricing(
        '/tmp/nonexistent-cleargate-file.md',
        dir,
        () => {},
        (s) => err.push(s),
        (code) => { exitCode = code; throw new Error(`exit(${code})`); }
      );
    } catch {
      // Expected
    }

    assert.strictEqual(exitCode, 2);
    expect(err.join('\n')).toContain('cannot read file');
  });

  test('exits 2 with error when filePath is empty string (STORY-014-01: missing arg is config-error)', async () => {
    const dir = makeTmpDir();
    let exitCode = -1;
    const err: string[] = [];

    try {
      await runPricing(
        '',
        dir,
        () => {},
        (s) => err.push(s),
        (code) => { exitCode = code; throw new Error(`exit(${code})`); }
      );
    } catch {
      // Expected
    }

    assert.strictEqual(exitCode, 2);
    expect(err.join('\n')).toContain('missing <file>');
  });
});
