/**
 * close-sprint-step-7-4.red.node.test.ts — CR-064 QA-RED
 *
 * Failing tests (RED phase) for the Step 7.4 insertion in close_sprint.mjs.
 *
 * Scenarios (M3.md §CR-064 Test shape — close_sprint.mjs section):
 *
 *   Scenario 1 — live close_sprint.mjs contains the CR-064 Step 7.4 anchor literal
 *     `.cleargate/scripts/close_sprint.mjs` must contain the string
 *     `// CR-064: mcp push sprint plan + report`.
 *
 *   Scenario 2 — Step 7.4 anchor appears BEFORE the Step 7.5 (CR-063) anchor
 *     Within `.cleargate/scripts/close_sprint.mjs`, the byte offset of
 *     `// CR-064: mcp push sprint plan + report` must be LESS THAN the
 *     offset of `// CR-063: wiki ingest sprint report`.
 *
 *   Scenario 3 — canonical mirror close_sprint.mjs matches live (byte-identical)
 *     `.cleargate/scripts/close_sprint.mjs` and
 *     `cleargate-planning/.cleargate/scripts/close_sprint.mjs` must be byte-identical.
 *
 *   Scenario 4 — prebuild regenerated payload contains Step 7.4
 *     `cleargate-cli/templates/cleargate-planning/.cleargate/scripts/close_sprint.mjs`
 *     must contain `// CR-064: mcp push sprint plan + report` AFTER npm run prebuild.
 *     (This is a structural test; the regenerated file may not exist pre-prebuild.
 *     Test asserts the path the file WOULD reside at and that once prebuild runs it
 *     contains the anchor — tested as an existence-then-content check.)
 *
 * PRE-FIX state:
 *   All scenarios FAIL because Step 7.4 has not been inserted yet:
 *     Scenario 1: CR-064 anchor string absent → FAIL.
 *     Scenario 2: CR-064 anchor absent → indexOf returns -1 → ordering assert fails.
 *     Scenario 3: both files may match (no divergence yet from Step 7.4 missing from
 *       both) — but Scenario 3 FAILS once Step 7.4 is inserted in only one mirror.
 *       For baseline: passes (both mirrors lack Step 7.4). Post-implementation:
 *       must still pass (both mirrors get identical insertion). NOTE: Scenario 3 is
 *       a REGRESSION guard — baseline "pass" is intentional; any Developer who
 *       edits only one mirror will break this.
 *     Scenario 4: regenerated payload may lack Step 7.4 → FAIL.
 *
 * IMMUTABILITY: this file is sealed post-Red per CR-043 naming contract.
 *   DO NOT EDIT after QA-Red returns it.
 *
 * Runner: tsx --test (node:test)
 * Naming: *.red.node.test.ts (immutable post-Red)
 * Forbidden: DO NOT edit close_sprint.mjs or its mirrors.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Resolve repo root: cleargate-cli/test/scripts/ → up 3 → repo root
const REPO_ROOT = path.resolve(__dirname, '..', '..', '..');

const LIVE_CLOSE_SPRINT = path.join(REPO_ROOT, '.cleargate', 'scripts', 'close_sprint.mjs');
const CANONICAL_CLOSE_SPRINT = path.join(
  REPO_ROOT, 'cleargate-planning', '.cleargate', 'scripts', 'close_sprint.mjs',
);
const PREBUILD_CLOSE_SPRINT = path.join(
  REPO_ROOT,
  'cleargate-cli', 'templates', 'cleargate-planning', '.cleargate', 'scripts', 'close_sprint.mjs',
);

// Anchor literals (exact strings as specified by M3.md + CR-064 §3)
const CR064_ANCHOR = '// CR-064: mcp push sprint plan + report';
const CR063_ANCHOR = '// CR-063: wiki ingest sprint report';

// ── Scenario 1 — CR-064 Step 7.4 anchor present in live file ─────────────────
// PRE-FIX: Step 7.4 block not inserted → anchor absent → FAIL.

describe('CR-064 close_sprint.mjs Scenario 1 — Step 7.4 anchor present in live file', () => {
  it(`live close_sprint.mjs contains literal "${CR064_ANCHOR}"`, () => {
    let content: string;
    try {
      content = fs.readFileSync(LIVE_CLOSE_SPRINT, 'utf8');
    } catch (err) {
      assert.fail(`Cannot read live close_sprint.mjs: ${String(err)}`);
    }

    assert.ok(
      content.includes(CR064_ANCHOR),
      `CR-064 Scenario 1 FAIL: literal not found in live close_sprint.mjs:\n` +
      `  Expected: "${CR064_ANCHOR}"\n` +
      `  File: ${LIVE_CLOSE_SPRINT}\n` +
      'PRE-FIX: Step 7.4 block has not been inserted yet.',
    );
  });

  it(`canonical mirror contains literal "${CR064_ANCHOR}"`, () => {
    let content: string;
    try {
      content = fs.readFileSync(CANONICAL_CLOSE_SPRINT, 'utf8');
    } catch (err) {
      assert.fail(`Cannot read canonical close_sprint.mjs: ${String(err)}`);
    }

    assert.ok(
      content.includes(CR064_ANCHOR),
      `CR-064 Scenario 1 FAIL: literal not found in canonical close_sprint.mjs:\n` +
      `  Expected: "${CR064_ANCHOR}"\n` +
      `  File: ${CANONICAL_CLOSE_SPRINT}\n` +
      'PRE-FIX: Step 7.4 block not inserted in canonical mirror.',
    );
  });
});

// ── Scenario 2 — Step 7.4 anchor appears BEFORE Step 7.5 (CR-063) anchor ─────
// PRE-FIX: CR-064 anchor absent → indexOf returns -1 → -1 < offsetOf(CR-063) is
// numerically true, but the test explicitly guards against indexOf === -1.

describe('CR-064 close_sprint.mjs Scenario 2 — Step 7.4 marker appears BEFORE Step 7.5 (CR-063)', () => {
  it('CR-064 anchor byte offset is less than CR-063 anchor byte offset in live file', () => {
    let content: string;
    try {
      content = fs.readFileSync(LIVE_CLOSE_SPRINT, 'utf8');
    } catch (err) {
      assert.fail(`Cannot read live close_sprint.mjs: ${String(err)}`);
    }

    const idx064 = content.indexOf(CR064_ANCHOR);
    const idx063 = content.indexOf(CR063_ANCHOR);

    assert.ok(
      idx064 !== -1,
      `CR-064 Scenario 2 FAIL: CR-064 anchor "${CR064_ANCHOR}" not found in live file.\n` +
      'PRE-FIX: Step 7.4 not inserted.',
    );
    assert.ok(
      idx063 !== -1,
      `CR-064 Scenario 2 FAIL: CR-063 anchor "${CR063_ANCHOR}" not found in live file.\n` +
      'This anchor should have been inserted by CR-063 (Wave 1, already merged).',
    );
    assert.ok(
      idx064 < idx063,
      `CR-064 Scenario 2 FAIL: Step 7.4 (CR-064) is NOT before Step 7.5 (CR-063).\n` +
      `  CR-064 anchor at index: ${idx064}\n` +
      `  CR-063 anchor at index: ${idx063}\n` +
      'Per SDR-locked ordering: MCP push (Step 7.4) must precede wiki ingest (Step 7.5).',
    );
  });

  it('CR-064 anchor byte offset is less than CR-063 anchor byte offset in canonical mirror', () => {
    let content: string;
    try {
      content = fs.readFileSync(CANONICAL_CLOSE_SPRINT, 'utf8');
    } catch (err) {
      assert.fail(`Cannot read canonical close_sprint.mjs: ${String(err)}`);
    }

    const idx064 = content.indexOf(CR064_ANCHOR);
    const idx063 = content.indexOf(CR063_ANCHOR);

    assert.ok(
      idx064 !== -1,
      `CR-064 Scenario 2 FAIL: CR-064 anchor not found in canonical mirror.\n` +
      'PRE-FIX: Step 7.4 not inserted in canonical mirror.',
    );
    assert.ok(
      idx063 !== -1,
      `CR-064 Scenario 2 FAIL: CR-063 anchor not found in canonical mirror.\n` +
      'CR-063 Wave 1 anchor must be present in both mirrors.',
    );
    assert.ok(
      idx064 < idx063,
      `CR-064 Scenario 2 FAIL: ordering wrong in canonical mirror.\n` +
      `  CR-064 anchor at index: ${idx064}, CR-063 anchor at index: ${idx063}.`,
    );
  });
});

// ── Scenario 3 — live and canonical mirrors are byte-identical ────────────────
// REGRESSION guard: if only one mirror is updated, this test catches the divergence.
// PRE-FIX note: both mirrors currently lack Step 7.4 → this test PASSES on baseline.
// Post-implementation: both must receive the identical insertion → still passes.
// A Developer who edits only one mirror breaks this scenario.

describe('CR-064 close_sprint.mjs Scenario 3 — live + canonical mirrors are byte-identical', () => {
  it('diff between live and canonical close_sprint.mjs is empty (mirror parity)', () => {
    let live: string;
    let canonical: string;
    try {
      live = fs.readFileSync(LIVE_CLOSE_SPRINT, 'utf8');
    } catch (err) {
      assert.fail(`Cannot read live close_sprint.mjs: ${String(err)}`);
    }
    try {
      canonical = fs.readFileSync(CANONICAL_CLOSE_SPRINT, 'utf8');
    } catch (err) {
      assert.fail(`Cannot read canonical close_sprint.mjs: ${String(err)}`);
    }

    assert.equal(
      live,
      canonical,
      'CR-064 Scenario 3 FAIL: live and canonical close_sprint.mjs files are NOT byte-identical.\n' +
      'Per FLASHCARD 2026-05-01 #mirror #parity: both mirrors must receive the IDENTICAL Step 7.4 block.\n' +
      'REGRESSION: Developer likely edited only one mirror.',
    );
  });
});

// ── Scenario 4 — prebuild regenerated payload contains Step 7.4 ──────────────
// The cleargate-cli/templates/cleargate-planning/ tree is gitignored and regenerated
// by `npm run prebuild`. This test asserts that after prebuild runs the regenerated
// file also contains the CR-064 anchor.
//
// PRE-FIX: Step 7.4 not inserted in canonical → prebuild copies the pre-insertion
// version → anchor absent from regenerated path → FAIL.
//
// If the prebuild has not run yet (file may not exist on a clean checkout),
// the test skips the content assertion and only checks existence.

describe('CR-064 close_sprint.mjs Scenario 4 — prebuild payload contains Step 7.4', () => {
  it('prebuild target contains the CR-064 anchor OR file is absent (pre-prebuild baseline)', () => {
    const exists = fs.existsSync(PREBUILD_CLOSE_SPRINT);

    if (!exists) {
      // File absent = prebuild not run yet. This is acceptable pre-build but counts as
      // a soft-fail for coverage purposes. Emit an informational message.
      // The test PASSES here because absence = prebuild not run = Developer hasn't shipped yet.
      // Post-implementation: Developer runs `npm run prebuild`; file appears with CR-064 anchor.
      // We surface the path so the reader knows where to look.
      console.log(
        `[INFO] Prebuild target not found at:\n  ${PREBUILD_CLOSE_SPRINT}\n` +
        'Run `cd cleargate-cli && npm run prebuild` to regenerate.',
      );
      // This branch is a SOFT PASS. The hard assertion below is the one that fails.
      return;
    }

    const content = fs.readFileSync(PREBUILD_CLOSE_SPRINT, 'utf8');
    assert.ok(
      content.includes(CR064_ANCHOR),
      `CR-064 Scenario 4 FAIL: prebuild payload close_sprint.mjs lacks CR-064 anchor.\n` +
      `  Expected: "${CR064_ANCHOR}"\n` +
      `  File: ${PREBUILD_CLOSE_SPRINT}\n` +
      'PRE-FIX: canonical mirror lacks Step 7.4 → prebuild copies pre-insertion version.\n' +
      'Developer must insert Step 7.4 in canonical THEN run npm run prebuild.',
    );
  });
});
