import { describe, test } from 'node:test';
import assert from 'node:assert/strict';

/**
 * test_assert_work_item_files.test.ts — CR-014 acceptance tests
 *
 * Gherkin scenarios (CR-014 §3):
 *   Scenario 1: STORY-only sprint (regression baseline) — all present + approved → exit 0
 *   Scenario 2: Mixed sprint (STORY + CR + BUG + EPIC + PROPOSAL + HOTFIX) — all present + approved → exit 0
 *   Scenario 3: PROP-NNN in §1 + PROPOSAL-NNN file exists — normalize matches → exit 0
 *   Scenario 4: Mixed sprint with one unapproved CR → exit 1, stderr names the unapproved id
 *   Scenario 5: Mixed sprint with one stub-empty Bug → exit 1, stderr names the empty id
 *   Scenario 6: v1 mode: same setup as Scenario 4 → warning emitted, exit 0
 *
 * Uses spawnSync to invoke assert_story_files.mjs directly.
 * CLEARGATE_REPO_ROOT env var controls the pending-sync search root.
 * CLEARGATE_EXEC_MODE env var controls v1/v2 mode.
 *
 * Cross-OS note: all paths use path.join; no GNU/BSD flags used.
 */

import * as path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Resolve repo root: cleargate-cli/test/scripts/ → up 3 → repo root
const REPO_ROOT = path.resolve(__dirname, '..', '..', '..');

// The assert script under test (both live and scaffold are byte-identical post-CR-014)
const ASSERT_SCRIPT = path.join(REPO_ROOT, '.cleargate', 'scripts', 'assert_story_files.mjs');

// Fixture directories
const FIXTURES_BASE = path.join(__dirname, 'fixtures', 'sprint-multi-type');
const FIXTURE_REPO_ROOT = path.join(FIXTURES_BASE, 'repo-root');

/**
 * Run assert_story_files.mjs with the given sprint file and options.
 */
