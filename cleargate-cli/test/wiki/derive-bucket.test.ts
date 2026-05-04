/**
 * derive-bucket.test.ts — Tests for CR-030 bucket detection (INITIATIVE- + SPRINT-).
 *
 * Scenarios:
 *   1. INITIATIVE-001_foo.md → { type: 'initiative', id: 'INITIATIVE-001', bucket: 'initiatives' }
 *   2. SPRINT-21_foo.md → { type: 'sprint', id: 'SPRINT-21', bucket: 'sprints' } (regression)
 *   3. STORY-042-01_foo.md → { type: 'story', id: 'STORY-042-01', bucket: 'stories' } (regression)
 *   4. UNKNOWN-001.md → throws 'cannot determine bucket'
 *   5. EPIC-008_foo.md → { type: 'epic', id: 'EPIC-008', bucket: 'epics' } (regression)
 */

import { describe, it, expect } from 'vitest';
import { deriveBucket } from '../../src/wiki/derive-bucket.js';

describe('deriveBucket — CR-030 new types', () => {
  it('INITIATIVE-001_foo.md → initiative bucket', () => {
    const result = deriveBucket('INITIATIVE-001_foo.md');
    expect(result.type).toBe('initiative');
    expect(result.id).toBe('INITIATIVE-001');
    expect(result.bucket).toBe('initiatives');
  });

  it('SPRINT-21_foo.md → sprint bucket (regression — was already present pre-CR-030)', () => {
    const result = deriveBucket('SPRINT-21_foo.md');
    expect(result.type).toBe('sprint');
    expect(result.id).toBe('SPRINT-21');
    expect(result.bucket).toBe('sprints');
  });

  it('STORY-042-01_foo.md → story bucket (regression)', () => {
    const result = deriveBucket('STORY-042-01_foo.md');
    expect(result.type).toBe('story');
    expect(result.id).toBe('STORY-042-01');
    expect(result.bucket).toBe('stories');
  });

  it('UNKNOWN-001.md → throws cannot determine bucket', () => {
    expect(() => deriveBucket('UNKNOWN-001.md')).toThrow('cannot determine bucket');
  });

  it('EPIC-008_foo.md → epic bucket (regression)', () => {
    const result = deriveBucket('EPIC-008_foo.md');
    expect(result.type).toBe('epic');
    expect(result.id).toBe('EPIC-008');
    expect(result.bucket).toBe('epics');
  });
});
