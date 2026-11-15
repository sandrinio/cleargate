// sprint_metrics.mjs — per-item dispatches, rework, wall time and tokens from the host's subagent
// transcripts (via subagent-ledger.mjs, contract C1) and git. Contract C2 (SPRINT-45): frozen keys,
// exit codes (0 runs, 2 usage), the CLEARGATE_SPRINT_DIR override and "not measured" semantics.
// Read-only derivation: never writes events.jsonl or state.json; never fails a close.
//
// Usage: node sprint_metrics.mjs <sprint-id> [--json]

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import * as defaultLedger from './subagent-ledger.mjs';
import { atomicWrite, TERMINAL_SPRINT_STATUSES, DEFECT_IN_VALUES } from './state-events.mjs';
import { extractWorkItemIds } from './lib/work-item-id.mjs';
import { parseJsonl } from './lib/ledger-digest.mjs';

/**
 * @typedef {Object} MetricsItem
 * @property {{total: number, by_role: Record<string, number>, by_phase: Record<string, number>}} dispatches
 * @property {{red_corrections: number, dev_reruns: number, verify_reruns: number, total: number, by_defect_in: Record<string, number>}} rework  by_defect_in: qa-bounce events by location (code, red-test, spec, unknown)
 * @property {string} lane  from state.json, `standard` when absent
 * @property {number} interrupted  dispatches with completed false
 * @property {number} post_merge  dispatches starting after the item's first merge(story/<ID>) commit
 * @property {{red_written: number, red_corrected: number, build: number, rework: number, integrate: number, merged: number}} git  commit counts
 * @property {number} wall_ms
 * @property {{input: number, output: number, cache_read: number, cache_creation: number, total: number}} tokens
 * @property {string[]} models
 * @property {{qa_bounces: number, arch_bounces: number}} state_counters
 * @property {boolean} disagrees
 * @property {string} dispatch_source  "not measured" is the only reserved value
 */

/**
 * @typedef {Object} MetricsDocument
 * @property {1} schema
 * @property {string} sprint_id
 * @property {string} generated_at  ISO-8601
 * @property {{sessions: number, dispatches: number, repos: string[], warnings: string[]}} sources
 * @property {Record<string, MetricsItem>} items  keyed by roster ID
 * @property {{dispatches: number, tokens: number}} sprint_level
 * @property {{dispatches: number, tokens: number, share: number}} unattributed  share in [0, 1]
 * @property {{dispatches: number, rework: number, tokens: number, rework_by_defect_in: Record<string, number>}} totals
 * @property {Record<string, {items: number, dispatches: number|string, per_item: number|string}>} by_lane  dispatches per item by lane; `not measured` when no dispatch was measured
 */

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

// ---------------------------------------------------------------------------------------------
// Phase / role table (R3, R4). The single place to change a definition if the holdout recount
// shows a gap.
// ---------------------------------------------------------------------------------------------
const NEVER_ROUND_PHASES = new Set([
  'Integrate', 'Pre-verify', 'Prepare', 'Wiring', 'Post-flight', 'Merge', 'Contract', 'Plan',
]);
const PHASE = { red: 'QA-Red', build: 'Build', verify: 'Verify', integrate: 'Integrate' };
const ROLE = { qa: 'qa', developer: 'developer' };
// SC-4: playbook sprint stages, plus `M<N>` milestone labels; agent types that only ever run sprint-level.
const SPRINT_LEVEL_RE = /\b(plan|design review|sdr|reader|synth|preflight|close|report|contract|consolidation|cleanup|simplif|walkthrough|wiki|contradiction)/i;
const MILESTONE_RE = /\bM\d+\b/;
const SPRINT_ONLY_AGENT_TYPES = new Set([
  'architect-reader', 'architect-synth', 'reporter', 'cleargate-wiki-query', 'cleargate-wiki-contradict', 'code-simplifier',
]);
const PRE_RE = /\bpre\b/i;
const RED_RE = /\bqa-?red\b|\bred\b/i;
const VERIFY_RE = /\bverif/i;
const PASS_RE = /\bpass\s+(\d+)\b/i;

const NOT_MEASURED = 'not measured';
const GIT_TIMEOUT_MS = 30000;

