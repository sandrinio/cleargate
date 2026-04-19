/**
 * slug.ts — STORY-010-05
 *
 * Filename slug helper + proposal ID scanner for stakeholder intake.
 *
 * `slugify(title, max)` — deterministic, locale-free slug from a title string.
 * `nextProposalId(projectRoot)` — scans pending-sync + archive for max PROP-NNN
 *   and returns the next sequential ID as a zero-padded string.
 * `findByRemoteId(projectRoot, remoteId)` — dedup helper; returns local path on
 *   hit, null on miss. Scans frontmatter block only (first --- ... --- delimiters).
 */

import * as fsPromises from 'node:fs/promises';
import * as path from 'node:path';

// ── slugify ──────────────────────────────────────────────────────────────────

/**
 * Convert a title string into a URL-safe slug.
 *
 * Algorithm:
 *   1. NFKD-normalize → strip combining marks (é→e, ü→u, etc.)
 *   2. Lowercase.
 *   3. Replace runs of [^a-z0-9]+ with a single dash.
 *   4. Trim leading/trailing dashes.
 *   5. Truncate to `max` characters; re-trim trailing dash.
 *   6. If empty/all-dashes after step 5 → return "untitled".
 */
export function slugify(title: string, max: number = 40): string {
  // Step 1: NFKD normalize + strip combining marks (Unicode category M)
  const normalized = title.normalize('NFKD').replace(/\p{M}/gu, '');
  // Step 2: lowercase
  const lowered = normalized.toLowerCase();
  // Step 3: replace non-alphanumeric runs with dash
  const dashed = lowered.replace(/[^a-z0-9]+/g, '-');
  // Step 4: trim leading/trailing dashes
  const trimmed = dashed.replace(/^-+|-+$/g, '');
  // Step 5: truncate to max; re-trim trailing dash
  const truncated = trimmed.slice(0, max).replace(/-+$/, '');
  // Step 6: fallback for empty result
  if (!truncated) {
    return 'untitled';
  }
  return truncated;
}

// ── nextProposalId ────────────────────────────────────────────────────────────

/** Pattern matching `proposal_id: "PROP-NNN"` or `proposal_id: PROP-NNN` */
const PROPOSAL_ID_RE = /^proposal_id:\s*"?PROP-(\d+)"?/m;

/**
 * Scan `.cleargate/delivery/pending-sync/` AND `.cleargate/delivery/archive/`
 * for `.md` files whose frontmatter contains `proposal_id: "PROP-NNN"`.
 * Returns the next ID as `"PROP-<max+1, zero-padded to 3>"`.
 *
 * Gap-tolerant: returns max+1, NOT the first gap.
 * Empty dirs or no proposals found → `"PROP-001"`.
 */
export async function nextProposalId(projectRoot: string): Promise<string> {
  const dirs = [
    path.join(projectRoot, '.cleargate', 'delivery', 'pending-sync'),
    path.join(projectRoot, '.cleargate', 'delivery', 'archive'),
  ];

  let maxN = 0;

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
        // Read only the frontmatter block (first --- ... ---)
        const raw = await fsPromises.readFile(fullPath, 'utf8');
        const fmEnd = extractFrontmatterBlock(raw);
        if (!fmEnd) continue;
        const match = PROPOSAL_ID_RE.exec(fmEnd);
        if (!match) continue;
        const n = parseInt(match[1]!, 10);
        if (n > maxN) maxN = n;
      } catch {
        // Skip unreadable files
      }
    }
  }

  const next = maxN + 1;
  return `PROP-${String(next).padStart(3, '0')}`;
}

// ── findByRemoteId ────────────────────────────────────────────────────────────

/**
 * Scan `.cleargate/delivery/pending-sync/` AND `.cleargate/delivery/archive/`
 * for a `.md` file whose frontmatter contains `remote_id: "<remoteId>"`.
 *
 * Returns the absolute path of the first match, or `null` if not found.
 * Reads only the frontmatter block (first --- ... ---) for efficiency.
 */
export async function findByRemoteId(
  projectRoot: string,
  remoteId: string,
): Promise<string | null> {
  const dirs = [
    path.join(projectRoot, '.cleargate', 'delivery', 'pending-sync'),
    path.join(projectRoot, '.cleargate', 'delivery', 'archive'),
  ];

  // Build a regex matching `remote_id: "LIN-NNN"` or `remote_id: LIN-NNN`
  const escaped = remoteId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`^remote_id:\\s*"?${escaped}"?\\s*$`, 'm');

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
        const fm = extractFrontmatterBlock(raw);
        if (!fm) continue;
        if (re.test(fm)) return fullPath;
      } catch {
        // Skip
      }
    }
  }

  return null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Extract the YAML content between the first `---` delimiters.
 * Returns the raw YAML text (without the delimiters), or null if not found.
 */
function extractFrontmatterBlock(raw: string): string | null {
  const lines = raw.split('\n');
  if (lines[0] !== '---') return null;
  let closeIdx = -1;
  for (let i = 1; i < lines.length; i++) {
    if (lines[i] === '---') { closeIdx = i; break; }
  }
  if (closeIdx === -1) return null;
  return lines.slice(1, closeIdx).join('\n');
}
