/**
 * sprint-archive.test.ts — unit tests for `cleargate sprint archive` handler.
 *
 * STORY-014-08 Gherkin scenarios:
 *   Scenario 1: Happy path — Completed state → files moved, stamps correct, git commands fired.
 *   Scenario 2: Refuses when sprint_status === 'Active' → exit 1 + stderr.
 *   Scenario 3: --dry-run prints plan + zero filesystem changes.
 *   Scenario 4: v1 inert — no changes, prints inert message.
 *
 * Tests use tmpdir fixture + fake state.json + dummy pending-sync files.
 * No mocks of node:fs — real filesystem in tmpdir (no DB involved).
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { sprintArchiveHandler } from '../../src/commands/sprint.js';
import { V1_INERT_MESSAGE } from '../../src/commands/execution-mode.js';

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
    getOut: () => out,
    getErr: () => err,
  };
}

// ─── Fixture builder ──────────────────────────────────────────────────────────

interface FixtureOptions {
  sprintStatus?: string;
  executionMode?: 'v1' | 'v2';
  includeOrphan?: boolean;
}

interface Fixture {
  cwd: string;
  pendingDir: string;
  archiveDir: string;
  sprintFilePath: string;
  cleanup: () => void;
}

function buildFixture(opts: FixtureOptions = {}): Fixture {
  const {
    sprintStatus = 'Completed',
    executionMode = 'v2',
    includeOrphan = false,
  } = opts;

  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'cg-sprint-archive-test-'));

  // Directory scaffold
  const pendingDir = path.join(cwd, '.cleargate', 'delivery', 'pending-sync');
  const archiveDir = path.join(cwd, '.cleargate', 'delivery', 'archive');
  const sprintRunsDir = path.join(cwd, '.cleargate', 'sprint-runs', 'SPRINT-99');
  fs.mkdirSync(pendingDir, { recursive: true });
  fs.mkdirSync(archiveDir, { recursive: true });
  fs.mkdirSync(sprintRunsDir, { recursive: true });

  // state.json
  const stateJson = {
    schema_version: 1,
    sprint_id: 'SPRINT-99',
    execution_mode: 'v2',
    sprint_status: sprintStatus,
    stories: {
      'STORY-099-01': { state: 'Done', qa_bounces: 0, arch_bounces: 0, worktree: null, updated_at: '2026-01-01T00:00:00.000Z', notes: '' },
      'STORY-099-02': { state: 'Done', qa_bounces: 0, arch_bounces: 0, worktree: null, updated_at: '2026-01-01T00:00:00.000Z', notes: '' },
    },
  };
  fs.writeFileSync(path.join(sprintRunsDir, 'state.json'), JSON.stringify(stateJson, null, 2));

  // Sprint file in pending-sync
  const sprintContent = `---
sprint_id: "SPRINT-99"
status: "Active"
execution_mode: "${executionMode}"
epics: ["EPIC-099"]
---

# SPRINT-99: Test Sprint
`;
  const sprintFilePath = path.join(pendingDir, 'SPRINT-99_Test_Sprint.md');
  fs.writeFileSync(sprintFilePath, sprintContent);

  // Epic file in pending-sync
  const epicContent = `---
epic_id: EPIC-099
status: "Active"
parent_sprint_ref: SPRINT-99
---

# EPIC-099: Test Epic
`;
  fs.writeFileSync(path.join(pendingDir, 'EPIC-099_Test_Epic.md'), epicContent);

  // Story files in pending-sync
  const storyContent1 = `---
story_id: STORY-099-01
parent_epic_ref: EPIC-099
status: "Ready"
---

# STORY-099-01: Test Story 1
`;
  fs.writeFileSync(path.join(pendingDir, 'STORY-099-01_Test_Story_1.md'), storyContent1);

  const storyContent2 = `---
story_id: STORY-099-02
parent_epic_ref: EPIC-099
status: "Ready"
---

# STORY-099-02: Test Story 2
`;
  fs.writeFileSync(path.join(pendingDir, 'STORY-099-02_Test_Story_2.md'), storyContent2);

  // Orphan story: matches epic but NOT in state.json stories
  if (includeOrphan) {
    const orphanContent = `---
story_id: STORY-099-99
parent_epic_ref: EPIC-099
status: "Ready"
---

# STORY-099-99: Orphan Story
`;
    fs.writeFileSync(path.join(pendingDir, 'STORY-099-99_Orphan_Story.md'), orphanContent);
  }

  return {
    cwd,
    pendingDir,
    archiveDir,
    sprintFilePath,
    cleanup: () => fs.rmSync(cwd, { recursive: true, force: true }),
  };
}

// ─── Scenario 1: Happy path ───────────────────────────────────────────────────

describe('Scenario: archive completes the close-out (happy path)', () => {
  let fixture: Fixture;
  beforeEach(() => { fixture = buildFixture(); });
  afterEach(() => fixture.cleanup());

  it('fires git checkout main, merge, branch -d in order', () => {
    const { exitFn } = makeExitSeam();
    const cap = makeCapture();
    const spawnCalls: [string, string[]][] = [];
    const spawnMock = (cmd: string, args: string[]) => {
      spawnCalls.push([cmd, [...args]]);
      return { status: 0, error: null, stdout: 'abc123', stderr: '' };
    };

    try {
      sprintArchiveHandler(
        { sprintId: 'SPRINT-99' },
        {
          sprintFilePath: fixture.sprintFilePath,
          cwd: fixture.cwd,
          stdout: cap.stdout,
          stderr: cap.stderr,
          exit: exitFn,
          spawnFn: spawnMock as never,
        },
      );
    } catch { /* expected exit */ }

    // Verify git command order
    const gitCmds = spawnCalls.filter(([cmd]) => cmd === 'git');
    expect(gitCmds[0]?.[1]).toContain('main'); // checkout main
    expect(gitCmds[0]?.[1]).toEqual(['checkout', 'main']);
    expect(gitCmds[1]?.[1]).toContain('merge'); // merge
    expect(gitCmds[1]?.[1]).toContain('--no-ff');
    expect(gitCmds[1]?.[1]).toContain('sprint/S-99'); // branch name (non-numeric falls back to SPRINT-99)
    expect(gitCmds[2]?.[1]).toEqual(['branch', '-d', 'sprint/S-99']); // branch delete
  });

  it('moves all 4 files to archive/', () => {
    const { exitFn } = makeExitSeam();
    const cap = makeCapture();
    const spawnMock = () => ({ status: 0, error: null, stdout: '', stderr: '' });

    try {
      sprintArchiveHandler(
        { sprintId: 'SPRINT-99' },
        {
          sprintFilePath: fixture.sprintFilePath,
          cwd: fixture.cwd,
          stdout: cap.stdout,
          stderr: cap.stderr,
          exit: exitFn,
          spawnFn: spawnMock as never,
        },
      );
    } catch { /* expected exit */ }

    const archived = fs.readdirSync(fixture.archiveDir);
    expect(archived).toContain('SPRINT-99_Test_Sprint.md');
    expect(archived).toContain('EPIC-099_Test_Epic.md');
    expect(archived).toContain('STORY-099-01_Test_Story_1.md');
    expect(archived).toContain('STORY-099-02_Test_Story_2.md');
    // pending-sync should now be empty of these files
    const remaining = fs.readdirSync(fixture.pendingDir);
    expect(remaining).not.toContain('SPRINT-99_Test_Sprint.md');
    expect(remaining).not.toContain('EPIC-099_Test_Epic.md');
  });

  it('stamps status+completed_at on archived files', () => {
    const { exitFn } = makeExitSeam();
    const spawnMock = () => ({ status: 0, error: null, stdout: '', stderr: '' });

    try {
      sprintArchiveHandler(
        { sprintId: 'SPRINT-99' },
        {
          sprintFilePath: fixture.sprintFilePath,
          cwd: fixture.cwd,
          stdout: () => {},
          exit: exitFn,
          spawnFn: spawnMock as never,
        },
      );
    } catch { /* expected exit */ }

    const sprintArchived = fs.readFileSync(
      path.join(fixture.archiveDir, 'SPRINT-99_Test_Sprint.md'),
      'utf8',
    );
    expect(sprintArchived).toContain('status: Completed');
    expect(sprintArchived).toContain('completed_at:');

    const epicArchived = fs.readFileSync(
      path.join(fixture.archiveDir, 'EPIC-099_Test_Epic.md'),
      'utf8',
    );
    expect(epicArchived).toContain('status: Approved');

    const storyArchived = fs.readFileSync(
      path.join(fixture.archiveDir, 'STORY-099-01_Test_Story_1.md'),
      'utf8',
    );
    expect(storyArchived).toContain('status: Done');
  });

  it('truncates .active sentinel to empty string', () => {
    const { exitFn } = makeExitSeam();
    const spawnMock = () => ({ status: 0, error: null, stdout: '', stderr: '' });
    const activeDir = path.join(fixture.cwd, '.cleargate', 'sprint-runs');
    const activePath = path.join(activeDir, '.active');
    fs.writeFileSync(activePath, 'SPRINT-99');

    try {
      sprintArchiveHandler(
        { sprintId: 'SPRINT-99' },
        {
          sprintFilePath: fixture.sprintFilePath,
          cwd: fixture.cwd,
          stdout: () => {},
          exit: exitFn,
          spawnFn: spawnMock as never,
        },
      );
    } catch { /* expected exit */ }

    const activeContent = fs.readFileSync(activePath, 'utf8');
    expect(activeContent).toBe('');
  });
});

