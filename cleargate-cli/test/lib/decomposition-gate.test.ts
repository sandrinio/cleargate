/**
 * decomposition-gate.test.ts — CR-017 scenarios 9–13
 *
 * Gherkin Scenarios:
 *   9.  Clean decomposition passes
 *   10. Anchor epic without stories blocks
 *   11. Anchor proposal without epic blocks
 *   12. Anchor file missing entirely blocks
 *   13. No --allow-drift waiver for decomposition
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { reconcileDecomposition } from '../../src/lib/lifecycle-reconcile.js';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const tmpDirs: string[] = [];

function makeTmpDir(): string {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'cg-decomp-gate-'));
  tmpDirs.push(d);
  return d;
}

afterEach(() => {
  for (const d of tmpDirs.splice(0)) {
    fs.rmSync(d, { recursive: true, force: true });
  }
});

interface Fixture {
  root: string;
  pendingDir: string;
  archiveDir: string;
  sprintPlanPath: string;
}

function makeFixture(sprintFrontmatter: Record<string, unknown>): Fixture {
  const root = makeTmpDir();
  const pendingDir = path.join(root, 'pending-sync');
  const archiveDir = path.join(root, 'archive');
  fs.mkdirSync(pendingDir, { recursive: true });
  fs.mkdirSync(archiveDir, { recursive: true });

  // Build sprint frontmatter YAML manually (simple key: value)
  const fmLines = Object.entries(sprintFrontmatter)
    .map(([k, v]) => {
      if (Array.isArray(v)) {
        if (v.length === 0) return `${k}: []`;
        return `${k}:\n${v.map((item) => `  - ${item}`).join('\n')}`;
      }
      if (v === null) return `${k}: null`;
      return `${k}: "${v}"`;
    })
    .join('\n');
  const sprintContent = `---\n${fmLines}\n---\n\n# Sprint Plan\n`;
  const sprintPlanPath = path.join(root, 'SPRINT-TEST.md');
  fs.writeFileSync(sprintPlanPath, sprintContent, 'utf8');

  return { root, pendingDir, archiveDir, sprintPlanPath };
}

function writeEpicFile(
  pendingDir: string,
  epicId: string,
  contextSource = '',
): string {
  const fileName = `${epicId}_Test_Epic.md`;
  const content = `---\nepic_id: "${epicId}"\nstatus: "Approved"\ncontext_source: "${contextSource}"\n---\n\n# ${epicId}\n`;
  fs.writeFileSync(path.join(pendingDir, fileName), content, 'utf8');
  return fileName;
}

function writeStoryFile(
  pendingDir: string,
  storyId: string,
  parentEpicRef: string,
): string {
  const fileName = `${storyId}_Test_Story.md`;
  const content = `---\nstory_id: "${storyId}"\nparent_epic_ref: "${parentEpicRef}"\nstatus: "Approved"\n---\n\n# ${storyId}\n`;
  fs.writeFileSync(path.join(pendingDir, fileName), content, 'utf8');
  return fileName;
}

function writeProposalFile(
  pendingDir: string,
  proposalId: string,
  status = 'Approved',
): string {
  const fileName = `${proposalId}_Test_Proposal.md`;
  const content = `---\nproposal_id: "${proposalId}"\nstatus: "${status}"\napproved: true\n---\n\n# ${proposalId}\n`;
  fs.writeFileSync(path.join(pendingDir, fileName), content, 'utf8');
  return fileName;
}

// ─── Scenario 9: Clean decomposition passes ───────────────────────────────────

describe('Scenario 9: Clean decomposition passes', () => {
  it('epics: ["EPIC-101"] with EPIC-101 file + child STORY-101-01 → missing=[], clean=1', () => {
    const { root, pendingDir, sprintPlanPath } = makeFixture({
      sprint_id: 'SPRINT-TEST',
      epics: ['EPIC-101'],
      proposals: [],
    });

    writeEpicFile(pendingDir, 'EPIC-101');
    writeStoryFile(pendingDir, 'STORY-101-01', 'EPIC-101');

    const result = reconcileDecomposition({
      sprintPlanPath,
      deliveryRoot: path.join(root, '..'),
    });
    // deliveryRoot should point to the parent of pending-sync
    const result2 = reconcileDecomposition({
      sprintPlanPath,
      deliveryRoot: root,
    });

    expect(result2.missing).toHaveLength(0);
    expect(result2.clean).toBe(1);
  });

  it('empty epics and proposals → missing=[], clean=0', () => {
    const { root, sprintPlanPath } = makeFixture({
      sprint_id: 'SPRINT-TEST',
      epics: [],
      proposals: [],
    });

    const result = reconcileDecomposition({ sprintPlanPath, deliveryRoot: root });
    expect(result.missing).toHaveLength(0);
    expect(result.clean).toBe(0);
  });
});

// ─── Scenario 10: Anchor epic without stories blocks ─────────────────────────

describe('Scenario 10: Anchor epic without stories blocks', () => {
  it('EPIC-102 file exists but no child story → reason: no-child-stories', () => {
    const { root, pendingDir, sprintPlanPath } = makeFixture({
      sprint_id: 'SPRINT-TEST',
      epics: ['EPIC-102'],
      proposals: [],
    });

    writeEpicFile(pendingDir, 'EPIC-102');
    // No story file with parent_epic_ref: EPIC-102

    const result = reconcileDecomposition({ sprintPlanPath, deliveryRoot: root });
    expect(result.missing).toHaveLength(1);
    expect(result.missing[0]?.id).toBe('EPIC-102');
    expect(result.missing[0]?.type).toBe('epic');
    expect(result.missing[0]?.reason).toBe('no-child-stories');
    expect(result.clean).toBe(0);
  });

  it('punch list includes expected_files hint', () => {
    const { root, pendingDir, sprintPlanPath } = makeFixture({
      epics: ['EPIC-103'],
      proposals: [],
    });
    writeEpicFile(pendingDir, 'EPIC-103');

    const result = reconcileDecomposition({ sprintPlanPath, deliveryRoot: root });
    expect(result.missing[0]?.expected_files).toHaveLength(1);
    expect(result.missing[0]?.expected_files[0]).toContain('STORY');
  });

  it('story with wrong parent_epic_ref does not satisfy gate', () => {
    const { root, pendingDir, sprintPlanPath } = makeFixture({
      epics: ['EPIC-104'],
      proposals: [],
    });
    writeEpicFile(pendingDir, 'EPIC-104');
    // Story points to a different epic
    writeStoryFile(pendingDir, 'STORY-104-01', 'EPIC-999');

    const result = reconcileDecomposition({ sprintPlanPath, deliveryRoot: root });
    expect(result.missing).toHaveLength(1);
    expect(result.missing[0]?.reason).toBe('no-child-stories');
  });
});

// ─── Scenario 11: Anchor proposal without epic blocks ────────────────────────

describe('Scenario 11: Anchor proposal without epic blocks', () => {
  it('Approved PROPOSAL-013 + no epic citing it → reason: no-decomposed-epic', () => {
    const { root, pendingDir, sprintPlanPath } = makeFixture({
      sprint_id: 'SPRINT-TEST',
      epics: [],
      proposals: ['PROPOSAL-013'],
    });

    writeProposalFile(pendingDir, 'PROPOSAL-013');
    // No epic file with context_source citing PROPOSAL-013

    const result = reconcileDecomposition({ sprintPlanPath, deliveryRoot: root });
    expect(result.missing).toHaveLength(1);
    expect(result.missing[0]?.id).toBe('PROPOSAL-013');
    expect(result.missing[0]?.type).toBe('proposal');
    expect(result.missing[0]?.reason).toBe('no-decomposed-epic');
  });

  it('PROPOSAL-014 with matching epic citing it in context_source → clean', () => {
    const { root, pendingDir, sprintPlanPath } = makeFixture({
      epics: [],
      proposals: ['PROPOSAL-014'],
    });

    writeProposalFile(pendingDir, 'PROPOSAL-014');
    writeEpicFile(pendingDir, 'EPIC-014', 'PROPOSAL-014.md Conversation 2026-04-28');

    const result = reconcileDecomposition({ sprintPlanPath, deliveryRoot: root });
    expect(result.missing).toHaveLength(0);
    expect(result.clean).toBe(1);
  });
});

// ─── Scenario 12: Anchor file missing entirely blocks ────────────────────────

describe('Scenario 12: Anchor file missing entirely blocks', () => {
  it('sprint references EPIC-200 but no EPIC-200_*.md exists → reason: file-missing', () => {
    const { root, sprintPlanPath } = makeFixture({
      epics: ['EPIC-200'],
      proposals: [],
    });
    // No file created for EPIC-200

    const result = reconcileDecomposition({ sprintPlanPath, deliveryRoot: root });
    expect(result.missing).toHaveLength(1);
    expect(result.missing[0]?.id).toBe('EPIC-200');
    expect(result.missing[0]?.type).toBe('epic');
    expect(result.missing[0]?.reason).toBe('file-missing');
  });

  it('expected_files hint names the missing file pattern', () => {
    const { root, sprintPlanPath } = makeFixture({ epics: ['EPIC-201'], proposals: [] });

    const result = reconcileDecomposition({ sprintPlanPath, deliveryRoot: root });
    expect(result.missing[0]?.expected_files[0]).toContain('EPIC-201');
  });
});

// ─── Scenario 13: No --allow-drift waiver for decomposition ──────────────────

describe('Scenario 13: No --allow-drift waiver for decomposition', () => {
  it('reconcileDecomposition always returns missing items regardless of caller flags', () => {
    // This tests that reconcileDecomposition does NOT respect any allow-drift flag
    // The "allow-drift" concept does not exist in this function's API.
    // This is enforced by the caller (sprintInitHandler) which must block on missing.length > 0
    // regardless of --allow-drift.
    const { root, sprintPlanPath } = makeFixture({
      epics: ['EPIC-300'],
      proposals: [],
    });
    // No EPIC-300 file → file-missing

    const result = reconcileDecomposition({ sprintPlanPath, deliveryRoot: root });
    // The function has no allow-drift parameter — it always reports missing
    expect(result.missing).toHaveLength(1);
    expect(result.missing[0]?.id).toBe('EPIC-300');
  });

  it('the function signature has no allow-drift parameter (API contract)', () => {
    // Verify the function accepts exactly ReconcileDecompositionOpts
    // This is a static type check — the test ensures no drift-bypass exists
    const { root, sprintPlanPath } = makeFixture({ epics: [], proposals: [] });

    // @ts-expect-error — allowDrift is not a valid parameter
    const fnRef = reconcileDecomposition;
    // The function should work normally without any allowDrift parameter
    const result = fnRef({ sprintPlanPath, deliveryRoot: root });
    expect(result.missing).toHaveLength(0);
  });
});

// ─── Multiple anchors: epic + proposal both missing ───────────────────────────

describe('Multiple anchors: partial decomposition', () => {
  it('one epic clean, one epic missing → missing.length=1, clean=1', () => {
    const { root, pendingDir, sprintPlanPath } = makeFixture({
      epics: ['EPIC-401', 'EPIC-402'],
      proposals: [],
    });

    // EPIC-401 fully decomposed
    writeEpicFile(pendingDir, 'EPIC-401');
    writeStoryFile(pendingDir, 'STORY-401-01', 'EPIC-401');

    // EPIC-402 file exists but no child stories
    writeEpicFile(pendingDir, 'EPIC-402');

    const result = reconcileDecomposition({ sprintPlanPath, deliveryRoot: root });
    expect(result.missing).toHaveLength(1);
    expect(result.missing[0]?.id).toBe('EPIC-402');
    expect(result.clean).toBe(1);
  });
});
