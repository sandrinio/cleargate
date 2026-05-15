/**
 * push-sprint-types.red.node.test.ts — CR-064 QA-RED
 *
 * Failing tests (RED phase) for CR-064: sprint plan + report type mapping and
 * path-validator extension in `cleargate-cli/src/commands/push.ts`.
 *
 * Scenarios (M3.md §CR-064 Test shape + CR-064 §4 unit cases):
 *
 *   Scenario 1 — frontmatter `sprint_id: "SPRINT-26"` + delivery path → type `"sprint"`
 *     getItemType / getItemTypeWithPathOverride maps sprint_id to "sprint" for plans.
 *     MCP push_item called with type: "sprint".
 *
 *   Scenario 2 — path `sprint-runs/SPRINT-26/SPRINT-26_REPORT.md` → type `"sprint_report"`
 *     Path override wins regardless of frontmatter (even if fm has sprint_id → would be "sprint").
 *
 *   Scenario 3 — path `sprint-runs/SPRINT-12/REPORT.md` (legacy basename) → type `"sprint_report"`
 *     Legacy REPORT.md basename accepted by path-override.
 *
 *   Scenario 4 — path `sprint-runs/SPRINT-26/token-ledger.jsonl` → REJECTED (exit 2)
 *     Non-allowlisted file under sprint-runs/ must be rejected by path validator.
 *
 *   Scenario 5 — path `sprint-runs/SPRINT-26/plans/M1.md` → REJECTED
 *     plans/ subdir not in allowlist — must reject.
 *
 *   Scenario 6 — path `sprint-runs/SPRINT-26/.script-incidents/foo.json` → REJECTED
 *     .script-incidents/ subdir not in allowlist.
 *
 *   Scenario 7 — sprint plan missing `title:` but H1 = `# SPRINT-26 Sprint Title`
 *     → push payload title derives from H1.
 *
 *   Scenario 8 — sprint report missing `title:` but H1 = `# SPRINT-26 Report: Wrap-up`
 *     → push payload title derives from H1.
 *
 * PRE-FIX state (baseline, no implementation):
 *   Scenarios 1: FAILS — `typeMap` has no `sprint_id` entry → getItemType returns null →
 *     push.ts exits 1 with "cannot determine item type".
 *   Scenarios 2, 3: FAIL — `getItemTypeWithPathOverride` does not exist; path-override not applied.
 *   Scenarios 4, 5, 6: FAIL — path validator accepts sprint-runs/ files (no rejection today).
 *   Scenarios 7, 8: path-aware H1 fallback may already exist for non-sprint paths; for sprint
 *     plan the type lookup fails first (Scenario 1 blocks).
 *
 * Runner: tsx --test (node:test)
 * Naming: *.red.node.test.ts (immutable post-Red, per FLASHCARD 2026-05-04 #naming #red-green)
 * Forbidden: DO NOT edit push.ts or any implementation file.
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { fileURLToPath } from 'node:url';
import { pushHandler } from '../../src/commands/push.js';
import type { McpClient, AdapterInfo } from '../../src/lib/mcp-client.js';
import { serializeFrontmatter } from '../../src/lib/frontmatter-yaml.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeTmpDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'cg-push-sprint-red-'));
}

function cleanup(dir: string): void {
  fs.rmSync(dir, { recursive: true, force: true });
}

/** Write an approved work-item file at the given absolute path. */
function writeFile(filePath: string, fm: Record<string, unknown>, body: string): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const content = serializeFrontmatter({ approved: true, ...fm }) + '\n\n' + body;
  fs.writeFileSync(filePath, content, 'utf8');
}

/** Recorded call from the mock MCP client. */
interface McpCall {
  tool: string;
  args: Record<string, unknown>;
}

function makeMockMcp(): McpClient & { calls: McpCall[] } {
  const calls: McpCall[] = [];
  return {
    calls,
    call: async <T>(tool: string, args: Record<string, unknown>): Promise<T> => {
      calls.push({ tool, args });
      if (tool === 'push_item') {
        return {
          version: 1,
          updated_at: '2026-05-15T00:00:00Z',
          pushed_by: 'qa@example.com',
          pushed_at: '2026-05-15T00:00:01Z',
          stored_type: (args as { type?: string }).type ?? 'unknown',
          warnings: [],
        } as unknown as T;
      }
      throw new Error(`unexpected tool: ${tool}`);
    },
    adapterInfo: async (): Promise<AdapterInfo> => ({ configured: true, name: 'linear' }),
  };
}

