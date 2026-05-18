import { describe, test } from 'node:test';
import assert from 'node:assert/strict';

import { readFileSync } from 'fs';
import { join } from 'path';
import { readBlock, writeBlock, removeBlock, CLEARGATE_START, CLEARGATE_END } from '../../src/lib/claude-md-surgery.js';

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


const FIXTURE_DIR = join(import.meta.dirname, '../fixtures/claude-md');

// Helper: build a minimal CLAUDE.md string with the given block body
function mkDoc(before: string, body: string, after: string): string {
  return `${before}${CLEARGATE_START}${body}${CLEARGATE_END}${after}`;
}

describe('readBlock', () => {
  test('happy path: extracts content between markers', () => {
    const content = `BEFORE\n${CLEARGATE_START}\nHELLO\n${CLEARGATE_END}\nAFTER`;
    const result = readBlock(content);
    assert.strictEqual(result, '\nHELLO\n');
  });

  test('GREEDY regex handles body-mentions of markers (FLASHCARD 2026-04-19 #init #inject-claude-md #regex)', () => {
    const fixture = readFileSync(join(FIXTURE_DIR, 'with-prose-mention.md'), 'utf8');
    const result = readBlock(fixture);

    // Must return non-null
    assert.notStrictEqual(result, null);

    // The prose mention line must be INSIDE the returned body
    // (backtick-quoted inline markers as they appear in the fixture)
    assert.ok(String(result).includes('`<!-- CLEARGATE:START -->...<!-- CLEARGATE:END -->`'));

    // The line after the prose mention must also be present (proves no early cutoff)
    assert.ok(String(result).includes('More content after the prose mention to confirm we got the full block.'));

    // Content after the real END marker must NOT be in the result
    assert.ok(!String(result).includes('This content is AFTER the block and must not be included.'));
  });

  test('returns null when markers are missing', () => {
    const content = 'No markers here at all';
    expect(readBlock(content)).toBeNull();
  });
});

describe('writeBlock', () => {
  test('happy path: replaces block body and preserves surrounding content', () => {
    const before = 'BEFORE\n';
    const after = '\nAFTER';
    const original = mkDoc(before, '\nOLD CONTENT\n', after);

    const result = writeBlock(original, '\nNEW\n');

    assert.ok(String(result).includes('BEFORE'));
    assert.ok(String(result).includes('AFTER'));
    assert.ok(String(result).includes('\nNEW\n'));
    assert.ok(!String(result).includes('OLD CONTENT'));
    expect(result.startsWith('BEFORE')).toBe(true);
    expect(result.endsWith('AFTER')).toBe(true);
  });

  test('throws on missing start marker', () => {
    const content = 'No markers here';
    expect(() => writeBlock(content, 'NEW')).toThrow(
      'CLAUDE.md is missing <!-- CLEARGATE:START --> marker'
    );
  });

  test('throws when end marker is missing but start is present', () => {
    const content = `${CLEARGATE_START}\nsome content\n`;
    expect(() => writeBlock(content, 'NEW')).toThrow(
      'CLAUDE.md is missing <!-- CLEARGATE:END --> marker'
    );
  });

  test('writeBlock is idempotent: calling twice with same body produces byte-identical result', () => {
    const original = mkDoc('BEFORE\n', '\nOLD\n', '\nAFTER');
    const once = writeBlock(original, '\nNEW\n');
    const twice = writeBlock(once, '\nNEW\n');
    assert.strictEqual(twice, once);
  });
});

describe('removeBlock', () => {
  test('strips both markers and content between them, leaving surroundings intact', () => {
    const before = 'BEFORE\n';
    const after = '\nAFTER';
    const original = mkDoc(before, '\nCONTENT\n', after);

    const result = removeBlock(original);

    assert.strictEqual(result, 'BEFORE\n\nAFTER');
    assert.ok(!String(result).includes(CLEARGATE_START));
    assert.ok(!String(result).includes(CLEARGATE_END));
    assert.ok(!String(result).includes('CONTENT'));
  });

  test('throws when start marker is missing', () => {
    const content = 'No markers here';
    expect(() => removeBlock(content)).toThrow(
      'CLAUDE.md is missing <!-- CLEARGATE:START --> marker'
    );
  });
});

describe('dogfood sanity', () => {
  test('readBlock on the live repo CLAUDE.md returns the ClearGate block', () => {
    // Absolute path per instructions — this test verifies the real file.
    const claudeMd = readFileSync(
      '/Users/ssuladze/Documents/Dev/ClearGate/CLAUDE.md',
      'utf8'
    );
    const result = readBlock(claudeMd);

    assert.notStrictEqual(result, null);
    // The block starts with the ClearGate Planning Framework heading
    assert.ok(String(result).includes('## 🔄 ClearGate Planning Framework'));
  });
});
