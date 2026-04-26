/**
 * test_update_state.test.ts — STORY-022-02 acceptance tests for update_state.mjs
 *
 * Gherkin scenarios (§2.1):
 *   Scenario 2: v1 state.json migrates additively on first read under new code
 *   Scenario 3: --lane sets the field on a single story
 *   Scenario 4: --lane-demote flips lane to standard with reason
 *   Scenario 5: Idempotency — re-reading a v2 state.json does not double-migrate
 *
 * Uses spawnSync to invoke update_state.mjs directly, real tmpdir filesystem.
 * CLEARGATE_STATE_FILE env var controls the state file path per update_state.mjs contract.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Resolve repo root: cleargate-cli/test/scripts/ → up 3 → repo root
// Path: test/scripts → test → cleargate-cli → repo-root
const REPO_ROOT = path.resolve(__dirname, '..', '..', '..');
const UPDATE_STATE_SCRIPT = path.join(REPO_ROOT, '.cleargate', 'scripts', 'update_state.mjs');
const FIXTURE_V1 = path.join(__dirname, 'fixtures', 'state-v1.json');

/** Run update_state.mjs with given args and CLEARGATE_STATE_FILE pointing at stateFile. */
function runUpdateState(stateFile: string, args: string[]): {
  status: number | null;
  stdout: string;
  stderr: string;
} {
  // Use '/usr/bin/env node' to avoid vitest's loader-wrapped process.execPath, which
  // causes CJS/ESM resolution failures when spawning .mjs files from a vitest context.
  const result = spawnSync(
    '/usr/bin/env',
    ['node', UPDATE_STATE_SCRIPT, ...args],
    {
      encoding: 'utf8',
      timeout: 10_000,
      env: { ...process.env, CLEARGATE_STATE_FILE: stateFile },
    },
  );
  return {
    status: result.status,
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
  };
}

// ─── Scenario 2: v1 state.json migrates additively on first read ─────────────

describe('Scenario 2: v1 state.json migrates additively on first read under new code', () => {
  let tmpDir: string;
  let stateFile: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cg-migrate-test-'));
    stateFile = path.join(tmpDir, 'state.json');
    // Copy the canonical v1 fixture (3 stories, no lane fields)
    fs.copyFileSync(FIXTURE_V1, stateFile);
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('exits 0 after migrating v1 state.json', () => {
    // Invoke with an idempotent state transition to trigger migration without side effects
    const result = runUpdateState(stateFile, ['STORY-TEST-01', 'Ready to Bounce']);
    // idempotent no-op is exit 0
    expect(result.status).toBe(0);
  });

  it('on-disk state.json is updated to schema_version: 2', () => {
    runUpdateState(stateFile, ['STORY-TEST-01', 'Ready to Bounce']);
    const state = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
    expect(state.schema_version).toBe(2);
  });

  it('every story has lane: "standard" and lane_assigned_by: "migration-default"', () => {
    runUpdateState(stateFile, ['STORY-TEST-01', 'Ready to Bounce']);
    const state = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
    for (const [storyId, story] of Object.entries(state.stories as Record<string, Record<string, unknown>>)) {
      expect(story.lane, `${storyId} lane`).toBe('standard');
      expect(story.lane_assigned_by, `${storyId} lane_assigned_by`).toBe('migration-default');
      expect(story.lane_demoted_at, `${storyId} lane_demoted_at`).toBeNull();
      expect(story.lane_demotion_reason, `${storyId} lane_demotion_reason`).toBeNull();
    }
  });

  it('no other pre-existing field on any story is mutated', () => {
    const before = JSON.parse(fs.readFileSync(FIXTURE_V1, 'utf8'));
    runUpdateState(stateFile, ['STORY-TEST-01', 'Ready to Bounce']);
    const after = JSON.parse(fs.readFileSync(stateFile, 'utf8'));

    // For each story in the v1 fixture, the pre-existing fields must be unchanged.
    // The idempotent no-op does NOT update updated_at (no state change), so all fields preserved.
    for (const storyId of Object.keys(before.stories)) {
      const bStory = before.stories[storyId] as Record<string, unknown>;
      const aStory = after.stories[storyId] as Record<string, unknown>;
      for (const field of ['state', 'qa_bounces', 'arch_bounces', 'worktree', 'updated_at', 'notes']) {
        expect(aStory[field], `${storyId}.${field}`).toStrictEqual(bStory[field]);
      }
    }
  });

  it('emits a stderr log line for the migration with sprint ID and story count', () => {
    const result = runUpdateState(stateFile, ['STORY-TEST-01', 'Ready to Bounce']);
    expect(result.stderr).toContain('migration: schema_version 1 → 2 for sprint SPRINT-TEST (3 stories defaulted to lane: standard)');
  });
});

