/**
 * state.ts — `cleargate state update|validate` command handlers.
 *
 * STORY-013-08: CLI wrappers for state management scripts.
 * All handlers are v1-inert: when execution_mode is "v1", they print the
 * inert-mode message and exit 0. Under "v2", they shell out via run_script.sh.
 *
 * EPIC-013 §0 rule 5: never invoke `node .cleargate/scripts/*.mjs` directly.
 * FLASHCARD #tsup #cjs #esm: no top-level await.
 */

import * as path from 'node:path';
import { spawnSync } from 'node:child_process';
import {
  readSprintExecutionMode,
  resolveSprintIdFromSentinel,
  printInertAndExit,
  type ExecutionModeOptions,
} from './execution-mode.js';

// ─── Public CLI option types ───────────────────────────────────────────────────

export interface StateCliOptions extends ExecutionModeOptions {
  stdout?: (s: string) => void;
  stderr?: (s: string) => void;
  exit?: (code: number) => never;
  /** Override path to run_script.sh (test seam). */
  runScriptPath?: string;
  /** Override spawnSync (test seam). */
  spawnFn?: typeof spawnSync;
  /**
   * Sprint ID for execution_mode discovery. Required for state update/validate.
   */
  sprintId?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function defaultExit(code: number): never {
  return process.exit(code) as never;
}

function resolveRunScript(opts: StateCliOptions): string {
  if (opts.runScriptPath) return opts.runScriptPath;
  const cwd = opts.cwd ?? process.cwd();
  return path.join(cwd, '.cleargate', 'scripts', 'run_script.sh');
}

// ─── stateUpdateHandler ───────────────────────────────────────────────────────

/**
 * `cleargate state update <story-id> <new-state>`
 *
 * v1: print inert message, exit 0.
 * v2: run `run_script.sh update_state.mjs <story-id> <new-state>`
 */
export function stateUpdateHandler(
  opts: { storyId: string; newState: string },
  cli?: StateCliOptions,
): void {
  const stdoutFn = cli?.stdout ?? ((s: string) => process.stdout.write(s + '\n'));
  const stderrFn = cli?.stderr ?? ((s: string) => process.stderr.write(s + '\n'));
  const exitFn: (code: number) => never = cli?.exit ?? defaultExit;
  const spawnFn = cli?.spawnFn ?? spawnSync;

  // Sprint ID resolution order:
  // 1. Explicit --sprint <id> from CLI (cli?.sprintId)
  // 2. .cleargate/sprint-runs/.active sentinel
  // 3. Fall through to SPRINT-UNKNOWN (v1-inert)
  const cwd = cli?.cwd;
  const sprintId =
    cli?.sprintId ?? resolveSprintIdFromSentinel(cwd) ?? 'SPRINT-UNKNOWN';

  const mode = readSprintExecutionMode(sprintId, {
    sprintFilePath: cli?.sprintFilePath,
    cwd,
  });

  if (mode === 'v1') {
    return printInertAndExit(stdoutFn, exitFn);
  }

  // v2: shell out via run_script.sh
  const runScript = resolveRunScript(cli ?? {});
  const result = spawnFn(
    'bash',
    [runScript, 'update_state.mjs', opts.storyId, opts.newState],
    { stdio: 'inherit' },
  );

  if (result.error) {
    stderrFn(`[cleargate state update] error: ${result.error.message}`);
    return exitFn(1);
  }

  const code = result.status ?? 0;
  return exitFn(code);
}

// ─── stateValidateHandler ─────────────────────────────────────────────────────

/**
 * `cleargate state validate <sprint-id>`
 *
 * v1: print inert message, exit 0.
 * v2: run `run_script.sh validate_state.mjs <sprint-id>`
 */
export function stateValidateHandler(
  opts: { sprintId: string },
  cli?: StateCliOptions,
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

  // v2: shell out via run_script.sh
  const runScript = resolveRunScript(cli ?? {});
  const result = spawnFn(
    'bash',
    [runScript, 'validate_state.mjs', opts.sprintId],
    { stdio: 'inherit' },
  );

  if (result.error) {
    stderrFn(`[cleargate state validate] error: ${result.error.message}`);
    return exitFn(1);
  }

  const code = result.status ?? 0;
  return exitFn(code);
}
