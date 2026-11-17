#!/usr/bin/env node
/**
 * seal_red.mjs — QA-Red commits its own failing tests and runs the wiring scan (STORY-066-07).
 *
 * Usage: node seal_red.mjs <ID> --worktree <path> --sprint-branch <branch> [--amendment] -- <file>...
 *
 * Files come after `--` as separate argv entries; git is run with argv arrays, never a
 * shell string, so spaced paths and zsh-expanded lists reach git unchanged.
 *
 * --amendment (STORY-065-05): seal tests added after the Developer's commit (QA-Verify's holdout
 *   tests, Architect-added red files). Every file must be new and none may be a file a qa-red(<ID>)
 *   commit already sealed; else exit 2 naming the file and nothing is committed. The commit subject
 *   is `qa-red(<ID>): amendment`, R-volume is skipped, and the JSON line carries amendment: true.
 *
 * stdout: one JSON line { id, sealed_sha, scan_exit, flags, tests, scenarios, resealed?, amendment? }
 *   whenever a commit was made. Exit 0 scan clean, 1 scan flagged, 2 could not run.
 * Records land in the sprint root even when this copy runs inside a story worktree (STORY-066-21).
 * R-volume counts only the tests the item added since it left the sprint branch (STORY-066-22).
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { countTests, countScenarios, readBaseText } from './qa_red_lint.mjs';
import { matchesId } from './lib/work-item-id.mjs';
import { sprintRoot } from './lib/sprint-root.mjs';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT = sprintRoot(path.resolve(SCRIPT_DIR, '..', '..'));

function appendExpectedRedTrailer(reportFile, entries, rawExit) {
  const body = fs.readFileSync(reportFile, 'utf8');
  const lead = body === '' || body.endsWith('\n') ? '' : '\n';
  const head = `[INFO] expected_red: seal_red.mjs read this typecheck failure as the expected red (only not-yet-written symbols in the sealed red files); seal scan_exit 0 (raw ${rawExit}). Not a flag; no Architect pass.`;
  fs.appendFileSync(reportFile, `${lead}${head}\n${entries.map((e) => `  | ${e}`).join('\n')}\n`);
}

function fail(msg) {
  process.stderr.write(`seal_red: ${msg}\n`);
  process.exit(2);
}

function gitEnv(extra = {}) {
  const e = { ...process.env };
  delete e.GIT_DIR;
  delete e.GIT_WORK_TREE;
  delete e.GIT_INDEX_FILE;
  return { ...e, ...extra };
}

function git(wt, args, extraEnv) {
  return spawnSync('git', ['-C', wt, ...args], { encoding: 'utf8', env: gitEnv(extraEnv) });
}

function parseArgs(argv) {
  const id = argv[0];
  let worktree = null;
  let branch = null;
  let amendment = false;
  const files = [];
  let i = 1;
  for (; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--') { files.push(...argv.slice(i + 1)); break; }
    if (a === '--worktree') worktree = argv[++i];
    else if (a === '--sprint-branch') branch = argv[++i];
    else if (a === '--amendment') amendment = true;
    else fail(`unknown argument: ${a}`);
  }
  return { id, worktree, branch, files, amendment };
}

function findItemFile(id) {
  for (const sub of ['pending-sync', 'archive']) {
    const dir = path.join(ROOT, '.cleargate', 'delivery', sub);
    let names;
    try { names = fs.readdirSync(dir); } catch { continue; }
    const hit = names.find((n) => matchesId(n, id));
    if (hit) return path.join(dir, hit);
  }
  return null;
}

// ---------------------------------------------------------------------------
// Expected-red classifier (STORY-066-19, finding S7). A red test that only names symbols the
// story has not written yet fails typecheck; that is the expected red state, not a wiring fault.
// ---------------------------------------------------------------------------
const TSC_PAREN = /^(.+?)\((\d+),(\d+)\): error (TS\d+): (.*)$/;
const TSC_DASH = /^(.+?):(\d+):(\d+) - error (TS\d+): (.*)$/;
const GO_DIAG = /^(?:vet: )?(.+?):(\d+):(\d+): (.*)$/;
const TSC_UNDEFINED = new Set(['TS2304', 'TS2305', 'TS2724', 'TS2307', 'TS2339', 'TS2552']);
const GO_UNDEFINED = [
  /^undefined: \S+$/,
  /^\S+ undefined \(type .* has no field or method \S+\)$/,
];
const NOISE = [
  /^# \[?\S+\]?/,
  /^> /,
  /^npm (ERR!|error|warn)\b/,
  /^make(\[\d+\])?: \*\*\* /,
  /^exit status \d+$/,
  /^Found \d+ errors?/,
  /^Errors\s+Files$/,
  /^\d+\s+\S+:\d+$/,
];

export function classifyExpectedRed(block, sealedFiles, worktree) {
  const lines = String(block).split('\n').map((l) => l.replace(/^ {2}\| ?/, '').replace(/\s+$/, ''));
  if (lines.length >= 40) return null; // tail -n 40: possibly truncated
  const sealed = new Set(sealedFiles.map((f) => path.resolve(worktree, f)));
  const entries = [];
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    let m = TSC_PAREN.exec(line) || TSC_DASH.exec(line);
    if (m) {
      if (!TSC_UNDEFINED.has(m[4]) || !sealed.has(path.resolve(worktree, m[1]))) return null;
      entries.push(line);
      continue;
    }
    m = GO_DIAG.exec(line);
    if (m) {
      if (!GO_UNDEFINED.some((re) => re.test(m[4])) || !sealed.has(path.resolve(worktree, m[1]))) return null;
      entries.push(line.replace(/^vet: /, ''));
      continue;
    }
    if (NOISE.some((re) => re.test(line))) continue;
    return null;
  }
  return entries.length > 0 ? { expectedRed: entries } : null;
}

/** Relative --worktree: cwd first, then the main checkout (B10). */
function resolveWorktree(worktree) {
  if (path.isAbsolute(worktree)) return path.resolve(worktree);
  let cwd = process.cwd();
  try { cwd = fs.realpathSync(cwd); } catch { /* keep */ }
  const fromCwd = path.resolve(cwd, worktree);
  if (fs.existsSync(fromCwd)) return fromCwd;
  let main = cwd;
  const g = spawnSync('git', ['rev-parse', '--path-format=absolute', '--git-common-dir'], { encoding: 'utf8', env: gitEnv() });
  if (g.status === 0 && g.stdout.trim()) {
    const common = g.stdout.trim();
    main = path.basename(common) === '.git' ? path.dirname(common) : common;
    try { main = fs.realpathSync(main); } catch { /* keep */ }
  }
  const fromMain = path.resolve(main, worktree);
  if (fs.existsSync(fromMain)) return fromMain;
  return fail(`worktree does not exist: tried ${fromCwd} and ${fromMain}`);
}

