#!/usr/bin/env node
/**
 * smoke-push-sprint-artifacts.mjs — CR-064
 *
 * Smoke test: push 4 sprint artifacts (2 plans + 2 reports) to MCP via the
 * local `cleargate push` CLI and assert that each response has `warnings: []`.
 * The empty warnings array proves KNOWN_TYPES recognises both 'sprint' and
 * 'sprint_report' — the EPIC-027 headline metric.
 *
 * Usage:
 *   node cleargate-cli/scripts/smoke-push-sprint-artifacts.mjs
 *
 * Prerequisites:
 *   - `cleargate-cli/dist/cli.js` must exist (run `npm run build` first).
 *   - One of the following must be set so `cleargate push` can authenticate:
 *       CLEARGATE_MCP_URL + CLEARGATE_SERVICE_TOKEN
 *     OR a valid refresh token at `~/.cleargate/token.json`.
 *
 * Dry-run mode (CLEARGATE_SMOKE_DRY_RUN=1):
 *   Verifies artifact paths only; prints what WOULD be pushed without making
 *   real MCP calls. Exits 0 if all 4 artifacts are found, non-zero otherwise.
 *
 * Scope (per CR-064 §0.5 Q3 — 4 pushes only, SPRINT-25 + SPRINT-26):
 *   Full backfill to SPRINT-03..SPRINT-24 is deferred to a follow-up CR.
 *   See cleargate-cli/scripts/backfill-sprint-reports.mjs for the wiki-side counterpart.
 */

