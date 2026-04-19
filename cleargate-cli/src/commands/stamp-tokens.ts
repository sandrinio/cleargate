/**
 * stamp-tokens.ts — STORY-008-05
 *
 * `cleargate stamp-tokens <file>` CLI command.
 * Reads token-ledger rows for a work item, aggregates per-session totals, and
 * stamps `draft_tokens:` into the file's YAML frontmatter.
 *
 * Hook-invoked. Idempotent within a session (last_stamp check), accumulative
 * across sessions (sessions[] array).
 *
 * No top-level await.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { parseFrontmatter } from '../wiki/parse-frontmatter.js';
import { serializeFrontmatter, toIsoSecond } from '../lib/frontmatter-yaml.js';
import { readLedgerForWorkItem } from '../lib/ledger-reader.js';
import { detectWorkItemType } from '../lib/work-item-type.js';
import type { SessionBucket } from '../lib/ledger-reader.js';

// ─── Public API ───────────────────────────────────────────────────────────────

export interface StampTokensCliOptions {
  cwd?: string;
  now?: () => Date;
  stdout?: (s: string) => void;
  exit?: (code: number) => never;
  sprintRunsRoot?: string;
}

export interface DraftTokensSession {
  session: string;
  model: string;
  input: number;
  output: number;
  cache_read: number;
  cache_creation: number;
  ts: string;
}

export interface DraftTokens {
  input: number | null;
  output: number | null;
  cache_creation: number | null;
  cache_read: number | null;
  model: string | null;
  last_stamp: string;
  sessions: DraftTokensSession[];
}

export async function stampTokensHandler(
  file: string,
  opts: { dryRun?: boolean },
  cli?: StampTokensCliOptions,
): Promise<void> {
  const stdoutFn = cli?.stdout ?? ((s: string) => process.stdout.write(s + '\n'));
  const exitFn =
    cli?.exit ??
    ((code: number) => {
      process.exit(code);
    });
  const nowFn = cli?.now ?? (() => new Date());
  const cwd = cli?.cwd ?? process.cwd();

  // Resolve file to absolute path
  const absPath = path.isAbsolute(file) ? file : path.resolve(cwd, file);

  // Archive freeze: if path contains /.cleargate/delivery/archive/, noop
  if (/\/\.cleargate\/delivery\/archive\//.test(absPath)) {
    stdoutFn(`[frozen] ${absPath}`);
    exitFn(0);
    return;
  }

  // Read the file
  let rawContent: string;
  try {
    rawContent = fs.readFileSync(absPath, 'utf-8');
  } catch {
    stdoutFn(`[stamp-tokens] error: cannot read file: ${absPath}`);
    exitFn(1);
    return;
  }

  // Parse frontmatter
  let fm: Record<string, unknown> = {};
  let body = '';

  const hasFrontmatter = rawContent.trimStart().startsWith('---');
  if (hasFrontmatter) {
    try {
      const parsed = parseFrontmatter(rawContent);
      fm = parsed.fm;
      body = parsed.body;
    } catch {
      stdoutFn(`[stamp-tokens] error: cannot parse frontmatter in: ${absPath}`);
      exitFn(1);
      return;
    }
  } else {
    body = rawContent;
  }

  // Extract work_item_id from frontmatter ID key or filename fallback
  const workItemId = extractWorkItemId(fm, absPath);
  if (!workItemId) {
    stdoutFn(`[stamp-tokens] error: cannot determine work_item_id from frontmatter or filename: ${absPath}`);
    exitFn(1);
    return;
  }

  // Read existing draft_tokens from frontmatter (parsed as native nested object
  // since parseFrontmatter now returns typed values)
  const existingDraftTokens = coerceDraftTokens(fm['draft_tokens']);
  const existingLastStamp = existingDraftTokens?.last_stamp ?? null;

  // Read ledger
  const buckets = readLedgerForWorkItem(workItemId, { sprintRunsRoot: cli?.sprintRunsRoot });

  // Idempotency check: if all ledger rows are older than last_stamp, and we
  // already have sessions, no-op.
  if (existingLastStamp && buckets.length > 0) {
    const allRowsOlderThanLastStamp = buckets.every((bucket) =>
      bucket.rows.every((row) => row.ts < existingLastStamp),
    );
    if (allRowsOlderThanLastStamp && existingDraftTokens !== null) {
      // No new rows since last stamp — no-op
      exitFn(0);
      return;
    }
  }

  const nowIso = toIsoSecond(nowFn());

  let newFm: Record<string, unknown>;
  let stampError: string | undefined;

  if (buckets.length === 0) {
    // Missing ledger: write all-null draft_tokens + stamp_error
    stampError = `no ledger rows for work_item_id ${workItemId}`;
    const nullTokens: DraftTokens = {
      input: null,
      output: null,
      cache_creation: null,
      cache_read: null,
      model: null,
      last_stamp: nowIso,
      sessions: [],
    };
    newFm = buildNewFrontmatter(fm, nullTokens, stampError);
  } else {
    // Aggregate across all sessions
    const tokens = aggregateBuckets(buckets, nowIso);
    newFm = buildNewFrontmatter(fm, tokens, undefined);
    // Remove stale stamp_error if ledger now has rows
    delete newFm['stamp_error'];
  }

  const serialized = buildSerializedContent(newFm, body);

  if (opts.dryRun) {
    // Print planned diff without writing
    stdoutFn(`[dry-run] stamp-tokens would write draft_tokens for ${workItemId}:`);
    const draftTokensVal = newFm['draft_tokens'];
    stdoutFn(`  draft_tokens: ${JSON.stringify(draftTokensVal)}`);
    if (stampError) {
      stdoutFn(`  stamp_error: "${stampError}"`);
    }
    exitFn(0);
    return;
  }

  // Write the file
  try {
    fs.writeFileSync(absPath, serialized, 'utf-8');
  } catch {
    stdoutFn(`[stamp-tokens] error: cannot write file: ${absPath}`);
    exitFn(1);
    return;
  }

  stdoutFn(`[stamped] ${absPath} (${workItemId})`);
  exitFn(0);
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

/**
 * Extract the work_item_id from frontmatter ID fields or filename regex fallback.
 */
