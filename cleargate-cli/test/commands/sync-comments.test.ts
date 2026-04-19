/**
 * sync-comments.test.ts — STORY-010-06
 *
 * Tests for comment-pull behaviour inside cleargate sync.
 *
 * Scenario: 429 on one item does not halt sync; sync-log has skipped-rate-limit entry.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as fsPromises from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';
import { syncHandler } from '../../src/commands/sync.js';
import type { McpClient, RemoteItem, RemoteUpdateRef, AdapterInfo } from '../../src/lib/mcp-client.js';
import { serializeFrontmatter } from '../../src/lib/frontmatter-yaml.js';
import { readSyncLog } from '../../src/lib/sync-log.js';

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeTmpDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'cg-sync-comments-test-'));
}

function cleanup(dir: string): void {
  fs.rmSync(dir, { recursive: true, force: true });
}

function makeLocalFile(
  tmpDir: string,
  filename: string,
  fm: Record<string, unknown>,
  body = 'Local body',
): string {
  const pendingSync = path.join(tmpDir, '.cleargate', 'delivery', 'pending-sync');
  fs.mkdirSync(pendingSync, { recursive: true });
  const filePath = path.join(pendingSync, filename);
  const content = serializeFrontmatter(fm) + '\n\n' + body;
  fs.writeFileSync(filePath, content, 'utf8');
  return filePath;
}

function makeRemoteItem(overrides: Partial<RemoteItem> = {}): RemoteItem {
  return {
    remote_id: 'LIN-1042',
    title: 'Test Story',
    body: 'Remote body content',
    status: 'in-progress',
    assignees: [],
    labels: [],
    updated_at: '2026-04-19T15:00:00Z',
    source_tool: 'linear',
    raw: {},
    ...overrides,
  };
}

/** Set up a sprint run directory so resolveActiveSprintDir picks it up */
function setupSprintRun(tmpDir: string, sprintId: string): string {
  const sprintRunDir = path.join(tmpDir, '.cleargate', 'sprint-runs', sprintId);
  fs.mkdirSync(sprintRunDir, { recursive: true });
  return sprintRunDir;
}

/** Create a sprint file referencing the given item IDs */
function setupSprintFile(tmpDir: string, sprintId: string, storyRefs: string[]): void {
  const pendingSync = path.join(tmpDir, '.cleargate', 'delivery', 'pending-sync');
  fs.mkdirSync(pendingSync, { recursive: true });
  const content = [
    '---',
    `sprint_id: "${sprintId}"`,
    'epics: []',
    '---',
    '',
    `# ${sprintId}`,
    '',
    ...storyRefs.map((id) => `- ${id}`),
    '',
  ].join('\n');
  fs.writeFileSync(path.join(pendingSync, `${sprintId}_Sprint.md`), content, 'utf8');
}

/** Setup identity file */
function setupIdentity(tmpDir: string, email = 'dev@example.com'): void {
  const identityPath = path.join(tmpDir, '.cleargate', '.participant.json');
  fs.mkdirSync(path.dirname(identityPath), { recursive: true });
  fs.writeFileSync(identityPath, JSON.stringify({ email, name: 'Dev', role: 'developer' }), 'utf8');
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('Scenario: Rate-limit skip is silent (R4 per-item 429)', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = makeTmpDir();
  });

  afterEach(() => {
    cleanup(tmpDir);
  });

  it('429 on one item does not halt sync; sync-log has skipped-rate-limit; other items still processed', async () => {
    setupIdentity(tmpDir);
    const sprintRunDir = setupSprintRun(tmpDir, 'SPRINT-07');
    setupSprintFile(tmpDir, 'SPRINT-07', ['STORY-042-01', 'STORY-042-02']);

    // Two local items in the sprint
    makeLocalFile(tmpDir, 'STORY-042-01.md', {
      story_id: 'STORY-042-01',
      remote_id: 'LIN-4201',
      status: 'in-progress',
    });
    makeLocalFile(tmpDir, 'STORY-042-02.md', {
      story_id: 'STORY-042-02',
      remote_id: 'LIN-4202',
      status: 'in-progress',
    });

    const commentCallsSucceeded: string[] = [];
    let syncCompleted = false;

    const mcp: McpClient = {
      async call<T>(tool: string, args: Record<string, unknown>): Promise<T> {
        if (tool === 'cleargate_list_remote_updates') {
          return [] as unknown as T;
        }
        if (tool === 'cleargate_pull_item') {
          return null as unknown as T;
        }
        if (tool === 'cleargate_pull_comments') {
          const remoteId = args['remote_id'] as string;
          // LIN-4201 → 429 error; LIN-4202 → success
          if (remoteId === 'LIN-4201') {
            throw new Error('MCP HTTP 429 calling cleargate_pull_comments: rate limit exceeded');
          }
          commentCallsSucceeded.push(remoteId);
          return [] as unknown as T;
        }
        if (tool === 'cleargate_list_intake') {
          return [] as unknown as T;
        }
        return null as unknown as T;
      },
      async adapterInfo(): Promise<AdapterInfo> {
        return { configured: true, name: 'linear' };
      },
    };

    const stdoutLines: string[] = [];
    const stderrLines: string[] = [];

    await syncHandler({
      projectRoot: tmpDir,
      mcp,
      dryRun: false,
      stdout: (s) => stdoutLines.push(s),
      stderr: (s) => stderrLines.push(s),
      exit: (_c) => { throw new Error('exit called'); },
      now: () => '2026-04-19T12:00:00Z',
    });

    syncCompleted = true;

    // Sync must complete
    expect(syncCompleted).toBe(true);

    // LIN-4202 got its comments pulled (429 on LIN-4201 didn't halt)
    expect(commentCallsSucceeded).toContain('LIN-4202');

    // Sync-log has a skipped-rate-limit entry for LIN-4201
    const logEntries = await readSyncLog(sprintRunDir);
    const rateLimitEntry = logEntries.find(
      (e) => e.op === 'pull-comments' && e.result === 'skipped-rate-limit',
    );
    expect(rateLimitEntry).toBeDefined();
    expect(rateLimitEntry?.remote_id).toBe('LIN-4201');

    // Stdout shows sync completed (pulled 0, pushed 0)
    const combinedOutput = stdoutLines.join('');
    expect(combinedOutput).toContain('sync:');
  });
});
