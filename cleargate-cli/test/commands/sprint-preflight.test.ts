/**
 * sprint-preflight.test.ts — 8 fixture-driven tests for `cleargate sprint preflight`.
 *
 * STORY-025-02: CR-021 Gate 3 Sprint Execution preflight subcommand.
 *
 * Uses real `git init` under os.tmpdir() — no mocks per CLAUDE.md "Real infra"
 * rule (SPRINT-01 flashcard). The `execFn` test seam routes git commands into
 * the fixture repo, which is a real git repository.
 *
 * Worker hygiene: git worktree remove --force BEFORE fs.rmSync in afterEach.
 *
 * Performance note: git init + config + commit takes ~20s on this machine
 * (macOS security overhead). To keep the suite tractable we share one fixture
 * git repo per describe block via `beforeEach`, committing all setup files at
 * once, and only create additional worktrees / branches for specific scenarios.
 *
 * Scenarios covered (one per Gherkin scenario in §2.1 of STORY-025-02):
 *   1. All four checks pass in clean state → exit 0
 *   2. Previous sprint not Completed → exit 1, stderr names prev sprint
 *   3. Leftover worktree → exit 1, stderr names worktree path + remove hint
 *   4. Sprint branch ref already exists → exit 1, stderr names the ref
 *   5. main is dirty → exit 1, stderr contains "main is dirty" + filename
 *   6. Multiple checks fail simultaneously → exit 1, both failures in stderr
 *   7. Usage error on missing/malformed arg → exit 2
 *   8. Skip prev-sprint check for SPRINT-01 → exit 0, check 1 skipped
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { execSync } from 'node:child_process';
import { sprintPreflightHandler } from '../../src/commands/sprint.js';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeExitSeam(): { exitFn: (code: number) => never; getCode: () => number | null } {
  let code: number | null = null;
  const exitFn = (c: number): never => {
    code = c;
    throw new Error(`exit:${c}`);
  };
  return { exitFn, getCode: () => code };
}

function makeCapture() {
  const out: string[] = [];
  const err: string[] = [];
  return {
    stdout: (s: string) => { out.push(s); },
    stderr: (s: string) => { err.push(s); },
    getOut: () => out.join('\n'),
    getErr: () => err.join('\n'),
  };
}

/** Run the handler, swallowing the exit-seam throw. Returns exit code. */
function runPreflight(
  sprintId: string,
  cwd: string,
  cap: ReturnType<typeof makeCapture>,
  extraOpts?: Partial<Parameters<typeof sprintPreflightHandler>[1]>,
): number {
  const { exitFn, getCode } = makeExitSeam();
  try {
    sprintPreflightHandler(
      { sprintId },
      {
        cwd,
        stdout: cap.stdout,
        stderr: cap.stderr,
        exit: exitFn,
        ...extraOpts,
      },
    );
  } catch {
    // expected exit throw
  }
  return getCode() ?? -1;
}

/** Initialise a minimal git repo in dir with an initial commit on main. */
function initGitRepo(dir: string): void {
  execSync('git init -b main', { cwd: dir, stdio: 'pipe' });
  execSync('git config user.email "test@test.com"', { cwd: dir, stdio: 'pipe' });
  execSync('git config user.name "Test"', { cwd: dir, stdio: 'pipe' });
}

/**
 * Write all fixture files and commit them in a single git commit.
 * This keeps the repo clean (no untracked files) and minimises git round-trips.
 */
function commitFixtureFiles(
  dir: string,
  files: Array<{ relPath: string; content: string }>,
  message: string,
): void {
  for (const { relPath, content } of files) {
    const full = path.join(dir, relPath);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, content);
  }
  execSync('git add .', { cwd: dir, stdio: 'pipe' });
  execSync(`git commit -m "${message}"`, { cwd: dir, stdio: 'pipe' });
}

/** Build the standard fixture files for a given sprint target (e.g. SPRINT-18 checks SPRINT-17). */
function buildCleanFixture(
  dir: string,
  targetSprintId: string,
  prevStatus = 'Completed',
): void {
  const prevNum = parseInt(/^SPRINT-(\d+)$/.exec(targetSprintId)?.[1] ?? '0', 10) - 1;
  const prevId = prevNum > 0 ? `SPRINT-${String(prevNum).padStart(2, '0')}` : null;

  const files: Array<{ relPath: string; content: string }> = [
    {
      relPath: 'README.md',
      content: '# fixture\n',
    },
  ];

  if (prevId) {
    files.push({
      relPath: `.cleargate/sprint-runs/${prevId}/state.json`,
      content: JSON.stringify({ sprint_id: prevId, sprint_status: prevStatus }, null, 2),
    });
  }

  files.push({
    relPath: `.cleargate/delivery/pending-sync/${targetSprintId}_Test_Sprint.md`,
    content: `---\nsprint_id: "${targetSprintId}"\nexecution_mode: "v2"\n---\n\n# ${targetSprintId}\n`,
  });

  commitFixtureFiles(dir, files, 'fixture: clean state');
}

