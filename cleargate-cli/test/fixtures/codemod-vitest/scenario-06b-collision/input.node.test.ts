// Pre-existing node:test file — simulates target collision.
// The codemod should refuse to overwrite this file.
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';

describe('pre-existing node:test suite', () => {
  test('already converted', () => {
    assert.strictEqual(1, 1);
  });
});
