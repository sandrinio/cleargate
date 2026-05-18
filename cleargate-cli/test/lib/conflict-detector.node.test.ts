import { describe, test } from 'node:test';
import assert from 'node:assert/strict';

/**
 * conflict-detector.test.ts — STORY-010-03
 *
 * 9 tests: one per ConflictState (8 rules) + 1 unknown fallthrough (R3).
 * No I/O. Pure unit tests.
 */

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
  test('Scenario: classify no-change', () => {
    const result = classify(localSnap(), remoteSnap(), base);
    assert.strictEqual(result.state, 'no-change');
    assert.strictEqual(result.resolution, 'pull');
  });

  test('Scenario: classify local-only content edit', () => {
    const result = classify(
      localSnap({ body_sha: OTHER_SHA, updated_at: '2026-02-01T00:00:00Z' }),
      remoteSnap(),
      base,
    );
    assert.strictEqual(result.state, 'local-only');
    assert.strictEqual(result.resolution, 'push');
  });

  test('Scenario: classify remote-only status change', () => {
    const result = classify(
      localSnap(),
      remoteSnap({ status: STATUS_CLOSED, updated_at: '2026-02-01T00:00:00Z' }),
      base,
    );
    assert.strictEqual(result.state, 'remote-only');
    assert.strictEqual(result.resolution, 'pull');
  });

  test('Scenario: classify content-content conflict', () => {
    const result = classify(
      localSnap({ body_sha: OTHER_SHA }),
      remoteSnap({ body_sha: 'zzzzzz' }),
      base,
    );
    assert.strictEqual(result.state, 'content-content');
    assert.strictEqual(result.resolution, 'merge');
  });

  test('Scenario: classify content-status silent merge', () => {
    // local body changed; remote status changed; remote body still at base
    const result = classify(
      localSnap({ body_sha: OTHER_SHA }),
      remoteSnap({ status: STATUS_CLOSED }),
      base,
    );
    assert.strictEqual(result.state, 'content-status');
    assert.strictEqual(result.resolution, 'merge-silent');
  });

  test('Scenario: classify status-status remote-wins', () => {
    // both statuses changed from last_synced_status ('open')
    const result = classify(
      localSnap({ status: STATUS_IN_PROGRESS }),
      remoteSnap({ status: STATUS_CLOSED }),
      base,
    );
    assert.strictEqual(result.state, 'status-status');
    assert.strictEqual(result.resolution, 'remote-wins');
  });

  test('Scenario: classify local-delete + remote-edit refused', () => {
    const result = classify(
      localSnap({ deleted: true }),
      remoteSnap({ updated_at: '2026-02-01T00:00:00Z' }),
      base,
    );
    assert.strictEqual(result.state, 'local-delete-remote-edit');
    assert.strictEqual(result.resolution, 'refuse');
  });

  test('Scenario: classify remote-delete + local-edit refused', () => {
    const result = classify(
      localSnap({ updated_at: '2026-02-01T00:00:00Z' }),
      remoteSnap({ deleted: true }),
      base,
    );
    assert.strictEqual(result.state, 'remote-delete-local-edit');
    assert.strictEqual(result.resolution, 'refuse');
  });

  test('R3 fallthrough: unknown state returns halt', () => {
    // Both deleted + both bodies diverged — does not match any of rules 1–8
    const result = classify(
      localSnap({ deleted: true, body_sha: OTHER_SHA, updated_at: '2026-01-01T00:00:00Z' }),
      remoteSnap({ deleted: true, body_sha: 'zzzzzz', updated_at: '2026-01-01T00:00:00Z' }),
      { ...base, last_pulled_at: '2026-02-01T00:00:00Z', last_pushed_at: '2026-02-01T00:00:00Z' },
    );
    assert.strictEqual(result.state, 'unknown');
    assert.strictEqual(result.resolution, 'halt');
    assert.match(String(result.reason), /not recognized/);
  });

  test('conflict-detector.ts is pure — no fs/child_process/os imports', async () => {
    // Read the source file and assert it contains no I/O imports
    const { readFileSync } = await import('node:fs');
    const src = readFileSync(
      new URL('../../src/lib/conflict-detector.ts', import.meta.url),
      'utf-8',
    );
    assert.doesNotMatch(String(src), /from ['"]node:fs['"]/);
    assert.doesNotMatch(String(src), /from ['"]node:child_process['"]/);
    assert.doesNotMatch(String(src), /from ['"]node:os['"]/);
    // Also assert no imports from commands/ or bin/
    assert.doesNotMatch(String(src), /from ['"].*\/commands\//);
    assert.doesNotMatch(String(src), /from ['"].*\/bin\//);
  });
});