// ─── Fixture lifecycle ────────────────────────────────────────────────────────

let fixtureDir: string;
/** Track extra worktrees so afterEach can remove them before rmSync. */
const extraWorktreeDirs: string[] = [];

beforeEach(() => {
  fixtureDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cg-preflight-'));
  initGitRepo(fixtureDir);
  extraWorktreeDirs.length = 0;
});

afterEach(() => {
  // Worktree hygiene: remove linked worktrees BEFORE rmSync (prevents stale .git metadata).
  for (const wtDir of extraWorktreeDirs) {
    try {
      execSync(`git worktree remove --force "${wtDir}"`, { cwd: fixtureDir, stdio: 'pipe' });
    } catch {
      // already gone — ignore
    }
  }
  fs.rmSync(fixtureDir, { recursive: true, force: true });
});

// ─── Scenario 1: All four checks pass in clean state ─────────────────────────

describe('Scenario: all four checks pass in clean state', () => {
  it('exit code is 0 and stdout contains "all four checks pass"', () => {
    // SPRINT-18 → prev SPRINT-17 with Completed status
    buildCleanFixture(fixtureDir, 'SPRINT-18', 'Completed');

    const cap = makeCapture();
    const code = runPreflight('SPRINT-18', fixtureDir, cap);

    expect(code).toBe(0);
    expect(cap.getOut()).toContain('all four checks pass');
  });
});

// ─── Scenario 2: Previous sprint not Completed ───────────────────────────────

describe('Scenario: previous sprint not Completed', () => {
  it('exit code is 1, stderr names prev sprint and includes close hint', () => {
    buildCleanFixture(fixtureDir, 'SPRINT-19', 'Active');  // SPRINT-18 is Active

    const cap = makeCapture();
    const code = runPreflight('SPRINT-19', fixtureDir, cap);

    expect(code).toBe(1);
    expect(cap.getErr()).toContain('Previous sprint not Completed');
    expect(cap.getErr()).toContain('cleargate sprint close SPRINT-18');
  });
});

// ─── Scenario 3: Leftover worktree ───────────────────────────────────────────

describe('Scenario: leftover worktree', () => {
  it('exit code is 1, stderr names worktree path and includes "git worktree remove" hint', () => {
    buildCleanFixture(fixtureDir, 'SPRINT-19', 'Completed');

    // Create a real git worktree at .worktrees/STORY-024-99
    const wtDir = path.join(fixtureDir, '.worktrees', 'STORY-024-99');
    fs.mkdirSync(path.dirname(wtDir), { recursive: true });
    execSync(`git worktree add "${wtDir}" -b story/STORY-024-99`, { cwd: fixtureDir, stdio: 'pipe' });
    extraWorktreeDirs.push(wtDir);

    const cap = makeCapture();
    const code = runPreflight('SPRINT-19', fixtureDir, cap);

    expect(code).toBe(1);
    expect(cap.getErr()).toContain('Leftover worktree');
    expect(cap.getErr()).toContain('STORY-024-99');
    expect(cap.getErr()).toContain('git worktree remove');
  });
});

// ─── Scenario 4: Sprint branch ref already exists ────────────────────────────

describe('Scenario: sprint branch ref already exists', () => {
  it('exit code is 1, stderr contains "Sprint branch ref already exists: refs/heads/sprint/S-19"', () => {
    buildCleanFixture(fixtureDir, 'SPRINT-19', 'Completed');

    // Create refs/heads/sprint/S-19
    execSync('git branch sprint/S-19', { cwd: fixtureDir, stdio: 'pipe' });

    const cap = makeCapture();
    const code = runPreflight('SPRINT-19', fixtureDir, cap);

    expect(code).toBe(1);
    expect(cap.getErr()).toContain('Sprint branch ref already exists: refs/heads/sprint/S-19');
  });
});

// ─── Scenario 5: main is dirty ───────────────────────────────────────────────

describe('Scenario: main is dirty', () => {
  it('exit code is 1, stderr contains "main is dirty" and the dirty filename', () => {
    buildCleanFixture(fixtureDir, 'SPRINT-19', 'Completed');

    // Create an uncommitted file
    fs.writeFileSync(path.join(fixtureDir, 'some-file.md'), 'dirty\n');

    const cap = makeCapture();
    const code = runPreflight('SPRINT-19', fixtureDir, cap);

    expect(code).toBe(1);
    expect(cap.getErr()).toContain('main is dirty');
    expect(cap.getErr()).toContain('some-file.md');
  });
});