// ─── Scenario 3: --lane sets the field on a single story ─────────────────────

describe('Scenario 3: --lane sets the field on a single story', () => {
  let tmpDir: string;
  let stateFile: string;

  // Build a v2 state.json with two stories, both at lane: "standard"
  function makeV2State() {
    return {
      schema_version: 2,
      sprint_id: 'SPRINT-TEST',
      execution_mode: 'v2',
      sprint_status: 'Active',
      stories: {
        'STORY-TEST-01': {
          state: 'Ready to Bounce',
          qa_bounces: 0,
          arch_bounces: 0,
          worktree: null,
          updated_at: '2026-01-01T00:00:00.000Z',
          notes: '',
          lane: 'standard',
          lane_assigned_by: 'migration-default',
          lane_demoted_at: null,
          lane_demotion_reason: null,
        },
        'STORY-TEST-02': {
          state: 'Bouncing',
          qa_bounces: 0,
          arch_bounces: 0,
          worktree: null,
          updated_at: '2026-01-01T00:00:00.000Z',
          notes: '',
          lane: 'standard',
          lane_assigned_by: 'migration-default',
          lane_demoted_at: null,
          lane_demotion_reason: null,
        },
      },
      last_action: 'init',
      updated_at: '2026-01-01T00:00:00.000Z',
    };
  }

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cg-lane-test-'));
    stateFile = path.join(tmpDir, 'state.json');
    fs.writeFileSync(stateFile, JSON.stringify(makeV2State(), null, 2) + '\n', 'utf8');
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('exits 0 when --lane fast is applied to an existing story', () => {
    const result = runUpdateState(stateFile, ['STORY-TEST-01', '--lane', 'fast']);
    expect(result.status).toBe(0);
  });

  it('STORY-TEST-01 lane becomes "fast"', () => {
    runUpdateState(stateFile, ['STORY-TEST-01', '--lane', 'fast']);
    const state = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
    expect(state.stories['STORY-TEST-01'].lane).toBe('fast');
  });

  it('STORY-TEST-01 lane_assigned_by becomes "human-override"', () => {
    runUpdateState(stateFile, ['STORY-TEST-01', '--lane', 'fast']);
    const state = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
    expect(state.stories['STORY-TEST-01'].lane_assigned_by).toBe('human-override');
  });

  it('STORY-TEST-02 is not mutated', () => {
    const before = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
    runUpdateState(stateFile, ['STORY-TEST-01', '--lane', 'fast']);
    const after = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
    // lane, lane_assigned_by, state, counters all unchanged for the OTHER story
    expect(after.stories['STORY-TEST-02'].lane).toBe(before.stories['STORY-TEST-02'].lane);
    expect(after.stories['STORY-TEST-02'].state).toBe(before.stories['STORY-TEST-02'].state);
    expect(after.stories['STORY-TEST-02'].qa_bounces).toBe(before.stories['STORY-TEST-02'].qa_bounces);
  });

  it('rejects an invalid lane value with exit 2', () => {
    const result = runUpdateState(stateFile, ['STORY-TEST-01', '--lane', 'turbo']);
    expect(result.status).toBe(2);
  });
});

// ─── Scenario 4: --lane-demote flips lane to standard with reason ─────────────

