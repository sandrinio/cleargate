/**
 * active-criteria.ts — STORY-010-06
 *
 * Resolves which work items are "active" for the purpose of comment-pull.
 * Active = (item is referenced in the current sprint) OR (item's last_remote_update is within 30 days).
 *
 * NOTE: Sprint frontmatter has `epics: [...]` but NO `stories:` list.
 * Body-regex scan is the only reliable signal available today.
 * TODO: STORY-010-08 to introduce stories: [] frontmatter array for precise lookup.
 *
 * No top-level await (FLASHCARD #tsup #cjs #esm).
 */

import * as fs from 'node:fs';
import * as fsPromises from 'node:fs/promises';
import * as path from 'node:path';
import { resolveActiveSprintDir } from './sync-log.js';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface LocalWorkItemRef {
  /** Primary cleargate ID (e.g. STORY-010-06, EPIC-010). */
  primaryId: string;
  /** Remote ID in the PM tool (e.g. LIN-1042). May be undefined if not yet pushed. */
  remoteId: string | undefined;
  /** ISO string from `last_remote_update` frontmatter field. */
  lastRemoteUpdate: string | undefined;
}

// ── Active set resolver ───────────────────────────────────────────────────────

/**
 * Resolve which items (by remote_id) are "active" and should have comments fetched.
 *
 * @param projectRoot - absolute path to the project root
 * @param localItems  - all local work items with their IDs
 * @param nowFn       - injectable clock (for 30-day window)
 * @returns           - Set of remote_id values that are active
 */
export async function resolveActiveItems(
  projectRoot: string,
  localItems: LocalWorkItemRef[],
  nowFn: () => string = () => new Date().toISOString(),
): Promise<Set<string>> {
  const active = new Set<string>();
  const now = Date.parse(nowFn());
  const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;

  // ── Branch 1: items referenced in the current sprint ─────────────────────
  const inSprintIds = await resolveInSprintIds(projectRoot);

  // ── Branch 2: items updated in last 30 days + union of sprint ─────────────
  for (const item of localItems) {
    if (!item.remoteId) continue;

    // In-sprint check
    if (inSprintIds.has(item.primaryId)) {
      active.add(item.remoteId);
      continue;
    }

    // 30-day window check
    if (item.lastRemoteUpdate) {
      const itemMs = Date.parse(item.lastRemoteUpdate);
      if (!isNaN(itemMs) && (now - itemMs) <= thirtyDaysMs) {
        active.add(item.remoteId);
      }
    }
  }

  return active;
}

// ── Internal: resolve sprint item references ──────────────────────────────────

/**
 * Read the active sprint file and extract all work-item ID references from its body.
 *
 * NOTE: Sprint frontmatter has `epics: [...]` but no `stories:` array.
 * We scan the full body text for IDs matching:
 *   (STORY|EPIC|PROPOSAL|CR|BUG)-\d+(-\d+)?
 *
 * TODO: STORY-010-08 to introduce stories: [] frontmatter array for precise lookup.
 */
async function resolveInSprintIds(projectRoot: string): Promise<Set<string>> {
  const ids = new Set<string>();

  try {
    const sprintDir = resolveActiveSprintDir(projectRoot);
    const sprintId = path.basename(sprintDir);

    if (sprintId === '_off-sprint') return ids;

    // Try pending-sync first, then archive
    const sprintFile = await findSprintFile(projectRoot, sprintId);
    if (!sprintFile) return ids;

    const content = await fsPromises.readFile(sprintFile, 'utf8');

    // Scan body for work-item ID patterns
    // (STORY|EPIC|PROPOSAL|CR|BUG)-\d+(-\d+)?
    const pattern = /(STORY|EPIC|PROPOSAL|CR|BUG)-\d+(-\d+)?/g;
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(content)) !== null) {
      ids.add(match[0]);
    }
  } catch {
    // Non-fatal: if we can't resolve sprint, return empty set
  }

  return ids;
}

async function findSprintFile(projectRoot: string, sprintId: string): Promise<string | null> {
  const pendingSync = path.join(projectRoot, '.cleargate', 'delivery', 'pending-sync');
  const archive = path.join(projectRoot, '.cleargate', 'delivery', 'archive');

  for (const dir of [pendingSync, archive]) {
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isFile() && entry.name.startsWith(sprintId) && entry.name.endsWith('.md')) {
          return path.join(dir, entry.name);
        }
      }
    } catch {
      // Directory not found — try next
    }
  }

  return null;
}