function makeSeams(tmpDir: string, mcp: McpClient) {
  const stderr: string[] = [];
  const stdout: string[] = [];
  let exitCode: number | null = null;
  return {
    stderr,
    stdout,
    exitCode: () => exitCode,
    opts: {
      projectRoot: tmpDir,
      mcp,
      stdout: (s: string) => { stdout.push(s); },
      stderr: (s: string) => { stderr.push(s); },
      exit: ((c: number): never => {
        exitCode = c;
        throw Object.assign(new Error(`exit(${c})`), { __exit: true });
      }) as (c: number) => never,
      now: () => '2026-05-15T00:00:00.000Z',
    },
  };
}

/** Populate minimal repo scaffolding in tmpDir (participant.json + sprint-runs dir). */
function scaffold(tmpDir: string): void {
  fs.mkdirSync(path.join(tmpDir, '.cleargate', 'sprint-runs', '_off-sprint'), { recursive: true });
  fs.writeFileSync(
    path.join(tmpDir, '.cleargate', '.participant.json'),
    JSON.stringify({ email: 'qa@example.com', set_at: '2026-01-01T00:00:00Z', source: 'prompted' }),
    'utf8',
  );
}

// ── Scenario 1 — sprint plan frontmatter → type "sprint" ─────────────────────
// PRE-FIX: typeMap has no sprint_id entry → getItemType returns null → exit 1.
// This test FAILS pre-fix: pushHandler exits 1 with "cannot determine item type"
// instead of calling push_item with type "sprint".

describe('CR-064 Scenario 1 — sprint_id frontmatter → type "sprint"', () => {
  let tmpDir: string;
  let mcpCalls: McpCall[];

  before(() => {
    tmpDir = makeTmpDir();
    scaffold(tmpDir);

    const filePath = path.join(
      tmpDir,
      '.cleargate', 'delivery', 'archive',
      'SPRINT-26_MCP_Type_Agnostic.md',
    );
    writeFile(filePath, {
      sprint_id: 'SPRINT-26',
      status: 'Active',
    }, '# SPRINT-26 MCP Type Agnostic\n\nSprint plan body.');
  });

  after(() => cleanup(tmpDir));

  it('push_item is called with type "sprint" for sprint plan frontmatter', async () => {
    const mcp = makeMockMcp();
    mcpCalls = mcp.calls;
    const seams = makeSeams(tmpDir, mcp);

    const filePath = path.join(
      tmpDir,
      '.cleargate', 'delivery', 'archive',
      'SPRINT-26_MCP_Type_Agnostic.md',
    );

    await pushHandler(filePath, seams.opts);

    const pushCall = mcpCalls.find((c) => c.tool === 'push_item');
    assert.ok(
      pushCall,
      'CR-064 Scenario 1 FAIL: push_item was not called.\n' +
      'PRE-FIX: typeMap has no sprint_id entry → pushHandler exits 1 with "cannot determine item type".',
    );
    assert.equal(
      (pushCall.args as { type?: string }).type,
      'sprint',
      'CR-064 Scenario 1 FAIL: push_item called with wrong type.\n' +
      `Expected: "sprint", Got: "${(pushCall.args as { type?: string }).type ?? 'null'}".\n` +
      'PRE-FIX: sprint_id key is absent from typeMap → getItemType returns null.',
    );
  });
});

// ── Scenario 2 — sprint-runs report path → type "sprint_report" (path override) ─
// PRE-FIX: path override (getItemTypeWithPathOverride) does not exist.
// The path validator may also reject sprint-runs paths → exit early.
// This test FAILS pre-fix on both the path-validator rejection AND the type assertion.

