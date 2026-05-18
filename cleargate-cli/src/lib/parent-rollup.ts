/**
 * parent-rollup.ts — CR-066 parent status rollup library
 *
 * Pure library: no I/O side-effects beyond reading frontmatter from disk.
 * Writing flips is the responsibility of the caller (STORY-066-02).
 *
 * Public API:
 *   rollUpParentStatus(parentFilePath, opts) → Promise<RollupResult>
 *   walkActiveParents(opts) → Promise<RollupResult[]>
 *   RollupResult (interface)
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { parseFrontmatter } from '../wiki/parse-frontmatter.js';
import { ARTIFACT_TERMINAL_STATUSES } from './lifecycle-reconcile.js';

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface RollupResult {
  parent_id: string;
  parent_path: string;
  current_status: string;
  proposed_status: 'Completed' | null;
  coverage: 'full' | 'partial' | 'zero' | 'sub-epic-partial';
  terminal_children: string[];
  pending_children: string[];
  verdict: 'auto-flip' | 'halt-partial' | 'halt-zero-children' | 'skip-deferred' | 'no-op';
  halt_reason?: string;
}

export interface WalkActiveParentsOpts {
  deliveryRoot: string;
  archiveRoot: string;
}

// ─── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Safely parse frontmatter from a file path.
 * Returns null on any read or parse error.
 */
function readFm(filePath: string): Record<string, unknown> | null {
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    const { fm } = parseFrontmatter(raw);
    return fm;
  } catch {
    return null;
  }
}

/**
 * Extract the canonical ID from frontmatter, checking all known ID-key conventions
 * in priority order before falling back to the filename stem.
 *
 * Key priority order mirrors template conventions:
 *   story_id (story.md) → epic_id (epic.md) → sprint_id (Sprint Plan Template.md)
 *   → bug_id (Bug.md) → cr_id (CR.md) → initiative_id (initiative.md)
 *   → hotfix_id (hotfix.md)
 *
 * Filename stem fallback: takes the first underscore-delimited segment so that
 * files named "EPIC-010_Multi_Participant_MCP_Sync.md" resolve to "EPIC-010".
 */
function extractId(fm: Record<string, unknown>, filePath: string): string {
  for (const key of [
    'story_id',
    'epic_id',
    'sprint_id',
    'bug_id',
    'cr_id',
    'initiative_id',
    'hotfix_id',
  ]) {
    const val = fm[key];
    if (typeof val === 'string' && val.trim() !== '') return val.trim();
  }
  // Fallback: parse from filename stem (first underscore-delimited segment)
  const stem = path.basename(filePath, '.md');
  return stem.split('_')[0] ?? stem;
}

/**
 * Enumerate all children of a parent across both archive and pending-sync.
 * Children are identified by `parent_cleargate_id` OR `parent_epic_ref` frontmatter
 * matching the parentId.
 *
 * Caching is done via the fmCache map (keyed by absolute path) to avoid
 * re-reading files during recursive sub-epic walks.
 */
function enumerateChildren(
  parentId: string,
  deliveryRoot: string,
  archiveRoot: string,
  fmCache: Map<string, Record<string, unknown>>
): { id: string; status: string }[] {
  const pendingSyncDir = path.join(deliveryRoot, 'pending-sync');
  const results: { id: string; status: string }[] = [];

  const pools: string[] = [];
  if (fs.existsSync(archiveRoot)) pools.push(archiveRoot);
  if (fs.existsSync(pendingSyncDir)) pools.push(pendingSyncDir);

  for (const dir of pools) {
    let entries: string[];
    try {
      entries = fs.readdirSync(dir);
    } catch {
      entries = [];
    }

    for (const entry of entries) {
      if (!entry.endsWith('.md')) continue;
      const absPath = path.join(dir, entry);

      let fm = fmCache.get(absPath);
      if (fm === undefined) {
        const parsed = readFm(absPath);
        if (parsed === null) continue;
        fm = parsed;
        fmCache.set(absPath, fm);
      }

      // Match by parent_cleargate_id or parent_epic_ref
      const parentCleargateId = fm['parent_cleargate_id'];
      const parentEpicRef = fm['parent_epic_ref'];

      const isChild =
        (typeof parentCleargateId === 'string' && parentCleargateId.trim() === parentId) ||
        (typeof parentEpicRef === 'string' && parentEpicRef.trim() === parentId);

      if (!isChild) continue;

      const childId = extractId(fm, absPath);
      const status = typeof fm['status'] === 'string' ? fm['status'].trim() : '';
      results.push({ id: childId, status });
    }
  }

  return results;
}

// ─── Core rollup logic ────────────────────────────────────────────────────────

/**
 * Internal implementation with cycle-detection via visited set.
 */
