/**
 * test_close_sprint_v21.test.ts — STORY-022-07 + STORY-025-03 + CR-022-M4 acceptance tests
 *
 * Gherkin scenarios (§2.1) — STORY-022-07:
 *   Scenario 1: reporter.md documents v2.1 contract
 *   Scenario 2: close_sprint accepts a v1 report unchanged (legacy-pass)
 *   Scenario 3: close_sprint accepts a v2 report with no fast-lane stories
 *   Scenario 4: close_sprint rejects a v2 report missing required sections
 *   Scenario 5: close_sprint rejects non-conformant sprint-run path (S-99)
 *   Scenario 6: Reporter writes Lane Audit + Hotfix Audit on a sprint with a fast-lane story
 *
 * Gherkin scenarios — STORY-025-03 (naming + Step 3.5 + Step 7):
 *   Scenario 7:  SPRINT-18+ sprints write SPRINT-<#>_REPORT.md (not REPORT.md)
 *   Scenario 8:  SPRINT-15 legacy — REPORT.md is NOT renamed (backwards-compat)
 *   Scenario 9:  Step 3.5 success — stdout contains "Step 3.5 passed" message
 *   Scenario 10: Step 3.5 failure — warns and pipeline continues
 *   Scenario 11: Step 7 skipped when CLI binary missing
 *   Scenario 12: Step 7 warns and continues when sync fails (non-fatal)
 *   Scenario 13: Step 5 wait-for-ack prompt references SPRINT-<#>_REPORT.md
 *   Scenario 14: SPRINT-TEST (no numeric portion) uses plain REPORT.md
 *
 * Uses spawnSync to invoke close_sprint.mjs directly via real tmpdir filesystem.
 * CLEARGATE_SPRINT_DIR env var controls the sprint dir path.
 *
 * Key design: for "pass" scenarios, the full pipeline runs.
 *   - prefill_report.mjs finds no agent reports → exits 0 (no-op)
 *   - sprint_status flips to Completed in the temp copy of state.json
 *   - suggest_improvements.mjs reads the report from the fixture dir
 *
 * For "fail" scenarios (naming convention + missing sections), the script exits
 * before Step 3 so the pipeline stops cleanly.
 *
 * Cross-OS note: all paths use path.join; no GNU/BSD flags used.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Resolve repo root: cleargate-cli/test/scripts/ → up 3 → repo root
const REPO_ROOT = path.resolve(__dirname, '..', '..', '..');

// Use the live close_sprint.mjs (both live and scaffold are byte-identical post-022-07)
const CLOSE_SPRINT_SCRIPT = path.join(REPO_ROOT, '.cleargate', 'scripts', 'close_sprint.mjs');

// Fixture base dir
const FIXTURES_DIR = path.join(__dirname, 'fixtures');

// Path to scaffold reporter.md (tracked in git)
const REPORTER_MD_SCAFFOLD = path.join(
  REPO_ROOT,
  'cleargate-planning',
  '.claude',
  'agents',
  'reporter.md',
);

/**
 * Copy a fixture dir into a fresh temp dir and return the temp dir path.
 * The fixture state.json, REPORT.md, and any SPRINT-<#>_REPORT.md are copied over.
 * The temp dir name is set to the provided sprintDirName so that
 * path.basename() returns the expected value for naming-convention checks.
 */
function makeTempSprintDir(fixtureName: string, sprintDirName: string): string {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), 'cg-close-sprint-v21-'));
  // Create a subdirectory with the expected sprint name so close_sprint.mjs
  // checks path.basename(sprintDir) against the naming convention.
  const sprintDir = path.join(base, sprintDirName);
  fs.mkdirSync(sprintDir, { recursive: true });

  const fixturePath = path.join(FIXTURES_DIR, fixtureName);

  // Copy state.json
  const stateFile = path.join(fixturePath, 'state.json');
  if (fs.existsSync(stateFile)) {
    fs.copyFileSync(stateFile, path.join(sprintDir, 'state.json'));
  }

  // Copy REPORT.md (legacy name — used by pre-CR-021 fixtures)
  const reportFile = path.join(fixturePath, 'REPORT.md');
  if (fs.existsSync(reportFile)) {
    fs.copyFileSync(reportFile, path.join(sprintDir, 'REPORT.md'));
  }

  // Copy any SPRINT-<#>_REPORT.md (new naming convention for SPRINT-18+)
  if (fs.existsSync(fixturePath)) {
    for (const f of fs.readdirSync(fixturePath)) {
      if (/^SPRINT-\d+_REPORT\.md$/.test(f)) {
        fs.copyFileSync(path.join(fixturePath, f), path.join(sprintDir, f));
      }
    }
  }

  return sprintDir;
}

/**
 * Run close_sprint.mjs with --assume-ack against a sprint dir.
 * CLEARGATE_SPRINT_DIR points to the sprint dir directly.
 * CLEARGATE_STATE_FILE points to state.json in the sprint dir.
 *
 * CLEARGATE_SKIP_WORKTREE_CHECK=1 is set by default so that Scenarios 1-14
 * are not affected by any real .worktrees/STORY-* paths that may exist in the
 * developer's git repo during a live sprint. Scenarios 15-17 test Step 2.7
 * directly via their own spawnSync calls without this bypass.
 *
 * CLEARGATE_SKIP_LIFECYCLE_CHECK=1 is also set by default so that Scenarios 1-14
 * are not affected by real lifecycle drift in the developer's git history (the
 * reconcile-lifecycle CLI reads from REPO_ROOT, not from the temp sprint dir).
 * Scenarios 15-17 also set this to ensure Step 2.7 is the first gate that fires.
 */
