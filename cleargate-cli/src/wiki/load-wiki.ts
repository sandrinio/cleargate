import * as fs from 'node:fs';
import * as path from 'node:path';
import { parseFrontmatter } from './parse-frontmatter.js';
import type { WikiPage } from './page-schema.js';
import type { WikiPageType, RepoTag } from './page-schema.js';

export interface LoadedWikiPage {
  absPath: string;
  page: WikiPage;
  body: string;
}

const BUCKET_DIRS = ['epics', 'stories', 'sprints', 'proposals', 'crs', 'bugs', 'topics'];

/**
 * Glob+Read every wiki page from wikiRoot once.
 * Shared by wiki-lint and wiki-query (STORY-002-07 and STORY-002-08).
 */
export function loadWikiPages(wikiRoot: string): LoadedWikiPage[] {
  const results: LoadedWikiPage[] = [];

  for (const bucket of BUCKET_DIRS) {
    const dir = path.join(wikiRoot, bucket);
    if (!fs.existsSync(dir)) continue;

    const entries = fs.readdirSync(dir, { encoding: 'utf8' }) as string[];
    for (const filename of entries) {
      if (!filename.endsWith('.md')) continue;
      const absPath = path.join(dir, filename);
      const stat = fs.statSync(absPath);
      if (!stat.isFile()) continue;

      const raw = fs.readFileSync(absPath, 'utf8');
      let fm: Record<string, unknown>;
      let body: string;
      try {
        const parsed = parseFrontmatter(raw);
        fm = parsed.fm;
        body = parsed.body;
      } catch {
        continue;
      }

      const page: WikiPage = {
        type: (fm['type'] as WikiPageType) ?? 'epic',
        id: String(fm['id'] ?? ''),
        parent: String(fm['parent'] ?? ''),
        children: Array.isArray(fm['children'])
          ? (fm['children'] as unknown[]).map(String)
          : [],
        status: String(fm['status'] ?? ''),
        remote_id: String(fm['remote_id'] ?? ''),
        raw_path: String(fm['raw_path'] ?? ''),
        last_ingest: String(fm['last_ingest'] ?? ''),
        last_ingest_commit: String(fm['last_ingest_commit'] ?? ''),
        repo: (fm['repo'] as RepoTag) ?? 'planning',
      };

      results.push({ absPath, page, body });
    }
  }

  return results;
}
