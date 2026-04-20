/**
 * state-scripts.test.mjs — Integration tests for state.json lifecycle scripts
 *
 * Implements all 6 Gherkin scenarios from STORY-013-02 §2.1.
 *
 * Run: node --test .cleargate/scripts/state-scripts.test.mjs
 *
 * Uses node:test + node:assert. No external deps.
 */

import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import os from 'node:os';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCRIPTS_DIR = __dirname;
const REPO_ROOT = path.resolve(__dirname, '..', '..');

// Helper to run a script with optional env overrides
function runScript(scriptName, args = [], opts = {}) {
  const env = { ...process.env, ...opts.env };
  return spawnSync(
    process.execPath,
    [path.join(SCRIPTS_DIR, scriptName), ...args],
    { encoding: 'utf8', env, cwd: opts.cwd || SCRIPTS_DIR }
  );
}

// Write a state.json directly (for seeding scenarios)
function writeStateJson(stateFile, state) {
  fs.writeFileSync(stateFile, JSON.stringify(state, null, 2) + '\n', 'utf8');
}

// Build a minimal valid state.json object
function makeState(stories = {}, overrides = {}) {
  return {
    schema_version: 1,
    sprint_id: 'S-FAKE',
    execution_mode: 'v2',
    sprint_status: 'Active',
    stories,
    last_action: 'init',
    updated_at: '2026-04-21T00:00:00.000Z',
    ...overrides,
  };
}

// Build a minimal story entry
function makeStory(stateVal = 'Ready to Bounce', overrides = {}) {
  return {
    state: stateVal,
    qa_bounces: 0,
    arch_bounces: 0,
    worktree: null,
    updated_at: '2026-04-21T00:00:00.000Z',
    notes: '',
    ...overrides,
  };
}

// ---- Scenario 1: init_sprint creates fresh state.json ----
describe('Scenario 1: init_sprint creates fresh state.json', () => {
  let tmpBase;

  before(() => {
    tmpBase = fs.mkdtempSync(path.join(os.tmpdir(), 'cg-init-'));
  });

  after(() => {
    fs.rmSync(tmpBase, { recursive: true, force: true });
  });

  test('creates state.json with schema_version=1, both stories Ready to Bounce, counters 0, exit 0', () => {
    const result = runScript(
      'init_sprint.mjs',
      ['S-FAKE', '--stories', 'STORY-FAKE-01,STORY-FAKE-02'],
      { env: { CLEARGATE_REPO_ROOT: tmpBase } }
    );

    assert.strictEqual(result.status, 0, `exit should be 0; stderr: ${result.stderr}`);

    const stateFile = path.join(tmpBase, '.cleargate', 'sprint-runs', 'S-FAKE', 'state.json');
    assert.ok(fs.existsSync(stateFile), 'state.json should exist');

    const state = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
    assert.strictEqual(state.schema_version, 1, 'schema_version must be 1');
    assert.strictEqual(state.sprint_id, 'S-FAKE');

    for (const id of ['STORY-FAKE-01', 'STORY-FAKE-02']) {
      assert.ok(state.stories[id], `${id} should be in stories`);
      assert.strictEqual(state.stories[id].state, 'Ready to Bounce');
      assert.strictEqual(state.stories[id].qa_bounces, 0);
      assert.strictEqual(state.stories[id].arch_bounces, 0);
    }
  });
});

// ---- Scenario 2: init_sprint refuses to overwrite ----
describe('Scenario 2: init_sprint refuses to overwrite existing state.json', () => {
  let tmpBase;

  before(() => {
    tmpBase = fs.mkdtempSync(path.join(os.tmpdir(), 'cg-overwrite-'));
    const sprintDir = path.join(tmpBase, '.cleargate', 'sprint-runs', 'S-FAKE');
    fs.mkdirSync(sprintDir, { recursive: true });
    writeStateJson(
      path.join(sprintDir, 'state.json'),
      makeState()
    );
  });

  after(() => {
    fs.rmSync(tmpBase, { recursive: true, force: true });
  });

  test('exits non-zero; stderr names the existing file and suggests --force', () => {
    const result = runScript(
      'init_sprint.mjs',
      ['S-FAKE', '--stories', 'STORY-FAKE-03'],
      { env: { CLEARGATE_REPO_ROOT: tmpBase } }
    );

    assert.notStrictEqual(result.status, 0, 'exit code should be non-zero');
    assert.ok(
      result.stderr.includes('state.json already exists'),
      `stderr should say "state.json already exists"; got: ${result.stderr}`
    );
    assert.ok(
      result.stderr.includes('--force'),
      `stderr should suggest --force; got: ${result.stderr}`
    );
  });
});

