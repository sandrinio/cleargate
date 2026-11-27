// close Step 2.75 keeps a passing wave-suite row valid across commits that select no test scope, and
// run_wave_suite.mjs ignores tracked changes that select no scope.
// Hermetic: temp git repos under os.tmpdir(), copied scripts, a stub suite command, scrubbed child env.
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

/** A temp repo on the sprint branch with one scope (`scopePaths`) whose qa.test stub records each run. */
function makeRepo({ scopePaths = ['**'] } = {}) {
  const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'cg-close-wave-')));
  const marks = path.join(root, '..', `${path.basename(root)}-marks.txt`);
  const stub = path.join(root, '..', `${path.basename(root)}-stub.mjs`);
  sh(root, ['init', '-q', '-b', 'main']);
  sh(root, ['config', 'user.name', 't']);
  sh(root, ['config', 'user.email', 't@example.invalid']);
  sh(root, ['config', 'commit.gpgsign', 'false']);
  sh(root, ['config', 'core.hooksPath', '/dev/null']);
  fs.cpSync(SCRIPTS_SRC, path.join(root, '.cleargate', 'scripts'), {
    recursive: true,
    filter: (src) => src !== path.join(SCRIPTS_SRC, 'test'),
  });
  write(stub, "import fs from 'node:fs';\nfs.appendFileSync(process.env.MARKS_FILE, 'full\\n');\n");
  const qa = {
    typecheck: '', debug_patterns: [], todo_patterns: [], test: `node "${stub}"`,
    test_scopes: [{ name: 'suite', paths: scopePaths, command: `node "${stub}"` }],
  };
  write(path.join(root, '.cleargate', 'scripts', 'gate-checks.json'), JSON.stringify({
    schema_version: 1, qa, arch: {}, merge: { prebuild: '', post_test: `node "${stub}"` }, proof: {},
  }, null, 2));
  write(path.join(root, 'src', 'app.txt'), 'base\n');
  write(path.join(root, 'api', 'README.md'), 'base\n');
  write(path.join(root, '.cleargate', 'delivery', 'pending-sync', 'ITEM.md'), 'base\n');
  write(path.join(root, '.cleargate', 'knowledge', 'x.md'), 'base\n');
  sh(root, ['add', '-A']);
  sh(root, ['commit', '-q', '-m', 'base']);
  sh(root, ['checkout', '-q', '-b', SPRINT_BRANCH]);
  const sprintDir = path.join(root, '.cleargate', 'sprint-runs', SPRINT);
  const now = new Date().toISOString();
  write(path.join(sprintDir, 'state.json'), JSON.stringify({
    schema_version: 3, sprint_id: SPRINT, sprint_status: 'Active',
    stories: { [ITEM]: { state: 'Done', qa_bounces: 0, arch_bounces: 0, worktree: null, updated_at: now, notes: '', lane: 'standard', lane_assigned_by: 'migration-default', lane_executed_re_scope: false } },
    last_action: 't', updated_at: now,
  }));
  write(path.join(root, '.cleargate', 'sprint-runs', '.active'), `${SPRINT}\n`);
  const env = scrubbedEnv({ ORCHESTRATOR_PROJECT_DIR: root, MARKS_FILE: marks, CLEARGATE_SPRINT_DIR: sprintDir });
  return {
    root, sprintDir, env,
    head: () => sh(root, ['rev-parse', 'HEAD']),
    commit: (rel, text, msg = 'c') => {
      write(path.join(root, rel), text);
      sh(root, ['add', '-A', '--', rel]);
      sh(root, ['commit', '-q', '-m', msg]);
      return sh(root, ['rev-parse', 'HEAD']);
    },
    row: (sha, status) => {
      fs.appendFileSync(path.join(sprintDir, 'wave-suite.jsonl'), `${JSON.stringify({
        wave: 1, sha, status, exit: status === 'fail' ? 1 : 0, failing: [], new_failures: [], reason: status, duration_ms: 1, recorded_at: new Date().toISOString(),
      })}\n`);
    },
    runs: () => (fs.existsSync(marks) ? fs.readFileSync(marks, 'utf8').split('\n').filter(Boolean).length : 0),
    rows: () => {
      const f = path.join(sprintDir, 'wave-suite.jsonl');
      return fs.existsSync(f) ? fs.readFileSync(f, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l)) : [];
    },
    cleanup: () => {
      fs.rmSync(marks, { force: true });
      fs.rmSync(stub, { force: true });
      fs.rmSync(root, { recursive: true, force: true });
    },
  };
}

async function closeCheck(fx) {
  const mod = await import(pathToFileURL(path.join(fx.root, '.cleargate', 'scripts', 'run_wave_suite.mjs')).href);
  return mod.closeWaveCheck({ root: fx.root, sprintId: SPRINT, sprintDir: fx.sprintDir, env: fx.env });
}

function runWave(fx) {
  const r = spawnSync('node', [path.join(fx.root, '.cleargate', 'scripts', 'run_wave_suite.mjs'), SPRINT, '2'], {
    cwd: fx.root, env: fx.env, encoding: 'utf8', timeout: 120_000,
  });
  return { status: r.status, text: `${r.stdout}\n${r.stderr}` };
}

