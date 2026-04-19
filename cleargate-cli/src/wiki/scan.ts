import * as fs from 'node:fs';
import * as path from 'node:path';
import { parseFrontmatter } from './parse-frontmatter.js';
import { deriveBucket } from './derive-bucket.js';
import { deriveRepo } from './derive-repo.js';
import type { WikiPageType, RepoTag } from './page-schema.js';

export interface RawItem {
  /** Absolute path on disk */
  absPath: string;
  /** Path relative to repo root */
  rawPath: string;
  id: string;
  bucket: string;
  type: WikiPageType;
  repo: RepoTag;
  fm: Record<string, unknown>;
  body: string;
}

/** Directories under .cleargate/ that are excluded from ingest per §10.3. */
const EXCLUDED_SUFFIXES = [
  '.cleargate/knowledge/',
  '.cleargate/templates/',
  '.cleargate/sprint-runs/',
  '.cleargate/hook-log/',
  '.cleargate/wiki/',
];

/**
 * Scan pending-sync/ + archive/ under deliveryRoot for markdown work items.
 * Returns a sorted (by id) list of parsed raw items.
 */
export function scanRawItems(deliveryRoot: string, repoRoot: string): RawItem[] {
  const results: RawItem[] = [];

  for (const subdir of ['pending-sync', 'archive']) {
    const dir = path.join(deliveryRoot, subdir);
    if (!fs.existsSync(dir)) continue;

    const entries = fs.readdirSync(dir, { recursive: true, encoding: 'utf8' }) as string[];
    for (const rel of entries) {
      if (!rel.endsWith('.md')) continue;
      if (rel.includes('~') || rel.startsWith('.')) continue;

      const absPath = path.join(dir, rel);
      const stat = fs.statSync(absPath);
      if (!stat.isFile()) continue;

      // Compute rawPath relative to repo root
      const rawPath = path.relative(repoRoot, absPath).replace(/\\/g, '/');

      // Check exclusions
      const isExcluded = EXCLUDED_SUFFIXES.some((excl) => rawPath.startsWith(excl));
      if (isExcluded) continue;

      // Derive bucket info from filename
      const filename = path.basename(absPath);
      let bucketInfo: ReturnType<typeof deriveBucket>;
      try {
        bucketInfo = deriveBucket(filename);
      } catch {
        // Not a recognized work-item filename — skip silently
        continue;
      }

      // Derive repo from path
      let repo: RepoTag;
      try {
        repo = deriveRepo(rawPath);
      } catch {
        continue;
      }

      // Parse frontmatter
      const raw = fs.readFileSync(absPath, 'utf8');
      let fm: Record<string, unknown>;
      let body: string;
      try {
        const parsed = parseFrontmatter(raw);
        fm = parsed.fm;
        body = parsed.body;
      } catch {
        // Malformed frontmatter — skip
        continue;
      }

      results.push({
        absPath,
        rawPath,
        id: bucketInfo.id,
        bucket: bucketInfo.bucket,
        type: bucketInfo.type,
        repo,
        fm,
        body,
      });
    }
  }

  // Sort deterministically by id (alphanumeric ascending)
  results.sort((a, b) => a.id.localeCompare(b.id));
  return results;
}
