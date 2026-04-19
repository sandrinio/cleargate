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

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as fsPromises from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';
import { renderCommentsSection, buildCommentSection } from '../../src/lib/wiki-comments-render.js';
import type { RemoteComment } from '../../src/lib/mcp-client.js';

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

  it('inserts new section when wiki page has no existing comments section', async () => {
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
    expect(result).toContain('<!-- cleargate:comments:start -->');
    expect(result).toContain('<!-- cleargate:comments:end -->');
    expect(result).toContain('## Remote comments');
    expect(result).toContain('_Read-only snapshot. Comments live in the PM tool — reply there, not here._');
    expect(result).toContain('> First comment');
    expect(result).toContain('> Second comment');
    // Original content preserved
    expect(result).toContain('Some content here.');
  });

  it('replaces existing section when new comment count differs (3 → 5 comments)', async () => {
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
    expect(startCount).toBe(1);
    expect(endCount).toBe(1);

    // Should contain all 5 comments
    expect(result).toContain('> Comment 1');
    expect(result).toContain('> Comment 2');
    expect(result).toContain('> Comment 3');
    expect(result).toContain('> Comment 4');
    expect(result).toContain('> Comment 5');

    // Original body preserved
    expect(result).toContain('Page body.');
  });

  it('removes section entirely when comments array is empty', async () => {
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
    expect(result).not.toContain(START);
    expect(result).not.toContain(END);
    // No empty header
    expect(result).not.toContain('## Remote comments');
    // Original content preserved
    expect(result).toContain('Page content here.');
  });

  it('is byte-idempotent: running twice produces identical output', async () => {
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

    expect(afterSecondRun).toBe(afterFirstRun);
  });

  it('renders null author_email without parentheses', () => {
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
    expect(section).toContain('### Anonymous · 2026-04-19T10:00:00Z');
    expect(section).not.toContain('(null)');
    expect(section).not.toContain('()');
  });

  it('no-ops when wiki page does not exist (wiki-ingest not yet run)', async () => {
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
