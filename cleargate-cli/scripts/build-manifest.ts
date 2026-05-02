#!/usr/bin/env tsx
/**
 * build-manifest.ts — STORY-009-02
 *
 * Walks cleargate-planning/ and writes cleargate-planning/MANIFEST.json.
 * Run via: tsx scripts/build-manifest.ts
 * Invoked automatically by the `prebuild` npm script.
 *
 * Exports:
 *   TIER_RULES  — frozen classifier rules (DATA; changing is a breaking change)
 *   buildManifest(opts) — core logic with test seams
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { createHash } from 'node:crypto';
import type { ManifestEntry, ManifestFile, Tier } from '../src/lib/manifest.js';

// ─── Tier classification rules (DATA — frozen const for diffability) ──────────

export interface TierRule {
  /**
   * Glob-style pattern matched against the relative path inside cleargate-planning/.
   * Uses minimatch-free prefix/glob logic — see matchRule().
   */
  pattern: string;
  tier: Tier;
  overwrite_policy: ManifestEntry['overwrite_policy'];
  preserve_on_uninstall: boolean;
  /** When true, sha256 is set to null and content is never hashed. */
  nullSha: boolean;
  /** When true, this entry is EXCLUDED from the manifest entirely. */
  exclude: boolean;
}

export const TIER_RULES: readonly TierRule[] = Object.freeze([
  // Derived — exclude entirely
  {
    pattern: '.cleargate/sprint-runs/**',
    tier: 'derived',
    overwrite_policy: 'preserve',
    preserve_on_uninstall: true,
    nullSha: false,
    exclude: true,
  },
  {
    pattern: '.cleargate/wiki/**',
    tier: 'derived',
    overwrite_policy: 'preserve',
    preserve_on_uninstall: true,
    nullSha: false,
    exclude: true,
  },
  {
    pattern: '.cleargate/hook-log/**',
    tier: 'derived',
    overwrite_policy: 'preserve',
    preserve_on_uninstall: true,
    nullSha: false,
    exclude: true,
  },

  // User-artifact — include but null sha
  {
    pattern: '.cleargate/FLASHCARD.md',
    tier: 'user-artifact',
    overwrite_policy: 'skip',
    preserve_on_uninstall: true,
    nullSha: true,
    exclude: false,
  },

  // Protocol files
  {
    pattern: '.cleargate/knowledge/**',
    tier: 'protocol',
    overwrite_policy: 'merge-3way',
    preserve_on_uninstall: false,
    nullSha: false,
    exclude: false,
  },

  // Templates
  {
    pattern: '.cleargate/templates/**',
    tier: 'template',
    overwrite_policy: 'merge-3way',
    preserve_on_uninstall: false,
    nullSha: false,
    exclude: false,
  },

  // Agents
  {
    pattern: '.claude/agents/**',
    tier: 'agent',
    overwrite_policy: 'always',
    preserve_on_uninstall: false,
    nullSha: false,
    exclude: false,
  },

  // CR-009: Pin-aware hooks — `cleargate upgrade` re-stamps the version line;
  // treated as always-equivalent in v0.5.0 (upgrade driver lands in EPIC-009).
  {
    pattern: '.claude/hooks/stamp-and-gate.sh',
    tier: 'hook',
    overwrite_policy: 'pin-aware',
    preserve_on_uninstall: false,
    nullSha: false,
    exclude: false,
  },
  {
    pattern: '.claude/hooks/session-start.sh',
    tier: 'hook',
    overwrite_policy: 'pin-aware',
    preserve_on_uninstall: false,
    nullSha: false,
    exclude: false,
  },

  // Hooks (general)
  {
    pattern: '.claude/hooks/**',
    tier: 'hook',
    overwrite_policy: 'always',
    preserve_on_uninstall: false,
    nullSha: false,
    exclude: false,
  },

  // Skills
  {
    pattern: '.claude/skills/**',
    tier: 'skill',
    overwrite_policy: 'always',
    preserve_on_uninstall: false,
    nullSha: false,
    exclude: false,
  },

  // Scripts (CR-026: write_dispatch.sh + canonical mirrors for cleargate scripts)
  {
    pattern: '.cleargate/scripts/**',
    tier: 'script',
    overwrite_policy: 'always',
    preserve_on_uninstall: false,
    nullSha: false,
    exclude: false,
  },

  // CLI config
  {
    pattern: '.claude/settings.json',
    tier: 'cli-config',
    overwrite_policy: 'merge-3way',
    preserve_on_uninstall: false,
    nullSha: false,
    exclude: false,
  },
]);

// ─── Pattern matching ─────────────────────────────────────────────────────────

/**
 * Match a relative path against a TierRule pattern.
 *
 * Pattern syntax:
 *   - Exact match: `.cleargate/FLASHCARD.md`
 *   - Prefix match: `.cleargate/knowledge/**` — matches anything under that prefix
 *   - Single-level: `.cleargate/templates/*` — matches direct children only
 */
