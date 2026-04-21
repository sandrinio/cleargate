/**
 * execution-mode.ts — reads `execution_mode` from a Sprint Plan frontmatter.
 *
 * STORY-013-08: provides a test seam via `sprintFilePath` override so tests
 * can inject synthetic SPRINT-99.md fixture without touching live state.
 *
 * FLASHCARD #cli #test-seam #exit: exit seam throws in tests — keep exitFn
 * only at handler top-level (not inside helper functions).
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

const V1_INERT_MESSAGE =
  'v1 mode active — command inert. Set execution_mode: v2 in sprint frontmatter to enable.';

export type ExecutionMode = 'v1' | 'v2';

export interface ExecutionModeOptions {
  /** Absolute path to the sprint file. Overrides auto-discovery. */
  sprintFilePath?: string;
  /** Working directory for relative-path resolution. Defaults to process.cwd(). */
  cwd?: string;
}

/**
 * Parse just the YAML frontmatter from a markdown file.
 * Returns the raw frontmatter block as a plain object.
 * On any parse failure, returns an empty object.
 */
function parseFrontmatterSimple(raw: string): Record<string, unknown> {
  const match = /^---\r?\n([\s\S]*?)\r?\n---/.exec(raw);
  if (!match) return {};
  const block = match[1]!;
  const result: Record<string, unknown> = {};
  for (const line of block.split('\n')) {
    const kv = /^([^:]+):\s*(.*)$/.exec(line.trim());
    if (!kv) continue;
    const key = kv[1]!.trim();
    const val = kv[2]!.trim().replace(/^["']|["']$/g, '');
    result[key] = val;
  }
  return result;
}

/**
 * Discover the sprint file for a given sprint ID.
 * Looks in `.cleargate/delivery/pending-sync/SPRINT-{id}_*.md`
 * and `.cleargate/delivery/archive/SPRINT-{id}_*.md`.
 *
 * Returns null if no matching file is found.
 */
function discoverSprintFile(sprintId: string, cwd: string): string | null {
  const searchDirs = [
    path.join(cwd, '.cleargate', 'delivery', 'pending-sync'),
    path.join(cwd, '.cleargate', 'delivery', 'archive'),
  ];

  for (const dir of searchDirs) {
    if (!fs.existsSync(dir)) continue;
    let entries: string[];
    try {
      entries = fs.readdirSync(dir);
    } catch {
      continue;
    }
    const prefix = `${sprintId}_`;
    for (const entry of entries) {
      if (entry.startsWith(prefix) && entry.endsWith('.md')) {
        return path.join(dir, entry);
      }
      // Also allow exact match like SPRINT-99.md (test fixtures)
      if (entry === `${sprintId}.md`) {
        return path.join(dir, entry);
      }
    }
  }

  return null;
}

/**
 * Read the `execution_mode` field from a sprint file.
 *
 * Resolution order:
 * 1. If `opts.sprintFilePath` is set, use that directly.
 * 2. Otherwise, discover the file by sprintId in `.cleargate/delivery/`.
 * 3. If no file found, return "v1" (safe default per §19.5).
 */
export function readSprintExecutionMode(
  sprintId: string,
  opts: ExecutionModeOptions = {},
): ExecutionMode {
  const cwd = opts.cwd ?? process.cwd();

  let filePath: string | null = opts.sprintFilePath ?? null;
  if (!filePath) {
    filePath = discoverSprintFile(sprintId, cwd);
  }

  if (!filePath || !fs.existsSync(filePath)) {
    // Default to v1 — safe, no behavioral change (§19.5)
    return 'v1';
  }

  let raw: string;
  try {
    raw = fs.readFileSync(filePath, 'utf8');
  } catch {
    return 'v1';
  }

  const fm = parseFrontmatterSimple(raw);
  const mode = fm['execution_mode'];

  if (mode === 'v2') return 'v2';
  return 'v1';
}

/**
 * Print the v1-inert message and exit 0.
 * The caller is responsible for calling this when execution_mode is v1.
 */
export function printInertAndExit(
  stdoutFn: (s: string) => void,
  exitFn: (code: number) => never,
): never {
  stdoutFn(V1_INERT_MESSAGE);
  return exitFn(0);
}

export { V1_INERT_MESSAGE };
