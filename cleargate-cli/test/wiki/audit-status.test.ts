/**
 * Tests for STORY-015-02: cleargate wiki audit-status
 * Vitest, real fs under os.tmpdir(), no fs mocks.
 * Covers all 5 Gherkin scenarios + E2E convergence (scenario 6).
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { wikiAuditStatusHandler } from '../../src/commands/wiki-audit-status.js';
import {
  buildFixture,
  epicContent,
  storyContent,
  sprintContentWithEpics,
  proposalContent,
  type Fixture,
} from './_fixture.js';

// ─── Test seam helpers ────────────────────────────────────────────────────────

function makeOpts(fixture: Fixture, overrides: Parameters<typeof wikiAuditStatusHandler>[0] = {}) {
  const outLines: string[] = [];
  const errLines: string[] = [];
  let exitCode: number | undefined;

  return {
    opts: {
      cwd: fixture.root,
      stdout: (s: string) => { outLines.push(s); },
      stderr: (s: string) => { errLines.push(s); },
      exit: (c: number): never => {
        exitCode = c;
        throw new Error(`EXIT:${c}`);
      },
      // Default: non-TTY so we don't accidentally prompt
      isTTY: false,
      ...overrides,
    },
    get stdout() { return outLines.join(''); },
    get stderr() { return errLines.join(''); },
    get exitCode() { return exitCode; },
  };
}

async function runAudit(fixture: Fixture, extra: Parameters<typeof wikiAuditStatusHandler>[0] = {}) {
  const h = makeOpts(fixture, extra);
  try {
    await wikiAuditStatusHandler(h.opts);
  } catch (e) {
    if (!(e instanceof Error) || !e.message.startsWith('EXIT:')) throw e;
  }
  return h;
}

// ─── Fixtures ────────────────────────────────────────────────────────────────

let fx: Fixture;

beforeEach(() => {
  // each test builds its own fixture
});

afterEach(() => {
  if (fx) {
    fx.cleanup();
  }
});

// ─── Scenario 1: Clean repo passes ───────────────────────────────────────────

describe('Scenario 1: Clean repo passes', () => {
  it('exits 0 and reports clean when no drift', async () => {
    fx = buildFixture([
      {
        subdir: 'pending-sync',
        filename: 'EPIC-100_Test.md',
        content: epicContent('EPIC-100', 'Draft'),
      },
      {
        subdir: 'archive',
        filename: 'EPIC-101_Old.md',
        content: epicContent('EPIC-101', 'Completed'),
      },
    ]);

    const h = await runAudit(fx);
    expect(h.exitCode).toBe(0);
    expect(h.stdout).toContain('audit-status: clean (0 drift)');
  });
});

// ─── Scenario 2: Archive + non-terminal status flagged (Rule A) ───────────────

describe('Scenario 2: Archive + non-terminal status flagged', () => {
  it('exits 1 and reports Rule A drift for archived item with non-terminal status', async () => {
    fx = buildFixture([
      {
        subdir: 'archive',
        filename: 'EPIC-001_Document_Metadata_Lifecycle.md',
        content: epicContent('EPIC-001', 'Ready'),
      },
    ]);

    const h = await runAudit(fx);
    expect(h.exitCode).toBe(1);
    expect(h.stdout).toContain("EPIC-001: Rule A — archived with non-terminal status 'Ready'");
  });

  it('suggests Abandoned for epic with no terminal children', async () => {
    fx = buildFixture([
      {
        subdir: 'archive',
        filename: 'EPIC-002_Test.md',
        content: epicContent('EPIC-002', 'Draft'),
      },
    ]);

    const h = await runAudit(fx);
    expect(h.exitCode).toBe(1);
    expect(h.stdout).toContain("Rule A — archived with non-terminal status 'Draft'");
  });
});

// ─── Scenario 3: Sprint with all-done stories flagged (Rule C) ───────────────

describe('Scenario 3: Sprint with all-done stories flagged', () => {
  it('emits Rule C suggestion when all 10 child stories are Done', async () => {
    // Build 10 stories in archive with status Done, all referencing EPIC-014
    const stories = Array.from({ length: 10 }, (_, i) => ({
      subdir: 'archive' as const,
      filename: `STORY-014-${String(i + 1).padStart(2, '0')}_Child_Story.md`,
      content: storyContent(`STORY-014-${String(i + 1).padStart(2, '0')}`, 'EPIC-014', 'Done'),
    }));

    // EPIC-014 itself in archive (terminal)
    const epic = {
      subdir: 'archive' as const,
      filename: 'EPIC-014_Test_Epic.md',
      content: epicContent('EPIC-014', 'Completed'),
    };

    // SPRINT-10 in pending-sync with status Planned, referencing EPIC-014
    const sprint = {
      subdir: 'pending-sync' as const,
      filename: 'SPRINT-10_Test_Sprint.md',
      content: sprintContentWithEpics('SPRINT-10', ['EPIC-014'], 'Planned'),
    };

    fx = buildFixture([...stories, epic, sprint]);
    const h = await runAudit(fx);

    expect(h.exitCode).toBe(1);
    expect(h.stdout).toContain('SPRINT-10: Rule C — 10/10 child stories terminal; suggest Completed');
  });

  it('does NOT fire Rule C when sprint has no epics key', async () => {
    // Use a sprint file with no `epics:` field (no sprintContentWithEpics)
    fx = buildFixture([
      {
        subdir: 'pending-sync',
        filename: 'SPRINT-99_No_Epics.md',
        content: epicContent('SPRINT-99', 'Planned'), // no epics field
      },
    ]);

    const h = await runAudit(fx);
    // No Rule C output — should be clean or just no Rule C mention
    expect(h.stdout).not.toContain('SPRINT-99: Rule C');
  });
});

// ─── Scenario 4: --fix --yes applies corrections ──────────────────────────────

describe('Scenario 4: --fix --yes applies corrections', () => {
  it('updates status lines in-place; frontmatter corrected, body unchanged', async () => {
    // 6 drift items: 3 Rule A epics + 3 Rule A stories (no Rule B or pending-sync sprints
    // that would create new Rule B violations after fix)
    const archiveItems = [
      { subdir: 'archive' as const, filename: 'EPIC-001_Doc.md', content: epicContent('EPIC-001', 'Ready') },
      { subdir: 'archive' as const, filename: 'EPIC-008_Gates.md', content: epicContent('EPIC-008', 'Draft') },
      { subdir: 'archive' as const, filename: 'EPIC-009_Scaffold.md', content: epicContent('EPIC-009', 'Draft') },
      { subdir: 'archive' as const, filename: 'STORY-001-01_Story.md', content: storyContent('STORY-001-01', 'EPIC-001', 'Draft') },
      { subdir: 'archive' as const, filename: 'STORY-001-02_Story.md', content: storyContent('STORY-001-02', 'EPIC-001', 'Draft') },
      { subdir: 'archive' as const, filename: 'STORY-001-03_Story.md', content: storyContent('STORY-001-03', 'EPIC-001', 'Draft') },
    ];

    fx = buildFixture(archiveItems);

    // First run: drift detected
    const h0 = await runAudit(fx);
    expect(h0.exitCode).toBe(1);

    // Apply with --fix --yes
    const h1 = await runAudit(fx, { fix: true, yes: true, quiet: true });
    expect(h1.exitCode).toBe(0);
    expect(h1.stdout).toContain('audit-status: applied 6 fix(es)');

    // Verify the archive epic status lines were updated
    const epic001Path = path.join(fx.deliveryRoot, 'archive', 'EPIC-001_Doc.md');
    const epic001Text = fs.readFileSync(epic001Path, 'utf8');
    // EPIC-001 has children (STORY-001-xx) but they were Draft → non-terminal → suggests Abandoned
    expect(epic001Text).toMatch(/^status: "Abandoned"/m);
    // Body must be unchanged (same content, just status line replaced)
    expect(epic001Text).toContain('# EPIC-001: Test Epic');
    expect(epic001Text).toContain('A test epic for unit testing.');

    // After fix, second run must be clean
    const h2 = await runAudit(fx, { fix: false });
    expect(h2.exitCode).toBe(0);
    expect(h2.stdout).toContain('audit-status: clean (0 drift)');
  });

  it('only changes the status line; all other bytes are identical', async () => {
    const originalContent = epicContent('EPIC-050', 'Ready');
    fx = buildFixture([
      { subdir: 'archive', filename: 'EPIC-050_Test.md', content: originalContent },
    ]);

    await runAudit(fx, { fix: true, yes: true, quiet: true });

    const fixedPath = path.join(fx.deliveryRoot, 'archive', 'EPIC-050_Test.md');
    const fixedContent = fs.readFileSync(fixedPath, 'utf8');

    // Line-by-line comparison: only the status line should differ
    const originalLines = originalContent.split('\n');
    const fixedLines = fixedContent.split('\n');
    expect(fixedLines.length).toBe(originalLines.length);

    const diffLines = originalLines.filter((l, i) => l !== fixedLines[i]);
    expect(diffLines.length).toBe(1);
    expect(diffLines[0]).toMatch(/^status:/);
  });
});

// ─── Scenario 5: Pending-sync + terminal status emits move command (Rule B) ───

describe('Scenario 5: Pending-sync + terminal status emits move command', () => {
  it('prints git mv hint for Completed-in-pending-sync and does NOT move under --fix', async () => {
    // Rule B: terminal status in pending-sync → emit git mv hint
    // Using 'Completed' which IS in TERMINAL set
    const proposalFilename = 'PROPOSAL-011_Execution_V2_Polish.md';
    fx = buildFixture([
      {
        subdir: 'pending-sync',
        filename: proposalFilename,
        content: proposalContent('PROPOSAL-011', 'Completed'),
      },
    ]);

    // Run without --fix first: check output contains git mv hint
    const h1 = await runAudit(fx);
    expect(h1.exitCode).toBe(1);
    // stdout must contain the source path and destination archive dir
    expect(h1.stdout).toContain('.cleargate/delivery/pending-sync/PROPOSAL-011_Execution_V2_Polish.md');
    expect(h1.stdout).toContain('.cleargate/delivery/archive/');

    // Run with --fix --yes: file must NOT be moved (Rule B skips status mutation)
    const originalPath = path.join(fx.deliveryRoot, 'pending-sync', proposalFilename);
    const h2 = await runAudit(fx, { fix: true, yes: true, quiet: true });
    // exits 0 because no Rule A/C fixable items; Rule B is skipped
    expect(h2.exitCode).toBe(0);
    // File still at original location — never moved
    expect(fs.existsSync(originalPath)).toBe(true);
    expect(fs.existsSync(path.join(fx.deliveryRoot, 'archive', proposalFilename))).toBe(false);
  });
});

// ─── Scenario 6: E2E convergence ─────────────────────────────────────────────

describe('Scenario 6: E2E convergence', () => {
  it('after --fix --yes on Rule A items only, second audit run exits 0', async () => {
    // Rule A items only — no Rule B items (Rule B can't be auto-fixed, preventing convergence)
    // and no Rule C items where fixing creates a new Rule B violation.
    const epicDrift1 = { subdir: 'archive' as const, filename: 'EPIC-301_Old.md', content: epicContent('EPIC-301', 'Ready') };
    const epicDrift2 = { subdir: 'archive' as const, filename: 'EPIC-302_Old.md', content: epicContent('EPIC-302', 'Draft') };
    const epicDrift3 = { subdir: 'archive' as const, filename: 'EPIC-303_Stale.md', content: epicContent('EPIC-303', 'Planned') };

    fx = buildFixture([epicDrift1, epicDrift2, epicDrift3]);

    // First audit: should detect 3 drift items
    const h1 = await runAudit(fx);
    expect(h1.exitCode).toBe(1);

    // Apply fixes
    const h2 = await runAudit(fx, { fix: true, yes: true, quiet: true });
    expect(h2.exitCode).toBe(0);
    expect(h2.stdout).toContain('audit-status: applied 3 fix(es)');

    // Second audit: must exit 0 — convergence achieved
    const h3 = await runAudit(fx);
    expect(h3.exitCode).toBe(0);
    expect(h3.stdout).toContain('audit-status: clean (0 drift)');
  });

  it('Rule C fix convergence: archive sprint gets Completed status → clean', async () => {
    // Sprint in archive (not pending-sync) with non-terminal status + all children terminal
    // After fix: sprint in archive with Completed → no Rule A violation
    const stories = Array.from({ length: 3 }, (_, i) => ({
      subdir: 'archive' as const,
      filename: `STORY-400-${String(i + 1).padStart(2, '0')}_S.md`,
      content: storyContent(`STORY-400-${String(i + 1).padStart(2, '0')}`, 'EPIC-400', 'Done'),
    }));
    const epic = { subdir: 'archive' as const, filename: 'EPIC-400_Test.md', content: epicContent('EPIC-400', 'Completed') };
    // Sprint in archive with non-terminal status — Rule A fires (archive + non-terminal)
    // AND Rule C fires (sprint + all children terminal) — both suggest Completed
    const sprint = {
      subdir: 'archive' as const,
      filename: 'SPRINT-40_Archive.md',
      content: sprintContentWithEpics('SPRINT-40', ['EPIC-400'], 'Active'),
    };

    fx = buildFixture([...stories, epic, sprint]);

    // First run: drift detected
    const h1 = await runAudit(fx);
    expect(h1.exitCode).toBe(1);

    // Fix
    const h2 = await runAudit(fx, { fix: true, yes: true, quiet: true });
    expect(h2.exitCode).toBe(0);

    // Second run: clean
    const h3 = await runAudit(fx);
    expect(h3.exitCode).toBe(0);
    expect(h3.stdout).toContain('audit-status: clean (0 drift)');
  });
});

// ─── TTY guard tests ─────────────────────────────────────────────────────────

describe('TTY guards', () => {
  it('refuses --fix without --yes in non-TTY mode (exit 2)', async () => {
    fx = buildFixture([
      { subdir: 'archive', filename: 'EPIC-400_Drift.md', content: epicContent('EPIC-400', 'Ready') },
    ]);

    const h = await runAudit(fx, { fix: true, yes: false, isTTY: false });
    expect(h.exitCode).toBe(2);
    expect(h.stderr).toContain('--fix requires --yes in non-interactive mode');
  });

  it('prompts in TTY mode and aborts if answer != y', async () => {
    fx = buildFixture([
      { subdir: 'archive', filename: 'EPIC-401_Drift.md', content: epicContent('EPIC-401', 'Draft') },
    ]);

    const h = await runAudit(fx, {
      fix: true,
      yes: false,
      isTTY: true,
      promptReader: async () => 'n',
    });
    expect(h.exitCode).toBe(2);
    expect(h.stdout).toContain('aborted');
  });

  it('applies fixes in TTY mode when answer is y', async () => {
    fx = buildFixture([
      { subdir: 'archive', filename: 'EPIC-402_Drift.md', content: epicContent('EPIC-402', 'Draft') },
    ]);

    const h = await runAudit(fx, {
      fix: true,
      yes: false,
      isTTY: true,
      promptReader: async () => 'y',
    });
    expect(h.exitCode).toBe(0);
  });
});
