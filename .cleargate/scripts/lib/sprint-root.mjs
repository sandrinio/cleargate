#!/usr/bin/env node
/**
 * lib/sprint-root.mjs — the checkout a script copy writes sprint-run files into (STORY-066-21).
 *
 * A ClearGate story worktree lives at <root>/.worktrees/<ID> and holds its own copy of .cleargate/scripts.
 * sprintRoot(dir) returns <root> when dir is <root>/.worktrees/<ID>, both are the top of their own
 * checkout, and both share one git common dir; otherwise path.resolve(dir). Never reads .active, never throws.
 *
 * CLI: node sprint-root.mjs <dir>   prints the path, exit 0; no argument: usage on stderr, exit 2.
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

function real(p) {
  try { return fs.realpathSync(p); } catch { return path.resolve(p); }
}

function gitOut(dir, args) {
  const env = { ...process.env };
  delete env.GIT_DIR;
  delete env.GIT_WORK_TREE;
  delete env.GIT_INDEX_FILE;
  const r = spawnSync('git', ['-C', dir, ...args], { encoding: 'utf8', env });
  const out = r.status === 0 ? String(r.stdout ?? '').trim() : '';
  return out || null;
}

const isTop = (dir) => {
  const top = gitOut(dir, ['rev-parse', '--show-toplevel']);
  return top !== null && real(top) === real(dir);
};

export function sprintRoot(dir) {
  const d = path.resolve(String(dir));
  try {
    const parent = path.dirname(d);
    if (path.basename(parent) !== '.worktrees') return d;
    const owner = path.dirname(parent);
    if (!isTop(owner) || !isTop(d)) return d;
    const a = gitOut(d, ['rev-parse', '--path-format=absolute', '--git-common-dir']);
    const b = gitOut(owner, ['rev-parse', '--path-format=absolute', '--git-common-dir']);
    return a && b && real(a) === real(b) ? owner : d;
  } catch {
    return d;
  }
}

function isMain() {
  try { return real(process.argv[1]) === real(fileURLToPath(import.meta.url)); } catch { return false; }
}

if (process.argv[1] && isMain()) {
  const dir = process.argv[2];
  if (!dir) {
    process.stderr.write('usage: node sprint-root.mjs <dir>\n');
    process.exit(2);
  }
  process.stdout.write(`${sprintRoot(dir)}\n`);
}