const isAlnum = (ch) => ch !== undefined && ch !== '' && /[A-Za-z0-9]/.test(ch);
const isDigit = (ch) => ch !== undefined && ch !== '' && /[0-9]/.test(ch);

// ---------------------------------------------------------------------------------------------
// R3 — attribution
// ---------------------------------------------------------------------------------------------

/**
 * @param {string} description
 * @param {string | null | undefined} phase
 * @param {string[]} roster
 * @param {string} [agentType]  optional; the part after the last ':' is matched (plugin prefixes)
 * @param {{sprintId?: string}} [opts]
 * @returns {{kind: 'item', id: string} | {kind: 'sprint-level'} | {kind: 'unattributed'}}
 */
export function matchItem(description, phase, roster, agentType, opts = {}) {
  const text = String(description ?? '');
  const rosterSet = new Set(roster);
  const full = extractWorkItemIds(text).filter((id) => rosterSet.has(id));
  const candidates = new Set(full);
  for (const id of roster) {
    const dash = id.indexOf('-');
    if (dash < 0) continue;
    const short = id.slice(dash + 1);
    if (!short.includes('-')) continue;
    let from = 0;
    for (;;) {
      const at = text.indexOf(short, from);
      if (at < 0) break;
      from = at + 1;
      const before = text[at - 1];
      const after = text[at + short.length];
      if (isAlnum(before) || before === '-') continue;
      if (isAlnum(after)) continue;
      if (after === '-' && isDigit(text[at + short.length + 1])) continue;
      candidates.add(id);
      break;
    }
  }
  if (candidates.size === 1) return { kind: 'item', id: [...candidates][0] };
  if (candidates.size > 1) return { kind: 'unattributed' };

  if (SPRINT_LEVEL_RE.test(String(phase ?? '')) || SPRINT_LEVEL_RE.test(text) || MILESTONE_RE.test(text)) return { kind: 'sprint-level' };
  if (opts.sprintId && text.includes(opts.sprintId)) return { kind: 'sprint-level' };
  const role = String(agentType ?? '');
  if (SPRINT_ONLY_AGENT_TYPES.has(role.slice(role.lastIndexOf(':') + 1))) return { kind: 'sprint-level' };
  return { kind: 'unattributed' };
}

// ---------------------------------------------------------------------------------------------
// R4 — rework
// ---------------------------------------------------------------------------------------------

/**
 * @param {object} row  DispatchRow (contract C1)
 * @returns {'red' | 'build' | 'verify' | null}
 */
export function roundKind(row) {
  if (row.completed === false) return null;
  const phase = row.workflow_phase ?? null;
  if (phase !== null && NEVER_ROUND_PHASES.has(phase)) return null;
  const description = String(row.description ?? '');
  if (row.agent_type === ROLE.qa) {
    if (phase === PHASE.red) return 'red';
    if (phase === PHASE.verify) return PRE_RE.test(description) ? null : 'verify';
    if (PRE_RE.test(description)) return null;
    if (RED_RE.test(description)) return 'red';
    if (VERIFY_RE.test(description)) return 'verify';
    return null;
  }
  if (row.agent_type === ROLE.developer) {
    return phase === null || phase === PHASE.build ? 'build' : null;
  }
  return null;
}

const ms = (iso) => Date.parse(iso);

function passOf(row) {
  const m = PASS_RE.exec(String(row.description ?? ''));
  return m ? Number(m[1]) : 1;
}

/**
 * @param {object[]} itemRows
 * @param {{mergedAt: string | null}} opts
 */