function runCloseSprint(sprintDir: string, extraArgs: string[] = []): {
  status: number | null;
  stdout: string;
  stderr: string;
} {
  const sprintId = path.basename(sprintDir);
  const stateFile = path.join(sprintDir, 'state.json');

  const result = spawnSync(
    '/usr/bin/env',
    ['node', CLOSE_SPRINT_SCRIPT, sprintId, '--assume-ack', ...extraArgs],
    {
      encoding: 'utf8',
      timeout: 30_000,
      env: {
        ...process.env,
        CLEARGATE_SPRINT_DIR: sprintDir,
        CLEARGATE_STATE_FILE: stateFile,
        CLEARGATE_SKIP_WORKTREE_CHECK: '1',
        CLEARGATE_SKIP_LIFECYCLE_CHECK: '1',
      },
    },
  );

  return {
    status: result.status,
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Scenario 1: reporter.md documents v2.1 contract
// ─────────────────────────────────────────────────────────────────────────────

describe('Scenario 1: reporter.md documents v2.1 contract', () => {
  it('scaffold reporter.md contains "Fast-Track Ratio"', () => {
    const content = fs.readFileSync(REPORTER_MD_SCAFFOLD, 'utf8');
    expect(content).toMatch(/Fast-Track Ratio/);
  });

  it('scaffold reporter.md contains "Lane Audit"', () => {
    const content = fs.readFileSync(REPORTER_MD_SCAFFOLD, 'utf8');
    expect(content).toMatch(/Lane Audit/);
  });

  it('scaffold reporter.md contains a "Sprint Report v2.1" section heading', () => {
    const content = fs.readFileSync(REPORTER_MD_SCAFFOLD, 'utf8');
    expect(content).toMatch(/Sprint Report v2\.1/);
  });

  it('scaffold reporter.md enumerates all six §3 metric row names', () => {
    const content = fs.readFileSync(REPORTER_MD_SCAFFOLD, 'utf8');
    expect(content).toMatch(/Fast-Track Ratio/);
    expect(content).toMatch(/Fast-Track Demotion Rate/);
    expect(content).toMatch(/Hotfix Count/);
    expect(content).toMatch(/Hotfix-to-Story Ratio/);
    expect(content).toMatch(/Hotfix Cap Breaches/);
    expect(content).toMatch(/LD events/);
  });

  it('scaffold reporter.md enumerates Lane Audit + Hotfix Audit + Hotfix Trend', () => {
    const content = fs.readFileSync(REPORTER_MD_SCAFFOLD, 'utf8');
    expect(content).toMatch(/Lane Audit/);
    expect(content).toMatch(/Hotfix Audit/);
    expect(content).toMatch(/Hotfix Trend/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Scenario 2: close_sprint accepts a v1 report unchanged (legacy-pass)
// ─────────────────────────────────────────────────────────────────────────────

describe('Scenario 2: close_sprint accepts a v1 report unchanged (legacy-pass)', () => {
  let tmpBase: string;
  let sprintDir: string;

  beforeEach(() => {
    sprintDir = makeTempSprintDir('sprint-v1-legacy', 'SPRINT-TEST');
    tmpBase = path.dirname(sprintDir);
  });

  afterEach(() => {
    fs.rmSync(tmpBase, { recursive: true, force: true });
  });

  it('exits 0 for a v1 state.json (no v2 validation triggered)', () => {
    const result = runCloseSprint(sprintDir);
    expect(result.status).toBe(0);
  });

  it('no error about missing Lane Audit or Hotfix Audit is emitted', () => {
    const result = runCloseSprint(sprintDir);
    expect(result.stderr).not.toMatch(/Lane Audit/);
    expect(result.stderr).not.toMatch(/Hotfix Audit/);
    expect(result.stderr).not.toMatch(/§3 missing rows/);
    expect(result.stderr).not.toMatch(/§5 missing/);
  });

  it('state.json sprint_status is flipped to Completed', () => {
    runCloseSprint(sprintDir);
    const state = JSON.parse(fs.readFileSync(path.join(sprintDir, 'state.json'), 'utf8'));
    expect(state.sprint_status).toBe('Completed');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Scenario 3: close_sprint accepts a v2 report with no fast-lane stories
// ─────────────────────────────────────────────────────────────────────────────

describe('Scenario 3: close_sprint accepts a v2 report with no fast-lane stories', () => {
  let tmpBase: string;
  let sprintDir: string;

  beforeEach(() => {
    sprintDir = makeTempSprintDir('sprint-v2-no-fast', 'SPRINT-TEST');
    tmpBase = path.dirname(sprintDir);
  });

  afterEach(() => {
    fs.rmSync(tmpBase, { recursive: true, force: true });
  });

  it('exits 0 (activation gate not met — no lane=fast story)', () => {
    const result = runCloseSprint(sprintDir);
    expect(result.status).toBe(0);
  });

  it('no v2.1 validation error is emitted', () => {
    const result = runCloseSprint(sprintDir);
    expect(result.stderr).not.toMatch(/§3 missing rows/);
    expect(result.stderr).not.toMatch(/§5 missing/);
    expect(result.stderr).not.toMatch(/Lane Audit/);
  });

  it('state.json sprint_status is flipped to Completed', () => {
    runCloseSprint(sprintDir);
    const state = JSON.parse(fs.readFileSync(path.join(sprintDir, 'state.json'), 'utf8'));
    expect(state.sprint_status).toBe('Completed');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Scenario 4: close_sprint rejects a v2 report missing required sections
// ─────────────────────────────────────────────────────────────────────────────

describe('Scenario 4: close_sprint rejects a v2 report missing required sections', () => {
  let tmpBase: string;
  let sprintDir: string;

  beforeEach(() => {
    // Must use a conformant sprint name so naming-convention check passes
    // and we get to the §5 section check (which should fail).
    sprintDir = makeTempSprintDir('sprint-v2-fast-missing-audit', 'SPRINT-98');
    tmpBase = path.dirname(sprintDir);
  });

  afterEach(() => {
    fs.rmSync(tmpBase, { recursive: true, force: true });
  });

  it('exits non-zero (validation fails)', () => {
    const result = runCloseSprint(sprintDir);
    expect(result.status).not.toBe(0);
    expect(result.status).toBe(1);
  });

  it('error names the missing "Lane Audit" section verbatim', () => {
    const result = runCloseSprint(sprintDir);
    expect(result.stderr).toMatch(/Lane Audit/);
  });

  it('stderr contains §5 missing message', () => {
    const result = runCloseSprint(sprintDir);
    expect(result.stderr).toMatch(/§5 missing/);
  });

  it('state.json sprint_status stays Active (not flipped)', () => {
    runCloseSprint(sprintDir);
    const state = JSON.parse(fs.readFileSync(path.join(sprintDir, 'state.json'), 'utf8'));
    expect(state.sprint_status).toBe('Active');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Scenario 5: close_sprint rejects non-conformant sprint-run path (S-99)
// ─────────────────────────────────────────────────────────────────────────────

describe('Scenario 5: close_sprint rejects non-conformant sprint-run path', () => {
  let tmpBase: string;
  let sprintDir: string;

  beforeEach(() => {
    // The dir name is "S-99-bad-name" but we use "S-99" as the sprint dir name
    // so path.basename(sprintDir) = "S-99" which fails ^SPRINT-\d{2,3}$
    sprintDir = makeTempSprintDir('S-99-bad-name', 'S-99');
    tmpBase = path.dirname(sprintDir);
  });

  afterEach(() => {
    fs.rmSync(tmpBase, { recursive: true, force: true });
  });

  it('exits non-zero with naming convention error', () => {
    const result = runCloseSprint(sprintDir);
    expect(result.status).toBe(1);
  });

  it('stderr explains the ^SPRINT-\\d{2,3}$ convention', () => {
    const result = runCloseSprint(sprintDir);
    // The error message includes the regex pattern
    expect(result.stderr).toMatch(/SPRINT-\\d\{2,3\}/);
  });

  it('stderr mentions the offending path name', () => {
    const result = runCloseSprint(sprintDir);
    expect(result.stderr).toMatch(/S-99/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Scenario 6: Reporter writes Lane Audit + Hotfix Audit on sprint with fast-lane story
// ─────────────────────────────────────────────────────────────────────────────

describe('Scenario 6: Reporter writes Lane Audit + Hotfix Audit on a sprint with a fast-lane story', () => {
  let tmpBase: string;
  let sprintDir: string;

  beforeEach(() => {
    // Must use a conformant sprint name so naming-convention check passes
    // and the full v2.1 validation runs to completion.
    sprintDir = makeTempSprintDir('sprint-v2-fast-complete', 'SPRINT-97');
    tmpBase = path.dirname(sprintDir);
  });

  afterEach(() => {
    fs.rmSync(tmpBase, { recursive: true, force: true });
  });

  it('exits 0 when REPORT.md has all v2.1 sections', () => {
    const result = runCloseSprint(sprintDir);
    expect(result.status).toBe(0);
  });

  it('v2.1 validation passes (Step 2.5 pass logged to stdout)', () => {
    const result = runCloseSprint(sprintDir);
    expect(result.stdout).toMatch(/Step 2\.5 passed/);
  });

  it('REPORT.md contains all six §3 metric rows', () => {
    // The fixture REPORT.md already has these; close_sprint validates them
    const report = fs.readFileSync(path.join(sprintDir, 'REPORT.md'), 'utf8');
    expect(report).toMatch(/Fast-Track Ratio/);
    expect(report).toMatch(/Fast-Track Demotion Rate/);
    expect(report).toMatch(/Hotfix Count/);
    expect(report).toMatch(/Hotfix-to-Story Ratio/);
    expect(report).toMatch(/Hotfix Cap Breaches/);
    expect(report).toMatch(/LD events/);
  });

  it('REPORT.md contains Lane Audit section', () => {
    const report = fs.readFileSync(path.join(sprintDir, 'REPORT.md'), 'utf8');
    expect(report).toMatch(/Lane Audit/);
  });

  it('REPORT.md contains Hotfix Audit section', () => {
    const report = fs.readFileSync(path.join(sprintDir, 'REPORT.md'), 'utf8');
    expect(report).toMatch(/Hotfix Audit/);
  });

  it('REPORT.md contains Hotfix Trend section', () => {
    const report = fs.readFileSync(path.join(sprintDir, 'REPORT.md'), 'utf8');
    expect(report).toMatch(/Hotfix Trend/);
  });

  it('state.json sprint_status is flipped to Completed', () => {
    runCloseSprint(sprintDir);
    const state = JSON.parse(fs.readFileSync(path.join(sprintDir, 'state.json'), 'utf8'));
    expect(state.sprint_status).toBe('Completed');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// STORY-025-03: Scenario 7 — SPRINT-18+ sprints write SPRINT-<#>_REPORT.md
// ─────────────────────────────────────────────────────────────────────────────

describe('Scenario 7: SPRINT-18+ sprints write SPRINT-<#>_REPORT.md (not REPORT.md)', () => {
  let tmpBase: string;
  let sprintDir: string;

  beforeEach(() => {
    // Use sprint-v1-legacy as base (all-terminal stories, v1 schema)
    // but name the dir SPRINT-18 so the new naming applies.
    sprintDir = makeTempSprintDir('sprint-v1-legacy', 'SPRINT-18');
    tmpBase = path.dirname(sprintDir);
    // Remove the legacy REPORT.md copied from fixture so stdin mode can write the new name
    const legacyReport = path.join(sprintDir, 'REPORT.md');
    if (fs.existsSync(legacyReport)) fs.unlinkSync(legacyReport);
  });

  afterEach(() => {
    fs.rmSync(tmpBase, { recursive: true, force: true });
  });

  it('writes SPRINT-18_REPORT.md when piped via stdin', () => {
    const reportBody = '# Sprint Report — SPRINT-18\n\n## §1 What Was Delivered\n- Test\n';
    const stateFile = path.join(sprintDir, 'state.json');
    const result = spawnSync(
      '/usr/bin/env',
      ['node', CLOSE_SPRINT_SCRIPT, 'SPRINT-18', '--report-body-stdin'],
      {
        encoding: 'utf8',
        input: reportBody,
        timeout: 30_000,
        env: {
          ...process.env,
          CLEARGATE_SPRINT_DIR: sprintDir,
          CLEARGATE_STATE_FILE: stateFile,
          CLEARGATE_SKIP_WORKTREE_CHECK: '1',
          CLEARGATE_SKIP_LIFECYCLE_CHECK: '1',
        },
      },
    );
    expect(result.status).toBe(0);
    expect(fs.existsSync(path.join(sprintDir, 'SPRINT-18_REPORT.md'))).toBe(true);
  });

  it('does NOT create plain REPORT.md when using new naming', () => {
    const reportBody = '# Sprint Report — SPRINT-18\n\n## §1 What Was Delivered\n- Test\n';
    const stateFile = path.join(sprintDir, 'state.json');

    spawnSync(
      '/usr/bin/env',
      ['node', CLOSE_SPRINT_SCRIPT, 'SPRINT-18', '--report-body-stdin'],
      {
        encoding: 'utf8',
        input: reportBody,
        timeout: 30_000,
        env: {
          ...process.env,
          CLEARGATE_SPRINT_DIR: sprintDir,
          CLEARGATE_STATE_FILE: stateFile,
          CLEARGATE_SKIP_WORKTREE_CHECK: '1',
          CLEARGATE_SKIP_LIFECYCLE_CHECK: '1',
        },
      },
    );
    // REPORT.md should not have been created by close_sprint
    expect(fs.existsSync(path.join(sprintDir, 'REPORT.md'))).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// STORY-025-03: Scenario 8 — SPRINT-01..17 REPORT.md is NOT renamed
// ─────────────────────────────────────────────────────────────────────────────

describe('Scenario 8: SPRINT-01..17 archived REPORT.md keeps old name (backwards-compat)', () => {
  let tmpBase: string;
  let sprintDir: string;

  beforeEach(() => {
    // sprint-legacy-15 fixture has REPORT.md (legacy name) — not SPRINT-15_REPORT.md
    sprintDir = makeTempSprintDir('sprint-legacy-15', 'SPRINT-15');
    tmpBase = path.dirname(sprintDir);
  });

  afterEach(() => {
    fs.rmSync(tmpBase, { recursive: true, force: true });
  });

  it('exits 0 when closed with --assume-ack', () => {
    const result = runCloseSprint(sprintDir);
    expect(result.status).toBe(0);
  });

  it('legacy REPORT.md is NOT renamed or deleted', () => {
    runCloseSprint(sprintDir);
    expect(fs.existsSync(path.join(sprintDir, 'REPORT.md'))).toBe(true);
  });

  it('SPRINT-15_REPORT.md is NOT created', () => {
    runCloseSprint(sprintDir);
    expect(fs.existsSync(path.join(sprintDir, 'SPRINT-15_REPORT.md'))).toBe(false);
  });

  it('state.json sprint_status is flipped to Completed', () => {
    runCloseSprint(sprintDir);
    const state = JSON.parse(fs.readFileSync(path.join(sprintDir, 'state.json'), 'utf8'));
    expect(state.sprint_status).toBe('Completed');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// STORY-025-03: Scenario 9 — Step 3.5 success path
// ─────────────────────────────────────────────────────────────────────────────

describe('Scenario 9: Step 3.5 invokes prep_reporter_context.mjs and prints step message', () => {
  let tmpBase: string;
  let sprintDir: string;

  beforeEach(() => {
    sprintDir = makeTempSprintDir('sprint-v1-legacy', 'SPRINT-TEST');
    tmpBase = path.dirname(sprintDir);
    // Create token-ledger.jsonl so prep_reporter_context.mjs does not fail on missing ledger
    fs.writeFileSync(path.join(sprintDir, 'token-ledger.jsonl'), '', 'utf8');
  });

  afterEach(() => {
    fs.rmSync(tmpBase, { recursive: true, force: true });
  });

  it('stdout or stderr contains "Step 3.5" message', () => {
    const result = runCloseSprint(sprintDir);
    // Step 3.5 is always attempted — check combined output mentions it
    expect(result.stdout + result.stderr).toMatch(/Step 3\.5/);
  });

  it('pipeline exits 0 when Step 3.5 finishes (pass or warn)', () => {
    const result = runCloseSprint(sprintDir);
    expect(result.status).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// STORY-025-03: Scenario 10 — Step 3.5 failure is non-fatal
// ─────────────────────────────────────────────────────────────────────────────

describe('Scenario 10: Step 3.5 warns and continues if prep_reporter_context.mjs fails', () => {
  let tmpBase: string;
  let sprintDir: string;

  beforeEach(() => {
    // No token-ledger.jsonl → prep_reporter_context.mjs exits 1 (hard error per R4)
    sprintDir = makeTempSprintDir('sprint-v1-legacy', 'SPRINT-TEST');
    tmpBase = path.dirname(sprintDir);
    // Deliberately do NOT create token-ledger.jsonl
  });

  afterEach(() => {
    fs.rmSync(tmpBase, { recursive: true, force: true });
  });

  it('stderr contains "Step 3.5 warning" when prep_reporter_context.mjs fails', () => {
    const result = runCloseSprint(sprintDir);
    expect(result.stderr).toMatch(/Step 3\.5 warning/);
  });

  it('pipeline exits 0 despite Step 3.5 failure (non-fatal)', () => {
    const result = runCloseSprint(sprintDir);
    expect(result.status).toBe(0);
  });

  it('sprint_status is flipped to Completed even when Step 3.5 fails', () => {
    runCloseSprint(sprintDir);
    const state = JSON.parse(fs.readFileSync(path.join(sprintDir, 'state.json'), 'utf8'));
    expect(state.sprint_status).toBe('Completed');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// STORY-025-03: Scenario 11 — Step 7 skipped when CLI binary missing
// ─────────────────────────────────────────────────────────────────────────────

describe('Scenario 11: Step 7 skipped when cleargate-cli/dist/cli.js does not exist', () => {
  let tmpBase: string;
  let sprintDir: string;

  beforeEach(() => {
    sprintDir = makeTempSprintDir('sprint-v1-legacy', 'SPRINT-TEST');
    tmpBase = path.dirname(sprintDir);
  });

  afterEach(() => {
    fs.rmSync(tmpBase, { recursive: true, force: true });
  });

  it('stdout contains "Step 7 skipped: CLI binary not found" when dist/cli.js absent', () => {
    const cliBin = path.join(REPO_ROOT, 'cleargate-cli', 'dist', 'cli.js');
    if (fs.existsSync(cliBin)) {
      // CLI binary exists — skip this specific assertion (Scenario 12 applies instead)
      return;
    }
    const result = runCloseSprint(sprintDir);
    expect(result.stdout).toMatch(/Step 7 skipped: CLI binary not found/);
  });

  it('exit code is 0 whether Step 7 skips or warns', () => {
    const result = runCloseSprint(sprintDir);
    expect(result.status).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// STORY-025-03: Scenario 12 — Step 7 warns and continues when sync fails
// ─────────────────────────────────────────────────────────────────────────────

describe('Scenario 12: Step 7 warns and continues when sync work-items exits non-zero', () => {
  let tmpBase: string;
  let sprintDir: string;

  beforeEach(() => {
    sprintDir = makeTempSprintDir('sprint-v1-legacy', 'SPRINT-TEST');
    tmpBase = path.dirname(sprintDir);
  });

  afterEach(() => {
    fs.rmSync(tmpBase, { recursive: true, force: true });
  });

  it('sprint_status stays Completed even if Step 7 warns (Step 5 already flipped it)', () => {
    // Regardless of whether Step 7 skips or warns, sprint_status must be Completed
    const result = runCloseSprint(sprintDir);
    expect(result.status).toBe(0);
    const state = JSON.parse(fs.readFileSync(path.join(sprintDir, 'state.json'), 'utf8'));
    expect(state.sprint_status).toBe('Completed');
  });

  it('stdout contains "Step 7" (either passed or skipped or warned)', () => {
    const result = runCloseSprint(sprintDir);
    expect(result.stdout + result.stderr).toMatch(/Step 7/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// STORY-025-03: Scenario 13 — Step 5 wait-for-ack prompt references new filename
// ─────────────────────────────────────────────────────────────────────────────

describe('Scenario 13: Step 5 wait-for-ack prompt shows SPRINT-<#>_REPORT.md filename', () => {
  let tmpBase: string;
  let sprintDir: string;

  beforeEach(() => {
    // Create a temp dir named SPRINT-18 — no report file present
    // so the wait-for-ack prompt fires (or "Waiting for Reporter")
    const base = fs.mkdtempSync(path.join(os.tmpdir(), 'cg-close-sprint-s13-'));
    sprintDir = path.join(base, 'SPRINT-18');
    fs.mkdirSync(sprintDir, { recursive: true });
    tmpBase = base;

    // Copy minimal terminal state from v1-legacy fixture
    const fixtureState = path.join(FIXTURES_DIR, 'sprint-v1-legacy', 'state.json');
    if (fs.existsSync(fixtureState)) {
      const stateData = JSON.parse(fs.readFileSync(fixtureState, 'utf8'));
      stateData.sprint_id = 'SPRINT-18';
      fs.writeFileSync(
        path.join(sprintDir, 'state.json'),
        JSON.stringify(stateData, null, 2) + '\n',
        'utf8',
      );
    }
    // No report file — script will stop at the wait-for-ack step
  });

  afterEach(() => {
    fs.rmSync(tmpBase, { recursive: true, force: true });
  });

  it('Step 4 announcement mentions SPRINT-18_REPORT.md (not plain REPORT.md)', () => {
    const stateFile = path.join(sprintDir, 'state.json');
    // Run WITHOUT --assume-ack so Step 4 announcement + wait prompt fires
    const result = spawnSync(
      '/usr/bin/env',
      ['node', CLOSE_SPRINT_SCRIPT, 'SPRINT-18'],
      {
        encoding: 'utf8',
        timeout: 30_000,
        env: {
          ...process.env,
          CLEARGATE_SPRINT_DIR: sprintDir,
          CLEARGATE_STATE_FILE: stateFile,
          CLEARGATE_SKIP_WORKTREE_CHECK: '1',
          CLEARGATE_SKIP_LIFECYCLE_CHECK: '1',
        },
      },
    );
    // Script exits 0 at wait prompt
    expect(result.status).toBe(0);
    // The Step 4 announcement + wait message must contain new filename
    expect(result.stdout).toMatch(/SPRINT-18_REPORT\.md/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// STORY-025-03: Scenario 14 — SPRINT-TEST (no numeric portion) uses plain REPORT.md
// ─────────────────────────────────────────────────────────────────────────────

describe('Scenario 14: Sprint ID with no numeric portion (SPRINT-TEST) uses plain REPORT.md', () => {
  let tmpBase: string;
  let sprintDir: string;

  beforeEach(() => {
    sprintDir = makeTempSprintDir('sprint-v1-legacy', 'SPRINT-TEST');
    tmpBase = path.dirname(sprintDir);
    // Remove the fixture's REPORT.md so stdin mode writes a fresh one
    const legacyReport = path.join(sprintDir, 'REPORT.md');
    if (fs.existsSync(legacyReport)) fs.unlinkSync(legacyReport);
  });

  afterEach(() => {
    fs.rmSync(tmpBase, { recursive: true, force: true });
  });

  it('writes plain REPORT.md (not SPRINT-TEST_REPORT.md) for non-numeric sprint IDs', () => {
    const reportBody = '# Sprint Report — SPRINT-TEST\n\n## §1\n- Test\n';
    const stateFile = path.join(sprintDir, 'state.json');
    const result = spawnSync(
      '/usr/bin/env',
      ['node', CLOSE_SPRINT_SCRIPT, 'SPRINT-TEST', '--report-body-stdin'],
      {
        encoding: 'utf8',
        input: reportBody,
        timeout: 30_000,
        env: {
          ...process.env,
          CLEARGATE_SPRINT_DIR: sprintDir,
          CLEARGATE_STATE_FILE: stateFile,
          CLEARGATE_SKIP_WORKTREE_CHECK: '1',
          CLEARGATE_SKIP_LIFECYCLE_CHECK: '1',
        },
      },
    );
    expect(result.status).toBe(0);
    expect(fs.existsSync(path.join(sprintDir, 'REPORT.md'))).toBe(true);
    expect(fs.existsSync(path.join(sprintDir, 'SPRINT-TEST_REPORT.md'))).toBe(false);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// CR-022 M1: Step 2.7 worktree-closed pre-close check
// ─────────────────────────────────────────────────────────────────────────────

describe('Scenario 15: Step 2.7 skipped when CLEARGATE_SKIP_WORKTREE_CHECK=1 (test seam)', () => {
  // The CLEARGATE_SKIP_WORKTREE_CHECK=1 env var is the primary test seam for bypassing
  // Step 2.7. This is used in environments where running git worktree list is undesirable
  // or unreliable. Validates the skip message + pipeline progression.
  let tmpBase: string;
  let sprintDir: string;

  beforeEach(() => {
    sprintDir = makeTempSprintDir('sprint-v1-legacy', 'SPRINT-TEST');
    tmpBase = path.dirname(sprintDir);
  });

  afterEach(() => {
    fs.rmSync(tmpBase, { recursive: true, force: true });
  });

  function runWithSkipWorktreeCheck(sprintDirPath: string) {
    const sprintId = path.basename(sprintDirPath);
    const stateFile = path.join(sprintDirPath, 'state.json');
    return spawnSync(
      '/usr/bin/env',
      ['node', CLOSE_SPRINT_SCRIPT, sprintId, '--assume-ack'],
      {
        encoding: 'utf8',
        timeout: 30_000,
        env: {
          ...process.env,
          CLEARGATE_SPRINT_DIR: sprintDirPath,
          CLEARGATE_STATE_FILE: stateFile,
          CLEARGATE_SKIP_WORKTREE_CHECK: '1',
          CLEARGATE_SKIP_LIFECYCLE_CHECK: '1',
        },
      },
    );
  }

  it('stdout contains "Step 2.7 skipped: CLEARGATE_SKIP_WORKTREE_CHECK=1 set (test seam)"', () => {
    const result = runWithSkipWorktreeCheck(sprintDir);
    expect(result.stdout).toMatch(/Step 2\.7 skipped: CLEARGATE_SKIP_WORKTREE_CHECK=1 set \(test seam\)/);
  });

  it('exit code is 0 when Step 2.7 skips via test seam', () => {
    const result = runWithSkipWorktreeCheck(sprintDir);
    expect(result.status).toBe(0);
  });

  it('pipeline proceeds past Step 2.7 (Step 3 message also appears)', () => {
    const result = runWithSkipWorktreeCheck(sprintDir);
    expect(result.stdout).toMatch(/Step 3/);
  });

  it('state.json sprint_status is flipped to Completed', () => {
    runWithSkipWorktreeCheck(sprintDir);
    const state = JSON.parse(fs.readFileSync(path.join(sprintDir, 'state.json'), 'utf8'));
    expect(state.sprint_status).toBe('Completed');
  });
});

describe('Scenario 16: Step 2.7 blocks under v2 when leftover worktree present (CLEARGATE_FORCE_WORKTREE_PATHS env seam)', () => {
  // Uses CLEARGATE_FORCE_WORKTREE_PATHS to inject a fake .worktrees/STORY-NNN-NN path
  // without needing a real git repo or a real .worktrees/ directory.
  let tmpBase: string;
  let sprintDir: string;

  beforeEach(() => {
    // Use sprint-v2-no-fast (schema_version: 2, no fast-lane stories) so isV2=true
    // and the v2 enforcement path fires.
    sprintDir = makeTempSprintDir('sprint-v2-no-fast', 'SPRINT-TEST');
    tmpBase = path.dirname(sprintDir);
  });

  afterEach(() => {
    fs.rmSync(tmpBase, { recursive: true, force: true });
  });

  function runWithFakeWorktree(sprintDirPath: string, fakePath: string) {
    const sprintId = path.basename(sprintDirPath);
    const stateFile = path.join(sprintDirPath, 'state.json');
    return spawnSync(
      '/usr/bin/env',
      ['node', CLOSE_SPRINT_SCRIPT, sprintId, '--assume-ack'],
      {
        encoding: 'utf8',
        timeout: 30_000,
        env: {
          ...process.env,
          CLEARGATE_SPRINT_DIR: sprintDirPath,
          CLEARGATE_STATE_FILE: stateFile,
          CLEARGATE_SKIP_LIFECYCLE_CHECK: '1',
          CLEARGATE_FORCE_WORKTREE_PATHS: fakePath,
        },
      },
    );
  }

  it('exits 1 when a STORY-prefixed leftover worktree is injected under v2', () => {
    const result = runWithFakeWorktree(sprintDir, '.worktrees/STORY-019-01');
    expect(result.status).toBe(1);
  });

  it('stderr contains "Step 2.7 failed: leftover worktree at .worktrees/STORY-019-01"', () => {
    const result = runWithFakeWorktree(sprintDir, '.worktrees/STORY-019-01');
    expect(result.stderr).toMatch(/Step 2\.7 failed: leftover worktree at \.worktrees\/STORY-019-01/);
  });

  it('stderr contains git worktree remove hint', () => {
    const result = runWithFakeWorktree(sprintDir, '.worktrees/STORY-019-01');
    expect(result.stderr).toMatch(/git worktree remove/);
  });

  it('state.json sprint_status stays Active (not flipped to Completed)', () => {
    runWithFakeWorktree(sprintDir, '.worktrees/STORY-019-01');
    const state = JSON.parse(fs.readFileSync(path.join(sprintDir, 'state.json'), 'utf8'));
    expect(state.sprint_status).toBe('Active');
  });
});

describe('Scenario 17: Step 2.7 advisory under v1 — warn + continue (CLEARGATE_FORCE_WORKTREE_PATHS env seam)', () => {
  // The v1 advisory path fires when isEnforcingV2 = false (i.e. execution_mode !== "v2").
  // We create a v2-schema sprint (passes validateState) but with execution_mode: "v1"
  // so that Step 2.7 treats it as advisory rather than enforcing.
  // This exercises: warn + continue, exit 0 even with a leftover worktree.
  let tmpBase: string;
  let sprintDir: string;

  beforeEach(() => {
    // Create a sprint with schema_version: 2 (passes validateState) but execution_mode: "v1"
    // so isEnforcingV2 = isV2 && state.execution_mode === 'v2' = true && false = false.
    const base = fs.mkdtempSync(path.join(os.tmpdir(), 'cg-close-sprint-s17-'));
    sprintDir = path.join(base, 'SPRINT-TEST');
    fs.mkdirSync(sprintDir, { recursive: true });
    tmpBase = base;
    const stateV2SchemaV1Mode = {
      schema_version: 2,
      sprint_id: 'SPRINT-TEST',
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
    fs.writeFileSync(
      path.join(sprintDir, 'state.json'),
      JSON.stringify(stateV2SchemaV1Mode, null, 2) + '\n',
      'utf8',
    );
    // Copy REPORT.md from sprint-v1-legacy fixture so the pipeline can complete
    const legacyReport = path.join(FIXTURES_DIR, 'sprint-v1-legacy', 'REPORT.md');
    if (fs.existsSync(legacyReport)) {
      fs.copyFileSync(legacyReport, path.join(sprintDir, 'REPORT.md'));
    }
  });

  afterEach(() => {
    fs.rmSync(tmpBase, { recursive: true, force: true });
  });

  function runWithFakeWorktreeV1(sprintDirPath: string, fakePath: string) {
    const sprintId = path.basename(sprintDirPath);
    const stateFile = path.join(sprintDirPath, 'state.json');
    return spawnSync(
      '/usr/bin/env',
      ['node', CLOSE_SPRINT_SCRIPT, sprintId, '--assume-ack'],
      {
        encoding: 'utf8',
        timeout: 30_000,
        env: {
          ...process.env,
          CLEARGATE_SPRINT_DIR: sprintDirPath,
          CLEARGATE_STATE_FILE: stateFile,
          CLEARGATE_SKIP_LIFECYCLE_CHECK: '1',
          CLEARGATE_FORCE_WORKTREE_PATHS: fakePath,
        },
      },
    );
  }

  it('exit code is 0 despite leftover worktree (advisory in v1)', () => {
    const result = runWithFakeWorktreeV1(sprintDir, '.worktrees/STORY-019-02');
    expect(result.status).toBe(0);
  });

  it('stderr contains "Step 2.7 warning: leftover worktree at .worktrees/STORY-019-02 (advisory in v1)"', () => {
    const result = runWithFakeWorktreeV1(sprintDir, '.worktrees/STORY-019-02');
    expect(result.stderr).toMatch(/Step 2\.7 warning: leftover worktree at \.worktrees\/STORY-019-02 \(advisory in v1\)/);
  });

  it('pipeline proceeds past Step 2.7 (Step 3 message also appears)', () => {
    const result = runWithFakeWorktreeV1(sprintDir, '.worktrees/STORY-019-02');
    expect(result.stdout).toMatch(/Step 3/);
  });

  it('state.json sprint_status is flipped to Completed (pipeline continues)', () => {
    runWithFakeWorktreeV1(sprintDir, '.worktrees/STORY-019-02');
    const state = JSON.parse(fs.readFileSync(path.join(sprintDir, 'state.json'), 'utf8'));
    expect(state.sprint_status).toBe('Completed');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// CR-022 M2: Step 2.8 sprint-merged-to-main verify
// ─────────────────────────────────────────────────────────────────────────────

describe('Scenario 18: Step 2.8 skipped via CLEARGATE_SKIP_MERGE_CHECK=1 (test seam)', () => {
  // Validates the skip seam: when CLEARGATE_SKIP_MERGE_CHECK=1 is set, Step 2.8
  // emits a skip message and the pipeline continues to Step 3.
  let tmpBase: string;
  let sprintDir: string;

  beforeEach(() => {
    sprintDir = makeTempSprintDir('sprint-v2-no-fast', 'SPRINT-TEST');
    tmpBase = path.dirname(sprintDir);
  });

  afterEach(() => {
    fs.rmSync(tmpBase, { recursive: true, force: true });
  });

  function runWithSkipMergeCheck(sprintDirPath: string) {
    const sprintId = path.basename(sprintDirPath);
    const stateFile = path.join(sprintDirPath, 'state.json');
    return spawnSync(
      '/usr/bin/env',
      ['node', CLOSE_SPRINT_SCRIPT, sprintId, '--assume-ack'],
      {
        encoding: 'utf8',
        timeout: 30_000,
        env: {
          ...process.env,
          CLEARGATE_SPRINT_DIR: sprintDirPath,
          CLEARGATE_STATE_FILE: stateFile,
          CLEARGATE_SKIP_WORKTREE_CHECK: '1',
          CLEARGATE_SKIP_LIFECYCLE_CHECK: '1',
          CLEARGATE_SKIP_MERGE_CHECK: '1',
        },
      },
    );
  }

  it('stdout contains "Step 2.8 skipped: CLEARGATE_SKIP_MERGE_CHECK=1 set (test seam)"', () => {
    const result = runWithSkipMergeCheck(sprintDir);
    expect(result.stdout).toMatch(/Step 2\.8 skipped: CLEARGATE_SKIP_MERGE_CHECK=1 set \(test seam\)/);
  });

  it('exit code is 0 when Step 2.8 skips via test seam', () => {
    const result = runWithSkipMergeCheck(sprintDir);
    expect(result.status).toBe(0);
  });

  it('pipeline proceeds past Step 2.8 (Step 3 message also appears)', () => {
    const result = runWithSkipMergeCheck(sprintDir);
    expect(result.stdout).toMatch(/Step 3/);
  });

  it('state.json sprint_status is flipped to Completed', () => {
    runWithSkipMergeCheck(sprintDir);
    const state = JSON.parse(fs.readFileSync(path.join(sprintDir, 'state.json'), 'utf8'));
    expect(state.sprint_status).toBe('Completed');
  });
});

describe('Scenario 19: Step 2.8 blocks under v2 when sprint branch unmerged (CLEARGATE_FORCE_MERGE_STATUS=unmerged seam)', () => {
  // Uses CLEARGATE_FORCE_MERGE_STATUS=unmerged to simulate an unmerged sprint branch
  // without needing a real git repo. Under v2 execution_mode, Step 2.8 must exit 1.
  let tmpBase: string;
  let sprintDir: string;

  beforeEach(() => {
    // Use SPRINT-19 (numeric portion) so the sprintNumMatch fires and Step 2.8 runs.
    const base = fs.mkdtempSync(path.join(os.tmpdir(), 'cg-close-sprint-s19-'));
    sprintDir = path.join(base, 'SPRINT-19');
    fs.mkdirSync(sprintDir, { recursive: true });
    tmpBase = base;
    const stateV2 = {
      schema_version: 2,
      sprint_id: 'SPRINT-19',
      execution_mode: 'v2',
      sprint_status: 'Active',
      stories: {
        'STORY-019-01': {
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
    fs.writeFileSync(
      path.join(sprintDir, 'state.json'),
      JSON.stringify(stateV2, null, 2) + '\n',
      'utf8',
    );
    // Copy REPORT.md from sprint-v1-legacy so the pipeline can reach Step 2.8
    const legacyReport = path.join(FIXTURES_DIR, 'sprint-v1-legacy', 'REPORT.md');
    if (fs.existsSync(legacyReport)) {
      fs.copyFileSync(legacyReport, path.join(sprintDir, 'REPORT.md'));
    }
  });

  afterEach(() => {
    fs.rmSync(tmpBase, { recursive: true, force: true });
  });

  function runWithForcedUnmergedV2(sprintDirPath: string) {
    const sprintId = path.basename(sprintDirPath);
    const stateFile = path.join(sprintDirPath, 'state.json');
    return spawnSync(
      '/usr/bin/env',
      ['node', CLOSE_SPRINT_SCRIPT, sprintId, '--assume-ack'],
      {
        encoding: 'utf8',
        timeout: 30_000,
        env: {
          ...process.env,
          CLEARGATE_SPRINT_DIR: sprintDirPath,
          CLEARGATE_STATE_FILE: stateFile,
          CLEARGATE_SKIP_WORKTREE_CHECK: '1',
          CLEARGATE_SKIP_LIFECYCLE_CHECK: '1',
          CLEARGATE_FORCE_MERGE_STATUS: 'unmerged',
        },
      },
    );
  }

  it('exits 1 when sprint branch is unmerged under v2', () => {
    const result = runWithForcedUnmergedV2(sprintDir);
    expect(result.status).toBe(1);
  });

  it('stderr contains "Step 2.8 failed: sprint/S-19 not merged to main"', () => {
    const result = runWithForcedUnmergedV2(sprintDir);
    expect(result.stderr).toMatch(/Step 2\.8 failed: sprint\/S-19 not merged to main/);
  });

  it('stderr contains "Resolve: merge sprint/S-19" hint', () => {
    const result = runWithForcedUnmergedV2(sprintDir);
    expect(result.stderr).toMatch(/Resolve: merge sprint\/S-19/);
  });

  it('state.json sprint_status stays Active (not flipped to Completed)', () => {
    runWithForcedUnmergedV2(sprintDir);
    const state = JSON.parse(fs.readFileSync(path.join(sprintDir, 'state.json'), 'utf8'));
    expect(state.sprint_status).toBe('Active');
  });
});

describe('Scenario 20: Step 2.8 advisory under v1 — warn + continue (CLEARGATE_FORCE_MERGE_STATUS=unmerged seam)', () => {
  // Under v1 execution_mode, Step 2.8 emits a warning to stderr but does NOT exit 1.
  // The pipeline continues and sprint_status flips to Completed.
  let tmpBase: string;
  let sprintDir: string;

  beforeEach(() => {
    // Use SPRINT-19 (numeric portion) so the sprintNumMatch fires and Step 2.8 runs.
    const base = fs.mkdtempSync(path.join(os.tmpdir(), 'cg-close-sprint-s20-'));
    sprintDir = path.join(base, 'SPRINT-19');
    fs.mkdirSync(sprintDir, { recursive: true });
    tmpBase = base;
    const stateV2SchemaV1Mode = {
      schema_version: 2,
      sprint_id: 'SPRINT-19',
      execution_mode: 'v1',
      sprint_status: 'Active',
      stories: {
        'STORY-019-01': {
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
    fs.writeFileSync(
      path.join(sprintDir, 'state.json'),
      JSON.stringify(stateV2SchemaV1Mode, null, 2) + '\n',
      'utf8',
    );
    // Copy REPORT.md from sprint-v1-legacy so the pipeline can complete
    const legacyReport = path.join(FIXTURES_DIR, 'sprint-v1-legacy', 'REPORT.md');
    if (fs.existsSync(legacyReport)) {
      fs.copyFileSync(legacyReport, path.join(sprintDir, 'REPORT.md'));
    }
  });

  afterEach(() => {
    fs.rmSync(tmpBase, { recursive: true, force: true });
  });

  function runWithForcedUnmergedV1(sprintDirPath: string) {
    const sprintId = path.basename(sprintDirPath);
    const stateFile = path.join(sprintDirPath, 'state.json');
    return spawnSync(
      '/usr/bin/env',
      ['node', CLOSE_SPRINT_SCRIPT, sprintId, '--assume-ack'],
      {
        encoding: 'utf8',
        timeout: 30_000,
        env: {
          ...process.env,
          CLEARGATE_SPRINT_DIR: sprintDirPath,
          CLEARGATE_STATE_FILE: stateFile,
          CLEARGATE_SKIP_WORKTREE_CHECK: '1',
          CLEARGATE_SKIP_LIFECYCLE_CHECK: '1',
          CLEARGATE_FORCE_MERGE_STATUS: 'unmerged',
        },
      },
    );
  }

  it('exit code is 0 despite unmerged sprint branch (advisory in v1)', () => {
    const result = runWithForcedUnmergedV1(sprintDir);
    expect(result.status).toBe(0);
  });

  it('stderr contains "Step 2.8 warning: sprint/S-19 not merged to main (advisory in v1)"', () => {
    const result = runWithForcedUnmergedV1(sprintDir);
    expect(result.stderr).toMatch(/Step 2\.8 warning: sprint\/S-19 not merged to main \(advisory in v1\)/);
  });

  it('pipeline proceeds past Step 2.8 (Step 3 message also appears)', () => {
    const result = runWithForcedUnmergedV1(sprintDir);
    expect(result.stdout).toMatch(/Step 3/);
  });

  it('state.json sprint_status is flipped to Completed (pipeline continues)', () => {
    runWithForcedUnmergedV1(sprintDir);
    const state = JSON.parse(fs.readFileSync(path.join(sprintDir, 'state.json'), 'utf8'));
    expect(state.sprint_status).toBe('Completed');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Scenario 21: Step 6.5 sprint_trends stub writes Trends section
// ─────────────────────────────────────────────────────────────────────────────

describe('Scenario 21: Step 6.5 sprint_trends stub writes Trends section', () => {
  let tmpBase: string;
  let sprintDir: string;

  beforeEach(() => {
    sprintDir = makeTempSprintDir('sprint-v1-legacy', 'SPRINT-TEST');
    tmpBase = path.dirname(sprintDir);
  });

  afterEach(() => {
    fs.rmSync(tmpBase, { recursive: true, force: true });
  });

  it('improvement-suggestions.md contains "## Trends" section after pipeline runs', () => {
    const sprintRunsDir = path.dirname(sprintDir);
    const result = spawnSync(
      '/usr/bin/env',
      ['node', CLOSE_SPRINT_SCRIPT, 'SPRINT-TEST', '--assume-ack'],
      {
        encoding: 'utf8',
        timeout: 30_000,
        env: {
          ...process.env,
          CLEARGATE_SPRINT_DIR: sprintDir,
          CLEARGATE_STATE_FILE: path.join(sprintDir, 'state.json'),
          CLEARGATE_SKIP_WORKTREE_CHECK: '1',
          CLEARGATE_SKIP_LIFECYCLE_CHECK: '1',
          CLEARGATE_SKIP_MERGE_CHECK: '1',
          CLEARGATE_SPRINT_RUNS_DIR: sprintRunsDir,
          CLEARGATE_SKIP_SKILL_CANDIDATES: '1',
          CLEARGATE_SKIP_FLASHCARD_CLEANUP: '1',
        },
      },
    );
    expect(result.status).toBe(0);
    const suggestionsFile = path.join(sprintDir, 'improvement-suggestions.md');
    expect(fs.existsSync(suggestionsFile)).toBe(true);
    const content = fs.readFileSync(suggestionsFile, 'utf8');
    expect(content).toMatch(/## Trends/);
    expect(content).toMatch(/full analysis deferred to CR-027/);
  });

  it('stdout contains "Step 6.5:" message', () => {
    const sprintRunsDir = path.dirname(sprintDir);
    const result = spawnSync(
      '/usr/bin/env',
      ['node', CLOSE_SPRINT_SCRIPT, 'SPRINT-TEST', '--assume-ack'],
      {
        encoding: 'utf8',
        timeout: 30_000,
        env: {
          ...process.env,
          CLEARGATE_SPRINT_DIR: sprintDir,
          CLEARGATE_STATE_FILE: path.join(sprintDir, 'state.json'),
          CLEARGATE_SKIP_WORKTREE_CHECK: '1',
          CLEARGATE_SKIP_LIFECYCLE_CHECK: '1',
          CLEARGATE_SKIP_MERGE_CHECK: '1',
          CLEARGATE_SPRINT_RUNS_DIR: sprintRunsDir,
          CLEARGATE_SKIP_SKILL_CANDIDATES: '1',
          CLEARGATE_SKIP_FLASHCARD_CLEANUP: '1',
        },
      },
    );
    expect(result.stdout).toMatch(/Step 6\.5/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Scenario 22: Step 6.5 sprint_trends warns + continues if stub fails
// ─────────────────────────────────────────────────────────────────────────────

describe('Scenario 22: Step 6.5 sprint_trends warns + continues if stub fails', () => {
  let tmpBase: string;
  let sprintDir: string;
  let fakeScriptsDir: string;

  beforeEach(() => {
    sprintDir = makeTempSprintDir('sprint-v1-legacy', 'SPRINT-TEST');
    tmpBase = path.dirname(sprintDir);
    // Create a fake scripts dir WITHOUT sprint_trends.mjs to simulate script-not-found
    fakeScriptsDir = path.join(tmpBase, 'scripts');
    fs.mkdirSync(fakeScriptsDir, { recursive: true });
    // Copy all scripts except sprint_trends.mjs
    const srcDir = path.join(REPO_ROOT, '.cleargate', 'scripts');
    for (const f of fs.readdirSync(srcDir)) {
      if (f === 'sprint_trends.mjs') continue;
      const src = path.join(srcDir, f);
      const dst = path.join(fakeScriptsDir, f);
      if (fs.statSync(src).isFile()) fs.copyFileSync(src, dst);
    }
    // Copy lib subdirectory
    const libSrc = path.join(srcDir, 'lib');
    const libDst = path.join(fakeScriptsDir, 'lib');
    if (fs.existsSync(libSrc)) {
      fs.mkdirSync(libDst, { recursive: true });
      for (const f of fs.readdirSync(libSrc)) {
        fs.copyFileSync(path.join(libSrc, f), path.join(libDst, f));
      }
    }
  });

  afterEach(() => {
    fs.rmSync(tmpBase, { recursive: true, force: true });
  });

  it('exit code is still 0 when sprint_trends.mjs is missing (non-fatal)', () => {
    // Use the fake scripts dir that lacks sprint_trends.mjs by invoking
    // close_sprint.mjs from the fake scripts dir
    const fakeCloseSprint = path.join(fakeScriptsDir, 'close_sprint.mjs');
    const result = spawnSync(
      '/usr/bin/env',
      ['node', fakeCloseSprint, 'SPRINT-TEST', '--assume-ack'],
      {
        encoding: 'utf8',
        timeout: 30_000,
        env: {
          ...process.env,
          CLEARGATE_SPRINT_DIR: sprintDir,
          CLEARGATE_STATE_FILE: path.join(sprintDir, 'state.json'),
          CLEARGATE_SKIP_WORKTREE_CHECK: '1',
          CLEARGATE_SKIP_LIFECYCLE_CHECK: '1',
          CLEARGATE_SKIP_MERGE_CHECK: '1',
          CLEARGATE_SKIP_SKILL_CANDIDATES: '1',
          CLEARGATE_SKIP_FLASHCARD_CLEANUP: '1',
        },
      },
    );
    expect(result.status).toBe(0);
  });

  it('stderr contains "Step 6.5 warning" when sprint_trends.mjs is missing', () => {
    const fakeCloseSprint = path.join(fakeScriptsDir, 'close_sprint.mjs');
    const result = spawnSync(
      '/usr/bin/env',
      ['node', fakeCloseSprint, 'SPRINT-TEST', '--assume-ack'],
      {
        encoding: 'utf8',
        timeout: 30_000,
        env: {
          ...process.env,
          CLEARGATE_SPRINT_DIR: sprintDir,
          CLEARGATE_STATE_FILE: path.join(sprintDir, 'state.json'),
          CLEARGATE_SKIP_WORKTREE_CHECK: '1',
          CLEARGATE_SKIP_LIFECYCLE_CHECK: '1',
          CLEARGATE_SKIP_MERGE_CHECK: '1',
          CLEARGATE_SKIP_SKILL_CANDIDATES: '1',
          CLEARGATE_SKIP_FLASHCARD_CLEANUP: '1',
        },
      },
    );
    expect(result.stderr).toMatch(/Step 6\.5 warning/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Scenario 23: Step 6.6 skill candidates section emitted (placeholder when empty)
// ─────────────────────────────────────────────────────────────────────────────

describe('Scenario 23: Step 6.6 skill candidates section emitted (placeholder when empty)', () => {
  let tmpBase: string;
  let sprintDir: string;

  beforeEach(() => {
    sprintDir = makeTempSprintDir('sprint-v1-legacy', 'SPRINT-TEST');
    tmpBase = path.dirname(sprintDir);
  });

  afterEach(() => {
    fs.rmSync(tmpBase, { recursive: true, force: true });
  });

  function runWithSkipAll(extraEnv: Record<string, string> = {}) {
    return spawnSync(
      '/usr/bin/env',
      ['node', CLOSE_SPRINT_SCRIPT, 'SPRINT-TEST', '--assume-ack'],
      {
        encoding: 'utf8',
        timeout: 30_000,
        env: {
          ...process.env,
          CLEARGATE_SPRINT_DIR: sprintDir,
          CLEARGATE_STATE_FILE: path.join(sprintDir, 'state.json'),
          CLEARGATE_SKIP_WORKTREE_CHECK: '1',
          CLEARGATE_SKIP_LIFECYCLE_CHECK: '1',
          CLEARGATE_SKIP_MERGE_CHECK: '1',
          CLEARGATE_SKIP_SPRINT_TRENDS: '1',
          CLEARGATE_SKIP_FLASHCARD_CLEANUP: '1',
          // Use an empty temp flashcard so no candidates are detected
          CLEARGATE_FLASHCARD_PATH: path.join(tmpBase, 'empty-flashcard.md'),
          ...extraEnv,
        },
      },
    );
  }

  beforeEach(() => {
    // Create empty flashcard file
    fs.writeFileSync(path.join(tmpBase, 'empty-flashcard.md'), '# ClearGate Flashcards\n\n', 'utf8');
  });

  it('improvement-suggestions.md contains "## Skill Creation Candidates" section', () => {
    const result = runWithSkipAll();
    expect(result.status).toBe(0);
    const suggestionsFile = path.join(sprintDir, 'improvement-suggestions.md');
    expect(fs.existsSync(suggestionsFile)).toBe(true);
    const content = fs.readFileSync(suggestionsFile, 'utf8');
    expect(content).toMatch(/## Skill Creation Candidates/);
  });

  it('section contains placeholder "_No candidates detected this sprint._" when no ledger or matching flashcards', () => {
    const result = runWithSkipAll();
    expect(result.status).toBe(0);
    const content = fs.readFileSync(path.join(sprintDir, 'improvement-suggestions.md'), 'utf8');
    expect(content).toMatch(/_No candidates detected this sprint\./);
  });

  it('stdout contains "Step 6.6:" message', () => {
    const result = runWithSkipAll();
    expect(result.stdout).toMatch(/Step 6\.6/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Scenario 24: Step 6.6 surfaces CAND-<sprint>-S<n> when ledger has ≥3× repeated tuple
// ─────────────────────────────────────────────────────────────────────────────

describe('Scenario 24: Step 6.6 surfaces CAND entry when ledger has ≥3× repeated tuple', () => {
  let tmpBase: string;
  let sprintDir: string;

  beforeEach(() => {
    sprintDir = makeTempSprintDir('sprint-v1-legacy', 'SPRINT-TEST');
    tmpBase = path.dirname(sprintDir);

    // Inject a synthetic token-ledger.jsonl with a repeated (work_item_id, agent_type) tuple
    const ledgerLines = [
      JSON.stringify({ work_item_id: 'STORY-TEST-01', agent_type: 'developer', tokens: 100 }),
      JSON.stringify({ work_item_id: 'STORY-TEST-01', agent_type: 'developer', tokens: 200 }),
      JSON.stringify({ work_item_id: 'STORY-TEST-01', agent_type: 'developer', tokens: 150 }),
    ];
    fs.writeFileSync(path.join(sprintDir, 'token-ledger.jsonl'), ledgerLines.join('\n') + '\n', 'utf8');
    // Empty flashcard to avoid flashcard-pattern candidates
    fs.writeFileSync(path.join(tmpBase, 'empty-flashcard.md'), '# ClearGate Flashcards\n\n', 'utf8');
  });

  afterEach(() => {
    fs.rmSync(tmpBase, { recursive: true, force: true });
  });

  it('improvement-suggestions.md contains CAND-SPRINT-TEST-S entry', () => {
    const result = spawnSync(
      '/usr/bin/env',
      ['node', CLOSE_SPRINT_SCRIPT, 'SPRINT-TEST', '--assume-ack'],
      {
        encoding: 'utf8',
        timeout: 30_000,
        env: {
          ...process.env,
          CLEARGATE_SPRINT_DIR: sprintDir,
          CLEARGATE_STATE_FILE: path.join(sprintDir, 'state.json'),
          CLEARGATE_SKIP_WORKTREE_CHECK: '1',
          CLEARGATE_SKIP_LIFECYCLE_CHECK: '1',
          CLEARGATE_SKIP_MERGE_CHECK: '1',
          CLEARGATE_SKIP_SPRINT_TRENDS: '1',
          CLEARGATE_SKIP_FLASHCARD_CLEANUP: '1',
          CLEARGATE_FLASHCARD_PATH: path.join(tmpBase, 'empty-flashcard.md'),
        },
      },
    );
    expect(result.status).toBe(0);
    const content = fs.readFileSync(path.join(sprintDir, 'improvement-suggestions.md'), 'utf8');
    expect(content).toMatch(/CAND-SPRINT-TEST-S\d+/);
    expect(content).toMatch(/STORY-TEST-01/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Scenario 25: Step 6.7 FLASHCARD cleanup section emitted (placeholder when empty)
// ─────────────────────────────────────────────────────────────────────────────

describe('Scenario 25: Step 6.7 FLASHCARD cleanup section emitted (placeholder when empty)', () => {
  let tmpBase: string;
  let sprintDir: string;

  beforeEach(() => {
    sprintDir = makeTempSprintDir('sprint-v1-legacy', 'SPRINT-TEST');
    tmpBase = path.dirname(sprintDir);
    // Use a temp sprint runs dir with no sibling sprints → lookback yields 0 dirs → no stale candidates
    fs.writeFileSync(path.join(tmpBase, 'empty-flashcard.md'), '# ClearGate Flashcards\n\n', 'utf8');
  });

  afterEach(() => {
    fs.rmSync(tmpBase, { recursive: true, force: true });
  });

  it('improvement-suggestions.md contains "## FLASHCARD Cleanup Candidates" section', () => {
    const result = spawnSync(
      '/usr/bin/env',
      ['node', CLOSE_SPRINT_SCRIPT, 'SPRINT-TEST', '--assume-ack'],
      {
        encoding: 'utf8',
        timeout: 30_000,
        env: {
          ...process.env,
          CLEARGATE_SPRINT_DIR: sprintDir,
          CLEARGATE_STATE_FILE: path.join(sprintDir, 'state.json'),
          CLEARGATE_SKIP_WORKTREE_CHECK: '1',
          CLEARGATE_SKIP_LIFECYCLE_CHECK: '1',
          CLEARGATE_SKIP_MERGE_CHECK: '1',
          CLEARGATE_SKIP_SPRINT_TRENDS: '1',
          CLEARGATE_SKIP_SKILL_CANDIDATES: '1',
          CLEARGATE_FLASHCARD_PATH: path.join(tmpBase, 'empty-flashcard.md'),
          CLEARGATE_SPRINT_RUNS_DIR: tmpBase,
        },
      },
    );
    expect(result.status).toBe(0);
    const suggestionsFile = path.join(sprintDir, 'improvement-suggestions.md');
    expect(fs.existsSync(suggestionsFile)).toBe(true);
    const content = fs.readFileSync(suggestionsFile, 'utf8');
    expect(content).toMatch(/## FLASHCARD Cleanup Candidates/);
  });

  it('section contains placeholder "_No candidates detected this sprint._" when FLASHCARD.md is empty', () => {
    const result = spawnSync(
      '/usr/bin/env',
      ['node', CLOSE_SPRINT_SCRIPT, 'SPRINT-TEST', '--assume-ack'],
      {
        encoding: 'utf8',
        timeout: 30_000,
        env: {
          ...process.env,
          CLEARGATE_SPRINT_DIR: sprintDir,
          CLEARGATE_STATE_FILE: path.join(sprintDir, 'state.json'),
          CLEARGATE_SKIP_WORKTREE_CHECK: '1',
          CLEARGATE_SKIP_LIFECYCLE_CHECK: '1',
          CLEARGATE_SKIP_MERGE_CHECK: '1',
          CLEARGATE_SKIP_SPRINT_TRENDS: '1',
          CLEARGATE_SKIP_SKILL_CANDIDATES: '1',
          CLEARGATE_FLASHCARD_PATH: path.join(tmpBase, 'empty-flashcard.md'),
          CLEARGATE_SPRINT_RUNS_DIR: tmpBase,
        },
      },
    );
    expect(result.status).toBe(0);
    const content = fs.readFileSync(path.join(sprintDir, 'improvement-suggestions.md'), 'utf8');
    expect(content).toMatch(/_No candidates detected this sprint\./);
  });

  it('stdout contains "Step 6.7:" message', () => {
    const result = spawnSync(
      '/usr/bin/env',
      ['node', CLOSE_SPRINT_SCRIPT, 'SPRINT-TEST', '--assume-ack'],
      {
        encoding: 'utf8',
        timeout: 30_000,
        env: {
          ...process.env,
          CLEARGATE_SPRINT_DIR: sprintDir,
          CLEARGATE_STATE_FILE: path.join(sprintDir, 'state.json'),
          CLEARGATE_SKIP_WORKTREE_CHECK: '1',
          CLEARGATE_SKIP_LIFECYCLE_CHECK: '1',
          CLEARGATE_SKIP_MERGE_CHECK: '1',
          CLEARGATE_SKIP_SPRINT_TRENDS: '1',
          CLEARGATE_SKIP_SKILL_CANDIDATES: '1',
          CLEARGATE_FLASHCARD_PATH: path.join(tmpBase, 'empty-flashcard.md'),
          CLEARGATE_SPRINT_RUNS_DIR: tmpBase,
        },
      },
    );
    expect(result.stdout).toMatch(/Step 6\.7/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Scenario 26: Step 6.7 surfaces stale candidate when keyword has zero grep hits
// ─────────────────────────────────────────────────────────────────────────────

describe('Scenario 26: Step 6.7 surfaces stale candidate when keyword has zero grep hits across last 3 sprint dirs', () => {
  let tmpBase: string;
  let sprintDir: string;
  let sprintRunsDir: string;

  beforeEach(() => {
    // Create a sprint runs dir with SPRINT-19 as current sprint
    const base = fs.mkdtempSync(path.join(os.tmpdir(), 'cg-close-sprint-s26-'));
    tmpBase = base;
    sprintRunsDir = path.join(base, 'sprint-runs');
    fs.mkdirSync(sprintRunsDir, { recursive: true });
    sprintDir = path.join(sprintRunsDir, 'SPRINT-19');
    fs.mkdirSync(sprintDir, { recursive: true });

    // Copy sprint-v1-legacy fixture state + report
    const fixturePath = path.join(FIXTURES_DIR, 'sprint-v1-legacy');
    fs.copyFileSync(path.join(fixturePath, 'state.json'), path.join(sprintDir, 'state.json'));
    // Replace sprint_id in state to SPRINT-19
    const state = JSON.parse(fs.readFileSync(path.join(sprintDir, 'state.json'), 'utf8'));
    state.sprint_id = 'SPRINT-19';
    fs.writeFileSync(path.join(sprintDir, 'state.json'), JSON.stringify(state, null, 2) + '\n', 'utf8');
    fs.copyFileSync(path.join(fixturePath, 'REPORT.md'), path.join(sprintDir, 'REPORT.md'));

    // Create 3 sibling sprint dirs (SPRINT-18, SPRINT-17, SPRINT-16) with empty content
    // (keyword 'uniqueobscurelesson' won't appear in any of them)
    for (const sid of ['SPRINT-18', 'SPRINT-17', 'SPRINT-16']) {
      const sibDir = path.join(sprintRunsDir, sid);
      fs.mkdirSync(sibDir, { recursive: true });
      fs.writeFileSync(path.join(sibDir, 'state.json'), JSON.stringify({ sprint_status: 'Completed' }, null, 2), 'utf8');
    }

    // Create a synthetic FLASHCARD.md with an entry whose keyword won't appear in sibling dirs
    const fcContent = [
      '# ClearGate Flashcards',
      '',
      '2026-01-01 · #test #stale · uniqueobscurelesson: this entry should be flagged as stale',
      '',
    ].join('\n');
    fs.writeFileSync(path.join(base, 'test-flashcard.md'), fcContent, 'utf8');
  });

  afterEach(() => {
    fs.rmSync(tmpBase, { recursive: true, force: true });
  });

  it('improvement-suggestions.md contains CAND-SPRINT-19-F entry for stale flashcard', () => {
    const result = spawnSync(
      '/usr/bin/env',
      ['node', CLOSE_SPRINT_SCRIPT, 'SPRINT-19', '--assume-ack'],
      {
        encoding: 'utf8',
        timeout: 30_000,
        env: {
          ...process.env,
          CLEARGATE_SPRINT_DIR: sprintDir,
          CLEARGATE_STATE_FILE: path.join(sprintDir, 'state.json'),
          CLEARGATE_SKIP_WORKTREE_CHECK: '1',
          CLEARGATE_SKIP_LIFECYCLE_CHECK: '1',
          CLEARGATE_SKIP_MERGE_CHECK: '1',
          CLEARGATE_SKIP_SPRINT_TRENDS: '1',
          CLEARGATE_SKIP_SKILL_CANDIDATES: '1',
          CLEARGATE_FLASHCARD_PATH: path.join(tmpBase, 'test-flashcard.md'),
          CLEARGATE_SPRINT_RUNS_DIR: sprintRunsDir,
          CLEARGATE_FLASHCARD_LOOKBACK: '3',
        },
      },
    );
    expect(result.status).toBe(0);
    const suggestionsFile = path.join(sprintDir, 'improvement-suggestions.md');
    expect(fs.existsSync(suggestionsFile)).toBe(true);
    const content = fs.readFileSync(suggestionsFile, 'utf8');
    expect(content).toMatch(/CAND-SPRINT-19-F\d+/);
    expect(content).toMatch(/stale/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// CR-022-M4: Scenario 27 — Step 8 prints 6-item handoff list
// ─────────────────────────────────────────────────────────────────────────────

describe('Scenario 27: Step 8 prints 6-item handoff list (CR-022 §3 M4)', () => {
  let tmpBase: string;
  let sprintDir: string;

  beforeEach(() => {
    sprintDir = makeTempSprintDir('sprint-v1-legacy', 'SPRINT-19');
    tmpBase = path.dirname(sprintDir);
  });

  afterEach(() => {
    fs.rmSync(tmpBase, { recursive: true, force: true });
  });

  it('stdout contains all 6 handoff list items', () => {
    const result = spawnSync(
      '/usr/bin/env',
      ['node', CLOSE_SPRINT_SCRIPT, 'SPRINT-19', '--assume-ack'],
      {
        encoding: 'utf8',
        timeout: 30_000,
        env: {
          ...process.env,
          CLEARGATE_SPRINT_DIR: sprintDir,
          CLEARGATE_STATE_FILE: path.join(sprintDir, 'state.json'),
          CLEARGATE_SKIP_WORKTREE_CHECK: '1',
          CLEARGATE_SKIP_LIFECYCLE_CHECK: '1',
          CLEARGATE_SKIP_MERGE_CHECK: '1',
          CLEARGATE_SKIP_SPRINT_TRENDS: '1',
          CLEARGATE_SKIP_SKILL_CANDIDATES: '1',
          CLEARGATE_SKIP_FLASHCARD_CLEANUP: '1',
        },
      },
    );
    expect(result.status).toBe(0);
    // Item 1: Review REPORT.md
    expect(result.stdout).toMatch(/1\. Review .+REPORT\.md/);
    // Item 2: Review improvement-suggestions.md
    expect(result.stdout).toMatch(/2\. Review improvement-suggestions\.md/);
    // Item 3: Skill Candidates
    expect(result.stdout).toMatch(/3\. Approve or reject Skill Candidates/);
    // Item 4: FLASHCARD cleanup
    expect(result.stdout).toMatch(/4\. Approve or reject FLASHCARD cleanup entries/);
    // Item 5: MCP sync
    expect(result.stdout).toMatch(/5\. Push approved status changes to MCP/);
    // Item 6: Initialize next sprint
    expect(result.stdout).toMatch(/6\. Initialize next sprint/);
  });

  it('Step 8 header line contains sprint ID "SPRINT-19 closed"', () => {
    const result = spawnSync(
      '/usr/bin/env',
      ['node', CLOSE_SPRINT_SCRIPT, 'SPRINT-19', '--assume-ack'],
      {
        encoding: 'utf8',
        timeout: 30_000,
        env: {
          ...process.env,
          CLEARGATE_SPRINT_DIR: sprintDir,
          CLEARGATE_STATE_FILE: path.join(sprintDir, 'state.json'),
          CLEARGATE_SKIP_WORKTREE_CHECK: '1',
          CLEARGATE_SKIP_LIFECYCLE_CHECK: '1',
          CLEARGATE_SKIP_MERGE_CHECK: '1',
          CLEARGATE_SKIP_SPRINT_TRENDS: '1',
          CLEARGATE_SKIP_SKILL_CANDIDATES: '1',
          CLEARGATE_SKIP_FLASHCARD_CLEANUP: '1',
        },
      },
    );
    expect(result.status).toBe(0);
    expect(result.stdout).toMatch(/SPRINT-19 closed\. Next steps:/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// CR-022-M4: Scenario 28 — Step 8 next-sprint ID increments correctly
// ─────────────────────────────────────────────────────────────────────────────

describe('Scenario 28: Step 8 mentions incremented next-sprint ID (CR-022 §3 M4)', () => {
  let tmpBase: string;
  let sprintDir: string;

  beforeEach(() => {
    sprintDir = makeTempSprintDir('sprint-v1-legacy', 'SPRINT-19');
    tmpBase = path.dirname(sprintDir);
  });

  afterEach(() => {
    fs.rmSync(tmpBase, { recursive: true, force: true });
  });

  it('item 6 contains SPRINT-20 as next sprint ID', () => {
    const result = spawnSync(
      '/usr/bin/env',
      ['node', CLOSE_SPRINT_SCRIPT, 'SPRINT-19', '--assume-ack'],
      {
        encoding: 'utf8',
        timeout: 30_000,
        env: {
          ...process.env,
          CLEARGATE_SPRINT_DIR: sprintDir,
          CLEARGATE_STATE_FILE: path.join(sprintDir, 'state.json'),
          CLEARGATE_SKIP_WORKTREE_CHECK: '1',
          CLEARGATE_SKIP_LIFECYCLE_CHECK: '1',
          CLEARGATE_SKIP_MERGE_CHECK: '1',
          CLEARGATE_SKIP_SPRINT_TRENDS: '1',
          CLEARGATE_SKIP_SKILL_CANDIDATES: '1',
          CLEARGATE_SKIP_FLASHCARD_CLEANUP: '1',
        },
      },
    );
    expect(result.status).toBe(0);
    expect(result.stdout).toMatch(/cleargate sprint init SPRINT-20/);
  });
});
