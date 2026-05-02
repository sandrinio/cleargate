/**
 * dedupe-frontmatter.test.ts — BUG-025
 *
 * Regression tests for .cleargate/scripts/dedupe_frontmatter.mjs.
 * Asserts that:
 *   1. Files with duplicate frontmatter keys are deduped (last occurrence kept).
 *   2. Running the script N=3 times produces a stable result (idempotent).
 *   3. Files without duplicates are left byte-identical.
 *   4. --dry-run prints but does NOT write.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import * as url from 'node:url';
import { spawnSync } from 'node:child_process';

const __testDirname = path.dirname(url.fileURLToPath(import.meta.url));
const SCRIPT_PATH = path.resolve(
  __testDirname,
  '../../../.cleargate/scripts/dedupe_frontmatter.mjs',
);

let tmpDir: string;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cg-dedupe-test-'));
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

function writeFixture(filename: string, content: string): string {
  const filePath = path.join(tmpDir, filename);
  fs.writeFileSync(filePath, content, 'utf8');
  return filePath;
}

function runDedupe(extraArgs: string[] = []): { stdout: string; stderr: string; status: number | null } {
  const result = spawnSync('node', [SCRIPT_PATH, ...extraArgs, tmpDir], {
    encoding: 'utf8',
    timeout: 15000,
  });
  return { stdout: result.stdout ?? '', stderr: result.stderr ?? '', status: result.status };
}

// ─── Scenario: File with duplicate parent_cleargate_id ────────────────────────

describe('BUG-025: dedupe_frontmatter.mjs', () => {
  it('Scenario: file with duplicate parent_cleargate_id is deduped — last occurrence kept', () => {
    const content = [
      '---',
      'bug_id: BUG-025',
      'parent_cleargate_id: "SPRINT-19 close pipeline diagnosis"',
      'parent_cleargate_id: null',
      'status: Triaged',
      '---',
      '',
      '# BUG-025 body',
      '',
    ].join('\n');
    const filePath = writeFixture('BUG-025_dup.md', content);

    runDedupe();

    const after = fs.readFileSync(filePath, 'utf8');
    const matches = after.match(/^parent_cleargate_id:/gm);
    expect(matches).not.toBeNull();
    expect(matches!.length).toBe(1);

    // Last occurrence wins: null (it came after the string value)
    expect(after).toContain('parent_cleargate_id: null');
    expect(after).not.toContain('"SPRINT-19 close pipeline diagnosis"');
  });

  it('Scenario: N=3 invocations produce stable result (idempotent)', () => {
    const content = [
      '---',
      'bug_id: BUG-025',
      'parent_cleargate_id: "SPRINT-19 close pipeline"',
      'parent_cleargate_id: null',
      'sprint_cleargate_id: "SPRINT-20"',
      'sprint_cleargate_id: "SPRINT-19"',
      'status: Triaged',
      '---',
      '',
      '# BUG-025 body',
      '',
    ].join('\n');
    const filePath = writeFixture('BUG-025_n3.md', content);

    runDedupe(); // run 1
    const afterRun1 = fs.readFileSync(filePath, 'utf8');

    runDedupe(); // run 2
    const afterRun2 = fs.readFileSync(filePath, 'utf8');

    runDedupe(); // run 3
    const afterRun3 = fs.readFileSync(filePath, 'utf8');

    // Stable after run 1 — runs 2 and 3 are no-ops
    expect(afterRun2).toBe(afterRun1);
    expect(afterRun3).toBe(afterRun1);

    // Only one of each key
    expect(afterRun3.match(/^parent_cleargate_id:/gm)!.length).toBe(1);
    expect(afterRun3.match(/^sprint_cleargate_id:/gm)!.length).toBe(1);
  });

  it('Scenario: file without duplicates is left byte-identical', () => {
    const content = [
      '---',
      'bug_id: BUG-025',
      'parent_cleargate_id: null',
      'sprint_cleargate_id: "SPRINT-20"',
      'status: Triaged',
      '---',
      '',
      '# BUG-025 no-dup body',
      '',
    ].join('\n');
    const filePath = writeFixture('BUG-025_nodups.md', content);
    const before = fs.readFileSync(filePath, 'utf8');

    runDedupe();

    const after = fs.readFileSync(filePath, 'utf8');
    expect(after).toBe(before);
  });

  it('Scenario: --dry-run prints would-rewrite but does NOT write', () => {
    const content = [
      '---',
      'bug_id: BUG-025',
      'parent_cleargate_id: "first"',
      'parent_cleargate_id: "second"',
      'status: Triaged',
      '---',
      '',
      '# dry run body',
      '',
    ].join('\n');
    const filePath = writeFixture('BUG-025_dryrun.md', content);
    const before = fs.readFileSync(filePath, 'utf8');

    const { stdout } = runDedupe(['--dry-run']);

    // stdout contains would-rewrite marker
    expect(stdout).toContain('would-rewrite');

    // File must be unchanged
    const after = fs.readFileSync(filePath, 'utf8');
    expect(after).toBe(before);
  });

  it('Scenario: multi-line value following a duplicate key is also dropped', () => {
    // Test that continuation lines of the earlier occurrence are dropped too
    const content = [
      '---',
      'story_id: STORY-042-01',
      'draft_tokens:',
      '  input: 100',
      '  output: 50',
      'draft_tokens:',
      '  input: 200',
      '  output: 75',
      'status: Draft',
      '---',
      '',
      '# Multi-line value dedup',
      '',
    ].join('\n');
    const filePath = writeFixture('STORY-042-01_multiline.md', content);

    runDedupe();

    const after = fs.readFileSync(filePath, 'utf8');
    // Only one draft_tokens key
    const matches = after.match(/^draft_tokens:/gm);
    expect(matches).not.toBeNull();
    expect(matches!.length).toBe(1);
    // The kept occurrence has input: 200 (last)
    expect(after).toContain('input: 200');
    expect(after).not.toContain('input: 100');
  });
});
