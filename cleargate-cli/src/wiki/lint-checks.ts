/**
 * Pure-function lint check implementations.
 * One exported function per category so they can be unit-tested in isolation.
 * Categories must use these exact strings (subagent + CLI agree):
 *   orphan, repo-mismatch, stale-commit, missing-ingest, broken-backlink,
 *   invalidated-citation, excluded-path-ingested, pagination-needed, index-budget
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { spawnSync } from 'node:child_process';
import yaml from 'js-yaml';
import type { GitRunner } from './git-sha.js';
import type { LoadedWikiPage } from './load-wiki.js';
import { deriveRepo } from './derive-repo.js';
import { parseFrontmatter } from './parse-frontmatter.js';
import { detectWorkItemTypeFromFm } from '../lib/work-item-type.js';

export interface LintFinding {
  category: string;
  line: string;
}

/** §10.3 excluded directories — wiki pages must not exist for raw files under these. */
const EXCLUDED_DIRS = [
  '.cleargate/knowledge/',
  '.cleargate/templates/',
  '.cleargate/sprint-runs/',
  '.cleargate/hook-log/',
  '.cleargate/wiki/',
];

/** Default maximum entries per bucket before pagination-needed fires (overridable via wiki config). */
const DEFAULT_MAX_BUCKET_ENTRIES = 50;

/**
 * Check (a): Orphan — wiki page's raw_path doesn't exist on disk.
 * Skips pages whose raw_path is under an excluded directory (caught by check 7).
 */
export function checkOrphan(page: LoadedWikiPage, repoRoot: string): LintFinding | null {
  const rawPath = page.page.raw_path;
  if (!rawPath) return null;
  // Don't flag orphan for excluded paths — that's caught by excluded-path-ingested
  const isExcluded = EXCLUDED_DIRS.some((excl) => rawPath.startsWith(excl));
  if (isExcluded) return null;

  const absRaw = path.join(repoRoot, rawPath);
  if (!fs.existsSync(absRaw)) {
    const relPage = path.relative(path.join(repoRoot, '.cleargate', 'wiki'), page.absPath).replace(/\\/g, '/');
    return {
      category: 'orphan',
      line: `orphan: ${relPage} -> missing ${rawPath} (raw missing)`,
    };
  }
  return null;
}

/**
 * Check (b): repo-mismatch — stored repo field doesn't match raw_path prefix.
 */
export function checkRepoMismatch(page: LoadedWikiPage, repoRoot: string): LintFinding | null {
  const rawPath = page.page.raw_path;
  if (!rawPath) return null;

  let derivedRepo: string;
  try {
    derivedRepo = deriveRepo(rawPath);
  } catch {
    return null; // Can't derive — not our responsibility to flag here
  }

  if (page.page.repo !== derivedRepo) {
    const relPage = path.relative(path.join(repoRoot, '.cleargate', 'wiki'), page.absPath).replace(/\\/g, '/');
    return {
      category: 'repo-mismatch',
      line: `repo-mismatch: ${relPage} declares repo:${page.page.repo} but raw_path implies repo:${derivedRepo}`,
    };
  }
  return null;
}

/**
 * Check (c): stale-commit — stored last_ingest_commit differs from current git HEAD SHA.
 * Empty stored SHA is tolerated (untracked file).
 */
export function checkStaleCommit(
  page: LoadedWikiPage,
  repoRoot: string,
  gitRunner?: GitRunner,
): LintFinding | null {
  const rawPath = page.page.raw_path;
  if (!rawPath) return null;

  const storedSha = page.page.last_ingest_commit;
  // If stored SHA is empty, file was untracked at ingest time — tolerate
  if (!storedSha) return null;

  // Run git log -1
  let currentSha: string;
  if (gitRunner) {
    currentSha = gitRunner('git', ['log', '-1', '--format=%H', '--', rawPath]).trim();
  } else {
    const result = spawnSync('git', ['log', '-1', '--format=%H', '--', rawPath], {
      encoding: 'utf8',
      cwd: repoRoot,
    });
    currentSha = (result.stdout ?? '').trim();
  }

  if (!currentSha) return null; // untracked now — don't flag
  if (storedSha !== currentSha) {
    const relPage = path.relative(path.join(repoRoot, '.cleargate', 'wiki'), page.absPath).replace(/\\/g, '/');
    return {
      category: 'stale-commit',
      line: `stale-commit: ${relPage} at ${storedSha}, current ${currentSha}`,
    };
  }
  return null;
}

/**
 * Check (d): missing-ingest — raw file mtime newer than wiki page mtime.
 */