// ─── Scenario 2: Refuses when sprint_status !== 'Completed' ──────────────────

describe('Scenario: archive refuses when sprint not yet Completed', () => {
  let fixture: Fixture;
  beforeEach(() => { fixture = buildFixture({ sprintStatus: 'Active' }); });
  afterEach(() => fixture.cleanup());

  it('exits with non-zero code', () => {
    const { exitFn, getCode } = makeExitSeam();
    const cap = makeCapture();

    try {
      sprintArchiveHandler(
        { sprintId: 'SPRINT-99' },
        {
          sprintFilePath: fixture.sprintFilePath,
          cwd: fixture.cwd,
          stdout: cap.stdout,
          stderr: cap.stderr,
          exit: exitFn,
          spawnFn: () => ({ status: 0, error: null, stdout: '', stderr: '' }) as never,
        },
      );
    } catch { /* expected exit */ }

    expect(getCode()).toBe(1);
  });

  it('stderr contains the diagnostic message', () => {
    const { exitFn } = makeExitSeam();
    const cap = makeCapture();

    try {
      sprintArchiveHandler(
        { sprintId: 'SPRINT-99' },
        {
          sprintFilePath: fixture.sprintFilePath,
          cwd: fixture.cwd,
          stdout: cap.stdout,
          stderr: cap.stderr,
          exit: exitFn,
          spawnFn: () => ({ status: 0, error: null, stdout: '', stderr: '' }) as never,
        },
      );
    } catch { /* expected exit */ }

    const errOut = cap.getErr().join('\n');
    expect(errOut).toContain('sprint not closed');
    expect(errOut).toContain('--assume-ack');
  });

  it('does not move any files when refused', () => {
    const { exitFn } = makeExitSeam();

    try {
      sprintArchiveHandler(
        { sprintId: 'SPRINT-99' },
        {
          sprintFilePath: fixture.sprintFilePath,
          cwd: fixture.cwd,
          stdout: () => {},
          exit: exitFn,
          spawnFn: () => ({ status: 0, error: null, stdout: '', stderr: '' }) as never,
        },
      );
    } catch { /* expected exit */ }

    const archived = fs.readdirSync(fixture.archiveDir);
    expect(archived).toHaveLength(0);
  });
});

