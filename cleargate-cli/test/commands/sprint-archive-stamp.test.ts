/**
 * sprint-archive-stamp.test.ts — STORY-015-04 acceptance tests.
 *
 * Gherkin scenarios covered:
 *   Scenario 1: Protocol files list Abandoned — definition present in both copies, files identical.
 *   Scenario 2: Sprint-archive stamps frontmatter (status + completed_at).
 *   Scenario 3: Sprint-archive rolls back on wiki-lint failure.
 *   Scenario 4: Sprint-archive rolls back on wiki-build failure.
 *   Scenario 5: Already-terminal sprint is no-op on status, still stamps completed_at.
 *   Scenario 6 (Gherkin §2.1 "Unmerged sprint rejected"): guard on state.sprint_status !== 'Completed'
 *     — test the actual contract string at sprint.ts L271, not the Gherkin wording.
 *   E2E: Full fixture run with real wikiBuildHandler + wikiLintHandler.
 *
 * NOTE: Gherkin §2.1 Scenario 4 says "sprint branch not merged" — actual guard checks
 * state.sprint_status !== 'Completed'. Tests match the real implemented contract.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import {
  sprintArchiveHandler,
  stampSprintClose,
  restoreSprintFile,
} from '../../src/commands/sprint.js';
import { wikiBuildHandler } from '../../src/commands/wiki-build.js';
import { wikiLintHandler } from '../../src/commands/wiki-lint.js';

// Repo root: test/commands/ → cleargate-cli/test/commands → up 4 dirs → repo root
// (same convention as test/scripts/protocol-section-13.test.ts)
const REPO_ROOT = path.resolve(new URL(import.meta.url).pathname, '..', '..', '..', '..');

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

// ─── Fixture builder (adapted from sprint-archive.test.ts) ───────────────────

interface FixtureOptions {
  sprintStatus?: string;
  sprintFrontmatterStatus?: string;
  executionMode?: 'v1' | 'v2';
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
    sprintFrontmatterStatus = 'Planned',
    executionMode = 'v2',
  } = opts;

  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'cg-stamp-test-'));

  const pendingDir = path.join(cwd, '.cleargate', 'delivery', 'pending-sync');
  const archiveDir = path.join(cwd, '.cleargate', 'delivery', 'archive');
  const sprintRunsDir = path.join(cwd, '.cleargate', 'sprint-runs', 'SPRINT-99');
  const wikiDir = path.join(cwd, '.cleargate', 'wiki');
  fs.mkdirSync(pendingDir, { recursive: true });
  fs.mkdirSync(archiveDir, { recursive: true });
  fs.mkdirSync(sprintRunsDir, { recursive: true });
  fs.mkdirSync(wikiDir, { recursive: true });
  // Write a minimal index so lint budget check sees an index (under ceiling)
  fs.writeFileSync(path.join(wikiDir, 'index.md'), '# Index\n\n(empty)\n');

  // state.json
  const stateJson = {
    schema_version: 1,
    sprint_id: 'SPRINT-99',
    execution_mode: 'v2',
    sprint_status: sprintStatus,
    stories: {
      'STORY-099-01': { state: 'Done', qa_bounces: 0, arch_bounces: 0 },
    },
  };
  fs.writeFileSync(path.join(sprintRunsDir, 'state.json'), JSON.stringify(stateJson, null, 2));

  // Sprint file in pending-sync
  const sprintContent = `---
sprint_id: "SPRINT-99"
status: "${sprintFrontmatterStatus}"
execution_mode: "${executionMode}"
epics: ["EPIC-099"]
---

# SPRINT-99: Test Sprint
`;
  const sprintFilePath = path.join(pendingDir, 'SPRINT-99_Test_Sprint.md');
  fs.writeFileSync(sprintFilePath, sprintContent);

  // Epic file
  fs.writeFileSync(
    path.join(pendingDir, 'EPIC-099_Test_Epic.md'),
    `---\nepic_id: EPIC-099\nstatus: "Active"\nparent_sprint_ref: SPRINT-99\n---\n\n# EPIC-099\n`,
  );

  // Story file
  fs.writeFileSync(
    path.join(pendingDir, 'STORY-099-01_Test_Story_1.md'),
    `---\nstory_id: STORY-099-01\nparent_epic_ref: EPIC-099\nstatus: "Ready"\n---\n\n# STORY-099-01\n`,
  );

  return {
    cwd,
    pendingDir,
    archiveDir,
    sprintFilePath,
    cleanup: () => fs.rmSync(cwd, { recursive: true, force: true }),
  };
}

// ─── Scenario 1: Protocol files list Abandoned ────────────────────────────────

describe('Scenario 1: Protocol files list Abandoned', () => {
  it('dogfood protocol contains Abandoned definition', () => {
    const protocolPath = path.join(REPO_ROOT, '.cleargate', 'knowledge', 'cleargate-protocol.md');
    const content = fs.readFileSync(protocolPath, 'utf8');
    expect(content).toContain('Abandoned');
    expect(content).toContain('Work deliberately stopped without shipping');
    expect(content).toContain('archive/');
    expect(content).toContain('Not eligible for the Active index');
  });

  it('scaffold protocol contains identical Abandoned definition', () => {
    const scaffoldPath = path.join(
      REPO_ROOT,
      'cleargate-planning', '.cleargate', 'knowledge', 'cleargate-protocol.md',
    );
    const content = fs.readFileSync(scaffoldPath, 'utf8');
    expect(content).toContain('Abandoned');
    expect(content).toContain('Work deliberately stopped without shipping');
  });

  it('both protocol files are byte-identical', () => {
    const dogfood = fs.readFileSync(
      path.join(REPO_ROOT, '.cleargate', 'knowledge', 'cleargate-protocol.md'),
      'utf8',
    );
    const scaffold = fs.readFileSync(
      path.join(REPO_ROOT, 'cleargate-planning', '.cleargate', 'knowledge', 'cleargate-protocol.md'),
      'utf8',
    );
    expect(dogfood).toBe(scaffold);
  });
});

// ─── stampSprintClose unit tests ──────────────────────────────────────────────

describe('stampSprintClose helper', () => {
  let tmpDir: string;
  let sprintFile: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cg-stamp-unit-'));
    sprintFile = path.join(tmpDir, 'SPRINT-99.md');
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('stamps status=Completed and completed_at on non-terminal sprint', () => {
    fs.writeFileSync(sprintFile, '---\nstatus: "Planned"\n---\n\n# Body\n');
    const { didChange, stampedContent } = stampSprintClose(sprintFile, () => '2026-01-01T00:00:00.000Z');
    expect(didChange).toBe(true);
    expect(stampedContent).toContain('status: Completed');
    expect(stampedContent).toContain('completed_at:');
    expect(stampedContent).toContain('2026-01-01T');
    // Verify disk was written
    const onDisk = fs.readFileSync(sprintFile, 'utf8');
    expect(onDisk).toContain('status: Completed');
  });

  it('is no-op when already terminal + completed_at set', () => {
    const original = '---\nstatus: "Completed"\ncompleted_at: "2026-01-01T00:00:00.000Z"\n---\n\n# Body\n';
    fs.writeFileSync(sprintFile, original);
    const { didChange, previousContent, stampedContent } = stampSprintClose(sprintFile, () => '2026-02-01T00:00:00.000Z');
    expect(didChange).toBe(false);
    expect(stampedContent).toBe(previousContent);
    // File should not have been changed
    const onDisk = fs.readFileSync(sprintFile, 'utf8');
    expect(onDisk).toBe(original);
  });

  it('keeps status when already terminal but stamps completed_at if absent', () => {
    fs.writeFileSync(sprintFile, '---\nstatus: "Done"\n---\n\n# Body\n');
    const { didChange, stampedContent } = stampSprintClose(sprintFile, () => '2026-01-01T00:00:00.000Z');
    expect(didChange).toBe(true);
    expect(stampedContent).toContain('status: Done');
    expect(stampedContent).toContain('completed_at:');
    expect(stampedContent).toContain('2026-01-01T');
  });
});

describe('restoreSprintFile helper', () => {
  it('atomically restores original content', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cg-restore-'));
    const file = path.join(tmpDir, 'test.md');
    const original = '---\nstatus: "Planned"\n---\n\n# Body\n';
    fs.writeFileSync(file, original);
    // Stamp it
    stampSprintClose(file, () => '2026-01-01T00:00:00.000Z');
    // Restore
    restoreSprintFile(file, original);
    expect(fs.readFileSync(file, 'utf8')).toBe(original);
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });
});

// ─── Scenario 2: Sprint-archive stamps frontmatter ────────────────────────────

describe('Scenario 2: Sprint-archive stamps frontmatter', () => {
  let fixture: Fixture;
  beforeEach(() => { fixture = buildFixture({ sprintFrontmatterStatus: 'Planned' }); });
  afterEach(() => fixture.cleanup());

  it('stamps status=Completed and completed_at on the archived sprint file', async () => {
    const { exitFn } = makeExitSeam();
    const buildCalls: string[] = [];
    const lintCalls: string[] = [];

    try {
      await sprintArchiveHandler(
        { sprintId: 'SPRINT-99' },
        {
          sprintFilePath: fixture.sprintFilePath,
          cwd: fixture.cwd,
          stdout: () => {},
          stderr: () => {},
          exit: exitFn,
          spawnFn: () => ({ status: 0, error: null, stdout: '', stderr: '' }) as never,
          wikiBuildFn: async (cwd) => { buildCalls.push(cwd); },
          wikiLintFn: async (cwd) => { lintCalls.push(cwd); },
        },
      );
    } catch { /* expected exit */ }

    // Check archived sprint file has stamps
    const archived = fs.readFileSync(
      path.join(fixture.archiveDir, 'SPRINT-99_Test_Sprint.md'),
      'utf8',
    );
    expect(archived).toContain('status: Completed');
    expect(archived).toMatch(/completed_at: \d{4}-\d{2}-\d{2}T/);

    // wikiBuild called before wikiLint
    expect(buildCalls).toHaveLength(1);
    expect(lintCalls).toHaveLength(1);
    // Build was called before lint (both got the cwd)
    expect(buildCalls[0]).toBe(fixture.cwd);
    expect(lintCalls[0]).toBe(fixture.cwd);
  });
});