describe('Scenario 4: --lane-demote flips lane to standard with reason', () => {
  let tmpDir: string;
  let stateFile: string;

  function makeV2FastState() {
    return {
      schema_version: 2,
      sprint_id: 'SPRINT-TEST',
      execution_mode: 'v2',
      sprint_status: 'Active',
      stories: {
        'STORY-TEST-01': {
          state: 'Bouncing',
          qa_bounces: 1,
          arch_bounces: 0,
          worktree: null,
          updated_at: '2026-01-01T00:00:00.000Z',
          notes: '',
          lane: 'fast',
          lane_assigned_by: 'human-override',
          lane_demoted_at: null,
          lane_demotion_reason: null,
        },
      },
      last_action: 'lane-set',
      updated_at: '2026-01-01T00:00:00.000Z',
    };
  }

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cg-demote-test-'));
    stateFile = path.join(tmpDir, 'state.json');
    fs.writeFileSync(stateFile, JSON.stringify(makeV2FastState(), null, 2) + '\n', 'utf8');
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('exits 0', () => {
    const result = runUpdateState(stateFile, ['STORY-TEST-01', '--lane-demote', 'pre-gate scanner failed']);
    expect(result.status).toBe(0);
  });

  it('lane becomes "standard"', () => {
    runUpdateState(stateFile, ['STORY-TEST-01', '--lane-demote', 'pre-gate scanner failed']);
    const state = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
    expect(state.stories['STORY-TEST-01'].lane).toBe('standard');
  });

  it('lane_demoted_at is populated with an ISO timestamp', () => {
    runUpdateState(stateFile, ['STORY-TEST-01', '--lane-demote', 'pre-gate scanner failed']);
    const state = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
    const demotedAt = state.stories['STORY-TEST-01'].lane_demoted_at as string;
    expect(demotedAt).toBeTruthy();
    // Must be parseable as ISO date
    expect(() => new Date(demotedAt).toISOString()).not.toThrow();
  });

  it('lane_demotion_reason is "pre-gate scanner failed"', () => {
    runUpdateState(stateFile, ['STORY-TEST-01', '--lane-demote', 'pre-gate scanner failed']);
    const state = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
    expect(state.stories['STORY-TEST-01'].lane_demotion_reason).toBe('pre-gate scanner failed');
  });

  it('qa_bounces and arch_bounces are reset to 0', () => {
    runUpdateState(stateFile, ['STORY-TEST-01', '--lane-demote', 'pre-gate scanner failed']);
    const state = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
    expect(state.stories['STORY-TEST-01'].qa_bounces).toBe(0);
    expect(state.stories['STORY-TEST-01'].arch_bounces).toBe(0);
  });

  it('rejects --lane-demote with no reason argument (exit 2)', () => {
    const result = runUpdateState(stateFile, ['STORY-TEST-01', '--lane-demote']);
    expect(result.status).toBe(2);
  });
});

// ─── Scenario 5: Idempotency — re-reading a v2 state.json does not double-migrate ─

describe('Scenario 5: Idempotency — re-reading a v2 state.json does not double-migrate', () => {
  let tmpDir: string;
  let stateFile: string;

  function makeV2State() {
    return {
      schema_version: 2,
      sprint_id: 'SPRINT-TEST',
      execution_mode: 'v2',
      sprint_status: 'Active',
      stories: {
        'STORY-TEST-01': {
          state: 'Ready to Bounce',
          qa_bounces: 0,
          arch_bounces: 0,
          worktree: null,
          updated_at: '2026-01-01T00:00:00.000Z',
          notes: '',
          lane: 'standard',
          lane_assigned_by: 'migration-default',
          lane_demoted_at: null,
          lane_demotion_reason: null,
        },
      },
      last_action: 'init',
      updated_at: '2026-01-01T00:00:00.000Z',
    };
  }

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cg-idempotent-test-'));
    stateFile = path.join(tmpDir, 'state.json');
    fs.writeFileSync(stateFile, JSON.stringify(makeV2State(), null, 2) + '\n', 'utf8');
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('no migration log line is emitted for a v2 state.json', () => {
    const result = runUpdateState(stateFile, ['STORY-TEST-01', 'Ready to Bounce']);
    expect(result.stderr).not.toContain('migration:');
  });

  it('on-disk state.json is byte-equal after a no-op invocation', () => {
    const before = fs.readFileSync(stateFile, 'utf8');
    runUpdateState(stateFile, ['STORY-TEST-01', 'Ready to Bounce']);
    const after = fs.readFileSync(stateFile, 'utf8');
    // The no-op (already in that state) should not rewrite the file
    expect(after).toBe(before);
  });

  it('running update twice on a v2 file produces no additional migration log', () => {
    // First run (no-op state transition)
    const result1 = runUpdateState(stateFile, ['STORY-TEST-01', 'Ready to Bounce']);
    expect(result1.stderr).not.toContain('migration:');
    // Second run
    const result2 = runUpdateState(stateFile, ['STORY-TEST-01', 'Ready to Bounce']);
    expect(result2.stderr).not.toContain('migration:');
  });
});
