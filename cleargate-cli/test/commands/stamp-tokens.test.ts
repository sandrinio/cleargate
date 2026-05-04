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
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { stampTokensHandler, aggregateBuckets } from '../../src/commands/stamp-tokens.js';
import type { StampTokensCliOptions } from '../../src/commands/stamp-tokens.js';
import type { LedgerRow } from '../../src/lib/ledger-reader.js';
import type { SessionBucket } from '../../src/lib/ledger-reader.js';
import { parseFrontmatter } from '../../src/wiki/parse-frontmatter.js';

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
  it('stamps draft_tokens.input > 0 and sessions[] has ≥1 entry', async () => {
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

    expect(exitCode).toBe(0);

    // Read back and verify
    const written = fs.readFileSync(filePath, 'utf-8');
    expect(written).toContain('draft_tokens:');

    const { fm } = parseFrontmatter(written);
    const tokens = fm['draft_tokens'] as { input: number; sessions: unknown[] };

    // Then: draft_tokens.input > 0
    expect(tokens.input).toBeGreaterThan(0);
    // And: sessions[] has ≥1 entry
    expect(tokens.sessions.length).toBeGreaterThanOrEqual(1);
  });
});

// ─── Gherkin Scenario 2: Re-stamp with no new rows is a no-op ────────────────

describe('Gherkin: Re-stamp with no new rows is a no-op', () => {
  it('file bytes are unchanged on re-stamp with no new ledger rows', async () => {
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

    expect(exitCode).toBe(0);
    // File bytes unchanged
    const afterBytes = fs.readFileSync(filePath, 'utf-8');
    expect(afterBytes).toBe(originalBytes);
  });
});

// ─── Gherkin Scenario 3: Missing ledger produces stamp_error ─────────────────

describe('Gherkin: Missing ledger produces stamp_error', () => {
  it('writes draft_tokens all-null and stamp_error names the missing work_item_id', async () => {
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

    expect(exitCode).toBe(0);

    const written = fs.readFileSync(filePath, 'utf-8');

    // Then: draft_tokens.input is null
    const { fm } = parseFrontmatter(written);
    const tokens = fm['draft_tokens'] as { input: null | number };
    expect(tokens.input).toBeNull();

    // And: stamp_error names the missing work_item_id
    expect(written).toContain('stamp_error:');
    expect(written).toContain('EPIC-999');
  });
});

// ─── Gherkin Scenario 4: Archive freeze ──────────────────────────────────────

describe('Gherkin: Archive freeze', () => {
  it('file is unchanged and exit 0 for archive path', async () => {
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
    expect(exitCode).toBe(0);
    const afterBytes = fs.readFileSync(filePath, 'utf-8');
    expect(afterBytes).toBe(originalBytes);
    expect(stdout.lines.some((l) => l.includes('[frozen]'))).toBe(true);
  });
});

// ─── Gherkin Scenario 5: Dry-run ─────────────────────────────────────────────

describe('Gherkin: Dry-run', () => {
  it('--dry-run prints the planned draft_tokens diff and file is unchanged', async () => {
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
    expect(exitCode).toBe(0);
    const afterBytes = fs.readFileSync(filePath, 'utf-8');
    expect(afterBytes).toBe(originalBytes);
  });
});

// ─── Unit Test 6: Aggregation correctness ────────────────────────────────────

describe('Unit: Aggregation correctness', () => {
  it('3 rows across 2 sessions → sums match', () => {
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

    expect(result.input).toBe(600);
    expect(result.output).toBe(300);
    expect(result.cache_creation).toBe(60);
    expect(result.cache_read).toBe(30);
    expect(result.sessions).toHaveLength(2);
    expect(result.last_stamp).toBe(nowIso);
  });
});

// ─── Unit Test 7: Model comma-join sorted alphabetically ─────────────────────

describe('Unit: Model comma-join sorted alphabetically', () => {
  it('3 unique models across 2 sessions → "haiku, opus, sonnet" (sorted)', () => {
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
    expect(result.model).toBe('haiku, opus, sonnet');

    // Session models are also sorted
    const sessA = result.sessions.find((s) => s.session === 'sess-A');
    expect(sessA?.model).toBe('haiku, sonnet');

    const sessB = result.sessions.find((s) => s.session === 'sess-B');
    expect(sessB?.model).toBe('opus');
  });
});

// ─── CR-030: Initiative and Sprint stamp scenarios ────────────────────────────

describe('CR-030: Initiative stamp — work_item_id captured as INITIATIVE-NNN', () => {
  it('stamps Initiative fixture with initiative_id in frontmatter → work_item_id captured as INITIATIVE-001', async () => {
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

    expect(exitCode).toBe(0);

    const written = fs.readFileSync(filePath, 'utf-8');
    const { fm } = parseFrontmatter(written);
    const tokens = fm['draft_tokens'] as { input: number; sessions: unknown[] };
    // work_item_id was recognized → tokens were stamped
    expect(tokens.input).toBeGreaterThan(0);
    // stamp_error must NOT mention "cannot determine work_item_id"
    const stampError = fm['stamp_error'] as string | undefined;
    expect(stampError ?? '').not.toMatch(/cannot determine work_item_id/);
  });
});

describe('CR-030: Sprint stamp — work_item_id captured as SPRINT-NN', () => {
  it('stamps Sprint fixture with sprint_id in frontmatter → work_item_id captured as SPRINT-21 (regression)', async () => {
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

    expect(exitCode).toBe(0);

    const written = fs.readFileSync(filePath, 'utf-8');
    const { fm } = parseFrontmatter(written);
    const tokens = fm['draft_tokens'] as { input: number; sessions: unknown[] };
    expect(tokens.input).toBeGreaterThan(0);
    const stampError = fm['stamp_error'] as string | undefined;
    expect(stampError ?? '').not.toMatch(/cannot determine work_item_id/);
  });
});
