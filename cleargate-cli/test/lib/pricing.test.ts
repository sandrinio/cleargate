/**
 * pricing.test.ts — STORY-008-06
 *
 * Tests for pricing.ts: PRICING_TABLE constants + computeUsd().
 */

import { describe, it, expect } from 'vitest';
import { computeUsd, PRICING_TABLE, type DraftTokensInput } from '../../src/lib/pricing.js';

describe('pricing.ts', () => {
  it('round-trips known model (claude-opus-4-7) at known counts to hand-computed USD', () => {
    const tokens: DraftTokensInput = {
      input: 1_000_000,
      output: 1_000_000,
      cache_read: 1_000_000,
      cache_creation: 1_000_000,
      model: 'claude-opus-4-7',
    };
    // At 1M tokens each: 15 + 75 + 1.5 + 18.75 = 110.25
    const { usd, unknownModel } = computeUsd(tokens);
    expect(unknownModel).toBe(false);
    expect(usd).toBeCloseTo(110.25, 4);
  });

  it('returns unknownModel=true and usd=0 for unknown model', () => {
    const tokens: DraftTokensInput = {
      input: 500_000,
      output: 500_000,
      cache_read: 0,
      cache_creation: 0,
      model: 'claude-future-model-9-9',
    };
    const { usd, unknownModel } = computeUsd(tokens);
    expect(unknownModel).toBe(true);
    expect(usd).toBe(0);
  });

  it('handles null token counts as 0', () => {
    const tokens: DraftTokensInput = {
      input: null,
      output: 1_000_000,
      cache_read: null,
      cache_creation: null,
      model: 'claude-sonnet-4-5',
    };
    // Only output: 1_000_000 * 15 / 1_000_000 = 15
    const { usd, unknownModel } = computeUsd(tokens);
    expect(unknownModel).toBe(false);
    expect(usd).toBeCloseTo(15.0, 4);
  });

  it('modelOverride takes precedence over draftTokens.model', () => {
    const tokens: DraftTokensInput = {
      input: 1_000_000,
      output: 0,
      cache_read: 0,
      cache_creation: 0,
      model: 'claude-opus-4-7', // would be $15 per 1M input
    };
    const { usd, unknownModel } = computeUsd(tokens, 'claude-haiku-4-5');
    // haiku: 0.80 per 1M input
    expect(unknownModel).toBe(false);
    expect(usd).toBeCloseTo(0.8, 4);
  });

  it('PRICING_TABLE contains expected model keys', () => {
    expect(PRICING_TABLE).toHaveProperty('claude-opus-4-7');
    expect(PRICING_TABLE).toHaveProperty('claude-sonnet-4-5');
    expect(PRICING_TABLE).toHaveProperty('claude-haiku-4-5');
  });

  it('small token counts produce nonzero USD for known model', () => {
    const tokens: DraftTokensInput = {
      input: 100,
      output: 50,
      cache_read: 0,
      cache_creation: 0,
      model: 'claude-opus-4-7',
    };
    const { usd, unknownModel } = computeUsd(tokens);
    expect(unknownModel).toBe(false);
    expect(usd).toBeGreaterThan(0);
  });
});
