/**
 * lifecycle-reconcile.ts — CR-017 Lifecycle Status Reconciliation + Decomposition Gate
 *
 * Public API:
 *   reconcileLifecycle(opts) → { drift: DriftItem[], clean: number }
 *   reconcileDecomposition(opts) → { missing: MissingDecomp[], clean: number }
 *   parseCommitMessage(msg) → Array<{ verb, id, type }>
 *   VERB_STATUS_MAP — verb-to-expected-status table
 *
 * TERMINAL_STATES referenced from .cleargate/scripts/constants.mjs:45.
 * Do NOT redefine; duplicate literal with source citation.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { spawnSync } from 'node:child_process';
import { parseFrontmatter } from '../wiki/parse-frontmatter.js';

// ─── Constants ─────────────────────────────────────────────────────────────────

/**
 * Terminal statuses for artifact lifecycle.
 * Source: .cleargate/scripts/constants.mjs:45 TERMINAL_STATES.
 * NOTE: These are the *artifact* terminal statuses (Done, Completed, Verified, etc.),
 * not state.json story states (Done, Escalated, Parking Lot).
 */
export const ARTIFACT_TERMINAL_STATUSES = new Set([
  'Done',
  'Completed',
  'Verified',
  'Abandoned',
  'Closed',
  'Resolved',
  'Escalated',
  'Parking Lot',
]);

/**
 * Verb-to-expected-status map (v1).
 * Key: verb pattern (lower-case), Value: { types, expected }.
 * types: which artifact types this verb applies to.
 * expected: accepted terminal statuses for this verb.
 */
export const VERB_STATUS_MAP: Readonly<Record<string, { types: string[]; expected: string[] }>> = {
  feat: {
    types: ['STORY', 'EPIC', 'CR'],
    expected: ['Done', 'Completed'],
  },
  fix: {
    types: ['BUG', 'HOTFIX'],
    expected: ['Verified', 'Done', 'Completed'],
  },
};

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface DriftItem {
  id: string;
  type: 'STORY' | 'CR' | 'BUG' | 'EPIC' | 'PROPOSAL' | 'HOTFIX';
  expected_status: string;
  actual_status: string | null;
  file_path: string | null;
  in_archive: boolean;
  commit_shas: string[];
  carry_over: boolean;
}

export interface ReconcileLifecycleResult {
  drift: DriftItem[];
  clean: number;
}

export interface ReconcileLifecycleOpts {
  since: Date;
  until?: Date;
  deliveryRoot: string;
  repoRoot: string;
  /** Test seam: replace spawnSync git calls */
  gitRunner?: (cmd: string, args: string[]) => string;
}

export interface MissingDecomp {
  id: string;
  type: 'epic' | 'proposal';
  reason: 'no-child-stories' | 'no-decomposed-epic' | 'file-missing';
  expected_files: string[];
}

export interface ReconcileDecompositionResult {
  missing: MissingDecomp[];
  clean: number;
}

export interface ReconcileDecompositionOpts {
  sprintPlanPath: string;
  deliveryRoot: string;
}

// ─── ID shape regex (longest-alternative-first per BUG-010 + assert_story_files.mjs) ──

const ID_PATTERN = /\b(STORY-\d{3}-\d{2}|(CR|BUG|EPIC|HOTFIX)-\d{3}|(PROPOSAL|PROP)-\d{3})\b/g;

/** Artifact type names recognized by the reconciler */
type ArtifactType = 'STORY' | 'CR' | 'BUG' | 'EPIC' | 'PROPOSAL' | 'HOTFIX';

function normalizeId(raw: string): string {
  // PROP-NNN → PROPOSAL-NNN (BUG-009 lesson)
  return raw.replace(/^PROP-(\d+)$/, 'PROPOSAL-$1');
}

function idType(id: string): ArtifactType | null {
  if (/^STORY-\d{3}-\d{2}$/.test(id)) return 'STORY';
  if (/^CR-\d{3}$/.test(id)) return 'CR';
  if (/^BUG-\d{3}$/.test(id)) return 'BUG';
  if (/^EPIC-\d{3}$/.test(id)) return 'EPIC';
  if (/^PROPOSAL-\d{3}$/.test(id)) return 'PROPOSAL';
  if (/^HOTFIX-\d{3}$/.test(id)) return 'HOTFIX';
  return null;
}

