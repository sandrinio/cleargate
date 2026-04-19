/**
 * uninstall.ts — STORY-009-07
 *
 * `cleargate uninstall [--dry-run] [--preserve <tiers>] [--remove <tiers>] [--yes] [--path <dir>] [--force]`
 *
 * Most-destructive command in the CLI. Preservation-first: user artifacts
 * (FLASHCARD, archive, pending-sync, sprint retrospectives) are kept by default.
 * Framework files (knowledge, templates, wiki, hook-log, agents, hooks, skills)
 * are removed. CLAUDE.md and settings.json are surgically stripped — the rest
 * of those files is left intact.
 *
 * Safety rails:
 *  - Typed confirmation: user must type the project name (or pass --yes).
 *  - Uncommitted-changes check: git status --porcelain on manifest-tracked files.
 *  - --dry-run: preview only, zero disk writes.
 *  - Single-target: does NOT recurse into nested .cleargate/ directories.
 *  - Idempotency: if .uninstalled marker exists and .install-manifest.json is absent → "already uninstalled".
 *
 * All test-facing behaviours are injectable via UninstallOptions seams.
 * No top-level await (FLASHCARD #tsup #cjs #esm).
 */

import * as fs from 'node:fs';
import * as fsp from 'node:fs/promises';
import * as path from 'node:path';
import { execSync } from 'node:child_process';
import {
  loadInstallSnapshot,
  type ManifestFile,
  type ManifestEntry,
  type Tier,
} from '../lib/manifest.js';
import {
  removeBlock,
  CLEARGATE_START,
  CLEARGATE_END,
} from '../lib/claude-md-surgery.js';
import { removeClearGateHooks, type ClaudeSettings } from '../lib/settings-json-surgery.js';

// ─── Public types ─────────────────────────────────────────────────────────────

/** Tiers that belong to "user-artifact" bucket (preserved by default). */
const USER_ARTIFACT_TIERS: Tier[] = ['user-artifact'];

/** Framework tiers that are removed by default. */
const FRAMEWORK_TIERS: Tier[] = ['protocol', 'template', 'agent', 'hook', 'skill', 'cli-config', 'derived'];

export interface UninstallOptions {
  cwd?: string;
  path?: string;              // resolved target dir (defaults to cwd)
  dryRun?: boolean;
  yes?: boolean;              // skip typed confirmation
  force?: boolean;            // override uncommitted-changes refusal
  preserve?: string[];        // tier ids to force-preserve (comma-split at CLI level)
  remove?: string[];          // tier ids to force-remove (comma-split at CLI level, 'all' = all tiers)
  stdout?: (s: string) => void;
  stderr?: (s: string) => void;
  exit?: (code: number) => never;
  /** Test seam: prompt for typed project-name confirmation. */
  promptName?: () => Promise<string>;
  /** Test seam: prompt yes/no for interactive category decisions. */
  promptYesNo?: (q: string) => Promise<boolean>;
  /** Test seam: injectable clock. */
  now?: () => Date;
  /** Test seam: git status --porcelain runner. Returns { stdout, code }. */
  git?: (args: string[]) => { stdout: string; code: number };
}

