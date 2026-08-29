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
import { validateState } from './validate_state.mjs';

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

  test('creates state.json with schema_version=SCHEMA_VERSION, both stories Ready to Bounce, counters 0, exit 0', () => {
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

  test('all 20 concurrent Bouncing transitions are present in the final state.json (reproduces BUG-044 SS2)', { timeout: 30000 }, async () => {
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
      // TPV round-2 (BUG-044-tpv.md SS2.E, measured 2026-08-29): a non-zero exit here with stderr
      // mentioning "could not acquire lock ... held by pid N" means the LOCK IS CORRECT and the
      // retry budget is too small for THIS barrier -- it is NOT the three causes the count-mismatch
      // message below lists. The barrier arms on the first read of the state file, which under
      // this plan's own Gotcha 2 sits INSIDE the lock, so every serialized holder pays the
      // barrier's inactivity window (S1's 20 holders -> ~6s serialized). See T3: implement the
      // retry budget PER-HOLDER, with the deadline reset on holder change -- do not read a
      // non-zero exit here as evidence of a lock-design defect.
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
      `expected all ${N} transitions to persist when every invocation above already exited 0; only ` +
      `${bounced.length} did -- lost: ${lost.join(', ')} (a TRUE lost-update race: 'wx' exclusive lock ` +
      `missing, acquired after the :99 read, or not held across the full read-modify-write window -- ` +
      `NOT a retry-budget issue, since every invocation already reported exit 0 above)`
    );
  });
});

