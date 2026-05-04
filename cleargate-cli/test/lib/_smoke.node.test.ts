import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

describe('node:test runner smoke (delete after CR-036 lands)', () => {
  it('runs', () => {
    assert.strictEqual(2 + 2, 4);
  });

  it('has tsx TypeScript support', () => {
    const value: number = 7;
    assert.ok(value > 0);
  });
});
