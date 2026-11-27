#!/usr/bin/env node
/**
 * run_wave_suite.mjs — run the full suite once on the sprint branch after a wave's last merge.
 *
 * Usage: node run_wave_suite.mjs <SPRINT-ID> <wave>
 *
 * Only meaningful when gate-checks.json `qa.test_scopes` is set: merge_story.mjs then runs just the
 * suites each story touches, and this run is the full-suite safety net for the sprint branch.
 *
 * Runs gate-checks.json `qa.test` in the main checkout (it must be on sprint/S-NN) and appends one row to
 * <sprintDir>/wave-suite.jsonl: { wave, sha, status: 'pass'|'excused'|'fail', exit: 0|1, failing,
 * new_failures, reason, duration_ms, recorded_at }. stdout is one JSON line; progress goes to stderr.
 * Failures already in baseline.json are excused (as in merge_story.mjs). A run that exceeds the fixed
 * spawn limit merge_story.mjs gives its tests (20 minutes) is a fail.
 *
 * Exit codes:
 *   0  pass or excused, or `qa.test_scopes` is not configured (one `skipped` line, no row)
 *   1  a new failure (or a timeout, or a run that named no test)
 *   2  usage or precondition: no qa.test, malformed qa.test_scopes, the checkout is not on the sprint
 *      branch, a merge is in progress, authored tracked changes, or HEAD moved during the run. No row.
 *
 * close_sprint.mjs Step 2.75 needs a passing row covering the sprint branch HEAD (closeWaveCheck): a row for
 * HEAD, or a passing row for an ancestor when every commit since selects no test scope. Tracked changes that
 * select no scope (only .cleargate/** or *.md) do not count as authored changes.
 *
 * Env: ORCHESTRATOR_PROJECT_DIR (the checkout, as merge_story.mjs), CLEARGATE_SPRINT_DIR (test override).
 */

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { extractFailing, commandEnv } from './record_baseline.mjs';
import { sprintBranchFor } from './dispatch_serial.mjs';
import { judgeTestFailure, classifyDirtyPath } from './merge_story.mjs';
import { parseTestScopes, selectScopes } from './lib/test-scope.mjs';

export const WAVE_EXIT = Object.freeze({ OK: 0, FAILED: 1, PRECONDITION: 2 });

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const USAGE = 'Usage: node run_wave_suite.mjs <SPRINT-ID> <wave>';
const MAX_BUFFER = 64 * 1024 * 1024;
/** The same fixed limit merge_story.mjs gives each test spawn. */
const TEST_TIMEOUT_MS = 1_200_000;
const ROWS_FILE = 'wave-suite.jsonl';

const logErr = (msg) => process.stderr.write(`run_wave_suite: ${msg}\n`);

function git(cwd, args) {
  const r = spawnSync('git', args, { cwd, encoding: 'utf8', maxBuffer: MAX_BUFFER });
  return { status: r.status === null ? 1 : r.status, stdout: r.stdout ?? '', stderr: r.stderr ?? '' };
}

function readJson(file) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return null; }
}

/** Every row of <sprintDir>/wave-suite.jsonl, oldest first; an unreadable line is skipped. */
export function readWaveRows(sprintDir) {
  let text;
  try { text = fs.readFileSync(path.join(sprintDir, ROWS_FILE), 'utf8'); } catch { return []; }
  const rows = [];
  for (const line of text.split('\n')) {
    if (line.trim() === '') continue;
    try {
      const row = JSON.parse(line);
      if (row && typeof row === 'object') rows.push(row);
    } catch { /* skip */ }
  }
  return rows;
}

/** The newest row recorded for `sha`, or null. */
export function latestRowFor(rows, sha) {
  for (let i = rows.length - 1; i >= 0; i--) if (rows[i].sha === sha) return rows[i];
  return null;
}

function appendRow(sprintDir, row) {
  fs.mkdirSync(sprintDir, { recursive: true });
  const file = path.join(sprintDir, ROWS_FILE);
  let lead = '';
  try {
    const have = fs.readFileSync(file, 'utf8');
    if (have !== '' && !have.endsWith('\n')) lead = '\n';
  } catch { /* new file */ }
  fs.appendFileSync(file, `${lead}${JSON.stringify(row)}\n`);
}

function authoredDirt(root, scopes) {
  const out = git(root, ['status', '--porcelain=v1', '-z', '--untracked-files=all']).stdout.split('\0');
  const dirt = [];
  for (let i = 0; i < out.length; i++) {
    const p = out[i];
    if (!p) continue;
    const status = p.slice(0, 2);
    const rel = p.slice(3);
    if (status[0] === 'R' || status[0] === 'C' || status[1] === 'R' || status[1] === 'C') i++;
    if (classifyDirtyPath(rel, { tracked: status !== '??' }) !== 'authored') continue;
    // A tracked change that selects no scope (only .cleargate/** or *.md) cannot change a suite result.
    if (selectScopes([rel], scopes).scopes.length === 0) continue;
    dirt.push(`${status} ${rel}`);
  }
  return dirt;
}

