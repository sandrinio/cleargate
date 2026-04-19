/**
 * stamp.ts — `cleargate stamp <file>` command handler
 *
 * Wraps M1 helpers: getCodebaseVersion + stampFrontmatter.
 * Do NOT hand-roll YAML or shell git — use the M1 helpers.
 *
 * FLASHCARD #cli #determinism #test-seam: thread `now`, `exit`, `stdout` seams.
 * FLASHCARD #tsup #cjs #esm: no top-level await.
 * FLASHCARD #cli #commander #optional-key: conditionally assign `now`/`version` opts.
 */

import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { getCodebaseVersion, type CodebaseVersion } from '../lib/codebase-version.js';
import { stampFrontmatter, type StampOptions } from '../lib/stamp-frontmatter.js';
import { parseFrontmatter } from '../wiki/parse-frontmatter.js';

export interface StampCliOptions {
  cwd?: string;
  now?: () => Date;
  stdout?: (s: string) => void;
  exit?: (code: number) => never;
  /** Test seam: inject a fixed CodebaseVersion instead of calling getCodebaseVersion. */
  getVersion?: () => CodebaseVersion;
}

/**
 * Build a unified-diff-style preview of the frontmatter changes.
 * Prints context lines (unchanged) with a leading space,
 * removed lines with `-`, added lines with `+`.
 */
function buildDiffPreview(
  filePath: string,
  before: Record<string, unknown>,
  after: Record<string, unknown>,
): string {
  const lines: string[] = [`--- ${filePath}`, `+++ ${filePath} (after stamp)`];

  // Use insertion order of keys — include both before and after
  const seenKeys = new Set<string>();
  for (const key of [...Object.keys(before), ...Object.keys(after)]) {
    if (seenKeys.has(key)) continue;
    seenKeys.add(key);
    const bVal = before[key];
    const aVal = after[key];
    if (bVal === aVal) {
      lines.push(` ${key}: ${String(bVal)}`);
    } else {
      if (key in before) {
        lines.push(`-${key}: ${String(bVal)}`);
      }
      if (key in after) {
        lines.push(`+${key}: ${String(aVal)}`);
      }
    }
  }
  return lines.join('\n');
}

export async function stampHandler(
  file: string,
  opts: { dryRun?: boolean },
  cli?: StampCliOptions,
): Promise<void> {
  const stdoutFn = cli?.stdout ?? ((s: string) => process.stdout.write(s + '\n'));
  const exitFn: (code: number) => never =
    cli?.exit ?? ((code: number) => process.exit(code) as never);
  const cwd = cli?.cwd ?? process.cwd();

  // Resolve file to absolute path
  const absPath = path.isAbsolute(file) ? file : path.resolve(cwd, file);

  // Verify file exists before calling helpers
  if (!fs.existsSync(absPath)) {
    process.stderr.write(`[cleargate stamp] error: file not found: ${absPath}\n`);
    return exitFn(1);
  }

  const version = cli?.getVersion ? cli.getVersion() : getCodebaseVersion({ cwd });

  if (opts.dryRun) {
    // For dry-run: operate on a temp file copy so the real file is never written.
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cg-stamp-dry-'));
    try {
      const tmpFile = path.join(tmpDir, path.basename(absPath));
      fs.copyFileSync(absPath, tmpFile);

      // Read current frontmatter for the diff's before-side
      let before: Record<string, unknown> = {};
      try {
        const raw = fs.readFileSync(absPath, 'utf8');
        if (raw.trimStart().startsWith('---')) {
          ({ fm: before } = parseFrontmatter(raw));
        }
      } catch {
        // before stays empty if parse fails
      }

      // Build stamp options — conditionally assign now per FLASHCARD #cli #commander #optional-key
      const stampOpts: StampOptions = { version };
      if (cli?.now) {
        stampOpts.now = cli.now;
      }

      const result = await stampFrontmatter(tmpFile, stampOpts);

      const diff = buildDiffPreview(file, before, result.frontmatterAfter);
      stdoutFn(diff);
      if (result.reason === 'noop-archive' || result.reason === 'noop-unchanged') {
        stdoutFn(`[dry-run] no changes (${result.reason})`);
      }
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
    return;
  }

  // Real stamp — conditionally assign now per FLASHCARD #cli #commander #optional-key
  const stampOpts: StampOptions = { version };
  if (cli?.now) {
    stampOpts.now = cli.now;
  }

  const result = await stampFrontmatter(absPath, stampOpts);
  stdoutFn(`[stamped] ${file} (${result.reason})`);
}
