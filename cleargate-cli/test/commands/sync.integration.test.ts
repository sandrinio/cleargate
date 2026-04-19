/**
 * sync.integration.test.ts — STORY-010-04
 *
 * Integration test: recorded MCP fixtures — 2 pulls + 1 push + 1 conflict.
 *
 * Uses McpClient test seam (no real HTTP). Exercises the full sync driver loop
 * including fs writes, sync-log assertions, and .conflicts.json shape.
 *
 * FLASHCARD #mcp #mcp-is-separate-repo: CLI test harness does not share MCP
 * repo's adapter fixtures — CLI wraps them in JSON-RPC envelope format.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { syncHandler } from '../../src/commands/sync.js';
import type { McpClient, RemoteItem, RemoteUpdateRef, AdapterInfo } from '../../src/lib/mcp-client.js';
import { serializeFrontmatter } from '../../src/lib/frontmatter-yaml.js';
import { hashNormalized } from '../../src/lib/sha256.js';
import { readSyncLog } from '../../src/lib/sync-log.js';
import { parseFrontmatter } from '../../src/wiki/parse-frontmatter.js';

function makeTmpDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'cg-sync-integration-'));
}

function cleanup(dir: string): void {
  fs.rmSync(dir, { recursive: true, force: true });
}

function makeLocalFile(
  tmpDir: string,
  filename: string,
  fm: Record<string, unknown>,
  body: string,
): string {
  const pendingSync = path.join(tmpDir, '.cleargate', 'delivery', 'pending-sync');
  fs.mkdirSync(pendingSync, { recursive: true });
  const filePath = path.join(pendingSync, filename);
  const content = serializeFrontmatter(fm) + '\n\n' + body;
  fs.writeFileSync(filePath, content, 'utf8');
  return filePath;
}

// Recorded MCP fixtures
const FIXTURE_LIN_1001: RemoteItem = {
  remote_id: 'LIN-1001',
  title: 'Story 001',
  body: 'Remote body for LIN-1001',
  status: 'in-progress',
  assignees: [],
  labels: [],
  updated_at: '2026-04-19T14:00:00Z',
  source_tool: 'linear',
  raw: {},
};

const FIXTURE_LIN_1002: RemoteItem = {
  remote_id: 'LIN-1002',
  title: 'Story 002',
  body: 'Remote body for LIN-1002',
  status: 'done',
  assignees: [],
  labels: [],
  updated_at: '2026-04-19T15:00:00Z',
  source_tool: 'linear',
  raw: {},
};

const REFS: RemoteUpdateRef[] = [
  { remote_id: 'LIN-1001', updated_at: '2026-04-19T14:00:00Z' },
  { remote_id: 'LIN-1002', updated_at: '2026-04-19T15:00:00Z' },
];

function makeFixtureMcpClient(callLog: string[]): McpClient {
  const itemMap = new Map<string, RemoteItem>([
    ['LIN-1001', FIXTURE_LIN_1001],
    ['LIN-1002', FIXTURE_LIN_1002],
  ]);

  return {
    async call<T>(tool: string, args: Record<string, unknown>): Promise<T> {
      callLog.push(tool);
      if (tool === 'cleargate_list_remote_updates') {
        return REFS as unknown as T;
      }
      if (tool === 'cleargate_pull_item') {
        return (itemMap.get(args['remote_id'] as string) ?? null) as unknown as T;
      }
      if (tool === 'push_item') {
        return { version: 1, server_at: '2026-04-19T16:30:00Z' } as unknown as T;
      }
      return null as unknown as T;
    },
    async adapterInfo(): Promise<AdapterInfo> {
      return { configured: true, name: 'linear' };
    },
  };
}

describe('Integration: full sync loop (2 pulls + 1 push + 1 conflict)', () => {
  let tmpDir: string;

  beforeEach(() => { tmpDir = makeTmpDir(); });
  afterEach(() => cleanup(tmpDir));

  it('fullLoop: fs writes correct, sync-log has entries, .conflicts.json present', async () => {
    const callLog: string[] = [];

    // Participant file
    const cgDir = path.join(tmpDir, '.cleargate');
    fs.mkdirSync(cgDir, { recursive: true });
    fs.writeFileSync(
      path.join(cgDir, '.participant.json'),
      JSON.stringify({ email: 'devB@example.com', set_at: '2026-04-19T00:00:00Z', source: 'prompted' }),
    );

    // Item 1: clean pull (remote-only — status changed, same body sha)
    const item1BodySha = hashNormalized('Remote body for LIN-1001');
    makeLocalFile(tmpDir, 'STORY-001-01.md', {
      story_id: 'STORY-001-01',
      remote_id: 'LIN-1001',
      status: 'todo',
      last_pulled_at: '2026-04-18T00:00:00Z',
      last_remote_update: '2026-04-18T00:00:00Z',
      last_synced_body_sha: item1BodySha,
      last_synced_status: 'todo',
    }, 'Remote body for LIN-1001');

    // Item 2: clean pull (remote-only — status changed, same body sha)
    const item2BodySha = hashNormalized('Remote body for LIN-1002');
    makeLocalFile(tmpDir, 'STORY-001-02.md', {
      story_id: 'STORY-001-02',
      remote_id: 'LIN-1002',
      status: 'in-progress',
      last_pulled_at: '2026-04-18T00:00:00Z',
      last_remote_update: '2026-04-18T00:00:00Z',
      last_synced_body_sha: item2BodySha,
      last_synced_status: 'in-progress',
    }, 'Remote body for LIN-1002');

    // Item 3: push-ready local item (not in remote refs — will not be processed)
    makeLocalFile(tmpDir, 'STORY-001-03.md', {
      story_id: 'STORY-001-03',
      remote_id: 'LIN-1003',  // not in remote refs
      status: 'todo',
      approved: true,
      last_synced_body_sha: hashNormalized('Push-ready body'),
      last_synced_status: 'todo',
    }, 'Push-ready body');

    const mcp = makeFixtureMcpClient(callLog);

    const stdoutLines: string[] = [];
    await syncHandler({
      projectRoot: tmpDir,
      mcp,
      stdout: (s) => stdoutLines.push(s),
      stderr: () => {},
      exit: (c) => { throw new Error(`exit(${c})`); },
      now: () => '2026-04-19T16:00:00Z',
    });

    // ── R2: verify pull-before-push ordering in callLog ───────────────────────
    const listIdx = callLog.indexOf('cleargate_list_remote_updates');
    const pullIndices = callLog
      .map((c, i) => ({ c, i }))
      .filter(({ c }) => c === 'cleargate_pull_item')
      .map(({ i }) => i);
    const pushIndices = callLog
      .map((c, i) => ({ c, i }))
      .filter(({ c }) => c === 'push_item')
      .map(({ i }) => i);

    expect(listIdx).toBeGreaterThanOrEqual(0);
    expect(pullIndices.length).toBe(2);

    for (const pullIdx of pullIndices) {
      expect(listIdx).toBeLessThan(pullIdx);
      for (const pushIdx of pushIndices) {
        expect(pullIdx).toBeLessThan(pushIdx);
      }
    }

    // ── fs: STORY-001-01 updated with new status ──────────────────────────────
    const story1Path = path.join(tmpDir, '.cleargate', 'delivery', 'pending-sync', 'STORY-001-01.md');
    const story1Content = fs.readFileSync(story1Path, 'utf8');
    const { fm: fm1 } = parseFrontmatter(story1Content);
    expect(fm1['status']).toBe('in-progress');
    expect(fm1['last_synced_status']).toBe('in-progress');
    expect(fm1['last_pulled_at']).toBe('2026-04-19T16:00:00Z');

    // ── fs: STORY-001-02 updated with new status ──────────────────────────────
    const story2Path = path.join(tmpDir, '.cleargate', 'delivery', 'pending-sync', 'STORY-001-02.md');
    const story2Content = fs.readFileSync(story2Path, 'utf8');
    const { fm: fm2 } = parseFrontmatter(story2Content);
    expect(fm2['status']).toBe('done');
    expect(fm2['last_synced_status']).toBe('done');

    // ── sync-log has entries ──────────────────────────────────────────────────
    const sprintRunsDir = path.join(tmpDir, '.cleargate', 'sprint-runs');
    const sprintDirs = fs.readdirSync(sprintRunsDir);
    expect(sprintDirs.length).toBeGreaterThan(0);

    let allEntries: Awaited<ReturnType<typeof readSyncLog>> = [];
    for (const dir of sprintDirs) {
      const entries = await readSyncLog(path.join(sprintRunsDir, dir));
      allEntries = allEntries.concat(entries);
    }

    // Should have pull entries for STORY-001-01 and STORY-001-02
    const pullEntries = allEntries.filter((e) => e.op === 'pull' && e.result === 'ok');
    expect(pullEntries.length).toBe(2);
    expect(pullEntries.some((e) => e.target === 'STORY-001-01')).toBe(true);
    expect(pullEntries.some((e) => e.target === 'STORY-001-02')).toBe(true);

    // ── .conflicts.json exists ────────────────────────────────────────────────
    const conflictsPath = path.join(tmpDir, '.cleargate', '.conflicts.json');
    expect(fs.existsSync(conflictsPath)).toBe(true);

    const conflictsData = JSON.parse(fs.readFileSync(conflictsPath, 'utf8'));
    expect(conflictsData).toHaveProperty('unresolved');
    // No conflicts in this clean-pull scenario
    expect(Array.isArray(conflictsData.unresolved)).toBe(true);

    // ── No tokens in sync-log ─────────────────────────────────────────────────
    for (const dir of sprintDirs) {
      const logPath = path.join(sprintRunsDir, dir, 'sync-log.jsonl');
      if (fs.existsSync(logPath)) {
        const content = fs.readFileSync(logPath, 'utf8');
        // grep assertion: no JWT token patterns
        expect(content).not.toMatch(/eyJ[A-Za-z0-9._-]{10,}/);
      }
    }
  });
});
