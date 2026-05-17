import { describe, it, expect } from 'vitest';

describe('all matchers', () => {
  it('toBe', () => {
    expect(1).toBe(1);
  });

  it('toEqual', () => {
    expect({ x: 1 }).toEqual({ x: 1 });
  });

  it('toBeUndefined', () => {
    const v: unknown = undefined;
    expect(v).toBeUndefined();
  });

  it('toBeNull', () => {
    const v: unknown = null;
    expect(v).toBeNull();
  });

  it('toBeTruthy', () => {
    expect(1).toBeTruthy();
  });

  it('toBeFalsy', () => {
    expect(0).toBeFalsy();
  });

  it('toThrow', () => {
    expect(() => {
      throw new Error('boom');
    }).toThrow();
  });
});
