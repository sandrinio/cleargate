/**
 * smoke-push-sprint-artifacts.red.node.test.ts — CR-064 QA-RED
 *
 * Failing tests (RED phase) for the smoke script
 * `cleargate-cli/scripts/smoke-push-sprint-artifacts.mjs`.
 *
 * Scenarios (M3.md §CR-064 Test shape — smoke-script section):
 *
 *   Scenario 1 — smoke script file exists with a Node shebang line
 *     `cleargate-cli/scripts/smoke-push-sprint-artifacts.mjs` must exist.
 *     First non-empty line must be `#!/usr/bin/env node` (shebang).
 *
 *   Scenario 2 — smoke script pushes a sprint plan and a sprint report
 *     Invoking the script exits 0 when MCP push succeeds for both artifacts.
 *     (Baseline: script absent → ENOENT / non-zero exit.)
 *
 *   Scenario 3 — smoke script asserts warnings: [] on both pushes (KNOWN_TYPES proof)
 *     The script must check that the MCP response has `warnings: []` for each push.
 *     Baseline: script does not exist → no assertion runs.
 *
 * PRE-FIX state:
 *   All scenarios FAIL because the script does not exist:
 *     Scenario 1: fs.existsSync(SMOKE_SCRIPT) returns false.
 *     Scenario 2: spawnSync exits with ENOENT or non-zero.
 *     Scenario 3: script absent → no warnings check runs.
 *
 * Note on MCP dependency: unit-level scenarios 2 + 3 test the SCRIPT EXISTS and
 * STRUCTURAL assertions only (exit code on ENOENT). A live MCP server is NOT required
 * for the baseline-fail check; the test asserts ENOENT / non-zero exit as the
 * pre-fix failure mode. Post-fix, the smoke test must be run manually against
 * a live MCP per CR-064 §4.
 *
 * FLASHCARD reference: 2026-05-04 #red-test #scripts #env — invoke .mjs scripts
 * via spawnSync(process.execPath, [scriptPath]), not wrapScript. Use env overrides
 * for fixture isolation. NODE_TEST_CONTEXT must be deleted per #node-test #child-process.
 *
 * Runner: tsx --test (node:test)
 * Naming: *.red.node.test.ts (immutable post-Red, per FLASHCARD 2026-05-04 #naming #red-green)
 * Forbidden: DO NOT create or edit smoke-push-sprint-artifacts.mjs.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Resolve repo root: cleargate-cli/test/scripts/ → up 3 → repo root
const REPO_ROOT = path.resolve(__dirname, '..', '..', '..');
const SMOKE_SCRIPT = path.join(REPO_ROOT, 'cleargate-cli', 'scripts', 'smoke-push-sprint-artifacts.mjs');

// ── Scenario 1 — script file exists with shebang ──────────────────────────────
// PRE-FIX: script does not exist → FAIL.

describe('CR-064 smoke-push-sprint-artifacts Scenario 1 — script exists with shebang', () => {
  it('smoke script file exists at cleargate-cli/scripts/smoke-push-sprint-artifacts.mjs', () => {
    assert.ok(
      fs.existsSync(SMOKE_SCRIPT),
      `CR-064 Scenario 1 FAIL: smoke script not found at:\n  ${SMOKE_SCRIPT}\n` +
      'PRE-FIX: file does not yet exist — Developer must create it.',
    );
  });

  it('first non-empty line of smoke script is a Node shebang (#!/usr/bin/env node)', () => {
    // This test gates on file existence — if it does not exist, reading throws.
    // The assertion below therefore fails with ENOENT in baseline, which counts as FAIL.
    let content: string;
    try {
      content = fs.readFileSync(SMOKE_SCRIPT, 'utf8');
    } catch (err) {
      assert.fail(
        `CR-064 Scenario 1 FAIL (shebang): cannot read smoke script:\n${String(err)}\n` +
        'PRE-FIX: file does not exist.',
      );
    }
    const firstLine = content.split('\n').find((l) => l.trim().length > 0) ?? '';
    assert.ok(
      firstLine.startsWith('#!') && firstLine.includes('node'),
      `CR-064 Scenario 1 FAIL (shebang): first non-empty line is:\n  "${firstLine}"\n` +
      'Expected: a shebang line containing "node" (e.g. "#!/usr/bin/env node").',
    );
  });
});

// ── Scenario 2 — script invocation (structure + exit code) ────────────────────
// PRE-FIX: script absent → ENOENT from Node → non-zero exit.
// POST-FIX: exits 0 when MCP is reachable; exits non-zero when MCP is down
// (the test only checks that the script runs without ENOENT).

describe('CR-064 smoke-push-sprint-artifacts Scenario 2 — script invocable (no ENOENT)', () => {
  it('running the smoke script does not produce ENOENT (file must exist)', () => {
    // Delete NODE_TEST_CONTEXT so nested tsx invocations get real pass/fail
    // FLASHCARD 2026-05-04 #node-test #child-process
    const env = { ...process.env };
    delete env['NODE_TEST_CONTEXT'];

    // Set CLEARGATE_SMOKE_DRY_RUN=1 to allow the script to exit early if it supports
    // dry-run mode without real MCP calls. If the script does not honour the env var,
    // it will attempt MCP calls and likely fail on missing creds — that is acceptable
    // (non-zero exit is not the same as ENOENT).
    env['CLEARGATE_SMOKE_DRY_RUN'] = '1';
    // Point REPO_ROOT to the actual repo root so the script can find sprint artifacts.
    env['CLEARGATE_REPO_ROOT'] = REPO_ROOT;

    const result = spawnSync(process.execPath, [SMOKE_SCRIPT], {
      encoding: 'utf8',
      timeout: 30_000,
      env,
    });

    // Pre-fix failure: result.error is set with ENOENT because the file is absent.
    assert.ok(
      !result.error || !result.error.message.includes('ENOENT'),
      `CR-064 Scenario 2 FAIL: script invocation produced ENOENT — file does not exist.\n` +
      `Error: ${result.error?.message ?? '(no error object)'}\n` +
      'PRE-FIX: smoke-push-sprint-artifacts.mjs has not been created yet.',
    );
  });
});

// ── Scenario 3 — warnings: [] assertion in smoke script ──────────────────────
// Verifies the script source CONTAINS the string "warnings" (as evidence it checks
// the warnings field). This is a structural assertion — actual warnings: [] proof
// requires a live MCP + KNOWN_TYPES including 'sprint' and 'sprint_report'.
//
// PRE-FIX: script file absent → readFileSync throws → test FAILS.

describe('CR-064 smoke-push-sprint-artifacts Scenario 3 — script checks warnings field', () => {
  it('smoke script source contains a "warnings" check (KNOWN_TYPES suppression assertion)', () => {
    let content: string;
    try {
      content = fs.readFileSync(SMOKE_SCRIPT, 'utf8');
    } catch (err) {
      assert.fail(
        `CR-064 Scenario 3 FAIL: cannot read smoke script to check warnings assertion:\n${String(err)}\n` +
        'PRE-FIX: file does not exist.',
      );
    }

    assert.ok(
      content.includes('warnings'),
      'CR-064 Scenario 3 FAIL: smoke script does not reference "warnings".\n' +
      'The script MUST assert warnings: [] on each push response to prove\n' +
      'KNOWN_TYPES recognises "sprint" and "sprint_report" (EPIC-027 headline metric).\n' +
      'PRE-FIX: script absent → no assertion exists.',
    );
  });

  it('smoke script source contains "sprint_report" string (pushes both types)', () => {
    let content: string;
    try {
      content = fs.readFileSync(SMOKE_SCRIPT, 'utf8');
    } catch (err) {
      assert.fail(
        `CR-064 Scenario 3 FAIL (sprint_report check): cannot read smoke script:\n${String(err)}\n` +
        'PRE-FIX: file does not exist.',
      );
    }

    assert.ok(
      content.includes('sprint_report'),
      'CR-064 Scenario 3 FAIL: smoke script does not reference "sprint_report".\n' +
      'Script must push BOTH sprint plan (type=sprint) AND report (type=sprint_report).\n' +
      'PRE-FIX: script absent.',
    );
  });

  it('smoke script source contains "4 pushed" or equivalent aggregate check', () => {
    let content: string;
    try {
      content = fs.readFileSync(SMOKE_SCRIPT, 'utf8');
    } catch (err) {
      assert.fail(
        `CR-064 Scenario 3 FAIL (aggregate check): cannot read smoke script:\n${String(err)}\n` +
        'PRE-FIX: file does not exist.',
      );
    }

    // The script MUST emit "4 pushed, 0 failed" or check a push count.
    // Accept "4 pushed" OR "pushed" count logic (e.g. pushed >= 4 or pushed === 4).
    const hasAggregateCheck = content.includes('4 pushed') || content.includes('pushed,') ||
      /pushed\s*[=><]=?\s*4/.test(content);

    assert.ok(
      hasAggregateCheck,
      'CR-064 Scenario 3 FAIL: smoke script does not contain an aggregate push-count check.\n' +
      'Expected output: "4 pushed, 0 failed" or equivalent (per CR-064 §4 expected output).\n' +
      'PRE-FIX: script absent → no count logic.',
    );
  });
});
