// The per-wave full suite (run_wave_suite.mjs) and the close check (close_sprint.mjs Step 2.75).
// Hermetic: temp git repos under os.tmpdir(), copied scripts, a stub suite command, scrubbed child env.
// This checkout's own scripts and sprint files are never run on.
// Run: node --test '.cleargate/scripts/test/*.node.test.mjs'
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SCRIPTS_SRC = path.resolve(HERE, '..');
const SPRINT = 'SPRINT-90';
const SPRINT_BRANCH = 'sprint/S-90';
const ITEM = 'STORY-901-01';

/** process.env without ClearGate's, the orchestrator's, Claude's or git's own variables. */
function scrubbedEnv(extra) {
  const env = { ...process.env };
  for (const k of Object.keys(env)) {
    if (/^(CLEARGATE_|ORCHESTRATOR_|CLAUDE_|RUN_SCRIPT|GIT_)/.test(k) || k === 'NODE_TEST_CONTEXT') delete env[k];
  }
  return { ...env, ...extra };
}

function sh(cwd, args) {
  const r = spawnSync('git', ['-c', 'core.hooksPath=/dev/null', '-c', 'commit.gpgsign=false', ...args], {
    cwd, encoding: 'utf8', env: scrubbedEnv({}),
  });
  assert.equal(r.status, 0, `git ${args.join(' ')}: ${r.stderr}`);
  return r.stdout.trim();
}

function write(file, text) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, text);
}

/** A temp repo on the sprint branch whose qa.test is a stub that prints TAP for STUB_MODE and records each run. */
function makeSprintRepo({ scopesOn = true, branch = SPRINT_BRANCH, baselineFailing = null, storyState = 'Architect Passed' } = {}) {
  const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'cg-wave-suite-')));
  const marks = path.join(root, '..', `${path.basename(root)}-marks.txt`);
  const stub = path.join(root, 'stub.mjs');
  sh(root, ['init', '-q', '-b', 'main']);
  sh(root, ['config', 'user.name', 't']);
  sh(root, ['config', 'user.email', 't@example.invalid']);
  sh(root, ['config', 'commit.gpgsign', 'false']);
  sh(root, ['config', 'core.hooksPath', '/dev/null']);
  fs.cpSync(SCRIPTS_SRC, path.join(root, '.cleargate', 'scripts'), {
    recursive: true,
    filter: (src) => src !== path.join(SCRIPTS_SRC, 'test'),
  });
  write(stub, [
    "import fs from 'node:fs';",
    "fs.appendFileSync(process.env.MARKS_FILE, 'full\\n');",
    "const mode = process.env.STUB_MODE || 'pass';",
    "if (mode === 'baseline') { console.log('not ok 1 - known'); process.exit(1); }",
    "if (mode === 'new') { console.log('not ok 1 - known'); console.log('not ok 2 - fresh'); process.exit(1); }",
    '',
  ].join('\n'));
  const qa = { typecheck: '', debug_patterns: [], todo_patterns: [], test: `node "${stub}"` };
  if (scopesOn) qa.test_scopes = [{ name: 'all', paths: ['**'], command: `node "${stub}"` }];
  write(path.join(root, '.cleargate', 'scripts', 'gate-checks.json'), JSON.stringify({
    schema_version: 1, qa, arch: {}, merge: { prebuild: '', post_test: `node "${stub}"` }, proof: {},
  }, null, 2));
  write(path.join(root, 'README.txt'), 'base\n');
  sh(root, ['add', '-A']);
  sh(root, ['commit', '-q', '-m', 'base']);
  sh(root, ['checkout', '-q', '-b', branch]);
  const sprintDir = path.join(root, '.cleargate', 'sprint-runs', SPRINT);
  const now = new Date().toISOString();
  write(path.join(sprintDir, 'state.json'), JSON.stringify({
    schema_version: 3, sprint_id: SPRINT, sprint_status: 'Active',
    stories: { [ITEM]: { state: storyState, qa_bounces: 0, arch_bounces: 0, worktree: null, updated_at: now, notes: '', lane: 'standard', lane_assigned_by: 'migration-default', lane_executed_re_scope: false } },
    last_action: 't', updated_at: now,
  }));
  write(path.join(root, '.cleargate', 'sprint-runs', '.active'), `${SPRINT}\n`);
  if (baselineFailing) {
    write(path.join(sprintDir, 'baseline.json'), JSON.stringify({
      sprint_id: SPRINT, base_sha: 'x', command: 'x', exit_code: 1, failing: baselineFailing, tail: [], recorded_at: now,
    }));
  }
  const env = scrubbedEnv({ ORCHESTRATOR_PROJECT_DIR: root, MARKS_FILE: marks, CLEARGATE_SPRINT_DIR: sprintDir });
  return {
    root, sprintDir, env, marks,
    head: () => sh(root, ['rev-parse', 'HEAD']),
    runs: () => (fs.existsSync(marks) ? fs.readFileSync(marks, 'utf8').split('\n').filter(Boolean).length : 0),
    rows: () => {
      const f = path.join(sprintDir, 'wave-suite.jsonl');
      return fs.existsSync(f) ? fs.readFileSync(f, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l)) : [];
    },
    cleanup: () => { fs.rmSync(marks, { force: true }); fs.rmSync(root, { recursive: true, force: true }); },
  };
}

