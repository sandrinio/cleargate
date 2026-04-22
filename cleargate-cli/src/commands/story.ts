/**
 * story.ts — `cleargate story start|complete` command handlers.
 *
 * STORY-014-07: atomic orchestration of worktree + branch + merge + state.
 *
 * Both handlers are v1-inert: when execution_mode is "v1", they print the
 * inert-mode message and exit 0. Under "v2", they orchestrate the full
 * worktree/merge sequence via `spawnSync` + a second-pass `state.json` write.
 *
 * `story start <story-id>`:
 *   1. `git worktree add <cwd>/.worktrees/<ID> -b story/<ID> <sprintBranch>`
 *   2. `bash run_script.sh update_state.mjs <ID> Bouncing`
 *   3. Re-read `state.json`, set `stories[<ID>].worktree` field, atomic write.
 *
 * `story complete <story-id>`:
 *   1. `git rev-list --count <sprintBranch>..story/<ID>` — if 0 → abort.
 *   2. `git -C <cwd> checkout <sprintBranch>`
 *   3. `git merge story/<ID> --no-ff -m "merge: story/<ID> → <sprintBranch>"`
 *      — on conflict: leave markers, print `git merge --abort` suggestion, exit 1.
 *   4. `git worktree remove .worktrees/<ID>`
 *   5. `git branch -d story/<ID>`
 *   6. `bash run_script.sh update_state.mjs <ID> Done`
 *
 * EPIC-013 §0 rule 5: never invoke `node .cleargate/scripts/*.mjs` directly.
 * FLASHCARD #tsup #cjs #esm: no top-level await.
 * FLASHCARD #cli #test-seam #exit: exitFn only at handler top-level.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { spawnSync } from 'node:child_process';
import {
  readSprintExecutionMode,
  resolveSprintIdFromSentinel,
  printInertAndExit,
  type ExecutionModeOptions,
} from './execution-mode.js';

// ─── Public CLI option types ───────────────────────────────────────────────────

export interface StoryCliOptions extends ExecutionModeOptions {
  stdout?: (s: string) => void;
  stderr?: (s: string) => void;
  exit?: (code: number) => never;
  /** Override path to run_script.sh (test seam). */
  runScriptPath?: string;
  /** Override spawnSync (test seam). */
  spawnFn?: typeof spawnSync;
  /**
   * Sprint ID override for execution_mode discovery.
   * If absent, the handler reads `.cleargate/sprint-runs/.active`.
   */
  sprintId?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function defaultExit(code: number): never {
  return process.exit(code) as never;
}

function resolveRunScript(opts: StoryCliOptions): string {
  if (opts.runScriptPath) return opts.runScriptPath;
  const cwd = opts.cwd ?? process.cwd();
  return path.join(cwd, '.cleargate', 'scripts', 'run_script.sh');
}

/**
 * Derive sprint branch from sprint ID.
 * `SPRINT-10` → `sprint/S-10` (zero-padded 2-digit).
 */
function deriveSprintBranch(sprintId: string): string {
  const match = /^SPRINT-(\d+)/.exec(sprintId);
  const branchNum = match ? match[1]!.replace(/^0+/, '') || '0' : sprintId;
  return `sprint/S-${branchNum.padStart(2, '0')}`;
}

/**
 * Atomic write: tmp + rename. Inlined per plan (do not import from .mjs).
 * Caller passes the raw JSON-stringified text (or any string content).
 */
function atomicWriteString(filePath: string, text: string): void {
  const tmpFile = `${filePath}.tmp.${process.pid}`;
  fs.writeFileSync(tmpFile, text, 'utf8');
  fs.renameSync(tmpFile, filePath);
}

/**
 * Path to the sprint's state.json. The file may not exist yet under v2
 * when the sprint was just initialized — callers must guard.
 */
function stateJsonPath(cwd: string, sprintId: string): string {
  return path.join(cwd, '.cleargate', 'sprint-runs', sprintId, 'state.json');
}

// ─── storyStartHandler ────────────────────────────────────────────────────────

/**
 * `cleargate story start <story-id>`
 *
 * v1: print inert message, exit 0.
 * v2: 3-step spawn sequence + second-pass state.json mutation.
 */
