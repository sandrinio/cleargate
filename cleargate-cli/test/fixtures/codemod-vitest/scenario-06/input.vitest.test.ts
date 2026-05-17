import { describe, it, expect } from 'vitest';
import { vi } from 'vitest';

describe('fake timers', () => {
  it('uses fake timers', () => {
    vi.useFakeTimers();
    let called = false;
    setTimeout(() => {
      called = true;
    }, 100);
    vi.advanceTimersByTime(100);
    expect(called).toBeTruthy();
    vi.useRealTimers();
  });
});
