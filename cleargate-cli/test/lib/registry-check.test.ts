/**
 * registry-check.test.ts — STORY-016-01
 *
 * Six unit tests — one per Gherkin scenario in story §2.1.
 *
 * All tests use the injected `fetcher`, `now`, `cleargateHome`, and `env`
 * seams so no real network calls are made and no real ~/.cleargate is touched.
 *
 * FLASHCARD guard (R1 from M1 plan): NEVER call checkLatestVersion() without
 * an explicit `fetcher` opt — prevents accidental network hits in CI.
 */

import { describe, it, expect, afterEach, vi } from 'vitest';
import * as os from 'node:os';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { checkLatestVersion } from '../../src/lib/registry-check.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Create an isolated tmpdir acting as ~/.cleargate for each test. */
function makeTmpHome(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'cg-regcheck-test-'));
}

/** Build a minimal valid npm registry response JSON string. */
function makeRegistryResponse(version: string): string {
  return JSON.stringify({ 'dist-tags': { latest: version } });
}

/**
 * Build a mock `fetcher` that resolves with the given registry payload.
 * The mock mirrors the `fetch` interface minimally: ok=true, json().
 */
function mockFetcher(version: string): typeof fetch {
  return vi.fn().mockResolvedValue({
    ok: true,
    json: async () => JSON.parse(makeRegistryResponse(version)),
  }) as unknown as typeof fetch;
}

/** Build a mock `fetcher` that rejects (simulates ECONNREFUSED / network down). */
function rejectingFetcher(): typeof fetch {
  return vi.fn().mockRejectedValue(new Error('ECONNREFUSED')) as unknown as typeof fetch;
}

/**
 * Write a pre-existing cache file at <home>/update-check.json.
 * `hoursAgo` controls how old the entry appears (relative to `nowMs`).
 */
function writeCacheFile(
  home: string,
  version: string,
  nowMs: number,
  hoursAgo: number,
): void {
  const checkedAt = new Date(nowMs - hoursAgo * 60 * 60 * 1000).toISOString();
  const cacheFile = path.join(home, 'update-check.json');
  fs.mkdirSync(home, { recursive: true });
  fs.writeFileSync(
    cacheFile,
    JSON.stringify({ checked_at: checkedAt, latest_version: version }),
    'utf-8',
  );
}

// ─── Cleanup ──────────────────────────────────────────────────────────────────

const tmpDirs: string[] = [];