export interface UninstalledMarker {
  uninstalled_at: string;
  prior_version: string;
  preserved: string[];
  removed: string[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Parse a tier list string (comma-separated) into a Set.
 * 'all' expands to all known tiers.
 */
function parseTierList(raw: string[]): Set<Tier> {
  const result = new Set<Tier>();
  for (const item of raw) {
    for (const t of item.split(',')) {
      const tier = t.trim();
      if (tier === 'all') {
        for (const f of FRAMEWORK_TIERS) result.add(f);
        for (const u of USER_ARTIFACT_TIERS) result.add(u);
      } else {
        result.add(tier as Tier);
      }
    }
  }
  return result;
}

/**
 * Determine if an entry should be preserved (true) or removed (false).
 *
 * Rules (highest priority first):
 * 1. --remove tier override → remove
 * 2. --preserve tier override → preserve
 * 3. user-artifact tier → preserve (default)
 * 4. Framework tiers (protocol/template/agent/hook/skill/cli-config/derived) → remove (default)
 */
export function shouldPreserve(
  entry: ManifestEntry,
  preserveSet: Set<Tier>,
  removeSet: Set<Tier>
): boolean {
  if (removeSet.has(entry.tier)) return false;
  if (preserveSet.has(entry.tier)) return true;
  if (USER_ARTIFACT_TIERS.includes(entry.tier)) return true;
  return false;
}

/**
 * Read the project name from package.json (name field), or fall back to
 * the basename of the target directory.
 */
function resolveProjectName(target: string): string {
  const pkgPath = path.join(target, 'package.json');
  if (fs.existsSync(pkgPath)) {
    try {
      const raw = fs.readFileSync(pkgPath, 'utf-8');
      const parsed = JSON.parse(raw) as { name?: string };
      if (parsed.name && typeof parsed.name === 'string') {
        return parsed.name;
      }
    } catch {
      // Fall through to basename
    }
  }
  return path.basename(target);
}

/**
 * Run git status --porcelain in the target directory, filtered to manifest-tracked paths.
 * Returns the list of uncommitted files that overlap with the manifest.
 *
 * Non-git targets return an empty array (skip silently per orchestrator decision).
 */
function detectUncommittedChanges(
  target: string,
  manifestPaths: string[],
  gitRunner?: UninstallOptions['git']
): string[] {
  const run = gitRunner ?? ((args: string[]) => {
    try {
      const out = execSync(['git', ...args].join(' '), {
        cwd: target,
        stdio: ['pipe', 'pipe', 'pipe'],
        encoding: 'utf-8',
      });
      return { stdout: out, code: 0 };
    } catch (e: unknown) {
      const err = e as { stdout?: string; status?: number };
      return { stdout: err.stdout ?? '', code: err.status ?? 1 };
    }
  });

  // First check if this is a git repo at all
  const isGit = run(['-C', target, 'rev-parse', '--is-inside-work-tree']);
  if (isGit.code !== 0) {
    // Not a git repo — skip silently (orchestrator decision)
    return [];
  }

  const result = run(['-C', target, 'status', '--porcelain']);
  if (result.code !== 0) {
    return [];
  }

  // Parse porcelain output — each line: XY path
  const changedFiles = result.stdout
    .split('\n')
    .filter(Boolean)
    .map((line) => line.slice(3).trim());

  // Only flag files that are listed in the install manifest
  const manifestSet = new Set(manifestPaths);
  return changedFiles.filter((f) => manifestSet.has(f));
}

/**
 * Remove @cleargate/cli from package.json dependencies/devDependencies.
 * Writes back if modified. Returns true if modified.
 */
async function removeFromPackageJson(target: string, dryRun: boolean): Promise<boolean> {
  const pkgPath = path.join(target, 'package.json');
  if (!fs.existsSync(pkgPath)) return false;

  let raw: string;
  try {
    raw = await fsp.readFile(pkgPath, 'utf-8');
  } catch {
    return false;
  }

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return false;
  }

  let modified = false;

  for (const key of ['dependencies', 'devDependencies'] as const) {
    const deps = parsed[key];
    if (deps && typeof deps === 'object' && '@cleargate/cli' in (deps as Record<string, unknown>)) {
      const updated = { ...(deps as Record<string, unknown>) };
      delete updated['@cleargate/cli'];
      parsed[key] = updated;
      modified = true;
    }
  }

  if (modified && !dryRun) {
    await fsp.writeFile(pkgPath, JSON.stringify(parsed, null, 2) + '\n', 'utf-8');
  }

  return modified;
}

/** Atomically write a file (tmp → rename). */
async function writeAtomic(filePath: string, content: string): Promise<void> {
  const tmpPath = `${filePath}.tmp.${Date.now()}`;
  await fsp.writeFile(tmpPath, content, 'utf-8');
  await fsp.rename(tmpPath, filePath);
}

/** Remove a file, silently ignoring missing files. */
async function removeFile(filePath: string): Promise<void> {
  try {
    await fsp.unlink(filePath);
  } catch {
    // Ignore ENOENT and other errors
  }
}

/** Remove a directory tree, silently ignoring missing directories. */
async function removeDir(dirPath: string): Promise<void> {
  try {
    fs.rmSync(dirPath, { recursive: true, force: true });
  } catch {
    // Ignore
  }
}

// ─── Main handler ─────────────────────────────────────────────────────────────

export async function uninstallHandler(opts: UninstallOptions): Promise<void> {
  const cwd = opts.cwd ?? process.cwd();
  const stdout = opts.stdout ?? ((s: string) => process.stdout.write(s + '\n'));
  const stderr = opts.stderr ?? ((s: string) => process.stderr.write(s + '\n'));
  const exit = opts.exit ?? ((code: number) => process.exit(code) as never);
  const now = opts.now ?? (() => new Date());
  const dryRun = opts.dryRun ?? false;
  const yes = opts.yes ?? false;
  const force = opts.force ?? false;

  // Parse tier overrides
  const preserveSet = parseTierList(opts.preserve ?? []);
  const removeSet = parseTierList(opts.remove ?? []);
  const removeAll = (opts.remove ?? []).some((r) => r === 'all');
  if (removeAll) {
    for (const t of FRAMEWORK_TIERS) removeSet.add(t);
    for (const u of USER_ARTIFACT_TIERS) removeSet.add(u);
  }

  // ─── 1. Resolve target ────────────────────────────────────────────────────────

  const target = opts.path ? path.resolve(opts.path) : cwd;
  const cleargateDir = path.join(target, '.cleargate');
  const manifestPath = path.join(cleargateDir, '.install-manifest.json');
  const uninstalledPath = path.join(cleargateDir, '.uninstalled');

  // ─── 2. Missing manifest → no install detected ────────────────────────────────

  if (!fs.existsSync(manifestPath)) {
    // Check idempotency: if .uninstalled exists without manifest → already done
    if (fs.existsSync(uninstalledPath)) {
      stdout('already uninstalled');
      exit(0);
      return;
    }
    stdout(`no ClearGate install detected at ${target}`);
    exit(0);
    return;
  }

  // ─── 3. Idempotency short-circuit ────────────────────────────────────────────

  if (fs.existsSync(uninstalledPath) && !fs.existsSync(manifestPath)) {
    stdout('already uninstalled');
    exit(0);
    return;
  }

  // ─── 4. Load install manifest ────────────────────────────────────────────────

  const snapshot: ManifestFile | null = await loadInstallSnapshot(target);
  if (!snapshot) {
    stdout(`no ClearGate install detected at ${target}`);
    exit(0);
    return;
  }

  // ─── 5. Uncommitted-changes check ────────────────────────────────────────────

  if (!force) {
    const manifestPaths = snapshot.files.map((e) => e.path);
    const uncommitted = detectUncommittedChanges(target, manifestPaths, opts.git);
    if (uncommitted.length > 0) {
      stderr(
        `Uncommitted changes to tracked files: ${uncommitted.slice(0, 5).join(', ')}${uncommitted.length > 5 ? ` and ${uncommitted.length - 5} more` : ''}. Commit, stash, or pass --force.`
      );
      exit(1);
      return;
    }
  }

  // ─── 6. CLAUDE.md marker check ───────────────────────────────────────────────

  const claudeMdPath = path.join(target, 'CLAUDE.md');
  let claudeMdContent: string | null = null;

  if (fs.existsSync(claudeMdPath)) {
    claudeMdContent = fs.readFileSync(claudeMdPath, 'utf-8');
    if (!claudeMdContent.includes(CLEARGATE_START)) {
      stderr('CLAUDE.md is missing <!-- CLEARGATE:START --> marker');
      exit(1);
      return;
    }
    if (!claudeMdContent.includes(CLEARGATE_END)) {
      stderr('CLAUDE.md is missing <!-- CLEARGATE:END --> marker');
      exit(1);
      return;
    }
  }

  // ─── 7. Classify entries ──────────────────────────────────────────────────────

  const toRemove: ManifestEntry[] = [];
  const toPreserve: ManifestEntry[] = [];
  const toSkip: ManifestEntry[] = []; // missing from disk

  for (const entry of snapshot.files) {
    const filePath = path.join(target, entry.path);
    if (!fs.existsSync(filePath)) {
      toSkip.push(entry);
      continue;
    }
    if (shouldPreserve(entry, preserveSet, removeSet)) {
      toPreserve.push(entry);
    } else {
      toRemove.push(entry);
    }
  }

  // ─── 8. Preview summary ───────────────────────────────────────────────────────

  stdout(`Will remove ${toRemove.length} files, keep ${toPreserve.length} files, update CLAUDE.md to strip CLEARGATE block, remove @cleargate/cli from package.json.`);

  if (dryRun) {
    stdout('');
    stdout('[dry-run] Planned removals:');
    for (const e of toRemove) {
      stdout(`  [remove] ${e.path}`);
    }
    stdout('');
    stdout('[dry-run] Planned preservations:');
    for (const e of toPreserve) {
      stdout(`  [keep]   ${e.path}`);
    }
    if (toSkip.length > 0) {
      stdout('');
      stdout('[dry-run] Untracked (already missing on disk):');
      for (const e of toSkip) {
        stdout(`  [skip]   ${e.path}`);
      }
    }
    stdout('');
    stdout('[dry-run] No files changed.');
    exit(0);
    return;
  }

  // ─── 9. Typed confirmation (skipped with --yes) ───────────────────────────────

  if (!yes) {
    const projectName = resolveProjectName(target);

    const promptNameFn = opts.promptName ?? (() => {
      // Real interactive prompt — readline
      return new Promise<string>((resolve) => {
        process.stdout.write(`Type the project name "${projectName}" to confirm uninstall: `);
        let buf = '';
        process.stdin.setEncoding('utf-8');
        process.stdin.once('data', (chunk: Buffer | string) => {
          buf = chunk.toString().trim();
          resolve(buf);
        });
      });
    });

    const typed = await promptNameFn();
    if (typed !== projectName) {
      stdout('name mismatch — aborting');
      exit(1);
      return;
    }
  }

  // ─── 10. Execute removal ──────────────────────────────────────────────────────

  const removedPaths: string[] = [];
  const preservedPaths: string[] = [];

  // Remove classified entries
  for (const entry of toRemove) {
    const filePath = path.join(target, entry.path);
    await removeFile(filePath);
    removedPaths.push(entry.path);
  }

  // Collect preserved paths
  for (const entry of toPreserve) {
    preservedPaths.push(entry.path);
  }

  // Surgery: CLAUDE.md — strip only the CLEARGATE block
  if (claudeMdContent !== null) {
    try {
      const stripped = removeBlock(claudeMdContent);
      await writeAtomic(claudeMdPath, stripped);
      removedPaths.push('CLAUDE.md (CLEARGATE block)');
    } catch (err) {
      stderr(`Warning: could not strip CLAUDE.md block: ${(err as Error).message}`);
    }
  }

  // Surgery: settings.json — remove ClearGate hooks only
  const settingsPath = path.join(target, '.claude', 'settings.json');
  if (fs.existsSync(settingsPath)) {
    try {
      const raw = fs.readFileSync(settingsPath, 'utf-8');
      const settings = JSON.parse(raw) as ClaudeSettings;
      const cleaned = removeClearGateHooks(settings);
      await writeAtomic(settingsPath, JSON.stringify(cleaned, null, 2) + '\n');
      removedPaths.push('.claude/settings.json (ClearGate hooks)');
    } catch (err) {
      stderr(`Warning: could not update settings.json: ${(err as Error).message}`);
    }
  }

  // Remove @cleargate/cli from package.json
  const pkgModified = await removeFromPackageJson(target, false);
  if (pkgModified) {
    removedPaths.push('package.json (@cleargate/cli dep)');
    stdout('Removed @cleargate/cli from package.json. Run `npm install` to update package-lock.json.');
  }

  // Remove the install manifest itself (and drift-state)
  await removeFile(manifestPath);
  await removeFile(path.join(cleargateDir, '.drift-state.json'));

  // ─── 11. Write .uninstalled marker ───────────────────────────────────────────

  const marker: UninstalledMarker = {
    uninstalled_at: now().toISOString(),
    prior_version: snapshot.cleargate_version,
    preserved: preservedPaths,
    removed: removedPaths,
  };

  // Ensure .cleargate/ dir still exists (may have had files removed from it)
  await fsp.mkdir(cleargateDir, { recursive: true });
  await writeAtomic(uninstalledPath, JSON.stringify(marker, null, 2) + '\n');

  // ─── 12. Empty .cleargate/ cleanup ───────────────────────────────────────────

  // Per story Gherkin scenario 11: when --remove all removes all user-artifact
  // items too (nothing preserved inside .cleargate/), the directory itself is
  // removed (including the .uninstalled marker we just wrote).
  // In the default case (preservations exist), we leave .cleargate/ with the
  // preserved files + .uninstalled marker.
  if (removeAll) {
    const hasPreservedInsideCleargate = preservedPaths.some((p) =>
      p.startsWith('.cleargate/')
    );
    if (!hasPreservedInsideCleargate) {
      // Remove the entire .cleargate/ directory (including the marker we wrote)
      await removeDir(cleargateDir);
    }
  }

  // ─── 13. Restore hint ────────────────────────────────────────────────────────

  if (preservedPaths.length > 0) {
    stdout(`Preserved ${preservedPaths.length} items. Run cleargate init in this directory to restore.`);
  }
}
