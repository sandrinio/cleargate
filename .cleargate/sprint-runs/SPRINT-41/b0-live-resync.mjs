#!/usr/bin/env node
// SPRINT-41 barrier B0 (BUG-085's M0 step, owner ruling R3): targeted re-sync of the
// LIVE gitignored /.claude/ from canonical cleargate-planning/.claude/ at the sprint/S-41 tip.
// One-sprint operational step, not a CLI command. Default: dry-run. --apply: back up, then write.
//
// Rules (sprint plan §2.1 Barrier B0):
// - Source is the MAIN checkout's canonical tree; it must already carry BUG-089 (`--host claude`).
// - Back up every live file first (tarball + per-file sha256 manifest).
// - `__CLEARGATE_VERSION__` is install-time substitution, not drift: replace it with the live pin.
// - Live-only entries are never touched: scheduled_tasks.lock, settings.local.json, worktrees/.
// - Live files with no canonical twin (outside that allowlist) are reported, never deleted.
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const runDir = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(runDir, '../../..');
const canon = path.join(repo, 'cleargate-planning', '.claude');
const live = path.join(repo, '.claude');
const LIVE_ONLY = ['scheduled_tasks.lock', 'settings.local.json', 'worktrees'];
const apply = process.argv.includes('--apply');
const sha = (buf) => createHash('sha256').update(buf).digest('hex');
const die = (msg) => { console.error(`b0-live-resync: ${msg}`); process.exit(1); };

function walk(root, rel = '') {
  const out = [];
  for (const ent of fs.readdirSync(path.join(root, rel), { withFileTypes: true })) {
    const r = path.join(rel, ent.name);
    if (ent.isDirectory()) out.push(...walk(root, r));
    else if (ent.isFile()) out.push(r);
  }
  return out;
}
const isLiveOnly = (rel) => LIVE_ONLY.some((p) => rel === p || rel.startsWith(`${p}/`));

const branch = execFileSync('git', ['-C', repo, 'branch', '--show-current'], { encoding: 'utf8' }).trim();
if (branch !== 'sprint/S-41') die(`main checkout is on '${branch}', expected sprint/S-41`);
const canonSettings = fs.readFileSync(path.join(canon, 'settings.json'), 'utf8');
if (!/--host\s+claude\b/.test(canonSettings)) die('canonical settings.json lacks --host claude — BUG-089 outer half not merged');

const pinMatch = fs.readFileSync(path.join(live, 'hooks', 'stamp-and-gate.sh'), 'utf8').match(/# cleargate-pin: (\S+)/);
if (!pinMatch) die('cannot read live pin from .claude/hooks/stamp-and-gate.sh');
const pin = pinMatch[1];

const canonFiles = walk(canon);
const liveFiles = walk(live).filter((r) => !isLiveOnly(r));
const orphans = liveFiles.filter((r) => !canonFiles.includes(r));
const plan = [];
for (const rel of canonFiles) {
  const src = fs.readFileSync(path.join(canon, rel));
  const want = Buffer.from(src.toString('utf8').replaceAll('__CLEARGATE_VERSION__', pin), 'utf8');
  const dst = path.join(live, rel);
  const have = fs.existsSync(dst) ? fs.readFileSync(dst) : null;
  const mode = fs.statSync(path.join(canon, rel)).mode & 0o777;
  if (!have || !have.equals(want)) plan.push({ rel, want, mode, before: have ? sha(have) : null, after: sha(want) });
}

const ts = new Date().toISOString().replace(/[:.]/g, '-');
const report = { mode: apply ? 'apply' : 'dry-run', branch, pin, changes: plan.map(({ rel, before, after }) => ({ rel, before, after })), orphans_reported_not_deleted: orphans, live_only_preserved: LIVE_ONLY };

if (apply && plan.length) {
  const bdir = path.join(runDir, 'b0');
  fs.mkdirSync(bdir, { recursive: true });
  const tarball = path.join(bdir, `claude-live-backup-${ts}.tgz`);
  execFileSync('tar', ['-czf', tarball, '-C', repo, '.claude']);
  const manifest = Object.fromEntries(walk(live).map((r) => [r, sha(fs.readFileSync(path.join(live, r)))]));
  fs.writeFileSync(path.join(bdir, `claude-live-backup-${ts}.sha256.json`), `${JSON.stringify(manifest, null, 2)}\n`);
  for (const { rel, want, mode } of plan) {
    const dst = path.join(live, rel);
    fs.mkdirSync(path.dirname(dst), { recursive: true });
    const tmp = `${dst}.b0tmp`;
    fs.writeFileSync(tmp, want, { mode });
    fs.renameSync(tmp, dst);
    fs.chmodSync(dst, mode);
  }
  report.backup = path.relative(repo, tarball);
  // Post-condition: every canonical file now matches live after pin substitution.
  const residual = canonFiles.filter((rel) => {
    const want = fs.readFileSync(path.join(canon, rel), 'utf8').replaceAll('__CLEARGATE_VERSION__', pin);
    return fs.readFileSync(path.join(live, rel), 'utf8') !== want;
  });
  if (residual.length) die(`post-condition failed, residual drift: ${residual.join(', ')}`);
  report.post_condition = 'live == canonical (pin-substituted) for every canonical file';
  report.live_hashes = Object.fromEntries(['settings.json', 'hooks/pre-edit-gate.sh', 'hooks/pending-task-sentinel.sh', 'hooks/pre-tool-use-task.sh', 'hooks/token-ledger.sh']
    .map((r) => [r, sha(fs.readFileSync(path.join(live, r)))]));
}
console.log(JSON.stringify(report, null, 2));
