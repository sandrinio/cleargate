#!/usr/bin/env node
/**
 * merge_story.mjs — merge one story by script (STORY-066-08, EPIC-066).
 *
 * Usage: node merge_story.mjs <ID> --sprint <SPRINT-NN> [--worktree <path>]
 *
 * Replaces the fixed nine-step DevOps merge: pre-merge check, checkout of the sprint branch,
 * no-ff merge, prebuild, post-merge test, worktree removal, branch delete, state -> Done.
 * stdout is exactly one JSON line { id, step, exit, tail, conflict_files?, post_merge_test? }.
 * Progress goes to stderr; child output is captured, never inherited.
 *
 * A re-run after the merge landed finishes the job: when story/<ID> is not ahead of the sprint branch
 * and the sprint branch's first-parent line holds a `merge(story/<ID>):` merge commit whose second
 * parent is the story tip (or the branch is gone and such a commit exists), only teardown and the
 * state update run. An error after the merge names its step (`teardown`, `state`) and the re-run.
 * Teardown carries ClearGate's runtime files (scan reports, QA packs, ledger lines) out of the worktree.
 *
 * A merge test that stops before running any test the way baseline.json records (judgeTestFailure
 * reason `baseline-unnamed`) is excused only when gate-checks.json `qa.test_waiver` holds a reason
 * (STORY-066-18); without one the merge is refused and the last tail line names the key.
 *
 * The orchestrator's derived files (wiki, hook log, ledgers) are copied to a temp directory,
 * the tracked ones are returned to HEAD, and everything is written back afterwards. This script
 * never touches the shared git set-aside stack of other worktrees.
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { extractFailing, commandEnv, lastLine } from './record_baseline.mjs';
import { sprintBranchFor } from './dispatch_serial.mjs';
import { extractWorkItemIds } from './lib/work-item-id.mjs';
import { findItemFile, readProofTier, isProofTier, readEvidence, proofStatus, evidencePath } from './lib/proof.mjs';

export const MERGE_EXIT = Object.freeze({ MERGED: 0, PRECONDITION: 2, CHECK_FAILED: 3, CONFLICT: 4, POST_TEST_FAILED: 5 });

export const DERIVED_SPRINT_RUN_FILES = Object.freeze([
  'token-ledger.jsonl',
  'subagent-ledger.jsonl',
  'state.json',
  'events.jsonl',
  'metrics.json',
  'pre-gate.jsonl',
  '.session-totals.json',
]);

const USAGE = [
  'Usage: node merge_story.mjs <ID> --sprint <SPRINT-NN> [--worktree <path>]',
  'Exit codes:',
  '  0  merged (a re-run after the merge landed: teardown and state only)',
  '  2  usage or precondition; or teardown/state failed after the merge landed (re-run to finish)',
  '  3  pre-merge check failed',
  '  4  merge conflict',
  '  5  post-merge test failed',
  '',
].join('\n');

const SPAWN_TIMEOUT_MS = 1_200_000;
const MAX_BUFFER = 64 * 1024 * 1024;
const TAIL_LINES = 40;

// ---------------------------------------------------------------------------
// Pure helpers
// ---------------------------------------------------------------------------

/**
 * @param {string} relPath  repo-relative, forward slashes
 * @param {{ tracked: boolean }} opts
 * @returns {'derived' | 'authored' | 'ignore'}
 */
export function classifyDirtyPath(relPath, { tracked }) {
  const p = String(relPath).replace(/\\/g, '/');
  if (p.startsWith('.cleargate/wiki/') || p.startsWith('.cleargate/hook-log/')) return 'derived';
  if (p.startsWith('.cleargate/sprint-runs/') && DERIVED_SPRINT_RUN_FILES.includes(path.posix.basename(p))) return 'derived';
  if (tracked && p === '.cleargate/sprint-runs/.active') return 'derived'; // close commits it empty; init rewrites it (STORY-066-21)
  return tracked ? 'authored' : 'ignore';
}

