/**
 * stamp.test.ts — unit tests for `cleargate stamp <file>` command handler
 *
 * Covers all 6 Gherkin scenarios from STORY-001-05 acceptance criteria:
 *   1. stamp on fresh file stamps all 4 fields
 *   2. stamp on already-stamped file advances updated_at only
 *   3. stamp --dry-run prints diff and leaves file untouched
 *   4. stamp on archive path is noop-archive
 *   5. stamp with non-existent file exits 1 with stderr message
 *   6. stamp exit code is 0 on success, 1 on read failure
 */
import { describe, it, expect, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { stampHandler } from '../../src/commands/stamp.js';
import { parseFrontmatter } from '../../src/wiki/parse-frontmatter.js';
import type { CodebaseVersion } from '../../src/lib/codebase-version.js';

// ------------------------------------------------------------------ fixtures

const FIXED_NOW_1 = new Date('2026-01-01T10:00:00.000Z');
const FIXED_NOW_2 = new Date('2026-01-01T10:05:00.000Z');

const FIXED_VERSION: CodebaseVersion = {
  sha: 'deadbeef',
  dirty: false,
  tag: null,
  package_version: null,
  version_string: 'deadbeef',
};

/** File without any timestamp fields */
const FRESH_FILE = `---
story_id: "STORY-001-99"
title: "Test Story"
status: "Draft"
---

# Test Story

Body content.
`;

/** File already stamped */
const STAMPED_FILE = `---
story_id: "STORY-001-99"
title: "Test Story"
status: "Draft"
created_at: "2026-01-01T09:00:00Z"
updated_at: "2026-01-01T09:00:00Z"
created_at_version: "aabbccdd"
updated_at_version: "aabbccdd"
---

# Test Story

Body content.
`;

// ------------------------------------------------------------------ helpers

const tmpDirs: string[] = [];

function makeTmpDir(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cg-stamp-cmd-test-'));
  tmpDirs.push(dir);
  return dir;
}

function writeFile(filePath: string, content: string): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, 'utf8');
}

function readFile(filePath: string): string {
  return fs.readFileSync(filePath, 'utf8');
}

