import { describe, it, expect, beforeAll } from 'vitest';

describe('plain suite', () => {
  beforeAll(() => {
    // setup
  });

  it('checks equality', () => {
    expect(1 + 1).toBe(2);
  });

  it('checks deep equality', () => {
    expect({ a: 1 }).toEqual({ a: 1 });
  });
});
