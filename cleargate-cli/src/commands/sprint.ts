/**
 * sprint.ts — `cleargate sprint init|close|archive` command handlers.
 *
 * STORY-013-08: CLI wrappers for sprint lifecycle scripts.
 * STORY-014-08: sprintArchiveHandler — final sprint close-out.
 * STORY-015-04: stampSprintClose + rollback on wiki build/lint failure.
 * CR-017: lifecycle reconciliation gate + decomposition gate at sprint init.
 *
 * All handlers are v1-inert: when execution_mode is "v1", they print the
 * inert-mode message and exit 0. Under "v2", they shell out via run_script.sh
 * or orchestrate filesystem + git operations directly.
 *
 * EPIC-013 §0 rule 5: never invoke `node .cleargate/scripts/*.mjs` directly —
 * always route through `run_script.sh`.
 *
 * FLASHCARD #tsup #cjs #esm: no top-level await.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { spawnSync, execSync } from 'node:child_process';
import yaml from 'js-yaml';
import {
  readSprintExecutionMode,
  printInertAndExit,
  type ExecutionModeOptions,
} from './execution-mode.js';
import { resolveCleargateScript } from '../lib/script-paths.js';
import { wikiBuildHandler } from './wiki-build.js';
import { wikiLintHandler } from './wiki-lint.js';
import {
  reconcileLifecycle,
  reconcileDecomposition,
  checkVerbMismatch,
} from '../lib/lifecycle-reconcile.js';
import { parseFrontmatter } from '../wiki/parse-frontmatter.js';

// Terminal statuses — re-declared locally to avoid cross-module runtime import.
// Keep in sync with TERMINAL_STATUSES in wiki-build.ts.
const TERMINAL_STATUSES = new Set(['Completed', 'Done', 'Abandoned', 'Closed', 'Resolved']);

// ─── Public CLI option types ───────────────────────────────────────────────────

export interface SprintCliOptions extends ExecutionModeOptions {
  stdout?: (s: string) => void;
  stderr?: (s: string) => void;
  exit?: (code: number) => never;
  /** Override path to run_script.sh (test seam). */
  runScriptPath?: string;
  /** Override spawnSync (test seam). */
  spawnFn?: typeof spawnSync;
  /** Test seam: override wiki build invocation. Defaults to wikiBuildHandler. */
  wikiBuildFn?: (cwd: string, stdout: (s: string) => void) => Promise<void>;
  /** Test seam: override wiki lint invocation. Defaults to wikiLintHandler. */
  wikiLintFn?: (cwd: string, stdout: (s: string) => void) => Promise<void>;
  /**
   * CR-017: --allow-drift flag.
   * When true at sprint init, lifecycle drift is warned but does not block.
   * Does NOT waive the decomposition gate (decomposition is always block-by-default).
   */
  allowDrift?: boolean;
  /**
   * CR-017 test seam: override git runner for reconcileLifecycle.
   * Used in tests to inject fake git log output.
   */
  gitRunner?: (cmd: string, args: string[]) => string;
}

// ─── Shared run_script.sh resolution ─────────────────────────────────────────

function resolveRunScript(opts: SprintCliOptions): string {
  if (opts.runScriptPath) return opts.runScriptPath;
  const cwd = opts.cwd ?? process.cwd();
  return path.join(cwd, '.cleargate', 'scripts', 'run_script.sh');
}

function defaultExit(code: number): never {
  return process.exit(code) as never;
}

// ─── sprintInitHandler ────────────────────────────────────────────────────────

/**
 * `cleargate sprint init <sprint-id> --stories <csv>`
 *
 * v1: print inert message, exit 0.
 * v2: run `run_script.sh init_sprint.mjs <sprint-id> --stories <csv>`
 *
 * CR-017: before shelling out, run two gates (v2 only):
 *   1. reconcileLifecycle — warn-only in v1-mode sprint; block when lifecycle_init_mode === "block"
 *   2. reconcileDecomposition — block-by-default; no --allow-drift waiver
 */
export function sprintInitHandler(
  opts: { sprintId: string; stories: string; allowDrift?: boolean },
  cli?: SprintCliOptions,
): void {
  const stdoutFn = cli?.stdout ?? ((s: string) => process.stdout.write(s + '\n'));
  const stderrFn = cli?.stderr ?? ((s: string) => process.stderr.write(s + '\n'));
  const exitFn: (code: number) => never = cli?.exit ?? defaultExit;
  const spawnFn = cli?.spawnFn ?? spawnSync;
  const cwd = cli?.cwd ?? process.cwd();
  const allowDrift = opts.allowDrift ?? cli?.allowDrift ?? false;

  const mode = readSprintExecutionMode(opts.sprintId, {
    sprintFilePath: cli?.sprintFilePath,
    cwd,
  });

  if (mode === 'v1') {
    return printInertAndExit(stdoutFn, exitFn);
  }

  // ── CR-017 Gate 1: Lifecycle Reconciliation ───────────────────────────────
  // Runs BEFORE init_sprint.mjs to prevent state.json mutation on gate failure.
  // warn-only in v1-like sprint (lifecycle_init_mode === "warn"), block in "block" mode.
  const deliveryRoot = path.join(cwd, '.cleargate', 'delivery');

  // Find the sprint plan file to read lifecycle_init_mode
  let lifecycleInitMode: 'warn' | 'block' = 'warn'; // default: warn-only
  let sprintPlanPath: string | null = null;
  const pendingDir = path.join(deliveryRoot, 'pending-sync');

  try {
    const entries = fs.readdirSync(pendingDir);
    const sprintFile = entries.find(
      (e) => (e.startsWith(`${opts.sprintId}_`) || e === `${opts.sprintId}.md`) && e.endsWith('.md'),
    );
    if (sprintFile) {
      sprintPlanPath = path.join(pendingDir, sprintFile);
      const raw = fs.readFileSync(sprintPlanPath, 'utf8');
      const { fm } = parseFileFrontmatter(raw);
      if (fm['lifecycle_init_mode'] === 'block') {
        lifecycleInitMode = 'block';
      }
    }
  } catch {
    // If we can't read the sprint file, default to warn-only
  }

  // Run lifecycle reconciliation: look back 30 days as a reasonable prior-sprint window
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const until = new Date();

  try {
    const lifecycleResult = reconcileLifecycle({
      since,
      until,
      deliveryRoot,
      repoRoot: cwd,
      gitRunner: cli?.gitRunner,
    });

    if (lifecycleResult.drift.length > 0) {
      // Emit punch list
      stderrFn('[cleargate sprint init] lifecycle reconciliation: unreconciled artifacts found:');
      for (const item of lifecycleResult.drift) {
        const warnTag = checkVerbMismatch(
          item.commit_shas.length > 0 ? '' : '',
          item.type,
        );
        stderrFn(
          `  DRIFT: ${item.id} status=${item.actual_status ?? 'missing'} in ${item.in_archive ? 'archive' : 'pending-sync'}, expected ${item.expected_status}` +
          ` (commit ${item.commit_shas[0] ?? 'unknown'})`,
        );
        if (warnTag) stderrFn(`  WARN: ${warnTag}`);
      }

      if (allowDrift) {
        // --allow-drift passed: record waiver in context_source (best-effort)
        stderrFn('[cleargate sprint init] lifecycle drift waived via --allow-drift flag');
        if (sprintPlanPath) {
          try {
            const rawSprint = fs.readFileSync(sprintPlanPath, 'utf8');
            const { fm, body } = parseFileFrontmatter(rawSprint);
            const waiverLine = `lifecycle waiver: ${new Date().toISOString().split('T')[0]} for ${lifecycleResult.drift.map((d) => d.id).join(', ')}`;
            const currentContextSource = typeof fm['context_source'] === 'string'
              ? fm['context_source']
              : '';
            fm['context_source'] = currentContextSource
              ? `${currentContextSource}\n${waiverLine}`
              : waiverLine;
            atomicWriteStr(sprintPlanPath, serializeFileContent(fm, body));
          } catch {
            // best-effort; don't block on write failure
          }
        }
      } else if (lifecycleInitMode === 'block') {
        stderrFn(
          '[cleargate sprint init] lifecycle drift blocks sprint activation (lifecycle_init_mode: block)',
        );
        stderrFn('  To waive: pass --allow-drift flag. To fix: archive artifacts and set status to terminal.');
        return exitFn(1);
      } else {
        // warn-only mode: print warning but proceed
        stderrFn('[cleargate sprint init] WARNING: lifecycle drift detected (warn-only mode — proceeding)');
        stderrFn('  Set lifecycle_init_mode: block in sprint frontmatter for SPRINT-16+ to enforce blocking.');
      }
    }
  } catch {
    // Lifecycle gate failure should not block sprint init — log and proceed
    stderrFn('[cleargate sprint init] lifecycle reconciliation unavailable (proceeding without gate)');
  }

  // ── CR-017 Gate 2: Decomposition Gate ────────────────────────────────────
  // Block-by-default; no --allow-drift waiver.
  if (sprintPlanPath) {
    try {
      const decompResult = reconcileDecomposition({
        sprintPlanPath,
        deliveryRoot,
      });

      if (decompResult.missing.length > 0) {
        if (allowDrift) {
          // --allow-drift does NOT waive decomposition gate
          stderrFn('decomposition gate cannot be waived; complete the decomposition or push start_date.');
        } else {
          stderrFn('[cleargate sprint init] decomposition gate: missing decompositions:');
        }
        for (const item of decompResult.missing) {
          stderrFn(`  MISSING: ${item.id} (${item.type}) — ${item.reason}`);
          for (const f of item.expected_files) {
            stderrFn(`    expected: ${f}`);
          }
        }
        return exitFn(1);
      }
    } catch {
      // If we can't run decomposition check (e.g., no sprint plan), skip gate
      stderrFn('[cleargate sprint init] decomposition gate unavailable (proceeding without check)');
    }
  }

  // v2: shell out via run_script.sh (CR-050: explicit node + absolute path)
  const runScript = resolveRunScript(cli ?? {});
  const scriptPath = resolveCleargateScript({ cwd }, 'init_sprint.mjs');

  const result = spawnFn(
    'bash',
    [runScript, 'node', scriptPath, opts.sprintId, '--stories', opts.stories],
    { stdio: 'inherit' },
  );

  if (result.error) {
    stderrFn(`[cleargate sprint init] error: ${result.error.message}`);
    return exitFn(1);
  }

  const code = result.status ?? 0;
  if (code === 0) { stdoutFn('→ Load skill: sprint-execution'); }
  return exitFn(code);
}

