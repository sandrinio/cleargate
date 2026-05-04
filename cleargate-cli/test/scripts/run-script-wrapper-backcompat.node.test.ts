/**
 * run-script-wrapper-backcompat.node.test.ts — CR-046 back-compat extension-routing tests.
 *
 * Scenarios:
 *   Scenario A: .mjs extension routes through node — wrapper with assert_story_files.mjs
 *               as arg1 should exec via node (resolves from SCRIPT_DIR).
 *   Scenario B: .sh extension routes through bash — wrapper with pre_gate_runner.sh
 *               as arg1 should exec via bash (resolves from SCRIPT_DIR).
 *   Scenario C: arbitrary-cmd path unchanged — wrapper with 'true' as arg1 still exits 0
 *               (not treated as a script name, no extension rewrite).
 *
 * These test the regression introduced when CR-046 rewrote run_script.sh to the
 * arbitrary-cmd interface without preserving back-compat for production call-sites.
 * QA missed this because spawnFn mocking never exercised the real wrapper end-to-end.
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
const WRAPPER_SCRIPT = path.join(REPO_ROOT, '.cleargate', 'scripts', 'run_script.sh');
const REAL_SCRIPTS_DIR = path.join(REPO_ROOT, '.cleargate', 'scripts');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface TmpRepo {
  dir: string;
  sprintRunsDir: string;
  incidentsDir: string;
  activeFile: string;
  sprintId: string;
}

/** Create a minimal temp repo structure with an .active sentinel for SPRINT-TEST. */
function createTmpRepo(): TmpRepo {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cg-rs-backcompat-test-'));
  const sprintId = 'SPRINT-TEST';
  const sprintRunsDir = path.join(dir, '.cleargate', 'sprint-runs');
  const sprintDir = path.join(sprintRunsDir, sprintId);
  const incidentsDir = path.join(sprintDir, '.script-incidents');
  const activeFile = path.join(sprintRunsDir, '.active');

  fs.mkdirSync(sprintDir, { recursive: true });
  fs.mkdirSync(incidentsDir, { recursive: true });
  fs.writeFileSync(activeFile, `${sprintId}\n`, 'utf8');

  return { dir, sprintRunsDir, incidentsDir, activeFile, sprintId };
}

/** Remove the tmp repo after a test. */
function cleanupTmpRepo(repo: TmpRepo): void {
  fs.rmSync(repo.dir, { recursive: true, force: true });
}

interface RunResult {
  status: number;
  stdout: string;
  stderr: string;
}

/**
 * Invoke run_script.sh with ORCHESTRATOR_PROJECT_DIR pointing at tmpRepo.dir.
 */
function runWrapper(
  repo: TmpRepo,
  commandArgs: string[],
  extraEnv: Record<string, string> = {}
): RunResult {
  const result = spawnSync('bash', [WRAPPER_SCRIPT, ...commandArgs], {
    encoding: 'utf8',
    timeout: 30_000,
    env: {
      ...process.env,
      ORCHESTRATOR_PROJECT_DIR: repo.dir,
      AGENT_TYPE: 'developer',
      WORK_ITEM_ID: 'CR-046',
      ...extraEnv,
    },
  });
  return {
    status: result.status ?? -1,
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
  };
}

// ---------------------------------------------------------------------------
// Scenario A: .mjs extension routes through node
// ---------------------------------------------------------------------------

