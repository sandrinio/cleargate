/**
 * script-paths.ts — Shared helper for resolving cleargate script absolute paths.
 *
 * CR-050: Path B caller migration — all 8 production callers use resolveCleargateScript()
 * to build the absolute path for the target script. This avoids 8 inline path.join
 * repetitions and centralises the `.cleargate/scripts/<name>` convention.
 *
 * Usage:
 *   import { resolveCleargateScript } from '../lib/script-paths.js';
 *   const scriptPath = resolveCleargateScript({ cwd }, 'update_state.mjs');
 *   // → '<cwd>/.cleargate/scripts/update_state.mjs'
 */

import * as path from 'node:path';

export interface ScriptPathOpts {
  /** Working directory override; defaults to process.cwd(). */
  cwd?: string;
}

/**
 * Resolve an absolute path to a cleargate script in `.cleargate/scripts/<name>`.
 *
 * @param opts - Options containing optional cwd override.
 * @param scriptName - Script filename (e.g. 'update_state.mjs', 'pre_gate_runner.sh').
 * @returns Absolute path string.
 */
export function resolveCleargateScript(opts: ScriptPathOpts, scriptName: string): string {
  const cwd = opts.cwd ?? process.cwd();
  return path.join(cwd, '.cleargate', 'scripts', scriptName);
}
