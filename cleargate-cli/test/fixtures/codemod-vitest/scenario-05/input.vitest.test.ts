import { describe, it, expect, beforeEach, afterEach } from 'vitest';

let counter = 0;

describe('hooks', () => {
  beforeEach(() => {
    counter = 0;
  });

  afterEach(() => {
    counter = -1;
  });

  it('increments counter', () => {
    counter += 1;
    expect(counter).toBe(1);
  });

  it('starts fresh each test', () => {
    expect(counter).toBe(0);
  });
});
