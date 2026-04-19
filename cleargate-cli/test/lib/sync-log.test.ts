/**
 * sync-log.test.ts — STORY-010-01 §4 quality gates, sync-log section.
 *
 * Tests 5–8 per plan:
 *   5. append creates file + parent dir
 *   6. append-preserves-order and is append-only
 *   7. readSyncLog filters by actor / op / target
 *   8. readSyncLog tolerates malformed line
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as fsPromises from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';
import { appendSyncLog, readSyncLog, resolveActiveSprintDir, type SyncLogEntry } from '../../src/lib/sync-log.js';

function makeTmpDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'cg-sync-log-test-'));
}

function cleanup(dir: string): void {
  fs.rmSync(dir, { recursive: true, force: true });
}

function makeEntry(overrides: Partial<SyncLogEntry> = {}): SyncLogEntry {
  return {
    ts: '2026-04-19T12:00:00Z',
    actor: 'a@x.com',
    op: 'push',
    target: 'STORY-042-01',
    result: 'ok',
    ...overrides,
  };
}

describe('Scenario: sync-log append creates missing file', () => {
  let tmpDir: string;
  let sprintRoot: string;

  beforeEach(() => {
    tmpDir = makeTmpDir();
    sprintRoot = path.join(tmpDir, '.cleargate', 'sprint-runs', 'SPRINT-06');
    // Do NOT pre-create sprintRoot — test proves creation
  });

  afterEach(() => cleanup(tmpDir));

  it('append creates file + parent dir when absent', async () => {
    await appendSyncLog(sprintRoot, makeEntry({ op: 'push', target: 'STORY-042-01', result: 'ok' }));

    const logPath = path.join(sprintRoot, 'sync-log.jsonl');
    expect(fs.existsSync(logPath)).toBe(true);

    const raw = fs.readFileSync(logPath, 'utf8').trim();
    const parsed = JSON.parse(raw) as SyncLogEntry;
    expect(parsed.op).toBe('push');
    expect(parsed.target).toBe('STORY-042-01');
    expect(parsed.result).toBe('ok');
  });
});

describe('Scenario: append-preserves-order and is append-only', () => {
  let tmpDir: string;
  let sprintRoot: string;

  beforeEach(() => {
    tmpDir = makeTmpDir();
    sprintRoot = path.join(tmpDir, 'sprint');
    fs.mkdirSync(sprintRoot, { recursive: true });
  });

  afterEach(() => cleanup(tmpDir));

  it('two sequential appends + manual sentinel + third append all survive', async () => {
    const logPath = path.join(sprintRoot, 'sync-log.jsonl');

    await appendSyncLog(sprintRoot, makeEntry({ ts: '2026-04-19T10:00:00Z', actor: 'first@x.com' }));
    await appendSyncLog(sprintRoot, makeEntry({ ts: '2026-04-19T11:00:00Z', actor: 'second@x.com' }));

    // Manual sentinel appended directly — must survive
    await fsPromises.appendFile(logPath, '{"sentinel":true}\n', 'utf8');

    await appendSyncLog(sprintRoot, makeEntry({ ts: '2026-04-19T12:00:00Z', actor: 'third@x.com' }));

    const raw = fs.readFileSync(logPath, 'utf8');
    const lines = raw.trim().split('\n').filter((l) => l.trim() !== '');
    expect(lines).toHaveLength(4);

    // Sentinel survives
    expect(lines[2]).toBe('{"sentinel":true}');

    // All 3 appended entries present
    const actors = lines
      .filter((l) => !l.includes('sentinel'))
      .map((l) => (JSON.parse(l) as SyncLogEntry).actor);
    expect(actors).toContain('first@x.com');
    expect(actors).toContain('second@x.com');
    expect(actors).toContain('third@x.com');
  });
});

describe('Scenario: sync-log filters', () => {
  let tmpDir: string;
  let sprintRoot: string;

  beforeEach(async () => {
    tmpDir = makeTmpDir();
    sprintRoot = path.join(tmpDir, 'sprint');
    fs.mkdirSync(sprintRoot, { recursive: true });

    // Seed 6 entries: 2 actors, 3 ops
    const entries: SyncLogEntry[] = [
      makeEntry({ ts: '2026-04-19T01:00:00Z', actor: 'a@x.com', op: 'push', target: 'STORY-001-01' }),
      makeEntry({ ts: '2026-04-19T02:00:00Z', actor: 'b@x.com', op: 'pull', target: 'STORY-002-01' }),
      makeEntry({ ts: '2026-04-19T03:00:00Z', actor: 'a@x.com', op: 'pull', target: 'STORY-003-01' }),
      makeEntry({ ts: '2026-04-19T04:00:00Z', actor: 'b@x.com', op: 'sync-status', target: 'STORY-004-01' }),
      makeEntry({ ts: '2026-04-19T05:00:00Z', actor: 'a@x.com', op: 'push', target: 'STORY-005-01' }),
      makeEntry({ ts: '2026-04-19T06:00:00Z', actor: 'b@x.com', op: 'push', target: 'STORY-006-01' }),
    ];
    for (const entry of entries) {
      await appendSyncLog(sprintRoot, entry);
    }
  });

  afterEach(() => cleanup(tmpDir));

  it('filter by actor returns only that actor\'s entries, newest-first', async () => {
    const results = await readSyncLog(sprintRoot, { actor: 'a@x.com' });
    expect(results).toHaveLength(3);
    expect(results.every((e) => e.actor === 'a@x.com')).toBe(true);
    // newest-first
    expect(results[0].ts > results[1].ts).toBe(true);
    expect(results[1].ts > results[2].ts).toBe(true);
  });

  it('filter by op returns only that op', async () => {
    const results = await readSyncLog(sprintRoot, { op: 'push' });
    expect(results).toHaveLength(3);
    expect(results.every((e) => e.op === 'push')).toBe(true);
  });

  it('filter by target returns only that target', async () => {
    const results = await readSyncLog(sprintRoot, { target: 'STORY-001-01' });
    expect(results).toHaveLength(1);
    expect(results[0].target).toBe('STORY-001-01');
  });

  it('no filter returns all 6 entries, newest-first', async () => {
    const results = await readSyncLog(sprintRoot);
    expect(results).toHaveLength(6);
    expect(results[0].ts).toBe('2026-04-19T06:00:00Z');
    expect(results[5].ts).toBe('2026-04-19T01:00:00Z');
  });
});

describe('Scenario: readSyncLog tolerates malformed line', () => {
  let tmpDir: string;
  let sprintRoot: string;

  beforeEach(() => {
    tmpDir = makeTmpDir();
    sprintRoot = path.join(tmpDir, 'sprint');
    fs.mkdirSync(sprintRoot, { recursive: true });
  });

  afterEach(() => cleanup(tmpDir));

  it('skips malformed JSON lines and returns only valid entries', async () => {
    const logPath = path.join(sprintRoot, 'sync-log.jsonl');

    await appendSyncLog(sprintRoot, makeEntry({ ts: '2026-04-19T10:00:00Z', target: 'STORY-001-01' }));
    await fsPromises.appendFile(logPath, '{not-json}\n', 'utf8');
    await appendSyncLog(sprintRoot, makeEntry({ ts: '2026-04-19T11:00:00Z', target: 'STORY-002-01' }));

    const results = await readSyncLog(sprintRoot);
    expect(results).toHaveLength(2);
    expect(results.map((e) => e.target)).toContain('STORY-001-01');
    expect(results.map((e) => e.target)).toContain('STORY-002-01');
  });

  it('never throws on malformed line', async () => {
    const logPath = path.join(sprintRoot, 'sync-log.jsonl');
    await fsPromises.writeFile(logPath, '{totally-invalid}\n{also-bad}\n', 'utf8');

    await expect(readSyncLog(sprintRoot)).resolves.toEqual([]);
  });
});

describe('resolveActiveSprintDir', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = makeTmpDir();
  });

  afterEach(() => cleanup(tmpDir));

  it('returns _off-sprint when no sprint dirs exist', () => {
    const result = resolveActiveSprintDir(tmpDir);
    expect(result).toContain('_off-sprint');
    expect(fs.existsSync(result)).toBe(true);
  });

  it('returns newest sprint dir by mtime', async () => {
    const sprintRunsRoot = path.join(tmpDir, '.cleargate', 'sprint-runs');
    const sprint06 = path.join(sprintRunsRoot, 'SPRINT-06');
    const sprint07 = path.join(sprintRunsRoot, 'SPRINT-07');

    fs.mkdirSync(sprint06, { recursive: true });
    // Small delay to get distinct mtimes
    await new Promise((r) => setTimeout(r, 10));
    fs.mkdirSync(sprint07, { recursive: true });

    const result = resolveActiveSprintDir(tmpDir);
    expect(result).toContain('SPRINT-07');
  });
});

describe('JWT redaction', () => {
  let tmpDir: string;
  let sprintRoot: string;

  beforeEach(() => {
    tmpDir = makeTmpDir();
    sprintRoot = path.join(tmpDir, 'sprint');
    fs.mkdirSync(sprintRoot, { recursive: true });
  });

  afterEach(() => cleanup(tmpDir));

  it('redacts JWT tokens in detail field before writing', async () => {
    const fakeJwt = 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ0ZXN0In0.fakeSig';
    await appendSyncLog(sprintRoot, makeEntry({ detail: `token: ${fakeJwt}` }));

    const logPath = path.join(sprintRoot, 'sync-log.jsonl');
    const raw = fs.readFileSync(logPath, 'utf8');
    expect(raw).not.toContain(fakeJwt);
    expect(raw).toContain('[REDACTED]');
  });
});
