/**
 * copy-payload.ts — recursively copy cleargate-planning/ payload to target cwd.
 *
 * Handles overwrite policy:
 *   - by default: skip files that already exist with identical content
 *   - force=true: overwrite all
 *
 * Does NOT prompt interactively; skip-or-overwrite is determined by `force`.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';

export interface CopyReport {
  created: number;
  skipped: number;
  overwritten: number;
  /** Per-file action lines for verbose printing */
  actions: Array<{ action: 'created' | 'skipped' | 'overwritten'; relPath: string }>;
}

export interface CopyPayloadOptions {
  force: boolean;
}

/**
 * Recursively enumerate files under `dir`.
 * Returns paths relative to `dir`.
 */
function listFilesRecursive(dir: string): string[] {
  const results: string[] = [];
  function walk(current: string, rel: string): void {
    const entries = fs.readdirSync(current, { withFileTypes: true });
    for (const entry of entries) {
      const entryRel = rel ? `${rel}/${entry.name}` : entry.name;
      const entryAbs = path.join(current, entry.name);
      if (entry.isDirectory()) {
        walk(entryAbs, entryRel);
      } else {
        results.push(entryRel);
      }
    }
  }
  walk(dir, '');
  return results;
}

/**
 * Copy all files from `payloadDir` to `targetCwd`, preserving directory structure.
 * Dotfiles and dot-directories (e.g. `.claude/`, `.cleargate/`) are preserved.
 */
export function copyPayload(
  payloadDir: string,
  targetCwd: string,
  opts: CopyPayloadOptions,
): CopyReport {
  const report: CopyReport = { created: 0, skipped: 0, overwritten: 0, actions: [] };

  if (!fs.existsSync(payloadDir)) {
    throw new Error(`copyPayload: payloadDir does not exist: ${payloadDir}`);
  }

  const files = listFilesRecursive(payloadDir);

  for (const relPath of files) {
    const srcPath = path.join(payloadDir, relPath);
    const dstPath = path.join(targetCwd, relPath);

    // Ensure target directory exists
    fs.mkdirSync(path.dirname(dstPath), { recursive: true });

    const srcContent = fs.readFileSync(srcPath);

    if (fs.existsSync(dstPath)) {
      const dstContent = fs.readFileSync(dstPath);
      if (srcContent.equals(dstContent)) {
        // Identical — skip silently even with force (idempotent)
        report.skipped++;
        report.actions.push({ action: 'skipped', relPath });
        continue;
      }
      if (!opts.force) {
        // Different content, no force — skip
        report.skipped++;
        report.actions.push({ action: 'skipped', relPath });
        continue;
      }
      // Different + force — overwrite
      fs.writeFileSync(dstPath, srcContent);
      report.overwritten++;
      report.actions.push({ action: 'overwritten', relPath });
    } else {
      // New file
      fs.writeFileSync(dstPath, srcContent);
      report.created++;
      report.actions.push({ action: 'created', relPath });
    }
  }

  return report;
}
