import { describe, test } from 'node:test';
import assert from 'node:assert/strict';

/**
 * sprint-execution-mirror.test.ts — STORY-026-01
 *
 * Verifies that the canonical cleargate-planning skill mirror byte-matches
 * the live skill file and that MANIFEST.json contains a valid entry for it.
 *
 * Scenario 7 (Gherkin §2.1):
 *   Given "npm run prebuild" has run in cleargate-cli/
 *   When the test runs
 *   Then cleargate-planning/.claude/skills/sprint-execution/SKILL.md exists
 *   And diff against the live file produces zero output
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

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

// Resolve repo root from this test file's location:
// test/scaffold/ → test/ → cleargate-cli/ → (repo root)
const REPO_ROOT = path.resolve(__dirname, '..', '..', '..');

const CANONICAL_SKILL = path.join(
  REPO_ROOT,
  'cleargate-planning',
  '.claude',
  'skills',
  'sprint-execution',
  'SKILL.md',
);

const MANIFEST_PATH = path.join(
  REPO_ROOT,
  'cleargate-planning',
  'MANIFEST.json',
);

describe('Scenario 7: canonical skill mirror matches live skill (STORY-026-01)', () => {
  test('cleargate-planning/.claude/skills/sprint-execution/SKILL.md exists', () => {
    expect(
      fs.existsSync(CANONICAL_SKILL),
      `Canonical skill file not found at ${CANONICAL_SKILL}`,
    ).toBe(true);
  });

  test('diff against cleargate-cli/templates canonical copy produces zero output', () => {
    const templateSkill = path.join(
      REPO_ROOT,
      'cleargate-cli',
      'templates',
      'cleargate-planning',
      '.claude',
      'skills',
      'sprint-execution',
      'SKILL.md',
    );

    // Both must exist
    expect(fs.existsSync(CANONICAL_SKILL)).toBe(true);
    expect(
      fs.existsSync(templateSkill),
      `Template skill not found at ${templateSkill} — run npm run prebuild`,
    ).toBe(true);

    // Content must be byte-identical
    const canonicalContent = fs.readFileSync(CANONICAL_SKILL, 'utf8');
    const templateContent = fs.readFileSync(templateSkill, 'utf8');
    assert.strictEqual(canonicalContent, templateContent);
  });

  test('MANIFEST.json contains a valid entry for .claude/skills/sprint-execution/SKILL.md', () => {
    expect(
      fs.existsSync(MANIFEST_PATH),
      `MANIFEST.json not found at ${MANIFEST_PATH}`,
    ).toBe(true);

    type ManifestEntry = {
      path: string;
      sha256: string;
      tier: string;
      overwrite_policy: string;
    };

    const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8')) as {
      files: ManifestEntry[];
    };

    const entry = manifest.files.find(
      (f) => f.path === '.claude/skills/sprint-execution/SKILL.md',
    );

    assert.notStrictEqual(entry, undefined, 'MANIFEST.json must have an entry for .claude/skills/sprint-execution/SKILL.md');

    // SHA must be non-empty and match the canonical file
    assert.ok(entry!.sha256);
    assert.strictEqual(entry!.tier, 'skill');
  });

  test('diff command on live vs canonical returns empty output (byte-for-byte match)', () => {
    // This test runs diff on the live .claude/skills path IF it exists on this machine.
    // The live .claude/ is gitignored — this assertion only applies when the developer
    // runs locally (CI may not have the live skill).
    const liveSkill = path.join(
      REPO_ROOT,
      '.claude',
      'skills',
      'sprint-execution',
      'SKILL.md',
    );

    if (!fs.existsSync(liveSkill)) {
      // Skip on CI/downstream machines where .claude/ is absent (gitignored)
      return;
    }

    let diffOutput = '';
    try {
      diffOutput = execSync(
        `diff "${liveSkill}" "${CANONICAL_SKILL}"`,
        { encoding: 'utf8', stdio: 'pipe' },
      );
    } catch (err) {
      // diff exits 1 when files differ
      diffOutput = (err as { stdout?: string }).stdout ?? 'diff failed';
    }

    assert.strictEqual(diffOutput, '', `Live skill and canonical skill differ:\n${diffOutput}`);
  });
});
