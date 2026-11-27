#!/usr/bin/env node
/**
 * record_evidence.mjs — record the proof for one work item as evidence (EPIC-065).
 *
 * Contract C1 (frozen surface). A `human` item never runs a command (only `--human` records it);
 * with `--worktree` a `live` item records pending and runs nothing.
 *
 * CLI:
 *   node record_evidence.mjs <ID> [--tier <t>] [--worktree <dir>] [-- <command...>]
 *   node record_evidence.mjs <ID> --human "<note>"
 *
 * Exit codes:
 *   0  pass or pending: evidence written; stdout is one JSON line, the file's object.
 *   1  proof failed: evidence written; one JSON line on stdout.
 *   2  could not run: nothing written, nothing on stdout, one stderr line starting
 *      'record_evidence: ' naming the reason.
 *
 * Env: CLEARGATE_PROOF_TIMEOUT_S (default 1800), CLEARGATE_SPRINT_DIR (test override).
 *
 * With gate-checks.json `qa.test_scopes` set, a `unit` or `container` proof whose item names no command
 * of its own runs the scopes the branch's diff against the sprint branch touches (lib/test-scope.mjs; the
 * selection is printed on stderr). When no scope is selected it keeps the configured proof command.
 *
 * Evidence file <sprintDir>/evidence/<ID>.json, written atomically (tmp + rename); every key present:
 *   schema_version: 1, id, tier: 'unit'|'container'|'live'|'human', status: 'pass'|'fail'|'pending',
 *   mode: 'command'|'human'|'pending', command: string|null, note: string|null,
 *   exit_code: number|null, timed_out: boolean, excused: 'baseline'|null, excused_failing: string[],
 *   tail: string[] (<= 40 lines, env secrets masked as ***), sha: string|null,
 *   recorded_at: ISO-8601, recorded_by: 'record_evidence.mjs', duration_ms: number.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn, spawnSync } from 'node:child_process';
import { isProofTier, readProofTier, findItemFile, evidencePath, resolveProofCommand, scopedProofApplies } from './lib/proof.mjs';
import { sprintRoot } from './lib/sprint-root.mjs';
import { extractFailing, commandEnv } from './record_baseline.mjs';
import { parseTestScopes, selectScopes, formatSelection, scopeCommand } from './lib/test-scope.mjs';
import { sprintBranchFor } from './dispatch_serial.mjs';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const USAGE = 'usage: record_evidence.mjs <ID> [--tier <t>] [--worktree <dir>] [-- <command...>] | <ID> --human "<note>"';
const MAX_OUTPUT = 64 * 1024 * 1024;

class Refuse extends Error {}
const refuse = (msg) => new Refuse(msg);

function parseArgs(argv) {
  const dd = argv.indexOf('--');
  const before = dd === -1 ? argv : argv.slice(0, dd);
  const after = dd === -1 ? null : argv.slice(dd + 1);
  const o = { id: null, tier: null, worktree: null, human: null, cmd: null };
  for (let i = 0; i < before.length; i++) {
    const a = before[i];
    if (a === '--tier' || a === '--worktree' || a === '--human') {
      if (i + 1 >= before.length) throw refuse(a === '--human' ? '--human needs a note' : `${a} needs a value`);
      o[a.slice(2)] = before[++i];
    } else if (a.startsWith('--')) {
      throw refuse(USAGE);
    } else if (o.id === null) {
      o.id = a;
    } else {
      throw refuse(USAGE);
    }
  }
  if (o.id === null || !/^[A-Za-z0-9._-]+$/.test(o.id)) throw refuse(USAGE);
  if (after !== null) {
    if (o.human !== null) throw refuse(USAGE);
    o.cmd = after.join(' ').trim();
    if (o.cmd === '') throw refuse(USAGE);
  }
  return o;
}

function resolveSprintDir(root) {
  let dir = process.env.CLEARGATE_SPRINT_DIR || '';
  if (!dir) {
    let active = '';
    try {
      active = fs.readFileSync(path.join(root, '.cleargate', 'sprint-runs', '.active'), 'utf8').trim();
    } catch { /* none */ }
    if (!active) throw refuse('no active sprint (set CLEARGATE_SPRINT_DIR or .cleargate/sprint-runs/.active)');
    dir = path.join(root, '.cleargate', 'sprint-runs', active);
  }
  if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) throw refuse(`sprint dir not found: ${dir}`);
  return dir;
}

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
}

function maskUrlPasswords(text) {
  return text.replace(/(\b[A-Za-z][A-Za-z0-9+.-]*:\/\/[^\s:@\/]*:)[^\s@\/]*@/g, '$1***@');
}