export function computeRework(itemRows, { mergedAt } = { mergedAt: null }) {
  const rows = [...itemRows].sort((a, b) => ms(a.started_at) - ms(b.started_at));
  const mergedMs = mergedAt ? ms(mergedAt) : null;
  const isPostMerge = (r) => mergedMs !== null && !Number.isNaN(mergedMs) && ms(r.started_at) > mergedMs;
  const postMerge = rows.filter(isPostMerge);
  const interrupted = rows.filter((r) => r.completed === false).length;
  const live = rows.filter((r) => !isPostMerge(r));

  const reds = live.filter((r) => roundKind(r) === 'red');
  const builds = live.filter((r) => roundKind(r) === 'build');
  const integrates = live.filter((r) => r.workflow_phase === PHASE.integrate && r.completed !== false);
  const verifies = live.filter((r) => {
    if (roundKind(r) !== 'verify') return false;
    const t = ms(r.started_at);
    const lastIntegrate = integrates.filter((i) => ms(i.started_at) <= t).pop();
    if (!lastIntegrate) return true;
    const lastBuild = builds.filter((b) => ms(b.started_at) <= t).pop();
    // Planned post-integration verify: an Integrate sits after the latest Build (or there is no Build).
    return !(!lastBuild || ms(lastIntegrate.started_at) > ms(lastBuild.started_at));
  });

  const itemPasses = new Set([...reds, ...builds].map(passOf)).size;
  const red_corrections = Math.max(0, reds.length - itemPasses);
  const dev_reruns = Math.max(0, builds.length - itemPasses);
  const verify_reruns = Math.max(0, verifies.length - 1);
  return {
    red_corrections,
    dev_reruns,
    verify_reruns,
    total: red_corrections + dev_reruns + verify_reruns,
    interrupted,
    post_merge: postMerge.length,
  };
}

// ---------------------------------------------------------------------------------------------
// R5 — git classification
// ---------------------------------------------------------------------------------------------

const emptyGit = () => ({ red_written: 0, red_corrected: 0, build: 0, rework: 0, integrate: 0, merged: 0 });

/**
 * @param {{date: string, subject: string, repo: string}[]} commits
 * @param {string[]} roster
 * @param {{start: string, end: string} | null} window
 * @returns {Record<string, object>}
 */
export function classifyCommits(commits, roster, window) {
  const rosterSet = new Set(roster);
  const startMs = window ? ms(window.start) : null;
  const endMs = window ? ms(window.end) : null;
  const sorted = commits
    .filter((c) => {
      const t = ms(c.date);
      if (Number.isNaN(t)) return false;
      if (startMs !== null && t < startMs) return false;
      if (endMs !== null && t > endMs) return false;
      return true;
    })
    .sort((a, b) => ms(a.date) - ms(b.date));

  /** @type {Record<string, any>} */
  const out = {};
  const subjectRepo = new Map();
  for (const c of sorted) {
    const subject = String(c.subject ?? '');
    // The same subject committed in a second repo (an outer and a cli commit for one change) counts once.
    if (subjectRepo.has(subject) && subjectRepo.get(subject) !== c.repo) continue;
    subjectRepo.set(subject, c.repo);

    const ids = extractWorkItemIds(subject).filter((id) => rosterSet.has(id));
    if (ids.length === 0) continue;
    for (const id of ids) {
      const g = (out[id] ??= { ...emptyGit(), first_merge_at: null });
      if (subject.startsWith('qa-red(')) {
        if (g.red_written === 0) g.red_written += 1;
        else g.red_corrected += 1;
      } else if (subject.startsWith('merge(story/')) {
        g.merged += 1;
        if (g.first_merge_at === null) g.first_merge_at = c.date;
      } else if (subject.startsWith('integrate(') || (subject.startsWith('merge(sprint/') && subject.includes('integrate'))) {
        g.integrate += 1;
      } else if (subject.startsWith('merge(')) {
        // other merges are neither builds nor rework
      } else if (subject.startsWith('feat(') || subject.startsWith('fix(') || subject.includes('(rework)')) {
        if (g.build === 0) g.build += 1;
        else g.rework += 1;
      }
    }
  }
  return out;
}

// ---------------------------------------------------------------------------------------------
// R6 — repo list and git reading
// ---------------------------------------------------------------------------------------------