// ─── Scenario 3: Sprint-archive rolls back on wiki-lint failure ───────────────

describe('Scenario 3: Sprint-archive rolls back on wiki-lint failure', () => {
  let fixture: Fixture;
  beforeEach(() => { fixture = buildFixture({ sprintFrontmatterStatus: 'Planned' }); });
  afterEach(() => fixture.cleanup());

  it('reverts sprint frontmatter to Planned on lint failure', async () => {
    const { exitFn, getCode } = makeExitSeam();
    const cap = makeCapture();

    try {
      await sprintArchiveHandler(
        { sprintId: 'SPRINT-99' },
        {
          sprintFilePath: fixture.sprintFilePath,
          cwd: fixture.cwd,
          stdout: cap.stdout,
          stderr: cap.stderr,
          exit: exitFn,
          spawnFn: () => ({ status: 0, error: null, stdout: '', stderr: '' }) as never,
          wikiBuildFn: async () => { /* ok */ },
          wikiLintFn: async () => { throw new Error('index-budget: wiki/index.md exceeds token ceiling: 9000 > 8000'); },
        },
      );
    } catch { /* expected exit */ }

    expect(getCode()).toBe(1);
    // Sprint file should be restored to Planned
    const sprintOnDisk = fs.readFileSync(fixture.sprintFilePath, 'utf8');
    expect(sprintOnDisk).toContain('status: "Planned"');
    expect(sprintOnDisk).not.toContain('status: Completed');

    // Stderr mentions reverted
    const errOut = cap.getErr().join('\n');
    expect(errOut).toContain('reverted');

    // Sprint file was NOT moved to archive/
    expect(fs.existsSync(fixture.sprintFilePath)).toBe(true);
    const archived = fs.readdirSync(fixture.archiveDir);
    expect(archived).not.toContain('SPRINT-99_Test_Sprint.md');
  });
});

