/**
 * scaffold-source.ts — STORY-016-05
 *
 * Resolves the scaffold payload directory for `cleargate init`.
 * When `--from-source <path>` is provided, validates the path and returns it
 * as the payload directory (meta-repo dogfood mode).
 * When absent, delegates to the existing npm-package-resolved path.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { resolveDefaultPayloadDir } from '../commands/init.js';

export interface ResolveOptions {
  /** When set, resolve scaffold from this local directory instead of the npm package. */
  fromSource?: string;
  /** Current working directory used to resolve relative paths. Default: process.cwd() */
  cwd?: string;
}

export interface ResolveResult {
  /** Absolute path to the scaffold root (the directory containing .claude/, .cleargate/, CLAUDE.md). */
  payloadDir: string;
  /** Source of the payload directory. */
  source: 'npm-package' | 'from-source';
}

/** Required items at the root of a valid scaffold source directory. */
const REQUIRED_ITEMS = ['.claude', '.cleargate', 'CLAUDE.md'] as const;

/**
 * Error thrown when a `--from-source` path is invalid.
 */
export class ScaffoldSourceError extends Error {
  code: 'PATH_MISSING' | 'LAYOUT_INVALID';
  missing: string[];

  constructor(opts: {
    message: string;
    code: 'PATH_MISSING' | 'LAYOUT_INVALID';
    missing: string[];
  }) {
    super(opts.message);
    this.name = 'ScaffoldSourceError';
    this.code = opts.code;
    this.missing = opts.missing;
  }
}

/**
 * Resolve the scaffold root directory.
 *
 * When `fromSource` is provided:
 *   - Resolve the path relative to `cwd` (or process.cwd()).
 *   - Validate that the resolved path exists and contains `.claude/`, `.cleargate/`, and `CLAUDE.md`.
 *   - Throw `ScaffoldSourceError` on any validation failure.
 *
 * When `fromSource` is absent:
 *   - Return the npm-package-resolved payload dir via `resolveDefaultPayloadDir()`.
 *   - Behavior is bug-for-bug identical to pre-STORY-016-05 init.ts line 209.
 */
export function resolveScaffoldRoot(opts?: ResolveOptions): ResolveResult {
  const fromSource = opts?.fromSource;

  if (!fromSource) {
    return {
      payloadDir: resolveDefaultPayloadDir(),
      source: 'npm-package',
    };
  }

  // Resolve relative to cwd
  const resolvedCwd = opts?.cwd ?? process.cwd();
  const absolutePath = path.resolve(resolvedCwd, fromSource);

  // Validate existence
  if (!fs.existsSync(absolutePath)) {
    throw new ScaffoldSourceError({
      message:
        `cleargate init: --from-source path missing required scaffold layout\n` +
        `  Path does not exist: ${absolutePath}`,
      code: 'PATH_MISSING',
      missing: [absolutePath],
    });
  }

  // Validate required layout items
  const missingItems: string[] = [];
  for (const item of REQUIRED_ITEMS) {
    const itemPath = path.join(absolutePath, item);
    if (!fs.existsSync(itemPath)) {
      missingItems.push(item);
    }
  }

  if (missingItems.length > 0) {
    throw new ScaffoldSourceError({
      message:
        `cleargate init: --from-source path missing required scaffold layout\n` +
        `  Path: ${absolutePath}\n` +
        `  Missing: ${missingItems.join(', ')}`,
      code: 'LAYOUT_INVALID',
      missing: missingItems,
    });
  }

  return {
    payloadDir: absolutePath,
    source: 'from-source',
  };
}
