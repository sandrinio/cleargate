import { describe, test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';

let counter = 0;

describe('hooks', () => {
  beforeEach(() => {
    counter = 0;
  });

  afterEach(() => {
    counter = -1;
  });

  test('increments counter', () => {
    counter += 1;
    assert.strictEqual(counter, 1);
  });

  test('starts fresh each test', () => {
    assert.strictEqual(counter, 0);
  });
});
