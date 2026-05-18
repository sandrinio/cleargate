/**
 * sprint-reconcile-lifecycle-parents.red.node.test.ts — STORY-066-02 QA-RED
 *
 * Failing tests (RED phase) for the --parents flag on:
 *   `cleargate sprint reconcile-lifecycle <sprint-id> --parents`
 *
 * TEST INVENTORY (3 scenarios):
 *   Scenario 1 — --parents flag is accepted (no "unknown option" error)
 *   Scenario 2 — stdout contains "Parent rollup audit (--parents):" header
 *   Scenario 3 — exit code is 0 (audit-only; halts don't propagate exit code)
 *
 * PRE-FIX BASELINE:
 *   Scenario 1: --parents not yet wired in cli.ts → Commander emits "error: unknown option '--parents'" → FAIL
 *   Scenario 2: --parents absent → no audit header in stdout → FAIL
 *   Scenario 3: May exit non-zero due to unrecognized flag error → FAIL
 *
 * APPROACH:
 *   Tests invoke the compiled `cleargate-cli/dist/cli.js` (must be pre-built) via spawnSync.
 *   A fixture sprint with combined state (EPIC-FXTRA/B/C) is created in a tmpdir.
 *   CLEARGATE_REPO_ROOT points to the tmpdir so walkActiveParents reads the fixture epics.
 *
 * FLASHCARD refs:
 *   - #qa #red-test #exit-code: assertScriptExists guard before spawnSync
 *   - #node-test #child-process: delete NODE_TEST_CONTEXT before spawning child
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

// Repo root: cleargate-cli/test/commands/ → up 3 levels
const REPO_ROOT = path.resolve(__dirname, '..', '..', '..');

// Use the compiled CLI binary (must exist after `npm run build`)
const CLI_BIN = path.join(REPO_ROOT, 'cleargate-cli', 'dist', 'cli.js');

const FIXTURE_BASE = path.join(__dirname, '..', 'fixtures', 'close-sprint-step-2-6c');

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Guard: fail fast if the compiled CLI binary is missing.
 * A missing dist/ is a Dev pre-condition failure, not a test failure.
 */
function assertCliBinExists(): void {
  assert.ok(
    fs.existsSync(CLI_BIN),
    `assertCliBinExists FAIL: CLI binary missing at ${CLI_BIN}.\n` +
    `  Run 'npm run build' in cleargate-cli/ before running this test.`,
  );
}

/**
 * Build a combined fixture repo with all three verdict-shape epics present.
 * This mirrors the "combined fixture state" described in §2.1 Scenario 4.
 *
 * Layout in tmpdir:
 *   .cleargate/delivery/pending-sync/ — EPIC-FXTRA.md (Draft), EPIC-FXTRB.md (In Progress),
 *                                       EPIC-FXTRC.md (Draft), STORY-FXTRB-03.md (Approved)
 *   .cleargate/delivery/archive/      — STORY-FXTRA-01..03.md (Completed),
 *                                       STORY-FXTRB-01..02.md (Completed)
 *   .cleargate/delivery/pending-sync/ — SPRINT-FIX.md (stub sprint frontmatter)
 */
