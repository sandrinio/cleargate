/**
 * Tests for the Red-test immutability check in pre-commit-surface-gate.sh (CR-043).
 *
 * Scenarios:
 * 1. Dev commit modifying *.red.node.test.ts after qa-red commit on story branch → REJECTED (exit 1)
 * 2. Dev commit modifying *.red.node.test.ts with SKIP_RED_GATE=1 → ALLOWED (exit 0)
 * 3. Dev commit on non-story branch (main) → ALLOWED (delegates to file_surface_diff.sh, exits 0)
 * 4. Dev commit modifying *.red.node.test.ts when NO qa-red commit exists yet → ALLOWED (exit 0)
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import {
  execFileSync,
  execSync,
  spawnSync,
  type SpawnSyncReturns,
} from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync, mkdirSync, chmodSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const HOOK_PATH = join(
  __dirname,
  '..',
  '..',
  '..',
  'cleargate-planning',
  '.claude',
  'hooks',
  'pre-commit-surface-gate.sh'
);

/** Create a minimal git repo in a tmpdir, configure it, and return its path. */
function createGitRepo(): string {
  const dir = mkdtempSync(join(tmpdir(), 'cg-red-gate-test-'));
  execSync('git init', { cwd: dir, stdio: 'pipe' });
  execSync('git config user.email "test@cleargate.test"', { cwd: dir, stdio: 'pipe' });
  execSync('git config user.name "ClearGate Test"', { cwd: dir, stdio: 'pipe' });
  execSync('git config commit.gpgsign false', { cwd: dir, stdio: 'pipe' });
  // Create initial commit on main
  writeFileSync(join(dir, 'README.md'), '# test\n');
  execSync('git add README.md', { cwd: dir, stdio: 'pipe' });
  execSync('git commit -m "chore: init"', { cwd: dir, stdio: 'pipe' });
  return dir;
}

/** Run the hook script in the given cwd with optional env overrides. */
function runHook(
  cwd: string,
  env: Record<string, string> = {}
): SpawnSyncReturns<Buffer> {
  return spawnSync('bash', [HOOK_PATH], {
    cwd,
    env: {
      ...process.env,
      ...env,
      // Suppress file_surface_diff.sh delegation (not present in fixture)
      HOME: cwd,
    },
    timeout: 10_000,
  });
}

