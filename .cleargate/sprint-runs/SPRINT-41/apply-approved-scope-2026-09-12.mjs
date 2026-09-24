#!/usr/bin/env node
// One-sprint operational reconciliation, not a new CLI command or a sprint re-init.
// Default: read-only preview. --apply: append approved genesis events, then fold the cache.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { appendEvent, atomicWrite, fold, genesisRunId, readEvents } from '../../scripts/state-events.mjs';
import { validateState } from '../../scripts/validate_state.mjs';

const runDir = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(runDir, '../../..');
const require = createRequire(path.join(repo, 'cleargate-cli/package.json'));
const yaml = require('js-yaml');
const stateFile = path.join(runDir, 'state.json');
const eventsFile = path.join(runDir, 'events.jsonl');
const approvedAt = '2026-09-11T22:19:09Z';
const reason = `CR:scope-change: sandrinio approved the decision brief via continue please at ${approvedAt}; see sprint-context.md Mid-Sprint Amendments`;
const additions = [
  ['BUG-085', 'BUG-085_live_instance_never_resynced_canonical_hook_fixes_inert.md', 'fast'],
  ['STORY-058-12', 'STORY-058-12_host_dispatch_mode_split_and_serial_fallback.md', 'standard'],
  ['STORY-058-13', 'STORY-058-13_codex_end_to_end_loop_evidence.md', 'standard'],
  ['BUG-089', 'BUG-089_pretooluse_gates_exit_1_fail_open.md', 'standard'],
];
const baselineIds = ['BUG-067', ...Array.from({ length: 11 }, (_, i) => `STORY-058-${String(i + 1).padStart(2, '0')}`)];
const allowedIds = new Set([...baselineIds, ...additions.map(([id]) => id)]);
const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex');
const serialize = (value) => `${JSON.stringify(value, null, 2)}\n`;
const apply = process.argv.slice(2).includes('--apply');
assert(process.argv.slice(2).every((arg) => arg === '--apply'), 'Only --apply is supported');

