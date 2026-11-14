// subagent-ledger.mjs — per-dispatch subagent measurement (CR-120, contract C1: frozen names and types never change).
// Read-only library over the host's subagent transcripts. Synchronous. Never throws on a missing/moved layout: warns instead.

/**
 * @typedef {Object} DispatchRow
 * @property {1} schema
 * @property {string} session_id
 * @property {string} agent_id
 * @property {string} tool_use_id
 * @property {boolean} completed  false when the transcript records a user interruption or a cancelled hook
 * @property {string | null} run_id  workflow run id, or null for a top-level dispatch
 * @property {string} agent_type
 * @property {string | null} workflow_phase  from .meta.json, or null
 * @property {string} description
 * @property {string} model
 * @property {string} started_at  ISO-8601
 * @property {string} ended_at  ISO-8601
 * @property {number} wall_ms
 * @property {number} turns
 * @property {number} tool_uses
 * @property {{input: number, output: number, cache_read: number, cache_creation: number}} usage
 */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { parseJsonl } from './lib/ledger-digest.mjs';

function warn(opts, msg) {
  const report = opts && opts.report;
  if (!report) return;
  if (!Array.isArray(report.warnings)) report.warnings = [];
  report.warnings.push(msg);
}

function isDir(p) {
  try {
    return fs.statSync(p).isDirectory();
  } catch {
    return false;
  }
}

function readJsonSafe(p) {
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch {
    return null;
  }
}

/**
 * Find the transcript sessions that belong to a sprint.
 * Ledger transcript paths first; else a window-bounded scan of the host's project directory.
 * Sets opts.report.source ('ledger' | 'fallback' | 'none') and opts.report.window when a report is given.
 * @param {string} sprintDir
 * @param {{report?: object, transcriptsRoot?: string}} [opts]
 * @returns {string[]}
 */
export function discoverSessions(sprintDir, opts = {}) {
  const report = opts.report;
  if (report && !Array.isArray(report.warnings)) report.warnings = [];
  if (report) {
    report.source = 'none';
    report.window = null;
  }
  try {
    const seen = new Set();
    const fromLedger = [];
    for (const row of parseJsonl(path.join(sprintDir, 'token-ledger.jsonl'))) {
      const t = row && row.transcript;
      if (typeof t !== 'string' || !t.endsWith('.jsonl') || seen.has(t)) continue;
      seen.add(t);
      const dir = path.join(path.dirname(t), path.basename(t, '.jsonl'));
      if (isDir(dir)) fromLedger.push(dir);
    }
    if (fromLedger.length > 0) {
      if (report) report.source = 'ledger';
      return fromLedger;
    }

    let start = null;
    let end = null;
    for (const ev of parseJsonl(path.join(sprintDir, 'events.jsonl'))) {
      const ts = ev && ev.ts;
      const ms = typeof ts === 'string' ? Date.parse(ts) : NaN;
      if (Number.isNaN(ms)) continue;
      if (start === null || ms < Date.parse(start)) start = ts;
      if (end === null || ms > Date.parse(end)) end = ts;
    }
    if (start === null) {
      warn(opts, 'no ledger sessions and no sprint window');
      return [];
    }

    let root = opts.transcriptsRoot || process.env.CLEARGATE_TRANSCRIPTS_ROOT || '';
    if (!root) {
      const abs = path.resolve(sprintDir);
      const sprintRuns = path.dirname(abs);
      const cg = path.dirname(sprintRuns);
      if (path.basename(sprintRuns) === 'sprint-runs' && path.basename(cg) === '.cleargate') {
        const slug = path.dirname(cg).replace(/[^A-Za-z0-9]/g, '-');
        root = path.join(os.homedir(), '.claude', 'projects', slug);
      }
    }
    if (!root) {
      warn(opts, 'no ledger sessions and no transcripts root');
      return [];
    }
    if (!isDir(root)) {
      warn(opts, `transcripts root not found: ${root}`);
      return [];
    }
    const sessions = fs
      .readdirSync(root, { withFileTypes: true })
      .filter((d) => d.isDirectory() && isDir(path.join(root, d.name, 'subagents')))
      .map((d) => path.join(root, d.name))
      .sort();
    if (report) {
      report.source = 'fallback';
      report.window = { start, end };
    }
    return sessions;
  } catch (err) {
    warn(opts, `session discovery failed: ${err && err.message ? err.message : err}`);
    if (report) report.source = 'none';
    return [];
  }
}