export function checkMissingIngest(page: LoadedWikiPage, repoRoot: string): LintFinding | null {
  const rawPath = page.page.raw_path;
  if (!rawPath) return null;

  const absRaw = path.join(repoRoot, rawPath);
  if (!fs.existsSync(absRaw)) return null; // orphan check handles this

  const rawStat = fs.statSync(absRaw);
  const pageStat = fs.statSync(page.absPath);

  // Use > 2s gap to avoid HFS+ mtime resolution flakiness (per blueprint gotcha)
  const rawMtimeMs = rawStat.mtimeMs;
  const pageMtimeMs = pageStat.mtimeMs;

  if (rawMtimeMs - pageMtimeMs > 2000) {
    const relPage = path.relative(path.join(repoRoot, '.cleargate', 'wiki'), page.absPath).replace(/\\/g, '/');
    const rawMtime = rawStat.mtime.toISOString();
    const pageMtime = pageStat.mtime.toISOString();
    return {
      category: 'missing-ingest',
      line: `missing-ingest: ${rawPath} newer than ${relPage} (raw mtime: ${rawMtime}, page mtime: ${pageMtime})`,
    };
  }
  return null;
}

/**
 * Check (backlink): broken backlink — child's parent exists but parent doesn't list the child.
 * O(n) linear scan over collected parent declarations.
 */
export function checkBrokenBacklinks(pages: LoadedWikiPage[], repoRoot: string): LintFinding[] {
  const wikiRoot = path.join(repoRoot, '.cleargate', 'wiki');
  // Build a map of id -> page for O(1) lookup
  const byId = new Map<string, LoadedWikiPage>();
  for (const p of pages) {
    if (p.page.id) byId.set(p.page.id, p);
  }

  const findings: LintFinding[] = [];

  for (const childPage of pages) {
    const parentRef = childPage.page.parent;
    if (!parentRef) continue;

    // Extract parent ID from "[[PARENT-ID]]" form
    const match = parentRef.match(/\[\[(.+?)\]\]/);
    if (!match) continue;
    const parentId = match[1];

    const parentPage = byId.get(parentId);
    if (!parentPage) {
      // Parent page missing — flag
      const relChild = path.relative(wikiRoot, childPage.absPath).replace(/\\/g, '/');
      findings.push({
        category: 'broken-backlink',
        line: `broken-backlink: ${relChild} -> ${parentId} (parent missing child entry)`,
      });
      continue;
    }

    // Check that parent's children list contains [[childId]]
    const childId = childPage.page.id;
    const childRef = `[[${childId}]]`;
    const parentHasChild = parentPage.page.children.some(
      (c) => c === childRef || c === childId,
    );

    if (!parentHasChild) {
      const relChild = path.relative(wikiRoot, childPage.absPath).replace(/\\/g, '/');
      findings.push({
        category: 'broken-backlink',
        line: `broken-backlink: ${relChild} -> ${parentId} (parent missing child entry)`,
      });
    }
  }

  return findings;
}

/**
 * Check: invalidated-citation — topic page cites a cancelled or missing item.
 */
export function checkInvalidatedCitations(pages: LoadedWikiPage[], repoRoot: string): LintFinding[] {
  const wikiRoot = path.join(repoRoot, '.cleargate', 'wiki');
  const byId = new Map<string, LoadedWikiPage>();
  for (const p of pages) {
    if (p.page.id) byId.set(p.page.id, p);
  }

  const findings: LintFinding[] = [];

  const topicPages = pages.filter((p) => p.page.type === 'topic');

  for (const topicPage of topicPages) {
    // WikiPage doesn't have a cites field — re-parse raw frontmatter to get it.
    const relTopic = path.relative(wikiRoot, topicPage.absPath).replace(/\\/g, '/');

    let citesList: string[] = [];
    try {
      const raw = fs.readFileSync(topicPage.absPath, 'utf8');
      const { fm } = parseFrontmatter(raw);
      const rawCites = fm['cites'];
      if (Array.isArray(rawCites)) {
        citesList = (rawCites as unknown[]).map(String);
      }
    } catch {
      continue;
    }

    for (const cite of citesList) {
      const match = cite.match(/\[\[(.+?)\]\]/);
      const id = match ? match[1] : cite;

      const citedPage = byId.get(id);
      if (!citedPage) {
        findings.push({
          category: 'invalidated-citation',
          line: `invalidated-citation: ${relTopic} cites [[${id}]] (missing)`,
        });
        continue;
      }

      const status = citedPage.page.status;
      if (status === 'cancelled' || status.toLowerCase().includes('cancelled')) {
        findings.push({
          category: 'invalidated-citation',
          line: `invalidated-citation: ${relTopic} cites [[${id}]] (cancelled)`,
        });
      }
    }
  }

  return findings;
}

/**
 * Check: excluded-path-ingested — wiki page exists for a raw file under an excluded directory.
 */
