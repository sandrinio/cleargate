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
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawnSync, spawn } from 'node:child_process';
import os from 'node:os';
import { SCHEMA_VERSION } from './constants.mjs';

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
    execution_mode: 'v1',
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

// ---- BUG-044 helpers: a true full-quorum barrier for deterministic lost-update races ----
//
// A lost-update race is timing-dependent; a test that spawns N processes and hopes they happen
// to interleave badly is worthless when the race doesn't fire on a given run (FLASHCARD
// 2026-08-28 #test-harness #danger; this story's own QA-Red dispatch repeats the warning).
//
// First attempt (measured, then discarded): a `--import`-preloaded shim that sleeps a FIXED
// delay on the first read of the target path, so N spawned processes land inside the same
// widened window. This reliably reproduced the bug most of the time but was NOT airtight --
// reruns showed occasional accidental greens (measured: 2 of 6 reruns of S1 passed on the
// unfixed baseline at a 600ms delay). Root cause, traced: `spawn()` issuing N processes
// back-to-back does not bound how long any ONE of them takes to actually start running (V8
// isolate boot + ESM resolution of update_state.mjs's three imports, under contention from the
// other N-1 processes cold-starting at once) -- a slow straggler can arrive at the read AFTER an
// earlier process has already written, so the straggler's read observes the already-updated
// file and "accidentally" preserves it. A fixed delay cannot rule this out; it can only make it
// less likely, and less-likely is exactly the "hoping" this dispatch forbids.
//
// Final mechanism: a real cross-process barrier via the filesystem. On its first read of the
// target path, each process drops an arrival marker into a shared directory, then blocks
// (synchronous poll + Atomics.wait sleep) until EITHER all N markers are present (true full
// quorum -- every process is now guaranteed to observe the identical pre-mutation snapshot,
// regardless of how long any straggler took to get there) OR no NEW marker has appeared for
// CG_TEST_BARRIER_INACTIVITY_MS straight (the escape hatch: once a correct fix serializes
// processes one at a time behind a lock, no second process can ever reach this read while the
// first holds the lock, so quorum will never complete -- inactivity is how a single serialized
// holder detects "no more siblings are coming any time soon" and proceeds instead of hanging
// forever). Unlike the fixed-delay version, the wait duration adapts to the real arrival rate:
// pre-fix it patiently waits out however long process-startup jitter takes, as long as arrivals
// keep trickling in; post-fix each serialized holder pays at most one inactivity window.
//
// `import fs from 'node:fs'` resolves to one shared object across every module in a process, so
// patching a property on it from a `--import` preload is visible to update_state.mjs's own later
// `import fs from 'node:fs'` -- verified empirically (scratch repro: a shim.mjs patches
// fs.readFileSync, an independently-`import fs`-ing target.mjs still hits the patched function)
// before writing this file.

function makeBarrierShimFile(tmpDir) {
  const shimPath = path.join(tmpDir, '.barrier-shim.mjs');
  const shimSrc = [
    "import fsShim from 'node:fs';",
    "import pathShim from 'node:path';",
    '',
    "const BARRIER_DIR = process.env.CG_TEST_BARRIER_DIR;",
    "const BARRIER_N = Number(process.env.CG_TEST_BARRIER_N || 0);",
    "const TARGET = process.env.CG_TEST_BARRIER_TARGET;",
    "const INACTIVITY_MS = Number(process.env.CG_TEST_BARRIER_INACTIVITY_MS || 300);",
    '',
    'if (BARRIER_DIR && BARRIER_N > 0 && TARGET) {',
    '  const resolvedTarget = pathShim.resolve(TARGET);',
    '  const originalReadFileSync = fsShim.readFileSync;',
    '  let armed = true;',
    '  fsShim.readFileSync = function patchedReadFileSync(p, ...rest) {',
    '    if (armed && pathShim.resolve(String(p)) === resolvedTarget) {',
    '      armed = false;',
    '      const markerId = `${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2)}`;',
    '      fsShim.writeFileSync(pathShim.join(BARRIER_DIR, markerId), "1");',
    '      const sab = new Int32Array(new SharedArrayBuffer(4));',
    '      let lastCount = fsShim.readdirSync(BARRIER_DIR).length;',
    '      let lastChangeAt = Date.now();',
    '      while (lastCount < BARRIER_N) {',
    '        Atomics.wait(sab, 0, 0, 15);',
    '        const count = fsShim.readdirSync(BARRIER_DIR).length;',
    '        if (count !== lastCount) {',
    '          lastCount = count;',
    '          lastChangeAt = Date.now();',
    '        } else if (Date.now() - lastChangeAt > INACTIVITY_MS) {',
    '          break;',
    '        }',
    '      }',
    '    }',
    '    return originalReadFileSync.call(fsShim, p, ...rest);',
    '  };',
    '}',
    '',
  ].join('\n');
  fs.writeFileSync(shimPath, shimSrc, 'utf8');
  return shimPath;
}

