#!/usr/bin/env node
/**
 * assert_story_files.mjs — Gate-2 story-file existence assertion
 *
 * Usage: node assert_story_files.mjs <sprint-file-path>
 *
 * Parses the "## 1. Consolidated Deliverables" section of a sprint file for
 * STORY-\d+-\d+ IDs, then checks that each has a corresponding
 * pending-sync/STORY-<id>_*.md file under the repo root.
 *
 * Exit 0:  all story files present (prints summary to stdout)
 * Exit 1:  one or more missing (prints JSON {missing,present} to stderr)
 * Exit 2:  usage / parse error
 *
 * Env:
 *   CLEARGATE_REPO_ROOT  override repo root (for test isolation)
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Resolve repo root: .cleargate/scripts/ -> ../../ (two levels up)
const REPO_ROOT = process.env.CLEARGATE_REPO_ROOT
  ? path.resolve(process.env.CLEARGATE_REPO_ROOT)
  : path.resolve(__dirname, '..', '..');

function usage() {
  process.stderr.write('Usage: node assert_story_files.mjs <sprint-file-path>\n');
  process.exit(2);
}

/**
 * Extract the "## 1. Consolidated Deliverables" section from sprint markdown.
 * Returns the section text or null if not found.
 *
 * Strategy: split on ^## headings, find the one starting with "1. Consolidated Deliverables".
 * This avoids regex lookahead pitfalls with end-of-string anchors in JS.
 */
function extractDeliverablesSection(content) {
  // Split on lines that start a new ## section (lookahead keeps delimiter in next part)
  const parts = content.split(/^(?=## )/m);
  const deliverables = parts.find((p) =>
    /^## 1\.? Consolidated Deliverables\b/m.test(p)
  );
  if (!deliverables) return null;
  // Strip the header line itself, return the rest
  return deliverables.replace(/^## [^\n]*\n/, '');
}

/**
 * Extract deduplicated STORY-\d+-\d+ IDs from a text block.
 */
function extractStoryIds(text) {
  const matches = text.match(/STORY-\d+-\d+/g) || [];
  return [...new Set(matches)];
}

/**
 * Check whether pending-sync contains a file matching STORY-<id>_*.md
 * Returns the matching filename or null.
 */
function findStoryFile(repoRoot, storyId) {
  const pendingSync = path.join(repoRoot, '.cleargate', 'delivery', 'pending-sync');
  let entries;
  try {
    entries = fs.readdirSync(pendingSync);
  } catch {
    return null;
  }
  const prefix = `${storyId}_`;
  const match = entries.find(
    (e) => e.startsWith(prefix) && e.endsWith('.md')
  );
  return match ? path.join(pendingSync, match) : null;
}

/**
 * Main assertion logic.
 * Returns { missing: string[], present: string[] }
 */
function assertStoryFiles(sprintFilePath, repoRoot) {
  let content;
  try {
    content = fs.readFileSync(sprintFilePath, 'utf8');
  } catch (err) {
    process.stderr.write(`Error: cannot read sprint file: ${err.message}\n`);
    process.exit(2);
  }

  const section = extractDeliverablesSection(content);
  if (section === null) {
    process.stderr.write(
      'Error: "## 1. Consolidated Deliverables" section not found in sprint file\n'
    );
    process.exit(2);
  }

  const storyIds = extractStoryIds(section);
  if (storyIds.length === 0) {
    process.stderr.write('Warning: no STORY-IDs found in §1 Consolidated Deliverables\n');
    // Return empty — no files to check, nothing is missing
    return { missing: [], present: [] };
  }

  const missing = [];
  const present = [];
  for (const id of storyIds) {
    const found = findStoryFile(repoRoot, id);
    if (found) {
      present.push(id);
    } else {
      missing.push(id);
    }
  }

  return { missing, present };
}

function main() {
  const args = process.argv.slice(2);
  if (args.length === 0 || args[0].startsWith('--')) usage();

  const sprintFilePath = path.resolve(args[0]);

  const { missing, present } = assertStoryFiles(sprintFilePath, REPO_ROOT);

  if (missing.length === 0) {
    process.stdout.write(
      `OK: all ${present.length} story file(s) present in pending-sync/\n`
    );
    process.exit(0);
  } else {
    process.stderr.write(
      JSON.stringify({ missing, present }, null, 2) + '\n'
    );
    process.stderr.write(
      `MISSING: ${missing.length} story file(s) not found in pending-sync/: ${missing.join(', ')}\n`
    );
    process.exit(1);
  }
}

main();
