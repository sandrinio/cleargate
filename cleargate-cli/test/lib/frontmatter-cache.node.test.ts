import { describe, test, afterEach } from 'node:test';
import assert from 'node:assert/strict';

/**
 * Tests for STORY-008-02: frontmatter-cache.ts
 * Covers: readCachedGate, writeCachedGate idempotency, key-order preservation.
 */
import * as os from 'node:os';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { readCachedGate, writeCachedGate } from '../../src/lib/frontmatter-cache.js';
import type { CachedGate } from '../../src/lib/frontmatter-cache.js';

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

const tmpDirs: string[] = [];
const FIXED_NOW = new Date('2026-04-19T10:00:00.000Z');
const FIXED_NOW_FN = () => FIXED_NOW;

function makeTmpDir(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cg-fc-test-'));
  tmpDirs.push(dir);
  return dir;
}

afterEach(() => {
  for (const dir of tmpDirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

function writeMarkdown(filePath: string, content: string): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, 'utf8');
}

function readMarkdown(filePath: string): string {
  return fs.readFileSync(filePath, 'utf8');
}

// ─── readCachedGate tests ─────────────────────────────────────────────────────

describe('readCachedGate', () => {
  // Gherkin: "readCachedGate returns null when cached_gate_result absent"
  test('returns null when cached_gate_result absent', async () => {
    const dir = makeTmpDir();
    const file = path.join(dir, 'story.md');
    writeMarkdown(file, '---\nstory_id: "STORY-008-02"\nstatus: Draft\n---\n\nBody here.\n');

    const result = await readCachedGate(file);
    assert.strictEqual(result, null);
  });

  test('returns null when file does not exist', async () => {
    const result = await readCachedGate('/non/existent/file.md');
    assert.strictEqual(result, null);
  });

  test('returns null when frontmatter parse fails', async () => {
    const dir = makeTmpDir();
    const file = path.join(dir, 'bad.md');
    writeMarkdown(file, 'no frontmatter here\n');
    const result = await readCachedGate(file);
    assert.strictEqual(result, null);
  });

  test('reads back a cached_gate_result written by writeCachedGate', async () => {
    const dir = makeTmpDir();
    const file = path.join(dir, 'story.md');
    writeMarkdown(file, '---\nstory_id: "STORY-008-02"\n---\n\nBody.\n');

    const gate: CachedGate = {
      pass: true,
      failing_criteria: [],
      last_gate_check: '2026-04-19T10:00:00Z',
    };
    await writeCachedGate(file, gate, { now: FIXED_NOW_FN });
    const read = await readCachedGate(file);

    assert.notStrictEqual(read, null);
    assert.strictEqual(read!.pass, true);
    assert.deepStrictEqual(read!.failing_criteria, []);
    assert.strictEqual(read!.last_gate_check, '2026-04-19T10:00:00Z');
  });

  test('reads back failing_criteria correctly', async () => {
    const dir = makeTmpDir();
    const file = path.join(dir, 'story.md');
    writeMarkdown(file, '---\nstory_id: "STORY-008-02"\n---\n\nBody.\n');

    const gate: CachedGate = {
      pass: false,
      failing_criteria: [
        { id: 'no-tbds', detail: "1 occurrence at §2" },
        { id: 'parent-epic-ref-set', detail: 'expected parent_epic_ref != null, got null' },
      ],
      last_gate_check: '2026-04-19T10:00:00Z',
    };
    await writeCachedGate(file, gate, { now: FIXED_NOW_FN });
    const read = await readCachedGate(file);

    assert.strictEqual(read!.pass, false);
    assert.strictEqual((read!.failing_criteria).length, 2);
    assert.strictEqual(read!.failing_criteria[0]!.id, 'no-tbds');
  });
});

// ─── writeCachedGate tests ────────────────────────────────────────────────────

describe('writeCachedGate', () => {
  // Gherkin: "frontmatter-cache idempotency"
  test('byte-identical rerun: write twice with same inputs → file bytes unchanged', async () => {
    const dir = makeTmpDir();
    const file = path.join(dir, 'story.md');
    writeMarkdown(file, '---\nstory_id: "STORY-008-02"\nstatus: Draft\n---\n\nBody.\n');

    const gate: CachedGate = {
      pass: false,
      failing_criteria: [{ id: 'no-tbds', detail: 'found TBD' }],
      last_gate_check: '2026-04-19T10:00:00Z',
    };

    // First write
    await writeCachedGate(file, gate, { now: FIXED_NOW_FN });
    const afterFirst = readMarkdown(file);

    // Second write with identical inputs
    await writeCachedGate(file, gate, { now: FIXED_NOW_FN });
    const afterSecond = readMarkdown(file);

    assert.strictEqual(afterFirst, afterSecond);
  });

  test('preserves existing frontmatter keys in original order', async () => {
    const dir = makeTmpDir();
    const file = path.join(dir, 'story.md');
    const original = '---\nstory_id: "STORY-008-02"\nstatus: Draft\nambiguity: Low\n---\n\nBody.\n';
    writeMarkdown(file, original);

    await writeCachedGate(file, {
      pass: true,
      failing_criteria: [],
      last_gate_check: '2026-04-19T10:00:00Z',
    }, { now: FIXED_NOW_FN });

    const written = readMarkdown(file);
    // story_id should appear before status should appear before ambiguity
    const storyIdx = written.indexOf('story_id:');
    const statusIdx = written.indexOf('status:');
    const ambiguityIdx = written.indexOf('ambiguity:');
    const cachedIdx = written.indexOf('cached_gate_result:');

    assert.ok(storyIdx < statusIdx);
    assert.ok(statusIdx < ambiguityIdx);
    assert.ok(ambiguityIdx < cachedIdx);
  });

  test('updates cached_gate_result in-place when key already exists', async () => {
    const dir = makeTmpDir();
    const file = path.join(dir, 'story.md');
    writeMarkdown(file, '---\nstory_id: "STORY-008-02"\n---\n\nBody.\n');

    const gate1: CachedGate = {
      pass: false,
      failing_criteria: [{ id: 'no-tbds', detail: 'found TBD' }],
      last_gate_check: '2026-04-19T10:00:00Z',
    };
    await writeCachedGate(file, gate1, { now: FIXED_NOW_FN });

    const gate2: CachedGate = {
      pass: true,
      failing_criteria: [],
      last_gate_check: '2026-04-19T11:00:00Z',
    };
    await writeCachedGate(file, gate2, { now: FIXED_NOW_FN });

    const read = await readCachedGate(file);
    assert.strictEqual(read!.pass, true);
    assert.strictEqual(read!.last_gate_check, '2026-04-19T11:00:00Z');
  });

  test('body is preserved verbatim after write', async () => {
    const dir = makeTmpDir();
    const file = path.join(dir, 'story.md');
    const body = '# My Story\n\n## Section 1\n\nContent here.\n\n## Section 2\n\n- item one\n- item two\n';
    writeMarkdown(file, `---\nstory_id: "STORY-008-02"\n---\n\n${body}`);

    await writeCachedGate(file, {
      pass: true,
      failing_criteria: [],
      last_gate_check: '2026-04-19T10:00:00Z',
    }, { now: FIXED_NOW_FN });

    const written = readMarkdown(file);
    assert.ok(String(written).includes('# My Story'));
    assert.ok(String(written).includes('## Section 1'));
    assert.ok(String(written).includes('- item one'));
  });

  test('throws when file has no valid frontmatter', async () => {
    const dir = makeTmpDir();
    const file = path.join(dir, 'bad.md');
    writeMarkdown(file, 'no frontmatter here\n');

    await expect(writeCachedGate(file, {
      pass: true,
      failing_criteria: [],
      last_gate_check: '2026-04-19T10:00:00Z',
    })).rejects.toThrow('writeCachedGate: failed to parse frontmatter');
  });

  test('uses injected now for last_gate_check when not provided in result', async () => {
    const dir = makeTmpDir();
    const file = path.join(dir, 'story.md');
    writeMarkdown(file, '---\nstory_id: "STORY-008-02"\n---\n\nBody.\n');

    const fixedDate = new Date('2026-01-01T00:00:00.000Z');
    await writeCachedGate(file, {
      pass: true,
      failing_criteria: [],
      last_gate_check: '', // empty → use now()
    }, { now: () => fixedDate });

    const read = await readCachedGate(file);
    assert.strictEqual(read!.last_gate_check, '2026-01-01T00:00:00Z');
  });
});