afterEach(() => {
  for (const dir of tmpDirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

// ------------------------------------------------------------------ tests

describe('stampHandler', () => {
  // Scenario 1: Stamp a fresh file — all 4 fields populated
  it('stamp on fresh file stamps all 4 fields', async () => {
    const dir = makeTmpDir();
    const filePath = path.join(dir, 'fresh.md');
    writeFile(filePath, FRESH_FILE);

    const out: string[] = [];
    const exitCodes: number[] = [];

    await stampHandler(
      filePath,
      {},
      {
        cwd: dir,
        now: () => FIXED_NOW_1,
        getVersion: () => FIXED_VERSION,
        stdout: (s) => out.push(s),
        exit: (code) => { exitCodes.push(code); throw new Error(`exit(${code})`); },
      },
    );

    // Exit should NOT have been called (success path)
    expect(exitCodes).toHaveLength(0);

    // Parse the written file to verify frontmatter
    const written = readFile(filePath);
    const { fm } = parseFrontmatter(written);

    expect(fm['created_at']).toBe('2026-01-01T10:00:00Z');
    expect(fm['updated_at']).toBe('2026-01-01T10:00:00Z');
    expect(fm['created_at_version']).toBe('deadbeef');
    expect(fm['updated_at_version']).toBe('deadbeef');

    // stdout should contain the summary line
    expect(out.some((l) => l.includes('[stamped]'))).toBe(true);
    expect(out.some((l) => l.includes('created'))).toBe(true);
  });

  // Scenario 2: Re-stamp advances updated_at only
  it('stamp on already-stamped file advances updated_at only', async () => {
    const dir = makeTmpDir();
    const filePath = path.join(dir, 'stamped.md');
    writeFile(filePath, STAMPED_FILE);

    const out: string[] = [];

    await stampHandler(
      filePath,
      {},
      {
        cwd: dir,
        now: () => FIXED_NOW_2,
        getVersion: () => FIXED_VERSION,
        stdout: (s) => out.push(s),
        exit: (code) => { throw new Error(`unexpected exit(${code})`); },
      },
    );

    const written = readFile(filePath);
    const { fm } = parseFrontmatter(written);

    // created_at must be preserved from original
    expect(fm['created_at']).toBe('2026-01-01T09:00:00Z');
    expect(fm['created_at_version']).toBe('aabbccdd');

    // updated_at must advance
    expect(fm['updated_at']).toBe('2026-01-01T10:05:00Z');
    expect(fm['updated_at_version']).toBe('deadbeef');

    expect(out.some((l) => l.includes('[stamped]'))).toBe(true);
    expect(out.some((l) => l.includes('updated'))).toBe(true);
  });

  // Scenario 3: --dry-run prints diff and leaves file untouched
  it('stamp --dry-run prints diff and leaves file untouched', async () => {
    const dir = makeTmpDir();
    const filePath = path.join(dir, 'fresh.md');
    writeFile(filePath, FRESH_FILE);

    const bytesBefore = readFile(filePath);
    const out: string[] = [];

    await stampHandler(
      filePath,
      { dryRun: true },
      {
        cwd: dir,
        now: () => FIXED_NOW_1,
        getVersion: () => FIXED_VERSION,
        stdout: (s) => out.push(s),
        exit: (code) => { throw new Error(`unexpected exit(${code})`); },
      },
    );

    // File must be byte-identical
    expect(readFile(filePath)).toBe(bytesBefore);

    // stdout must contain diff markers
    const combined = out.join('\n');
    expect(combined).toContain('---');
    expect(combined).toContain('+++');
    // The diff should show added fields (+ prefix)
    expect(combined).toMatch(/\+created_at/);
  });

  // Scenario 4: Archive path is noop-archive
  it('stamp on archive path is noop-archive', async () => {
    const dir = makeTmpDir();
    const archiveDir = path.join(dir, '.cleargate', 'delivery', 'archive');
    fs.mkdirSync(archiveDir, { recursive: true });
    const filePath = path.join(archiveDir, 'STORY-001-99.md');
    writeFile(filePath, FRESH_FILE);

    const bytesBefore = readFile(filePath);
    const out: string[] = [];

    await stampHandler(
      filePath,
      {},
      {
        cwd: dir,
        now: () => FIXED_NOW_1,
        getVersion: () => FIXED_VERSION,
        stdout: (s) => out.push(s),
        exit: (code) => { throw new Error(`unexpected exit(${code})`); },
      },
    );

    // File must be unchanged
    expect(readFile(filePath)).toBe(bytesBefore);

    // stdout should indicate noop-archive
    expect(out.some((l) => l.includes('noop-archive'))).toBe(true);
  });

  // Scenario 5: Non-existent file exits 1 with stderr message
  it('stamp with non-existent file exits 1 with stderr message', async () => {
    const dir = makeTmpDir();
    const filePath = path.join(dir, 'does-not-exist.md');

    const exitCodes: number[] = [];

    await expect(
      stampHandler(
        filePath,
        {},
        {
          cwd: dir,
          now: () => FIXED_NOW_1,
          stdout: () => {},
          exit: (code) => { exitCodes.push(code); throw new Error(`exit(${code})`); },
        },
      ),
    ).rejects.toThrow('exit(1)');

    expect(exitCodes).toEqual([1]);
  });

  // Scenario 6: Exit code is 0 on success, 1 on read failure
  it('stamp exit code is 0 on success and 1 on read failure', async () => {
    const dir = makeTmpDir();

    // Success path
    const successFile = path.join(dir, 'success.md');
    writeFile(successFile, FRESH_FILE);

    const successExitCodes: number[] = [];
    await stampHandler(
      successFile,
      {},
      {
        cwd: dir,
        now: () => FIXED_NOW_1,
        getVersion: () => FIXED_VERSION,
        stdout: () => {},
        exit: (code) => { successExitCodes.push(code); throw new Error(`exit(${code})`); },
      },
    );
    // No exit called on success
    expect(successExitCodes).toHaveLength(0);

    // Failure path: non-existent file
    const missingFile = path.join(dir, 'missing.md');
    const failExitCodes: number[] = [];
    await expect(
      stampHandler(
        missingFile,
        {},
        {
          cwd: dir,
          now: () => FIXED_NOW_1,
          stdout: () => {},
          exit: (code) => { failExitCodes.push(code); throw new Error(`exit(${code})`); },
        },
      ),
    ).rejects.toThrow('exit(1)');
    expect(failExitCodes).toEqual([1]);
  });
});
