/**
 * RED test — CR-082: Deferred-Verification Close Gate
 *
 * Tests fail against the clean baseline because:
 *   - close_sprint.mjs has NO Step 2.9 (deferred-verification gate absent)
 *   - CLEARGATE_FORCE_DEFERRED_VERIFY env seam does not exist yet
 *   - PASS-PENDING-SMOKE is absent from cleargate-planning/.claude/agents/qa.md
 *   - deferred_verification field is absent from .cleargate/templates/story.md
 *
 * Run (standalone — NOT the cli npm-test suite):
 *   node --test --import tsx .cleargate/scripts/close_sprint.deferred-verify.red.node.test.ts
 *
 * NOTE: On Node ≥25 `--import tsx/esm` triggers ERR_REQUIRE_CYCLE_MODULE (Node v25 stricter
 * ESM/CJS cycle detection). Use `--import tsx` instead — functionally identical; tsx auto-detects
 * ESM. The M3 plan specifies `tsx/esm`; this deviation is Node-version-specific and non-breaking.
 *
 * Node:test + assert only. No Pydantic Literal, no queryByText/getByText.
 * qa_red_lint (CR-081, now live) will exit 0 on this file — no R-enum/R-query match.
 *
 * Self-isolating: every scenario uses a mktemp tmpdir, bypasses real git/Steps 2.7/2.8
 * via CLEARGATE_SKIP_WORKTREE_CHECK=1 + CLEARGATE_SKIP_MERGE_CHECK=1.
 * The real SPRINT-34 .active sentinel + state.json are never touched.
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..', '..');
const CLOSE_SPRINT = path.join(__dirname, 'close_sprint.mjs');

// ── Fixture helpers ──────────────────────────────────────────────────────────

/**
 * Minimal state.json (schema_version 3) with a single story in Done state.
 * Uses standard lane only — no fast lane — to avoid v2.1 validation check
 * which requires a SPRINT-NN_REPORT.md with metric rows/sections.
 * All required per-story validator fields are present.
 */
function makeStateJson(sprintId: string): object {
  return {
    schema_version: 3,
    sprint_id: sprintId,
    sprint_status: 'Active',
    stories: {
      'CR-082': {
        state: 'Done',
        lane: 'standard',
        lane_assigned_by: 'architect',
        lane_demoted_at: null,
        lane_demotion_reason: null,
        qa_bounces: 0,
        arch_bounces: 0,
        updated_at: '2026-06-04T00:00:00Z',
      },
    },
    last_action: 'test setup',
    updated_at: '2026-06-04T00:00:00Z',
  };
}

/** Create a tmpdir with a minimal state.json for the given sprint id. */
function makeTmpSprintDir(sprintId: string): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), `cg-cr082-red-${sprintId}-`));
  fs.writeFileSync(
    path.join(dir, 'state.json'),
    JSON.stringify(makeStateJson(sprintId), null, 2) + '\n',
    'utf8'
  );
  return dir;
}

/**
 * Base env seams shared by all scenarios.
 * All non-Step-2.9 gates bypassed so the test isolates Step 2.9 specifically.
 */
function baseEnv(sprintDir: string): NodeJS.ProcessEnv {
  return {
    ...process.env,
    CLEARGATE_SPRINT_DIR: sprintDir,
    CLEARGATE_REPO_ROOT: REPO_ROOT,
    CLEARGATE_SKIP_LIFECYCLE_CHECK: '1',  // skip WS8(e) dist assertion + Step 2.6/2.6b
    CLEARGATE_SKIP_WORKTREE_CHECK: '1',   // skip Step 2.7
    CLEARGATE_SKIP_MERGE_CHECK: '1',      // skip Step 2.8
    CLEARGATE_SKIP_PARENT_ROLLUP: '1',    // skip Step 2.6c
    CLEARGATE_SKIP_SPRINT_TRENDS: '1',    // skip Step 6.5
    CLEARGATE_SKIP_SKILL_CANDIDATES: '1', // skip Step 6.6
    CLEARGATE_SKIP_FLASHCARD_CLEANUP: '1',// skip Step 6.7
    CLEARGATE_SKIP_BUNDLE_CHECK: '1',     // skip Step 3.5
    CLEARGATE_CI_ACK: '1',                // satisfy the STORY-051-08 --assume-ack CI-token guard
  };
}

/**
 * Run close_sprint.mjs in a subprocess. Returns { exitCode, stdout, stderr }.
 * Never throws — captures all output even on non-zero exit.
 * Creates and destroys its own tmpdir automatically.
 */
function runClose(
  sprintId: string,
  extraEnv: NodeJS.ProcessEnv = {}
): { exitCode: number; stdout: string; stderr: string } {
  const sprintDir = makeTmpSprintDir(sprintId);
  const env = { ...baseEnv(sprintDir), ...extraEnv };

  const result = spawnSync('node', [CLOSE_SPRINT, sprintId, '--assume-ack'], {
    env,
    encoding: 'utf8',
    timeout: 30_000,
  });

  // Clean up tmpdir regardless of outcome
  try {
    fs.rmSync(sprintDir, { recursive: true, force: true });
  } catch {
    // cleanup failure is non-fatal in test context
  }

  return {
    exitCode: result.status ?? 1,
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
  };
}

