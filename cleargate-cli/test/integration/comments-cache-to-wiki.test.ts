/**
 * comments-cache-to-wiki.test.ts — STORY-010-06 (integration)
 *
 * Seed .comments-cache/<remote_id>.json with 3 comments + a pre-existing wiki page.
 * Run renderCommentsSection. Assert:
 *   - Section present with 3 ### blocks
 *   - Read-only banner present
 *   - All comment bodies rendered
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as fsPromises from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';
import { writeCommentCache, readCommentCache } from '../../src/lib/comments-cache.js';
import { renderCommentsSection } from '../../src/lib/wiki-comments-render.js';
import type { RemoteComment } from '../../src/lib/mcp-client.js';

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeTmpDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'cg-cache-wiki-int-test-'));
}

function cleanup(dir: string): void {
  fs.rmSync(dir, { recursive: true, force: true });
}

function makeWikiPage(tmpDir: string, primaryId: string, bucket: string, content: string): string {
  const dir = path.join(tmpDir, '.cleargate', 'wiki', bucket);
  fs.mkdirSync(dir, { recursive: true });
  const filePath = path.join(dir, `${primaryId}.md`);
  fs.writeFileSync(filePath, content, 'utf8');
  return filePath;
}

// ── Integration test ──────────────────────────────────────────────────────────

describe('Integration: cache → wiki overlay', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = makeTmpDir();
  });

  afterEach(() => {
    cleanup(tmpDir);
  });

  it('seeds cache with 3 comments, renders wiki section with banner and all comment blocks', async () => {
    const remoteId = 'LIN-42';
    const primaryId = 'STORY-042-01';

    const comments: RemoteComment[] = [
      {
        id: 'c1',
        author_name: 'Alice',
        author_email: 'alice@example.com',
        body: 'First review comment',
        created_at: '2026-04-15T09:00:00Z',
        remote_id: remoteId,
      },
      {
        id: 'c2',
        author_name: 'Bob',
        author_email: null,
        body: 'A comment without email',
        created_at: '2026-04-16T10:00:00Z',
        remote_id: remoteId,
      },
      {
        id: 'c3',
        author_name: 'Charlie',
        author_email: 'charlie@example.com',
        body: 'Multi-line\nbody comment\nhere',
        created_at: '2026-04-17T11:00:00Z',
        remote_id: remoteId,
      },
    ];

    // Seed the cache
    await writeCommentCache(tmpDir, remoteId, comments);

    // Verify the cache round-trip
    const cached = await readCommentCache(tmpDir, remoteId);
    expect(cached).not.toBeNull();
    expect(cached).toHaveLength(3);

    // Pre-existing wiki page
    const wikiPath = makeWikiPage(
      tmpDir,
      primaryId,
      'stories',
      '# STORY-042-01\n\nInitial page content.\n',
    );

    const localItems = [
      {
        fm: {
          story_id: primaryId,
          remote_id: remoteId,
        },
      },
    ];

    // Run wiki overlay
    await renderCommentsSection({
      projectRoot: tmpDir,
      remoteId,
      comments,
      localItems,
    });

    const result = await fsPromises.readFile(wikiPath, 'utf8');

    // Delimiters present
    expect(result).toContain('<!-- cleargate:comments:start -->');
    expect(result).toContain('<!-- cleargate:comments:end -->');

    // Header and banner
    expect(result).toContain('## Remote comments');
    expect(result).toContain('_Read-only snapshot. Comments live in the PM tool — reply there, not here._');

    // Exactly 3 comment blocks (3 ### headings after the section start)
    const commentHeaders = result.match(/^### /gm);
    expect(commentHeaders).not.toBeNull();
    expect(commentHeaders?.length).toBe(3);

    // Comment bodies
    expect(result).toContain('> First review comment');
    expect(result).toContain('> A comment without email');
    // Multi-line body: each line prefixed with "> "
    expect(result).toContain('> Multi-line');
    expect(result).toContain('> body comment');
    expect(result).toContain('> here');

    // Author without email: no parens around null
    expect(result).toContain('### Bob · 2026-04-16T10:00:00Z');
    expect(result).not.toContain('(null)');

    // Original content preserved
    expect(result).toContain('Initial page content.');

    // Comments sorted by created_at ascending (Alice first)
    const aliceIdx = result.indexOf('### Alice');
    const charlieIdx = result.indexOf('### Charlie');
    expect(aliceIdx).toBeLessThan(charlieIdx);
  });

  it('cache returns null for absent file', async () => {
    const result = await readCommentCache(tmpDir, 'LIN-NONEXISTENT');
    expect(result).toBeNull();
  });
});
