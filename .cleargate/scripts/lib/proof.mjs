/**
 * lib/proof.mjs — proof-tier helpers shared by record_evidence.mjs, update_state.mjs,
 * merge_story.mjs, close_sprint.mjs and the prep_* scripts (EPIC-065, contract C1).
 *
 * Small, pure, Node built-ins only. No top-level side effects.
 *
 * Evidence file: <sprintDir>/evidence/<ID>.json, written only by record_evidence.mjs.
 */

import fs from 'node:fs';
import path from 'node:path';
import { matchesId } from './work-item-id.mjs';

export const PROOF_TIERS = Object.freeze(['unit', 'container', 'live', 'human']);

/** True only for a string exactly equal to a PROOF_TIERS entry. */
export function isProofTier(x) {
  return typeof x === 'string' && PROOF_TIERS.includes(x);
}

/**
 * First non-blank line inside the first fenced block under a `## Proof` heading
 * (the heading is only recognised outside fences). null when there is none, or when
 * that line is a whole `{...}` placeholder.
 */
export function parseProofCommand(content) {
  let inFence = false;
  let inProof = false;
  let inProofFence = false;
  for (const line of content.split(/\r?\n/)) {
    if (/^\s*(```|~~~)/.test(line)) {
      if (inProofFence) return null; // first block closed without a command
      if (!inFence && inProof) {
        inProofFence = true;
      }
      inFence = !inFence;
      continue;
    }
    if (inProofFence) {
      if (line.trim() !== '') {
        const cmd = line.trim();
        return /^\{.*\}$/.test(cmd) ? null : cmd;
      }
      continue;
    }
    if (inFence) continue;
    if (/^##\s+Proof\s*$/.test(line)) inProof = true;
    else if (inProof && /^#{1,2}\s/.test(line)) inProof = false;
  }
  return null;
}

/**
 * The `proof_tier` value of the leading `---` frontmatter block: trimmed, one level of
 * surrounding quotes removed, a trailing ` # comment` dropped. null when the block or key is
 * absent or the value is empty. Does not validate (isProofTier does).
 */
export function readProofTier(content) {
  const lines = String(content).split(/\r?\n/);
  let start = 0;
  while (start < lines.length && lines[start].trim() === '') start++;
  if (start < lines.length && lines[start].trim().startsWith('<instructions>')) {
    let end = start;
    while (end < lines.length && !lines[end].includes('</instructions>')) end++;
    if (end >= lines.length) return null;
    start = end + 1;
    while (start < lines.length && lines[start].trim() === '') start++;
  }
  if (lines[start] === undefined || lines[start].trim() !== '---') return null;
  for (let i = start + 1; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim() === '---') return null;
    const m = /^proof_tier\s*:(.*)$/.exec(line);
    if (!m) continue;
    let v = m[1].trim();
    const q = /^(["'])(.*?)\1(?:\s+#.*)?$/.exec(v);
    if (q) {
      v = q[2].trim();
    } else {
      v = v.replace(/\s+#.*$/, '').trim();
      if (v.startsWith('#')) v = '';
    }
    return v === '' ? null : v;
  }
  return null;
}

/** The item file for `id` in pending-sync/ or archive/ (`matchesId`), or null. */
export function findItemFile(repoRoot, id) {
  for (const sub of ['pending-sync', 'archive']) {
    const dir = path.join(repoRoot, '.cleargate', 'delivery', sub);
    let names;
    try {
      names = fs.readdirSync(dir).sort();
    } catch {
      continue;
    }
    const hit = names.find((n) => matchesId(n, id));
    if (hit) return path.join(dir, hit);
  }
  return null;
}

export function evidencePath(sprintDir, id) {
  return path.join(sprintDir, 'evidence', id + '.json');
}

/** Parsed evidence object, or null when missing, unreadable, malformed or of unknown status. Never throws. */
export function readEvidence(sprintDir, id) {
  try {
    const obj = JSON.parse(fs.readFileSync(evidencePath(sprintDir, id), 'utf8'));
    if (obj === null || typeof obj !== 'object' || Array.isArray(obj)) return null;
    if (obj.status !== 'pass' && obj.status !== 'fail' && obj.status !== 'pending') return null;
    return obj;
  } catch {
    return null;
  }
}

/** Pure. Precedence: missing, pending, fail, tier, else ok. */
export function proofStatus(evidence, tier) {
  const recorded_tier = evidence?.tier ?? null;
  let reason = null;
  if (!evidence) reason = 'missing';
  else if (evidence.status === 'pending') reason = 'pending';
  else if (evidence.status === 'fail') reason = 'fail';
  else if (evidence.tier !== tier) reason = 'tier';
  return { ok: reason === null, reason, recorded_tier };
}

/**
 * The command a proof runs: the item's `## Proof` command, else gate-checks `proof.<tier>`, else (unit
 * only) `qa.test`. First non-blank value, trimmed; null when none. Shared by record_evidence.mjs and
 * prep_qa_context.mjs so the recorder and QA-Verify name the same command.
 */
export function resolveProofCommand(content, tier, gateChecks) {
  const blank = (v) => (typeof v === 'string' && v.trim() !== '' ? v.trim() : null);
  const fromItem = typeof content === 'string' ? blank(parseProofCommand(content)) : null;
  if (fromItem) return fromItem;
  const gc = gateChecks && typeof gateChecks === 'object' ? gateChecks : {};
  if (tier && gc.proof && typeof gc.proof === 'object') {
    const v = blank(gc.proof[tier]);
    if (v) return v;
  }
  if (tier === 'unit' && gc.qa && typeof gc.qa === 'object') return blank(gc.qa.test);
  return null;
}
