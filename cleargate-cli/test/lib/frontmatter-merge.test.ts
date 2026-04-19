/**
 * frontmatter-merge.test.ts — STORY-010-04
 *
 * Tests for mergeFrontmatterConflict().
 *
 * Tests:
 *   1. timestampWin — newer ISO timestamp wins on pushed_at
 *   2. nonTsMarker — non-timestamp scalar conflict gets git markers
 *   3. agreementNoMarker — matching values have no markers
 *   4. newRemoteFieldAdded — new field from remote is included
 *   5. newerLocalTimestampWins — when local is newer, local wins
 */

import { describe, it, expect } from 'vitest';
import { mergeFrontmatterConflict, TIMESTAMP_FIELDS } from '../../src/lib/frontmatter-merge.js';
import { parseFrontmatter } from '../../src/wiki/parse-frontmatter.js';

function makeFrontmatterBlock(fields: Record<string, unknown>): string {
  const lines = ['---'];
  for (const [key, val] of Object.entries(fields)) {
    if (val === null) {
      lines.push(`${key}: null`);
    } else if (typeof val === 'boolean') {
      lines.push(`${key}: ${val}`);
    } else {
      lines.push(`${key}: "${val}"`);
    }
  }
  lines.push('---', '');
  return lines.join('\n');
}

// ── Test 1: timestamp newer wins ──────────────────────────────────────────────

describe('Scenario: Frontmatter merge prefers newer timestamp', () => {
  it('timestampWin: remote pushed_at wins when newer', () => {
    const localBlock = makeFrontmatterBlock({
      story_id: 'STORY-042-01',
      pushed_at: '2026-04-19T14:00:00Z',
    });
    const remoteBlock = makeFrontmatterBlock({
      story_id: 'STORY-042-01',
      pushed_at: '2026-04-19T15:00:00Z',
    });

    const result = mergeFrontmatterConflict(localBlock, remoteBlock);
    const { fm } = parseFrontmatter(result);

    // Newer timestamp should win
    expect(fm['pushed_at']).toBe('2026-04-19T15:00:00Z');
    // No conflict markers
    expect(result).not.toContain('<<<<<<<');
  });

  it('localTimestampWins: local last_pulled_at wins when newer', () => {
    const localBlock = makeFrontmatterBlock({
      story_id: 'STORY-042-01',
      last_pulled_at: '2026-04-19T16:00:00Z',
    });
    const remoteBlock = makeFrontmatterBlock({
      story_id: 'STORY-042-01',
      last_pulled_at: '2026-04-19T12:00:00Z',
    });

    const result = mergeFrontmatterConflict(localBlock, remoteBlock);
    const { fm } = parseFrontmatter(result);

    expect(fm['last_pulled_at']).toBe('2026-04-19T16:00:00Z');
    expect(result).not.toContain('<<<<<<<');
  });

  it('updatedAtUsesNewerValue: updated_at in TIMESTAMP_FIELDS', () => {
    expect(TIMESTAMP_FIELDS.has('updated_at')).toBe(true);
    expect(TIMESTAMP_FIELDS.has('pushed_at')).toBe(true);
    expect(TIMESTAMP_FIELDS.has('last_pulled_at')).toBe(true);
    expect(TIMESTAMP_FIELDS.has('last_remote_update')).toBe(true);
  });
});

// ── Test 2: non-timestamp conflict uses markers ───────────────────────────────

describe('Scenario: Frontmatter merge preserves non-ts conflict as marker', () => {
  it('nonTsMarker: title conflict returns git-style markers', () => {
    const localBlock = makeFrontmatterBlock({
      story_id: 'STORY-042-01',
      title: 'Local Title',
    });
    const remoteBlock = makeFrontmatterBlock({
      story_id: 'STORY-042-01',
      title: 'Remote Title',
    });

    const result = mergeFrontmatterConflict(localBlock, remoteBlock);

    // Result should contain conflict markers
    expect(result).toContain('<<<<<<<');
    expect(result).toContain('=======');
    expect(result).toContain('>>>>>>>');
    expect(result).toContain('Local Title');
    expect(result).toContain('Remote Title');
  });

  it('statusConflictGetsMarkers: status is not a timestamp field', () => {
    const localBlock = makeFrontmatterBlock({
      story_id: 'STORY-042-01',
      status: 'in-progress',
    });
    const remoteBlock = makeFrontmatterBlock({
      story_id: 'STORY-042-01',
      status: 'done',
    });

    const result = mergeFrontmatterConflict(localBlock, remoteBlock);
    expect(result).toContain('<<<<<<<');
  });
});

// ── Test 3: matching values — no markers ──────────────────────────────────────

describe('Scenario: Matching values produce no conflict markers', () => {
  it('agreementNoMarker: same values on both sides are preserved without markers', () => {
    const localBlock = makeFrontmatterBlock({
      story_id: 'STORY-042-01',
      status: 'todo',
      pushed_at: '2026-04-19T14:00:00Z',
    });
    const remoteBlock = makeFrontmatterBlock({
      story_id: 'STORY-042-01',
      status: 'todo',
      pushed_at: '2026-04-19T14:00:00Z',
    });

    const result = mergeFrontmatterConflict(localBlock, remoteBlock);
    expect(result).not.toContain('<<<<<<<');
    const { fm } = parseFrontmatter(result);
    expect(fm['status']).toBe('todo');
  });
});

// ── Test 4: new remote field added ────────────────────────────────────────────

describe('Scenario: New remote field is added to merged result', () => {
  it('newRemoteFieldAdded: field only in remote appears in result', () => {
    const localBlock = makeFrontmatterBlock({
      story_id: 'STORY-042-01',
    });
    const remoteBlock = makeFrontmatterBlock({
      story_id: 'STORY-042-01',
      remote_id: 'LIN-1042',
    });

    const result = mergeFrontmatterConflict(localBlock, remoteBlock);
    const { fm } = parseFrontmatter(result);
    expect(fm['remote_id']).toBe('LIN-1042');
  });
});