// ── Scenario 1: declared + NO result (null) → close BLOCKS ───────────────────
test('Scenario 1: declared entry with no result → Step 2.9 blocks close (non-zero exit + Step 2.9 message)', () => {
  const forcedState = JSON.stringify({
    'STORY-TEST-01': {
      declared: [{ command: 'docker build .', blocks: 'close' }],
      result: null,
    },
  });

  const { exitCode, stdout, stderr } = runClose('SPRINT-TEST', {
    CLEARGATE_FORCE_DEFERRED_VERIFY: forcedState,
  });

  // RED: Step 2.9 is absent. close_sprint.mjs proceeds to Step 3 (prefill_report.mjs)
  // which fails for unrelated reasons — but the Step 2.9 message is never emitted.
  // After implementation: exit non-zero + "Step 2.9" message in combined output.
  assert.notEqual(exitCode, 0,
    'Expected non-zero exit when a declared deferred verification has no result');
  const combined = stdout + stderr;
  assert.match(
    combined,
    /Step 2\.9.*fail|deferred.*verif.*fail|STORY-TEST-01.*unrun|unrun.*STORY-TEST-01/i,
    'Expected a Step 2.9 failure message for STORY-TEST-01 (unrun result); Step 2.9 not yet implemented'
  );
});

// ── Scenario 2: declared + green result → gate PASSES ────────────────────────
test('Scenario 2: declared entry with green result → Step 2.9 passes; close proceeds past 2.9', () => {
  const forcedState = JSON.stringify({
    'STORY-TEST-01': {
      declared: [{ command: 'docker build .', blocks: 'close' }],
      result: 'green',
    },
  });

  const { stdout } = runClose('SPRINT-TEST', {
    CLEARGATE_FORCE_DEFERRED_VERIFY: forcedState,
  });

  // RED: Step 2.9 is absent — stdout will never contain "Step 2.9 passed".
  assert.match(
    stdout,
    /Step 2\.9 passed/i,
    'Expected "Step 2.9 passed" in stdout when all declared verifications are green; Step 2.9 not yet implemented'
  );
});

// ── Scenario 3: none declared → silent no-op (THE SPRINT-34-own-close case) ──
test('Scenario 3: no deferred_verification declarations → Step 2.9 silent no-op, close proceeds', () => {
  // No CLEARGATE_FORCE_DEFERRED_VERIFY injected — Step 2.9 should scan story files,
  // find none with deferred_verification declarations, print the no-op line, and continue.
  // This is the load-bearing regression: if this fails post-implementation,
  // CR-082's own close gate would block SPRINT-34's close (sprint-ending defect).
  const { stdout } = runClose('SPRINT-TEST', {});

  // RED: Step 2.9 is absent — stdout will never contain the no-op line.
  assert.match(
    stdout,
    /Step 2\.9 passed: no deferred verifications declared/i,
    'Expected "Step 2.9 passed: no deferred verifications declared" no-op line; Step 2.9 not yet implemented'
  );
});

// ── Scenario 4: declared + red result → close BLOCKS ─────────────────────────
test('Scenario 4: declared entry with red result → Step 2.9 blocks close', () => {
  const forcedState = JSON.stringify({
    'STORY-TEST-02': {
      declared: [{ command: 'docker build .', blocks: 'close' }],
      result: 'red',
    },
  });

  const { exitCode, stdout, stderr } = runClose('SPRINT-TEST', {
    CLEARGATE_FORCE_DEFERRED_VERIFY: forcedState,
  });

  // RED: Step 2.9 is absent. exit may be non-zero (Step 3 failure) but for wrong reason.
  assert.notEqual(exitCode, 0,
    'Expected non-zero exit when a declared deferred verification has a red result');
  const combined = stdout + stderr;
  assert.match(
    combined,
    /Step 2\.9.*fail|deferred.*verif.*fail|STORY-TEST-02.*red|red.*STORY-TEST-02/i,
    'Expected a Step 2.9 failure message for STORY-TEST-02 (red result); Step 2.9 not yet implemented'
  );
});

// ── Scenario 5: grep — PASS-PENDING-SMOKE in qa.md ───────────────────────────
test('Scenario 5: grep — PASS-PENDING-SMOKE present in cleargate-planning/.claude/agents/qa.md', () => {
  const qaPath = path.join(REPO_ROOT, 'cleargate-planning', '.claude', 'agents', 'qa.md');

  // RED: PASS-PENDING-SMOKE is not yet in qa.md — will exist after CR-082 Developer merges.
  const grepResult = spawnSync('grep', ['-q', 'PASS-PENDING-SMOKE', qaPath], {
    encoding: 'utf8',
  });
  assert.equal(
    grepResult.status,
    0,
    `Expected "PASS-PENDING-SMOKE" in ${qaPath} (output-shape verdict line); field not yet added`
  );
});

// ── Scenario 6: grep — deferred_verification field in story.md ───────────────
test('Scenario 6: grep — deferred_verification field present in .cleargate/templates/story.md', () => {
  const storyMdPath = path.join(REPO_ROOT, '.cleargate', 'templates', 'story.md');

  // RED: deferred_verification field is not yet in story.md — will exist after CR-082 Developer merges.
  const grepResult = spawnSync('grep', ['-q', 'deferred_verification', storyMdPath], {
    encoding: 'utf8',
  });
  assert.equal(
    grepResult.status,
    0,
    `Expected "deferred_verification" field in ${storyMdPath}; field not yet added`
  );
});