const pre = (lines) => ({ exit: WAVE_EXIT.PRECONDITION, result: null, lines });

/**
 * @returns {{ exit: number, result: object | null, lines: string[] }}  result is the JSON line for stdout
 */
export function runWaveSuite({ root, sprintId, sprintDir, wave, env = process.env }) {
  const gate = readJson(path.join(SCRIPT_DIR, 'gate-checks.json')) ?? {};
  const parsed = parseTestScopes(gate.qa);
  if (parsed.error) return pre([`${parsed.error} (.cleargate/scripts/gate-checks.json)`]);
  if (parsed.scopes.length === 0) {
    return { exit: WAVE_EXIT.OK, result: { wave, status: 'skipped', reason: 'qa.test_scopes is not configured' }, lines: [] };
  }
  const qaTest = String(gate.qa?.test ?? '').trim();
  if (!qaTest) return pre(['qa.test in .cleargate/scripts/gate-checks.json is empty; the wave suite has nothing to run']);

  let branch;
  try { branch = sprintBranchFor(sprintId); } catch (err) { return pre([err.message]); }
  const cur = git(root, ['branch', '--show-current']).stdout.trim();
  if (cur !== branch) return pre([`the checkout is on '${cur || '(detached)'}', not ${branch}; check out ${branch} first`]);
  if (git(root, ['rev-parse', '-q', '--verify', 'MERGE_HEAD']).status === 0) return pre(['a merge is in progress in the checkout']);
  const dirt = authoredDirt(root, parsed.scopes);
  if (dirt.length) return pre(['authored changes in the checkout; commit or revert them first:', ...dirt.map((d) => `  ${d}`)]);

  const sha = git(root, ['rev-parse', 'HEAD']).stdout.trim();
  logErr(`running qa.test on ${branch} @ ${sha.slice(0, 7)} (wave ${wave})`);
  const t0 = Date.now();
  const r = spawnSync('bash', ['-c', `(\n${qaTest}\n) 2>&1`], {
    cwd: root, env: commandEnv(env), encoding: 'utf8', maxBuffer: MAX_BUFFER, timeout: TEST_TIMEOUT_MS,
  });
  const duration = Date.now() - t0;
  const text = `${r.stdout ?? ''}${r.stderr ?? ''}`;
  const timedOut = r.error?.code === 'ETIMEDOUT';
  const exitCode = r.status === null ? 1 : r.status;

  const after = git(root, ['rev-parse', 'HEAD']).stdout.trim();
  if (after !== sha) return pre([`HEAD moved during the run (${sha.slice(0, 7)} -> ${after.slice(0, 7)}); no row recorded, run again`]);

  let status;
  let reason;
  let failing = [];
  let newFailures = [];
  if (timedOut) {
    status = 'fail';
    reason = 'timed-out';
    failing = extractFailing(text);
  } else {
    const baseline = readJson(path.join(sprintDir, 'baseline.json'));
    const v = judgeTestFailure(text, baseline, { exitCode });
    failing = v.ids;
    newFailures = v.new_ids;
    reason = v.reason;
    const waiver = typeof gate.qa?.test_waiver === 'string' ? gate.qa.test_waiver.trim() : '';
    if (exitCode === 0) status = 'pass';
    else if (v.excused && (v.reason !== 'baseline-unnamed' || waiver)) status = 'excused';
    else status = 'fail';
  }
  const row = {
    wave, sha, status, exit: status === 'fail' ? 1 : 0, failing, new_failures: newFailures, reason,
    duration_ms: duration, recorded_at: new Date().toISOString(),
  };
  appendRow(sprintDir, row);
  const lines = [];
  if (timedOut) lines.push(`wave suite timed out after ${TEST_TIMEOUT_MS / 60_000} minutes`);
  for (const id of newFailures) lines.push(`new failure: ${id}`);
  return { exit: row.exit, result: row, lines };
}

/**
 * The newest row for a proper ancestor of `sha` covers `sha` when it passed and the diff since is non-empty
 * and selects no scope. A failing row, a non-ancestor, an empty diff or any git error never covers.
 * @returns {{ row: object, paths: string[] } | null}
 */
function ancestorCover({ root, sha, rows, scopes }) {
  for (let i = rows.length - 1; i >= 0; i--) {
    const row = rows[i];
    if (typeof row.sha !== 'string' || row.sha === '' || row.sha === sha) continue;
    const anc = git(root, ['merge-base', '--is-ancestor', row.sha, sha]);
    if (anc.status === 1) continue;
    if (anc.status !== 0) { logErr(`git merge-base failed for ${row.sha}; not counted as an ancestor`); continue; }
    if (row.exit !== 0) return null;
    const diff = git(root, ['diff', '--name-only', row.sha, sha]);
    if (diff.status !== 0) { logErr(`git diff failed for ${row.sha}..${sha}`); return null; }
    const paths = diff.stdout.split('\n').filter((x) => x !== '');
    if (paths.length === 0 || selectScopes(paths, scopes).scopes.length > 0) return null;
    return { row, paths };
  }
  return null;
}

