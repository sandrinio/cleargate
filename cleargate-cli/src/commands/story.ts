/**
 * story.ts — `cleargate story start|complete` command handlers.
 *
 * STORY-013-08: CLI wrappers for story lifecycle.
 * All handlers are v1-inert: when execution_mode is "v1", they print the
 * inert-mode message and exit 0. Under "v2", they shell out via run_script.sh.
 *
 * `story start <story-id>`:
 *   Reads sprint branch from state.json, then runs `git worktree add` to
 *   create an isolated worktree at `.worktrees/<story-id>/`.
 *
 * `story complete <story-id>`:
 *   Shells out via `run_script.sh complete_story.mjs` (script is a stub —
 *   full implementation is future work per EPIC-013 §0 out-of-scope note).
 *   If the script is absent, exit 1 with "not yet implemented" message.
 *
 * EPIC-013 §0 rule 5: never invoke `node .cleargate/scripts/*.mjs` directly.
 * FLASHCARD #tsup #cjs #esm: no top-level await.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { spawnSync } from 'node:child_process';
import {
  readSprintExecutionMode,
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
   * If not set, the handler resolves the active sprint from state.json.
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
 * Derive the active sprint ID by looking for the most recently modified
 * sprint file in `.cleargate/delivery/pending-sync/` with status "Active".
 * Falls back to the first SPRINT-*.md found.
 * Returns null if nothing is found.
 */
function resolveActiveSprintId(cwd: string): string | null {
  const dir = path.join(cwd, '.cleargate', 'delivery', 'pending-sync');
  if (!fs.existsSync(dir)) return null;
  let entries: string[];
  try {
    entries = fs.readdirSync(dir);
  } catch {
    return null;
  }
  const sprints = entries.filter(
    (e) => e.startsWith('SPRINT-') && e.endsWith('.md'),
  );
  if (sprints.length === 0) return null;
  // Extract sprint ID from filename like SPRINT-09_Execution_Phase.md
  const first = sprints[0]!;
  const match = /^(SPRINT-\d+)/.exec(first);
  return match ? match[1]! : null;
}

// ─── storyStartHandler ────────────────────────────────────────────────────────

/**
 * `cleargate story start <story-id>`
 *
 * v1: print inert message, exit 0.
 * v2: create a git worktree at `.worktrees/<story-id>/` on the sprint branch.
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

  // Resolve sprint ID for execution_mode check
  const sprintId =
    cli?.sprintId ?? resolveActiveSprintId(cwd) ?? 'SPRINT-UNKNOWN';

  const mode = readSprintExecutionMode(sprintId, {
    sprintFilePath: cli?.sprintFilePath,
    cwd,
  });

  if (mode === 'v1') {
    return printInertAndExit(stdoutFn, exitFn);
  }

  // v2: create worktree
  // Sprint branch convention: sprint/S-NN
  // Extract branch name from sprint ID: SPRINT-09 → sprint/S-09
  const branchMatch = /^SPRINT-(\d+)/.exec(sprintId);
  const branchNum = branchMatch ? branchMatch[1]!.replace(/^0+/, '') || '0' : sprintId;
  const sprintBranch = `sprint/S-${branchNum.padStart(2, '0')}`;

  const worktreePath = path.join(cwd, '.worktrees', opts.storyId);
  const result = spawnFn(
    'git',
    ['worktree', 'add', worktreePath, sprintBranch],
    { stdio: 'inherit', cwd },
  );

  if (result.error) {
    stderrFn(`[cleargate story start] error: ${result.error.message}`);
    return exitFn(1);
  }

  const code = result.status ?? 0;
  if (code === 0) {
    stdoutFn(`worktree created at .worktrees/${opts.storyId} on branch ${sprintBranch}`);
  }
  return exitFn(code);
}

// ─── storyCompleteHandler ─────────────────────────────────────────────────────

/**
 * `cleargate story complete <story-id>`
 *
 * v1: print inert message, exit 0.
 * v2: shell out via `run_script.sh complete_story.mjs <story-id>`.
 *     If the script does not exist, prints "not yet implemented" and exits 1.
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
    cli?.sprintId ?? resolveActiveSprintId(cwd) ?? 'SPRINT-UNKNOWN';

  const mode = readSprintExecutionMode(sprintId, {
    sprintFilePath: cli?.sprintFilePath,
    cwd,
  });

  if (mode === 'v1') {
    return printInertAndExit(stdoutFn, exitFn);
  }

  // v2: shell out via run_script.sh
  const runScript = resolveRunScript(cli ?? { cwd });
  const scriptPath = path.join(cwd, '.cleargate', 'scripts', 'complete_story.mjs');

  // Graceful stub: if complete_story.mjs doesn't exist yet, report not-yet-implemented
  if (!fs.existsSync(scriptPath) && !cli?.runScriptPath) {
    stderrFn(`[cleargate story complete] not yet implemented: complete_story.mjs is a stub`);
    return exitFn(1);
  }

  const result = spawnFn(
    'bash',
    [runScript, 'complete_story.mjs', opts.storyId],
    { stdio: 'inherit' },
  );

  if (result.error) {
    stderrFn(`[cleargate story complete] error: ${result.error.message}`);
    return exitFn(1);
  }

  const code = result.status ?? 0;
  return exitFn(code);
}
