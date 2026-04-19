/**
 * sync-log.test.ts (command) — STORY-010-04
 *
 * Tests for `cleargate sync-log` CLI wrapper.
 *
 * Tests:
 *   1. actorFilter — --actor filter returns only that actor
 *   2. opLimitFilter — --op + --limit caps and orders newest-first
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { syncLogHandler } from '../../src/commands/sync-log.js';
import { appendSyncLog, type SyncLogEntry } from '../../src/lib/sync-log.js';

function makeTmpDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'cg-sync-log-cmd-test-'));
}

function cleanup(dir: string): void {
  fs.rmSync(dir, { recursive: true, force: true });
}

function makeEntry(overrides: Partial<SyncLogEntry> = {}): SyncLogEntry {
  return {
    ts: '2026-04-19T12:00:00Z',
    actor: 'a@x.com',
    op: 'push',
    target: 'STORY-001-01',
    result: 'ok',
    ...overrides,
  };
}

async function seedLog(sprintRoot: string, entries: SyncLogEntry[]): Promise<void> {
  for (const entry of entries) {
    await appendSyncLog(sprintRoot, entry);
  }
}

// ── Test 1: actor filter ────────────────────────────────────────────────────────

describe('Scenario: sync-log --actor filter', () => {
  let tmpDir: string;
  let sprintRoot: string;

  beforeEach(async () => {
    tmpDir = makeTmpDir();
    // Create a sprint dir so resolveActiveSprintDir returns it
    sprintRoot = path.join(tmpDir, '.cleargate', 'sprint-runs', 'SPRINT-07');
    fs.mkdirSync(sprintRoot, { recursive: true });

    const entries: SyncLogEntry[] = [];
    for (let i = 1; i <= 20; i++) {
      entries.push(makeEntry({
        ts: `2026-04-19T${String(i).padStart(2, '0')}:00:00Z`,
        actor: i % 2 === 0 ? 'alice@x.com' : 'bob@x.com',
        op: 'push',
        target: `STORY-001-${String(i).padStart(2, '0')}`,
      }));
    }
    await seedLog(sprintRoot, entries);
  });

  afterEach(() => cleanup(tmpDir));

  it('actorFilter: --actor a@x.com returns only alice entries', async () => {
    const stdoutLines: string[] = [];

    await syncLogHandler({
      projectRoot: tmpDir,
      actor: 'alice@x.com',
      stdout: (s) => stdoutLines.push(s),
      stderr: () => {},
    });

    const combined = stdoutLines.join('');
    expect(combined).toContain('alice@x.com');
    expect(combined).not.toContain('bob@x.com');

    // Count lines — should be 10 (every even i from 1-20)
    const lines = stdoutLines.filter((l) => l.trim() !== '').join('\n').split('\n').filter((l) => l.trim() !== '');
    expect(lines.length).toBe(10);
  });
});

// ── Test 2: op + limit filter ─────────────────────────────────────────────────

describe('Scenario: sync-log --op + --limit filter', () => {
  let tmpDir: string;
  let sprintRoot: string;

  beforeEach(async () => {
    tmpDir = makeTmpDir();
    sprintRoot = path.join(tmpDir, '.cleargate', 'sprint-runs', 'SPRINT-07');
    fs.mkdirSync(sprintRoot, { recursive: true });

    const entries: SyncLogEntry[] = [];
    for (let i = 1; i <= 20; i++) {
      entries.push(makeEntry({
        ts: `2026-04-19T${String(i).padStart(2, '0')}:00:00Z`,
        op: i % 3 === 0 ? 'pull' : 'push',
        target: `STORY-001-${String(i).padStart(2, '0')}`,
      }));
    }
    await seedLog(sprintRoot, entries);
  });

  afterEach(() => cleanup(tmpDir));

  it('opLimitFilter: --op push --limit 5 caps at 5 and orders newest-first', async () => {
    const stdoutLines: string[] = [];

    await syncLogHandler({
      projectRoot: tmpDir,
      op: 'push',
      limit: 5,
      stdout: (s) => stdoutLines.push(s),
      stderr: () => {},
    });

    const lines = stdoutLines.join('').split('\n').filter((l) => l.trim() !== '');
    expect(lines.length).toBeLessThanOrEqual(5);
    expect(lines.length).toBeGreaterThan(0);

    // All lines should be push entries (contain 'push')
    for (const line of lines) {
      expect(line).toContain('push');
    }

    // Newest-first: first line should have a later timestamp than last line
    if (lines.length >= 2) {
      const firstTs = lines[0].split('  ')[0];
      const lastTs = lines[lines.length - 1].split('  ')[0];
      expect(firstTs >= lastTs).toBe(true);
    }
  });

  it('emptyFilter: no entries match returns helpful message', async () => {
    const stdoutLines: string[] = [];

    await syncLogHandler({
      projectRoot: tmpDir,
      op: 'push-revert',  // no entries with this op
      stdout: (s) => stdoutLines.push(s),
      stderr: () => {},
    });

    expect(stdoutLines.join('')).toContain('No sync-log entries');
  });
});
