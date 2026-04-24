/**
 * scaffold-blocklist.ts — Default blocklist for `cleargate scaffold-lint`.
 *
 * STORY-018-04: Stack-leak detection. These terms should not appear in the
 * installable scaffold under cleargate-planning/ — they indicate ClearGate's
 * own dogfooding vocabulary leaking into the template that downstream users
 * receive.
 *
 * Categories: ORMs, web frameworks, infra, DB engines, cache/queue, styling.
 */

// ─── Blocklist categories ─────────────────────────────────────────────────────

const ORMS = ['drizzle', 'prisma', 'sequelize', 'typeorm'] as const;

const WEB_FRAMEWORKS = [
  'fastify',
  'express',
  'hono',
  'svelte',
  'sveltekit',
  'react',
  'next.js',
  'nextjs',
  'nuxt',
  'remix',
  'vue',
] as const;

const INFRA = ['coolify', 'vercel', 'netlify', 'heroku', 'render.com', 'fly.io'] as const;

const DB_ENGINES = ['postgres', 'postgresql', 'mysql', 'sqlite', 'mongodb', 'dynamodb'] as const;

const CACHE_QUEUE = ['redis', 'ioredis', 'memcached', 'rabbitmq', 'kafka'] as const;

const STYLING = ['daisyui', 'tailwind', 'bootstrap', 'mui'] as const;

// ─── Category map (for --fix-hint placeholders) ───────────────────────────────

export type BlocklistCategory = 'orm' | 'framework' | 'infra' | 'db' | 'cache' | 'styling';

const TERM_CATEGORY_MAP: ReadonlyMap<string, BlocklistCategory> = new Map<string, BlocklistCategory>([
  ...ORMS.map((t): [string, BlocklistCategory] => [t, 'orm']),
  ...WEB_FRAMEWORKS.map((t): [string, BlocklistCategory] => [t, 'framework']),
  ...INFRA.map((t): [string, BlocklistCategory] => [t, 'infra']),
  ...DB_ENGINES.map((t): [string, BlocklistCategory] => [t, 'db']),
  ...CACHE_QUEUE.map((t): [string, BlocklistCategory] => [t, 'cache']),
  ...STYLING.map((t): [string, BlocklistCategory] => [t, 'styling']),
]);

export const CATEGORY_PLACEHOLDERS: ReadonlyMap<BlocklistCategory, string> = new Map([
  ['orm', '<your-orm>'],
  ['framework', '<your-framework>'],
  ['infra', '<your-infra>'],
  ['db', '<your-db>'],
  ['cache', '<your-cache>'],
  ['styling', '<your-styling>'],
]);

// ─── Public exports ───────────────────────────────────────────────────────────

export const DEFAULT_BLOCKLIST: readonly string[] = [
  ...ORMS,
  ...WEB_FRAMEWORKS,
  ...INFRA,
  ...DB_ENGINES,
  ...CACHE_QUEUE,
  ...STYLING,
];

/**
 * Get the category for a blocklist term (default or user-supplied).
 * Returns undefined for user-supplied terms that don't map to a category.
 */
export function getTermCategory(term: string): BlocklistCategory | undefined {
  return TERM_CATEGORY_MAP.get(term.toLowerCase());
}

// ─── Allowlist parser ─────────────────────────────────────────────────────────

export interface AllowlistEntry {
  term: string;
  glob?: string;
}

export interface ParsedAllowlist {
  entries: AllowlistEntry[];
  warnings: string[];
}

/**
 * Parse `.cleargate/scaffold-allowlist.txt` content.
 *
 * Format per line: `<term>[ <file-glob>]`
 * - Lines starting with `#` are comments.
 * - Blank lines are skipped.
 * - Term is case-insensitive substring.
 * - Glob is optional; when absent, suppresses ALL files.
 *
 * Returns parsed entries + any warnings (for malformed lines — per orchestrator
 * decision: skip + warn rather than fail; malformed-allowlist exit-2 is
 * handled by the blocklist file, not the allowlist).
 *
 * NOTE: Per M2.md "malformed lines: fail fast" applies to the *blocklist* file
 * format only. For allowlist, skip + warn to stderr per orchestrator Q2 decision.
 */
export function parseAllowlist(
  content: string,
  filePath: string,
  stderrFn: (s: string) => void,
): AllowlistEntry[] {
  const entries: AllowlistEntry[] = [];
  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const trimmed = raw.trim();

    // Skip blank lines and comments
    if (trimmed === '' || trimmed.startsWith('#')) continue;

    // Split on whitespace — first token is term, optional second is glob
    const parts = trimmed.split(/\s+/);

    if (parts.length === 0 || parts[0] === '') {
      stderrFn(`scaffold-lint: warning: malformed line ${i + 1} in ${filePath}: ${raw}`);
      continue;
    }

    const entry: AllowlistEntry = { term: parts[0].toLowerCase() };
    if (parts.length >= 2) {
      entry.glob = parts[1];
    }
    entries.push(entry);
  }

  return entries;
}

/**
 * Parse `.cleargate/scaffold-blocklist.txt` (user-extensible).
 * Fail-fast on malformed lines (exit code 2).
 * Returns null if a parse error was encountered (caller should exit 2).
 */
export function parseUserBlocklist(
  content: string,
  filePath: string,
  stderrFn: (s: string) => void,
): string[] | null {
  const terms: string[] = [];
  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const trimmed = raw.trim();

    if (trimmed === '' || trimmed.startsWith('#')) continue;

    // A valid term is a single non-whitespace token
    if (/\s/.test(trimmed)) {
      stderrFn(`scaffold-lint: malformed line ${i + 1} in ${filePath}: ${raw}`);
      return null; // signal exit 2
    }

    terms.push(trimmed.toLowerCase());
  }

  return terms;
}
