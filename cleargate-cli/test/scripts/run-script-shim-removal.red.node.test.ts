/**
 * run-script-shim-removal.red.node.test.ts — CR-050 Red tests: back-compat shim removal.
 *
 * CR-050 RED: pre-migration baseline. These tests define the REQUIRED post-Dev behaviour.
 * File is immutable once written (*.red.node.test.ts naming per CR-043/FLASHCARD 2026-05-04
 * #naming #red-green). Rename to *.node.test.ts only after Dev passes all three scenarios.
 *
 * BASELINE EXPECTATIONS (pre-Dev):
 *   Scenario 1a — FAILS  (shim present + fixture in SCRIPT_DIR → routes via node, exits 1)
 *   Scenario 1b — FAILS  (shim present + fixture in SCRIPT_DIR → routes via bash, exits 0)
 *   Scenario 2a — PASSES (arbitrary cmd 'true' works; regression sentinel)
 *   Scenario 2b — PASSES (explicit node -e form works; regression sentinel)
 *   Scenario 2c — PASSES (explicit bash -c form works; regression sentinel)
 *   Scenario 3  — FAILS  (companion test file still exists pre-Dev)
 *
 * POST-DEV EXPECTATIONS (all must pass):
 *   Scenario 1a — PASSES (shim deleted → bare .mjs exits 127)
 *   Scenario 1b — PASSES (shim deleted → bare .sh exits 127)
 *   Scenario 2a-c — PASSES (regression sentinels unchanged)
 *   Scenario 3  — PASSES (companion test file deleted by Dev)
 *
 * Exit-code pinning (macOS smoke, 2026-05-04):
 *   - With shim absent, bare name passed, no fixture in SCRIPT_DIR: exits 127
 *   - With shim absent, bare name passed, fixture exists in SCRIPT_DIR: exits 127
 *     (shim block is gone; no routing; arg1 treated as PATH command → 127)
 *   Per M1.md §CR-050 TPV scope #6: assert specifically 127, not just !== 0.
 *
 * KEY INVARIANT for shim-active tests: fixture MUST be placed in SCRIPT_DIR
 * (i.e., '.cleargate/scripts/<name>') so the shim's -f check matches.
 * Without the fixture the shim falls through to arbitrary-cmd regardless → 127
 * even pre-Dev. That gives a false-green Red test. Always provide fixtures here.
 *
 * Uses wrapScript() from ../helpers/wrap-script.js (CR-052, shipped at c9dbe72).
 * No spawnMock. No vitest. Real wrapper exec via tmpdir isolation.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

import { wrapScript } from '../helpers/wrap-script.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Resolve repo root from cleargate-cli/test/scripts/ → up 3 levels → repo root.
// Uses import.meta.url-relative resolution per FLASHCARD 2026-05-03
// #test-harness #worktree #vitest — never hardcode /Users/... paths; must work in worktrees.
const REPO_ROOT = path.resolve(__dirname, '..', '..', '..');
const LIVE_WRAPPER = path.join(REPO_ROOT, '.cleargate', 'scripts', 'run_script.sh');

// ---------------------------------------------------------------------------
// Scenario 1 — bare-name no longer routes (shim removed)
//
// After CR-050 Dev deletes the back-compat shim block (~L49-64 in run_script.sh),
// passing a bare script name like 'validate_state.mjs' as arg1 must NOT be routed
// through node. The wrapper treats it as a PATH lookup; since *.mjs files are not
// on PATH, bash reports "command not found" — exit 127.
//
// CRITICAL: We MUST place the fixture in SCRIPT_DIR ('.cleargate/scripts/<name>')
// so the shim's `-f "${SCRIPT_DIR}/${_ARG1}"` check actually matches pre-Dev.
// Without the fixture the shim falls through regardless → exits 127 even pre-Dev,
// giving a false-green Red test that never fails.
//
// PRE-DEV behaviour (FAIL — these tests assert post-Dev state):
//   Shim present + fixture in SCRIPT_DIR → shim routes bare .mjs through node → exits 1
//   Shim present + fixture in SCRIPT_DIR → shim routes bare .sh through bash  → exits 0
// POST-DEV behaviour (PASS):
//   Shim deleted → bare arg1 treated as PATH command → exits 127 regardless of fixture.
//
// macOS-pinned: exit 127 confirmed post-shim-delete (smoke 2026-05-04).
// Per M1.md §CR-050 TPV scope #6: assert specifically 127.
// ---------------------------------------------------------------------------
describe('CR-050 Scenario 1 — shim removed: bare-name no longer routes (fails pre-Dev)', () => {
  it('bare .mjs name exits 127 post-shim-deletion (fixture in SCRIPT_DIR confirms shim was active)', async () => {
    // Place fixture in SCRIPT_DIR so the shim's -f check would match IF shim is present.
    // Pre-Dev (shim active): routes through node → executes fixture → exits 1 (node process.exit(1))
    // Post-Dev (shim gone): arg1 treated as PATH command → exits 127
    const result = await wrapScript({
      wrapper: LIVE_WRAPPER,
      args: ['shim_test_fixture.mjs'],
      fixtures: {
        // Placed in SCRIPT_DIR = tmpdir/.cleargate/scripts/
        '.cleargate/scripts/shim_test_fixture.mjs':
          '// Fixture for shim-removal test\nprocess.stderr.write("shim-routed-mjs\\n");\nprocess.exit(1);\n',
      },
      env: {
        AGENT_TYPE: 'qa',
        WORK_ITEM_ID: 'CR-050',
      },
    });

    // Per M1.md TPV scope #6: assert specifically 127, not just !== 0.
    // Pre-Dev: shim routes → node exits 1 → assertion fails (1 !== 127) → Red confirmed.
    // Post-Dev: shim gone → exits 127 → assertion passes.
    assert.strictEqual(
      result.exitCode,
      127,
      `Expected exit 127 (command not found — shim removed) but got ${result.exitCode}. ` +
        `If exit is 1, the back-compat shim is still present and routed via node (expected Red failure). ` +
        `If exit is 0, something unexpected routed successfully. ` +
        `stderr: ${result.stderr}`
    );
  });

  it('bare .sh name exits 127 post-shim-deletion (fixture in SCRIPT_DIR confirms shim was active)', async () => {
    // Place fixture in SCRIPT_DIR so the shim's -f check would match IF shim is present.
    // Pre-Dev (shim active): routes through bash → executes fixture → exits 0
    // Post-Dev (shim gone): arg1 treated as PATH command → exits 127
    const result = await wrapScript({
      wrapper: LIVE_WRAPPER,
      args: ['shim_test_fixture.sh'],
      fixtures: {
        // Placed in SCRIPT_DIR = tmpdir/.cleargate/scripts/
        '.cleargate/scripts/shim_test_fixture.sh':
          '#!/usr/bin/env bash\necho "shim-routed-sh"\nexit 0\n',
      },
      env: {
        AGENT_TYPE: 'qa',
        WORK_ITEM_ID: 'CR-050',
      },
    });

    // Per M1.md TPV scope #6: assert specifically 127.
    // Pre-Dev: shim routes → bash exits 0 → assertion fails (0 !== 127) → Red confirmed.
    // Post-Dev: shim gone → exits 127 → assertion passes.
    assert.strictEqual(
      result.exitCode,
      127,
      `Expected exit 127 (command not found — shim removed) but got ${result.exitCode}. ` +
        `If exit is 0, the back-compat shim is still present and routed via bash (expected Red failure). ` +
        `stderr: ${result.stderr}`
    );
  });
});

// ---------------------------------------------------------------------------
// Scenario 2 — new explicit interface works (regression sentinel)
//
// The explicit `node <abs-path>`, `bash <abs-path>`, and arbitrary-cmd forms
// must work both before and after the shim is removed. These always pass.
// ---------------------------------------------------------------------------
describe('CR-050 Scenario 2 — new explicit interface works (regression sentinel, passes pre-Dev)', () => {
  it('exits 0 with arbitrary command (true) — baseline regression sentinel', async () => {
    // The arbitrary-cmd path is unchanged by shim removal.
    const result = await wrapScript({
      wrapper: LIVE_WRAPPER,
      args: ['true'],
      env: {
        AGENT_TYPE: 'qa',
        WORK_ITEM_ID: 'CR-050',
      },
    });

    assert.strictEqual(
      result.exitCode,
      0,
      `Expected exit 0 from 'true' (arbitrary-cmd path) but got ${result.exitCode}. ` +
        `stderr: ${result.stderr}`
    );
  });

  it('exits 0 with node as explicit interpreter (new canonical form for .mjs callers)', async () => {
    // This is the canonical post-migration form: bash run_script.sh node -e "..."
    // Tests that the explicit interpreter path works.
    const result = await wrapScript({
      wrapper: LIVE_WRAPPER,
      args: ['node', '-e', 'process.exit(0)'],
      env: {
        AGENT_TYPE: 'qa',
        WORK_ITEM_ID: 'CR-050',
      },
    });

    assert.strictEqual(
      result.exitCode,
      0,
      `Expected exit 0 from 'node -e process.exit(0)' but got ${result.exitCode}. ` +
        `stderr: ${result.stderr}`
    );
  });

  it('exits 0 with bash as explicit interpreter (new canonical form for .sh callers)', async () => {
    // This is the canonical post-migration form for gate qa/arch callers:
    // bash run_script.sh bash -c "exit 0"
    const result = await wrapScript({
      wrapper: LIVE_WRAPPER,
      args: ['bash', '-c', 'exit 0'],
      env: {
        AGENT_TYPE: 'qa',
        WORK_ITEM_ID: 'CR-050',
      },
    });

    assert.strictEqual(
      result.exitCode,
      0,
      `Expected exit 0 from 'bash -c exit 0' but got ${result.exitCode}. ` +
        `stderr: ${result.stderr}`
    );
  });
});

// ---------------------------------------------------------------------------
// Scenario 3 — companion test file deleted (fails pre-Dev because file exists)
//
// CR-050 Dev must delete cleargate-cli/test/scripts/run-script-wrapper-backcompat.node.test.ts
// as part of the shim removal. This scenario asserts the file no longer exists.
//
// PRE-DEV behaviour (FAIL — file still exists):
//   fs.existsSync returns true → assertion fails.
// POST-DEV behaviour (PASS):
//   File deleted; fs.existsSync returns false → assertion passes.
//
// Per CR-050 §4 acceptance #5 and M1.md §CR-050 acceptance trace §4.5.
// ---------------------------------------------------------------------------
describe('CR-050 Scenario 3 — companion test deleted (fails pre-Dev, passes post-Dev)', () => {
  it('run-script-wrapper-backcompat.node.test.ts no longer exists', () => {
    // This file is the companion test for the back-compat shim (CR-046 + CR-052 refactor).
    // CR-050 Dev deletes it as part of shim removal.
    // Use import.meta.url-relative repo root — must work in worktrees.
    const companionTestPath = path.join(
      REPO_ROOT,
      'cleargate-cli',
      'test',
      'scripts',
      'run-script-wrapper-backcompat.node.test.ts'
    );

    assert.strictEqual(
      fs.existsSync(companionTestPath),
      false,
      `Expected companion test to be deleted but it still exists at:\n  ${companionTestPath}\n` +
        `CR-050 Dev must delete this file as part of shim removal (§4 acceptance #5).`
    );
  });
});