let lockFd;
const lockPath = `${stateFile}.lock`;
try {
  if (apply) {
    // Use the existing writer's exact lock name. Never steal another process's lock.
    lockFd = fs.openSync(lockPath, 'wx');
    fs.writeFileSync(lockFd, JSON.stringify({ pid: process.pid, at: new Date().toISOString() }));
  }
  assert.equal(fs.readFileSync(path.join(runDir, '../.active'), 'utf8').trim(), 'SPRINT-41');
  const beforeLog = fs.readFileSync(eventsFile, 'utf8');
  const beforeCache = fs.readFileSync(stateFile, 'utf8');
  const beforeState = JSON.parse(beforeCache);
  const beforeEvents = readEvents(eventsFile);
  const authoritative = fold(beforeEvents);
  assert.equal(authoritative.sprint_id, 'SPRINT-41');
  assert.equal(authoritative.sprint_status, 'Active');
  assert.equal(beforeState.sprint_status, 'Active');
  assert(validateState(authoritative).valid, 'Existing event fold is invalid');
  assert(beforeLog.endsWith('\n'), 'Refuse to append to an incomplete event line');
  assert(Object.keys(authoritative.stories).every((id) => allowedIds.has(id)), 'Unexpected roster expansion: review before rerunning');
  assert(Object.keys(beforeState.stories).every((id) => allowedIds.has(id)), 'Unexpected cache entry: review before rerunning');
  for (const id of baselineIds) {
    assert(authoritative.stories[id], `Missing original story ${id}`);
    assert.deepEqual(beforeState.stories[id], authoritative.stories[id], `Original story cache drift: ${id}`);
  }
  const baselineEvents = beforeEvents.filter((e) => baselineIds.includes(e.story_id));
  assert.equal(baselineEvents.length, 12, 'Original stories progressed; this one-time bootstrap needs review');
  for (const event of baselineEvents) {
    assert.equal(event.from, null);
    assert.equal(event.to, 'Ready to Bounce');
    assert.equal(event.run_id, genesisRunId('SPRINT-41', event.story_id));
  }
  // A partially completed previous invocation may have appended some additions but not yet
  // folded the cache. Permit recovery only for this exact amendment's immutable genesis events.
  for (const event of beforeEvents.filter((e) => !baselineIds.includes(e.story_id))) {
    assert.equal(event.reason, reason, 'Foreign event after baseline: review instead of recovering');
    assert.equal(event.from, null);
    assert.equal(event.to, 'Ready to Bounce');
    assert.equal(event.run_id, genesisRunId('SPRINT-41', event.story_id));
  }
  assert.equal(new Set(beforeEvents.map((event) => event.run_id)).size, beforeEvents.length, 'Duplicate existing event IDs');
  const pending = [];
  for (const [id, filename, lane] of additions) {
    const raw = fs.readFileSync(path.join(repo, '.cleargate/delivery/pending-sync', filename), 'utf8');
    const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
    assert(match, `Frontmatter missing: ${id}`);
    const metadata = yaml.load(match[1]);
    assert.equal(metadata.story_id ?? metadata.bug_id, id);
    assert.equal(metadata.approved, true, `Not approved: ${id}`);
    assert.equal(metadata.approved_by, 'sandrinio');
    assert.equal(new Date(metadata.approved_at).toISOString(), new Date(approvedAt).toISOString());
    assert.equal(metadata.cached_gate_result?.pass, true, `Readiness failed: ${id}`);
    if (authoritative.stories[id]) continue;
    assert(!beforeState.stories[id], `Unlogged cache story: ${id}`);
    pending.push({
      ts: approvedAt, sprint_id: 'SPRINT-41', sprint_status: 'Active', story_id: id,
      from: null, to: 'Ready to Bounce', actor: 'orchestrator',
      run_id: genesisRunId('SPRINT-41', id), wave: null, reason, kind: 'transition',
      initial: {
        qa_bounces: 0, arch_bounces: 0, worktree: null,
        notes: 'Approved scope addition; no implementation or runtime evidence claimed.',
        lane, lane_assigned_by: 'sdr-lane-audit', lane_demoted_at: null, lane_demotion_reason: null,
      },
    });
  }
  const predicted = fold([...beforeEvents, ...pending]);
  assert.equal(Object.keys(predicted.stories).length, 16);
  assert(validateState(predicted).valid, 'Proposed state violates schema/invariants');
  for (const [id, story] of Object.entries(authoritative.stories)) {
    assert.deepEqual(predicted.stories[id], story, `Existing story changed: ${id}`);
  }
  if (apply) {
    for (const event of pending) appendEvent(eventsFile, event);
    const afterLog = fs.readFileSync(eventsFile, 'utf8');
    assert(afterLog.startsWith(beforeLog), 'Original event bytes changed');
    assert.deepEqual(readEvents(eventsFile), [...beforeEvents, ...pending]);
    const folded = fold(readEvents(eventsFile));
    assert.deepEqual(folded, predicted);
    if (beforeCache !== serialize(folded)) atomicWrite(stateFile, folded);
    assert.equal(fs.readFileSync(stateFile, 'utf8'), serialize(folded));
  }
  console.log(JSON.stringify({
    mode: apply ? 'apply' : 'preview', added: pending.map((event) => event.story_id),
    beforeStoryCount: Object.keys(authoritative.stories).length,
    afterStoryCount: Object.keys(predicted.stories).length,
    beforeEventCount: beforeEvents.length, afterEventCount: beforeEvents.length + pending.length,
    beforeLogSha256: sha256(beforeLog), beforeCacheSha256: sha256(beforeCache),
    originalEventPrefixPreserved: true, existingStoryRecordsPreserved: true,
    cacheMatchesFold: apply ? fs.readFileSync(stateFile, 'utf8') === serialize(predicted) : beforeCache === serialize(authoritative),
    afterLogSha256: apply ? sha256(fs.readFileSync(eventsFile)) : null,
    afterCacheSha256: apply ? sha256(fs.readFileSync(stateFile)) : null,
  }, null, 2));
} finally {
  if (lockFd !== undefined) {
    fs.closeSync(lockFd);
    fs.unlinkSync(lockPath);
  }
}
