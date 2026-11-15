#!/usr/bin/env node
/**
 * record_baseline.mjs — records the sprint-kickoff test baseline; `--probe` runs the same command for preflight.
 *
 * Contract C2 (SPRINT-46, EPIC-066). Owner: STORY-066-04. Consumer: STORY-066-08
 * (merge_story.mjs imports this module statically).
 *
 * CLI: `node record_baseline.mjs <sprint-id>` — always exits 0 and prints one status line. Reuses the
 *     preflight probe when <git-common-dir>/cleargate/test-probe.json holds the same HEAD and command;
 *     baseline.json then carries `source: "preflight"` (STORY-066-18).
 *   `node record_baseline.mjs --probe` — one JSON line { command, exit_code, failing: number, ran: boolean,
 *     last_line, cached: boolean } or { skipped } (P11); caches { head_sha, command, exit_code, failing, tail,
 *     recorded_at } inside .git. Exits 1 with no JSON only on an unexpected error.
 * main() sits behind an entry-point guard, so importing the module runs nothing.
 * Additive exports: testsRan, lastLine, COMMAND_ENV_DROP, commandEnv. Node built-ins only: tests stage this file alone.
 *
 * Frozen interface:
 *   - export function extractFailing(output: string): string[] — synchronous; sorted,
 *     de-duplicated failing-test identifiers, or [] when none are parsed. Callers treat an
 *     unparsed failure as new, so returning [] is fail-safe. Never async, never retyped.
 *   - File: <sprintDir>/baseline.json = {
 *       sprint_id: string, base_sha: string, command: string, exit_code: number,
 *       failing: string[], tail: string[] (at most 40 lines), recorded_at: string (ISO-8601)
 *     }, written atomically. An absent file means no baseline: every failure counts.
 *     Keys may be added, never removed or retyped.
 *     Additive key: source: "preflight" when the kickoff reused the probe.
 *
 * Command: qa.baseline_command, else qa.test, from .cleargate/scripts/gate-checks.json; run in the
 * project root; both empty -> no file, one skip line.
 */

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const TIMEOUT_MS = 1_200_000;
const TAIL_LINES = 40;
const FILE_NAME_RE = /^\S+\.(?:[cm]?[jt]sx?|py|go|rs|rb|java|php)$/;

/**
 * @param {string} output
 * @returns {string[]}
 */