test('a doc-refresh commit after a passing row does not re-run the suite, even with close writes uncommitted', async () => {
  const fx = makeRepo();
  try {
    fx.row(fx.head(), 'pass');
    fx.commit('.cleargate/knowledge/x.md', 'refreshed\n', 'doc refresh');
    write(path.join(fx.root, '.cleargate', 'delivery', 'pending-sync', 'ITEM.md'), 'close wrote this\n');
    const res = await closeCheck(fx);
    assert.equal(res.ok, true);
    assert.equal(res.skipped, false);
    assert.equal(fx.runs(), 0, 'the suite did not run');
  } finally { fx.cleanup(); }
});

test('close_sprint Step 2.75 names the covering row and the paths since', () => {
  // A forced `unmerged` verdict stops the close at Step 2.8, so nothing after it runs.
  const fx = makeRepo();
  try {
    const a = fx.head();
    fx.row(a, 'pass');
    fx.commit('.cleargate/knowledge/x.md', 'refreshed\n', 'doc refresh');
    const r = spawnSync('node', [path.join(fx.root, '.cleargate', 'scripts', 'close_sprint.mjs'), SPRINT], {
      cwd: fx.root, encoding: 'utf8', timeout: 180_000,
      env: {
        ...fx.env, CLEARGATE_REPO_ROOT: fx.root, CLEARGATE_SKIP_WORKTREE_CHECK: '1',
        CLEARGATE_FORCE_MERGE_STATUS: 'unmerged', CLEARGATE_SKIP_LIFECYCLE_CHECK: '1',
        CLEARGATE_SKIP_DEFERRED_VERIFY_CHECK: '1', CLEARGATE_SKIP_BUNDLE_CHECK: '1', CLEARGATE_SKIP_DOC_REFRESH: '1',
      },
    });
    const out = `${r.stdout}\n${r.stderr}`;
    assert.equal(fx.runs(), 0, out);
    assert.match(r.stdout, /Step 2\.75 passed: .*covered by the passing row for/, out);
    assert.ok(out.includes(a), `names the covering row sha: ${out}`);
    assert.ok(out.includes('.cleargate/knowledge/x.md'), `names the paths since: ${out}`);
  } finally { fx.cleanup(); }
});

test('a commit under a suite path after the row still needs one close run', async () => {
  const fx = makeRepo();
  try {
    fx.row(fx.head(), 'pass');
    fx.commit('src/app.txt', 'changed\n', 'code');
    const res = await closeCheck(fx);
    assert.equal(res.ok, true);
    assert.equal(fx.runs(), 1);
    assert.equal(String(fx.rows().at(-1).wave), 'close');
  } finally { fx.cleanup(); }
});

test('a markdown file under a suite path since the row selects no scope, so the row still covers HEAD', async () => {
  const fx = makeRepo({ scopePaths: ['api/**'] });
  try {
    fx.row(fx.head(), 'pass');
    fx.commit('api/README.md', 'docs\n', 'readme');
    const res = await closeCheck(fx);
    assert.equal(res.ok, true);
    assert.equal(fx.runs(), 0);
  } finally { fx.cleanup(); }
});

test('a failing ancestor row, a non-ancestor passing row and an unknown sha never cover HEAD', async () => {
  const failing = makeRepo();
  try {
    failing.row(failing.head(), 'fail');
    failing.commit('.cleargate/knowledge/x.md', 'refreshed\n');
    await closeCheck(failing);
    assert.equal(failing.runs(), 1, 'a failing row does not cover');
  } finally { failing.cleanup(); }
  const other = makeRepo();
  try {
    sh(other.root, ['checkout', '-q', '-b', 'side', 'main']);
    const side = other.commit('.cleargate/knowledge/side.md', 'side\n', 'side');
    sh(other.root, ['checkout', '-q', SPRINT_BRANCH]);
    other.commit('.cleargate/knowledge/x.md', 'refreshed\n');
    other.row(side, 'pass');
    await closeCheck(other);
    assert.equal(other.runs(), 1, 'a non-ancestor row does not cover');
  } finally { other.cleanup(); }
  const unknown = makeRepo();
  try {
    unknown.row('0123456789abcdef0123456789abcdef01234567', 'pass');
    unknown.commit('.cleargate/knowledge/x.md', 'refreshed\n');
    await closeCheck(unknown);
    assert.equal(unknown.runs(), 1, 'a git error is not an ancestor');
  } finally { unknown.cleanup(); }
});

test('run_wave_suite ignores tracked no-scope dirt, and refuses with exit 2 naming a tracked file under a suite path', () => {
  const fx = makeRepo();
  try {
    write(path.join(fx.root, '.cleargate', 'delivery', 'pending-sync', 'ITEM.md'), 'close wrote this\n');
    const ok = runWave(fx);
    assert.equal(ok.status, 0, ok.text);
    assert.equal(fx.runs(), 1);
    assert.equal(fx.rows().length, 1);
    write(path.join(fx.root, 'src', 'app.txt'), 'dirty\n');
    const refused = runWave(fx);
    assert.equal(refused.status, 2, refused.text);
    assert.ok(refused.text.includes('src/app.txt'), refused.text);
    assert.equal(fx.runs(), 1, 'no second run');
  } finally { fx.cleanup(); }
});