describe('CR-046 back-compat — Scenario A: .mjs extension routes through node', () => {
  let repo: TmpRepo;
  let fakeMjsPath: string;

  before(() => {
    repo = createTmpRepo();

    // Create a fake .mjs fixture in the REAL scripts dir would be invasive.
    // Instead, create a throwaway .mjs in a temp dir that we symlink or
    // write alongside the wrapper. We use a different approach: write a
    // fixture .mjs to a temp SCRIPT_DIR alongside a copy of run_script.sh.
    //
    // Strategy: copy run_script.sh to a temp dir, write a small .mjs in
    // the same dir, invoke the wrapper copy with arg1=fixture.mjs.
    const scriptDir = path.join(os.tmpdir(), `cg-bc-scripts-${Date.now()}`);
    fs.mkdirSync(scriptDir, { recursive: true });

    // Copy the real wrapper into the temp script dir
    fs.copyFileSync(WRAPPER_SCRIPT, path.join(scriptDir, 'run_script.sh'));

    // Write a tiny fixture .mjs that prints "mjs-routed" to stdout and exits 0
    fakeMjsPath = path.join(scriptDir, 'fixture_backcompat.mjs');
    fs.writeFileSync(
      fakeMjsPath,
      'process.stdout.write("mjs-routed\\n"); process.exit(0);\n',
      'utf8'
    );

    // Store the scriptDir on repo for cleanup
    (repo as TmpRepo & { scriptDir: string }).scriptDir = scriptDir;
  });

  after(() => {
    cleanupTmpRepo(repo);
    const scriptDir = (repo as TmpRepo & { scriptDir?: string }).scriptDir;
    if (scriptDir) {
      fs.rmSync(scriptDir, { recursive: true, force: true });
    }
  });

  it('routes *.mjs arg1 through node when file exists in SCRIPT_DIR', () => {
    const scriptDir = (repo as TmpRepo & { scriptDir: string }).scriptDir;
    const wrapperCopy = path.join(scriptDir, 'run_script.sh');

    const result = spawnSync(
      'bash',
      [wrapperCopy, 'fixture_backcompat.mjs'],
      {
        encoding: 'utf8',
        timeout: 30_000,
        env: {
          ...process.env,
          ORCHESTRATOR_PROJECT_DIR: repo.dir,
          AGENT_TYPE: 'developer',
          WORK_ITEM_ID: 'CR-046',
        },
      }
    );

    assert.strictEqual(
      result.status,
      0,
      `Expected exit 0 from .mjs routing but got ${result.status}. stderr: ${result.stderr}`
    );
    assert.ok(
      result.stdout.includes('mjs-routed'),
      `Expected stdout to contain 'mjs-routed' (node executed the .mjs) but got: ${result.stdout}`
    );
  });

  it('.mjs routing does not write incident JSON on success', () => {
    const scriptDir = (repo as TmpRepo & { scriptDir: string }).scriptDir;
    const wrapperCopy = path.join(scriptDir, 'run_script.sh');

    spawnSync('bash', [wrapperCopy, 'fixture_backcompat.mjs'], {
      encoding: 'utf8',
      timeout: 30_000,
      env: {
        ...process.env,
        ORCHESTRATOR_PROJECT_DIR: repo.dir,
        AGENT_TYPE: 'developer',
        WORK_ITEM_ID: 'CR-046',
      },
    });

    // No incident JSON should be written on success
    const incidentsDir = repo.incidentsDir;
    if (fs.existsSync(incidentsDir)) {
      const files = fs.readdirSync(incidentsDir).filter((f) => f.endsWith('.json'));
      assert.strictEqual(
        files.length,
        0,
        `Expected 0 incident files after .mjs success but found ${files.length}`
      );
    }
    // If dir doesn't exist, that's also fine (no incidents written)
  });
});

// ---------------------------------------------------------------------------
// Scenario B: .sh extension routes through bash
// ---------------------------------------------------------------------------

