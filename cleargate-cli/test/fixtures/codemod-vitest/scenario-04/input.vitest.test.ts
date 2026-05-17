import { describe, it, expect } from 'vitest';

describe('vitest import style', () => {
  it('converts named import', () => {
    expect('hello').toBe('hello');
  });

  it('converts toEqual', () => {
    expect([1, 2]).toEqual([1, 2]);
  });
});