// ---- BUG-044 T1 (TPV round-2 ruling T1, BUG-044-tpv.md SS3): an error exit must leave no lock ----
// TPV M6 finding: nine non-zero process.exit() sites fire INSIDE the critical section
// (update_state.mjs:102,:110,:130,:135,:146,:166,:184,:201,:223) and NONE was covered by S1-S5 --
// S3 covers only the no-op path at :229. A release registered only on the happy paths (no
// process.on('exit')) leaks the lock on every one of them: `state.json.lock` is NOT gitignored,
// and validate_bounce_readiness.mjs:98-101 hard-fails on any dirty tree, halting the NEXT story in
// the sprint with a diagnostic that never names update_state. This case is GREEN AT BASELINE --
// today's code writes no lock file at all, so `!existsSync` passes vacuously; it is a
// regression guard of S3's class (TPV SS3 T1) and must not be reshaped to force a red baseline.
describe('BUG-044 T1: an error exit leaves no lock file behind (M6 -- nine uncovered in-lock exit sites)', () => {
  let tmpBase, stateFile, lockFile;
  const ESCALATED_ID = 'STORY-FAKE-ESCALATED';

  before(() => {
    tmpBase = fs.mkdtempSync(path.join(os.tmpdir(), 'cg-bug044-t1-'));
    const sprintDir = path.join(tmpBase, '.cleargate', 'sprint-runs', 'S-FAKE');
    fs.mkdirSync(sprintDir, { recursive: true });
    stateFile = path.join(sprintDir, 'state.json');
    lockFile = `${stateFile}.lock`;
    // Seed an already-Escalated story so a single --qa-bounce invocation hits :184 directly
    // (Scenario 4's own second test builds this exact fixture shape, reused here).
    writeStateJson(
      stateFile,
      makeState(
        { [ESCALATED_ID]: makeStory('Escalated', { qa_bounces: 3 }) },
        { schema_version: 3, execution_mode: undefined }
      )
    );
  });

  after(() => {
    fs.rmSync(tmpBase, { recursive: true, force: true });
  });

  test('two independent in-lock error-exit paths (:184 already-Escalated, :135 story-not-found) both leave no lock file', () => {
    const env = { ...process.env, CLEARGATE_STATE_FILE: stateFile };

    // Path 1: :184 -- --qa-bounce against an already-Escalated story.
    const r1 = spawnSync(process.execPath, [path.join(SCRIPTS_DIR, 'update_state.mjs'), ESCALATED_ID, '--qa-bounce'], { encoding: 'utf8', env, timeout: 10000 });
    assert.notStrictEqual(r1.status, 0, 'exit code should be non-zero for an already-Escalated story');
    assert.ok(r1.stderr.includes('already Escalated'), `stderr should say "already Escalated"; got: ${r1.stderr}`);
    assert.ok(!fs.existsSync(lockFile), `error exit at :184 must not leave a lock file; found ${lockFile}`);

    // Path 2: :135 -- story id not present in state.json.
    const r2 = spawnSync(process.execPath, [path.join(SCRIPTS_DIR, 'update_state.mjs'), 'STORY-DOES-NOT-EXIST', 'Bouncing'], { encoding: 'utf8', env, timeout: 10000 });
    assert.notStrictEqual(r2.status, 0, 'exit code should be non-zero for a story not present in state.json');
    assert.ok(r2.stderr.includes('not found'), `stderr should name the missing story; got: ${r2.stderr}`);
    assert.ok(!fs.existsSync(lockFile), `error exit at :135 must not leave a lock file; found ${lockFile}`);
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

  test('two racing writers to the same story id leave valid JSON with exactly one winning write', { timeout: 15000 }, async () => {
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

    // TPV round-2 ruling T2 (BUG-044-tpv.md SS1/M3, SS3/T2, measured 2026-08-29): M3 (lock
    // released between writeFileSync(tmp) and renameSync) SURVIVES this assertion 10 of 10 runs
    // -- atomicWrite's tmp+rename already gives valid-JSON independent of any lock, so this is
    // NOT a release-before-renameSync guard. S2's real justification is the item's SS5 case 2
    // acceptance requirement ("file stays valid JSON under a same-story race"); keep the case,
    // strike the mutant claim. M3 is an accepted documented residual -- QA-Verify MUST read the
    // update_state.mjs diff and confirm release happens strictly after renameSync returns; no
    // test enforces it (BUG-044 kick-back criterion 9).
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

  test('all N concurrent transitions persist AND the file ends fully migrated to schema_version 3', { timeout: 30000 }, async () => {
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
      // TPV round-2 (BUG-044-tpv.md SS2.E): same barrier-inside-lock coupling as S1 -- a non-zero
      // exit here with "could not acquire lock ... held by pid N" means the retry budget is too
      // small for this barrier, not a lock-design defect; see T3 (per-holder budget, reset on
      // holder change).
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
      `expected all ${N} transitions to persist through the migration path when every invocation above ` +
      `already exited 0; only ${bounced.length} did -- lost: ${lost.join(', ')} (the two unguarded ` +
      `migration writes at update_state.mjs:116/:122 raced -- a lock scoped only to the action-branch ` +
      `writes at :155/:176/:193/:210/:241 does not protect this path; NOT a retry-budget issue, since ` +
      `every invocation already reported exit 0 above)`
    );
  });
});

// ============================================================================
// CR-106: execution state becomes an append-only event log -- QA-Red baseline
// ============================================================================
//
// Scenarios E2-E9 per CR-106_Execution_State_Event_Log.md §4 (as amended 2026-08-29) and
// SPRINT-39 plans/M4.md "### Test scenarios, with the mutants each must kill" (CR-106 section).
// Baseline before this section: node --test .cleargate/scripts/state-scripts.test.mjs ->
// tests 15 · suites 13 · pass 15 · fail 0 · skipped 0 (~14.4-14.6s wall-clock, BUG-044 post-fix).
//
// E1 is INHERITED, not authored here: the "BUG-044 S1: 20 concurrent update_state invocations"
// describe block above IS E1 -- it must stay green after the lock is replaced by the single-writer
// fold, unmodified, per the item's own §4 case 1 ("do not delete or weaken it").
//
// S4 and S5 above (dead-pid-lock-is-stolen / live-lock-is-respected) are PURE LOCK SEMANTICS with
// zero race content (item § AMENDMENT "two scenarios MUST be deleted with the lock, and saying so
// is part of the work"). They are NOT deleted by THIS commit -- QA-Red does not touch
// update_state.mjs or remove the lock -- but per that amendment: whoever removes the lock in the
// SAME commit must also delete S4 and S5 (T1 stays -- it is a real M6 exit-site regression guard,
// green at baseline by design, not a lock-lifecycle test), and must STATE that deletion in their
// commit message and report, not do it silently. Recorded here so the obligation travels with the
// test file, not just the QA-Red report.
//
// `.cleargate/scripts/state-events.mjs` does not exist yet at QA-Red time (this dispatch's own
// forbidden list: no production code, no state-events.mjs, no edits to update_state.mjs). It is
// imported DYNAMICALLY (not via a top-level `import`) so its absence fails ONLY the E2-E9 tests
// below -- never the whole file's module load, which would collaterally fail the inherited
// BUG-044 suite above for an unrelated reason (a missing-module load error aborts the entire
// `node --test` file, not just one describe block).
let stateEventsModule = null;
let stateEventsImportError = null;
try {
  stateEventsModule = await import('./state-events.mjs');
} catch (err) {
  stateEventsImportError = err;
}
function requireStateEvents() {
  if (!stateEventsModule) {
    assert.fail(
      `.cleargate/scripts/state-events.mjs not found or failed to import -- expected until CR-106 ` +
      `creates it (appendEvent, fold, EVENT_SCHEMA). Import error: ${stateEventsImportError && stateEventsImportError.message}`
    );
  }
  return stateEventsModule;
}

// Minimal event-shape helper, per CR-106 §1 "New Logic": {ts, sprint_id, story_id, from, to,
// actor, run_id, wave, reason}.
//
// GENESIS CONVENTION -- QA-RED WORKING ASSUMPTION, flagged explicitly in the QA-Red report as a
// spec gap: nothing in the CR item, the M4 plan, or BUG-044's artifacts defines how a story's
// non-transition fields (lane, worktree, notes, bounce counters, ...) reach the fold when fold()
// takes ONLY the event array (no state.json, no external state -- that is exactly E8's own
// property). This helper's convention: a story's first appearance in the log is an event with
// from: null, and E7 additionally carries an `initial: {...}` payload on that first event for the
// fields the documented 9-field shape does not cover. If the Developer's real genesis-event
// contract differs, this convention -- not the byte-compatibility/determinism properties the tests
// below exercise -- is what needs adjusting.
function makeEvent(overrides = {}) {
  return {
    ts: '2026-08-29T00:00:00.000Z',
    sprint_id: 'S-FAKE',
    // sprint_status is NOT one of the CR's documented 9 event fields -- same QA-Red-assumption
    // caveat as the genesis convention above: carried per-event (redundant, but consistent with
    // how sprint_id is already carried per-event in the documented shape) so fold() has SOME
    // source for state.json's top-level sprint_status without reading state.json itself (E8).
    sprint_status: 'Active',
    story_id: 'STORY-FAKE-E',
    from: null,
    to: 'Ready to Bounce',
    actor: 'test',
    run_id: 'run-0',
    wave: 1,
    reason: null,
    ...overrides,
  };
}

// Freezes `new Date()` / `Date.now()` to a fixed instant inside a spawned child, via --import
// preload -- same mechanism as makeBarrierShimFile above (global reassignment before the entry
// script's own imports run). Lets E7 drive a REAL invocation of TODAY'S unmodified
// update_state.mjs and get a reproducible `new Date().toISOString()` value out of it, so its
// output can be compared byte-for-byte against a hand-built event log using the SAME timestamp.
function makeFrozenDateShimFile(tmpDir, isoString) {
  const shimPath = path.join(tmpDir, '.frozen-date-shim.mjs');
  const shimSrc = [
    `const FROZEN_MS = new Date(${JSON.stringify(isoString)}).getTime();`,
    'const RealDate = Date;',
    'class FrozenDate extends RealDate {',
    '  constructor(...args) {',
    '    if (args.length === 0) { super(FROZEN_MS); return; }',
    '    super(...args);',
    '  }',
    '  static now() { return FROZEN_MS; }',
    '}',
    'globalThis.Date = FrozenDate;',
    '',
  ].join('\n');
  fs.writeFileSync(shimPath, shimSrc, 'utf8');
  return shimPath;
}

// Tiny throwaway runner script (written to fs.mkdtempSync, not a repo file -- same technique as
// makeBarrierShimFile) that imports the REAL appendEvent() and calls it once with argv-supplied
// arguments, so E6 can drive N genuinely concurrent appendEvent() calls via N real child
// processes (mirrors spawnUpdateStateAsync's rationale: spawnSync would serialize them and defeat
// the point of a concurrency test).
//
// QA-RED ASSUMPTION, flagged in the report: appendEvent(eventsFile, event) -- eventsFile first,
// mirroring atomicWrite(stateFile, state)'s own (path, payload) argument order. Nothing in the CR
// item specifies appendEvent()'s signature; if it differs, this runner needs a one-line fix.
function makeAppendEventRunnerFile(tmpDir) {
  const runnerPath = path.join(tmpDir, '.append-event-runner.mjs');
  const moduleUrl = pathToFileURL(path.join(SCRIPTS_DIR, 'state-events.mjs')).href;
  const src = [
    `import { appendEvent } from ${JSON.stringify(moduleUrl)};`,
    '',
    'const [, , eventsFile, eventJson] = process.argv;',
    'const event = JSON.parse(eventJson);',
    'appendEvent(eventsFile, event);',
    '',
  ].join('\n');
  fs.writeFileSync(runnerPath, src, 'utf8');
  return runnerPath;
}

// ---- CR-106 E2: fold determinism ----
describe('CR-106 E2: fold(events) is deterministic and derives updated_at from log content, not wall-clock', () => {
  test('fold(events) called twice over the identical array yields byte-identical JSON', () => {
    const { fold } = requireStateEvents();
    const events = [
      makeEvent({ story_id: 'STORY-FAKE-E2A', run_id: 'run-1', ts: '2026-08-29T00:00:00.000Z' }),
      makeEvent({ story_id: 'STORY-FAKE-E2A', run_id: 'run-2', from: 'Ready to Bounce', to: 'Bouncing', ts: '2026-08-29T00:05:00.000Z' }),
    ];

    const first = fold(events);
    const second = fold(events);

    assert.strictEqual(
      JSON.stringify(first, null, 2),
      JSON.stringify(second, null, 2),
      'fold(events) must be a pure function of its input -- two calls over the same array must produce byte-identical output'
    );
  });

  test('updated_at is derived from max(event.ts), not from Date.now() at fold time', () => {
    const { fold } = requireStateEvents();
    const events = [
      makeEvent({ story_id: 'STORY-FAKE-E2B', run_id: 'run-1', ts: '2026-08-29T00:00:00.000Z' }),
      makeEvent({ story_id: 'STORY-FAKE-E2B', run_id: 'run-2', from: 'Ready to Bounce', to: 'Bouncing', ts: '2026-08-29T00:05:00.000Z' }),
    ];
    const result = fold(events);
    assert.strictEqual(
      result.updated_at,
      '2026-08-29T00:05:00.000Z',
      'top-level updated_at must equal max(event.ts) across the log (2026-08-29, a fixed past date) -- ' +
      'a fold embedding Date.now() would produce today\'s real wall-clock date instead, deterministically wrong'
    );
  });

  test('story insertion order in fold(events).stories matches EVENT LOG order, not a re-sort', () => {
    const { fold } = requireStateEvents();
    const events = [
      makeEvent({ story_id: 'STORY-FAKE-Z', run_id: 'run-1', ts: '2026-08-29T00:00:00.000Z' }),
      makeEvent({ story_id: 'STORY-FAKE-A', run_id: 'run-2', ts: '2026-08-29T00:01:00.000Z' }),
      makeEvent({ story_id: 'STORY-FAKE-M', run_id: 'run-3', ts: '2026-08-29T00:02:00.000Z' }),
    ];
    const result = fold(events);
    assert.deepStrictEqual(
      Object.keys(result.stories),
      ['STORY-FAKE-Z', 'STORY-FAKE-A', 'STORY-FAKE-M'],
      'stories must appear in the order their genesis events were logged (Z, A, M) -- an ' +
      'alphabetical or re-sorted iteration (e.g. via an intermediate Set/Object.keys pass) would ' +
      'reorder this to A, M, Z'
    );
  });
});

// ---- CR-106 E3: replay idempotency ----
describe('CR-106 E3: a duplicate run_id leaves the fold unchanged (keyed on run_id, not ts or (story_id,to))', () => {
  test('appending a duplicate event (same run_id) does not change fold() output', () => {
    const { fold } = requireStateEvents();
    const events = [
      makeEvent({ story_id: 'STORY-FAKE-E3A', run_id: 'run-1', ts: '2026-08-29T00:00:00.000Z' }),
      makeEvent({ story_id: 'STORY-FAKE-E3A', run_id: 'run-2', from: 'Ready to Bounce', to: 'Bouncing', ts: '2026-08-29T00:05:00.000Z' }),
    ];
    const replayed = { ...events[1] }; // identical run_id -- e.g. a re-sent/replayed segment
    const eventsWithReplay = [...events, replayed];

    const before = fold(events);
    const after = fold(eventsWithReplay);

    assert.strictEqual(
      JSON.stringify(after, null, 2),
      JSON.stringify(before, null, 2),
      'a replayed event sharing an already-seen run_id must be a no-op on the fold'
    );
  });

  test('two DIFFERENT stories sharing the same ts are BOTH applied -- discriminates run_id-keyed dedupe from ts-keyed dedupe', () => {
    const { fold } = requireStateEvents();
    const sameTs = '2026-08-29T00:05:00.000Z';
    const events = [
      makeEvent({ story_id: 'STORY-FAKE-E3B-1', run_id: 'run-a', ts: sameTs }),
      makeEvent({ story_id: 'STORY-FAKE-E3B-2', run_id: 'run-b', ts: sameTs }),
    ];
    const result = fold(events);
    assert.ok(result.stories['STORY-FAKE-E3B-1'], 'first story (ts-shared) must be present');
    assert.ok(result.stories['STORY-FAKE-E3B-2'], 'second story sharing the same ts as the first must NOT be dropped by a ts-keyed dedupe');
  });

  test('a story bouncing to the SAME target state twice across two cycles is not collapsed by a (story_id,to)-keyed dedupe', () => {
    const { fold } = requireStateEvents();
    const id = 'STORY-FAKE-E3C';
    const events = [
      makeEvent({ story_id: id, run_id: 'run-1', from: null, to: 'Ready to Bounce', ts: '2026-08-29T00:00:00.000Z' }),
      makeEvent({ story_id: id, run_id: 'run-2', from: 'Ready to Bounce', to: 'Bouncing', ts: '2026-08-29T00:01:00.000Z' }),
      makeEvent({ story_id: id, run_id: 'run-3', from: 'Bouncing', to: 'QA Passed', ts: '2026-08-29T00:02:00.000Z' }),
      makeEvent({ story_id: id, run_id: 'run-4', from: 'QA Passed', to: 'Ready to Bounce', ts: '2026-08-29T00:03:00.000Z', reason: 'kicked back' }),
      // Same (story_id, to) pair as run-2 ('Bouncing') but a genuinely later, distinct event (real
      // second QA cycle) -- a (story_id,to)-keyed dedupe would wrongly discard this as "already
      // seen" and leave the fold stuck at 'Ready to Bounce' from run-4.
      makeEvent({ story_id: id, run_id: 'run-5', from: 'Ready to Bounce', to: 'Bouncing', ts: '2026-08-29T00:04:00.000Z' }),
    ];

    const result = fold(events);
    assert.strictEqual(
      result.stories[id].state,
      'Bouncing',
      'the second bounce cycle (run-5) must be applied -- a dedupe keyed on (story_id, to) instead of run_id would wrongly discard it as a duplicate of run-2'
    );
  });
});

// ---- CR-106 E4: schema conformance ----
describe('CR-106 E4: fold(events) output validates against state.schema.json (via validateState, unchanged by this CR)', () => {
  test('fold(events) produces a state object that passes validateState()', () => {
    const { fold } = requireStateEvents();
    const id = 'STORY-FAKE-E4';
    const events = [
      makeEvent({ story_id: id, run_id: 'run-1', ts: '2026-08-29T00:00:00.000Z' }),
      makeEvent({ story_id: id, run_id: 'run-2', from: 'Ready to Bounce', to: 'Bouncing', ts: '2026-08-29T00:05:00.000Z' }),
    ];
    const state = fold(events);
    const { valid, errors } = validateState(state);
    assert.ok(valid, `fold() output must validate against state.schema.json (via validateState, unchanged by this CR); errors: ${errors.join('; ')}`);
  });
});

// ---- CR-106 E5: legacy sprint immutability, keyed on CLOSED-ness (item § RESOLVED, not on the ----
// ---- mere absence of events.jsonl -- see CR-106_Execution_State_Event_Log.md's own resolution) --
describe('CR-106 E5: a CLOSED sprint (terminal sprint_status) is never rewritten by a transition attempt, and does not throw', () => {
  let tmpBase, stateFile, sprintDir;
  const ID = 'STORY-FAKE-CLOSED';

  before(() => {
    tmpBase = fs.mkdtempSync(path.join(os.tmpdir(), 'cg-cr106-e5-'));
    sprintDir = path.join(tmpBase, '.cleargate', 'sprint-runs', 'S-CLOSED-FAKE');
    fs.mkdirSync(sprintDir, { recursive: true });
    stateFile = path.join(sprintDir, 'state.json');
    // TERMINAL sprint_status -- 'Completed' is the literal value close_sprint.mjs Step 5 actually
    // writes (close_sprint.mjs:1044). No events.jsonl is seeded -- this IS the shape of every real
    // closed sprint today (SPRINT-03...SPRINT-38 all have state.json and no log). The item's own
    // § RESOLVED amendment: E5's predicate is sprint_status reaching its terminal value, NOT the
    // absence of events.jsonl (that proxy is what collided with the inherited migration addendum).
    writeStateJson(
      stateFile,
      makeState(
        { [ID]: makeStory('Done') },
        { schema_version: 3, execution_mode: undefined, sprint_status: 'Completed', sprint_id: 'S-CLOSED-FAKE' }
      )
    );
  });

  after(() => {
    fs.rmSync(tmpBase, { recursive: true, force: true });
  });

  test('a transition attempt against a closed sprint leaves state.json byte-for-byte unchanged, creates no events.jsonl, and does not crash', () => {
    const before = fs.readFileSync(stateFile, 'utf8');
    const eventsFile = path.join(sprintDir, 'events.jsonl');
    assert.ok(!fs.existsSync(eventsFile), 'precondition: no events.jsonl should exist yet');

    const env = { ...process.env, CLEARGATE_STATE_FILE: stateFile };
    // ID's story is already 'Done' (terminal); target a DIFFERENT state so a silent legacy-mutation
    // bug is not masked by an idempotent no-op on an unchanged value. update_state.mjs's own
    // VALID_STATES check (not STATE_TRANSITIONS) is the only membership guard today, so 'Bouncing'
    // is syntactically accepted and WOULD be applied by today's unmodified code -- this scenario is
    // therefore expected to be RED at QA-Red time; the guard it requires does not exist yet.
    const result = spawnSync(process.execPath, [path.join(SCRIPTS_DIR, 'update_state.mjs'), ID, 'Bouncing'], { encoding: 'utf8', env, timeout: 10000 });

    assert.notStrictEqual(result.status, null, 'invocation against a closed sprint must not hang');
    // "does not throw": this codebase's own convention for a handled, controlled refusal is
    // `process.stderr.write('Error: ...')` + `process.exit(N)` -- never a bare `throw` (every
    // existing error path in update_state.mjs follows this). A raw uncaught-exception stack trace
    // is recognisable by node's default reporter emitting a "\n    at " frame; a controlled
    // refusal does not.
    assert.ok(
      !/\n\s+at /.test(result.stderr),
      `a refusal on a closed sprint must be a controlled, reported error (stderr.write + exit), not ` +
      `an uncaught exception; stderr looked like a raw stack trace:\n${result.stderr}`
    );

    const after = fs.readFileSync(stateFile, 'utf8');
    assert.strictEqual(after, before, 'state.json for a CLOSED sprint must be byte-for-byte unchanged by any invocation against it');
    assert.ok(!fs.existsSync(eventsFile), 'no events.jsonl should be synthesised (no genesis-on-read) for a closed sprint either');
  });
});

// ---- CR-106 E6: atomic append ----
describe('CR-106 E6: N concurrent appendEvent() calls to the same events.jsonl produce no interleaved or truncated lines', () => {
  test('20 concurrent appendEvent() calls each contribute exactly one well-formed JSON line', { timeout: 30000 }, async () => {
    requireStateEvents(); // fail fast with a clear, informative message if state-events.mjs is absent
    const tmpBase = fs.mkdtempSync(path.join(os.tmpdir(), 'cg-cr106-e6-'));
    try {
      const sprintDir = path.join(tmpBase, '.cleargate', 'sprint-runs', 'S-FAKE');
      fs.mkdirSync(sprintDir, { recursive: true });
      const eventsFile = path.join(sprintDir, 'events.jsonl');
      fs.writeFileSync(eventsFile, '', 'utf8'); // pre-create empty, matching an init_sprint-seeded log

      const runnerPath = makeAppendEventRunnerFile(tmpBase);
      const N = 20;
      const runIds = Array.from({ length: N }, (_, i) => `run-e6-${String(i + 1).padStart(2, '0')}`);

      const results = await Promise.all(runIds.map((runId) => new Promise((resolve) => {
        const event = makeEvent({ story_id: `STORY-FAKE-E6-${runId}`, run_id: runId, ts: '2026-08-29T00:00:00.000Z' });
        const child = spawn(process.execPath, [runnerPath, eventsFile, JSON.stringify(event)]);
        let stderr = '';
        child.stderr.on('data', (d) => { stderr += d; });
        child.on('close', (status) => resolve({ status, stderr, runId }));
      })));

      for (const r of results) {
        assert.strictEqual(r.status, 0, `appendEvent runner for ${r.runId} should exit 0; stderr: ${r.stderr}`);
      }

      const raw = fs.readFileSync(eventsFile, 'utf8');
      const lines = raw.split('\n').filter((l) => l.length > 0);
      assert.strictEqual(lines.length, N, `expected exactly ${N} lines in events.jsonl, one per concurrent appendEvent() call; got ${lines.length} -- an interleaved or torn write would over/under-count`);

      const seenRunIds = new Set();
      for (const line of lines) {
        let parsed;
        assert.doesNotThrow(() => { parsed = JSON.parse(line); }, `every line must parse as standalone JSON (an interleaved write produces a line that fails to parse); offending line: ${line}`);
        seenRunIds.add(parsed.run_id);
      }
      assert.strictEqual(seenRunIds.size, N, `expected ${N} distinct run_ids, one per concurrent call; got ${seenRunIds.size} -- a collision means two writes landed on the same line`);
    } finally {
      fs.rmSync(tmpBase, { recursive: true, force: true });
    }
  });
});

// ---- CR-106 E7: byte compatibility with the current writer ----
describe('CR-106 E7: byte compatibility -- OLD path (real update_state.mjs, unmodified) vs NEW path (fold(events)) over an identical seed', () => {
  test('a real Done transition through the OLD writer, replayed as events through fold(), produces byte-identical state.json', () => {
    const { fold } = requireStateEvents();

    const tmpBase = fs.mkdtempSync(path.join(os.tmpdir(), 'cg-cr106-e7-'));
    try {
      const sprintDir = path.join(tmpBase, '.cleargate', 'sprint-runs', 'S-FAKE');
      fs.mkdirSync(sprintDir, { recursive: true });
      const stateFile = path.join(sprintDir, 'state.json');
      const ID = 'STORY-FAKE-E7';
      const FROZEN_ISO = '2026-08-29T12:00:00.000Z';

      const seedStory = makeStory('Ready to Bounce', { worktree: '/some/worktree/path' });
      writeStateJson(stateFile, makeState({ [ID]: seedStory }, { schema_version: 3, execution_mode: undefined, last_action: 'seed' }));
      const seedBytes = fs.readFileSync(stateFile, 'utf8');

      // OLD PATH: drive a real transition through TODAY's unmodified update_state.mjs, with time
      // frozen so its `new Date().toISOString()` calls are reproducible.
      const dateShimPath = makeFrozenDateShimFile(tmpBase, FROZEN_ISO);
      const oldPathResult = spawnSync(
        process.execPath,
        ['--import', pathToFileURL(dateShimPath).href, path.join(SCRIPTS_DIR, 'update_state.mjs'), ID, 'Done'],
        { encoding: 'utf8', env: { ...process.env, CLEARGATE_STATE_FILE: stateFile }, timeout: 10000 }
      );
      assert.strictEqual(oldPathResult.status, 0, `OLD-path golden run should exit 0; stderr: ${oldPathResult.stderr}`);
      const goldenBytes = fs.readFileSync(stateFile, 'utf8');
      assert.notStrictEqual(goldenBytes, seedBytes, 'sanity: the OLD-path run must actually have changed the file (Done sets worktree=null and state=Done)');

      // NEW PATH: the SAME transition, replayed as an event log, through the pure fold(). See the
      // makeEvent() docstring above for the GENESIS CONVENTION caveat -- the `initial:` payload on
      // the first event is QA-Red's own placeholder for information the documented event shape does
      // not carry, since fold() takes ONLY the event array (E8) and cannot source it from
      // state.json.
      const events = [
        makeEvent({
          story_id: ID, run_id: 'run-genesis', from: null, to: 'Ready to Bounce', ts: seedStory.updated_at,
          initial: { ...seedStory, state: undefined, updated_at: undefined },
        }),
        makeEvent({ story_id: ID, run_id: 'run-done', from: 'Ready to Bounce', to: 'Done', ts: FROZEN_ISO, actor: 'test', reason: null }),
      ];
      const folded = fold(events);
      const newPathBytes = JSON.stringify(folded, null, 2) + '\n';

      assert.strictEqual(
        newPathBytes,
        goldenBytes,
        `fold(events) must be byte-identical to the OLD path's real output for the same transition.\n` +
        `--- golden (OLD path) ---\n${goldenBytes}\n--- fold (NEW path) ---\n${newPathBytes}`
      );
    } finally {
      fs.rmSync(tmpBase, { recursive: true, force: true });
    }
  });
});

// ---- CR-106 E8: the vacuity mutant ----
describe('CR-106 E8: the vacuity mutant -- fold(events) must read NOTHING but the event array', () => {
  test('fold(events) output does not reflect an unrelated, pre-existing state.json even when one is reachable via CLEARGATE_STATE_FILE/cwd', () => {
    const { fold } = requireStateEvents();
    const tmpBase = fs.mkdtempSync(path.join(os.tmpdir(), 'cg-cr106-e8-'));
    const prevEnv = process.env.CLEARGATE_STATE_FILE;
    const prevCwd = process.cwd();
    try {
      const sprintDir = path.join(tmpBase, '.cleargate', 'sprint-runs', 'S-FAKE');
      fs.mkdirSync(sprintDir, { recursive: true });
      const decoyStateFile = path.join(sprintDir, 'state.json');
      // A decoy story that appears ONLY in this on-disk file, never in the events array below. A
      // fold() that (illegitimately) reads state.json and merges into it would leak this story into
      // its output; a fold() that is truly pure over its argument cannot see it at all.
      writeStateJson(decoyStateFile, makeState(
        { 'STORY-DECOY-NOT-IN-EVENTS': makeStory('Done') },
        { schema_version: 3, execution_mode: undefined, last_action: 'DECOY -- must never appear in fold output' }
      ));

      // Point the SAME env var update_state.mjs uses to resolve state.json at the decoy, and ALSO
      // chdir so a cwd-relative convention would find it too -- covers both plausible "sneaky"
      // discovery mechanisms a vacuity-mutant fold() might use, since fold()'s own declared
      // signature (per the item's Task Breakdown: "fold() takes ONLY the event array") accepts no
      // path argument at all.
      process.env.CLEARGATE_STATE_FILE = decoyStateFile;
      process.chdir(sprintDir);

      const events = [
        makeEvent({ story_id: 'STORY-FAKE-E8', run_id: 'run-1', ts: '2026-08-29T00:00:00.000Z' }),
      ];
      const result = fold(events);

      assert.ok(
        !result.stories['STORY-DECOY-NOT-IN-EVENTS'],
        'fold(events) output must NOT contain a story that exists only in an unrelated on-disk ' +
        'state.json -- its presence means fold() read state.json (directly or via ' +
        'CLEARGATE_STATE_FILE/cwd) and merged into it, reintroducing the exact read-modify-write ' +
        'race this CR removes'
      );
      assert.notStrictEqual(
        result.last_action,
        'DECOY -- must never appear in fold output',
        'fold(events) must not inherit last_action from an unrelated on-disk state.json'
      );
    } finally {
      process.chdir(prevCwd);
      if (prevEnv === undefined) delete process.env.CLEARGATE_STATE_FILE;
      else process.env.CLEARGATE_STATE_FILE = prevEnv;
      fs.rmSync(tmpBase, { recursive: true, force: true });
    }
  });

  test('static check: state-events.mjs reads a file via readFileSync only for events.jsonl, never for state.json', () => {
    const modulePath = path.join(SCRIPTS_DIR, 'state-events.mjs');
    assert.ok(fs.existsSync(modulePath), `expected ${modulePath} to exist -- not yet created (CR-106 not yet implemented)`);
    const src = fs.readFileSync(modulePath, 'utf8');
    const readCalls = src.split('\n')
      .map((line, i) => ({ line, num: i + 1 }))
      .filter(({ line }) => /readFileSync/.test(line));
    const suspicious = readCalls.filter(({ line }) => /stateFile|state\.json|state_json|statePath/i.test(line) && !/events?\.jsonl/i.test(line));
    assert.strictEqual(
      suspicious.length,
      0,
      `state-events.mjs must never readFileSync anything that looks like state.json -- found: ` +
      `${suspicious.map((h) => `:${h.num} ${h.line.trim()}`).join(' | ')}`
    );
  });
});

// ---- CR-106 E9: eviction, both halves ----
describe('CR-106 E9: eviction -- update_state.mjs must route ALL state.json writes through the fold, none through the old read-modify-write', () => {
  test('grep 1: readFileSync(...stateFile...) is fully evicted from update_state.mjs', () => {
    const src = fs.readFileSync(path.join(SCRIPTS_DIR, 'update_state.mjs'), 'utf8');
    const hits = src.split('\n')
      .map((line, i) => ({ line, num: i + 1 }))
      .filter(({ line }) => /readFileSync.*stateFile/.test(line));
    assert.strictEqual(
      hits.length,
      0,
      `expected ZERO "readFileSync(...stateFile...)" call sites in update_state.mjs -- the read-modify-write ` +
      `must be gone entirely, not merely guarded. Found ${hits.length}: ${hits.map((h) => `:${h.num} ${h.line.trim()}`).join(' | ')}`
    );
  });

  test("grep 2: atomicWrite(stateFile is fully evicted from the action/migration branches -- only the fold's own call site remains", () => {
    const src = fs.readFileSync(path.join(SCRIPTS_DIR, 'update_state.mjs'), 'utf8');
    // Excludes the `function atomicWrite(stateFile, state) {` DEFINITION line -- that line is
    // retained deliberately (the item keeps atomicWrite as the fold's output writer) and is not a
    // call site; only CALL sites (`atomicWrite(stateFile, state);`) are eviction targets.
    const hits = src.split('\n')
      .map((line, i) => ({ line, num: i + 1 }))
      .filter(({ line }) => /atomicWrite\(stateFile/.test(line) && !/function\s+atomicWrite/.test(line));
    // BASELINE (measured 2026-08-29, matches BUG-044 post-flight): SEVEN call sites today -- :241,
    // :247 (the two migration writes) and :280, :301, :318, :335, :366 (the five action branches).
    // After CR-106, exactly ONE call site should remain -- the fold's own write.
    assert.strictEqual(
      hits.length,
      1,
      `expected exactly ONE "atomicWrite(stateFile" call site after CR-106 (the fold's own write) -- ` +
      `found ${hits.length}: ${hits.map((h) => `:${h.num} ${h.line.trim()}`).join(' | ')}. Baseline today ` +
      `(pre-CR-106, measured) is 7: the migration writes at :241/:247 plus the five action-branch ` +
      `writes at :280/:301/:318/:335/:366 -- all seven must collapse into the fold's single call site.`
    );
  });
});
