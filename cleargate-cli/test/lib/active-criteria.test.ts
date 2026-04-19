/**
 * active-criteria.test.ts — STORY-010-06
 *
 * Tests for lib/active-criteria.ts resolveActiveItems().
 *
 * Scenarios:
 *   1. Item referenced in active sprint → included in active set
 *   2. Item with last_remote_update within 30 days → included
 *   3. Item not in sprint and older than 30 days → excluded
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { resolveActiveItems } from '../../src/lib/active-criteria.js';
import type { LocalWorkItemRef } from '../../src/lib/active-criteria.js';

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeTmpDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'cg-active-criteria-test-'));
}

function cleanup(dir: string): void {
  fs.rmSync(dir, { recursive: true, force: true });
}

/**
 * Set up a minimal project structure with an active sprint file.
 * The sprint file body contains references to the given story IDs.
 */
function setupProjectWithSprint(
  tmpDir: string,
  sprintId: string,
  sprintBodyStoryRefs: string[],
): void {
  // Create sprint-runs/<sprintId>/ directory (newest mtime → active)
  const sprintRunDir = path.join(tmpDir, '.cleargate', 'sprint-runs', sprintId);
  fs.mkdirSync(sprintRunDir, { recursive: true });

  // Create sprint file in pending-sync
  const pendingSync = path.join(tmpDir, '.cleargate', 'delivery', 'pending-sync');
  fs.mkdirSync(pendingSync, { recursive: true });

  const sprintFileBody = [
    '---',
    `sprint_id: "${sprintId}"`,
    'epics: ["EPIC-010"]',
    '---',
    '',
    `# ${sprintId} Sprint`,
    '',
    '## Stories',
    ...sprintBodyStoryRefs.map((id) => `- ${id}`),
    '',
  ].join('\n');

  fs.writeFileSync(
    path.join(pendingSync, `${sprintId}_Sprint.md`),
    sprintFileBody,
    'utf8',
  );
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('resolveActiveItems', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = makeTmpDir();
  });

  afterEach(() => {
    cleanup(tmpDir);
  });

  it('includes item referenced in the active sprint body', async () => {
    setupProjectWithSprint(tmpDir, 'SPRINT-07', ['STORY-042-01', 'STORY-010-06']);

    const localItems: LocalWorkItemRef[] = [
      {
        primaryId: 'STORY-042-01',
        remoteId: 'LIN-1042',
        lastRemoteUpdate: undefined,
      },
    ];

    const active = await resolveActiveItems(
      tmpDir,
      localItems,
      () => '2026-04-19T12:00:00Z',
    );

    expect(active.has('LIN-1042')).toBe(true);
  });

  it('includes item with last_remote_update within 30 days even if not in sprint', async () => {
    // No sprint file — _off-sprint scenario
    fs.mkdirSync(path.join(tmpDir, '.cleargate', 'sprint-runs', '_off-sprint'), { recursive: true });

    // Item updated 15 days ago
    const fifteenDaysAgo = new Date(Date.parse('2026-04-19T12:00:00Z') - 15 * 24 * 60 * 60 * 1000);

    const localItems: LocalWorkItemRef[] = [
      {
        primaryId: 'STORY-033-04',
        remoteId: 'LIN-3304',
        lastRemoteUpdate: fifteenDaysAgo.toISOString(),
      },
    ];

    const active = await resolveActiveItems(
      tmpDir,
      localItems,
      () => '2026-04-19T12:00:00Z',
    );

    expect(active.has('LIN-3304')).toBe(true);
  });

  it('excludes item not in sprint and older than 30 days', async () => {
    setupProjectWithSprint(tmpDir, 'SPRINT-07', ['STORY-010-06']); // STORY-033-04 NOT listed

    // Item updated 90 days ago
    const ninetyDaysAgo = new Date(Date.parse('2026-04-19T12:00:00Z') - 90 * 24 * 60 * 60 * 1000);

    const localItems: LocalWorkItemRef[] = [
      {
        primaryId: 'STORY-033-04',
        remoteId: 'LIN-3304',
        lastRemoteUpdate: ninetyDaysAgo.toISOString(),
      },
    ];

    const active = await resolveActiveItems(
      tmpDir,
      localItems,
      () => '2026-04-19T12:00:00Z',
    );

    expect(active.has('LIN-3304')).toBe(false);
  });

  it('skips items with no remoteId', async () => {
    setupProjectWithSprint(tmpDir, 'SPRINT-07', ['STORY-010-06']);

    const localItems: LocalWorkItemRef[] = [
      {
        primaryId: 'STORY-010-06',
        remoteId: undefined, // not yet pushed
        lastRemoteUpdate: undefined,
      },
    ];

    const active = await resolveActiveItems(
      tmpDir,
      localItems,
      () => '2026-04-19T12:00:00Z',
    );

    // Nothing added since no remoteId
    expect(active.size).toBe(0);
  });
});
