// qa.test_scopes: scope merge tests to the suites a change touches (lib/test-scope.mjs, merge_story.mjs,
// pre_gate_runner.sh, record_evidence.mjs).
// Hermetic: temp git repos under os.tmpdir(), stub suite commands, scrubbed child env. The scripts under
// test are COPIED into the temp repo and spawned from there; this checkout's scripts are never run on itself.
// Run: node --test '.cleargate/scripts/test/*.node.test.mjs'
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SCRIPTS_SRC = path.resolve(HERE, '..');
const SPRINT = 'SPRINT-90';
const SPRINT_BRANCH = 'sprint/S-90';
const ITEM = 'STORY-901-01';

const SCOPES = [
  { name: 'api', paths: ['api/**', 'shared/**'], command: 'RUN_API' },
  { name: 'web', paths: ['web/**', 'shared/**'], command: 'RUN_WEB' },
];

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

/** A temp sprint repo with copied scripts, a stub command runner and one story worktree changing `changed`. */
function makeFixture({ changed, gate, baseline = null, itemTier = null }) {
  const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'cg-test-scope-')));
  const marks = path.join(root, '..', `${path.basename(root)}-marks.txt`);
  const stub = path.join(root, 'stub.mjs');
  const stubCmd = (name, mode = '') => `node "${stub}" ${name} ${mode}`.trim();
  sh(root, ['init', '-q', '-b', 'main']);
  sh(root, ['config', 'user.name', 't']);
  sh(root, ['config', 'user.email', 't@example.invalid']);
  sh(root, ['config', 'commit.gpgsign', 'false']);
  sh(root, ['config', 'core.hooksPath', '/dev/null']);
  fs.cpSync(SCRIPTS_SRC, path.join(root, '.cleargate', 'scripts'), {
    recursive: true,
    filter: (src) => src !== path.join(SCRIPTS_SRC, 'test'),
  });
  // The stub records each run; `flaky-first` fails the first run of the fixture and passes later ones.
  write(stub, [
    "import fs from 'node:fs';",
    'const [name, mode] = process.argv.slice(2);',
    'const f = process.env.MARKS_FILE;',
    "const prior = fs.existsSync(f) ? fs.readFileSync(f, 'utf8').split('\\n').filter(Boolean).length : 0;",
    "fs.appendFileSync(f, name + '\\n');",
    "if (mode === 'flaky-first' && prior === 0) { console.log('not ok 1 - flaky'); process.exit(1); }",
    '',
  ].join('\n'));
  const scopes = gate.scopes === undefined ? undefined : gate.scopes.map((s) => ({ ...s, command: stubCmd(s.name) }));
  const qa = { typecheck: '', debug_patterns: [], todo_patterns: [], test: stubCmd('full', gate.mode) };
  if (scopes !== undefined) qa.test_scopes = scopes;
  if (gate.rawScopes !== undefined) qa.test_scopes = gate.rawScopes;
  write(path.join(root, '.cleargate', 'scripts', 'gate-checks.json'), JSON.stringify({
    schema_version: 1, qa,
    arch: {}, merge: { prebuild: '', post_test: stubCmd('full', gate.mode) },
    proof: { unit: stubCmd('proofunit'), container: stubCmd('proofcontainer') },
  }, null, 2));
  write(path.join(root, 'api', 'src', 'a.ts'), 'export const a = 1;\n');
  write(path.join(root, 'web', 'src', 'b.tsx'), 'export const b = 1;\n');
  write(path.join(root, 'shared', 'schema.json'), '{}\n');
  write(path.join(root, 'docs', 'old.md'), '# old\n');
  if (itemTier) {
    write(path.join(root, '.cleargate', 'delivery', 'pending-sync', `${ITEM}_item.md`),
      `---\nstory_id: ${ITEM}\nproof_tier: ${itemTier}\n---\n\n# ${ITEM}\n`);
  }
  sh(root, ['add', '-A']);
  sh(root, ['commit', '-q', '-m', 'base']);
  sh(root, ['checkout', '-q', '-b', SPRINT_BRANCH]);
  const wt = path.join(root, '.worktrees', ITEM);
  sh(root, ['worktree', 'add', '-q', '-b', `story/${ITEM}`, wt, SPRINT_BRANCH]);
  for (const rel of changed) write(path.join(wt, rel), `changed ${rel}\n`);
  sh(wt, ['add', '-A']);
  sh(wt, ['commit', '-q', '-m', 'story change']);
  const sprintDir = path.join(root, '.cleargate', 'sprint-runs', SPRINT);
  const now = new Date().toISOString();
  write(path.join(sprintDir, 'state.json'), JSON.stringify({
    schema_version: 3, sprint_id: SPRINT, sprint_status: 'Active',
    stories: { [ITEM]: { state: 'Architect Passed', qa_bounces: 0, arch_bounces: 0, worktree: null, updated_at: now, notes: '', lane: 'standard', lane_assigned_by: 'migration-default', lane_executed_re_scope: false } },
    last_action: 't', updated_at: now,
  }));
  write(path.join(root, '.cleargate', 'sprint-runs', '.active'), `${SPRINT}\n`);
  if (baseline) write(path.join(sprintDir, 'baseline.json'), JSON.stringify(baseline));
  const env = scrubbedEnv({ ORCHESTRATOR_PROJECT_DIR: root, MARKS_FILE: marks, CLEARGATE_SPRINT_DIR: sprintDir });
  const readMarks = () => (fs.existsSync(marks) ? fs.readFileSync(marks, 'utf8').split('\n').filter(Boolean) : []);
  return {
    root, wt, sprintDir, env, readMarks,
    cleanup: () => { fs.rmSync(marks, { force: true }); fs.rmSync(root, { recursive: true, force: true }); },
  };
}