// ─── sprintCloseHandler ───────────────────────────────────────────────────────

/**
 * `cleargate sprint close <sprint-id> [--assume-ack]`
 *
 * v1: print inert message, exit 0.
 * v2: run `run_script.sh close_sprint.mjs <sprint-id> [--assume-ack]`
 */
export function sprintCloseHandler(
  opts: { sprintId: string; assumeAck?: boolean },
  cli?: SprintCliOptions,
): void {
  const stdoutFn = cli?.stdout ?? ((s: string) => process.stdout.write(s + '\n'));
  const stderrFn = cli?.stderr ?? ((s: string) => process.stderr.write(s + '\n'));
  const exitFn: (code: number) => never = cli?.exit ?? defaultExit;
  const spawnFn = cli?.spawnFn ?? spawnSync;

  const mode = readSprintExecutionMode(opts.sprintId, {
    sprintFilePath: cli?.sprintFilePath,
    cwd: cli?.cwd,
  });

  if (mode === 'v1') {
    return printInertAndExit(stdoutFn, exitFn);
  }

  // v2: shell out via run_script.sh (CR-050: explicit node + absolute path)
  const runScript = resolveRunScript(cli ?? {});
  const closeCwd = cli?.cwd ?? process.cwd();
  const closeScriptPath = resolveCleargateScript({ cwd: closeCwd }, 'close_sprint.mjs');
  const closeArgs = [runScript, 'node', closeScriptPath, opts.sprintId];
  // FLASHCARD #cli #commander #optional-key: omit the key when undefined; only
  // append --assume-ack when the flag was explicitly set (opts.assumeAck === true).
  if (opts.assumeAck === true) {
    closeArgs.push('--assume-ack');
  }

  const result = spawnFn('bash', closeArgs, { stdio: 'inherit' });

  if (result.error) {
    stderrFn(`[cleargate sprint close] error: ${result.error.message}`);
    return exitFn(1);
  }

  const code = result.status ?? 0;
  return exitFn(code);
}

// ─── reconcileLifecycleCliHandler ─────────────────────────────────────────────

/**
 * CR-017: `cleargate sprint reconcile-lifecycle <sprint-id>`
 *
 * Pure wrapper around reconcileLifecycle. Used by close_sprint.mjs (Step 2.6)
 * to check lifecycle status at sprint close.
 *
 * Exits 0 if clean; exits 1 with punch list if drift found.
 * The sprint ID is used to derive the git date range from sprint frontmatter.
 * Falls back to last 90 days if frontmatter cannot be read.
 */
export function reconcileLifecycleCliHandler(
  opts: { sprintId: string; since?: string; until?: string },
  cli?: SprintCliOptions,
): void {
  const stdoutFn = cli?.stdout ?? ((s: string) => process.stdout.write(s + '\n'));
  const stderrFn = cli?.stderr ?? ((s: string) => process.stderr.write(s + '\n'));
  const exitFn: (code: number) => never = cli?.exit ?? defaultExit;
  const cwd = cli?.cwd ?? process.cwd();

  const deliveryRoot = path.join(cwd, '.cleargate', 'delivery');

  // Determine date range: from CLI flags or from sprint frontmatter
  let since: Date;
  let until: Date;

  if (opts.since) {
    since = new Date(opts.since);
  } else {
    // Try to read sprint start_date from frontmatter
    try {
      const pendingDir = path.join(deliveryRoot, 'pending-sync');
      const entries = fs.readdirSync(pendingDir);
      const sprintFile = entries.find(
        (e) => (e.startsWith(`${opts.sprintId}_`) || e === `${opts.sprintId}.md`) && e.endsWith('.md'),
      );
      if (sprintFile) {
        const raw = fs.readFileSync(path.join(pendingDir, sprintFile), 'utf8');
        const { fm } = parseFileFrontmatter(raw);
        const startDate = fm['start_date'];
        since = typeof startDate === 'string' ? new Date(startDate) : new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
      } else {
        since = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
      }
    } catch {
      since = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    }
  }

  until = opts.until ? new Date(opts.until) : new Date();

  try {
    const result = reconcileLifecycle({
      since,
      until,
      deliveryRoot,
      repoRoot: cwd,
      gitRunner: cli?.gitRunner,
    });

    if (result.drift.length === 0) {
      stdoutFn(`lifecycle: clean (${result.clean} artifacts reconciled)`);
      return exitFn(0);
    }

    stderrFn(`lifecycle: DRIFT detected (${result.drift.length} unreconciled artifacts):`);
    for (const item of result.drift) {
      stderrFn(
        `  DRIFT: ${item.id} status=${item.actual_status ?? 'missing'} in ${item.in_archive ? 'archive' : 'pending-sync'}, expected ${item.expected_status}` +
        ` (commit ${item.commit_shas[0] ?? 'unknown'})`,
      );
      stderrFn(
        `    Remediation: git mv .cleargate/delivery/pending-sync/${item.file_path?.replace('pending-sync/', '') ?? item.id + '_*.md'} .cleargate/delivery/archive/ && update status: ${item.expected_status}`,
      );
    }
    return exitFn(1);
  } catch (err) {
    stderrFn(`lifecycle reconciliation error: ${err instanceof Error ? err.message : String(err)}`);
    return exitFn(1);
  }
}

