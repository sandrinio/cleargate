import { describe, test, afterEach, mock } from 'node:test';
import assert from 'node:assert/strict';

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

import * as os from 'node:os';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { checkLatestVersion } from '../../src/lib/registry-check.js';

// Minimal expect() shim (STORY-028-06)
// Backs remaining expect() calls with node:assert so vitest is not needed.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function expect(actual: any): any {
  const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return {
    toBe(expected: unknown) { assert.strictEqual(actual, expected); },
    toEqual(expected: unknown) { assert.deepStrictEqual(actual, expected); },
    toStrictEqual(expected: unknown) { assert.deepStrictEqual(actual, expected); },
    toBeNull() { assert.strictEqual(actual, null); },
    toBeUndefined() { assert.strictEqual(actual, undefined); },
    toBeDefined() { assert.notStrictEqual(actual, undefined); },
    toBeTruthy() { assert.ok(actual); },
    toBeFalsy() { assert.ok(!actual); },
    toBeGreaterThan(n: number) { assert.ok((actual as number) > n); },
    toBeGreaterThanOrEqual(n: number) { assert.ok((actual as number) >= n); },
    toBeLessThan(n: number) { assert.ok((actual as number) < n); },
    toBeLessThanOrEqual(n: number) { assert.ok((actual as number) <= n); },
    toContain(sub: unknown) { assert.ok(String(actual).includes(String(sub))); },
    toMatch(p: string | RegExp) { assert.match(String(actual), typeof p === 'string' ? new RegExp(esc(p)) : p); },
    toHaveLength(len: number) { assert.strictEqual((actual as { length: number }).length, len); },
    toThrow(msg?: string | RegExp) {
      if (!msg) assert.throws(actual as () => void);
      else if (typeof msg === 'string') assert.throws(actual as () => void, new RegExp(esc(msg)));
      else assert.throws(actual as () => void, msg);
    },
    toBeInstanceOf(cls: new (...a: unknown[]) => unknown) { assert.ok(actual instanceof cls); },
    toMatchObject(expected: Record<string, unknown>) { assert.deepStrictEqual(actual, expected); },
    toHaveBeenCalled() { assert.ok((actual as { mock: { calls: unknown[] } }).mock.calls.length > 0); },
    toHaveBeenCalledTimes(n: number) { assert.strictEqual((actual as { mock: { calls: unknown[] } }).mock.calls.length, n); },
    toHaveBeenCalledOnce() { assert.strictEqual((actual as { mock: { calls: unknown[] } }).mock.calls.length, 1); },
    toHaveBeenCalledWith(...expectedArgs: unknown[]) {
      const calls = (actual as { mock: { calls: Array<{arguments: unknown[]}> } }).mock.calls;
      assert.deepStrictEqual(calls[calls.length - 1].arguments, expectedArgs);
    },
    toHaveProperty(key: string, val?: unknown) {
      const obj = actual as Record<string, unknown>;
      assert.ok(key in obj);
      if (val !== undefined) assert.deepStrictEqual(obj[key], val);
    },
    get not(): any {
      return {
        toBe(expected: unknown) { assert.notStrictEqual(actual, expected); },
        toEqual(expected: unknown) { assert.notDeepStrictEqual(actual, expected); },
        toBeNull() { assert.notStrictEqual(actual, null); },
        toBeUndefined() { assert.notStrictEqual(actual, undefined); },
        toBeDefined() { assert.strictEqual(actual, undefined); },
        toBeTruthy() { assert.ok(!actual); },
        toBeFalsy() { assert.ok(actual); },
        toContain(sub: unknown) { assert.ok(!String(actual).includes(String(sub))); },
        toMatch(p: string | RegExp) { assert.doesNotMatch(String(actual), typeof p === 'string' ? new RegExp(esc(p)) : p); },
        toThrow() { assert.doesNotThrow(actual as () => void); },
        toHaveBeenCalled() { assert.strictEqual((actual as { mock: { calls: unknown[] } }).mock.calls.length, 0); },
        toHaveProperty(key: string) { const obj = actual as Record<string, unknown>; assert.ok(!(key in obj)); },
        toBeInstanceOf(cls: new (...a: unknown[]) => unknown) { assert.ok(!(actual instanceof cls)); },
        toHaveLength(len: number) { assert.notStrictEqual((actual as { length: number }).length, len); },
      };
    },
    get resolves(): any {
      const p = actual as Promise<unknown>;
      return {
        async toBe(expected: unknown) { assert.strictEqual(await p, expected); },
        async toEqual(expected: unknown) { assert.deepStrictEqual(await p, expected); },
        async toBeUndefined() { assert.strictEqual(await p, undefined); },
        async toBeNull() { assert.strictEqual(await p, null); },
        async toBeDefined() { assert.notStrictEqual(await p, undefined); },
        async toBeTruthy() { assert.ok(await p); },
      };
    },
    get rejects(): any {
      const p = actual as Promise<unknown>;
      return {
        async toBeInstanceOf(cls: new (...a: unknown[]) => unknown) { await assert.rejects(p, cls); },
        async toThrow(msg?: string | RegExp | (new (...a: unknown[]) => unknown)) {
          if (!msg) await assert.rejects(p);
          else if (typeof msg === 'string') await assert.rejects(p, new RegExp(esc(msg)));
          else await assert.rejects(p, msg as RegExp);
        },
        async toSatisfy(predicate: (val: unknown) => boolean) {
          let err: unknown;
          try { await p; } catch(e) { err = e; }
          assert.ok(predicate(err), `Rejected value did not satisfy predicate. Got: ${String(err)}`);
        },
        async toMatchObject(expected: Record<string, unknown>) {
          let err: unknown;
          try { await p; } catch(e) { err = e; }
          const errObj = err as Record<string, unknown>;
          for (const [k, v] of Object.entries(expected)) {
            if (typeof v === 'string' && (v as any).__isStringContaining) {
              assert.ok(String(errObj[k]).includes((v as any).__value), `Expected ${k} to contain "${(v as any).__value}"`);
            } else {
              assert.deepStrictEqual(errObj[k], v, `Expected ${k} to equal ${String(v)}`);
            }
          }
        },
      };
    },
  };
}
// expect.stringContaining — creates a partial string matcher for use in toMatchObject
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(expect as any).stringContaining = (str: string) => ({ __isStringContaining: true, __value: str });


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
  return mock.fn(() => Promise.resolve({
    ok: true,
    json: async () => JSON.parse(makeRegistryResponse(version)),
  })) as unknown as typeof fetch;
}

