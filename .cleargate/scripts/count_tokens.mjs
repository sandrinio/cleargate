#!/usr/bin/env node
/**
 * count_tokens.mjs — Sprint token-ledger digest CLI
 *
 * Usage:
 *   node count_tokens.mjs <sprint-id> [--json]
 *
 * Args:
 *   sprint-id   — e.g. SPRINT-17 or SPRINT-fixture
 *   --json      — emit machine-readable JSON digest instead of human text
 *
 * Reads:
 *   .cleargate/sprint-runs/<sprint-id>/token-ledger.jsonl
 *   (or override with CLEARGATE_SPRINT_DIR env var)
 *
 * stdout (default — human):
 *   Total tokens this sprint: <N> (input: <X> / output: <Y> / cache_read: <Z>)
 *   Per-agent breakdown:
 *     architect: <N> (across <M> dispatches)
 *     ...
 *   Anomalies:
 *     - STORY-XXX-YY: 4.2× higher than median story cost
 *
 * stdout (--json):
 *   { total, by_agent, by_work_item, anomalies, measures, subagent }
 *   measures — what the ledger columns mean ('orchestrator-window', CR-120).
 *   subagent — per-dispatch figures read from the host's subagent transcripts (additive, CR-120).
 *   JSON schema is a stable public API — consumed by prep_reporter_context.mjs
 *   and referenced in STORY-025-05 reporter.md capability surface table.
 *
 * Exit codes:
 *   0 — success (empty ledger exits 0 with a note; not an error per STORY-025-01 §1.4)
 *   1 — token-ledger.jsonl file not found at the expected path (hard error)
 *   2 — usage error (missing sprint-id)
 *
 * CLI shape is locked (positional <sprint-id> only; no required flags):
 *   STORY-025-03 consumes this script from close_sprint.mjs Step 3.5.
 *   Do NOT add required flags without updating STORY-025-03's invocation.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseJsonl, normalizeRow, aggregate, LEDGER_MEASURES } from './lib/ledger-digest.mjs';
import { discoverSessions, readDispatches, writeSubagentLedger } from './subagent-ledger.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..', '..');

/**
 * Format the aggregated digest as human-readable text.
 * Matches the CR-021 §3.2.5 example shape.
 * @param {{ total, by_agent, by_work_item, anomalies }} digest
 * @param {string} sprintId
 * @returns {string}
 */
function formatDigest(digest, sprintId, subagent) {
  const { total, by_agent, by_work_item, anomalies } = digest;
  const lines = [];

  lines.push(`Total tokens this sprint: ${total.sum.toLocaleString()} ` +
    `(input: ${total.input.toLocaleString()} / output: ${total.output.toLocaleString()} / ` +
    `cache_read: ${total.cache_read.toLocaleString()})`);

  lines.push(`Per-agent breakdown (${LEDGER_MEASURES.replace('-', ' ')}):`);
  // Always emit the four canonical agent types first (even if zero) for test predictability.
  const canonicalAgents = ['architect', 'developer', 'qa', 'reporter'];
  const emittedAgents = new Set();
  for (const agent of canonicalAgents) {
    const entry = by_agent[agent] || { sum: 0, dispatches: 0 };
    lines.push(`  ${agent}: ${entry.sum.toLocaleString()} (across ${entry.dispatches} dispatches)`);
    emittedAgents.add(agent);
  }
  // Emit any non-canonical agent types (e.g. 'unknown') after the canonical ones.
  for (const [agent, entry] of Object.entries(by_agent)) {
    if (!emittedAgents.has(agent)) {
      lines.push(`  ${agent}: ${entry.sum.toLocaleString()} (across ${entry.dispatches} dispatches)`);
    }
  }

  lines.push('Anomalies:');
  if (anomalies.length === 0) {
    lines.push('  (none)');
  } else {
    for (const a of anomalies) {
      lines.push(`  - ${a.work_item_id}: ${a.multipleOfMedian}× higher than median story cost`);
    }
  }

  if (subagent && subagent.status === 'measured') {
    lines.push(`Subagent dispatches (from transcripts): ${subagent.dispatches} across ${subagent.sessions} sessions, ${subagent.tokens.total.toLocaleString()} tokens`);
    for (const [t, e] of Object.entries(subagent.by_agent_type)) {
      lines.push(`  ${t}: ${e.tokens.toLocaleString()} (across ${e.dispatches} dispatches)`);
    }
  } else {
    const why = subagent && subagent.warnings.length > 0 ? subagent.warnings[0] : 'no transcripts found';
    lines.push(`Subagent dispatches: not measured (${why})`);
  }

  return lines.join('\n') + '\n';
}