export function checkExcludedPathIngested(page: LoadedWikiPage, repoRoot: string): LintFinding | null {
  const rawPath = page.page.raw_path;
  if (!rawPath) return null;

  const isExcluded = EXCLUDED_DIRS.some((excl) => rawPath.startsWith(excl));
  if (isExcluded) {
    const relPage = path.relative(path.join(repoRoot, '.cleargate', 'wiki'), page.absPath).replace(/\\/g, '/');
    return {
      category: 'excluded-path-ingested',
      line: `excluded-path-ingested: ${relPage} (raw_path ${rawPath} is under an excluded directory)`,
    };
  }
  return null;
}

/**
 * Meta-check: pagination-needed — fires if any bucket has more than `ceiling` entries.
 * @param ceiling Maximum entries per bucket; defaults to DEFAULT_MAX_BUCKET_ENTRIES=50.
 *                Configure via `.cleargate/config.yml` → `wiki.bucket_pagination_ceiling`.
 */
export function checkPaginationNeeded(pages: LoadedWikiPage[], ceiling: number = DEFAULT_MAX_BUCKET_ENTRIES): LintFinding[] {
  // Count by bucket (derived from absPath directory name)
  const bucketCounts = new Map<string, number>();
  for (const p of pages) {
    const bucket = path.basename(path.dirname(p.absPath));
    bucketCounts.set(bucket, (bucketCounts.get(bucket) ?? 0) + 1);
  }

  const findings: LintFinding[] = [];
  for (const [bucket, count] of bucketCounts) {
    if (count > ceiling) {
      findings.push({
        category: 'pagination-needed',
        line: `pagination-needed: ${bucket} (${count} entries, max ${ceiling} per bucket)`,
      });
    }
  }
  return findings;
}

/** Work-item types that trigger enforcing gate-failure lint (not advisory). */
const ENFORCING_TYPES = new Set(['epic', 'story', 'cr', 'bug']);

/** Status values considered "ready" (🟢-candidate). */
const READY_STATUSES = new Set(['Ready', 'Active']);

/**
 * Parse the cached_gate_result from a raw frontmatter record.
 * parseFrontmatter stores nested YAML objects as opaque strings starting with '{'.
 * This helper resolves either form into a plain object or null.
 */
function parseCachedGateResult(
  raw: unknown,
): { pass: unknown; failing_criteria: unknown; last_gate_check: unknown } | null {
  if (!raw || raw === null) return null;

  // Opaque string form — inline flow YAML written by writeCachedGate
  if (typeof raw === 'string') {
    if (!raw.startsWith('{')) return null;
    try {
      const parsed = yaml.load(raw);
      if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return null;
      const p = parsed as Record<string, unknown>;
      return { pass: p['pass'], failing_criteria: p['failing_criteria'], last_gate_check: p['last_gate_check'] };
    } catch {
      return null;
    }
  }

  // Already-parsed object form (future-proofing)
  if (typeof raw === 'object' && !Array.isArray(raw)) {
    const p = raw as Record<string, unknown>;
    return { pass: p['pass'], failing_criteria: p['failing_criteria'], last_gate_check: p['last_gate_check'] };
  }

  return null;
}

/**
 * Check: gate-failure — 🟢-candidate Epic/Story/CR/Bug with cached_gate_result.pass === false.
 * Reads the raw work-item file (not the wiki page).
 * Proposal / Sprint / Initiative are advisory only → returns null (no enforcing block).
 */
export function checkGateFailure(page: LoadedWikiPage, repoRoot: string): LintFinding | null {
  const rawPath = page.page.raw_path;
  if (!rawPath) return null;

  const absRaw = path.join(repoRoot, rawPath);
  if (!fs.existsSync(absRaw)) return null;

  let rawFm: Record<string, unknown>;
  try {
    const raw = fs.readFileSync(absRaw, 'utf8');
    const { fm } = parseFrontmatter(raw);
    rawFm = fm;
  } catch {
    return null;
  }

  const cgr = parseCachedGateResult(rawFm['cached_gate_result']);
  if (!cgr || cgr.pass !== false) return null;

  // Check if the work-item type is enforcing
  const wiType = detectWorkItemTypeFromFm(rawFm);
  if (!wiType || !ENFORCING_TYPES.has(wiType)) return null;

  // Check if this is a 🟢-candidate (status Ready/Active or ambiguity 🟢 Low)
  const status = String(rawFm['status'] ?? '');
  const ambiguity = String(rawFm['ambiguity'] ?? '');
  const isReadyCandidate = READY_STATUSES.has(status) || ambiguity === '🟢 Low';
  if (!isReadyCandidate) return null;

  // Collect failing criteria IDs
  const failingCriteria = cgr.failing_criteria;
  const criteriaIds: string[] = [];
  if (Array.isArray(failingCriteria)) {
    for (const criterion of failingCriteria as unknown[]) {
      if (criterion && typeof criterion === 'object' && 'id' in (criterion as object)) {
        criteriaIds.push(String((criterion as Record<string, unknown>)['id']));
      } else if (typeof criterion === 'string') {
        criteriaIds.push(criterion);
      }
    }
  }

  const criteriaStr = criteriaIds.length > 0 ? criteriaIds.join(', ') : 'unknown';
  return {
    category: 'gate-failure',
    line: `gate-failure: ${rawPath} failed criteria: ${criteriaStr}`,
  };
}

