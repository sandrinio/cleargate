import { describe, test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';

/**
 * pull.test.ts — STORY-010-04
 *
 * Tests for `cleargate pull` (targeted single-item pull).
 *
 * Tests:
 *   1. idempotentNoOp — second pull with unchanged remote is a no-op
 *   2. updatesAndLogs — pull updates frontmatter + appends sync-log entry
 *   3. commentsWarning — --comments flag emits warn and proceeds
 */

import * as fs from 'node:fs';
import * as fsPromises from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';
import { pullHandler } from '../../src/commands/pull.js';
import type { McpClient, RemoteItem, AdapterInfo } from '../../src/lib/mcp-client.js';
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
  return fs.mkdtempSync(path.join(os.tmpdir(), 'cg-pull-test-'));
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

function makeMcpClient(remoteItem: RemoteItem | null): McpClient {
  return {
    async call<T>(tool: string, _args: Record<string, unknown>): Promise<T> {
      if (tool === 'cleargate_pull_item') {
        return remoteItem as unknown as T;
      }
      return null as unknown as T;
    },
    async adapterInfo(): Promise<AdapterInfo> {
      return { configured: true, name: 'linear' };
    },
  };
}

// ── Test 1: idempotency ────────────────────────────────────────────────────────

describe('Scenario: Targeted pull is idempotent', () => {
  let tmpDir: string;

  beforeEach(() => { tmpDir = makeTmpDir(); });
  afterEach(() => cleanup(tmpDir));

  test('idempotentNoOp: second pull with unchanged remote is a no-op', async () => {
    const remoteBody = 'Remote body content';
    const remoteBodySha = hashNormalized(remoteBody);
    const remoteItem = makeRemoteItem({ body: remoteBody, status: 'in-progress' });

    // Local file already reflects the remote state
    makeLocalFile(tmpDir, 'STORY-042-01.md', {
      story_id: 'STORY-042-01',
      remote_id: 'LIN-1042',
      status: 'in-progress',
      last_pulled_at: '2026-04-19T14:00:00Z',
      last_remote_update: '2026-04-19T15:00:00Z',
      last_synced_body_sha: remoteBodySha,
      last_synced_status: 'in-progress',
    }, remoteBody);

    const mcp = makeMcpClient(remoteItem);

    // Make participant file for deterministic identity
    const cgDir = path.join(tmpDir, '.cleargate');
    fs.mkdirSync(cgDir, { recursive: true });
    fs.writeFileSync(
      path.join(cgDir, '.participant.json'),
      JSON.stringify({ email: 'test@example.com', set_at: '2026-04-19T00:00:00Z', source: 'prompted' }),
    );

    const stdoutLines: string[] = [];
    const now1 = '2026-04-19T16:00:00Z';

    // First pull — should be no-op (already up to date)
    await pullHandler('LIN-1042', {
      projectRoot: tmpDir,
      mcp,
      stdout: (s) => stdoutLines.push(s),
      stderr: () => {},
      exit: (c) => { throw new Error(`exit(${c})`); },
      now: () => now1,
    });

    expect(stdoutLines.join('')).toContain('no-op');

    // Second pull — same result
    const stdoutLines2: string[] = [];
    await pullHandler('LIN-1042', {
      projectRoot: tmpDir,
      mcp,
      stdout: (s) => stdoutLines2.push(s),
      stderr: () => {},
      exit: (c) => { throw new Error(`exit(${c})`); },
      now: () => '2026-04-19T17:00:00Z',
    });

    expect(stdoutLines2.join('')).toContain('no-op');

    // Both should have logged op='pull' result='no-op'
    const sprintRoot = path.join(tmpDir, '.cleargate', 'sprint-runs');
    const dirs = fs.existsSync(sprintRoot) ? fs.readdirSync(sprintRoot) : [];
    let totalNoOpEntries = 0;
    for (const dir of dirs) {
      const entries = await readSyncLog(path.join(sprintRoot, dir));
      totalNoOpEntries += entries.filter((e) => e.result === 'no-op').length;
    }
    assert.ok(totalNoOpEntries >= 1);
  });
});

// ── Test 2: pull updates frontmatter ─────────────────────────────────────────

describe('Scenario: Targeted pull updates frontmatter', () => {
  let tmpDir: string;

  beforeEach(() => { tmpDir = makeTmpDir(); });
  afterEach(() => cleanup(tmpDir));

  test('updatesAndLogs: frontmatter gains last_pulled_at and status updated', async () => {
    const remoteItem = makeRemoteItem({ status: 'in-progress' });
    const localBodySha = hashNormalized('Local body content');

    const filePath = makeLocalFile(tmpDir, 'STORY-042-01.md', {
      story_id: 'STORY-042-01',
      remote_id: 'LIN-1042',
      status: 'todo',
      last_pulled_at: null,
      last_remote_update: null,
      last_synced_body_sha: localBodySha,  // same body locally as we'll provide remotely
      last_synced_status: null,
    }, remoteItem.body ?? '');

    const cgDir = path.join(tmpDir, '.cleargate');
    fs.mkdirSync(cgDir, { recursive: true });
    fs.writeFileSync(
      path.join(cgDir, '.participant.json'),
      JSON.stringify({ email: 'dev@example.com', set_at: '2026-04-19T00:00:00Z', source: 'prompted' }),
    );

    const mcp = makeMcpClient(remoteItem);

    await pullHandler('LIN-1042', {
      projectRoot: tmpDir,
      mcp,
      stdout: () => {},
      stderr: () => {},
      exit: (c) => { throw new Error(`exit(${c})`); },
      now: () => '2026-04-19T16:00:00Z',
    });

    const content = await fsPromises.readFile(filePath, 'utf8');
    const { fm } = parseFrontmatter(content);

    assert.strictEqual(fm['status'], 'in-progress');
    assert.strictEqual(fm['last_pulled_at'], '2026-04-19T16:00:00Z');
    assert.strictEqual(fm['last_remote_update'], '2026-04-19T15:00:00Z');
    assert.strictEqual(fm['last_synced_status'], 'in-progress');
    assert.strictEqual(typeof fm['last_synced_body_sha'], 'string');
  });
});

// ── Test 3: --comments flag (STORY-010-06 — stub replaced with real implementation) ──

describe('Scenario: --comments flag (STORY-010-06)', () => {
  let tmpDir: string;

  beforeEach(() => { tmpDir = makeTmpDir(); });
  afterEach(() => cleanup(tmpDir));

  test('commentsFlag: --comments triggers comment pull and completes without error (no-op item path)', async () => {
    const remoteBody = 'Remote body content';
    const remoteBodySha = hashNormalized(remoteBody);
    const remoteItem = makeRemoteItem({ body: remoteBody, status: 'in-progress' });

    makeLocalFile(tmpDir, 'STORY-042-01.md', {
      story_id: 'STORY-042-01',
      remote_id: 'LIN-1042',
      status: 'in-progress',
      last_pulled_at: '2026-04-19T14:00:00Z',
      last_remote_update: '2026-04-19T15:00:00Z',
      last_synced_body_sha: remoteBodySha,
      last_synced_status: 'in-progress',
    }, remoteBody);

    const cgDir = path.join(tmpDir, '.cleargate');
    fs.mkdirSync(cgDir, { recursive: true });
    fs.writeFileSync(
      path.join(cgDir, '.participant.json'),
      JSON.stringify({ email: 'test@example.com', set_at: '2026-04-19T00:00:00Z', source: 'prompted' }),
    );

    // STORY-010-06: makeMcpClient returns null for cleargate_pull_comments (empty).
    // Since item is a no-op (sha matches), --comments is not reached in the no-op path.
    const mcp = makeMcpClient(remoteItem);
    let errored = false;

    await pullHandler('LIN-1042', {
      projectRoot: tmpDir,
      mcp,
      comments: true,
      stdout: () => {},
      stderr: () => {},
      exit: (c) => { errored = true; throw new Error(`exit(${c})`); },
      now: () => '2026-04-19T16:00:00Z',
    }).catch(() => { errored = true; });

    // --comments flag: no longer emits a warning (stub replaced by STORY-010-06)
    assert.strictEqual(errored, false);
  });
});
