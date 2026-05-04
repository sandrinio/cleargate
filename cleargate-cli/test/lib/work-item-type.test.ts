/**
 * work-item-type.test.ts — Tests for CR-030 work-item-type extensions.
 *
 * Scenarios:
 *   1. detectWorkItemTypeFromFm({ initiative_id: 'INITIATIVE-001' }) → 'initiative'
 *   2. detectWorkItemTypeFromFm({ sprint_id: 'SPRINT-21' }) → 'sprint'
 *   3. detectWorkItemType('INITIATIVE-001_foo.md') → 'initiative'
 *      detectWorkItemType('SPRINT-21_foo.md') → 'sprint'
 *   4. WORK_ITEM_TRANSITIONS.initiative deep-equals ['ready-for-decomposition']
 *      WORK_ITEM_TRANSITIONS.sprint deep-equals ['ready-for-execution']
 *   5. detectWorkItemType('STORY-NNN-NN') still returns 'story' (regression — INITIATIVE- not a substring of STORY-)
 *   6. All 5 existing types still detected correctly (regression)
 *   7. detectWorkItemTypeFromFm with no known key → null
 *   8. FM_KEY_MAP order: initiative_id returns 'initiative', not swallowed by other keys
 *  12. PREFIX_MAP: 7 entries total post-CR-030
 */

import { describe, it, expect } from 'vitest';
import {
  detectWorkItemTypeFromFm,
  detectWorkItemType,
  WORK_ITEM_TRANSITIONS,
} from '../../src/lib/work-item-type.js';

describe('work-item-type — CR-030 new types', () => {
  it('detectWorkItemTypeFromFm({ initiative_id }) → initiative', () => {
    expect(detectWorkItemTypeFromFm({ initiative_id: 'INITIATIVE-001' })).toBe('initiative');
  });

  it('detectWorkItemTypeFromFm({ sprint_id }) → sprint', () => {
    expect(detectWorkItemTypeFromFm({ sprint_id: 'SPRINT-21' })).toBe('sprint');
  });

  it('detectWorkItemType from INITIATIVE- prefix → initiative', () => {
    expect(detectWorkItemType('INITIATIVE-001_foo.md')).toBe('initiative');
  });

  it('detectWorkItemType from SPRINT- prefix → sprint', () => {
    expect(detectWorkItemType('SPRINT-21_foo.md')).toBe('sprint');
  });

  it('WORK_ITEM_TRANSITIONS.initiative → [ready-for-decomposition]', () => {
    expect(WORK_ITEM_TRANSITIONS['initiative']).toEqual(['ready-for-decomposition']);
  });

  it('WORK_ITEM_TRANSITIONS.sprint → [ready-for-execution]', () => {
    expect(WORK_ITEM_TRANSITIONS['sprint']).toEqual(['ready-for-execution']);
  });

  it('detectWorkItemType STORY- still returns story (regression — INITIATIVE- not a substring of STORY-)', () => {
    expect(detectWorkItemType('STORY-008-03')).toBe('story');
    expect(detectWorkItemType('STORY-042-01_foo.md')).toBe('story');
  });

  it('detectWorkItemTypeFromFm with no known key → null', () => {
    expect(detectWorkItemTypeFromFm({ title: 'No ID' })).toBeNull();
    expect(detectWorkItemTypeFromFm({})).toBeNull();
  });

  it('all 5 existing types still detected correctly from FM keys (regression)', () => {
    expect(detectWorkItemTypeFromFm({ story_id: 'STORY-001-01' })).toBe('story');
    expect(detectWorkItemTypeFromFm({ epic_id: 'EPIC-001' })).toBe('epic');
    expect(detectWorkItemTypeFromFm({ proposal_id: 'PROPOSAL-001' })).toBe('proposal');
    expect(detectWorkItemTypeFromFm({ cr_id: 'CR-001' })).toBe('cr');
    expect(detectWorkItemTypeFromFm({ bug_id: 'BUG-001' })).toBe('bug');
  });

  it('all 5 existing types still detected correctly from prefix (regression)', () => {
    expect(detectWorkItemType('EPIC-008')).toBe('epic');
    expect(detectWorkItemType('PROPOSAL-005')).toBe('proposal');
    expect(detectWorkItemType('CR-001')).toBe('cr');
    expect(detectWorkItemType('BUG-001')).toBe('bug');
    expect(detectWorkItemType('UNKNOWN-123')).toBeNull();
  });

  it('WORK_ITEM_TRANSITIONS has 7 entries total post-CR-030', () => {
    const keys = Object.keys(WORK_ITEM_TRANSITIONS);
    expect(keys).toHaveLength(7);
    expect(keys).toContain('initiative');
    expect(keys).toContain('sprint');
  });
});