function buildCombinedFixture(): { repoRoot: string; sprintId: string } {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'cg-parents-flag-'));
  const deliveryBase = path.join(repoRoot, '.cleargate', 'delivery');
  const archiveDir = path.join(deliveryBase, 'archive');
  const pendingSyncDir = path.join(deliveryBase, 'pending-sync');
  const sprintRunsDir = path.join(repoRoot, '.cleargate', 'sprint-runs');

  fs.mkdirSync(archiveDir, { recursive: true });
  fs.mkdirSync(pendingSyncDir, { recursive: true });
  fs.mkdirSync(sprintRunsDir, { recursive: true });

  // Copy all three fixture verdict dirs
  const verdicts = ['auto-flip', 'halt-partial', 'halt-zero-children'];
  for (const verdict of verdicts) {
    const fixtureArchive = path.join(FIXTURE_BASE, verdict, 'archive');
    const fixturePending = path.join(FIXTURE_BASE, verdict, 'pending-sync');

    if (fs.existsSync(fixtureArchive)) {
      for (const f of fs.readdirSync(fixtureArchive)) {
        const dest = path.join(archiveDir, f);
        if (!fs.existsSync(dest)) {
          fs.copyFileSync(path.join(fixtureArchive, f), dest);
        }
      }
    }
    if (fs.existsSync(fixturePending)) {
      for (const f of fs.readdirSync(fixturePending)) {
        const dest = path.join(pendingSyncDir, f);
        if (!fs.existsSync(dest)) {
          fs.copyFileSync(path.join(fixturePending, f), dest);
        }
      }
    }
  }

  // Write a stub sprint frontmatter file so reconcileLifecycleCliHandler can read it
  const sprintId = 'SPRINT-FIX';
  const sprintStub = [
    '---',
    `sprint_id: ${sprintId}`,
    'start_date: 2026-01-01',
    'status: Active',
    '---',
    '',
    `# ${sprintId} stub for --parents flag test`,
  ].join('\n');
  fs.writeFileSync(path.join(pendingSyncDir, `${sprintId}.md`), sprintStub, 'utf8');

  return { repoRoot, sprintId };
}

/**
 * Invoke `cleargate sprint reconcile-lifecycle <sprintId> --parents` via the compiled CLI.
 * CLEARGATE_REPO_ROOT is overridden to point at the fixture tmpdir.
 */
function runReconcileLifecycleParents(
  repoRoot: string,
  sprintId: string,
): { status: number | null; stdout: string; stderr: string } {
  // Delete NODE_TEST_CONTEXT to avoid nested tsx --test skip (FLASHCARD #node-test #child-process)
  const env = { ...process.env };
  delete env['NODE_TEST_CONTEXT'];

  const result = spawnSync(
    process.execPath,
    [CLI_BIN, 'sprint', 'reconcile-lifecycle', sprintId, '--parents'],
    {
      encoding: 'utf8',
      timeout: 20_000,
      cwd: repoRoot,
      env: {
        ...env,
        CLEARGATE_REPO_ROOT: repoRoot,
      },
    },
  );

  return {
    status: result.status,
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
  };
}

// ─── Scenario 1 — --parents flag accepted (no "unknown option" error) ─────────
// PRE-FIX: --parents not wired → Commander: "error: unknown option '--parents'" → FAIL.

describe('STORY-066-02 CLI Scenario 1 — --parents flag accepted without "unknown option" error', () => {
  let repoRoot: string;
  let sprintId: string;

  before(() => {
    assertCliBinExists();
    ({ repoRoot, sprintId } = buildCombinedFixture());
  });

  after(() => {
    if (repoRoot && fs.existsSync(repoRoot)) {
      fs.rmSync(repoRoot, { recursive: true, force: true });
    }
  });

  it('stderr does not contain "unknown option" for --parents flag', () => {
    const { stderr, stdout } = runReconcileLifecycleParents(repoRoot, sprintId);

    assert.ok(
      !stderr.toLowerCase().includes('unknown option'),
      `CLI Scenario 1 FAIL: --parents flag not recognized by CLI.\n` +
      `  stderr: ${stderr.slice(0, 600)}\n` +
      `  stdout: ${stdout.slice(0, 400)}\n` +
      `  PRE-FIX: --parents option not yet wired into cli.ts 'reconcile-lifecycle' subcommand.`,
    );
  });
});

// ─── Scenario 2 — stdout contains "Parent rollup audit (--parents):" header ──
// PRE-FIX: --parents not wired → no audit output → FAIL.

