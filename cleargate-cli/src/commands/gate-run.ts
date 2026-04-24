/**
 * gate-run.ts — `cleargate gate <name>` command handler.
 *
 * STORY-018-03: Config-driven gates. Runs a shell command configured in
 * `.cleargate/config.yml` under `gates.<name>`. Known gate names:
 * precommit, test, typecheck, lint.
 *
 * FLASHCARD #tsup #cjs #esm: no top-level await.
 * FLASHCARD #cli #test-seam #exit: exit seam throws in tests; extract logic
 *   into value-returning internal fn, call exitFn only at handler top-level.
 * FLASHCARD #cli #commander #optional-key: opts.strict undefined must be
 *   checked with === true, not truthy check.
 */

import { spawnSync } from 'node:child_process';
import { loadWikiConfig } from '../lib/wiki-config.js';
import type { WikiConfig } from '../lib/wiki-config.js';

// ─── Public types ─────────────────────────────────────────────────────────────

export interface GateRunCliOptions {
  cwd?: string;
  stdout?: (s: string) => void;
  stderr?: (s: string) => void;
  exit?: (code: number) => never;
  spawnFn?: typeof spawnSync;
  configLoader?: (repoRoot: string) => WikiConfig;
}

const KNOWN_GATES = ['precommit', 'test', 'typecheck', 'lint'] as const;
type KnownGate = typeof KNOWN_GATES[number];

// ─── gateRunHandler ───────────────────────────────────────────────────────────

/**
 * Handle `cleargate gate <name>`.
 *
 * - Validates name is in KNOWN_GATES (exit 2 if not).
 * - Loads config via configLoader (defaults to loadWikiConfig from cwd).
 * - If gate not configured: friendly message + exit 0 (default) or exit 1 (--strict).
 * - If configured: spawnSync with shell:true, propagate exit code.
 */
export function gateRunHandler(
  name: string,
  opts: { strict?: boolean },
  cli?: GateRunCliOptions,
): void {
  const stdoutFn = cli?.stdout ?? ((s: string) => process.stdout.write(s + '\n'));
  const stderrFn = cli?.stderr ?? ((s: string) => process.stderr.write(s + '\n'));
  const exitFn: (code: number) => never =
    cli?.exit ?? ((code: number) => process.exit(code) as never);
  const spawnFn = cli?.spawnFn ?? spawnSync;
  const cwd = cli?.cwd ?? process.cwd();
  const configLoaderFn = cli?.configLoader ?? loadWikiConfig;

  // Validate gate name
  if (!(KNOWN_GATES as readonly string[]).includes(name)) {
    stderrFn(
      `unknown gate name '${name}' — must be one of: precommit, test, typecheck, lint`,
    );
    return exitFn(2);
  }

  // Load config
  const config = configLoaderFn(cwd);
  const cmd = config.gates[name as KnownGate];

  if (cmd == null) {
    const msg = `gate "${name}" not configured — add gates.${name} to .cleargate/config.yml (see cleargate-planning/.cleargate/config.example.yml)`;
    if (opts.strict === true) {
      stderrFn(msg);
      return exitFn(1);
    } else {
      stdoutFn(msg);
      return exitFn(0);
    }
  }

  // Run the configured command
  const result = spawnFn(cmd, { shell: true, stdio: 'inherit', cwd });

  if (result.error) {
    stderrFn(`[cleargate gate ${name}] error: ${result.error.message}`);
    return exitFn(1);
  }

  return exitFn(result.status ?? 0);
}
