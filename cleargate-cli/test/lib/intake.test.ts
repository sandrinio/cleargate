/**
 * intake.test.ts — STORY-010-05
 *
 * Tests for runIntakeBranch() — the stakeholder proposal intake helper.
 *
 * Test inventory:
 *   1. frontmatterShape — created file has correct frontmatter fields
 *   2. bodySeeds — §1 body is pre-filled from RemoteItem.body
 *   3. idempotent — re-sync with same remote_id = no-op (no new file)
 *   4. idempotentArchive — counterpart in archive also skips
 *   5. r10ZeroLabel — zero items from detect_new_items + no prior intake → stderr WARN
 *   6. r10NoWarnIfPriorIntake — zero items but prior `source: remote-authored` file → no WARN
 *   7. dryRunZeroWrite — dryRun=true: zero fs writes, returns plan
 *   8. endToEnd — 2 new + 1 already-local → exactly 2 files created + 2 sync-log entries
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as fsPromises from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';
import { runIntakeBranch } from '../../src/lib/intake.js';
import type { IntakeBranchOptions } from '../../src/lib/intake.js';
import type { McpClient, RemoteItem, AdapterInfo } from '../../src/lib/mcp-client.js';
import { parseFrontmatter } from '../../src/wiki/parse-frontmatter.js';

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeTmpDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'cg-intake-test-'));
}

function cleanup(dir: string): void {
  fs.rmSync(dir, { recursive: true, force: true });
}

function makePendingSync(tmpDir: string): string {
  const dir = path.join(tmpDir, '.cleargate', 'delivery', 'pending-sync');
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function makeArchive(tmpDir: string): string {
  const dir = path.join(tmpDir, '.cleargate', 'delivery', 'archive');
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function makeSprintRoot(tmpDir: string): string {
  const dir = path.join(tmpDir, '.cleargate', 'sprint-runs', 'SPRINT-07');
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function makeRemoteItem(overrides: Partial<RemoteItem> = {}): RemoteItem {
  return {
    remote_id: 'LIN-1099',
    title: 'Refund flow redesign',
    body: 'This proposal is about improving the refund flow for customers.',
    status: 'todo',
    assignees: [],
    labels: ['cleargate:proposal'],
    updated_at: '2026-04-19T14:58:00Z',
    source_tool: 'linear',
    raw: {},
    ...overrides,
  };
}

function makeMockMcp(items: RemoteItem[]): McpClient {
  return {
    async call<T>(tool: string, _args: Record<string, unknown>): Promise<T> {
      if (tool === 'cleargate_detect_new_items') {
        return items as unknown as T;
      }
      return [] as unknown as T;
    },
    async adapterInfo(): Promise<AdapterInfo> {
      return { configured: true, name: 'linear' };
    },
  };
}

function makeBaseOpts(
  tmpDir: string,
  mcp: McpClient,
  overrides: Partial<IntakeBranchOptions> = {},
): IntakeBranchOptions {
  return {
    mcp,
    identity: { email: 'dev@example.com' },
    sprintRoot: makeSprintRoot(tmpDir),
    projectRoot: tmpDir,
    dryRun: false,
    now: () => '2026-04-19T15:10:00Z',
    ...overrides,
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('runIntakeBranch', () => {
  let tmpDir: string;
  let pendingSync: string;

  beforeEach(() => {
    tmpDir = makeTmpDir();
    pendingSync = makePendingSync(tmpDir);
    makeArchive(tmpDir);
  });

  afterEach(() => cleanup(tmpDir));

  it('frontmatterShape: created file has required frontmatter fields', async () => {
    const item = makeRemoteItem();
    const mcp = makeMockMcp([item]);
    const opts = makeBaseOpts(tmpDir, mcp);

    const result = await runIntakeBranch(opts);

    expect(result.created).toBe(1);
    expect(result.items).toHaveLength(1);

    const createdPath = result.items[0]!.path;
    expect(fs.existsSync(createdPath)).toBe(true);

    const raw = fs.readFileSync(createdPath, 'utf8');
    const { fm } = parseFrontmatter(raw);

    expect(fm['proposal_id']).toBe('PROP-001');
    expect(fm['remote_id']).toBe('LIN-1099');
    expect(fm['approved']).toBe(false);
    expect(fm['source']).toBe('remote-authored');
    expect(fm['last_pulled_by']).toBe('dev@example.com');
    expect(fm['last_pulled_at']).toBe('2026-04-19T15:10:00Z');
    expect(fm['last_remote_update']).toBe('2026-04-19T14:58:00Z');
    expect(fm['pushed_by']).toBeNull();
    expect(fm['pushed_at']).toBeNull();
    expect(fm['last_synced_status']).toBeNull();
    expect(fm['last_synced_body_sha']).toBeNull();
  });

  it('bodySeeds: §1 body is pre-filled from RemoteItem.body', async () => {
    const item = makeRemoteItem({
      body: 'This is the stakeholder-authored problem description.',
    });
    const mcp = makeMockMcp([item]);
    const opts = makeBaseOpts(tmpDir, mcp);

    const result = await runIntakeBranch(opts);
    expect(result.created).toBe(1);

    const createdPath = result.items[0]!.path;
    const raw = fs.readFileSync(createdPath, 'utf8');

    expect(raw).toContain('This is the stakeholder-authored problem description.');
    expect(raw).toContain('## 1. Initiative & Context');
  });

  it('idempotent: re-sync with same remote_id in pending-sync → no new file', async () => {
    // Create a file with remote_id: LIN-1099 in pending-sync
    const existingContent = `---\nproposal_id: "PROP-001"\nremote_id: "LIN-1099"\nsource: "remote-authored"\n---\n\n# Existing\n`;
    fs.writeFileSync(path.join(pendingSync, 'PROPOSAL-001-remote-refund.md'), existingContent, 'utf8');

    const item = makeRemoteItem({ remote_id: 'LIN-1099' });
    const mcp = makeMockMcp([item]);
    const opts = makeBaseOpts(tmpDir, mcp);

    const result = await runIntakeBranch(opts);

    // Should skip the duplicate
    expect(result.created).toBe(0);
    expect(result.items).toHaveLength(0);

    // No new files should be created
    const files = fs.readdirSync(pendingSync);
    expect(files).toHaveLength(1);
  });

  it('idempotentArchive: counterpart in archive also triggers skip', async () => {
    // Create a file with remote_id: LIN-1099 in ARCHIVE
    const archiveDir = path.join(tmpDir, '.cleargate', 'delivery', 'archive');
    const existingContent = `---\nproposal_id: "PROP-001"\nremote_id: "LIN-1099"\nsource: "remote-authored"\n---\n\n# Archived\n`;
    fs.writeFileSync(path.join(archiveDir, 'PROPOSAL-001-remote-old.md'), existingContent, 'utf8');

    const item = makeRemoteItem({ remote_id: 'LIN-1099' });
    const mcp = makeMockMcp([item]);
    const opts = makeBaseOpts(tmpDir, mcp);

    const result = await runIntakeBranch(opts);

    // Should skip — counterpart found in archive
    expect(result.created).toBe(0);
    expect(result.items).toHaveLength(0);
  });

  it('r10ZeroLabel: zero items + no prior intake → WARN in result', async () => {
    const mcp = makeMockMcp([]);
    const opts = makeBaseOpts(tmpDir, mcp);

    const result = await runIntakeBranch(opts);

    expect(result.created).toBe(0);
    expect(result.warning).toBeDefined();
    expect(result.warning).toMatch(/no Linear issues match label/);
    expect(result.warning).toMatch(/cleargate:proposal/);
  });

  it('r10NoWarnIfPriorIntake: zero items but prior remote-authored file → no WARN', async () => {
    // Create a prior remote-authored file in pending-sync
    const priorContent = `---\nproposal_id: "PROP-001"\nremote_id: "LIN-999"\nsource: "remote-authored"\n---\n\n# Prior\n`;
    fs.writeFileSync(path.join(pendingSync, 'PROPOSAL-001-remote-prior.md'), priorContent, 'utf8');

    const mcp = makeMockMcp([]);
    const opts = makeBaseOpts(tmpDir, mcp);

    const result = await runIntakeBranch(opts);

    expect(result.created).toBe(0);
    // No warning — prior intake exists, zero-return is legit "nothing new"
    expect(result.warning).toBeUndefined();
  });

  it('dryRunZeroWrite: dryRun=true produces zero fs writes', async () => {
    const item = makeRemoteItem();
    const mcp = makeMockMcp([item]);
    const opts = makeBaseOpts(tmpDir, mcp, { dryRun: true });

    // Snapshot fs state before
    const beforeFiles = fs.readdirSync(pendingSync);

    const result = await runIntakeBranch(opts);

    // After: zero files created
    const afterFiles = fs.readdirSync(pendingSync);
    expect(afterFiles).toEqual(beforeFiles);

    // But result still reports what WOULD be created
    expect(result.created).toBe(1);
    expect(result.items).toHaveLength(1);
    expect(result.items[0]!.proposalId).toBe('PROP-001');
  });

  it('endToEnd: 2 new + 1 already-local → exactly 2 files created', async () => {
    // Pre-seed one existing item in archive
    const archiveDir = path.join(tmpDir, '.cleargate', 'delivery', 'archive');
    const existingContent = `---\nproposal_id: "PROP-001"\nremote_id: "LIN-1001"\nsource: "remote-authored"\n---\n\n# Archived\n`;
    fs.writeFileSync(path.join(archiveDir, 'PROPOSAL-001-remote-old.md'), existingContent, 'utf8');

    const items = [
      makeRemoteItem({ remote_id: 'LIN-1001', title: 'Already synced' }),  // skip
      makeRemoteItem({ remote_id: 'LIN-1099', title: 'Refund flow redesign' }),
      makeRemoteItem({ remote_id: 'LIN-1103', title: 'Trial onboarding email' }),
    ];

    const mcp = makeMockMcp(items);
    const opts = makeBaseOpts(tmpDir, mcp);

    const result = await runIntakeBranch(opts);

    // Exactly 2 new files created
    expect(result.created).toBe(2);
    expect(result.items).toHaveLength(2);

    // Verify files exist
    for (const item of result.items) {
      expect(fs.existsSync(item.path)).toBe(true);
    }

    // Verify proposal IDs are sequential
    const ids = result.items.map(i => i.proposalId);
    expect(ids).toContain('PROP-002');
    expect(ids).toContain('PROP-003');

    // Verify sync-log entries
    const sprintDir = path.join(tmpDir, '.cleargate', 'sprint-runs', 'SPRINT-07');
    const logFile = path.join(sprintDir, 'sync-log.jsonl');
    expect(fs.existsSync(logFile)).toBe(true);

    const logLines = fs.readFileSync(logFile, 'utf8').trim().split('\n');
    expect(logLines).toHaveLength(2);

    const logEntries = logLines.map(l => JSON.parse(l));
    for (const entry of logEntries) {
      expect(entry.op).toBe('pull-intake');
      expect(entry.result).toBe('ok');
      expect(entry.actor).toBe('dev@example.com');
    }
  });
});