/** A file a scan, a seal or the QA pack writes under .cleargate/sprint-runs/<seg>/ (STORY-066-21). plans/** is not one. */
function isSprintRunOutput(rel) {
  const m = /^\.cleargate\/sprint-runs\/[^/]+\/(.+)$/.exec(rel);
  if (!m) return false;
  const inner = m[1];
  if (inner.startsWith('reports/')) return true;
  if (inner.includes('/')) return false;
  return /^\.qa-context-.+\.md$/.test(inner) || DERIVED_SPRINT_RUN_FILES.includes(inner);
}

/** Append-only ledgers teardown appends to the sprint root; the other derived files are per-checkout state (STORY-066-21 A1). */
const CARRIED_LEDGERS = Object.freeze(['pre-gate.jsonl', 'token-ledger.jsonl', 'subagent-ledger.jsonl']);

/** The part of isSprintRunOutput that teardown carries: scan reports, QA packs, append-only ledgers. */
function isCarriedOutput(rel) {
  const m = /^\.cleargate\/sprint-runs\/[^/]+\/(.+)$/.exec(rel);
  if (!m) return false;
  const inner = m[1];
  return inner.startsWith('reports/') || /^\.qa-context-.+\.md$/.test(inner) || CARRIED_LEDGERS.includes(inner);
}

/**
 * @param {{ status: string, path: string }} entry  status is the two-character porcelain XY code
 * @returns {boolean}
 */
export function isWorktreeResidue({ status, path: p }) {
  const rel = String(p).replace(/\\/g, '/');
  if (rel.startsWith('.cleargate/reports/')) return true;
  if (rel.startsWith('.cleargate/sprint-runs/') && rel.includes('/.script-incidents/')) return true;
  if (isSprintRunOutput(rel)) return true;
  if (rel.startsWith('.cleargate/delivery/') && String(status).includes('M')) return true;
  return false;
}

/**
 * @param {string} text  a pre-gate scan report
 * @returns {{ fails: { check: string, line: string, tail: string[] }[] }}
 */
export function parseScanReport(text) {
  const fails = [];
  let cur = null;
  for (const line of String(text).split('\n')) {
    const m = /^\[FAIL\] ([^:]+):/.exec(line);
    if (m) {
      cur = { check: m[1].trim(), line, tail: [] };
      fails.push(cur);
    } else if (cur && line.startsWith('  | ')) {
      cur.tail.push(line.slice(4));
    } else {
      cur = null;
    }
  }
  return { fails };
}

/**
 * @param {string} output
 * @param {{ failing?: string[], exit_code?: number, tail?: string[] | string } | null} baseline
 * @param {{ extract?: (o: string) => string[], exitCode?: number }} [seam]
 */
export function judgeTestFailure(output, baseline, { extract = extractFailing, exitCode } = {}) {
  const ids = extract(output);
  if (!baseline || !Array.isArray(baseline.failing)) return { excused: false, ids, new_ids: ids.slice(), reason: 'no-baseline' };
  if (ids.length === 0) {
    const last = lastLine(output);
    const unnamedMatch = baseline.failing.length === 0
      && Number.isInteger(baseline.exit_code) && baseline.exit_code !== 0
      && exitCode === baseline.exit_code
      && last !== '' && last === lastLine(baseline.tail);
    if (unnamedMatch) return { excused: true, ids: [], new_ids: [], reason: 'baseline-unnamed' };
    return { excused: false, ids, new_ids: [], reason: 'unparsed' };
  }
  const newIds = ids.filter((i) => !baseline.failing.includes(i));
  if (newIds.length > 0) return { excused: false, ids, new_ids: newIds, reason: 'new-failures' };
  return { excused: true, ids: ids, new_ids: [], reason: 'excused' };
}

const DEBUG_EXTENSIONS = ['.js', '.ts', '.mjs', '.cjs'];

/**
 * Debug-pattern hits in files the item changed (vs the sprint branch). Never throws.
 * @returns {{ hits: string[], error: string | null }}
 */