function extractWorkItemId(fm: Record<string, unknown>, absPath: string): string | null {
  // Try frontmatter ID keys in order
  const idKeys = ['story_id', 'epic_id', 'proposal_id', 'cr_id', 'bug_id'];
  for (const key of idKeys) {
    const val = fm[key];
    if (typeof val === 'string' && val.trim() !== '') {
      return val.trim();
    }
  }

  // Fallback: extract from filename
  const basename = path.basename(absPath);
  const match = basename.match(/^(STORY|EPIC|PROPOSAL|CR|BUG)-\d+(-\d+)?/i);
  if (match) {
    return match[0].toUpperCase();
  }

  // Also try detectWorkItemType for any prefix match
  const typeFromPath = detectWorkItemType(absPath);
  if (typeFromPath) {
    // Try to find the ID segment in the basename
    const idMatch = basename.match(/((?:STORY|EPIC|PROPOSAL|CR|BUG)-\d+(?:-\d+)?)/i);
    if (idMatch) {
      return idMatch[1].toUpperCase();
    }
  }

  return null;
}

/**
 * Coerce the existing draft_tokens value from frontmatter into a DraftTokens shape.
 * Handles two on-disk shapes:
 *   1. Native nested YAML map (current format, parsed by js-yaml as an object)
 *   2. Legacy JSON-in-a-string, from pre-fix files written before BUG-001
 */
function coerceDraftTokens(val: unknown): DraftTokens | null {
  if (val == null) return null;

  if (typeof val === 'object' && !Array.isArray(val)) {
    const o = val as Record<string, unknown>;
    return {
      input: typeof o['input'] === 'number' ? o['input'] : null,
      output: typeof o['output'] === 'number' ? o['output'] : null,
      cache_creation: typeof o['cache_creation'] === 'number' ? o['cache_creation'] : null,
      cache_read: typeof o['cache_read'] === 'number' ? o['cache_read'] : null,
      model: typeof o['model'] === 'string' ? o['model'] : null,
      last_stamp: typeof o['last_stamp'] === 'string' ? o['last_stamp'] : '',
      sessions: Array.isArray(o['sessions']) ? (o['sessions'] as DraftTokensSession[]) : [],
    };
  }

  if (typeof val === 'string') {
    try {
      const parsed = JSON.parse(val) as DraftTokens;
      return parsed;
    } catch {
      return null;
    }
  }

  return null;
}

/**
 * Aggregate ledger buckets into a DraftTokens object.
 * model: comma-joined sorted unique models across all buckets' rows.
 * sessions[]: one entry per bucket, using bucket totals.
 */
export function aggregateBuckets(buckets: SessionBucket[], nowIso: string): DraftTokens {
  let totalInput = 0;
  let totalOutput = 0;
  let totalCacheCreation = 0;
  let totalCacheRead = 0;

  const uniqueModels = new Set<string>();
  const sessions: DraftTokensSession[] = [];

  for (const bucket of buckets) {
    totalInput += bucket.totals.input;
    totalOutput += bucket.totals.output;
    totalCacheCreation += bucket.totals.cache_creation;
    totalCacheRead += bucket.totals.cache_read;

    // Collect unique models from rows and derive session model
    const sessionModels = new Set<string>();
    for (const row of bucket.rows) {
      if (row.model) {
        uniqueModels.add(row.model);
        sessionModels.add(row.model);
      }
    }

    // Session model: comma-joined unique models for this session
    const sessionModel = Array.from(sessionModels).sort().join(', ');

    sessions.push({
      session: bucket.session_id,
      model: sessionModel,
      input: bucket.totals.input,
      output: bucket.totals.output,
      cache_read: bucket.totals.cache_read,
      cache_creation: bucket.totals.cache_creation,
      ts: bucket.rows[0]?.ts ?? '',
    });
  }

  const model = Array.from(uniqueModels).sort().join(', ') || null;

  return {
    input: totalInput,
    output: totalOutput,
    cache_creation: totalCacheCreation,
    cache_read: totalCacheRead,
    model,
    last_stamp: nowIso,
    sessions,
  };
}

/**
 * Build the new frontmatter record with draft_tokens as a native nested
 * object. serializeFrontmatter (js-yaml) emits it as a block-style YAML map.
 */
function buildNewFrontmatter(
  existingFm: Record<string, unknown>,
  tokens: DraftTokens,
  stampError: string | undefined,
): Record<string, unknown> {
  const newFm: Record<string, unknown> = {};

  // Preserve all existing keys except draft_tokens and stamp_error (we'll re-add)
  for (const [k, v] of Object.entries(existingFm)) {
    if (k !== 'draft_tokens' && k !== 'stamp_error') {
      newFm[k] = v;
    }
  }

  if (stampError) {
    newFm['stamp_error'] = stampError;
  }

  // Store as a plain object; serializer emits block-style YAML
  newFm['draft_tokens'] = tokens as unknown as Record<string, unknown>;

  return newFm;
}

/**
 * Build the final file content: frontmatter block + body.
 */
function buildSerializedContent(fm: Record<string, unknown>, body: string): string {
  const fmBlock = serializeFrontmatter(fm);
  if (body.length > 0) {
    return `${fmBlock}\n\n${body}`;
  }
  return `${fmBlock}\n`;
}