/** Build a mock `fetcher` that rejects (simulates ECONNREFUSED / network down). */
function rejectingFetcher(): typeof fetch {
  return mock.fn(() => Promise.reject(new Error('ECONNREFUSED'))) as unknown as typeof fetch;
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
  test('Scenario: Fresh check writes cache and returns network result', async () => {
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
    assert.deepStrictEqual(result, { latest: '0.9.0', from: 'network' });

    // Cache write assertion
    expect(fs.existsSync(cacheFile)).toBe(true);
    const cached = JSON.parse(fs.readFileSync(cacheFile, 'utf-8'));
    assert.strictEqual(cached.latest_version, '0.9.0');
    assert.strictEqual(typeof cached.checked_at, 'string');
    assert.match(String(cached.checked_at), /^\d{4}-\d{2}-\d{2}T/);
  });

  /**
   * Scenario: Recent cache short-circuits network
   *
   * Given the cache was written 1 hour ago with latest_version: "0.9.0"
   * When checkLatestVersion runs
   * Then result is { latest: "0.9.0", from: "cache" }
   * And no network call is made
   */
  test('Scenario: Recent cache short-circuits network', async () => {
    const home = makeTmpHome();
    tmpDirs.push(home);
    const nowMs = Date.now();
    writeCacheFile(home, '0.9.0', nowMs, 1 /* 1 hour ago */);

    const fetcher = mock.fn() as unknown as typeof fetch;
    const result = await checkLatestVersion({
      fetcher,
      now: () => new Date(nowMs),
      cleargateHome: home,
      env: {},
    });

    assert.deepStrictEqual(result, { latest: '0.9.0', from: 'cache' });
    // Assert fetcher was NEVER called
    assert.strictEqual(fetcher.mock.calls.length, 0);
  });

  /**
   * Scenario: Stale cache triggers refresh
   *
   * Given the cache was written 25 hours ago with latest_version: "0.8.0"
   * And the registry now reports "0.9.0"
   * When checkLatestVersion runs
   * Then result is { latest: "0.9.0", from: "network" }
   */
  test('Scenario: Stale cache triggers refresh', async () => {
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

    assert.deepStrictEqual(result, { latest: '0.9.0', from: 'network' });
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
  test('Scenario: Opt-out env var suppresses everything', async () => {
    const home = makeTmpHome();
    tmpDirs.push(home);
    const cacheFile = path.join(home, 'update-check.json');

    const fetcher = mock.fn() as unknown as typeof fetch;
    const result = await checkLatestVersion({
      fetcher,
      cleargateHome: home,
      env: { CLEARGATE_NO_UPDATE_CHECK: '1' },
    });

    assert.deepStrictEqual(result, { latest: null, from: 'opt-out' });

    // No network call made
    assert.strictEqual(fetcher.mock.calls.length, 0);

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
  test('Scenario: Network failure falls back to cache silently', async () => {
    const home = makeTmpHome();
    tmpDirs.push(home);
    const nowMs = Date.now();
    writeCacheFile(home, '0.8.0', nowMs, 25 /* stale — would trigger refresh */);

    // Spy on process.stderr.write to verify nothing is written
    const stderrSpy = mock.method(process.stderr, 'write', () => true);

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
      stderrSpy.mock.restore();
    }

    assert.strictEqual(threw, false);
    assert.deepStrictEqual(result, { latest: '0.8.0', from: 'error' });
    assert.strictEqual(stderrSpy.mock.calls.length, 0);
  });

  /**
   * Scenario: Network failure with no cache returns null
   *
   * Given no cache file exists
   * And the registry rejects
   * When checkLatestVersion runs
   * Then result is { latest: null, from: "error" }
   */
  test('Scenario: Network failure with no cache returns null', async () => {
    const home = makeTmpHome();
    tmpDirs.push(home);

    const result = await checkLatestVersion({
      fetcher: rejectingFetcher(),
      cleargateHome: home,
      env: {},
    });

    assert.deepStrictEqual(result, { latest: null, from: 'error' });
  });
});