export function storyStartHandler(
  opts: { storyId: string },
  cli?: StoryCliOptions,
): void {
  const stdoutFn = cli?.stdout ?? ((s: string) => process.stdout.write(s + '\n'));
  const stderrFn = cli?.stderr ?? ((s: string) => process.stderr.write(s + '\n'));
  const exitFn: (code: number) => never = cli?.exit ?? defaultExit;
  const spawnFn = cli?.spawnFn ?? spawnSync;
  const cwd = cli?.cwd ?? process.cwd();

  // Resolve sprint ID: explicit override, else sentinel-fallback via .active.
  const sprintId =
    cli?.sprintId ?? resolveSprintIdFromSentinel(cwd) ?? 'SPRINT-UNKNOWN';

  const mode = readSprintExecutionMode(sprintId, {
    sprintFilePath: cli?.sprintFilePath,
    cwd,
  });

  if (mode === 'v1') {
    return printInertAndExit(stdoutFn, exitFn);
  }

  // ── v2: 3-step orchestration ───────────────────────────────────────────────
  const sprintBranch = deriveSprintBranch(sprintId);
  const worktreePath = path.join(cwd, '.worktrees', opts.storyId);
  const storyBranch = `story/${opts.storyId}`;

  // Step 1: git worktree add <path> -b story/<ID> <sprintBranch>
  // FLASHCARD (plan): flag order matters on macOS git — PATH before -b.
  const step1 = spawnFn(
    'git',
    ['worktree', 'add', worktreePath, '-b', storyBranch, sprintBranch],
    { stdio: 'pipe', cwd, encoding: 'utf8' },
  );
  if (step1.error) {
    stderrFn(`[cleargate story start] step 1 (git worktree add) error: ${step1.error.message}`);
    return exitFn(1);
  }
  if ((step1.status ?? 0) !== 0) {
    stderrFn(`[cleargate story start] step 1 (git worktree add) failed with exit ${step1.status}`);
    if (step1.stderr) stderrFn(String(step1.stderr));
    return exitFn(step1.status ?? 1);
  }

  // Step 2: run_script.sh update_state.mjs <ID> Bouncing
  const runScript = resolveRunScript(cli ?? { cwd });
  const step2 = spawnFn(
    'bash',
    [runScript, 'update_state.mjs', opts.storyId, 'Bouncing'],
    { stdio: 'pipe', cwd, encoding: 'utf8' },
  );
  if (step2.error) {
    stderrFn(`[cleargate story start] step 2 (update_state.mjs) error: ${step2.error.message}`);
    return exitFn(1);
  }
  if ((step2.status ?? 0) !== 0) {
    stderrFn(`[cleargate story start] step 2 (update_state.mjs) failed with exit ${step2.status}`);
    if (step2.stderr) stderrFn(String(step2.stderr));
    return exitFn(step2.status ?? 1);
  }

  // Step 3: re-read state.json (fresh bytes AFTER update_state.mjs), set
  // stories[<ID>].worktree = ".worktrees/<ID>", atomic write.
  const stateFile = stateJsonPath(cwd, sprintId);
  if (!fs.existsSync(stateFile)) {
    stderrFn(`[cleargate story start] step 3: state.json not found at ${stateFile}`);
    return exitFn(1);
  }
  let state: {
    stories?: Record<string, { worktree?: string | null } & Record<string, unknown>>;
  } & Record<string, unknown>;
  try {
    state = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
  } catch (err) {
    stderrFn(`[cleargate story start] step 3: failed to parse state.json: ${(err as Error).message}`);
    return exitFn(1);
  }

  state.stories = state.stories ?? {};
  const existing = state.stories[opts.storyId] ?? {
    state: 'Bouncing',
    qa_bounces: 0,
    arch_bounces: 0,
    worktree: null,
    updated_at: new Date().toISOString(),
    notes: '',
  };
  existing.worktree = `.worktrees/${opts.storyId}`;
  state.stories[opts.storyId] = existing;

  try {
    atomicWriteString(stateFile, JSON.stringify(state, null, 2) + '\n');
  } catch (err) {
    stderrFn(`[cleargate story start] step 3: atomic write failed: ${(err as Error).message}`);
    return exitFn(1);
  }

  stdoutFn(`worktree created at .worktrees/${opts.storyId} on branch ${storyBranch}`);
  return exitFn(0);
}

// ─── storyCompleteHandler ─────────────────────────────────────────────────────

/**
 * `cleargate story complete <story-id>`
 *
 * v1: print inert message, exit 0.
 * v2: 6-step orchestration (pre-flight, checkout, merge, worktree remove,
 *     branch -d, update_state.mjs Done).
 */
