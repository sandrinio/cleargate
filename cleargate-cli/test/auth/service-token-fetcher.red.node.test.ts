/**
 * service-token-fetcher.red.node.test.ts — CR-065 QA-RED
 *
 * Failing tests (RED phase) for CR-065: ServiceTokenFetcher class.
 *
 * This file tests the NEW module `cleargate-cli/src/auth/service-token-fetcher.ts`
 * which does NOT exist yet in the baseline.
 *
 * All tests in this file FAIL pre-fix because the import itself throws
 * ERR_MODULE_NOT_FOUND — the module does not exist.
 *
 * Scenarios covered (§4 Verification Protocol + M1.md test shape item 1):
 *
 *   Scenario A — ServiceTokenFetcher module exists and exports the expected class
 *     Import resolves. Class is exported. Constructor accepts a string.
 *
 *   Scenario B — ServiceTokenFetcher#getAccessToken() returns the constructor-passed token verbatim
 *     Pure unit: new ServiceTokenFetcher('tok-xyz').getAccessToken() === 'tok-xyz'.
 *     No network call, no keychain interaction, no caching.
 *
 *   Scenario C — ServiceTokenFetcher satisfies the TokenFetcher interface shape
 *     The class has a `getAccessToken(): Promise<string>` method.
 *     This is the interface that mcp-serve.ts will hold via `let fetcher: TokenFetcher`.
 *
 *   Scenario D — Multiple calls return the same token (no rotation)
 *     Service tokens are static; getAccessToken must return the same value on
 *     each call without side effects.
 *
 * Runner: tsx --test (node:test)
 * Naming: *.red.node.test.ts (immutable post-Red, per FLASHCARD 2026-05-04 #naming #red-green)
 * Forbidden: DO NOT create the service-token-fetcher.ts implementation file.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

// This import FAILS on the clean baseline — the module does not exist.
// The import error propagates as a test failure, which is the intended RED state.
import { ServiceTokenFetcher } from '../../src/auth/service-token-fetcher.js';

// ─── Scenario A — module exists and class is exported ─────────────────────────
//
// PRE-FIX: import above throws ERR_MODULE_NOT_FOUND → entire file fails to load.
// POST-FIX: module exists, class is exported, this test passes.

describe('CR-065 ServiceTokenFetcher — module exports', () => {
  it('ServiceTokenFetcher is exported from the module', () => {
    assert.ok(
      typeof ServiceTokenFetcher === 'function',
      `CR-065 Scenario A FAIL: ServiceTokenFetcher is not a function/class.\n` +
      `PRE-FIX: module does not exist; import throws ERR_MODULE_NOT_FOUND.`
    );
  });

  it('ServiceTokenFetcher can be instantiated with a string token', () => {
    let instance: unknown;
    assert.doesNotThrow(() => {
      instance = new ServiceTokenFetcher('tok-constructor-test');
    }, `CR-065 Scenario A FAIL: ServiceTokenFetcher constructor threw unexpectedly.`);
    assert.ok(instance !== undefined, 'instance must be created');
  });
});

// ─── Scenario B — getAccessToken() returns the constructor-passed token verbatim ──
//
// M1.md test shape item 1: "ServiceTokenFetcher#getAccessToken returns constructor-passed token verbatim"
// PRE-FIX: module doesn't exist → fails at import time.
// POST-FIX: returns 'tok-xyz' for new ServiceTokenFetcher('tok-xyz').

describe('CR-065 ServiceTokenFetcher#getAccessToken — returns verbatim token', () => {
  it('returns the exact string passed to the constructor', async () => {
    const token = 'svc-token-verbatim-abc123';
    const fetcher = new ServiceTokenFetcher(token);
    const result = await fetcher.getAccessToken();
    assert.equal(
      result,
      token,
      `CR-065 Scenario B FAIL: getAccessToken() returned "${result}", expected "${token}".\n` +
      `ServiceTokenFetcher must return the constructor-passed token verbatim without modification.`
    );
  });

  it('returns the token as a Promise<string>', async () => {
    const fetcher = new ServiceTokenFetcher('tok-promise-check');
    const resultPromise = fetcher.getAccessToken();
    assert.ok(
      resultPromise instanceof Promise,
      `CR-065 Scenario B FAIL: getAccessToken() must return a Promise, got ${typeof resultPromise}.`
    );
    const result = await resultPromise;
    assert.equal(typeof result, 'string', 'Resolved value must be a string.');
  });
});

// ─── Scenario C — satisfies TokenFetcher interface (structural duck-type check) ──
//
// mcp-serve.ts will hold a `let fetcher: TokenFetcher` where TokenFetcher is
// defined in refresh.ts (to be added by CR-065 implementation):
//   interface TokenFetcher { getAccessToken(): Promise<string> }
//
// This test verifies the structural shape without importing the interface
// (which doesn't exist yet either). We check the method exists and is callable.

describe('CR-065 ServiceTokenFetcher — TokenFetcher interface shape', () => {
  it('has a getAccessToken method (satisfies TokenFetcher interface)', () => {
    const fetcher = new ServiceTokenFetcher('tok-shape-check');
    assert.equal(
      typeof fetcher.getAccessToken,
      'function',
      `CR-065 Scenario C FAIL: getAccessToken is not a function on ServiceTokenFetcher.\n` +
      `The class must satisfy interface TokenFetcher { getAccessToken(): Promise<string> }.`
    );
  });
});

// ─── Scenario D — multiple calls return same token (no rotation side effect) ───
//
// Service tokens are long-lived; unlike AuthFetcher they do NOT rotate.
// Three consecutive getAccessToken() calls must all return the identical token.

describe('CR-065 ServiceTokenFetcher — static / no rotation', () => {
  it('returns the same token on repeated calls (no rotation or caching side effects)', async () => {
    const token = 'svc-tok-static-no-rotation';
    const fetcher = new ServiceTokenFetcher(token);
    const [r1, r2, r3] = await Promise.all([
      fetcher.getAccessToken(),
      fetcher.getAccessToken(),
      fetcher.getAccessToken(),
    ]);
    assert.equal(r1, token, `Call 1 returned "${r1}", expected "${token}".`);
    assert.equal(r2, token, `Call 2 returned "${r2}", expected "${token}".`);
    assert.equal(r3, token, `Call 3 returned "${r3}", expected "${token}".`);
  });

  it('returns same token on sequential calls', async () => {
    const token = 'svc-tok-sequential';
    const fetcher = new ServiceTokenFetcher(token);
    const first = await fetcher.getAccessToken();
    const second = await fetcher.getAccessToken();
    assert.equal(first, second, `Sequential calls returned different tokens: "${first}" vs "${second}".`);
  });
});