/**
 * close_sprint.mjs Step 2.75: the sprint branch HEAD needs a passing wave-suite row. A passing row ends
 * it (so does a passing ancestor row with only no-scope commits since); a failing row for HEAD refuses
 * (no automatic rerun); no covering row runs the suite once (wave `close`).
 * Skipped when `qa.test_scopes` is off, or when the branch cannot be resolved (fail open, as Step 2.8).
 * @returns {{ ok: boolean, skipped: boolean, lines: string[] }}
 */
export function closeWaveCheck({ root, sprintId, sprintDir, env = process.env }) {
  const gate = readJson(path.join(SCRIPT_DIR, 'gate-checks.json')) ?? {};
  const parsed = parseTestScopes(gate.qa);
  if (parsed.error) return { ok: false, skipped: false, lines: [`no passing wave suite: ${parsed.error}`] };
  if (parsed.scopes.length === 0) return { ok: true, skipped: true, lines: ['qa.test_scopes is not configured'] };
  let branch;
  try { branch = sprintBranchFor(sprintId); } catch { return { ok: true, skipped: true, lines: [`sprint-id "${sprintId}" has no numeric portion`] }; }
  const head = git(root, ['rev-parse', '--verify', '-q', `refs/heads/${branch}`]);
  const sha = head.stdout.trim();
  if (head.status !== 0 || !sha) return { ok: true, skipped: true, lines: [`${branch} could not be resolved`] };

  const rows = readWaveRows(sprintDir);
  const forHead = rows.filter((x) => x.sha === sha);
  if (forHead.some((x) => x.exit === 0)) return { ok: true, skipped: false, lines: [`wave suite passed for ${sha}`] };
  const last = latestRowFor(rows, sha);
  if (!last) {
    const cover = ancestorCover({ root, sha, rows, scopes: parsed.scopes });
    if (cover) {
      return { ok: true, skipped: false, lines: [`wave suite passed for ${sha} (covered by the passing row for ${cover.row.sha}; only no-scope paths changed since: ${cover.paths.join(', ')})`] };
    }
  }
  const remedy = `run: node .cleargate/scripts/run_wave_suite.mjs ${sprintId} close`;
  if (last && last.exit === 1) {
    const names = Array.isArray(last.new_failures) && last.new_failures.length ? ` (new failures: ${last.new_failures.join(', ')})` : '';
    return { ok: false, skipped: false, lines: [`no passing wave suite for ${sha}${names}`, `the newest run (wave ${last.wave}) failed; fix it, then ${remedy}`] };
  }
  const run = runWaveSuite({ root, sprintId, sprintDir, wave: 'close', env });
  if (run.exit === WAVE_EXIT.OK) return { ok: true, skipped: false, lines: [`wave suite passed for ${sha} (close run)`] };
  const names = run.result?.new_failures?.length ? ` (new failures: ${run.result.new_failures.join(', ')})` : '';
  return { ok: false, skipped: false, lines: [`no passing wave suite for ${sha}${names}`, ...run.lines, `then ${remedy}`] };
}

function main(argv) {
  const [sprintId, wave, ...extra] = argv;
  if (!sprintId || !wave || extra.length) {
    process.stderr.write(`${USAGE}\n`);
    return WAVE_EXIT.PRECONDITION;
  }
  try { sprintBranchFor(sprintId); } catch (err) {
    process.stderr.write(`${err.message}\n${USAGE}\n`);
    return WAVE_EXIT.PRECONDITION;
  }
  const guess = process.env.ORCHESTRATOR_PROJECT_DIR || path.resolve(SCRIPT_DIR, '..', '..');
  const top = git(guess, ['rev-parse', '--show-toplevel']);
  if (top.status !== 0) {
    logErr(`not a git checkout: ${guess}`);
    return WAVE_EXIT.PRECONDITION;
  }
  const root = top.stdout.trim();
  const sprintDir = process.env.CLEARGATE_SPRINT_DIR
    ? path.resolve(process.env.CLEARGATE_SPRINT_DIR)
    : path.join(root, '.cleargate', 'sprint-runs', sprintId);
  const out = runWaveSuite({ root, sprintId, sprintDir, wave, env: process.env });
  for (const l of out.lines) logErr(l);
  if (out.result) process.stdout.write(`${JSON.stringify(out.result)}\n`);
  return out.exit;
}

function isMainModule() {
  try {
    return fs.realpathSync(fileURLToPath(import.meta.url)) === fs.realpathSync(process.argv[1]);
  } catch {
    return false;
  }
}

if (isMainModule()) process.exit(main(process.argv.slice(2)));
