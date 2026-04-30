#!/usr/bin/env node
/**
 * backfill_hierarchy.mjs — STORY-015-06
 *
 * One-shot backfill: scans every .md file under .cleargate/delivery/pending-sync/
 * and .cleargate/delivery/archive/, and for each file missing parent_cleargate_id
 * or sprint_cleargate_id, sniffs existing legacy keys and writes them back.
 *
 * Heuristics:
 *   parent_cleargate_id: prefer fm.parent_epic_ref, fall back to fm.parent_ref
 *   sprint_cleargate_id: prefer fm.sprint_id, fall back to fm.sprint,
 *                        fall back to fm.parent_epic_ref if it matches ^SPRINT-,
 *                        last fallback: regex /\bSPRINT-(\d+)\b/ against first 50 body lines
 *
 * Idempotency: skips files where both keys are already non-null.
 * --dry-run flag: prints would-write lines without mutating files.
 *
 * Usage:
 *   node .cleargate/scripts/backfill_hierarchy.mjs [--dry-run]
 *
 * Requirements:
 *   js-yaml must be importable (available in cleargate-cli/node_modules/js-yaml
 *   or globally installed). Script will locate it relative to this file's location.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as url from 'node:url';

// ── Locate js-yaml ────────────────────────────────────────────────────────────
// js-yaml lives in cleargate-cli/node_modules — resolve relative to this script
// which lives at .cleargate/scripts/ (two levels up from cleargate-cli/).
const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..', '..');
const JS_YAML_PATH = path.join(REPO_ROOT, 'cleargate-cli', 'node_modules', 'js-yaml', 'index.mjs');
const JS_YAML_PATH_CJS = path.join(REPO_ROOT, 'cleargate-cli', 'node_modules', 'js-yaml', 'dist', 'js-yaml.mjs');

let yaml;
try {
  if (fs.existsSync(JS_YAML_PATH)) {
    yaml = (await import(JS_YAML_PATH)).default;
  } else if (fs.existsSync(JS_YAML_PATH_CJS)) {
    yaml = (await import(JS_YAML_PATH_CJS)).default;
  } else {
    // Try importing directly — works if installed globally or in node path
    yaml = (await import('js-yaml')).default;
  }
} catch {
  console.error('Error: cannot import js-yaml. Run `npm install` in cleargate-cli first.');
  process.exit(1);
}

// ── Args ──────────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
// Optional positional: <dir> — walk only that directory (for tests/CI targeting a tmpdir).
// Default (no arg): walk canonical pending-sync + archive.
const DIR_ARG = args.find((a) => !a.startsWith('--'));

// ── Paths ─────────────────────────────────────────────────────────────────────
const PENDING_SYNC = path.join(REPO_ROOT, '.cleargate', 'delivery', 'pending-sync');
const ARCHIVE = path.join(REPO_ROOT, '.cleargate', 'delivery', 'archive');

// ── Frontmatter parse (raw regex — per FLASHCARD #frontmatter #write-back) ───
/**
 * Parse YAML frontmatter from raw markdown content.
 * Returns { fm, body, fmEnd } where fmEnd is the byte offset of the closing ---.
 */
function parseFm(raw) {
  if (!raw.startsWith('---')) return null;
  const second = raw.indexOf('\n---', 3);
  if (second === -1) return null;
  const fmYaml = raw.slice(4, second); // between first --- and second ---
  const body = raw.slice(second + 4); // after second ---\n
  let fm;
  try {
    fm = yaml.load(fmYaml, { schema: yaml.CORE_SCHEMA });
  } catch {
    return null;
  }
  if (typeof fm !== 'object' || fm === null || Array.isArray(fm)) return null;
  return { fm, body, fmEnd: second + 4 };
}

/**
 * Extract the first 50 lines of the body for sprint regex fallback.
 */
function first50Lines(body) {
  return body.split('\n').slice(0, 50).join('\n');
}

const SPRINT_REGEX = /\bSPRINT-(\d+)\b/;

/**
 * Sniff parent_cleargate_id and sprint_cleargate_id from parsed frontmatter + body.
 * Returns { parent, sprint } — either value may be null if not sniffable.
 */
function sniffHierarchy(fm, body) {
  // parent_cleargate_id
  let parent = null;
  if (typeof fm['parent_epic_ref'] === 'string' && fm['parent_epic_ref'].trim()) {
    parent = fm['parent_epic_ref'].trim();
  } else if (typeof fm['parent_ref'] === 'string' && fm['parent_ref'].trim()) {
    parent = fm['parent_ref'].trim();
  }

  // sprint_cleargate_id
  let sprint = null;
  if (typeof fm['sprint_id'] === 'string' && fm['sprint_id'].trim()) {
    sprint = fm['sprint_id'].trim();
  } else if (typeof fm['sprint'] === 'string' && fm['sprint'].trim()) {
    sprint = fm['sprint'].trim();
  } else if (typeof fm['parent_epic_ref'] === 'string' && /^SPRINT-/.test(fm['parent_epic_ref'].trim())) {
    sprint = fm['parent_epic_ref'].trim();
  } else {
    // Last fallback: regex against first 50 body lines
    const bodySnippet = first50Lines(body);
    const m = SPRINT_REGEX.exec(bodySnippet);
    if (m) {
      sprint = `SPRINT-${m[1]}`;
    }
  }

  return { parent, sprint };
}

/**
 * Splice new frontmatter key-value pairs into raw content after the last existing key
 * in the frontmatter block. Uses raw regex splice to avoid round-trip via YAML serializer
 * (per FLASHCARD 2026-04-24 #frontmatter #write-back: do NOT round-trip via parse+serialize).
 *
 * Inserts after the anchor line:
 *   1. parent_epic_ref or parent_ref line (if present)
 *   2. Otherwise: the last key line before the closing ---
 *
 * Returns the modified content string.
 */
