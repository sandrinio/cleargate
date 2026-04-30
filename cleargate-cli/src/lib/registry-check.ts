/**
 * registry-check.ts — STORY-016-01
 *
 * Reusable library: checks the npm registry for the latest `cleargate` version,
 * caches the result for 24 hours at ~/.cleargate/update-check.json, honours
 * the CLEARGATE_NO_UPDATE_CHECK=1 opt-out env var, and is fully offline-silent.
 *
 * API contract is LOCKED — consumed verbatim by STORY-016-02 (doctor notifier).
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';

// ─── Public types ─────────────────────────────────────────────────────────────

export type CheckSource = 'cache' | 'network' | 'opt-out' | 'error';

export interface CheckResult {
  latest: string | null;
  from: CheckSource;
}

/**
 * All four keys are test-seam injection points.
 * - `fetcher`: replaces globalThis.fetch for unit tests (no real network).
 * - `now`: replaces `new Date()` for deterministic 24h throttle tests.
 * - `cleargateHome`: replaces `~/.cleargate` for tmpdir-isolated tests.
 * - `env`: replaces `process.env` (captured at call-time, not module-load time).
 */
export interface CheckOptions {
  fetcher?: typeof fetch;       // test-seam injection
  now?: () => Date;             // test-seam for 24h throttle
  cleargateHome?: string;       // test-seam for ~/.cleargate (mirrors doctor.ts seam at line 38)
  env?: NodeJS.ProcessEnv;      // test-seam for CLEARGATE_NO_UPDATE_CHECK
}

// ─── Internal types ───────────────────────────────────────────────────────────

interface CacheFile {
  checked_at: string;
  latest_version: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const REGISTRY_URL = 'https://registry.npmjs.org/cleargate';
const TTL_MS = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
const CACHE_FILENAME = 'update-check.json';

// ─── Internal helpers ─────────────────────────────────────────────────────────

/**
 * Compare two semver strings of the form `\d+\.\d+\.\d+`.
 * Returns -1 when a < b, 0 when equal, 1 when a > b.
 * Exported so STORY-016-02 (and later STORY-016-04) can import without adding
 * the `semver` npm package as a dependency.
 */
export function compareSemver(a: string, b: string): -1 | 0 | 1 {
  const parseVersion = (v: string): [number, number, number] => {
    const parts = v.split('.').map(Number);
    return [parts[0] ?? 0, parts[1] ?? 0, parts[2] ?? 0];
  };

  const [aMajor, aMinor, aPatch] = parseVersion(a);
  const [bMajor, bMinor, bPatch] = parseVersion(b);

  if (aMajor !== bMajor) return aMajor > bMajor ? 1 : -1;
  if (aMinor !== bMinor) return aMinor > bMinor ? 1 : -1;
  if (aPatch !== bPatch) return aPatch > bPatch ? 1 : -1;
  return 0;
}

/**
 * Resolve the cache file path from the cleargateHome option or default ~/.cleargate.
 */
function resolveCachePath(cleargateHome?: string): string {
  const home = cleargateHome ?? path.join(os.homedir(), '.cleargate');
  return path.join(home, CACHE_FILENAME);
}

/**
 * Try to read and parse the cache file. Returns null on any error (missing,
 * malformed JSON, missing fields) — callers treat null as "no cache."
 */
function readCache(cachePath: string): CacheFile | null {
  try {
    const raw = fs.readFileSync(cachePath, 'utf-8');
    const parsed: unknown = JSON.parse(raw);
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      'checked_at' in parsed &&
      'latest_version' in parsed &&
      typeof (parsed as CacheFile).checked_at === 'string' &&
      typeof (parsed as CacheFile).latest_version === 'string'
    ) {
      return parsed as CacheFile;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Write (or overwrite) the cache file. Creates the parent directory if absent.
 * Silent on write failure — never throws.
 */
function writeCache(cachePath: string, version: string): void {
  try {
    fs.mkdirSync(path.dirname(cachePath), { recursive: true });
    const entry: CacheFile = {
      checked_at: new Date().toISOString(),
      latest_version: version,
    };
    fs.writeFileSync(cachePath, JSON.stringify(entry, null, 2), 'utf-8');
  } catch {
    // Silently ignore write failures (read-only fs, permission issue, etc.)
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Returns the latest published `cleargate` version (or a cached value, or null
 * on failure / opt-out). Never throws; never writes to stderr.
 *
 * Execution order:
 *   1. Opt-out check — if CLEARGATE_NO_UPDATE_CHECK=1, return immediately.
 *   2. Cache read — if cache is fresh (<24h), return from cache.
 *   3. Network fetch — hit the npm registry.
 *   4. On fetch success: write cache, return with `from:'network'`.
 *   5. On fetch failure: return cached version (or null) with `from:'error'`.
 */
export async function checkLatestVersion(opts?: CheckOptions): Promise<CheckResult> {
  // 1. Capture env at call-time (not module-load time) so tests can mutate env
  //    between cases without leaking state.
  const env = opts?.env ?? process.env;
  if (env['CLEARGATE_NO_UPDATE_CHECK'] === '1') {
    return { latest: null, from: 'opt-out' };
  }

  const cachePath = resolveCachePath(opts?.cleargateHome);
  const nowMs = (opts?.now ? opts.now() : new Date()).getTime();

  // 2. Cache read + freshness check
  const cached = readCache(cachePath);
  if (cached !== null) {
    const age = nowMs - Date.parse(cached.checked_at);
    if (age < TTL_MS) {
      return { latest: cached.latest_version, from: 'cache' };
    }
  }

  // 3. Network fetch
  const fetcher = opts?.fetcher ?? globalThis.fetch;
  try {
    const response = await fetcher(REGISTRY_URL, {
      signal: AbortSignal.timeout(2000),
    });

    if (!response.ok) {
      // Non-2xx response — treat as error, fall back to cache
      return { latest: cached?.latest_version ?? null, from: 'error' };
    }

    // Parse only the dist-tags.latest field; ignore everything else so
    // registry-format drift (new fields, renamed keys) doesn't break us.
    const body: unknown = await response.json();
    if (
      typeof body !== 'object' ||
      body === null ||
      !('dist-tags' in body) ||
      typeof (body as Record<string, unknown>)['dist-tags'] !== 'object'
    ) {
      return { latest: cached?.latest_version ?? null, from: 'error' };
    }

    const distTags = (body as Record<string, Record<string, string>>)['dist-tags'];
    const latest = distTags['latest'];
    if (typeof latest !== 'string' || latest.trim() === '') {
      return { latest: cached?.latest_version ?? null, from: 'error' };
    }

    // 4. Write cache then return network result
    writeCache(cachePath, latest);
    return { latest, from: 'network' };
  } catch {
    // 5. Any thrown error (AbortError on timeout, ECONNREFUSED, etc.)
    //    → fall back to cache silently; never re-throw; never write to stderr.
    return { latest: cached?.latest_version ?? null, from: 'error' };
  }
}
