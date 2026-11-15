/**
 * sprint-finish.mjs — STORY-066-17. The sprint finish run by close_sprint.mjs: its plan at
 * Step 2.8 (read-only; also the Gate 4 prompt's "On --assume-ack close will: …" line) and the
 * finish itself at Step 7.8 on the ack.
 *
 * One sequence for both layouts:
 *   plain    — close runs in the checkout on sprint/S-NN and no checkout has main: commit
 *              there, `git checkout main` there, merge there, delete the branch. A failure
 *              after the checkout checks sprint/S-NN back out there (restoreBranch).
 *   worktree — close runs in a worktree on sprint/S-NN and the parent checkout has main:
 *              commit in the worktree, `git -C <parent> merge`, keep the branch (the session
 *              worktree still has it checked out) and print its delete command.
 *
 * Exports (P10): listWorktrees(root), planFinish({ root, sprintBranch }), runFinish(plan, { sprintId }).
 * git runs through spawnSync argv arrays, with GIT_DIR / GIT_WORK_TREE / GIT_INDEX_FILE dropped
 * (a hook-exported GIT_DIR would retarget `git -C`). Nothing here throws. Never --no-verify.
 */

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const MAIN = 'main';
const GIT_ENV_DROP = ['GIT_DIR', 'GIT_WORK_TREE', 'GIT_INDEX_FILE', 'GIT_COMMON_DIR', 'GIT_OBJECT_DIRECTORY', 'GIT_PREFIX'];
const MAX_BUFFER = 32 * 1024 * 1024;

/**
 * @typedef {{ path: string, head: string | null, branch: string | null, detached: boolean, bare: boolean }} Worktree
 * @typedef {{
 *   ok: boolean, unavailable: boolean, error: string | null, details: string[], resolve: string | null,
 *   warnings: string[], root: string, sprintBranch: string, rootBranch: string | null,
 *   mainAt: string | null, mergeIn: string, checkoutMain: boolean, merged: boolean,
 *   keepAt: string | null, active: string | null, text: string,
 * }} FinishPlan
 * @typedef {{
 *   ok: boolean, lines: string[], warnings: string[], errors: string[], commitSha: string | null,
 *   mergeSha: string | null, mergedIn: string | null, keptAt: string | null, branchDeleted: boolean,
 * }} FinishResult
 */

/** `git -C <cwd> <args>`; never throws. */
function git(cwd, args) {
  const env = { ...process.env };
  for (const k of GIT_ENV_DROP) delete env[k];
  const r = spawnSync('git', ['-C', cwd, ...args], { encoding: 'utf8', env, maxBuffer: MAX_BUFFER });
  const stdout = r.stdout ?? '';
  const stderr = r.stderr ?? '';
  return { status: r.error ? 127 : (r.status ?? 1), stdout, stderr, text: stdout + stderr };
}

/** Real path when it exists (git prints real paths: /tmp → /private/tmp), else resolved. */
function real(p) {
  try {
    return fs.realpathSync(p);
  } catch {
    return path.resolve(p);
  }
}

/** Non-empty lines with trailing whitespace trimmed; a leading space is kept (porcelain ` M x`). */
function lines(s) {
  return String(s).split('\n').map((l) => l.replace(/\s+$/, '')).filter((l) => l !== '');
}

/** `sprint/S-01` → `SPRINT-01` (the derivation close_sprint.mjs Step 2.8 inverts). */
function sprintIdOf(sprintBranch) {
  const m = /^sprint\/S-(\d{2,3})$/.exec(sprintBranch);
  return m ? `SPRINT-${m[1]}` : null;
}

function readActive(root) {
  try {
    return fs.readFileSync(path.join(root, '.cleargate', 'sprint-runs', '.active'), 'utf8').trim();
  } catch {
    return null;
  }
}

/**
 * Every worktree of the repository that holds `root`, from `git worktree list --porcelain`.
 * `branch` is the short name (`main`, `sprint/S-01`), null when detached; paths are real paths.
 * @param {string} root
 * @returns {Worktree[] | null} null when git fails
 */