function runWave(fx, wave, mode, args = [SPRINT, String(wave)]) {
  const r = spawnSync('node', [path.join(fx.root, '.cleargate', 'scripts', 'run_wave_suite.mjs'), ...args], {
    cwd: fx.root, env: { ...fx.env, STUB_MODE: mode }, encoding: 'utf8', timeout: 120_000,
  });
  let out = {};
  try { out = JSON.parse(r.stdout.trim().split('\n').pop()); } catch { /* leave empty */ }
  return { status: r.status, out, text: `${r.stdout}\n${r.stderr}` };
}

test('run_wave_suite: runs the full suite once per call, excuses baseline-only failures and fails on a new one', () => {
  const fx = makeSprintRepo({ baselineFailing: ['known'] });
  try {
    const sha = fx.head();
    const pass = runWave(fx, 2, 'pass');
    assert.equal(pass.status, 0, pass.text);
    assert.equal(fx.runs(), 1, 'the suite ran once');
    const baselineOnly = runWave(fx, 2, 'baseline');
    assert.equal(baselineOnly.status, 0, baselineOnly.text);
    const fresh = runWave(fx, 2, 'new');
    assert.equal(fresh.status, 1, fresh.text);
    assert.match(fresh.text, /new failure: fresh/);
    const rows = fx.rows();
    assert.equal(rows.length, 3, 'one row per run');
    assert.deepEqual(rows.map((r) => r.status), ['pass', 'excused', 'fail']);
    for (const r of rows) {
      assert.equal(r.sha, sha);
      assert.equal(String(r.wave), '2');
      assert.equal(typeof r.duration_ms, 'number');
    }
    assert.deepEqual(rows[2].new_failures, ['fresh']);
    assert.ok(rows[2].failing.includes('known'));
    assert.deepEqual(fresh.out, rows[2], 'stdout is the row');
  } finally { fx.cleanup(); }
});

test('run_wave_suite: with no scopes it skips without a row; off the sprint branch, or with bad usage, it exits 2 without a row', () => {
  const off = makeSprintRepo({ scopesOn: false });
  try {
    const r = runWave(off, 1, 'pass');
    assert.equal(r.status, 0, r.text);
    assert.equal(r.out.status, 'skipped');
    assert.equal(off.runs(), 0);
    assert.deepEqual(off.rows(), []);
  } finally { off.cleanup(); }
  const wrong = makeSprintRepo({ branch: 'other/branch' });
  try {
    const r = runWave(wrong, 1, 'pass');
    assert.equal(r.status, 2, r.text);
    assert.match(r.text, /not sprint\/S-90/);
    for (const args of [[], [SPRINT], ['not-a-sprint', '1']]) {
      const u = runWave(wrong, 1, 'pass', args);
      assert.equal(u.status, 2, `usage ${JSON.stringify(args)}: ${u.text}`);
    }
    assert.equal(wrong.runs(), 0);
    assert.deepEqual(wrong.rows(), []);
  } finally { wrong.cleanup(); }
});

test('run_wave_suite: authored changes in the checkout exit 2 without running the suite', () => {
  const fx = makeSprintRepo();
  try {
    fs.appendFileSync(path.join(fx.root, 'README.txt'), 'local edit\n');
    const r = runWave(fx, 1, 'pass');
    assert.equal(r.status, 2, r.text);
    assert.match(r.text, /authored changes in the checkout/);
    assert.equal(fx.runs(), 0);
    assert.deepEqual(fx.rows(), []);
  } finally { fx.cleanup(); }
});

async function loadWaveModule(fx) {
  return import(pathToFileURL(path.join(fx.root, '.cleargate', 'scripts', 'run_wave_suite.mjs')).href);
}