function maskSecrets(text, env) {
  const values = [];
  for (const [k, v] of Object.entries(env)) {
    if (typeof v !== 'string' || v.length < 4) continue;
    if (/TOKEN|SECRET|KEY|PASSWORD/.test(k.toUpperCase())) values.push(v);
  }
  values.sort((a, b) => b.length - a.length);
  let out = maskUrlPasswords(text);
  for (const v of values) out = out.split(v).join('***');
  return out;
}

function tailOf(text) {
  const lines = text.split(/\r?\n/);
  if (lines.length && lines[lines.length - 1] === '') lines.pop();
  return lines.slice(-40);
}

function gitSha(dir) {
  try {
    const r = spawnSync('git', ['-C', dir, 'rev-parse', 'HEAD'], { encoding: 'utf8' });
    const out = r.status === 0 ? String(r.stdout || '').trim() : '';
    return out || null;
  } catch {
    return null;
  }
}

function timeoutSeconds() {
  const n = Number(process.env.CLEARGATE_PROOF_TIMEOUT_S);
  return Number.isFinite(n) && n > 0 ? n : 1800;
}

/** Live proof process groups, killed when the recorder is interrupted. */
const liveGroups = new Set();
let interruptHandlersOn = false;
function onInterrupt() {
  for (const pid of liveGroups) {
    try {
      process.kill(-pid, 'SIGKILL');
    } catch { /* already gone */ }
  }
  process.stderr.write('record_evidence: interrupted\n');
  process.exit(2);
}
function trackGroup(pid) {
  liveGroups.add(pid);
  if (!interruptHandlersOn) {
    interruptHandlersOn = true;
    process.on('SIGINT', onInterrupt);
    process.on('SIGTERM', onInterrupt);
  }
}

/** Run `cmd` with bash -c in `cwd`; resolves {exit_code, timed_out, output}. Rejects (Refuse) when bash cannot start. */
function runCommand(cmd, cwd, env, timeoutS) {
  return new Promise((resolve, reject) => {
    let child;
    try {
      child = spawn('bash', ['-c', cmd], { cwd, env, detached: true, stdio: ['ignore', 'pipe', 'pipe'] });
    } catch (err) {
      reject(refuse(`could not start bash: ${err instanceof Error ? err.message : err}`));
      return;
    }
    const pid = child.pid;
    if (pid) trackGroup(pid);
    let output = '';
    let timedOut = false;
    let settled = false;
    let exited = false;
    const timers = [];
    const onData = (d) => {
      output += d;
      if (output.length > MAX_OUTPUT) output = output.slice(output.length - MAX_OUTPUT);
    };
    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', onData);
    child.stderr.on('data', onData);
    const killGroup = (sig) => {
      try {
        process.kill(-pid, sig);
      } catch { /* already gone */ }
    };
    const finish = (code) => {
      if (settled) return;
      settled = true;
      for (const t of timers) clearTimeout(t);
      killGroup('SIGKILL');
      liveGroups.delete(pid);
      resolve({ exit_code: timedOut ? 124 : code, timed_out: timedOut, output });
    };
    child.on('error', (err) => {
      if (settled) return;
      settled = true;
      for (const t of timers) clearTimeout(t);
      liveGroups.delete(pid);
      reject(refuse(`could not start bash: ${err.message}`));
    });
    child.on('exit', (code, signal) => {
      exited = true;
      const c = code === null ? (signal ? 128 : 1) : code;
      // bash is done: end whatever it left behind, then wait for the streams (or 5 s) -- never a timeout
      killGroup('SIGTERM');
      timers.push(setTimeout(() => killGroup('SIGKILL'), 2000));
      timers.push(setTimeout(() => finish(c), 5000));
      child.once('close', () => finish(c));
    });
    timers.push(
      setTimeout(() => {
        if (exited) return;
        timedOut = true;
        killGroup('SIGTERM');
        timers.push(setTimeout(() => killGroup('SIGKILL'), 2000));
        timers.push(setTimeout(() => finish(124), 5000));
      }, Math.round(timeoutS * 1000)),
    );
  });
}

function writeEvidence(file, obj) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = `${file}.tmp.${process.pid}`;
  fs.writeFileSync(tmp, JSON.stringify(obj, null, 2) + '\n');
  fs.renameSync(tmp, file);
}

