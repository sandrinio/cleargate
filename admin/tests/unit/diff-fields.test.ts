/**
 * Unit tests for diff-fields.ts — STORY-006-06
 *
 * Covers (story §4 demands 10+ test cases):
 *   - identical objects → empty array
 *   - changed scalar value
 *   - null vs undefined
 *   - key added (present in b, absent in a)
 *   - key removed (present in a, absent in b)
 *   - nested object change (shallow — key detected, nested diff not recursed)
 *   - array value change
 *   - array length difference
 *   - boolean change
 *   - number change
 *   - string change
 *   - null → non-null
 *   - non-null → null
 *   - result is sorted alphabetically
 *   - no mutation of inputs
 */

import { describe, it, expect } from 'vitest';
import { diffFields } from '../../src/lib/utils/diff-fields.js';

describe('diffFields', () => {
  it('returns empty array for identical empty objects', () => {
    expect(diffFields({}, {})).toEqual([]);
  });

  it('returns empty array for identical non-empty objects', () => {
    const obj = { a: 1, b: 'hello', c: null };
    expect(diffFields(obj, { ...obj })).toEqual([]);
  });

  it('detects a changed scalar string value', () => {
    expect(diffFields({ status: 'draft' }, { status: 'approved' })).toEqual(['status']);
  });

  it('detects a changed number value', () => {
    expect(diffFields({ version: 1 }, { version: 2 })).toEqual(['version']);
  });

  it('detects a changed boolean value', () => {
    expect(diffFields({ active: true }, { active: false })).toEqual(['active']);
  });

  it('detects a key added in b (not in a)', () => {
    expect(diffFields({ a: 1 }, { a: 1, b: 2 })).toEqual(['b']);
  });

  it('detects a key removed from b (present in a, absent in b)', () => {
    expect(diffFields({ a: 1, b: 2 }, { a: 1 })).toEqual(['b']);
  });

  it('detects null vs non-null', () => {
    expect(diffFields({ x: null }, { x: 'value' })).toEqual(['x']);
  });

  it('detects non-null vs null', () => {
    expect(diffFields({ x: 'value' }, { x: null })).toEqual(['x']);
  });

  it('detects array length difference (shallow)', () => {
    expect(diffFields({ tags: [1, 2] }, { tags: [1, 2, 3] })).toEqual(['tags']);
  });

  it('detects array element change', () => {
    expect(diffFields({ tags: ['a', 'b'] }, { tags: ['a', 'c'] })).toEqual(['tags']);
  });

  it('detects nested object change at shallow level (key differs overall)', () => {
    expect(
      diffFields({ meta: { foo: 1 } }, { meta: { foo: 2 } }),
    ).toEqual(['meta']);
  });

  it('reports multiple changed fields, sorted alphabetically', () => {
    const a = { z: 1, a: 'old', m: true };
    const b = { z: 2, a: 'new', m: true };
    expect(diffFields(a, b)).toEqual(['a', 'z']);
  });

  it('handles undefined values by presence — both absent means no change', () => {
    // Neither object has key 'x', so no diff
    expect(diffFields({ a: 1 }, { a: 1 })).toEqual([]);
  });

  it('does not mutate input objects', () => {
    const a: Record<string, unknown> = { x: 1 };
    const b: Record<string, unknown> = { x: 2 };
    const aCopy = JSON.stringify(a);
    const bCopy = JSON.stringify(b);
    diffFields(a, b);
    expect(JSON.stringify(a)).toBe(aCopy);
    expect(JSON.stringify(b)).toBe(bCopy);
  });

  it('handles empty string vs non-empty string', () => {
    expect(diffFields({ title: '' }, { title: 'Hello' })).toEqual(['title']);
  });

  it('returns empty for two empty arrays on same key', () => {
    expect(diffFields({ arr: [] }, { arr: [] })).toEqual([]);
  });

  it('handles mixed types correctly (number vs string)', () => {
    expect(diffFields({ val: 1 }, { val: '1' })).toEqual(['val']);
  });
});