function changedFileDebugHits({ worktree, base, story, patterns }) {
  const d = git(worktree, ['diff', '--name-only', '-z', '--diff-filter=d', `${base}...${story}`]);
  if (d.status !== 0) return { hits: [], error: lines(d.stderr)[0] ?? `git diff exit ${d.status}` };
  const paths = d.stdout.split('\0').filter((p) => p && DEBUG_EXTENSIONS.includes(path.extname(p)));
  if (paths.length === 0) return { hits: [], error: null };
  const hits = [];
  for (const pat of patterns) {
    const g = git(worktree, ['grep', '-n', '-I', '-G', '-e', pat, '--', ...paths]);
    if (g.status === 0) { for (const h of lines(g.stdout)) if (!hits.includes(h)) hits.push(h); }
    else if (g.status !== 1) return { hits: [], error: lines(g.stderr)[0] ?? `git grep exit ${g.status}` };
  }
  return { hits, error: null };
}

export function buildResult({ id, step, exit, tail, conflict_files, post_merge_test, state, evidence }) {
  const result = { id, step, exit, tail: (tail ?? []).slice(-TAIL_LINES) };
  if (state !== undefined) result.state = state;
  if (evidence !== undefined) result.evidence = evidence;
  if (conflict_files !== undefined) result.conflict_files = conflict_files;
  if (post_merge_test !== undefined) result.post_merge_test = post_merge_test;
  return result;
}

// ---------------------------------------------------------------------------
// Process helpers
// ---------------------------------------------------------------------------

function run(cmd, args, { cwd, env } = {}) {
  const r = spawnSync(cmd, args, {
    cwd, env: env ?? process.env, encoding: 'utf8', maxBuffer: MAX_BUFFER, timeout: SPAWN_TIMEOUT_MS,
  });
  const stdout = r.stdout ?? '';
  const stderr = r.stderr ?? '';
  return { status: r.status === null ? 1 : r.status, stdout, stderr, text: `${stdout}${stderr}`, error: r.error };
}

const git = (cwd, args) => run('git', args, { cwd });
const lines = (text) => String(text).split('\n').filter((l, i, a) => !(i === a.length - 1 && l === ''));
const log = (msg) => process.stderr.write(`merge_story: ${msg}\n`);

/** Run a shell command with stdout and stderr merged. */
function shell(cmd, cwd) {
  return run('bash', ['-c', `(\n${cmd}\n) 2>&1`], { cwd, env: commandEnv() });
}

function parsePorcelainZ(out) {
  const parts = out.split('\0');
  const entries = [];
  for (let i = 0; i < parts.length; i++) {
    const p = parts[i];
    if (!p) continue;
    const status = p.slice(0, 2);
    entries.push({ status, path: p.slice(3) });
    if (status[0] === 'R' || status[0] === 'C' || status[1] === 'R' || status[1] === 'C') i++;
  }
  return entries;
}

/** Every changed and untracked path in `cwd`, as parsePorcelainZ entries. */
function statusEntries(cwd) {
  return parsePorcelainZ(git(cwd, ['status', '--porcelain=v1', '-z', '--untracked-files=all']).stdout);
}

function readJson(file) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return null; }
}

/**
 * The newest merge commit on the first-parent line of `sprintBranch` whose subject starts with
 * `merge(story/<id>):` (the subject this script writes) and, when `tip` is given, whose second
 * parent is `tip`. Returns its SHA, or null.
 */
