#!/usr/bin/env node
/**
 * update_state.mjs — Atomic state/counter update for a story in state.json
 *
 * Usage:
 *   node update_state.mjs <STORY-ID> <new-state>   — transition to a new state
 *   node update_state.mjs <STORY-ID> --qa-bounce   — increment qa_bounces counter
 *   node update_state.mjs <STORY-ID> --arch-bounce — increment arch_bounces counter
 *
 * Atomic write: write to .tmp.<pid> file, then rename to final path.
 * Idempotent: if new state equals current (for state transitions) and
 *   no counter change, exit 0 without rewriting the file.
 *
 * Auto-escalation: when qa_bounces or arch_bounces reaches BOUNCE_CAP (3),
 *   state is automatically set to "Escalated".
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SCHEMA_VERSION, VALID_STATES, TERMINAL_STATES, BOUNCE_CAP } from './constants.mjs';
import { validateState } from './validate_state.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..', '..');

function usage() {
  process.stderr.write(
    'Usage:\n' +
    '  node update_state.mjs <STORY-ID> <new-state>\n' +
    '  node update_state.mjs <STORY-ID> --qa-bounce\n' +
    '  node update_state.mjs <STORY-ID> --arch-bounce\n'
  );
  process.exit(2);
}

function resolveStateFile() {
  const envFile = process.env.CLEARGATE_STATE_FILE;
  if (envFile) return path.resolve(envFile);
  throw new Error(
    'CLEARGATE_STATE_FILE env var not set; cannot resolve state.json'
  );
}

function atomicWrite(stateFile, state) {
  const tmpFile = `${stateFile}.tmp.${process.pid}`;
  fs.writeFileSync(tmpFile, JSON.stringify(state, null, 2) + '\n', 'utf8');
  fs.renameSync(tmpFile, stateFile);
}

function main() {
  const args = process.argv.slice(2);

  if (args.length < 2) usage();

  const storyId = args[0];
  const action = args[1];

  const stateFile = resolveStateFile();

  if (!fs.existsSync(stateFile)) {
    process.stderr.write(`Error: state.json not found at ${stateFile}\n`);
    process.exit(1);
  }

  let state;
  try {
    state = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
  } catch (err) {
    process.stderr.write(`Error: failed to parse state.json: ${err.message}\n`);
    process.exit(1);
  }

  // Validate existing state before modifications
  const { valid, errors } = validateState(state);
  if (!valid) {
    process.stderr.write(`Error: state.json is invalid:\n`);
    for (const e of errors) process.stderr.write(`  - ${e}\n`);
    process.exit(1);
  }

  if (!state.stories[storyId]) {
    process.stderr.write(`Error: story ${storyId} not found in state.json\n`);
    process.exit(1);
  }

  const story = state.stories[storyId];

  if (action === '--qa-bounce') {
    if (story.state === 'Escalated') {
      process.stderr.write(`Error: story ${storyId} is already Escalated\n`);
      process.exit(1);
    }
    story.qa_bounces += 1;
    if (story.qa_bounces >= BOUNCE_CAP) {
      story.state = 'Escalated';
    }
    story.updated_at = new Date().toISOString();
    state.last_action = `qa-bounce ${storyId}: qa_bounces=${story.qa_bounces}`;
    state.updated_at = story.updated_at;
    atomicWrite(stateFile, state);
    process.stdout.write(
      `Updated ${storyId}: qa_bounces=${story.qa_bounces}, state=${story.state}\n`
    );

  } else if (action === '--arch-bounce') {
    if (story.state === 'Escalated') {
      process.stderr.write(`Error: story ${storyId} is already Escalated\n`);
      process.exit(1);
    }
    story.arch_bounces += 1;
    if (story.arch_bounces >= BOUNCE_CAP) {
      story.state = 'Escalated';
    }
    story.updated_at = new Date().toISOString();
    state.last_action = `arch-bounce ${storyId}: arch_bounces=${story.arch_bounces}`;
    state.updated_at = story.updated_at;
    atomicWrite(stateFile, state);
    process.stdout.write(
      `Updated ${storyId}: arch_bounces=${story.arch_bounces}, state=${story.state}\n`
    );

  } else {
    // State transition
    const newState = action;

    if (!VALID_STATES.includes(newState)) {
      process.stderr.write(
        `Error: invalid state "${newState}"; valid states: ${VALID_STATES.join(', ')}\n`
      );
      process.exit(1);
    }

    // Idempotency: if state is already the target, no-op
    if (story.state === newState) {
      process.stdout.write(`No-op: ${storyId} is already in state "${newState}"\n`);
      process.exit(0);
    }

    // Reset worktree to null on Done
    if (newState === 'Done') {
      story.worktree = null;
    }

    story.state = newState;
    story.updated_at = new Date().toISOString();
    state.last_action = `transition ${storyId} → ${newState}`;
    state.updated_at = story.updated_at;
    atomicWrite(stateFile, state);
    process.stdout.write(`Updated ${storyId}: state="${newState}"\n`);
  }
}

main();
