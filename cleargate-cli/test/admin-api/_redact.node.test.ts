import { describe, test } from 'node:test';
import assert from 'node:assert/strict';

import { redactSensitive } from '../../src/admin-api/redact.js';

describe('redactSensitive', () => {
  // R-1: token key is redacted
  test('R-1: redacts token key', () => {
    assert.deepStrictEqual(redactSensitive({ token: 'X' }), { token: '<redacted>' });
  });

  // R-2: nested refresh_token and invite_token redacted, other keys untouched
  test('R-2: redacts refresh_token and invite_token nested, leaves other keys intact', () => {
    const input = {
      member: { id: 'm' },
      refresh_token: 'rt',
      invite_token: 'it',
    };
    const result = redactSensitive(input) as Record<string, unknown>;
    assert.strictEqual(result['refresh_token'], '<redacted>');
    assert.strictEqual(result['invite_token'], '<redacted>');
    assert.strictEqual((result['member'] as Record<string, unknown>)['id'], 'm');
  });

  // R-3: arrays — token in each item is redacted
  test('R-3: redacts token in array items', () => {
    const input = { items: [{ token: 'A' }, { token: 'B' }] };
    const result = redactSensitive(input) as { items: Array<{ token: unknown }> };
    assert.strictEqual(result.items[0]!.token, '<redacted>');
    assert.strictEqual(result.items[1]!.token, '<redacted>');
  });
});
