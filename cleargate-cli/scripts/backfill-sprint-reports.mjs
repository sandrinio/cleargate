#!/usr/bin/env node
/**
 * backfill-sprint-reports.mjs — One-shot backfill of sprint reports into the wiki.
 *
 * Iterates SPRINT-03 through SPRINT-26 (existing range; SPRINT-27 is in-flight).
 * For each sprint, resolves the report filename via the legacy-fallback rule:
 *   Prefer SPRINT-NN_REPORT.md; fall back to REPORT.md.
 * Runs `cleargate wiki ingest <resolved-path>` for each found report.
 *
 * Output: one result line per sprint + aggregate summary.
 * Idempotent — safe to re-run (ingest is SHA-gated no-op on repeated runs).
 *
 * Usage:
 *   node cleargate-cli/scripts/backfill-sprint-reports.mjs
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as url from 'node:url';
import { spawnSync } from 'node:child_process';

const __filename = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Resolve repo root: cleargate-cli/scripts/ → up 2 → repo root
const REPO_ROOT = path.resolve(__dirname, '..', '..');

// Backfill range: SPRINT-03..SPRINT-26 (SPRINT-27 is in-flight)
const START = 3;
const END = 26;

// CLI binary
const CLI_BIN = path.join(REPO_ROOT, 'cleargate-cli', 'dist', 'cli.js');

// Sprint runs directory
const SPRINT_RUNS_DIR = path.join(REPO_ROOT, '.cleargate', 'sprint-runs');

/**
 * Resolve the report file path for a given sprint ID using the legacy-fallback rule:
 * prefer SPRINT-NN_REPORT.md, fall back to REPORT.md.
 * Returns the absolute path if found, null otherwise.
 */
function resolveReportPath(sprintId) {
  const sprintDir = path.join(SPRINT_RUNS_DIR, sprintId);
  if (!fs.existsSync(sprintDir)) return null;

  // Try canonical filename first (SPRINT-18+)
  const canonicalName = `${sprintId}_REPORT.md`;
  const canonicalPath = path.join(sprintDir, canonicalName);
  if (fs.existsSync(canonicalPath)) return canonicalPath;

  // Fall back to legacy filename (SPRINT-01..17)
  const legacyPath = path.join(sprintDir, 'REPORT.md');
  if (fs.existsSync(legacyPath)) return legacyPath;

  return null;
}

/**
 * Run `node CLI_BIN wiki ingest <reportPath>` and return result.
 */
function runIngest(reportPath) {
  if (!fs.existsSync(CLI_BIN)) {
    return { outcome: 'skipped', reason: 'CLI binary not found — run npm run build first' };
  }

  const result = spawnSync('node', [CLI_BIN, 'wiki', 'ingest', reportPath], {
    encoding: 'utf8',
    env: { ...process.env },
    cwd: REPO_ROOT,
    timeout: 60000,
  });

  const stdout = result.stdout ?? '';
  const stderr = result.stderr ?? '';

  if (result.status !== 0) {
    return { outcome: 'error', reason: `exit ${result.status}: ${stderr.trim()}` };
  }

  if (stdout.includes('no-op') || stdout.includes('unchanged')) {
    return { outcome: 'unchanged', reason: stdout.trim() };
  }

  return { outcome: 'ingested', reason: stdout.trim() };
}

// ── Main ─────────────────────────────────────────────────────────────────────

let ingested = 0;
let unchanged = 0;
let skipped = 0;
let errors = 0;

for (let n = START; n <= END; n++) {
  const nn = String(n).padStart(2, '0');
  const sprintId = `SPRINT-${nn}`;

  const reportPath = resolveReportPath(sprintId);

  if (reportPath === null) {
    process.stdout.write(`${sprintId}: no report file\n`);
    skipped++;
    continue;
  }

  const { outcome, reason } = runIngest(reportPath);

  switch (outcome) {
    case 'ingested':
      process.stdout.write(`${sprintId}: ingested (${path.basename(reportPath)})\n`);
      ingested++;
      break;
    case 'unchanged':
      process.stdout.write(`${sprintId}: unchanged (no-op)\n`);
      unchanged++;
      break;
    case 'skipped':
      process.stdout.write(`${sprintId}: skipped — ${reason}\n`);
      skipped++;
      break;
    case 'error':
      process.stderr.write(`${sprintId}: ERROR — ${reason}\n`);
      errors++;
      break;
  }
}

// Aggregate summary
process.stdout.write(
  `\nBackfill complete: ${ingested} ingested, ${unchanged} unchanged, ${skipped} skipped, ${errors} errors\n`,
);

if (errors > 0) {
  process.exit(1);
}