/**
 * Read the subagent transcripts once and shape the additive `subagent` digest key.
 * Never throws: any failure becomes status 'not measured' plus a warning (CR-120).
 */
function measureSubagents(sprintDir) {
  const report = { warnings: [] };
  let rows = [];
  let sessions = [];
  let ledgerFile = null;
  try {
    sessions = discoverSessions(sprintDir, { report });
    rows = readDispatches(sessions, { window: report.source === 'fallback' ? report.window : null, report });
    if (writeSubagentLedger(sprintDir, rows)) ledgerFile = 'subagent-ledger.jsonl';
  } catch (err) {
    report.warnings.push(`subagent ledger failed: ${err && err.message ? err.message : err}`);
    rows = [];
  }
  const tokens = { input: 0, output: 0, cache_read: 0, cache_creation: 0, total: 0 };
  const by_agent_type = {};
  const by_model = {};
  let interrupted = 0;
  for (const r of rows) {
    const t = r.usage.input + r.usage.output + r.usage.cache_read + r.usage.cache_creation;
    tokens.input += r.usage.input;
    tokens.output += r.usage.output;
    tokens.cache_read += r.usage.cache_read;
    tokens.cache_creation += r.usage.cache_creation;
    tokens.total += t;
    if (!r.completed) interrupted += 1;
    for (const [map, key] of [[by_agent_type, r.agent_type], [by_model, r.model]]) {
      if (!map[key]) map[key] = { dispatches: 0, tokens: 0 };
      map[key].dispatches += 1;
      map[key].tokens += t;
    }
  }
  return {
    measures: 'subagent-transcripts',
    status: rows.length > 0 ? 'measured' : 'not measured',
    source: report.source || 'none',
    sessions: sessions.length,
    dispatches: rows.length,
    interrupted,
    tokens,
    by_agent_type,
    by_model,
    ledger_file: ledgerFile,
    warnings: report.warnings,
  };
}

function main() {
  const args = process.argv.slice(2);
  const sprintId = args.find(a => !a.startsWith('--'));
  const jsonMode = args.includes('--json');

  if (!sprintId) {
    process.stderr.write('Usage: node count_tokens.mjs <sprint-id> [--json]\n');
    process.exit(2);
  }

  const sprintDir = process.env.CLEARGATE_SPRINT_DIR
    ? path.resolve(process.env.CLEARGATE_SPRINT_DIR)
    : path.join(REPO_ROOT, '.cleargate', 'sprint-runs', sprintId);

  const ledgerFile = path.join(sprintDir, 'token-ledger.jsonl');

  if (!fs.existsSync(ledgerFile)) {
    process.stderr.write(`Error: token-ledger.jsonl not found at ${ledgerFile}\n`);
    process.exit(1);
  }

  const subagent = measureSubagents(sprintDir);
  for (const w of subagent.warnings) process.stderr.write(`Warning: ${w}\n`);

  const rawRows = parseJsonl(ledgerFile);
  const rows = rawRows.map(normalizeRow);

  if (rows.length === 0) {
    if (jsonMode) {
      process.stdout.write(JSON.stringify({ total: 0, by_agent: {}, by_work_item: {}, anomalies: [], measures: LEDGER_MEASURES, subagent }) + '\n');
    } else {
      process.stdout.write(`Ledger empty for ${sprintId} (0 rows).\n`);
    }
    process.exit(0);
  }

  const digest = aggregate(rows);

  if (jsonMode) {
    process.stdout.write(JSON.stringify({ ...digest, subagent }) + '\n');
  } else {
    process.stdout.write(formatDigest(digest, sprintId, subagent));
  }

  process.exit(0);
}

main();
