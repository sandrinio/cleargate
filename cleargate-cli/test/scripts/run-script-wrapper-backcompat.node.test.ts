/**
 * run-script-wrapper-backcompat.node.test.ts — CR-046 back-compat extension-routing tests.
 *
 * Refactored in CR-052 to use the shared wrapScript() helper instead of
 * inline tmpdir-spawnSync plumbing. Test count and assertions are unchanged.
 *
 * Scenarios:
 *   Scenario A: .mjs extension routes through node — wrapper with assert_story_files.mjs
 *               as arg1 should exec via node (resolves from SCRIPT_DIR).
 *   Scenario B: .sh extension routes through bash — wrapper with pre_gate_runner.sh
 *               as arg1 should exec via bash (resolves from SCRIPT_DIR).
 *   Scenario C: arbitrary-cmd path unchanged — wrapper with 'true' as arg1 still exits 0
 *               (not treated as a script name, no extension rewrite).
 *
 * NOTE: This file is scheduled for deletion in CR-050 (once caller migration removes the
 * back-compat shim from run_script.sh). The refactor here is a proof-of-consumer demo.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

import { wrapScript } from '../helpers/wrap-script.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Resolve repo root: cleargate-cli/test/scripts/ → up 3 → repo root
const REPO_ROOT = path.resolve(__dirname, '..', '..', '..');
const LIVE_WRAPPER = path.join(REPO_ROOT, '.cleargate', 'scripts', 'run_script.sh');

// ---------------------------------------------------------------------------
// Scenario A: .mjs extension routes through node
// ---------------------------------------------------------------------------

describe('CR-046 back-compat — Scenario A: .mjs extension routes through node', () => {
  // We need to place a fixture .mjs in a SCRIPT_DIR that the wrapper sees.
  // wrapScript copies the wrapper to tmpdir/.cleargate/scripts/run_script.sh,
  // so SCRIPT_DIR = tmpdir/.cleargate/scripts.
  // We write the fixture into fixtures map at '.cleargate/scripts/fixture_backcompat.mjs'.
  // wrapScript handles tmpdir lifecycle; no before/after hooks needed.

  it('routes *.mjs arg1 through node when file exists in SCRIPT_DIR', async () => {
    const result = await wrapScript({
      wrapper: LIVE_WRAPPER,
      args: ['fixture_backcompat.mjs'],
      fixtures: {
        '.cleargate/scripts/fixture_backcompat.mjs':
          'process.stdout.write("mjs-routed\\n"); process.exit(0);\n',
      },
      env: {
        AGENT_TYPE: 'developer',
        WORK_ITEM_ID: 'CR-046',
      },
    });

    assert.strictEqual(
      result.exitCode,
      0,
      `Expected exit 0 from .mjs routing but got ${result.exitCode}. stderr: ${result.stderr}`
    );
    assert.ok(
      result.stdout.includes('mjs-routed'),
      `Expected stdout to contain 'mjs-routed' (node executed the .mjs) but got: ${JSON.stringify(result.stdout)}`
    );
  });

  it('.mjs routing does not write incident JSON on success', async () => {
    const result = await wrapScript({
      wrapper: LIVE_WRAPPER,
      args: ['fixture_backcompat.mjs'],
      fixtures: {
        '.cleargate/scripts/fixture_backcompat.mjs':
          'process.stdout.write("mjs-routed\\n"); process.exit(0);\n',
      },
      env: {
        AGENT_TYPE: 'developer',
        WORK_ITEM_ID: 'CR-046',
      },
    });

    assert.strictEqual(result.exitCode, 0, `Expected exit 0 from .mjs routing`);
    assert.strictEqual(
      result.incidentJson,
      undefined,
      `Expected no incidentJson on success but got: ${JSON.stringify(result.incidentJson)}`
    );
  });
});

// ---------------------------------------------------------------------------
// Scenario B: .sh extension routes through bash
// ---------------------------------------------------------------------------

describe('CR-046 back-compat — Scenario B: .sh extension routes through bash', () => {
  // Similarly, the fixture .sh must live in SCRIPT_DIR (tmpdir/.cleargate/scripts/).
  // We write it via fixtures and also need to set the executable bit.
  // wrapScript writes fixtures as-is; we can make the .sh content valid bash
  // that bash will execute directly (the wrapper routes *.sh through bash explicitly).

  it('routes *.sh arg1 through bash when file exists in SCRIPT_DIR', async () => {
    const result = await wrapScript({
      wrapper: LIVE_WRAPPER,
      args: ['fixture_backcompat.sh'],
      fixtures: {
        '.cleargate/scripts/fixture_backcompat.sh':
          '#!/usr/bin/env bash\necho "sh-routed"\nexit 0\n',
      },
      env: {
        AGENT_TYPE: 'developer',
        WORK_ITEM_ID: 'CR-046',
      },
    });

    assert.strictEqual(
      result.exitCode,
      0,
      `Expected exit 0 from .sh routing but got ${result.exitCode}. stderr: ${result.stderr}`
    );
    assert.ok(
      result.stdout.includes('sh-routed'),
      `Expected stdout to contain 'sh-routed' (bash executed the .sh) but got: ${JSON.stringify(result.stdout)}`
    );
  });

  it('.sh routing does not write incident JSON on success', async () => {
    const result = await wrapScript({
      wrapper: LIVE_WRAPPER,
      args: ['fixture_backcompat.sh'],
      fixtures: {
        '.cleargate/scripts/fixture_backcompat.sh':
          '#!/usr/bin/env bash\necho "sh-routed"\nexit 0\n',
      },
      env: {
        AGENT_TYPE: 'developer',
        WORK_ITEM_ID: 'CR-046',
      },
    });

    assert.strictEqual(result.exitCode, 0, `Expected exit 0 from .sh routing`);
    assert.strictEqual(
      result.incidentJson,
      undefined,
      `Expected no incidentJson on success but got: ${JSON.stringify(result.incidentJson)}`
    );
  });
});

// ---------------------------------------------------------------------------
// Scenario C: arbitrary-cmd path unchanged
// ---------------------------------------------------------------------------

describe('CR-046 back-compat — Scenario C: arbitrary-cmd path unchanged', () => {
  it('passes arbitrary command (true) through without rewrite — exits 0', async () => {
    const result = await wrapScript({
      wrapper: LIVE_WRAPPER,
      args: ['true'],
      env: {
        AGENT_TYPE: 'developer',
        WORK_ITEM_ID: 'CR-046',
      },
    });

    assert.strictEqual(
      result.exitCode,
      0,
      `Expected exit 0 from 'true' but got ${result.exitCode}. stderr: ${result.stderr}`
    );
  });

  it('passes arbitrary command (sh -c exit 5) through without rewrite — exits 5', async () => {
    const result = await wrapScript({
      wrapper: LIVE_WRAPPER,
      args: ['sh', '-c', 'exit 5'],
      env: {
        AGENT_TYPE: 'developer',
        WORK_ITEM_ID: 'CR-046',
      },
    });

    assert.strictEqual(
      result.exitCode,
      5,
      `Expected exit 5 from 'sh -c exit 5' but got ${result.exitCode}. stderr: ${result.stderr}`
    );
  });

  it('bare .mjs name that does NOT exist in SCRIPT_DIR is treated as PATH command (exits 127)', async () => {
    // A .mjs name that doesn't exist in SCRIPT_DIR should not be routed through node;
    // it falls through to the arbitrary-cmd path and fails with 127 (not found on PATH).
    const result = await wrapScript({
      wrapper: LIVE_WRAPPER,
      args: ['nonexistent_script_xyz.mjs'],
      env: {
        AGENT_TYPE: 'developer',
        WORK_ITEM_ID: 'CR-046',
      },
    });

    // The wrapper should attempt to exec 'nonexistent_script_xyz.mjs' directly;
    // since it's not on PATH either, exit code should be non-zero (127 or 126).
    assert.notStrictEqual(
      result.exitCode,
      0,
      `Expected non-zero exit for missing .mjs but got 0 — routing logic may have gone wrong`
    );
  });
});

