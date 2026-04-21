/**
 * sprint.ts — `cleargate sprint init|close` command handlers.
 *
 * STORY-013-08: CLI wrappers for sprint lifecycle scripts.
 * All handlers are v1-inert: when execution_mode is "v1", they print the
 * inert-mode message and exit 0. Under "v2", they shell out via run_script.sh.
 *
 * EPIC-013 §0 rule 5: never invoke `node .cleargate/scripts/*.mjs` directly —
 * always route through `run_script.sh`.
 *
 * FLASHCARD #tsup #cjs #esm: no top-level await.
 */

import * as path from 'node:path';
import { spawnSync } from 'node:child_process';
import {
  readSprintExecutionMode,
  printInertAndExit,
  type ExecutionModeOptions,
} from './execution-mode.js';

// ─── Public CLI option types ───────────────────────────────────────────────────

export interface SprintCliOptions extends ExecutionModeOptions {
  stdout?: (s: string) => void;
  stderr?: (s: string) => void;
  exit?: (code: number) => never;
  /** Override path to run_script.sh (test seam). */
  runScriptPath?: string;
  /** Override spawnSync (test seam). */
  spawnFn?: typeof spawnSync;
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
 */
export function sprintInitHandler(
  opts: { sprintId: string; stories: string },
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

  // v2: shell out via run_script.sh
  const runScript = resolveRunScript(cli ?? {});
  const args = ['init_sprint.mjs', opts.sprintId, '--stories', opts.stories];

  const result = spawnFn('bash', [runScript, ...args], { stdio: 'inherit' });

  if (result.error) {
    stderrFn(`[cleargate sprint init] error: ${result.error.message}`);
    return exitFn(1);
  }

  const code = result.status ?? 0;
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

  // v2: shell out via run_script.sh
  const runScript = resolveRunScript(cli ?? {});
  const args = ['close_sprint.mjs', opts.sprintId];
  // FLASHCARD #cli #commander #optional-key: omit the key when undefined; only
  // append --assume-ack when the flag was explicitly set (opts.assumeAck === true).
  if (opts.assumeAck === true) {
    args.push('--assume-ack');
  }

  const result = spawnFn('bash', [runScript, ...args], { stdio: 'inherit' });

  if (result.error) {
    stderrFn(`[cleargate sprint close] error: ${result.error.message}`);
    return exitFn(1);
  }

  const code = result.status ?? 0;
  return exitFn(code);
}
