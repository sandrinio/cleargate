/**
 * conflict-detector.test.ts — STORY-010-03
 *
 * 9 tests: one per ConflictState (8 rules) + 1 unknown fallthrough (R3).
 * No I/O. Pure unit tests.
 */

import { describe, it, expect } from 'vitest';
import { classify } from '../../src/lib/conflict-detector.js';
import type { LocalSnapshot, RemoteSnapshot, SinceLastSync } from '../../src/lib/conflict-detector.js';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const BASE_SHA = 'aaabbbccc';
const OTHER_SHA = 'dddeeefff';
const STATUS_OPEN = 'open';
const STATUS_CLOSED = 'closed';
const STATUS_IN_PROGRESS = 'in-progress';

const base: SinceLastSync = {
  last_pushed_at: '2026-01-01T00:00:00Z',
  last_pulled_at: '2026-01-01T00:00:00Z',
  last_remote_update: '2026-01-01T00:00:00Z',
  last_body_sha: BASE_SHA,
  last_synced_status: STATUS_OPEN,
};

function localSnap(overrides: Partial<LocalSnapshot> = {}): LocalSnapshot {
  return {
    updated_at: '2026-01-01T00:00:00Z',
    body_sha: BASE_SHA,
    status: STATUS_OPEN,
    deleted: false,
    ...overrides,
  };
}

function remoteSnap(overrides: Partial<RemoteSnapshot> = {}): RemoteSnapshot {
  return {
    updated_at: '2026-01-01T00:00:00Z',
    body_sha: BASE_SHA,
    status: STATUS_OPEN,
    deleted: false,
    ...overrides,
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('conflict-detector classify()', () => {
  it('Scenario: classify no-change', () => {
    const result = classify(localSnap(), remoteSnap(), base);
    expect(result.state).toBe('no-change');
    expect(result.resolution).toBe('pull');
  });

  it('Scenario: classify local-only content edit', () => {
    const result = classify(
      localSnap({ body_sha: OTHER_SHA, updated_at: '2026-02-01T00:00:00Z' }),
      remoteSnap(),
      base,
    );
    expect(result.state).toBe('local-only');
    expect(result.resolution).toBe('push');
  });

  it('Scenario: classify remote-only status change', () => {
    const result = classify(
      localSnap(),
      remoteSnap({ status: STATUS_CLOSED, updated_at: '2026-02-01T00:00:00Z' }),
      base,
    );
    expect(result.state).toBe('remote-only');
    expect(result.resolution).toBe('pull');
  });

  it('Scenario: classify content-content conflict', () => {
    const result = classify(
      localSnap({ body_sha: OTHER_SHA }),
      remoteSnap({ body_sha: 'zzzzzz' }),
      base,
    );
    expect(result.state).toBe('content-content');
    expect(result.resolution).toBe('merge');
  });

  it('Scenario: classify content-status silent merge', () => {
    // local body changed; remote status changed; remote body still at base
    const result = classify(
      localSnap({ body_sha: OTHER_SHA }),
      remoteSnap({ status: STATUS_CLOSED }),
      base,
    );
    expect(result.state).toBe('content-status');
    expect(result.resolution).toBe('merge-silent');
  });

  it('Scenario: classify status-status remote-wins', () => {
    // both statuses changed from last_synced_status ('open')
    const result = classify(
      localSnap({ status: STATUS_IN_PROGRESS }),
      remoteSnap({ status: STATUS_CLOSED }),
      base,
    );
    expect(result.state).toBe('status-status');
    expect(result.resolution).toBe('remote-wins');
  });

  it('Scenario: classify local-delete + remote-edit refused', () => {
    const result = classify(
      localSnap({ deleted: true }),
      remoteSnap({ updated_at: '2026-02-01T00:00:00Z' }),
      base,
    );
    expect(result.state).toBe('local-delete-remote-edit');
    expect(result.resolution).toBe('refuse');
  });

  it('Scenario: classify remote-delete + local-edit refused', () => {
    const result = classify(
      localSnap({ updated_at: '2026-02-01T00:00:00Z' }),
      remoteSnap({ deleted: true }),
      base,
    );
    expect(result.state).toBe('remote-delete-local-edit');
    expect(result.resolution).toBe('refuse');
  });

  it('R3 fallthrough: unknown state returns halt', () => {
    // Both deleted + both bodies diverged — does not match any of rules 1–8
    const result = classify(
      localSnap({ deleted: true, body_sha: OTHER_SHA, updated_at: '2026-01-01T00:00:00Z' }),
      remoteSnap({ deleted: true, body_sha: 'zzzzzz', updated_at: '2026-01-01T00:00:00Z' }),
      { ...base, last_pulled_at: '2026-02-01T00:00:00Z', last_pushed_at: '2026-02-01T00:00:00Z' },
    );
    expect(result.state).toBe('unknown');
    expect(result.resolution).toBe('halt');
    expect(result.reason).toMatch(/not recognized/);
  });

  it('conflict-detector.ts is pure — no fs/child_process/os imports', async () => {
    // Read the source file and assert it contains no I/O imports
    const { readFileSync } = await import('node:fs');
    const src = readFileSync(
      new URL('../../src/lib/conflict-detector.ts', import.meta.url),
      'utf-8',
    );
    expect(src).not.toMatch(/from ['"]node:fs['"]/);
    expect(src).not.toMatch(/from ['"]node:child_process['"]/);
    expect(src).not.toMatch(/from ['"]node:os['"]/);
    // Also assert no imports from commands/ or bin/
    expect(src).not.toMatch(/from ['"].*\/commands\//);
    expect(src).not.toMatch(/from ['"].*\/bin\//);
  });
});