function runMerge(fx) {
  const r = spawnSync('node', [path.join(fx.root, '.cleargate', 'scripts', 'merge_story.mjs'), ITEM, '--sprint', SPRINT], {
    cwd: fx.root, env: fx.env, encoding: 'utf8', timeout: 120_000,
  });
  const lastJson = r.stdout.trim().split('\n').filter(Boolean).pop() ?? '{}';
  let result = {};
  try { result = JSON.parse(lastJson); } catch { /* leave empty */ }
  return { status: r.status, result, text: `${(result.tail ?? []).join('\n')}\n${r.stderr}` };
}

// --- selectScopes and matchGlob ----------------------------------------------------------------

const OUTLINE = [
  ['api-only', ['api/src/routes/items.ts'], ['api']],
  ['web-only', ['web/src/routes/index.tsx'], ['web']],
  ['both suites touched', ['api/src/server.ts', 'web/src/main.tsx'], ['api', 'web']],
  ['shared selects both', ['shared/schema.json'], ['api', 'web']],
  ['unmatched path selects both', ['docker-compose.yml'], ['api', 'web']],
  ['docs and .cleargate only select none', ['.cleargate/FLASHCARD.md', 'docs/notes.md'], []],
];

test('selectScopes: each changed-path set selects the suites it touches and the log line names them', async () => {
  const { selectScopes, formatSelection, notTestedLine } = await import('../lib/test-scope.mjs');
  for (const [label, paths, expected] of OUTLINE) {
    const sel = selectScopes(paths, SCOPES);
    assert.deepEqual(sel.scopes.map((s) => s.name), expected, label);
    const line = formatSelection(sel);
    if (expected.length === 0) {
      assert.match(line, /none/, label);
      assert.match(notTestedLine(sel.untested), /NOT TESTED: no suite touched \(/, label);
      assert.match(notTestedLine(sel.untested), /docs\/notes\.md/, label);
    } else {
      for (const name of expected) assert.ok(line.includes(name), `${label}: log line names ${name}: ${line}`);
    }
  }
});

test('selectScopes edge paths and parseTestScopes: fail toward testing, off when empty, malformed names the key', async () => {
  const { selectScopes, parseTestScopes } = await import('../lib/test-scope.mjs');
  const names = (paths, opts) => selectScopes(paths, SCOPES, opts).scopes.map((s) => s.name);
  assert.deepEqual(names(['web/README.md']), [], 'a markdown file under a scope dir is docs');
  assert.deepEqual(names(['api/test/items.test.ts']), ['api'], 'tests under a scope dir are code');
  assert.deepEqual(names(['.cleargate/scripts/gate-checks.json']), [], '.cleargate config selects no suite');
  assert.deepEqual(names(['docs/notes.md', 'Makefile']), ['api', 'web'], 'docs beside an unmatched path still select all');
  const diffError = selectScopes(null, SCOPES, { error: 'git diff exit 128' });
  assert.deepEqual(diffError.scopes.map((s) => s.name), ['api', 'web']);
  assert.equal(diffError.reason, 'diff-error');
  assert.deepEqual(names([]), ['api', 'web'], 'an empty diff fails toward testing');
  for (const qa of [{}, { test_scopes: null }, { test_scopes: [] }, null]) {
    const r = parseTestScopes(qa);
    assert.deepEqual(r.scopes, []);
    assert.equal(r.error, undefined);
  }
  const ok = { name: 'a', paths: ['a/**'], command: 'x' };
  const bad = [
    'nope', [{ name: 'a', paths: ['a/**'] }], [{ name: 'a', paths: [], command: 'x' }], [ok, { ...ok }], [{ ...ok, name: ' ' }],
  ];
  for (const value of bad) {
    const r = parseTestScopes({ test_scopes: value });
    assert.match(String(r.error), /qa\.test_scopes/, `error names the key for ${JSON.stringify(value)}`);
  }
});

test('matchGlob: ** spans segments, * and ? stay in one, a pattern with no / matches the file name at any depth', async () => {
  const { matchGlob, scopeCommand } = await import('../lib/test-scope.mjs');
  assert.equal(matchGlob('api/**', 'api/src/deep/x.ts'), true);
  assert.equal(matchGlob('api/**', 'apiary/x.ts'), false);
  assert.equal(matchGlob('api/*.ts', 'api/x.ts'), true);
  assert.equal(matchGlob('api/*.ts', 'api/src/x.ts'), false);
  assert.equal(matchGlob('**/*.sql', 'db/migrations/001.sql'), true);
  assert.equal(matchGlob('**/*.sql', 'top.sql'), true);
  assert.equal(matchGlob('*.md', 'a/b/c/README.md'), true);
  assert.equal(matchGlob('v?.json', 'v1.json'), true);
  assert.equal(matchGlob('v?.json', 'v10.json'), false);
  assert.equal(scopeCommand([]), '');
  assert.equal(scopeCommand([{ command: 'one' }]), 'one');
  assert.equal(scopeCommand([{ command: 'a # c' }, { command: 'b' }]), '(\na # c\n) && (\nb\n)');
});

// --- judgeTestFailure -----------------------------------------------------------------------------

test('judgeTestFailure: a rerun exiting 0 with no failing ids is a pass, with or without a baseline', async () => {
  const { judgeTestFailure } = await import('../merge_story.mjs');
  const baseline = { failing: ['known'], exit_code: 1, tail: ['x'] };
  for (const b of [baseline, null]) {
    const v = judgeTestFailure('all green\n', b, { exitCode: 0 });
    assert.equal(v.excused, true);
    assert.equal(v.reason, 'passed');
  }
  assert.equal(judgeTestFailure('boom\n', baseline, { exitCode: 1 }).reason, 'unparsed');
  assert.equal(judgeTestFailure('not ok 1 - known\n', baseline, { exitCode: 1 }).reason, 'excused');
  assert.equal(judgeTestFailure('not ok 1 - fresh\n', baseline, { exitCode: 1 }).reason, 'new-failures');
  assert.equal(judgeTestFailure('not ok 1 - fresh\n', baseline, { exitCode: 0 }).reason, 'new-failures', 'a named failure is never a pass');
});

// --- merge_story.mjs integration -------------------------------------------------------------------

test('merge: a web-only story runs the web scope only, and the result names it', () => {
  const fx = makeFixture({ changed: ['web/src/routes/index.tsx'], gate: { scopes: SCOPES } });
  try {
    const { status, result, text } = runMerge(fx);
    assert.equal(status, 0, text);
    assert.equal(result.exit, 0);
    const marks = fx.readMarks();
    assert.ok(marks.includes('web'), `web scope ran: ${marks}`);
    assert.ok(!marks.includes('api'), 'api never ran');
    assert.ok(!marks.includes('full'), 'the full suite never ran');
    assert.match(text, /test scopes: web \(matched\)/);
  } finally { fx.cleanup(); }
});

test('merge: a shared change runs every scope in the scan and the post-merge test', () => {
  const fx = makeFixture({ changed: ['shared/schema.json'], gate: { scopes: SCOPES } });
  try {
    const { status, result, text } = runMerge(fx);
    assert.equal(status, 0, text);
    assert.equal(result.post_merge_test, 'pass');
    const marks = fx.readMarks();
    assert.equal(marks.filter((m) => m === 'api').length, 2, `api ran in the scan and post-merge: ${marks}`);
    assert.equal(marks.filter((m) => m === 'web').length, 2, `web ran in the scan and post-merge: ${marks}`);
    assert.ok(!marks.includes('full'));
    assert.match(text, /test scopes: api, web \(matched\)/);
  } finally { fx.cleanup(); }
});

test('merge: a docs-only story runs no suite and reports NOT TESTED', () => {
  const fx = makeFixture({ changed: ['docs/notes.md', '.cleargate/FLASHCARD.md'], gate: { scopes: SCOPES } });
  try {
    const { status, result, text } = runMerge(fx);
    assert.equal(status, 0, text);
    assert.equal(result.post_merge_test, 'skipped');
    assert.deepEqual(fx.readMarks(), []);
    assert.match(text, /NOT TESTED: no suite touched \(/);
  } finally { fx.cleanup(); }
});

test('merge: without qa.test_scopes the full suite runs as before; a malformed value refuses with exit 2 naming the key', () => {
  const off = makeFixture({ changed: ['web/src/routes/index.tsx'], gate: {} });
  try {
    const { status, text } = runMerge(off);
    assert.equal(status, 0, text);
    const marks = off.readMarks();
    assert.ok(marks.length >= 2 && marks.every((m) => m === 'full'), `only the full stub ran (scan + post-merge): ${marks}`);
    assert.doesNotMatch(text, /test scopes:/);
  } finally { off.cleanup(); }
  const bad = makeFixture({ changed: ['web/src/routes/index.tsx'], gate: { rawScopes: 'not-a-list' } });
  try {
    const { status, result, text } = runMerge(bad);
    assert.equal(status, 2, text);
    assert.equal(result.exit, 2);
    assert.match(text, /qa\.test_scopes/);
    assert.deepEqual(bad.readMarks(), []);
  } finally { bad.cleanup(); }
});

test('merge: a scan run that flakes and a rerun that passes merges, with a notice naming the flake', () => {
  const fx = makeFixture({
    changed: ['web/src/routes/index.tsx'], gate: { mode: 'flaky-first' },
    baseline: { sprint_id: SPRINT, base_sha: 'x', command: 'x', exit_code: 0, failing: [], tail: [], recorded_at: new Date().toISOString() },
  });
  try {
    const { status, result, text } = runMerge(fx);
    assert.equal(status, 0, text);
    assert.equal(result.exit, 0);
    assert.match(text, /failed in the scan and passed on the rerun; first run: flaky/);
  } finally { fx.cleanup(); }
});

// --- pre_gate_runner.sh qa -------------------------------------------------------------------------

test('pre_gate_runner.sh qa: CLEARGATE_QA_TEST_COMMAND replaces qa.test; empty runs no test and records NOT TESTED', () => {
  const fx = makeFixture({ changed: ['web/src/routes/index.tsx'], gate: {} });
  try {
    const runner = path.join(fx.root, '.cleargate', 'scripts', 'pre_gate_runner.sh');
    const report = path.join(fx.wt, '.cleargate', 'reports', 'pre-qa-scan.txt');
    const scan = (extra) => {
      fs.rmSync(report, { force: true });
      const r = spawnSync('bash', [runner, 'qa', fx.wt, `story/${ITEM}`], {
        cwd: fx.root, encoding: 'utf8', timeout: 120_000, env: { ...fx.env, CLEARGATE_SCAN_NO_LANE_ROUTING: '1', ...extra },
      });
      return { status: r.status, report: fs.existsSync(report) ? fs.readFileSync(report, 'utf8') : `(no report)\n${r.stdout}${r.stderr}` };
    };
    const empty = scan({ CLEARGATE_QA_TEST_COMMAND: '' });
    assert.equal(empty.status, 0, empty.report);
    assert.match(empty.report, /\[INFO\] test: NOT TESTED: no suite touched/);
    assert.deepEqual(fx.readMarks(), []);
    const set = scan({ CLEARGATE_QA_TEST_COMMAND: `node "${path.join(fx.root, 'stub.mjs')}" chosen` });
    assert.equal(set.status, 0, set.report);
    assert.deepEqual(fx.readMarks(), ['chosen']);
    const unset = scan({});
    assert.equal(unset.status, 0, unset.report);
    assert.deepEqual(fx.readMarks(), ['chosen', 'full'], 'unset: qa.test runs as before');
  } finally { fx.cleanup(); }
});

// --- record_evidence.mjs ---------------------------------------------------------------------------

test('record_evidence: a container item with no proof command of its own runs only the touched scope', () => {
  const fx = makeFixture({ changed: ['web/src/routes/index.tsx'], gate: { scopes: SCOPES }, itemTier: 'container' });
  try {
    const r = spawnSync('node', [path.join(fx.root, '.cleargate', 'scripts', 'record_evidence.mjs'), ITEM, '--worktree', fx.wt], {
      cwd: fx.root, env: fx.env, encoding: 'utf8', timeout: 120_000,
    });
    assert.equal(r.status, 0, r.stderr + r.stdout);
    const ev = JSON.parse(r.stdout.trim().split('\n').pop());
    assert.equal(ev.status, 'pass');
    assert.deepEqual([...new Set(fx.readMarks())], ['web']);
    assert.match(ev.command, /web/);
    assert.match(r.stderr, /record_evidence: test scopes: web \(matched\)/);
  } finally { fx.cleanup(); }
});

test('record_evidence: without qa.test_scopes the configured container proof runs unchanged', () => {
  const fx = makeFixture({ changed: ['web/src/routes/index.tsx'], gate: {}, itemTier: 'container' });
  try {
    const r = spawnSync('node', [path.join(fx.root, '.cleargate', 'scripts', 'record_evidence.mjs'), ITEM, '--worktree', fx.wt], {
      cwd: fx.root, env: fx.env, encoding: 'utf8', timeout: 120_000,
    });
    assert.equal(r.status, 0, r.stderr + r.stdout);
    assert.deepEqual(fx.readMarks(), ['proofcontainer']);
    assert.doesNotMatch(r.stderr, /test scopes:/);
  } finally { fx.cleanup(); }
});