describe('CR-064 Scenario 2 — sprint-runs/SPRINT-26/SPRINT-26_REPORT.md → type "sprint_report"', () => {
  let tmpDir: string;

  before(() => {
    tmpDir = makeTmpDir();
    scaffold(tmpDir);

    // Place a report file. Frontmatter uses sprint_id (would resolve to "sprint" via typeMap)
    // but path override MUST win.
    const reportDir = path.join(tmpDir, '.cleargate', 'sprint-runs', 'SPRINT-26');
    fs.mkdirSync(reportDir, { recursive: true });
    writeFile(
      path.join(reportDir, 'SPRINT-26_REPORT.md'),
      { sprint_id: 'SPRINT-26', status: 'Completed' },
      '# SPRINT-26 Sprint Report\n\nReport body.',
    );
  });

  after(() => cleanup(tmpDir));

  it('push_item is called with type "sprint_report" for SPRINT-NN_REPORT.md path', async () => {
    const mcp = makeMockMcp();
    const seams = makeSeams(tmpDir, mcp);

    const reportPath = path.join(
      tmpDir, '.cleargate', 'sprint-runs', 'SPRINT-26', 'SPRINT-26_REPORT.md',
    );

    await pushHandler(reportPath, seams.opts);

    const pushCall = mcp.calls.find((c) => c.tool === 'push_item');
    assert.ok(
      pushCall,
      'CR-064 Scenario 2 FAIL: push_item was not called.\n' +
      'PRE-FIX: path validator rejects sprint-runs/ path → exit before MCP call.',
    );
    assert.equal(
      (pushCall.args as { type?: string }).type,
      'sprint_report',
      'CR-064 Scenario 2 FAIL: path override did not force type to "sprint_report".\n' +
      `Got: "${(pushCall.args as { type?: string }).type ?? 'null'}".\n` +
      'PRE-FIX: getItemTypeWithPathOverride does not exist; fm sprint_id would yield "sprint" via typeMap.',
    );
  });
});

// ── Scenario 3 — legacy REPORT.md basename → type "sprint_report" ─────────────
// PRE-FIX: same failure mode as Scenario 2 — path override does not exist.

describe('CR-064 Scenario 3 — sprint-runs/SPRINT-12/REPORT.md (legacy) → type "sprint_report"', () => {
  let tmpDir: string;

  before(() => {
    tmpDir = makeTmpDir();
    scaffold(tmpDir);

    const reportDir = path.join(tmpDir, '.cleargate', 'sprint-runs', 'SPRINT-12');
    fs.mkdirSync(reportDir, { recursive: true });
    writeFile(
      path.join(reportDir, 'REPORT.md'),
      { sprint_id: 'SPRINT-12', status: 'Completed' },
      '# SPRINT-12 Report\n\nLegacy report body.',
    );
  });

  after(() => cleanup(tmpDir));

  it('push_item is called with type "sprint_report" for legacy REPORT.md basename', async () => {
    const mcp = makeMockMcp();
    const seams = makeSeams(tmpDir, mcp);

    const reportPath = path.join(tmpDir, '.cleargate', 'sprint-runs', 'SPRINT-12', 'REPORT.md');
    await pushHandler(reportPath, seams.opts);

    const pushCall = mcp.calls.find((c) => c.tool === 'push_item');
    assert.ok(
      pushCall,
      'CR-064 Scenario 3 FAIL: push_item was not called.\n' +
      'PRE-FIX: path validator rejects sprint-runs/ → exit before MCP call.',
    );
    assert.equal(
      (pushCall.args as { type?: string }).type,
      'sprint_report',
      'CR-064 Scenario 3 FAIL: legacy REPORT.md path override did not produce type "sprint_report".\n' +
      `Got: "${(pushCall.args as { type?: string }).type ?? 'null'}".\n` +
      'PRE-FIX: path-override SPRINT_REPORT_PATH_REGEX absent.',
    );
  });
});

// ── Scenario 4 — token-ledger.jsonl → REJECTED ────────────────────────────────
// PRE-FIX: path validator only checks delivery/ paths; sprint-runs/ is not blocked.
// push.ts reads the file, fails on frontmatter parse (no frontmatter) → exits 1 not 2.
// This test FAILS pre-fix: either file cannot be read (ENOENT without frontmatter) or
// wrong exit code is emitted.

describe('CR-064 Scenario 4 — sprint-runs/SPRINT-26/token-ledger.jsonl → path-validator REJECTS', () => {
  let tmpDir: string;

  before(() => {
    tmpDir = makeTmpDir();
    scaffold(tmpDir);

    const sprintDir = path.join(tmpDir, '.cleargate', 'sprint-runs', 'SPRINT-26');
    fs.mkdirSync(sprintDir, { recursive: true });
    fs.writeFileSync(path.join(sprintDir, 'token-ledger.jsonl'), '{"ts":"2026-01-01"}\n', 'utf8');
  });

  after(() => cleanup(tmpDir));

  it('path validator rejects token-ledger.jsonl with exit code 2', async () => {
    const mcp = makeMockMcp();
    const seams = makeSeams(tmpDir, mcp);

    const rejectedPath = path.join(
      tmpDir, '.cleargate', 'sprint-runs', 'SPRINT-26', 'token-ledger.jsonl',
    );

    let threw = false;
    try {
      await pushHandler(rejectedPath, seams.opts);
    } catch (err) {
      threw = true;
    }

    assert.ok(
      threw || seams.exitCode() !== null,
      'CR-064 Scenario 4 FAIL: pushHandler did not reject the non-allowlisted sprint-runs/ path.\n' +
      'PRE-FIX: path validator has no sprint-runs/ allowlist; file parse fails instead.',
    );

    // The path-validator rejection should exit 2 (not 1 which is used for frontmatter errors).
    // Pre-fix: no path-validator block exists for sprint-runs → 1 (frontmatter parse error) or
    // the handler succeeds accidentally.
    assert.equal(
      seams.exitCode(),
      2,
      `CR-064 Scenario 4 FAIL: expected exit code 2 for path-validator rejection, got ${seams.exitCode()}.\n` +
      'PRE-FIX: no sprint-runs allowlist check → wrong exit code or no rejection at all.',
    );

    // Confirm no MCP call was made (rejection is client-side, no network)
    assert.equal(
      mcp.calls.length,
      0,
      'CR-064 Scenario 4 FAIL: push_item was called despite path-validator rejection.',
    );
  });
});