// ─── Scenario 6: Multiple checks fail simultaneously ─────────────────────────

describe('Scenario: multiple checks fail simultaneously', () => {
  it('exit code is 1, stderr contains both failures and shows all 4 checks ran', () => {
    // prev sprint NOT Completed + leftover worktree = 2 failures
    // We gitignore .worktrees/ so the worktree add doesn't also make main dirty (3rd failure).
    buildCleanFixture(fixtureDir, 'SPRINT-19', 'Active');

    // Add .gitignore to prevent .worktrees/ from appearing in git status (which would add a 3rd failure)
    fs.writeFileSync(path.join(fixtureDir, '.gitignore'), '.worktrees/\n');
    execSync('git add .gitignore', { cwd: fixtureDir, stdio: 'pipe' });
    execSync('git commit -m "fixture: ignore worktrees"', { cwd: fixtureDir, stdio: 'pipe' });

    const wtDir = path.join(fixtureDir, '.worktrees', 'STORY-024-99');
    fs.mkdirSync(path.dirname(wtDir), { recursive: true });
    execSync(`git worktree add "${wtDir}" -b story/STORY-024-99`, { cwd: fixtureDir, stdio: 'pipe' });
    extraWorktreeDirs.push(wtDir);

    const cap = makeCapture();
    const code = runPreflight('SPRINT-19', fixtureDir, cap);

    expect(code).toBe(1);
    const errOut = cap.getErr();
    expect(errOut).toContain('Previous sprint not Completed');
    expect(errOut).toContain('Leftover worktree');
    // Both pass (✓) and fail (✗) entries appear — all four ran
    expect(errOut).toContain('✓');
    expect(errOut).toContain('✗');
    // exactly 2 out of 4 checks failed
    expect(errOut).toContain('2/4 checks failed');
  });
});

// ─── Scenario 7: Usage error on missing / malformed sprint-id arg ─────────────

describe('Scenario: usage error on missing / malformed sprint-id arg', () => {
  it('exit code is 2 with usage hint for empty sprint-id', () => {
    // No git setup needed — validation fires before any checks
    const cap = makeCapture();
    // Run without git repo setup (fixtureDir is fresh uninit dir — no commits yet)
    // but the validation doesn't need a git repo
    const { exitFn, getCode } = makeExitSeam();
    try {
      sprintPreflightHandler(
        { sprintId: '' },
        { cwd: fixtureDir, stdout: cap.stdout, stderr: cap.stderr, exit: exitFn },
      );
    } catch { /* expected */ }

    expect(getCode()).toBe(2);
    expect(cap.getErr()).toContain('Usage: cleargate sprint preflight <sprint-id>');
  });

  it('exit code is 2 for malformed sprint-id like "SPRINT-X"', () => {
    const cap = makeCapture();
    const { exitFn, getCode } = makeExitSeam();
    try {
      sprintPreflightHandler(
        { sprintId: 'SPRINT-X' },
        { cwd: fixtureDir, stdout: cap.stdout, stderr: cap.stderr, exit: exitFn },
      );
    } catch { /* expected */ }

    expect(getCode()).toBe(2);
  });
});

// ─── Scenario 8: Skip prev-sprint check for SPRINT-01 ────────────────────────

describe('Scenario: skip prev-sprint check for SPRINT-01', () => {
  it('exit code is 0 in clean state (check 1 skipped, other three pass)', () => {
    // No SPRINT-00 state.json — check 1 skips
    buildCleanFixture(fixtureDir, 'SPRINT-01');  // helper skips prev state.json for num <= 1

    const cap = makeCapture();
    const code = runPreflight('SPRINT-01', fixtureDir, cap);

    expect(code).toBe(0);
    expect(cap.getOut()).toContain('all four checks pass');
  });

  it('when dirty, check 1 shows as skipped in the punch list', () => {
    // SPRINT-01 + dirty main → check 1 skipped, check 4 fails
    buildCleanFixture(fixtureDir, 'SPRINT-01');
    fs.writeFileSync(path.join(fixtureDir, 'dirty.md'), 'dirty\n');

    const cap = makeCapture();
    const code = runPreflight('SPRINT-01', fixtureDir, cap);

    expect(code).toBe(1);
    expect(cap.getErr()).toContain('skipped (no preceding sprint)');
    expect(cap.getErr()).toContain('main is dirty');
  });
});