// ─── Scenario 3: --dry-run prints plan only, no filesystem changes ────────────

describe('Scenario: --dry-run prints plan only', () => {
  let fixture: Fixture;
  beforeEach(() => { fixture = buildFixture(); });
  afterEach(() => fixture.cleanup());

  it('exits 0', () => {
    const { exitFn, getCode } = makeExitSeam();
    const cap = makeCapture();
    const spawnMock = () => ({ status: 0, error: null, stdout: '', stderr: '' });

    try {
      sprintArchiveHandler(
        { sprintId: 'SPRINT-99', dryRun: true },
        {
          sprintFilePath: fixture.sprintFilePath,
          cwd: fixture.cwd,
          stdout: cap.stdout,
          stderr: cap.stderr,
          exit: exitFn,
          spawnFn: spawnMock as never,
        },
      );
    } catch { /* expected exit */ }

    expect(getCode()).toBe(0);
  });

  it('stdout lists all planned file moves', () => {
    const { exitFn } = makeExitSeam();
    const cap = makeCapture();
    const spawnMock = () => ({ status: 0, error: null, stdout: '', stderr: '' });

    try {
      sprintArchiveHandler(
        { sprintId: 'SPRINT-99', dryRun: true },
        {
          sprintFilePath: fixture.sprintFilePath,
          cwd: fixture.cwd,
          stdout: cap.stdout,
          stderr: cap.stderr,
          exit: exitFn,
          spawnFn: spawnMock as never,
        },
      );
    } catch { /* expected exit */ }

    const outStr = cap.getOut().join('\n');
    expect(outStr).toContain('[dry-run]');
    expect(outStr).toContain('SPRINT-99_Test_Sprint.md');
    expect(outStr).toContain('EPIC-099_Test_Epic.md');
    expect(outStr).toContain('STORY-099-01_Test_Story_1.md');
    expect(outStr).toContain('STORY-099-02_Test_Story_2.md');
    expect(outStr).toContain('git checkout main');
    expect(outStr).toContain('git merge');
    expect(outStr).toContain('git branch -d');
  });

  it('makes no filesystem changes', () => {
    const { exitFn } = makeExitSeam();
    const spawnMock = () => ({ status: 0, error: null, stdout: '', stderr: '' });
    const pendingBefore = fs.readdirSync(fixture.pendingDir).sort();
    const archiveBefore = fs.readdirSync(fixture.archiveDir).sort();

    try {
      sprintArchiveHandler(
        { sprintId: 'SPRINT-99', dryRun: true },
        {
          sprintFilePath: fixture.sprintFilePath,
          cwd: fixture.cwd,
          stdout: () => {},
          exit: exitFn,
          spawnFn: spawnMock as never,
        },
      );
    } catch { /* expected exit */ }

    expect(fs.readdirSync(fixture.pendingDir).sort()).toEqual(pendingBefore);
    expect(fs.readdirSync(fixture.archiveDir).sort()).toEqual(archiveBefore);
  });

  it('does not invoke spawnFn under --dry-run', () => {
    const { exitFn } = makeExitSeam();
    let spawnCallCount = 0;
    const spawnMock = () => {
      spawnCallCount++;
      return { status: 0, error: null, stdout: '', stderr: '' };
    };

    try {
      sprintArchiveHandler(
        { sprintId: 'SPRINT-99', dryRun: true },
        {
          sprintFilePath: fixture.sprintFilePath,
          cwd: fixture.cwd,
          stdout: () => {},
          exit: exitFn,
          spawnFn: spawnMock as never,
        },
      );
    } catch { /* expected exit */ }

    expect(spawnCallCount).toBe(0);
  });
});

