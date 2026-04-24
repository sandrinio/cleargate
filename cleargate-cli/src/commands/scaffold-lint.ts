/**
 * scaffold-lint.ts — `cleargate scaffold-lint` command handler.
 *
 * STORY-018-04: Scans cleargate-planning/ for stack-specific strings that
 * should not appear in the installable scaffold.
 *
 * Exit codes: 0 = clean, 1 = findings, 2 = config/parse error.
 *
 * FLASHCARD #cli #test-seam #exit: exit seam throws in tests; extract logic
 *   into value-returning internal fn, call exitFn only at handler top-level.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import {
  DEFAULT_BLOCKLIST,
  getTermCategory,
  CATEGORY_PLACEHOLDERS,
  parseAllowlist,
  parseUserBlocklist,
  type AllowlistEntry,
} from '../lib/scaffold-blocklist.js';

// ─── Scan extensions ──────────────────────────────────────────────────────────

const SCAN_EXTENSIONS = new Set(['.md', '.sh', '.mjs', '.json']);

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ScaffoldLintOptions {
  fixHint?: boolean;
  versions?: boolean;
  quiet?: boolean;
  cwd?: string;
  planningDir?: string; // override for tests; defaults to path.join(cwd, 'cleargate-planning')
  stdout?: (s: string) => void;
  stderr?: (s: string) => void;
  exit?: (code: number) => never;
}

interface Finding {
  file: string;     // relative to planningDir parent
  line: number;
  term: string;
  context: string;  // matched line truncated to 80 chars
}

// ─── scaffoldLintHandler ──────────────────────────────────────────────────────

export function scaffoldLintHandler(opts: ScaffoldLintOptions): void {
  const stdoutFn = opts.stdout ?? ((s: string) => process.stdout.write(s + '\n'));
  const stderrFn = opts.stderr ?? ((s: string) => process.stderr.write(s + '\n'));
  const exitFn: (code: number) => never =
    opts.exit ?? ((code: number) => process.exit(code) as never);
  const cwd = opts.cwd ?? process.cwd();
  const planningDir = opts.planningDir ?? path.join(cwd, 'cleargate-planning');

  const result = runScaffoldLint(opts, cwd, planningDir, stdoutFn, stderrFn);

  if (result.exitCode === 0) {
    stdoutFn('scaffold-lint: clean');
  }

  if (result.exitCode !== 0) {
    exitFn(result.exitCode);
  }
}

interface LintResult {
  exitCode: number;
}

function runScaffoldLint(
  opts: ScaffoldLintOptions,
  cwd: string,
  planningDir: string,
  stdoutFn: (s: string) => void,
  stderrFn: (s: string) => void,
): LintResult {
  // ── 1. Load user blocklist (fail-fast on malformed) ─────────────────────────
  const userBlocklistPath = path.join(cwd, '.cleargate', 'scaffold-blocklist.txt');
  let userTerms: string[] = [];

  if (fs.existsSync(userBlocklistPath)) {
    let raw: string;
    try {
      raw = fs.readFileSync(userBlocklistPath, 'utf8');
    } catch (err) {
      stderrFn(`scaffold-lint: error reading ${userBlocklistPath}: ${String(err)}`);
      return { exitCode: 2 };
    }
    const parsed = parseUserBlocklist(raw, userBlocklistPath, stderrFn);
    if (parsed === null) {
      return { exitCode: 2 };
    }
    userTerms = parsed;
  }

  // ── 2. Load allowlist (skip + warn on malformed) ──────────────────────────
  const allowlistPath = path.join(cwd, '.cleargate', 'scaffold-allowlist.txt');
  let allowlistEntries: AllowlistEntry[] = [];

  if (fs.existsSync(allowlistPath)) {
    let raw: string;
    try {
      raw = fs.readFileSync(allowlistPath, 'utf8');
    } catch (err) {
      stderrFn(`scaffold-lint: warning: error reading ${allowlistPath}: ${String(err)}`);
    }
    try {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      allowlistEntries = parseAllowlist(raw!, allowlistPath, stderrFn);
    } catch {
      // parseAllowlist is synchronous and doesn't throw in normal usage
    }
  }

  // ── 3. Build combined blocklist ───────────────────────────────────────────
  const allTerms = [...DEFAULT_BLOCKLIST, ...userTerms];

  // ── 4. Walk cleargate-planning/ ───────────────────────────────────────────
  if (!fs.existsSync(planningDir)) {
    // No planning dir — nothing to scan, exit clean
    stdoutFn('scaffold-lint: clean');
    return { exitCode: 0 };
  }

  const files = walkDir(planningDir);

  // ── 5. Scan files ─────────────────────────────────────────────────────────
  const findings: Finding[] = [];

  for (const filePath of files) {
    const ext = path.extname(filePath).toLowerCase();
    if (!SCAN_EXTENSIONS.has(ext)) continue;

    let content: string;
    try {
      content = fs.readFileSync(filePath, 'utf8');
    } catch {
      continue; // skip unreadable files
    }

    // Relative path from cwd for reporting
    const relPath = path.relative(cwd, filePath).replace(/\\/g, '/');

    const lines = content.split('\n');
    for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
      const lineNum = lineIdx + 1;
      const lineText = lines[lineIdx];

      for (const term of allTerms) {
        const re = new RegExp(escapeRegex(term), 'gi');
        if (!re.test(lineText)) continue;

        // Check allowlist
        if (isAllowlisted(relPath, term, allowlistEntries)) continue;

        findings.push({
          file: relPath,
          line: lineNum,
          term: term.toLowerCase(),
          context: lineText.slice(0, 80),
        });
        // Only record the FIRST matching term per line per occurrence
        // (break inner term loop to avoid duplicate lines for the same match)
        break;
      }
    }
  }

  // ── 6. Sort findings by file asc, line asc ───────────────────────────────
  findings.sort((a, b) => {
    if (a.file < b.file) return -1;
    if (a.file > b.file) return 1;
    return a.line - b.line;
  });

  // ── 7. Emit findings ──────────────────────────────────────────────────────
  if (findings.length === 0) {
    return { exitCode: 0 };
  }

  if (!opts.quiet) {
    for (const f of findings) {
      const line = `${f.file}:${f.line}: ${f.term}  — example context: ${f.context}`;
      stderrFn(line);

      if (opts.fixHint) {
        const category = getTermCategory(f.term);
        const placeholder = category ? CATEGORY_PLACEHOLDERS.get(category) : undefined;
        if (placeholder) {
          stderrFn(`  hint: replace with ${placeholder}`);
        } else {
          stderrFn(`  hint: replace with <your-replacement>`);
        }
      }
    }
  }

  return { exitCode: 1 };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function walkDir(dir: string): string[] {
  const results: string[] = [];

  function recurse(current: string): void {
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(current, { withFileTypes: true }) as fs.Dirent[];
    } catch {
      return;
    }
    for (const entry of entries) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        recurse(fullPath);
      } else if (entry.isFile()) {
        results.push(fullPath);
      }
    }
  }

  recurse(dir);
  return results;
}

function escapeRegex(term: string): string {
  return term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function isAllowlisted(
  relPath: string,
  term: string,
  entries: AllowlistEntry[],
): boolean {
  const termLower = term.toLowerCase();

  for (const entry of entries) {
    if (entry.term !== termLower) continue;

    if (!entry.glob) {
      // Global suppression for this term
      return true;
    }

    // Glob is relative to repo root (cwd)
    // Use simple star matching via path.matchesGlob (Node 24)
    if (matchesGlob(relPath, entry.glob)) {
      return true;
    }
  }

  return false;
}

/**
 * Minimal glob matcher using Node 24's path.matchesGlob when available,
 * with a fallback star-replace regex for older environments.
 */
function matchesGlob(filePath: string, glob: string): boolean {
  // Node 24 built-in
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pathModule = path as any;
    if (typeof pathModule.matchesGlob === 'function') {
      return pathModule.matchesGlob(filePath, glob);
    }
  } catch {
    // fall through
  }

  // Fallback: simple star matching
  const regexStr = glob
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*\*/g, '§DSTAR§')
    .replace(/\*/g, '[^/]*')
    .replace(/§DSTAR§/g, '.*');

  return new RegExp(`^${regexStr}$`).test(filePath);
}