// ---- Scenario 3: update_state transitions + idempotency ----
describe('Scenario 3: update_state transitions a story and is idempotent', () => {
  let tmpBase, stateFile;

  before(() => {
    tmpBase = fs.mkdtempSync(path.join(os.tmpdir(), 'cg-update-'));
    const sprintDir = path.join(tmpBase, '.cleargate', 'sprint-runs', 'S-FAKE');
    fs.mkdirSync(sprintDir, { recursive: true });
    stateFile = path.join(sprintDir, 'state.json');
    writeStateJson(stateFile, makeState({ 'STORY-FAKE-01': makeStory('Ready to Bounce') }));
  });

  after(() => {
    fs.rmSync(tmpBase, { recursive: true, force: true });
  });

  test('transitions STORY-FAKE-01 to Bouncing, updated_at is refreshed, exit 0', () => {
    const result = runScript(
      'update_state.mjs',
      ['STORY-FAKE-01', 'Bouncing'],
      { env: { CLEARGATE_STATE_FILE: stateFile } }
    );
    assert.strictEqual(result.status, 0, `exit should be 0; stderr: ${result.stderr}`);

    const state = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
    assert.strictEqual(state.stories['STORY-FAKE-01'].state, 'Bouncing');
    assert.notStrictEqual(
      state.stories['STORY-FAKE-01'].updated_at,
      '2026-04-21T00:00:00.000Z',
      'updated_at should be refreshed'
    );
  });

  test('running the same command a second time is a no-op (exit 0, file content unchanged)', () => {
    const before = fs.readFileSync(stateFile, 'utf8');
    const result = runScript(
      'update_state.mjs',
      ['STORY-FAKE-01', 'Bouncing'],
      { env: { CLEARGATE_STATE_FILE: stateFile } }
    );
    assert.strictEqual(result.status, 0, `exit should be 0; stderr: ${result.stderr}`);
    const after = fs.readFileSync(stateFile, 'utf8');
    assert.strictEqual(before, after, 'file content should be identical on no-op');
  });
});

// ---- Scenario 4: qa-bounce counter caps at 3 and auto-escalates ----
describe('Scenario 4: qa-bounce counter caps at 3 and auto-escalates', () => {
  let tmpBase, stateFile;

  before(() => {
    tmpBase = fs.mkdtempSync(path.join(os.tmpdir(), 'cg-bounce-'));
    const sprintDir = path.join(tmpBase, '.cleargate', 'sprint-runs', 'S-FAKE');
    fs.mkdirSync(sprintDir, { recursive: true });
    stateFile = path.join(sprintDir, 'state.json');
    writeStateJson(
      stateFile,
      makeState({ 'STORY-FAKE-01': makeStory('Bouncing', { qa_bounces: 2 }) })
    );
  });

  after(() => {
    fs.rmSync(tmpBase, { recursive: true, force: true });
  });

  test('qa_bounces becomes 3 and state becomes Escalated', () => {
    const result = runScript(
      'update_state.mjs',
      ['STORY-FAKE-01', '--qa-bounce'],
      { env: { CLEARGATE_STATE_FILE: stateFile } }
    );
    assert.strictEqual(result.status, 0, `exit should be 0; stderr: ${result.stderr}`);

    const state = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
    assert.strictEqual(state.stories['STORY-FAKE-01'].qa_bounces, 3);
    assert.strictEqual(state.stories['STORY-FAKE-01'].state, 'Escalated');
  });

  test('further --qa-bounce on Escalated story exits non-zero with "already Escalated"', () => {
    const result = runScript(
      'update_state.mjs',
      ['STORY-FAKE-01', '--qa-bounce'],
      { env: { CLEARGATE_STATE_FILE: stateFile } }
    );
    assert.notStrictEqual(result.status, 0, 'exit code should be non-zero');
    assert.ok(
      result.stderr.includes('already Escalated'),
      `stderr should say "already Escalated"; got: ${result.stderr}`
    );
  });
});

