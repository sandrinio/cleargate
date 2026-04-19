/**
 * STORY-008-02: Idempotent cached_gate_result frontmatter writer.
 * Reuses the shared frontmatter serializer from frontmatter-yaml.ts.
 *
 * writeCachedGate is byte-identical on re-run with identical inputs (same now + same result).
 */

import * as fs from 'node:fs/promises';
import yaml from 'js-yaml';
import { parseFrontmatter } from '../wiki/parse-frontmatter.js';
import { serializeFrontmatter, toIsoSecond } from './frontmatter-yaml.js';

export interface CachedGate {
  pass: boolean;
  failing_criteria: { id: string; detail: string }[];
  last_gate_check: string;
}

/**
 * Read the cached_gate_result from a file's frontmatter.
 * Returns null if the key is absent or the file has no valid frontmatter.
 */
export async function readCachedGate(absPath: string): Promise<CachedGate | null> {
  let raw: string;
  try {
    raw = await fs.readFile(absPath, 'utf8');
  } catch {
    return null;
  }

  let fm: Record<string, unknown>;
  try {
    ({ fm } = parseFrontmatter(raw));
  } catch {
    return null;
  }

  const cached = fm['cached_gate_result'];
  if (cached === undefined || cached === null) return null;

  // If stored as an opaque string (inline flow YAML), parse it via js-yaml
  if (typeof cached === 'string') {
    return parseCachedGateString(cached);
  }

  // If already parsed as object (future-proofing)
  if (typeof cached === 'object' && !Array.isArray(cached)) {
    const c = cached as Record<string, unknown>;
    return {
      pass: Boolean(c['pass']),
      failing_criteria: Array.isArray(c['failing_criteria'])
        ? (c['failing_criteria'] as { id: string; detail: string }[])
        : [],
      last_gate_check: String(c['last_gate_check'] ?? ''),
    };
  }

  return null;
}

/**
 * Write (or update) cached_gate_result in a file's frontmatter.
 * Idempotent: if the result deep-equals the existing cached value AND the same
 * now() is supplied, the file bytes are left untouched.
 *
 * @param absPath Absolute path to the markdown file.
 * @param result  The gate result to cache.
 * @param opts    Optional: inject `now` for test determinism.
 */
export async function writeCachedGate(
  absPath: string,
  result: CachedGate,
  opts?: { now?: () => Date }
): Promise<void> {
  const nowFn = opts?.now ?? (() => new Date());
  const lastGateCheck = result.last_gate_check || toIsoSecond(nowFn());

  const newResult: CachedGate = {
    pass: result.pass,
    failing_criteria: result.failing_criteria,
    last_gate_check: lastGateCheck,
  };

  const raw = await fs.readFile(absPath, 'utf8');

  let fm: Record<string, unknown>;
  let body: string;
  try {
    ({ fm, body } = parseFrontmatter(raw));
  } catch {
    throw new Error(`writeCachedGate: failed to parse frontmatter in ${absPath}`);
  }

  // Idempotency check: compare existing cached_gate_result
  const existingCached = fm['cached_gate_result'];
  if (existingCached !== undefined && existingCached !== null) {
    try {
      const existingParsed = typeof existingCached === 'string'
        ? parseCachedGateString(existingCached)
        : null;
      if (existingParsed && JSON.stringify(existingParsed) === JSON.stringify(newResult)) {
        // Byte-identical: skip write
        return;
      }
    } catch {
      // Fall through to write
    }
  }

  // Serialize cached_gate_result as inline flow YAML (opaque string)
  const cachedStr = serializeCachedGate(newResult);

  // Build new frontmatter: preserve all existing keys, inject/update cached_gate_result
  const newFm: Record<string, unknown> = {};
  let inserted = false;
  for (const [k, v] of Object.entries(fm)) {
    if (k === 'cached_gate_result') {
      newFm['cached_gate_result'] = cachedStr;
      inserted = true;
    } else {
      newFm[k] = v;
    }
  }
  if (!inserted) {
    newFm['cached_gate_result'] = cachedStr;
  }

  const fmBlock = serializeFrontmatter(newFm);
  const newContent = body.length > 0 ? `${fmBlock}\n\n${body}` : `${fmBlock}\n`;

  await fs.writeFile(absPath, newContent, 'utf8');
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

/**
 * Serialize a CachedGate to a compact inline YAML flow string.
 * Stored as an opaque string value in frontmatter (parseFrontmatter treats `{` as opaque).
 */
function serializeCachedGate(result: CachedGate): string {
  const criteriaStr = result.failing_criteria.length === 0
    ? '[]'
    : '[' +
      result.failing_criteria
        .map((c) => `{id: ${JSON.stringify(c.id)}, detail: ${JSON.stringify(c.detail)}}`)
        .join(', ') +
      ']';

  return `{pass: ${result.pass}, failing_criteria: ${criteriaStr}, last_gate_check: ${JSON.stringify(result.last_gate_check)}}`;
}

/**
 * Parse an opaque cached_gate_result string back to CachedGate.
 * The string is inline flow YAML which we parse via js-yaml.
 */
function parseCachedGateString(s: string): CachedGate | null {
  if (!s.startsWith('{')) return null;
  try {
    const parsed = yaml.load(s);
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return null;
    const p = parsed as Record<string, unknown>;
    return {
      pass: Boolean(p['pass']),
      failing_criteria: Array.isArray(p['failing_criteria'])
        ? (p['failing_criteria'] as { id: string; detail: string }[])
        : [],
      last_gate_check: String(p['last_gate_check'] ?? ''),
    };
  } catch {
    return null;
  }
}
