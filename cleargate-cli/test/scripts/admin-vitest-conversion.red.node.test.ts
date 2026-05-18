/**
 * admin-vitest-conversion.red.node.test.ts — STORY-028-07 QA-Red
 *
 * Repo-state assertion tests (RED phase) for STORY-028-07 admin/ vitest → node:test conversion.
 *
 * These are NOT unit tests of production code. They assert desired post-conversion repo state:
 * - admin/vitest.config.ts does NOT exist
 * - admin/package.json devDeps has no "vitest"
 * - admin/package.json test script invokes node:test (NOT vitest)
 * - @testing-library/svelte IS retained in admin/package.json devDeps
 * - no `from 'vitest'` imports remain in admin/src/ or admin/tests/
 * - no `vi.*` mock patterns remain in admin/src/ or admin/tests/
 * - count of *.node.test.ts files in admin/ >= 34 (pre-conversion baseline)
 * - Dev report written at .cleargate/sprint-runs/SPRINT-28/reports/STORY-028-07-dev.md
 *
 * Gherkin scenarios covered (§2.1):
 *   Scenario: vitest.config.ts deleted, package.json clean (except testing-library), npm test green
 *     (T1: vitest.config.ts absent, T2a: vitest devDep absent, T2b: test script node:test, T2c: @testing-library/svelte retained)
 *   Scenario: All 34 files converted
 *     (T3: no vitest imports, T4: no vi.* calls, T5: file count >= 34)
 *   Extra gate: Dev report attached (T6)
 *
 * EXCLUSIONS (apply lessons from -028-06 QA-Red flashcard):
 *   - Exclude *.red.node.test.ts files from T3/T4 grep scope (no self-reference).
 *   - Exclude node_modules/ from all grep/find operations.
 *
 * NOTE: The story spec refers to "admin/test/" and "admin/src/" but the actual directory
 * in the worktree is "admin/tests/" (plural). The grep and find searches cover both paths
 * to be safe, but the actual files are in admin/tests/unit/.
 *
 * BASELINE FAIL CONTRACT (clean baseline — admin/ NOT YET converted, 2026-05-18):
 *   T1  FAILS: admin/vitest.config.ts EXISTS (954 bytes, confirmed).
 *   T2a FAILS: admin/package.json has "vitest": "^2.1.0" in devDependencies.
 *   T2b FAILS: admin/package.json "test" script is "vitest run --config vitest.config.ts".
 *   T2c PASSES (vacuous pass — @testing-library/svelte ^5.2.7 is present today).
 *   T3  FAILS: 34 files import from 'vitest' in admin/tests/ (grep finds matches).
 *   T4  FAILS: 18 files contain vi.* mock patterns in admin/tests/.
 *   T5  FAILS: 0 *.node.test.ts files in admin/ (need >= 34).
 *   T6  FAILS: dev report does not exist yet.
 *   Total BASELINE_FAIL: 6 tests fail, T2c vacuous-passes.
 *
 * BASELINE COUNTS (captured 2026-05-18 before conversion):
 *   Pure vitest *.test.ts files in admin/tests/ (excl *.node.test.ts): 34
 *   Existing *.node.test.ts files in admin/: 0
 *   Files with `from 'vitest'` import: 34 (all test files)
 *   Files with vi.* mock patterns: 18
 *   vitest.config.ts: EXISTS at admin/vitest.config.ts
 *   test script: "vitest run --config vitest.config.ts"
 *   @testing-library/svelte: "^5.2.7" (present, must be retained)
 *
 * IMPORTANT — T2c vacuous-pass warning (flashcard 2026-05-18 #qa #red-test #vacuous-pass):
 *   T2c asserts @testing-library/svelte is present today and must still be present post-conversion.
 *   This is a non-mutation assertion — it passes now AND must pass after conversion.
 *   It is included as a regression guard, not as a flip-test. Confirmed NOT vacuous for T2c's
 *   intent: we are asserting the library is KEPT, not removed. The test is a retention check.
 *
 * IMMUTABILITY: sealed post-Red per CR-043. DO NOT EDIT after QA-Red returns this file.
 *
 * Runner: tsx --test (node:test)
 * Naming: *.red.node.test.ts (immutable post-Red)
 * Forbidden: DO NOT modify any file under admin/.
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
// admin/ is tracked IN the outer monorepo (NOT a nested repo like mcp/).
// Worktree layout: the worktree root contains admin/ as a sibling to cleargate-cli/.
//   __dirname = <worktree>/cleargate-cli/test/scripts
//   WORKTREE_ROOT = <worktree>
//   ADMIN_ROOT = <worktree>/admin
const WORKTREE_ROOT = path.resolve(__dirname, '..', '..', '..');
const ADMIN_ROOT = path.join(WORKTREE_ROOT, 'admin');

// Main repo root (worktrees share .git via git-common-dir — admin/ is in main repo, not nested)
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

// Sprint run reports dir (relative to main repo root)
const SPRINT_REPORTS_DIR = path.join(
  MAIN_REPO_ROOT,
  '.cleargate',
  'sprint-runs',
  'SPRINT-28',
  'reports',
);
const DEV_REPORT_PATH = path.join(SPRINT_REPORTS_DIR, 'STORY-028-07-dev.md');

// ---- Helpers ----

/** Run a bash command; return trimmed stdout. Throws on exit code 2+ (grep error). */
function bashCount(cmd: string): number {
  const env = { ...process.env };
  delete env['NODE_TEST_CONTEXT'];

  const result = spawnSync('bash', ['-c', cmd], { encoding: 'utf-8', env });
  // grep exit 2 = error; exit 0/1 are normal (matches/no-matches)
  if (result.status !== null && result.status >= 2) {
    throw new Error(`bash command error (exit ${result.status}): ${result.stderr}\nCmd: ${cmd}`);
  }
  return parseInt(result.stdout.trim(), 10) || 0;
}