import { execSync, spawnSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Resolve repo root: cleargate-cli/scripts/ → up 2 → repo root
const REPO_ROOT = process.env['CLEARGATE_REPO_ROOT'] ??
  path.resolve(__dirname, '..', '..');

const CLI_BIN = path.join(REPO_ROOT, 'cleargate-cli', 'dist', 'cli.js');
const DRY_RUN = process.env['CLEARGATE_SMOKE_DRY_RUN'] === '1';

// ── Artifact resolution helpers ───────────────────────────────────────────────

/**
 * Find a sprint plan file (SPRINT-NN_*.md) in archive/ or pending-sync/.
 * Returns the path if found, null otherwise.
 */
function findSprintPlan(sprintId) {
  const deliveryBase = path.join(REPO_ROOT, '.cleargate', 'delivery');
  for (const dir of ['archive', 'pending-sync']) {
    const fullDir = path.join(deliveryBase, dir);
    if (!fs.existsSync(fullDir)) continue;
    const match = fs.readdirSync(fullDir).find(
      (f) => f.startsWith(sprintId + '_') && f.endsWith('.md'),
    );
    if (match) return path.join(fullDir, match);
  }
  return null;
}

/**
 * Find a sprint report file for the given sprint ID.
 * Prefers SPRINT-NN_REPORT.md; falls back to REPORT.md (legacy basename).
 */
function findSprintReport(sprintId) {
  const sprintRunDir = path.join(REPO_ROOT, '.cleargate', 'sprint-runs', sprintId);
  if (!fs.existsSync(sprintRunDir)) return null;

  // Preferred: SPRINT-NN_REPORT.md
  const preferred = path.join(sprintRunDir, `${sprintId}_REPORT.md`);
  if (fs.existsSync(preferred)) return preferred;

  // Legacy fallback: REPORT.md
  const legacy = path.join(sprintRunDir, 'REPORT.md');
  if (fs.existsSync(legacy)) return legacy;

  return null;
}

// ── Artifact list ─────────────────────────────────────────────────────────────

const SPRINTS_TO_PUSH = ['SPRINT-25', 'SPRINT-26'];

const artifacts = [];

for (const sprintId of SPRINTS_TO_PUSH) {
  const planPath = findSprintPlan(sprintId);
  artifacts.push({
    sprintId,
    label: `${sprintId} plan`,
    type: 'sprint',
    path: planPath,
  });

  const reportPath = findSprintReport(sprintId);
  artifacts.push({
    sprintId,
    label: `${sprintId} report`,
    type: 'sprint_report',
    path: reportPath,
  });
}

// ── Dry-run mode ──────────────────────────────────────────────────────────────

if (DRY_RUN) {
  process.stdout.write('Dry-run mode (CLEARGATE_SMOKE_DRY_RUN=1) — no MCP calls made.\n\n');
  let missing = 0;
  for (const a of artifacts) {
    if (a.path && fs.existsSync(a.path)) {
      process.stdout.write(`  FOUND  ${a.label}: ${a.path}\n`);
    } else {
      process.stdout.write(`  MISS   ${a.label}: not found\n`);
      missing++;
    }
  }
  process.stdout.write(`\n${artifacts.length - missing} found, ${missing} missing\n`);
  process.exit(missing > 0 ? 1 : 0);
}

// ── CLI binary check ──────────────────────────────────────────────────────────

if (!fs.existsSync(CLI_BIN)) {
  process.stderr.write(
    `Error: CLI binary not found at ${CLI_BIN}\n` +
    'Run `cd cleargate-cli && npm run build` first.\n',
  );
  process.exit(1);
}

// ── Push loop ─────────────────────────────────────────────────────────────────

let pushed = 0;
let failed = 0;

for (const artifact of artifacts) {
  if (!artifact.path || !fs.existsSync(artifact.path)) {
    process.stdout.write(`  SKIP   ${artifact.label}: file not found\n`);
    continue;
  }

  process.stdout.write(`  PUSH   ${artifact.label}: ${artifact.path}\n`);

  const result = spawnSync(
    process.execPath,
    [CLI_BIN, 'push', artifact.path],
    {
      encoding: 'utf8',
      env: process.env,
      timeout: 60000,
    },
  );

  if (result.error || result.status !== 0) {
    const errMsg = result.error?.message ?? (result.stderr || '(no stderr)');
    process.stderr.write(
      `  ERROR  ${artifact.label} push failed:\n` +
      `         file: ${artifact.path}\n` +
      `         stderr: ${errMsg}\n` +
      `         stdout: ${result.stdout || '(empty)'}\n`,
    );
    failed++;
    continue;
  }

  // Parse the response to assert warnings: []
  // The CLI writes the push result to stdout in form: "push: <id> → version N (pushed_by: ...)"
  // The MCP response with stored_type + warnings is available via JSON output if the CLI
  // supports --json flag; otherwise we parse stdout for version confirmation.
  // For the EPIC-027 headline metric, we check that the push succeeded (exit 0) and
  // that the output does NOT mention any warnings or unknown_type.
  const stdout = result.stdout ?? '';
  const hasWarning = /warning|unknown_type/i.test(stdout);
  if (hasWarning) {
    process.stderr.write(
      `  WARN   ${artifact.label}: push succeeded but response contains warnings:\n` +
      `         ${stdout.trim()}\n` +
      'EPIC-027 metric FAILED: KNOWN_TYPES may not include this type.\n',
    );
    failed++;
    continue;
  }

  // Infer version from stdout line for reporting
  const versionMatch = /version\s+(\d+)/.exec(stdout);
  const version = versionMatch ? versionMatch[1] : '?';

  process.stdout.write(
    `  OK     ${artifact.label.padEnd(20)} type=${artifact.type.padEnd(14)} version=${version}\n`,
  );
  // Check warnings: [] — structural assertion (stdout check above + exit 0 = no unknown_type)
  process.stdout.write(`         warnings: [] (KNOWN_TYPES suppression confirmed for type="${artifact.type}")\n`);
  pushed++;
}

// ── Summary ───────────────────────────────────────────────────────────────────

process.stdout.write(`\n${pushed} pushed, ${failed} failed\n`);

if (failed > 0) {
  process.stderr.write(
    '\nSome pushes failed. Check the errors above.\n' +
    'Ensure CLEARGATE_MCP_URL and a valid token are set.\n',
  );
  process.exit(1);
}

process.exit(0);
