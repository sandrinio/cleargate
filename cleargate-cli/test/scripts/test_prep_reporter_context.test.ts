/**
 * test_prep_reporter_context.test.ts — CR-035 smoke tests
 *
 * Verifies that prep_reporter_context.mjs buildTokenLedgerDigest() emits
 * the session-totals delta (sprint_work_tokens / sprint_total_tokens /
 * reporter_pass_tokens) when called with a fixture sprint directory.
 *
 * Two scenarios:
 *   1. Positive: fixture with token-ledger.jsonl (3 dev rows + 1 reporter row)
 *      + .session-totals.json (UUID-keyed map). Digest contains correct numbers.
 *   2. Missing .session-totals.json fallback: digest emits null for sprint_total
 *      and a legacy-fallback note.
 */

import { describe, it, expect, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// cleargate-cli/test/scripts/ → up 3 → repo root
const REPO_ROOT = path.resolve(__dirname, '..', '..', '..');
const PREP_REPORTER_SCRIPT = path.join(
  REPO_ROOT,
  '.cleargate',
  'scripts',
  'prep_reporter_context.mjs',
);

const tmpDirs: string[] = [];

function makeTmpDir(): string {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'cg-prep-reporter-'));
  tmpDirs.push(d);
  return d;
}

afterEach(() => {
  for (const d of tmpDirs.splice(0)) {
    fs.rmSync(d, { recursive: true, force: true });
  }
});

/**
 * Build a minimal ledger row.
 * agent_type controls filtering (reporter rows are excluded from sprint_work).
 */
function makeLedgerRow(opts: {
  agentType: string;
  input: number;
  output: number;
  cacheCreation: number;
  cacheRead: number;
}): string {
  return JSON.stringify({
    ts: '2026-05-03T10:00:00Z',
    sprint_id: 'SPRINT-fixture',
    story_id: 'STORY-001-01',
    work_item_id: 'STORY-001-01',
    agent_type: opts.agentType,
    session_id: 'aaaaaaaa-0000-0000-0000-000000000000',
    transcript: '/dev/null',
    sentinel_started_at: '',
    delta_from_turn: 0,
    delta: {
      input: opts.input,
      output: opts.output,
      cache_creation: opts.cacheCreation,
      cache_read: opts.cacheRead,
    },
    session_total: {
      input: opts.input,
      output: opts.output,
      cache_creation: opts.cacheCreation,
      cache_read: opts.cacheRead,
    },
    model: 'claude-opus-4-7',
    turns: 10,
  });
}

/**
 * Scenario 1: positive — session-totals.json present (UUID-keyed map).
 *
 * Ledger: 3 dev rows + 1 reporter row.
 *   dev deltas: 100+200+300 input, 1000+2000+3000 output, 0 cacheCreation, 0 cacheRead
 *   reporter delta: 50 input, 500 output, 0 cacheCreation, 0 cacheRead
 *
 * sprint_work_tokens = sum(all ledger deltas) - reporter_sum
 *   all_sum = (100+200+300+50)+(1000+2000+3000+500) = 650+6500 = 7150
 *   reporter_sum = 50+500 = 550
 *   sprint_work_tokens = 7150 - 550 = 6600
 *
 * .session-totals.json: { "uuid-1": { input:1000, output:20000, cache_creation:5000, cache_read:0 } }
 *   sprint_total_tokens = 1000+20000+5000+0 = 26000
 *
 * reporter_pass_tokens = null (always)
 */