export function extractFailing(output) {
  const found = new Set();
  for (const line of String(output ?? '').split(/\r?\n/)) {
    let m = line.match(/^\s*not ok \d+ - (.+?)(\s+#\s+(?:TODO|SKIP)\b.*)?$/);
    if (m) {
      if (!m[2]) found.add(m[1].trim());
      continue;
    }
    m = line.match(/^\s*✖ (.+?)(?:\s+\(\d+(?:\.\d+)?m?s\))?\s*$/);
    if (m) {
      const name = m[1].trim();
      if (name !== 'failing tests:' && !FILE_NAME_RE.test(name)) found.add(name);
      continue;
    }
    m = line.match(/^\s*test at (\S+:\d+:\d+)\s*$/);
    if (m) {
      found.add(m[1]);
      continue;
    }
    m = line.match(/^\s*--- FAIL: (\S+)/);
    if (m) {
      found.add(m[1]);
      continue;
    }
    m = line.match(/^FAIL\t(\S+)/);
    if (m) found.add(m[1]);
  }
  return [...found].sort();
}

const PROBE_REL = path.join('cleargate', 'test-probe.json');

/** True when the run reached tests: exit 0, or a failing test named (never a timeout or not-found). */
export function testsRan({ exit_code, failing } = {}) {
  if (exit_code === 0) return true;
  return Array.isArray(failing) && failing.length > 0 && exit_code !== 124 && exit_code !== 127;
}

/** Last non-empty line, trimmed, of a string or an array of strings; '' when there is none. */
export function lastLine(x) {
  let parts;
  if (typeof x === 'string') parts = x.split(/\r?\n/);
  else if (Array.isArray(x)) parts = x.flatMap((e) => (typeof e === 'string' ? e.split(/\r?\n/) : []));
  else return '';
  const kept = parts.map((l) => l.trim()).filter((l) => l !== '');
  return kept.length ? kept[kept.length - 1] : '';
}

/**
 * ClearGate's own process variables. A configured command (probe, kickoff, merge_story.mjs, the
 * pre_gate_runner.sh test) never inherits them: NODE_TEST_CONTEXT makes a child `node --test` run
 * nothing; RUN_SCRIPT_ACTIVE turns off run_script.sh's incident capture in the command's own tests;
 * CLEARGATE_REPO_ROOT describes this script's root, not the command's (STORY-066-18 amendment B).
 */
export const COMMAND_ENV_DROP = Object.freeze(['NODE_TEST_CONTEXT', 'RUN_SCRIPT_ACTIVE', 'CLEARGATE_REPO_ROOT']);

/** A copy of `env` without COMMAND_ENV_DROP: the environment every configured command runs with. */
export function commandEnv(env = process.env) {
  const out = { ...env };
  for (const k of COMMAND_ENV_DROP) delete out[k];
  return out;
}

function git(root, args) {
  try {
    const r = spawnSync('git', ['-C', root, ...args], { encoding: 'utf8' });
    return r.status === 0 ? (r.stdout || '').trim() : '';
  } catch {
    return '';
  }
}

function gitHead(root) {
  return git(root, ['rev-parse', 'HEAD']) || 'unknown';
}

/** The probe cache file, or null when root is not the top of its own git work tree. */
function probeCacheFile(root) {
  const top = git(root, ['rev-parse', '--show-toplevel']);
  if (!top) return null;
  try {
    if (fs.realpathSync(top) !== fs.realpathSync(root)) return null;
  } catch {
    return null;
  }
  const common = git(root, ['rev-parse', '--path-format=absolute', '--git-common-dir']);
  // git < 2.31 echoes the unknown flag and may print a relative path: then no cache (amendment B).
  if (!common || common.includes('\n') || !path.isAbsolute(common)) return null;
  return path.join(common, PROBE_REL);
}

function readCache(file, head, command) {
  if (!file || head === 'unknown') return null;
  try {
    const c = JSON.parse(fs.readFileSync(file, 'utf8'));
    const ok = c && c.head_sha === head && c.command === command && Number.isInteger(c.exit_code)
      && Array.isArray(c.failing) && Array.isArray(c.tail) && typeof c.recorded_at === 'string';
    return ok ? c : null;
  } catch {
    return null;
  }
}

function writeCache(file, entry) {
  try {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    const tmp = `${file}.tmp.${process.pid}`;
    fs.writeFileSync(tmp, JSON.stringify(entry, null, 2) + '\n');
    fs.renameSync(tmp, file);
  } catch {
    // the cache only saves a second run
  }
}

/** { command, waiver } or { skip: reason }. Command pick: qa.baseline_command, else qa.test. */
function readConfig(root) {
  let cfg;
  try {
    cfg = JSON.parse(fs.readFileSync(path.join(root, '.cleargate', 'scripts', 'gate-checks.json'), 'utf8'));
  } catch {
    return { skip: 'gate-checks.json not found' };
  }
  const qa = (cfg && cfg.qa) || {};
  const pick = (v) => (typeof v === 'string' && v.trim() !== '' ? v : '');
  const command = pick(qa.baseline_command) || pick(qa.test);
  if (!command) return { skip: 'qa.test and qa.baseline_command are empty' };
  return { command, waiver: typeof qa.test_waiver === 'string' ? qa.test_waiver.trim() : '' };
}

function runCommand(root, command) {
  const res = spawnSync('bash', ['-c', command], {
    cwd: root, env: commandEnv(), encoding: 'utf8', timeout: TIMEOUT_MS, maxBuffer: 64 * 1024 * 1024,
  });
  const output = [res.stdout, res.stderr].filter(Boolean).join('\n');
  let exitCode;
  let reason = null;
  if (res.error) {
    if (res.error.code === 'ETIMEDOUT') {
      exitCode = 124;
      reason = 'baseline: command timed out after 20 minutes';
    } else {
      exitCode = 127;
      reason = `baseline: ${res.error.message}`;
    }
  } else {
    exitCode = res.status ?? 1;
  }

  let lines = output.split(/\r?\n/);
  while (lines.length > 0 && lines[lines.length - 1] === '') lines.pop();
  const room = reason ? TAIL_LINES - 1 : TAIL_LINES;
  const tail = lines.slice(-room);
  if (reason) tail.push(reason);
  return { exit_code: exitCode, failing: exitCode === 0 ? [] : extractFailing(output), tail };
}

function resolveRoot() {
  const here = path.dirname(fileURLToPath(import.meta.url));
  return process.env.CLEARGATE_REPO_ROOT ? path.resolve(process.env.CLEARGATE_REPO_ROOT) : path.resolve(here, '..', '..');
}

function probe(root) {
  const cfg = readConfig(root);
  if (cfg.skip) return { skipped: cfg.skip };
  const head = gitHead(root);
  const file = probeCacheFile(root);
  const out = (e, cached) => ({
    command: e.command, exit_code: e.exit_code, failing: e.failing.length,
    ran: testsRan(e), last_line: lastLine(e.tail), cached,
  });
  const hit = readCache(file, head, cfg.command);
  if (hit && (testsRan(hit) || cfg.waiver)) return out(hit, true);
  const r = runCommand(root, cfg.command);
  const entry = {
    head_sha: head, command: cfg.command, exit_code: r.exit_code, failing: r.failing, tail: r.tail,
    recorded_at: new Date().toISOString(),
  };
  if (file && head !== 'unknown') writeCache(file, entry);
  return out(entry, false);
}

function writeBaseline(root, baseline) {
  const sprintDir = path.join(root, '.cleargate', 'sprint-runs', baseline.sprint_id);
  fs.mkdirSync(sprintDir, { recursive: true });
  const file = path.join(sprintDir, 'baseline.json');
  const tmp = `${file}.tmp.${process.pid}`;
  fs.writeFileSync(tmp, JSON.stringify(baseline, null, 2) + '\n');
  fs.renameSync(tmp, file);
  return file;
}

function recordBaseline(root, sprintId) {
  const cfg = readConfig(root);
  if (cfg.skip) {
    console.log(`baseline: skipped — ${cfg.skip}`);
    return 0;
  }
  const head = gitHead(root);
  const hit = readCache(probeCacheFile(root), head, cfg.command);
  if (hit) {
    const file = writeBaseline(root, {
      sprint_id: sprintId, base_sha: hit.head_sha, command: hit.command, exit_code: hit.exit_code,
      failing: hit.failing, tail: hit.tail, recorded_at: hit.recorded_at, source: 'preflight',
    });
    console.log(`baseline: reused the preflight probe of ${head.slice(0, 7)} (${hit.failing.length} failing, exit ${hit.exit_code}) -> ${file}`);
    return 0;
  }
  console.log(`recording baseline: ${cfg.command}`);
  const r = runCommand(root, cfg.command);
  const file = writeBaseline(root, {
    sprint_id: sprintId, base_sha: head, command: cfg.command, exit_code: r.exit_code,
    failing: r.failing, tail: r.tail, recorded_at: new Date().toISOString(),
  });
  console.log(`baseline: ${r.failing.length} failing (exit ${r.exit_code}) -> ${file}`);
  return 0;
}

function main(argv) {
  if (argv.includes('--probe')) {
    process.stdout.write(`${JSON.stringify(probe(resolveRoot()))}\n`);
    return 0;
  }
  const sprintId = argv[0];
  if (!sprintId) {
    console.log('baseline: skipped — no sprint id given');
    return 0;
  }
  return recordBaseline(resolveRoot(), sprintId);
}

function isMainModule() {
  try {
    return fs.realpathSync(fileURLToPath(import.meta.url)) === fs.realpathSync(process.argv[1]);
  } catch {
    return false;
  }
}

if (isMainModule()) {
  const argv = process.argv.slice(2);
  let code = 0;
  try {
    code = main(argv);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (argv.includes('--probe')) {
      process.stderr.write(`probe: ${msg}\n`); // no JSON: preflight fails the check
      code = 1;
    } else {
      console.log(`baseline: skipped — ${msg}`);
    }
  }
  process.exit(code);
}
