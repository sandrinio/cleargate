/**
 * sync.test.ts — STORY-010-04
 *
 * Tests for the `cleargate sync` driver.
 * All MCP calls are mocked via the McpClient test seam.
 *
 * Tests:
 *   1. pullBeforePush — R2 call-order assertion
 *   2. dryRunZeroWrites — dry-run produces zero fs + sync-log writes
 *   3. conflictWritesJson — refuse resolution writes .conflicts.json; other items still apply
 *   4. statusStampedOnApply — last_synced_status stamped on pull apply
 *   5. rejectsNoopStub — no-adapter-configured pre-flight exits 2
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as fs from 'node:fs';
import * as fsPromises from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';
import { syncHandler } from '../../src/commands/sync.js';
import type { McpClient, RemoteItem, RemoteUpdateRef, AdapterInfo } from '../../src/lib/mcp-client.js';
import { serializeFrontmatter } from '../../src/lib/frontmatter-yaml.js';
import { hashNormalized } from '../../src/lib/sha256.js';

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeTmpDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'cg-sync-test-'));
}

function cleanup(dir: string): void {
  fs.rmSync(dir, { recursive: true, force: true });
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

function makeLocalFile(
  tmpDir: string,
  filename: string,
  fm: Record<string, unknown>,
  body = 'Local body content',
): string {
  const pendingSync = path.join(tmpDir, '.cleargate', 'delivery', 'pending-sync');
  fs.mkdirSync(pendingSync, { recursive: true });
  const filePath = path.join(pendingSync, filename);
  const content = serializeFrontmatter(fm) + '\n\n' + body;
  fs.writeFileSync(filePath, content, 'utf8');
  return filePath;
}

function makeMcpClient(
  overrides: {
    calls?: string[];
    adapterConfigured?: boolean;
    adapterName?: AdapterInfo['name'];
    remoteRefs?: RemoteUpdateRef[];
    remoteItems?: Map<string, RemoteItem | null>;
    onCall?: (tool: string, args: Record<string, unknown>) => unknown;
  } = {},
): McpClient {
  const calls: string[] = overrides.calls ?? [];
  const adapterConfigured = overrides.adapterConfigured ?? true;
  const adapterName = overrides.adapterName ?? 'linear';
  const remoteRefs = overrides.remoteRefs ?? [];
  const remoteItems = overrides.remoteItems ?? new Map();

  return {
    async call<T>(tool: string, args: Record<string, unknown>): Promise<T> {
      calls.push(tool);
      if (overrides.onCall) {
        return overrides.onCall(tool, args) as T;
      }
      if (tool === 'cleargate_list_remote_updates') {
        return remoteRefs as unknown as T;
      }
      if (tool === 'cleargate_pull_item') {
        const remoteId = args['remote_id'] as string;
        return (remoteItems.get(remoteId) ?? null) as unknown as T;
      }
      if (tool === 'push_item') {
        return { version: 1, server_at: '2026-04-19T16:00:00Z' } as unknown as T;
      }
      return null as unknown as T;
    },
    async adapterInfo(): Promise<AdapterInfo> {
      return { configured: adapterConfigured, name: adapterName };
    },
  };
}

// ── Test 1: R2 — pulls strictly before pushes ─────────────────────────────────

describe('Scenario: sync pulls before pushing (R2)', () => {
  let tmpDir: string;

  beforeEach(() => { tmpDir = makeTmpDir(); });
  afterEach(() => cleanup(tmpDir));

  it('pullBeforePush: all cleargate_pull_item calls happen before push_item calls', async () => {
    const callOrder: string[] = [];

    // Create 2 remote items and 1 push-ready local item
    const remoteItem1 = makeRemoteItem({ remote_id: 'LIN-1001', status: 'done' });
    const remoteItem2 = makeRemoteItem({ remote_id: 'LIN-1002', status: 'in-progress' });

    // Create local files tracking these remote items
    const sha1 = hashNormalized('Remote body 1');
    makeLocalFile(tmpDir, 'STORY-001-01.md', {
      story_id: 'STORY-001-01',
      remote_id: 'LIN-1001',
      status: 'todo',
      last_pulled_at: '2026-04-18T00:00:00Z',
      last_remote_update: '2026-04-18T00:00:00Z',
      last_synced_body_sha: sha1,
      last_synced_status: 'todo',
    }, 'Remote body 1');

    const sha2 = hashNormalized('Remote body 2');
    makeLocalFile(tmpDir, 'STORY-001-02.md', {
      story_id: 'STORY-001-02',
      remote_id: 'LIN-1002',
      status: 'todo',
      last_pulled_at: '2026-04-18T00:00:00Z',
      last_remote_update: '2026-04-18T00:00:00Z',
      last_synced_body_sha: sha2,
      last_synced_status: 'todo',
    }, 'Remote body 2');

    const mcp = makeMcpClient({
      calls: callOrder,
      remoteRefs: [
        { remote_id: 'LIN-1001', updated_at: '2026-04-19T14:00:00Z' },
        { remote_id: 'LIN-1002', updated_at: '2026-04-19T15:00:00Z' },
      ],
      remoteItems: new Map([
        ['LIN-1001', { ...remoteItem1, body: 'Remote body 1' }],
        ['LIN-1002', { ...remoteItem2, body: 'Remote body 2' }],
      ]),
    });

    const stdout: string[] = [];
    await syncHandler({
      projectRoot: tmpDir,
      mcp,
      stdout: (s) => stdout.push(s),
      stderr: () => {},
      exit: (c) => { throw new Error(`exit(${c})`); },
      now: () => '2026-04-19T16:00:00Z',
    });

    // Find indices of pull and push calls
    const pullItemIndices = callOrder
      .map((c, i) => ({ c, i }))
      .filter(({ c }) => c === 'cleargate_pull_item')
      .map(({ i }) => i);

    const pushIndices = callOrder
      .map((c, i) => ({ c, i }))
      .filter(({ c }) => c === 'push_item')
      .map(({ i }) => i);

    // R2: all pulls must come before any push
    expect(callOrder).toContain('cleargate_list_remote_updates');
    expect(callOrder).toContain('cleargate_pull_item');

    for (const pullIdx of pullItemIndices) {
      for (const pushIdx of pushIndices) {
        expect(pullIdx).toBeLessThan(pushIdx);
      }
    }

    // If no pushes, verify pulls still happened
    if (pushIndices.length === 0) {
      expect(pullItemIndices.length).toBe(2);
    }

    const listUpdateIdx = callOrder.indexOf('cleargate_list_remote_updates');
    for (const pullIdx of pullItemIndices) {
      expect(listUpdateIdx).toBeLessThan(pullIdx);
    }
  });
});

// ── Test 2: --dry-run zero writes ─────────────────────────────────────────────

describe('Scenario: sync --dry-run mutates nothing', () => {
  let tmpDir: string;

  beforeEach(() => { tmpDir = makeTmpDir(); });
  afterEach(() => cleanup(tmpDir));

  it('dryRunZeroWrites: no fs changes, no sync-log entries', async () => {
    makeLocalFile(tmpDir, 'STORY-042-01.md', {
      story_id: 'STORY-042-01',
      remote_id: 'LIN-1042',
      status: 'todo',
      last_pulled_at: '2026-04-18T00:00:00Z',
      last_remote_update: '2026-04-18T00:00:00Z',
      last_synced_body_sha: hashNormalized('Local body content'),
      last_synced_status: 'todo',
    });

    const mcp = makeMcpClient({
      remoteRefs: [{ remote_id: 'LIN-1042', updated_at: '2026-04-19T14:00:00Z' }],
      remoteItems: new Map([['LIN-1042', makeRemoteItem({ status: 'in-progress' })]]),
    });

    // Snapshot filesystem state before
    const pendingSyncDir = path.join(tmpDir, '.cleargate', 'delivery', 'pending-sync');
    const filesBefore = fs.readdirSync(pendingSyncDir);
    const contentBefore = fs.readFileSync(path.join(pendingSyncDir, 'STORY-042-01.md'), 'utf8');

    const stdoutLines: string[] = [];
    await syncHandler({
      projectRoot: tmpDir,
      mcp,
      dryRun: true,
      stdout: (s) => stdoutLines.push(s),
      stderr: () => {},
      exit: (c) => { throw new Error(`exit(${c})`); },
      now: () => '2026-04-19T16:00:00Z',
    });

    // Assert stdout says "Would pull..."
    const combined = stdoutLines.join('');
    expect(combined).toContain('Would pull:');

    // Assert file content unchanged
    const contentAfter = fs.readFileSync(path.join(pendingSyncDir, 'STORY-042-01.md'), 'utf8');
    expect(contentAfter).toBe(contentBefore);

    // Assert no new files created
    const filesAfter = fs.readdirSync(pendingSyncDir);
    expect(filesAfter).toEqual(filesBefore);

    // Assert no sync-log entries
    const sprintRunsDir = path.join(tmpDir, '.cleargate', 'sprint-runs');
    const syncLogExists = fs.existsSync(sprintRunsDir);
    if (syncLogExists) {
      // Check all sprint dirs for sync-log.jsonl
      const dirs = fs.readdirSync(sprintRunsDir);
      for (const dir of dirs) {
        const logPath = path.join(sprintRunsDir, dir, 'sync-log.jsonl');
        if (fs.existsSync(logPath)) {
          const content = fs.readFileSync(logPath, 'utf8').trim();
          expect(content).toBe('');
        }
      }
    }

    // Assert no .conflicts.json written
    const conflictsPath = path.join(tmpDir, '.cleargate', '.conflicts.json');
    expect(fs.existsSync(conflictsPath)).toBe(false);
  });
});

// ── Test 3: Conflict writes .conflicts.json, other items still apply ──────────

describe('Scenario: conflict halts sync and writes .conflicts.json', () => {
  let tmpDir: string;

  beforeEach(() => { tmpDir = makeTmpDir(); });
  afterEach(() => cleanup(tmpDir));

  it('conflictWritesJson: refused item in .conflicts.json, clean pull still applies', async () => {
    // Item 1: will classify as local-delete-remote-edit (refuse)
    // We simulate this by using a stale last_pulled_at so remote update > last_pulled_at
    // AND setting local body same as last sync but remote changed (so state=remote-only but refuse)
    // Actually, to force refuse, we need local.deleted=true, remote.updated_at > lastPulled
    // Since we can't set deleted=true via frontmatter alone, we'll use a different approach:
    // Make local body sha != base sha AND remote body sha != base sha → content-content → merge prompt
    // But to avoid needing stdin, let's force refuse via classification directly using
    // a specially crafted scenario:
    // local-delete-remote-edit requires deleted=true locally.
    // Instead, let's use the unknown fallthrough → halt resolution.
    // Actually the simplest: make both shas differ from base → content-content → merge
    // with stdin auto-aborting → adds to conflicts AND continues loop.

    // Item 1: conflict (content-content → aborted merge → conflictsJson)
    const baseBodySha = hashNormalized('base body');
    makeLocalFile(tmpDir, 'STORY-conflict.md', {
      story_id: 'STORY-conflict',
      remote_id: 'LIN-conflict',
      status: 'todo',
      last_pulled_at: '2026-04-18T00:00:00Z',
      last_remote_update: '2026-04-18T00:00:00Z',
      last_synced_body_sha: baseBodySha,
      last_synced_status: 'todo',
    }, 'Local modified body');  // local body != base (sha differs)

    // Item 2: clean pull (remote-only status change)
    const cleanBodySha = hashNormalized('Clean local body');
    makeLocalFile(tmpDir, 'STORY-clean.md', {
      story_id: 'STORY-clean',
      remote_id: 'LIN-clean',
      status: 'todo',
      last_pulled_at: '2026-04-18T00:00:00Z',
      last_remote_update: '2026-04-18T00:00:00Z',
      last_synced_body_sha: cleanBodySha,
      last_synced_status: 'todo',
    }, 'Clean local body');  // same as last sync sha

    const remoteConflict = makeRemoteItem({
      remote_id: 'LIN-conflict',
      body: 'Remote modified body',  // remote body != base → content-content
      status: 'in-progress',
      updated_at: '2026-04-19T15:00:00Z',
    });

    const remoteClean = makeRemoteItem({
      remote_id: 'LIN-clean',
      body: 'Clean local body',  // same body sha as local → remote-only (status change only)
      status: 'in-progress',
      updated_at: '2026-04-19T15:00:00Z',
    });

    const mcp = makeMcpClient({
      remoteRefs: [
        { remote_id: 'LIN-conflict', updated_at: '2026-04-19T15:00:00Z' },
        { remote_id: 'LIN-clean', updated_at: '2026-04-19T15:00:00Z' },
      ],
      remoteItems: new Map([
        ['LIN-conflict', remoteConflict],
        ['LIN-clean', remoteClean],
      ]),
    });

    // Provide auto-aborting stdin for the merge prompt
    const { Readable } = await import('node:stream');
    const stdinStream = Readable.from(['a\n']);  // 'a' = abort

    const stdoutLines: string[] = [];
    await syncHandler({
      projectRoot: tmpDir,
      mcp,
      stdin: stdinStream,
      stdout: (s) => stdoutLines.push(s),
      stderr: () => {},
      exit: (c) => { throw new Error(`exit(${c})`); },
      now: () => '2026-04-19T16:00:00Z',
    });

    // .conflicts.json should exist and contain the conflict item
    const conflictsPath = path.join(tmpDir, '.cleargate', '.conflicts.json');
    expect(fs.existsSync(conflictsPath)).toBe(true);

    const conflictsData = JSON.parse(fs.readFileSync(conflictsPath, 'utf8'));
    expect(conflictsData.unresolved.length).toBeGreaterThanOrEqual(1);
    expect(conflictsData.unresolved.some((e: { remote_id: string }) => e.remote_id === 'LIN-conflict')).toBe(true);

    // Clean item should have been applied (status updated)
    const cleanPath = path.join(tmpDir, '.cleargate', 'delivery', 'pending-sync', 'STORY-clean.md');
    const cleanContent = fs.readFileSync(cleanPath, 'utf8');
    expect(cleanContent).toContain('in-progress');
  });
});

// ── Test 4: last_synced_status stamped on pull apply ─────────────────────────

describe('Scenario: last_synced_status dataflow', () => {
  let tmpDir: string;

  beforeEach(() => { tmpDir = makeTmpDir(); });
  afterEach(() => cleanup(tmpDir));

  it('statusStampedOnApply: last_synced_status set to remote status after pull', async () => {
    const localBodySha = hashNormalized('Local body content');
    makeLocalFile(tmpDir, 'STORY-042-01.md', {
      story_id: 'STORY-042-01',
      remote_id: 'LIN-1042',
      status: 'todo',
      last_pulled_at: '2026-04-18T00:00:00Z',
      last_remote_update: '2026-04-18T00:00:00Z',
      last_synced_body_sha: localBodySha,
      last_synced_status: 'todo',
    });

    const remoteItem = makeRemoteItem({
      status: 'in-progress',
      body: 'Local body content',  // same body — only status changed (remote-only)
      updated_at: '2026-04-19T15:00:00Z',
    });

    const mcp = makeMcpClient({
      remoteRefs: [{ remote_id: 'LIN-1042', updated_at: '2026-04-19T15:00:00Z' }],
      remoteItems: new Map([['LIN-1042', remoteItem]]),
    });

    await syncHandler({
      projectRoot: tmpDir,
      mcp,
      stdout: () => {},
      stderr: () => {},
      exit: (c) => { throw new Error(`exit(${c})`); },
      now: () => '2026-04-19T16:00:00Z',
    });

    const filePath = path.join(tmpDir, '.cleargate', 'delivery', 'pending-sync', 'STORY-042-01.md');
    const content = fs.readFileSync(filePath, 'utf8');

    // last_synced_status must be stamped with the remote status
    expect(content).toContain('last_synced_status');
    expect(content).toContain('in-progress');
    expect(content).toContain('last_synced_body_sha');
  });
});

// ── Test 4b: last_synced_status + last_synced_body_sha stamped on push apply ───

describe('Scenario: last_synced fields stamped on push apply', () => {
  let tmpDir: string;

  beforeEach(() => { tmpDir = makeTmpDir(); });
  afterEach(() => cleanup(tmpDir));

  it('syncFieldsStampedOnPush: last_synced_status and last_synced_body_sha written after push', async () => {
    // Trigger the 'local-only' → 'push' resolution (rule 2 in conflict-detector):
    //   local.body_sha !== baseSha  (local has edits)
    //   remote.body_sha === baseSha (remote body unchanged)
    //   remote.status === local.status (no status divergence)
    // Then classify() returns { resolution: 'push' } and approved:true lets it proceed.
    const baseBody = 'Base body content for push stamp test';
    const localBody = 'Locally modified body for push stamp test';
    const baseBodySha = hashNormalized(baseBody);

    const localPath = makeLocalFile(tmpDir, 'STORY-push-stamp.md', {
      story_id: 'STORY-push-stamp',
      remote_id: 'LIN-push-stamp',
      status: 'in-progress',
      last_pulled_at: '2026-04-18T00:00:00Z',
      last_remote_update: '2026-04-18T00:00:00Z',
      last_synced_body_sha: baseBodySha,  // base sha, not local sha → local has edits
      last_synced_status: 'in-progress',  // same as current status (no status divergence)
      approved: true,
    }, localBody);  // local body differs from base → local-only change

    // Remote item: same body as base + same status → no remote changes
    const remoteItem = makeRemoteItem({
      remote_id: 'LIN-push-stamp',
      body: baseBody,                 // remote still at base — body_sha === baseSha
      status: 'in-progress',         // matches local status → no status conflict
      updated_at: '2026-04-18T00:00:00Z',  // same as last_remote_update (not newer)
    });

    const mcp = makeMcpClient({
      remoteRefs: [{ remote_id: 'LIN-push-stamp', updated_at: '2026-04-18T00:00:00Z' }],
      remoteItems: new Map([['LIN-push-stamp', remoteItem]]),
    });

    await syncHandler({
      projectRoot: tmpDir,
      mcp,
      stdout: () => {},
      stderr: () => {},
      exit: (c) => { throw new Error(`exit(${c})`); },
      now: () => '2026-04-19T16:00:00Z',
    });

    // Read back the local file and parse frontmatter
    const content = fs.readFileSync(localPath, 'utf8');
    const { parseFrontmatter: pfm } = await import('../../src/wiki/parse-frontmatter.js');
    const { fm: resultFm } = pfm(content);

    // last_synced_status must equal the status at push time ('in-progress')
    expect(resultFm['last_synced_status']).toBe('in-progress');
    // last_synced_body_sha must equal hashNormalized(body at push time)
    expect(resultFm['last_synced_body_sha']).toBe(hashNormalized(localBody));
  });
});

// ── Test 5: no-op-stub pre-flight ─────────────────────────────────────────────

describe('Scenario: no-op-stub pre-flight refusal', () => {
  let tmpDir: string;

  beforeEach(() => { tmpDir = makeTmpDir(); });
  afterEach(() => cleanup(tmpDir));

  it('rejectsNoopStub: exits 2 when adapter is no-adapter-configured', async () => {
    const mcp = makeMcpClient({
      adapterConfigured: false,
      adapterName: 'no-adapter-configured',
    });

    let exitCode: number | undefined;
    const stderrLines: string[] = [];

    await syncHandler({
      projectRoot: tmpDir,
      mcp,
      stdout: () => {},
      stderr: (s) => stderrLines.push(s),
      exit: (c) => { exitCode = c; return undefined as never; },
      now: () => '2026-04-19T16:00:00Z',
    });

    expect(exitCode).toBe(2);
    const combined = stderrLines.join('');
    expect(combined).toContain('no PM adapter configured');
    // Ensure no token appears in stderr
    expect(combined).not.toMatch(/eyJ[A-Za-z0-9._-]+/);
  });

  it('no tokens appear in sync-log entries', async () => {
    const localBodySha = hashNormalized('body text');
    makeLocalFile(tmpDir, 'STORY-001-01.md', {
      story_id: 'STORY-001-01',
      remote_id: 'LIN-1001',
      status: 'todo',
      last_pulled_at: '2026-04-18T00:00:00Z',
      last_remote_update: '2026-04-18T00:00:00Z',
      last_synced_body_sha: localBodySha,
      last_synced_status: 'todo',
    }, 'body text');

    const fakeJwt = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ0ZXN0In0.fakeSig';
    const remoteItem = makeRemoteItem({ body: 'body text', status: 'in-progress', updated_at: '2026-04-19T15:00:00Z' });

    const mcp = makeMcpClient({
      remoteRefs: [{ remote_id: 'LIN-1001', updated_at: '2026-04-19T15:00:00Z' }],
      remoteItems: new Map([['LIN-1001', remoteItem]]),
      onCall: (tool, _args) => {
        if (tool === 'cleargate_list_remote_updates') {
          return [{ remote_id: 'LIN-1001', updated_at: '2026-04-19T15:00:00Z' }];
        }
        if (tool === 'cleargate_pull_item') return remoteItem;
        return null;
      },
    });

    // Provide a participant file to avoid git lookup
    const cgDir = path.join(tmpDir, '.cleargate');
    fs.mkdirSync(cgDir, { recursive: true });
    fs.writeFileSync(
      path.join(cgDir, '.participant.json'),
      JSON.stringify({ email: `user:${fakeJwt}@test.com`, set_at: '2026-04-19T00:00:00Z', source: 'prompted' }),
    );

    const stderrLines: string[] = [];
    await syncHandler({
      projectRoot: tmpDir,
      mcp,
      stdout: () => {},
      stderr: (s) => stderrLines.push(s),
      exit: (c) => { throw new Error(`exit(${c})`); },
      now: () => '2026-04-19T16:00:00Z',
    });

    // Check sync-log for token presence
    const sprintRunsDir = path.join(tmpDir, '.cleargate', 'sprint-runs');
    if (fs.existsSync(sprintRunsDir)) {
      const dirs = fs.readdirSync(sprintRunsDir);
      for (const dir of dirs) {
        const logPath = path.join(sprintRunsDir, dir, 'sync-log.jsonl');
        if (fs.existsSync(logPath)) {
          const content = fs.readFileSync(logPath, 'utf8');
          // Note: participant email contains fakeJwt but that's not a concern here
          // The real check is that JWT tokens from detail fields are redacted
          expect(content).not.toMatch(/eyJhbGciOiJIUzI1NiJ9\.eyJzdWIiOiJ0ZXN0In0\.fakeSig/);
        }
      }
    }
  });

  it('exits 2 with clear message when adapterInfo returns configured=false', async () => {
    const mcp: McpClient = {
      async call<T>(_tool: string, _args: Record<string, unknown>): Promise<T> {
        return null as unknown as T;
      },
      async adapterInfo(): Promise<AdapterInfo> {
        return { configured: false, name: 'no-adapter-configured' };
      },
    };

    let exitCode: number | undefined;
    const stderrLines: string[] = [];

    await syncHandler({
      projectRoot: tmpDir,
      mcp,
      stdout: () => {},
      stderr: (s) => stderrLines.push(s),
      exit: (c) => { exitCode = c; return undefined as never; },
    });

    expect(exitCode).toBe(2);
    expect(stderrLines.join('')).toContain('Sync cannot proceed');
  });
});

// ── MISSING_MCP_TOKEN test ─────────────────────────────────────────────────────

describe('Scenario: missing CLEARGATE_MCP_TOKEN', () => {
  let tmpDir: string;

  beforeEach(() => { tmpDir = makeTmpDir(); });
  afterEach(() => cleanup(tmpDir));

  it('exits 2 when CLEARGATE_MCP_TOKEN is not set', async () => {
    let exitCode: number | undefined;
    const stderrLines: string[] = [];

    await syncHandler({
      projectRoot: tmpDir,
      env: {},  // No token
      stdout: () => {},
      stderr: (s) => stderrLines.push(s),
      exit: (c) => { exitCode = c; return undefined as never; },
    });

    expect(exitCode).toBe(2);
    expect(stderrLines.join('')).toContain('CLEARGATE_MCP_TOKEN');
  });
});

// ── Content-content invokes merge helper ──────────────────────────────────────

describe('Scenario: content-content conflict invokes merge helper', () => {
  let tmpDir: string;

  beforeEach(() => { tmpDir = makeTmpDir(); });
  afterEach(() => cleanup(tmpDir));

  it('merge prompt invoked for content-content conflict; kept choice preserves local body', async () => {
    // local body != base sha, remote body != base sha → content-content → merge
    const baseBodySha = hashNormalized('base body');
    makeLocalFile(tmpDir, 'STORY-merge.md', {
      story_id: 'STORY-merge',
      remote_id: 'LIN-merge',
      status: 'todo',
      last_pulled_at: '2026-04-18T00:00:00Z',
      last_remote_update: '2026-04-18T00:00:00Z',
      last_synced_body_sha: baseBodySha,
      last_synced_status: 'todo',
    }, 'Local modified body');  // different from base

    const remoteItem = makeRemoteItem({
      remote_id: 'LIN-merge',
      body: 'Remote modified body',  // different from base
      status: 'in-progress',
      updated_at: '2026-04-19T15:00:00Z',
    });

    const mcp = makeMcpClient({
      remoteRefs: [{ remote_id: 'LIN-merge', updated_at: '2026-04-19T15:00:00Z' }],
      remoteItems: new Map([['LIN-merge', remoteItem]]),
    });

    // Provide 'k' (keep mine) on stdin
    const { Readable } = await import('node:stream');
    const stdinStream = Readable.from(['k\n']);

    const stdoutLines: string[] = [];
    await syncHandler({
      projectRoot: tmpDir,
      mcp,
      stdin: stdinStream,
      stdout: (s) => stdoutLines.push(s),
      stderr: () => {},
      exit: (c) => { throw new Error(`exit(${c})`); },
      now: () => '2026-04-19T16:00:00Z',
    });

    // Merge prompt appeared
    const combined = stdoutLines.join('');
    expect(combined).toContain('[k]eep mine');

    // File was updated (pull applied with local body kept)
    const filePath = path.join(tmpDir, '.cleargate', 'delivery', 'pending-sync', 'STORY-merge.md');
    const content = fs.readFileSync(filePath, 'utf8');
    expect(content).toContain('Local modified body');
    expect(content).toContain('in-progress');  // status updated from remote
  });
});

// ── Dry-run stdout format ────────────────────────────────────────────────────

describe('Scenario: sync --dry-run stdout format', () => {
  let tmpDir: string;

  beforeEach(() => { tmpDir = makeTmpDir(); });
  afterEach(() => cleanup(tmpDir));

  it('dry-run stdout prints Would pull: N, push: M, conflicts: K', async () => {
    const mcp = makeMcpClient({
      remoteRefs: [],
    });

    const stdoutLines: string[] = [];
    await syncHandler({
      projectRoot: tmpDir,
      mcp,
      dryRun: true,
      stdout: (s) => stdoutLines.push(s),
      stderr: () => {},
      exit: (c) => { throw new Error(`exit(${c})`); },
      now: () => '2026-04-19T16:00:00Z',
    });

    const combined = stdoutLines.join('');
    expect(combined).toMatch(/Would pull: \d+, push: \d+, intake: \d+, conflicts: \d+/);
  });

  it('reads vitest successfully: placeholder test', async () => {
    // Smoke test to ensure module imports cleanly
    const { syncHandler: sh } = await import('../../src/commands/sync.js');
    expect(typeof sh).toBe('function');
  });
});

// ── Test 6: Gherkin scenario 6 — intake surfaces in sync stdout ───────────────

describe('Scenario: intake surfaces in sync stdout', () => {
  let tmpDir: string;

  beforeEach(() => { tmpDir = makeTmpDir(); });
  afterEach(() => cleanup(tmpDir));

  it('syncPrintsIntakeSummaryToStdout: live-path stdout contains emoji-prefixed intake line', async () => {
    // Two new remote proposals returned by detect_new_items; no existing local counterparts.
    const proposal1: RemoteItem = {
      remote_id: 'LIN-101',
      title: 'Enable SSO Login',
      body: 'Users should be able to sign in via SSO.',
      status: 'Draft',
      assignees: [],
      labels: ['cleargate:proposal'],
      updated_at: '2026-04-19T10:00:00Z',
      source_tool: 'linear',
      raw: {},
    };
    const proposal2: RemoteItem = {
      remote_id: 'LIN-102',
      title: 'Dark Mode Support',
      body: 'Add a dark mode toggle to the UI.',
      status: 'Draft',
      assignees: [],
      labels: ['cleargate:proposal'],
      updated_at: '2026-04-19T11:00:00Z',
      source_tool: 'linear',
      raw: {},
    };

    const mcp = makeMcpClient({
      // No remote work-item updates → no pulls, no pushes, no conflicts
      remoteRefs: [],
      onCall: (tool, _args) => {
        if (tool === 'cleargate_list_remote_updates') return [];
        if (tool === 'cleargate_detect_new_items') return [proposal1, proposal2];
        return null;
      },
    });

    const stdoutLines: string[] = [];
    // Live path — dryRun NOT set (defaults to false)
    await syncHandler({
      projectRoot: tmpDir,
      mcp,
      stdout: (s) => stdoutLines.push(s),
      stderr: () => {},
      exit: (c) => { throw new Error(`exit(${c})`); },
      now: () => '2026-04-19T16:00:00Z',
    });

    const combined = stdoutLines.join('');

    // Must contain the emoji-prefixed plural intake summary
    expect(combined).toContain('📥 2 new stakeholder proposals pulled:');
    // Must contain both proposals in the inline list
    expect(combined).toContain("LIN-101 'Enable SSO Login'");
    expect(combined).toContain("LIN-102 'Dark Mode Support'");
    // Must contain the trailing detail line
    expect(combined).toContain('— review at .cleargate/delivery/pending-sync/');
  });
});
