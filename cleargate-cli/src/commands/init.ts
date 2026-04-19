/**
 * init.ts — `cleargate init` command handler
 *
 * Steps:
 *   1. Validate cwd exists and is writable
 *   2. Resolve payloadDir (bundled cleargate-planning/ templates)
 *   3. copyPayload: copy scaffold files to target cwd
 *   4. mergeSettings: merge PostToolUse hook into .claude/settings.json
 *   5. injectClaudeMd: bounded-block inject into CLAUDE.md
 *   6. Bootstrap pass: if delivery/ has items, run wiki build
 *   7. Print Done
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { copyPayload } from '../init/copy-payload.js';
import { mergeSettings, type SettingsJson } from '../init/merge-settings.js';
import { injectClaudeMd, extractBlock } from '../init/inject-claude-md.js';
import { wikiBuildHandler, type WikiBuildOptions } from './wiki-build.js';
import { loadPackageManifest, type ManifestFile } from '../lib/manifest.js';
import { promptYesNo as defaultPromptYesNo } from '../lib/prompts.js';

/** The PostToolUse hook config to merge — verbatim from M1 plan (STORY-002-05). */
const HOOK_ADDITION: SettingsJson = {
  hooks: {
    PostToolUse: [
      {
        matcher: 'Edit|Write',
        hooks: [
          {
            type: 'command',
            command:
              'FILE=$(jq -r \'.tool_input.file_path\'); case "$FILE" in *.cleargate/delivery/*) npx cleargate wiki ingest "$FILE" ;; esac',
          },
        ],
      },
    ],
  },
};

export interface InitOptions {
  /** Target working directory (the repo being initialised). Default: process.cwd() */
  cwd?: string;
  /** Overwrite files that differ from payload. Default: false */
  force?: boolean;
  /** Test seam: path to bundled cleargate-planning/ payload directory */
  payloadDir?: string;
  /** Test seam: frozen ISO timestamp */
  now?: () => string;
  /** Test seam: replaces process.stdout.write */
  stdout?: (s: string) => void;
  /** Test seam: replaces process.stderr.write */
  stderr?: (s: string) => void;
  /** Test seam: replaces process.exit */
  exit?: (code: number) => never;
  /** Test seam: runs wiki build (default: wikiBuildHandler) */
  runWikiBuild?: (opts: WikiBuildOptions) => Promise<void>;
  /**
   * Test seam: replaces the real Y/n prompt for restore flow.
   * STORY-009-03: injectable so integration tests don't block on stdin.
   */
  promptYesNo?: (question: string, defaultYes: boolean) => Promise<boolean>;
  /**
   * Test seam: replaces loadPackageManifest() call for snapshot step.
   * STORY-009-03: allows tests to supply a known ManifestFile without a real MANIFEST.json.
   */
  readInstallManifest?: () => ManifestFile;
}

/** Shape of the .cleargate/.uninstalled marker written by STORY-009-07 `uninstall`. */
interface UninstalledMarker {
  uninstalled_at: string;
  prior_version: string;
  preserved: string[];
}

/** Resolve default payloadDir from the installed package structure.
 *
 * tsup bundles all modules into dist/cli.js (single entry point).
 * As a result, import.meta.url inside ANY module resolves to dist/cli.js.
 * So dirname(import.meta.url) = dist/. One level up = package root.
 * See flashcard: #tsup #bundle #import-meta.
 */
function resolveDefaultPayloadDir(): string {
  const thisFile = fileURLToPath(import.meta.url);
  // dist/cli.js → dirname = dist/ → one level up = package root
  const pkgRoot = path.resolve(path.dirname(thisFile), '..');
  return path.join(pkgRoot, 'templates', 'cleargate-planning');
}

/** Glob delivery dir for .md files, excluding .gitkeep */
function countDeliveryItems(cwd: string): number {
  const pendingSync = path.join(cwd, '.cleargate', 'delivery', 'pending-sync');
  const archive = path.join(cwd, '.cleargate', 'delivery', 'archive');
  let count = 0;
  for (const dir of [pendingSync, archive]) {
    if (!fs.existsSync(dir)) continue;
    const entries = fs.readdirSync(dir);
    for (const f of entries) {
      if (f.endsWith('.md') && f !== '.gitkeep') count++;
    }
  }
  return count;
}

