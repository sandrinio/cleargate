/**
 * changelog.ts — STORY-016-04
 *
 * Parses and slices Common-Changelog format CHANGELOG.md files.
 * Shared by `cleargate upgrade` (print delta before merge loop).
 *
 * API contract is LOCKED per M1.md §3 (STORY-016-04 blueprint).
 */

import { compareSemver } from './registry-check.js';

// ─── Public types ─────────────────────────────────────────────────────────────

/** Section heading regex — single source of truth shared with 016-03's format test */
export const HEADING_RE = /^## \[(\d+\.\d+\.\d+)\] — (\d{4}-\d{2}-\d{2})/m;

export interface ChangelogSection {
  version: string; // "0.9.0"
  date: string;    // "2026-04-30"
  body: string;    // section content INCLUDING the heading line, trimmed of trailing blank
}

// ─── Implementation ───────────────────────────────────────────────────────────

/**
 * Parse the entire CHANGELOG into sections, most-recent first.
 * Returns [] on parse fail or empty input.
 */
export function parseChangelog(content: string): ChangelogSection[] {
  if (!content || typeof content !== 'string') return [];

  // Global regex to find all section headings
  const HEADING_RE_GLOBAL = /^## \[(\d+\.\d+\.\d+)\] — (\d{4}-\d{2}-\d{2})/gm;

  const sections: ChangelogSection[] = [];
  const matches: Array<{ version: string; date: string; index: number }> = [];

  let match: RegExpExecArray | null;
  while ((match = HEADING_RE_GLOBAL.exec(content)) !== null) {
    matches.push({
      version: match[1],
      date: match[2],
      index: match.index,
    });
  }

  if (matches.length === 0) return [];

  for (let i = 0; i < matches.length; i++) {
    const start = matches[i].index;
    // End is either start of next section or end of content
    const end = i + 1 < matches.length ? matches[i + 1].index : content.length;
    // Extract body (trim trailing whitespace/blank lines but keep heading)
    const rawBody = content.slice(start, end);
    const body = rawBody.trimEnd();

    sections.push({
      version: matches[i].version,
      date: matches[i].date,
      body,
    });
  }

  return sections;
}

/**
 * Slice sections where fromExclusive < section.version <= toInclusive.
 *
 * - Returns sections in the original CHANGELOG order (most-recent first).
 * - If fromExclusive is older than all entries (or not found), all sections
 *   up to toInclusive are returned.
 * - If toInclusive is not found, returns empty [].
 * - If fromExclusive === toInclusive, returns [].
 */
export function sliceChangelog(
  content: string,
  fromExclusive: string,
  toInclusive: string
): ChangelogSection[] {
  if (!content || typeof content !== 'string') return [];

  // Same-version: nothing to show
  if (compareSemver(fromExclusive, toInclusive) === 0) return [];

  const sections = parseChangelog(content);
  if (sections.length === 0) return [];

  // Filter: version must be > fromExclusive AND <= toInclusive
  const result = sections.filter((s) => {
    const cmpFrom = compareSemver(s.version, fromExclusive); // >0 means s > from
    const cmpTo = compareSemver(s.version, toInclusive);     // <=0 means s <= to

    return cmpFrom > 0 && cmpTo <= 0;
  });

  return result;
}
