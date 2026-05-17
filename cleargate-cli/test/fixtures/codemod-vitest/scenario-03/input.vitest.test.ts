import { describe, it, expect } from 'vitest';
import { vi } from 'vitest';

vi.mock('./dep', () => ({ fn: vi.fn(() => 42) }));

describe('mocked module', () => {
  it('uses mocked dep', async () => {
    const { fn } = await import('./dep');
    expect(fn()).toBe(42);
  });
});