// ─── Scenario 4: Sprint-archive rolls back on wiki-build failure ──────────────

describe('Scenario 4: Sprint-archive rolls back on wiki-build failure', () => {
  let fixture: Fixture;
  beforeEach(() => { fixture = buildFixture({ sprintFrontmatterStatus: 'Planned' }); });
  afterEach(() => fixture.cleanup());

  it('reverts sprint frontmatter to Planned on build failure', async () => {
    const { exitFn, getCode } = makeExitSeam();
    const cap = makeCapture();

    try {
      await sprintArchiveHandler(
        { sprintId: 'SPRINT-99' },
        {
          sprintFilePath: fixture.sprintFilePath,
          cwd: fixture.cwd,
          stdout: cap.stdout,
          stderr: cap.stderr,
          exit: exitFn,
          spawnFn: () => ({ status: 0, error: null, stdout: '', stderr: '' }) as never,
          wikiBuildFn: async () => { throw new Error('wiki build failed: scan error'); },
          wikiLintFn: async () => { /* should not reach here */ },
        },
      );
    } catch { /* expected exit */ }

    expect(getCode()).toBe(1);
    const sprintOnDisk = fs.readFileSync(fixture.sprintFilePath, 'utf8');
    expect(sprintOnDisk).toContain('status: "Planned"');
    const errOut = cap.getErr().join('\n');
    expect(errOut).toContain('reverted');
    const archived = fs.readdirSync(fixture.archiveDir);
    expect(archived).not.toContain('SPRINT-99_Test_Sprint.md');
  });
});