// ─── sprintArchiveHandler ─────────────────────────────────────────────────────

/**
 * Parse just the frontmatter from a markdown file using js-yaml CORE_SCHEMA.
 * Returns { fm, body } where body is the content after the closing `---`.
 * FLASHCARD #cli #frontmatter #parse: body may start with blank line; we strip
 * one leading blank to match parseFrontmatter.ts convention.
 */
function parseFileFrontmatter(raw: string): { fm: Record<string, unknown>; body: string } {
  const lines = raw.split('\n');
  if (lines[0] !== '---') return { fm: {}, body: raw };
  let closeIdx = -1;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i] === '---') { closeIdx = i; break; }
  }
  if (closeIdx === -1) return { fm: {}, body: raw };
  const yamlText = lines.slice(1, closeIdx).join('\n');
  const bodyLines = lines.slice(closeIdx + 1);
  if (bodyLines[0] === '') bodyLines.shift();
  const body = bodyLines.join('\n');
  if (yamlText.trim() === '') return { fm: {}, body };
  let parsed: unknown;
  try {
    parsed = yaml.load(yamlText, { schema: yaml.CORE_SCHEMA });
  } catch {
    return { fm: {}, body };
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return { fm: {}, body };
  return { fm: parsed as Record<string, unknown>, body };
}

/**
 * Serialize frontmatter + body back to a markdown string.
 * Always adds blank separator between `---` and body.
 */
function serializeFileContent(fm: Record<string, unknown>, body: string): string {
  const yamlBody = yaml.dump(fm, {
    schema: yaml.CORE_SCHEMA,
    lineWidth: -1,
    noRefs: true,
    noCompatMode: true,
    quotingType: '"',
    forceQuotes: false,
  });
  return `---\n${yamlBody.replace(/\n+$/, '')}\n---\n\n${body}`;
}

/**
 * Atomic write via tmp + rename (same pattern as story.ts / close_sprint.mjs).
 */
function atomicWriteStr(filePath: string, content: string): void {
  const tmp = `${filePath}.tmp.${process.pid}`;
  fs.writeFileSync(tmp, content, 'utf8');
  fs.renameSync(tmp, filePath);
}

/**
 * Derive sprint branch from sprint ID.
 * `SPRINT-10` → `sprint/S-10` (zero-padded 2-digit).
 */
function deriveSprintBranchForArchive(sprintId: string): string {
  const match = /^SPRINT-(\d+)/.exec(sprintId);
  const branchNum = match ? match[1]!.replace(/^0+/, '') || '0' : sprintId;
  return `sprint/S-${branchNum.padStart(2, '0')}`;
}

/**
 * Stamp a file's frontmatter with status + completed_at.
 * Returns the stamped content string (does NOT write to disk).
 */
function stampFile(raw: string, status: string, completedAt: string): string {
  const { fm, body } = parseFileFrontmatter(raw);
  fm['status'] = status;
  fm['completed_at'] = completedAt;
  return serializeFileContent(fm, body);
}

/**
 * STORY-015-04: Stamp the sprint file's frontmatter with status="Completed"
 * (if not already terminal) and completed_at (if absent). Writes atomically.
 *
 * Returns:
 *   previousContent — original file bytes for rollback
 *   stampedContent  — the content written to disk
 *   didChange       — false if file was already terminal + completed_at set
 */
export function stampSprintClose(
  sprintPath: string,
  now: () => string,
): { previousContent: string; stampedContent: string; didChange: boolean } {
  const previousContent = fs.readFileSync(sprintPath, 'utf8');
  const { fm, body } = parseFileFrontmatter(previousContent);

  const currentStatus = typeof fm['status'] === 'string' ? fm['status'] : '';
  const alreadyTerminal = TERMINAL_STATUSES.has(currentStatus);
  const hasCompletedAt = typeof fm['completed_at'] === 'string' && fm['completed_at'].length > 0;

  if (alreadyTerminal && hasCompletedAt) {
    return { previousContent, stampedContent: previousContent, didChange: false };
  }

  if (!alreadyTerminal) {
    fm['status'] = 'Completed';
  }
  if (!hasCompletedAt) {
    fm['completed_at'] = now();
  }

  const stampedContent = serializeFileContent(fm, body);
  atomicWriteStr(sprintPath, stampedContent);
  return { previousContent, stampedContent, didChange: true };
}

/**
 * STORY-015-04: Atomically restore a sprint file from a previously-snapshotted
 * string (rollback after wiki build/lint failure).
 */
export function restoreSprintFile(sprintPath: string, original: string): void {
  atomicWriteStr(sprintPath, original);
}

/** Return state.json story keys that belong to a given epic. */
function storyKeysForEpic(
  stateStories: Record<string, unknown>,
  epicId: string,
): string[] {
  const epicNum = epicId.replace('EPIC-', '');
  return Object.keys(stateStories).filter((k) => k.startsWith(`STORY-${epicNum}-`));
}

/**
 * `cleargate sprint archive <sprint-id> [--dry-run]`
 *
 * v1: print inert message, exit 0.
 * v2:
 *   1. Read state.json — refuse if sprint_status !== 'Completed'.
 *   2. Resolve file set from sprint frontmatter + state.json + orphan scan.
 *   3. --dry-run: print plan; no writes.
 *   4. Live: stamp sprint file, wiki build+lint (if wiki initialised), then
 *      move files, clear .active, git checkout main, merge, branch -d.
 */
