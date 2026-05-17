/**
 * close-sprint-step-2-6c.red.node.test.ts — STORY-066-02 QA-RED
 *
 * Failing tests (RED phase) for Step 2.6c insertion in close_sprint.mjs.
 * Tests invoke close_sprint.mjs via spawnSync so the absence of the Step 2.6c
 * block fails cleanly rather than producing vacuous passes.
 *
 * TEST INVENTORY (5 scenarios — used for BASELINE_FAIL count):
 *   Scenario 1 — auto-flip: EPIC-FXTRA (3/3 Completed) → status rewritten to Completed
 *   Scenario 2 — auto-flip stdout: "Step 2.6c: EPIC-FXTRA status Draft → Completed"
 *   Scenario 3 — halt-partial: EPIC-FXTRB (2/3 Completed, 1 Approved) → exit 1 + HALT message
 *   Scenario 4 — halt-zero-children: EPIC-FXTRC (0 children) → exit 1 + halt-zero-children
 *   Scenario 5 — mirror parity: live close_sprint.mjs == canonical mirror (byte-identical)
 *
 * PRE-FIX BASELINE:
 *   Scenarios 1-4: Step 2.6c block NOT yet inserted → walkActiveParents not called →
 *     - auto-flip: frontmatter NOT rewritten (status stays Draft) → Scenario 1 FAIL
 *     - stdout missing "Step 2.6c: EPIC-FXTRA…" → Scenario 2 FAIL
 *     - halt-partial/zero-children: process exits 0 (Step 2.6c not present) → Scenarios 3-4 FAIL
 *   Scenario 5: mirror parity is already passing at baseline (both files lack Step 2.6c).
 *     NOTE: this is an intentional regression guard (mirrors match now; diverge if Dev edits only one).
 *     Baseline "pass" accepted per the same rationale as close-sprint-step-7-4.red.node.test.ts §Scenario 3.
 *
 * FLASHCARD refs:
 *   - #qa #red-test #exit-code: Add assertScriptExists() guard first to avoid false-pass on MODULE_NOT_FOUND
 *   - #qa #red-test #vacuous-pass: Non-mutation assertions (bytes unchanged) pass vacuously when script absent
 *   - #qa-red #red-test: ERR_MODULE_NOT_FOUND collapses all it() to 1 failure; count from test-inventory comment
 *   - #node-test #child-process: delete NODE_TEST_CONTEXT before child spawnSync
 *   - #close-pipeline #step-3.5: CLEARGATE_SKIP_BUNDLE_CHECK=1 prevents step 3.5 from blocking tests
 *
 * IMMUTABILITY: sealed post-Red per CR-043 naming contract. DO NOT EDIT after QA-Red returns this file.
 *
 * Runner: tsx --test (node:test)
 * Naming: *.red.node.test.ts (immutable post-Red)
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Repo root: cleargate-cli/test/scripts/ → up 3 levels
const REPO_ROOT = path.resolve(__dirname, '..', '..', '..');

const CLOSE_SPRINT_SCRIPT = path.join(REPO_ROOT, '.cleargate', 'scripts', 'close_sprint.mjs');
const CANONICAL_CLOSE_SPRINT = path.join(
  REPO_ROOT,
  'cleargate-planning',
  '.cleargate',
  'scripts',
  'close_sprint.mjs',
);

const FIXTURE_BASE = path.join(__dirname, '..', 'fixtures', 'close-sprint-step-2-6c');

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Guard: fail fast with a clear message if close_sprint.mjs is missing.
 * Prevents false-pass on MODULE_NOT_FOUND coincidence (FLASHCARD #qa #red-test #exit-code).
 */
function assertScriptExists(): void {
  assert.ok(
    fs.existsSync(CLOSE_SPRINT_SCRIPT),
    `assertScriptExists FAIL: close_sprint.mjs not found at ${CLOSE_SPRINT_SCRIPT}`,
  );
}

/**
 * Build a minimal ClearGate repo fixture in a tmpdir suitable for close_sprint.mjs.
 * Copies the given delivery fixture into .cleargate/delivery/.
 * Returns the temp REPO_ROOT.
 *
 * @param verdictFixture - sub-dir under FIXTURE_BASE ('auto-flip' | 'halt-partial' | 'halt-zero-children')
 * @param sprintId - sprint ID for naming conventions
 */
