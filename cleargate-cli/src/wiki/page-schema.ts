/**
 * §10.4 Wiki Page Schema — nine required frontmatter fields plus three optional.
 * Lint will flag any extra or missing required fields; last_contradict_sha,
 * parent_cleargate_id, and sprint_cleargate_id are optional.
 */

export type WikiPageType = 'epic' | 'story' | 'sprint' | 'proposal' | 'cr' | 'bug' | 'topic';
export type RepoTag = 'cli' | 'mcp' | 'planning';

/** The nine required + three optional frontmatter fields every wiki page must satisfy. */
export interface WikiPage {
  type: WikiPageType;
  id: string;
  parent: string;   // "[[EPIC-042]]" or "" if none
  children: string[]; // ["[[STORY-042-01]]", ...]
  status: string;
  remote_id: string;
  raw_path: string;
  last_ingest: string;       // ISO 8601 UTC
  last_ingest_commit: string; // git SHA or ""
  repo: RepoTag;
  /** Optional — populated by ingest Phase 4 (§10.10). SHA of raw file at last contradict check. */
  last_contradict_sha?: string;
  /** Optional — canonical cleargate-id of the parent work item (§11.7). */
  parent_cleargate_id?: string;
  /** Optional — canonical cleargate-id of the owning sprint (§11.7). */
  sprint_cleargate_id?: string;
}

/** Serialise a WikiPage frontmatter + body into a markdown string. */
export function serializePage(page: WikiPage, body: string): string {
  const childrenYaml =
    page.children.length === 0
      ? '[]'
      : '\n' + page.children.map((c) => `  - "${c}"`).join('\n');

  const lines = [
    '---',
    `type: ${page.type}`,
    `id: "${page.id}"`,
    `parent: "${page.parent}"`,
    `children: ${childrenYaml}`,
    `status: "${page.status}"`,
    `remote_id: "${page.remote_id}"`,
    `raw_path: "${page.raw_path}"`,
    `last_ingest: "${page.last_ingest}"`,
    `last_ingest_commit: "${page.last_ingest_commit}"`,
    `repo: "${page.repo}"`,
  ];
  // Emit optional fields only when present
  if (page.last_contradict_sha !== undefined) {
    lines.push(`last_contradict_sha: "${page.last_contradict_sha}"`);
  }
  if (page.parent_cleargate_id !== undefined) {
    lines.push(`parent_cleargate_id: "${page.parent_cleargate_id}"`);
  }
  if (page.sprint_cleargate_id !== undefined) {
    lines.push(`sprint_cleargate_id: "${page.sprint_cleargate_id}"`);
  }
  lines.push('---');

  const fm = lines.join('\n');
  return `${fm}\n\n${body}`;
}

/** Parse a serialised wiki page back into a WikiPage. Throws on schema violations. */
export function parsePage(raw: string): WikiPage {
  const { fm } = parseFmRaw(raw);

  const type = fm['type'] as WikiPageType;
  const id = String(fm['id'] ?? '');
  const parent = String(fm['parent'] ?? '');
  const rawChildren = fm['children'];
  const children: string[] = Array.isArray(rawChildren)
    ? (rawChildren as unknown[]).map(String)
    : [];
  const status = String(fm['status'] ?? '');
  const remote_id = String(fm['remote_id'] ?? '');
  const raw_path = String(fm['raw_path'] ?? '');
  const last_ingest = String(fm['last_ingest'] ?? '');
  const last_ingest_commit = String(fm['last_ingest_commit'] ?? '');
  const repo = fm['repo'] as RepoTag;
  // Optional field — only populated when present (§10.10 Phase 4)
  const last_contradict_sha = fm['last_contradict_sha'] !== undefined
    ? String(fm['last_contradict_sha'])
    : undefined;
  // Optional hierarchy keys (§11.7)
  const parent_cleargate_id = fm['parent_cleargate_id'] !== undefined
    ? String(fm['parent_cleargate_id'])
    : undefined;
  const sprint_cleargate_id = fm['sprint_cleargate_id'] !== undefined
    ? String(fm['sprint_cleargate_id'])
    : undefined;

  return { type, id, parent, children, status, remote_id, raw_path, last_ingest, last_ingest_commit, repo, last_contradict_sha, parent_cleargate_id, sprint_cleargate_id };
}

function parseFmRaw(raw: string): { fm: Record<string, unknown>; body: string } {
  const lines = raw.split('\n');
  if (lines[0] !== '---') throw new Error('parsePage: missing opening ---');
  let close = -1;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i] === '---') { close = i; break; }
  }
  if (close === -1) throw new Error('parsePage: missing closing ---');
  const fmLines = lines.slice(1, close);
  const body = lines.slice(close + 1).join('\n').replace(/^\n/, '');
  const fm: Record<string, unknown> = {};
  for (const line of fmLines) {
    const colon = line.indexOf(':');
    if (colon === -1) continue;
    const key = line.slice(0, colon).trim();
    const val = line.slice(colon + 1).trim();
    if (val === '[]') { fm[key] = []; continue; }
    if (val === '') { fm[key] = []; continue; }
    // inline list check
    if (val.startsWith('[') && val.endsWith(']')) {
      const inner = val.slice(1, -1);
      fm[key] = inner.split(',').map((s) => s.trim().replace(/^["']|["']$/g, ''));
      continue;
    }
    fm[key] = val.replace(/^["']|["']$/g, '');
  }
  return { fm, body };
}