export async function sprintArchiveHandler(
  opts: { sprintId: string; dryRun?: boolean; allowWikiLintDebt?: boolean },
  cli?: SprintCliOptions,
): Promise<void> {
  try {
  const stdoutFn = cli?.stdout ?? ((s: string) => process.stdout.write(s + '\n'));
  const stderrFn = cli?.stderr ?? ((s: string) => process.stderr.write(s + '\n'));
  const exitFn: (code: number) => never = cli?.exit ?? defaultExit;
  const spawnFn = cli?.spawnFn ?? spawnSync;
  const cwd = cli?.cwd ?? process.cwd();

  // Wiki build/lint seam wrappers.
  // wikiBuildHandler on success returns (no exit call); on failure calls exit(1) which throws.
  // wikiLintHandler on success calls exit(0) which throws; on findings calls exit(1) which throws.
  const wikiBuildFn: (wCwd: string, wStdout: (s: string) => void) => Promise<void> =
    cli?.wikiBuildFn ??
    (async (wCwd: string, wStdout: (s: string) => void) => {
      const fakeExit = (code: number): never => { throw new Error(`wiki-build-exit:${code}`); };
      try {
        await wikiBuildHandler({ cwd: wCwd, stdout: wStdout, exit: fakeExit as never });
      } catch (err) {
        const msg = err instanceof Error ? err.message : '';
        if (msg.startsWith('wiki-build-exit:0')) return;
        throw err;
      }
    });
  const wikiLintFn: (wCwd: string, wStdout: (s: string) => void) => Promise<void> =
    cli?.wikiLintFn ??
    (async (wCwd: string, wStdout: (s: string) => void) => {
      const fakeExit = (code: number): never => { throw new Error(`wiki-lint-exit:${code}`); };
      try {
        await wikiLintHandler({ cwd: wCwd, stdout: wStdout, exit: fakeExit as never });
      } catch (err) {
        const msg = err instanceof Error ? err.message : '';
        if (msg.startsWith('wiki-lint-exit:0')) return;
        throw err;
      }
    });

  // Step 1: v1-inert check
  const mode = readSprintExecutionMode(opts.sprintId, {
    sprintFilePath: cli?.sprintFilePath,
    cwd,
  });
  if (mode === 'v1') {
    return printInertAndExit(stdoutFn, exitFn);
  }

  // Step 2: Read state.json — refuse if not Completed
  const stateFile = path.join(cwd, '.cleargate', 'sprint-runs', opts.sprintId, 'state.json');
  if (!fs.existsSync(stateFile)) {
    stderrFn(`[cleargate sprint archive] state.json not found at ${stateFile}`);
    return exitFn(1);
  }
  let state: {
    sprint_status?: string;
    stories?: Record<string, unknown>;
  } & Record<string, unknown>;
  try {
    state = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
  } catch (err) {
    stderrFn(`[cleargate sprint archive] failed to parse state.json: ${(err as Error).message}`);
    return exitFn(1);
  }
  if (state.sprint_status !== 'Completed') {
    stderrFn(
      `sprint not closed — run \`cleargate sprint close ${opts.sprintId} --assume-ack\` first`,
    );
    return exitFn(1);
  }

  const stateStories: Record<string, unknown> = state.stories ?? {};

  // Step 3: Resolve file set
  const pendingDir = path.join(cwd, '.cleargate', 'delivery', 'pending-sync');
  const archiveDir = path.join(cwd, '.cleargate', 'delivery', 'archive');

  // Sprint file
  let sprintFile: string | null = null;
  for (const entry of fs.readdirSync(pendingDir)) {
    if ((entry.startsWith(`${opts.sprintId}_`) || entry === `${opts.sprintId}.md`) && entry.endsWith('.md')) {
      sprintFile = path.join(pendingDir, entry);
      break;
    }
  }

  // Sprint frontmatter → epics list
  let epicIds: string[] = [];
  if (sprintFile && fs.existsSync(sprintFile)) {
    const { fm } = parseFileFrontmatter(fs.readFileSync(sprintFile, 'utf8'));
    const epics = fm['epics'];
    if (Array.isArray(epics)) {
      epicIds = epics.map(String);
    }
  }

  // Plan entries: { src, destName, status }
  interface FilePlan {
    src: string;
    destName: string;
    status: string;
  }
  const plan: FilePlan[] = [];

  if (sprintFile) {
    plan.push({
      src: sprintFile,
      destName: path.basename(sprintFile),
      status: 'Completed',
    });
  }

  for (const epicId of epicIds) {
    // Epic file
    for (const entry of fs.readdirSync(pendingDir)) {
      if ((entry.startsWith(`${epicId}_`) || entry === `${epicId}.md`) && entry.endsWith('.md')) {
        plan.push({
          src: path.join(pendingDir, entry),
          destName: entry,
          status: 'Approved',
        });
        break;
      }
    }

    // Story files (authoritative: state.json keys for this epic)
    const storyKeys = storyKeysForEpic(stateStories, epicId);
    for (const storyId of storyKeys) {
      for (const entry of fs.readdirSync(pendingDir)) {
        if ((entry.startsWith(`${storyId}_`) || entry === `${storyId}.md`) && entry.endsWith('.md')) {
          plan.push({
            src: path.join(pendingDir, entry),
            destName: entry,
            status: 'Done',
          });
          break;
        }
      }
    }
  }

  // Orphan scan: any STORY-*.md in pending-sync with parent_epic_ref matching
  // one of our epics but NOT in state.json keys.
  const storyIdsInState = new Set(Object.keys(stateStories));
  const planSrcs = new Set(plan.map((p) => p.src));
  const orphans: string[] = [];
  for (const entry of fs.readdirSync(pendingDir)) {
    if (!entry.startsWith('STORY-') || !entry.endsWith('.md')) continue;
    const candidate = path.join(pendingDir, entry);
    if (planSrcs.has(candidate)) continue;
    let raw: string;
    try {
      raw = fs.readFileSync(candidate, 'utf8');
    } catch { continue; }
    const { fm } = parseFileFrontmatter(raw);
    const parentRef = String(fm['parent_epic_ref'] ?? '');
    if (epicIds.includes(parentRef)) {
      // Derive story ID from filename (STORY-014-01_Something.md → STORY-014-01)
      const storyId = entry.replace(/\.md$/, '').replace(/_.*$/, '');
      if (!storyIdsInState.has(storyId)) {
        orphans.push(candidate);
        stderrFn(`WARN: orphan story ${entry} matches epic ${parentRef} but is not in state.json — archiving anyway`);
        plan.push({ src: candidate, destName: entry, status: 'Done' });
      }
    }
  }

  // Step 4: --dry-run: print plan + exit 0
  const completedAt = new Date().toISOString();
  const sprintBranch = deriveSprintBranchForArchive(opts.sprintId);
  const activePath = path.join(cwd, '.cleargate', 'sprint-runs', '.active');

  if (opts.dryRun) {
    stdoutFn(`[dry-run] Sprint archive plan for ${opts.sprintId}:`);
    stdoutFn(`  Sprint branch: ${sprintBranch}`);
    stdoutFn(`  Files to archive (${plan.length}):`);
    for (const entry of plan) {
      stdoutFn(
        `    ${path.basename(entry.src)} → archive/${entry.destName}  [stamp: status=${entry.status}, completed_at=<now>]`,
      );
    }
    if (orphans.length > 0) {
      stdoutFn(`  Orphan files (${orphans.length}): ${orphans.map((o) => path.basename(o)).join(', ')}`);
    }
    stdoutFn(`  .active → "" (truncate)`);
    stdoutFn(`  git checkout main`);
    stdoutFn(`  git merge --no-ff -m "merge: ${sprintBranch} → main" ${sprintBranch}`);
    stdoutFn(`  git branch -d ${sprintBranch}`);
    return exitFn(0);
  }

  // Step 5a: Stamp the sprint file's frontmatter (status + completed_at)
  let sprintFileSnapshot: string | null = null;
  const wikiRoot = path.join(cwd, '.cleargate', 'wiki');
  const wikiInitialised = fs.existsSync(wikiRoot);

  if (sprintFile && fs.existsSync(sprintFile)) {
    const { previousContent } = stampSprintClose(sprintFile, () => completedAt);
    sprintFileSnapshot = previousContent;

    // Step 5b: wiki build + lint — only if wiki has been initialised.
    // Skip gracefully when .cleargate/wiki/ doesn't exist yet (wiki not built).
    if (wikiInitialised) {
      for (const [stepName, stepFn] of [
        ['wiki build', () => wikiBuildFn(cwd, stdoutFn)] as const,
        ['wiki lint', () => wikiLintFn(cwd, stdoutFn)] as const,
      ]) {
        try {
          await stepFn();
        } catch (err) {
          // CR-022 M5: --allow-wiki-lint-debt waives lint failure but NOT build failure.
          if (stepName === 'wiki lint' && opts.allowWikiLintDebt === true) {
            stderrFn('[cleargate sprint archive] wiki-lint debt waived via --allow-wiki-lint-debt flag');
            if (err instanceof Error) stderrFn(`  (lint output: ${err.message})`);
            continue;
          }
          // Rollback sprint file frontmatter
          atomicWriteStr(sprintFile!, sprintFileSnapshot!);
          stderrFn(
            `[cleargate sprint archive] post-stamp ${stepName} failed — sprint frontmatter reverted`,
          );
          if (err instanceof Error) stderrFn(err.message);
          return exitFn(1);
        }
      }
    }
  }

  // Step 5c: Live run — stamp + move each file
  for (const entry of plan) {
    if (!fs.existsSync(entry.src)) {
      stderrFn(`[cleargate sprint archive] source not found: ${entry.src} — skipping`);
      continue;
    }
    const raw = fs.readFileSync(entry.src, 'utf8');
    const stamped = stampFile(raw, entry.status, completedAt);
    const dest = path.join(archiveDir, entry.destName);
    atomicWriteStr(entry.src, stamped);
    fs.renameSync(entry.src, dest);
    stdoutFn(`archived: ${entry.destName}`);
  }

  // Step 6: Truncate .active
  try {
    atomicWriteStr(activePath, '');
  } catch {
    // .active may not exist — not fatal
  }

  // Step 7: git checkout main
  const step7 = spawnFn('git', ['checkout', 'main'], { stdio: 'pipe', cwd, encoding: 'utf8' });
  if (step7.error || (step7.status ?? 0) !== 0) {
    stderrFn(`[cleargate sprint archive] git checkout main failed`);
    if (step7.stderr) stderrFn(String(step7.stderr));
    return exitFn(step7.status ?? 1);
  }

  // Step 8: git merge --no-ff -m "merge: sprint/<branch> → main" sprint/<branch>
  const mergeMsg = `merge: ${sprintBranch} → main`;
  const step8 = spawnFn(
    'git',
    ['merge', '--no-ff', '-m', mergeMsg, sprintBranch],
    { stdio: 'pipe', cwd, encoding: 'utf8' },
  );
  if (step8.error || (step8.status ?? 0) !== 0) {
    stderrFn(`[cleargate sprint archive] git merge failed — run \`git merge --abort\` if needed`);
    if (step8.stderr) stderrFn(String(step8.stderr));
    return exitFn(step8.status ?? 1);
  }
  const mergeSha = String(step8.stdout ?? '').trim().split('\n')[0] ?? '';

  // Step 9: git branch -d sprint/<branch>
  const step9 = spawnFn('git', ['branch', '-d', sprintBranch], { stdio: 'pipe', cwd, encoding: 'utf8' });
  if (step9.error || (step9.status ?? 0) !== 0) {
    stderrFn(`[cleargate sprint archive] git branch -d ${sprintBranch} failed`);
    if (step9.stderr) stderrFn(String(step9.stderr));
    return exitFn(step9.status ?? 1);
  }

  stdoutFn(
    `archive complete: ${plan.length} files moved, branch ${sprintBranch} deleted` +
      (mergeSha ? `, merge SHA: ${mergeSha}` : ''),
  );
  return exitFn(0);
  } catch (e) {
    // The exitFn seam throws `Error("exit:<n>")` as a synchronous control-flow
    // shortcut so the handler bails without running further steps. Under an
    // async handler that escapes as an unhandled rejection even when tests
    // `getCode()` confirms the expected exit. Swallow the sentinel here; any
    // other error re-throws.
    if (e instanceof Error && /^exit:\d+$/.test(e.message)) return;
    throw e;
  }
}

