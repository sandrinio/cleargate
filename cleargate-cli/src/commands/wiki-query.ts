/**
 * STORY-002-08: cleargate wiki query [--persist]
 *
 * Read-only by default: grep .cleargate/wiki/index.md for query terms,
 * return matching [[ID]] list with one-line excerpts to stdout. Exit 0.
 *
 * --persist: compute slug, write wiki/topics/<slug>.md with frontmatter
 * type: topic, id, created_by, created_at, cites. Append to wiki/index.md
 * ## Topics section.
 *
 * NOTE: CLI synthesis is grep-and-list. For NL synthesis with the
 * cleargate-wiki-query subagent, invoke from a Claude Code session.
 * This diverges from PROPOSAL-002 §2.2 intentionally for testability and
 * offline/scripted use.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

export interface WikiQueryOptions {
  /** Test seam: working directory (defaults to process.cwd()) */
  cwd?: string;
  /** Test seam: replaces process.stdout.write */
  stdout?: (s: string) => void;
  /** Test seam: replaces process.stderr.write */
  stderr?: (s: string) => void;
  /** Test seam: replaces process.exit */
  exit?: (code: number) => never;
  /** Test seam: frozen ISO timestamp (defaults to new Date().toISOString()) */
  now?: () => string;
  /** The query string */
  query: string;
  /** If true, write result as a topic page under wiki/topics/ */
  persist?: boolean;
}

/**
 * Compute a slug from a query string.
 * Lowercase, replace spaces and punctuation with hyphens,
 * strip consecutive hyphens, truncate to ≤40 chars.
 */
export function computeSlug(query: string): string {
  return query
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')  // non-alphanumeric → hyphen
    .replace(/^-+|-+$/g, '')      // strip leading/trailing hyphens
    .replace(/-{2,}/g, '-')       // collapse consecutive hyphens
    .slice(0, 40)
    .replace(/-+$/, '');          // strip trailing hyphens after truncation
}

/**
 * Parse index.md and extract matching IDs for the given query terms.
 * Returns array of { id, line } matching lines.
 */
function searchIndex(indexContent: string, query: string): Array<{ id: string; excerpt: string }> {
  const terms = query
    .toLowerCase()
    .split(/\s+/)
    .filter((t) => t.length > 0);

  const results: Array<{ id: string; excerpt: string }> = [];
  const seenIds = new Set<string>();

  for (const line of indexContent.split('\n')) {
    const lower = line.toLowerCase();
    const matchesAll = terms.every((term) => lower.includes(term));
    if (!matchesAll) continue;

    // Extract [[ID]] from line
    const match = line.match(/\[\[([^\]]+)\]\]/);
    if (!match) continue;
    const id = match[1];
    if (seenIds.has(id)) continue;
    seenIds.add(id);

    results.push({ id, excerpt: line.trim() });
  }

  return results;
}

export async function wikiQueryHandler(opts: WikiQueryOptions): Promise<void> {
  const cwd = opts.cwd ?? process.cwd();
  const stdout = opts.stdout ?? ((s: string) => process.stdout.write(s));
  const stderr = opts.stderr ?? ((s: string) => process.stderr.write(s));
  const exit = opts.exit ?? ((c: number): never => process.exit(c));
  const now = opts.now ?? (() => new Date().toISOString());
  const query = opts.query;
  const persist = opts.persist ?? false;

  void stderr; // suppress unused warning

  const wikiRoot = path.join(cwd, '.cleargate', 'wiki');
  const indexPath = path.join(wikiRoot, 'index.md');

  if (!fs.existsSync(indexPath)) {
    stdout(`wiki query: no index.md found at ${indexPath}\n`);
    stdout(`Run \`cleargate wiki build\` first.\n`);
    exit(1);
    return;
  }

  const indexContent = fs.readFileSync(indexPath, 'utf8');
  const matches = searchIndex(indexContent, query);

  if (matches.length === 0) {
    stdout(`wiki query: no matches for "${query}"\n`);
    exit(0);
    return;
  }

  // Build output body
  const bodyLines: string[] = [
    `# Query: ${query}`,
    '',
    `Found ${matches.length} match(es):`,
    '',
  ];

  for (const { id, excerpt } of matches) {
    bodyLines.push(`- [[${id}]] — ${excerpt}`);
  }
  bodyLines.push('');

  const body = bodyLines.join('\n');

  // Output to stdout (read-only mode: always output to stdout)
  stdout(body);

  if (!persist) {
    exit(0);
    return;
  }

  // Persist mode: write topic page
  const slug = computeSlug(query);
  const topicsDir = path.join(wikiRoot, 'topics');
  fs.mkdirSync(topicsDir, { recursive: true });

  const citesArray = matches.map(({ id }) => `"[[${id}]]"`);
  const createdAt = now();

  // Build topic page frontmatter
  const frontmatter = [
    '---',
    `type: topic`,
    `id: "${slug}"`,
    `created_by: "cleargate-wiki-query"`,
    `created_at: "${createdAt}"`,
    `cites: [${citesArray.join(', ')}]`,
    '---',
  ].join('\n');

  const topicContent = `${frontmatter}\n\n${body}`;
  const topicPath = path.join(topicsDir, `${slug}.md`);

  // Overwrite if exists (slug collision → overwrite per subagent def line 136)
  fs.writeFileSync(topicPath, topicContent, 'utf8');

  // Update wiki/index.md Topics section
  updateIndexTopicsSection(indexPath, slug, query, createdAt);

  exit(0);
}

/**
 * Append one row to the ## Topics section of wiki/index.md.
 * Creates the section header if absent.
 */
function updateIndexTopicsSection(
  indexPath: string,
  slug: string,
  query: string,
  createdAt: string,
): void {
  let content = fs.readFileSync(indexPath, 'utf8');

  const row = `| ${slug} | ${query} | ${createdAt} |`;

  if (content.includes('## Topics')) {
    // Append after the last line of the Topics section (end of file or before next ##)
    // Find the Topics section and append the row at the end
    const topicsIdx = content.indexOf('## Topics');
    const afterTopics = content.slice(topicsIdx);

    // Find the next ## section or end of file
    const nextSectionMatch = afterTopics.slice('## Topics'.length).match(/\n## /);
    if (nextSectionMatch && nextSectionMatch.index !== undefined) {
      const insertPos = topicsIdx + '## Topics'.length + nextSectionMatch.index;
      content = content.slice(0, insertPos) + `\n${row}` + content.slice(insertPos);
    } else {
      // Topics is the last section — append at end
      content = content.trimEnd() + `\n${row}\n`;
    }
  } else {
    // Create Topics section at end of file
    content = content.trimEnd() + `\n\n## Topics\n\n${row}\n`;
  }

  fs.writeFileSync(indexPath, content, 'utf8');
}
