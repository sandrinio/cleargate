import { describe, it, expect } from 'vitest';
import { redactSensitive } from '../../src/admin-api/redact.js';

describe('redactSensitive', () => {
  // R-1: token key is redacted
  it('R-1: redacts token key', () => {
    expect(redactSensitive({ token: 'X' })).toEqual({ token: '<redacted>' });
  });

  // R-2: nested refresh_token and invite_token redacted, other keys untouched
  it('R-2: redacts refresh_token and invite_token nested, leaves other keys intact', () => {
    const input = {
      member: { id: 'm' },
      refresh_token: 'rt',
      invite_token: 'it',
    };
    const result = redactSensitive(input) as Record<string, unknown>;
    expect(result['refresh_token']).toBe('<redacted>');
    expect(result['invite_token']).toBe('<redacted>');
    expect((result['member'] as Record<string, unknown>)['id']).toBe('m');
  });

  // R-3: arrays — token in each item is redacted
  it('R-3: redacts token in array items', () => {
    const input = { items: [{ token: 'A' }, { token: 'B' }] };
    const result = redactSensitive(input) as { items: Array<{ token: unknown }> };
    expect(result.items[0]!.token).toBe('<redacted>');
    expect(result.items[1]!.token).toBe('<redacted>');
  });
});