describe('pre-commit-surface-gate.sh — Red-test immutability (CR-043)', () => {
  let repoDir: string;

  before(() => {
    repoDir = createGitRepo();
  });

  after(() => {
    rmSync(repoDir, { recursive: true, force: true });
  });

  it('rejects Dev commit modifying *.red.node.test.ts after qa-red commit on story branch', () => {
    // Set up a fresh story branch in the same repo
    const dir = createGitRepo();
    try {
      // Cut story branch
      execSync('git checkout -b story/STORY-999-01', { cwd: dir, stdio: 'pipe' });

      // Simulate QA-Red commit: add a *.red.node.test.ts file
      mkdirSync(join(dir, 'test'), { recursive: true });
      writeFileSync(join(dir, 'test', 'calc.red.node.test.ts'), '// red test\n');
      execSync('git add test/calc.red.node.test.ts', { cwd: dir, stdio: 'pipe' });
      execSync('git commit -m "qa-red(STORY-999-01): write failing tests"', {
        cwd: dir,
        stdio: 'pipe',
      });

      // Now Dev modifies the Red test file (bad — should be rejected)
      writeFileSync(join(dir, 'test', 'calc.red.node.test.ts'), '// modified by dev\n');
      execSync('git add test/calc.red.node.test.ts', { cwd: dir, stdio: 'pipe' });

      const result = runHook(dir);
      assert.strictEqual(
        result.status,
        1,
        `Expected exit 1 (reject) but got ${result.status}. stderr: ${result.stderr.toString()}`
      );
      assert.ok(
        result.stderr.toString().includes('REJECT'),
        `Expected REJECT in stderr. Got: ${result.stderr.toString()}`
      );
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('allows Dev commit modifying *.red.node.test.ts when SKIP_RED_GATE=1 set', () => {
    const dir = createGitRepo();
    try {
      execSync('git checkout -b story/STORY-999-02', { cwd: dir, stdio: 'pipe' });

      // QA-Red commit
      mkdirSync(join(dir, 'test'), { recursive: true });
      writeFileSync(join(dir, 'test', 'calc.red.node.test.ts'), '// red test\n');
      execSync('git add test/calc.red.node.test.ts', { cwd: dir, stdio: 'pipe' });
      execSync('git commit -m "qa-red(STORY-999-02): write failing tests"', {
        cwd: dir,
        stdio: 'pipe',
      });

      // Dev modifies the Red test file with SKIP_RED_GATE=1
      writeFileSync(join(dir, 'test', 'calc.red.node.test.ts'), '// bypass allowed\n');
      execSync('git add test/calc.red.node.test.ts', { cwd: dir, stdio: 'pipe' });

      const result = runHook(dir, { SKIP_RED_GATE: '1' });
      // file_surface_diff.sh is absent, so hook exits 0 via the "not found" branch
      assert.strictEqual(
        result.status,
        0,
        `Expected exit 0 (bypass) but got ${result.status}. stderr: ${result.stderr.toString()}`
      );
      assert.ok(
        result.stderr.toString().includes('BYPASS'),
        `Expected BYPASS in stderr. Got: ${result.stderr.toString()}`
      );
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('allows Dev commit on non-story branch (main) — red gate does not apply', () => {
    const dir = createGitRepo();
    try {
      // Stay on main (not a story/* branch)
      mkdirSync(join(dir, 'test'), { recursive: true });
      writeFileSync(join(dir, 'test', 'something.red.node.test.ts'), '// red test\n');
      execSync('git add test/something.red.node.test.ts', { cwd: dir, stdio: 'pipe' });
      execSync('git commit -m "chore: add red test on main"', { cwd: dir, stdio: 'pipe' });

      // Now modify it on main — should not be blocked (not a story branch)
      writeFileSync(join(dir, 'test', 'something.red.node.test.ts'), '// updated\n');
      execSync('git add test/something.red.node.test.ts', { cwd: dir, stdio: 'pipe' });

      const result = runHook(dir);
      // file_surface_diff.sh absent → exits 0
      assert.strictEqual(
        result.status,
        0,
        `Expected exit 0 (non-story branch, not blocked) but got ${result.status}. stderr: ${result.stderr.toString()}`
      );
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('allows Dev commit modifying *.red.node.test.ts when NO qa-red commit exists yet', () => {
    const dir = createGitRepo();
    try {
      execSync('git checkout -b story/STORY-999-03', { cwd: dir, stdio: 'pipe' });

      // No qa-red commit has landed yet — Dev is still building
      mkdirSync(join(dir, 'test'), { recursive: true });
      writeFileSync(join(dir, 'test', 'calc.red.node.test.ts'), '// red test placeholder\n');
      execSync('git add test/calc.red.node.test.ts', { cwd: dir, stdio: 'pipe' });
      execSync('git commit -m "feat: initial impl"', { cwd: dir, stdio: 'pipe' });

      // Dev now modifies the file — no qa-red commit on branch, so allowed
      writeFileSync(join(dir, 'test', 'calc.red.node.test.ts'), '// updated before qa-red\n');
      execSync('git add test/calc.red.node.test.ts', { cwd: dir, stdio: 'pipe' });

      const result = runHook(dir);
      // file_surface_diff.sh absent → exits 0
      assert.strictEqual(
        result.status,
        0,
        `Expected exit 0 (no qa-red commit yet, allowed) but got ${result.status}. stderr: ${result.stderr.toString()}`
      );
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