function buildCloseSprintFixture(verdictFixture: string, sprintId: string): {
  repoRoot: string;
  sprintDir: string;
  stateFile: string;
} {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'cg-2-6c-'));

  // Directories required by close_sprint.mjs
  const sprintDir = path.join(repoRoot, '.cleargate', 'sprint-runs', sprintId);
  const deliveryBase = path.join(repoRoot, '.cleargate', 'delivery');
  const archiveDir = path.join(deliveryBase, 'archive');
  const pendingSyncDir = path.join(deliveryBase, 'pending-sync');
  fs.mkdirSync(sprintDir, { recursive: true });
  fs.mkdirSync(archiveDir, { recursive: true });
  fs.mkdirSync(pendingSyncDir, { recursive: true });

  // Copy verdict fixture files into delivery tree
  const fixtureDir = path.join(FIXTURE_BASE, verdictFixture);
  const fixtureArchive = path.join(fixtureDir, 'archive');
  const fixturePending = path.join(fixtureDir, 'pending-sync');

  if (fs.existsSync(fixtureArchive)) {
    for (const f of fs.readdirSync(fixtureArchive)) {
      fs.copyFileSync(path.join(fixtureArchive, f), path.join(archiveDir, f));
    }
  }
  if (fs.existsSync(fixturePending)) {
    for (const f of fs.readdirSync(fixturePending)) {
      fs.copyFileSync(path.join(fixturePending, f), path.join(pendingSyncDir, f));
    }
  }

  // Minimal state.json (schema_version: 2, sprint_status: Active, one story Done)
  const stateFile = path.join(sprintDir, 'state.json');
  const state = {
    schema_version: 2,
    sprint_id: sprintId,
    execution_mode: 'v1',
    sprint_status: 'Active',
    stories: {
      'STORY-TEST-01': {
        state: 'Done',
        qa_bounces: 0,
        arch_bounces: 0,
        worktree: null,
        updated_at: '2026-01-01T00:00:00.000Z',
        notes: '',
        lane: 'standard',
        lane_assigned_by: 'migration-default',
        lane_demoted_at: null,
        lane_demotion_reason: null,
      },
    },
    last_action: 'init',
    updated_at: '2026-01-01T00:00:00.000Z',
  };
  fs.writeFileSync(stateFile, JSON.stringify(state, null, 2) + '\n', 'utf8');

  // Minimal SPRINT-<id>_REPORT.md (v1 — passes the report validation checks)
  const reportContent = [
    `# Sprint Report — ${sprintId}`,
    '',
    '**Status:** Shipped',
    '**Window:** 2026-01-01 to 2026-01-14',
    '**Stories:** 1 planned / 1 shipped / 0 carried over',
    '',
    '## §1 What Was Delivered',
    '',
    '- Test delivery',
    '',
    '## §2 Story Results + CR Change Log',
    '',
    '### STORY-TEST-01: Test Story',
    '- **Status:** Done',
    '',
    '## §3 Execution Metrics',
    '',
    '| Metric | Value |',
    '|---|---|',
    '| Stories planned | 1 |',
    '',
    '## §4 Lessons',
    '',
    'None.',
    '',
    '## §5 Framework Self-Assessment',
    '',
    '### Process',
    '| Item | Rating | Notes |',
    '|---|---|---|',
    '| Bounce cap respected | Green | |',
    '',
    '### Tooling',
    '| Item | Rating | Notes |',
    '|---|---|---|',
    '| Token ledger completeness | Green | |',
    '',
    '## §6 Change Log',
    '',
    '| Date | Author | Change |',
    '|---|---|---|',
    `| 2026-01-14 | Reporter agent | Initial generation |`,
  ].join('\n');

  fs.writeFileSync(path.join(sprintDir, `${sprintId}_REPORT.md`), reportContent, 'utf8');

  return { repoRoot, sprintDir, stateFile };
}

/**
 * Run close_sprint.mjs against a fixture repo.
 * Skips Steps 2.6 (lifecycle), 2.7 (worktree), 3.5 (bundle) to isolate Step 2.6c.
 * Does NOT skip Step 2.6c (that's the step under test).
 */
