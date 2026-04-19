#!/usr/bin/env tsx
/**
 * generate-changelog-diff.ts — STORY-009-02
 *
 * Diffs two MANIFEST.json files and emits a markdown "Scaffold files changed"
 * block to stdout. Suitable for piping into CHANGELOG tooling.
 *
 * Usage:
 *   tsx scripts/generate-changelog-diff.ts --prev <path|npm-version> --current <path>
 *
 * Options:
 *   --prev <path>     Path to a previous manifest JSON file.
 *                     If omitted and --prev-version is set, fetches via npm show.
 *   --prev-version    NPM version tag (e.g. "0.0.9") — fetches tarball manifest.
 *   --current <path>  Path to current manifest JSON (default: cleargate-planning/MANIFEST.json).
 *
 * Exports:
 *   diffManifests(prev, current) — pure function for testing
 *   DiffResult interface
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { execSync } from 'node:child_process';
import type { ManifestFile, ManifestEntry } from '../src/lib/manifest.js';

// ─── Public types ─────────────────────────────────────────────────────────────

export interface DiffResult {
  added: string[];
  removed: string[];
  changed: string[];
  /** Each element is `"A → B"` */
  moved: string[];
}

// ─── Core diff logic ──────────────────────────────────────────────────────────

/**
 * Diff two ManifestFile objects.
 *
 * Semantics:
 *   - Added:   path in current, not in prev.
 *   - Removed: path in prev, not in current.
 *   - Changed: same path, different non-null sha256.
 *   - Moved:   different path, same non-null sha256 (collapses Added+Removed pair).
 */
export function diffManifests(prev: ManifestFile, current: ManifestFile): DiffResult {
  const prevByPath = new Map<string, ManifestEntry>(prev.files.map((e) => [e.path, e]));
  const currByPath = new Map<string, ManifestEntry>(current.files.map((e) => [e.path, e]));

  // Build sha→path maps for move detection (exclude null shas)
  const prevBySha = new Map<string, string>();
  for (const e of prev.files) {
    if (e.sha256 !== null) prevBySha.set(e.sha256, e.path);
  }
  const currBySha = new Map<string, string>();
  for (const e of current.files) {
    if (e.sha256 !== null) currBySha.set(e.sha256, e.path);
  }

  const added: string[] = [];
  const removed: string[] = [];
  const changed: string[] = [];
  const moved: string[] = [];

  // Track paths involved in a move to avoid double-counting
  const movedPrevPaths = new Set<string>();
  const movedCurrPaths = new Set<string>();

  // Detect moves first: prev path not in current, but its sha appears in current under a different path
  for (const [prevPath, prevEntry] of prevByPath) {
    if (!currByPath.has(prevPath) && prevEntry.sha256 !== null) {
      const currPath = currBySha.get(prevEntry.sha256);
      if (currPath && currPath !== prevPath && !prevByPath.has(currPath)) {
        // This sha moved from prevPath to currPath
        moved.push(`${prevPath} → ${currPath}`);
        movedPrevPaths.add(prevPath);
        movedCurrPaths.add(currPath);
      }
    }
  }

  // Removed: in prev, not in current (and not moved)
  for (const prevPath of prevByPath.keys()) {
    if (!currByPath.has(prevPath) && !movedPrevPaths.has(prevPath)) {
      removed.push(prevPath);
    }
  }

  // Added: in current, not in prev (and not move destination)
  for (const currPath of currByPath.keys()) {
    if (!prevByPath.has(currPath) && !movedCurrPaths.has(currPath)) {
      added.push(currPath);
    }
  }

  // Changed: same path in both, different non-null sha256
  for (const [currPath, currEntry] of currByPath) {
    const prevEntry = prevByPath.get(currPath);
    if (
      prevEntry &&
      currEntry.sha256 !== null &&
      prevEntry.sha256 !== null &&
      currEntry.sha256 !== prevEntry.sha256
    ) {
      changed.push(currPath);
    }
  }

  // Sort for stable output
  added.sort();
  removed.sort();
  changed.sort();
  moved.sort();

  return { added, removed, changed, moved };
}

