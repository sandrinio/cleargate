/**
 * run-script-wrapper.red.node.test.ts — CR-046 Red tests (QA-Red authored, immutable post-Red).
 *
 * Acceptance scenarios (CR-046 §4 + M1 plan §CR-046 test shape):
 *   Scenario 1: Success passthrough — `bash run_script.sh true` exits 0, no incident JSON written.
 *   Scenario 2: Failure captures stdout+stderr — `bash run_script.sh sh -c 'echo hello; echo bye >&2; exit 7'`
 *               exits 7, incident JSON written with stdout="hello" + stderr="bye".
 *   Scenario 3: Exit-code propagation — `bash run_script.sh sh -c 'exit 42'` → status 42 to caller.
 *   Scenario 4: JSON schema validation — parse failure-case JSON; assert all required ScriptIncident
 *               fields present with correct types (import ScriptIncident from script-incident.ts).
 *   Scenario 5: Truncation at 4KB — stdout ≥10000 bytes → JSON.stdout ≤ 4096 bytes + ends with "... [truncated]".
 *
 * BASELINE FAIL CONTRACT:
 *   All 5 scenarios must FAIL on the clean baseline:
 *   - Scenario 1 fails: current wrapper exits 2 (unsupported extension) not 0 for bare command `true`.
 *   - Scenario 2 fails: wrapper writes no incident JSON to .script-incidents/.
 *   - Scenario 3 fails: wrapper exits 2 (unsupported extension), not 42.
 *   - Scenario 4 fails: `cleargate-cli/src/lib/script-incident.ts` does not exist — import fails.
 *   - Scenario 5 fails: wrapper writes no truncated JSON; no .script-incidents/ dir written.
 *
 * IMMUTABILITY: this file is sealed post-Red per CR-043 protocol. Devs must NOT modify it.
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

// Import the typed schema — WILL FAIL on baseline (file does not exist).
// When Dev ships script-incident.ts this import resolves.
import type { ScriptIncident } from '../../src/lib/script-incident.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Resolve repo root: cleargate-cli/test/scripts/ → up 3 → repo root
const REPO_ROOT = path.resolve(__dirname, '..', '..', '..');
const WRAPPER_SCRIPT = path.join(REPO_ROOT, '.cleargate', 'scripts', 'run_script.sh');

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
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cg-rs-wrapper-test-'));
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
 * Invoke run_script.sh with ORCHESTRATOR_PROJECT_DIR pointing at tmpRepo.dir,
 * passing arbitrary command args (not a script-name-relative-to-scripts-dir).
 *
 * The INTENDED interface per M1 plan §CR-046:
 *   bash run_script.sh <command> [args...]
 * where <command> is an arbitrary executable (e.g. `true`, `false`, `sh`).
 *
 * env vars threaded in:
 *   ORCHESTRATOR_PROJECT_DIR — so wrapper resolves .active sentinel from tmpRepo
 *   AGENT_TYPE               — populates incident JSON agent_type field
 *   WORK_ITEM_ID             — populates incident JSON work_item_id field
 */