/**
 * Check: gate-stale — cached_gate_result.last_gate_check < updated_at (ISO-8601 lexical compare).
 * Applies to ALL work-item types (including Proposal/Sprint/Initiative).
 * Reads the raw work-item file (not the wiki page).
 */
export function checkGateStaleness(page: LoadedWikiPage, repoRoot: string): LintFinding | null {
  const rawPath = page.page.raw_path;
  if (!rawPath) return null;

  const absRaw = path.join(repoRoot, rawPath);
  if (!fs.existsSync(absRaw)) return null;

  let rawFm: Record<string, unknown>;
  try {
    const raw = fs.readFileSync(absRaw, 'utf8');
    const { fm } = parseFrontmatter(raw);
    rawFm = fm;
  } catch {
    return null;
  }

  const cgr = parseCachedGateResult(rawFm['cached_gate_result']);
  if (!cgr) return null;

  const lastGateCheck = cgr.last_gate_check;
  if (!lastGateCheck || lastGateCheck === null) return null;

  const updatedAt = rawFm['updated_at'];
  if (!updatedAt) return null;

  const lastCheckStr = String(lastGateCheck);
  const updatedAtStr = String(updatedAt);

  // ISO-8601 lexical compare: if last_gate_check < updated_at → stale
  if (lastCheckStr < updatedAtStr) {
    return {
      category: 'gate-stale',
      line: `gate-stale: ${rawPath} last_gate_check=${lastCheckStr} < updated_at=${updatedAtStr}`,
    };
  }
  return null;
}

/**
 * Karpathy discovery pass: scan page bodies for plain-text ID mentions
 * (not wrapped in [[]]). Emit suggest lines.
 */
export function discoverPlainTextMentions(pages: LoadedWikiPage[], repoRoot: string): string[] {
  const wikiRoot = path.join(repoRoot, '.cleargate', 'wiki');
  const byId = new Map<string, boolean>();
  for (const p of pages) {
    if (p.page.id) byId.set(p.page.id, true);
  }

  const suggestions: string[] = [];
  const ID_PATTERN = /\b((?:EPIC|STORY|SPRINT|PROPOSAL|CR|BUG)-[\w-]+)\b/g;
  const LINK_PATTERN = /\[\[[\w-]+\]\]/g;

  for (const page of pages) {
    const relPage = path.relative(wikiRoot, page.absPath).replace(/\\/g, '/');
    // Find all [[...]] wrapped references to exclude
    const wrappedRefs = new Set<string>();
    for (const m of page.body.matchAll(LINK_PATTERN)) {
      const inner = m[0].slice(2, -2);
      wrappedRefs.add(inner);
    }

    // Find plain-text ID mentions
    for (const m of page.body.matchAll(ID_PATTERN)) {
      const mentionedId = m[1];
      if (!byId.has(mentionedId)) continue;
      if (wrappedRefs.has(mentionedId)) continue;
      if (mentionedId === page.page.id) continue; // self-reference
      suggestions.push(`suggest: ${relPage} mentions ${mentionedId} in plain text, consider [[${mentionedId}]] wrap`);
    }
  }

  return suggestions;
}

/**
 * Check: index-budget — wiki/index.md approximate token count exceeds configured ceiling.
 * Token heuristic: Math.round(bytes / 4). Returns null when index.md is absent.
 * This check is a structural check, not a per-page check, so it takes repoRoot directly.
 */
export interface IndexBudgetResult {
  /** Present when tokens > ceiling. Push this into findings array. */
  finding: LintFinding | null;
  /** Always populated when index.md exists; undefined when file absent. */
  tokens?: number;
  ceiling?: number;
}

export function checkIndexBudget(repoRoot: string, indexTokenCeiling: number): IndexBudgetResult {
  const indexPath = path.join(repoRoot, '.cleargate', 'wiki', 'index.md');

  if (!fs.existsSync(indexPath)) {
    return { finding: null };
  }

  const bytes = fs.statSync(indexPath).size;
  const tokens = Math.round(bytes / 4);
  const ceiling = indexTokenCeiling;

  if (tokens > ceiling) {
    return {
      finding: {
        category: 'index-budget',
        line: `index-budget: wiki/index.md exceeds token ceiling: ${tokens} > ${ceiling}. Shard or prune (see EPIC-015).`,
      },
      tokens,
      ceiling,
    };
  }

  return { finding: null, tokens, ceiling };
}