describe('STORY-066-02 CLI Scenario 2 — stdout contains "Parent rollup audit (--parents):" header', () => {
  let repoRoot: string;
  let sprintId: string;

  before(() => {
    assertCliBinExists();
    ({ repoRoot, sprintId } = buildCombinedFixture());
  });

  after(() => {
    if (repoRoot && fs.existsSync(repoRoot)) {
      fs.rmSync(repoRoot, { recursive: true, force: true });
    }
  });

  it('stdout contains "Parent rollup audit (--parents):"', () => {
    const { stdout, stderr } = runReconcileLifecycleParents(repoRoot, sprintId);

    assert.ok(
      stdout.includes('Parent rollup audit (--parents):'),
      `CLI Scenario 2 FAIL: stdout does not contain audit header.\n` +
      `  Expected: "Parent rollup audit (--parents):"\n` +
      `  stdout (first 800 chars):\n${stdout.slice(0, 800)}\n` +
      `  stderr (first 400 chars):\n${stderr.slice(0, 400)}\n` +
      `  PRE-FIX: --parents flag not wired → walkActiveParents not called → no audit table printed.`,
    );
  });

  it('stdout table lists EPIC-FXTRA with auto-flip verdict', () => {
    const { stdout } = runReconcileLifecycleParents(repoRoot, sprintId);

    assert.ok(
      stdout.includes('EPIC-FXTRA'),
      `CLI Scenario 2 FAIL: audit table does not list EPIC-FXTRA.\n` +
      `  stdout (first 800 chars):\n${stdout.slice(0, 800)}\n` +
      `  PRE-FIX: --parents audit not implemented.`,
    );
  });

  it('stdout table lists EPIC-FXTRB with halt-partial verdict', () => {
    const { stdout } = runReconcileLifecycleParents(repoRoot, sprintId);

    assert.ok(
      stdout.includes('EPIC-FXTRB'),
      `CLI Scenario 2 FAIL: audit table does not list EPIC-FXTRB.\n` +
      `  stdout (first 800 chars):\n${stdout.slice(0, 800)}\n` +
      `  PRE-FIX: --parents audit not implemented.`,
    );
  });

  it('stdout table lists EPIC-FXTRC with halt-zero-children verdict', () => {
    const { stdout } = runReconcileLifecycleParents(repoRoot, sprintId);

    assert.ok(
      stdout.includes('EPIC-FXTRC'),
      `CLI Scenario 2 FAIL: audit table does not list EPIC-FXTRC.\n` +
      `  stdout (first 800 chars):\n${stdout.slice(0, 800)}\n` +
      `  PRE-FIX: --parents audit not implemented.`,
    );
  });
});

// ─── Scenario 3 — exit code is 0 (audit-only; halts don't propagate) ─────────
// PRE-FIX: unknown option → Commander exits non-zero → FAIL.

describe('STORY-066-02 CLI Scenario 3 — --parents exit code is 0 (audit-only; halts do not block)', () => {
  let repoRoot: string;
  let sprintId: string;

  before(() => {
    assertCliBinExists();
    ({ repoRoot, sprintId } = buildCombinedFixture());
  });

  after(() => {
    if (repoRoot && fs.existsSync(repoRoot)) {
      fs.rmSync(repoRoot, { recursive: true, force: true });
    }
  });

  it('reconcile-lifecycle --parents exits 0 even when halts are present', () => {
    const { status, stdout, stderr } = runReconcileLifecycleParents(repoRoot, sprintId);

    assert.strictEqual(
      status,
      0,
      `CLI Scenario 3 FAIL: expected exit 0 (audit-only) but got ${status}.\n` +
      `  stdout: ${stdout.slice(0, 400)}\n` +
      `  stderr: ${stderr.slice(0, 400)}\n` +
      `  Per §1.2: --parents is read-only; exit 0 even if halts exist (informational audit).` +
      `  PRE-FIX: --parents not wired → unknown option error → non-zero exit.`,
    );
  });
});
