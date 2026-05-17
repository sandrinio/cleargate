import { describe, test } from 'node:test';
import assert from 'node:assert/strict';

describe('vitest import style', () => {
  test('converts named import', () => {
    assert.strictEqual('hello', 'hello');
  });

  test('converts toEqual', () => {
    assert.deepStrictEqual([1, 2], [1, 2]);
  });
});