// ── Scenario 5 — plans/M1.md → REJECTED ────────────────────────────────────────
// PRE-FIX: plans/ subdir under sprint-runs/ is not in allowlist.
// File has no recognized frontmatter → exit 1 (frontmatter error), not 2.

describe('CR-064 Scenario 5 — sprint-runs/SPRINT-26/plans/M1.md → path-validator REJECTS', () => {
  let tmpDir: string;

  before(() => {
    tmpDir = makeTmpDir();
    scaffold(tmpDir);

    const plansDir = path.join(tmpDir, '.cleargate', 'sprint-runs', 'SPRINT-26', 'plans');
    fs.mkdirSync(plansDir, { recursive: true });
    fs.writeFileSync(
      path.join(plansDir, 'M1.md'),
      '# M1 Plan\n\nPlan body with no frontmatter.',
      'utf8',
    );
  });

  after(() => cleanup(tmpDir));

  it('path validator rejects plans/M1.md (plans subdir not in allowlist) with exit 2', async () => {
    const mcp = makeMockMcp();
    const seams = makeSeams(tmpDir, mcp);

    const rejectedPath = path.join(
      tmpDir, '.cleargate', 'sprint-runs', 'SPRINT-26', 'plans', 'M1.md',
    );

    let threw = false;
    try {
      await pushHandler(rejectedPath, seams.opts);
    } catch {
      threw = true;
    }

    assert.ok(
      threw || seams.exitCode() !== null,
      'CR-064 Scenario 5 FAIL: pushHandler did not reject plans/M1.md.\n' +
      'PRE-FIX: no sprint-runs allowlist → path falls through to frontmatter parse.',
    );
    assert.equal(
      seams.exitCode(),
      2,
      `CR-064 Scenario 5 FAIL: expected exit 2 for plans/ rejection, got ${seams.exitCode()}.\n` +
      'PRE-FIX: rejection exit code is 1 (frontmatter error path) or absent.',
    );
    assert.equal(mcp.calls.length, 0, 'push_item must not be called for rejected paths.');
  });
});

// ── Scenario 6 — .script-incidents/foo.json → REJECTED ──────────────────────
// PRE-FIX: .script-incidents/ subdir not blocked; file parse fails with wrong code.

describe('CR-064 Scenario 6 — sprint-runs/SPRINT-26/.script-incidents/foo.json → REJECTS', () => {
  let tmpDir: string;

  before(() => {
    tmpDir = makeTmpDir();
    scaffold(tmpDir);

    const incDir = path.join(tmpDir, '.cleargate', 'sprint-runs', 'SPRINT-26', '.script-incidents');
    fs.mkdirSync(incDir, { recursive: true });
    fs.writeFileSync(path.join(incDir, 'foo.json'), '{"cmd":"node","exit":1}', 'utf8');
  });

  after(() => cleanup(tmpDir));

  it('path validator rejects .script-incidents/foo.json with exit 2', async () => {
    const mcp = makeMockMcp();
    const seams = makeSeams(tmpDir, mcp);

    const rejectedPath = path.join(
      tmpDir, '.cleargate', 'sprint-runs', 'SPRINT-26', '.script-incidents', 'foo.json',
    );

    let threw = false;
    try {
      await pushHandler(rejectedPath, seams.opts);
    } catch {
      threw = true;
    }

    assert.ok(
      threw || seams.exitCode() !== null,
      'CR-064 Scenario 6 FAIL: pushHandler accepted .script-incidents/ path.\n' +
      'PRE-FIX: no allowlist check for sprint-runs/ non-report paths.',
    );
    assert.equal(
      seams.exitCode(),
      2,
      `CR-064 Scenario 6 FAIL: expected exit 2, got ${seams.exitCode()}.\n` +
      'PRE-FIX: path validator absent → wrong exit code.',
    );
    assert.equal(mcp.calls.length, 0, 'push_item must not be called for rejected paths.');
  });
});