function runCloseSprint(
  repoRoot: string,
  sprintDir: string,
  stateFile: string,
): { status: number | null; stdout: string; stderr: string } {
  const sprintId = path.basename(sprintDir);

  // Delete NODE_TEST_CONTEXT to avoid nested tsx --test skip (FLASHCARD #node-test #child-process)
  const env = { ...process.env };
  delete env['NODE_TEST_CONTEXT'];

  const result = spawnSync(
    process.execPath,
    [CLOSE_SPRINT_SCRIPT, sprintId, '--assume-ack'],
    {
      encoding: 'utf8',
      timeout: 30_000,
      env: {
        ...env,
        CLEARGATE_REPO_ROOT: repoRoot,
        CLEARGATE_SPRINT_DIR: sprintDir,
        CLEARGATE_STATE_FILE: stateFile,
        CLEARGATE_SKIP_LIFECYCLE_CHECK: '1',  // skip Step 2.6 / 2.6b (not under test here)
        CLEARGATE_SKIP_WORKTREE_CHECK: '1',   // skip Step 2.7
        CLEARGATE_SKIP_BUNDLE_CHECK: '1',     // skip Step 3.5 (FLASHCARD #close-pipeline #step-3.5)
      },
    },
  );

  return {
    status: result.status,
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
  };
}

// ─── Scenario 1 — auto-flip: EPIC-FXTRA frontmatter rewritten to Completed ───
// PRE-FIX: Step 2.6c not present → walkActiveParents not called → status stays "Draft" → FAIL.

describe('STORY-066-02 Scenario 1 — Step 2.6c auto-flip: EPIC-FXTRA status rewritten to Completed', () => {
  let repoRoot: string;
  let sprintDir: string;
  let stateFile: string;
  const SPRINT_ID = 'SPRINT-FX1';

  before(() => {
    assertScriptExists();
    ({ repoRoot, sprintDir, stateFile } = buildCloseSprintFixture('auto-flip', SPRINT_ID));
  });

  after(() => {
    if (repoRoot && fs.existsSync(repoRoot)) {
      fs.rmSync(repoRoot, { recursive: true, force: true });
    }
  });

  it('EPIC-FXTRA frontmatter status is rewritten to Completed after Step 2.6c', () => {
    // Run close_sprint.mjs through Step 2.6c
    runCloseSprint(repoRoot, sprintDir, stateFile);

    // Check EPIC-FXTRA in pending-sync was rewritten
    const epicPath = path.join(repoRoot, '.cleargate', 'delivery', 'pending-sync', 'EPIC-FXTRA.md');
    assert.ok(fs.existsSync(epicPath), `EPIC-FXTRA.md missing from pending-sync: ${epicPath}`);

    const content = fs.readFileSync(epicPath, 'utf8');
    assert.ok(
      content.includes('status: Completed'),
      `Scenario 1 FAIL: EPIC-FXTRA status not rewritten to Completed.\n` +
      `  Current content:\n${content}\n` +
      `  PRE-FIX: Step 2.6c block has not been inserted into close_sprint.mjs.`,
    );
  });
});

// ─── Scenario 2 — auto-flip stdout contains the flip log line ────────────────
// PRE-FIX: Step 2.6c not present → no "Step 2.6c: EPIC-FXTRA…" in stdout → FAIL.