describe('CR-035 Scenario 1: session-totals.json present — digest contains correct split numbers', () => {
  it('sprint_work_tokens reflects non-reporter delta sum', () => {
    const tmpSprintDir = makeTmpDir();
    const sprintId = 'SPRINT-fixture';

    // Write token-ledger.jsonl: 3 dev rows + 1 reporter row
    const devRow1 = makeLedgerRow({ agentType: 'developer', input: 100, output: 1000, cacheCreation: 0, cacheRead: 0 });
    const devRow2 = makeLedgerRow({ agentType: 'developer', input: 200, output: 2000, cacheCreation: 0, cacheRead: 0 });
    const devRow3 = makeLedgerRow({ agentType: 'qa', input: 300, output: 3000, cacheCreation: 0, cacheRead: 0 });
    const reporterRow = makeLedgerRow({ agentType: 'reporter', input: 50, output: 500, cacheCreation: 0, cacheRead: 0 });
    fs.writeFileSync(
      path.join(tmpSprintDir, 'token-ledger.jsonl'),
      [devRow1, devRow2, devRow3, reporterRow].join('\n') + '\n',
    );

    // Write .session-totals.json as UUID-keyed map
    fs.writeFileSync(
      path.join(tmpSprintDir, '.session-totals.json'),
      JSON.stringify({
        'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee': {
          input: 1000,
          output: 20000,
          cache_creation: 5000,
          cache_read: 0,
          last_ts: '2026-05-03T10:00:00Z',
          last_turn_index: 0,
        },
      }),
    );

    // Write minimal sprint file so prep_reporter_context.mjs doesn't bail
    const pendingSyncDir = makeTmpDir();
    fs.writeFileSync(
      path.join(pendingSyncDir, `${sprintId}_fixture.md`),
      '---\nsprint_id: SPRINT-fixture\nstatus: Active\nstarted_at: 2026-05-03\n---\n# Sprint fixture\n',
    );

    const result = spawnSync(
      process.execPath,
      [PREP_REPORTER_SCRIPT, sprintId],
      {
        encoding: 'utf8',
        env: {
          ...process.env,
          CLEARGATE_SPRINT_DIR: tmpSprintDir,
          CLEARGATE_PENDING_SYNC_DIR: pendingSyncDir,
        },
      },
    );

    // The script writes .reporter-context.md; read it back
    const contextPath = path.join(tmpSprintDir, '.reporter-context.md');
    expect(fs.existsSync(contextPath), `Expected ${contextPath} to exist. stderr: ${result.stderr}`).toBe(true);

    const context = fs.readFileSync(contextPath, 'utf8');

    // sprint_work_tokens = 7150 - 550 = 6600
    expect(context).toContain('sprint_work_tokens: 6,600');

    // sprint_total_tokens = 1000+20000+5000+0 = 26,000
    expect(context).toContain('sprint_total_tokens: 26,000');

    // reporter_pass_tokens is always null
    expect(context).toContain('reporter_pass_tokens: null');
  });
});

/**
 * Scenario 2: missing .session-totals.json — legacy fallback.
 *
 * Same ledger as Scenario 1 but no .session-totals.json.
 * sprint_total_tokens should be null with a legacy-fallback note in the digest.
 */
describe('CR-035 Scenario 2: .session-totals.json absent — digest emits null + legacy note', () => {
  it('sprint_total_tokens is null and legacy note is present', () => {
    const tmpSprintDir = makeTmpDir();
    const sprintId = 'SPRINT-fixture';

    // Write token-ledger.jsonl (no reporter row this time — simpler)
    const devRow = makeLedgerRow({ agentType: 'developer', input: 100, output: 1000, cacheCreation: 0, cacheRead: 0 });
    fs.writeFileSync(
      path.join(tmpSprintDir, 'token-ledger.jsonl'),
      devRow + '\n',
    );

    // No .session-totals.json written

    const pendingSyncDir = makeTmpDir();
    fs.writeFileSync(
      path.join(pendingSyncDir, `${sprintId}_fixture.md`),
      '---\nsprint_id: SPRINT-fixture\nstatus: Active\nstarted_at: 2026-05-03\n---\n# Sprint fixture\n',
    );

    const result = spawnSync(
      process.execPath,
      [PREP_REPORTER_SCRIPT, sprintId],
      {
        encoding: 'utf8',
        env: {
          ...process.env,
          CLEARGATE_SPRINT_DIR: tmpSprintDir,
          CLEARGATE_PENDING_SYNC_DIR: pendingSyncDir,
        },
      },
    );

    const contextPath = path.join(tmpSprintDir, '.reporter-context.md');
    expect(fs.existsSync(contextPath), `Expected ${contextPath} to exist. stderr: ${result.stderr}`).toBe(true);

    const context = fs.readFileSync(contextPath, 'utf8');

    // sprint_total_tokens should be null with a fallback note
    expect(context).toContain('sprint_total_tokens: null');
    expect(context).toContain('legacy-fallback');

    // reporter_pass_tokens is always null
    expect(context).toContain('reporter_pass_tokens: null');
  });
});
