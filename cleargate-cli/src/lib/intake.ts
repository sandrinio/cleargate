/**
 * intake.ts — STORY-010-05
 *
 * Stakeholder proposal intake branch for `cleargate sync`.
 *
 * `runIntakeBranch` is called from `syncHandler` at step 3 (after pull, before
 * conflict classification). It:
 *   1. Calls `cleargate_detect_new_items({ label })` to get remote proposals.
 *   2. Deduplicates against pending-sync + archive by `remote_id` frontmatter.
 *   3. For each new item: allocates a `PROP-NNN` ID, slugifies the title,
 *      writes a draft proposal file from the template, and appends a sync-log
 *      entry with op:'pull-intake'.
 *   4. Emits an R10 warning to stderr if zero items matched AND this appears to
 *      be the first intake run for this workspace (no prior `source: remote-authored`
 *      files detected).
 *   5. Returns a summary for the end-of-sync stdout print.
 *
 * Respects dryRun: zero fs writes, zero sync-log entries, returns the plan.
 */

import * as fsPromises from 'node:fs/promises';
import * as path from 'node:path';
import { slugify, nextProposalId, findByRemoteId } from './slug.js';
import { appendSyncLog, type SyncLogEntry } from './sync-log.js';
import { parseFrontmatter } from '../wiki/parse-frontmatter.js';
import { serializeFrontmatter } from './frontmatter-yaml.js';
import type { McpClient, RemoteItem } from './mcp-client.js';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface IntakeItem {
  proposalId: string;
  remoteId: string;
  title: string;
  path: string;
}

export interface IntakeResult {
  created: number;
  items: IntakeItem[];
  warning?: string;
}

export interface IntakeBranchOptions {
  mcp: McpClient;
  identity: { email: string };
  sprintRoot: string;
  projectRoot: string;
  dryRun: boolean;
  labelFilter?: string;
  /** Test seam: override now() */
  now?: () => string;
}

// ── runIntakeBranch ───────────────────────────────────────────────────────────

