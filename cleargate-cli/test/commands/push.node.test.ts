import { describe, test, beforeEach, afterEach, mock } from 'node:test';
import assert from 'node:assert/strict';

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

import * as fs from 'node:fs';
import * as fsPromises from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';
import { pushHandler } from '../../src/commands/push.js';
import type { McpClient, AdapterInfo } from '../../src/lib/mcp-client.js';
import { serializeFrontmatter } from '../../src/lib/frontmatter-yaml.js';
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
    call: mock.fn(async <T>(tool: string, args: Record<string, unknown>): Promise<T> => {
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
    adapterInfo: mock.fn(async (): Promise<AdapterInfo> => ({
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

  test('Scenario: CLI refuses unapproved push — no MCP call made', async () => {
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
    assert.strictEqual(mcp.call.mock.calls.length, 0);
    expect(seams.exitCode()).toBe(1);
    expect(seams.stderrLines.join('')).toContain('approved: false');
  });

  test('Scenario: CLI refuses when approved field is missing (undefined)', async () => {
    const filePath = makeLocalFile(tmpDir, 'STORY-042-01.md', {
      story_id: 'STORY-042-01',
      status: 'Draft',
      // no approved field
    });

    const mcp = makeMockMcp();
    const seams = makeTestSeams(tmpDir, mcp);

    await expect(pushHandler(filePath, seams.opts)).rejects.toThrow('exit(1)');
    assert.strictEqual(mcp.call.mock.calls.length, 0);
  });

  // ── Scenario 2: Attribution write-back after successful push ───────────────

  test('Scenario: CLI writes attribution back to local frontmatter on success', async () => {
    const filePath = makeLocalFile(tmpDir, 'STORY-042-01.md', {
      story_id: 'STORY-042-01',
      status: 'Draft',
      approved: true,
    });

    const mcp = makeMockMcp();
    const seams = makeTestSeams(tmpDir, mcp);

    await pushHandler(filePath, seams.opts);

    // Verify MCP was called
    const lastCallPush = mcp.call.mock.calls[mcp.call.mock.calls.length - 1]!;
    assert.strictEqual(lastCallPush.arguments[0], 'push_item');
    assert.strictEqual((lastCallPush.arguments[1] as Record<string, unknown>)['cleargate_id'], 'STORY-042-01');
    assert.strictEqual((lastCallPush.arguments[1] as Record<string, unknown>)['type'], 'story');

    // Verify local frontmatter was updated with attribution
    const rawUpdated = fs.readFileSync(filePath, 'utf8');
    const { fm: updatedFm } = parseFrontmatter(rawUpdated);
    assert.strictEqual(updatedFm['pushed_by'], 'test@example.com');
    assert.strictEqual(updatedFm['pushed_at'], '2026-04-19T03:00:01Z');

    // Verify sync-log entry
    const sprintRoot = path.join(tmpDir, '.cleargate', 'sprint-runs', '_off-sprint');
    const entries = await readSyncLog(sprintRoot);
    assert.strictEqual((entries).length, 1);
    assert.strictEqual(entries[0]!.op, 'push');
    assert.strictEqual(entries[0]!.result, 'ok');
    assert.strictEqual(entries[0]!.target, 'STORY-042-01');

    // Verify no token in sync-log (security: grep for eyJ pattern)
    const syncLogPath = path.join(sprintRoot, 'sync-log.jsonl');
    const logContent = fs.readFileSync(syncLogPath, 'utf8');
    assert.doesNotMatch(String(logContent), /eyJ[A-Za-z0-9._-]+/);
  });

  // ── Scenario 3: Revert happy path ──────────────────────────────────────────

  test('Scenario: Soft revert calls sync_status with correct shape and logs op=push-revert', async () => {
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
    assert.deepStrictEqual(mcp.call.mock.calls[mcp.call.mock.calls.length - 1].arguments, ['sync_status', {
      cleargate_id: 'STORY-042-01',
      new_status: 'archived-without-shipping',
    }]);

    // Verify sync-log entry
    const sprintRoot = path.join(tmpDir, '.cleargate', 'sprint-runs', '_off-sprint');
    const entries = await readSyncLog(sprintRoot);
    assert.strictEqual((entries).length, 1);
    assert.strictEqual(entries[0]!.op, 'push-revert');
    assert.strictEqual(entries[0]!.result, 'ok');
    assert.strictEqual(entries[0]!.target, 'STORY-042-01');
    assert.strictEqual(entries[0]!.remote_id, 'LIN-1042');

    // Verify local remote_id is preserved (not cleared)
    const rawAfter = fs.readFileSync(
      path.join(tmpDir, '.cleargate', 'delivery', 'pending-sync', 'STORY-042-01.md'),
      'utf8',
    );
    const { fm: fmAfter } = parseFrontmatter(rawAfter);
    assert.strictEqual(fmAfter['remote_id'], 'LIN-1042');
  });

  // ── Scenario 4: Revert refuses done without --force ────────────────────────

  test('Scenario: Revert refuses when local status is done and --force not passed', async () => {
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
    assert.strictEqual(mcp.call.mock.calls.length, 0);
  });

  // ── Scenario 5: Revert with --force proceeds on done items ─────────────────

  test('Scenario: Revert with --force proceeds on done items', async () => {
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

    assert.deepStrictEqual(mcp.call.mock.calls[mcp.call.mock.calls.length - 1].arguments, ['sync_status', {
      cleargate_id: 'STORY-042-01',
      new_status: 'archived-without-shipping',
    }]);

    // Sync-log should have push-revert entry
    const sprintRoot = path.join(tmpDir, '.cleargate', 'sprint-runs', '_off-sprint');
    const entries = await readSyncLog(sprintRoot);
    assert.strictEqual((entries).length, 1);
    assert.strictEqual(entries[0]!.op, 'push-revert');
  });

  // ── Scenario 6: Tokens never appear in sync-log ────────────────────────────

  test('Scenario: Tokens never appear in sync-log (security grep assertion)', async () => {
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
    assert.doesNotMatch(String(logContent), /eyJ[A-Za-z0-9._-]+/);

    // Also verify no raw token placeholder leaks
    assert.ok(!String(logContent).includes('CLEARGATE_MCP_TOKEN'));
    assert.ok(!String(logContent).includes('Bearer'));
  });
});