function runAssert(
  sprintFile: string,
  opts: { execMode?: string } = {},
): { status: number | null; stdout: string; stderr: string } {
  const { execMode = 'v2' } = opts;

  const result = spawnSync(process.execPath, [ASSERT_SCRIPT, sprintFile], {
    encoding: 'utf8',
    timeout: 15_000,
    env: {
      ...process.env,
      CLEARGATE_REPO_ROOT: FIXTURE_REPO_ROOT,
      CLEARGATE_EXEC_MODE: execMode,
    },
  });

  return {
    status: result.status ?? -1,
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Scenario 1: STORY-only sprint (regression baseline) — all present + approved → exit 0
// ─────────────────────────────────────────────────────────────────────────────

describe('Scenario 1: STORY-only sprint — all present + approved → exit 0', () => {
  const sprintFile = path.join(FIXTURES_BASE, 'SPRINT-TEST_StoryOnly.md');

  test('exits 0 when the only story file is present and approved', () => {
    const result = runAssert(sprintFile);
    assert.strictEqual(result.status, 0);
  });

  test('stdout confirms OK with 1 work-item', () => {
    const result = runAssert(sprintFile);
    assert.match(String(result.stdout), /OK: all 1 work-item file\(s\)/);
  });

  test('no MISSING or UNAPPROVED or STUB-EMPTY in stderr', () => {
    const result = runAssert(sprintFile);
    assert.doesNotMatch(String(result.stderr), /MISSING/);
    assert.doesNotMatch(String(result.stderr), /UNAPPROVED/);
    assert.doesNotMatch(String(result.stderr), /STUB-EMPTY/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Scenario 2: Mixed sprint — all six id shapes present + approved → exit 0
// ─────────────────────────────────────────────────────────────────────────────

describe('Scenario 2: Mixed sprint (all 6 id shapes) — all present + approved → exit 0', () => {
  const sprintFile = path.join(FIXTURES_BASE, 'SPRINT-TEST_Mixed.md');

  test('exits 0 when all six id-type files are present and approved', () => {
    const result = runAssert(sprintFile);
    assert.strictEqual(result.status, 0);
  });

  test('stdout confirms OK with 6 work-items', () => {
    const result = runAssert(sprintFile);
    assert.match(String(result.stdout), /OK: all 6 work-item file\(s\)/);
  });

  test('no errors in stderr', () => {
    const result = runAssert(sprintFile);
    assert.strictEqual(result.stderr, '');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Scenario 3: PROP-NNN in §1 + PROPOSAL-NNN file exists — normalize matches → exit 0
// ─────────────────────────────────────────────────────────────────────────────

describe('Scenario 3: PROP-NNN normalised to PROPOSAL-NNN — file matches → exit 0', () => {
  const sprintFile = path.join(FIXTURES_BASE, 'SPRINT-TEST_PropNormalize.md');

  test('exits 0 when PROP-001 in sprint is normalised to PROPOSAL-001 and file exists', () => {
    const result = runAssert(sprintFile);
    assert.strictEqual(result.status, 0);
  });

  test('stdout confirms OK with 1 work-item (PROPOSAL-001)', () => {
    const result = runAssert(sprintFile);
    assert.match(String(result.stdout), /OK: all 1 work-item file\(s\)/);
  });

  test('PROP-001 does not appear as MISSING (normalisation worked)', () => {
    const result = runAssert(sprintFile);
    assert.doesNotMatch(String(result.stderr), /PROP-001/);
    assert.doesNotMatch(String(result.stderr), /MISSING/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Scenario 4: Mixed sprint with one unapproved CR → exit 1, stderr names the id
// ─────────────────────────────────────────────────────────────────────────────

describe('Scenario 4: Unapproved CR — v2 blocks with exit 1, stderr names CR-002', () => {
  const sprintFile = path.join(FIXTURES_BASE, 'SPRINT-TEST_UnapprovedCR.md');

  test('exits 1 when a CR is present but unapproved', () => {
    const result = runAssert(sprintFile, { execMode: 'v2' });
    assert.strictEqual(result.status, 1);
  });

  test('stderr contains UNAPPROVED with the offending id CR-002', () => {
    const result = runAssert(sprintFile, { execMode: 'v2' });
    assert.match(String(result.stderr), /UNAPPROVED/);
    assert.match(String(result.stderr), /CR-002/);
  });

  test('does not report STORY-001-01 as unapproved (approved item unaffected)', () => {
    const result = runAssert(sprintFile, { execMode: 'v2' });
    assert.doesNotMatch(String(result.stderr), /STORY-001-01/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Scenario 5: Mixed sprint with stub-empty Bug → exit 1, stderr names the id
// ─────────────────────────────────────────────────────────────────────────────

describe('Scenario 5: Stub-empty Bug — v2 blocks with exit 1, stderr names BUG-002', () => {
  const sprintFile = path.join(FIXTURES_BASE, 'SPRINT-TEST_StubEmptyBug.md');

  test('exits 1 when a Bug is approved but has no ## heading (stub-empty)', () => {
    const result = runAssert(sprintFile, { execMode: 'v2' });
    assert.strictEqual(result.status, 1);
  });

  test('stderr contains STUB-EMPTY with the offending id BUG-002', () => {
    const result = runAssert(sprintFile, { execMode: 'v2' });
    assert.match(String(result.stderr), /STUB-EMPTY/);
    assert.match(String(result.stderr), /BUG-002/);
  });

  test('does not report STORY-001-01 as stub-empty (non-empty item unaffected)', () => {
    const result = runAssert(sprintFile, { execMode: 'v2' });
    assert.doesNotMatch(String(result.stderr), /STORY-001-01/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Scenario 6: v1 mode — unapproved CR emits warning but exits 0
// ─────────────────────────────────────────────────────────────────────────────

describe('Scenario 6: v1 mode — unapproved CR emits warning, exit 0 (backwards compat)', () => {
  const sprintFile = path.join(FIXTURES_BASE, 'SPRINT-TEST_UnapprovedCR.md');

  test('exits 0 even when CR is unapproved (v1 warns-only)', () => {
    const result = runAssert(sprintFile, { execMode: 'v1' });
    assert.strictEqual(result.status, 0);
  });

  test('stderr still mentions UNAPPROVED (warning emitted)', () => {
    const result = runAssert(sprintFile, { execMode: 'v1' });
    assert.match(String(result.stderr), /UNAPPROVED/);
    assert.match(String(result.stderr), /CR-002/);
  });
});
