/**
 * sync-log.ts (command) — STORY-010-04
 *
 * `cleargate sync-log` — filter/print wrapper over readSyncLog() from M1.
 *
 * Flags: --actor, --op, --target, --limit N (default 50). Newest-first guaranteed by lib.
 *
 * No top-level await (FLASHCARD #tsup #cjs #esm).
 */

import { resolveActiveSprintDir, readSyncLog, type SyncLogOp, type SyncLogEntry } from '../lib/sync-log.js';

export interface SyncLogCommandOptions {
  actor?: string;
  op?: string;
  target?: string;
  limit?: number;
  projectRoot?: string;
  /** Test seam: stdout writer */
  stdout?: (s: string) => void;
  /** Test seam: stderr writer */
  stderr?: (s: string) => void;
}

export async function syncLogHandler(opts: SyncLogCommandOptions = {}): Promise<void> {
  const projectRoot = opts.projectRoot ?? process.cwd();
  const stdout = opts.stdout ?? ((s: string) => process.stdout.write(s));
  const stderr = opts.stderr ?? ((s: string) => process.stderr.write(s));
  const limit = opts.limit ?? 50;

  const sprintRoot = resolveActiveSprintDir(projectRoot);

  // Validate --op value if provided
  const validOps = new Set<SyncLogOp>([
    'push', 'pull', 'pull-intake', 'push-revert', 'sync-status', 'conflict-remote-wins', 'conflict-refused',
  ]);
  let opFilter: SyncLogOp | undefined;
  if (opts.op !== undefined) {
    if (!validOps.has(opts.op as SyncLogOp)) {
      stderr(`Warning: unknown op "${opts.op}". Valid ops: ${[...validOps].join(', ')}\n`);
    } else {
      opFilter = opts.op as SyncLogOp;
    }
  }

  const entries = await readSyncLog(sprintRoot, {
    actor: opts.actor,
    op: opFilter,
    target: opts.target,
  });

  const limited = entries.slice(0, limit);

  if (limited.length === 0) {
    stdout('No sync-log entries match the given filters.\n');
    return;
  }

  for (const entry of limited) {
    stdout(formatEntry(entry) + '\n');
  }
}

function formatEntry(entry: SyncLogEntry): string {
  const parts: string[] = [
    entry.ts,
    entry.actor,
    entry.op.padEnd(20),
    entry.target.padEnd(24),
    entry.result,
  ];
  if (entry.remote_id) parts.push(`remote=${entry.remote_id}`);
  if (entry.detail) parts.push(`detail=${entry.detail}`);
  return parts.join('  ');
}