// ─── sprintPreflightHandler ───────────────────────────────────────────────────

/**
 * CR-021: `cleargate sprint preflight <sprint-id>`
 *
 * Runs the four Gate 3 (Sprint Execution) environment-health checks. All four
 * checks always run (operator sees full punch list in one pass). Reports
 * pass/skip/fail per check.
 *
 * Checks:
 *   1. Previous sprint is Completed (skipped for SPRINT-01)
 *   2. No leftover .worktrees/STORY-* paths
 *   3. sprint/S-NN ref does NOT exist
 *   4. main is clean (no uncommitted changes)
 *
 * Exit codes:
 *   0 — all checks pass (or skipped where applicable)
 *   1 — one or more checks failed; stderr lists each failure with hint
 *   2 — usage error (missing/malformed sprint-id arg)
 *
 * Implementation note: uses execSync (node:child_process) per Architect plan M2
 * decision. Synchronous handler — mirrors sprintCloseHandler pattern.
 */

/** Result of a single preflight check. */
interface PreflightCheckResult {
  name: string;
  pass: boolean;
  skipped: boolean;
  message: string;
  hint?: string;
}

/** Options for sprintPreflightHandler — test seams for cwd and execSync. */
export interface SprintPreflightOptions {
  /** Working directory for git commands (default: process.cwd()). */
  cwd?: string;
  /** Test seam: override stdout sink (default: process.stdout.write). */
  stdout?: (s: string) => void;
  /** Test seam: override stderr sink (default: process.stderr.write). */
  stderr?: (s: string) => void;
  /** Test seam: override process.exit. Throws Error("exit:<n>") in tests. */
  exit?: (code: number) => never;
  /**
   * Test seam: override execSync. Receives the full shell command string.
   * Should throw on non-zero exit (matching real execSync behaviour).
   */
  execFn?: (cmd: string, opts: { cwd: string; encoding: 'utf8' }) => string;
}

/** Derive the sprint/S-NN branch name from a SPRINT-NN id. */
function deriveSprintBranchForPreflight(sprintId: string): string {
  const match = /^SPRINT-(\d+)/.exec(sprintId);
  const num = match ? parseInt(match[1]!, 10) : NaN;
  if (isNaN(num)) return `sprint/${sprintId}`;
  return `sprint/S-${String(num).padStart(2, '0')}`;
}

/** Parse a numeric sprint sequence number from SPRINT-NN. Returns NaN if invalid. */
function parseSprintNum(sprintId: string): number {
  const m = /^SPRINT-(\d+)$/.exec(sprintId);
  return m ? parseInt(m[1]!, 10) : NaN;
}

