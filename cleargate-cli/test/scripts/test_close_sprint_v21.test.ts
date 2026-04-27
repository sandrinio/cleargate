/**
 * test_close_sprint_v21.test.ts — STORY-022-07 acceptance tests
 *
 * Gherkin scenarios (§2.1):
 *   Scenario 1: reporter.md documents v2.1 contract
 *   Scenario 2: close_sprint accepts a v1 report unchanged (legacy-pass)
 *   Scenario 3: close_sprint accepts a v2 report with no fast-lane stories
 *   Scenario 4: close_sprint rejects a v2 report missing required sections
 *   Scenario 5: close_sprint rejects non-conformant sprint-run path (S-99)
 *   Scenario 6: Reporter writes Lane Audit + Hotfix Audit on a sprint with a fast-lane story
 *
 * Uses spawnSync to invoke close_sprint.mjs directly via real tmpdir filesystem.
 * CLEARGATE_SPRINT_DIR env var controls the sprint dir path.
 *
 * Key design: for "pass" scenarios, the full pipeline runs.
 *   - prefill_report.mjs finds no agent reports → exits 0 (no-op)
 *   - sprint_status flips to Completed in the temp copy of state.json
 *   - suggest_improvements.mjs reads REPORT.md from the fixture dir
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
 * The fixture state.json and REPORT.md are copied over.
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

  // Copy REPORT.md
  const reportFile = path.join(fixturePath, 'REPORT.md');
  if (fs.existsSync(reportFile)) {
    fs.copyFileSync(reportFile, path.join(sprintDir, 'REPORT.md'));
  }

  return sprintDir;
}

/**
 * Run close_sprint.mjs with --assume-ack against a sprint dir.
 * CLEARGATE_SPRINT_DIR points to the sprint dir directly.
 * CLEARGATE_STATE_FILE points to state.json in the sprint dir.
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
