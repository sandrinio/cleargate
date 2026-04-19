/**
 * STORY-008-02: Idempotent cached_gate_result frontmatter writer.
 * Reuses the shared frontmatter serializer from frontmatter-yaml.ts.
 *
 * writeCachedGate is byte-identical on re-run with identical inputs (same now + same result).
 *
 * Post-BUG-001: cached_gate_result is stored as a native YAML mapping
 * (parseFrontmatter returns it as an object). Legacy flow-style strings are
 * still accepted on read for backwards-compat with old files.
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

  return coerceCachedGate(fm['cached_gate_result']);
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
  const existing = coerceCachedGate(fm['cached_gate_result']);
  if (existing && JSON.stringify(existing) === JSON.stringify(newResult)) {
    return;
  }

  // Build new frontmatter: preserve all existing keys, inject/update cached_gate_result
  const newFm: Record<string, unknown> = {};
  let inserted = false;
  for (const [k, v] of Object.entries(fm)) {
    if (k === 'cached_gate_result') {
      newFm['cached_gate_result'] = newResult as unknown as Record<string, unknown>;
      inserted = true;
    } else {
      newFm[k] = v;
    }
  }
  if (!inserted) {
    newFm['cached_gate_result'] = newResult as unknown as Record<string, unknown>;
  }

  const fmBlock = serializeFrontmatter(newFm);
  const newContent = body.length > 0 ? `${fmBlock}\n\n${body}` : `${fmBlock}\n`;

  await fs.writeFile(absPath, newContent, 'utf8');
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

/**
 * Coerce a frontmatter value (native object or legacy flow-style string) into
 * a CachedGate. Returns null if absent or unrecognizable.
 */
function coerceCachedGate(val: unknown): CachedGate | null {
  if (val === undefined || val === null) return null;

  // Native object (current format)
  if (typeof val === 'object' && !Array.isArray(val)) {
    const c = val as Record<string, unknown>;
    return {
      pass: Boolean(c['pass']),
      failing_criteria: Array.isArray(c['failing_criteria'])
        ? (c['failing_criteria'] as { id: string; detail: string }[])
        : [],
      last_gate_check: String(c['last_gate_check'] ?? ''),
    };
  }

  // Legacy flow-style string "{pass: true, ...}" — parse via js-yaml
  if (typeof val === 'string' && val.startsWith('{')) {
    try {
      const parsed = yaml.load(val, { schema: yaml.CORE_SCHEMA });
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

  return null;
}