// ---- Test 1: vitest.config.ts ABSENT ----
describe('STORY-028-07 — T1: admin/vitest.config.ts deleted', () => {
  it('admin/vitest.config.ts does NOT exist', () => {
    const vitestConfigPath = path.join(ADMIN_ROOT, 'vitest.config.ts');
    assert.equal(
      fs.existsSync(vitestConfigPath),
      false,
      `FAIL: admin/vitest.config.ts still exists at ${vitestConfigPath} ` +
        '— delete it as part of the conversion commit',
    );
  });
});

// ---- Test 2a: vitest devDep ABSENT ----
describe('STORY-028-07 — T2a: admin/package.json vitest devDep removed', () => {
  it('admin/package.json does NOT have vitest in devDependencies', () => {
    const pkgJsonPath = path.join(ADMIN_ROOT, 'package.json');
    assert.ok(
      fs.existsSync(pkgJsonPath),
      `admin/package.json not found at ${pkgJsonPath}`,
    );
    const pkg = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf-8')) as Record<string, unknown>;
    const devDeps = (pkg['devDependencies'] ?? {}) as Record<string, unknown>;
    assert.equal(
      devDeps['vitest'],
      undefined,
      `FAIL: admin/package.json still has vitest in devDependencies: "${devDeps['vitest']}" ` +
        '— remove it in the conversion commit',
    );
  });
});

