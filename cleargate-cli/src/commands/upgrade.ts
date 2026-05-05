/**
 * upgrade.ts — STORY-009-05
 *
 * `cleargate upgrade [--dry-run] [--yes] [--only <tier>]`
 *
 * Three-way merge driver: walks each tracked scaffold file, classifies its
 * drift state, routes by overwrite_policy, and applies the user-chosen merge
 * action. Snapshot is updated atomically after every successfully handled file
 * so the command is resumable (re-run continues from the last clean state).
 *
 * Special-case handling:
 *  - CLAUDE.md tier (cli-config): uses claude-md-surgery to merge only the
 *    CLEARGATE:START…CLEARGATE:END bounded block, leaving user prose intact.
 *  - settings.json tier (cli-config): uses settings-json-surgery to merge
 *    only ClearGate-owned hooks, leaving user hooks intact.
 *
 * CRITICAL: all file mutations are atomic (write .tmp → fs.rename).
 * INCREMENTAL: each file is independent. Failure on file N does not roll back
 * file N-1. Re-running re-classifies against the updated snapshot.
 *
 * No top-level await (FLASHCARD #tsup #cjs #esm).
 * Inject `promptMergeChoice` + `openInEditor` via `UpgradeCliOptions` for tests
 * (FLASHCARD #cli #determinism #test-seam).
 */

import * as fs from 'node:fs';
import * as fsp from 'node:fs/promises';
import * as path from 'node:path';
import {
  loadPackageManifest,
  loadInstallSnapshot,
  computeCurrentSha,
  classify,
  writeDriftState,
  type ManifestFile,
  type ManifestEntry,
  type DriftMap,
  type Tier,
} from '../lib/manifest.js';
import { sliceChangelog } from '../lib/changelog.js';
import { hashNormalized } from '../lib/sha256.js';
import { readBlock, writeBlock } from '../lib/claude-md-surgery.js';
import { removeClearGateHooks, type ClaudeSettings } from '../lib/settings-json-surgery.js';
import {
  promptMergeChoice as defaultPromptMergeChoice,
  type MergeChoice,
} from '../lib/merge-ui.js';
import {
  openInEditor as defaultOpenInEditor,
  containsConflictMarkers,
} from '../lib/editor.js';
import { extractSessionLoadDelta } from '../lib/session-load-delta.js';

// ─── Public types ─────────────────────────────────────────────────────────────

