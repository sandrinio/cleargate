#!/usr/bin/env node
/**
 * update_state.mjs — Atomic state/counter update for a story in state.json
 *
 * Usage:
 *   node update_state.mjs <STORY-ID> <new-state>          — transition to a new state
 *   node update_state.mjs <STORY-ID> --qa-bounce          — increment qa_bounces counter
 *   node update_state.mjs <STORY-ID> --arch-bounce        — increment arch_bounces counter
 *   node update_state.mjs <STORY-ID> --lane <standard|fast> — set lane for a story
 *   node update_state.mjs <STORY-ID> --lane-demote <reason> — demote story from fast lane
 *
 * Atomic write: write to .tmp.<pid> file, then rename to final path.
 * Idempotent: if new state equals current (for state transitions) and
 *   no counter change, exit 0 without rewriting the file.
 *
 * Auto-escalation: when qa_bounces or arch_bounces reaches BOUNCE_CAP (3),
 *   state is automatically set to "Escalated".
 *
 * Migration: reads v1 state.json transparently; upgrades to v2 on first touch
 *   (injects lane fields with defaults; emits one stderr log line).
 *
 * Concurrency (BUG-044): the whole read-modify-write below -- including the two migration
 * writes that run ahead of the action dispatch -- is serialized behind an exclusive lockfile
 * at `<state.json>.lock`. See acquireLock() for the retry/steal policy.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SCHEMA_VERSION, VALID_STATES, TERMINAL_STATES, BOUNCE_CAP } from './constants.mjs';
import { validateState, validateShapeIgnoringVersion } from './validate_state.mjs';
import { migrateStateToV3 } from './_migrate-schema-v3.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..', '..');

// BUG-044 lock tuning.
//
// LOCK_RETRY_BUDGET_MS is a PER-HOLDER budget, not a flat total: the deadline resets whenever
// the observed holder (the lock payload's pid+at pair) changes. A lock whose holder keeps
// changing is making progress and is never refused on that basis alone; a lock whose holder
// never changes is refused once ITS OWN 2s budget elapses. This is deliberately not a single
// flat ceiling across all contenders -- a flat budget large enough for many serialized holders
// to each get a turn would also be large enough to let a genuinely stuck live lock hang every
// caller for that same long ceiling.
const LOCK_RETRY_BUDGET_MS = 2000;
// Backstop steal for a live-LOOKING lock whose pid has been recycled by the OS -- the primary
// steal signal is process.kill(pid, 0) liveness, below; this is only a fallback for the rare
// case where a dead writer's pid has since been reassigned to a new, unrelated live process.
const LOCK_STALE_AGE_MS = 5 * 60 * 1000;
// Poll interval while waiting on a live, unexpired lock.
const LOCK_POLL_INTERVAL_MS = 25;

function sleepSync(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

// Liveness check for a lock's recorded pid. `process.kill(pid, 0)` sends no signal; it only
// probes existence/permission. ESRCH means the process is gone (stealable). EPERM means the
// process exists but is owned by another user -- that is ALIVE, not dead; treat it as such,
// and treat any other unexpected errno the same conservative way (do not steal).
function isPidAlive(pid) {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (err) {
    if (err && err.code === 'ESRCH') return false;
    return true;
  }
}

// Acquire an exclusive lock at `lockPath`, blocking (via short synchronous sleeps -- main() is
// synchronous top-to-bottom, so no async timer can run here) until it succeeds or the current
// holder's own retry budget elapses. Registers the release as a `process.on('exit')` handler
// immediately on success -- NOT a `finally` -- because `process.exit()` skips `finally` blocks
// entirely, and the idempotent no-op path (the single commonest path in normal operation) exits
// via `process.exit(0)`. This also means release naturally happens strictly after the action
// dispatch's `atomicWrite()`/`renameSync()` has returned, since main() cannot begin exiting
// until its synchronous body -- including that rename -- has finished running.
function acquireLock(lockPath) {
  const payload = JSON.stringify({ pid: process.pid, at: new Date().toISOString() });
  let holderKey = null;
  let deadlineAt = null;

  for (;;) {
    let fd;
    try {
      fd = fs.openSync(lockPath, 'wx'); // O_CREAT|O_EXCL|O_WRONLY -- atomic create-or-EEXIST
    } catch (err) {
      if (err.code !== 'EEXIST') throw err;

      // Contended. Stat/read the lock ONLY on this branch -- the uncontended path above never
      // touches the filesystem beyond its own single openSync.
      let lockInfo = null;
      try {
        lockInfo = JSON.parse(fs.readFileSync(lockPath, 'utf8'));
      } catch {
        // Lock vanished between our EEXIST and this read (its holder just released it), or its
        // holder is mid-write of the small payload. Either way this is a fleeting window; retry
        // without touching the per-holder deadline.
        sleepSync(LOCK_POLL_INTERVAL_MS);
        continue;
      }

      const pid = lockInfo && lockInfo.pid;
      const alive = isPidAlive(pid);
      const ageMs = lockInfo && lockInfo.at ? Date.now() - Date.parse(lockInfo.at) : Infinity;
      const stale = !alive || ageMs > LOCK_STALE_AGE_MS;

      if (stale) {
        try {
          fs.unlinkSync(lockPath);
        } catch {
          // Another process may have already stolen/released it first -- fine, loop and retry.
        }
        continue;
      }

      // Live holder: per-holder retry budget (see LOCK_RETRY_BUDGET_MS above).
      const holderKeyNow = `${pid}:${lockInfo.at}`;
      if (holderKeyNow !== holderKey) {
        holderKey = holderKeyNow;
        deadlineAt = Date.now() + LOCK_RETRY_BUDGET_MS;
      }
      if (Date.now() >= deadlineAt) {
        throw new Error(`could not acquire lock for ${lockPath} -- held by pid ${pid}`);
      }

      sleepSync(LOCK_POLL_INTERVAL_MS);
      continue;
    }

    // Acquired. One openSync total on this path; write the payload, register the release, done.
    fs.writeSync(fd, payload);
    fs.closeSync(fd);
    process.on('exit', () => {
      try {
        fs.unlinkSync(lockPath);
      } catch {
        // Already released, or stolen by another process after a crash -- nothing to do.
      }
    });
    return;
  }
}

function usage() {
  process.stderr.write(
    'Usage:\n' +
    '  node update_state.mjs <STORY-ID> <new-state>\n' +
    '  node update_state.mjs <STORY-ID> --qa-bounce\n' +
    '  node update_state.mjs <STORY-ID> --arch-bounce\n' +
    '  node update_state.mjs <STORY-ID> --lane <standard|fast>\n' +
    '  node update_state.mjs <STORY-ID> --lane-demote <reason>\n'
  );
  process.exit(2);
}

/**
 * Migrate a v1 state.json to v2 by injecting lane fields with defaults.
 * Mutates the state object in-place and returns it.
 * Emits a single stderr log line describing the migration.
 * @param {object} state - Parsed v1 state object
 * @returns {object} - The mutated (now v2) state object
 */
