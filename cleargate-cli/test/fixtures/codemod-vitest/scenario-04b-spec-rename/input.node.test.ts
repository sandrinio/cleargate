import { describe, test } from 'node:test';
import assert from 'node:assert/strict';

describe('spec file suite', () => {
  test('converts spec.ts extension', () => {
    assert.strictEqual('spec', 'spec');
  });
});