export function listWorktrees(root) {
  const r = git(root, ['worktree', 'list', '--porcelain']);
  if (r.status !== 0) return null;
  /** @type {Worktree[]} */
  const out = [];
  /** @type {Worktree | null} */
  let cur = null;
  for (const line of r.stdout.split('\n')) {
    if (line.startsWith('worktree ')) {
      cur = { path: real(line.slice('worktree '.length)), head: null, branch: null, detached: false, bare: false };
      out.push(cur);
    } else if (cur && line.startsWith('HEAD ')) {
      cur.head = line.slice('HEAD '.length);
    } else if (cur && line.startsWith('branch ')) {
      cur.branch = line.slice('branch '.length).replace(/^refs\/heads\//, '');
    } else if (cur && line === 'detached') {
      cur.detached = true;
    } else if (cur && line === 'bare') {
      cur.bare = true;
    }
  }
  return out;
}

/**
 * Step 2.8 (read-only): can the finish run, where does it commit and merge, and the Gate 4 text.
 * `unavailable` = git or a ref is missing (close fails open, as before). `ok: false` without
 * `unavailable` = a refusal: `error`, `details` (one line each) and `resolve` name it.
 * @param {{ root: string, sprintBranch: string }} args  sprintBranch is the short name, e.g. `sprint/S-01`
 * @returns {FinishPlan}
 */
export function planFinish({ root, sprintBranch }) {
  const rootReal = real(root);
  /** @type {FinishPlan} */
  const plan = {
    ok: false, unavailable: false, error: null, details: [], resolve: null, warnings: [],
    root: rootReal, sprintBranch, rootBranch: null, mainAt: null, mergeIn: rootReal,
    checkoutMain: false, merged: false, keepAt: null, active: null, text: '',
  };
  const unavailable = (error) => Object.assign(plan, { unavailable: true, error });
  const refuse = (error, details, resolve) => Object.assign(plan, { error, details, resolve });

  const top = git(rootReal, ['rev-parse', '--show-toplevel']);
  if (top.status !== 0 || real(top.stdout.trim()) !== rootReal) {
    return unavailable(`${rootReal} is not the top of a git checkout`);
  }
  for (const ref of [`refs/heads/${sprintBranch}`, `refs/heads/${MAIN}`]) {
    if (git(rootReal, ['rev-parse', '--verify', '--quiet', ref]).status !== 0) return unavailable(`${ref} not found`);
  }
  const wts = listWorktrees(rootReal);
  if (wts === null) return unavailable('git worktree list failed');

  const here = wts.find((w) => w.path === rootReal);
  plan.rootBranch = here ? here.branch : null;
  const mainWt = wts.find((w) => w.branch === MAIN);
  plan.mainAt = mainWt ? mainWt.path : null;
  plan.checkoutMain = plan.mainAt === null;
  plan.mergeIn = plan.mainAt ?? rootReal;
  const holder = wts.find((w) => w.branch === sprintBranch);
  // In the plain layout the finish checks out main in root, so root stops holding the branch.
  plan.keepAt = holder && !(holder.path === rootReal && plan.checkoutMain) ? holder.path : null;
  plan.active = readActive(rootReal);

  // 1. Mergeability: already an ancestor, else a clean merge-tree.
  const anc = git(rootReal, ['merge-base', '--is-ancestor', `refs/heads/${sprintBranch}`, `refs/heads/${MAIN}`]);
  if (anc.status === 0) {
    plan.merged = true;
  } else if (anc.status !== 1) {
    return unavailable(`git merge-base exited ${anc.status}${lines(anc.stderr)[0] ? `: ${lines(anc.stderr)[0]}` : ''}`);
  } else {
    const mt = git(rootReal, ['merge-tree', '--write-tree', '--name-only', '--no-messages', `refs/heads/${MAIN}`, `refs/heads/${sprintBranch}`]);
    const out = lines(mt.stdout);
    if (mt.status === 1 && /^[0-9a-f]{40,64}$/.test(out[0] ?? '')) {
      return refuse(
        `${sprintBranch} does not merge cleanly into ${MAIN}; conflicting paths:`,
        [...new Set(out.slice(1))],
        `merge ${MAIN} into ${sprintBranch} and resolve the conflicts`,
      );
    }
    if (mt.status !== 0) {
      plan.warnings.push(
        `git merge-tree --write-tree is unavailable (git 2.38 or newer; ${lines(mt.text)[0] ?? `exit ${mt.status}`}); ` +
        'the mergeability pre-check is skipped and Step 7.8 aborts the merge on a conflict',
      );
    }
  }

  // 2. The checkout that receives the merge, when it is not the one close commits in first (D-2).
  if (plan.mainAt !== null && plan.mainAt !== rootReal) {
    if (!fs.existsSync(plan.mainAt)) {
      return refuse(`${plan.mainAt} has ${MAIN} checked out but no longer exists`, [], 'run git worktree prune');
    }
    const st = git(plan.mainAt, ['status', '--porcelain', '--untracked-files=no']);
    if (st.status !== 0) return unavailable(`git status failed in ${plan.mainAt}`);
    const dirty = lines(st.stdout);
    if (dirty.length > 0) {
      return refuse(
        `${plan.mainAt} has ${MAIN} checked out and receives the merge, but it has tracked changes:`,
        dirty,
        `commit or discard the changes in ${plan.mainAt}`,
      );
    }
  }

  // 3. Where the close artefacts are committed (D-3).
  if (plan.rootBranch === null) {
    return refuse(
      `${rootReal} is on a detached HEAD; the finish commits the close artefacts on ${sprintBranch} or ${MAIN}`,
      [],
      `check out ${sprintBranch} in ${rootReal}`,
    );
  }
  if (plan.rootBranch !== sprintBranch && plan.rootBranch !== MAIN) {
    return refuse(
      `${rootReal} is on ${plan.rootBranch}; the finish commits the close artefacts on ${sprintBranch} or ${MAIN}`,
      [],
      `check out ${sprintBranch} in ${rootReal}`,
    );
  }

  plan.ok = true;
  plan.text = finishText(plan);
  return plan;
}

/** The Gate 4 line (Requirement 5). */
function finishText(p) {
  const where = p.checkoutMain ? `${p.root} after git checkout ${MAIN}` : p.mergeIn;
  const id = sprintIdOf(p.sprintBranch);
  const active = p.active === null
    ? 'leave .active (absent)'
    : p.active === id
      ? `clear .active (reads ${id})`
      : `leave .active (reads ${p.active === '' ? 'nothing' : p.active})`;
  const branch = p.keepAt ? `keep (checked out at ${p.keepAt})` : 'delete';
  return `On --assume-ack close will: commit close artefacts on ${p.rootBranch} in ${p.root}; ` +
    `merge ${p.sprintBranch} into ${MAIN} in ${where}; ${active}; ${branch} ${p.sprintBranch}.`;
}

/** A path as a shell word: bare when it is only [A-Za-z0-9_./@%+=:,-], else single-quoted. */
function shq(p) {
  return /^[A-Za-z0-9_./@%+=:,-]+$/.test(p) ? p : `'${p.replace(/'/g, `'\\''`)}'`;
}

/**
 * After a Step 7.8 failure, put `root` back on `onBranch`, the branch the finish started on.
 * The plain layout checks out main in root before it merges; a re-run from main stops at
 * "sprint directory not found", because the sprint dir exists only on sprint/S-NN.
 * Adds to res.errors: nothing when root never left onBranch; `restored: …` when the checkout
 * worked; else where root is left, git's output and the one command to run before the re-run.
 * @param {string} root
 * @param {string} onBranch
 * @param {FinishResult} res
 */
function restoreBranch(root, onBranch, res) {
  const now = git(root, ['symbolic-ref', '-q', '--short', 'HEAD']);
  const leftOn = now.status === 0 ? now.stdout.trim() : null;
  if (leftOn === onBranch) return;
  const back = git(root, ['checkout', onBranch]);
  if (back.status === 0) {
    res.errors.push(`restored: ${root} is back on ${onBranch}`);
    return;
  }
  const abort = git(root, ['rev-parse', '-q', '--verify', 'MERGE_HEAD']).status === 0
    ? `git -C ${shq(root)} merge --abort && `
    : '';
  res.errors.push(
    `git checkout ${onBranch} failed in ${root}; it is left on ${leftOn ?? 'a detached HEAD'}:`,
    ...lines(back.text).map((l) => `| ${l}`),
    `recover: clear what git reports above, then run: ${abort}git -C ${shq(root)} checkout ${onBranch}`,
  );
}

/**
 * Step 7.8 on the ack: commit → merge → verify → branch. Never throws; never --no-verify.
 * @param {FinishPlan} plan  an ok plan from planFinish
 * @param {{ sprintId: string }} opts
 * @returns {FinishResult}
 */
export function runFinish(plan, { sprintId }) {
  /** @type {FinishResult} */
  const res = {
    ok: false, lines: [], warnings: [], errors: [], commitSha: null,
    mergeSha: null, mergedIn: null, keptAt: null, branchDeleted: false,
  };
  const fail = (msg, out) => {
    res.errors.push(msg, ...lines(out ?? '').map((l) => `| ${l}`));
    return res;
  };
  if (!plan || !plan.ok) return fail('no finish plan: Step 2.8 did not pass');
  const { root, sprintBranch } = plan;

  // a. Commit the close artefacts in the checkout close runs in.
  const head = git(root, ['symbolic-ref', '-q', '--short', 'HEAD']);
  if (head.status !== 0) return fail(`${root} is on a detached HEAD; check out ${sprintBranch} and re-run the ack pass`);
  const onBranch = head.stdout.trim();
  if (fs.existsSync(path.join(root, '.cleargate'))) {
    const addC = git(root, ['add', '-A', '--', '.cleargate']);
    if (addC.status !== 0) return fail(`git add -A -- .cleargate failed in ${root}`, addC.text);
  }
  const addU = git(root, ['add', '-u']);
  if (addU.status !== 0) return fail(`git add -u failed in ${root}`, addU.text);
  const staged = git(root, ['diff', '--cached', '--quiet']);
  if (staged.status === 1) {
    const c = git(root, ['commit', '-m', `chore(${sprintId}): close — sprint_status Completed, close artefacts`]);
    if (c.status !== 0) {
      return fail(`git commit failed in ${root} (a pre-commit hook?); fix the cause and re-run the ack pass, never with --no-verify`, c.text);
    }
    res.commitSha = git(root, ['rev-parse', 'HEAD']).stdout.trim();
    res.lines.push(`Step 7.8: committed close artefacts on ${onBranch} at ${res.commitSha}`);
  } else if (staged.status === 0) {
    res.lines.push(`Step 7.8: no close artefacts to commit on ${onBranch}`);
  } else {
    return fail(`git diff --cached failed in ${root}`, staged.text);
  }
  const loose = git(root, ['ls-files', '--others', '--exclude-standard', '-z']).stdout
    .split('\0').filter((p) => p !== '' && !p.startsWith('.cleargate/'));
  if (loose.length > 0) {
    res.warnings.push(
      `untracked files outside .cleargate/ were left uncommitted: ${loose.slice(0, 10).join(', ')}` +
      (loose.length > 10 ? ` (+${loose.length - 10} more)` : ''),
    );
  }

  // b. Merge in the checkout that has main (main checked out nowhere: check it out in root first).
  //    Every failure from here on returns through failBack, which puts root back on onBranch.
  const failBack = (msg, out) => {
    fail(msg, out);
    restoreBranch(root, onBranch, res);
    return res;
  };
  if (plan.checkoutMain) {
    const co = git(root, ['checkout', MAIN]);
    if (co.status !== 0) return failBack(`git checkout ${MAIN} failed in ${root}`, co.text);
  }
  const into = plan.mergeIn;
  const m = git(into, ['merge', '--no-ff', '-m', `merge: ${sprintBranch} → ${MAIN}`, sprintBranch]);
  if (m.status !== 0) {
    const files = lines(git(into, ['diff', '--name-only', '--diff-filter=U']).stdout);
    if (git(into, ['rev-parse', '-q', '--verify', 'MERGE_HEAD']).status === 0) git(into, ['merge', '--abort']);
    return failBack(
      files.length > 0
        ? `merging ${sprintBranch} into ${MAIN} in ${into} conflicted on: ${files.join(', ')} (merge aborted)`
        : `merging ${sprintBranch} into ${MAIN} in ${into} failed`,
      m.text,
    );
  }
  res.mergedIn = into;

  // c. Verify.
  if (git(root, ['merge-base', '--is-ancestor', `refs/heads/${sprintBranch}`, `refs/heads/${MAIN}`]).status !== 0) {
    return failBack(`${sprintBranch} is not an ancestor of ${MAIN} after the merge in ${into}`);
  }
  res.mergeSha = git(root, ['rev-parse', `refs/heads/${MAIN}`]).stdout.trim();
  res.lines.push(`Step 7.8: ${sprintBranch} merged to ${MAIN} at ${res.mergeSha} (in ${into})`);

  // d. Branch: keep it while a worktree has it checked out, else delete it.
  const holder = (listWorktrees(root) ?? []).find((w) => w.branch === sprintBranch);
  if (holder) {
    res.keptAt = holder.path;
    res.lines.push(`Step 7.8: ${sprintBranch} kept — checked out at ${holder.path}. After leaving it: git branch -d ${sprintBranch}`);
  } else {
    const d = git(root, ['branch', '-d', sprintBranch]);
    if (d.status === 0) {
      res.branchDeleted = true;
      res.lines.push(`Step 7.8: ${sprintBranch} deleted`);
    } else {
      res.warnings.push(`git branch -d ${sprintBranch} failed (${lines(d.text)[0] ?? `exit ${d.status}`}); delete it by hand: git branch -d ${sprintBranch}`);
    }
  }
  res.ok = true;
  return res;
}
