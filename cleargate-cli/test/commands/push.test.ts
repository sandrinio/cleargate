/**
 * push.test.ts — STORY-010-07
 *
 * Tests for `cleargate push` (push gate + attribution + soft revert).
 *
 * All scenarios from §2.1 Gherkin covered:
 *   1. CLI pre-push refuse on approved: false (no MCP call made)
 *   2. Attribution write-back after successful push
 *   3. Revert happy path (calls sync_status with correct shape, op='push-revert')
 *   4. Revert refuses when local status="done" without --force (exit 1)
 *   5. Revert with --force proceeds on done items
 *   6. Tokens never in sync-log (grep 'eyJ' → 0 matches)
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'node:fs';
import * as fsPromises from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';
import { pushHandler } from '../../src/commands/push.js';
import type { McpClient, AdapterInfo } from '../../src/lib/mcp-client.js';
import { serializeFrontmatter } from '../../src/lib/frontmatter-yaml.js';
import { readSyncLog } from '../../src/lib/sync-log.js';
import { parseFrontmatter } from '../../src/wiki/parse-frontmatter.js';

// ── Test infrastructure ───────────────────────────────────────────────────────

function makeTmpDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'cg-push-test-'));
}

function cleanup(dir: string): void {
  fs.rmSync(dir, { recursive: true, force: true });
}

function makeLocalFile(
  tmpDir: string,
  filename: string,
  fm: Record<string, unknown>,
  body = 'Story body content',
): string {
  const pendingSync = path.join(tmpDir, '.cleargate', 'delivery', 'pending-sync');
  fs.mkdirSync(pendingSync, { recursive: true });
  const filePath = path.join(pendingSync, filename);
  const content = serializeFrontmatter(fm) + '\n\n' + body;
  fs.writeFileSync(filePath, content, 'utf8');
  return filePath;
}

function makeMockMcp(overrides: Partial<McpClient> = {}): McpClient & { calls: Array<{ tool: string; args: Record<string, unknown> }> } {
  const calls: Array<{ tool: string; args: Record<string, unknown> }> = [];
  return {
    calls,
    call: vi.fn(async <T>(tool: string, args: Record<string, unknown>): Promise<T> => {
      calls.push({ tool, args });
      if (tool === 'push_item') {
        return {
          version: 1,
          updated_at: '2026-04-19T03:00:00Z',
          pushed_by: 'test@example.com',
          pushed_at: '2026-04-19T03:00:01Z',
        } as unknown as T;
      }
      if (tool === 'sync_status') {
        return {} as unknown as T;
      }
      throw new Error(`unexpected tool: ${tool}`);
    }),
    adapterInfo: vi.fn(async (): Promise<AdapterInfo> => ({
      configured: true,
      name: 'linear',
    })),
    ...overrides,
  };
}

function makeTestSeams(tmpDir: string, mcp: McpClient) {
  const stderrLines: string[] = [];
  const stdoutLines: string[] = [];
  let exitCode: number | null = null;

  return {
    stderrLines,
    stdoutLines,
    exitCode: () => exitCode,
    opts: {
      projectRoot: tmpDir,
      mcp,
      stdout: (s: string) => { stdoutLines.push(s); },
      stderr: (s: string) => { stderrLines.push(s); },
      exit: ((c: number): never => {
        exitCode = c;
        throw Object.assign(new Error(`exit(${c})`), { __exit: true });
      }) as (c: number) => never,
      now: () => '2026-04-19T03:00:00.000Z',
    },
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('cleargate push — push gate + attribution + revert', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = makeTmpDir();
    // Create sprint-runs dir for sync-log
    fs.mkdirSync(path.join(tmpDir, '.cleargate', 'sprint-runs', '_off-sprint'), { recursive: true });
    // Create participant.json so identity resolves without git
    const participantDir = path.join(tmpDir, '.cleargate');
    fs.mkdirSync(participantDir, { recursive: true });
    fs.writeFileSync(
      path.join(participantDir, '.participant.json'),
      JSON.stringify({ email: 'tester@example.com', set_at: '2026-01-01T00:00:00Z', source: 'prompted' }),
      'utf8',
    );
  });

  afterEach(() => {
    cleanup(tmpDir);
  });

  // ── Scenario 1: CLI pre-push refuse on approved: false ─────────────────────

  it('Scenario: CLI refuses unapproved push — no MCP call made', async () => {
    const filePath = makeLocalFile(tmpDir, 'STORY-042-01.md', {
      story_id: 'STORY-042-01',
      status: 'Draft',
      approved: false,  // NOT approved
    });

    const mcp = makeMockMcp();
    const seams = makeTestSeams(tmpDir, mcp);

    // Should exit 1
    await expect(pushHandler(filePath, seams.opts)).rejects.toThrow('exit(1)');

    // Verify no MCP call was made (approved gate fires client-side)
    expect(mcp.call).not.toHaveBeenCalled();
    expect(seams.exitCode()).toBe(1);
    expect(seams.stderrLines.join('')).toContain('approved: false');
  });

  it('Scenario: CLI refuses when approved field is missing (undefined)', async () => {
    const filePath = makeLocalFile(tmpDir, 'STORY-042-01.md', {
      story_id: 'STORY-042-01',
      status: 'Draft',
      // no approved field
    });

    const mcp = makeMockMcp();
    const seams = makeTestSeams(tmpDir, mcp);

    await expect(pushHandler(filePath, seams.opts)).rejects.toThrow('exit(1)');
    expect(mcp.call).not.toHaveBeenCalled();
  });

  // ── Scenario 2: Attribution write-back after successful push ───────────────

  it('Scenario: CLI writes attribution back to local frontmatter on success', async () => {
    const filePath = makeLocalFile(tmpDir, 'STORY-042-01.md', {
      story_id: 'STORY-042-01',
      status: 'Draft',
      approved: true,
    });

    const mcp = makeMockMcp();
    const seams = makeTestSeams(tmpDir, mcp);

    await pushHandler(filePath, seams.opts);

    // Verify MCP was called
    expect(mcp.call).toHaveBeenCalledWith('push_item', expect.objectContaining({
      cleargate_id: 'STORY-042-01',
      type: 'story',
    }));

    // Verify local frontmatter was updated with attribution
    const rawUpdated = fs.readFileSync(filePath, 'utf8');
    const { fm: updatedFm } = parseFrontmatter(rawUpdated);
    expect(updatedFm['pushed_by']).toBe('test@example.com');
    expect(updatedFm['pushed_at']).toBe('2026-04-19T03:00:01Z');

    // Verify sync-log entry
    const sprintRoot = path.join(tmpDir, '.cleargate', 'sprint-runs', '_off-sprint');
    const entries = await readSyncLog(sprintRoot);
    expect(entries).toHaveLength(1);
    expect(entries[0]!.op).toBe('push');
    expect(entries[0]!.result).toBe('ok');
    expect(entries[0]!.target).toBe('STORY-042-01');

    // Verify no token in sync-log (security: grep for eyJ pattern)
    const syncLogPath = path.join(sprintRoot, 'sync-log.jsonl');
    const logContent = fs.readFileSync(syncLogPath, 'utf8');
    expect(logContent).not.toMatch(/eyJ[A-Za-z0-9._-]+/);
  });

  // ── Scenario 3: Revert happy path ──────────────────────────────────────────

  it('Scenario: Soft revert calls sync_status with correct shape and logs op=push-revert', async () => {
    makeLocalFile(tmpDir, 'STORY-042-01.md', {
      story_id: 'STORY-042-01',
      status: 'in-progress',
      remote_id: 'LIN-1042',
      approved: true,
    });

    const mcp = makeMockMcp();
    const seams = makeTestSeams(tmpDir, mcp);

    await pushHandler('ignored-file.md', { ...seams.opts, revert: 'STORY-042-01' });

    // Verify sync_status was called with correct args
    expect(mcp.call).toHaveBeenCalledWith('sync_status', {
      cleargate_id: 'STORY-042-01',
      new_status: 'archived-without-shipping',
    });

    // Verify sync-log entry
    const sprintRoot = path.join(tmpDir, '.cleargate', 'sprint-runs', '_off-sprint');
    const entries = await readSyncLog(sprintRoot);
    expect(entries).toHaveLength(1);
    expect(entries[0]!.op).toBe('push-revert');
    expect(entries[0]!.result).toBe('ok');
    expect(entries[0]!.target).toBe('STORY-042-01');
    expect(entries[0]!.remote_id).toBe('LIN-1042');

    // Verify local remote_id is preserved (not cleared)
    const rawAfter = fs.readFileSync(
      path.join(tmpDir, '.cleargate', 'delivery', 'pending-sync', 'STORY-042-01.md'),
      'utf8',
    );
    const { fm: fmAfter } = parseFrontmatter(rawAfter);
    expect(fmAfter['remote_id']).toBe('LIN-1042');
  });

  // ── Scenario 4: Revert refuses done without --force ────────────────────────

  it('Scenario: Revert refuses when local status is done and --force not passed', async () => {
    makeLocalFile(tmpDir, 'STORY-042-01.md', {
      story_id: 'STORY-042-01',
      status: 'done',
      remote_id: 'LIN-1042',
      approved: true,
    });

    const mcp = makeMockMcp();
    const seams = makeTestSeams(tmpDir, mcp);

    await expect(
      pushHandler('ignored.md', { ...seams.opts, revert: 'STORY-042-01' }),
    ).rejects.toThrow('exit(1)');

    expect(seams.exitCode()).toBe(1);
    expect(seams.stderrLines.join('')).toContain('refusing to revert shipped item');
    expect(mcp.call).not.toHaveBeenCalled();
  });

  // ── Scenario 5: Revert with --force proceeds on done items ─────────────────

  it('Scenario: Revert with --force proceeds on done items', async () => {
    makeLocalFile(tmpDir, 'STORY-042-01.md', {
      story_id: 'STORY-042-01',
      status: 'done',
      remote_id: 'LIN-1042',
      approved: true,
    });

    const mcp = makeMockMcp();
    const seams = makeTestSeams(tmpDir, mcp);

    // Should NOT throw — --force bypasses done guard
    await pushHandler('ignored.md', { ...seams.opts, revert: 'STORY-042-01', force: true });

    expect(mcp.call).toHaveBeenCalledWith('sync_status', {
      cleargate_id: 'STORY-042-01',
      new_status: 'archived-without-shipping',
    });

    // Sync-log should have push-revert entry
    const sprintRoot = path.join(tmpDir, '.cleargate', 'sprint-runs', '_off-sprint');
    const entries = await readSyncLog(sprintRoot);
    expect(entries).toHaveLength(1);
    expect(entries[0]!.op).toBe('push-revert');
  });

  // ── Scenario 6: Tokens never appear in sync-log ────────────────────────────

  it('Scenario: Tokens never appear in sync-log (security grep assertion)', async () => {
    // Simulate a push where detail might accidentally include a JWT
    const filePath = makeLocalFile(tmpDir, 'STORY-042-01.md', {
      story_id: 'STORY-042-01',
      status: 'Draft',
      approved: true,
    });

    // Inject a mock MCP that succeeds (normal push)
    const mcp = makeMockMcp();
    const seams = makeTestSeams(tmpDir, mcp);

    await pushHandler(filePath, seams.opts);

    // Read the sync-log file and grep for JWT pattern
    const sprintRoot = path.join(tmpDir, '.cleargate', 'sprint-runs', '_off-sprint');
    const syncLogPath = path.join(sprintRoot, 'sync-log.jsonl');
    const logContent = fs.readFileSync(syncLogPath, 'utf8');

    // eyJ is the base64url prefix of any JWT — must be absent
    expect(logContent).not.toMatch(/eyJ[A-Za-z0-9._-]+/);

    // Also verify no raw token placeholder leaks
    expect(logContent).not.toContain('CLEARGATE_MCP_TOKEN');
    expect(logContent).not.toContain('Bearer');
  });
});