// ---- Test 2b: test script invokes node:test (NOT vitest) ----
describe('STORY-028-07 — T2b: admin/package.json test script uses node:test runner', () => {
  it('admin/package.json "test" script does NOT contain "vitest"', () => {
    const pkgJsonPath = path.join(ADMIN_ROOT, 'package.json');
    const pkg = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf-8')) as Record<string, unknown>;
    const scripts = (pkg['scripts'] ?? {}) as Record<string, string>;
    const testScript = scripts['test'] ?? '';
    assert.equal(
      testScript.includes('vitest'),
      false,
      `FAIL: admin/package.json "test" script still references vitest: "${testScript}" ` +
        '— update to node:test invocation (e.g. npx tsx --test or node --test)',
    );
  });

  it('admin/package.json "test" script contains node:test runner invocation', () => {
    const pkgJsonPath = path.join(ADMIN_ROOT, 'package.json');
    const pkg = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf-8')) as Record<string, unknown>;
    const scripts = (pkg['scripts'] ?? {}) as Record<string, string>;
    const testScript = scripts['test'] ?? '';
    // Must reference either 'node:test', '--test', 'tsx --test', or similar
    const isNodeTest =
      testScript.includes('--test') ||
      testScript.includes('node:test') ||
      testScript.includes('tsx') && testScript.includes('test');
    assert.ok(
      isNodeTest,
      `FAIL: admin/package.json "test" script does not invoke node:test runner: "${testScript}" ` +
        '— must use tsx --test or node --test after conversion',
    );
  });
});

// ---- Test 2c: @testing-library/svelte IS retained ----
describe('STORY-028-07 — T2c: @testing-library/svelte retained in admin/package.json', () => {
  /**
   * Per story §1.2 step 5: "DO NOT remove @testing-library/svelte"
   * This library works with both runners; keep it.
   * BASELINE: @testing-library/svelte "^5.2.7" IS present today.
   * This is a RETENTION check — the library must survive the vitest devDep removal.
   */
  it('@testing-library/svelte is still present in admin/package.json devDependencies', () => {
    const pkgJsonPath = path.join(ADMIN_ROOT, 'package.json');
    const pkg = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf-8')) as Record<string, unknown>;
    const devDeps = (pkg['devDependencies'] ?? {}) as Record<string, unknown>;
    assert.ok(
      devDeps['@testing-library/svelte'] !== undefined,
      `FAIL: @testing-library/svelte was REMOVED from admin/package.json devDependencies ` +
        '— per story §1.2 step 5 this library MUST be kept (it works with both runners)',
    );
  });
});

// ---- Test 3: no 'from vitest' imports remaining in admin/ ----
describe("STORY-028-07 — T3: no `from 'vitest'` imports remain in admin/", () => {
  /**
   * Scope: admin/src/ + admin/tests/ (the actual test dir is "tests", not "test")
   * Exclusions:
   *   - node_modules/ (--exclude-dir=node_modules)
   *   - *.red.node.test.ts files (lesson from -028-06: no self-reference)
   */
  it("grep for `from 'vitest'` in admin/src/ and admin/tests/ returns ZERO matches", () => {
    // Search both admin/src/ and admin/tests/ (also admin/test/ if present, for resilience)
    const matchCount = bashCount(
      `grep -r --include="*.ts" --include="*.svelte" ` +
        `--exclude-dir=node_modules ` +
        `-l "from 'vitest'\\|from \\"vitest\\"" "${ADMIN_ROOT}" 2>/dev/null ` +
        `| grep -v "\\.red\\.node\\.test\\.ts" ` +
        `| wc -l`,
    );
    assert.equal(
      matchCount,
      0,
      `FAIL: ${matchCount} file(s) still import from 'vitest' in admin/ ` +
        '— convert them to node:test imports (import { describe, it } from "node:test")',
    );
  });
});

// ---- Test 4: no vi.* mock calls remaining in admin/ ----
describe('STORY-028-07 — T4: no vi.* mock patterns remain in admin/', () => {
  /**
   * Pattern: vi.(fn|mock|spyOn|stubGlobal|useFakeTimers|useRealTimers|advanceTimersByTime)
   * Per story §2.1 validation gate: also covers vi.hoisted.
   * Scope: admin/src/ + admin/tests/
   * Exclusions:
   *   - node_modules/
   *   - *.red.node.test.ts files (no self-reference)
   */
  it('grep for vi.(fn|mock|spyOn|...) in admin/ returns ZERO matches', () => {
    const matchCount = bashCount(
      `grep -r --include="*.ts" --include="*.svelte" ` +
        `--exclude-dir=node_modules ` +
        `-El "\\bvi\\.(fn|mock|spyOn|stubGlobal|useFakeTimers|useRealTimers|advanceTimersByTime|hoisted)\\b" "${ADMIN_ROOT}" 2>/dev/null ` +
        `| grep -v "\\.red\\.node\\.test\\.ts" ` +
        `| wc -l`,
    );
    assert.equal(
      matchCount,
      0,
      `FAIL: ${matchCount} file(s) still contain vi.* mock patterns in admin/ ` +
        '— replace with node:test equivalents (mock.fn(), mock.method(), etc.)',
    );
  });
});