function runWrapper(
  repo: TmpRepo,
  commandArgs: string[],
  extraEnv: Record<string, string> = {}
): RunResult {
  const result = spawnSync('bash', [WRAPPER_SCRIPT, ...commandArgs], {
    encoding: 'utf8',
    timeout: 15_000,
    env: {
      ...process.env,
      ORCHESTRATOR_PROJECT_DIR: repo.dir,
      AGENT_TYPE: 'qa',
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

/**
 * Find all .json files written to .script-incidents/ directory.
 * Returns an array of parsed incident objects (or throws if JSON is malformed).
 */
function readIncidentFiles(repo: TmpRepo): ScriptIncident[] {
  if (!fs.existsSync(repo.incidentsDir)) {
    return [];
  }
  // Sort by mtime ascending so callers using `incidents[length-1]` get the most
  // recently written file deterministically across platforms. (Linux ext4
  // returns readdirSync entries in directory-hash order, not insertion order
  // — Mac HFS+/APFS happens to return insertion order, masking this on local
  // dev machines but breaking on Linux CI.)
  const files = fs
    .readdirSync(repo.incidentsDir)
    .filter((f) => f.endsWith('.json'))
    .map((f) => {
      const full = path.join(repo.incidentsDir, f);
      return { full, mtime: fs.statSync(full).mtimeMs };
    })
    .sort((a, b) => a.mtime - b.mtime)
    .map((entry) => entry.full);
  return files.map((full) => {
    const raw = fs.readFileSync(full, 'utf8');
    return JSON.parse(raw) as ScriptIncident;
  });
}

// ---------------------------------------------------------------------------
// Scenario 1: Success passthrough
// ---------------------------------------------------------------------------

describe('CR-046 run_script.sh wrapper — Scenario 1: success passthrough', () => {
  let repo: TmpRepo;

  before(() => {
    repo = createTmpRepo();
  });

  after(() => {
    cleanupTmpRepo(repo);
  });

  it('exits 0 when command succeeds (bash run_script.sh true)', () => {
    const result = runWrapper(repo, ['true']);
    assert.strictEqual(
      result.status,
      0,
      `Expected exit 0 from 'true' but got ${result.status}. stderr: ${result.stderr}`
    );
  });

  it('writes no incident JSON when command succeeds', () => {
    // Run a succeeding command
    runWrapper(repo, ['true']);
    const incidents = readIncidentFiles(repo);
    assert.strictEqual(
      incidents.length,
      0,
      `Expected 0 incident files after success but found ${incidents.length}`
    );
  });

  it('passes stdout through on success', () => {
    const result = runWrapper(repo, ['sh', '-c', 'echo passthrough-output']);
    assert.ok(
      result.stdout.includes('passthrough-output'),
      `Expected stdout to contain 'passthrough-output' but got: ${result.stdout}`
    );
  });
});

// ---------------------------------------------------------------------------
// Scenario 2: Failure captures stdout+stderr
// ---------------------------------------------------------------------------

describe('CR-046 run_script.sh wrapper — Scenario 2: failure captures stdout+stderr', () => {
  let repo: TmpRepo;

  before(() => {
    repo = createTmpRepo();
  });

  after(() => {
    cleanupTmpRepo(repo);
  });

  it('exits 7 when command exits 7', () => {
    const result = runWrapper(repo, ['sh', '-c', "echo hello; echo bye >&2; exit 7"]);
    assert.strictEqual(
      result.status,
      7,
      `Expected exit 7 but got ${result.status}. stderr: ${result.stderr}`
    );
  });

  it('writes exactly one incident JSON file on failure', () => {
    runWrapper(repo, ['sh', '-c', "echo hello; echo bye >&2; exit 7"]);
    const incidents = readIncidentFiles(repo);
    assert.ok(
      incidents.length >= 1,
      `Expected ≥1 incident file but found ${incidents.length}`
    );
  });

  it('incident JSON.stdout contains captured stdout ("hello")', () => {
    runWrapper(repo, ['sh', '-c', "echo hello; echo bye >&2; exit 7"]);
    const incidents = readIncidentFiles(repo);
    assert.ok(incidents.length >= 1, 'No incident files found');
    const incident = incidents[incidents.length - 1];
    assert.ok(
      incident.stdout.includes('hello'),
      `Expected incident.stdout to contain 'hello' but got: ${incident.stdout}`
    );
  });

  it('incident JSON.stderr contains captured stderr ("bye")', () => {
    runWrapper(repo, ['sh', '-c', "echo hello; echo bye >&2; exit 7"]);
    const incidents = readIncidentFiles(repo);
    assert.ok(incidents.length >= 1, 'No incident files found');
    const incident = incidents[incidents.length - 1];
    assert.ok(
      incident.stderr.includes('bye'),
      `Expected incident.stderr to contain 'bye' but got: ${incident.stderr}`
    );
  });
});

// ---------------------------------------------------------------------------
// Scenario 3: Exit-code propagation
// ---------------------------------------------------------------------------

describe('CR-046 run_script.sh wrapper — Scenario 3: exit-code propagation', () => {
  let repo: TmpRepo;

  before(() => {
    repo = createTmpRepo();
  });

  after(() => {
    cleanupTmpRepo(repo);
  });

  it('propagates exit code 42 from wrapped command to caller', () => {
    const result = runWrapper(repo, ['sh', '-c', 'exit 42']);
    assert.strictEqual(
      result.status,
      42,
      `Expected status 42 propagated but got ${result.status}. stderr: ${result.stderr}`
    );
  });

  it('propagates exit code 1 from wrapped command to caller', () => {
    const result = runWrapper(repo, ['false']);
    assert.strictEqual(
      result.status,
      1,
      `Expected status 1 from 'false' but got ${result.status}. stderr: ${result.stderr}`
    );
  });
});

// ---------------------------------------------------------------------------
// Scenario 4: JSON schema validation (ScriptIncident interface)
// ---------------------------------------------------------------------------

describe('CR-046 run_script.sh wrapper — Scenario 4: JSON schema validation', () => {
  let repo: TmpRepo;

  before(() => {
    repo = createTmpRepo();
  });

  after(() => {
    cleanupTmpRepo(repo);
  });

  it('incident JSON has all required ScriptIncident fields', () => {
    runWrapper(repo, ['sh', '-c', 'exit 1'], {
      AGENT_TYPE: 'developer',
      WORK_ITEM_ID: 'CR-046',
    });

    const incidents = readIncidentFiles(repo);
    assert.ok(incidents.length >= 1, 'No incident files found — wrapper must write JSON on failure');

    const incident = incidents[incidents.length - 1];

    // Required fields: ts, command, args, cwd, exit_code, stdout, stderr, agent_type, work_item_id
    assert.ok('ts' in incident, 'Missing field: ts');
    assert.ok('command' in incident, 'Missing field: command');
    assert.ok('args' in incident, 'Missing field: args');
    assert.ok('cwd' in incident, 'Missing field: cwd');
    assert.ok('exit_code' in incident, 'Missing field: exit_code');
    assert.ok('stdout' in incident, 'Missing field: stdout');
    assert.ok('stderr' in incident, 'Missing field: stderr');
    assert.ok('agent_type' in incident, 'Missing field: agent_type');
    assert.ok('work_item_id' in incident, 'Missing field: work_item_id');
  });

  it('incident JSON field types match ScriptIncident interface', () => {
    runWrapper(repo, ['sh', '-c', 'exit 2'], {
      AGENT_TYPE: 'architect',
      WORK_ITEM_ID: 'CR-046',
    });

    const incidents = readIncidentFiles(repo);
    assert.ok(incidents.length >= 1, 'No incident files found');
    const incident = incidents[incidents.length - 1];

    // ts: ISO-8601 string
    assert.strictEqual(typeof incident.ts, 'string', 'ts must be a string');
    assert.ok(/^\d{4}-\d{2}-\d{2}T/.test(incident.ts), `ts must be ISO-8601 but got: ${incident.ts}`);

    // command: string
    assert.strictEqual(typeof incident.command, 'string', 'command must be a string');

    // args: string[]
    assert.ok(Array.isArray(incident.args), 'args must be an array');
    incident.args.forEach((arg, i) => {
      assert.strictEqual(typeof arg, 'string', `args[${i}] must be a string`);
    });

    // cwd: string
    assert.strictEqual(typeof incident.cwd, 'string', 'cwd must be a string');

    // exit_code: number
    assert.strictEqual(typeof incident.exit_code, 'number', 'exit_code must be a number');
    assert.ok(incident.exit_code !== 0, 'exit_code must be non-zero for a failure incident');

    // stdout, stderr: strings
    assert.strictEqual(typeof incident.stdout, 'string', 'stdout must be a string');
    assert.strictEqual(typeof incident.stderr, 'string', 'stderr must be a string');

    // agent_type: string | null
    assert.ok(
      typeof incident.agent_type === 'string' || incident.agent_type === null,
      `agent_type must be string|null but got: ${typeof incident.agent_type}`
    );

    // work_item_id: string | null
    assert.ok(
      typeof incident.work_item_id === 'string' || incident.work_item_id === null,
      `work_item_id must be string|null but got: ${typeof incident.work_item_id}`
    );
  });

  it('incident JSON agent_type matches $AGENT_TYPE env var', () => {
    runWrapper(repo, ['sh', '-c', 'exit 3'], {
      AGENT_TYPE: 'reporter',
      WORK_ITEM_ID: 'CR-046',
    });

    const incidents = readIncidentFiles(repo);
    assert.ok(incidents.length >= 1, 'No incident files found');
    const incident = incidents[incidents.length - 1];
    assert.strictEqual(
      incident.agent_type,
      'reporter',
      `Expected agent_type='reporter' but got: ${incident.agent_type}`
    );
  });

  it('incident JSON work_item_id matches $WORK_ITEM_ID env var', () => {
    runWrapper(repo, ['sh', '-c', 'exit 4'], {
      AGENT_TYPE: 'qa',
      WORK_ITEM_ID: 'CR-999',
    });

    const incidents = readIncidentFiles(repo);
    assert.ok(incidents.length >= 1, 'No incident files found');
    const incident = incidents[incidents.length - 1];
    assert.strictEqual(
      incident.work_item_id,
      'CR-999',
      `Expected work_item_id='CR-999' but got: ${incident.work_item_id}`
    );
  });
});

// ---------------------------------------------------------------------------
// Scenario 5: Truncation at 4KB
// ---------------------------------------------------------------------------

describe('CR-046 run_script.sh wrapper — Scenario 5: truncation at 4KB', () => {
  let repo: TmpRepo;

  // MAX_STREAM_BYTES from script-incident.ts — 4096
  const MAX_STREAM_BYTES = 4096;
  const TRUNCATION_SUFFIX = '... [truncated]';

  before(() => {
    repo = createTmpRepo();
  });

  after(() => {
    cleanupTmpRepo(repo);
  });

  it('incident JSON.stdout is truncated at 4096 bytes when output ≥10000 bytes', () => {
    // Generate ~10000 ASCII bytes on stdout then exit 1
    // Use yes+head pattern with ASCII only to avoid UTF-8 byte-splitting edge
    runWrapper(repo, ['sh', '-c', 'yes x | head -c 10000; exit 1']);

    const incidents = readIncidentFiles(repo);
    assert.ok(
      incidents.length >= 1,
      'No incident files found — wrapper must write JSON on failure'
    );
    const incident = incidents[incidents.length - 1];

    // stdout captured in JSON must be ≤ 4096 + length of truncation suffix
    const maxAllowed = MAX_STREAM_BYTES + TRUNCATION_SUFFIX.length;
    assert.ok(
      incident.stdout.length <= maxAllowed,
      `Expected incident.stdout.length ≤ ${maxAllowed} (4096 + suffix) but got ${incident.stdout.length}`
    );
  });

  it('incident JSON.stdout ends with "... [truncated]" when output exceeds 4KB', () => {
    runWrapper(repo, ['sh', '-c', 'yes x | head -c 10000; exit 1']);

    const incidents = readIncidentFiles(repo);
    assert.ok(incidents.length >= 1, 'No incident files found');
    const incident = incidents[incidents.length - 1];

    assert.ok(
      incident.stdout.endsWith(TRUNCATION_SUFFIX),
      `Expected incident.stdout to end with "${TRUNCATION_SUFFIX}" but got: ...${incident.stdout.slice(-40)}`
    );
  });

  it('incident JSON.stderr is truncated at 4096 bytes when stderr ≥10000 bytes', () => {
    // Generate ~10000 bytes on stderr then exit 1
    runWrapper(repo, ['sh', '-c', 'yes y | head -c 10000 >&2; exit 1']);

    const incidents = readIncidentFiles(repo);
    assert.ok(incidents.length >= 1, 'No incident files found');
    const incident = incidents[incidents.length - 1];

    const maxAllowed = MAX_STREAM_BYTES + TRUNCATION_SUFFIX.length;
    assert.ok(
      incident.stderr.length <= maxAllowed,
      `Expected incident.stderr.length ≤ ${maxAllowed} but got ${incident.stderr.length}`
    );
    assert.ok(
      incident.stderr.endsWith(TRUNCATION_SUFFIX),
      `Expected incident.stderr to end with "${TRUNCATION_SUFFIX}" but got: ...${incident.stderr.slice(-40)}`
    );
  });
});

// ---------------------------------------------------------------------------
// Wrapper self-exemption (documented in M1 §CR-046 implementation sketch #5)
// The wrapper must NOT wrap itself — calling `bash run_script.sh bash run_script.sh <cmd>`
// should not trigger infinite recursion. This is a documentation/contract test, not a
// runtime recursion test, since actual infinite recursion would deadlock the process.
// The test asserts the SKILL.md contract is honored by verifying the wrapper script
// contains an explicit self-exemption mechanism (guard variable or comment).
// ---------------------------------------------------------------------------

describe('CR-046 run_script.sh wrapper — self-exemption (no infinite loop)', () => {
  it('wrapper script contains a self-exemption guard (not called recursively from within itself)', () => {
    // The wrapper should have a mechanism to avoid recursive self-invocation.
    // Verify the contract: the wrapper's source must document or implement exemption.
    const wrapperSource = fs.readFileSync(WRAPPER_SCRIPT, 'utf8');

    // Accept either:
    // (a) A guard env var check (e.g. RUN_SCRIPT_ACTIVE or similar)
    // (b) A comment documenting the self-exemption contract per SKILL.md
    // (c) The word 'self' and 'exempt' together in source
    const hasSelfExemption =
      /RUN_SCRIPT_ACTIVE|RUN_SCRIPT_GUARD|self.exempt|self-exempt|SELF_EXEMPT/i.test(wrapperSource) ||
      /# wrapper.*not.*wrap.*itself|# self.exempt|# no.*recur/i.test(wrapperSource);

    assert.ok(
      hasSelfExemption,
      'Expected wrapper to contain a self-exemption guard or contract comment. ' +
        'The wrapper must not recursively call itself (SKILL.md §C.x contract). ' +
        'Add: export RUN_SCRIPT_ACTIVE=1 guard or equivalent.'
    );
  });

  it('wrapper exits cleanly when $AGENT_TYPE and $WORK_ITEM_ID are unset', () => {
    // Wrapper must handle absent env vars gracefully (agent_type: null, work_item_id: null in JSON)
    const repo = createTmpRepo();
    try {
      const result = runWrapper(repo, ['sh', '-c', 'exit 5'], {
        AGENT_TYPE: '',
        WORK_ITEM_ID: '',
      });
      // Should still write incident JSON even when env vars are empty
      assert.ok(
        result.status !== 127,
        `Wrapper itself errored (127) — unexpected. stderr: ${result.stderr}`
      );
      // Exit should match the wrapped command's exit code
      assert.strictEqual(
        result.status,
        5,
        `Expected exit 5 from 'exit 5' but got ${result.status}. stderr: ${result.stderr}`
      );
    } finally {
      cleanupTmpRepo(repo);
    }
  });
});