describe('STORY-066-02 Scenario 2 — Step 2.6c auto-flip stdout contains flip log line', () => {
  let repoRoot: string;
  let sprintDir: string;
  let stateFile: string;
  const SPRINT_ID = 'SPRINT-FX2';

  before(() => {
    assertScriptExists();
    ({ repoRoot, sprintDir, stateFile } = buildCloseSprintFixture('auto-flip', SPRINT_ID));
  });

  after(() => {
    if (repoRoot && fs.existsSync(repoRoot)) {
      fs.rmSync(repoRoot, { recursive: true, force: true });
    }
  });

  it('stdout contains "Step 2.6c: EPIC-FXTRA status Draft → Completed"', () => {
    const { stdout } = runCloseSprint(repoRoot, sprintDir, stateFile);

    assert.ok(
      stdout.includes('Step 2.6c: EPIC-FXTRA status') && stdout.includes('Completed'),
      `Scenario 2 FAIL: stdout does not contain Step 2.6c flip log line.\n` +
      `  Expected: stdout containing "Step 2.6c: EPIC-FXTRA status … → Completed"\n` +
      `  Actual stdout (first 800 chars):\n${stdout.slice(0, 800)}\n` +
      `  PRE-FIX: Step 2.6c block not inserted.`,
    );
  });

  it('close_sprint.mjs exits 0 (no halts — auto-flip case proceeds past Step 2.6c)', () => {
    const { status, stdout, stderr } = runCloseSprint(repoRoot, sprintDir, stateFile);

    assert.strictEqual(
      status,
      0,
      `Scenario 2 FAIL: expected exit 0 (auto-flip — no halts) but got ${status}.\n` +
      `  stdout: ${stdout.slice(0, 400)}\n` +
      `  stderr: ${stderr.slice(0, 400)}\n` +
      `  PRE-FIX: Step 2.6c missing → close may exit for unrelated reasons.`,
    );
  });
});

// ─── Scenario 3 — halt-partial: EPIC-FXTRB causes process.exit(1) ─────────
// PRE-FIX: Step 2.6c not present → no exit(1) on partial coverage → close exits 0 → FAIL.

describe('STORY-066-02 Scenario 3 — Step 2.6c halt-partial: EPIC-FXTRB causes exit 1 + HALT message', () => {
  let repoRoot: string;
  let sprintDir: string;
  let stateFile: string;
  const SPRINT_ID = 'SPRINT-FX3';

  before(() => {
    assertScriptExists();
    ({ repoRoot, sprintDir, stateFile } = buildCloseSprintFixture('halt-partial', SPRINT_ID));
  });

  after(() => {
    if (repoRoot && fs.existsSync(repoRoot)) {
      fs.rmSync(repoRoot, { recursive: true, force: true });
    }
  });

  it('process exits with code 1 when a parent has partial child coverage', () => {
    const { status, stdout, stderr } = runCloseSprint(repoRoot, sprintDir, stateFile);

    assert.strictEqual(
      status,
      1,
      `Scenario 3 FAIL: expected exit code 1 (halt-partial) but got ${status}.\n` +
      `  stdout: ${stdout.slice(0, 400)}\n` +
      `  stderr: ${stderr.slice(0, 400)}\n` +
      `  PRE-FIX: Step 2.6c not inserted → EPIC-FXTRB partial coverage goes undetected → exit 0.`,
    );
  });

  it('output contains "Step 2.6c HALT" and names EPIC-FXTRB', () => {
    const { stdout, stderr } = runCloseSprint(repoRoot, sprintDir, stateFile);
    const combined = stdout + stderr;

    assert.ok(
      combined.includes('Step 2.6c HALT'),
      `Scenario 3 FAIL: output does not contain "Step 2.6c HALT".\n` +
      `  combined output (first 800 chars):\n${combined.slice(0, 800)}\n` +
      `  PRE-FIX: Step 2.6c block absent.`,
    );

    assert.ok(
      combined.includes('EPIC-FXTRB'),
      `Scenario 3 FAIL: output does not name EPIC-FXTRB in halt message.\n` +
      `  combined output (first 800 chars):\n${combined.slice(0, 800)}\n` +
      `  PRE-FIX: Step 2.6c block absent.`,
    );
  });

  it('no frontmatter mutations were committed (EPIC-FXTRB still has original status)', () => {
    runCloseSprint(repoRoot, sprintDir, stateFile);

    const epicPath = path.join(repoRoot, '.cleargate', 'delivery', 'pending-sync', 'EPIC-FXTRB.md');
    assert.ok(fs.existsSync(epicPath), `EPIC-FXTRB.md missing: ${epicPath}`);

    const content = fs.readFileSync(epicPath, 'utf8');
    // On halt, no mutation should have occurred — status stays as original (In Progress)
    assert.ok(
      !content.includes('status: Completed'),
      `Scenario 3 FAIL: EPIC-FXTRB was mutated to Completed despite halt condition.\n` +
      `  content:\n${content}\n` +
      `  Step 2.6c must not mutate on halt-partial.`,
    );
  });
});