function main() {
  const { id, worktree, branch, files, amendment } = parseArgs(process.argv.slice(2));
  if (!id || id.startsWith('--') || !worktree || !branch || files.length === 0) {
    fail('usage: seal_red.mjs <ID> --worktree <path> --sprint-branch <branch> [--amendment] -- <file>...');
  }
  const wt = resolveWorktree(worktree);
  for (const f of files) {
    if (!fs.existsSync(path.resolve(wt, f))) fail(`file does not exist in worktree: ${f}`);
  }

  // Re-seal rule (C-15): only qa-red( commits may follow the first qa-red( commit.
  const log = git(wt, ['log', '--format=%s', `${branch}..HEAD`]);
  if (log.status !== 0) fail(`git log failed: ${log.stderr.trim()}`);
  const subjects = log.stdout.split('\n').filter(Boolean).reverse(); // oldest first
  const firstRed = subjects.findIndex((s) => s.startsWith('qa-red('));
  let resealed = false;
  if (amendment) {
    if (firstRed < 0) fail(`--amendment refused: no qa-red(${id}) commit on this branch to amend`);
    const sealedFiles = new Set(
      git(wt, ['log', '--format=', '--name-only', '--basic-regexp', `--grep=^qa-red(${id})`, `${branch}..HEAD`])
        .stdout.split('\n').filter(Boolean),
    );
    for (const f of files) {
      const rel = path.relative(wt, path.resolve(wt, f)).split(path.sep).join('/');
      if (sealedFiles.has(rel)) fail(`--amendment refused: ${rel} was already sealed by a qa-red(${id}) commit`);
      if (git(wt, ['cat-file', '-e', `HEAD:${rel}`]).status === 0) fail(`--amendment refused: ${rel} is not a new file`);
    }
  } else if (firstRed >= 0) {
    if (subjects.slice(firstRed).some((s) => !s.startsWith('qa-red('))) {
      fail('re-seal refused: a non-qa-red commit follows the first qa-red commit (Developer has started)');
    }
    resealed = true;
  }

  // Volume base (STORY-066-22): tests this branch added since it left the sprint branch.
  const mb = git(wt, ['merge-base', branch, 'HEAD']);
  const redBase = mb.status === 0 ? mb.stdout.trim() : '';
  const rels = files.map((f) => path.relative(wt, path.resolve(wt, f)).split(path.sep).join('/'));

  const add = git(wt, ['add', '--', ...files]);
  if (add.status !== 0) fail(`git add failed: ${add.stderr.trim()}`);
  const commit = git(
    wt,
    ['commit', '-m', amendment ? `qa-red(${id}): amendment` : `qa-red(${id}): write failing tests`, '--', ...files],
    resealed || amendment ? { SKIP_RED_GATE: '1' } : {},
  );
  if (commit.status !== 0) fail(`git commit failed: ${commit.stderr.trim()} ${commit.stdout.trim()}`);
  const sha = git(wt, ['rev-parse', 'HEAD']).stdout.trim();

  // Counts.
  let tests = 0;
  files.forEach((f, k) => {
    const text = fs.readFileSync(path.resolve(wt, f), 'utf8');
    tests += redBase
      ? Math.max(0, countTests(f, text) - countTests(f, readBaseText(wt, redBase, rels[k])))
      : countTests(f, text);
  });
  const itemFile = findItemFile(id);
  const scenarios = itemFile ? countScenarios(fs.readFileSync(itemFile, 'utf8'), { excludeHoldout: true }) : 0;

  // Scan.
  const scanEnv = { ...process.env };
  if (scenarios > 0 && !amendment) {
    scanEnv.CLEARGATE_RED_FILES = rels.join('\n');
    scanEnv.CLEARGATE_RED_SCENARIOS = String(scenarios);
    if (redBase) scanEnv.CLEARGATE_RED_BASE = redBase;
    else delete scanEnv.CLEARGATE_RED_BASE;
  } else {
    delete scanEnv.CLEARGATE_RED_FILES;
    delete scanEnv.CLEARGATE_RED_SCENARIOS;
    delete scanEnv.CLEARGATE_RED_BASE;
  }
  const scan = spawnSync('bash', [path.join(SCRIPT_DIR, 'pre_gate_runner.sh'), 'arch', wt, branch], {
    encoding: 'utf8',
    env: scanEnv,
  });
  const scanExit = scan.status ?? 2;

  // Report: parse flags, then move it out of the worktree.
  let sprint = '';
  try { sprint = fs.readFileSync(path.join(ROOT, '.cleargate', 'sprint-runs', '.active'), 'utf8').trim(); } catch { /* none */ }
  const reportFile = path.join(wt, '.cleargate', 'reports', 'pre-arch-scan.txt');
  let flags = [];
  let scanExitFinal = scanExit;
  let expectedRed = null;
  if (fs.existsSync(reportFile)) {
    const reportLines = fs.readFileSync(reportFile, 'utf8').split('\n');
    const fails = [];
    for (const line of reportLines) {
      const m = /^\[(FAIL|WARN)\] ([^:]+):/.exec(line);
      if (m && !flags.includes(m[2])) flags.push(m[2]);
      if (m && m[1] === 'FAIL' && !fails.includes(m[2])) fails.push(m[2]);
    }
    if (scanExit === 1 && fails.length === 1 && fails[0] === 'typecheck') {
      const at = reportLines.findIndex((l) => /^\[FAIL\] typecheck:/.test(l));
      const blk = [];
      for (let i = at + 1; i < reportLines.length && reportLines[i].startsWith('  | '); i++) blk.push(reportLines[i]);
      const c = classifyExpectedRed(blk.join('\n'), files, wt);
      if (c) {
        expectedRed = c.expectedRed;
        flags = flags.filter((f) => f !== 'typecheck');
        scanExitFinal = 0;
        appendExpectedRedTrailer(reportFile, c.expectedRed, scanExit);
      }
    }
    if (sprint) {
      const dest = path.join(ROOT, '.cleargate', 'sprint-runs', sprint, 'reports', `${id}-pre-arch-scan.txt`);
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      try { fs.renameSync(reportFile, dest); } catch {
        fs.copyFileSync(reportFile, dest);
        fs.rmSync(reportFile, { force: true });
      }
    } else {
      fs.rmSync(reportFile, { force: true });
    }
  }

  const sealLine = { ts: new Date().toISOString(), mode: 'seal', item: id, exit: scanExitFinal, raw_exit: scanExit, flagged_checks: flags, sealed_sha: sha };
  if (amendment) sealLine.amendment = true;
  if (expectedRed) sealLine.expected_red = expectedRed;
  try {
    const dir = path.join(ROOT, '.cleargate', 'sprint-runs', sprint || '_off-sprint');
    fs.mkdirSync(dir, { recursive: true });
    fs.appendFileSync(path.join(dir, 'pre-gate.jsonl'), `${JSON.stringify(sealLine)}\n`);
  } catch { /* never changes the seal's exit (CR-120) */ }

  const out = { id, sealed_sha: sha, scan_exit: scanExitFinal, flags, tests, scenarios };
  if (expectedRed) { out.expected_red = expectedRed; out.scan_exit_raw = scanExit; }
  if (resealed) out.resealed = true;
  if (amendment) out.amendment = true;
  process.stdout.write(`${JSON.stringify(out)}\n`);
  if (scanExitFinal === 0) process.exit(0);
  if (scanExitFinal === 1) process.exit(1);
  process.stderr.write(`seal_red: scan exited ${scanExit}\n`);
  process.exit(2);
}

if (process.argv[1] && fs.realpathSync(process.argv[1]) === fs.realpathSync(fileURLToPath(import.meta.url))) main();