// Async spawn of update_state.mjs, optionally preloaded with the barrier shim above. Returns a
// Promise so callers can Promise.all() a batch of genuinely concurrent invocations (spawnSync
// would block the event loop and serialize them, defeating the point of S1/S2).
function spawnUpdateStateAsync(args, opts = {}) {
  return new Promise((resolve) => {
    const env = { ...process.env, ...opts.env };
    const spawnArgs = [];
    if (opts.barrierShim) {
      spawnArgs.push('--import', pathToFileURL(opts.barrierShim).href);
    }
    spawnArgs.push(path.join(SCRIPTS_DIR, 'update_state.mjs'), ...args);
    const child = spawn(process.execPath, spawnArgs, { env });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (d) => { stdout += d; });
    child.stderr.on('data', (d) => { stderr += d; });
    child.on('close', (status) => resolve({ status, stdout, stderr }));
  });
}

// Spawn a throwaway child, wait for it to exit, and return its now-guaranteed-dead pid. Standard
// "dead pid" fixture technique; carries the usual (negligible, in a fast local test) PID-reuse
// race shared by every liveness-check test of this shape.
function deadPid() {
  const result = spawnSync(process.execPath, ['-e', '']);
  return result.pid;
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
    // BUG-044 commit A (M4.md plan, ruling N3): two-assertion form, not one.
    // A bare literal alone drifts silently when SCHEMA_VERSION bumps (this is exactly how this
    // assertion went stale: b87f6ac0 bumped constants.mjs to v3 without updating the `1` here).
    // A SCHEMA_VERSION-only comparison would be self-fulfilling and hide the same drift. Assert
    // both: the contract (state matches the constant) AND the deliberate pin (the constant is
    // still 3 today — the next bump must break this assertion on purpose).
    assert.strictEqual(state.schema_version, SCHEMA_VERSION, 'schema_version must equal SCHEMA_VERSION (constants.mjs)');
    assert.strictEqual(SCHEMA_VERSION, 3, 'SCHEMA_VERSION pin -- the next bump must update this assertion on purpose');
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


// ============================================================================
// BUG-044 -- update_state.mjs lost-update race (QA-Red baseline, commit B)
// Scenarios S1-S5 per SPRINT-39 plans/M4.md "### Test scenarios, with the mutants each must
// kill" (BUG-044 section). S0 is commit A above (the schema_version fix). The table's S6 row
// ("existing scenarios 1-6 stay green") is not a new test -- satisfied by Scenarios 1-6 above
// continuing to pass in the same `node --test` run as these. A trailing addendum (past S5) covers
// the two unguarded migration writes at update_state.mjs:116/:122, flagged separately by this
// story's QA-Red dispatch text -- not one of the plan's S1-S5 rows.
// ============================================================================

// ---- BUG-044 S1: 20 concurrent invocations, 20 distinct story ids ----
describe('BUG-044 S1: 20 concurrent update_state invocations, 20 distinct stories -- all 20 transitions must persist', () => {
  let tmpBase, stateFile, shimPath, barrierDir;
  const N = 20;
  const ids = Array.from({ length: N }, (_, i) => `STORY-FAKE-${String(i + 1).padStart(2, '0')}`);

  before(() => {
    tmpBase = fs.mkdtempSync(path.join(os.tmpdir(), 'cg-bug044-s1-'));
    const sprintDir = path.join(tmpBase, '.cleargate', 'sprint-runs', 'S-FAKE');
    fs.mkdirSync(sprintDir, { recursive: true });
    stateFile = path.join(sprintDir, 'state.json');
    const stories = {};
    for (const id of ids) stories[id] = makeStory('Ready to Bounce');
    // Seed at schema_version 3, execution_mode omitted (JSON.stringify drops `undefined` keys) --
    // seeding at v1 would make a 20-way test exercise 20 concurrent MIGRATIONS, not the race
    // (BUG-044 Gotchas, M4.md plan: "Seed S1's fixture at schema_version: 3 with no execution_mode").
    writeStateJson(stateFile, makeState(stories, { schema_version: 3, execution_mode: undefined }));
    barrierDir = fs.mkdtempSync(path.join(tmpBase, 'barrier-'));
    shimPath = makeBarrierShimFile(tmpBase);
  });

  after(() => {
    fs.rmSync(tmpBase, { recursive: true, force: true });
  });

  test('all 20 concurrent Bouncing transitions are present in the final state.json (reproduces BUG-044 SS2)', async () => {
    const results = await Promise.all(
      ids.map((id) =>
        spawnUpdateStateAsync([id, 'Bouncing'], {
          barrierShim: shimPath,
          env: {
            CLEARGATE_STATE_FILE: stateFile,
            CG_TEST_BARRIER_DIR: barrierDir,
            CG_TEST_BARRIER_N: String(N),
            CG_TEST_BARRIER_TARGET: stateFile,
            CG_TEST_BARRIER_INACTIVITY_MS: '300',
          },
        })
      )
    );

    for (const r of results) {
      assert.strictEqual(r.status, 0, `every invocation should exit 0 even under the race; stderr: ${r.stderr}`);
    }

    // Also exercises the "file stays valid JSON" property (SS5 case 2) -- a torn/corrupt file
    // would throw here rather than silently under-count.
    const final = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
    const bounced = ids.filter((id) => final.stories[id].state === 'Bouncing');
    const lost = ids.filter((id) => !bounced.includes(id));
    assert.strictEqual(
      bounced.length,
      N,
      `expected all ${N} transitions to persist; only ${bounced.length} did -- lost: ${lost.join(', ')} ` +
      `(lost-update race: 'wx' exclusive lock missing, acquired after the :99 read, or not held ` +
      `across the full read-modify-write window)`
    );
  });
});

// ---- BUG-044 S2: two concurrent invocations against the SAME story id ----
describe('BUG-044 S2: two concurrent update_state invocations, same story id -- file stays valid JSON, no corruption', () => {
  let tmpBase, stateFile, shimPath, barrierDir;
  const ID = 'STORY-FAKE-SAME';
  const N = 2;

  before(() => {
    tmpBase = fs.mkdtempSync(path.join(os.tmpdir(), 'cg-bug044-s2-'));
    const sprintDir = path.join(tmpBase, '.cleargate', 'sprint-runs', 'S-FAKE');
    fs.mkdirSync(sprintDir, { recursive: true });
    stateFile = path.join(sprintDir, 'state.json');
    writeStateJson(
      stateFile,
      makeState({ [ID]: makeStory('Ready to Bounce') }, { schema_version: 3, execution_mode: undefined })
    );
    barrierDir = fs.mkdtempSync(path.join(tmpBase, 'barrier-'));
    shimPath = makeBarrierShimFile(tmpBase);
  });

  after(() => {
    fs.rmSync(tmpBase, { recursive: true, force: true });
  });

  test('two racing writers to the same story id leave valid JSON with exactly one winning write', async () => {
    const results = await Promise.all(
      [0, 1].map(() =>
        spawnUpdateStateAsync([ID, 'Bouncing'], {
          barrierShim: shimPath,
          env: {
            CLEARGATE_STATE_FILE: stateFile,
            CG_TEST_BARRIER_DIR: barrierDir,
            CG_TEST_BARRIER_N: String(N),
            CG_TEST_BARRIER_TARGET: stateFile,
            CG_TEST_BARRIER_INACTIVITY_MS: '300',
          },
        })
      )
    );

    for (const r of results) {
      assert.strictEqual(r.status, 0, `both invocations should exit 0; stderr: ${r.stderr}`);
    }

    // Guards against "releasing the lock before renameSync" (M4.md plan mutant): that mutant can
    // let a reader observe a mid-rename, half-written file. A successful JSON.parse <=> no torn write.
    const raw = fs.readFileSync(stateFile, 'utf8');
    let final;
    assert.doesNotThrow(() => { final = JSON.parse(raw); }, `state.json must stay valid JSON after a same-story race; got: ${raw}`);
    assert.strictEqual(final.stories[ID].state, 'Bouncing', 'the surviving write should reflect the (only) target state both writers computed');
    assert.strictEqual(Object.keys(final.stories).length, 1, 'no story entries should be duplicated or dropped by the race');
  });
});

// ---- BUG-044 S3: idempotent no-op must not leave a lock behind ----
describe('BUG-044 S3: idempotent no-op leaves no lock file behind, and a third invocation does not hang', () => {
  let tmpBase, stateFile, lockFile;
  const ID = 'STORY-FAKE-NOOP';

  before(() => {
    tmpBase = fs.mkdtempSync(path.join(os.tmpdir(), 'cg-bug044-s3-'));
    const sprintDir = path.join(tmpBase, '.cleargate', 'sprint-runs', 'S-FAKE');
    fs.mkdirSync(sprintDir, { recursive: true });
    stateFile = path.join(sprintDir, 'state.json');
    lockFile = `${stateFile}.lock`;
    writeStateJson(
      stateFile,
      makeState({ [ID]: makeStory('Ready to Bounce') }, { schema_version: 3, execution_mode: undefined })
    );
  });

  after(() => {
    fs.rmSync(tmpBase, { recursive: true, force: true });
  });

  test('transition, then repeat (idempotent no-op), leaves no lock file and a third call succeeds without hanging', () => {
    const env = { ...process.env, CLEARGATE_STATE_FILE: stateFile };

    const first = spawnSync(process.execPath, [path.join(SCRIPTS_DIR, 'update_state.mjs'), ID, 'Bouncing'], { encoding: 'utf8', env, timeout: 10000 });
    assert.strictEqual(first.status, 0, `first transition should exit 0; stderr: ${first.stderr}`);

    // Hits the idempotency no-op branch at update_state.mjs:227-229 (process.exit(0) -- the
    // commonest path in normal operation, and the one that a `finally`-only release would skip).
    const second = spawnSync(process.execPath, [path.join(SCRIPTS_DIR, 'update_state.mjs'), ID, 'Bouncing'], { encoding: 'utf8', env, timeout: 10000 });
    assert.strictEqual(second.status, 0, `no-op should exit 0; stderr: ${second.stderr}`);
    assert.ok(second.stdout.includes('No-op:'), `no-op stdout should say "No-op:"; got: ${second.stdout}`);

    assert.ok(!fs.existsSync(lockFile), `no lock file should remain after an idempotent no-op; found ${lockFile}`);

    // A `finally`-only release ships a tool that self-deadlocks on its second no-op (Gotcha 1) --
    // this third call is the check that would hang forever under that mutant.
    const third = spawnSync(process.execPath, [path.join(SCRIPTS_DIR, 'update_state.mjs'), ID, 'Bouncing'], { encoding: 'utf8', env, timeout: 10000 });
    assert.notStrictEqual(third.status, null, 'third invocation must not hang/time out (finally-only release deadlocks here)');
    assert.strictEqual(third.status, 0, `third invocation should also succeed; stderr: ${third.stderr}`);
  });
});

// ---- BUG-044 S4: a lock left by a dead process is stolen, not honoured forever ----
describe('BUG-044 S4: stale lock (dead pid) is stolen; the invocation succeeds and the stale lock does not survive', () => {
  let tmpBase, stateFile, lockFile;
  const ID = 'STORY-FAKE-STALELOCK';

  before(() => {
    tmpBase = fs.mkdtempSync(path.join(os.tmpdir(), 'cg-bug044-s4-'));
    const sprintDir = path.join(tmpBase, '.cleargate', 'sprint-runs', 'S-FAKE');
    fs.mkdirSync(sprintDir, { recursive: true });
    stateFile = path.join(sprintDir, 'state.json');
    lockFile = `${stateFile}.lock`;
    writeStateJson(
      stateFile,
      makeState({ [ID]: makeStory('Ready to Bounce') }, { schema_version: 3, execution_mode: undefined })
    );
    const pid = deadPid();
    fs.writeFileSync(lockFile, JSON.stringify({ pid, at: new Date().toISOString() }), 'utf8');
  });

  after(() => {
    fs.rmSync(tmpBase, { recursive: true, force: true });
  });

  test('invocation steals a dead-pid lock, transitions the story, and leaves no stale lock file, within the retry budget', () => {
    const env = { ...process.env, CLEARGATE_STATE_FILE: stateFile };
    const start = Date.now();
    const result = spawnSync(process.execPath, [path.join(SCRIPTS_DIR, 'update_state.mjs'), ID, 'Bouncing'], { encoding: 'utf8', env, timeout: 10000 });
    const elapsedMs = Date.now() - start;

    assert.notStrictEqual(result.status, null, 'invocation must not hang/time out on a dead-pid lock');
    assert.strictEqual(result.status, 0, `a dead-pid lock should be stealable; stderr: ${result.stderr}`);
    assert.ok(elapsedMs < 10000, `steal should complete within the retry budget; took ${elapsedMs}ms`);

    const final = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
    assert.strictEqual(final.stories[ID].state, 'Bouncing', 'the transition should have taken effect after stealing the dead lock');

    assert.ok(!fs.existsSync(lockFile), `the stale lock should not survive a successful invocation; found ${lockFile}`);
  });
});

// ---- BUG-044 S5: a live lock is respected, never stolen ----
describe("BUG-044 S5: a live lock (this process's own pid) is respected -- the invocation refuses to proceed", () => {
  let tmpBase, stateFile, lockFile;
  const ID = 'STORY-FAKE-LIVELOCK';

  before(() => {
    tmpBase = fs.mkdtempSync(path.join(os.tmpdir(), 'cg-bug044-s5-'));
    const sprintDir = path.join(tmpBase, '.cleargate', 'sprint-runs', 'S-FAKE');
    fs.mkdirSync(sprintDir, { recursive: true });
    stateFile = path.join(sprintDir, 'state.json');
    lockFile = `${stateFile}.lock`;
    writeStateJson(
      stateFile,
      makeState({ [ID]: makeStory('Ready to Bounce') }, { schema_version: 3, execution_mode: undefined })
    );
    // This TEST process's own pid -- guaranteed alive for the duration of the assertion below.
    fs.writeFileSync(lockFile, JSON.stringify({ pid: process.pid, at: new Date().toISOString() }), 'utf8');
  });

  after(() => {
    fs.rmSync(tmpBase, { recursive: true, force: true });
  });

  test('invocation does NOT steal a live lock; exits non-zero within the budget and leaves state untouched', () => {
    const env = { ...process.env, CLEARGATE_STATE_FILE: stateFile };
    const start = Date.now();
    const result = spawnSync(process.execPath, [path.join(SCRIPTS_DIR, 'update_state.mjs'), ID, 'Bouncing'], { encoding: 'utf8', env, timeout: 10000 });
    const elapsedMs = Date.now() - start;

    assert.notStrictEqual(result.status, null, 'invocation must not hang; it should give up within the retry budget');
    assert.notStrictEqual(result.status, 0, `a live lock must not be stolen -- invocation should refuse and exit non-zero; got status ${result.status}, stderr: ${result.stderr}`);
    assert.ok(elapsedMs < 10000, `refusal should happen within the retry budget; took ${elapsedMs}ms`);

    const final = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
    assert.strictEqual(final.stories[ID].state, 'Ready to Bounce', 'state must be untouched -- the invocation must not have proceeded past the live lock');

    assert.ok(fs.existsSync(lockFile), 'the live lock itself should still be present -- this process never released it');
  });
});

// ---- BUG-044 QA-Red addendum: the two UNGUARDED migration writes (:116, :122) ----
// Not one of the plan's S1-S5 rows -- flagged separately by the QA-Red dispatch: "the two
// unguarded migration writes at update_state.mjs:116 and :122 (plan finding) -- they are in
// scope and the item's SS2 does not mention them." S1 above deliberately seeds at
// schema_version 3 (per the plan's own Gotcha) specifically to bypass the migrator, which means
// S1 can never catch a fix that locks only the action-branch atomicWrite calls (:155 etc.) and
// forgets to extend the critical section back to the pre-migration read/migration writes at
// :114-117 / :120-123 (M4.md plan Gotcha 2 -- itself listed as one of S1's own mutants, but one
// S1's v3 seed structurally cannot exercise). This scenario seeds a FRESH v1 fixture so every
// concurrent process actually walks the migration branch before the action dispatch.
describe('BUG-044 QA-Red addendum: concurrent invocations against a fresh v1 state.json (forces the migration writes at :116/:122)', () => {
  let tmpBase, stateFile, shimPath, barrierDir;
  const N = 10;
  const ids = Array.from({ length: N }, (_, i) => `STORY-FAKE-MIG-${String(i + 1).padStart(2, '0')}`);

  before(() => {
    tmpBase = fs.mkdtempSync(path.join(os.tmpdir(), 'cg-bug044-mig-'));
    const sprintDir = path.join(tmpBase, '.cleargate', 'sprint-runs', 'S-FAKE');
    fs.mkdirSync(sprintDir, { recursive: true });
    stateFile = path.join(sprintDir, 'state.json');
    const stories = {};
    for (const id of ids) stories[id] = makeStory('Ready to Bounce');
    // Deliberately v1 (makeState's default) -- every concurrent process below must walk BOTH
    // migrateV1ToV2 (:114-117) and migrateStateToV3 (:120-123) before reaching the action
    // dispatch. The barrier forces all N processes' single read (before ANY of them has written
    // anything, migration or otherwise) to observe the identical pre-migration v1 snapshot.
    writeStateJson(stateFile, makeState(stories));
    barrierDir = fs.mkdtempSync(path.join(tmpBase, 'barrier-'));
    shimPath = makeBarrierShimFile(tmpBase);
  });

  after(() => {
    fs.rmSync(tmpBase, { recursive: true, force: true });
  });

  test('all N concurrent transitions persist AND the file ends fully migrated to schema_version 3', async () => {
    const results = await Promise.all(
      ids.map((id) =>
        spawnUpdateStateAsync([id, 'Bouncing'], {
          barrierShim: shimPath,
          env: {
            CLEARGATE_STATE_FILE: stateFile,
            CG_TEST_BARRIER_DIR: barrierDir,
            CG_TEST_BARRIER_N: String(N),
            CG_TEST_BARRIER_TARGET: stateFile,
            CG_TEST_BARRIER_INACTIVITY_MS: '300',
          },
        })
      )
    );

    for (const r of results) {
      assert.strictEqual(r.status, 0, `every invocation should exit 0; stderr: ${r.stderr}`);
    }

    const final = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
    assert.strictEqual(final.schema_version, 3, 'file should end fully migrated to schema_version 3, not stuck mid-migration');
    assert.ok(!('execution_mode' in final), 'execution_mode should have been stripped by the v2->v3 migration');

    const bounced = ids.filter((id) => final.stories[id].state === 'Bouncing');
    const lost = ids.filter((id) => !bounced.includes(id));
    assert.strictEqual(
      bounced.length,
      N,
      `expected all ${N} transitions to persist through the migration path; only ${bounced.length} did -- ` +
      `lost: ${lost.join(', ')} (the two unguarded migration writes at update_state.mjs:116/:122 raced -- ` +
      `a lock scoped only to the action-branch writes at :155/:176/:193/:210/:241 does not protect this path)`
    );
  });
});
