/**
 * scaffold-blocklist.test.ts — unit test for the DEFAULT_BLOCKLIST constant.
 *
 * STORY-018-04: Verifies the blocklist is non-empty and covers all categories.
 */

import { describe, it, expect } from 'vitest';
import { DEFAULT_BLOCKLIST } from '../../src/lib/scaffold-blocklist.js';

describe('DEFAULT_BLOCKLIST', () => {
  it('is non-empty and covers all required categories', () => {
    expect(DEFAULT_BLOCKLIST.length).toBeGreaterThan(0);

    // ORMs
    expect(DEFAULT_BLOCKLIST).toContain('drizzle');
    expect(DEFAULT_BLOCKLIST).toContain('prisma');

    // Web frameworks
    expect(DEFAULT_BLOCKLIST).toContain('fastify');
    expect(DEFAULT_BLOCKLIST).toContain('svelte');
    expect(DEFAULT_BLOCKLIST).toContain('react');

    // Infra
    expect(DEFAULT_BLOCKLIST).toContain('coolify');
    expect(DEFAULT_BLOCKLIST).toContain('vercel');

    // DB engines
    expect(DEFAULT_BLOCKLIST).toContain('postgres');
    expect(DEFAULT_BLOCKLIST).toContain('mysql');

    // Cache/queue
    expect(DEFAULT_BLOCKLIST).toContain('redis');
    expect(DEFAULT_BLOCKLIST).toContain('kafka');

    // Styling
    expect(DEFAULT_BLOCKLIST).toContain('tailwind');
    expect(DEFAULT_BLOCKLIST).toContain('daisyui');
  });
});