describe('CR-046 back-compat — Scenario B: .sh extension routes through bash', () => {
  let repo: TmpRepo;
  let scriptDir: string;

  before(() => {
    repo = createTmpRepo();

    scriptDir = path.join(os.tmpdir(), `cg-bc-sh-scripts-${Date.now()}`);
    fs.mkdirSync(scriptDir, { recursive: true });

    // Copy the real wrapper into the temp script dir
    fs.copyFileSync(WRAPPER_SCRIPT, path.join(scriptDir, 'run_script.sh'));

    // Write a tiny fixture .sh that prints "sh-routed" to stdout and exits 0
    const fixtureSh = path.join(scriptDir, 'fixture_backcompat.sh');
    fs.writeFileSync(
      fixtureSh,
      '#!/usr/bin/env bash\necho "sh-routed"\nexit 0\n',
      'utf8'
    );
    fs.chmodSync(fixtureSh, 0o755);
  });

  after(() => {
    cleanupTmpRepo(repo);
    if (scriptDir) {
      fs.rmSync(scriptDir, { recursive: true, force: true });
    }
  });

  it('routes *.sh arg1 through bash when file exists in SCRIPT_DIR', () => {
    const wrapperCopy = path.join(scriptDir, 'run_script.sh');

    const result = spawnSync(
      'bash',
      [wrapperCopy, 'fixture_backcompat.sh'],
      {
        encoding: 'utf8',
        timeout: 30_000,
        env: {
          ...process.env,
          ORCHESTRATOR_PROJECT_DIR: repo.dir,
          AGENT_TYPE: 'developer',
          WORK_ITEM_ID: 'CR-046',
        },
      }
    );

    assert.strictEqual(
      result.status,
      0,
      `Expected exit 0 from .sh routing but got ${result.status}. stderr: ${result.stderr}`
    );
    assert.ok(
      result.stdout.includes('sh-routed'),
      `Expected stdout to contain 'sh-routed' (bash executed the .sh) but got: ${result.stdout}`
    );
  });

  it('.sh routing does not write incident JSON on success', () => {
    const wrapperCopy = path.join(scriptDir, 'run_script.sh');

    spawnSync('bash', [wrapperCopy, 'fixture_backcompat.sh'], {
      encoding: 'utf8',
      timeout: 30_000,
      env: {
        ...process.env,
        ORCHESTRATOR_PROJECT_DIR: repo.dir,
        AGENT_TYPE: 'developer',
        WORK_ITEM_ID: 'CR-046',
      },
    });

    const incidentsDir = repo.incidentsDir;
    if (fs.existsSync(incidentsDir)) {
      const files = fs.readdirSync(incidentsDir).filter((f) => f.endsWith('.json'));
      assert.strictEqual(
        files.length,
        0,
        `Expected 0 incident files after .sh success but found ${files.length}`
      );
    }
  });
});

// ---------------------------------------------------------------------------
// Scenario C: arbitrary-cmd path unchanged
// ---------------------------------------------------------------------------

describe('CR-046 back-compat — Scenario C: arbitrary-cmd path unchanged', () => {
  let repo: TmpRepo;

  before(() => {
    repo = createTmpRepo();
  });

  after(() => {
    cleanupTmpRepo(repo);
  });

  it('passes arbitrary command (true) through without rewrite — exits 0', () => {
    const result = runWrapper(repo, ['true']);
    assert.strictEqual(
      result.status,
      0,
      `Expected exit 0 from 'true' but got ${result.status}. stderr: ${result.stderr}`
    );
  });

  it('passes arbitrary command (sh -c exit 5) through without rewrite — exits 5', () => {
    const result = runWrapper(repo, ['sh', '-c', 'exit 5']);
    assert.strictEqual(
      result.status,
      5,
      `Expected exit 5 from 'sh -c exit 5' but got ${result.status}. stderr: ${result.stderr}`
    );
  });

  it('bare .mjs name that does NOT exist in SCRIPT_DIR is treated as PATH command (exits 127)', () => {
    // A .mjs name that doesn't exist in SCRIPT_DIR should not be routed through node;
    // it falls through to the arbitrary-cmd path and fails with 127 (not found on PATH).
    const result = runWrapper(repo, ['nonexistent_script_xyz.mjs']);
    // The wrapper should attempt to exec 'nonexistent_script_xyz.mjs' directly;
    // since it's not on PATH either, exit code should be non-zero (127 or 126).
    assert.notStrictEqual(
      result.status,
      0,
      `Expected non-zero exit for missing .mjs but got 0 — routing logic may have gone wrong`
    );
  });
});