/** Write file atomically: write to tmp, then rename. */
function writeAtomic(filePath: string, content: string): void {
  const tmpPath = filePath + '.tmp.' + Date.now();
  fs.writeFileSync(tmpPath, content, 'utf8');
  fs.renameSync(tmpPath, filePath);
}

export async function initHandler(opts: InitOptions = {}): Promise<void> {
  const cwd = opts.cwd ?? process.cwd();
  const force = opts.force ?? false;
  const now = opts.now ?? (() => new Date().toISOString());
  const stdout = opts.stdout ?? ((s: string) => process.stdout.write(s));
  const stderr = opts.stderr ?? ((s: string) => process.stderr.write(s));
  const exit = opts.exit ?? ((c: number): never => process.exit(c));
  const runWikiBuild = opts.runWikiBuild ?? wikiBuildHandler;
  const promptYesNoFn = opts.promptYesNo ?? defaultPromptYesNo;

  // Step 1: Validate cwd
  if (!fs.existsSync(cwd)) {
    stderr(`[cleargate init] ERROR: target directory does not exist: ${cwd}\n`);
    exit(1);
    return;
  }

  // Check writable by attempting to create a tmp file
  const testWritePath = path.join(cwd, `.cleargate-init-write-test-${Date.now()}`);
  try {
    fs.writeFileSync(testWritePath, '');
    fs.unlinkSync(testWritePath);
  } catch {
    stderr(`[cleargate init] ERROR: target directory is not writable: ${cwd}\n`);
    exit(1);
    return;
  }

  stdout(`[cleargate init] Target: ${cwd}\n`);

  // Step 2: Resolve payloadDir
  const payloadDir = opts.payloadDir ?? resolveDefaultPayloadDir();

  if (!fs.existsSync(payloadDir)) {
    stderr(`[cleargate init] ERROR: payload directory not found: ${payloadDir}\n`);
    stderr(`[cleargate init] Run \`npm run prebuild\` to copy the payload first.\n`);
    exit(1);
    return;
  }

  // Step 3: Copy scaffold payload
  // Step 3.5 (pre-copy): Detect .uninstalled marker and prompt restore.
  // Must run before any writes so the user sees the restore prompt first.
  const uninstalledMarkerPath = path.join(cwd, '.cleargate', '.uninstalled');
  let uninstalledMarker: UninstalledMarker | null = null;
  let userChoseRestore = false;

  if (fs.existsSync(uninstalledMarkerPath)) {
    try {
      const raw = fs.readFileSync(uninstalledMarkerPath, 'utf8');
      uninstalledMarker = JSON.parse(raw) as UninstalledMarker;
    } catch {
      stderr(`[cleargate init] WARNING: .uninstalled marker is malformed; ignoring it.\n`);
    }

    if (uninstalledMarker !== null) {
      const { uninstalled_at, prior_version, preserved } = uninstalledMarker;
      const question =
        `[cleargate init] Detected previous ClearGate install` +
        ` (uninstalled ${uninstalled_at}, prior version ${prior_version}).` +
        ` Restore preserved items? [Y/n]`;
      userChoseRestore = await promptYesNoFn(question, true);

      if (userChoseRestore) {
        // Blind copy: just verify each preserved file still exists on disk
        // (it was preserved as intended). Log status; never touch content.
        for (const preservedPath of preserved) {
          const absPreserved = path.isAbsolute(preservedPath)
            ? preservedPath
            : path.join(cwd, preservedPath);
          if (fs.existsSync(absPreserved)) {
            stdout(`[cleargate init] [preserved] ${preservedPath}\n`);
          } else {
            stdout(`[cleargate init] [warn] preserved path missing on disk: ${preservedPath}\n`);
          }
        }
      } else {
        stdout(
          `[cleargate init] discarding preservation; preserved files untouched on disk\n`,
        );
      }
      // Marker removal happens AFTER bootstrap (Step 6) completes — tracked below.
    }
  }

  const copyReport = copyPayload(payloadDir, cwd, { force });
  for (const action of copyReport.actions) {
    const verb =
      action.action === 'created'
        ? 'Created'
        : action.action === 'overwritten'
          ? 'Overwritten'
          : 'Skipped (exists)';
    stdout(`[cleargate init] ${verb} ${action.relPath}\n`);
  }

  // Step 4: Merge PostToolUse hook into .claude/settings.json
  const settingsPath = path.join(cwd, '.claude', 'settings.json');
  let existingSettings: SettingsJson | null = null;
  if (fs.existsSync(settingsPath)) {
    try {
      existingSettings = JSON.parse(fs.readFileSync(settingsPath, 'utf8')) as SettingsJson;
    } catch {
      stderr(`[cleargate init] WARNING: could not parse ${settingsPath}; treating as empty.\n`);
    }
  }

  const mergedSettings = mergeSettings(existingSettings, HOOK_ADDITION);
  fs.mkdirSync(path.dirname(settingsPath), { recursive: true });
  writeAtomic(settingsPath, JSON.stringify(mergedSettings, null, 2) + '\n');
  stdout(`[cleargate init] Updated .claude/settings.json: merged PostToolUse hook\n`);

  // Step 5: Inject bounded block into CLAUDE.md
  const claudeMdPath = path.join(cwd, 'CLAUDE.md');
  const claudeMdSrcPath = path.join(payloadDir, 'CLAUDE.md');

  let claudeMdBlock: string;
  try {
    const claudeMdSrc = fs.readFileSync(claudeMdSrcPath, 'utf8');
    claudeMdBlock = extractBlock(claudeMdSrc);
  } catch (e) {
    stderr(`[cleargate init] WARNING: could not read CLAUDE.md block from payload: ${String(e)}\n`);
    claudeMdBlock = '<!-- CLEARGATE:START -->\n<!-- CLEARGATE:END -->';
  }

  const existingClaudeMd = fs.existsSync(claudeMdPath)
    ? fs.readFileSync(claudeMdPath, 'utf8')
    : null;

  const newClaudeMd = injectClaudeMd(existingClaudeMd, claudeMdBlock);
  writeAtomic(claudeMdPath, newClaudeMd);

  if (existingClaudeMd === null) {
    stdout(`[cleargate init] Created CLAUDE.md (with bounded block)\n`);
  } else if (existingClaudeMd !== newClaudeMd) {
    stdout(`[cleargate init] Updated CLAUDE.md (bounded block injected/replaced)\n`);
  } else {
    stdout(`[cleargate init] CLAUDE.md unchanged (block already up to date)\n`);
  }

  // Step 6: Bootstrap pass
  const itemCount = countDeliveryItems(cwd);
  if (itemCount > 0) {
    stdout(`[cleargate init] Bootstrap: running wiki build (${itemCount} items found)...\n`);
    await runWikiBuild({ cwd, now });
    stdout(`[cleargate init] Bootstrap: ran wiki build (${itemCount} items ingested)\n`);
  } else {
    stdout(`[cleargate init] Bootstrap: no items to ingest, skipping build\n`);
  }

  // Step 7: Write install snapshot atomically to .cleargate/.install-manifest.json.
  // Must be the FINAL step after all scaffold files are written (blueprint §1.2).
  const cleargateDir = path.join(cwd, '.cleargate');
  fs.mkdirSync(cleargateDir, { recursive: true });

  const snapshotPath = path.join(cleargateDir, '.install-manifest.json');
  try {
    const readManifest = opts.readInstallManifest ?? (() => loadPackageManifest({ packageRoot: payloadDir }));
    const pkgManifest = readManifest();
    const snapshot: ManifestFile = {
      ...pkgManifest,
      installed_at: now(),
    };
    writeAtomic(snapshotPath, JSON.stringify(snapshot, null, 2) + '\n');
    stdout(`[cleargate init] Wrote install snapshot: .cleargate/.install-manifest.json\n`);
  } catch (e) {
    stderr(`[cleargate init] WARNING: could not write install snapshot: ${String(e)}\n`);
  }

  // Remove .uninstalled marker AFTER bootstrap + snapshot complete (whether user chose Y or N).
  // This prevents repeated prompting on subsequent init runs.
  if (uninstalledMarker !== null && fs.existsSync(uninstalledMarkerPath)) {
    try {
      fs.unlinkSync(uninstalledMarkerPath);
    } catch (e) {
      stderr(`[cleargate init] WARNING: could not remove .uninstalled marker: ${String(e)}\n`);
    }
  }

  // Step 8: Done
  stdout(
    `[cleargate init] Done. Read CLAUDE.md and .cleargate/knowledge/cleargate-protocol.md to learn the protocol.\n`,
  );

  void now; // suppress unused warning if not used after this
}