function unquote(s) {
  return s.trim().replace(/^["']|["']$/g, '').trim();
}

/** Line-scan `wiki.brief.release_repos` (block or flow list). No YAML dependency. */
function scanReleaseRepos(text) {
  const lines = text.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const m = /^(\s*)release_repos:\s*(.*)$/.exec(lines[i]);
    if (!m) continue;
    const inline = m[2].replace(/\s+#.*$/, '').trim();
    if (inline.startsWith('[')) {
      return inline.replace(/^\[/, '').replace(/\].*$/, '').split(',').map(unquote).filter(Boolean);
    }
    const entries = [];
    for (let j = i + 1; j < lines.length; j++) {
      const item = /^\s*-\s+(.*)$/.exec(lines[j]);
      if (item) { entries.push(unquote(item[1].replace(/\s+#.*$/, ''))); continue; }
      if (lines[j].trim() === '' || lines[j].trim().startsWith('#')) continue;
      break;
    }
    return entries.filter(Boolean);
  }
  return [];
}

function realOrResolved(p) {
  try { return fs.realpathSync(p); } catch { return path.resolve(p); }
}

/**
 * @param {string} projectRoot
 * @returns {string[]}  entries as written, "." first, de-duplicated by resolved path
 */
export function readRepoList(projectRoot) {
  let configured = [];
  try {
    configured = scanReleaseRepos(fs.readFileSync(path.join(projectRoot, '.cleargate', 'config.yml'), 'utf8'));
  } catch { /* no config: default list */ }
  const seen = new Set();
  const list = [];
  for (const entry of ['.', ...configured]) {
    const key = realOrResolved(path.resolve(projectRoot, entry));
    if (seen.has(key)) continue;
    seen.add(key);
    list.push(entry);
  }
  return list;
}

function gitEnv() {
  const env = { ...process.env };
  delete env.GIT_DIR;
  delete env.GIT_WORK_TREE;
  delete env.GIT_INDEX_FILE;
  return env;
}

function runGit(cwd, args) {
  return spawnSync('git', args, { cwd, env: gitEnv(), encoding: 'utf8', timeout: GIT_TIMEOUT_MS, maxBuffer: 256 * 1024 * 1024 });
}

/**
 * @param {string} projectRoot
 * @param {string[]} repos
 * @returns {{commits: {date: string, subject: string, repo: string}[], repos: string[], warnings: string[]}}
 */
export function readGitCommits(projectRoot, repos) {
  const commits = [];
  const read = [];
  const warnings = [];
  for (const repo of repos) {
    const abs = path.resolve(projectRoot, repo);
    if (!fs.existsSync(abs)) { warnings.push(`repo ${repo}: path not found, skipped`); continue; }
    const top = runGit(abs, ['rev-parse', '--show-toplevel']);
    if (top.error || top.status !== 0 || realOrResolved(String(top.stdout).trim()) !== realOrResolved(abs)) {
      warnings.push(`repo ${repo}: not a git repository, skipped`);
      continue;
    }
    const log = runGit(abs, ['log', '--all', '--format=%aI%x1f%s']);
    read.push(repo);
    if (log.error || log.status !== 0) continue; // e.g. a repository with no commits yet
    for (const line of String(log.stdout).split('\n')) {
      const cut = line.indexOf('\x1f');
      if (cut < 0) continue;
      commits.push({ date: line.slice(0, cut), subject: line.slice(cut + 1), repo });
    }
  }
  if (read.length === 0) warnings.push('git data: not measured');
  return { commits, repos: read, warnings };
}

// ---------------------------------------------------------------------------------------------
// R7 — window
// ---------------------------------------------------------------------------------------------

/**
 * @param {{ts?: string}[]} events
 * @param {{sprint_status?: string} | null} state
 * @param {Date} now
 * @returns {{start: string, end: string} | null}
 */
export function sprintWindow(events, state, now) {
  const times = (events ?? []).map((e) => ms(e?.ts)).filter((t) => !Number.isNaN(t));
  if (times.length === 0) return null;
  const start = Math.min(...times);
  const latest = Math.max(...times);
  const terminal = TERMINAL_SPRINT_STATUSES.includes(state?.sprint_status);
  const end = terminal ? latest : now.getTime();
  return { start: new Date(start).toISOString(), end: new Date(end).toISOString() };
}

// ---------------------------------------------------------------------------------------------
// R8-R10 — assembly
// ---------------------------------------------------------------------------------------------

const rowTokens = (u) => (u?.input ?? 0) + (u?.output ?? 0) + (u?.cache_read ?? 0) + (u?.cache_creation ?? 0);

const zeroSplit = () => ({ code: 0, 'red-test': 0, spec: 0, unknown: 0 });

function emptyItem(counters, git, lane = 'standard') {
  return {
    lane,
    dispatches: { total: 0, by_role: {}, by_phase: {} },
    rework: { red_corrections: 0, dev_reruns: 0, verify_reruns: 0, total: 0, by_defect_in: zeroSplit() },
    interrupted: 0,
    post_merge: 0,
    git,
    wall_ms: 0,
    tokens: { input: 0, output: 0, cache_read: 0, cache_creation: 0, total: 0 },
    models: [],
    state_counters: counters,
    disagrees: false,
    dispatch_source: NOT_MEASURED,
  };
}

/**
 * @returns {MetricsDocument}
 */
export function buildMetrics({ sprintId, now, roster, counters, rows, gitByItem, gitMeasured, sessions, repos, warnings, defectByItem = {}, laneByItem = {} }) {
  const measured = rows.length > 0;
  const byItem = new Map(roster.map((id) => [id, []]));
  let sprintLevel = { dispatches: 0, tokens: 0 };
  let unattributed = { dispatches: 0, tokens: 0 };
  let totalTokens = 0;

  for (const r of rows) {
    const tokens = rowTokens(r.usage);
    totalTokens += tokens;
    const m = matchItem(r.description, r.workflow_phase, roster, r.agent_type, { sprintId });
    if (m.kind === 'item') byItem.get(m.id).push(r);
    else if (m.kind === 'sprint-level') { sprintLevel.dispatches += 1; sprintLevel.tokens += tokens; }
    else { unattributed.dispatches += 1; unattributed.tokens += tokens; }
  }

  const items = {};
  let reworkTotal = 0;
  const reworkSplit = zeroSplit();
  for (const id of roster) {
    const g = gitByItem[id] ?? { ...emptyGit(), first_merge_at: null };
    const git = { red_written: g.red_written, red_corrected: g.red_corrected, build: g.build, rework: g.rework, integrate: g.integrate, merged: g.merged };
    const c = counters[id];
    const item = emptyItem(c, git, laneByItem[id] || 'standard');
    const split = { ...zeroSplit(), ...(defectByItem[id] ?? {}) };
    const gitRework = git.red_corrected + git.rework;
    const counterRework = c.qa_bounces + c.arch_bounces;
    if (measured) {
      const itemRows = byItem.get(id);
      const rw = computeRework(itemRows, { mergedAt: g.first_merge_at });
      item.rework = { red_corrections: rw.red_corrections, dev_reruns: rw.dev_reruns, verify_reruns: rw.verify_reruns, total: rw.total, by_defect_in: split };
      item.interrupted = rw.interrupted;
      item.post_merge = rw.post_merge;
      const roles = {}; const phases = {}; const models = new Set();
      for (const r of itemRows) {
        roles[r.agent_type] = (roles[r.agent_type] ?? 0) + 1;
        const ph = r.workflow_phase ?? '(none)';
        phases[ph] = (phases[ph] ?? 0) + 1;
        if (r.model) models.add(r.model);
        item.wall_ms += r.wall_ms ?? 0;
        item.tokens.input += r.usage?.input ?? 0;
        item.tokens.output += r.usage?.output ?? 0;
        item.tokens.cache_read += r.usage?.cache_read ?? 0;
        item.tokens.cache_creation += r.usage?.cache_creation ?? 0;
      }
      item.tokens.total = item.tokens.input + item.tokens.output + item.tokens.cache_read + item.tokens.cache_creation;
      item.dispatches = { total: itemRows.length, by_role: roles, by_phase: phases };
      item.models = [...models].sort();
      item.dispatch_source = 'transcripts';
      item.disagrees = rw.total !== counterRework || (gitMeasured && rw.total !== gitRework);
    } else {
      item.rework = { red_corrections: git.red_corrected, dev_reruns: git.rework, verify_reruns: 0, total: gitRework, by_defect_in: split };
      item.disagrees = gitMeasured && gitRework !== counterRework;
    }
    reworkTotal += item.rework.total;
    for (const k of Object.keys(reworkSplit)) reworkSplit[k] += split[k];
    items[id] = item;
  }

  const laneAcc = {};
  for (const it of Object.values(items)) {
    const a = (laneAcc[it.lane] ??= { items: 0, dispatches: 0 });
    a.items += 1;
    a.dispatches += it.dispatches.total;
  }
  const by_lane = {};
  for (const lane of Object.keys(laneAcc).sort()) {
    const a = laneAcc[lane];
    by_lane[lane] = measured
      ? { items: a.items, dispatches: a.dispatches, per_item: Math.round((a.dispatches / a.items) * 100) / 100 }
      : { items: a.items, dispatches: NOT_MEASURED, per_item: NOT_MEASURED };
  }

  return {
    schema: 1,
    sprint_id: sprintId,
    generated_at: now.toISOString(),
    sources: { sessions, dispatches: rows.length, repos, warnings },
    items,
    sprint_level: sprintLevel,
    unattributed: { ...unattributed, share: totalTokens > 0 ? unattributed.tokens / totalTokens : 0 },
    totals: { dispatches: rows.length, rework: reworkTotal, tokens: totalTokens, rework_by_defect_in: reworkSplit },
    by_lane,
  };
}

function readJson(file) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return null; }
}

/**
 * I/O shell (R1). `ledger` is the test seam: any object with discoverSessions and readDispatches.
 * Never throws for degraded sources.
 */
export function runSprintMetrics(sprintId, opts = {}) {
  const now = opts.now ?? new Date();
  const sprintDir = opts.sprintDir;
  const ledger = opts.ledger ?? defaultLedger;
  const projectRoot = opts.projectRoot ?? process.cwd();
  const warnings = [];

  const state = readJson(path.join(sprintDir, 'state.json'));
  if (!state || typeof state !== 'object') warnings.push('state.json missing or unreadable: empty roster');
  const stories = state && typeof state.stories === 'object' && state.stories ? state.stories : {};
  const roster = Object.keys(stories);
  const counters = {};
  for (const id of roster) {
    counters[id] = { qa_bounces: Number(stories[id]?.qa_bounces) || 0, arch_bounces: Number(stories[id]?.arch_bounces) || 0 };
  }

  let events = [];
  try { events = parseJsonl(path.join(sprintDir, 'events.jsonl')); } catch { /* no window */ }
  const window = sprintWindow(events, state, now);

  // STORY-066-10: qa-bounce events by defect location (roster items only, run_id-deduped; a
  // missing or invalid location counts as `unknown`) and each item's lane.
  const defectByItem = {};
  const seenRuns = new Set();
  for (const ev of events) {
    if (ev?.run_id != null) {
      if (seenRuns.has(ev.run_id)) continue;
      seenRuns.add(ev.run_id);
    }
    if (ev?.kind !== 'qa-bounce' || !(ev.story_id in counters)) continue;
    const loc = DEFECT_IN_VALUES.includes(ev.defect_in) ? ev.defect_in : 'unknown';
    const split = (defectByItem[ev.story_id] ??= zeroSplit());
    split[loc] += 1;
  }
  const laneByItem = {};
  for (const id of roster) {
    const l = stories[id]?.lane;
    laneByItem[id] = typeof l === 'string' && l ? l : 'standard';
  }

  let gitByItem = {};
  let gitMeasured = false;
  let repos = [];
  try {
    const list = readRepoList(projectRoot);
    const g = readGitCommits(projectRoot, list);
    warnings.push(...g.warnings);
    repos = g.repos;
    gitMeasured = g.repos.length > 0;
    gitByItem = classifyCommits(g.commits, roster, window);
  } catch (err) {
    warnings.push(`git data: not measured (${err instanceof Error ? err.message : String(err)})`);
  }

  let rows = [];
  let sessions = 0;
  try {
    const report = { warnings: [] };
    const found = ledger.discoverSessions(sprintDir, { report });
    sessions = Array.isArray(found) ? found.length : 0;
    const read = ledger.readDispatches(found, { window: window ?? report.window ?? null, report });
    rows = Array.isArray(read) ? read : [];
    for (const w of report.warnings ?? []) warnings.push(String(w));
  } catch (err) {
    warnings.push(`dispatch reader failed: ${err instanceof Error ? err.message : String(err)}`);
    rows = [];
  }
  if (rows.length === 0) warnings.push(`dispatch data: ${NOT_MEASURED}`);

  const doc = buildMetrics({ sprintId, now, roster, counters, rows, gitByItem, gitMeasured, sessions, repos, warnings, defectByItem, laneByItem });

  if (fs.existsSync(sprintDir)) {
    try { atomicWrite(path.join(sprintDir, 'metrics.json'), doc); } catch (err) {
      doc.sources.warnings.push(`metrics.json not written: ${err instanceof Error ? err.message : String(err)}`);
    }
  } else {
    doc.sources.warnings.push('sprint directory not found: metrics.json not written');
  }
  return doc;
}

// ---------------------------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------------------------

function formatTable(doc) {
  const lines = [];
  for (const [id, it] of Object.entries(doc.items)) {
    const nm = it.dispatch_source === NOT_MEASURED;
    const disp = nm ? NOT_MEASURED : String(it.dispatches.total);
    const rw = nm
      ? `${it.rework.total} (git)`
      : `${it.rework.total} (r${it.rework.red_corrections}/d${it.rework.dev_reruns}/v${it.rework.verify_reruns})`;
    const tokens = nm ? NOT_MEASURED : String(it.tokens.total);
    lines.push(
      `${id}  lane=${it.lane}  dispatches=${disp}  rework=${rw}  git_rework=${it.git.red_corrected + it.git.rework}  ` +
      `interrupted=${nm ? NOT_MEASURED : it.interrupted}  post_merge=${nm ? NOT_MEASURED : it.post_merge}  ` +
      `tokens=${tokens}  source=${it.dispatch_source}  disagrees=${it.disagrees}`,
    );
  }
  for (const [lane, b] of Object.entries(doc.by_lane ?? {})) {
    lines.push(`by lane: ${lane} items=${b.items} dispatches=${b.dispatches} per_item=${b.per_item}`);
  }
  lines.push(`sprint-level: ${doc.sprint_level.dispatches} dispatches, ${doc.sprint_level.tokens} tokens`);
  lines.push(`unattributed: ${doc.unattributed.dispatches} dispatches, ${doc.unattributed.tokens} tokens, share ${doc.unattributed.share.toFixed(3)}`);
  lines.push(`totals: ${doc.totals.dispatches} dispatches, rework ${doc.totals.rework}, ${doc.totals.tokens} tokens`);
  return lines.join('\n') + '\n';
}

function projectRootFor(sprintDir) {
  const parts = path.resolve(sprintDir).split(path.sep);
  const n = parts.length;
  if (n >= 4 && parts[n - 2] === 'sprint-runs' && parts[n - 3] === '.cleargate') {
    return parts.slice(0, n - 3).join(path.sep) || path.sep;
  }
  return process.cwd();
}

function main() {
  const args = process.argv.slice(2);
  const sprintId = args.find((a) => !a.startsWith('--'));
  const jsonMode = args.includes('--json');

  if (!sprintId || args[0]?.startsWith('--')) {
    process.stderr.write('Usage: node sprint_metrics.mjs <sprint-id> [--json]\n');
    process.exit(2);
  }

  const sprintDir = process.env.CLEARGATE_SPRINT_DIR
    ? path.resolve(process.env.CLEARGATE_SPRINT_DIR)
    : path.join(REPO_ROOT, '.cleargate', 'sprint-runs', sprintId);

  let doc;
  try {
    doc = runSprintMetrics(sprintId, { sprintDir, projectRoot: projectRootFor(sprintDir) });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    doc = {
      schema: 1,
      sprint_id: sprintId,
      generated_at: new Date().toISOString(),
      sources: { sessions: 0, dispatches: 0, repos: [], warnings: [`sprint_metrics failed: ${message}`, `dispatch data: ${NOT_MEASURED}`] },
      items: {},
      sprint_level: { dispatches: 0, tokens: 0 },
      unattributed: { dispatches: 0, tokens: 0, share: 0 },
      totals: { dispatches: 0, rework: 0, tokens: 0, rework_by_defect_in: zeroSplit() },
      by_lane: {},
    };
  }

  for (const w of doc.sources.warnings) process.stderr.write(`sprint_metrics: warning: ${w}\n`);
  process.stdout.write(jsonMode ? JSON.stringify(doc) + '\n' : formatTable(doc));
  process.exit(0);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