// ─── Scenario 5: Already-terminal sprint ─────────────────────────────────────

describe('Scenario 5: Already-terminal sprint is no-op on status, still stamps completed_at', () => {
  let fixture: Fixture;

  beforeEach(() => {
    fixture = buildFixture({ sprintFrontmatterStatus: 'Completed' });
    // Overwrite sprint file to have Completed status but no completed_at
    const sprintContent = `---
sprint_id: "SPRINT-99"
status: "Completed"
execution_mode: "v2"
epics: ["EPIC-099"]
---

# SPRINT-99: Test Sprint
`;
    fs.writeFileSync(fixture.sprintFilePath, sprintContent);
  });

  afterEach(() => fixture.cleanup());

  it('keeps status=Completed and adds completed_at', async () => {
    const { exitFn } = makeExitSeam();

    try {
      await sprintArchiveHandler(
        { sprintId: 'SPRINT-99' },
        {
          sprintFilePath: fixture.sprintFilePath,
          cwd: fixture.cwd,
          stdout: () => {},
          stderr: () => {},
          exit: exitFn,
          spawnFn: () => ({ status: 0, error: null, stdout: '', stderr: '' }) as never,
          wikiBuildFn: async () => {},
          wikiLintFn: async () => {},
        },
      );
    } catch { /* expected exit */ }

    const archived = fs.readFileSync(
      path.join(fixture.archiveDir, 'SPRINT-99_Test_Sprint.md'),
      'utf8',
    );
    expect(archived).toContain('status: Completed');
    expect(archived).toMatch(/completed_at: \d{4}-\d{2}-\d{2}T/);
  });
});

// ─── Scenario 6 (Gherkin §2.1 Scenario 4): Unmerged sprint rejected ──────────
// Actual guard: state.sprint_status !== 'Completed'.
// Gherkin says "sprint branch not merged" but implementation checks state.json.
// Test matches the actual contract (L271 error string).

describe('Scenario 6: Sprint not closed — guard on state.sprint_status', () => {
  let fixture: Fixture;
  beforeEach(() => { fixture = buildFixture({ sprintStatus: 'Active' }); });
  afterEach(() => fixture.cleanup());

  it('exits non-zero when sprint_status is not Completed', async () => {
    const { exitFn, getCode } = makeExitSeam();
    const cap = makeCapture();

    try {
      await sprintArchiveHandler(
        { sprintId: 'SPRINT-99' },
        {
          sprintFilePath: fixture.sprintFilePath,
          cwd: fixture.cwd,
          stdout: cap.stdout,
          stderr: cap.stderr,
          exit: exitFn,
          spawnFn: () => ({ status: 0, error: null, stdout: '', stderr: '' }) as never,
          wikiBuildFn: async () => {},
          wikiLintFn: async () => {},
        },
      );
    } catch { /* expected exit */ }

    expect(getCode()).toBe(1);
    const errOut = cap.getErr().join('\n');
    // Match actual contract string (not Gherkin "sprint branch not merged")
    expect(errOut).toContain('sprint not closed');
    expect(errOut).toContain('--assume-ack');
  });

  it('makes no frontmatter changes when rejected', async () => {
    const { exitFn } = makeExitSeam();
    const originalContent = fs.readFileSync(fixture.sprintFilePath, 'utf8');

    try {
      await sprintArchiveHandler(
        { sprintId: 'SPRINT-99' },
        {
          sprintFilePath: fixture.sprintFilePath,
          cwd: fixture.cwd,
          stdout: () => {},
          stderr: () => {},
          exit: exitFn,
          spawnFn: () => ({ status: 0, error: null, stdout: '', stderr: '' }) as never,
        },
      );
    } catch { /* expected exit */ }

    const currentContent = fs.readFileSync(fixture.sprintFilePath, 'utf8');
    expect(currentContent).toBe(originalContent);
  });
});

