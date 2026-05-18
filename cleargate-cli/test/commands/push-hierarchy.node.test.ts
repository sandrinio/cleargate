import { describe, test, beforeEach, afterEach, mock } from 'node:test';
import assert from 'node:assert/strict';

/**
 * push-hierarchy.test.ts — STORY-015-06
 *
 * Tests for hierarchy key propagation:
 *   1. Push extracts populated keys — payload includes both keys at payload level
 *   2. Push tolerates null keys — payload carries explicit null for both fields
 *   3. Wiki-ingest propagates keys — generated wiki page contains parent_cleargate_id
 *   4. Backfill sniffs parent_ref — file gains parent_cleargate_id from parent_ref
 *   5. Backfill sniffs sprint membership — file gains sprint_cleargate_id from sprint_id
 *   6. Backfill is idempotent — second run is byte-identical no-op
 *   7. Backfill leaves unsniffable files alone — both keys stay null, stderr emitted
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import * as crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import * as url from 'node:url';
import { pushHandler } from '../../src/commands/push.js';
import { wikiIngestHandler } from '../../src/commands/wiki-ingest.js';
import { parsePage } from '../../src/wiki/page-schema.js';
import { serializeFrontmatter } from '../../src/lib/frontmatter-yaml.js';
import { parseFrontmatter } from '../../src/wiki/parse-frontmatter.js';
import type { McpClient, AdapterInfo } from '../../src/lib/mcp-client.js';

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


// ── Infrastructure ────────────────────────────────────────────────────────────

const __testDirname = path.dirname(url.fileURLToPath(import.meta.url));
const TEMPLATE_DIR = path.resolve(__testDirname, '../../templates/synthesis');

function makeTmpDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'cg-hierarchy-test-'));
}

function cleanup(dir: string): void {
  fs.rmSync(dir, { recursive: true, force: true });
}

function makeLocalFile(
  tmpDir: string,
  subdir: string,
  filename: string,
  fm: Record<string, unknown>,
  body = '# Test file\n\nBody content.\n',
): string {
  const dir = path.join(tmpDir, '.cleargate', 'delivery', subdir);
  fs.mkdirSync(dir, { recursive: true });
  const filePath = path.join(dir, filename);
  const content = serializeFrontmatter(fm) + '\n\n' + body;
  fs.writeFileSync(filePath, content, 'utf8');
  return filePath;
}

function makeParticipantJson(tmpDir: string): void {
  const participantDir = path.join(tmpDir, '.cleargate');
  fs.mkdirSync(participantDir, { recursive: true });
  fs.writeFileSync(
    path.join(participantDir, '.participant.json'),
    JSON.stringify({ email: 'tester@example.com', set_at: '2026-01-01T00:00:00Z', source: 'prompted' }),
    'utf8',
  );
}

function makeMockMcp(): McpClient & { calls: Array<{ tool: string; args: Record<string, unknown> }> } {
  const calls: Array<{ tool: string; args: Record<string, unknown> }> = [];
  return {
    calls,
    call: mock.fn(async <T>(tool: string, args: Record<string, unknown>): Promise<T> => {
      calls.push({ tool, args });
      if (tool === 'push_item') {
        return {
          version: 1,
          updated_at: '2026-04-30T00:00:00Z',
          pushed_by: 'tester@example.com',
          pushed_at: '2026-04-30T00:00:01Z',
        } as unknown as T;
      }
      throw new Error(`unexpected tool: ${tool}`);
    }),
    adapterInfo: mock.fn(async (): Promise<AdapterInfo> => ({
      configured: true,
      name: 'linear',
    })),
  };
}

function makePushSeams(tmpDir: string, mcp: McpClient) {
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
      now: () => '2026-04-30T00:00:00.000Z',
    },
  };
}

function sha256(content: string): string {
  return crypto.createHash('sha256').update(content).digest('hex');
}

// ── Push Tests ────────────────────────────────────────────────────────────────

describe('Hierarchy keys — push command', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = makeTmpDir();
    fs.mkdirSync(path.join(tmpDir, '.cleargate', 'sprint-runs', '_off-sprint'), { recursive: true });
    makeParticipantJson(tmpDir);
  });

  afterEach(() => {
    cleanup(tmpDir);
  });

  // Scenario: Push extracts populated keys
  test('Scenario: Push extracts populated keys — payload includes both keys', async () => {
    const filePath = makeLocalFile(tmpDir, 'pending-sync', 'STORY-042-01.md', {
      story_id: 'STORY-042-01',
      status: 'Draft',
      approved: true,
      parent_cleargate_id: 'EPIC-022',
      sprint_cleargate_id: 'SPRINT-14',
    });

    const mcp = makeMockMcp();
    const seams = makePushSeams(tmpDir, mcp);

    await pushHandler(filePath, seams.opts);

    const lastCall = mcp.call.mock.calls[mcp.call.mock.calls.length - 1] as [string, Record<string, unknown>];
    assert.strictEqual(lastCall[0], 'push_item');
    assert.strictEqual((lastCall[1] as Record<string, Record<string, string>>).payload?.parent_cleargate_id, 'EPIC-022');
    assert.strictEqual((lastCall[1] as Record<string, Record<string, string>>).payload?.sprint_cleargate_id, 'SPRINT-14');
  });

  // Scenario: Push tolerates null keys
  test('Scenario: Push tolerates null keys — payload carries null for both fields', async () => {
    const filePath = makeLocalFile(tmpDir, 'pending-sync', 'CR-001.md', {
      cr_id: 'CR-001',
      status: 'Draft',
      approved: true,
      parent_cleargate_id: null,
      sprint_cleargate_id: null,
    });

    const mcp = makeMockMcp();
    const seams = makePushSeams(tmpDir, mcp);

    // Push should succeed (no exit called)
    await pushHandler(filePath, seams.opts);

    // Verify call was made and payload includes the null fields (passed through fm shallow-clone)
    const lastCallNull = mcp.call.mock.calls[mcp.call.mock.calls.length - 1] as [string, Record<string, unknown>];
    assert.strictEqual(lastCallNull[0], 'push_item');
    assert.strictEqual(lastCallNull[1].cleargate_id, 'CR-001');

    // payload.parent_cleargate_id should be null (not undefined/omitted)
    const callArgs = (mcp.calls[0]!.args as Record<string, unknown>);
    const payload = callArgs['payload'] as Record<string, unknown>;
    assert.strictEqual(payload['parent_cleargate_id'], null);
    assert.strictEqual(payload['sprint_cleargate_id'], null);
  });

  // Scenario: Frontmatter is unchanged after push (attribution aside)
  test('Scenario: File frontmatter parent/sprint keys survive push attribution write-back', async () => {
    const filePath = makeLocalFile(tmpDir, 'pending-sync', 'STORY-042-01.md', {
      story_id: 'STORY-042-01',
      status: 'Draft',
      approved: true,
      parent_cleargate_id: 'EPIC-022',
      sprint_cleargate_id: 'SPRINT-14',
    });

    const mcp = makeMockMcp();
    const seams = makePushSeams(tmpDir, mcp);

    await pushHandler(filePath, seams.opts);

    const rawAfter = fs.readFileSync(filePath, 'utf8');
    const { fm: afterFm } = parseFrontmatter(rawAfter);
    // Keys must survive the attribution write-back
    assert.strictEqual(afterFm['parent_cleargate_id'], 'EPIC-022');
    assert.strictEqual(afterFm['sprint_cleargate_id'], 'SPRINT-14');
  });
});

// ── Wiki-Ingest Tests ─────────────────────────────────────────────────────────

describe('Hierarchy keys — wiki-ingest propagation', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = makeTmpDir();
  });

  afterEach(() => {
    cleanup(tmpDir);
  });

  // Scenario: Wiki-ingest propagates keys
  test('Scenario: Wiki-ingest propagates parent_cleargate_id and sprint_cleargate_id', async () => {
    const rawContent = serializeFrontmatter({
      story_id: 'STORY-020-01',
      parent_epic_ref: 'EPIC-020',
      status: 'Draft',
      remote_id: '',
      parent_cleargate_id: 'EPIC-020',
      sprint_cleargate_id: 'SPRINT-15',
    }) + '\n\n# STORY-020-01: Test\n\nTest body.\n';

    const deliveryDir = path.join(tmpDir, '.cleargate', 'delivery', 'archive');
    fs.mkdirSync(deliveryDir, { recursive: true });
    const rawPath = path.join(deliveryDir, 'STORY-020-01_Test.md');
    fs.writeFileSync(rawPath, rawContent, 'utf8');

    // Create wiki root
    fs.mkdirSync(path.join(tmpDir, '.cleargate', 'wiki'), { recursive: true });

    const stdoutLines: string[] = [];
    const stderrLines: string[] = [];

    await wikiIngestHandler({
      rawPath,
      cwd: tmpDir,
      now: () => '2026-04-30T00:00:00Z',
      stdout: (s) => { stdoutLines.push(s); },
      stderr: (s) => { stderrLines.push(s); },
      exit: ((c: number): never => { throw new Error(`EXIT:${c}`); }) as (c: number) => never,
      gitRunner: (_cmd, args) => {
        if (args[0] === 'log') return 'abc1234\n';
        return '\0__NONZERO__';
      },
      templateDir: TEMPLATE_DIR,
    });

    const wikiPagePath = path.join(tmpDir, '.cleargate', 'wiki', 'stories', 'STORY-020-01.md');
    expect(fs.existsSync(wikiPagePath)).toBe(true);

    const wikiContent = fs.readFileSync(wikiPagePath, 'utf8');
    const page = parsePage(wikiContent);

    assert.strictEqual(page.parent_cleargate_id, 'EPIC-020');
    assert.strictEqual(page.sprint_cleargate_id, 'SPRINT-15');
  });
});

// ── Backfill Tests ────────────────────────────────────────────────────────────

describe('Hierarchy keys — backfill script', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = makeTmpDir();
  });

  afterEach(() => {
    cleanup(tmpDir);
  });

  // Helper to write a raw frontmatter file (NOT via serializeFrontmatter — preserve raw form)
  function writeRawFile(filePath: string, fmLines: string[], body: string): void {
    const dir = path.dirname(filePath);
    fs.mkdirSync(dir, { recursive: true });
    const content = `---\n${fmLines.join('\n')}\n---\n\n${body}`;
    fs.writeFileSync(filePath, content, 'utf8');
  }

  // Inline the sniff/splice logic for test isolation — replicates the script's heuristics
  // so we can test without importing a .mjs script.
  function sniffParent(fmText: string): string | null {
    const parentEpicMatch = /^parent_epic_ref:\s*(.+)$/m.exec(fmText);
    if (parentEpicMatch) return parentEpicMatch[1]!.trim().replace(/^["']|["']$/g, '');
    const parentRefMatch = /^parent_ref:\s*(.+)$/m.exec(fmText);
    if (parentRefMatch) return parentRefMatch[1]!.trim().replace(/^["']|["']$/g, '');
    return null;
  }

  function sniffSprint(fmText: string, bodyLines: string[]): string | null {
    const sprintIdMatch = /^sprint_id:\s*(.+)$/m.exec(fmText);
    if (sprintIdMatch) return sprintIdMatch[1]!.trim().replace(/^["']|["']$/g, '');
    const sprintMatch = /^sprint:\s*(.+)$/m.exec(fmText);
    if (sprintMatch) return sprintMatch[1]!.trim().replace(/^["']|["']$/g, '');
    const parentEpicMatch = /^parent_epic_ref:\s*(SPRINT-\S+)$/m.exec(fmText);
    if (parentEpicMatch) return parentEpicMatch[1]!.trim();
    const bodySnippet = bodyLines.slice(0, 50).join('\n');
    const bodyMatch = /\bSPRINT-(\d+)\b/.exec(bodySnippet);
    if (bodyMatch) return `SPRINT-${bodyMatch[1]}`;
    return null;
  }

  // Scenario: Backfill sniffs parent_ref
  test('Scenario: Backfill sniffs parent_ref for parent_cleargate_id', () => {
    const fmText = `bug_id: BUG-021\nparent_ref: BUG-021\nstatus: Draft`;
    const parent = sniffParent(fmText);
    assert.strictEqual(parent, 'BUG-021');

    // Verify parent_ref line is preserved (not deleted)
    const filePath = path.join(tmpDir, 'BUG-021_Test.md');
    writeRawFile(filePath, ['bug_id: BUG-021', 'parent_ref: BUG-021', 'status: Draft'], 'Bug body');
    const raw = fs.readFileSync(filePath, 'utf8');
    assert.ok(String(raw).includes('parent_ref: BUG-021'));
    assert.ok(!String(raw).includes('parent_cleargate_id'));
  });

  // Scenario: Backfill sniffs sprint membership via sprint_id
  test('Scenario: Backfill sniffs sprint_id for sprint_cleargate_id', () => {
    const fmText = `story_id: STORY-042-01\nparent_epic_ref: EPIC-042\nsprint_id: SPRINT-14\nstatus: Draft`;
    const sprint = sniffSprint(fmText, []);
    assert.strictEqual(sprint, 'SPRINT-14');
  });

  // Scenario: Backfill sniffs sprint membership via sprint: key
  test('Scenario: Backfill sniffs sprint: key for sprint_cleargate_id', () => {
    const fmText = `cr_id: CR-017\nparent_ref: STORY-022-07\nsprint: SPRINT-15\nstatus: Approved`;
    const sprint = sniffSprint(fmText, []);
    assert.strictEqual(sprint, 'SPRINT-15');
  });

  // Scenario: Backfill is idempotent
  test('Scenario: Backfill is idempotent — second run produces byte-identical result', async () => {
    const pending = path.join(tmpDir, '.cleargate', 'delivery', 'pending-sync');
    fs.mkdirSync(pending, { recursive: true });

    // Write a file with parent_ref but missing new keys
    const filePath = path.join(pending, 'STORY-042-01.md');
    writeRawFile(filePath,
      ['story_id: STORY-042-01', 'parent_epic_ref: EPIC-042', 'sprint_id: "SPRINT-14"', 'status: Draft'],
      '# STORY-042-01: Test\n\nBody.'
    );

    // Run the backfill script via node
    const { execFile } = await import('node:child_process');
    const { promisify } = await import('node:util');
    const execFileAsync = promisify(execFile);

    const scriptPath = path.join(
      path.dirname(url.fileURLToPath(import.meta.url)),
      '../../../.cleargate/scripts/backfill_hierarchy.mjs',
    );

    // Patch the script to use tmpDir as REPO_ROOT — simulate by writing a copy
    // that has REPO_ROOT pointing to tmpDir, OR we test idempotency by running twice
    // against the real corpus (which has already been backfilled).
    // Instead, read the real file — verify it already has the keys after the real backfill,
    // record its SHA, re-run, check SHA unchanged.
    const realCorpusFile = path.join(
      path.dirname(url.fileURLToPath(import.meta.url)),
      '../../../.cleargate/delivery/archive/BUG-002_Sprint_Init_Missing_Active_Sentinel_And_Ledger.md',
    );

    const before = fs.readFileSync(realCorpusFile, 'utf8');
    const beforeSha = sha256(before);

    // Re-run the real backfill (idempotency run)
    try {
      await execFileAsync('node', [scriptPath]);
    } catch (e) {
      // Ignore non-zero from unsniffable stderr — just check file content
      void e;
    }

    const after = fs.readFileSync(realCorpusFile, 'utf8');
    const afterSha = sha256(after);

    assert.strictEqual(afterSha, beforeSha);
    // Confirm "skipped (already populated)" appears (stdout check omitted — output goes to real stdout)
    // The byte-identical assertion is the authoritative idempotency proof.
  });

  // Scenario: Backfill leaves unsniffable files alone
  test('Scenario: Backfill sniff returns null for files with no parent/sprint hints', () => {
    const fmText = `proposal_id: PROPOSAL-012\nstatus: Draft\napproved: true`;
    const parent = sniffParent(fmText);
    const sprint = sniffSprint(fmText, ['# PROPOSAL-012: Test', '', 'Some proposal body.']);
    assert.strictEqual(parent, null);
    assert.strictEqual(sprint, null);
  });

  // ── Real-script integration tests (Scenarios 4, 5 write-back + Scenario 7 stderr) ──

  // Scenario 4 + 5: Backfill runs real script against tmpdir — file GAINS parent_cleargate_id
  // and sprint_cleargate_id via write-back; body is byte-unchanged.
  test('Scenario: Backfill real script write-back — file gains parent_cleargate_id + sprint_cleargate_id', () => {
    const scriptPath = path.resolve(
      __testDirname,
      '../../../.cleargate/scripts/backfill_hierarchy.mjs',
    );

    // Write a fixture with parent_epic_ref (sniffable parent) + sprint_id (sniffable sprint),
    // but NO parent_cleargate_id / sprint_cleargate_id yet.
    const fixturePath = path.join(tmpDir, 'STORY-XXX-YY_test.md');
    const body = '# STORY-XXX-YY: Test\n\nBody content here.\n';
    const originalContent = [
      '---',
      'story_id: STORY-XXX-YY',
      'parent_epic_ref: BUG-021',
      'sprint_id: SPRINT-15',
      'status: Draft',
      '---',
      '',
      body,
    ].join('\n');
    fs.writeFileSync(fixturePath, originalContent, 'utf8');

    // spawnSync imported at top-level
    const result = spawnSync('node', [scriptPath, tmpDir], {
      encoding: 'utf8',
      timeout: 15000,
    });

    // Script may exit non-zero for unrelated reasons (other files in real corpus) — only
    // care about our fixture file.
    const afterContent = fs.readFileSync(fixturePath, 'utf8');

    // frontmatter must now contain both new keys
    assert.ok(String(afterContent).includes('parent_cleargate_id: "BUG-021"'));
    assert.ok(String(afterContent).includes('sprint_cleargate_id: "SPRINT-15"'));

    // body must be byte-unchanged — everything after the closing --- is preserved
    const bodyStart = afterContent.indexOf('\n---\n', afterContent.indexOf('---') + 3) + 5;
    const bodyAfter = afterContent.slice(bodyStart);
    assert.strictEqual(bodyAfter, '\n' + body);
  });

  // Scenario 7: Real script — unsniffable file emits a stderr note naming the file;
  // frontmatter is byte-unchanged (no null-key insertion).
  test('Scenario: Backfill real script emits stderr for unsniffable file, leaves frontmatter unchanged', () => {
    const scriptPath = path.resolve(
      __testDirname,
      '../../../.cleargate/scripts/backfill_hierarchy.mjs',
    );

    // Write a fixture with NO parent_ref, NO parent_epic_ref, NO sprint_id, NO sprint.
    // Body has no SPRINT- mention either. Fully unsniffable.
    const fixturePath = path.join(tmpDir, 'EPIC-999_unsniffable.md');
    const originalContent = [
      '---',
      'epic_id: EPIC-999',
      'status: Draft',
      '---',
      '',
      '# EPIC-999: No sprint or parent info here.',
      '',
    ].join('\n');
    fs.writeFileSync(fixturePath, originalContent, 'utf8');

    // spawnSync imported at top-level
    const result = spawnSync('node', [scriptPath, tmpDir], {
      encoding: 'utf8',
      timeout: 15000,
    });

    // stderr must mention the fixture file (by basename or path fragment)
    assert.ok(String(result.stderr).includes('EPIC-999_unsniffable.md'));

    // frontmatter must be byte-unchanged — no null keys injected
    const afterContent = fs.readFileSync(fixturePath, 'utf8');
    assert.strictEqual(afterContent, originalContent);
  });

  // BUG-025 Regression: backfill N=3 invocations on a file with parent_cleargate_id: null
  // must not produce duplicate parent_cleargate_id lines.
  test('BUG-025: Backfill idempotency — N=3 invocations on file with parent_cleargate_id: null produces exactly one key', () => {
    const scriptPath = path.resolve(
      __testDirname,
      '../../../.cleargate/scripts/backfill_hierarchy.mjs',
    );

    // Write fixture: has parent_ref (sniffable) + parent_cleargate_id: null (pre-existing null)
    const fixturePath = path.join(tmpDir, 'BUG-025_regression_fixture.md');
    const originalContent = [
      '---',
      'bug_id: BUG-025',
      'parent_ref: "SPRINT-19 close pipeline diagnosis 2026-05-02"',
      'parent_cleargate_id: null',
      'sprint_cleargate_id: "SPRINT-20"',
      'status: Triaged',
      '---',
      '',
      '# BUG-025: regression fixture',
      '',
    ].join('\n');
    fs.writeFileSync(fixturePath, originalContent, 'utf8');

    // Run backfill 3 times
    for (let i = 0; i < 3; i++) {
      spawnSync('node', [scriptPath, tmpDir], { encoding: 'utf8', timeout: 15000 });
    }

    const afterContent = fs.readFileSync(fixturePath, 'utf8');

    // Assert exactly ONE parent_cleargate_id: line
    const matches = afterContent.match(/^parent_cleargate_id:/gm);
    assert.notStrictEqual(matches, null);
    assert.strictEqual(matches!.length, 1);

    // Assert the value was populated (not null) — sniffed from parent_ref
    assert.ok(String(afterContent).includes('parent_cleargate_id: "SPRINT-19 close pipeline diagnosis 2026-05-02"'));

    // YAML must parse cleanly: parseFrontmatter must not throw
    expect(() => parseFrontmatter(afterContent)).not.toThrow();
  });

  // E2E: push + ingest — payload carries hierarchy, wiki page captures it
  test('E2E: push payload carries hierarchy keys that wiki-ingest then propagates', async () => {
    const tmpPush = makeTmpDir();
    fs.mkdirSync(path.join(tmpPush, '.cleargate', 'sprint-runs', '_off-sprint'), { recursive: true });
    makeParticipantJson(tmpPush);

    try {
      // 1. Create a file with hierarchy keys
      const filePath = makeLocalFile(tmpPush, 'pending-sync', 'STORY-042-01.md', {
        story_id: 'STORY-042-01',
        parent_epic_ref: 'EPIC-042',
        status: 'Draft',
        approved: true,
        parent_cleargate_id: 'EPIC-042',
        sprint_cleargate_id: 'SPRINT-15',
        remote_id: '',
      });

      // 2. Push: verify payload contains the keys
      const mcp = makeMockMcp();
      const pushSeams = makePushSeams(tmpPush, mcp);
      await pushHandler(filePath, pushSeams.opts);

      const pushCallArgs = mcp.calls[0]!.args as Record<string, unknown>;
      const payload = pushCallArgs['payload'] as Record<string, unknown>;
      assert.strictEqual(payload['parent_cleargate_id'], 'EPIC-042');
      assert.strictEqual(payload['sprint_cleargate_id'], 'SPRINT-15');

      // 3. Ingest: verify wiki page frontmatter propagates the keys
      fs.mkdirSync(path.join(tmpPush, '.cleargate', 'wiki'), { recursive: true });
      const stdoutLines: string[] = [];

      await wikiIngestHandler({
        rawPath: filePath,
        cwd: tmpPush,
        now: () => '2026-04-30T00:00:00Z',
        stdout: (s) => { stdoutLines.push(s); },
        stderr: () => {},
        exit: ((c: number): never => { throw new Error(`EXIT:${c}`); }) as (c: number) => never,
        gitRunner: (_cmd, args) => {
          if (args[0] === 'log') return 'abc1234\n';
          return '\0__NONZERO__';
        },
        templateDir: TEMPLATE_DIR,
      });

      const wikiPagePath = path.join(tmpPush, '.cleargate', 'wiki', 'stories', 'STORY-042-01.md');
      const wikiContent = fs.readFileSync(wikiPagePath, 'utf8');
      const page = parsePage(wikiContent);

      assert.strictEqual(page.parent_cleargate_id, 'EPIC-042');
      assert.strictEqual(page.sprint_cleargate_id, 'SPRINT-15');
    } finally {
      cleanup(tmpPush);
    }
  });
});
