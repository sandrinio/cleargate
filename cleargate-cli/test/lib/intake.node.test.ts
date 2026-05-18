import { describe, test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';

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

import * as fs from 'node:fs';
import * as fsPromises from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';
import { runIntakeBranch } from '../../src/lib/intake.js';
import type { IntakeBranchOptions } from '../../src/lib/intake.js';
import type { McpClient, RemoteItem, AdapterInfo } from '../../src/lib/mcp-client.js';
import { parseFrontmatter } from '../../src/wiki/parse-frontmatter.js';

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

  test('frontmatterShape: created file has required frontmatter fields', async () => {
    const item = makeRemoteItem();
    const mcp = makeMockMcp([item]);
    const opts = makeBaseOpts(tmpDir, mcp);

    const result = await runIntakeBranch(opts);

    assert.strictEqual(result.created, 1);
    assert.strictEqual((result.items).length, 1);

    const createdPath = result.items[0]!.path;
    expect(fs.existsSync(createdPath)).toBe(true);

    const raw = fs.readFileSync(createdPath, 'utf8');
    const { fm } = parseFrontmatter(raw);

    assert.strictEqual(fm['proposal_id'], 'PROP-001');
    assert.strictEqual(fm['remote_id'], 'LIN-1099');
    assert.strictEqual(fm['approved'], false);
    assert.strictEqual(fm['source'], 'remote-authored');
    assert.strictEqual(fm['last_pulled_by'], 'dev@example.com');
    assert.strictEqual(fm['last_pulled_at'], '2026-04-19T15:10:00Z');
    assert.strictEqual(fm['last_remote_update'], '2026-04-19T14:58:00Z');
    assert.strictEqual(fm['pushed_by'], null);
    assert.strictEqual(fm['pushed_at'], null);
    assert.strictEqual(fm['last_synced_status'], null);
    assert.strictEqual(fm['last_synced_body_sha'], null);
  });

  test('bodySeeds: §1 body is pre-filled from RemoteItem.body', async () => {
    const item = makeRemoteItem({
      body: 'This is the stakeholder-authored problem description.',
    });
    const mcp = makeMockMcp([item]);
    const opts = makeBaseOpts(tmpDir, mcp);

    const result = await runIntakeBranch(opts);
    assert.strictEqual(result.created, 1);

    const createdPath = result.items[0]!.path;
    const raw = fs.readFileSync(createdPath, 'utf8');

    assert.ok(String(raw).includes('This is the stakeholder-authored problem description.'));
    assert.ok(String(raw).includes('## 1. Initiative & Context'));
  });

  test('idempotent: re-sync with same remote_id in pending-sync → no new file', async () => {
    // Create a file with remote_id: LIN-1099 in pending-sync
    const existingContent = `---\nproposal_id: "PROP-001"\nremote_id: "LIN-1099"\nsource: "remote-authored"\n---\n\n# Existing\n`;
    fs.writeFileSync(path.join(pendingSync, 'PROPOSAL-001-remote-refund.md'), existingContent, 'utf8');

    const item = makeRemoteItem({ remote_id: 'LIN-1099' });
    const mcp = makeMockMcp([item]);
    const opts = makeBaseOpts(tmpDir, mcp);

    const result = await runIntakeBranch(opts);

    // Should skip the duplicate
    assert.strictEqual(result.created, 0);
    assert.strictEqual((result.items).length, 0);

    // No new files should be created
    const files = fs.readdirSync(pendingSync);
    assert.strictEqual((files).length, 1);
  });

  test('idempotentArchive: counterpart in archive also triggers skip', async () => {
    // Create a file with remote_id: LIN-1099 in ARCHIVE
    const archiveDir = path.join(tmpDir, '.cleargate', 'delivery', 'archive');
    const existingContent = `---\nproposal_id: "PROP-001"\nremote_id: "LIN-1099"\nsource: "remote-authored"\n---\n\n# Archived\n`;
    fs.writeFileSync(path.join(archiveDir, 'PROPOSAL-001-remote-old.md'), existingContent, 'utf8');

    const item = makeRemoteItem({ remote_id: 'LIN-1099' });
    const mcp = makeMockMcp([item]);
    const opts = makeBaseOpts(tmpDir, mcp);

    const result = await runIntakeBranch(opts);

    // Should skip — counterpart found in archive
    assert.strictEqual(result.created, 0);
    assert.strictEqual((result.items).length, 0);
  });

  test('r10ZeroLabel: zero items + no prior intake → WARN in result', async () => {
    const mcp = makeMockMcp([]);
    const opts = makeBaseOpts(tmpDir, mcp);

    const result = await runIntakeBranch(opts);

    assert.strictEqual(result.created, 0);
    assert.notStrictEqual(result.warning, undefined);
    assert.match(String(result.warning), /no Linear issues match label/);
    assert.match(String(result.warning), /cleargate:proposal/);
  });

  test('r10NoWarnIfPriorIntake: zero items but prior remote-authored file → no WARN', async () => {
    // Create a prior remote-authored file in pending-sync
    const priorContent = `---\nproposal_id: "PROP-001"\nremote_id: "LIN-999"\nsource: "remote-authored"\n---\n\n# Prior\n`;
    fs.writeFileSync(path.join(pendingSync, 'PROPOSAL-001-remote-prior.md'), priorContent, 'utf8');

    const mcp = makeMockMcp([]);
    const opts = makeBaseOpts(tmpDir, mcp);

    const result = await runIntakeBranch(opts);

    assert.strictEqual(result.created, 0);
    // No warning — prior intake exists, zero-return is legit "nothing new"
    assert.strictEqual(result.warning, undefined);
  });

  test('dryRunZeroWrite: dryRun=true produces zero fs writes', async () => {
    const item = makeRemoteItem();
    const mcp = makeMockMcp([item]);
    const opts = makeBaseOpts(tmpDir, mcp, { dryRun: true });

    // Snapshot fs state before
    const beforeFiles = fs.readdirSync(pendingSync);

    const result = await runIntakeBranch(opts);

    // After: zero files created
    const afterFiles = fs.readdirSync(pendingSync);
    assert.deepStrictEqual(afterFiles, beforeFiles);

    // But result still reports what WOULD be created
    assert.strictEqual(result.created, 1);
    assert.strictEqual((result.items).length, 1);
    assert.strictEqual(result.items[0]!.proposalId, 'PROP-001');
  });

  test('endToEnd: 2 new + 1 already-local → exactly 2 files created', async () => {
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
    assert.strictEqual(result.created, 2);
    assert.strictEqual((result.items).length, 2);

    // Verify files exist
    for (const item of result.items) {
      expect(fs.existsSync(item.path)).toBe(true);
    }

    // Verify proposal IDs are sequential
    const ids = result.items.map(i => i.proposalId);
    assert.ok(String(ids).includes('PROP-002'));
    assert.ok(String(ids).includes('PROP-003'));

    // Verify sync-log entries
    const sprintDir = path.join(tmpDir, '.cleargate', 'sprint-runs', 'SPRINT-07');
    const logFile = path.join(sprintDir, 'sync-log.jsonl');
    expect(fs.existsSync(logFile)).toBe(true);

    const logLines = fs.readFileSync(logFile, 'utf8').trim().split('\n');
    assert.strictEqual((logLines).length, 2);

    const logEntries = logLines.map(l => JSON.parse(l));
    for (const entry of logEntries) {
      assert.strictEqual(entry.op, 'pull-intake');
      assert.strictEqual(entry.result, 'ok');
      assert.strictEqual(entry.actor, 'dev@example.com');
    }
  });
});