async function main(argv) {
  const args = parseArgs(argv);
  const id = args.id;
  const root = sprintRoot(path.resolve(SCRIPT_DIR, '..', '..'));
  const sprintDir = resolveSprintDir(root);

  const itemFile = findItemFile(root, id);
  let content = null;
  if (itemFile) {
    try {
      content = fs.readFileSync(itemFile, 'utf8');
    } catch { /* unreadable: no item */ }
  }
  const declared = args.tier ?? (content !== null ? readProofTier(content) : null);
  if (declared !== null && !isProofTier(declared)) throw refuse(`invalid proof tier '${declared}' for ${id}`);

  let tier;
  let mode;
  if (args.human !== null) {
    if (args.human.trim() === '') throw refuse('--human needs a note');
    if (declared !== null && declared !== 'human') throw refuse(`--human records a human-tier proof; ${id} declares ${declared}`);
    tier = 'human';
    mode = 'human';
  } else {
    if (declared === null) throw refuse(`no proof tier for ${id}`);
    tier = declared;
    mode = 'command';
  }

  let runDir = root;
  if (args.worktree !== null) {
    runDir = path.resolve(args.worktree);
    if (!fs.existsSync(runDir) || !fs.statSync(runDir).isDirectory()) throw refuse(`--worktree is not a directory: ${args.worktree}`);
  }

  let cmd = null;
  if (mode === 'command') {
    const neverRuns = tier === 'human' || (tier === 'live' && args.worktree !== null);
    if (neverRuns) {
      mode = 'pending';
    } else {
      const gc = readJson(path.join(SCRIPT_DIR, 'gate-checks.json')) ?? {};
      cmd = args.cmd ?? resolveProofCommand(content, tier, gc);
      if (args.cmd === null && (tier === 'unit' || tier === 'container')) {
        // With qa.test_scopes set and no command of its own, the proof runs the scopes the branch's diff touches.
        const parsed = parseTestScopes(gc.qa);
        if (parsed.error) throw refuse(`${parsed.error} (.cleargate/scripts/gate-checks.json)`);
        if (scopedProofApplies(content, tier, parsed.scopes)) {
          let sel;
          try {
            const d = spawnSync('git', ['-C', runDir, 'diff', '--name-only', '-z', '--no-renames', `${sprintBranchFor(path.basename(sprintDir))}...HEAD`], { encoding: 'utf8', maxBuffer: MAX_OUTPUT });
            sel = d.status === 0 && !d.error
              ? selectScopes(String(d.stdout).split('\0').filter((p) => p), parsed.scopes)
              : selectScopes(null, parsed.scopes, { error: d.error?.message ?? `git diff exit ${d.status}` });
          } catch (err) {
            sel = selectScopes(null, parsed.scopes, { error: err.message });
          }
          process.stderr.write(`record_evidence: ${formatSelection(sel)}\n`);
          if (sel.scopes.length > 0) cmd = scopeCommand(sel.scopes); // none selected: keep the configured proof, never a silent pass
        }
      }
      if (cmd === null) {
        if (tier === 'live') mode = 'pending';
        else throw refuse(`no ${tier} proof command configured for ${id}`);
      }
    }
  }

  const base = {
    schema_version: 1, id, tier, status: 'pending', mode, command: null, note: null, exit_code: null,
    timed_out: false, excused: null, excused_failing: [], tail: [], sha: gitSha(runDir),
    recorded_at: new Date().toISOString(), recorded_by: 'record_evidence.mjs', duration_ms: 0,
  };
  let ev;
  if (mode === 'human') {
    ev = { ...base, status: 'pass', note: args.human.trim() };
  } else if (mode === 'pending') {
    ev = base;
  } else {
    const env = commandEnv();
    const t0 = Date.now();
    const r = await runCommand(cmd, runDir, env, timeoutSeconds());
    const duration = Date.now() - t0;
    let status = r.exit_code === 0 ? 'pass' : 'fail';
    let excused = null;
    let excusedFailing = [];
    if (status === 'fail' && !r.timed_out) {
      const baseline = readJson(path.join(sprintDir, 'baseline.json'));
      if (baseline && typeof baseline.command === 'string' && Array.isArray(baseline.failing) && cmd.trim() === baseline.command.trim()) {
        const failing = extractFailing(r.output);
        if (failing.length > 0 && failing.every((n) => baseline.failing.includes(n))) {
          status = 'pass';
          excused = 'baseline';
          excusedFailing = failing;
        }
      }
    }
    let tail = tailOf(maskSecrets(r.output, env));
    if (r.timed_out) tail = [...tail, `record_evidence: timed out after ${timeoutSeconds()}s`].slice(-40);
    ev = {
      ...base, status, command: maskUrlPasswords(cmd), exit_code: r.exit_code, timed_out: r.timed_out, excused,
      excused_failing: excusedFailing, tail, duration_ms: duration, recorded_at: new Date().toISOString(),
    };
  }
  writeEvidence(evidencePath(sprintDir, id), ev);
  process.stdout.write(JSON.stringify(ev) + '\n');
  return ev.status === 'fail' ? 1 : 0;
}

function isMainModule() {
  try {
    return fs.realpathSync(fileURLToPath(import.meta.url)) === fs.realpathSync(process.argv[1]);
  } catch {
    return false;
  }
}

if (isMainModule()) {
  main(process.argv.slice(2)).then(
    (code) => {
      process.exitCode = code;
    },
    (err) => {
      process.stderr.write(`record_evidence: ${err instanceof Error ? err.message : String(err)}\n`);
      process.exitCode = 2;
    },
  );
}
