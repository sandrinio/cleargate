import { describe, test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';

/**
 * wiki-comments-render.test.ts — STORY-010-06
 *
 * Tests for lib/wiki-comments-render.ts.
 *
 * Scenarios covered:
 *   1. Insert new section when wiki page has no existing section
 *   2. Replace existing section (3 → 5 comments)
 *   3. Remove section entirely when comments array is empty
 *   4. Double-run byte-idempotency (run twice → identical output)
 */

import * as fs from 'node:fs';
import * as fsPromises from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';
import { renderCommentsSection, buildCommentSection } from '../../src/lib/wiki-comments-render.js';
import type { RemoteComment } from '../../src/lib/mcp-client.js';

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
  return fs.mkdtempSync(path.join(os.tmpdir(), 'cg-wiki-comments-test-'));
}

function cleanup(dir: string): void {
  fs.rmSync(dir, { recursive: true, force: true });
}

function makeWikiPage(tmpDir: string, primaryId: string, bucket: string, content: string): string {
  const wikiDir = path.join(tmpDir, '.cleargate', 'wiki', bucket);
  fs.mkdirSync(wikiDir, { recursive: true });
  const filePath = path.join(wikiDir, `${primaryId}.md`);
  fs.writeFileSync(filePath, content, 'utf8');
  return filePath;
}

function makeComment(overrides: Partial<RemoteComment> = {}): RemoteComment {
  return {
    id: 'c1',
    author_email: 'alice@example.com',
    author_name: 'Alice',
    body: 'Great work!',
    created_at: '2026-04-19T10:00:00Z',
    remote_id: 'LIN-1042',
    ...overrides,
  };
}

