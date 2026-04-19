import * as fs from 'fs/promises';
import type { CodebaseVersion } from './codebase-version.js';
import { parseFrontmatter } from '../wiki/parse-frontmatter.js';

export interface StampOptions {
  now?: () => Date;
  version?: CodebaseVersion;
  /** Default: /\/\.cleargate\/delivery\/archive\// */
  archivePathMatcher?: (absPath: string) => boolean;
}

export interface StampResult {
  changed: boolean;
  frontmatterBefore: Record<string, unknown>;
  frontmatterAfter: Record<string, unknown>;
  reason: 'created' | 'updated' | 'noop-archive' | 'noop-unchanged';
}

/** Write-template marker keys (epic/story/bug/CR/proposal). */
const WRITE_TEMPLATE_KEYS = new Set([
  'story_id',
  'epic_id',
  'proposal_id',
  'cr_id',
  'bug_id',
]);

const DEFAULT_ARCHIVE_MATCHER = (absPath: string): boolean =>
  /\/\.cleargate\/delivery\/archive\//.test(absPath);

/**
 * Serialize a frontmatter record to YAML lines.
 * Supported value types: string | null | boolean | Date (ISO string).
 * Preserves the given key order exactly.
 */
function serializeFrontmatter(fm: Record<string, unknown>): string {
  const lines: string[] = ['---'];
  for (const [key, val] of Object.entries(fm)) {
    if (val === null) {
      lines.push(`${key}: null`);
    } else if (typeof val === 'boolean') {
      lines.push(`${key}: ${val}`);
    } else if (Array.isArray(val)) {
      if (val.length === 0) {
        lines.push(`${key}: []`);
      } else {
        const items = val.map((v) => `"${String(v)}"`).join(', ');
        lines.push(`${key}: [${items}]`);
      }
    } else {
      // string (possibly already quoted in original) — emit as quoted string
      const s = String(val);
      // Quote if the value looks like it needs quoting (has special chars, starts with special)
      const needsQuotes = /[:#\[\]{}&*!|>'"%@`\n]/.test(s) || s.trim() !== s || s === '' || s === 'null' || s === 'true' || s === 'false';
      if (needsQuotes) {
        lines.push(`${key}: "${s.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`);
      } else {
        lines.push(`${key}: ${s}`);
      }
    }
  }
  lines.push('---');
  return lines.join('\n');
}

/**
 * Format a Date as ISO 8601 UTC with second precision: "YYYY-MM-DDTHH:MM:SSZ"
 */
function toIsoSecond(d: Date): string {
  return d.toISOString().replace(/\.\d{3}Z$/, 'Z');
}

export async function stampFrontmatter(absPath: string, opts?: StampOptions): Promise<StampResult> {
  const isArchive = (opts?.archivePathMatcher ?? DEFAULT_ARCHIVE_MATCHER)(absPath);
  if (isArchive) {
    // Read to get frontmatter for result shape, but do not write
    const raw = await fs.readFile(absPath, 'utf8');
    let fm: Record<string, unknown> = {};
    try {
      ({ fm } = parseFrontmatter(raw));
    } catch {
      // If parse fails, return empty frontmatter snapshot
    }
    return {
      changed: false,
      frontmatterBefore: fm,
      frontmatterAfter: fm,
      reason: 'noop-archive',
    };
  }

  const raw = await fs.readFile(absPath, 'utf8');

  // Determine if the file has frontmatter at all
  const hasFrontmatter = raw.trimStart().startsWith('---');

  let fm: Record<string, unknown> = {};
  let body = raw;

  if (hasFrontmatter) {
    const parsed = parseFrontmatter(raw);
    fm = parsed.fm;
    body = parsed.body;
  }

  const frontmatterBefore = { ...fm };

  const nowFn = opts?.now ?? (() => new Date());
  const now = nowFn();
  const nowIso = toIsoSecond(now);

  const version = opts?.version ?? { sha: null, dirty: false, tag: null, package_version: null, version_string: 'unknown' };
  const versionString = version.version_string;

  // Determine if this is a first stamp or re-stamp
  const hasCreatedAt = 'created_at' in fm && fm['created_at'] !== undefined && fm['created_at'] !== '' && fm['created_at'] !== null;

  // Determine if it's a write-template (needs server_pushed_at_version)
  const isWriteTemplate = WRITE_TEMPLATE_KEYS.has(Object.keys(fm).find((k) => WRITE_TEMPLATE_KEYS.has(k)) ?? '');

  // Build the new frontmatter:
  // 1. Preserve existing key order
  // 2. Append new keys in canonical order: created_at, updated_at, created_at_version, updated_at_version, server_pushed_at_version
  const newFm: Record<string, unknown> = {};

  // Copy all existing keys first (preserves order)
  for (const [k, v] of Object.entries(fm)) {
    newFm[k] = v;
  }

  if (!hasCreatedAt) {
    // First stamp: set all 4 fields
    // If the keys exist already (placeholder values), update them in-place order
    // If not, append at the end in canonical order
    newFm['created_at'] = nowIso;
    newFm['updated_at'] = nowIso;
    newFm['created_at_version'] = versionString;
    newFm['updated_at_version'] = versionString;

    if (isWriteTemplate && !('server_pushed_at_version' in newFm)) {
      newFm['server_pushed_at_version'] = null;
    }
  } else {
    // Re-stamp: preserve created_at + created_at_version, advance updated_at + updated_at_version
    // created_at stays
    newFm['updated_at'] = nowIso;
    // created_at_version stays
    newFm['updated_at_version'] = versionString;

    if (isWriteTemplate && !('server_pushed_at_version' in newFm)) {
      newFm['server_pushed_at_version'] = null;
    }
  }

  // Check noop-unchanged: if nothing changed, return early
  const unchanged =
    newFm['updated_at'] === fm['updated_at'] &&
    newFm['updated_at_version'] === fm['updated_at_version'] &&
    newFm['created_at'] === fm['created_at'] &&
    newFm['created_at_version'] === fm['created_at_version'];

  if (unchanged && hasCreatedAt) {
    return {
      changed: false,
      frontmatterBefore,
      frontmatterAfter: newFm,
      reason: 'noop-unchanged',
    };
  }

  // Serialize and write
  const fmBlock = serializeFrontmatter(newFm);
  // Reconstruct: frontmatter block + newline + body
  // body from parseFrontmatter does NOT have a leading blank line (it strips one)
  const newContent = body.length > 0 ? `${fmBlock}\n\n${body}` : `${fmBlock}\n`;

  await fs.writeFile(absPath, newContent, 'utf8');

  return {
    changed: true,
    frontmatterBefore,
    frontmatterAfter: newFm,
    reason: hasCreatedAt ? 'updated' : 'created',
  };
}
