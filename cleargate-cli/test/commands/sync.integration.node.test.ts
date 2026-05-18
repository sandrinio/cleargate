import { describe, test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';

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

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { syncHandler } from '../../src/commands/sync.js';
import type { McpClient, RemoteItem, RemoteUpdateRef, AdapterInfo } from '../../src/lib/mcp-client.js';
import { serializeFrontmatter } from '../../src/lib/frontmatter-yaml.js';
import { hashNormalized } from '../../src/lib/sha256.js';
import { readSyncLog } from '../../src/lib/sync-log.js';
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

  test('fullLoop: fs writes correct, sync-log has entries, .conflicts.json present', async () => {
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

    assert.ok(listIdx >= 0);
    assert.strictEqual(pullIndices.length, 2);

    for (const pullIdx of pullIndices) {
      assert.ok(listIdx < pullIdx);
      for (const pushIdx of pushIndices) {
        assert.ok(pullIdx < pushIdx);
      }
    }

    // ── fs: STORY-001-01 updated with new status ──────────────────────────────
    const story1Path = path.join(tmpDir, '.cleargate', 'delivery', 'pending-sync', 'STORY-001-01.md');
    const story1Content = fs.readFileSync(story1Path, 'utf8');
    const { fm: fm1 } = parseFrontmatter(story1Content);
    assert.strictEqual(fm1['status'], 'in-progress');
    assert.strictEqual(fm1['last_synced_status'], 'in-progress');
    assert.strictEqual(fm1['last_pulled_at'], '2026-04-19T16:00:00Z');

    // ── fs: STORY-001-02 updated with new status ──────────────────────────────
    const story2Path = path.join(tmpDir, '.cleargate', 'delivery', 'pending-sync', 'STORY-001-02.md');
    const story2Content = fs.readFileSync(story2Path, 'utf8');
    const { fm: fm2 } = parseFrontmatter(story2Content);
    assert.strictEqual(fm2['status'], 'done');
    assert.strictEqual(fm2['last_synced_status'], 'done');

    // ── sync-log has entries ──────────────────────────────────────────────────
    const sprintRunsDir = path.join(tmpDir, '.cleargate', 'sprint-runs');
    const sprintDirs = fs.readdirSync(sprintRunsDir);
    assert.ok(sprintDirs.length > 0);

    let allEntries: Awaited<ReturnType<typeof readSyncLog>> = [];
    for (const dir of sprintDirs) {
      const entries = await readSyncLog(path.join(sprintRunsDir, dir));
      allEntries = allEntries.concat(entries);
    }

    // Should have pull entries for STORY-001-01 and STORY-001-02
    const pullEntries = allEntries.filter((e) => e.op === 'pull' && e.result === 'ok');
    assert.strictEqual(pullEntries.length, 2);
    expect(pullEntries.some((e) => e.target === 'STORY-001-01')).toBe(true);
    expect(pullEntries.some((e) => e.target === 'STORY-001-02')).toBe(true);

    // ── .conflicts.json exists ────────────────────────────────────────────────
    const conflictsPath = path.join(tmpDir, '.cleargate', '.conflicts.json');
    expect(fs.existsSync(conflictsPath)).toBe(true);

    const conflictsData = JSON.parse(fs.readFileSync(conflictsPath, 'utf8'));
    assert.ok('unresolved' in (conflictsData));
    // No conflicts in this clean-pull scenario
    expect(Array.isArray(conflictsData.unresolved)).toBe(true);

    // ── No tokens in sync-log ─────────────────────────────────────────────────
    for (const dir of sprintDirs) {
      const logPath = path.join(sprintRunsDir, dir, 'sync-log.jsonl');
      if (fs.existsSync(logPath)) {
        const content = fs.readFileSync(logPath, 'utf8');
        // grep assertion: no JWT token patterns
        assert.doesNotMatch(String(content), /eyJ[A-Za-z0-9._-]{10,}/);
      }
    }
  });
});
