#!/usr/bin/env node
/**
 * close_sprint.mjs — Six-step sprint close pipeline
 *
 * Usage: node close_sprint.mjs <sprint-id> [--assume-ack]
 *
 * Steps:
 *   1. Load and validate state.json via validateState
 *   2. Refuse if any story state is not in TERMINAL_STATES (exit non-zero, list offenders)
 *   3. Invoke prefill_report.mjs on all agent reports
 *   4. Orchestrator spawns Reporter separately (script validates preconditions only)
 *   5. On Reporter success + user ack (or --assume-ack flag), flip sprint_status -> "Completed"
 *   6. Invoke suggest_improvements.mjs unconditionally
 *
 * Does NOT archive the sprint file (pending-sync -> archive stays human per EPIC-013 §4.5 step 7).
 *
 * Reuse: TERMINAL_STATES, VALID_STATES from constants.mjs
 *        validateState from validate_state.mjs
 *        atomicWrite pattern from update_state.mjs
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';
import { TERMINAL_STATES } from './constants.mjs';
import { validateState } from './validate_state.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..', '..');
const SCRIPTS_DIR = __dirname;

function usage() {
  process.stderr.write(
    'Usage: node close_sprint.mjs <sprint-id> [--assume-ack]\n' +
    '\n' +
    'Options:\n' +
    '  --assume-ack   Skip user acknowledgement prompt (for automated tests)\n'
  );
  process.exit(2);
}

/**
 * Atomic write using tmp+rename pattern (per M1 update_state.mjs convention).
 * @param {string} filePath
 * @param {object} data
 */
function atomicWrite(filePath, data) {
  const tmpFile = `${filePath}.tmp.${process.pid}`;
  fs.writeFileSync(tmpFile, JSON.stringify(data, null, 2) + '\n', 'utf8');
  fs.renameSync(tmpFile, filePath);
}

/**
 * Invoke a script via node (for .mjs scripts in the same directory).
 * Throws on non-zero exit.
 * @param {string} scriptName
 * @param {string[]} scriptArgs
 * @param {object} env
 */
function invokeScript(scriptName, scriptArgs, env) {
  const scriptPath = path.join(SCRIPTS_DIR, scriptName);
  if (!fs.existsSync(scriptPath)) {
    throw new Error(`Script not found: ${scriptPath}`);
  }
  const argStr = scriptArgs.map(a => JSON.stringify(a)).join(' ');
  const cmd = `node ${JSON.stringify(scriptPath)} ${argStr}`;
  execSync(cmd, {
    stdio: 'inherit',
    env: Object.assign({}, process.env, env || {}),
  });
}

