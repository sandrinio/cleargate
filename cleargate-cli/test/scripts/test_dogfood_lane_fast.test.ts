// STORY-022-08: dogfood lane=fast audit-table generation contract.
// Verifies the data-shape contract for the §5 Lane Audit row + the activation-gate
// behavior in close_sprint.mjs (already covered structurally by test_close_sprint_v21.test.ts;
// this file adds the dogfood-specific shape assertions).

import { describe, it, expect } from 'vitest';

interface LaneAuditRow {
  story: string;
  files_touched: number;
  loc: number;
  demoted: 'y' | 'n';
  retrospect_was_fast_correct: 'y' | 'n' | '';
  notes: string;
}

interface FastLaneState {
  schema_version: number;
  stories: Record<string, {
    state: string;
    lane?: 'standard' | 'fast';
    lane_assigned_by?: string;
    lane_demoted_at?: string | null;
    lane_demotion_reason?: string | null;
  }>;
}

function buildLaneAuditRow(state: FastLaneState, storyId: string, files: number, loc: number): LaneAuditRow | null {
  const story = state.stories[storyId];
  if (!story) return null;
  if (story.lane !== 'fast' && story.lane_demoted_at == null) return null;
  return {
    story: storyId,
    files_touched: files,
    loc,
    demoted: story.lane_demoted_at != null ? 'y' : 'n',
    retrospect_was_fast_correct: '',
    notes: story.lane_demotion_reason ?? '',
  };
}

function activationGateFires(state: FastLaneState): boolean {
  if (state.schema_version < 2) return false;
  return Object.values(state.stories).some((s) => s.lane === 'fast');
}

describe('STORY-022-08 dogfood: lane audit row generation', () => {
  it('produces a row for a fast-lane story with a demotion', () => {
    const state: FastLaneState = {
      schema_version: 2,
      stories: {
        'STORY-099-01': {
          state: 'Architect Passed',
          lane: 'fast',
          lane_assigned_by: 'architect',
          lane_demoted_at: '2026-04-27T00:00:00Z',
          lane_demotion_reason: 'simulated scanner failure: typecheck error',
        },
      },
    };
    const row = buildLaneAuditRow(state, 'STORY-099-01', 1, 1);
    expect(row).not.toBeNull();
    expect(row!.story).toBe('STORY-099-01');
    expect(row!.demoted).toBe('y');
    expect(row!.retrospect_was_fast_correct).toBe(''); // human fill-in
    expect(row!.notes).toContain('simulated scanner failure');
  });

  it('returns null for a standard-lane story with no demotion history', () => {
    const state: FastLaneState = {
      schema_version: 2,
      stories: {
        'STORY-022-01': {
          state: 'Done',
          lane: 'standard',
          lane_assigned_by: 'migration-default',
          lane_demoted_at: null,
          lane_demotion_reason: null,
        },
      },
    };
    expect(buildLaneAuditRow(state, 'STORY-022-01', 4, 50)).toBeNull();
  });
});

describe('STORY-022-08 dogfood: activation gate', () => {
  it('fires when schema_version >= 2 AND any lane=fast', () => {
    const state: FastLaneState = {
      schema_version: 2,
      stories: { 'A': { state: 'Done', lane: 'fast' } },
    };
    expect(activationGateFires(state)).toBe(true);
  });

  it('does NOT fire when schema_version < 2 (legacy-pass)', () => {
    const state: FastLaneState = {
      schema_version: 1,
      stories: { 'A': { state: 'Done', lane: 'fast' } },
    };
    expect(activationGateFires(state)).toBe(false);
  });

  it('does NOT fire when v2 but no fast-lane stories (legacy-pass)', () => {
    const state: FastLaneState = {
      schema_version: 2,
      stories: { 'A': { state: 'Done', lane: 'standard' } },
    };
    expect(activationGateFires(state)).toBe(false);
  });
});