function makeLocalItems(fm: Record<string, unknown>): Array<{ fm: Record<string, unknown> }> {
  return [{ fm }];
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('wiki-comments-render', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = makeTmpDir();
  });

  afterEach(() => {
    cleanup(tmpDir);
  });

  test('inserts new section when wiki page has no existing comments section', async () => {
    const primaryId = 'STORY-042-01';
    const existingContent = '# STORY-042-01\n\nSome content here.\n';
    const wikiPath = makeWikiPage(tmpDir, primaryId, 'stories', existingContent);

    const comments = [
      makeComment({ id: 'c1', body: 'First comment', created_at: '2026-04-19T10:00:00Z' }),
      makeComment({ id: 'c2', body: 'Second comment', created_at: '2026-04-19T11:00:00Z' }),
    ];

    const localItems = makeLocalItems({
      story_id: primaryId,
      remote_id: 'LIN-1042',
    });

    await renderCommentsSection({
      projectRoot: tmpDir,
      remoteId: 'LIN-1042',
      comments,
      localItems,
    });

    const result = await fsPromises.readFile(wikiPath, 'utf8');
    assert.ok(String(result).includes('<!-- cleargate:comments:start -->'));
    assert.ok(String(result).includes('<!-- cleargate:comments:end -->'));
    assert.ok(String(result).includes('## Remote comments'));
    assert.ok(String(result).includes('_Read-only snapshot. Comments live in the PM tool — reply there, not here._'));
    assert.ok(String(result).includes('> First comment'));
    assert.ok(String(result).includes('> Second comment'));
    // Original content preserved
    assert.ok(String(result).includes('Some content here.'));
  });

  test('replaces existing section when new comment count differs (3 → 5 comments)', async () => {
    const primaryId = 'STORY-042-02';
    const START = '<!-- cleargate:comments:start -->';
    const END = '<!-- cleargate:comments:end -->';
    const existingSection = [
      START,
      '## Remote comments',
      '',
      '_Read-only snapshot. Comments live in the PM tool — reply there, not here._',
      '',
      '### Alice (alice@example.com) · 2026-04-01T10:00:00Z',
      '> Old comment 1',
      '',
      '### Bob (bob@example.com) · 2026-04-02T10:00:00Z',
      '> Old comment 2',
      '',
      '### Charlie (charlie@example.com) · 2026-04-03T10:00:00Z',
      '> Old comment 3',
      END,
    ].join('\n');

    const existingContent = `# STORY-042-02\n\nPage body.\n\n${existingSection}\n`;
    const wikiPath = makeWikiPage(tmpDir, primaryId, 'stories', existingContent);

    const comments = [
      makeComment({ id: 'c1', author_name: 'Alice', author_email: 'alice@example.com', body: 'Comment 1', created_at: '2026-04-01T10:00:00Z' }),
      makeComment({ id: 'c2', author_name: 'Bob', author_email: 'bob@example.com', body: 'Comment 2', created_at: '2026-04-02T10:00:00Z' }),
      makeComment({ id: 'c3', author_name: 'Charlie', author_email: 'charlie@example.com', body: 'Comment 3', created_at: '2026-04-03T10:00:00Z' }),
      makeComment({ id: 'c4', author_name: 'Dave', author_email: 'dave@example.com', body: 'Comment 4', created_at: '2026-04-04T10:00:00Z' }),
      makeComment({ id: 'c5', author_name: 'Eve', author_email: 'eve@example.com', body: 'Comment 5', created_at: '2026-04-05T10:00:00Z' }),
    ];

    const localItems = makeLocalItems({ story_id: primaryId, remote_id: 'LIN-1042' });

    await renderCommentsSection({
      projectRoot: tmpDir,
      remoteId: 'LIN-1042',
      comments,
      localItems,
    });

    const result = await fsPromises.readFile(wikiPath, 'utf8');

    // Exactly one START and one END
    const startCount = result.split(START).length - 1;
    const endCount = result.split(END).length - 1;
    assert.strictEqual(startCount, 1);
    assert.strictEqual(endCount, 1);

    // Should contain all 5 comments
    assert.ok(String(result).includes('> Comment 1'));
    assert.ok(String(result).includes('> Comment 2'));
    assert.ok(String(result).includes('> Comment 3'));
    assert.ok(String(result).includes('> Comment 4'));
    assert.ok(String(result).includes('> Comment 5'));

    // Original body preserved
    assert.ok(String(result).includes('Page body.'));
  });

  test('removes section entirely when comments array is empty', async () => {
    const primaryId = 'STORY-042-03';
    const START = '<!-- cleargate:comments:start -->';
    const END = '<!-- cleargate:comments:end -->';
    const existingSection = [
      START,
      '## Remote comments',
      '',
      '_Read-only snapshot. Comments live in the PM tool — reply there, not here._',
      '',
      '### Alice (alice@example.com) · 2026-04-01T10:00:00Z',
      '> Some comment',
      END,
    ].join('\n');

    const existingContent = `# STORY-042-03\n\nPage content here.\n\n${existingSection}\n`;
    const wikiPath = makeWikiPage(tmpDir, primaryId, 'stories', existingContent);

    const localItems = makeLocalItems({ story_id: primaryId, remote_id: 'LIN-1042' });

    await renderCommentsSection({
      projectRoot: tmpDir,
      remoteId: 'LIN-1042',
      comments: [],
      localItems,
    });

    const result = await fsPromises.readFile(wikiPath, 'utf8');

    // Delimiters removed
    assert.ok(!String(result).includes(START));
    assert.ok(!String(result).includes(END));
    // No empty header
    assert.ok(!String(result).includes('## Remote comments'));
    // Original content preserved
    assert.ok(String(result).includes('Page content here.'));
  });

  test('is byte-idempotent: running twice produces identical output', async () => {
    const primaryId = 'STORY-042-04';
    const existingContent = '# STORY-042-04\n\nIdempotency test page.\n';
    makeWikiPage(tmpDir, primaryId, 'stories', existingContent);

    const comments = [
      makeComment({ id: 'c1', body: 'Stable comment', created_at: '2026-04-10T10:00:00Z' }),
    ];
    const localItems = makeLocalItems({ story_id: primaryId, remote_id: 'LIN-9999' });
    const wikiPath = path.join(tmpDir, '.cleargate', 'wiki', 'stories', `${primaryId}.md`);

    // First run
    await renderCommentsSection({
      projectRoot: tmpDir,
      remoteId: 'LIN-9999',
      comments,
      localItems,
    });
    const afterFirstRun = await fsPromises.readFile(wikiPath, 'utf8');

    // Second run with same input
    await renderCommentsSection({
      projectRoot: tmpDir,
      remoteId: 'LIN-9999',
      comments,
      localItems,
    });
    const afterSecondRun = await fsPromises.readFile(wikiPath, 'utf8');

    assert.strictEqual(afterSecondRun, afterFirstRun);
  });

  test('renders null author_email without parentheses', () => {
    const comments: RemoteComment[] = [
      {
        id: 'c1',
        author_email: null,
        author_name: 'Anonymous',
        body: 'No email comment',
        created_at: '2026-04-19T10:00:00Z',
        remote_id: 'LIN-1042',
      },
    ];

    const section = buildCommentSection(comments);
    // Should not have (null) or () in it
    assert.ok(String(section).includes('### Anonymous · 2026-04-19T10:00:00Z'));
    assert.ok(!String(section).includes('(null)'));
    assert.ok(!String(section).includes('()'));
  });

  test('no-ops when wiki page does not exist (wiki-ingest not yet run)', async () => {
    const localItems = makeLocalItems({ story_id: 'STORY-999-99', remote_id: 'LIN-9999' });
    // Should not throw
    await expect(
      renderCommentsSection({
        projectRoot: tmpDir,
        remoteId: 'LIN-9999',
        comments: [makeComment()],
        localItems,
      }),
    ).resolves.toBeUndefined();
  });
});
