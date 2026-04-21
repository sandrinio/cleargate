#!/usr/bin/env node
/**
 * test_ratchet.mjs — STORY-014-04: Pre-existing Test-Failure Ratchet
 *
 * Subcommands:
 *   check            (default) re-run suite; exit non-zero if passed < baseline
 *   update-baseline  run suite; overwrite test-baseline.json atomically
 *   list-regressions diff current failing-tests set vs baseline failing set; print new failures
 *
 * Scope: cleargate-cli test suite only (EPIC-014 §Q4 lock).
 *
 * Env overrides:
 *   CLEARGATE_REPO_ROOT — override repo root (test isolation)
 *   SKIP_TEST_RATCHET=1 — bypass (documented; discouraged)
 */

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const REPO_ROOT = process.env.CLEARGATE_REPO_ROOT
  ?? path.resolve(new URL('.', import.meta.url).pathname, '../..');

const BASELINE_PATH = path.join(REPO_ROOT, 'test-baseline.json');

// ---------------------------------------------------------------------------
// Run suite and parse vitest JSON output
// ---------------------------------------------------------------------------

/**
 * Spawn vitest in cleargate-cli/ and parse JSON output.
 * Returns { total, passed, failed, skipped, failing_tests }
 *
 * Test isolation: if CLEARGATE_TEST_VITEST_JSON env is set, reads that file
 * as a prebuilt vitest JSON result instead of spawning the real suite.
 * This allows unit-testing the ratchet logic without running the full suite.
 */
function runSuite() {
  // Test seam: inject prebuilt vitest JSON via env (test isolation only)
  if (process.env.CLEARGATE_TEST_VITEST_JSON) {
    let json;
    try {
      json = JSON.parse(fs.readFileSync(process.env.CLEARGATE_TEST_VITEST_JSON, 'utf8'));
    } catch (e) {
      process.stderr.write(`test_ratchet: failed to read CLEARGATE_TEST_VITEST_JSON: ${e.message}\n`);
      process.exit(2);
    }
    return parseVitestJson(json);
  }

  const cliDir = path.join(REPO_ROOT, 'cleargate-cli');

  // vitest 2.x: --reporter=json writes JSON to stdout
  const result = spawnSync(
    'npx',
    ['vitest', 'run', '--reporter=json'],
    {
      cwd: cliDir,
      // Large buffer — full JSON output can be several MB
      maxBuffer: 20 * 1024 * 1024,
      timeout: 120_000,
      encoding: 'utf8',
      env: { ...process.env },
    },
  );

  if (result.error) {
    process.stderr.write(`test_ratchet: vitest spawn error: ${result.error.message}\n`);
    process.exit(2);
  }

  // vitest exits non-zero when tests fail — that is expected for the ratchet.
  // Parse JSON regardless of exit code.
  let json;
  try {
    // vitest 2.x JSON goes to stdout
    json = JSON.parse(result.stdout);
  } catch {
    process.stderr.write(`test_ratchet: failed to parse vitest JSON output.\n`);
    process.stderr.write(`vitest stdout (first 500 chars): ${String(result.stdout).slice(0, 500)}\n`);
    process.stderr.write(`vitest stderr (first 500 chars): ${String(result.stderr).slice(0, 500)}\n`);
    process.exit(2);
  }

  return parseVitestJson(json);
}

/**
 * Parse a vitest 2.x JSON result object into our internal shape.
 */
function parseVitestJson(json) {
  const total = json.numTotalTests ?? 0;
  const passed = json.numPassedTests ?? 0;
  const failed = json.numFailedTests ?? 0;
  const skipped = (json.numPendingTests ?? 0) + (json.numTodoTests ?? 0);

  // Collect failing test names for list-regressions
  const failing_tests = [];
  for (const testFile of (json.testResults ?? [])) {
    for (const assertion of (testFile.assertionResults ?? [])) {
      if (assertion.status === 'failed') {
        failing_tests.push(`${testFile.testFilePath ?? ''}::${assertion.fullName ?? assertion.title ?? ''}`);
      }
    }
  }

  return { total, passed, failed, skipped, failing_tests };
}

