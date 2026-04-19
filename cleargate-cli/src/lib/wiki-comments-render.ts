/**
 * wiki-comments-render.ts — STORY-010-06
 *
 * Renders (inserts / replaces / removes) the "## Remote comments" section
 * on an existing wiki page at .cleargate/wiki/<bucket>/<primaryId>.md.
 *
 * DELIBERATELY separate from commands/wiki-ingest.ts which owns full-page
 * rebuild from raw. Section overlay is a different concern and would fight
 * wiki-ingest's SHA-idempotency guard.
 *
 * Delimiter matching uses literal-string indexOf, NOT regex.
 * FLASHCARD #regex #inject-claude-md: fuzzy whitespace regex breaks when the
 * block body itself references both markers in prose — use indexOf exclusively.
 *
 * No top-level await (FLASHCARD #tsup #cjs #esm).
 */

import * as fsPromises from 'node:fs/promises';
import * as path from 'node:path';
import type { RemoteComment } from './mcp-client.js';

// ── Delimiters (literal strings — never change to regex) ───────────────────────

const START = '<!-- cleargate:comments:start -->';
const END = '<!-- cleargate:comments:end -->';

// ── Bucket resolution ─────────────────────────────────────────────────────────

/**
 * Map a frontmatter record to the wiki bucket directory name.
 * Returns null if the item type cannot be determined.
 */
export function resolveBucket(fm: Record<string, unknown>): string | null {
  if (typeof fm['story_id'] === 'string' && fm['story_id']) return 'stories';
  if (typeof fm['epic_id'] === 'string' && fm['epic_id']) return 'epics';
  if (typeof fm['proposal_id'] === 'string' && fm['proposal_id']) return 'proposals';
  if (typeof fm['cr_id'] === 'string' && fm['cr_id']) return 'crs';
  if (typeof fm['bug_id'] === 'string' && fm['bug_id']) return 'bugs';
  return null;
}

/**
 * Extract the primary item ID (e.g. STORY-010-06) from frontmatter.
 */
export function getPrimaryId(fm: Record<string, unknown>): string | null {
  for (const key of ['story_id', 'epic_id', 'proposal_id', 'cr_id', 'bug_id']) {
    const val = fm[key];
    if (typeof val === 'string' && val) return val;
  }
  return null;
}

// ── Section builder ───────────────────────────────────────────────────────────

/**
 * Build the full delimited comment section string.
 * Sorts comments by created_at ascending.
 */
export function buildCommentSection(comments: RemoteComment[]): string {
  const sorted = [...comments].sort((a, b) => {
    return a.created_at < b.created_at ? -1 : a.created_at > b.created_at ? 1 : 0;
  });

  const entries = sorted.map((c) => {
    const author = c.author_email
      ? `${c.author_name} (${c.author_email})`
      : c.author_name;

    // Multi-line body: prefix every line with "> "
    const bodyLines = c.body.split('\n').map((line) => `> ${line}`).join('\n');

    return `### ${author} · ${c.created_at}\n${bodyLines}`;
  });

  return (
    `${START}\n` +
    `## Remote comments\n` +
    `\n` +
    `_Read-only snapshot. Comments live in the PM tool — reply there, not here._\n` +
    `\n` +
    entries.join('\n\n') +
    `\n${END}`
  );
}

// ── Main export ───────────────────────────────────────────────────────────────

export interface RenderCommentsSectionOpts {
  /** Absolute path to project root */
  projectRoot: string;
  /** Remote ID (e.g. LIN-1042) */
  remoteId: string;
  /** Comment array from cleargate_pull_comments */
  comments: RemoteComment[];
  /** Local work items to resolve wiki path from */
  localItems: Array<{ fm: Record<string, unknown> }>;
}

/**
 * Insert / replace / remove the ## Remote comments section on the wiki page
 * corresponding to the given remote_id.
 *
 * - If the wiki page does not exist: no-op (wiki-ingest may not have run yet).
 * - Byte-idempotent: running twice with identical input produces identical output.
 * - Atomic write via .tmp + rename.
 */
export async function renderCommentsSection(
  opts: RenderCommentsSectionOpts,
): Promise<void> {
  const { projectRoot, remoteId, comments, localItems } = opts;

  // Find the local item whose remote_id matches
  const localItem = localItems.find(
    (item) => item.fm['remote_id'] === remoteId,
  );
  if (!localItem) return;

  const bucket = resolveBucket(localItem.fm);
  const primaryId = getPrimaryId(localItem.fm);
  if (!bucket || !primaryId) return;

  const wikiPath = path.join(
    projectRoot,
    '.cleargate',
    'wiki',
    bucket,
    `${primaryId}.md`,
  );

  // Read existing wiki page
  let existing: string;
  try {
    existing = await fsPromises.readFile(wikiPath, 'utf8');
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return; // wiki page not yet built
    throw err;
  }

  const startIdx = existing.indexOf(START);
  const endIdx = existing.indexOf(END);

  let updated: string;

  if (startIdx === -1 && comments.length === 0) {
    // No section, no comments — no-op
    return;
  } else if (startIdx === -1 && comments.length > 0) {
    // Insert new section at end of file
    const section = buildCommentSection(comments);
    const base = existing.endsWith('\n\n')
      ? existing.slice(0, -1) // trim one trailing newline
      : existing.endsWith('\n')
      ? existing
      : existing + '\n';
    updated = base + '\n' + section + '\n';
  } else if (startIdx !== -1 && comments.length > 0) {
    // Replace existing section
    const section = buildCommentSection(comments);
    const before = existing.slice(0, startIdx).replace(/\n+$/, '');
    const after = existing.slice(endIdx + END.length).replace(/^\n+/, '');
    updated = before + '\n\n' + section + '\n' + (after ? '\n' + after : '');
  } else {
    // startIdx !== -1 && comments.length === 0: remove section
    const before = existing.slice(0, startIdx).replace(/\n+$/, '');
    const after = existing.slice(endIdx + END.length).replace(/^\n+/, '');
    updated = before + '\n' + (after ? after : '');
  }

  // Atomic write
  await writeAtomic(wikiPath, updated);
}

// ── Helpers ───────────────────────────────────────────────────────────────────

async function writeAtomic(filePath: string, content: string): Promise<void> {
  await fsPromises.mkdir(path.dirname(filePath), { recursive: true });
  const tmpPath = `${filePath}.tmp.${Date.now()}`;
  await fsPromises.writeFile(tmpPath, content, 'utf8');
  await fsPromises.rename(tmpPath, filePath);
}
