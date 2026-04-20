/**
 * conflicts.ts — STORY-010-04 / updated STORY-011-01
 *
 * `cleargate conflicts` — read-only command that reads .cleargate/.conflicts.json
 * and prints unresolved items with one-line resolution hints.
 *
 * Exit 0 when unresolved: [], exit 1 otherwise.
 *
 * --refresh flag: force-invalidate the acquire cache and rotate the stored
 * refresh token even if the cached access token is still valid. This is the
 * only MCP call conflicts makes.
 *
 * No mutations (besides keychain rotation on --refresh). No top-level await
 * (FLASHCARD #tsup #cjs #esm).
 */

import * as fsPromises from 'node:fs/promises';
import * as path from 'node:path';
import type { ConflictsJson, ConflictEntry } from './sync.js';
import { acquireAccessToken } from '../auth/acquire.js';
import { loadConfig } from '../config.js';

export interface ConflictsOptions {
  projectRoot?: string;
  /** --refresh: bypass single-flight cache and force a new /auth/refresh. */
  refresh?: boolean;
  /** Profile for token acquisition. Defaults to 'default'. */
  profile?: string;
  /** Test seam: override process.env lookup */
  env?: NodeJS.ProcessEnv;
  /** Test seam: stdout writer */
  stdout?: (s: string) => void;
  /** Test seam: stderr writer */
  stderr?: (s: string) => void;
  /** Test seam: override process.exit */
  exit?: (code: number) => never;
}

const RESOLUTION_HINTS: Record<string, string> = {
  'local-delete-remote-edit': 'remote-delete: resurrect or delete remote?',
  'remote-delete-local-edit': 'local-edit: push your changes or accept remote deletion?',
  'refuse': 'manual resolution required — re-run sync after resolving',
  'halt': 'unknown conflict shape — file a ClearGate bug',
};

function getHint(entry: ConflictEntry): string {
  return RESOLUTION_HINTS[entry.state] ?? RESOLUTION_HINTS[entry.resolution] ?? `resolve and re-run sync`;
}

export async function conflictsHandler(opts: ConflictsOptions = {}): Promise<void> {
  const projectRoot = opts.projectRoot ?? process.cwd();
  const env = opts.env ?? process.env;
  const stdout = opts.stdout ?? ((s: string) => process.stdout.write(s));
  const exit = opts.exit ?? ((c: number): never => process.exit(c));

  // ── --refresh: force-invalidate the cache and rotate the keychain token ─────
  if (opts.refresh) {
    let baseUrl: string | undefined = env['CLEARGATE_MCP_URL'];
    if (!baseUrl || !baseUrl.trim()) {
      try {
        const cfg = loadConfig({ env });
        baseUrl = cfg.mcpUrl;
      } catch {
        // Config absent — skip refresh; command proceeds without token rotation
      }
    }
    if (baseUrl && baseUrl.trim()) {
      try {
        await acquireAccessToken({
          mcpUrl: baseUrl.trim(),
          profile: opts.profile ?? 'default',
          forceRefresh: true,
          env,
        });
      } catch {
        // Refresh errors are non-fatal for `conflicts` — proceed to print conflicts
      }
    }
  }

  const conflictsFile = path.join(projectRoot, '.cleargate', '.conflicts.json');

  let data: ConflictsJson;
  try {
    const raw = await fsPromises.readFile(conflictsFile, 'utf8');
    data = JSON.parse(raw) as ConflictsJson;
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      stdout('No conflicts file found. Run `cleargate sync` first.\n');
      exit(0);
      return;
    }
    throw err;
  }

  const unresolved = data.unresolved ?? [];

  if (unresolved.length === 0) {
    stdout('No unresolved conflicts.\n');
    exit(0);
    return;
  }

  stdout(`Unresolved conflicts (${unresolved.length}):\n`);
  stdout(`Generated: ${data.generated_at}  Sprint: ${data.sprint_id}\n\n`);

  for (const item of unresolved) {
    const hint = getHint(item);
    stdout(`  ${item.item_id.padEnd(20)} ${item.state.padEnd(30)} ${hint}\n`);
  }

  stdout('\nRe-run `cleargate sync` after resolving conflicts.\n');
  exit(1);
}
