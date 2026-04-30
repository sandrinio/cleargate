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
import { spawnSync } from 'node:child_process';
import { copyPayload } from '../init/copy-payload.js';
import { mergeSettings, type SettingsJson } from '../init/merge-settings.js';
import { injectClaudeMd, extractBlock } from '../init/inject-claude-md.js';
import { injectMcpJson } from '../init/inject-mcp-json.js';
import { wikiBuildHandler, type WikiBuildOptions } from './wiki-build.js';
import { loadPackageManifest, type ManifestFile } from '../lib/manifest.js';
import { promptYesNo as defaultPromptYesNo, promptEmail as defaultPromptEmail } from '../lib/prompts.js';
import { resolveIdentity, readParticipant, writeParticipant, type ResolveIdentityOpts } from '../lib/identity.js';
import { resolveScaffoldRoot, ScaffoldSourceError } from '../lib/scaffold-source.js';

/**
 * The PostToolUse hook config to merge — updated in STORY-008-06 to use
 * stamp-and-gate.sh (replaces legacy SPRINT-04 inline wiki ingest command).
 * Uses ${CLAUDE_PROJECT_DIR} so the path is project-relative at runtime.
 * mergeSettings deduplicates by exact command string — safe to re-run.
 */
const HOOK_ADDITION: SettingsJson = {
  hooks: {
    PreToolUse: [
      {
        matcher: 'Edit|Write',
        hooks: [
          {
            type: 'command',
            command: '${CLAUDE_PROJECT_DIR}/.claude/hooks/pre-edit-gate.sh',
          },
        ],
      },
    ],
    PostToolUse: [
      {
        matcher: 'Edit|Write',
        hooks: [
          {
            type: 'command',
            command: '${CLAUDE_PROJECT_DIR}/.claude/hooks/stamp-and-gate.sh',
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
  /** Accept all defaults non-interactively (same as stdin not a TTY). */
  yes?: boolean;
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
  /**
   * Test seam: replaces the email prompt for participant identity flow.
   * STORY-010-01: injectable so tests don't block on stdin.
   */
  promptEmail?: (question: string, defaultValue: string) => Promise<string>;
  /**
   * Test seam: identity resolver options (gitEmail, hostname, username, env overrides).
   * STORY-010-01: used to inject a deterministic git email in tests.
   */
  identityOpts?: ResolveIdentityOpts;
  /**
   * Test seam: override process.stdin.isTTY for participant prompt decision.
   * STORY-010-01: in test environment stdin is not a TTY; inject true to force interactive path.
   */
  stdinIsTTY?: boolean;
  /**
   * CR-009: pin version to stamp into hook scripts. Overrides the default of
   * reading the version from `cleargate-cli/package.json`. Supports
   * `cleargate init --pin 0.6.0-beta` and test seam injection.
   */
  pin?: string;
  /**
   * Test seam: replaces child_process.spawnSync for the resolver probe (Step 7.6).
   * Injected in tests to avoid real npx invocations.
   */
  spawnSyncFn?: typeof spawnSync;
  /**
   * STORY-016-05: install scaffold from a local directory instead of the published npm package.
   * Resolved relative to `cwd` (or process.cwd()). Requires `.claude/`, `.cleargate/`, and
   * `CLAUDE.md` at the path root. Enables meta-repo dogfood: `cleargate init --from-source ./cleargate-planning`.
   */
  fromSource?: string;
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
export function resolveDefaultPayloadDir(): string {
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

/**
 * CR-009: Read the version from a package.json file at `packageJsonPath`.
 * Returns null when the file is absent or malformed.
 */
function readPackageVersion(packageJsonPath: string): string | null {
  try {
    const raw = fs.readFileSync(packageJsonPath, 'utf8');
    const pkg = JSON.parse(raw) as { version?: unknown };
    if (typeof pkg.version === 'string' && pkg.version.length > 0) {
      return pkg.version;
    }
  } catch {
    // ignore
  }
  return null;
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
  const promptEmailFn = opts.promptEmail ?? defaultPromptEmail;
  const spawnSyncFn = opts.spawnSyncFn ?? spawnSync;

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
  // STORY-016-05: when --from-source is provided, use the local path instead of the npm package.
  let payloadDir: string;
  if (opts.payloadDir) {
    // Explicit test-seam override — highest priority, used by existing tests.
    payloadDir = opts.payloadDir;
  } else if (opts.fromSource) {
    // --from-source flag: validate and use the local path.
    try {
      const resolved = resolveScaffoldRoot({ fromSource: opts.fromSource, cwd });
      payloadDir = resolved.payloadDir;
    } catch (e) {
      if (e instanceof ScaffoldSourceError) {
        stderr(`${e.message}\n`);
        exit(2);
        return;
      }
      throw e;
    }
  } else {
    payloadDir = resolveDefaultPayloadDir();
  }

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

  // CR-009: Resolve pin version for hook script substitution.
  // Priority: explicit --pin flag → package.json next to payloadDir → package.json next to dist → fallback 'latest'
  let pinVersion: string | undefined;
  if (opts.pin) {
    pinVersion = opts.pin;
  } else {
    // payloadDir is `.../templates/cleargate-planning`; package.json is at `.../package.json`
    const payloadParent = path.resolve(payloadDir, '..', '..');
    pinVersion =
      readPackageVersion(path.join(payloadParent, 'package.json')) ??
      readPackageVersion(path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'package.json')) ??
      'latest';
  }

  const copyReport = copyPayload(payloadDir, cwd, { force, pinVersion });
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

  // Step 5b (BUG-017 + BUG-019 + post-0.8.0): register cleargate in `.mcp.json`
  // as a stdio MCP server. Use `npx -y cleargate@<pin> mcp serve` so users
  // without a global install (i.e. anyone who ran `npx cleargate init`) still
  // get a working spawn. Pin to the cleargate version that wrote the entry,
  // matching the CR-009 hook resolver pattern.
  try {
    const action = injectMcpJson(cwd, pinVersion ?? 'latest');
    if (action === 'created') {
      stdout(
        `[cleargate init] Created .mcp.json (cleargate MCP server registered) — restart Claude Code to load it.\n`,
      );
    } else if (action === 'updated') {
      stdout(
        `[cleargate init] Updated .mcp.json (cleargate MCP server entry merged) — restart Claude Code to pick up changes.\n`,
      );
    } else {
      stdout(`[cleargate init] .mcp.json unchanged (cleargate entry already present)\n`);
    }
  } catch (e) {
    stderr(`[cleargate init] WARNING: ${String(e instanceof Error ? e.message : e)}\n`);
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

  // Step 7.6 (CR-009): Resolver probe — run the three-branch resolver and print
  // a visible green/red status line. Converts "invisible silent no-op at first
  // hook fire" into "loud failure at install time, when the user is watching".
  {
    const distCliPath = path.join(cwd, 'cleargate-cli', 'dist', 'cli.js');

    type ResolverBranch = { cmd: string; args: string[] } | null;

    // Mirror the bash resolver order: dist first (dogfood), then PATH, then npx.
    let branch: ResolverBranch = null;
    let branchLabel = '';

    if (fs.existsSync(distCliPath)) {
      branch = { cmd: 'node', args: [distCliPath, '--version'] };
      branchLabel = `local dist (${distCliPath})`;
    } else {
      // Try `cleargate --version` via PATH
      const whichResult = spawnSyncFn('command', ['-v', 'cleargate'], {
        shell: true,
        encoding: 'utf8',
        timeout: 3000,
      });
      if (whichResult.status === 0) {
        branch = { cmd: 'cleargate', args: ['--version'] };
        branchLabel = 'PATH (global install)';
      } else {
        // Fall back to npx invocation
        branch = { cmd: 'npx', args: ['-y', `cleargate@${pinVersion}`, '--version'] };
        branchLabel = `npx cleargate@${pinVersion} (cold-start ~600ms first call)`;
      }
    }

    if (branch !== null) {
      const probeResult = spawnSyncFn(branch.cmd, branch.args, {
        encoding: 'utf8',
        timeout: 15000,
      });

      if (probeResult.status === 0) {
        stdout(`[cleargate init] \u{1F7E2} cleargate CLI resolved via ${branchLabel}\n`);
      } else {
        // Resolver chain exhausted — the hooks will no-op until cleargate is reachable.
        // Per BUG-015 (2026-04-27): convert from exit(1) to warn-not-block. The probe is a
        // best-effort signal; transient registry issues (CI race conditions, network blips)
        // shouldn't hard-fail init. Hooks will surface their own resolver-failure banners
        // at runtime if the issue persists. User can run `cleargate doctor` to investigate.
        stdout(
          `[cleargate init] \u{1F7E1} cleargate CLI: not resolvable in this environment.\n` +
          `[cleargate init]   Attempted: ${branchLabel}\n` +
          `[cleargate init]   This is a warning, not a fatal error. Hooks will no-op until resolved.\n` +
          `[cleargate init]   Fix: npm i -g cleargate@${pinVersion}  or  npx cleargate@${pinVersion} doctor\n`,
        );
        // Continue init. The resolver-status was emitted; hooks will surface their own
        // failure banners at runtime if needed.
      }
    }
  }

  // Step 7.5: Participant identity
  // Skip if .cleargate/.participant.json already exists (idempotent re-init).
  const existingParticipant = readParticipant(cwd);
  if (existingParticipant === null) {
    // Resolve git email as default (no env / host fallback during init — init needs a concrete prompt).
    const identityOpts = opts.identityOpts ?? {};

    // Resolve just the git rung: call resolveIdentity with env={} to skip env rung,
    // then check the source.
    const gitOnlyIdentity = resolveIdentity(cwd, {
      ...identityOpts,
      env: {}, // force skip env rung
    });
    const gitEmail =
      gitOnlyIdentity.source === 'git' ? gitOnlyIdentity.email : null;

    const stdinIsTTY = opts.stdinIsTTY ?? process.stdin.isTTY ?? false;
    const isNonInteractive = opts.yes === true || !stdinIsTTY;

    if (isNonInteractive) {
      // Non-interactive: use git email; if unavailable use host fallback via resolveIdentity
      const finalEmail =
        gitEmail ??
        resolveIdentity(cwd, identityOpts).email;

      await writeParticipant(cwd, finalEmail, 'inferred', now);
      stdout(`[cleargate init] Participant identity: ${finalEmail} (inferred)\n`);
    } else {
      // Interactive: prompt for email.
      // BUG-007: the prior prompt reused the `[cleargate init]` info-log prefix
      // and was followed by a newline, so it visually merged with preceding log
      // lines and the cursor sat on a blank line below — users walked away
      // believing install had finished. Fix:
      //   1. Drop the `[cleargate init]` prefix on the prompt itself so it
      //      reads as an interactive question, not a status message.
      //   2. Print a blank separator line above so the eye catches the change.
      //   3. Reject GitHub `users.noreply.github.com` git emails as a default —
      //      they're unrouteable identities; users who blindly press Enter end
      //      up with a participant identity that can't receive invites.
      const isNoreply = gitEmail !== null && /@users\.noreply\.github\.com$/i.test(gitEmail);
      const defaultEmail = (gitEmail !== null && !isNoreply) ? gitEmail : 'user@localhost';
      stdout('\n');
      const question = `Participant email (press Enter for default) [${defaultEmail}]:`;
      const answer = await promptEmailFn(question, defaultEmail);
      await writeParticipant(cwd, answer, 'prompted', now);
      stdout(`[cleargate init] Participant identity: ${answer} (prompted)\n`);
    }
  }

  // Step 8: Done
  stdout(
    `[cleargate init] Done. Read CLAUDE.md and .cleargate/knowledge/cleargate-protocol.md to learn the protocol.\n`,
  );

  void now; // suppress unused warning if not used after this
}
