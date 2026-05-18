import { describe, test } from 'node:test';
import assert from 'node:assert/strict';

/**
 * generate-changelog-diff.test.ts — STORY-009-02
 *
 * Tests for scripts/generate-changelog-diff.ts
 * All tests use fixture manifests; no npm show calls are made.
 */

import { diffManifests, formatDiff } from '../../scripts/generate-changelog-diff.js';
import type { ManifestFile, ManifestEntry } from '../../src/lib/manifest.js';

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


// ─── Fixture helpers ──────────────────────────────────────────────────────────

function makeEntry(
  p: string,
  sha: string | null,
  overrides: Partial<ManifestEntry> = {}
): ManifestEntry {
  return {
    path: p,
    sha256: sha,
    tier: 'protocol',
    overwrite_policy: 'merge-3way',
    preserve_on_uninstall: false,
    ...overrides,
  };
}

function makeManifest(files: ManifestEntry[]): ManifestFile {
  return {
    cleargate_version: '0.1.0',
    generated_at: '2026-01-01T00:00:00.000Z',
    files,
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('generate-changelog-diff: diffManifests', () => {
  test('added/removed/changed enumerated', () => {
    const prev = makeManifest([
      makeEntry('file-A.md', 'aaaa0001'),
    ]);
    const current = makeManifest([
      makeEntry('file-A.md', 'bbbb0002'),   // changed (sha differs)
      makeEntry('file-B.md', 'cccc0003'),   // added
    ]);

    const diff = diffManifests(prev, current);
    assert.ok(String(diff.added).includes('file-B.md'));
    assert.ok(String(diff.changed).includes('file-A.md'));
    assert.strictEqual((diff.removed).length, 0);
  });

  test('removed file appears in removed list', () => {
    const prev = makeManifest([
      makeEntry('file-A.md', 'aaaa'),
      makeEntry('file-B.md', 'bbbb'),
    ]);
    const current = makeManifest([
      makeEntry('file-A.md', 'aaaa'),
    ]);

    const diff = diffManifests(prev, current);
    assert.ok(String(diff.removed).includes('file-B.md'));
    assert.strictEqual((diff.added).length, 0);
    assert.strictEqual((diff.changed).length, 0);
  });

  test('moved collapses into Moved entry, not Added+Removed', () => {
    // File moved from path X to path Y with identical sha
    const prev = makeManifest([
      makeEntry('.claude/agents/old-agent.md', 'sha-abc123'),
    ]);
    const current = makeManifest([
      makeEntry('.claude/agents/new-agent.md', 'sha-abc123'),
    ]);

    const diff = diffManifests(prev, current);
    assert.strictEqual((diff.moved).length, 1);
    assert.strictEqual(diff.moved[0], '.claude/agents/old-agent.md → .claude/agents/new-agent.md');
    assert.strictEqual((diff.added).length, 0);
    assert.strictEqual((diff.removed).length, 0);
  });

  test('empty diff yields empty result', () => {
    const prev = makeManifest([
      makeEntry('file-A.md', 'sha-same'),
    ]);
    const current = makeManifest([
      makeEntry('file-A.md', 'sha-same'),
    ]);

    const diff = diffManifests(prev, current);
    assert.strictEqual((diff.added).length, 0);
    assert.strictEqual((diff.removed).length, 0);
    assert.strictEqual((diff.changed).length, 0);
    assert.strictEqual((diff.moved).length, 0);
  });

  test('null sha does not trigger Changed', () => {
    // user-artifact entries with null sha should not be flagged as changed
    const prev = makeManifest([
      makeEntry('.cleargate/FLASHCARD.md', null, { tier: 'user-artifact' }),
    ]);
    const current = makeManifest([
      makeEntry('.cleargate/FLASHCARD.md', null, { tier: 'user-artifact' }),
    ]);

    const diff = diffManifests(prev, current);
    assert.strictEqual((diff.changed).length, 0);
  });

  test('Changed: same path, different sha', () => {
    const prev = makeManifest([
      makeEntry('.cleargate/knowledge/cleargate-protocol.md', 'sha-abc'),
    ]);
    const current = makeManifest([
      makeEntry('.cleargate/knowledge/cleargate-protocol.md', 'sha-def'),
    ]);

    const diff = diffManifests(prev, current);
    assert.ok(String(diff.changed).includes('.cleargate/knowledge/cleargate-protocol.md'));
  });
});

describe('generate-changelog-diff: formatDiff', () => {
  test('empty diff yields empty string', () => {
    const diff = { added: [], removed: [], changed: [], moved: [] };
    expect(formatDiff(diff)).toBe('');
  });

  test('stdout contains Changed: path', () => {
    const diff = {
      added: [],
      removed: [],
      changed: ['.cleargate/knowledge/cleargate-protocol.md'],
      moved: [],
    };
    const output = formatDiff(diff);
    assert.ok(String(output).includes('## Scaffold files changed'));
    assert.ok(String(output).includes('Changed: .cleargate/knowledge/cleargate-protocol.md'));
  });

  test('stdout shows Moved: A → B (not separate Added+Removed)', () => {
    const diff = {
      added: [],
      removed: [],
      changed: [],
      moved: ['.claude/agents/old.md → .claude/agents/new.md'],
    };
    const output = formatDiff(diff);
    assert.ok(String(output).includes('Moved: .claude/agents/old.md → .claude/agents/new.md'));
    assert.ok(!String(output).includes('Added:'));
    assert.ok(!String(output).includes('Removed:'));
  });

  test('all change types formatted correctly', () => {
    const diff = {
      added: ['new-file.md'],
      removed: ['old-file.md'],
      changed: ['changed-file.md'],
      moved: ['from.md → to.md'],
    };
    const output = formatDiff(diff);
    assert.ok(String(output).includes('Added: new-file.md'));
    assert.ok(String(output).includes('Removed: old-file.md'));
    assert.ok(String(output).includes('Changed: changed-file.md'));
    assert.ok(String(output).includes('Moved: from.md → to.md'));
    assert.ok(String(output).includes('## Scaffold files changed'));
  });
});
