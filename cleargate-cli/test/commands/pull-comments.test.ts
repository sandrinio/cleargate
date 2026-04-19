/**
 * pull-comments.test.ts — STORY-010-06
 *
 * Tests for `cleargate pull <ID> --comments` behaviour.
 *
 * Scenario: --comments overrides active criteria (always pulls for that item).
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as fsPromises from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';
import { pullHandler } from '../../src/commands/pull.js';
import type { McpClient, RemoteItem, RemoteComment } from '../../src/lib/mcp-client.js';
import { serializeFrontmatter } from '../../src/lib/frontmatter-yaml.js';

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeTmpDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'cg-pull-comments-test-'));
}

function cleanup(dir: string): void {
  fs.rmSync(dir, { recursive: true, force: true });
}

function makeLocalFile(
  tmpDir: string,
  filename: string,
  fm: Record<string, unknown>,
  body = 'Story content',
): string {
  const pendingSync = path.join(tmpDir, '.cleargate', 'delivery', 'pending-sync');
  fs.mkdirSync(pendingSync, { recursive: true });
  const filePath = path.join(pendingSync, filename);
  const content = serializeFrontmatter(fm) + '\n\n' + body;
  fs.writeFileSync(filePath, content, 'utf8');
  return filePath;
}

function makeWikiPage(tmpDir: string, primaryId: string, bucket: string, content: string): string {
  const wikiDir = path.join(tmpDir, '.cleargate', 'wiki', bucket);
  fs.mkdirSync(wikiDir, { recursive: true });
  const filePath = path.join(wikiDir, `${primaryId}.md`);
  fs.writeFileSync(filePath, content, 'utf8');
  return filePath;
}

function setupIdentity(tmpDir: string, email = 'dev@example.com'): void {
  const identityPath = path.join(tmpDir, '.cleargate', '.participant.json');
  fs.mkdirSync(path.dirname(identityPath), { recursive: true });
  fs.writeFileSync(identityPath, JSON.stringify({ email, name: 'Dev', role: 'developer' }), 'utf8');
}

function setupSprintRun(tmpDir: string, sprintId: string): void {
  const sprintRunDir = path.join(tmpDir, '.cleargate', 'sprint-runs', sprintId);
  fs.mkdirSync(sprintRunDir, { recursive: true });
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('Scenario: --comments overrides active criteria', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = makeTmpDir();
  });

  afterEach(() => {
    cleanup(tmpDir);
  });

  it('pull <ID> --comments pulls comments and renders wiki section regardless of active criteria', async () => {
    setupIdentity(tmpDir);
    setupSprintRun(tmpDir, 'SPRINT-07');

    const remoteId = 'LIN-3304';
    const primaryId = 'STORY-033-04';

    // Stale item: last_remote_update 90 days ago, not in sprint
    const ninetyDaysAgo = new Date(Date.parse('2026-04-19T12:00:00Z') - 90 * 24 * 60 * 60 * 1000);

    makeLocalFile(tmpDir, 'STORY-033-04.md', {
      story_id: primaryId,
      remote_id: remoteId,
      status: 'in-progress',
      last_pulled_at: '2026-01-01T00:00:00Z',
      last_remote_update: ninetyDaysAgo.toISOString(),
      last_synced_body_sha: 'abc123',
      last_synced_status: 'in-progress',
    });

    // Create wiki page for the item
    const wikiPage = makeWikiPage(tmpDir, primaryId, 'stories', `# ${primaryId}\n\nPage content.\n`);

    const mockComments: RemoteComment[] = [
      {
        id: 'c1',
        author_name: 'Stakeholder',
        author_email: 'stakeholder@example.com',
        body: 'This looks good!',
        created_at: '2026-04-19T10:00:00Z',
        remote_id: remoteId,
      },
    ];

    let commentPullCalled = false;
    let commentPullCalledForId: string | null = null;

    const remoteItem: RemoteItem = {
      remote_id: remoteId,
      title: primaryId,
      body: 'Story content',
      status: 'in-progress',
      assignees: [],
      labels: [],
      updated_at: '2026-01-15T00:00:00Z',
      source_tool: 'linear',
      raw: {},
    };

    const mcp: McpClient = {
      async call<T>(tool: string, args: Record<string, unknown>): Promise<T> {
        if (tool === 'cleargate_pull_item') {
          return remoteItem as unknown as T;
        }
        if (tool === 'cleargate_pull_comments') {
          commentPullCalled = true;
          commentPullCalledForId = args['remote_id'] as string;
          return mockComments as unknown as T;
        }
        return null as unknown as T;
      },
      async adapterInfo() {
        return { configured: true, name: 'linear' as const };
      },
    };

    const stdoutLines: string[] = [];

    // Use the remote ID directly (STORY-033-04 would match [A-Z]+-\d+ and be misidentified)
    await pullHandler(remoteId, {
      projectRoot: tmpDir,
      mcp,
      comments: true,
      stdout: (s) => stdoutLines.push(s),
      stderr: () => {},
      exit: () => { throw new Error('exit called'); },
      now: () => '2026-04-19T12:00:00Z',
    });

    // Comment pull was invoked
    expect(commentPullCalled).toBe(true);
    expect(commentPullCalledForId).toBe(remoteId);

    // Wiki page now has the comments section
    const wikiContent = await fsPromises.readFile(wikiPage, 'utf8');
    expect(wikiContent).toContain('<!-- cleargate:comments:start -->');
    expect(wikiContent).toContain('<!-- cleargate:comments:end -->');
    expect(wikiContent).toContain('## Remote comments');
    expect(wikiContent).toContain('_Read-only snapshot. Comments live in the PM tool — reply there, not here._');
    expect(wikiContent).toContain('> This looks good!');

    // Comment cache written
    const cacheFile = path.join(tmpDir, '.cleargate', '.comments-cache', `${remoteId}.json`);
    const cacheContent = await fsPromises.readFile(cacheFile, 'utf8');
    const cachedComments = JSON.parse(cacheContent) as RemoteComment[];
    expect(cachedComments).toHaveLength(1);
    expect(cachedComments[0].body).toBe('This looks good!');

    // Stdout reported comments
    const combinedOutput = stdoutLines.join('');
    expect(combinedOutput).toContain('comments fetched (1)');
  });
});