// ─── Markdown formatter ───────────────────────────────────────────────────────

export function formatDiff(diff: DiffResult): string {
  const hasChanges =
    diff.added.length > 0 ||
    diff.removed.length > 0 ||
    diff.changed.length > 0 ||
    diff.moved.length > 0;

  if (!hasChanges) return '';

  const lines: string[] = ['## Scaffold files changed', ''];

  if (diff.moved.length > 0) {
    for (const m of diff.moved) {
      lines.push(`- Moved: ${m}`);
    }
  }
  if (diff.added.length > 0) {
    for (const f of diff.added) {
      lines.push(`- Added: ${f}`);
    }
  }
  if (diff.removed.length > 0) {
    for (const f of diff.removed) {
      lines.push(`- Removed: ${f}`);
    }
  }
  if (diff.changed.length > 0) {
    for (const f of diff.changed) {
      lines.push(`- Changed: ${f}`);
    }
  }

  return lines.join('\n') + '\n';
}

// ─── Manifest loader helpers ──────────────────────────────────────────────────

function loadManifestFromFile(filePath: string): ManifestFile {
  const raw = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(raw) as ManifestFile;
}

/**
 * Fetch manifest from a published npm version by downloading its tarball.
 * NOTE: Do not call this in tests — pass --prev <fixture.json> instead.
 */
function fetchManifestFromNpm(packageName: string, version: string): ManifestFile {
  const stdout = execSync(`npm show ${packageName}@${version} --json`, {
    encoding: 'utf-8',
  });
  const meta = JSON.parse(stdout) as { dist?: { tarball?: string } };
  const tarball = meta.dist?.tarball;
  if (!tarball) {
    throw new Error(`npm show did not return a tarball URL for ${packageName}@${version}`);
  }

  // Download and extract MANIFEST.json from tarball
  const tmpDir = fs.mkdtempSync(path.join(
    // Use os.tmpdir() if available, else /tmp
    process.env['TMPDIR'] ?? '/tmp',
    'cleargate-manifest-'
  ));
  try {
    execSync(`curl -sL "${tarball}" | tar -xz -C "${tmpDir}" "package/dist/MANIFEST.json"`, {
      stdio: 'pipe',
    });
    const manifestPath = path.join(tmpDir, 'package', 'dist', 'MANIFEST.json');
    return loadManifestFromFile(manifestPath);
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

// ─── CLI entry point ──────────────────────────────────────────────────────────

const isMain = process.argv[1]
  ? path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname)
  : false;

if (isMain) {
  const args = process.argv.slice(2);

  let prevPath: string | null = null;
  let prevVersion: string | null = null;
  let currentPath: string | null = null;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--prev' && args[i + 1]) {
      prevPath = args[++i];
    } else if (args[i] === '--prev-version' && args[i + 1]) {
      prevVersion = args[++i];
    } else if (args[i] === '--current' && args[i + 1]) {
      currentPath = args[++i];
    }
  }

  // Default current: cleargate-planning/MANIFEST.json relative to script location
  if (!currentPath) {
    const scriptDir = path.dirname(new URL(import.meta.url).pathname);
    const pkgRoot = path.resolve(scriptDir, '..');
    currentPath = path.resolve(pkgRoot, '..', 'cleargate-planning', 'MANIFEST.json');
  }

  let prevManifest: ManifestFile;
  if (prevPath) {
    prevManifest = loadManifestFromFile(prevPath);
  } else if (prevVersion) {
    prevManifest = fetchManifestFromNpm('cleargate', prevVersion);
  } else {
    console.error('[generate-changelog-diff] ERROR: --prev <path> or --prev-version <version> is required');
    process.exit(1);
  }

  const currentManifest = loadManifestFromFile(currentPath);
  const diff = diffManifests(prevManifest, currentManifest);
  const output = formatDiff(diff);
  process.stdout.write(output);
}