export async function runIntakeBranch(opts: IntakeBranchOptions): Promise<IntakeResult> {
  const {
    mcp,
    identity,
    sprintRoot,
    projectRoot,
    dryRun,
    labelFilter = 'cleargate:proposal',
    now = () => new Date().toISOString(),
  } = opts;

  const pendingSyncDir = path.join(projectRoot, '.cleargate', 'delivery', 'pending-sync');

  // Detect new remote items with the cleargate:proposal label
  let remoteItems: RemoteItem[] = [];
  try {
    remoteItems = await mcp.call<RemoteItem[]>(
      'cleargate_detect_new_items',
      { label: labelFilter },
    );
    if (!Array.isArray(remoteItems)) {
      remoteItems = [];
    }
  } catch {
    // Non-fatal: if the tool doesn't exist yet, treat as zero items
    remoteItems = [];
  }

  // R10: zero-label warning — fires when zero items returned AND this is the
  // first intake run (no existing `source: remote-authored` files found)
  let warning: string | undefined;
  if (remoteItems.length === 0) {
    const hasExistingIntake = await hasAnyRemoteAuthored(projectRoot);
    if (!hasExistingIntake) {
      warning =
        `warn: no Linear issues match label '${labelFilter}' — ` +
        `confirm the label exists in your workspace. See EPIC-010 R10.`;
    }
  }

  const createdItems: IntakeItem[] = [];

  for (const item of remoteItems) {
    // Idempotency: skip if a local counterpart already exists (in either dir)
    const existingPath = await findByRemoteId(projectRoot, item.remote_id);
    if (existingPath !== null) {
      continue;
    }

    if (dryRun) {
      // In dry-run mode: plan the intake without writing anything
      const proposalId = await nextProposalId(projectRoot);
      const slug = slugify(item.title ?? 'untitled');
      const num = proposalId.replace('PROP-', '');
      const filename = `PROPOSAL-${num}-remote-${slug}.md`;
      const targetPath = path.join(pendingSyncDir, filename);
      createdItems.push({
        proposalId,
        remoteId: item.remote_id,
        title: item.title ?? '',
        path: targetPath,
      });
      continue;
    }

    // Compute the next proposal ID and filename
    // Note: we recompute after each write so IDs are consistent even when multiple
    // items are being created in the same run
    const proposalId = await nextProposalId(projectRoot);
    const num = proposalId.replace('PROP-', '');
    const slug = slugify(item.title ?? 'untitled');
    const filename = `PROPOSAL-${num}-remote-${slug}.md`;
    const targetPath = path.join(pendingSyncDir, filename);
    const nowTs = now();

    // Build frontmatter from template + our sync fields
    const fm: Record<string, unknown> = {
      proposal_id: proposalId,
      remote_id: item.remote_id,
      status: 'Draft',
      approved: false,
      source: 'remote-authored',
      last_pulled_by: identity.email,
      last_pulled_at: nowTs,
      last_remote_update: item.updated_at,
      created_at: nowTs,
      updated_at: nowTs,
      pushed_by: null,
      pushed_at: null,
      last_synced_status: null,
      last_synced_body_sha: null,
    };

    // Build body from the proposal template + pre-fill §1 body from remote item
    const body = buildProposalBody(item, projectRoot);

    // Atomic write: .tmp + rename
    await fsPromises.mkdir(pendingSyncDir, { recursive: true });
    const content = serializeFrontmatter(fm) + '\n\n' + body;
    const tmpPath = `${targetPath}.tmp.${Date.now()}`;
    await fsPromises.writeFile(tmpPath, content, 'utf8');
    await fsPromises.rename(tmpPath, targetPath);

    // Sync-log entry
    const logEntry: SyncLogEntry = {
      ts: nowTs,
      actor: identity.email,
      op: 'pull-intake',
      target: proposalId,
      remote_id: item.remote_id,
      result: 'ok',
    };
    await appendSyncLog(sprintRoot, logEntry);

    createdItems.push({
      proposalId,
      remoteId: item.remote_id,
      title: item.title ?? '',
      path: targetPath,
    });
  }

  return {
    created: createdItems.length,
    items: createdItems,
    warning,
  };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Build the body for an intake proposal file.
 * Seeds §1 "Initiative & Context" with the remote item body;
 * leaves other sections as template placeholders.
 */
function buildProposalBody(item: RemoteItem, _projectRoot: string): string {
  const title = item.title ?? '(untitled)';
  const remoteBody = item.body ?? '';

  return `# ${title}

## 1. Initiative & Context

### 1.1 Objective

${remoteBody || '(pre-filled from Linear issue body)'}

### 1.2 The "Why"

{Reason 1}
{Reason 2}

## 2. Technical Architecture & Constraints

### 2.1 Dependencies

{List required external APIs, packages, or systems}

### 2.2 System Constraints

| Constraint | Details |
|---|---|
| Architectural Rules | {e.g., Must use purely functional components} |
| Security | {e.g., Data must be encrypted at rest.} |

## 3. Scope Impact (Touched Files & Data)

### 3.1 Known Files

path/to/existing/file.ext - {Explanation of expected change}

### 3.2 Expected New Entities

path/to/new/file.ext - {Explanation of purpose}

## Approval Gate

(Vibe Coder: Review this proposal. If the architecture and context are correct, change approved: false to approved: true in the YAML frontmatter. Only then is the AI authorized to proceed with Epic/Story decomposition.)
`;
}

/**
 * Check if any `source: remote-authored` file already exists in pending-sync or archive.
 * Used to gate the R10 zero-label warning.
 */
async function hasAnyRemoteAuthored(projectRoot: string): Promise<boolean> {
  const dirs = [
    path.join(projectRoot, '.cleargate', 'delivery', 'pending-sync'),
    path.join(projectRoot, '.cleargate', 'delivery', 'archive'),
  ];

  for (const dir of dirs) {
    let entries;
    try {
      entries = await fsPromises.readdir(dir, { withFileTypes: true });
    } catch {
      continue;
    }

    for (const entry of entries) {
      if (!entry.isFile() || !entry.name.endsWith('.md')) continue;
      const fullPath = path.join(dir, entry.name);
      try {
        const raw = await fsPromises.readFile(fullPath, 'utf8');
        // Quick scan without full parse — look for source: remote-authored in frontmatter
        const fmEnd = raw.indexOf('\n---', 4);
        if (fmEnd === -1) continue;
        const fmBlock = raw.slice(0, fmEnd);
        if (/source:\s*['"]?remote-authored['"]?/.test(fmBlock)) {
          return true;
        }
      } catch {
        // Skip
      }
    }
  }

  return false;
}

// Re-export parseFrontmatter for consumers that read template files
export { parseFrontmatter };
