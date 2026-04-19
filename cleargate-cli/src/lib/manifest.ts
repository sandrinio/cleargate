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
  overwrite_policy: 'always' | 'merge-3way' | 'skip' | 'preserve';
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
}

export interface DriftMap {
  [filePath: string]: {
    state: DriftState;
    entry: ManifestEntry;
    install_sha: string | null;
    current_sha: string | null;
    package_sha: string | null;
  };
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
 * Compute the SHA256 of a tracked file in the current working tree.
 * Returns null when the file does not exist on disk.
 */
export async function computeCurrentSha(
  file: ManifestEntry,
  projectRoot: string
): Promise<string | null> {
  const filePath = path.join(projectRoot, file.path);
  try {
    const raw = await readFile(filePath);
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
 * Atomically write the drift-state map to `<projectRoot>/.cleargate/.drift-state.json`.
 *
 * Uses write-temp-then-rename (atomic on POSIX; best-effort on Windows).
 * Ensures parent directory exists before writing.
 */
export async function writeDriftState(projectRoot: string, state: DriftMap): Promise<void> {
  const cleargatDir = path.join(projectRoot, '.cleargate');
  const finalPath = path.join(cleargatDir, '.drift-state.json');
  const tmpPath = `${finalPath}.tmp`;

  await mkdir(cleargatDir, { recursive: true });
  await writeFile(tmpPath, JSON.stringify(state, null, 2) + '\n', 'utf-8');
  await rename(tmpPath, finalPath);
}
