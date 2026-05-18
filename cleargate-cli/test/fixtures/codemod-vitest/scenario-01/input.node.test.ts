import { describe, test, before } from 'node:test';
import assert from 'node:assert/strict';

describe('plain suite', () => {
  before(() => {
    // setup
  });

  test('checks equality', () => {
    assert.strictEqual(1 + 1, 2);
  });

  test('checks deep equality', () => {
    assert.deepStrictEqual({ a: 1 }, { a: 1 });
  });
});