function findStoryMerge(root, sprintBranch, id, tip) {
  const r = git(root, ['log', '--first-parent', '--merges', '--format=%H %P%x09%s', sprintBranch, '--']);
  if (r.status !== 0) return null;
  const subject = `merge(story/${id}):`;
  for (const l of lines(r.stdout)) {
    const tab = l.indexOf('\t');
    if (tab < 0 || !l.slice(tab + 1).startsWith(subject)) continue;
    const [sha, , second] = l.slice(0, tab).split(' ');
    if (tip == null || second === tip) return sha;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Set-aside of derived dirt
// ---------------------------------------------------------------------------

function setAside(root) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cg-merge-aside-'));
  const saved = [];
  for (const e of statusEntries(root)) {
    const tracked = e.status !== '??';
    if (classifyDirtyPath(e.path, { tracked }) !== 'derived') continue;
    const abs = path.join(root, e.path);
    const deleted = tracked && !fs.existsSync(abs);
    if (!deleted) {
      fs.mkdirSync(path.dirname(path.join(dir, e.path)), { recursive: true });
      fs.copyFileSync(abs, path.join(dir, e.path));
    }
    const inHead = tracked && git(root, ['cat-file', '-e', `HEAD:${e.path}`]).status === 0;
    saved.push({ rel: e.path, deleted, tracked, inHead });
  }
  for (const s of saved) {
    if (s.inHead) git(root, ['checkout', 'HEAD', '--', s.rel]);
    else {
      if (s.tracked) git(root, ['rm', '-q', '--cached', '--', s.rel]);
      fs.rmSync(path.join(root, s.rel), { force: true });
    }
  }
  return { dir, saved };
}

function writeBack(root, aside, mergedWikiPaths) {
  for (const s of aside.saved) {
    if (s.rel.startsWith('.cleargate/wiki/') && mergedWikiPaths.has(s.rel)) continue;
    const abs = path.join(root, s.rel);
    if (s.deleted) { fs.rmSync(abs, { force: true }); continue; }
    fs.mkdirSync(path.dirname(abs), { recursive: true });
    fs.copyFileSync(path.join(aside.dir, s.rel), abs);
  }
  fs.rmSync(aside.dir, { recursive: true, force: true });
}

/** Carry untracked sprint-run outputs from a story worktree to the same paths in the sprint root (STORY-066-21). */
function carryRuntimeFiles(entries, worktree, root) {
  let carried = 0;
  const kept = [];
  const dropped = [];
  for (const e of entries) {
    if (!isSprintRunOutput(e.path)) continue;
    if (!isCarriedOutput(e.path)) { if (!e.status.includes('D')) dropped.push(e.path); continue; }
    if (e.status !== '??') continue;
    const src = path.join(worktree, e.path);
    if (!fs.existsSync(src)) continue;
    const dest = path.join(root, e.path);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    if (e.path.endsWith('.jsonl')) {
      const add = fs.readFileSync(src, 'utf8');
      if (add !== '') {
        const have = fs.existsSync(dest) ? fs.readFileSync(dest, 'utf8') : '';
        const lead = have !== '' && !have.endsWith('\n') ? '\n' : '';
        fs.appendFileSync(dest, `${lead}${add}${add.endsWith('\n') ? '' : '\n'}`);
      }
      carried++;
    } else if (!fs.existsSync(dest)) {
      fs.copyFileSync(src, dest);
      carried++;
    } else if (!fs.readFileSync(src).equals(fs.readFileSync(dest))) {
      kept.push(e.path);
    }
  }
  return { carried, kept, dropped };
}

// ---------------------------------------------------------------------------
// The merge
// ---------------------------------------------------------------------------

function mergeStory({ id, sprintId, worktreeArg, env }) {
  const scriptDir = path.dirname(fileURLToPath(import.meta.url));
  const notices = [];
  const fail = (step, exit, tail, extra = {}) => buildResult({ id, step, exit, tail: [...(tail ?? []), ...notices], ...extra });
  const pre = (tail) => fail('precondition', MERGE_EXIT.PRECONDITION, tail);

  // 1. Resolve.
  const guess = env.ORCHESTRATOR_PROJECT_DIR || path.resolve(scriptDir, '..', '..');
  const top = git(guess, ['rev-parse', '--show-toplevel']);
  if (top.status !== 0) return pre([`not a git checkout: ${guess}`]);
  const root = top.stdout.trim();
  const sprintBranch = sprintBranchFor(sprintId);
  const storyBranch = `story/${id}`;
  const sprintDir = path.join(root, '.cleargate', 'sprint-runs', sprintId);
  const stateFile = path.join(sprintDir, 'state.json');
  const worktree = path.resolve(worktreeArg ?? path.join(root, '.worktrees', id));

  // 6 and 7. Teardown and state, shared by a fresh merge and a resumed one (Requirement 3). Anything
  // that fails here happens after the merge landed: name the step and the re-run (Requirement 2).
  const finish = ({ mergeSha, resumed, branchGone = false, postMerge = 'skipped', postTail = [] }) => {
    const rerun = `merge_story.mjs ${id} --sprint ${sprintId}${worktreeArg ? ` --worktree ${worktreeArg}` : ''}`;
    const landedLine = `merge commit ${mergeSha} has landed on ${sprintBranch}; re-run ${rerun} to finish teardown and state`;
    const after = (step, tail) => buildResult({ id, step, exit: MERGE_EXIT.PRECONDITION, tail: [...tail, ...notices, landedLine] });
    let step = 'teardown';
    const proofInfo = { state: 'Done', evidence: null, tail: [] };
    try {
      log(resumed ? `${storyBranch} already merged (${mergeSha}); teardown and state only` : 'teardown');
      if (fs.existsSync(worktree)) {
        let rm = git(root, ['worktree', 'remove', worktree]);
        if (rm.status !== 0) {
          const entries = statusEntries(worktree);
          const real = entries.filter((e) => !isWorktreeResidue(e));
          if (real.length) return after('teardown', ['worktree holds uncommitted work:', ...real.map((e) => `  ${e.status} ${e.path}`)]);
          for (const e of entries) {
            if (!e.path.includes('/.script-incidents/') || !e.path.endsWith('.json')) continue;
            const src = path.join(worktree, e.path);
            if (!fs.existsSync(src)) continue; // deleted or moved out of the worktree: residue, nothing to copy
            const dest = path.join(sprintDir, '.script-incidents');
            fs.mkdirSync(dest, { recursive: true });
            fs.copyFileSync(src, path.join(dest, path.basename(e.path)));
          }
          const moved = carryRuntimeFiles(entries, worktree, root);
          if (moved.carried > 0) notices.push(`carried from the worktree: ${moved.carried} file(s)`);
          for (const rel of moved.kept) notices.push(`not carried (the sprint dir has its own): ${rel}`);
          for (const rel of moved.dropped) notices.push(`not carried (per-checkout state, removed with the worktree): ${rel}`);
          rm = git(root, ['worktree', 'remove', '--force', worktree]);
          if (rm.status !== 0) return after('teardown', lines(rm.text));
        }
      } else {
        git(root, ['worktree', 'prune']); // a deleted worktree directory still registered blocks the branch delete
      }
      if (!branchGone) {
        // A resumed run may find the main checkout on another branch; its merge commit proves the tip is merged.
        const bd = git(root, ['branch', resumed ? '-D' : '-d', storyBranch]);
        if (bd.status !== 0) return after('teardown', lines(bd.text));
      }
      step = 'state';
      // STORY-065-03 (R1/R1a): a tiered item moves to Done only on passing evidence at its tier;
      // otherwise it waits in Sprint Review. An untiered item goes to Done as before.
      let tier = null;
      try { const f = findItemFile(root, id); if (f) tier = readProofTier(fs.readFileSync(f, 'utf8')); } catch { tier = null; }
      const ev = readEvidence(sprintDir, id);
      proofInfo.evidence = ev ? evidencePath(sprintDir, id) : null;
      if (isProofTier(tier)) {
        const ps = proofStatus(ev, tier);
        if (!ps.ok) {
          proofInfo.state = 'Sprint Review';
          proofInfo.tail = [`awaiting proof: ${tier} (${ps.reason === 'tier' ? `tier ${ps.recorded_tier}` : ps.reason})`];
        }
      }
      const up = run('node', [path.join(scriptDir, 'update_state.mjs'), id, proofInfo.state], { cwd: root, env: { ...env, CLEARGATE_STATE_FILE: stateFile } });
      if (up.status !== 0) return after('state', lines(up.text));
    } catch (err) {
      return after(step, [`unexpected error: ${err.message}`]);
    }
    if (resumed) {
      return buildResult({
        id, step: 'done', exit: MERGE_EXIT.MERGED, post_merge_test: 'skipped',
        state: proofInfo.state, evidence: proofInfo.evidence,
        tail: [`resumed: ${storyBranch} was already merged into ${sprintBranch}; teardown and state only`, ...proofInfo.tail],
      });
    }
    return fail('done', MERGE_EXIT.MERGED, [...postTail, ...proofInfo.tail], { post_merge_test: postMerge, state: proofInfo.state, evidence: proofInfo.evidence });
  };

  // 2. Preconditions.
  const state = readJson(stateFile);
  if (!state || !state.stories || !state.stories[id]) return pre([`${stateFile} is missing or has no entry for ${id}`]);
  const hasBranch = (b) => git(root, ['show-ref', '--verify', '--quiet', `refs/heads/${b}`]).status === 0;
  if (!hasBranch(sprintBranch)) return pre([`branch ${sprintBranch} does not exist`]);
  if (!hasBranch(storyBranch)) {
    const landedSha = findStoryMerge(root, sprintBranch, id, null); // a run that failed at `state` deleted the branch
    if (landedSha) return finish({ mergeSha: landedSha, resumed: true, branchGone: true });
    return pre([`branch ${storyBranch} does not exist`]);
  }
  const ahead = Number(git(root, ['rev-list', '--count', `${sprintBranch}..${storyBranch}`]).stdout.trim());
  if (!(ahead > 0)) {
    const tip = git(root, ['rev-parse', '--verify', '-q', `${storyBranch}^{commit}`]).stdout.trim();
    const landedSha = tip ? findStoryMerge(root, sprintBranch, id, tip) : null;
    if (landedSha) return finish({ mergeSha: landedSha, resumed: true });
    return pre([`${storyBranch} is not ahead of ${sprintBranch}`]);
  }
  if (git(root, ['rev-parse', '-q', '--verify', 'MERGE_HEAD']).status === 0) return pre(['a merge is already in progress in the main checkout']);
  if (!fs.existsSync(worktree) || !fs.statSync(worktree).isDirectory()) return pre([`worktree does not exist: ${worktree}`]);

  const dirt = statusEntries(root);
  const authored = dirt.filter((e) => classifyDirtyPath(e.path, { tracked: e.status !== '??' }) === 'authored');
  if (authored.length) return pre(['authored changes in the main checkout; commit or revert them first:', ...authored.map((e) => `  ${e.status} ${e.path}`)]);
  const wtReal = statusEntries(worktree).filter((e) => !isWorktreeResidue(e));
  if (wtReal.length) return pre(['uncommitted work in the worktree:', ...wtReal.map((e) => `  ${e.status} ${e.path}`)]);

  const baseline = readJson(path.join(sprintDir, 'baseline.json'));
  const gate = readJson(path.join(scriptDir, 'gate-checks.json')) ?? {};
  const qaTest = String(gate.qa?.test ?? '').trim();
  const prebuild = String(gate.merge?.prebuild ?? '').trim();
  const postTest = String(gate.merge?.post_test ?? '').trim() || qaTest;
  const waiver = typeof gate.qa?.test_waiver === 'string' ? gate.qa.test_waiver.trim() : '';
  const notExcused = (cmd) => `not excused: "${cmd}" stopped before running any test and no qa.test_waiver is recorded in gate-checks.json`;

  // 3. Pre-merge check.
  log(`pre-merge check for ${id}`);
  const reportFile = path.join(worktree, '.cleargate', 'reports', 'pre-qa-scan.txt');
  fs.rmSync(reportFile, { force: true });
  const scan = run('bash', [path.join(scriptDir, 'pre_gate_runner.sh'), 'qa', worktree, storyBranch], {
    cwd: root, env: { ...env, CLEARGATE_SCAN_NO_LANE_ROUTING: '1' },
  });
  if (scan.status !== 0 && scan.status !== 1) return pre([`the pre-merge scan could not run (exit ${scan.status})`, ...lines(scan.text)]);
  let remaining = [];
  if (scan.status === 1) {
    const report = fs.existsSync(reportFile) ? fs.readFileSync(reportFile, 'utf8') : '';
    let { fails } = parseScanReport(report);
    let refuse = false;
    let tail = [];
    if (fails.length === 0) {
      refuse = true;
      tail = lines(scan.text);
    } else {
      const dbgIdx = fails.findIndex((f) => f.check === 'debug_patterns');
      const patterns = Array.isArray(gate.qa?.debug_patterns) ? gate.qa.debug_patterns.filter((p) => typeof p === 'string' && p !== '') : [];
      if (dbgIdx >= 0 && patterns.length > 0) {
        const { hits, error } = changedFileDebugHits({ worktree, base: sprintBranch, story: storyBranch, patterns });
        if (error) {
          fails[dbgIdx] = { ...fails[dbgIdx], tail: [...fails[dbgIdx].tail, `changed-file check could not run: ${error}`] };
        } else if (hits.length === 0) {
          fails = fails.filter((_, i) => i !== dbgIdx);
        } else {
          fails[dbgIdx] = {
            check: 'debug_patterns',
            line: `[FAIL] debug_patterns: hits in files this item changed (vs ${sprintBranch})`,
            tail: hits.slice(0, 10),
          };
        }
      }
      remaining = fails;
      tail = remaining.flatMap((f) => [f.line, ...f.tail.map((l) => `  | ${l}`)]);
      if (remaining.length > 0) {
        refuse = remaining.some((f) => f.check !== 'test');
        if (!refuse && !(baseline && qaTest)) refuse = true;
        if (!refuse) {
          const rerun = shell(qaTest, worktree);
          const verdict = judgeTestFailure(rerun.text, baseline, { exitCode: rerun.status });
          log(`baseline judgement: ${verdict.reason}`);
          tail = lines(rerun.text);
          refuse = !verdict.excused;
          if (verdict.reason === 'baseline-unnamed') {
            if (waiver) {
              notices.push(`NOT TESTED (pre-merge): "${qaTest}" stopped before running any test (exit ${rerun.status}; exit code and last line match baseline.json); excused under waiver "${waiver}"`);
            } else {
              refuse = true;
              tail = [...tail, notExcused(qaTest)];
            }
          }
        }
      }
    }
    if (refuse) {
      if (state.stories[id].lane === 'fast') {
        const names = [...new Set(remaining.map((f) => f.check))].join(', ') || 'scan';
        const d = run('node', [path.join(scriptDir, 'update_state.mjs'), id, '--lane-demote', `pre-merge check failed: ${names}`], {
          cwd: root, env: { ...env, CLEARGATE_STATE_FILE: stateFile },
        });
        if (d.status !== 0) tail = [...tail, `lane demotion failed (exit ${d.status}): ${d.text.trim()}`];
      }
      return fail('pre-merge', MERGE_EXIT.CHECK_FAILED, tail);
    }
  }

  // 4 and 5. Set the derived dirt aside, merge, build, test; always write it back.
  const aside = setAside(root);
  let preSha = '';
  let landed = false;
  let mergeSha = '';
  let outcome = null;
  let postMerge = 'skipped';
  let postTail = [];
  let crash = null;
  try {
    const cur = git(root, ['branch', '--show-current']).stdout.trim();
    if (cur !== sprintBranch) {
      const co = git(root, ['checkout', sprintBranch]);
      if (co.status !== 0) { outcome = pre([`cannot check out ${sprintBranch}`, ...lines(co.text)]); }
    }
    if (!outcome) {
      preSha = git(root, ['rev-parse', 'HEAD']).stdout.trim();
      log(`merging ${storyBranch} into ${sprintBranch}`);
      const m = git(root, ['merge', '--no-ff', '--no-edit', '-m', `merge(story/${id}): ${id}`, storyBranch]);
      if (m.status !== 0) {
        const conflicts = lines(git(root, ['diff', '--name-only', '--diff-filter=U']).stdout);
        if (git(root, ['rev-parse', '-q', '--verify', 'MERGE_HEAD']).status === 0) git(root, ['merge', '--abort']);
        outcome = conflicts.length
          ? fail('merge', MERGE_EXIT.CONFLICT, lines(m.text), { conflict_files: conflicts })
          : fail('merge', MERGE_EXIT.PRECONDITION, lines(m.text));
      } else {
        mergeSha = git(root, ['rev-parse', 'HEAD']).stdout.trim();
        landed = mergeSha !== preSha;
      }
    }
    if (!outcome && prebuild) {
      log('prebuild');
      const b = shell(prebuild, root);
      if (b.status !== 0) outcome = fail('post-merge-test', MERGE_EXIT.POST_TEST_FAILED, lines(b.text));
    }
    if (!outcome && postTest) {
      log('post-merge test');
      const t = shell(postTest, root);
      postTail = lines(t.text);
      let v;
      if (t.status === 0) postMerge = 'pass';
      else if ((v = judgeTestFailure(t.text, baseline, { exitCode: t.status })).excused && (v.reason !== 'baseline-unnamed' || waiver)) {
        postMerge = 'excused';
        if (v.reason === 'baseline-unnamed') {
          notices.push(`NOT TESTED (post-merge): "${postTest}" stopped before running any test (exit ${t.status}; exit code and last line match baseline.json); excused under waiver "${waiver}"`);
        }
      } else {
        postMerge = 'fail';
        const failTail = v && v.reason === 'baseline-unnamed' ? [...postTail, notExcused(postTest)] : postTail;
        outcome = fail('post-merge-test', MERGE_EXIT.POST_TEST_FAILED, failTail, { post_merge_test: 'fail' });
      }
    }
  } catch (err) {
    crash = err;
  } finally {
    let wiki = new Set();
    if (landed) wiki = new Set(lines(git(root, ['diff', '--name-only', preSha, 'HEAD']).stdout));
    try {
      writeBack(root, aside, wiki);
    } catch (err) {
      crash = crash ?? err;
      outcome = fail('merge', MERGE_EXIT.PRECONDITION, [`write-back failed: ${err.message}`, `saved files kept in ${aside.dir}`]);
    }
  }
  if (crash && !outcome) {
    return fail('merge', MERGE_EXIT.PRECONDITION, [`crash: ${crash.message}`, `saved files, if any, are in ${aside.dir}`]);
  }
  if (outcome) return outcome;

  return finish({ mergeSha, resumed: false, postMerge, postTail });
}

function parseArgs(argv) {
  let id = null;
  let sprint = null;
  let worktree;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--sprint') sprint = argv[++i];
    else if (a === '--worktree') worktree = argv[++i];
    else if (a.startsWith('--') || id !== null) return null;
    else id = a;
  }
  if (!id || !sprint) return null;
  const ids = extractWorkItemIds(id);
  if (ids.length !== 1 || ids[0] !== id) return null;
  try { sprintBranchFor(sprint); } catch { return null; }
  return { id, sprintId: sprint, worktreeArg: worktree };
}

function main(argv) {
  const args = parseArgs(argv);
  if (!args) {
    process.stderr.write(USAGE);
    process.stdout.write(`${JSON.stringify(buildResult({ id: null, step: 'precondition', exit: MERGE_EXIT.PRECONDITION, tail: USAGE.trimEnd().split('\n') }))}\n`);
    return MERGE_EXIT.PRECONDITION;
  }
  let result;
  // Reached only before the merge: after it, finish() catches and names its step.
  try {
    result = mergeStory({ ...args, env: process.env });
  } catch (err) {
    result = buildResult({ id: args.id, step: 'precondition', exit: MERGE_EXIT.PRECONDITION, tail: [`unexpected error: ${err.message}`] });
  }
  process.stdout.write(`${JSON.stringify(result)}\n`);
  return result.exit;
}

function isMainModule() {
  try {
    return fs.realpathSync(fileURLToPath(import.meta.url)) === fs.realpathSync(process.argv[1]);
  } catch {
    return false;
  }
}

if (isMainModule()) {
  process.exit(main(process.argv.slice(2)));
}
