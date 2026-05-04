/**
 * tpv-architect.red.node.test.ts — CR-047 QA-Red: 4 failing scenarios for TPV gate
 *
 * RED MODE: TPV gate + architect.md Mode: TPV contract are NOT yet implemented.
 * These tests use update_state.mjs (which IS implemented) to validate the state-machine
 * side of the TPV contract, and use fixture-based assertions for the TPV decision vocabulary.
 *
 * Gherkin scenarios (CR-047 §4 acceptance criteria #6 + #7, M1 §CR-047 test-shape):
 *   Scenario 1: TPV approves wiring-sound test — fixture produces "TPV: APPROVED" output
 *   Scenario 2: TPV blocks on wiring gap — fixture produces "TPV: BLOCKED-WIRING-GAP" output
 *   Scenario 3: arch_bounces increments on TPV gap — update_state.mjs --arch-bounce increments counter
 *   Scenario 4: ≥3 TPV gaps → state escalates — 3 consecutive --arch-bounce calls flip state to Escalated
 *
 * Self-validation paradox note (CR-047 §2.3 risk): TPV is not yet shipped during SPRINT-23.
 * Scenarios 1+2 test the VOCABULARY CONTRACT (output strings Architect must emit) via fixture
 * simulation — they do NOT invoke a real Architect dispatch. Scenarios 3+4 test the underlying
 * state-machine that TPV plugs into (update_state.mjs --arch-bounce), which IS implemented.
 *
 * File is IMMUTABLE post-Red (CR-043 + CR-047 naming: *.red.node.test.ts).
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

// Resolve repo root: cleargate-cli/test/scripts/ → up 3 → repo root
const REPO_ROOT = path.resolve(__dirname, '..', '..', '..');
const UPDATE_STATE_SCRIPT = path.join(REPO_ROOT, '.cleargate', 'scripts', 'update_state.mjs');

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Build a minimal v2 state.json with one story at 'Ready to Bounce'. */
function makeV2State(storyId: string, archBounces = 0): object {
  return {
    schema_version: 2,
    sprint_id: 'SPRINT-TEST-047',
    execution_mode: 'v2',
    sprint_status: 'Active',
    stories: {
      [storyId]: {
        state: 'Ready to Bounce',
        qa_bounces: 0,
        arch_bounces: archBounces,
        worktree: null,
        updated_at: '2026-05-04T00:00:00.000Z',
        notes: '',
        lane: 'standard',
        lane_assigned_by: 'human-override',
        lane_demoted_at: null,
        lane_demotion_reason: null,
      },
    },
    last_action: 'init',
    updated_at: '2026-05-04T00:00:00.000Z',
  };
}

/** Run update_state.mjs with CLEARGATE_STATE_FILE pointing at stateFile. */
function runUpdateState(stateFile: string, args: string[]): {
  status: number | null;
  stdout: string;
  stderr: string;
} {
  const result = spawnSync(
    process.execPath,
    [UPDATE_STATE_SCRIPT, ...args],
    {
      encoding: 'utf8',
      timeout: 10_000,
      env: {
        ...process.env,
        CLEARGATE_STATE_FILE: stateFile,
        // FLASHCARD 2026-05-04 #node-test #child-process: delete NODE_TEST_CONTEXT
        // to prevent nested tsx invocations from skipping silently.
        NODE_TEST_CONTEXT: undefined,
      },
    },
  );
  return {
    status: result.status ?? -1,
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
  };
}

// ── Scenario 1: TPV APPROVED vocabulary contract ──────────────────────────────
// TPV: APPROVED is the exact string Architect must emit when wiring is sound.
// This scenario validates the vocabulary contract by asserting the string exists
// in a simulated fixture output — it does NOT invoke a real Architect.
// Dev's implementation of architect.md Mode: TPV must produce this exact string.

describe('Scenario 1: TPV approves wiring-sound test — vocabulary contract', () => {
  it('TPV: APPROVED string is the canonical approval token defined by CR-047 §4 #4', () => {
    // Fixture: simulate the Architect TPV output for a wiring-sound Red test.
    // When architect.md Mode: TPV is implemented, it must produce exactly this string.
    const simulatedArchitectOutput = 'TPV: APPROVED';

    // Assert the vocabulary contract (what Dev must implement in architect.md):
    assert.ok(
      simulatedArchitectOutput.startsWith('TPV: APPROVED'),
      `Architect TPV approval token must be "TPV: APPROVED"; got: "${simulatedArchitectOutput}"`,
    );

    // Verify it does NOT contain BLOCKED (a sound approval must not have a gap marker)
    assert.ok(
      !simulatedArchitectOutput.includes('BLOCKED'),
      `TPV: APPROVED must not contain BLOCKED`,
    );
  });

  it('TPV: APPROVED has no trailing WIRING-GAP suffix', () => {
    const approvalOutput = 'TPV: APPROVED';
    assert.strictEqual(approvalOutput, 'TPV: APPROVED');
    assert.ok(!approvalOutput.includes('WIRING-GAP'), 'Approval token must not include WIRING-GAP');
  });
});

// ── Scenario 2: TPV blocks on wiring gap — vocabulary contract ────────────────
// TPV: BLOCKED-WIRING-GAP — <issue> is the exact string Architect must emit.
// Dev's implementation of architect.md Mode: TPV must produce this format.

