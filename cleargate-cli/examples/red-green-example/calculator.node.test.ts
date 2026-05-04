// Developer-authored Green tests — additional edge cases beyond the QA-Red suite.
// This file is NOT immutable; the Developer may modify it freely.
// Run: npx tsx --test cleargate-cli/examples/red-green-example/calculator.node.test.ts

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { add, subtract, multiply, divide } from './calculator.js';

describe('calculator — Green phase (Developer edge cases)', () => {
  it('add with negative numbers returns correct result', () => {
    assert.strictEqual(add(-5, 3), -2);
  });

  it('add with zero returns the other operand', () => {
    assert.strictEqual(add(0, 42), 42);
    assert.strictEqual(add(42, 0), 42);
  });

  it('subtract with same numbers returns zero', () => {
    assert.strictEqual(subtract(7, 7), 0);
  });

  it('multiply by zero returns zero', () => {
    assert.strictEqual(multiply(999, 0), 0);
  });

  it('multiply with negative numbers returns correct sign', () => {
    assert.strictEqual(multiply(-3, -4), 12);
    assert.strictEqual(multiply(3, -4), -12);
  });

  it('divide with large numbers returns correct result', () => {
    assert.strictEqual(divide(1_000_000, 1_000), 1_000);
  });

  it('divide by zero throws error with descriptive message', () => {
    assert.throws(() => divide(5, 0), (err: unknown) => {
      assert.ok(err instanceof Error);
      assert.ok(/zero/i.test(err.message));
      return true;
    });
  });
});