function main() {
  const args = process.argv.slice(2);

  if (args.length < 1) usage();

  const sprintId = args[0];
  const assumeAck = args.includes('--assume-ack');

  const sprintDir = process.env.CLEARGATE_SPRINT_DIR
    ? path.resolve(process.env.CLEARGATE_SPRINT_DIR)
    : path.join(REPO_ROOT, '.cleargate', 'sprint-runs', sprintId);

  if (!fs.existsSync(sprintDir)) {
    process.stderr.write(`Error: sprint directory not found: ${sprintDir}\n`);
    process.exit(1);
  }

  const stateFile = process.env.CLEARGATE_STATE_FILE
    ? path.resolve(process.env.CLEARGATE_STATE_FILE)
    : path.join(sprintDir, 'state.json');

  // ── Step 1: Load and validate state.json ──────────────────────────────────
  if (!fs.existsSync(stateFile)) {
    process.stderr.write(
      `Error: state.json not found at ${stateFile}\n` +
      `Hint: run init_sprint.mjs ${sprintId} --stories <ids> first\n`
    );
    process.exit(1);
  }

  let state;
  try {
    state = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
  } catch (err) {
    process.stderr.write(`Error: failed to parse state.json: ${err.message}\n`);
    process.exit(1);
  }

  const { valid, errors } = validateState(state);
  if (!valid) {
    process.stderr.write('Error: state.json validation failed:\n');
    for (const e of errors) process.stderr.write(`  - ${e}\n`);
    process.exit(1);
  }

  // ── Step 2: Refuse if any story not in TERMINAL_STATES ────────────────────
  const nonTerminal = [];
  for (const [storyId, story] of Object.entries(state.stories || {})) {
    if (!TERMINAL_STATES.includes(story.state)) {
      nonTerminal.push(`${storyId}: ${story.state} — not terminal`);
    }
  }

  if (nonTerminal.length > 0) {
    process.stderr.write('Error: sprint cannot close — non-terminal stories:\n');
    for (const msg of nonTerminal) {
      process.stderr.write(`  ${msg}\n`);
    }
    process.exit(1);
  }

  process.stdout.write(`Step 1-2 passed: all ${Object.keys(state.stories || {}).length} stories are terminal.\n`);

  // ── Step 3: Invoke prefill_report.mjs ─────────────────────────────────────
  process.stdout.write('Step 3: running prefill_report.mjs...\n');
  try {
    invokeScript('prefill_report.mjs', [sprintId], {
      CLEARGATE_STATE_FILE: stateFile,
      CLEARGATE_SPRINT_DIR: sprintDir,
    });
  } catch (err) {
    process.stderr.write(`Error: prefill_report.mjs failed: ${err.message}\n`);
    process.exit(1);
  }

  // ── Step 4: Orchestrator spawns Reporter separately ───────────────────────
  // This script only validates preconditions; it does NOT fork the Reporter agent.
  process.stdout.write(
    'Step 4: preconditions satisfied — orchestrator should now spawn the Reporter agent.\n' +
    '        The Reporter writes REPORT.md using the sprint_report.md template.\n' +
    `        Expected output: ${path.join(sprintDir, 'REPORT.md')}\n`
  );

  // Check if REPORT.md already exists (e.g., --assume-ack path in tests)
  const reportFile = path.join(sprintDir, 'REPORT.md');
  if (!assumeAck) {
    if (!fs.existsSync(reportFile)) {
      process.stdout.write(
        '\nWaiting for Reporter to produce REPORT.md...\n' +
        'After Reporter succeeds, re-run with --assume-ack to complete the close.\n'
      );
      process.exit(0);
    }
    // In non-assume-ack mode with existing REPORT.md, prompt user
    process.stdout.write(
      `\nREPORT.md found at ${reportFile}\n` +
      'Review the report, then confirm close by re-running with --assume-ack\n'
    );
    process.exit(0);
  }

  // ── Step 5: Flip sprint_status to "Completed" ────────────────────────────
  process.stdout.write('Step 5: flipping sprint_status to "Completed"...\n');
  const now = new Date().toISOString();
  state.sprint_status = 'Completed';
  state.last_action = `close_sprint: sprint ${sprintId} completed`;
  state.updated_at = now;
  atomicWrite(stateFile, state);
  process.stdout.write(`sprint_status flipped to "Completed" at ${now}\n`);

  // ── Step 6: Invoke suggest_improvements.mjs unconditionally ───────────────
  process.stdout.write('Step 6: running suggest_improvements.mjs...\n');
  try {
    invokeScript('suggest_improvements.mjs', [sprintId], {
      CLEARGATE_STATE_FILE: stateFile,
      CLEARGATE_SPRINT_DIR: sprintDir,
    });
  } catch (err) {
    // suggest_improvements failure is non-fatal — log but do not abort
    process.stderr.write(`Warning: suggest_improvements.mjs failed: ${err.message}\n`);
    process.stderr.write('Sprint is still marked Completed; improvement suggestions may be incomplete.\n');
  }

  process.stdout.write(`\nSprint ${sprintId} close pipeline complete.\n`);
  process.stdout.write(`  state.json: sprint_status = Completed\n`);
  process.stdout.write(`  improvement-suggestions.md: ${path.join(sprintDir, 'improvement-suggestions.md')}\n`);
}

main();