export function matchRule(relPath: string, pattern: string): boolean {
  if (pattern.endsWith('/**')) {
    const prefix = pattern.slice(0, -3);
    return relPath === prefix || relPath.startsWith(prefix + '/');
  }
  if (pattern.endsWith('/*')) {
    const prefix = pattern.slice(0, -2);
    const rest = relPath.slice(prefix.length + 1); // strip "prefix/"
    if (!relPath.startsWith(prefix + '/')) return false;
    return !rest.includes('/');
  }
  return relPath === pattern;
}

/**
 * Classify a relative path against TIER_RULES (first match wins).
 * Returns null if no rule matches (file is unclassified — skip).
 */
export function classifyPath(relPath: string): TierRule | null {
  for (const rule of TIER_RULES) {
    if (matchRule(relPath, rule.pattern)) {
      return rule;
    }
  }
  return null;
}

// ─── Hash helper (inline — avoids async for script context) ──────────────────

function hashNormalizedSync(buf: Buffer): string {
  let text = buf.toString('utf-8');
  if (text.startsWith('\ufeff')) text = text.slice(1);
  text = text.replace(/\r\n/g, '\n');
  if (!text.endsWith('\n')) text += '\n';
  return createHash('sha256').update(text, 'utf-8').digest('hex');
}

// ─── Core logic ───────────────────────────────────────────────────────────────

export interface BuildManifestOpts {
  /** Root of cleargate-planning/ tree. Default: resolved from __dirname. */
  planningRoot?: string;
  /** Root of cleargate-cli/ (where package.json lives). Default: resolved from __dirname. */
  pkgRoot?: string;
  /** Output path. Default: <planningRoot>/MANIFEST.json. */
  outputPath?: string;
  /** Seam: returns the current timestamp. Default: () => new Date(). */
  now?: () => Date;
  /** When true, write the output file. Default: true. */
  write?: boolean;
}

export interface BuildManifestResult {
  manifest: ManifestFile;
  outputPath: string;
  entryCount: number;
}

/**
 * Walk planningRoot, classify each file, hash non-null-sha entries, and
 * produce a ManifestFile sorted by path ascending.
 */
export function buildManifest(opts: BuildManifestOpts = {}): BuildManifestResult {
  const scriptDir = path.dirname(new URL(import.meta.url).pathname);
  // scripts/ → cleargate-cli/ → repo-root/ → cleargate-planning/
  const defaultPkgRoot = path.resolve(scriptDir, '..');
  const defaultPlanningRoot = path.resolve(defaultPkgRoot, '..', 'cleargate-planning');

  const pkgRoot = opts.pkgRoot ?? defaultPkgRoot;
  const planningRoot = opts.planningRoot ?? defaultPlanningRoot;
  const outputPath = opts.outputPath ?? path.join(planningRoot, 'MANIFEST.json');
  const nowFn = opts.now ?? (() => new Date());
  const doWrite = opts.write !== false;

  // Read cleargate_version from package.json
  const pkgJsonPath = path.join(pkgRoot, 'package.json');
  const pkgJson = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf-8')) as { version: string };
  const cleargate_version = pkgJson.version;

  // Walk planningRoot recursively
  const entries: ManifestEntry[] = [];
  walkDir(planningRoot, planningRoot, entries);

  // Sort by path ascending for stable ordering
  entries.sort((a, b) => a.path.localeCompare(b.path));

  const manifest: ManifestFile = {
    cleargate_version,
    generated_at: nowFn().toISOString(),
    files: entries,
  };

  if (doWrite) {
    const json = JSON.stringify(manifest, null, 2) + '\n';
    // Ensure output dir exists
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, json, 'utf-8');
  }

  return { manifest, outputPath, entryCount: entries.length };
}

function walkDir(baseDir: string, currentDir: string, entries: ManifestEntry[]): void {
  const items = fs.readdirSync(currentDir, { withFileTypes: true });
  for (const item of items) {
    const absPath = path.join(currentDir, item.name);
    if (item.isDirectory()) {
      walkDir(baseDir, absPath, entries);
    } else if (item.isFile()) {
      const relPath = path.relative(baseDir, absPath);
      // Normalize to forward slashes (cross-platform)
      const normalizedRelPath = relPath.split(path.sep).join('/');
      const rule = classifyPath(normalizedRelPath);
      if (rule === null || rule.exclude) {
        // Unclassified or explicitly excluded (derived tier)
        continue;
      }

      let sha256: string | null = null;
      if (!rule.nullSha) {
        const content = fs.readFileSync(absPath);
        sha256 = hashNormalizedSync(content);
      }

      entries.push({
        path: normalizedRelPath,
        sha256,
        tier: rule.tier,
        overwrite_policy: rule.overwrite_policy,
        preserve_on_uninstall: rule.preserve_on_uninstall,
      });
    }
  }
}

// ─── CLI entry point ──────────────────────────────────────────────────────────

// Only run when invoked directly (not imported)
const isMain = process.argv[1]
  ? path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname)
  : false;

if (isMain) {
  try {
    const result = buildManifest();
    console.log(
      `[build-manifest] ${result.entryCount} files → ${result.outputPath}`
    );
  } catch (err) {
    console.error('[build-manifest] ERROR:', err);
    process.exit(1);
  }
}
