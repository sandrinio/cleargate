/**
 * report-filename.test.ts — CR-022 M0
 *
 * Unit tests for the shared reportFilename helper.
 * 8 scenarios matching the frozen API contract from the M1 architect plan.
 *
 * File lives in cleargate-cli/test/scripts/ (vitest harness home for .cleargate/scripts/*.mjs
 * unit tests). No canonical mirror — cleargate-cli/ is the npm package, not mirrored.
 */

import { describe, it, expect, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import the helper directly — it is pure given its arguments + filesystem state.
// Path: cleargate-cli/test/scripts/ → ../../.. → repo root → .cleargate/scripts/lib/
const { reportFilename } = await import(
  path.resolve(__dirname, '../../../.cleargate/scripts/lib/report-filename.mjs')
);

const tmpDirs: string[] = [];

function makeTmpDir(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cg-report-filename-test-'));
  tmpDirs.push(dir);
  return dir;
}

afterEach(() => {
  for (const dir of tmpDirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

describe('reportFilename — frozen API (CR-022 M0)', () => {

  it('scenario 1: write-side default returns new-name path (no fs probe)', () => {
    // reportFilename(dir, 'SPRINT-18') returns <dir>/SPRINT-18_REPORT.md
    const dir = makeTmpDir();
    const result = reportFilename(dir, 'SPRINT-18');
    expect(result).toBe(path.join(dir, 'SPRINT-18_REPORT.md'));
  });

  it('scenario 2: forRead=true with new-name file present returns new-name path', () => {
    // reportFilename(dir, 'SPRINT-18', { forRead: true }) with new-name present
    const dir = makeTmpDir();
    fs.writeFileSync(path.join(dir, 'SPRINT-18_REPORT.md'), '# Report\n');
    const result = reportFilename(dir, 'SPRINT-18', { forRead: true });
    expect(result).toBe(path.join(dir, 'SPRINT-18_REPORT.md'));
  });

  it('scenario 3: forRead=true with only legacy REPORT.md present returns legacy path', () => {
    // reportFilename(dir, 'SPRINT-15', { forRead: true }) with only REPORT.md present
    const dir = makeTmpDir();
    fs.writeFileSync(path.join(dir, 'REPORT.md'), '# Legacy Report\n');
    const result = reportFilename(dir, 'SPRINT-15', { forRead: true });
    expect(result).toBe(path.join(dir, 'REPORT.md'));
  });

  it('scenario 4: forRead=true with neither file present returns new-name path', () => {
    // reportFilename(dir, 'SPRINT-15', { forRead: true }) with neither file present
    // Caller will hit ENOENT — helper returns the new-name path anyway.
    const dir = makeTmpDir();
    const result = reportFilename(dir, 'SPRINT-15', { forRead: true });
    expect(result).toBe(path.join(dir, 'SPRINT-15_REPORT.md'));
  });

  it('scenario 5: no opts with only legacy REPORT.md present still returns new-name path', () => {
    // Read-fallback is opt-in via forRead — never applied without explicit opts.forRead.
    // reportFilename(dir, 'SPRINT-15') with only REPORT.md present returns SPRINT-15_REPORT.md.
    const dir = makeTmpDir();
    fs.writeFileSync(path.join(dir, 'REPORT.md'), '# Legacy Report\n');
    const result = reportFilename(dir, 'SPRINT-15');
    expect(result).toBe(path.join(dir, 'SPRINT-15_REPORT.md'));
  });

  it('scenario 6: non-numeric sprint id returns plain REPORT.md', () => {
    // reportFilename(dir, 'SPRINT-TEST') returns <dir>/REPORT.md
    const dir = makeTmpDir();
    const result = reportFilename(dir, 'SPRINT-TEST');
    expect(result).toBe(path.join(dir, 'REPORT.md'));
  });

  it('scenario 7: non-numeric sprint id with forRead=true still returns plain REPORT.md', () => {
    // No numeric portion → forRead is irrelevant; always plain REPORT.md
    const dir = makeTmpDir();
    const result = reportFilename(dir, 'SPRINT-TEST', { forRead: true });
    expect(result).toBe(path.join(dir, 'REPORT.md'));
  });

  it('scenario 8: forRead=true with both files present — new-name wins', () => {
    // reportFilename(dir, 'SPRINT-19', { forRead: true }) with both files present
    // returns SPRINT-19_REPORT.md (new-name wins when present)
    const dir = makeTmpDir();
    fs.writeFileSync(path.join(dir, 'SPRINT-19_REPORT.md'), '# New Report\n');
    fs.writeFileSync(path.join(dir, 'REPORT.md'), '# Legacy Report\n');
    const result = reportFilename(dir, 'SPRINT-19', { forRead: true });
    expect(result).toBe(path.join(dir, 'SPRINT-19_REPORT.md'));
  });

});