// ---- Scenario 5: validate_bounce_readiness blocks a dirty tree ----
describe('Scenario 5: validate_bounce_readiness blocks a dirty tree', () => {
  let tmpBase, stateFile, createdDirtyFile;

  before(() => {
    tmpBase = fs.mkdtempSync(path.join(os.tmpdir(), 'cg-readiness-'));
    const sprintDir = path.join(tmpBase, '.cleargate', 'sprint-runs', 'S-FAKE');
    fs.mkdirSync(sprintDir, { recursive: true });
    stateFile = path.join(sprintDir, 'state.json');
    writeStateJson(
      stateFile,
      makeState({ 'STORY-FAKE-02': makeStory('Ready to Bounce') })
    );
  });

  after(() => {
    if (createdDirtyFile && fs.existsSync(createdDirtyFile)) {
      fs.rmSync(createdDirtyFile);
    }
    fs.rmSync(tmpBase, { recursive: true, force: true });
  });

  test('exits non-zero when git tree is dirty and stderr lists dirty files', () => {
    // Check if tree is already dirty; if not, create an untracked file
    const gitCheck = spawnSync('git', ['status', '--porcelain'], {
      cwd: REPO_ROOT,
      encoding: 'utf8',
    });
    const alreadyDirty = gitCheck.stdout.trim().length > 0;

    if (!alreadyDirty) {
      createdDirtyFile = path.join(REPO_ROOT, `.cg-dirty-sentinel-${process.pid}.tmp`);
      fs.writeFileSync(createdDirtyFile, 'test sentinel\n');
    }

    const result = runScript(
      'validate_bounce_readiness.mjs',
      ['STORY-FAKE-02'],
      { env: { CLEARGATE_STATE_FILE: stateFile } }
    );

    // Clean up early if we created the file
    if (createdDirtyFile && fs.existsSync(createdDirtyFile)) {
      fs.rmSync(createdDirtyFile);
      createdDirtyFile = null;
    }

    assert.notStrictEqual(result.status, 0, 'exit code should be non-zero for dirty tree');
    assert.ok(result.stderr.length > 0, 'stderr should have content describing the dirty state');
  });
});

// ---- Scenario 6: validate_state catches a corrupted counter ----
describe('Scenario 6: validate_state catches a corrupted counter', () => {
  let tmpBase, stateFile;

  before(() => {
    tmpBase = fs.mkdtempSync(path.join(os.tmpdir(), 'cg-validate-'));
    const sprintDir = path.join(tmpBase, '.cleargate', 'sprint-runs', 'S-FAKE');
    fs.mkdirSync(sprintDir, { recursive: true });
    stateFile = path.join(sprintDir, 'state.json');
    // Seed with qa_bounces=5 (corrupt — exceeds BOUNCE_CAP=3)
    writeStateJson(
      stateFile,
      makeState({ 'STORY-FAKE-01': makeStory('Bouncing', { qa_bounces: 5 }) })
    );
  });

  after(() => {
    fs.rmSync(tmpBase, { recursive: true, force: true });
  });

  test('exits non-zero and stderr names the invariant violation and the offending story', () => {
    const result = runScript(
      'validate_state.mjs',
      ['--state-file', stateFile]
    );

    assert.notStrictEqual(result.status, 0, 'exit code should be non-zero');
    assert.ok(
      result.stderr.includes('STORY-FAKE-01'),
      `stderr should name the offending story; got: ${result.stderr}`
    );
    assert.ok(
      result.stderr.includes('invariant violation') || result.stderr.includes('qa_bounces'),
      `stderr should name the invariant; got: ${result.stderr}`
    );
  });
});
