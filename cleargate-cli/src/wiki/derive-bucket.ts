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

/** Allowlisted report filenames under sprint-runs/SPRINT-NN/ */
const SPRINT_REPORT_FILENAMES = ['REPORT.md'] as const;
const SPRINT_REPORT_CANONICAL_RE = /^SPRINT-\d{2,}_REPORT\.md$/;

/**
 * Check whether a relative path is a sprint report allowlisted file.
 * Matches:
 *   .cleargate/sprint-runs/SPRINT-NN/REPORT.md (legacy)
 *   .cleargate/sprint-runs/SPRINT-NN/SPRINT-NN_REPORT.md (canonical)
 */
export function isSprintReportPath(relPath: string): boolean {
  const normalised = relPath.replace(/\\/g, '/');
  const match = /\.cleargate\/sprint-runs\/(SPRINT-\d{2,})\/([^/]+)$/.exec(normalised);
  if (!match) return false;
  const filename = match[2];
  return (SPRINT_REPORT_FILENAMES as readonly string[]).includes(filename)
    || SPRINT_REPORT_CANONICAL_RE.test(filename);
}

/**
 * Derive bucket, type, and id from a sprint-runs report path.
 * The id is derived from the SPRINT-NN parent directory name, not the filename.
 * Call isSprintReportPath() first to confirm eligibility.
 */
export function deriveBucketFromReportPath(relPath: string): BucketInfo {
  const normalised = relPath.replace(/\\/g, '/');
  const match = /\.cleargate\/sprint-runs\/(SPRINT-\d{2,})\//.exec(normalised);
  if (!match) {
    throw new Error(`deriveBucketFromReportPath: cannot extract SPRINT-NN from: ${relPath}`);
  }
  const id = match[1];
  return { type: 'sprint', id, bucket: 'sprints' };
}

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
