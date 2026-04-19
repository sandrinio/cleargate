/**
 * conflicts.ts — STORY-010-04
 *
 * `cleargate conflicts` — read-only command that reads .cleargate/.conflicts.json
 * and prints unresolved items with one-line resolution hints.
 *
 * Exit 0 when unresolved: [], exit 1 otherwise.
 *
 * No mutations. No top-level await (FLASHCARD #tsup #cjs #esm).
 */

import * as fsPromises from 'node:fs/promises';
import * as path from 'node:path';
import type { ConflictsJson, ConflictEntry } from './sync.js';

export interface ConflictsOptions {
  projectRoot?: string;
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
  const stdout = opts.stdout ?? ((s: string) => process.stdout.write(s));
  const exit = opts.exit ?? ((c: number): never => process.exit(c));

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
