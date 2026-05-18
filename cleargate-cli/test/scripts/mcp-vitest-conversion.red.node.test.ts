/**
 * mcp-vitest-conversion.red.node.test.ts — STORY-028-05 QA-Red
 *
 * Repo-state assertion tests (RED phase) for STORY-028-05 mcp/ vitest → node:test conversion.
 *
 * These are NOT unit tests of production code. They assert desired post-conversion repo state:
 * - vitest.config.ts absent
 * - vitest devDep removed from mcp/package.json
 * - no `from 'vitest'` imports remain
 * - no `vi.*` mock patterns remain
 * - file count preserved (50 vitest .test.ts files → 50 .node.test.ts files)
 * - Dev report written at .cleargate/sprint-runs/SPRINT-28/reports/STORY-028-05-dev.md
 *
 * Gherkin scenarios covered (§2.1):
 *   Scenario: vitest.config.ts deleted
 *   Scenario: package.json clean (vitest devDep absent)
 *   Scenario: All 50 files renamed and converted (no vitest imports remaining)
 *   Scenario: All 50 files renamed and converted (no vi.* calls remaining)
 *   Scenario: All 50 files renamed and converted (file count preserved ≥ 50)
 *   Extra gate: Dev report attached (.cleargate/sprint-runs/SPRINT-28/reports/STORY-028-05-dev.md)
 *
 * BASELINE FAIL CONTRACT (clean baseline — mcp/ NOT YET converted, 2026-05-18):
 *   Test 1 FAILS: mcp/vitest.config.ts EXISTS.
 *   Test 2 FAILS: mcp/package.json has "vitest": "^2.1.0" in devDependencies.
 *   Test 3 FAILS: 50 files import from 'vitest' (grep finds matches).
 *   Test 4 FAILS: 95+ vi.* call sites found (grep finds matches).
 *   Test 5 FAILS: 0 *.node.test.ts files in mcp/src/ and mcp/scripts/ (only 18 in mcp/test/ which
 *                 are pre-existing; the 50 vitest files must become .node.test.ts post-conversion).
 *   Test 6 FAILS: dev report does not exist yet.
 *   Total BASELINE_FAIL: 6 tests.
 *
 * PATH RESOLUTION NOTE:
 *   mcp/ is a nested separate git repo (gitignored at outer repo level).
 *   It does NOT live inside the git-tracked worktree tree.
 *   We resolve its path via `git rev-parse --git-common-dir` from this file's directory,
 *   which yields the main repo's .git directory, and thus the main repo root
 *   where mcp/ physically resides: /path/to/ClearGate/mcp/.
 *
 * BASELINE COUNTS (captured 2026-05-18 before conversion):
 *   Pure vitest *.test.ts files (NOT *.node.test.ts): 50
 *   Existing *.node.test.ts files in mcp/test/: 18 (pre-existing, not converted by this story)
 *   Vitest import lines: 50
 *   vi.* call lines: 95+
 *   Expected post-conversion *.node.test.ts count (across whole mcp/): ≥ 68 (50 converted + 18 existing)
 *
 * IMMUTABILITY: sealed post-Red per CR-043. DO NOT EDIT after QA-Red returns this file.
 *
 * Runner: tsx --test (node:test)
 * Naming: *.red.node.test.ts (immutable post-Red)
 * Forbidden: DO NOT modify any file under mcp/.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ---- Path resolution ----
// This test lives in: <worktree-root>/cleargate-cli/test/scripts/
// mcp/ is gitignored (nested separate git repo) and NOT in the worktree tree.
// Resolve the main repo root via git rev-parse --git-common-dir.
function getMcpRoot(): string {
  const result = spawnSync('git', ['rev-parse', '--git-common-dir'], {
    cwd: __dirname,
    encoding: 'utf-8',
  });
  if (result.status !== 0) {
    throw new Error(
      `git rev-parse --git-common-dir failed: ${result.stderr}`,
    );
  }
  const gitCommonDir = result.stdout.trim();
  // gitCommonDir = /path/to/ClearGate/.git
  // main repo root = dirname(gitCommonDir)
  const mainRepoRoot = path.dirname(gitCommonDir);
  return path.join(mainRepoRoot, 'mcp');
}

const MCP_ROOT = getMcpRoot();

// Sprint run reports dir (relative to main repo root)
const SPRINT_REPORTS_DIR = path.join(
  path.dirname(getMcpRoot()),
  '.cleargate',
  'sprint-runs',
  'SPRINT-28',
  'reports',
);
const DEV_REPORT_PATH = path.join(SPRINT_REPORTS_DIR, 'STORY-028-05-dev.md');

// ---- Helper: shell grep (returns match count, 0 = no matches) ----
function shellGrepCount(pattern: string, dir: string, extraArgs: string[] = []): number {
  // Delete NODE_TEST_CONTEXT to avoid silent-skip in child process
  // (flashcard: 2026-05-04 #node-test #child-process)
  const env = { ...process.env };
  delete env['NODE_TEST_CONTEXT'];

  const result = spawnSync(
    'grep',
    ['-r', '-l', '--include=*.ts', pattern, dir, ...extraArgs],
    { encoding: 'utf-8', env },
  );
  // grep exit 0 = matches found, exit 1 = no matches, exit 2 = error
  if (result.status === 2) {
    throw new Error(`grep error: ${result.stderr}`);
  }
  if (result.status === 1 || !result.stdout.trim()) {
    return 0; // no matches
  }
  // Count matching FILES (one per line in -l output)
  return result.stdout.trim().split('\n').filter(Boolean).length;
}

// ---- Helper: count files matching a glob pattern using find ----
function findFileCount(dir: string, namePattern: string): number {
  const env = { ...process.env };
  delete env['NODE_TEST_CONTEXT'];

  const result = spawnSync(
    'find',
    [dir, '-name', namePattern],
    { encoding: 'utf-8', env },
  );
  if (result.status !== 0) {
    // find error — treat as 0 rather than throw (dir may not exist post-conversion)
    return 0;
  }
  return result.stdout.trim().split('\n').filter(Boolean).length;
}

// ---- Helper: count *.node.test.ts files in mcp/ excluding node_modules ----
function countNodeTestFiles(): number {
  const env = { ...process.env };
  delete env['NODE_TEST_CONTEXT'];

  // Use find + grep pipeline via shell to exclude node_modules
  const result = spawnSync(
    'bash',
    ['-c', `find "${MCP_ROOT}" -name "*.node.test.ts" | grep -v node_modules | wc -l`],
    { encoding: 'utf-8', env },
  );
  if (result.status !== 0) {
    return 0;
  }
  return parseInt(result.stdout.trim(), 10) || 0;
}

// ---- Test 1: vitest.config.ts ABSENT ----
describe('STORY-028-05 — mcp/ vitest.config.ts deleted', () => {
  it('mcp/vitest.config.ts does NOT exist (Scenario: vitest.config.ts deleted)', () => {
    const vitestConfigPath = path.join(MCP_ROOT, 'vitest.config.ts');
    assert.equal(
      fs.existsSync(vitestConfigPath),
      false,
      `FAIL: mcp/vitest.config.ts still exists at ${vitestConfigPath} — delete it as part of the conversion commit`,
    );
  });
});

// ---- Test 2: vitest devDep ABSENT from mcp/package.json ----
describe('STORY-028-05 — mcp/package.json vitest dep removed', () => {
  it('mcp/package.json does NOT contain vitest in devDependencies (Scenario: package.json clean)', () => {
    const pkgJsonPath = path.join(MCP_ROOT, 'package.json');
    assert.ok(
      fs.existsSync(pkgJsonPath),
      `mcp/package.json not found at ${pkgJsonPath}`,
    );
    const pkg = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf-8')) as Record<string, unknown>;
    const devDeps = (pkg['devDependencies'] ?? {}) as Record<string, unknown>;
    assert.equal(
      devDeps['vitest'],
      undefined,
      `FAIL: mcp/package.json still has vitest in devDependencies: "${devDeps['vitest']}" — remove it in the conversion commit`,
    );
  });

  it('mcp/package.json test script does NOT invoke vitest (Scenario: package.json clean)', () => {
    const pkgJsonPath = path.join(MCP_ROOT, 'package.json');
    const pkg = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf-8')) as Record<string, unknown>;
    const scripts = (pkg['scripts'] ?? {}) as Record<string, string>;
    const testScript = scripts['test'] ?? '';
    assert.equal(
      testScript.includes('vitest'),
      false,
      `FAIL: mcp/package.json "test" script still references vitest: "${testScript}" — update to node:test invocation`,
    );
  });
});

// ---- Test 3: no 'from vitest' imports remaining in mcp/ ----
describe('STORY-028-05 — no vitest imports remain in mcp/', () => {
  it("grep for `from 'vitest'` in mcp/ returns ZERO matches (Scenario: All 50 files renamed and converted)", () => {
    // Exclude node_modules via --exclude-dir
    const env = { ...process.env };
    delete env['NODE_TEST_CONTEXT'];

    const result = spawnSync(
      'bash',
      [
        '-c',
        `grep -r --include="*.ts" --exclude-dir=node_modules -l "from 'vitest'\\|from \\"vitest\\"" "${MCP_ROOT}" 2>/dev/null | wc -l`,
      ],
      { encoding: 'utf-8', env },
    );
    const matchCount = parseInt(result.stdout.trim(), 10) || 0;
    assert.equal(
      matchCount,
      0,
      `FAIL: ${matchCount} file(s) still import from 'vitest' in mcp/ — convert them to node:test imports`,
    );
  });
});

// ---- Test 4: no vi.* mock calls remaining in mcp/ ----
describe('STORY-028-05 — no vi.* mock patterns remain in mcp/', () => {
  it('grep for vi.(fn|mock|spyOn|stubGlobal|useFakeTimers|useRealTimers|advanceTimersByTime|hoisted) returns ZERO matches (Scenario: All 50 files renamed and converted)', () => {
    const env = { ...process.env };
    delete env['NODE_TEST_CONTEXT'];

    // Use extended regex (-E) to match the vi.* pattern
    const result = spawnSync(
      'bash',
      [
        '-c',
        `grep -r --include="*.ts" --exclude-dir=node_modules -El "\\bvi\\.(fn|mock|spyOn|stubGlobal|useFakeTimers|useRealTimers|advanceTimersByTime|hoisted)\\b" "${MCP_ROOT}" 2>/dev/null | wc -l`,
      ],
      { encoding: 'utf-8', env },
    );
    const matchCount = parseInt(result.stdout.trim(), 10) || 0;
    assert.equal(
      matchCount,
      0,
      `FAIL: ${matchCount} file(s) still contain vi.* mock patterns in mcp/ — replace with node:test equivalents (mock.fn(), mock.method(), etc.)`,
    );
  });
});

// ---- Test 5: file count preserved (50 vitest .test.ts → ≥ 50 .node.test.ts) ----
describe('STORY-028-05 — test file count preserved (no tests deleted)', () => {
  /**
   * BASELINE (captured 2026-05-18 before conversion):
   *   Pure vitest *.test.ts files (NOT *.node.test.ts): 50
   *     - mcp/src/**  : 47 files
   *     - mcp/scripts/: 5 files (2 in test/, 3 in commands/)
   *   Pre-existing *.node.test.ts files: 18 (all in mcp/test/)
   *   Total post-conversion: 50 converted .node.test.ts + 18 pre-existing = 68 minimum
   *
   * NOTE: test-glob fixture bleed (STORY-028-08 deferral) may cause a few extra
   * .node.test.ts files to appear — the assertion is ">= 68", not "== 68".
   *
   * The 50 pure vitest *.test.ts files MUST be gone (renamed to .node.test.ts):
   *   0 files matching *.test.ts (excluding *.node.test.ts or *.spec.ts) should remain.
   */
  it('count of *.node.test.ts files across mcp/ is >= 68 (50 converted + 18 pre-existing)', () => {
    const nodeTestCount = countNodeTestFiles();
    // Baseline: 18 pre-existing + 50 must-convert = 68 minimum
    assert.ok(
      nodeTestCount >= 68,
      `FAIL: only ${nodeTestCount} *.node.test.ts files found in mcp/ (expected >= 68). ` +
        'The 50 vitest .test.ts files have not been renamed to .node.test.ts yet.',
    );
  });

  it('zero pure vitest *.test.ts files remain in mcp/ after conversion', () => {
    // After conversion, only *.node.test.ts, *.spec.ts, *.integration.test.ts should exist.
    // A pure vitest .test.ts is any .test.ts file that does NOT end in .node.test.ts.
    // We check: (total *.test.ts count) - (*.node.test.ts count) == 0
    const env = { ...process.env };
    delete env['NODE_TEST_CONTEXT'];

    const allTestTsResult = spawnSync(
      'bash',
      [
        '-c',
        `find "${MCP_ROOT}" -name "*.test.ts" | grep -v node_modules | wc -l`,
      ],
      { encoding: 'utf-8', env },
    );
    const allTestTs = parseInt(allTestTsResult.stdout.trim(), 10) || 0;

    const nodeTestResult = spawnSync(
      'bash',
      [
        '-c',
        `find "${MCP_ROOT}" -name "*.node.test.ts" | grep -v node_modules | wc -l`,
      ],
      { encoding: 'utf-8', env },
    );
    const nodeTestTs = parseInt(nodeTestResult.stdout.trim(), 10) || 0;

    // Any .test.ts file that is NOT a .node.test.ts is a residual vitest file
    const pureVitestRemaining = allTestTs - nodeTestTs;
    assert.equal(
      pureVitestRemaining,
      0,
      `FAIL: ${pureVitestRemaining} pure vitest *.test.ts files still remain in mcp/ ` +
        `(total *.test.ts: ${allTestTs}, of which *.node.test.ts: ${nodeTestTs}). ` +
        'Rename all remaining .test.ts files to .node.test.ts after converting their imports.',
    );
  });
});

// ---- Test 6: Dev report exists ----
describe('STORY-028-05 — Dev report attached', () => {
  it('.cleargate/sprint-runs/SPRINT-28/reports/STORY-028-05-dev.md exists', () => {
    assert.ok(
      fs.existsSync(DEV_REPORT_PATH),
      `FAIL: Dev report not found at ${DEV_REPORT_PATH} — ` +
        'Developer must write this report as part of the story completion. ' +
        'It must include the manual-fix report summary and conversion statistics.',
    );
  });
});
