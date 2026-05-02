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

/** Build the standard fixture files for a given sprint target (e.g. SPRINT-18 checks SPRINT-17).
 *
 * CR-027: sprint plan now includes `cached_gate_result.pass: true` so check #5
 * (per-item readiness gates) does not block the existing test scenarios.
 * The sprint plan has no §1 Consolidated Deliverables, so only the sprint plan
 * itself is evaluated by check #5, and it passes.
 */
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

  // CR-027: include cached_gate_result.pass: true so check #5 passes for existing scenarios.
  files.push({
    relPath: `.cleargate/delivery/pending-sync/${targetSprintId}_Test_Sprint.md`,
    content: [
      '---',
      `sprint_id: "${targetSprintId}"`,
      'execution_mode: "v2"',
      'updated_at: "2026-01-01T00:00:00Z"',
      'cached_gate_result:',
      '  pass: true',
      '  failing_criteria: []',
      '  last_gate_check: "2026-06-01T00:00:00Z"',
      '---',
      '',
      `# ${targetSprintId}`,
      '',
    ].join('\n'),
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

// ─── Scenario 1: All five checks pass in clean state ─────────────────────────

describe('Scenario: all five checks pass in clean state', () => {
  it('exit code is 0 and stdout contains "all five checks pass"', () => {
    // SPRINT-18 → prev SPRINT-17 with Completed status
    buildCleanFixture(fixtureDir, 'SPRINT-18', 'Completed');

    const cap = makeCapture();
    const code = runPreflight('SPRINT-18', fixtureDir, cap);

    expect(code).toBe(0);
    expect(cap.getOut()).toContain('all five checks pass');
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
    // exactly 2 out of 5 checks failed
    expect(errOut).toContain('2/5 checks failed');
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
  it('exit code is 0 in clean state (check 1 skipped, other four pass)', () => {
    // No SPRINT-00 state.json — check 1 skips
    buildCleanFixture(fixtureDir, 'SPRINT-01');  // helper skips prev state.json for num <= 1

    const cap = makeCapture();
    const code = runPreflight('SPRINT-01', fixtureDir, cap);

    expect(code).toBe(0);
    expect(cap.getOut()).toContain('all five checks pass');
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

// ─── STORY-026-01: skill load directive on preflight ─────────────────────────

describe('Scenario (STORY-026-01): preflight success emits skill load directive', () => {
  it('stdout last line is "→ Load skill: sprint-execution" when all five checks pass', () => {
    buildCleanFixture(fixtureDir, 'SPRINT-18', 'Completed');

    const cap = makeCapture();
    const code = runPreflight('SPRINT-18', fixtureDir, cap);

    expect(code).toBe(0);
    const lines = cap.getOut().split('\n').filter((l) => l.trim() !== '');
    expect(lines[lines.length - 1]).toBe('→ Load skill: sprint-execution');
  });
});

describe('Scenario (STORY-026-01): preflight failure stays quiet on skill directive', () => {
  it('stdout does NOT contain "Load skill: sprint-execution" when a check fails', () => {
    // prev sprint Active → check 1 fails → partial failure → no skill directive
    buildCleanFixture(fixtureDir, 'SPRINT-19', 'Active');

    const cap = makeCapture();
    const code = runPreflight('SPRINT-19', fixtureDir, cap);

    expect(code).toBe(1);
    expect(cap.getOut()).not.toContain('Load skill: sprint-execution');
  });
});

// ─── CR-027: Composite preflight gate (check #5) scenarios ───────────────────

/**
 * Build readiness fixture files for CR-027 scenarios.
 *
 * Writes:
 *   - Sprint plan file with cached_gate_result + execution_mode
 *   - Child work-item files with specified cached_gate_result + status
 *
 * Returns an execFn that intercepts `--emit-json` shell-outs and delegates
 * git commands to real execSync.
 *
 * @param dir         - The fixture directory (a real git repo).
 * @param sprintId    - Sprint ID (e.g. 'SPRINT-99').
 * @param executionMode - 'v1' or 'v2'.
 * @param sprintGate  - { pass, failingCriteria, lastGateCheck } for the sprint plan itself.
 * @param items       - Child work items to create.
 * @returns execFn interceptor that injects canned JSON for --emit-json calls.
 */
function seedReadinessFixture(
  dir: string,
  sprintId: string,
  executionMode: 'v1' | 'v2',
  sprintGate: { pass: boolean | null; failingCriteria: string[]; lastGateCheck: string | null },
  items: Array<{
    id: string;
    status?: string;
    pass: boolean | null;
    failingCriteria?: string[];
    lastGateCheck?: string | null;
    updatedAt?: string;
  }>,
): (cmd: string, opts: { cwd: string; encoding: 'utf8' }) => string {
  const prevNum = parseInt(/^SPRINT-(\d+)$/.exec(sprintId)?.[1] ?? '0', 10) - 1;
  const prevId = prevNum > 0 ? `SPRINT-${String(prevNum).padStart(2, '0')}` : null;

  const files: Array<{ relPath: string; content: string }> = [
    { relPath: 'README.md', content: '# fixture\n' },
  ];

  if (prevId) {
    files.push({
      relPath: `.cleargate/sprint-runs/${prevId}/state.json`,
      content: JSON.stringify({ sprint_id: prevId, sprint_status: 'Completed' }, null, 2),
    });
  }

  // Build sprint plan frontmatter
  const sprintGateYaml =
    sprintGate.pass === null
      ? ['cached_gate_result:', '  pass: null', '  failing_criteria: []', '  last_gate_check: null'].join('\n')
      : [
          'cached_gate_result:',
          `  pass: ${sprintGate.pass}`,
          `  failing_criteria: [${sprintGate.failingCriteria.map((c) => `{id: "${c}", detail: ""}`).join(', ')}]`,
          `  last_gate_check: "${sprintGate.lastGateCheck ?? ''}"`,
        ].join('\n');

  // Build §1 Consolidated Deliverables table from item IDs
  const deliverables =
    items.length > 0
      ? `\n## 1. Consolidated Deliverables\n\n${items.map((i) => `- ${i.id}`).join('\n')}\n`
      : '';

  files.push({
    relPath: `.cleargate/delivery/pending-sync/${sprintId}_Test_Sprint.md`,
    content: [
      '---',
      `sprint_id: "${sprintId}"`,
      `execution_mode: "${executionMode}"`,
      'updated_at: "2026-01-01T00:00:00Z"',
      sprintGateYaml,
      '---',
      '',
      `# ${sprintId}`,
      deliverables,
    ].join('\n'),
  });

  // Write child work-item files
  for (const item of items) {
    const gateYaml =
      item.pass === null
        ? ['cached_gate_result:', '  pass: null', '  failing_criteria: []', '  last_gate_check: null'].join('\n')
        : [
            'cached_gate_result:',
            `  pass: ${item.pass}`,
            `  failing_criteria: [${(item.failingCriteria ?? []).map((c) => `{id: "${c}", detail: ""}`).join(', ')}]`,
            `  last_gate_check: "${item.lastGateCheck ?? ''}"`,
          ].join('\n');

    files.push({
      relPath: `.cleargate/delivery/pending-sync/${item.id}_Test_Item.md`,
      content: [
        '---',
        `status: "${item.status ?? 'Ready'}"`,
        `updated_at: "${item.updatedAt ?? '2026-01-01T00:00:00Z'}"`,
        gateYaml,
        '---',
        '',
        `# ${item.id}`,
        '',
        '## 1. Summary',
        '- test item',
        '',
      ].join('\n'),
    });
  }

  commitFixtureFiles(dir, files, `fixture: CR-027 readiness ${sprintId}`);

  // Return an execFn that intercepts --emit-json calls and passes git cmds through
  const childIds = items.map((i) => i.id);
  return (cmd: string, opts: { cwd: string; encoding: 'utf8' }) => {
    if (cmd.includes('--emit-json')) {
      // Return canned JSON with child IDs
      return JSON.stringify({ workItemIds: childIds });
    }
    // Delegate git and other commands to real execSync
    return execSync(cmd, { ...opts, stdio: 'pipe' }) as unknown as string;
  };
}

// ─── Scenario 9: v2 happy path — all items pass=true ─────────────────────────

describe('Scenario 9 (CR-027): v2 happy path — all items pass=true', () => {
  it('exit code is 0, "all five checks pass", no Per-item readiness gates failure', () => {
    const execFn = seedReadinessFixture(
      fixtureDir,
      'SPRINT-99',
      'v2',
      { pass: true, failingCriteria: [], lastGateCheck: '2026-06-01T00:00:00Z' },
      [
        { id: 'EPIC-099', pass: true, failingCriteria: [], lastGateCheck: '2026-06-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' },
        { id: 'STORY-099-01', pass: true, failingCriteria: [], lastGateCheck: '2026-06-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' },
      ],
    );

    const cap = makeCapture();
    const code = runPreflight('SPRINT-99', fixtureDir, cap, { execFn });

    expect(code).toBe(0);
    expect(cap.getOut()).toContain('all five checks pass');
    expect(cap.getErr()).not.toContain('Per-item readiness gates:');
    const lines = cap.getOut().split('\n').filter((l) => l.trim() !== '');
    expect(lines[lines.length - 1]).toBe('→ Load skill: sprint-execution');
  });
});

// ─── Scenario 10: v2 hard-block — one EPIC pass=false ────────────────────────

describe('Scenario 10 (CR-027): v2 hard-block — one EPIC pass=false', () => {
  it('exit code is 1, stderr names EPIC-099 and failing criterion no-tbds', () => {
    const execFn = seedReadinessFixture(
      fixtureDir,
      'SPRINT-99',
      'v2',
      { pass: true, failingCriteria: [], lastGateCheck: '2026-06-01T00:00:00Z' },
      [
        { id: 'EPIC-099', pass: false, failingCriteria: ['no-tbds'], lastGateCheck: '2026-06-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' },
        { id: 'STORY-099-01', pass: true, failingCriteria: [], lastGateCheck: '2026-06-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' },
      ],
    );

    const cap = makeCapture();
    const code = runPreflight('SPRINT-99', fixtureDir, cap, { execFn });

    expect(code).toBe(1);
    expect(cap.getErr()).toContain('Per-item readiness gates:');
    expect(cap.getErr()).toContain('EPIC-099');
    expect(cap.getErr()).toContain('no-tbds');
    expect(cap.getOut()).not.toContain('Load skill: sprint-execution');
  });
});

// ─── Scenario 11: staleness — last_gate_check < updated_at ───────────────────

describe('Scenario 11 (CR-027): staleness — last_gate_check older than updated_at', () => {
  it('exit code is 1, stderr contains EPIC-099 and stale reason', () => {
    const execFn = seedReadinessFixture(
      fixtureDir,
      'SPRINT-99',
      'v2',
      { pass: true, failingCriteria: [], lastGateCheck: '2026-06-01T00:00:00Z' },
      [
        // EPIC-099: pass=true but last_gate_check is OLDER than updated_at → stale
        { id: 'EPIC-099', pass: true, failingCriteria: [], lastGateCheck: '2026-01-01T00:00:00Z', updatedAt: '2026-05-02T00:00:00Z' },
        { id: 'STORY-099-01', pass: true, failingCriteria: [], lastGateCheck: '2026-06-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' },
      ],
    );

    const cap = makeCapture();
    const code = runPreflight('SPRINT-99', fixtureDir, cap, { execFn });

    expect(code).toBe(1);
    expect(cap.getErr()).toContain('EPIC-099');
    expect(cap.getErr()).toContain('stale');
  });
});

// ─── Scenario 12: v1 mode — warns, exit 0 ────────────────────────────────────

describe('Scenario 12 (CR-027): v1 mode — check #5 skipped, exit 0', () => {
  it('exit code is 0 even with one item pass=false under v1', () => {
    // Same setup as scenario 10 but execution_mode: v1 → check #5 skipped entirely
    const execFn = seedReadinessFixture(
      fixtureDir,
      'SPRINT-99',
      'v1',
      { pass: false, failingCriteria: ['no-tbds'], lastGateCheck: '2026-06-01T00:00:00Z' },
      [
        { id: 'EPIC-099', pass: false, failingCriteria: ['no-tbds'], lastGateCheck: '2026-06-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' },
      ],
    );

    const cap = makeCapture();
    const code = runPreflight('SPRINT-99', fixtureDir, cap, { execFn });

    // Under v1, check #5 is skipped → all 5 results are pass-or-skipped → exit 0
    expect(code).toBe(0);
    expect(cap.getErr()).toBe('');
    expect(cap.getOut()).toContain('all five checks pass');
    const lines = cap.getOut().split('\n').filter((l) => l.trim() !== '');
    expect(lines[lines.length - 1]).toBe('→ Load skill: sprint-execution');
  });
});

// ─── Scenario 13: Done items are skipped from failure list ───────────────────

describe('Scenario 13 (CR-027): Done items skipped from failure list', () => {
  it('exit code is 0 when only Done item has pass=false (terminal status skipped)', () => {
    const execFn = seedReadinessFixture(
      fixtureDir,
      'SPRINT-99',
      'v2',
      { pass: true, failingCriteria: [], lastGateCheck: '2026-06-01T00:00:00Z' },
      [
        // STORY-099-02: status=Done AND pass=false → SKIP (terminal status)
        { id: 'STORY-099-02', status: 'Done', pass: false, failingCriteria: ['no-tbds'], lastGateCheck: '2026-06-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' },
        { id: 'EPIC-099', pass: true, failingCriteria: [], lastGateCheck: '2026-06-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' },
      ],
    );

    const cap = makeCapture();
    const code = runPreflight('SPRINT-99', fixtureDir, cap, { execFn });

    expect(code).toBe(0);
    expect(cap.getErr()).not.toContain('STORY-099-02');
    expect(cap.getOut()).toContain('all five checks pass');
  });
});

// ─── Scenario 14: sprint plan itself fails — missing cached_gate_result ───────

describe('Scenario 14 (CR-027): sprint plan itself fails when cached_gate_result is null', () => {
  it('exit code is 1, stderr names SPRINT-99 as failing item with no cached_gate_result', () => {
    // Sprint plan has cached_gate_result.pass: null — mirrors SPRINT-20 actual state
    // All children pass — sprint plan itself is the only failure
    const execFn = seedReadinessFixture(
      fixtureDir,
      'SPRINT-99',
      'v2',
      { pass: null, failingCriteria: [], lastGateCheck: null }, // null = no cached_gate_result
      [
        { id: 'EPIC-099', pass: true, failingCriteria: [], lastGateCheck: '2026-06-01T00:00:00Z', updatedAt: '2026-01-01T00:00:00Z' },
      ],
    );

    const cap = makeCapture();
    const code = runPreflight('SPRINT-99', fixtureDir, cap, { execFn });

    expect(code).toBe(1);
    expect(cap.getErr()).toContain('SPRINT-99');
    expect(cap.getErr()).toContain('no cached_gate_result');
  });
});