function compareStrings(a, b) {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

function walkAgentFiles(dir, out) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  entries.sort((a, b) => compareStrings(a.name, b.name));
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walkAgentFiles(full, out);
    else if (e.isFile() && /^agent-(.+)\.jsonl$/.test(e.name)) out.push(full);
  }
}

function parseTranscript(file, meta, opts) {
  const messages = new Map(); // message.id -> {usage, model}
  const toolIds = new Set();
  let minTs = null;
  let maxTs = null;
  let completed = true;
  let bad = 0;
  const lines = fs.readFileSync(file, 'utf8').split('\n');
  for (const line of lines) {
    if (!line.trim()) continue;
    let o;
    try {
      o = JSON.parse(line);
    } catch {
      bad += 1;
      continue;
    }
    if (!o || typeof o !== 'object') continue;
    if (typeof o.timestamp === 'string') {
      const ms = Date.parse(o.timestamp);
      if (!Number.isNaN(ms)) {
        if (minTs === null || ms < minTs.ms) minTs = { ms, s: o.timestamp };
        if (maxTs === null || ms > maxTs.ms) maxTs = { ms, s: o.timestamp };
      }
    }
    if (o.type === 'attachment' && o.attachment && o.attachment.type === 'hook_cancelled') completed = false;
    const msg = o.message;
    if (o.type === 'user' && msg) {
      const c = msg.content;
      if (typeof c === 'string') {
        if (c.startsWith('[Request interrupted by user')) completed = false;
      } else if (Array.isArray(c)) {
        for (const b of c) {
          if (b && b.type === 'text' && typeof b.text === 'string' && b.text.startsWith('[Request interrupted by user')) completed = false;
        }
      }
    }
    if (o.type === 'assistant' && msg && typeof msg === 'object') {
      if (Array.isArray(msg.content)) {
        for (const b of msg.content) {
          if (b && b.type === 'tool_use' && typeof b.id === 'string') toolIds.add(b.id);
        }
      }
      const id = typeof msg.id === 'string' ? msg.id : null;
      if (id && !messages.has(id)) {
        const u = msg.usage || {};
        messages.set(id, {
          model: typeof msg.model === 'string' ? msg.model : '',
          input: Number(u.input_tokens) || 0,
          output: Number(u.output_tokens) || 0,
          cache_read: Number(u.cache_read_input_tokens) || 0,
          cache_creation: Number(u.cache_creation_input_tokens) || 0,
        });
      }
    }
  }
  if (bad > 0) warn(opts, `${path.basename(file)}: skipped ${bad} unparseable line(s)`);
  const usage = { input: 0, output: 0, cache_read: 0, cache_creation: 0 };
  const modelCounts = new Map();
  for (const m of messages.values()) {
    usage.input += m.input;
    usage.output += m.output;
    usage.cache_read += m.cache_read;
    usage.cache_creation += m.cache_creation;
    if (m.model && m.model !== '<synthetic>') modelCounts.set(m.model, (modelCounts.get(m.model) || 0) + 1);
  }
  let model = null;
  let best = 0;
  for (const [k, n] of modelCounts) {
    if (n > best) {
      best = n;
      model = k;
    }
  }
  const started = minTs ? minTs.s : '';
  const ended = maxTs ? maxTs.s : '';
  return {
    completed,
    model: model || (meta && typeof meta.model === 'string' ? meta.model : 'unknown'),
    started_at: started,
    ended_at: ended,
    wall_ms: minTs && maxTs ? maxTs.ms - minTs.ms : 0,
    turns: messages.size,
    tool_uses: toolIds.size,
    usage,
  };
}

