/**
 * manifest.ts — STORY-009-01
 *
 * Scaffold manifest loading, drift classification, and atomic drift-state writing.
 * Node built-ins only: fs/promises, path.
 *
 * MANIFEST.json does not exist until STORY-009-02 runs `npm run build`.
 * loadPackageManifest throws a clear error when the file is absent — not raw ENOENT.
 */

import { readFile, writeFile, rename, mkdir } from 'node:fs/promises';
import { existsSync, readFileSync } from 'node:fs';
import * as path from 'node:path';
import { hashNormalized } from './sha256.js';

// ─── Public types ─────────────────────────────────────────────────────────────

export type Tier =
  | 'protocol'
  | 'template'
  | 'agent'
  | 'hook'
  | 'script'
  | 'skill'
  | 'cli-config'
  | 'user-artifact'
  | 'derived';

export type DriftState =
  | 'clean'
  | 'user-modified'
  | 'upstream-changed'
  | 'both-changed'
  | 'untracked';

export interface ManifestEntry {
  path: string;
  sha256: string | null;
  tier: Tier;
  overwrite_policy: 'always' | 'merge-3way' | 'skip' | 'preserve' | 'pin-aware';
  preserve_on_uninstall: boolean;
}

export interface ManifestFile {
  cleargate_version: string;
  generated_at: string;
  files: ManifestEntry[];
  /**
   * Present only in `.cleargate/.install-manifest.json` (the install snapshot).
   * Stamped by `cleargate init` as the FINAL step (STORY-009-03).
   * Not present in the package-shipped MANIFEST.json.
   */
  installed_at?: string;
  /**
   * BUG-023: The pin version that was substituted into hook scripts during install.
   * Present only in install snapshots — not in the package-shipped MANIFEST.json.
   * Used by `computeCurrentSha` to reverse-substitute pin-aware hook files before
   * hashing, so drift classification compares apples to apples.
   * Absent in snapshots predating this fix — backwards-compatible (old installs
   * continue to report user-modified until the user re-runs `cleargate init`).
   */
  pin_version?: string;
}

export interface DriftMapEntry {
  state: DriftState;
  entry: ManifestEntry;
  install_sha: string | null;
  current_sha: string | null;
  package_sha: string | null;
}

export interface DriftMap {
  [filePath: string]: DriftMapEntry;
}

/**
 * The on-disk shape of `.cleargate/.drift-state.json`.
 * Wraps the DriftMap with a `last_refreshed` timestamp so the daily-throttle
 * logic in `cleargate doctor --check-scaffold` can skip re-computation.
 */
export interface DriftStateFile {
  last_refreshed: string;
  drift: DriftMap;
}

// ─── Options ──────────────────────────────────────────────────────────────────