// ---- Test 5: *.node.test.ts count in admin/ >= 34 ----
describe('STORY-028-07 — T5: test file count preserved (>= 34 *.node.test.ts in admin/)', () => {
  /**
   * BASELINE (captured 2026-05-18 before conversion):
   *   Pure vitest *.test.ts files in admin/tests/unit/: 34
   *     (includes TokenIssuedModal.cr061.red.test.ts which is NOT a node.test.ts)
   *   Existing *.node.test.ts files in admin/: 0
   *   Expected post-conversion: >= 34 *.node.test.ts files
   *
   * Search scope: admin/ tree excluding node_modules.
   * Exclusion: *.red.node.test.ts files (this file lives in cleargate-cli/, not admin/,
   *   so self-exclusion is moot here — but we apply it defensively to admin/ scope too).
   *
   * NOTE: TokenIssuedModal.cr061.red.test.ts (a vitest-format Red file from an earlier CR)
   * will need to be handled by the Developer — either converted or excluded.
   * The >= 34 threshold counts all *.node.test.ts files in admin/ post-conversion.
   */
  it('count of *.node.test.ts files in admin/ (excl node_modules) is >= 34', () => {
    const nodeTestCount = bashCount(
      `find "${ADMIN_ROOT}" -name "*.node.test.ts" | grep -v node_modules | wc -l`,
    );
    assert.ok(
      nodeTestCount >= 34,
      `FAIL: only ${nodeTestCount} *.node.test.ts files found in admin/ (expected >= 34). ` +
        'The 34 vitest .test.ts files in admin/tests/unit/ have not been renamed yet.',
    );
  });

  it('zero pure vitest *.test.ts files remain in admin/ after conversion', () => {
    // Total *.test.ts - *.node.test.ts = residual vitest files
    const allTestTs = bashCount(
      `find "${ADMIN_ROOT}" -name "*.test.ts" | grep -v node_modules | wc -l`,
    );
    const nodeTestTs = bashCount(
      `find "${ADMIN_ROOT}" -name "*.node.test.ts" | grep -v node_modules | wc -l`,
    );

    // Any .test.ts that is NOT a .node.test.ts is a residual (non-converted) file.
    // Note: TokenIssuedModal.cr061.red.test.ts ends in .red.test.ts (not .test.ts directly
    // for node:test purposes) — it IS a *.test.ts file and will count as residual until
    // the Developer handles it (convert or retire).
    const pureVitestRemaining = allTestTs - nodeTestTs;
    assert.equal(
      pureVitestRemaining,
      0,
      `FAIL: ${pureVitestRemaining} pure vitest *.test.ts files still remain in admin/ ` +
        `(total *.test.ts: ${allTestTs}, of which *.node.test.ts: ${nodeTestTs}). ` +
        'Rename all remaining .test.ts files to .node.test.ts after converting their imports. ' +
        'Note: admin/tests/unit/TokenIssuedModal.cr061.red.test.ts also counts here.',
    );
  });
});

// ---- Test 6: Dev report exists ----
describe('STORY-028-07 — T6: Dev report attached', () => {
  it('.cleargate/sprint-runs/SPRINT-28/reports/STORY-028-07-dev.md exists', () => {
    assert.ok(
      fs.existsSync(DEV_REPORT_PATH),
      `FAIL: Dev report not found at ${DEV_REPORT_PATH} — ` +
        'Developer must write this report as part of the story completion. ' +
        'It must include the svelte compat preflight result, manual-fix report summary, ' +
        'and conversion statistics (34 files converted).',
    );
  });
});