export function migrateV1ToV2(state) {
  state.schema_version = 2;
  const storyIds = Object.keys(state.stories || {});
  for (const id of storyIds) {
    const story = state.stories[id];
    if (story.lane == null) story.lane = 'standard';
    if (story.lane_assigned_by == null) story.lane_assigned_by = 'migration-default';
    if (story.lane_demoted_at === undefined) story.lane_demoted_at = null;
    if (story.lane_demotion_reason === undefined) story.lane_demotion_reason = null;
  }
  process.stderr.write(
    `migration: schema_version 1 → 2 for sprint ${state.sprint_id} (${storyIds.length} stories defaulted to lane: standard)\n`
  );
  return state;
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

  // BUG-044: acquire before the first read below, and hold across the whole read-modify-write
  // (including both migration writes ahead of the action dispatch) -- see acquireLock().
  const lockPath = `${stateFile}.lock`;
  try {
    acquireLock(lockPath);
  } catch (err) {
    process.stderr.write(`Error: ${err.message}\n`);
    process.exit(1);
  }

  let state;
  try {
    state = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
  } catch (err) {
    process.stderr.write(`Error: failed to parse state.json: ${err.message}\n`);
    process.exit(1);
  }

  // Pre-migration: validate shape (ignoring version) before potentially migrating
  const preCheck = validateShapeIgnoringVersion(state);
  if (!preCheck.valid) {
    process.stderr.write(`Error: state.json is invalid:\n`);
    for (const e of preCheck.errors) process.stderr.write(`  - ${e}\n`);
    process.exit(1);
  }

  // Migrate v1 → v2 if needed; write atomically so subsequent reads see v2
  if (state.schema_version === 1) {
    state = migrateV1ToV2(state);
    atomicWrite(stateFile, state);
  }

  // Migrate v2 → v3: strip execution_mode (STORY-070-01)
  const { changed: v3Changed } = migrateStateToV3(state, stateFile);
  if (v3Changed) {
    atomicWrite(stateFile, state);
  }

  // Post-migration strict validation
  const { valid, errors } = validateState(state);
  if (!valid) {
    process.stderr.write(`Error: state.json is invalid after migration:\n`);
    for (const e of errors) process.stderr.write(`  - ${e}\n`);
    process.exit(1);
  }

  if (!state.stories[storyId]) {
    process.stderr.write(`Error: story ${storyId} not found in state.json\n`);
    process.exit(1);
  }

  const story = state.stories[storyId];

  if (action === '--lane') {
    const laneValue = args[2];
    if (!laneValue || !['standard', 'fast'].includes(laneValue)) {
      process.stderr.write(
        `Error: --lane requires a value of "standard" or "fast"\n`
      );
      process.exit(2);
    }
    // TODO(STORY-022-04): cross-read sprint plan to enforce rubric §6 contradiction check
    // (expected_bounce_exposure: med|high + lane: fast is a contradiction per PROPOSAL-013 §2.3 #6)
    story.lane = laneValue;
    story.lane_assigned_by = 'human-override';
    story.updated_at = new Date().toISOString();
    state.last_action = `lane-set ${storyId}: lane=${laneValue} (human-override)`;
    state.updated_at = story.updated_at;
    atomicWrite(stateFile, state);
    process.stdout.write(
      `Updated ${storyId}: lane="${laneValue}", lane_assigned_by="human-override"\n`
    );

  } else if (action === '--lane-demote') {
    const reason = args[2];
    if (!reason) {
      process.stderr.write(
        `Error: --lane-demote requires a reason string\n`
      );
      process.exit(2);
    }
    story.lane = 'standard';
    story.lane_demoted_at = new Date().toISOString();
    story.lane_demotion_reason = reason;
    story.qa_bounces = 0;
    story.arch_bounces = 0;
    story.updated_at = story.lane_demoted_at;
    state.last_action = `lane-demote ${storyId}: "${reason}"`;
    state.updated_at = story.updated_at;
    atomicWrite(stateFile, state);
    process.stdout.write(
      `Updated ${storyId}: lane="standard", lane_demoted_at="${story.lane_demoted_at}", qa_bounces=0, arch_bounces=0\n`
    );

  } else if (action === '--qa-bounce') {
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