function spliceKeys(raw, parentVal, sprintVal) {
  // Find the frontmatter block
  const fmStart = raw.indexOf('---');
  if (fmStart !== 0) return raw;
  const fmClose = raw.indexOf('\n---', fmStart + 3);
  if (fmClose === -1) return raw;

  const fmBlock = raw.slice(0, fmClose);
  const rest = raw.slice(fmClose); // from \n--- onwards

  // Build lines to insert
  const toInsert = [];
  if (parentVal !== null) {
    toInsert.push(`parent_cleargate_id: "${parentVal}"`);
  }
  if (sprintVal !== null) {
    toInsert.push(`sprint_cleargate_id: "${sprintVal}"`);
  }
  if (toInsert.length === 0) return raw;

  // Find anchor: prefer parent_epic_ref or parent_ref line, else insert before closing ---
  const lines = fmBlock.split('\n');
  let anchorIdx = -1;
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i];
    if (/^parent_epic_ref:/.test(line) || /^parent_ref:/.test(line)) {
      anchorIdx = i;
      break;
    }
  }

  // If no anchor found, insert after the last non-empty line in frontmatter
  if (anchorIdx === -1) {
    for (let i = lines.length - 1; i >= 1; i--) {
      if (lines[i] && lines[i].trim()) {
        anchorIdx = i;
        break;
      }
    }
  }

  if (anchorIdx === -1) anchorIdx = lines.length - 1;

  // Splice in the new lines after anchorIdx
  lines.splice(anchorIdx + 1, 0, ...toInsert);
  return lines.join('\n') + rest;
}

/**
 * Atomic write: write to .tmp then rename.
 */
async function writeAtomic(filePath, content) {
  const tmpPath = `${filePath}.tmp.${Date.now()}`;
  await fs.promises.writeFile(tmpPath, content, 'utf8');
  await fs.promises.rename(tmpPath, filePath);
}

/**
 * Collect all .md files under a directory (non-recursive by design — delivery dirs are flat).
 */
function collectMd(dir) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return [];
  }
  return entries
    .filter((e) => e.isFile() && e.name.endsWith('.md'))
    .map((e) => path.join(dir, e.name));
}

// ── Main ──────────────────────────────────────────────────────────────────────
// When a <dir> arg is given, walk only that dir (used by integration tests).
// Otherwise walk the canonical corpus.
const files = DIR_ARG
  ? collectMd(path.resolve(DIR_ARG))
  : [...collectMd(PENDING_SYNC), ...collectMd(ARCHIVE)];

let written = 0;
let skipped = 0;
let unsniffable = 0;

for (const filePath of files) {
  let raw;
  try {
    raw = fs.readFileSync(filePath, 'utf8');
  } catch (e) {
    console.error(`error reading ${filePath}: ${e.message}`);
    continue;
  }

  const parsed = parseFm(raw);
  if (!parsed) {
    // No frontmatter — skip silently
    skipped++;
    continue;
  }

  const { fm, body } = parsed;
  const existingParent = fm['parent_cleargate_id'];
  const existingSprint = fm['sprint_cleargate_id'];

  // Idempotency: if both keys are already non-null, skip
  if (existingParent !== null && existingParent !== undefined &&
      existingSprint !== null && existingSprint !== undefined) {
    console.log(`skipped (already populated): ${path.relative(REPO_ROOT, filePath)}`);
    skipped++;
    continue;
  }

  // Sniff only what's missing
  const { parent: sniffedParent, sprint: sniffedSprint } = sniffHierarchy(fm, body);

  // Only write keys that are currently absent/null AND were sniffed
  const parentToWrite = (existingParent === null || existingParent === undefined) ? sniffedParent : null;
  const sprintToWrite = (existingSprint === null || existingSprint === undefined) ? sniffedSprint : null;

  const noChange = parentToWrite === null && sprintToWrite === null;
  if (noChange) {
    const relPath = path.relative(REPO_ROOT, filePath);
    if (sniffedParent === null && sniffedSprint === null) {
      console.error(`unsniffable: ${relPath}`);
      unsniffable++;
    } else {
      // One key already set, the other couldn't be sniffed
      console.log(`skipped (already populated): ${relPath}`);
      skipped++;
    }
    continue;
  }

  const relPath = path.relative(REPO_ROOT, filePath);

  if (DRY_RUN) {
    const parentDisplay = parentToWrite ?? existingParent ?? 'null';
    const sprintDisplay = sprintToWrite ?? existingSprint ?? 'null';
    console.log(`would-write: ${relPath} (parent=${parentDisplay}, sprint=${sprintDisplay})`);
    written++;
    continue;
  }

  // Splice the new keys into the raw content
  const newContent = spliceKeys(raw, parentToWrite, sprintToWrite);
  if (newContent === raw) {
    // spliceKeys found nothing to insert (shouldn't happen, but guard)
    console.log(`skipped (no-op splice): ${relPath}`);
    skipped++;
    continue;
  }

  await writeAtomic(filePath, newContent);
  const parentDisplay = parentToWrite ?? existingParent ?? 'null';
  const sprintDisplay = sprintToWrite ?? existingSprint ?? 'null';
  console.log(`wrote: ${relPath} (parent=${parentDisplay}, sprint=${sprintDisplay})`);
  written++;
}

console.log(`\nBackfill complete: ${written} ${DRY_RUN ? 'would-write' : 'written'}, ${skipped} skipped, ${unsniffable} unsniffable.`);
if (unsniffable > 0) {
  process.stderr.write(`${unsniffable} file(s) could not be sniffed — both hierarchy keys remain null.\n`);
}
