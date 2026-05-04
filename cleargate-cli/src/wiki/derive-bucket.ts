import type { WikiPageType } from './page-schema.js';

export interface BucketInfo {
  type: WikiPageType;
  id: string;
  bucket: string;
}

const PREFIX_MAP: Array<{ prefix: string; type: WikiPageType; bucket: string }> = [
  { prefix: 'EPIC-',        type: 'epic',       bucket: 'epics' },
  { prefix: 'STORY-',       type: 'story',      bucket: 'stories' },
  { prefix: 'SPRINT-',      type: 'sprint',     bucket: 'sprints' },
  { prefix: 'PROPOSAL-',    type: 'proposal',   bucket: 'proposals' },
  { prefix: 'CR-',          type: 'cr',         bucket: 'crs' },
  { prefix: 'BUG-',         type: 'bug',        bucket: 'bugs' },
  { prefix: 'INITIATIVE-',  type: 'initiative', bucket: 'initiatives' },
];

/**
 * Derive bucket, type, and id from a filename stem.
 * Filename `STORY-042-01_name.md` → `{ type: 'story', id: 'STORY-042-01', bucket: 'stories' }`.
 */
export function deriveBucket(filename: string): BucketInfo {
  // Strip path if any
  const base = filename.includes('/') ? filename.split('/').pop()! : filename;
  // Remove .md suffix
  const stem = base.endsWith('.md') ? base.slice(0, -3) : base;
  // id = everything before the first `_`
  const underscoreIdx = stem.indexOf('_');
  const id = underscoreIdx === -1 ? stem : stem.slice(0, underscoreIdx);

  for (const { prefix, type, bucket } of PREFIX_MAP) {
    if (id.startsWith(prefix)) {
      return { type, id, bucket };
    }
  }

  throw new Error(`deriveBucket: cannot determine bucket for filename: ${filename}`);
}
