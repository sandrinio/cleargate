import { describe, test } from 'node:test';
import assert from 'node:assert/strict';

describe('all matchers', () => {
  test('toBe', () => {
    assert.strictEqual(1, 1);
  });

  test('toEqual', () => {
    assert.deepStrictEqual({ x: 1 }, { x: 1 });
  });

  test('toBeUndefined', () => {
    const v: unknown = undefined;
    assert.strictEqual(v, undefined);
  });

  test('toBeNull', () => {
    const v: unknown = null;
    assert.strictEqual(v, null);
  });

  test('toBeTruthy', () => {
    assert.ok(1);
  });

  test('toBeFalsy', () => {
    assert.ok(!0);
  });

  test('toThrow', () => {
    assert.throws(() => {
      throw new Error('boom');
    });
  });
});