export interface LoadPackageManifestOpts {
  /**
   * Override the root directory where MANIFEST.json is resolved.
   * Default: resolved via import.meta.url (1 level up from dist/ in prod,
   * or cleargate-planning/ in dev).
   *
   * This seam is mandatory per FLASHCARD #tsup #bundle #import-meta — the
   * bundle collapses import.meta.url to the bundle file so default resolution
   * must never be relied upon in tests.
   */
  packageRoot?: string;
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

function resolveDefaultPackageRoot(): string {
  // In production (dist/cli.js), import.meta.url points to dist/cli.js.
  // MANIFEST.json is copied to dist/ by the build step — so 0 levels up.
  // In dev, import.meta.url is cleargate-cli/src/lib/manifest.ts — 3 levels up
  // to cleargate-cli/, then ../cleargate-planning/ for the fixture source.
  // Rather than guessing, we prefer the dist/ sibling first; fall back to the
  // source-tree dev path.
  const here = new URL('.', import.meta.url).pathname;

  // Try: same directory (dist/ scenario)
  const distCandidate = path.join(here, 'MANIFEST.json');
  if (existsSync(distCandidate)) {
    return here;
  }

  // Try: 1 level up (also dist/ scenario when emitted as dist/lib/manifest.js)
  const oneLevelUp = path.join(here, '..', 'MANIFEST.json');
  if (existsSync(oneLevelUp)) {
    return path.join(here, '..');
  }

  // Dev fallback: from src/lib walk up to repo root, then cleargate-planning/
  // src/lib → src → cleargate-cli → repo-root → cleargate-planning
  const devCandidate = path.join(here, '..', '..', '..', 'cleargate-planning', 'MANIFEST.json');
  if (existsSync(devCandidate)) {
    return path.join(here, '..', '..', '..', 'cleargate-planning');
  }

  // Cannot determine — caller will get a clear error from loadPackageManifest
  return here;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Load MANIFEST.json from the installed package root.
 *
 * Uses `opts.packageRoot` (required in tests) or default resolution.
 * Throws a descriptive error when the file is absent rather than a raw ENOENT.
 */
export function loadPackageManifest(opts?: LoadPackageManifestOpts): ManifestFile {
  const packageRoot = opts?.packageRoot ?? resolveDefaultPackageRoot();
  const manifestPath = path.join(packageRoot, 'MANIFEST.json');

  if (!existsSync(manifestPath)) {
    throw new Error(
      `MANIFEST.json not found at ${manifestPath}; run 'npm run build' to generate it.`
    );
  }

  let raw: string;
  try {
    // Synchronous read — callers treat loadPackageManifest as synchronous (startup-time).
    raw = readFileSync(manifestPath, 'utf-8');
  } catch {
    throw new Error(
      `MANIFEST.json not found at ${manifestPath}; run 'npm run build' to generate it.`
    );
  }

  return JSON.parse(raw) as ManifestFile;
}

/**
 * Load the install-time snapshot from `<projectRoot>/.cleargate/.install-manifest.json`.
 * Returns null if the file does not exist (first install or pre-manifest era).
 */
export async function loadInstallSnapshot(projectRoot: string): Promise<ManifestFile | null> {
  const snapshotPath = path.join(projectRoot, '.cleargate', '.install-manifest.json');
  try {
    const raw = await readFile(snapshotPath, 'utf-8');
    return JSON.parse(raw) as ManifestFile;
  } catch {
    return null;
  }
}

/**
 * BUG-023: Reverse the pin substitution that `copyPayload` applied to hook scripts.
 *
 * `copyPayload` replaces `__CLEARGATE_VERSION__` with `pinVersion` in HOOK_FILES_WITH_PIN.
 * To compare the installed file's content to the package SHA (which uses the placeholder),
 * we must reverse that substitution before hashing.
 *
 * Exported for unit tests.
 */
export function reverseSubstitutePinAware(
  content: Buffer | string,
  pinVersion: string
): string {
  const text = Buffer.isBuffer(content) ? content.toString('utf-8') : content;
  return text.replaceAll(pinVersion, '__CLEARGATE_VERSION__');
}

/**
 * Compute the SHA256 of a tracked file in the current working tree.
 * Returns null when the file does not exist on disk.
 *
 * BUG-023: When `opts.pinVersion` is provided and `file.overwrite_policy === 'pin-aware'`,
 * reverse-substitute `pinVersion` → `__CLEARGATE_VERSION__` before hashing.
 * This ensures that a freshly-installed hook file (which has the real version baked in)
 * hashes identically to the package's SHA (computed from the placeholder form).
 */
export async function computeCurrentSha(
  file: ManifestEntry,
  projectRoot: string,
  opts?: { pinVersion?: string }
): Promise<string | null> {
  const filePath = path.join(projectRoot, file.path);
  try {
    const raw = await readFile(filePath);
    if (file.overwrite_policy === 'pin-aware' && opts?.pinVersion) {
      const reversed = reverseSubstitutePinAware(raw, opts.pinVersion);
      return hashNormalized(reversed);
    }
    return hashNormalized(raw);
  } catch {
    return null;
  }
}

/**
 * Classify the drift state of a single tracked file.
 *
 * Decision table (PROP-006 §2.4):
 *
 * | Tier          | Result      |
 * |---------------|-------------|
 * | user-artifact | untracked   |
 *
 * | pkgSha | installSha | currentSha | Result            |
 * |--------|------------|------------|-------------------|
 * | any    | any        | null       | untracked         |
 * | A      | A          | A          | clean             |
 * | A      | A          | B (≠A)     | user-modified     |
 * | B (≠A) | A          | A          | upstream-changed  |
 * | all differ pairwise               | both-changed      |
 */
export function classify(
  pkgSha: string | null,
  installSha: string | null,
  currentSha: string | null,
  tier: Tier
): DriftState {
  // user-artifact short-circuit (EPIC-009 §6 Q8)
  if (tier === 'user-artifact') {
    return 'untracked';
  }

  // Missing current file
  if (currentSha === null) {
    return 'untracked';
  }

  const installEqualsPackage = installSha === pkgSha;
  const currentEqualsInstall = currentSha === installSha;

  if (installEqualsPackage && currentEqualsInstall) {
    // install == current == package
    return 'clean';
  }

  if (installEqualsPackage && !currentEqualsInstall) {
    // install == package, current != install => user modified
    return 'user-modified';
  }

  if (!installEqualsPackage && currentEqualsInstall) {
    // install == current, package != install => upstream changed
    return 'upstream-changed';
  }

  // All three differ pairwise
  return 'both-changed';
}

/**
 * Options for writeDriftState.
 */
export interface WriteDriftStateOpts {
  /**
   * ISO-8601 timestamp to record as `last_refreshed` in the output file.
   * When omitted, the current time is used (new Date().toISOString()).
   * This seam is mandatory for deterministic tests.
   */
  lastRefreshed?: string;
}

/**
 * Atomically write the drift-state map to `<projectRoot>/.cleargate/.drift-state.json`.
 *
 * The on-disk format is wrapped: `{ last_refreshed: string, drift: DriftMap }`.
 * This allows the daily-throttle logic in `cleargate doctor --check-scaffold`
 * to read the timestamp without re-computing all SHAs.
 *
 * Uses write-temp-then-rename (atomic on POSIX; best-effort on Windows).
 * Ensures parent directory exists before writing.
 *
 * STORY-009-04 extended the signature from `(projectRoot, DriftMap)` to
 * `(projectRoot, DriftMap, opts?)` — callers passing only two args continue to work.
 */
export async function writeDriftState(
  projectRoot: string,
  state: DriftMap,
  opts?: WriteDriftStateOpts
): Promise<void> {
  const cleargatDir = path.join(projectRoot, '.cleargate');
  const finalPath = path.join(cleargatDir, '.drift-state.json');
  const tmpPath = `${finalPath}.tmp`;

  const lastRefreshed = opts?.lastRefreshed ?? new Date().toISOString();
  const fileContent: DriftStateFile = { last_refreshed: lastRefreshed, drift: state };

  await mkdir(cleargatDir, { recursive: true });
  await writeFile(tmpPath, JSON.stringify(fileContent, null, 2) + '\n', 'utf-8');
  await rename(tmpPath, finalPath);
}

/**
 * Read the drift-state file written by `writeDriftState`.
 * Returns null when the file does not exist or is malformed.
 */
export async function readDriftState(projectRoot: string): Promise<DriftStateFile | null> {
  const driftPath = path.join(projectRoot, '.cleargate', '.drift-state.json');
  try {
    const raw = await readFile(driftPath, 'utf-8');
    const parsed = JSON.parse(raw) as unknown;
    // Accept both the new wrapped format {last_refreshed, drift} and the old flat format
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      'last_refreshed' in parsed &&
      'drift' in parsed
    ) {
      return parsed as DriftStateFile;
    }
    return null;
  } catch {
    return null;
  }
}
