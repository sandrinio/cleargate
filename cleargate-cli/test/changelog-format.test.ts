/**
 * STORY-016-03: CHANGELOG.md format + tarball inclusion tests
 * Four scenarios matching Gherkin §2.1
 */
import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { execSync } from 'node:child_process';

// Resolve paths relative to this test file:
// cleargate-cli/test/ -> cleargate-cli/ -> repo root
const cliDir = path.resolve(__dirname, '..');
const repoRoot = path.resolve(cliDir, '..');
const changelogPath = path.join(cliDir, 'CHANGELOG.md');
const packageJsonPath = path.join(cliDir, 'package.json');

/** Common-Changelog heading regex — single source of truth */
const HEADING_RE = /^## \[(\d+\.\d+\.\d+)\] — \d{4}-\d{2}-\d{2}$/m;
const HEADING_RE_ALL = /^## \[(\d+\.\d+\.\d+)\] — \d{4}-\d{2}-\d{2}$/gm;

describe('CHANGELOG.md format contract (STORY-016-03)', () => {
  it('Scenario: CHANGELOG exists and parses — at least one ## [X.Y.Z] heading found, no parse error', () => {
    expect(() => fs.accessSync(changelogPath)).not.toThrow();
    const contents = fs.readFileSync(changelogPath, 'utf-8');
    expect(contents).toBeTruthy();
    const match = HEADING_RE.test(contents);
    expect(match).toBe(true);
  });

  it('Scenario: Topmost version matches package.json — first ## [X.Y.Z] heading equals package.json version', () => {
    const contents = fs.readFileSync(changelogPath, 'utf-8');
    const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8')) as { version: string };
    const packageVersion = pkg.version;

    const allMatches = [...contents.matchAll(HEADING_RE_ALL)];
    expect(allMatches.length).toBeGreaterThan(0);

    const topmostVersion = allMatches[0][1];
    expect(topmostVersion).toBe(packageVersion);
  });

  it('Scenario: Versions descending — each ## [X.Y.Z] heading is strictly less than its predecessor by semver', () => {
    const contents = fs.readFileSync(changelogPath, 'utf-8');
    const allMatches = [...contents.matchAll(HEADING_RE_ALL)];
    expect(allMatches.length).toBeGreaterThan(1);

    const versions = allMatches.map(m => m[1]);

    for (let i = 1; i < versions.length; i++) {
      const prev = versions[i - 1].split('.').map(Number);
      const curr = versions[i].split('.').map(Number);
      const prevGtCurr = compareSemverParts(prev, curr) > 0;
      expect(prevGtCurr).toBe(true);
    }
  });

  it('Scenario: Tarball includes CHANGELOG — npm pack --dry-run output lists CHANGELOG.md', () => {
    const output = execSync(
      'npm pack --workspace=cleargate-cli --dry-run 2>&1',
      { cwd: repoRoot, encoding: 'utf-8' },
    );
    expect(output).toMatch(/CHANGELOG\.md/);
  });
});

/** Compare two semver arrays [major, minor, patch]. Returns >0 if a > b, <0 if a < b, 0 if equal. */
function compareSemverParts(a: number[], b: number[]): number {
  for (let i = 0; i < 3; i++) {
    if ((a[i] ?? 0) !== (b[i] ?? 0)) {
      return (a[i] ?? 0) - (b[i] ?? 0);
    }
  }
  return 0;
}
