/**
 * doctor-notifier.test.ts — STORY-016-02
 *
 * Tests for the update notifier emitted by `cleargate doctor --session-start`
 * when a newer CLI version is available on the npm registry.
 *
 * Test seams:
 *   - cli.checkLatestVersion: replaces checkLatestVersion() for deterministic results.
 *   - cli.installedVersion: injects the installed CLI version (avoids import.meta.url
 *     path resolution issues under vitest source-mode).
 *   - The notifier is emitted BEFORE the pending-sync read, so tests that exercise
 *     the notifier need no pending-sync/ dir setup (fresh-install case works).
 *
 * Named cases correspond 1-to-1 with Gherkin scenarios in STORY-016-02 §2.1.
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import {
  runSessionStart,
  type DoctorCliOptions,
} from '../../src/commands/doctor.js';
import type { CheckResult } from '../../src/lib/registry-check.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeTmpDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'cg-notifier-'));
}

function makeCheckFn(result: CheckResult): () => Promise<CheckResult> {
  return async () => result;
}

/**
 * Run runSessionStart with mocked checkLatestVersion + installedVersion seams.
 * Returns the lines emitted to stdout.
 */
async function runWithMockedCheck(
  result: CheckResult,
  installedVersion: string,
  extraCliOpts?: Partial<DoctorCliOptions>
): Promise<{ lines: string[] }> {
  const dir = makeTmpDir();
  const lines: string[] = [];

  const cli: DoctorCliOptions = {
    checkLatestVersion: makeCheckFn(result),
    installedVersion,
    ...extraCliOpts,
  };

  try {
    await runSessionStart(dir, (s) => lines.push(s), undefined, cli);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }

  return { lines };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('STORY-016-02: doctor --session-start update notifier', () => {
  /**
   * Scenario: Notifier prints when latest > installed
   * Given installed version is "0.8.2"
   * And checkLatestVersion returns { latest: "0.9.0", from: "network" }
   * When `cleargate doctor --session-start` runs
   * Then stdout contains "cleargate 0.9.0 available (current: 0.8.2)"
   */
  it('Notifier prints when latest > installed', async () => {
    const { lines } = await runWithMockedCheck(
      { latest: '0.9.0', from: 'network' },
      '0.8.2'
    );

    const output = lines.join('\n');
    expect(output).toContain('cleargate 0.9.0 available (current: 0.8.2)');
    expect(output).toContain('run `cleargate upgrade` or see CHANGELOG');
  });

  /**
   * Scenario: No notifier when up to date
   * Given installed version is "0.9.0"
   * And checkLatestVersion returns { latest: "0.9.0", from: "cache" }
   * When `cleargate doctor --session-start` runs
   * Then stdout does NOT contain "available"
   */
  it('No notifier when up to date', async () => {
    const { lines } = await runWithMockedCheck(
      { latest: '0.9.0', from: 'cache' },
      '0.9.0'
    );

    const output = lines.join('\n');
    expect(output).not.toContain('available');
  });

  /**
   * Scenario: No notifier on opt-out
   * Given checkLatestVersion returns { latest: null, from: "opt-out" }
   * When `cleargate doctor --session-start` runs
   * Then stdout does NOT contain "available"
   */
  it('No notifier on opt-out', async () => {
    const { lines } = await runWithMockedCheck(
      { latest: null, from: 'opt-out' },
      '0.8.2'
    );

    const output = lines.join('\n');
    expect(output).not.toContain('available');
  });

  /**
   * Scenario: Notifier does not change exit code
   * Given there are 0 blocked items
   * And checkLatestVersion returns { latest: "0.9.0", from: "network" }
   * When `cleargate doctor --session-start` runs
   * Then the exit code is 0 (outcome.blocker is NOT set by the notifier)
   *
   * Note: outcome.configError may be set by emitResolverStatusLine (no cleargate CLI
   * available in tmpdir) — that is pre-existing doctor behaviour unrelated to the
   * notifier. The story's "exit code" guarantee is specifically that the NOTIFIER
   * must not influence outcome.blocker (the blocker flag drives exit(1)).
   */
  it('Notifier does not change exit code (outcome.blocker unmodified)', async () => {
    const dir = makeTmpDir();
    // Create a pending-sync dir with 0 blocked items so outcome.blocker stays false.
    const pendingDir = path.join(dir, '.cleargate', 'delivery', 'pending-sync');
    fs.mkdirSync(pendingDir, { recursive: true });

    const lines: string[] = [];
    const outcome = { configError: false, blocker: false };

    const cli: DoctorCliOptions = {
      checkLatestVersion: makeCheckFn({ latest: '0.9.0', from: 'network' }),
      installedVersion: '0.8.2',
    };

    try {
      await runSessionStart(dir, (s) => lines.push(s), outcome, cli);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }

    // Notifier fires (notice emitted)
    const output = lines.join('\n');
    expect(output).toContain('cleargate 0.9.0 available (current: 0.8.2)');

    // The notifier MUST NOT set outcome.blocker (drives exit(1))
    expect(outcome.blocker).toBe(false);
  });

  /**
   * Additional: notifier fires even when pending-sync/ dir does not exist
   * (fresh-install scenario — the early return in runSessionStart must not precede it).
   */
  it('Notifier fires for fresh install with no pending-sync/ dir', async () => {
    const { lines } = await runWithMockedCheck(
      { latest: '0.9.0', from: 'network' },
      '0.8.2'
    );

    // No pending-sync/ dir was created — notifier must still emit.
    const output = lines.join('\n');
    expect(output).toContain('cleargate 0.9.0 available (current: 0.8.2)');
  });

  /**
   * Additional: notifier is silent on error from checkLatestVersion (from: 'error', latest: null).
   * Verifies the offline-silent contract for the error case.
   */
  it('No notifier when checkLatestVersion returns from: "error" with null latest', async () => {
    const { lines } = await runWithMockedCheck(
      { latest: null, from: 'error' },
      '0.8.2'
    );

    const output = lines.join('\n');
    expect(output).not.toContain('available');
  });
});
