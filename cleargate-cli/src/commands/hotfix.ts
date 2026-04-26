/**
 * hotfix.ts — `cleargate hotfix new <slug>` command handler.
 *
 * STORY-022-06: Hotfix lane scaffolding.
 *
 * Creates a new HOTFIX-NNN_<slug>.md file in `.cleargate/delivery/pending-sync/`
 * from the bundled hotfix.md template, with ID auto-incremented via a scan of
 * existing HOTFIX-* files.
 *
 * Cap stub: blocks the 4th hotfix in a rolling 7-day window (pending-sync +
 * archive files modified within the last 7 days). Node fs APIs only — no
 * shell-outs (cross-OS per BUG-010 §4b).
 *
 * FLASHCARD #tsup #cjs #esm: no top-level await.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

// ─── Public CLI option types ───────────────────────────────────────────────────

export interface HotfixCliOptions {
  stdout?: (s: string) => void;
  stderr?: (s: string) => void;
  exit?: (code: number) => never;
  /** Override cwd for the repo root (test seam). */
  cwd?: string;
  /** Override the current ISO timestamp (test seam). */
  now?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function defaultExit(code: number): never {
  return process.exit(code) as never;
}

const SLUG_RE = /^[a-z0-9-]+$/;
const HOTFIX_FILE_RE = /^HOTFIX-(\d+)_.*\.md$/;

/**
 * Scan pending-sync/ for HOTFIX-NNN_*.md files; return the highest NNN found
 * (or 0 if none). Synchronous — no async needed for the tiny delivery dir.
 */
function maxHotfixId(pendingDir: string): number {
  let max = 0;
  let entries: string[];
  try {
    entries = fs.readdirSync(pendingDir);
  } catch {
    return 0;
  }
  for (const entry of entries) {
    const m = HOTFIX_FILE_RE.exec(entry);
    if (m) {
      const n = parseInt(m[1]!, 10);
      if (n > max) max = n;
    }
  }
  return max;
}

/**
 * Count active hotfixes for the rolling-window cap.
 *
 * Counts:
 *   - All HOTFIX-*.md files in pending-sync/ (regardless of mtime — they are
 *     by definition active/in-flight).
 *   - HOTFIX-*.md files in archive/ whose mtime is within the last 7 days
 *     (recently merged/resolved within the window).
 */
function countActiveHotfixes(repoRoot: string): number {
  const pendingDir = path.join(repoRoot, '.cleargate', 'delivery', 'pending-sync');
  const archiveDir = path.join(repoRoot, '.cleargate', 'delivery', 'archive');
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

  let count = 0;

  // All in pending-sync
  let pendingEntries: string[] = [];
  try {
    pendingEntries = fs.readdirSync(pendingDir);
  } catch {
    // dir may not exist in test fixtures
  }
  for (const entry of pendingEntries) {
    if (entry.startsWith('HOTFIX-') && entry.endsWith('.md')) count++;
  }

  // Recently archived (within 7-day window)
  let archiveEntries: string[] = [];
  try {
    archiveEntries = fs.readdirSync(archiveDir);
  } catch {
    // dir may not exist
  }
  for (const entry of archiveEntries) {
    if (entry.startsWith('HOTFIX-') && entry.endsWith('.md')) {
      try {
        const stat = fs.statSync(path.join(archiveDir, entry));
        if (stat.mtimeMs >= sevenDaysAgo) count++;
      } catch {
        // Skip unreadable entries
      }
    }
  }

  return count;
}

/**
 * Resolve the path to `.cleargate/templates/hotfix.md` relative to the repo root.
 */
function resolveTemplatePath(repoRoot: string): string {
  return path.join(repoRoot, '.cleargate', 'templates', 'hotfix.md');
}

// ─── hotfixNewHandler ────────────────────────────────────────────────────────

/**
 * `cleargate hotfix new <slug>`
 *
 * - Validates slug matches ^[a-z0-9-]+$.
 * - Checks rolling-window hotfix cap (≤3 per 7 days).
 * - Reads .cleargate/templates/hotfix.md and substitutes {ID}, {SLUG}, {ISO}.
 * - Writes to .cleargate/delivery/pending-sync/HOTFIX-<NNN>_<slug>.md
 *   (slug with - replaced by _ in filename, matching STORY-NNN-NN_Name.md convention).
 *
 * Exits 1 on validation failure or cap exceeded; exits 0 on success.
 */
export function hotfixNewHandler(
  opts: { slug: string },
  cli?: HotfixCliOptions,
): void {
  const stdoutFn = cli?.stdout ?? ((s: string) => process.stdout.write(s + '\n'));
  const stderrFn = cli?.stderr ?? ((s: string) => process.stderr.write(s + '\n'));
  const exitFn: (code: number) => never = cli?.exit ?? defaultExit;
  const repoRoot = cli?.cwd ?? process.cwd();
  const now = cli?.now ?? new Date().toISOString();

  // ── Validate slug ────────────────────────────────────────────────────────
  if (!SLUG_RE.test(opts.slug)) {
    stderrFn(`[cleargate hotfix new] slug must match ^[a-z0-9-]+$ (got: "${opts.slug}")`);
    return exitFn(1);
  }

  // ── Cap check ────────────────────────────────────────────────────────────
  const activeCount = countActiveHotfixes(repoRoot);
  if (activeCount >= 3) {
    stderrFn(
      `Hotfix cap: ≤3 per rolling 7-day window. Currently ${activeCount} active. Bundle into a sprint or downgrade one to a CR.`,
    );
    return exitFn(1);
  }

  // ── Next ID ──────────────────────────────────────────────────────────────
  const pendingDir = path.join(repoRoot, '.cleargate', 'delivery', 'pending-sync');
  const maxId = maxHotfixId(pendingDir);
  const nextId = maxId + 1;
  const idStr = `HOTFIX-${String(nextId).padStart(3, '0')}`;

  // ── Read template ────────────────────────────────────────────────────────
  const templatePath = resolveTemplatePath(repoRoot);
  let templateContent: string;
  try {
    templateContent = fs.readFileSync(templatePath, 'utf8');
  } catch {
    stderrFn(`[cleargate hotfix new] template not found: ${templatePath}`);
    return exitFn(2);
  }

  // ── Substitute placeholders ──────────────────────────────────────────────
  const content = templateContent
    .replace(/\{ID\}/g, idStr)
    .replace(/\{SLUG\}/g, opts.slug)
    .replace(/\{ISO\}/g, now);

  // ── Write output file ────────────────────────────────────────────────────
  // Filename convention: HOTFIX-NNN_slug_with_underscores.md
  const fileSlug = opts.slug.replace(/-/g, '_');
  const fileName = `${idStr}_${fileSlug}.md`;
  const outPath = path.join(pendingDir, fileName);

  try {
    fs.mkdirSync(pendingDir, { recursive: true });
    fs.writeFileSync(outPath, content, 'utf8');
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    stderrFn(`[cleargate hotfix new] write failed: ${msg}`);
    return exitFn(1);
  }

  stdoutFn(`[cleargate hotfix new] created: ${outPath}`);
  // Explicit exit 0 to satisfy the exit-seam contract used in tests.
  return exitFn(0);
}