test('closeWaveCheck: a passing HEAD row skips the run; a failing HEAD row refuses without a rerun; no row runs once as the close run', async () => {
  const row = (sha, extra) => `${JSON.stringify({
    wave: 1, sha, status: 'pass', exit: 0, failing: [], new_failures: [], reason: 'passed', duration_ms: 1, recorded_at: new Date().toISOString(), ...extra,
  })}\n`;
  const passed = makeSprintRepo();
  try {
    write(path.join(passed.sprintDir, 'wave-suite.jsonl'), row(passed.head()));
    const { closeWaveCheck } = await loadWaveModule(passed);
    const res = closeWaveCheck({ root: passed.root, sprintId: SPRINT, sprintDir: passed.sprintDir, env: { ...passed.env, STUB_MODE: 'pass' } });
    assert.equal(res.ok, true);
    assert.equal(res.skipped, false);
    assert.equal(passed.runs(), 0);
  } finally { passed.cleanup(); }
  const failed = makeSprintRepo();
  try {
    write(path.join(failed.sprintDir, 'wave-suite.jsonl'), row(failed.head(), { status: 'fail', exit: 1, new_failures: ['fresh'], reason: 'new-failures' }));
    const { closeWaveCheck } = await loadWaveModule(failed);
    const res = closeWaveCheck({ root: failed.root, sprintId: SPRINT, sprintDir: failed.sprintDir, env: { ...failed.env, STUB_MODE: 'pass' } });
    assert.equal(res.ok, false);
    assert.match(res.lines.join('\n'), /new failures: fresh/);
    assert.match(res.lines.join('\n'), /run_wave_suite\.mjs SPRINT-90 close/);
    assert.equal(failed.runs(), 0, 'no automatic rerun');
  } finally { failed.cleanup(); }
  const good = makeSprintRepo();
  try {
    const { closeWaveCheck } = await loadWaveModule(good);
    const res = closeWaveCheck({ root: good.root, sprintId: SPRINT, sprintDir: good.sprintDir, env: { ...good.env, STUB_MODE: 'pass' } });
    assert.equal(res.ok, true);
    assert.equal(good.runs(), 1);
    const rows = good.rows();
    assert.equal(rows.length, 1);
    assert.equal(String(rows[0].wave), 'close');
    assert.equal(rows[0].sha, good.head());
  } finally { good.cleanup(); }
  const bad = makeSprintRepo();
  try {
    const { closeWaveCheck } = await loadWaveModule(bad);
    const res = closeWaveCheck({ root: bad.root, sprintId: SPRINT, sprintDir: bad.sprintDir, env: { ...bad.env, STUB_MODE: 'new' } });
    assert.equal(res.ok, false);
    assert.equal(bad.runs(), 1);
  } finally { bad.cleanup(); }
  const off = makeSprintRepo({ scopesOn: false });
  try {
    const { closeWaveCheck } = await loadWaveModule(off);
    const res = closeWaveCheck({ root: off.root, sprintId: SPRINT, sprintDir: off.sprintDir, env: { ...off.env, STUB_MODE: 'new' } });
    assert.equal(res.ok, true);
    assert.equal(res.skipped, true);
    assert.equal(off.runs(), 0);
  } finally { off.cleanup(); }
});

test('close_sprint: refuses before the merge into main when the close run has a new failure', () => {
  const fx = makeSprintRepo({ storyState: 'Done' });
  try {
    const sha = fx.head();
    const r = spawnSync('node', [path.join(fx.root, '.cleargate', 'scripts', 'close_sprint.mjs'), SPRINT], {
      cwd: fx.root, encoding: 'utf8', timeout: 180_000,
      env: {
        ...fx.env, STUB_MODE: 'new', CLEARGATE_REPO_ROOT: fx.root, CLEARGATE_SKIP_WORKTREE_CHECK: '1',
        CLEARGATE_FORCE_MERGE_STATUS: 'merged', CLEARGATE_SKIP_LIFECYCLE_CHECK: '1',
        CLEARGATE_SKIP_DEFERRED_VERIFY_CHECK: '1', CLEARGATE_SKIP_BUNDLE_CHECK: '1', CLEARGATE_SKIP_DOC_REFRESH: '1',
      },
    });
    assert.equal(r.status, 1, `${r.stdout}\n${r.stderr}`);
    assert.match(r.stderr, /Step 2\.75 failed: no passing wave suite for/);
    assert.ok(r.stderr.includes(sha.slice(0, 7)), 'names the sprint HEAD sha');
    assert.doesNotMatch(r.stdout, /Step 2\.8/);
    assert.equal(fx.runs(), 1, 'the close run happened once');
  } finally { fx.cleanup(); }
});

test('close_sprint: without qa.test_scopes Step 2.75 is skipped and the close goes on to Step 2.8', () => {
  // A forced `unmerged` verdict stops the close at Step 2.8, so nothing after it runs.
  const fx = makeSprintRepo({ storyState: 'Done', scopesOn: false });
  try {
    const r = spawnSync('node', [path.join(fx.root, '.cleargate', 'scripts', 'close_sprint.mjs'), SPRINT], {
      cwd: fx.root, encoding: 'utf8', timeout: 180_000,
      env: {
        ...fx.env, CLEARGATE_REPO_ROOT: fx.root, CLEARGATE_SKIP_WORKTREE_CHECK: '1',
        CLEARGATE_FORCE_MERGE_STATUS: 'unmerged', CLEARGATE_SKIP_LIFECYCLE_CHECK: '1',
        CLEARGATE_SKIP_DEFERRED_VERIFY_CHECK: '1', CLEARGATE_SKIP_BUNDLE_CHECK: '1', CLEARGATE_SKIP_DOC_REFRESH: '1',
      },
    });
    assert.match(r.stdout, /Step 2\.75 skipped: qa\.test_scopes is not configured\./, `${r.stdout}\n${r.stderr}`);
    assert.match(`${r.stdout}\n${r.stderr}`, /Step 2\.8/);
    assert.equal(r.status, 1, 'the forced unmerged verdict stops the close at Step 2.8');
    assert.equal(fx.runs(), 0);
  } finally { fx.cleanup(); }
});