/**
 * Read one DispatchRow per distinct subagent dispatch in the given session directories.
 * @param {string[]} sessionDirs
 * @param {{window?: {start: string, end: string} | null, report?: object}} [opts]
 * @returns {DispatchRow[]}
 */
export function readDispatches(sessionDirs, opts = {}) {
  const rows = [];
  const seenKeys = new Set();
  const window = opts.window || null;
  const ws = window ? Date.parse(window.start) : NaN;
  const we = window ? Date.parse(window.end) : NaN;
  for (const sessionDir of sessionDirs || []) {
    try {
      const sessionId = path.basename(sessionDir);
      const subDir = path.join(sessionDir, 'subagents');
      if (!isDir(subDir)) {
        warn(opts, `${sessionId}: no subagents directory`);
        continue;
      }
      const files = [];
      walkAgentFiles(subDir, files);
      for (const file of files) {
        try {
          const agentId = /^agent-(.+)\.jsonl$/.exec(path.basename(file))[1];
          const meta = readJsonSafe(path.join(path.dirname(file), `agent-${agentId}.meta.json`)) || {};
          const toolUseId = typeof meta.toolUseId === 'string' ? meta.toolUseId : '';
          const key = toolUseId || `agent:${agentId}`;
          if (seenKeys.has(key)) continue;
          seenKeys.add(key);
          const parent = path.dirname(file);
          const runId = path.basename(path.dirname(parent)) === 'workflows' ? path.basename(parent) : null;
          const t = parseTranscript(file, meta, opts);
          if (window && !Number.isNaN(ws) && !Number.isNaN(we)) {
            const ms = Date.parse(t.started_at);
            if (Number.isNaN(ms) || ms < ws || ms > we) continue;
          }
          rows.push({
            schema: 1,
            session_id: sessionId,
            agent_id: agentId,
            tool_use_id: toolUseId,
            completed: t.completed,
            run_id: runId,
            agent_type: typeof meta.agentType === 'string' ? meta.agentType : 'unknown',
            workflow_phase: typeof meta.workflowPhase === 'string' ? meta.workflowPhase : null,
            description: typeof meta.description === 'string' ? meta.description : '',
            model: t.model,
            started_at: t.started_at,
            ended_at: t.ended_at,
            wall_ms: t.wall_ms,
            turns: t.turns,
            tool_uses: t.tool_uses,
            usage: t.usage,
          });
        } catch (err) {
          warn(opts, `${sessionId}: ${path.basename(file)} unreadable (${err && err.message ? err.message : err})`);
        }
      }
    } catch (err) {
      warn(opts, `${path.basename(String(sessionDir))}: read failed (${err && err.message ? err.message : err})`);
    }
  }
  rows.sort((a, b) => compareStrings(a.started_at, b.started_at) || compareStrings(a.agent_id, b.agent_id));
  return rows;
}

/**
 * Write rows to <sprintDir>/subagent-ledger.jsonl (tmp + rename). Never creates or truncates the
 * file for zero rows. Returns the path, or null when nothing was written.
 * @param {string} sprintDir
 * @param {DispatchRow[]} rows
 * @returns {string | null}
 */
export function writeSubagentLedger(sprintDir, rows) {
  if (!rows || rows.length === 0) return null;
  const out = path.join(sprintDir, 'subagent-ledger.jsonl');
  const tmp = `${out}.tmp-${process.pid}`;
  fs.writeFileSync(tmp, rows.map((r) => JSON.stringify(r)).join('\n') + '\n');
  fs.renameSync(tmp, out);
  return out;
}
