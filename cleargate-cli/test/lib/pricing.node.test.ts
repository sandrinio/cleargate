import { describe, test } from 'node:test';
import assert from 'node:assert/strict';

/**
 * pricing.test.ts — STORY-008-06
 *
 * Tests for pricing.ts: PRICING_TABLE constants + computeUsd().
 */

import { computeUsd, PRICING_TABLE, type DraftTokensInput } from '../../src/lib/pricing.js';

describe('pricing.ts', () => {
  test('round-trips known model (claude-opus-4-7) at known counts to hand-computed USD', () => {
    const tokens: DraftTokensInput = {
      input: 1_000_000,
      output: 1_000_000,
      cache_read: 1_000_000,
      cache_creation: 1_000_000,
      model: 'claude-opus-4-7',
    };
    // At 1M tokens each: 15 + 75 + 1.5 + 18.75 = 110.25
    const { usd, unknownModel } = computeUsd(tokens);
    assert.strictEqual(unknownModel, false);
    assert.ok(Math.abs(usd - 110.25) < Math.pow(10, -4) / 2);
  });

  test('returns unknownModel=true and usd=0 for unknown model', () => {
    const tokens: DraftTokensInput = {
      input: 500_000,
      output: 500_000,
      cache_read: 0,
      cache_creation: 0,
      model: 'claude-future-model-9-9',
    };
    const { usd, unknownModel } = computeUsd(tokens);
    assert.strictEqual(unknownModel, true);
    assert.strictEqual(usd, 0);
  });

  test('handles null token counts as 0', () => {
    const tokens: DraftTokensInput = {
      input: null,
      output: 1_000_000,
      cache_read: null,
      cache_creation: null,
      model: 'claude-sonnet-4-5',
    };
    // Only output: 1_000_000 * 15 / 1_000_000 = 15
    const { usd, unknownModel } = computeUsd(tokens);
    assert.strictEqual(unknownModel, false);
    assert.ok(Math.abs(usd - 15.0) < Math.pow(10, -4) / 2);
  });

  test('modelOverride takes precedence over draftTokens.model', () => {
    const tokens: DraftTokensInput = {
      input: 1_000_000,
      output: 0,
      cache_read: 0,
      cache_creation: 0,
      model: 'claude-opus-4-7', // would be $15 per 1M input
    };
    const { usd, unknownModel } = computeUsd(tokens, 'claude-haiku-4-5');
    // haiku: 0.80 per 1M input
    assert.strictEqual(unknownModel, false);
    assert.ok(Math.abs(usd - 0.8) < Math.pow(10, -4) / 2);
  });

  test('PRICING_TABLE contains expected model keys', () => {
    assert.ok('claude-opus-4-7' in (PRICING_TABLE));
    assert.ok('claude-sonnet-4-5' in (PRICING_TABLE));
    assert.ok('claude-haiku-4-5' in (PRICING_TABLE));
  });

  test('small token counts produce nonzero USD for known model', () => {
    const tokens: DraftTokensInput = {
      input: 100,
      output: 50,
      cache_read: 0,
      cache_creation: 0,
      model: 'claude-opus-4-7',
    };
    const { usd, unknownModel } = computeUsd(tokens);
    assert.strictEqual(unknownModel, false);
    assert.ok(usd > 0);
  });
});