export function storyCompleteHandler(
  opts: { storyId: string },
  cli?: StoryCliOptions,
): void {
  const stdoutFn = cli?.stdout ?? ((s: string) => process.stdout.write(s + '\n'));
  const stderrFn = cli?.stderr ?? ((s: string) => process.stderr.write(s + '\n'));
  const exitFn: (code: number) => never = cli?.exit ?? defaultExit;
  const spawnFn = cli?.spawnFn ?? spawnSync;
  const cwd = cli?.cwd ?? process.cwd();

  const sprintId =
    cli?.sprintId ?? resolveSprintIdFromSentinel(cwd) ?? 'SPRINT-UNKNOWN';

  const mode = readSprintExecutionMode(sprintId, {
    sprintFilePath: cli?.sprintFilePath,
    cwd,
  });

  if (mode === 'v1') {
    return printInertAndExit(stdoutFn, exitFn);
  }

  // ── v2: 6-step orchestration ───────────────────────────────────────────────
  const sprintBranch = deriveSprintBranch(sprintId);
  const storyBranch = `story/${opts.storyId}`;
  const worktreeRel = path.join('.worktrees', opts.storyId);

  // Step 1: pre-flight rev-list — refuse if 0 commits on story branch.
  const step1 = spawnFn(
    'git',
    ['rev-list', '--count', `${sprintBranch}..${storyBranch}`],
    { stdio: 'pipe', cwd, encoding: 'utf8' },
  );
  if (step1.error) {
    stderrFn(`[cleargate story complete] step 1 (rev-list) error: ${step1.error.message}`);
    return exitFn(1);
  }
  if ((step1.status ?? 0) !== 0) {
    stderrFn(`[cleargate story complete] step 1 (rev-list) failed with exit ${step1.status}`);
    if (step1.stderr) stderrFn(String(step1.stderr));
    return exitFn(step1.status ?? 1);
  }
  const count = parseInt(String(step1.stdout ?? '0').trim(), 10);
  if (!Number.isFinite(count) || count <= 0) {
    stderrFn('no commits on story branch — nothing to merge');
    return exitFn(1);
  }

  // Step 2: checkout sprint branch.
  const step2 = spawnFn(
    'git',
    ['-C', cwd, 'checkout', sprintBranch],
    { stdio: 'pipe', cwd, encoding: 'utf8' },
  );
  if (step2.error) {
    stderrFn(`[cleargate story complete] step 2 (checkout) error: ${step2.error.message}`);
    return exitFn(1);
  }
  if ((step2.status ?? 0) !== 0) {
    stderrFn(`[cleargate story complete] step 2 (checkout ${sprintBranch}) failed with exit ${step2.status}`);
    if (step2.stderr) stderrFn(String(step2.stderr));
    return exitFn(step2.status ?? 1);
  }

  // Step 3: merge story/<ID> --no-ff -m "..."
  // On conflict: leave markers, print `git merge --abort` suggestion, exit 1.
  const mergeMsg = `merge: ${storyBranch} → ${sprintBranch}`;
  const step3 = spawnFn(
    'git',
    ['merge', storyBranch, '--no-ff', '-m', mergeMsg],
    { stdio: 'pipe', cwd, encoding: 'utf8' },
  );
  if (step3.error) {
    stderrFn(`[cleargate story complete] step 3 (merge) error: ${step3.error.message}`);
    return exitFn(1);
  }
  if ((step3.status ?? 0) !== 0) {
    stderrFn(`[cleargate story complete] merge conflict — run \`git merge --abort\` then re-run after resolution`);
    if (step3.stderr) stderrFn(String(step3.stderr));
    return exitFn(1);
  }

  // Step 4: git worktree remove .worktrees/<ID>
  const step4 = spawnFn(
    'git',
    ['worktree', 'remove', worktreeRel],
    { stdio: 'pipe', cwd, encoding: 'utf8' },
  );
  if (step4.error) {
    stderrFn(`[cleargate story complete] step 4 (worktree remove) error: ${step4.error.message}`);
    return exitFn(1);
  }
  if ((step4.status ?? 0) !== 0) {
    stderrFn(`[cleargate story complete] step 4 (worktree remove ${worktreeRel}) failed with exit ${step4.status}`);
    if (step4.stderr) stderrFn(String(step4.stderr));
    return exitFn(step4.status ?? 1);
  }

  // Step 5: git branch -d story/<ID>
  const step5 = spawnFn(
    'git',
    ['branch', '-d', storyBranch],
    { stdio: 'pipe', cwd, encoding: 'utf8' },
  );
  if (step5.error) {
    stderrFn(`[cleargate story complete] step 5 (branch -d) error: ${step5.error.message}`);
    return exitFn(1);
  }
  if ((step5.status ?? 0) !== 0) {
    stderrFn(`[cleargate story complete] step 5 (branch -d ${storyBranch}) failed with exit ${step5.status}`);
    if (step5.stderr) stderrFn(String(step5.stderr));
    return exitFn(step5.status ?? 1);
  }

  // Step 6: run_script.sh update_state.mjs <ID> Done
  const runScript = resolveRunScript(cli ?? { cwd });
  const step6 = spawnFn(
    'bash',
    [runScript, 'update_state.mjs', opts.storyId, 'Done'],
    { stdio: 'pipe', cwd, encoding: 'utf8' },
  );
  if (step6.error) {
    stderrFn(`[cleargate story complete] step 6 (update_state.mjs) error: ${step6.error.message}`);
    return exitFn(1);
  }
  if ((step6.status ?? 0) !== 0) {
    stderrFn(`[cleargate story complete] step 6 (update_state.mjs) failed with exit ${step6.status}`);
    if (step6.stderr) stderrFn(String(step6.stderr));
    return exitFn(step6.status ?? 1);
  }

  stdoutFn(`merged ${storyBranch} → ${sprintBranch}; worktree + branch removed; state = Done`);
  return exitFn(0);
}