/** Check 1: previous sprint is Completed (skip for SPRINT-01). */
function checkPrevSprintCompleted(
  sprintId: string,
  cwd: string,
): PreflightCheckResult {
  const name = 'Previous sprint Completed';
  const sprintNum = parseSprintNum(sprintId);
  if (isNaN(sprintNum) || sprintNum <= 1) {
    return { name, pass: true, skipped: true, message: 'skipped (no preceding sprint)' };
  }

  const prevNum = sprintNum - 1;
  const prevId = `SPRINT-${String(prevNum).padStart(2, '0')}`;
  // Also try without zero-pad (e.g. SPRINT-9 not SPRINT-09)
  const prevIdAlt = `SPRINT-${prevNum}`;

  const sprintRunsBase = path.join(cwd, '.cleargate', 'sprint-runs');

  // Try both padded and unpadded forms
  let stateJson: { sprint_status?: string } | null = null;
  let resolvedPrevId = prevId;

  for (const pid of [prevId, prevIdAlt]) {
    const stateFile = path.join(sprintRunsBase, pid, 'state.json');
    if (fs.existsSync(stateFile)) {
      try {
        const raw = fs.readFileSync(stateFile, 'utf8');
        stateJson = JSON.parse(raw) as { sprint_status?: string };
        resolvedPrevId = pid;
        break;
      } catch {
        // continue trying alternate form
      }
    }
  }

  if (stateJson === null) {
    // No state.json found — treat as skipped (prev sprint may not have one yet)
    return {
      name,
      pass: true,
      skipped: true,
      message: `skipped (no state.json found for ${prevId})`,
    };
  }

  const status = stateJson.sprint_status ?? 'unknown';
  if (status === 'Completed') {
    return { name, pass: true, skipped: false, message: `${resolvedPrevId} status is "Completed"` };
  }

  return {
    name,
    pass: false,
    skipped: false,
    message: `Previous sprint not Completed`,
    hint: `${resolvedPrevId} status is "${status}". Run \`cleargate sprint close ${resolvedPrevId}\` first.`,
  };
}

/** Check 2: no leftover .worktrees/STORY-* paths. */
function checkNoLeftoverWorktrees(
  cwd: string,
  execFn: (cmd: string, opts: { cwd: string; encoding: 'utf8' }) => string,
): PreflightCheckResult {
  const name = 'No leftover worktrees';

  let output = '';
  try {
    output = execFn('git worktree list --porcelain', { cwd, encoding: 'utf8' });
  } catch {
    // If git worktree list fails, skip this check
    return { name, pass: true, skipped: true, message: 'skipped (git worktree list unavailable)' };
  }

  // Parse line-by-line for "worktree <path>" prefix
  const leftover: string[] = [];
  for (const line of output.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed.startsWith('worktree ')) continue;
    const wtPath = trimmed.slice('worktree '.length);
    // Match paths ending in /.worktrees/STORY-* (any STORY-NNN-NN pattern)
    if (/[/\\]\.worktrees[/\\]STORY-/.test(wtPath)) {
      // Normalize to a relative-looking display path: extract .worktrees/STORY-* suffix
      const m = /(\.(worktrees)[/\\]STORY-.+)$/.exec(wtPath);
      leftover.push(m ? m[1] : wtPath);
    }
  }

  if (leftover.length === 0) {
    return { name, pass: true, skipped: false, message: 'no leftover .worktrees/STORY-* paths' };
  }

  return {
    name,
    pass: false,
    skipped: false,
    message: `Leftover worktree: ${leftover[0]}`,
    hint: `Run \`git worktree remove ${leftover[0]}\` if abandoned, or merge if work in progress.`,
  };
}

/** Check 3: sprint/S-NN ref does NOT exist. */
function checkSprintBranchRefFree(
  sprintId: string,
  cwd: string,
  execFn: (cmd: string, opts: { cwd: string; encoding: 'utf8' }) => string,
): PreflightCheckResult {
  const branch = deriveSprintBranchForPreflight(sprintId);
  const ref = `refs/heads/${branch}`;
  const name = 'Sprint branch ref free';

  try {
    execFn(`git show-ref --verify --quiet ${ref}`, { cwd, encoding: 'utf8' });
    // show-ref returned 0 — ref EXISTS (bad)
    return {
      name,
      pass: false,
      skipped: false,
      message: `Sprint branch ref already exists: ${ref}`,
      hint: `Investigate; force-deletion only with explicit human approval.`,
    };
  } catch {
    // Non-zero exit from show-ref means ref does NOT exist (good)
    return {
      name,
      pass: true,
      skipped: false,
      message: `${ref} does not exist`,
    };
  }
}

/** Check 4: main is clean (no uncommitted changes). */
function checkMainClean(
  cwd: string,
  execFn: (cmd: string, opts: { cwd: string; encoding: 'utf8' }) => string,
): PreflightCheckResult {
  const name = 'main is clean';

  let output = '';
  try {
    output = execFn('git status --porcelain', { cwd, encoding: 'utf8' }).trim();
  } catch {
    return { name, pass: true, skipped: true, message: 'skipped (git status unavailable)' };
  }

  if (output === '') {
    return { name, pass: true, skipped: false, message: 'main is clean' };
  }

  // Report the first dirty line for context
  const firstLine = output.split('\n')[0] ?? output;
  return {
    name,
    pass: false,
    skipped: false,
    message: `main is dirty`,
    hint: `Uncommitted changes detected:\n      ${firstLine}\n    Commit, stash, or discard before starting a sprint.`,
  };
}

// ─── Check 5: per-item readiness gates ───────────────────────────────────────

/**
 * Locate the sprint plan file by ID, searching pending-sync/ then archive/.
 * Returns null if no matching file is found. Re-implements discoverSprintFile
 * from execution-mode.ts inline (CR-027: avoid cross-command export).
 */
function findSprintFile(sprintId: string, cwd: string): string | null {
  const searchDirs = [
    path.join(cwd, '.cleargate', 'delivery', 'pending-sync'),
    path.join(cwd, '.cleargate', 'delivery', 'archive'),
  ];
  for (const dir of searchDirs) {
    if (!fs.existsSync(dir)) continue;
    let entries: string[];
    try {
      entries = fs.readdirSync(dir);
    } catch {
      continue;
    }
    const prefix = `${sprintId}_`;
    for (const entry of entries) {
      if ((entry.startsWith(prefix) || entry === `${sprintId}.md`) && entry.endsWith('.md')) {
        return path.join(dir, entry);
      }
    }
  }
  return null;
}

/**
 * Locate a work-item file by ID, searching pending-sync/ then archive/.
 * Returns null if not found. Re-implements findWorkItemFile from
 * assert_story_files.mjs inline to avoid a shell-out dependency here.
 */
function findWorkItemFileLocal(cwd: string, workItemId: string): string | null {
  const searchDirs = [
    path.join(cwd, '.cleargate', 'delivery', 'pending-sync'),
    path.join(cwd, '.cleargate', 'delivery', 'archive'),
  ];
  const prefix = `${workItemId}_`;
  for (const dir of searchDirs) {
    let entries: string[];
    try {
      entries = fs.readdirSync(dir);
    } catch {
      continue;
    }
    const match = entries.find((e) => (e.startsWith(prefix) || e === `${workItemId}.md`) && e.endsWith('.md'));
    if (match) return path.join(dir, match);
  }
  return null;
}

/**
 * Read the cached_gate_result from a file's frontmatter synchronously.
 *
 * CR-027: sync mirror of frontmatter-cache.ts:readCachedGate.
 * sprint preflight is sync; refactoring the handler to async cascades into
 * all 8 existing test scenarios. Inline 25-LOC sync implementation until
 * a future async refactor is justified.
 *
 * Returns null if the file is unreadable, has no frontmatter, or has no
 * cached_gate_result key (or if the key is null/absent).
 */
