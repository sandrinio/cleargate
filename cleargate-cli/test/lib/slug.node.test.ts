import { describe, test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';

/**
 * slug.test.ts — STORY-010-05
 *
 * Tests for slugify() and nextProposalId() helpers.
 *
 * Test inventory:
 *   1. plainAscii — plain ASCII title slugified correctly
 *   2. specialChars — special chars and spaces replaced with dashes
 *   3. unicodeStripped — accented/unicode characters normalized then retained
 *   4. truncates — truncation at max with trailing dash re-trim
 *   5. emptyReturnsUntitled — empty + whitespace-only + all-special → "untitled"
 *   6. scansBothDirs — nextProposalId reads pending-sync + archive
 *   7. gapTolerant — nextProposalId returns max+1 (not first gap)
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { slugify, nextProposalId } from '../../src/lib/slug.js';

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


// ── Helpers ───────────────────────────────────────────────────────────────────

function makeTmpDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'cg-slug-test-'));
}

function cleanup(dir: string): void {
  fs.rmSync(dir, { recursive: true, force: true });
}

function writeProposal(dir: string, filename: string, proposalId: string): void {
  const content = `---\nproposal_id: "${proposalId}"\nstatus: "Draft"\n---\n\n# Body\n`;
  fs.writeFileSync(path.join(dir, filename), content, 'utf8');
}

// ── slugify ───────────────────────────────────────────────────────────────────

describe('slugify', () => {
  test('plainAscii: lowercases and joins with dashes', () => {
    expect(slugify('Refund Flow Redesign')).toBe('refund-flow-redesign');
  });

  test('specialChars: replaces punctuation runs with a single dash', () => {
    expect(slugify('Hello, World! -- A Test')).toBe('hello-world-a-test');
  });

  test('unicodeStripped: NFKD normalization preserves base letters', () => {
    // "Déjà vu — naïve" → deja-vu-naive (accents stripped, em-dash replaced)
    expect(slugify('Déjà vu — naïve')).toBe('deja-vu-naive');
  });

  test('truncates: truncates to max chars and re-trims trailing dash', () => {
    // "Allow users — billing/accounts — to export CSVs & also PDFs !!!"
    // After slugify (no limit): allow-users-billing-accounts-to-export-csvs-also-pdfs
    // At 40 chars: "allow-users-billing-accounts-to-export-c" → 40 chars, no trailing dash
    const result = slugify('Allow users — billing/accounts — to export CSVs & also PDFs !!!', 40);
    assert.ok(result.length <= 40);
    assert.doesNotMatch(String(result), /-$/);
    // Should start with 'allow-users'
    assert.match(String(result), /^allow-users/);
  });

  test('emptyReturnsUntitled: empty string → "untitled"', () => {
    expect(slugify('')).toBe('untitled');
  });

  test('whitespaceOnlyReturnsUntitled: whitespace-only → "untitled"', () => {
    expect(slugify('   ')).toBe('untitled');
  });

  test('allSpecialReturnsUntitled: all-special chars → "untitled"', () => {
    expect(slugify('!!!')).toBe('untitled');
  });

  test('cjkStripped: CJK characters stripped, falls back to untitled', () => {
    // CJK characters are stripped by [^a-z0-9]+ replacement
    expect(slugify('日本語タイトル')).toBe('untitled');
  });
});

// ── nextProposalId ────────────────────────────────────────────────────────────

describe('nextProposalId', () => {
  let tmpDir: string;
  let pendingSync: string;
  let archive: string;

  beforeEach(() => {
    tmpDir = makeTmpDir();
    pendingSync = path.join(tmpDir, '.cleargate', 'delivery', 'pending-sync');
    archive = path.join(tmpDir, '.cleargate', 'delivery', 'archive');
    fs.mkdirSync(pendingSync, { recursive: true });
    fs.mkdirSync(archive, { recursive: true });
  });

  afterEach(() => cleanup(tmpDir));

  test('scansBothDirs: picks max from pending-sync + archive combined', async () => {
    // archive has PROP-030, pending-sync has PROP-031 → next is PROP-032
    writeProposal(archive, 'PROPOSAL-030-foo.md', 'PROP-030');
    writeProposal(pendingSync, 'PROPOSAL-031-bar.md', 'PROP-031');

    const result = await nextProposalId(tmpDir);
    assert.strictEqual(result, 'PROP-032');
  });

  test('gapTolerant: returns max+1 not first gap', async () => {
    // Has PROP-001 and PROP-031 (gap at 2-30) → max+1 = PROP-032
    writeProposal(archive, 'PROPOSAL-001-foo.md', 'PROP-001');
    writeProposal(pendingSync, 'PROPOSAL-031-bar.md', 'PROP-031');

    const result = await nextProposalId(tmpDir);
    assert.strictEqual(result, 'PROP-032');
  });

  test('emptyDirs: returns PROP-001 when no proposals exist', async () => {
    const result = await nextProposalId(tmpDir);
    assert.strictEqual(result, 'PROP-001');
  });

  test('unquotedFrontmatter: handles unquoted proposal_id: PROP-NNN', async () => {
    // Some archived proposals use unquoted form
    const content = `---\nproposal_id: PROP-010\nstatus: Approved\n---\n\n# Body\n`;
    fs.writeFileSync(path.join(archive, 'PROPOSAL-010-old.md'), content, 'utf8');

    const result = await nextProposalId(tmpDir);
    assert.strictEqual(result, 'PROP-011');
  });
});
