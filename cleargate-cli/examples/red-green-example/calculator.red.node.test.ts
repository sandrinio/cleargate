// QA-Red authored — IMMUTABLE for Developer dispatches.
// This file was written in the Red phase before any implementation exists.
// It must FAIL against a clean (empty) implementation and PASS after the Developer ships.
// Pre-commit hook (pre-commit-surface-gate.sh) rejects Developer commits modifying this file.

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { add, subtract, multiply, divide } from './calculator.js';

describe('calculator — Red phase (QA-Red authored)', () => {
  it('add(2, 3) returns 5', () => {
    assert.strictEqual(add(2, 3), 5);
  });

  it('subtract(10, 4) returns 6', () => {
    assert.strictEqual(subtract(10, 4), 6);
  });

  it('multiply(3, 7) returns 21', () => {
    assert.strictEqual(multiply(3, 7), 21);
  });

  it('divide(15, 3) returns 5', () => {
    assert.strictEqual(divide(15, 3), 5);
  });

  it('divide(1, 0) throws an error', () => {
    assert.throws(() => divide(1, 0), /division by zero/i);
  });
});