// ─── parseCommitMessage ────────────────────────────────────────────────────────

/**
 * Parse a commit message (subject + optional first body line) for work-item IDs.
 * Returns one entry per ID found with the verb inferred from conventional prefix.
 *
 * commit format: `<verb>(<scope>): <description>\n\n<body>`
 * multi-ID:      `fix(cli)!: BUG-001 fix + CR-001 align`
 * merge:         `merge: STORY-001-01 → main`
 */
export function parseCommitMessage(
  msg: string,
): Array<{ verb: string; id: string; type: string }> {
  const lines = msg.split('\n');
  const subject = lines[0] ?? '';

  // First non-empty body line (if any) after the blank separator
  let firstBodyLine = '';
  for (let i = 1; i < lines.length; i++) {
    if (lines[i]?.trim()) {
      firstBodyLine = lines[i]!;
      break;
    }
  }

  // Extract verb from subject: `feat(...)`, `fix(...)`, `merge:`, `chore(...)`, etc.
  const verbMatch = /^(\w+)[(!]/.exec(subject) ?? /^(\w+):/.exec(subject);
  const verb = verbMatch ? verbMatch[1]!.toLowerCase() : '';

  // Scan subject + first body line for IDs
  const searchText = subject + (firstBodyLine ? '\n' + firstBodyLine : '');
  const results: Array<{ verb: string; id: string; type: string }> = [];
  const seen = new Set<string>();

  let m: RegExpExecArray | null;
  ID_PATTERN.lastIndex = 0;
  while ((m = ID_PATTERN.exec(searchText)) !== null) {
    const rawId = m[0]!;
    const id = normalizeId(rawId);
    if (seen.has(id)) continue;
    seen.add(id);
    const type = idType(id);
    if (!type) continue;
    results.push({ verb, id, type });
  }

  return results;
}

// ─── File finders ─────────────────────────────────────────────────────────────

interface FoundFile {
  absPath: string;
  inArchive: boolean;
  relPath: string; // relative to deliveryRoot
}

function findArtifactFile(deliveryRoot: string, id: string): FoundFile | null {
  const prefix = `${id}_`;
  const dirs: Array<{ rel: string; inArchive: boolean }> = [
    { rel: 'pending-sync', inArchive: false },
    { rel: 'archive', inArchive: true },
  ];
  for (const { rel, inArchive } of dirs) {
    const dir = path.join(deliveryRoot, rel);
    let entries: string[];
    try {
      entries = fs.readdirSync(dir);
    } catch {
      continue;
    }
    // match `ID_*.md` OR `ID.md`
    const match = entries.find(
      (e) => (e.startsWith(prefix) || e === `${id}.md`) && e.endsWith('.md'),
    );
    if (match) {
      const absPath = path.join(dir, match);
      return { absPath, inArchive, relPath: `${rel}/${match}` };
    }
  }
  return null;
}

function readArtifactStatus(absPath: string): { status: string | null; carryOver: boolean } {
  let raw: string;
  try {
    raw = fs.readFileSync(absPath, 'utf8');
  } catch {
    return { status: null, carryOver: false };
  }
  try {
    const { fm } = parseFrontmatter(raw);
    const status = typeof fm['status'] === 'string' ? fm['status'] : null;
    const carryOver = fm['carry_over'] === true;
    return { status, carryOver };
  } catch {
    return { status: null, carryOver: false };
  }
}

// ─── reconcileLifecycle ────────────────────────────────────────────────────────

/**
 * Scan git log in [since, until] range and reconcile artifact statuses.
 *
 * For each commit touching feat/fix verbs with IDs:
 *   - Find the artifact file in pending-sync or archive
 *   - Check if status is at expected terminal status
 *   - Report drift items for non-terminal artifacts
 *   - Skip artifacts with carry_over: true
 */
export function reconcileLifecycle(opts: ReconcileLifecycleOpts): ReconcileLifecycleResult {
  const { since, until = new Date(), deliveryRoot, repoRoot } = opts;

  const gitRunner =
    opts.gitRunner ??
    ((cmd: string, args: string[]) => {
      const result = spawnSync(cmd, args, { encoding: 'utf8', cwd: repoRoot });
      return (result.stdout ?? '') as string;
    });

  // git log --format="%H %s%n%b%n---COMMIT---" --after=<since> --before=<until>
  const sinceIso = since.toISOString();
  const untilIso = until.toISOString();
  const logOutput = gitRunner('git', [
    'log',
    `--after=${sinceIso}`,
    `--before=${untilIso}`,
    '--format=%H%x00%s%x00%b%x00---COMMIT---',
    '--',
  ]);

  // Map: id → DriftItem (accumulates SHAs for bundled-commit grouping)
  // We track each id independently; bundled-commit = multiple SHAs per id
  const idToItem = new Map<string, DriftItem>();
  // Track ids that were found CLEAN (fully reconciled)
  const cleanIds = new Set<string>();

  if (logOutput.trim()) {
    // Split by commit separator
    const rawCommits = logOutput.split('---COMMIT---\n').filter((c) => c.trim());

    for (const raw of rawCommits) {
      // Each commit entry: sha\0subject\0body\0
      const [sha = '', subject = '', body = ''] = raw.split('\x00');
      const trimSha = sha.trim();
      const trimSubject = subject.trim();
      const trimBody = body.trim();

      if (!trimSha || !trimSubject) continue;

      const commitMsg = trimSubject + (trimBody ? '\n\n' + trimBody : '');
      const parsed = parseCommitMessage(commitMsg);

      for (const { verb, id, type } of parsed) {
        // Skip merge, chore, docs, refactor, test, file, plan verbs (no expectation)
        if (verb === 'merge' || verb === 'chore' || verb === 'docs' || verb === 'refactor'
          || verb === 'test' || verb === 'file' || verb === 'plan') {
          continue;
        }

        // Skip PROPOSAL types — proposals aren't shipped via feat/fix commits
        if (type === 'PROPOSAL') continue;

        const verbConfig = VERB_STATUS_MAP[verb];
        if (!verbConfig) continue;

        // Verb mismatch: feat(BUG-NNN) → soft warning only, handled at call site
        // We still need to find the file and check status for the call site to report

        // Find the artifact file
        const found = findArtifactFile(deliveryRoot, id);
        if (!found) {
          // Unknown ID — log once at info level (no drift)
          // We skip unknown IDs (no file found); call site logs info
          continue;
        }

        // Read status + carry_over from CURRENT frontmatter
        const { status, carryOver } = readArtifactStatus(found.absPath);

        // carry_over: true → skip silently
        if (carryOver) continue;

        // Determine expected statuses for this (verb, type) pair
        let expectedStatuses: string[];
        if (verb === 'feat' && type === 'BUG') {
          // verb mismatch — soft warning, does not block; still check status
          // Use 'Verified' as expected for BUG even with feat verb
          expectedStatuses = ['Verified', 'Done', 'Completed'];
        } else if (!verbConfig.types.includes(type)) {
          // Type not covered by this verb's map — skip
          continue;
        } else {
          expectedStatuses = verbConfig.expected;
        }

        const isTerminal = status !== null && expectedStatuses.includes(status);
        const isArchived = found.inArchive;

        if (isTerminal && isArchived) {
          // Clean
          cleanIds.add(id);
          // If we previously recorded drift for this id (from another commit), remove it
          // (Most recent status check wins — carry_over already handled above)
          idToItem.delete(id);
        } else if (!idToItem.has(id)) {
          // New drift item
          const expectedStr = expectedStatuses[0] ?? 'Done';
          idToItem.set(id, {
            id,
            type: type as DriftItem['type'],
            expected_status: expectedStr,
            actual_status: status,
            file_path: found.relPath,
            in_archive: isArchived,
            commit_shas: [trimSha],
            carry_over: carryOver,
          });
        } else {
          // Existing drift item — add SHA if not already present
          const existing = idToItem.get(id)!;
          if (!existing.commit_shas.includes(trimSha)) {
            existing.commit_shas.push(trimSha);
          }
        }
      }
    }
  }

  // Remove from drift any IDs that ended up in cleanIds
  for (const id of cleanIds) {
    idToItem.delete(id);
  }

  const drift = Array.from(idToItem.values());
  return { drift, clean: cleanIds.size };
}

// ─── reconcileCrossSprintOrphans ──────────────────────────────────────────────

/**
 * Orphan drift item: a file in pending-sync/ with a non-terminal status
 * that has been marked Done (or another terminal state) in a closed sprint's
 * state.json — indicating it was completed but never archived.
 */
export interface OrphanDriftItem {
  id: string;
  type: 'CR' | 'STORY' | 'BUG' | 'EPIC' | 'HOTFIX';
  pending_sync_status: string;
  state_json_state: string;
  state_json_sprint: string;
  file_path: string;
}

export interface ReconcileOrphansOpts {
  /** Path to .cleargate/delivery */
  deliveryRoot: string;
  /** Path to .cleargate/sprint-runs */
  sprintRunsRoot: string;
}

export interface ReconcileOrphansResult {
  drift: OrphanDriftItem[];
  clean: number;
}

/**
 * Detect cross-sprint orphan drift: items in pending-sync/ with status: Ready
 * (or any non-terminal status) that are recorded as Done in a closed sprint's
 * state.json. These were completed but never archived at sprint close.
 *
 * Active-sprint exclusion: reads .active sentinel to identify the current
 * sprint and skips that sprint's state.json (in-flight items are not orphans).
 *
 * Scope: only scans pending-sync/*.md files matching the work-item-ID pattern.
 * Does NOT scan .script-incidents/ or any subdirectory.
 */
export function reconcileCrossSprintOrphans(opts: ReconcileOrphansOpts): ReconcileOrphansResult {
  const { deliveryRoot, sprintRunsRoot } = opts;

  // Terminal states from state.json (story-level states, not artifact statuses)
  const TERMINAL_STATE_JSON = new Set(['Done', 'Escalated', 'Parking Lot']);

  // Read the active sprint sentinel (to exclude it from orphan detection)
  let activeSprintId: string | null = null;
  try {
    activeSprintId = fs.readFileSync(path.join(sprintRunsRoot, '.active'), 'utf8').trim();
  } catch {
    // No .active file — no active sprint; scan all sprints
  }

  // Collect all pending-sync *.md files (no subdirectory traversal)
  const pendingDir = path.join(deliveryRoot, 'pending-sync');
  let pendingFiles: string[];
  try {
    pendingFiles = fs.readdirSync(pendingDir).filter(
      (f) => f.endsWith('.md') && !f.startsWith('.'),
    );
  } catch {
    pendingFiles = [];
  }

  // Build a map: id → { status, filePath } for each pending-sync item
  interface PendingItem {
    status: string;
    filePath: string;
    type: OrphanDriftItem['type'];
  }
  const pendingMap = new Map<string, PendingItem>();

  for (const fileName of pendingFiles) {
    const absPath = path.join(pendingDir, fileName);
    const { status } = readArtifactStatus(absPath);
    if (status === null) continue;
    // Skip already-terminal items in pending-sync (shouldn't be there but be safe)
    if (ARTIFACT_TERMINAL_STATUSES.has(status)) continue;

    // Extract ID from filename: filenames use <ID>_<slug>.md or <ID>.md format.
    // ID_PATTERN uses \b word-boundaries which don't fire between a digit and '_'
    // (since '_' is a word char), so we extract the prefix before the first '_' or '.'.
    const fileNameNoExt = fileName.endsWith('.md') ? fileName.slice(0, -3) : fileName;
    const prefixPart = fileNameNoExt.split('_')[0] ?? fileNameNoExt;
    const rawId = prefixPart;
    const id = normalizeId(rawId);
    const type = idType(id);
    if (!type || type === 'PROPOSAL') continue;

    pendingMap.set(id, {
      status,
      filePath: path.join('pending-sync', fileName),
      type: type as OrphanDriftItem['type'],
    });
  }

  if (pendingMap.size === 0) {
    return { drift: [], clean: 0 };
  }

  // Walk sprint-runs directories for state.json files
  let sprintDirs: string[];
  try {
    sprintDirs = fs.readdirSync(sprintRunsRoot).filter((entry) => {
      // Skip the .active sentinel file and any hidden files
      if (entry.startsWith('.')) return false;
      // Skip non-directories (e.g. files in root)
      try {
        return fs.statSync(path.join(sprintRunsRoot, entry)).isDirectory();
      } catch {
        return false;
      }
    });
  } catch {
    sprintDirs = [];
  }

  const drift: OrphanDriftItem[] = [];
  // Track which IDs we've flagged to avoid duplicates (first sprint that shows Done wins)
  const flagged = new Set<string>();
  let clean = 0;

  for (const sprintDir of sprintDirs) {
    // Skip the active sprint
    if (activeSprintId && sprintDir === activeSprintId) continue;

    const stateFile = path.join(sprintRunsRoot, sprintDir, 'state.json');
    let stateJson: Record<string, unknown>;
    try {
      const raw = fs.readFileSync(stateFile, 'utf8');
      stateJson = JSON.parse(raw) as Record<string, unknown>;
    } catch {
      continue;
    }

    const stories = stateJson['stories'] as Record<string, { state: string }> | undefined;
    if (!stories || typeof stories !== 'object') continue;

    for (const [id, storyEntry] of Object.entries(stories)) {
      // Skip if already flagged from an earlier sprint
      if (flagged.has(id)) continue;

      const pending = pendingMap.get(id);
      if (!pending) continue; // not in pending-sync

      const stateInJson = storyEntry?.state ?? '';
      if (TERMINAL_STATE_JSON.has(stateInJson)) {
        // This item is Done in a closed sprint but still in pending-sync — orphan drift
        flagged.add(id);
        drift.push({
          id,
          type: pending.type,
          pending_sync_status: pending.status,
          state_json_state: stateInJson,
          state_json_sprint: sprintDir,
          file_path: pending.filePath,
        });
      } else {
        // Item is in pending-sync AND in state.json but NOT terminal — correctly in-flight
        clean++;
      }
    }
  }

  return { drift, clean };
}

// ─── reconcileDecomposition ───────────────────────────────────────────────────

/**
 * Read the sprint plan's epics: and proposals: frontmatter arrays and verify
 * that each referenced epic has ≥1 child story file, and each proposal has
 * a decomposed epic.
 */
export function reconcileDecomposition(opts: ReconcileDecompositionOpts): ReconcileDecompositionResult {
  const { sprintPlanPath, deliveryRoot } = opts;

  // Parse sprint plan frontmatter
  let raw: string;
  try {
    raw = fs.readFileSync(sprintPlanPath, 'utf8');
  } catch {
    return { missing: [], clean: 0 };
  }

  let fm: Record<string, unknown>;
  try {
    ({ fm } = parseFrontmatter(raw));
  } catch {
    return { missing: [], clean: 0 };
  }

  const epics: string[] = Array.isArray(fm['epics']) ? fm['epics'].map(String) : [];
  const proposals: string[] = Array.isArray(fm['proposals']) ? fm['proposals'].map(String) : [];

  const pendingDir = path.join(deliveryRoot, 'pending-sync');
  const archiveDir = path.join(deliveryRoot, 'archive');

  // Read both dirs for all .md files
  function listMdFiles(dir: string): string[] {
    try {
      return fs.readdirSync(dir).filter((f) => f.endsWith('.md'));
    } catch {
      return [];
    }
  }
  const pendingFiles = listMdFiles(pendingDir);
  const archiveFiles = listMdFiles(archiveDir);
  const allFiles = [...pendingFiles, ...archiveFiles];

  const missing: MissingDecomp[] = [];
  let clean = 0;

  // Check epics
  for (const epicId of epics) {
    // Find the epic file
    const epicFile = allFiles.find(
      (f) => f.startsWith(`${epicId}_`) || f === `${epicId}.md`,
    );
    if (!epicFile) {
      missing.push({
        id: epicId,
        type: 'epic',
        reason: 'file-missing',
        expected_files: [`pending-sync/${epicId}_<name>.md`],
      });
      continue;
    }

    // Find child stories: any STORY-*.md with parent_epic_ref: epicId
    const childStories = findChildStories(
      epicId,
      pendingDir,
      pendingFiles,
      archiveDir,
      archiveFiles,
    );

    if (childStories.length === 0) {
      missing.push({
        id: epicId,
        type: 'epic',
        reason: 'no-child-stories',
        expected_files: [
          `pending-sync/${epicId.replace('EPIC-', 'STORY-')}-01_<name>.md`,
        ],
      });
    } else {
      clean++;
    }
  }

  // Check proposals
  for (const proposalId of proposals) {
    // Find a decomposed epic that cites this proposal in context_source
    const decomposedEpic = findDecomposedEpic(
      proposalId,
      pendingDir,
      pendingFiles,
    );
    if (!decomposedEpic) {
      missing.push({
        id: proposalId,
        type: 'proposal',
        reason: 'no-decomposed-epic',
        expected_files: [`pending-sync/EPIC-<NNN>_<name>.md with context_source citing ${proposalId}`],
      });
    } else {
      clean++;
    }
  }

  return { missing, clean };
}

/**
 * Find story files in pending-sync or archive that have parent_epic_ref: epicId.
 */
function findChildStories(
  epicId: string,
  pendingDir: string,
  pendingFiles: string[],
  archiveDir: string,
  archiveFiles: string[],
): string[] {
  const results: string[] = [];
  const epicNumMatch = /^EPIC-(\d+)$/.exec(epicId);
  if (!epicNumMatch) return results;
  const epicNum = epicNumMatch[1]!;

  const storyPrefix = `STORY-${epicNum}-`;

  for (const [files, dir] of [[pendingFiles, pendingDir], [archiveFiles, archiveDir]] as const) {
    for (const f of files) {
      if (!f.startsWith(storyPrefix) && !f.startsWith('STORY-')) continue;
      // Quick filename match first
      if (!f.includes(storyPrefix)) continue;
      const absPath = path.join(dir, f);
      try {
        const raw = fs.readFileSync(absPath, 'utf8');
        const { fm } = parseFrontmatter(raw);
        const parentRef = fm['parent_epic_ref'];
        if (parentRef === epicId) {
          results.push(f);
        }
      } catch {
        // skip malformed files
      }
    }
  }
  return results;
}

/**
 * Find an epic file in pending-sync whose context_source cites proposalId.
 */
function findDecomposedEpic(
  proposalId: string,
  pendingDir: string,
  pendingFiles: string[],
): string | null {
  for (const f of pendingFiles) {
    if (!f.startsWith('EPIC-')) continue;
    const absPath = path.join(pendingDir, f);
    try {
      const raw = fs.readFileSync(absPath, 'utf8');
      const { fm } = parseFrontmatter(raw);
      const contextSource = fm['context_source'];
      if (
        typeof contextSource === 'string' &&
        contextSource.includes(proposalId)
      ) {
        return f;
      }
    } catch {
      // skip
    }
  }
  return null;
}

// ─── Verb mismatch checker (exported for test use) ────────────────────────────

/**
 * Check if a (verb, type) combination is a mismatch (soft warning only in v1).
 * Returns a warning message or null if no mismatch.
 */
export function checkVerbMismatch(verb: string, type: string): string | null {
  if (verb === 'feat' && type === 'BUG') {
    return `verb 'feat' unusual for BUG; expected 'fix'`;
  }
  if (verb === 'fix' && (type === 'STORY' || type === 'EPIC' || type === 'CR')) {
    return `verb 'fix' unusual for ${type}; expected 'feat'`;
  }
  return null;
}
