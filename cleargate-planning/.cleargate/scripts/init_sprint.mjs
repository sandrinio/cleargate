#!/usr/bin/env node
/**
 * init_sprint.mjs — Initialize a sprint state.json
 *
 * Usage: node init_sprint.mjs <sprint-id> --stories ID1,ID2,... [--force]
 *
 * Creates .cleargate/sprint-runs/<sprint-id>/state.json with initial state
 * "Ready to Bounce" for each story. Refuses if state.json already exists
 * unless --force is passed.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SCHEMA_VERSION, VALID_STATES, TERMINAL_STATES } from './constants.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// Resolve repo root: .cleargate/scripts/ -> ../../ (two levels up)
// CLEARGATE_REPO_ROOT env var overrides for testing
const REPO_ROOT = process.env.CLEARGATE_REPO_ROOT
  ? path.resolve(process.env.CLEARGATE_REPO_ROOT)
  : path.resolve(__dirname, '..', '..');

function usage() {
  process.stderr.write(
    'Usage: node init_sprint.mjs <sprint-id> --stories ID1,ID2,... [--force]\n'
  );
  process.exit(2);
}

function main() {
  const args = process.argv.slice(2);

  const sprintId = args[0];
  if (!sprintId || sprintId.startsWith('--')) usage();

  const storiesIdx = args.indexOf('--stories');
  if (storiesIdx === -1 || !args[storiesIdx + 1]) usage();

  const storyIds = args[storiesIdx + 1].split(',').map((s) => s.trim()).filter(Boolean);
  if (storyIds.length === 0) {
    process.stderr.write('Error: --stories requires at least one story ID\n');
    process.exit(2);
  }

  const force = args.includes('--force');

  const sprintDir = path.join(REPO_ROOT, '.cleargate', 'sprint-runs', sprintId);
  const stateFile = path.join(sprintDir, 'state.json');

  if (fs.existsSync(stateFile) && !force) {
    process.stderr.write(
      `state.json already exists at ${stateFile}; pass --force to overwrite\n`
    );
    process.exit(1);
  }

  const now = new Date().toISOString();
  const stories = {};
  for (const id of storyIds) {
    stories[id] = {
      state: 'Ready to Bounce',
      qa_bounces: 0,
      arch_bounces: 0,
      worktree: null,
      updated_at: now,
      notes: '',
    };
  }

  const state = {
    schema_version: SCHEMA_VERSION,
    sprint_id: sprintId,
    execution_mode: 'v1',
    sprint_status: 'Active',
    stories,
    last_action: `Sprint ${sprintId} initialised`,
    updated_at: now,
  };

  fs.mkdirSync(sprintDir, { recursive: true });

  const tmpFile = `${stateFile}.tmp.${process.pid}`;
  fs.writeFileSync(tmpFile, JSON.stringify(state, null, 2) + '\n', 'utf8');
  fs.renameSync(tmpFile, stateFile);

  process.stdout.write(`Initialized state.json for sprint ${sprintId} with ${storyIds.length} stories\n`);
}

main();