async function rollUpParentStatusInternal(
  parentFilePath: string,
  opts: WalkActiveParentsOpts,
  visited: Set<string>,
  fmCache: Map<string, Record<string, unknown>>
): Promise<RollupResult> {
  const { deliveryRoot, archiveRoot } = opts;

  // Read parent frontmatter
  let fm = fmCache.get(parentFilePath);
  if (fm === undefined) {
    const raw = readFm(parentFilePath);
    if (raw === null) {
      throw new Error(`parent-rollup: cannot read frontmatter from ${parentFilePath}`);
    }
    fm = raw;
    fmCache.set(parentFilePath, fm);
  }

  const parentId = extractId(fm, parentFilePath);
  const currentStatus = typeof fm['status'] === 'string' ? fm['status'].trim() : '';

  // Short-circuit: already terminal
  if (ARTIFACT_TERMINAL_STATUSES.has(currentStatus)) {
    return {
      parent_id: parentId,
      parent_path: parentFilePath,
      current_status: currentStatus,
      proposed_status: null,
      coverage: 'full',
      terminal_children: [],
      pending_children: [],
      verdict: 'no-op',
    };
  }

  // Cycle detection (before recursing into sub_epics)
  if (visited.has(parentId)) {
    throw new Error(`parent-rollup: sub_epics cycle detected at ${parentId}`);
  }
  visited.add(parentId);

  // Sub-epic recursion path
  const subEpicsField = fm['sub_epics'];
  const subEpics: string[] =
    Array.isArray(subEpicsField) && subEpicsField.length > 0
      ? (subEpicsField as unknown[]).filter((s): s is string => typeof s === 'string')
      : [];

  if (subEpics.length > 0) {
    // Recurse into sub-epics
    const pendingSyncDir = path.join(deliveryRoot, 'pending-sync');

    const terminalSubEpics: string[] = [];
    const pendingSubEpics: string[] = [];

    for (const subEpicId of subEpics) {
      // Locate the sub-epic file — search pending-sync and archive
      let subEpicPath: string | null = null;
      const candidateDirs = [pendingSyncDir, archiveRoot];
      for (const dir of candidateDirs) {
        if (!fs.existsSync(dir)) continue;
        let entries: string[];
        try {
          entries = fs.readdirSync(dir);
        } catch {
          entries = [];
        }
        for (const entry of entries) {
          if (!entry.endsWith('.md')) continue;
          const absPath = path.join(dir, entry);
          let subFm = fmCache.get(absPath);
          if (subFm === undefined) {
            const parsed = readFm(absPath);
            if (parsed === null) continue;
            subFm = parsed;
            fmCache.set(absPath, subFm);
          }
          const entryId = extractId(subFm, absPath);
          if (entryId === subEpicId) {
            subEpicPath = absPath;
            break;
          }
        }
        if (subEpicPath !== null) break;
      }

      if (subEpicPath === null) {
        // Sub-epic file not found; treat as pending
        pendingSubEpics.push(subEpicId);
        continue;
      }

      // Read sub-epic frontmatter to check for DEFERRED
      let subFm = fmCache.get(subEpicPath);
      if (subFm === undefined) {
        const parsed = readFm(subEpicPath);
        if (parsed === null) {
          pendingSubEpics.push(subEpicId);
          continue;
        }
        subFm = parsed;
        fmCache.set(subEpicPath, subFm);
      }

      const subStatus = typeof subFm['status'] === 'string' ? subFm['status'].trim() : '';

      // Exclude DEFERRED sub-epics from denominator entirely
      if (subStatus === 'DEFERRED') {
        continue;
      }

      // Already terminal (e.g. Completed) counts as done — no further recursion needed
      if (ARTIFACT_TERMINAL_STATUSES.has(subStatus)) {
        terminalSubEpics.push(subEpicId);
        continue;
      }

      // Recurse: make a snapshot of visited before entering sub-epic, restore after
      // (so sibling sub-epics don't block each other)
      const visitedSnapshot = new Set(visited);
      const subResult = await rollUpParentStatusInternal(
        subEpicPath,
        opts,
        visitedSnapshot,
        fmCache
      );

      if (subResult.verdict === 'auto-flip' || subResult.verdict === 'no-op') {
        terminalSubEpics.push(subEpicId);
      } else {
        pendingSubEpics.push(subEpicId);
      }
    }

    // Remove parentId from visited since we're returning up the stack
    visited.delete(parentId);

    const total = terminalSubEpics.length + pendingSubEpics.length;

    if (total === 0) {
      // All sub-epics were DEFERRED (excluded) or none exist — treat as zero-children
      return {
        parent_id: parentId,
        parent_path: parentFilePath,
        current_status: currentStatus,
        proposed_status: null,
        coverage: 'zero',
        terminal_children: [],
        pending_children: [],
        verdict: 'halt-zero-children',
        halt_reason: `${parentId}: 0 children drafted; not reconcilable — decompose or abandon`,
      };
    }

    if (pendingSubEpics.length === 0) {
      return {
        parent_id: parentId,
        parent_path: parentFilePath,
        current_status: currentStatus,
        proposed_status: 'Completed',
        coverage: 'full',
        terminal_children: terminalSubEpics,
        pending_children: [],
        verdict: 'auto-flip',
      };
    }

    return {
      parent_id: parentId,
      parent_path: parentFilePath,
      current_status: currentStatus,
      proposed_status: null,
      coverage: 'sub-epic-partial',
      terminal_children: terminalSubEpics,
      pending_children: pendingSubEpics,
      verdict: 'halt-partial',
      halt_reason: `${parentId}: ${terminalSubEpics.length}/${total} sub-epics terminal — pending: ${pendingSubEpics.join(', ')}`,
    };
  }

  // Leaf-epic / sprint: enumerate children from archive + pending-sync
  const children = enumerateChildren(parentId, deliveryRoot, archiveRoot, fmCache);

  visited.delete(parentId);

  if (children.length === 0) {
    return {
      parent_id: parentId,
      parent_path: parentFilePath,
      current_status: currentStatus,
      proposed_status: null,
      coverage: 'zero',
      terminal_children: [],
      pending_children: [],
      verdict: 'halt-zero-children',
      halt_reason: `${parentId}: 0 children drafted; not reconcilable — decompose or abandon`,
    };
  }

  const terminalChildren: string[] = [];
  const pendingChildren: string[] = [];

  for (const child of children) {
    if (ARTIFACT_TERMINAL_STATUSES.has(child.status)) {
      terminalChildren.push(child.id);
    } else {
      pendingChildren.push(child.id);
    }
  }

  const total = terminalChildren.length + pendingChildren.length;

  if (pendingChildren.length === 0) {
    return {
      parent_id: parentId,
      parent_path: parentFilePath,
      current_status: currentStatus,
      proposed_status: 'Completed',
      coverage: 'full',
      terminal_children: terminalChildren,
      pending_children: [],
      verdict: 'auto-flip',
    };
  }

  return {
    parent_id: parentId,
    parent_path: parentFilePath,
    current_status: currentStatus,
    proposed_status: null,
    coverage: 'partial',
    terminal_children: terminalChildren,
    pending_children: pendingChildren,
    verdict: 'halt-partial',
    halt_reason: `${parentId}: ${terminalChildren.length}/${total} children terminal — pending: ${pendingChildren.join(', ')}`,
  };
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Roll up the status of a single parent (Epic or Sprint).
 *
 * @param parentFilePath — absolute path to the parent .md file
 * @param opts — deliveryRoot: root of the delivery tree; archiveRoot: absolute path to archive/
 * @returns RollupResult with verdict, coverage, and child lists
 */
export async function rollUpParentStatus(
  parentFilePath: string,
  opts: WalkActiveParentsOpts
): Promise<RollupResult> {
  const visited = new Set<string>();
  const fmCache = new Map<string, Record<string, unknown>>();
  return rollUpParentStatusInternal(parentFilePath, opts, visited, fmCache);
}

/**
 * Walk all active parents (EPIC-*.md + SPRINT-*.md) in deliveryRoot/pending-sync/
 * and return one RollupResult per parent.
 *
 * Already-terminal parents (status: Completed/Done/etc.) emit verdict: 'no-op'.
 */
export async function walkActiveParents(
  opts: WalkActiveParentsOpts
): Promise<RollupResult[]> {
  const { deliveryRoot } = opts;
  const pendingSyncDir = path.join(deliveryRoot, 'pending-sync');

  let entries: string[];
  try {
    entries = fs.readdirSync(pendingSyncDir);
  } catch {
    return [];
  }

  const parentFiles = entries.filter(
    (e) =>
      e.endsWith('.md') &&
      (e.startsWith('EPIC-') || e.startsWith('SPRINT-'))
  );

  const results: RollupResult[] = [];
  const fmCache = new Map<string, Record<string, unknown>>();

  for (const entry of parentFiles) {
    const absPath = path.join(pendingSyncDir, entry);
    try {
      const visited = new Set<string>();
      const result = await rollUpParentStatusInternal(absPath, opts, visited, fmCache);
      results.push(result);
    } catch (err) {
      // Propagate cycle errors; skip unreadable files
      if (err instanceof Error && err.message.includes('sub_epics cycle detected')) {
        throw err;
      }
      // Other errors (e.g. unreadable) — skip silently
    }
  }

  return results;
}