function readCachedGateSync(absPath: string): { pass: boolean; failing_criteria: { id: string; detail: string }[]; last_gate_check: string } | null {
  let raw: string;
  try {
    raw = fs.readFileSync(absPath, 'utf8');
  } catch {
    return null;
  }
  let fm: Record<string, unknown>;
  try {
    ({ fm } = parseFrontmatter(raw));
  } catch {
    return null;
  }
  const val = fm['cached_gate_result'];
  if (val === undefined || val === null) return null;
  if (typeof val === 'object' && !Array.isArray(val)) {
    const c = val as Record<string, unknown>;
    // If pass is null (SPRINT-20 anchor shape: {pass: null, ...}), treat as no cached result.
    // Per GOTCHA-4: {pass: null} = "gate check never ran" = null.
    if (c['pass'] === null || c['pass'] === undefined) return null;
    return {
      pass: Boolean(c['pass']),
      failing_criteria: Array.isArray(c['failing_criteria'])
        ? (c['failing_criteria'] as { id: string; detail: string }[])
        : [],
      last_gate_check: String(c['last_gate_check'] ?? ''),
    };
  }
  return null;
}

/**
 * Extract work-item IDs from a sprint plan file via assert_story_files.mjs --emit-json.
 * Returns string[] on success, or null on JSON parse failure.
 *
 * The execFn seam allows tests to inject canned JSON — no real shell-out in unit tests.
 * If execFn throws (e.g. script not found in test fixture dirs), returns [] so the
 * sprint plan self-check still runs (graceful degradation, not a hard failure).
 */
function extractInScopeWorkItemIds(
  sprintFilePath: string,
  cwd: string,
  execFn: (cmd: string, opts: { cwd: string; encoding: 'utf8' }) => string,
): string[] | null {
  const scriptPath = path.join(cwd, '.cleargate', 'scripts', 'assert_story_files.mjs');
  const cmd = `node "${scriptPath}" "${sprintFilePath}" --emit-json`;
  let stdout: string;
  try {
    stdout = execFn(cmd, { cwd, encoding: 'utf8' });
  } catch {
    // Graceful fallback: script not found or execution failed.
    // No children are enumerable; the sprint plan self-check still runs.
    return [];
  }
  try {
    const parsed = JSON.parse(stdout.trim()) as { workItemIds?: string[] };
    if (!Array.isArray(parsed.workItemIds)) return null;
    return parsed.workItemIds;
  } catch {
    return null;
  }
}

/** Check 5: per-item readiness gates pass for all items in scope. */
function checkPerItemReadinessGates(
  sprintId: string,
  cwd: string,
  execFn: (cmd: string, opts: { cwd: string; encoding: 'utf8' }) => string,
  mode: string,
): PreflightCheckResult {
  const name = 'Per-item readiness gates';

  // Under v1, this check is advisory-only: skip it (exit-0-equivalent).
  if (mode === 'v1') {
    return {
      name,
      pass: true,
      skipped: true,
      message: 'skipped (execution_mode: v1 — advisory only)',
    };
  }

  // Find the sprint plan file
  const sprintFilePath = findSprintFile(sprintId, cwd);
  if (!sprintFilePath) {
    return {
      name,
      pass: false,
      skipped: false,
      message: 'Per-item readiness gates: sprint plan file not found',
      hint: `Cannot locate ${sprintId}*.md in pending-sync/ or archive/.`,
    };
  }

  // Extract child work-item IDs from §1 Consolidated Deliverables
  const childIds = extractInScopeWorkItemIds(sprintFilePath, cwd, execFn);
  if (childIds === null) {
    return {
      name,
      pass: false,
      skipped: false,
      message: 'Per-item readiness gates: failed to parse sprint plan deliverables',
      hint: 'Verify "## 1. Consolidated Deliverables" exists and lists work-item IDs.',
    };
  }

  // Failures accumulate here: { id, reason, failing_criteria }
  const failures: { id: string; reason: string; failingCriteria: string[] }[] = [];
  let totalChecked = 0;

  // Helper: evaluate one work-item file
  const evaluateItem = (id: string, absPath: string): void => {
    // Read frontmatter for status + updated_at
    let fm: Record<string, unknown>;
    let raw: string;
    try {
      raw = fs.readFileSync(absPath, 'utf8');
      ({ fm } = parseFrontmatter(raw));
    } catch {
      // Unreadable — treat as fail
      totalChecked++;
      failures.push({ id, reason: 'unreadable', failingCriteria: [] });
      return;
    }

    // Skip terminal-status items (Done, Completed, Abandoned, Closed, Resolved)
    const status = String(fm['status'] ?? '');
    if (TERMINAL_STATUSES.has(status)) {
      return; // not counted in totalChecked
    }

    totalChecked++;

    // Read cached gate result
    const cachedGate = readCachedGateSync(absPath);
    const updatedAt = String(fm['updated_at'] ?? '');

    let reason: string | null = null;
    if (cachedGate === null) {
      reason = 'no cached_gate_result';
    } else if (cachedGate.pass !== true) {
      reason = 'pass=false';
    } else if (cachedGate.last_gate_check !== '' && updatedAt !== '' && cachedGate.last_gate_check < updatedAt) {
      reason = 'stale';
    }

    if (reason !== null) {
      failures.push({
        id,
        reason,
        failingCriteria: cachedGate?.failing_criteria?.map((c) => c.id) ?? [],
      });
    }
  };

  // Evaluate all child items
  for (const id of childIds) {
    const absPath = findWorkItemFileLocal(cwd, id);
    if (!absPath) {
      totalChecked++;
      failures.push({ id, reason: 'file not found', failingCriteria: [] });
    } else {
      evaluateItem(id, absPath);
    }
  }

  // Sprint plan self-check: the sprint plan itself is one of the items in scope
  // (per CR-027 §1: "the sprint plan is itself one of the items in scope")
  // assert_story_files.mjs --emit-json extracts only child IDs, so we check it separately.
  totalChecked++;
  const sprintGate = readCachedGateSync(sprintFilePath);
  let sprintRaw: string;
  let sprintFm: Record<string, unknown> = {};
  try {
    sprintRaw = fs.readFileSync(sprintFilePath, 'utf8');
    ({ fm: sprintFm } = parseFrontmatter(sprintRaw));
  } catch {
    // If unreadable, treat as fail (already handled by sprintFilePath check above)
  }
  const sprintUpdatedAt = String(sprintFm['updated_at'] ?? '');

  let sprintReason: string | null = null;
  if (sprintGate === null) {
    sprintReason = 'no cached_gate_result';
  } else if (sprintGate.pass !== true) {
    sprintReason = 'pass=false';
  } else if (sprintGate.last_gate_check !== '' && sprintUpdatedAt !== '' && sprintGate.last_gate_check < sprintUpdatedAt) {
    sprintReason = 'stale';
  }
  if (sprintReason !== null) {
    failures.push({
      id: sprintId,
      reason: sprintReason,
      failingCriteria: sprintGate?.failing_criteria?.map((c) => c.id) ?? [],
    });
  }

  if (failures.length === 0) {
    return {
      name,
      pass: true,
      skipped: false,
      message: 'all in-scope items pass readiness gates',
    };
  }

  // Build hint: bullet per failing item
  const bulletLines = failures
    .map(({ id, reason, failingCriteria }) => {
      const criteria = failingCriteria.length > 0 ? `: ${failingCriteria.join(', ')}` : ` (${reason})`;
      return `   - ${id}${criteria}`;
    })
    .join('\n');

  return {
    name,
    pass: false,
    skipped: false,
    message: `Per-item readiness gates: ${failures.length}/${totalChecked} items not ready`,
    hint: `${bulletLines}\n   Run: cleargate gate check <file> -v   for each`,
  };
}

