import { describe, test } from 'node:test';
import assert from 'node:assert/strict';

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


import { deriveBucket } from '../../src/wiki/derive-bucket.js';

describe('deriveBucket — CR-030 new types', () => {
  test('INITIATIVE-001_foo.md → initiative bucket', () => {
    const result = deriveBucket('INITIATIVE-001_foo.md');
    assert.strictEqual(result.type, 'initiative');
    assert.strictEqual(result.id, 'INITIATIVE-001');
    assert.strictEqual(result.bucket, 'initiatives');
  });

  test('SPRINT-21_foo.md → sprint bucket (regression — was already present pre-CR-030)', () => {
    const result = deriveBucket('SPRINT-21_foo.md');
    assert.strictEqual(result.type, 'sprint');
    assert.strictEqual(result.id, 'SPRINT-21');
    assert.strictEqual(result.bucket, 'sprints');
  });

  test('STORY-042-01_foo.md → story bucket (regression)', () => {
    const result = deriveBucket('STORY-042-01_foo.md');
    assert.strictEqual(result.type, 'story');
    assert.strictEqual(result.id, 'STORY-042-01');
    assert.strictEqual(result.bucket, 'stories');
  });

  test('UNKNOWN-001.md → throws cannot determine bucket', () => {
    assert.throws(() => deriveBucket('UNKNOWN-001.md'), 'cannot determine bucket');
  });

  test('EPIC-008_foo.md → epic bucket (regression)', () => {
    const result = deriveBucket('EPIC-008_foo.md');
    assert.strictEqual(result.type, 'epic');
    assert.strictEqual(result.id, 'EPIC-008');
    assert.strictEqual(result.bucket, 'epics');
  });
});
