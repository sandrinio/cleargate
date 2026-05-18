import { describe, test } from 'node:test';
import assert from 'node:assert/strict';

/**
 * changelog-slice.test.ts — STORY-016-04
 *
 * Unit tests for lib/changelog.ts — parseChangelog + sliceChangelog.
 * Covers the 4 Gherkin scenarios from story §2.1 + 2 boundary tests.
 * Fixture-based; no real upgrade run.
 */

import { parseChangelog, sliceChangelog } from '../../src/lib/changelog.js';

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


// ─── Fixture ─────────────────────────────────────────────────────────────────

/**
 * Minimal CHANGELOG fixture with sections for:
 * 0.8.2, 0.8.1, 0.8.0, 0.7.0, 0.6.0, 0.5.0
 * in most-recent-first order (Common-Changelog format).
 */
const FIXTURE = `# Changelog

All notable changes to this project are documented in this file.
Format: [Common Changelog](https://common-changelog.org/) — most-recent version first.

## [0.8.2] — 2026-04-27

### Fixed
- Strip internal cross-reference comments (BUG-020).

---

## [0.8.1] — 2026-04-27

### Fixed
- .mcp.json now uses npx -y cleargate@<pin> (BUG-019 follow-up).

---

## [0.8.0] — 2026-04-27

### Added
- cleargate mcp serve command (BUG-019).

---

## [0.7.0] — 2026-04-27

### Added
- cleargate init writes .mcp.json (BUG-017).

### Fixed
- cleargate init preserves +x bit (BUG-018).

---

## [0.6.0] — 2026-04-27

### Added
- cleargate hotfix new command (STORY-022-06).

---

## [0.5.0] — 2026-04-26

### Fixed
- Init scaffold hooks resolve cleargate via PATH correctly (BUG-006).
`;

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('parseChangelog', () => {
  test('parses all sections in order from fixture', () => {
    const sections = parseChangelog(FIXTURE);
    assert.strictEqual(sections.length, 6);
    assert.strictEqual(sections[0].version, '0.8.2');
    assert.strictEqual(sections[5].version, '0.5.0');
  });

  test('returns empty array on empty input', () => {
    expect(parseChangelog('')).toEqual([]);
  });

  test('returns empty array when no headings found', () => {
    expect(parseChangelog('# Changelog\n\nNo sections here.')).toEqual([]);
  });

  test('includes heading line in body', () => {
    const sections = parseChangelog(FIXTURE);
    assert.ok(String(sections[0].body).includes('## [0.8.2] — 2026-04-27'));
  });
});

describe('sliceChangelog — Gherkin Scenario: Delta covers intermediate versions', () => {
  test('Scenario: installed=0.6.0 target=0.8.2 — returns 0.8.2, 0.8.1, 0.8.0, 0.7.0 in order (exclusive from, inclusive to)', () => {
    const sections = sliceChangelog(FIXTURE, '0.6.0', '0.8.2');
    const versions = sections.map((s) => s.version);
    assert.deepStrictEqual(versions, ['0.8.2', '0.8.1', '0.8.0', '0.7.0']);
  });

  test('does NOT include 0.6.0 (fromExclusive boundary)', () => {
    const sections = sliceChangelog(FIXTURE, '0.6.0', '0.8.2');
    expect(sections.find((s) => s.version === '0.6.0')).toBeUndefined();
  });

  test('does NOT include 0.5.0 (older than fromExclusive)', () => {
    const sections = sliceChangelog(FIXTURE, '0.6.0', '0.8.2');
    expect(sections.find((s) => s.version === '0.5.0')).toBeUndefined();
  });

  test('includes 0.8.2 (toInclusive boundary)', () => {
    const sections = sliceChangelog(FIXTURE, '0.6.0', '0.8.2');
    expect(sections.find((s) => s.version === '0.8.2')).toBeDefined();
  });
});

describe('sliceChangelog — Gherkin Scenario: Same version skips delta', () => {
  test('Scenario: installed=0.8.2 target=0.8.2 — returns empty array', () => {
    const sections = sliceChangelog(FIXTURE, '0.8.2', '0.8.2');
    assert.deepStrictEqual(sections, []);
  });
});

describe('sliceChangelog — Gherkin Scenario: Installed older than earliest changelog entry prints all', () => {
  test('Scenario: installed=0.0.5, earliest=0.5.0 — returns all 6 sections (all are > 0.0.5)', () => {
    const sections = sliceChangelog(FIXTURE, '0.0.5', '0.8.2');
    assert.strictEqual(sections.length, 6);
    const versions = sections.map((s) => s.version);
    assert.ok(String(versions).includes('0.5.0'));
    assert.ok(String(versions).includes('0.8.2'));
  });
});

describe('sliceChangelog — boundary tests', () => {
  test('boundary: empty content returns empty array', () => {
    expect(sliceChangelog('', '0.6.0', '0.8.2')).toEqual([]);
  });

  test('boundary: from===to returns empty array (same-version range)', () => {
    expect(sliceChangelog(FIXTURE, '0.7.0', '0.7.0')).toEqual([]);
  });

  test('boundary: installed exactly equals an entry version is excluded from results', () => {
    // from=0.7.0 means 0.7.0 itself should NOT appear (exclusive lower bound)
    const sections = sliceChangelog(FIXTURE, '0.7.0', '0.8.2');
    const versions = sections.map((s) => s.version);
    assert.ok(!String(versions).includes('0.7.0'));
    assert.ok(String(versions).includes('0.8.0'));
    assert.ok(String(versions).includes('0.8.1'));
    assert.ok(String(versions).includes('0.8.2'));
  });

  test('boundary: section bodies contain the heading line verbatim', () => {
    const sections = sliceChangelog(FIXTURE, '0.6.0', '0.8.2');
    for (const section of sections) {
      assert.match(String(section.body), 
        new RegExp(`^## \\[${section.version}\\] — \\d{4}-\\d{2}-\\d{2}`, 'm')
      );
    }
  });
});