// ─── Step 0: refresh per-item gate caches (CR-038) ───────────────────────────

/** Result of the Step 0 gate-cache refresh. */
interface RefreshResult {
  /** Work-item IDs whose gate check was successfully invoked. */
  refreshed: string[];
  /** Work-item IDs skipped because they carry a terminal status. */
  skipped: string[];
  /** Per-item errors: gate check threw or execFn rejected. */
  errors: { id: string; message: string }[];
}

/**
 * CR-038: refresh cached_gate_result for every in-scope work item before
 * Check 5 (CR-027) reads the cache. This eliminates the stale-cache-blocks-
 * preflight false-positive class.
 *
 * Algorithm:
 *   1. Locate sprint plan via findSprintFile.
 *   2. Extract child IDs via extractInScopeWorkItemIds (reuses the CR-027 seam).
 *   3. For each ID: skip if status ∈ TERMINAL_STATUSES; otherwise run
 *      `cleargate gate check "<path>"` via execFn (suppress stdout, capture error).
 *   4. Return { refreshed, skipped, errors }.
 *
 * Step 0 NEVER fails preflight on its own; errors are surfaced for visibility.
 * The actual block decision lives with Check 5 (CR-027) reading the now-fresh cache.
 */
function refreshScopedGateCaches(
  sprintId: string,
  cwd: string,
  execFn: (cmd: string, opts: { cwd: string; encoding: 'utf8' }) => string,
): RefreshResult {
  const result: RefreshResult = { refreshed: [], skipped: [], errors: [] };

  // Step 1: locate sprint plan
  const sprintFilePath = findSprintFile(sprintId, cwd);
  if (!sprintFilePath) {
    // No sprint file found — nothing to refresh; Step 5 will surface the error
    return result;
  }

  // Step 2: extract child IDs (+ sprint plan itself is handled by Step 5 self-check)
  const childIds = extractInScopeWorkItemIds(sprintFilePath, cwd, execFn);
  if (!childIds || childIds.length === 0) {
    return result;
  }

  // Step 3: for each child ID, resolve file and run gate check
  for (const id of childIds) {
    const absPath = findWorkItemFileLocal(cwd, id);
    if (!absPath) {
      // File not found — not an error for Step 0 (Step 5 will report it)
      continue;
    }

    // Skip terminal-status items (Done, Completed, Abandoned, etc.)
    let status = '';
    try {
      const raw = fs.readFileSync(absPath, 'utf8');
      const { fm } = parseFrontmatter(raw);
      status = String(fm['status'] ?? '');
    } catch {
      // Unreadable — skip gracefully
    }
    if (TERMINAL_STATUSES.has(status)) {
      result.skipped.push(id);
      continue;
    }

    // Run gate check via execFn; suppress stdout, capture errors
    try {
      execFn(`cleargate gate check "${absPath}"`, { cwd, encoding: 'utf8' });
      result.refreshed.push(id);
    } catch (err) {
      result.errors.push({ id, message: String(err) });
    }
  }

  return result;
}

/**
 * Emit the punch list to stdout (on pass) or stderr (on failure).
 * Format matches §1.2 R4 of STORY-025-02.
 */
function emitPunchList(
  sprintId: string,
  results: PreflightCheckResult[],
  stdoutFn: (s: string) => void,
  stderrFn: (s: string) => void,
): void {
  const failures = results.filter((r) => !r.pass && !r.skipped);

  if (failures.length === 0) {
    stdoutFn(`cleargate sprint preflight: all five checks pass for ${sprintId}`);
    return;
  }

  stderrFn(`cleargate sprint preflight: ${failures.length}/${results.length} checks failed for ${sprintId}`);
  stderrFn('');
  for (const r of results) {
    if (r.pass || r.skipped) {
      stderrFn(`  ✓ ${r.name} — ${r.message}`);
    } else {
      stderrFn(`  ✗ ${r.message}`);
      if (r.hint) {
        stderrFn(`    ${r.hint}`);
      }
    }
  }
}

/**
 * Main handler for `cleargate sprint preflight <sprint-id>`.
 *
 * Synchronous. All five checks always run before exitFn is called
 * (so the operator sees the full punch list on a single invocation).
 *
 * CR-027: added check #5 — per-item readiness gates pass for every
 * work-item ID in §1 Consolidated Deliverables.
 * CR-038: added Step 0 — refresh per-item cached_gate_result before Check 5
 * reads the cache, eliminating stale-cache false-positive blocks.
 */
export function sprintPreflightHandler(
  opts: { sprintId: string },
  cli?: SprintPreflightOptions,
): void {
  const stdoutFn = cli?.stdout ?? ((s: string) => process.stdout.write(s + '\n'));
  const stderrFn = cli?.stderr ?? ((s: string) => process.stderr.write(s + '\n'));
  const exitFn: (code: number) => never = cli?.exit ?? ((code: number): never => process.exit(code) as never);
  const cwd = cli?.cwd ?? process.cwd();

  // Validate sprint-id format: SPRINT-NN or SPRINT-NNN
  if (!/^SPRINT-\d{2,3}$/.test(opts.sprintId)) {
    stderrFn('Usage: cleargate sprint preflight <sprint-id>');
    stderrFn('  <sprint-id> must match SPRINT-NN or SPRINT-NNN (e.g. SPRINT-18)');
    return exitFn(2);
  }

  // Default execFn uses execSync from node:child_process.
  // execSync throws on non-zero exit, matching check contract.
  const execFn = cli?.execFn ?? ((cmd: string, execOpts: { cwd: string; encoding: 'utf8' }) =>
    execSync(cmd, { ...execOpts, stdio: 'pipe' })
  );

  // Read execution_mode once — passed to check #5 so it can apply v1/v2 severity.
  const mode = readSprintExecutionMode(opts.sprintId, { cwd });

  // Step 0 (CR-038): refresh per-item gate cache for all in-scope items.
  // Never fails preflight on its own; errors reported, decision lives with Check 5.
  const refresh = refreshScopedGateCaches(opts.sprintId, cwd, execFn);
  stdoutFn(`Step 0: refreshed ${refresh.refreshed.length} items, ${refresh.errors.length} errors.\n`);
  for (const e of refresh.errors) {
    stdoutFn(`  - ${e.id}: ${e.message}\n`);
  }

  // Run all five checks — all run regardless of individual failures
  const results: PreflightCheckResult[] = [
    checkPrevSprintCompleted(opts.sprintId, cwd),
    checkNoLeftoverWorktrees(cwd, execFn),
    checkSprintBranchRefFree(opts.sprintId, cwd, execFn),
    checkMainClean(cwd, execFn),
    checkPerItemReadinessGates(opts.sprintId, cwd, execFn, mode),
  ];

  emitPunchList(opts.sprintId, results, stdoutFn, stderrFn);

  const allPass = results.every((r) => r.pass || r.skipped);
  if (allPass) { stdoutFn('→ Load skill: sprint-execution'); }
  return exitFn(allPass ? 0 : 1);
}
