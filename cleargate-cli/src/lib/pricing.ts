/**
 * pricing.ts — STORY-008-06
 *
 * USD pricing table for Claude models (per 1M tokens).
 * Numbers from Anthropic public pricing as of 2026-04-19.
 * No network. No config file. Numbers live in source.
 */

export interface ModelPricing {
  input: number;
  output: number;
  cache_read: number;
  cache_creation: number;
}

/**
 * Pricing table: USD per 1,000,000 tokens.
 *
 * claude-opus-4-7: $15 input / $75 output / $1.50 cache_read / $18.75 cache_creation
 * claude-sonnet-4-5: $3 input / $15 output / $0.30 cache_read / $3.75 cache_creation
 * claude-haiku-4-5: $0.80 input / $4 output / $0.08 cache_read / $1 cache_creation
 */
export const PRICING_TABLE: Record<string, ModelPricing> = {
  'claude-opus-4-7': {
    input: 15.0,
    output: 75.0,
    cache_read: 1.5,
    cache_creation: 18.75,
  },
  'claude-sonnet-4-5': {
    input: 3.0,
    output: 15.0,
    cache_read: 0.3,
    cache_creation: 3.75,
  },
  'claude-sonnet-4-6': {
    input: 3.0,
    output: 15.0,
    cache_read: 0.3,
    cache_creation: 3.75,
  },
  'claude-haiku-4-5': {
    input: 0.8,
    output: 4.0,
    cache_read: 0.08,
    cache_creation: 1.0,
  },
};

export interface DraftTokensInput {
  input: number | null;
  output: number | null;
  cache_read: number | null;
  cache_creation: number | null;
  model: string | null;
}

export interface ComputeUsdResult {
  usd: number;
  unknownModel: boolean;
}

/**
 * Compute USD cost from draft_tokens and model.
 *
 * If modelOverride is provided, it takes precedence over draftTokens.model.
 * Unknown model → {usd: 0, unknownModel: true}.
 * All token counts default to 0 if null.
 */
export function computeUsd(
  draftTokens: DraftTokensInput,
  modelOverride?: string
): ComputeUsdResult {
  const model = modelOverride ?? draftTokens.model ?? '';
  const pricing = PRICING_TABLE[model];

  if (!pricing) {
    return { usd: 0, unknownModel: true };
  }

  const input = draftTokens.input ?? 0;
  const output = draftTokens.output ?? 0;
  const cacheRead = draftTokens.cache_read ?? 0;
  const cacheCreation = draftTokens.cache_creation ?? 0;

  const usd =
    (input * pricing.input +
      output * pricing.output +
      cacheRead * pricing.cache_read +
      cacheCreation * pricing.cache_creation) /
    1_000_000;

  return { usd, unknownModel: false };
}
