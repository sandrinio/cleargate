/**
 * frontmatter-merge.ts — STORY-010-04
 *
 * mergeFrontmatterConflict(localYaml, remoteYaml) → string
 *
 * For ISO-8601 timestamp fields: picks the lexicographically-greater value
 * (newer ISO-8601 strings sort later, so string comparison is safe).
 *
 * For other conflicting scalars: emits git-style conflict markers and returns
 * unresolved text for human resolution.
 *
 * Uses parseFrontmatter + serializeFrontmatter for lossless round-trip.
 * No second YAML emitter — FLASHCARD #yaml #frontmatter.
 *
 * No top-level await (FLASHCARD #tsup #cjs #esm).
 */

import { parseFrontmatter } from '../wiki/parse-frontmatter.js';
import { serializeFrontmatter } from './frontmatter-yaml.js';

/**
 * Timestamp fields where we pick the lexicographically-greater ISO-8601 value.
 * Note: last_synced_status is NOT in this list — it's a status string, not a timestamp.
 */
export const TIMESTAMP_FIELDS: ReadonlySet<string> = new Set([
  'pushed_at',
  'last_pulled_at',
  'last_remote_update',
  'updated_at',
  'created_at',
]);

/**
 * mergeFrontmatterConflict — merge two frontmatter YAML blocks.
 *
 * Returns a serialized frontmatter string (with --- delimiters) where:
 *   - Timestamp fields use the newer (lexicographically greater) ISO value.
 *   - Non-timestamp scalar conflicts are replaced with git-style markers.
 *   - Non-conflicting fields take the remote value (remote wins on non-timestamp
 *     scalars where both sides agree, and for new fields only in remote).
 *
 * @param localYaml  Full file text OR just the ---...--- block from the local file.
 * @param remoteYaml Full file text OR just the ---...--- block from the remote item.
 * @returns Serialized frontmatter string with --- delimiters. May contain conflict markers.
 */
export function mergeFrontmatterConflict(localYaml: string, remoteYaml: string): string {
  // Parse — support either full file or just the frontmatter block
  const localFm = parseBlock(localYaml);
  const remoteFm = parseBlock(remoteYaml);

  const merged: Record<string, unknown> = { ...localFm };

  // Merge each key from remote into local
  for (const [key, remoteVal] of Object.entries(remoteFm)) {
    const localVal = localFm[key];

    if (localVal === undefined) {
      // New field in remote — take it
      merged[key] = remoteVal;
      continue;
    }

    if (deepEqual(localVal, remoteVal)) {
      // Same value — no conflict
      continue;
    }

    // Values differ
    if (TIMESTAMP_FIELDS.has(key)) {
      // Pick newer ISO-8601 (lexicographically greater)
      const localStr = String(localVal ?? '');
      const remoteStr = String(remoteVal ?? '');
      merged[key] = remoteStr > localStr ? remoteVal : localVal;
    } else {
      // Non-timestamp conflict — emit git-style markers as a string value
      const localStr = String(localVal ?? '');
      const remoteStr = String(remoteVal ?? '');
      merged[key] = `<<<<<<< local\n${localStr}\n=======\n${remoteStr}\n>>>>>>> remote`;
    }
  }

  return serializeFrontmatter(merged);
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Parse a string that is either a full file (---\n...\n---\n<body>) or
 * just a frontmatter block (---\n...\n---). Returns the frontmatter record.
 */
function parseBlock(text: string): Record<string, unknown> {
  const trimmed = text.trim();
  if (!trimmed.startsWith('---')) {
    throw new Error('mergeFrontmatterConflict: input does not start with ---');
  }
  // If text has no body, add a trailing newline so parseFrontmatter works
  const normalized = trimmed.endsWith('---') ? trimmed + '\n' : trimmed;
  const { fm } = parseFrontmatter(normalized);
  return fm;
}

function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (typeof a !== typeof b) return false;
  if (a === null || b === null) return false;
  if (typeof a === 'object' && typeof b === 'object') {
    return JSON.stringify(a) === JSON.stringify(b);
  }
  return false;
}
