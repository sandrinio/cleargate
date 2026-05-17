/**
 * cli-vitest-conversion.red.node.test.ts — STORY-028-06 QA-Red
 *
 * Repo-state assertion tests (RED phase) for STORY-028-06 cleargate-cli/ vitest → node:test
 * conversion.
 *
 * These are NOT unit tests of production code. They assert desired post-conversion repo state:
 * - vitest.config.ts absent from cleargate-cli/
 * - vitest devDep removed from cleargate-cli/package.json
 * - test script uses node:test with --test-concurrency=1 --experimental-test-module-mocks
 * - no `from 'vitest'` imports remain (excl examples/ and test/fixtures/)
 * - no `vi.*` mock patterns remain (excl examples/ and test/fixtures/)
 * - file count preserved (≥ 187 total: 49 existing node:test + 138 converted)
 * - Dev report written at .cleargate/sprint-runs/SPRINT-28/reports/STORY-028-06-dev.md
 *
 * Gherkin scenarios covered (§2.1):
 *   Scenario: All 138 files converted
 *     (T3: no vitest imports, T5: file count ≥ 187)
 *   Scenario: vitest.config.ts deleted, package.json clean, npm test green
 *     (T1: config absent, T2a: vitest devDep absent, T2b: test script flags correct, T4: vi.* absent)
 *   Extra gate: Dev report attached (T6)
 *
 * EXCLUSIONS (flashcard 2026-05-04 #fixtures #sprint-22):
 *   cleargate-cli/examples/ — intentionally-failing Red examples; excluded from grep scope.
 *   cleargate-cli/test/fixtures/ — codemod fixture pairs; excluded (flagged for STORY-028-08 glob fix).
 *
 * BASELINE FAIL CONTRACT (clean baseline — cleargate-cli/ NOT YET converted, 2026-05-18):
 *   T1  FAILS: cleargate-cli/vitest.config.ts EXISTS.
 *   T2a FAILS: cleargate-cli/package.json has "vitest": "^2.1.0" in devDependencies.
 *   T2b FAILS: test script is "tsx --test --test-reporter=spec 'test/**\/*.node.test.ts'"
 *              (missing --test-concurrency=1 --experimental-test-module-mocks).
 *   T3  FAILS: 140 files import from 'vitest' (grep finds matches in src/ test/ scripts/, excl fixtures/examples/).
 *   T4  FAILS: 22 files contain vi.* mock patterns (same scope).
 *   T5  FAILS: only 40 *.node.test.ts files in cleargate-cli/test/ excl fixtures (need ≥ 187).
 *   T6  FAILS: dev report does not exist yet.
 *   Total BASELINE_FAIL: 7 tests.
 *
 * BASELINE COUNTS (captured 2026-05-18 before conversion):
 *   Pure vitest *.test.ts files in test/ (excl fixtures): 137
 *   Existing *.node.test.ts files in test/ (excl fixtures): 40 pre-existing
 *   vitest import lines (files): 140 in src/+test/+scripts/ excl examples/ + fixtures/
 *   vi.* call lines (files): 22 in same scope
 *   Expected post-conversion *.node.test.ts count (excl fixtures): ≥ 187
 *     (40 pre-existing + 138 story-spec target = 178 minimum per story spec;
 *      we use 187 conservatively accounting for spec files: 49 original node:test + 138 converted)
 *
 * IMMUTABILITY: sealed post-Red per CR-043. DO NOT EDIT after QA-Red returns this file.
 *
 * Runner: tsx --test (node:test)
 * Naming: *.red.node.test.ts (immutable post-Red)
 * Forbidden: DO NOT modify any file under cleargate-cli/src/ or cleargate-cli/scripts/.
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
// Worktree layout: cleargate-cli/ is a subdirectory of the worktree root.
// We resolve cleargate-cli/ as two directories up from __dirname:
//   __dirname = <worktree>/cleargate-cli/test/scripts
//   CLI_ROOT  = <worktree>/cleargate-cli
const CLI_ROOT = path.resolve(__dirname, '..', '..');

// Main repo root (worktrees share .git via git-common-dir)
function getMainRepoRoot(): string {
  const result = spawnSync('git', ['rev-parse', '--git-common-dir'], {
    cwd: __dirname,
    encoding: 'utf-8',
  });
  if (result.status !== 0) {
    throw new Error(`git rev-parse --git-common-dir failed: ${result.stderr}`);
  }
  const gitCommonDir = result.stdout.trim();
  // gitCommonDir = /path/to/ClearGate/.git
  return path.dirname(gitCommonDir);
}

const MAIN_REPO_ROOT = getMainRepoRoot();
const SPRINT_REPORTS_DIR = path.join(
  MAIN_REPO_ROOT,
  '.cleargate',
  'sprint-runs',
  'SPRINT-28',
  'reports',
);
const DEV_REPORT_PATH = path.join(SPRINT_REPORTS_DIR, 'STORY-028-06-dev.md');

// ---- Helper: shell grep returning file count ----
// Returns the count of FILES matching the pattern (0 = no matches).
function shellGrepFileCount(
  pattern: string,
  dirs: string[],
  extraArgs: string[] = [],
): number {
  const env = { ...process.env };
  delete env['NODE_TEST_CONTEXT'];

  const result = spawnSync(
    'grep',
    ['-r', '-l', '--include=*.ts', pattern, ...dirs, ...extraArgs],
    { encoding: 'utf-8', env },
  );
  // grep exit 0 = matches found, exit 1 = no matches, exit 2 = error
  if (result.status === 2) {
    throw new Error(`grep error: ${result.stderr}`);
  }
  if (result.status === 1 || !result.stdout.trim()) {
    return 0;
  }
  return result.stdout.trim().split('\n').filter(Boolean).length;
}

// ---- Helper: count *.node.test.ts files in cleargate-cli/test/ excl fixtures ----
function countNodeTestFiles(): number {
  const env = { ...process.env };
  delete env['NODE_TEST_CONTEXT'];

  const testDir = path.join(CLI_ROOT, 'test');
  const result = spawnSync(
    'bash',
    [
      '-c',
      `find "${testDir}" -name "*.node.test.ts" | grep -v "fixtures" | wc -l`,
    ],
    { encoding: 'utf-8', env },
  );
  if (result.status !== 0) {
    return 0;
  }
  return parseInt(result.stdout.trim(), 10) || 0;
}

// ---- T1: vitest.config.ts ABSENT from cleargate-cli/ ----
describe('STORY-028-06 — cleargate-cli/vitest.config.ts deleted', () => {
  it('cleargate-cli/vitest.config.ts does NOT exist', () => {
    const vitestConfigPath = path.join(CLI_ROOT, 'vitest.config.ts');
    assert.equal(
      fs.existsSync(vitestConfigPath),
      false,
      `FAIL: cleargate-cli/vitest.config.ts still exists at ${vitestConfigPath} — ` +
        'delete it as part of the conversion commit.',
    );
  });
});

// ---- T2a: vitest devDep ABSENT from cleargate-cli/package.json ----
// ---- T2b: test script has --test-concurrency=1 --experimental-test-module-mocks ----
describe('STORY-028-06 — cleargate-cli/package.json vitest dep removed + test script updated', () => {
  it('cleargate-cli/package.json does NOT contain vitest in devDependencies (T2a)', () => {
    const pkgJsonPath = path.join(CLI_ROOT, 'package.json');
    assert.ok(
      fs.existsSync(pkgJsonPath),
      `cleargate-cli/package.json not found at ${pkgJsonPath}`,
    );
    const pkg = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf-8')) as Record<string, unknown>;
    const devDeps = (pkg['devDependencies'] ?? {}) as Record<string, unknown>;
    assert.equal(
      devDeps['vitest'],
      undefined,
      `FAIL: cleargate-cli/package.json still has vitest in devDependencies: ` +
        `"${devDeps['vitest']}" — remove it in the conversion commit.`,
    );
  });

  it(
    'cleargate-cli/package.json "test" script includes --test-concurrency=1 ' +
      '--experimental-test-module-mocks (T2b — STORY-028-05-arch-1 inherited baseline)',
    () => {
      const pkgJsonPath = path.join(CLI_ROOT, 'package.json');
      const pkg = JSON.parse(
        fs.readFileSync(pkgJsonPath, 'utf-8'),
      ) as Record<string, unknown>;
      const scripts = (pkg['scripts'] ?? {}) as Record<string, string>;
      const testScript = scripts['test'] ?? '';

      assert.ok(
        testScript.includes('--test-concurrency=1'),
        `FAIL: cleargate-cli/package.json "test" script is missing --test-concurrency=1.\n` +
          `Current: "${testScript}"\n` +
          'Expected: tsx --test --test-concurrency=1 --experimental-test-module-mocks ...',
      );

      assert.ok(
        testScript.includes('--experimental-test-module-mocks'),
        `FAIL: cleargate-cli/package.json "test" script is missing --experimental-test-module-mocks.\n` +
          `Current: "${testScript}"\n` +
          'Expected: tsx --test --test-concurrency=1 --experimental-test-module-mocks ...',
      );

      // Must NOT still reference vitest
      assert.equal(
        testScript.includes('vitest'),
        false,
        `FAIL: cleargate-cli/package.json "test" script still references vitest: "${testScript}" — ` +
          'update to node:test invocation.',
      );
    },
  );
});

// ---- T3: no `from 'vitest'` imports remain (excl examples/ and test/fixtures/) ----
describe("STORY-028-06 — no vitest imports remain in cleargate-cli/ (excl examples + fixtures)", () => {
  it(
    "grep for `from 'vitest'` in cleargate-cli/src/ test/ scripts/ returns ZERO matches " +
      '(Scenario: All 138 files converted) — excludes examples/ and test/fixtures/',
    () => {
      const env = { ...process.env };
      delete env['NODE_TEST_CONTEXT'];

      const srcDir = path.join(CLI_ROOT, 'src');
      const testDir = path.join(CLI_ROOT, 'test');
      const scriptsDir = path.join(CLI_ROOT, 'scripts');

      // Use bash to exclude examples/ and test/fixtures/
      const result = spawnSync(
        'bash',
        [
          '-c',
          `grep -r --include="*.ts" -l "from 'vitest'\\|from \\"vitest\\"" ` +
            `"${srcDir}" "${testDir}" "${scriptsDir}" 2>/dev/null ` +
            `| grep -v "/examples/" | grep -v "/test/fixtures/" | wc -l`,
        ],
        { encoding: 'utf-8', env },
      );

      const matchCount = parseInt(result.stdout.trim(), 10) || 0;
      assert.equal(
        matchCount,
        0,
        `FAIL: ${matchCount} file(s) still import from 'vitest' in cleargate-cli/ ` +
          "(excluding examples/ and test/fixtures/) — " +
          'convert them to node:test imports.',
      );
    },
  );
});

// ---- T4: no vi.* mock patterns remain (excl examples/ and test/fixtures/) ----
describe('STORY-028-06 — no vi.* mock patterns remain in cleargate-cli/ (excl examples + fixtures)', () => {
  it(
    'grep for vi.(fn|mock|spyOn|stubGlobal|useFakeTimers|useRealTimers|advanceTimersByTime|hoisted) ' +
      'returns ZERO matches (Scenario: vitest.config.ts deleted, package.json clean) — ' +
      'excludes examples/ and test/fixtures/',
    () => {
      const env = { ...process.env };
      delete env['NODE_TEST_CONTEXT'];

      const srcDir = path.join(CLI_ROOT, 'src');
      const testDir = path.join(CLI_ROOT, 'test');
      const scriptsDir = path.join(CLI_ROOT, 'scripts');

      const result = spawnSync(
        'bash',
        [
          '-c',
          `grep -rE --include="*.ts" -l ` +
            `"\\bvi\\.(fn|mock|spyOn|stubGlobal|useFakeTimers|useRealTimers|advanceTimersByTime|hoisted)\\b" ` +
            `"${srcDir}" "${testDir}" "${scriptsDir}" 2>/dev/null ` +
            `| grep -v "/examples/" | grep -v "/test/fixtures/" | wc -l`,
        ],
        { encoding: 'utf-8', env },
      );

      const matchCount = parseInt(result.stdout.trim(), 10) || 0;
      assert.equal(
        matchCount,
        0,
        `FAIL: ${matchCount} file(s) still contain vi.* mock patterns in cleargate-cli/ ` +
          "(excluding examples/ and test/fixtures/) — " +
          'replace with node:test equivalents (mock.fn(), mock.method(), mock.module(), etc.).',
      );
    },
  );
});

// ---- T5: *.node.test.ts file count ≥ 187 in cleargate-cli/test/ (excl fixtures) ----
describe('STORY-028-06 — test file count preserved (≥ 187 *.node.test.ts excl fixtures)', () => {
  /**
   * BASELINE (captured 2026-05-18 before conversion):
   *   Pre-existing *.node.test.ts in test/ (excl fixtures): 40
   *   Pure vitest *.test.ts in test/ (excl fixtures, excl *.node.test.ts): 137
   *   After conversion, 137 → *.node.test.ts, plus the spec files in scope: 1 *.spec.ts found
   *   Story spec says: 138 files total → post-conversion ≥ 138 converted + 49 pre-existing = 187
   *   (The story references "49 existing node:test" from the context_source claim; we use 187
   *    as the threshold which equals the dispatch instruction's stated sum.)
   *
   * NOTE: This assertion uses ">= 187" not "== 187" to allow for
   *   (a) fixtures being excluded by the grep filter (correct),
   *   (b) any extra .node.test.ts files added by other stories in the sprint.
   */
  it(
    'count of *.node.test.ts files in cleargate-cli/test/ (excl fixtures) is >= 187 ' +
      '(49 pre-existing + 138 converted)',
    () => {
      const nodeTestCount = countNodeTestFiles();
      assert.ok(
        nodeTestCount >= 187,
        `FAIL: only ${nodeTestCount} *.node.test.ts files found in cleargate-cli/test/ ` +
          '(excluding fixtures) — expected >= 187. ' +
          'The 138 vitest .test.ts/.spec.ts files have not been converted to ' +
          '.node.test.ts yet.',
      );
    },
  );

  it(
    'zero pure vitest *.test.ts files remain in cleargate-cli/test/ (excl fixtures) after conversion',
    () => {
      const env = { ...process.env };
      delete env['NODE_TEST_CONTEXT'];

      const testDir = path.join(CLI_ROOT, 'test');

      // All *.test.ts including *.node.test.ts (excl fixtures)
      const allResult = spawnSync(
        'bash',
        [
          '-c',
          `find "${testDir}" -name "*.test.ts" | grep -v "fixtures" | wc -l`,
        ],
        { encoding: 'utf-8', env },
      );
      const allTestTs = parseInt(allResult.stdout.trim(), 10) || 0;

      // *.node.test.ts (excl fixtures)
      const nodeResult = spawnSync(
        'bash',
        [
          '-c',
          `find "${testDir}" -name "*.node.test.ts" | grep -v "fixtures" | wc -l`,
        ],
        { encoding: 'utf-8', env },
      );
      const nodeTestTs = parseInt(nodeResult.stdout.trim(), 10) || 0;

      // Also check *.spec.ts files — these should become *.node.test.ts too
      const specResult = spawnSync(
        'bash',
        [
          '-c',
          `find "${testDir}" -name "*.spec.ts" | grep -v "fixtures" | wc -l`,
        ],
        { encoding: 'utf-8', env },
      );
      const specTs = parseInt(specResult.stdout.trim(), 10) || 0;

      // Pure vitest remaining = *.test.ts that are NOT *.node.test.ts
      const pureVitestTestRemaining = allTestTs - nodeTestTs;
      // *.spec.ts should also be gone post-conversion
      const totalVitestRemaining = pureVitestTestRemaining + specTs;

      assert.equal(
        totalVitestRemaining,
        0,
        `FAIL: ${totalVitestRemaining} pure vitest test files still remain in ` +
          `cleargate-cli/test/ (excl fixtures) — ` +
          `pure *.test.ts (non-node): ${pureVitestTestRemaining}, *.spec.ts: ${specTs}. ` +
          `(total *.test.ts: ${allTestTs}, of which *.node.test.ts: ${nodeTestTs}). ` +
          'Rename all remaining vitest files to .node.test.ts after converting their imports.',
      );
    },
  );
});

// ---- T6: Dev report exists ----
describe('STORY-028-06 — Dev report attached', () => {
  it('.cleargate/sprint-runs/SPRINT-28/reports/STORY-028-06-dev.md exists', () => {
    assert.ok(
      fs.existsSync(DEV_REPORT_PATH),
      `FAIL: Dev report not found at ${DEV_REPORT_PATH} — ` +
        'Developer must write this report as part of the story completion. ' +
        'It must include the manual-fix report summary and conversion statistics.',
    );
  });
});