// ─── Scenario 4: v1 inert ─────────────────────────────────────────────────────

describe('Scenario: v1 inert', () => {
  let fixture: Fixture;
  beforeEach(() => { fixture = buildFixture({ executionMode: 'v1' }); });
  afterEach(() => fixture.cleanup());

  it('exits 0 with inert message', () => {
    const { exitFn, getCode } = makeExitSeam();
    const cap = makeCapture();

    try {
      sprintArchiveHandler(
        { sprintId: 'SPRINT-99' },
        {
          sprintFilePath: fixture.sprintFilePath,
          cwd: fixture.cwd,
          stdout: cap.stdout,
          stderr: cap.stderr,
          exit: exitFn,
        },
      );
    } catch { /* expected exit */ }

    expect(getCode()).toBe(0);
    expect(cap.getOut().join(' ')).toContain(V1_INERT_MESSAGE);
  });

  it('makes no filesystem changes under v1', () => {
    const { exitFn } = makeExitSeam();
    let spawnCallCount = 0;
    const spawnMock = () => {
      spawnCallCount++;
      return { status: 0, error: null, stdout: '', stderr: '' };
    };
    const pendingBefore = fs.readdirSync(fixture.pendingDir).sort();

    try {
      sprintArchiveHandler(
        { sprintId: 'SPRINT-99' },
        {
          sprintFilePath: fixture.sprintFilePath,
          cwd: fixture.cwd,
          stdout: () => {},
          exit: exitFn,
          spawnFn: spawnMock as never,
        },
      );
    } catch { /* expected exit */ }

    expect(spawnCallCount).toBe(0);
    expect(fs.readdirSync(fixture.pendingDir).sort()).toEqual(pendingBefore);
  });
});

// ─── Scenario: Orphan mid-sprint story WARN + archive ────────────────────────

describe('Scenario: orphan mid-sprint story — WARN but still archive', () => {
  let fixture: Fixture;
  beforeEach(() => { fixture = buildFixture({ includeOrphan: true }); });
  afterEach(() => fixture.cleanup());

  it('prints WARN to stderr', () => {
    const { exitFn } = makeExitSeam();
    const cap = makeCapture();
    const spawnMock = () => ({ status: 0, error: null, stdout: '', stderr: '' });

    try {
      sprintArchiveHandler(
        { sprintId: 'SPRINT-99' },
        {
          sprintFilePath: fixture.sprintFilePath,
          cwd: fixture.cwd,
          stdout: cap.stdout,
          stderr: cap.stderr,
          exit: exitFn,
          spawnFn: spawnMock as never,
        },
      );
    } catch { /* expected exit */ }

    const errOut = cap.getErr().join('\n');
    expect(errOut).toContain('WARN');
    expect(errOut).toContain('STORY-099-99_Orphan_Story.md');
  });

  it('archives the orphan file despite the WARN', () => {
    const { exitFn } = makeExitSeam();
    const spawnMock = () => ({ status: 0, error: null, stdout: '', stderr: '' });

    try {
      sprintArchiveHandler(
        { sprintId: 'SPRINT-99' },
        {
          sprintFilePath: fixture.sprintFilePath,
          cwd: fixture.cwd,
          stdout: () => {},
          stderr: () => {},
          exit: exitFn,
          spawnFn: spawnMock as never,
        },
      );
    } catch { /* expected exit */ }

    const archived = fs.readdirSync(fixture.archiveDir);
    expect(archived).toContain('STORY-099-99_Orphan_Story.md');
  });
});