// ── Scenario 7 — sprint plan H1 title fallback ────────────────────────────────
// PRE-FIX: typeMap fails on sprint_id → exits 1 before reaching H1-fallback logic.
// This test FAILS pre-fix because push_item is never called.

describe('CR-064 Scenario 7 — sprint plan missing title: → H1 title fallback', () => {
  let tmpDir: string;

  before(() => {
    tmpDir = makeTmpDir();
    scaffold(tmpDir);

    const archiveDir = path.join(tmpDir, '.cleargate', 'delivery', 'archive');
    fs.mkdirSync(archiveDir, { recursive: true });
    writeFile(
      path.join(archiveDir, 'SPRINT-26_MCP_Agnostic.md'),
      {
        sprint_id: 'SPRINT-26',
        status: 'Active',
        // NO title field in frontmatter
      },
      '# SPRINT-26 Sprint Title\n\nBody of the sprint plan.',
    );
  });

  after(() => cleanup(tmpDir));

  it('push payload title is derived from H1 when frontmatter lacks title', async () => {
    const mcp = makeMockMcp();
    const seams = makeSeams(tmpDir, mcp);

    const filePath = path.join(
      tmpDir, '.cleargate', 'delivery', 'archive', 'SPRINT-26_MCP_Agnostic.md',
    );
    await pushHandler(filePath, seams.opts);

    const pushCall = mcp.calls.find((c) => c.tool === 'push_item');
    assert.ok(
      pushCall,
      'CR-064 Scenario 7 FAIL: push_item was not called.\n' +
      'PRE-FIX: sprint_id missing from typeMap → exit 1 before H1 fallback can run.',
    );

    const payload = (pushCall.args as { payload?: Record<string, unknown> }).payload ?? {};
    assert.equal(
      payload['title'],
      'SPRINT-26 Sprint Title',
      `CR-064 Scenario 7 FAIL: payload.title is "${String(payload['title'])}", expected "SPRINT-26 Sprint Title".\n` +
      'PRE-FIX: type lookup fails before H1 fallback → no push_item call.',
    );
  });
});

// ── Scenario 8 — sprint report H1 title fallback ─────────────────────────────
// PRE-FIX: path-override absent → path validator blocks sprint-runs/ path → exit 1/2.
// This test FAILS pre-fix: push_item never called.

describe('CR-064 Scenario 8 — sprint report missing title: → H1 title fallback', () => {
  let tmpDir: string;

  before(() => {
    tmpDir = makeTmpDir();
    scaffold(tmpDir);

    const reportDir = path.join(tmpDir, '.cleargate', 'sprint-runs', 'SPRINT-26');
    fs.mkdirSync(reportDir, { recursive: true });
    writeFile(
      path.join(reportDir, 'SPRINT-26_REPORT.md'),
      {
        sprint_id: 'SPRINT-26',
        status: 'Completed',
        // NO title field
      },
      '# SPRINT-26 Report: Wrap-up\n\nReport body content.',
    );
  });

  after(() => cleanup(tmpDir));

  it('push payload title is derived from H1 for sprint report when frontmatter lacks title', async () => {
    const mcp = makeMockMcp();
    const seams = makeSeams(tmpDir, mcp);

    const reportPath = path.join(
      tmpDir, '.cleargate', 'sprint-runs', 'SPRINT-26', 'SPRINT-26_REPORT.md',
    );
    await pushHandler(reportPath, seams.opts);

    const pushCall = mcp.calls.find((c) => c.tool === 'push_item');
    assert.ok(
      pushCall,
      'CR-064 Scenario 8 FAIL: push_item was not called.\n' +
      'PRE-FIX: sprint-runs/ path validator blocks file before H1 fallback runs.',
    );

    const payload = (pushCall.args as { payload?: Record<string, unknown> }).payload ?? {};
    assert.equal(
      payload['title'],
      'SPRINT-26 Report: Wrap-up',
      `CR-064 Scenario 8 FAIL: payload.title is "${String(payload['title'])}", expected "SPRINT-26 Report: Wrap-up".\n` +
      'PRE-FIX: path override + type override absent → MCP call never made.',
    );
  });
});
