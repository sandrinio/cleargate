import { describe, test } from 'node:test';
import assert from 'node:assert/strict';

/**
 * scaffold-blocklist.test.ts — unit test for the DEFAULT_BLOCKLIST constant.
 *
 * STORY-018-04: Verifies the blocklist is non-empty and covers all categories.
 */

import { DEFAULT_BLOCKLIST } from '../../src/lib/scaffold-blocklist.js';

describe('DEFAULT_BLOCKLIST', () => {
  test('is non-empty and covers all required categories', () => {
    assert.ok(DEFAULT_BLOCKLIST.length > 0);

    // ORMs
    assert.ok(String(DEFAULT_BLOCKLIST).includes('drizzle'));
    assert.ok(String(DEFAULT_BLOCKLIST).includes('prisma'));

    // Web frameworks
    assert.ok(String(DEFAULT_BLOCKLIST).includes('fastify'));
    assert.ok(String(DEFAULT_BLOCKLIST).includes('svelte'));
    assert.ok(String(DEFAULT_BLOCKLIST).includes('react'));

    // Infra
    assert.ok(String(DEFAULT_BLOCKLIST).includes('coolify'));
    assert.ok(String(DEFAULT_BLOCKLIST).includes('vercel'));

    // DB engines
    assert.ok(String(DEFAULT_BLOCKLIST).includes('postgres'));
    assert.ok(String(DEFAULT_BLOCKLIST).includes('mysql'));

    // Cache/queue
    assert.ok(String(DEFAULT_BLOCKLIST).includes('redis'));
    assert.ok(String(DEFAULT_BLOCKLIST).includes('kafka'));

    // Styling
    assert.ok(String(DEFAULT_BLOCKLIST).includes('tailwind'));
    assert.ok(String(DEFAULT_BLOCKLIST).includes('daisyui'));
  });
});