afterEach(() => {
  for (const dir of tmpDirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('checkLatestVersion (STORY-016-01)', () => {
  /**
   * Scenario: Fresh check writes cache and returns network result
   *
   * Given no cache file exists
   * And the registry returns { "dist-tags": { "latest": "0.9.0" } }
   * When checkLatestVersion runs
   * Then result is { latest: "0.9.0", from: "network" }
   * And ~/.cleargate/update-check.json contains checked_at and latest_version: "0.9.0"
   */
  it('Scenario: Fresh check writes cache and returns network result', async () => {
    const home = makeTmpHome();
    tmpDirs.push(home);
    const cacheFile = path.join(home, 'update-check.json');

    // Precondition: no cache file exists
    expect(fs.existsSync(cacheFile)).toBe(false);

    const fetcher = mockFetcher('0.9.0');
    const result = await checkLatestVersion({
      fetcher,
      cleargateHome: home,
      env: {},
    });

    // Result assertion
    expect(result).toEqual({ latest: '0.9.0', from: 'network' });

    // Cache write assertion
    expect(fs.existsSync(cacheFile)).toBe(true);
    const cached = JSON.parse(fs.readFileSync(cacheFile, 'utf-8'));
    expect(cached.latest_version).toBe('0.9.0');
    expect(typeof cached.checked_at).toBe('string');
    expect(cached.checked_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  /**
   * Scenario: Recent cache short-circuits network
   *
   * Given the cache was written 1 hour ago with latest_version: "0.9.0"
   * When checkLatestVersion runs
   * Then result is { latest: "0.9.0", from: "cache" }
   * And no network call is made
   */
  it('Scenario: Recent cache short-circuits network', async () => {
    const home = makeTmpHome();
    tmpDirs.push(home);
    const nowMs = Date.now();
    writeCacheFile(home, '0.9.0', nowMs, 1 /* 1 hour ago */);

    const fetcher = vi.fn() as unknown as typeof fetch;
    const result = await checkLatestVersion({
      fetcher,
      now: () => new Date(nowMs),
      cleargateHome: home,
      env: {},
    });

    expect(result).toEqual({ latest: '0.9.0', from: 'cache' });
    // Assert fetcher was NEVER called
    expect(fetcher).not.toHaveBeenCalled();
  });

  /**
   * Scenario: Stale cache triggers refresh
   *
   * Given the cache was written 25 hours ago with latest_version: "0.8.0"
   * And the registry now reports "0.9.0"
   * When checkLatestVersion runs
   * Then result is { latest: "0.9.0", from: "network" }
   */
  it('Scenario: Stale cache triggers refresh', async () => {
    const home = makeTmpHome();
    tmpDirs.push(home);
    const nowMs = Date.now();
    writeCacheFile(home, '0.8.0', nowMs, 25 /* 25 hours ago — stale */);

    const fetcher = mockFetcher('0.9.0');
    const result = await checkLatestVersion({
      fetcher,
      now: () => new Date(nowMs),
      cleargateHome: home,
      env: {},
    });

    expect(result).toEqual({ latest: '0.9.0', from: 'network' });
    expect(fetcher).toHaveBeenCalledOnce();
  });

  /**
   * Scenario: Opt-out env var suppresses everything
   *
   * Given CLEARGATE_NO_UPDATE_CHECK=1
   * When checkLatestVersion runs
   * Then result is { latest: null, from: "opt-out" }
   * And no network call is made
   * And no cache file is written
   */
  it('Scenario: Opt-out env var suppresses everything', async () => {
    const home = makeTmpHome();
    tmpDirs.push(home);
    const cacheFile = path.join(home, 'update-check.json');

    const fetcher = vi.fn() as unknown as typeof fetch;
    const result = await checkLatestVersion({
      fetcher,
      cleargateHome: home,
      env: { CLEARGATE_NO_UPDATE_CHECK: '1' },
    });

    expect(result).toEqual({ latest: null, from: 'opt-out' });

    // No network call made
    expect(fetcher).not.toHaveBeenCalled();

    // No cache file written (stat after call)
    expect(fs.existsSync(cacheFile)).toBe(false);
  });

  /**
   * Scenario: Network failure falls back to cache silently
   *
   * Given the cache holds latest_version: "0.8.0" written 25 hours ago
   * And the registry rejects with ECONNREFUSED
   * When checkLatestVersion runs
   * Then result is { latest: "0.8.0", from: "error" }
   * And no exception is thrown
   * And nothing is written to stderr
   */
  it('Scenario: Network failure falls back to cache silently', async () => {
    const home = makeTmpHome();
    tmpDirs.push(home);
    const nowMs = Date.now();
    writeCacheFile(home, '0.8.0', nowMs, 25 /* stale — would trigger refresh */);

    // Spy on process.stderr.write to verify nothing is written
    const stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);

    let result: Awaited<ReturnType<typeof checkLatestVersion>> | undefined;
    let threw = false;
    try {
      result = await checkLatestVersion({
        fetcher: rejectingFetcher(),
        now: () => new Date(nowMs),
        cleargateHome: home,
        env: {},
      });
    } catch {
      threw = true;
    } finally {
      stderrSpy.mockRestore();
    }

    expect(threw).toBe(false);
    expect(result).toEqual({ latest: '0.8.0', from: 'error' });
    expect(stderrSpy).not.toHaveBeenCalled();
  });

  /**
   * Scenario: Network failure with no cache returns null
   *
   * Given no cache file exists
   * And the registry rejects
   * When checkLatestVersion runs
   * Then result is { latest: null, from: "error" }
   */
  it('Scenario: Network failure with no cache returns null', async () => {
    const home = makeTmpHome();
    tmpDirs.push(home);

    const result = await checkLatestVersion({
      fetcher: rejectingFetcher(),
      cleargateHome: home,
      env: {},
    });

    expect(result).toEqual({ latest: null, from: 'error' });
  });
});