// ─── E2E: Full fixture run with real handlers ─────────────────────────────────
//
// Uses real wikiBuildHandler + wikiLintHandler wired with test seams
// (git runner stub + no-op exit seam) so the full stamp→build→lint→archive
// path is exercised without subprocess git calls or process.exit side effects.

describe('E2E: Full fixture run with real wiki handlers', () => {
  let fixture: Fixture;

  beforeEach(() => {
    fixture = buildFixture({ sprintFrontmatterStatus: 'Planned' });
    // Update the epic file to include its story as a child (avoids broken-backlink lint finding)
    const epicPath = path.join(fixture.pendingDir, 'EPIC-099_Test_Epic.md');
    fs.writeFileSync(epicPath, `---
epic_id: EPIC-099
status: "Active"
parent_sprint_ref: SPRINT-99
children:
  - STORY-099-01
---

# EPIC-099: Test Epic

## Blast radius
Affects: [[SPRINT-99]]

## Children
- [[STORY-099-01]]
`);
    // wiki dir is already created by buildFixture
  });

  afterEach(() => fixture.cleanup());

  it('archives sprint with stamps and exits 0 on happy path', async () => {
    const { exitFn, getCode } = makeExitSeam();
    const cap = makeCapture();

    // Stub git runner — synchronous, returns a fixed SHA for all paths
    const stubGitRunner = (_cmd: string, _args: string[]) => 'abc1234abc1234abc1234abc1234abc1234abc1234';

    // Real wiki handlers wired with test seams (no process.exit, no real git)
    // Resolve template dir — needed because wikiBuildHandler uses import.meta.url to
    // find templates, which resolves to dist/ in compiled form but not in vitest TS mode.
    const templateDir = path.join(REPO_ROOT, 'cleargate-cli', 'templates', 'synthesis');

    // wikiBuildHandler on success returns (no exit call); on failure calls exit(1) which throws.
    // wikiLintHandler on success calls exit(0) which throws; on findings calls exit(1) which throws.
    // We intercept with a fakeExit that throws; success = await returns; failure = exit(nonzero) throws.
    const realBuildFn = async (wCwd: string, wStdout: (s: string) => void) => {
      const fakeExit = (code: number): never => {
        throw new Error(`wiki-build-exit:${code}`);
      };
      try {
        await wikiBuildHandler({
          cwd: wCwd,
          stdout: wStdout,
          exit: fakeExit as never,
          gitRunner: stubGitRunner,
          templateDir,
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.startsWith('wiki-build-exit:0')) return; // success exit
        throw err; // real error
      }
    };

    // wikiLintHandler on success calls exit(0); on findings calls exit(1).
    // Intercept: exit(0) → return; exit(1) → throw.
    const realLintFn = async (wCwd: string, wStdout: (s: string) => void) => {
      const fakeExit = (code: number): never => {
        throw new Error(`wiki-lint-exit:${code}`);
      };
      try {
        await wikiLintHandler({
          cwd: wCwd,
          stdout: wStdout,
          exit: fakeExit as never,
          gitRunner: stubGitRunner,
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : '';
        if (msg.startsWith('wiki-lint-exit:0')) return; // success exit
        throw err; // non-zero exit or real error
      }
    };

    try {
      await sprintArchiveHandler(
        { sprintId: 'SPRINT-99' },
        {
          sprintFilePath: fixture.sprintFilePath,
          cwd: fixture.cwd,
          stdout: cap.stdout,
          stderr: cap.stderr,
          exit: exitFn,
          spawnFn: () => ({ status: 0, error: null, stdout: '', stderr: '' }) as never,
          wikiBuildFn: realBuildFn,
          wikiLintFn: realLintFn,
        },
      );
    } catch { /* expected exit */ }

    expect(getCode()).toBe(0);

    // Sprint file archived with stamps
    const archived = fs.readFileSync(
      path.join(fixture.archiveDir, 'SPRINT-99_Test_Sprint.md'),
      'utf8',
    );
    expect(archived).toContain('status: Completed');
    expect(archived).toMatch(/completed_at: \d{4}-\d{2}-\d{2}T/);

    // All files moved
    const archivedFiles = fs.readdirSync(fixture.archiveDir);
    expect(archivedFiles).toContain('SPRINT-99_Test_Sprint.md');
    expect(archivedFiles).toContain('EPIC-099_Test_Epic.md');
    expect(archivedFiles).toContain('STORY-099-01_Test_Story_1.md');
  });
});
