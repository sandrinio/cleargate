/**
 * Tests for STORY-015-01: Hierarchical Index Rendering
 * Vitest, real fs under os.tmpdir(), no fs mocks.
 *
 * Covers all 5 Gherkin scenarios from §2.1 plus the explicit n=3 boundary
 * test for the rollup threshold (plan §Cross-story risks item 3).
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as url from 'node:url';
import * as crypto from 'node:crypto';
import { wikiBuildHandler } from '../../src/commands/wiki-build.js';
import {
  buildFixture,
  epicContent,
  storyContent,
  sprintContent,
  proposalContent,
  type Fixture,
} from './_fixture.js';

// ─── Test seam helpers ────────────────────────────────────────────────────────

const FROZEN_NOW = '2026-04-19T12:00:00.000Z';

const __testDirname = path.dirname(url.fileURLToPath(import.meta.url));
const TEMPLATE_DIR = path.resolve(__testDirname, '../../templates/synthesis');

function makeOpts(fixture: Fixture, overrides: Parameters<typeof wikiBuildHandler>[0] = {}) {
  const out: string[] = [];
  const err: string[] = [];
  let exitCode: number | undefined;

  return {
    opts: {
      cwd: fixture.root,
      now: () => FROZEN_NOW,
      stdout: (s: string) => { out.push(s); },
      stderr: (s: string) => { err.push(s); },
      exit: (c: number): never => {
        exitCode = c;
        throw new Error(`EXIT:${c}`);
      },
      templateDir: TEMPLATE_DIR,
      ...overrides,
    },
    get stdout() { return out.join(''); },
    get stderr() { return err.join(''); },
    get exitCode() { return exitCode; },
  };
}

async function runBuild(fixture: Fixture, overrides: Parameters<typeof wikiBuildHandler>[0] = {}) {
  const wrapped = makeOpts(fixture, overrides);
  try {
    await wikiBuildHandler(wrapped.opts);
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('EXIT:')) return wrapped;
    throw e;
  }
  return wrapped;
}

function readIndex(fixture: Fixture): string {
  return fs.readFileSync(path.join(fixture.wikiRoot, 'index.md'), 'utf8');
}

// ─── Scenario 1 (Gherkin): Active/Archive split ───────────────────────────────
// Given a delivery/ with 15 epics (7 Completed, 1 Approved, 7 Draft/Ready)
// Then ## Active appears before ## Archive; Active lists only 8 non-terminal epics

describe('Scenario 1 (Gherkin): Active/Archive split', () => {
  let fixture: Fixture;

  beforeEach(() => {
    const items = [
      // 7 Completed (terminal → Archive)
      { subdir: 'archive' as const, filename: 'EPIC-001_Done.md', content: epicContent('EPIC-001', 'Completed') },
      { subdir: 'archive' as const, filename: 'EPIC-002_Done.md', content: epicContent('EPIC-002', 'Completed') },
      { subdir: 'archive' as const, filename: 'EPIC-003_Done.md', content: epicContent('EPIC-003', 'Completed') },
      { subdir: 'archive' as const, filename: 'EPIC-004_Done.md', content: epicContent('EPIC-004', 'Completed') },
      { subdir: 'archive' as const, filename: 'EPIC-005_Done.md', content: epicContent('EPIC-005', 'Completed') },
      { subdir: 'archive' as const, filename: 'EPIC-006_Done.md', content: epicContent('EPIC-006', 'Completed') },
      { subdir: 'archive' as const, filename: 'EPIC-007_Done.md', content: epicContent('EPIC-007', 'Completed') },
      // 1 Approved (non-terminal → Active)
      { subdir: 'pending-sync' as const, filename: 'EPIC-008_Approved.md', content: epicContent('EPIC-008', 'Approved') },
      // 7 Draft/Ready (non-terminal → Active)
      { subdir: 'pending-sync' as const, filename: 'EPIC-009_Draft.md', content: epicContent('EPIC-009', 'Draft') },
      { subdir: 'pending-sync' as const, filename: 'EPIC-010_Ready.md', content: epicContent('EPIC-010', 'Ready') },
      { subdir: 'pending-sync' as const, filename: 'EPIC-011_Draft.md', content: epicContent('EPIC-011', 'Draft') },
      { subdir: 'pending-sync' as const, filename: 'EPIC-012_Ready.md', content: epicContent('EPIC-012', 'Ready') },
      { subdir: 'pending-sync' as const, filename: 'EPIC-013_Draft.md', content: epicContent('EPIC-013', 'Draft') },
      { subdir: 'pending-sync' as const, filename: 'EPIC-014_Ready.md', content: epicContent('EPIC-014', 'Ready') },
      { subdir: 'pending-sync' as const, filename: 'EPIC-015_Draft.md', content: epicContent('EPIC-015', 'Draft') },
    ];
    fixture = buildFixture(items);
  });

  afterEach(() => fixture.cleanup());

  it('index.md contains "## Active" before "## Archive"', async () => {
    await runBuild(fixture);
    const index = readIndex(fixture);
    const activePos = index.indexOf('## Active');
    const archivePos = index.indexOf('## Archive');
    expect(activePos).toBeGreaterThanOrEqual(0);
    expect(archivePos).toBeGreaterThanOrEqual(0);
    expect(activePos).toBeLessThan(archivePos);
  });

  it('Active section lists only the 8 non-terminal epics by ID', async () => {
    await runBuild(fixture);
    const index = readIndex(fixture);
    // Active section: text between ## Active and ## Archive
    const activeSection = index.slice(index.indexOf('## Active'), index.indexOf('## Archive'));
    // All 8 non-terminal epics should appear
    for (const id of ['EPIC-008', 'EPIC-009', 'EPIC-010', 'EPIC-011', 'EPIC-012', 'EPIC-013', 'EPIC-014', 'EPIC-015']) {
      expect(activeSection, `Expected ${id} in Active section`).toContain(id);
    }
    // None of the 7 Completed epics should appear in Active
    for (const id of ['EPIC-001', 'EPIC-002', 'EPIC-003', 'EPIC-004', 'EPIC-005', 'EPIC-006', 'EPIC-007']) {
      expect(activeSection, `${id} should NOT be in Active section`).not.toContain(id);
    }
  });

  it('Archive section contains "Epics: 7 Completed"', async () => {
    await runBuild(fixture);
    const index = readIndex(fixture);
    const archiveSection = index.slice(index.indexOf('## Archive'));
    expect(archiveSection).toContain('7 Completed');
  });

  it('Completed epics do not appear as individual rows', async () => {
    await runBuild(fixture);
    const index = readIndex(fixture);
    // Individual rows would look like [[EPIC-001]]; they must not appear anywhere
    for (const id of ['EPIC-001', 'EPIC-002', 'EPIC-003']) {
      expect(index).not.toContain(`[[${id}]]`);
    }
  });
});

// ─── Scenario 2 (Gherkin): Story rollup under epic (n=10) ────────────────────
// Given EPIC-014 has 10 stories all status=Ready
// Then "STORY-014-xx (10 stories) — 10 Ready" appears under EPIC-014
// And no individual STORY-014-xx row appears in Active

describe('Scenario 2 (Gherkin): Story rollup under epic (n=10)', () => {
  let fixture: Fixture;

  beforeEach(() => {
    const items: Array<{ subdir: 'pending-sync' | 'archive'; filename: string; content: string }> = [
      { subdir: 'pending-sync', filename: 'EPIC-014_Active.md', content: epicContent('EPIC-014', 'Ready') },
    ];
    for (let i = 1; i <= 10; i++) {
      const storyId = `STORY-014-${String(i).padStart(2, '0')}`;
      items.push({
        subdir: 'pending-sync',
        filename: `${storyId}_Story.md`,
        content: storyContent(storyId, 'EPIC-014', 'Ready'),
      });
    }
    fixture = buildFixture(items);
  });

  afterEach(() => fixture.cleanup());

  it('rollup line "STORY-014-xx (10 stories) — 10 Ready" appears under EPIC-014', async () => {
    await runBuild(fixture);
    const index = readIndex(fixture);
    expect(index).toContain('STORY-014-xx (10 stories) — 10 Ready');
  });

  it('no individual [[STORY-014-xx]] row appears in Active', async () => {
    await runBuild(fixture);
    const index = readIndex(fixture);
    const activeSection = index.slice(index.indexOf('## Active'), index.indexOf('## Archive'));
    // None of the individual story IDs should appear as wikilinks in Active
    for (let i = 1; i <= 10; i++) {
      const storyId = `STORY-014-${String(i).padStart(2, '0')}`;
      expect(activeSection, `${storyId} should be rolled up, not individual`).not.toContain(`[[${storyId}]]`);
    }
  });

  it('EPIC-014 itself still appears in Active', async () => {
    await runBuild(fixture);
    const index = readIndex(fixture);
    const activeSection = index.slice(index.indexOf('## Active'), index.indexOf('## Archive'));
    expect(activeSection).toContain('EPIC-014');
  });
});

// ─── Scenario 2b (Boundary): Exactly n=3 stories collapses (threshold test) ──

describe('Scenario 2b (Boundary): Exactly 3 stories under epic triggers rollup', () => {
  let fixture: Fixture;

  beforeEach(() => {
    fixture = buildFixture([
      { subdir: 'pending-sync', filename: 'EPIC-020_Active.md', content: epicContent('EPIC-020', 'Ready') },
      { subdir: 'pending-sync', filename: 'STORY-020-01_S.md', content: storyContent('STORY-020-01', 'EPIC-020', 'Ready') },
      { subdir: 'pending-sync', filename: 'STORY-020-02_S.md', content: storyContent('STORY-020-02', 'EPIC-020', 'Draft') },
      { subdir: 'pending-sync', filename: 'STORY-020-03_S.md', content: storyContent('STORY-020-03', 'EPIC-020', 'Ready') },
    ]);
  });

  afterEach(() => fixture.cleanup());

  it('exactly 3 stories collapses to rollup line (>= threshold)', async () => {
    await runBuild(fixture);
    const index = readIndex(fixture);
    expect(index).toContain('STORY-020-xx (3 stories)');
  });

  it('no individual [[STORY-020-xx]] rows in Active when exactly 3', async () => {
    await runBuild(fixture);
    const index = readIndex(fixture);
    const activeSection = index.slice(index.indexOf('## Active'), index.indexOf('## Archive'));
    expect(activeSection).not.toContain('[[STORY-020-01]]');
    expect(activeSection).not.toContain('[[STORY-020-02]]');
    expect(activeSection).not.toContain('[[STORY-020-03]]');
  });

  it('exactly 2 stories does NOT collapse (shows individual rows)', async () => {
    // Use a different epic with only 2 stories
    const f2 = buildFixture([
      { subdir: 'pending-sync', filename: 'EPIC-021_Active.md', content: epicContent('EPIC-021', 'Ready') },
      { subdir: 'pending-sync', filename: 'STORY-021-01_S.md', content: storyContent('STORY-021-01', 'EPIC-021', 'Ready') },
      { subdir: 'pending-sync', filename: 'STORY-021-02_S.md', content: storyContent('STORY-021-02', 'EPIC-021', 'Ready') },
    ]);
    try {
      await runBuild(f2);
      const index = fs.readFileSync(path.join(f2.wikiRoot, 'index.md'), 'utf8');
      const activeSection = index.slice(index.indexOf('## Active'), index.indexOf('## Archive'));
      expect(activeSection).toContain('[[STORY-021-01]]');
      expect(activeSection).toContain('[[STORY-021-02]]');
      expect(activeSection).not.toContain('STORY-021-xx');
    } finally {
      f2.cleanup();
    }
  });
});

// ─── Scenario 3 (Gherkin): Orphan story keeps individual row ─────────────────
// Given STORY-999-00 exists with no parent_epic_ref set and status=Ready
// Then [[STORY-999-00]] appears as its own row in Active

describe('Scenario 3 (Gherkin): Orphan story keeps individual row', () => {
  let fixture: Fixture;

  beforeEach(() => {
    fixture = buildFixture([
      // Orphan: empty parent_epic_ref
      { subdir: 'pending-sync', filename: 'STORY-999-00_Orphan.md', content: storyContent('STORY-999-00', '', 'Ready') },
      // An active epic with 1 story (below threshold — won't collapse, but verifies orphan is separate)
      { subdir: 'pending-sync', filename: 'EPIC-001_Active.md', content: epicContent('EPIC-001', 'Ready') },
    ]);
  });

  afterEach(() => fixture.cleanup());

  it('[[STORY-999-00]] appears as its own row in Active', async () => {
    await runBuild(fixture);
    const index = readIndex(fixture);
    const activeSection = index.slice(index.indexOf('## Active'), index.indexOf('## Archive'));
    expect(activeSection).toContain('[[STORY-999-00]]');
  });

  it('orphan story is NOT in Archive section', async () => {
    await runBuild(fixture);
    const index = readIndex(fixture);
    const archiveSection = index.slice(index.indexOf('## Archive'));
    // The archive section should not list STORY-999-00 as a terminal item
    // (it's non-terminal; if it appears in archive summary it would just be in count)
    // but since it IS non-terminal, it won't be in archived[] at all
    expect(archiveSection).not.toContain('[[STORY-999-00]]');
  });
});

// ─── Scenario 3b: Orphan — parent epic is Completed (parent not in Active) ───

describe('Scenario 3b: Story whose parent epic is Completed becomes orphan', () => {
  let fixture: Fixture;

  beforeEach(() => {
    fixture = buildFixture([
      // Parent epic is Completed → archived → not in activeEpicIds
      { subdir: 'archive', filename: 'EPIC-002_Done.md', content: epicContent('EPIC-002', 'Completed') },
      // Story with parent_epic_ref pointing to archived epic → orphan in Active
      { subdir: 'pending-sync', filename: 'STORY-002-01_Straggler.md', content: storyContent('STORY-002-01', 'EPIC-002', 'Ready') },
    ]);
  });

  afterEach(() => fixture.cleanup());

  it('story with archived-epic parent appears as individual row in Active', async () => {
    await runBuild(fixture);
    const index = readIndex(fixture);
    const activeSection = index.slice(index.indexOf('## Active'), index.indexOf('## Archive'));
    expect(activeSection).toContain('[[STORY-002-01]]');
  });
});

// ─── Scenario 4 (Gherkin): Archive collapsed to summary ──────────────────────
// Given 7 epics are Completed and 2 are Abandoned
// Then Archive section contains "Epics: 7 Completed · 2 Abandoned"
// And no individual Completed/Abandoned epic row appears

describe('Scenario 4 (Gherkin): Archive collapsed to summary', () => {
  let fixture: Fixture;

  beforeEach(() => {
    const items: Array<{ subdir: 'pending-sync' | 'archive'; filename: string; content: string }> = [];
    // 7 Completed
    for (let i = 1; i <= 7; i++) {
      items.push({
        subdir: 'archive',
        filename: `EPIC-${String(i).padStart(3, '0')}_Done.md`,
        content: epicContent(`EPIC-${String(i).padStart(3, '0')}`, 'Completed'),
      });
    }
    // 2 Abandoned
    items.push({ subdir: 'archive', filename: 'EPIC-008_Abandoned.md', content: epicContent('EPIC-008', 'Abandoned') });
    items.push({ subdir: 'archive', filename: 'EPIC-009_Abandoned.md', content: epicContent('EPIC-009', 'Abandoned') });
    fixture = buildFixture(items);
  });

  afterEach(() => fixture.cleanup());

  it('Archive section contains "7 Completed" for epics', async () => {
    await runBuild(fixture);
    const index = readIndex(fixture);
    const archiveSection = index.slice(index.indexOf('## Archive'));
    expect(archiveSection).toContain('7 Completed');
  });

  it('Archive section contains "2 Abandoned" for epics', async () => {
    await runBuild(fixture);
    const index = readIndex(fixture);
    const archiveSection = index.slice(index.indexOf('## Archive'));
    expect(archiveSection).toContain('2 Abandoned');
  });

  it('Archive epic summary is on a single line "Epics: 7 Completed · 2 Abandoned"', async () => {
    await runBuild(fixture);
    const index = readIndex(fixture);
    // The line order: 7 Completed appears before 2 Abandoned (sorted by count desc)
    const archiveSection = index.slice(index.indexOf('## Archive'));
    expect(archiveSection).toContain('Epics: 7 Completed · 2 Abandoned');
  });

  it('no individual [[EPIC-xxx]] rows appear in the rendered index', async () => {
    await runBuild(fixture);
    const index = readIndex(fixture);
    for (let i = 1; i <= 9; i++) {
      const id = `EPIC-${String(i).padStart(3, '0')}`;
      expect(index, `${id} must not appear as individual [[wikilink]]`).not.toContain(`[[${id}]]`);
    }
  });
});

// ─── Scenario 5 (Gherkin): Idempotent rebuild ────────────────────────────────
// Given index.md has been built once
// When built again with no raw-item changes
// Then byte-identical index.md

describe('Scenario 5 (Gherkin): Idempotent rebuild', () => {
  let fixture: Fixture;

  beforeEach(() => {
    fixture = buildFixture([
      { subdir: 'pending-sync', filename: 'EPIC-001_Active.md', content: epicContent('EPIC-001', 'Ready') },
      { subdir: 'pending-sync', filename: 'EPIC-002_Active.md', content: epicContent('EPIC-002', 'Draft') },
      { subdir: 'archive', filename: 'EPIC-003_Done.md', content: epicContent('EPIC-003', 'Completed') },
      { subdir: 'pending-sync', filename: 'STORY-001-01_S.md', content: storyContent('STORY-001-01', 'EPIC-001', 'Ready') },
      { subdir: 'pending-sync', filename: 'STORY-001-02_S.md', content: storyContent('STORY-001-02', 'EPIC-001', 'Draft') },
      { subdir: 'pending-sync', filename: 'STORY-001-03_S.md', content: storyContent('STORY-001-03', 'EPIC-001', 'Ready') },
      { subdir: 'pending-sync', filename: 'SPRINT-01_Active.md', content: sprintContent('SPRINT-01', 'Active') },
      { subdir: 'pending-sync', filename: 'PROPOSAL-001_Draft.md', content: proposalContent('PROPOSAL-001', 'Draft') },
    ]);
  });

  afterEach(() => fixture.cleanup());

  it('two builds with frozen now produce byte-identical index.md', async () => {
    await runBuild(fixture);
    const content1 = readIndex(fixture);

    await runBuild(fixture);
    const content2 = readIndex(fixture);

    expect(content1).toBe(content2);
  });

  it('two builds produce byte-identical index.md (SHA comparison)', async () => {
    await runBuild(fixture);
    const hash1 = crypto.createHash('sha256').update(readIndex(fixture)).digest('hex');

    await runBuild(fixture);
    const hash2 = crypto.createHash('sha256').update(readIndex(fixture)).digest('hex');

    expect(hash1).toBe(hash2);
  });
});

// ─── Additional: Empty delivery → empty-state format ─────────────────────────

describe('Additional: Empty delivery uses hierarchical empty-state format', () => {
  let fixture: Fixture;

  beforeEach(() => {
    fixture = buildFixture([]);
  });

  afterEach(() => fixture.cleanup());

  it('index.md contains "## Active" and "## Archive" even when empty', async () => {
    await runBuild(fixture);
    const index = readIndex(fixture);
    expect(index).toContain('## Active');
    expect(index).toContain('## Archive');
  });

  it('index.md contains "_No active items._" placeholder', async () => {
    await runBuild(fixture);
    const index = readIndex(fixture);
    expect(index).toContain('_No active items._');
  });

  it('index.md contains "_No archived items._" placeholder', async () => {
    await runBuild(fixture);
    const index = readIndex(fixture);
    expect(index).toContain('_No archived items._');
  });
});

// ─── Additional: Status breakdown sorting ─────────────────────────────────────

describe('Additional: Rollup status breakdown sorted by count desc', () => {
  let fixture: Fixture;

  beforeEach(() => {
    fixture = buildFixture([
      { subdir: 'pending-sync', filename: 'EPIC-030_Active.md', content: epicContent('EPIC-030', 'Ready') },
      // 5 Ready, 3 Draft → breakdown should be "5 Ready · 3 Draft"
      { subdir: 'pending-sync', filename: 'STORY-030-01_S.md', content: storyContent('STORY-030-01', 'EPIC-030', 'Ready') },
      { subdir: 'pending-sync', filename: 'STORY-030-02_S.md', content: storyContent('STORY-030-02', 'EPIC-030', 'Ready') },
      { subdir: 'pending-sync', filename: 'STORY-030-03_S.md', content: storyContent('STORY-030-03', 'EPIC-030', 'Ready') },
      { subdir: 'pending-sync', filename: 'STORY-030-04_S.md', content: storyContent('STORY-030-04', 'EPIC-030', 'Ready') },
      { subdir: 'pending-sync', filename: 'STORY-030-05_S.md', content: storyContent('STORY-030-05', 'EPIC-030', 'Ready') },
      { subdir: 'pending-sync', filename: 'STORY-030-06_S.md', content: storyContent('STORY-030-06', 'EPIC-030', 'Draft') },
      { subdir: 'pending-sync', filename: 'STORY-030-07_S.md', content: storyContent('STORY-030-07', 'EPIC-030', 'Draft') },
      { subdir: 'pending-sync', filename: 'STORY-030-08_S.md', content: storyContent('STORY-030-08', 'EPIC-030', 'Draft') },
    ]);
  });

  afterEach(() => fixture.cleanup());

  it('status breakdown shows "5 Ready · 3 Draft" (count desc)', async () => {
    await runBuild(fixture);
    const index = readIndex(fixture);
    expect(index).toContain('STORY-030-xx (8 stories) — 5 Ready · 3 Draft');
  });
});

// ─── Additional: "Done" is also terminal (alias for Completed) ────────────────

describe('Additional: "Done" status is treated as terminal (alias)', () => {
  let fixture: Fixture;

  beforeEach(() => {
    fixture = buildFixture([
      { subdir: 'archive', filename: 'EPIC-040_Done.md', content: epicContent('EPIC-040', 'Done') },
      { subdir: 'pending-sync', filename: 'EPIC-041_Active.md', content: epicContent('EPIC-041', 'Ready') },
    ]);
  });

  afterEach(() => fixture.cleanup());

  it('EPIC-040 with status Done goes to Archive, not Active', async () => {
    await runBuild(fixture);
    const index = readIndex(fixture);
    const activeSection = index.slice(index.indexOf('## Active'), index.indexOf('## Archive'));
    expect(activeSection).not.toContain('EPIC-040');
    const archiveSection = index.slice(index.indexOf('## Archive'));
    expect(archiveSection).toContain('1 Done');
  });
});
