#!/usr/bin/env node
// One-sprint operational reconciliation, not a new CLI command or a sprint re-init.
// Registers BUG-098 into SPRINT-41 via one append-only genesis event, then folds the cache.
// Default: read-only preview. --apply: append the event, then fold the cache.
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
const approvedAt = '2026-09-26T09:30:00Z';
const reason = `CR:scope-change: sandrinio directed the fresh-folder journey and 'log every issue you find and fix them' at ${approvedAt}; see sprint-context.md Mid-Sprint Amendments`;
const additions = [
  ['BUG-098', 'BUG-098_remaining_positional_frontmatter_sites.md', 'standard'],
];
const existingIds = [
  'BUG-067', 'BUG-085', 'BUG-089', 'CR-123', 'BUG-090', 'BUG-096', 'BUG-097',
  ...Array.from({ length: 13 }, (_, i) => `STORY-058-${String(i + 1).padStart(2, '0')}`),
];
const allowedIds = new Set([...existingIds, ...additions.map(([id]) => id)]);
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
  for (const id of existingIds) {
    assert(authoritative.stories[id], `Missing existing item ${id}`);
    assert.deepEqual(beforeState.stories[id], authoritative.stories[id], `Existing item cache drift: ${id}`);
  }
  assert.equal(new Set(beforeEvents.map((event) => event.run_id)).size, beforeEvents.length, 'Duplicate existing event IDs');

  const pending = [];
  for (const [id, filename, lane] of additions) {
  const raw = fs.readFileSync(path.join(repo, '.cleargate/delivery/pending-sync', filename), 'utf8');
  const match = raw.replace(/^<instructions>[\s\S]*?<\/instructions>\s*/, '').match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
  assert(match, `Frontmatter missing: ${id}`);
  const metadata = yaml.load(match[1]);
  assert.equal(metadata.bug_id, id);
  assert.equal(metadata.approved, true, `Not approved: ${id}`);
  assert.equal(metadata.approved_by, 'sandrinio');
  assert.equal(new Date(metadata.approved_at).toISOString(), new Date(approvedAt).toISOString());
  assert.equal(metadata.sprint_cleargate_id, 'SPRINT-41');
  assert.equal(metadata.cached_gate_result?.pass, true, `Readiness failed: ${id}`);

  if (!authoritative.stories[id]) {
    // A partially completed previous invocation may have appended the event but not folded.
    assert(!beforeState.stories[id], `Unlogged cache item: ${id}`);
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
  }
  const predicted = fold([...beforeEvents, ...pending]);
  assert.equal(Object.keys(predicted.stories).length, 21);
  assert(validateState(predicted).valid, 'Proposed state violates schema/invariants');
  for (const [sid, story] of Object.entries(authoritative.stories)) {
    assert.deepEqual(predicted.stories[sid], story, `Existing item changed: ${sid}`);
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
