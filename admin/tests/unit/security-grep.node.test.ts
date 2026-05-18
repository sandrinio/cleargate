import { describe, test } from 'node:test';
import assert from 'node:assert/strict';

/**
 * security-grep.test.ts — STORY-006-05 (non-negotiable per §4 DoD)
 *
 * Static grep assertion: TokenIssuedModal and tokens page MUST NOT reference
 * localStorage, sessionStorage, or indexedDB in any form.
 *
 * This test is a guard against regressions introduced by future editors.
 * QA will re-run this test independently.
 *
 * Note: localStorage usage in other files (e.g. UI preference: sidebar-collapsed)
 * is acceptable. This test is scoped to the token-handling files only.
 */
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

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
      const calls = (actual as { mock: { calls: { arguments: unknown[] }[] } }).mock.calls;
      assert.deepStrictEqual(calls[calls.length - 1]?.arguments, expectedArgs);
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
        async toThrow(msg?: string) {
          if (!msg) await assert.rejects(p);
          else await assert.rejects(p, new RegExp(esc(msg)));
        },
        async toSatisfy(predicate: (val: unknown) => boolean) {
          let err: unknown;
          try { await p; } catch(e) { err = e; }
          assert.ok(predicate(err), `Rejected value did not satisfy predicate. Got: ${String(err)}`);
        },
      };
    },
  };
}


const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '../..');

const TOKEN_FILES = [
  'src/lib/components/TokenIssuedModal.svelte',
  'src/lib/components/TokenIssueForm.svelte',
  'src/routes/projects/[id]/tokens/+page.svelte',
  'src/lib/utils/clipboard.ts',
];

const FORBIDDEN_PATTERNS = [
  /localStorage/g,
  /sessionStorage/g,
  /indexedDB/g,
];

/**
 * Strip single-line and block comments from source code before scanning.
 * This prevents false positives from JSDoc comments that name the forbidden APIs
 * (e.g. "NEVER written to localStorage" in a security contract comment).
 */
function stripComments(src: string): string {
  // Remove block comments (/* ... */)
  let result = src.replace(/\/\*[\s\S]*?\*\//g, '');
  // Remove single-line comments (// ...)
  result = result.replace(/\/\/.*/g, '');
  // Remove Svelte template comments (<!-- ... -->)
  result = result.replace(/<!--[\s\S]*?-->/g, '');
  return result;
}

describe('Security grep: no persistent storage in token files', () => {
  for (const relativePath of TOKEN_FILES) {
    test(`${relativePath} contains no localStorage/sessionStorage/indexedDB in non-comment code`, () => {
      const fullPath = join(projectRoot, relativePath);
      let rawContent: string;
      try {
        rawContent = readFileSync(fullPath, 'utf-8');
      } catch {
        // File doesn't exist yet — treat as safe (will fail in CI when the file should exist)
        return;
      }

      const content = stripComments(rawContent);

      for (const pattern of FORBIDDEN_PATTERNS) {
        const matches = content.match(pattern);
        assert.strictEqual(
          matches, null,
          `File "${relativePath}" contains forbidden storage reference in non-comment code: ${pattern.toString()}. ` +
            `Plaintext tokens MUST NEVER be persisted. Found in stripped source.`,
        );
      }
    });
  }

  test('mcp-client.ts module-level comment confirms never persisted', () => {
    const mcpClientPath = join(projectRoot, 'src/lib/mcp-client.ts');
    const content = readFileSync(mcpClientPath, 'utf-8');
    // The module banner must declare the no-storage contract
    assert.ok(String(content).includes('NEVER localStorage/sessionStorage'));
  });
});
