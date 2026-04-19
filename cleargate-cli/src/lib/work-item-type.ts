/**
 * work-item-type.ts — Shared work-item type detection utility.
 *
 * STORY-008-03: extracted here for STORY-008-05 to import without duplication.
 * Maps frontmatter ID keys and filename patterns to canonical work-item types.
 */

export type WorkItemType = 'story' | 'epic' | 'proposal' | 'cr' | 'bug';

/**
 * Frontmatter key → work-item type mapping.
 * Keys are checked in order; first match wins.
 */
const FM_KEY_MAP: Array<{ key: string; type: WorkItemType }> = [
  { key: 'story_id', type: 'story' },
  { key: 'epic_id', type: 'epic' },
  { key: 'proposal_id', type: 'proposal' },
  { key: 'cr_id', type: 'cr' },
  { key: 'bug_id', type: 'bug' },
];

/**
 * Filename / ID prefix → work-item type mapping.
 */
const PREFIX_MAP: Array<{ prefix: string; type: WorkItemType }> = [
  { prefix: 'STORY-', type: 'story' },
  { prefix: 'EPIC-', type: 'epic' },
  { prefix: 'PROPOSAL-', type: 'proposal' },
  { prefix: 'CR-', type: 'cr' },
  { prefix: 'BUG-', type: 'bug' },
];

/**
 * Detect the work-item type from a parsed frontmatter record.
 * Returns null if no recognized ID key is found.
 */
export function detectWorkItemTypeFromFm(
  fm: Record<string, unknown>,
): WorkItemType | null {
  for (const { key, type } of FM_KEY_MAP) {
    if (fm[key] !== undefined && fm[key] !== null && fm[key] !== '') {
      return type;
    }
  }
  return null;
}

/**
 * Detect the work-item type from an ID string or file path.
 * Matches against the uppercase prefix (STORY-, EPIC-, etc.).
 * Returns null if no prefix matches.
 */
export function detectWorkItemType(idOrPath: string): WorkItemType | null {
  const upper = idOrPath.toUpperCase();
  // Strip leading directory path components
  const basename = upper.split('/').pop() ?? upper;
  for (const { prefix, type } of PREFIX_MAP) {
    if (basename.includes(prefix)) {
      return type;
    }
  }
  return null;
}

/**
 * Canonical transitions per work-item type.
 * Epic has 2; all others have 1.
 */
export const WORK_ITEM_TRANSITIONS: Record<WorkItemType, string[]> = {
  proposal: ['ready-for-decomposition'],
  epic: ['ready-for-decomposition', 'ready-for-coding'],
  story: ['ready-for-execution'],
  cr: ['ready-to-apply'],
  bug: ['ready-for-fix'],
};
