/**
 * conflicts.test.ts — STORY-010-04
 *
 * Tests for `cleargate conflicts` (read-only).
 *
 * Tests:
 *   1. lists — reads .conflicts.json, prints unresolved items, no mutations
 *   2. emptyFile — empty unresolved array exits 0, prints "No unresolved conflicts"
 *   3. noFile — missing file exits 0 with message
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { conflictsHandler } from '../../src/commands/conflicts.js';
import type { ConflictsJson } from '../../src/commands/sync.js';

function makeTmpDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'cg-conflicts-test-'));
}

function cleanup(dir: string): void {
  fs.rmSync(dir, { recursive: true, force: true });
}

function writeConflictsJson(tmpDir: string, data: ConflictsJson): void {
  const cgDir = path.join(tmpDir, '.cleargate');
  fs.mkdirSync(cgDir, { recursive: true });
  fs.writeFileSync(path.join(cgDir, '.conflicts.json'), JSON.stringify(data, null, 2), 'utf8');
}

function snapshotDir(dir: string): Record<string, string> {
  const result: Record<string, string> = {};
  if (!fs.existsSync(dir)) return result;
  function walk(d: string) {
    for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
      const fullPath = path.join(d, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
      } else {
        result[fullPath] = fs.readFileSync(fullPath, 'utf8');
      }
    }
  }
  walk(dir);
  return result;
}

// ── Test 1: lists unresolved items ────────────────────────────────────────────

describe('Scenario: conflicts command lists unresolved', () => {
  let tmpDir: string;

  beforeEach(() => { tmpDir = makeTmpDir(); });
  afterEach(() => cleanup(tmpDir));

  it('lists: stdout contains both items, no files modified', async () => {
    const data: ConflictsJson = {
      generated_at: '2026-04-19T16:00:00Z',
      sprint_id: 'SPRINT-07',
      unresolved: [
        {
          item_id: 'STORY-042-01',
          remote_id: 'LIN-1042',
          state: 'local-delete-remote-edit',
          resolution: 'refuse',
          reason: 'local deletion conflicts with remote edit',
          local_path: '.cleargate/delivery/pending-sync/STORY-042-01.md',
        },
        {
          item_id: 'STORY-042-02',
          remote_id: 'LIN-1043',
          state: 'remote-delete-local-edit',
          resolution: 'refuse',
          reason: 'remote deletion conflicts with local edit',
          local_path: '.cleargate/delivery/pending-sync/STORY-042-02.md',
        },
      ],
    };

    writeConflictsJson(tmpDir, data);

    // Snapshot before
    const before = snapshotDir(tmpDir);

    const stdoutLines: string[] = [];
    let exitCode: number | undefined;

    await conflictsHandler({
      projectRoot: tmpDir,
      stdout: (s) => stdoutLines.push(s),
      stderr: () => {},
      exit: (c) => { exitCode = c; return undefined as never; },
    });

    // Should exit 1 (there are unresolved conflicts)
    expect(exitCode).toBe(1);

    const combined = stdoutLines.join('');
    expect(combined).toContain('STORY-042-01');
    expect(combined).toContain('STORY-042-02');
    expect(combined).toContain('remote-delete');

    // No files modified
    const after = snapshotDir(tmpDir);
    // Only the conflicts.json we created should be there — no new files
    expect(Object.keys(after)).toEqual(Object.keys(before));
    for (const [key, val] of Object.entries(before)) {
      expect(after[key]).toBe(val);
    }
  });
});

// ── Test 2: empty unresolved array ────────────────────────────────────────────

describe('Scenario: conflicts command with empty conflicts', () => {
  let tmpDir: string;

  beforeEach(() => { tmpDir = makeTmpDir(); });
  afterEach(() => cleanup(tmpDir));

  it('emptyFile: prints "No unresolved conflicts", exits 0', async () => {
    writeConflictsJson(tmpDir, {
      generated_at: '2026-04-19T16:00:00Z',
      sprint_id: 'SPRINT-07',
      unresolved: [],
    });

    const stdoutLines: string[] = [];
    let exitCode: number | undefined;

    await conflictsHandler({
      projectRoot: tmpDir,
      stdout: (s) => stdoutLines.push(s),
      stderr: () => {},
      exit: (c) => { exitCode = c; return undefined as never; },
    });

    expect(exitCode).toBe(0);
    expect(stdoutLines.join('')).toContain('No unresolved conflicts');
  });
});

// ── Test 3: no file ────────────────────────────────────────────────────────────

describe('Scenario: conflicts command without .conflicts.json', () => {
  let tmpDir: string;

  beforeEach(() => { tmpDir = makeTmpDir(); });
  afterEach(() => cleanup(tmpDir));

  it('noFile: exits 0 with helpful message', async () => {
    const stdoutLines: string[] = [];
    let exitCode: number | undefined;

    await conflictsHandler({
      projectRoot: tmpDir,
      stdout: (s) => stdoutLines.push(s),
      stderr: () => {},
      exit: (c) => { exitCode = c; return undefined as never; },
    });

    expect(exitCode).toBe(0);
    expect(stdoutLines.join('')).toContain('No conflicts file found');
  });
});