// ─── Scenario 4 — halt-zero-children: EPIC-FXTRC causes exit 1 ──────────────
// PRE-FIX: Step 2.6c not present → no exit(1) on zero-children → FAIL.

describe('STORY-066-02 Scenario 4 — Step 2.6c halt-zero-children: EPIC-FXTRC causes exit 1', () => {
  let repoRoot: string;
  let sprintDir: string;
  let stateFile: string;
  const SPRINT_ID = 'SPRINT-FX4';

  before(() => {
    assertScriptExists();
    ({ repoRoot, sprintDir, stateFile } = buildCloseSprintFixture('halt-zero-children', SPRINT_ID));
  });

  after(() => {
    if (repoRoot && fs.existsSync(repoRoot)) {
      fs.rmSync(repoRoot, { recursive: true, force: true });
    }
  });

  it('process exits with code 1 when a parent has zero children', () => {
    const { status, stdout, stderr } = runCloseSprint(repoRoot, sprintDir, stateFile);

    assert.strictEqual(
      status,
      1,
      `Scenario 4 FAIL: expected exit code 1 (halt-zero-children) but got ${status}.\n` +
      `  stdout: ${stdout.slice(0, 400)}\n` +
      `  stderr: ${stderr.slice(0, 400)}\n` +
      `  PRE-FIX: Step 2.6c not inserted → EPIC-FXTRC zero-children goes undetected → exit 0.`,
    );
  });

  it('output contains "halt-zero-children" and names EPIC-FXTRC', () => {
    const { stdout, stderr } = runCloseSprint(repoRoot, sprintDir, stateFile);
    const combined = stdout + stderr;

    assert.ok(
      combined.includes('halt-zero-children'),
      `Scenario 4 FAIL: output does not contain "halt-zero-children".\n` +
      `  combined output (first 800 chars):\n${combined.slice(0, 800)}\n` +
      `  PRE-FIX: Step 2.6c block absent.`,
    );

    assert.ok(
      combined.includes('EPIC-FXTRC'),
      `Scenario 4 FAIL: output does not name EPIC-FXTRC in halt message.\n` +
      `  combined output (first 800 chars):\n${combined.slice(0, 800)}\n` +
      `  PRE-FIX: Step 2.6c block absent.`,
    );
  });
});

// ─── Scenario 5 — Mirror parity: live == canonical (byte-identical) ──────────
// REGRESSION guard. Baseline: both files lack Step 2.6c → they match → this test PASSES at baseline.
// Diverges (FAILS) if Dev edits only one mirror during implementation.
// See close-sprint-step-7-4.red.node.test.ts §Scenario 3 for the same rationale.

describe('STORY-066-02 Scenario 5 — Mirror parity: live close_sprint.mjs matches canonical', () => {
  it('live and canonical close_sprint.mjs are byte-identical', () => {
    assert.ok(
      fs.existsSync(CLOSE_SPRINT_SCRIPT),
      `Mirror parity FAIL: live close_sprint.mjs missing: ${CLOSE_SPRINT_SCRIPT}`,
    );
    assert.ok(
      fs.existsSync(CANONICAL_CLOSE_SPRINT),
      `Mirror parity FAIL: canonical close_sprint.mjs missing: ${CANONICAL_CLOSE_SPRINT}`,
    );

    const live = fs.readFileSync(CLOSE_SPRINT_SCRIPT);
    const canonical = fs.readFileSync(CANONICAL_CLOSE_SPRINT);

    assert.strictEqual(
      live.toString('hex'),
      canonical.toString('hex'),
      `Scenario 5 FAIL: live and canonical close_sprint.mjs are NOT byte-identical.\n` +
      `  live: ${CLOSE_SPRINT_SCRIPT}\n` +
      `  canonical: ${CANONICAL_CLOSE_SPRINT}\n` +
      `  Diff them: diff ${CLOSE_SPRINT_SCRIPT} ${CANONICAL_CLOSE_SPRINT}\n` +
      `  Mirror drift detected — update BOTH files in the same commit (FLASHCARD #mirror #parity).`,
    );
  });
});
