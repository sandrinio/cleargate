import { spawnSync } from 'node:child_process';

export type GitRunner = (cmd: string, args: string[]) => string;

/**
 * A2 helper: return the git SHA of the last commit touching rawPath.
 * Returns null when the file is untracked (empty stdout, exit 0).
 * Accepts an optional `runner` test seam.
 */
export function getGitSha(rawPath: string, runner?: GitRunner): string | null {
  const run = runner ?? defaultRunner;
  const out = run('git', ['log', '-1', '--format=%H', '--', rawPath]).trim();
  return out.length > 0 ? out : null;
}

function defaultRunner(cmd: string, args: string[]): string {
  const result = spawnSync(cmd, args, { encoding: 'utf8' });
  return result.stdout ?? '';
}