export interface UpgradeCliOptions {
  cwd?: string;
  now?: () => Date;
  stdout?: (s: string) => void;
  stderr?: (s: string) => void;
  exit?: (code: number) => never;
  /** Test seam: override the package root for loadPackageManifest. */
  packageRoot?: string;
  /** Test seam: inject a custom promptMergeChoice (avoids interactive stdin). */
  promptMergeChoice?: typeof defaultPromptMergeChoice;
  /** Test seam: inject a custom openInEditor (avoids forking real editors). */
  openInEditor?: typeof defaultOpenInEditor;
  /** Test seam: inject a custom stdin for promptMergeChoice. */
  stdin?: NodeJS.ReadableStream;
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

/**
 * Write file atomically: write to .tmp, then rename. Never leaves partial writes.
 *
 * BUG-018 (recurrence in upgrade): `fs.writeFile` defaults to mode 0o644.
 * Hook scripts (`.sh`) need the executable bit or Claude Code spawn fails with
 * "Permission denied". `cleargate init` already preserves +x via copy-payload.ts;
 * upgrade was rewriting the same files at 0o644 and silently breaking every
 * hook in the target repo. Restore +x for any `.sh` target.
 */
async function writeAtomic(filePath: string, content: string): Promise<void> {
  const tmpPath = filePath + '.tmp.' + Date.now();
  await fsp.writeFile(tmpPath, content, 'utf-8');
  await fsp.rename(tmpPath, filePath);
  if (filePath.endsWith('.sh')) {
    await fsp.chmod(filePath, 0o755);
  }
}

/**
 * Update a single file's sha256 in the install snapshot atomically.
 * Reads the snapshot file, patches the matching entry, and re-writes atomically.
 */
async function updateSnapshotEntry(
  projectRoot: string,
  filePath: string,
  newSha: string | null
): Promise<void> {
  const snapshotPath = path.join(projectRoot, '.cleargate', '.install-manifest.json');
  let snapshot: ManifestFile;

  try {
    const raw = await fsp.readFile(snapshotPath, 'utf-8');
    snapshot = JSON.parse(raw) as ManifestFile;
  } catch {
    // If no snapshot exists yet, cannot update — silently skip.
    return;
  }

  const updated: ManifestFile = {
    ...snapshot,
    files: snapshot.files.map((entry) =>
      entry.path === filePath ? { ...entry, sha256: newSha } : entry
    ),
  };

  await writeAtomic(snapshotPath, JSON.stringify(updated, null, 2) + '\n');
}

/**
 * Determine if this is a CLAUDE.md file (needs block surgery).
 */
function isClaudeMd(filePath: string): boolean {
  return path.basename(filePath) === 'CLAUDE.md';
}

/**
 * Determine if this is a settings.json file (needs hook surgery).
 */
function isSettingsJson(filePath: string): boolean {
  return path.basename(filePath) === 'settings.json' && filePath.includes('.claude');
}

/**
 * Merge-3way handler: always-policy — overwrite file with package content.
 * Used for `always` overwrite_policy files.
 */
async function applyAlwaysOverwrite(
  entry: ManifestEntry,
  projectRoot: string,
  packageRoot: string,
  stdout: (s: string) => void
): Promise<void> {
  const targetPath = path.join(projectRoot, entry.path);
  const sourcePath = path.join(packageRoot, entry.path);

  try {
    const pkgContent = await fsp.readFile(sourcePath, 'utf-8');
    await fsp.mkdir(path.dirname(targetPath), { recursive: true });
    await writeAtomic(targetPath, pkgContent);
    await updateSnapshotEntry(projectRoot, entry.path, entry.sha256);
    stdout(`[always] overwritten: ${entry.path}`);
  } catch (err) {
    stdout(`[always] error overwriting ${entry.path}: ${(err as Error).message}`);
  }
}

/**
 * Merge-3way handler for `merge-3way` overwrite_policy files.
 * Supports k/t/e choices with conflict-marker semantics for 'e'.
 * Returns the post-merge sha or null if skipped/failed.
 */
async function applyMerge3Way(
  entry: ManifestEntry,
  projectRoot: string,
  packageRoot: string,
  installSha: string | null,
  currentSha: string | null,
  flags: { yes?: boolean; dryRun?: boolean },
  opts: {
    stdout: (s: string) => void;
    stderr: (s: string) => void;
    promptMergeChoiceFn: typeof defaultPromptMergeChoice;
    openInEditorFn: typeof defaultOpenInEditor;
    stdin?: NodeJS.ReadableStream;
  }
): Promise<{ updated: boolean; newSha: string | null }> {
  const { stdout, stderr, promptMergeChoiceFn, openInEditorFn, stdin } = opts;

  const targetPath = path.join(projectRoot, entry.path);
  const sourcePath = path.join(packageRoot, entry.path);

  // Read current (ours) and package (theirs) content
  let ours = '';
  let theirs = '';

  try {
    ours = await fsp.readFile(targetPath, 'utf-8');
  } catch {
    // File missing on disk — treat as empty
    ours = '';
  }

  try {
    theirs = await fsp.readFile(sourcePath, 'utf-8');
  } catch {
    // Package file missing — skip
    stdout(`[merge] skip: package file not found for ${entry.path}`);
    return { updated: false, newSha: null };
  }

  // Compute drift state for display
  const state = classify(entry.sha256, installSha, currentSha, entry.tier);

  let choice: MergeChoice;

  if (flags.yes) {
    // --yes: auto-take-theirs
    choice = 't';
    stdout(`[yes] taking theirs: ${entry.path}  state=${state}`);
  } else {
    // Interactive prompt
    choice = await promptMergeChoiceFn({
      path: entry.path,
      state,
      ours,
      theirs,
      stdin,
      stdout,
    });
  }

  if (choice === 'k') {
    // Keep mine: file unchanged, snapshot records current_sha as installed_sha
    stdout(`[keep] ${entry.path}`);
    await updateSnapshotEntry(projectRoot, entry.path, currentSha);
    return { updated: true, newSha: currentSha };
  }

  if (choice === 't') {
    // Take theirs: apply CLAUDE.md or settings.json surgery if needed, else raw overwrite
    let mergedContent = theirs;

    if (isClaudeMd(entry.path)) {
      // Merge only the bounded block; preserve user prose
      try {
        const ourBlock = readBlock(ours);
        const theirBlock = readBlock(theirs);
        if (ourBlock !== null && theirBlock !== null) {
          mergedContent = writeBlock(ours, theirBlock);
        } else if (theirBlock !== null) {
          // No block in ours — full overwrite
          mergedContent = theirs;
        }
        // If no block in theirs, skip (no ClearGate content to take)
      } catch {
        // Surgery failed — fall back to full overwrite
        mergedContent = theirs;
      }
    } else if (isSettingsJson(entry.path)) {
      // Merge only ClearGate-owned hooks; preserve user hooks
      try {
        const ourSettings = JSON.parse(ours) as ClaudeSettings;
        const theirSettings = JSON.parse(theirs) as ClaudeSettings;
        // Remove ClearGate hooks from ours, then add ClearGate hooks from theirs
        const withoutOurCg = removeClearGateHooks(ourSettings);
        // Build merged: user hooks from ours + ClearGate hooks from theirs
        const cgHooks = theirSettings.hooks ?? {};
        const merged: ClaudeSettings = { ...withoutOurCg };
        if (Object.keys(cgHooks).length > 0) {
          merged.hooks = { ...(withoutOurCg.hooks ?? {}), ...cgHooks };
        }
        mergedContent = JSON.stringify(merged, null, 2) + '\n';
      } catch {
        // Surgery failed — full overwrite
        mergedContent = theirs;
      }
    }

    await fsp.mkdir(path.dirname(targetPath), { recursive: true });
    await writeAtomic(targetPath, mergedContent);
    const newSha = hashNormalized(mergedContent);
    await updateSnapshotEntry(projectRoot, entry.path, newSha);
    stdout(`[take] ${entry.path}`);
    return { updated: true, newSha };
  }

  // choice === 'e': write conflict-marker file + open editor
  const mergeFilePath = targetPath + '.cleargate-merge';
  const conflictContent =
    `<<<<<<< ours (installed)\n${ours}=======\n${theirs}>>>>>>> theirs (upstream)\n`;

  await fsp.mkdir(path.dirname(mergeFilePath), { recursive: true });
  await writeAtomic(mergeFilePath, conflictContent);

  try {
    const result = await openInEditorFn(mergeFilePath);
    if (result.exitCode !== 0) {
      stderr(`[edit] editor exited with code ${result.exitCode}; markers may remain in ${mergeFilePath}`);
    }
  } catch (err) {
    stderr(`[edit] could not open editor: ${(err as Error).message}`);
    stderr(`[edit] resolve markers manually in: ${mergeFilePath}`);
    return { updated: false, newSha: null };
  }

  // Read post-edit content
  let edited = '';
  try {
    edited = await fsp.readFile(mergeFilePath, 'utf-8');
  } catch {
    stderr(`[edit] could not read ${mergeFilePath} after editor exit`);
    return { updated: false, newSha: null };
  }

  if (containsConflictMarkers(edited)) {
    stderr(`[edit] unresolved conflict markers remain in ${mergeFilePath}`);
    stderr(`[edit] file NOT updated. Resolve manually and re-run upgrade.`);
    // Leave .cleargate-merge in place for manual resolution
    return { updated: false, newSha: null };
  }

  // Markers resolved — overwrite target file, remove merge file
  await writeAtomic(targetPath, edited);
  try {
    await fsp.unlink(mergeFilePath);
  } catch {
    // Non-fatal if cleanup fails
  }

  const newSha = hashNormalized(edited);
  await updateSnapshotEntry(projectRoot, entry.path, newSha);
  stdout(`[edit] resolved: ${entry.path}`);
  return { updated: true, newSha };
}

// ─── Main handler ─────────────────────────────────────────────────────────────

export async function upgradeHandler(
  flags: { dryRun?: boolean; yes?: boolean; only?: string },
  cli?: UpgradeCliOptions
): Promise<void> {
  const cwd = cli?.cwd ?? process.cwd();
  const now = cli?.now ? cli.now() : new Date();
  const stdout = cli?.stdout ?? ((s: string) => process.stdout.write(s + '\n'));
  const stderr = cli?.stderr ?? ((s: string) => process.stderr.write(s + '\n'));
  const exit = cli?.exit ?? ((code: number) => process.exit(code) as never);
  const promptMergeChoiceFn = cli?.promptMergeChoice ?? defaultPromptMergeChoice;
  const openInEditorFn = cli?.openInEditor ?? defaultOpenInEditor;
  const stdin = cli?.stdin;

  // ─── 1. Load manifests + compute drift ──────────────────────────────────────

  let pkgManifest: ManifestFile;
  try {
    pkgManifest = loadPackageManifest({ packageRoot: cli?.packageRoot });
  } catch (err) {
    stderr(`[upgrade] ${(err as Error).message}`);
    exit(1);
    return;
  }

  const installSnapshot = await loadInstallSnapshot(cwd);

  // Build a lookup from the snapshot
  const snapshotByPath = new Map<string, string | null>();
  for (const entry of installSnapshot?.files ?? []) {
    snapshotByPath.set(entry.path, entry.sha256);
  }

  // ─── 1b. Print CHANGELOG delta ───────────────────────────────────────────────

  {
    const installedVersion = installSnapshot?.cleargate_version ?? pkgManifest.cleargate_version;
    const targetVersion = pkgManifest.cleargate_version;

    // Only print delta when there's actually a version change
    if (installedVersion !== targetVersion) {
      // Resolve CHANGELOG.md path from package root (same resolution as loadPackageManifest)
      const pkgRoot = cli?.packageRoot ?? path.join(path.dirname(new URL(import.meta.url).pathname), '..', '..');
      const changelogPath = path.join(pkgRoot, 'CHANGELOG.md');

      try {
        const changelogContent = fs.readFileSync(changelogPath, 'utf-8');
        const sections = sliceChangelog(changelogContent, installedVersion, targetVersion);

        if (sections.length > 0) {
          // Emit all matching sections verbatim, separated by blank lines between sections
          // (each section body already includes the heading + content)
          const deltaText = sections.map((s) => s.body).join('\n\n');
          stdout(deltaText);
          stdout('\n---');
        }
      } catch {
        // ENOENT or any read error — warn on stderr and continue; never block upgrade
        stderr('cleargate: CHANGELOG.md not readable; skipping release notes');
      }
    }
  }

  // ─── 2. Apply --only <tier> filter ──────────────────────────────────────────

  const onlyTier: Tier | undefined = flags.only as Tier | undefined;
  const filteredFiles = onlyTier
    ? pkgManifest.files.filter((e) => e.tier === onlyTier)
    : pkgManifest.files;

  // ─── 3. Classify all files ──────────────────────────────────────────────────

  interface FileWork {
    entry: ManifestEntry;
    currentSha: string | null;
    installSha: string | null;
    action: 'overwrite' | 'skip' | 'merge-3way';
  }

  const workItems: FileWork[] = [];

  await Promise.all(
    filteredFiles.map(async (entry) => {
      if (entry.tier === 'user-artifact') {
        // Always skip user-artifact tier (never tracked)
        return;
      }

      // BUG-023: pass pinVersion so pin-aware hook files are reverse-substituted before hashing.
      const currentSha = await computeCurrentSha(entry, cwd, { pinVersion: installSnapshot?.pin_version });
      const installSha = snapshotByPath.get(entry.path) ?? null;

      let action: FileWork['action'];
      switch (entry.overwrite_policy) {
        case 'always':
          action = 'overwrite';
          break;
        case 'skip':
        case 'preserve':
          action = 'skip';
          break;
        case 'merge-3way':
        default:
          action = 'merge-3way';
          break;
      }

      workItems.push({ entry, currentSha, installSha, action });
    })
  );

  // Sort for deterministic output
  workItems.sort((a, b) => a.entry.path.localeCompare(b.entry.path));

  // ─── 4. --dry-run: print plan and exit ──────────────────────────────────────

  if (flags.dryRun) {
    let count = 0;
    for (const item of workItems) {
      const state = classify(item.entry.sha256, item.installSha, item.currentSha, item.entry.tier);

      // BUG-028 Direction Y: compute projected post-state so users can see what
      // the live run would leave behind.  After a successful "take-theirs" the
      // file on disk equals the upstream payload, so its sha == entry.sha256.
      // Classifying with postSha = entry.sha256 (install = entry.sha256 as well)
      // always yields `clean` — which is exactly what the drift map would record.
      // We emit both states as `state=<pre> → <post>` so the human can see at a
      // glance which files will be mutated (pre != post).
      const projectedPostSha = item.entry.sha256;
      const projectedPostState = classify(
        item.entry.sha256,
        item.entry.sha256,
        projectedPostSha,
        item.entry.tier
      );
      const stateLabel =
        state !== projectedPostState
          ? `state=${state} → ${projectedPostState}`
          : `state=${state}`;

      stdout(`[dry-run] ${item.entry.path}  action=${item.action}  ${stateLabel}`);
      count++;
    }
    stdout(`[dry-run] ${count} files planned. No changes made.`);
    return;
  }

  // ─── 5. Execute per file ─────────────────────────────────────────────────────

  // Determine package root for reading source files.
  // cli.packageRoot is the test seam (always injected in tests).
  // In production, use the same default resolution as loadPackageManifest.
  // Since we already loaded the manifest above (which resolves the path internally),
  // we simply use cli.packageRoot when provided, otherwise fall back to cwd
  // (in production the actual resolution is inside loadPackageManifest).
  const packageRoot = cli?.packageRoot ?? cwd;

  const driftMap: DriftMap = {};

  // Files whose contents are loaded once per Claude Code session — if upgrade
  // mutates either, the running session will not pick up the change without a
  // restart. Track modifications and surface a warning at the end.
  const SESSION_LOAD_PATHS = new Set(['.claude/settings.json', '.mcp.json']);
  const sessionRestartFiles: string[] = [];

  for (const item of workItems) {
    const { entry, currentSha, installSha, action } = item;

    // CR-059: For session-load-relevant files, capture pre-mutation content so
    // we can compare schema-meaningful portions rather than raw bytes.
    let preMutationContent: string | null = null;
    if (SESSION_LOAD_PATHS.has(entry.path)) {
      const targetPath = path.join(cwd, entry.path);
      try {
        preMutationContent = await fsp.readFile(targetPath, 'utf-8');
      } catch {
        // File absent — treat as empty string (conservative: any write may need restart)
        preMutationContent = '';
      }
    }

    switch (action) {
      case 'skip': {
        // never / preserve — no prompt, no write
        stdout(`[skip] ${entry.path}  policy=${entry.overwrite_policy}`);
        break;
      }

      case 'overwrite': {
        // always — overwrite silently
        await applyAlwaysOverwrite(entry, cwd, packageRoot, stdout);
        break;
      }

      case 'merge-3way': {
        // Interactive 3-way merge (unless --yes)
        await applyMerge3Way(
          entry,
          cwd,
          packageRoot,
          installSha,
          currentSha,
          { yes: flags.yes, dryRun: false },
          { stdout, stderr, promptMergeChoiceFn, openInEditorFn, stdin }
        );
        break;
      }
    }

    // Re-compute current sha after potential mutation (for drift map).
    // BUG-023: pass pinVersion for pin-aware files.
    const postSha = await computeCurrentSha(entry, cwd, { pinVersion: installSnapshot?.pin_version });
    driftMap[entry.path] = {
      state: classify(entry.sha256, installSha, postSha, entry.tier),
      entry,
      install_sha: installSha,
      current_sha: postSha,
      package_sha: entry.sha256,
    };

    // CR-059: Replace byte-level postSha !== currentSha check with schema-aware
    // extractSessionLoadDelta. Only warn when hooks block (.claude/settings.json)
    // or mcpServers.cleargate (.mcp.json) actually changed. Cosmetic-only rewrites
    // (key order, whitespace) are suppressed. Conservative: if content unreadable
    // or parse fails, extractSessionLoadDelta returns true (warn).
    if (SESSION_LOAD_PATHS.has(entry.path) && preMutationContent !== null) {
      const targetPath = path.join(cwd, entry.path);
      let postMutationContent: string;
      try {
        postMutationContent = await fsp.readFile(targetPath, 'utf-8');
      } catch {
        // Cannot read post-mutation file — conservative: warn
        postMutationContent = '';
      }
      if (extractSessionLoadDelta(entry.path, preMutationContent, postMutationContent)) {
        sessionRestartFiles.push(entry.path);
      }
    }
  }

  // ─── 6. Refresh .drift-state.json ────────────────────────────────────────────

  await writeDriftState(cwd, driftMap, { lastRefreshed: now.toISOString() });

  stdout('[upgrade] complete.');

  if (sessionRestartFiles.length > 0) {
    stdout('');
    stdout(`⚠ Restart Claude Code in this repo to load the new ${sessionRestartFiles.length === 1 ? 'config' : 'configs'}:`);
    for (const f of sessionRestartFiles) {
      stdout(`    ${f} (loaded once at session start)`);
    }
  }
}