// ---------------------------------------------------------------------------
// Baseline read/write
// ---------------------------------------------------------------------------

function readBaseline() {
  if (!fs.existsSync(BASELINE_PATH)) {
    process.stderr.write(`test_ratchet: baseline file not found at ${BASELINE_PATH}\n`);
    process.stderr.write(`Run: node .cleargate/scripts/test_ratchet.mjs update-baseline\n`);
    process.exit(2);
  }
  try {
    return JSON.parse(fs.readFileSync(BASELINE_PATH, 'utf8'));
  } catch (e) {
    process.stderr.write(`test_ratchet: failed to parse baseline file: ${e.message}\n`);
    process.exit(2);
  }
}

/**
 * Atomic write via tmp+rename (pattern from init_sprint.mjs:83-85).
 * Key order is frozen to { total, passed, failed, skipped, updated_at, failing_tests }.
 */
function writeBaseline(data) {
  const payload = {
    total: data.total,
    passed: data.passed,
    failed: data.failed,
    skipped: data.skipped,
    updated_at: new Date().toISOString(),
    failing_tests: data.failing_tests,
  };
  const tmp = `${BASELINE_PATH}.tmp.${process.pid}`;
  fs.writeFileSync(tmp, JSON.stringify(payload, null, 2) + '\n', 'utf8');
  fs.renameSync(tmp, BASELINE_PATH);
  return payload;
}

// ---------------------------------------------------------------------------
// Subcommands
// ---------------------------------------------------------------------------

function cmdUpdateBaseline() {
  process.stdout.write('test_ratchet: running suite to regenerate baseline...\n');
  const current = runSuite();
  const written = writeBaseline(current);
  process.stdout.write(
    `test_ratchet: baseline updated — total=${written.total} passed=${written.passed} failed=${written.failed} skipped=${written.skipped}\n`,
  );
  process.exit(0);
}

function cmdCheck() {
  process.stdout.write('test_ratchet: running suite for ratchet check...\n');
  const current = runSuite();
  const baseline = readBaseline();

  const delta = current.passed - baseline.passed;
  if (delta >= 0) {
    process.stdout.write(
      `test_ratchet: OK — +${delta} tests passing (current=${current.passed}, baseline=${baseline.passed})\n`,
    );
    process.exit(0);
  } else {
    process.stderr.write(
      `test_ratchet: regression: ${delta} tests (current=${current.passed}, baseline=${baseline.passed})\n`,
    );
    process.stderr.write(
      `Fix failing tests or run 'node .cleargate/scripts/test_ratchet.mjs update-baseline' to accept the new state.\n`,
    );
    process.exit(1);
  }
}

function cmdListRegressions() {
  process.stdout.write('test_ratchet: running suite for regression diff...\n');
  const current = runSuite();
  const baseline = readBaseline();

  const baselineSet = new Set(baseline.failing_tests ?? []);
  const newlyFailing = (current.failing_tests ?? []).filter((t) => !baselineSet.has(t));

  if (newlyFailing.length === 0) {
    process.stdout.write('test_ratchet: no new regressions (no tests newly failing).\n');
  } else {
    process.stdout.write(`test_ratchet: ${newlyFailing.length} newly failing test(s):\n`);
    for (const t of newlyFailing) {
      process.stdout.write(`  - ${t}\n`);
    }
  }
  process.exit(0);
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

const [, , subcommand = 'check'] = process.argv;

switch (subcommand) {
  case 'update-baseline':
    cmdUpdateBaseline();
    break;
  case 'check':
    cmdCheck();
    break;
  case 'list-regressions':
    cmdListRegressions();
    break;
  default:
    process.stderr.write(`test_ratchet: unknown subcommand '${subcommand}'. Use: check | update-baseline | list-regressions\n`);
    process.exit(2);
}
