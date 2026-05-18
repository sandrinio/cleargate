import { describe, test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';

/**
 * Tests for STORY-008-05: stamp-tokens command
 *
 * 7 tests:
 *   1. Gherkin: First stamp populates draft_tokens
 *   2. Gherkin: Re-stamp with no new rows is a no-op
 *   3. Gherkin: Missing ledger produces stamp_error
 *   4. Gherkin: Archive freeze
 *   5. Gherkin: Dry-run
 *   6. Unit: Aggregation correctness (3 rows, 2 sessions)
 *   7. Unit: Model comma-join sorted alphabetically
 *
 * Uses real fs under os.tmpdir(). No fs mocks.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { stampTokensHandler, aggregateBuckets } from '../../src/commands/stamp-tokens.js';
import type { StampTokensCliOptions } from '../../src/commands/stamp-tokens.js';
import type { LedgerRow } from '../../src/lib/ledger-reader.js';
import type { SessionBucket } from '../../src/lib/ledger-reader.js';
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


// ─── Helpers ──────────────────────────────────────────────────────────────────

let tmpDir: string;
let sprintRunsRoot: string;

function makeTmpDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'stamp-tokens-test-'));
}

function makeTmpSprintRuns(): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'stamp-tokens-ledger-'));
  return root;
}

function writeJsonl(sprintRunsDir: string, sprintId: string, rows: Partial<LedgerRow>[]): void {
  const sprintDir = path.join(sprintRunsDir, sprintId);
  fs.mkdirSync(sprintDir, { recursive: true });
  const ledger = path.join(sprintDir, 'token-ledger.jsonl');
  const lines = rows.map((r) => JSON.stringify(r)).join('\n') + '\n';
  fs.writeFileSync(ledger, lines, 'utf-8');
}

function makeRow(overrides: Partial<LedgerRow> = {}): LedgerRow {
  return {
    ts: '2026-04-19T12:00:00Z',
    sprint_id: 'SPRINT-05',
    agent_type: 'developer',
    story_id: '',
    work_item_id: 'EPIC-008',
    session_id: 'session-A',
    transcript: '/tmp/t.jsonl',
    input: 100,
    output: 50,
    cache_creation: 10,
    cache_read: 5,
    model: 'claude-sonnet-4-6',
    turns: 3,
    ...overrides,
  };
}

function writeWorkItemFile(dir: string, filename: string, content: string): string {
  const filePath = path.join(dir, filename);
  fs.writeFileSync(filePath, content, 'utf-8');
  return filePath;
}

function collectStdout(): { lines: string[]; fn: (s: string) => void } {
  const lines: string[] = [];
  return { lines, fn: (s: string) => lines.push(s) };
}

function makeCliOpts(overrides: Partial<StampTokensCliOptions> = {}): StampTokensCliOptions {
  const exitCalls: number[] = [];
  return {
    cwd: tmpDir,
    now: () => new Date('2026-04-19T15:00:00Z'),
    sprintRunsRoot,
    exit: (code: number) => {
      exitCalls.push(code);
      // In tests we throw to stop execution after exit call
      throw new Error(`exit(${code})`);
    },
    ...overrides,
  };
}

beforeEach(() => {
  tmpDir = makeTmpDir();
  sprintRunsRoot = makeTmpSprintRuns();
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
  fs.rmSync(sprintRunsRoot, { recursive: true, force: true });
});

// ─── Gherkin Scenario 1: First stamp populates draft_tokens ──────────────────

describe('Gherkin: First stamp populates draft_tokens', () => {
  test('stamps draft_tokens.input > 0 and sessions[] has ≥1 entry', async () => {
    // Given: EPIC-008.md with no draft_tokens, ledger rows exist
    const content = `---
epic_id: "EPIC-008"
status: Active
---

# EPIC-008 test file
`;
    const filePath = writeWorkItemFile(tmpDir, 'EPIC-008.md', content);

    writeJsonl(sprintRunsRoot, 'SPRINT-05', [
      makeRow({ work_item_id: 'EPIC-008', input: 500, output: 200, session_id: 'sess-1' }),
      makeRow({ work_item_id: 'EPIC-008', input: 300, output: 100, session_id: 'sess-2', ts: '2026-04-19T13:00:00Z' }),
    ]);

    const stdout = collectStdout();
    let exitCode = -1;
    const cliOpts: StampTokensCliOptions = {
      cwd: tmpDir,
      now: () => new Date('2026-04-19T15:00:00Z'),
      sprintRunsRoot,
      stdout: stdout.fn,
      exit: (code: number) => {
        exitCode = code;
        throw new Error(`exit(${code})`);
      },
    };

    try {
      await stampTokensHandler(filePath, {}, cliOpts);
    } catch (e) {
      if (!(e instanceof Error) || !e.message.startsWith('exit(')) throw e;
    }

    assert.strictEqual(exitCode, 0);

    // Read back and verify
    const written = fs.readFileSync(filePath, 'utf-8');
    assert.ok(String(written).includes('draft_tokens:'));

    const { fm } = parseFrontmatter(written);
    const tokens = fm['draft_tokens'] as { input: number; sessions: unknown[] };

    // Then: draft_tokens.input > 0
    assert.ok(tokens.input > 0);
    // And: sessions[] has ≥1 entry
    assert.ok(tokens.sessions.length >= 1);
  });
});

// ─── Gherkin Scenario 2: Re-stamp with no new rows is a no-op ────────────────

describe('Gherkin: Re-stamp with no new rows is a no-op', () => {
  test('file bytes are unchanged on re-stamp with no new ledger rows', async () => {
    // Given: file already stamped; no new ledger rows
    // We set last_stamp to a future time so all existing rows are "older"
    const futureStamp = '2026-04-19T20:00:00Z';
    const existingTokens = JSON.stringify({
      input: 100,
      output: 50,
      cache_creation: 10,
      cache_read: 5,
      model: 'claude-sonnet-4-6',
      last_stamp: futureStamp,
      sessions: [{ session: 'sess-1', model: 'claude-sonnet-4-6', input: 100, output: 50, cache_read: 5, cache_creation: 10, ts: '2026-04-19T12:00:00Z' }],
    });

    const content = `---
epic_id: "EPIC-008"
status: Active
draft_tokens: ${existingTokens}
---

# EPIC-008 test file
`;
    const filePath = writeWorkItemFile(tmpDir, 'EPIC-008.md', content);

    // Rows exist but all older than last_stamp
    writeJsonl(sprintRunsRoot, 'SPRINT-05', [
      makeRow({ work_item_id: 'EPIC-008', ts: '2026-04-19T12:00:00Z', session_id: 'sess-1' }),
    ]);

    const originalBytes = fs.readFileSync(filePath, 'utf-8');

    const stdout = collectStdout();
    let exitCode = -1;
    const cliOpts: StampTokensCliOptions = {
      cwd: tmpDir,
      now: () => new Date('2026-04-19T15:00:00Z'),
      sprintRunsRoot,
      stdout: stdout.fn,
      exit: (code: number) => {
        exitCode = code;
        throw new Error(`exit(${code})`);
      },
    };

    try {
      await stampTokensHandler(filePath, {}, cliOpts);
    } catch (e) {
      if (!(e instanceof Error) || !e.message.startsWith('exit(')) throw e;
    }

    assert.strictEqual(exitCode, 0);
    // File bytes unchanged
    const afterBytes = fs.readFileSync(filePath, 'utf-8');
    assert.strictEqual(afterBytes, originalBytes);
  });
});

// ─── Gherkin Scenario 3: Missing ledger produces stamp_error ─────────────────

describe('Gherkin: Missing ledger produces stamp_error', () => {
  test('writes draft_tokens all-null and stamp_error names the missing work_item_id', async () => {
    // Given: EPIC-999.md with no ledger rows
    const content = `---
epic_id: "EPIC-999"
status: Draft
---

# EPIC-999 test file
`;
    const filePath = writeWorkItemFile(tmpDir, 'EPIC-999.md', content);

    // No ledger rows written for EPIC-999

    const stdout = collectStdout();
    let exitCode = -1;
    const cliOpts: StampTokensCliOptions = {
      cwd: tmpDir,
      now: () => new Date('2026-04-19T15:00:00Z'),
      sprintRunsRoot,
      stdout: stdout.fn,
      exit: (code: number) => {
        exitCode = code;
        throw new Error(`exit(${code})`);
      },
    };

    try {
      await stampTokensHandler(filePath, {}, cliOpts);
    } catch (e) {
      if (!(e instanceof Error) || !e.message.startsWith('exit(')) throw e;
    }

    assert.strictEqual(exitCode, 0);

    const written = fs.readFileSync(filePath, 'utf-8');

    // Then: draft_tokens.input is null
    const { fm } = parseFrontmatter(written);
    const tokens = fm['draft_tokens'] as { input: null | number };
    assert.strictEqual(tokens.input, null);

    // And: stamp_error names the missing work_item_id
    assert.ok(String(written).includes('stamp_error:'));
    assert.ok(String(written).includes('EPIC-999'));
  });
});

// ─── Gherkin Scenario 4: Archive freeze ──────────────────────────────────────

describe('Gherkin: Archive freeze', () => {
  test('file is unchanged and exit 0 for archive path', async () => {
    // Given: file is under .cleargate/delivery/archive/
    const archiveDir = path.join(tmpDir, '.cleargate', 'delivery', 'archive');
    fs.mkdirSync(archiveDir, { recursive: true });

    const content = `---
epic_id: "EPIC-001"
status: Done
---

# Archived file
`;
    const filePath = path.join(archiveDir, 'EPIC-001.md');
    fs.writeFileSync(filePath, content, 'utf-8');

    const originalBytes = fs.readFileSync(filePath, 'utf-8');

    const stdout = collectStdout();
    let exitCode = -1;
    const cliOpts: StampTokensCliOptions = {
      cwd: tmpDir,
      now: () => new Date('2026-04-19T15:00:00Z'),
      sprintRunsRoot,
      stdout: stdout.fn,
      exit: (code: number) => {
        exitCode = code;
        throw new Error(`exit(${code})`);
      },
    };

    try {
      await stampTokensHandler(filePath, {}, cliOpts);
    } catch (e) {
      if (!(e instanceof Error) || !e.message.startsWith('exit(')) throw e;
    }

    // Then: file is unchanged and exit 0
    assert.strictEqual(exitCode, 0);
    const afterBytes = fs.readFileSync(filePath, 'utf-8');
    assert.strictEqual(afterBytes, originalBytes);
    expect(stdout.lines.some((l) => l.includes('[frozen]'))).toBe(true);
  });
});

// ─── Gherkin Scenario 5: Dry-run ─────────────────────────────────────────────

describe('Gherkin: Dry-run', () => {
  test('--dry-run prints the planned draft_tokens diff and file is unchanged', async () => {
    const content = `---
story_id: "STORY-008-05"
status: Draft
---

# Test story
`;
    const filePath = writeWorkItemFile(tmpDir, 'STORY-008-05.md', content);

    writeJsonl(sprintRunsRoot, 'SPRINT-05', [
      makeRow({ work_item_id: 'STORY-008-05', input: 400, output: 100 }),
    ]);

    const originalBytes = fs.readFileSync(filePath, 'utf-8');

    const stdout = collectStdout();
    let exitCode = -1;
    const cliOpts: StampTokensCliOptions = {
      cwd: tmpDir,
      now: () => new Date('2026-04-19T15:00:00Z'),
      sprintRunsRoot,
      stdout: stdout.fn,
      exit: (code: number) => {
        exitCode = code;
        throw new Error(`exit(${code})`);
      },
    };

    try {
      await stampTokensHandler(filePath, { dryRun: true }, cliOpts);
    } catch (e) {
      if (!(e instanceof Error) || !e.message.startsWith('exit(')) throw e;
    }

    // Then: stdout prints the planned draft_tokens diff
    expect(stdout.lines.some((l) => l.includes('[dry-run]'))).toBe(true);
    expect(stdout.lines.some((l) => l.includes('draft_tokens:'))).toBe(true);

    // And: file is unchanged
    assert.strictEqual(exitCode, 0);
    const afterBytes = fs.readFileSync(filePath, 'utf-8');
    assert.strictEqual(afterBytes, originalBytes);
  });
});

// ─── Unit Test 6: Aggregation correctness ────────────────────────────────────

describe('Unit: Aggregation correctness', () => {
  test('3 rows across 2 sessions → sums match', () => {
    const nowIso = '2026-04-19T15:00:00Z';

    const row1: LedgerRow = makeRow({ session_id: 'sess-A', input: 100, output: 50, cache_creation: 10, cache_read: 5, ts: '2026-04-19T10:00:00Z' });
    const row2: LedgerRow = makeRow({ session_id: 'sess-A', input: 200, output: 100, cache_creation: 20, cache_read: 10, ts: '2026-04-19T10:05:00Z' });
    const row3: LedgerRow = makeRow({ session_id: 'sess-B', input: 300, output: 150, cache_creation: 30, cache_read: 15, ts: '2026-04-19T11:00:00Z' });

    const buckets: SessionBucket[] = [
      {
        session_id: 'sess-A',
        rows: [row1, row2],
        totals: { input: 300, output: 150, cache_creation: 30, cache_read: 15, turns: 6 },
      },
      {
        session_id: 'sess-B',
        rows: [row3],
        totals: { input: 300, output: 150, cache_creation: 30, cache_read: 15, turns: 3 },
      },
    ];

    const result = aggregateBuckets(buckets, nowIso);

    assert.strictEqual(result.input, 600);
    assert.strictEqual(result.output, 300);
    assert.strictEqual(result.cache_creation, 60);
    assert.strictEqual(result.cache_read, 30);
    assert.strictEqual((result.sessions).length, 2);
    assert.strictEqual(result.last_stamp, nowIso);
  });
});

// ─── Unit Test 7: Model comma-join sorted alphabetically ─────────────────────

describe('Unit: Model comma-join sorted alphabetically', () => {
  test('3 unique models across 2 sessions → "haiku, opus, sonnet" (sorted)', () => {
    const nowIso = '2026-04-19T15:00:00Z';

    const rowHaiku: LedgerRow = makeRow({ session_id: 'sess-A', model: 'haiku', ts: '2026-04-19T10:00:00Z' });
    const rowSonnet: LedgerRow = makeRow({ session_id: 'sess-A', model: 'sonnet', ts: '2026-04-19T10:05:00Z' });
    const rowOpus: LedgerRow = makeRow({ session_id: 'sess-B', model: 'opus', ts: '2026-04-19T11:00:00Z' });

    const buckets: SessionBucket[] = [
      {
        session_id: 'sess-A',
        rows: [rowHaiku, rowSonnet],
        totals: { input: 100, output: 50, cache_creation: 0, cache_read: 0, turns: 6 },
      },
      {
        session_id: 'sess-B',
        rows: [rowOpus],
        totals: { input: 100, output: 50, cache_creation: 0, cache_read: 0, turns: 3 },
      },
    ];

    const result = aggregateBuckets(buckets, nowIso);

    // Top-level model field: comma-joined sorted unique models
    assert.strictEqual(result.model, 'haiku, opus, sonnet');

    // Session models are also sorted
    const sessA = result.sessions.find((s) => s.session === 'sess-A');
    assert.strictEqual(sessA?.model, 'haiku, sonnet');

    const sessB = result.sessions.find((s) => s.session === 'sess-B');
    assert.strictEqual(sessB?.model, 'opus');
  });
});

// ─── CR-030: Initiative and Sprint stamp scenarios ────────────────────────────

describe('CR-030: Initiative stamp — work_item_id captured as INITIATIVE-NNN', () => {
  test('stamps Initiative fixture with initiative_id in frontmatter → work_item_id captured as INITIATIVE-001', async () => {
    // Pre-CR-030: stderr would emit "cannot determine work_item_id"
    // Post-CR-030: stamp succeeds and work_item_id = INITIATIVE-001
    const content = `---
initiative_id: "INITIATIVE-001"
status: "Triaged"
---

# INITIATIVE-001: Test Initiative
`;
    const filePath = writeWorkItemFile(tmpDir, 'INITIATIVE-001_test.md', content);

    writeJsonl(sprintRunsRoot, 'SPRINT-05', [
      makeRow({ work_item_id: 'INITIATIVE-001', input: 200, output: 100, session_id: 'sess-init' }),
    ]);

    const stdout = collectStdout();
    let exitCode = -1;
    const cliOpts: StampTokensCliOptions = {
      cwd: tmpDir,
      now: () => new Date('2026-04-19T15:00:00Z'),
      sprintRunsRoot,
      stdout: stdout.fn,
      exit: (code: number) => {
        exitCode = code;
        throw new Error(`exit(${code})`);
      },
    };

    try {
      await stampTokensHandler(filePath, {}, cliOpts);
    } catch (e) {
      if (!(e instanceof Error) || !e.message.startsWith('exit(')) throw e;
    }

    assert.strictEqual(exitCode, 0);

    const written = fs.readFileSync(filePath, 'utf-8');
    const { fm } = parseFrontmatter(written);
    const tokens = fm['draft_tokens'] as { input: number; sessions: unknown[] };
    // work_item_id was recognized → tokens were stamped
    assert.ok(tokens.input > 0);
    // stamp_error must NOT mention "cannot determine work_item_id"
    const stampError = fm['stamp_error'] as string | undefined;
    assert.doesNotMatch(String(stampError ?? ''), /cannot determine work_item_id/);
  });
});

describe('CR-030: Sprint stamp — work_item_id captured as SPRINT-NN', () => {
  test('stamps Sprint fixture with sprint_id in frontmatter → work_item_id captured as SPRINT-21 (regression)', async () => {
    // Pre-CR-030: stderr would emit "cannot determine work_item_id" for sprint files
    // Post-CR-030: stamp succeeds and work_item_id = SPRINT-21
    const content = `---
sprint_id: "SPRINT-21"
status: "Active"
---

# SPRINT-21: Test Sprint
`;
    const filePath = writeWorkItemFile(tmpDir, 'SPRINT-21_test.md', content);

    writeJsonl(sprintRunsRoot, 'SPRINT-05', [
      makeRow({ work_item_id: 'SPRINT-21', input: 150, output: 75, session_id: 'sess-sprint' }),
    ]);

    const stdout = collectStdout();
    let exitCode = -1;
    const cliOpts: StampTokensCliOptions = {
      cwd: tmpDir,
      now: () => new Date('2026-04-19T15:00:00Z'),
      sprintRunsRoot,
      stdout: stdout.fn,
      exit: (code: number) => {
        exitCode = code;
        throw new Error(`exit(${code})`);
      },
    };

    try {
      await stampTokensHandler(filePath, {}, cliOpts);
    } catch (e) {
      if (!(e instanceof Error) || !e.message.startsWith('exit(')) throw e;
    }

    assert.strictEqual(exitCode, 0);

    const written = fs.readFileSync(filePath, 'utf-8');
    const { fm } = parseFrontmatter(written);
    const tokens = fm['draft_tokens'] as { input: number; sessions: unknown[] };
    assert.ok(tokens.input > 0);
    const stampError = fm['stamp_error'] as string | undefined;
    assert.doesNotMatch(String(stampError ?? ''), /cannot determine work_item_id/);
  });
});