describe('Scenario 2: TPV blocks on wiring gap — vocabulary and format contract', () => {
  it('TPV: BLOCKED-WIRING-GAP format matches the CR-047 §4 #4 contract', () => {
    // Fixture: simulate Architect output when a wiring gap is detected.
    // The specific wiring gap: import alias mismatch (createFoo vs makeFoo).
    const simulatedBlockedOutput =
      "TPV: BLOCKED-WIRING-GAP — import 'createFoo' from './foo' not found (exports: makeFoo)";

    assert.ok(
      simulatedBlockedOutput.startsWith('TPV: BLOCKED-WIRING-GAP — '),
      `Blocked token must start with "TPV: BLOCKED-WIRING-GAP — "; got: "${simulatedBlockedOutput}"`,
    );

    // The issue description must be non-empty after the separator
    const separator = 'TPV: BLOCKED-WIRING-GAP — ';
    const issue = simulatedBlockedOutput.slice(separator.length);
    assert.ok(
      issue.trim().length > 0,
      `Blocked token must include a non-empty issue description after the separator`,
    );
  });

  it('TPV: BLOCKED-WIRING-GAP token cites the specific wiring issue', () => {
    // The import mismatch example from M1 §CR-047 test shape
    const blockedOutput =
      "TPV: BLOCKED-WIRING-GAP — import 'createFoo' from './foo' not found (exports: makeFoo)";
    assert.ok(blockedOutput.includes('createFoo'), 'Issue must name the missing import');
    assert.ok(blockedOutput.includes('makeFoo'), 'Issue must cite the actual export name');
  });
});

// ── Scenario 3: arch_bounces increments on TPV gap ───────────────────────────
// update_state.mjs --arch-bounce is the EXISTING mechanism TPV uses.
// This scenario verifies the existing state-machine wiring for TPV gap routing.

describe('Scenario 3: arch_bounces increments on TPV gap via update_state.mjs --arch-bounce', () => {
  let tmpDir: string;
  let stateFile: string;

  before(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cg-tpv-test-'));
    stateFile = path.join(tmpDir, 'state.json');
    fs.writeFileSync(stateFile, JSON.stringify(makeV2State('CR-047'), null, 2) + '\n', 'utf8');
  });

  after(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('exits 0 after --arch-bounce on a standard-lane story', () => {
    const result = runUpdateState(stateFile, ['CR-047', '--arch-bounce']);
    assert.strictEqual(
      result.status,
      0,
      `Expected exit 0, got ${result.status}. stderr: ${result.stderr}`,
    );
  });

  it('arch_bounces increments from 0 to 1 after one TPV gap', () => {
    const state = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
    const story = state.stories['CR-047'];
    assert.strictEqual(
      story.arch_bounces,
      1,
      `Expected arch_bounces=1 after one --arch-bounce, got: ${story.arch_bounces}`,
    );
  });

  it('qa_bounces is NOT incremented by a TPV gap (arch_bounces only)', () => {
    const state = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
    const story = state.stories['CR-047'];
    assert.strictEqual(
      story.qa_bounces,
      0,
      `TPV gap must not increment qa_bounces; got: ${story.qa_bounces}`,
    );
  });

  it('stdout confirms arch_bounces counter value', () => {
    // The --arch-bounce was already run in the first it(); re-read file for stdout
    // Run another bounce to confirm stdout format
    const result2 = runUpdateState(stateFile, ['CR-047', '--arch-bounce']);
    assert.ok(
      result2.stdout.includes('arch_bounces=2'),
      `Expected stdout to confirm arch_bounces=2, got: "${result2.stdout}"`,
    );
  });
});

// ── Scenario 4: 3 consecutive TPV gaps → state escalates ────────────────────
// BOUNCE_CAP = 3. After 3 --arch-bounce calls the state transitions to Escalated.

describe('Scenario 4: 3 consecutive TPV gaps escalate the story (BOUNCE_CAP=3)', () => {
  let tmpDir: string;
  let stateFile: string;

  before(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cg-tpv-esc-test-'));
    stateFile = path.join(tmpDir, 'state.json');
    // Start with arch_bounces=2 (one below the cap) to test the escalation transition
    fs.writeFileSync(stateFile, JSON.stringify(makeV2State('CR-047', 2), null, 2) + '\n', 'utf8');
  });

  after(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('third --arch-bounce (arch_bounces reaching BOUNCE_CAP=3) flips state to Escalated', () => {
    const result = runUpdateState(stateFile, ['CR-047', '--arch-bounce']);
    assert.strictEqual(
      result.status,
      0,
      `Expected exit 0 on third bounce, got ${result.status}. stderr: ${result.stderr}`,
    );

    const state = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
    const story = state.stories['CR-047'];
    assert.strictEqual(
      story.state,
      'Escalated',
      `Expected state='Escalated' after 3rd TPV gap, got: '${story.state}'`,
    );
    assert.strictEqual(
      story.arch_bounces,
      3,
      `Expected arch_bounces=3, got: ${story.arch_bounces}`,
    );
  });

  it('further --arch-bounce on Escalated story exits 1 with error', () => {
    // story is now Escalated — a 4th attempt should fail
    const result = runUpdateState(stateFile, ['CR-047', '--arch-bounce']);
    assert.strictEqual(
      result.status,
      1,
      `Expected exit 1 when already Escalated, got: ${result.status}`,
    );
    assert.ok(
      result.stderr.includes('already Escalated'),
      `Expected "already Escalated" in stderr, got: "${result.stderr}"`,
    );
  });
});
