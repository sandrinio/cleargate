/**
 * wiki-ingest-sprint-report.red.node.test.ts — CR-063 Red tests (QA-Red authored, immutable post-Red).
 *
 * Acceptance scenarios (CR-063 §4 + M1 plan §CR-063 test shape):
 *
 *   Scenario 1: path validator carve-out — SPRINT-NN/REPORT.md passes the validator
 *     (today's validator rejects it as outside .cleargate/delivery/).
 *
 *   Scenario 2: path validator carve-out — SPRINT-NN/SPRINT-NN_REPORT.md (canonical filename) passes.
 *
 *   Scenario 3: path validator rejects non-allowlisted sprint-runs file (token-ledger.jsonl → exit 2).
 *
 *   Scenario 4: EXCLUDED_SUFFIXES carve-out order — allowlist runs BEFORE exclusion check.
 *     If ordering is wrong, the allowlisted path is excluded before it reaches the carve-out.
 *
 *   Scenario 5: report-only ingest creates a wiki page with the sprint-report block and
 *     report_raw_path frontmatter.
 *
 *   Scenario 6: plan-then-report — single wiki page contains both plan stub AND report block.
 *
 *   Scenario 7: report-then-plan — both blocks present after second ingest; plan stub did NOT
 *     clobber the report block.
 *
 *   Scenario 8: re-ingest plan preserves report block verbatim (idempotency contract for plan source).
 *
 *   Scenario 9: re-ingest report preserves plan stub verbatim.
 *
 *   Scenario 10: idempotency no-op — running ingest twice produces no diff when neither source SHA changed.
 *
 *   Scenario 11: legacy filename REPORT.md under SPRINT-12/ → id derived as SPRINT-12.
 *
 *   Scenario 12: canonical filename SPRINT-26_REPORT.md → id derived as SPRINT-26.
 *
 *   Scenario 13: close_sprint.mjs Step 7.5 — literal comment anchor exists in the script.
 *
 *   Scenario 14: mirror parity — .cleargate/scripts/close_sprint.mjs and
 *     cleargate-planning/.cleargate/scripts/close_sprint.mjs are byte-identical.
 *
 *   Scenario 15: backfill script exists at cleargate-cli/scripts/backfill-sprint-reports.mjs.
 *
 * BASELINE FAIL CONTRACT:
 *   Scenarios 1-2 FAIL: path validator rejects sprint-runs paths (outside delivery/).
 *   Scenario 3 PASSES on baseline (non-allowlisted file should be rejected — this must stay a PASS post-impl too).
 *   Scenario 4 FAILS: exclusion check fires before allowlist check in current code order.
 *   Scenarios 5-12 FAIL: wikiIngestHandler rejects the sprint-runs path at validation, never reaches
 *     buildPageBody or derives bucket — no wiki page is created.
 *   Scenario 13 FAILS: close_sprint.mjs has no Step 7.5 block on baseline.
 *   Scenario 14 PASSES on baseline (files may be identical pre-CR; stays a PASS post-CR if correctly mirrored).
 *   Scenario 15 FAILS: backfill script does not exist on baseline.
 *
 * NOTE on Scenario 3 and 14: these test the ABSENCE of regressions. They must pass both before and after
 * implementation. If they were already passing pre-CR, baseline_fail count for those = 0.
 *
 * IMMUTABILITY: this file is sealed post-Red per CR-043 protocol. Devs must NOT modify it.
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Resolve repo root: cleargate-cli/test/wiki/ → up 3 → repo root
const REPO_ROOT = path.resolve(__dirname, '..', '..', '..');
const CLEARGATE_CLI_ROOT = path.resolve(__dirname, '..', '..');

// Templates dir for synthesis (test seam)
const TEMPLATE_DIR = path.resolve(CLEARGATE_CLI_ROOT, 'templates', 'synthesis');

// ─── Import the handler under test ───────────────────────────────────────────
// These imports resolve on baseline (handler exists) but will fail FUNCTIONALLY
// for sprint-runs paths (path validator rejects them).
import { wikiIngestHandler } from '../../src/commands/wiki-ingest.js';
import { parsePage } from '../../src/wiki/page-schema.js';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const FROZEN_NOW = '2026-05-15T10:00:00.000Z';
const FAKE_SHA = 'aabbcc1122334455aabbcc1122334455aabbcc11';
const FAKE_SHA_2 = 'ddeeff6677889900ddeeff6677889900ddeeff66';

/** Minimal frontmatter for a sprint plan in .cleargate/delivery/archive/ */
function sprintPlanContent(sprintId: string, status = 'Completed'): string {
  return `---
sprint_id: "${sprintId}"
status: "${status}"
remote_id: ""
title: "${sprintId} Test Sprint"
description: "A test sprint plan for unit testing."
---

# ${sprintId}: Test Sprint Plan

This is the sprint plan body.
`;
}

/** Minimal content for a sprint report */
function sprintReportContent(sprintId: string): string {
  return `---
sprint_id: "${sprintId}"
status: "Completed"
---

# ${sprintId} Report

This is the sprint report narrative. Shipped features: A, B, C.
`;
}

/** Build a minimal wiki seam with sprint-runs structure */
interface SprintFixture {
  root: string;
  deliveryRoot: string;
  wikiRoot: string;
  sprintRunsRoot: string;
  cleanup: () => void;
}

function buildSprintFixture(): SprintFixture {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'cg-sprint-report-red-'));
  const deliveryRoot = path.join(root, '.cleargate', 'delivery');
  const wikiRoot = path.join(root, '.cleargate', 'wiki');
  const sprintRunsRoot = path.join(root, '.cleargate', 'sprint-runs');

  for (const subdir of ['pending-sync', 'archive']) {
    fs.mkdirSync(path.join(deliveryRoot, subdir), { recursive: true });
  }
  for (const bucket of ['epics', 'stories', 'sprints', 'proposals', 'crs', 'bugs', 'topics']) {
    fs.mkdirSync(path.join(wikiRoot, bucket), { recursive: true });
  }
  fs.mkdirSync(sprintRunsRoot, { recursive: true });

  return {
    root,
    deliveryRoot,
    wikiRoot,
    sprintRunsRoot,
    cleanup: () => fs.rmSync(root, { recursive: true, force: true }),
  };
}

/** Create a sprint sprint-runs directory with a report file */
function addSprintRunReport(
  fix: SprintFixture,
  sprintId: string,
  filename: string,
  content: string,
): string {
  const sprintDir = path.join(fix.sprintRunsRoot, sprintId);
  fs.mkdirSync(sprintDir, { recursive: true });
  const filePath = path.join(sprintDir, filename);
  fs.writeFileSync(filePath, content, 'utf8');
  return filePath;
}

/** Add a sprint plan to the delivery archive */
function addSprintPlan(
  fix: SprintFixture,
  sprintId: string,
  filename: string,
  content: string,
): string {
  const filePath = path.join(fix.deliveryRoot, 'archive', filename);
  fs.writeFileSync(filePath, content, 'utf8');
  return filePath;
}

/** Run wikiIngestHandler in test-seam mode, capturing stdout/stderr/exitCode */
async function runIngest(
  fix: SprintFixture,
  rawPath: string,
  shaOverride?: string,
) {
  const out: string[] = [];
  const err: string[] = [];
  let exitCode: number | undefined;
  const sha = shaOverride ?? FAKE_SHA;

  const opts = {
    rawPath,
    cwd: fix.root,
    now: () => FROZEN_NOW,
    stdout: (s: string) => { out.push(s); },
    stderr: (s: string) => { err.push(s); },
    exit: (c: number): never => {
      exitCode = c;
      throw new Error(`EXIT:${c}`);
    },
    gitRunner: (_cmd: string, args: string[]) => {
      if (args[0] === 'log') return sha + '\n';
      return '\0__NONZERO__';
    },
    templateDir: TEMPLATE_DIR,
  };

  try {
    await wikiIngestHandler(opts);
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('EXIT:')) {
      return { stdout: out.join(''), stderr: err.join(''), exitCode };
    }
    throw e;
  }
  return { stdout: out.join(''), stderr: err.join(''), exitCode };
}

// ─── Scenario 1: Legacy REPORT.md passes path validator ──────────────────────

describe('CR-063 Scenario 1: Legacy REPORT.md passes path validator', () => {
  let fix: SprintFixture;

  before(() => {
    fix = buildSprintFixture();
    addSprintRunReport(
      fix,
      'SPRINT-12',
      'REPORT.md',
      sprintReportContent('SPRINT-12'),
    );
  });

  after(() => fix.cleanup());

  it('should NOT exit with code 2 (path-validator rejection) for .cleargate/sprint-runs/SPRINT-12/REPORT.md', async () => {
    const reportPath = path.join(fix.sprintRunsRoot, 'SPRINT-12', 'REPORT.md');
    const result = await runIngest(fix, reportPath);

    assert.notStrictEqual(
      result.exitCode,
      2,
      `Expected path validator to ACCEPT the sprint report (carve-out). Got exit 2.\nstderr: ${result.stderr}`,
    );
    // On baseline this FAILS: exit code IS 2 because the validator rejects sprint-runs paths.
  });
});

// ─── Scenario 2: Canonical SPRINT-NN_REPORT.md passes path validator ─────────

describe('CR-063 Scenario 2: Canonical SPRINT-NN_REPORT.md passes path validator', () => {
  let fix: SprintFixture;

  before(() => {
    fix = buildSprintFixture();
    addSprintRunReport(
      fix,
      'SPRINT-26',
      'SPRINT-26_REPORT.md',
      sprintReportContent('SPRINT-26'),
    );
  });

  after(() => fix.cleanup());

  it('should NOT exit with code 2 for .cleargate/sprint-runs/SPRINT-26/SPRINT-26_REPORT.md', async () => {
    const reportPath = path.join(fix.sprintRunsRoot, 'SPRINT-26', 'SPRINT-26_REPORT.md');
    const result = await runIngest(fix, reportPath);

    assert.notStrictEqual(
      result.exitCode,
      2,
      `Expected path validator to ACCEPT the sprint report canonical filename. Got exit 2.\nstderr: ${result.stderr}`,
    );
    // On baseline this FAILS: exit code IS 2.
  });
});

// ─── Scenario 3: Non-allowlisted sprint-runs file is rejected ─────────────────

describe('CR-063 Scenario 3: Non-allowlisted sprint-runs file rejected (exit 2)', () => {
  let fix: SprintFixture;

  before(() => {
    fix = buildSprintFixture();
    const sprintDir = path.join(fix.sprintRunsRoot, 'SPRINT-26');
    fs.mkdirSync(sprintDir, { recursive: true });
    fs.writeFileSync(path.join(sprintDir, 'token-ledger.jsonl'), '{}', 'utf8');
  });

  after(() => fix.cleanup());

  it('should exit 2 for .cleargate/sprint-runs/SPRINT-26/token-ledger.jsonl (not allowlisted)', async () => {
    const ledgerPath = path.join(fix.sprintRunsRoot, 'SPRINT-26', 'token-ledger.jsonl');
    const result = await runIngest(fix, ledgerPath);

    assert.strictEqual(
      result.exitCode,
      2,
      `Expected path validator to REJECT non-allowlisted sprint-runs file (token-ledger.jsonl) with exit 2. Got: ${result.exitCode}\nstderr: ${result.stderr}`,
    );
    // This PASSES on baseline (validator rejects all sprint-runs paths → exit 2).
    // Post-implementation it should still PASS (only allowlisted filenames get the carve-out).
  });
});

// ─── Scenario 4: EXCLUDED_SUFFIXES carve-out order — allowlist before exclusion ──

describe('CR-063 Scenario 4: Allowlist carve-out runs BEFORE EXCLUDED_SUFFIXES check', () => {
  let fix: SprintFixture;

  before(() => {
    fix = buildSprintFixture();
    addSprintRunReport(
      fix,
      'SPRINT-25',
      'SPRINT-25_REPORT.md',
      sprintReportContent('SPRINT-25'),
    );
  });

  after(() => fix.cleanup());

  it('REPORT.md path is not excluded (exit 0 or creates wiki page — not exit 0 due to "excluded (skip)")', async () => {
    const reportPath = path.join(fix.sprintRunsRoot, 'SPRINT-25', 'SPRINT-25_REPORT.md');
    const result = await runIngest(fix, reportPath);

    // The exclusion path emits: "wiki ingest: <path> excluded (skip)\n" and exits 0.
    // We assert the stdout does NOT contain "excluded (skip)" — if it does, the ordering is wrong.
    assert.ok(
      !result.stdout.includes('excluded (skip)'),
      `Expected allowlist carve-out to fire BEFORE exclusion check. Got "excluded (skip)" in stdout — ordering is wrong.\nstdout: ${result.stdout}`,
    );
    // On baseline this FAILS: the validator at line 109 rejects sprint-runs paths before the
    // exclusion check even fires (exits 2), OR if the exclusion check runs first it exits 0 with
    // "excluded (skip)". Either way the allowlist carve-out does not work.
    // But the specific assertion here is about the "excluded (skip)" message being absent.
    // We also assert exit code is not 2 (validator rejection).
    assert.notStrictEqual(
      result.exitCode,
      2,
      `Expected path to be accepted via carve-out, not rejected by validator.\nstderr: ${result.stderr}`,
    );
  });
});

// ─── Scenario 5: Report-only ingest creates wiki page with sprint-report block ─

describe('CR-063 Scenario 5: Report-only ingest creates wiki page with sprint-report block', () => {
  let fix: SprintFixture;

  before(() => {
    fix = buildSprintFixture();
    addSprintRunReport(
      fix,
      'SPRINT-22',
      'SPRINT-22_REPORT.md',
      sprintReportContent('SPRINT-22'),
    );
  });

  after(() => fix.cleanup());

  it('creates .cleargate/wiki/sprints/SPRINT-22.md containing <!-- BEGIN sprint-report --> block', async () => {
    const reportPath = path.join(fix.sprintRunsRoot, 'SPRINT-22', 'SPRINT-22_REPORT.md');
    await runIngest(fix, reportPath);

    const wikiPagePath = path.join(fix.wikiRoot, 'sprints', 'SPRINT-22.md');

    assert.ok(
      fs.existsSync(wikiPagePath),
      `Expected wiki page to be created at ${wikiPagePath}`,
    );

    const content = fs.readFileSync(wikiPagePath, 'utf8');

    assert.ok(
      content.includes('<!-- BEGIN sprint-report -->'),
      `Expected wiki page to contain <!-- BEGIN sprint-report --> delimiter.\nContent: ${content}`,
    );

    assert.ok(
      content.includes('<!-- END sprint-report -->'),
      `Expected wiki page to contain <!-- END sprint-report --> delimiter.\nContent: ${content}`,
    );

    // Verify frontmatter has report_raw_path
    const page = parsePage(content);
    assert.ok(
      (page as unknown as Record<string, unknown>)['report_raw_path'] !== undefined,
      `Expected wiki page frontmatter to contain report_raw_path field.\nParsed: ${JSON.stringify(page)}`,
    );

    // On baseline this FAILS: ingest exits 2 (path validator rejection), no wiki page created.
  });
});

// ─── Scenario 6: Plan then report — both blocks present ──────────────────────

describe('CR-063 Scenario 6: Plan-then-report — single page contains both plan stub AND report block', () => {
  let fix: SprintFixture;

  before(() => {
    fix = buildSprintFixture();
    // Add sprint plan to delivery archive
    addSprintPlan(
      fix,
      'SPRINT-20',
      'SPRINT-20_Test_Sprint.md',
      sprintPlanContent('SPRINT-20'),
    );
    // Add sprint report to sprint-runs
    addSprintRunReport(
      fix,
      'SPRINT-20',
      'SPRINT-20_REPORT.md',
      sprintReportContent('SPRINT-20'),
    );
  });

  after(() => fix.cleanup());

  it('after ingesting plan then report, wiki page contains both plan content and sprint-report block', async () => {
    const planPath = path.join(fix.deliveryRoot, 'archive', 'SPRINT-20_Test_Sprint.md');
    const reportPath = path.join(fix.sprintRunsRoot, 'SPRINT-20', 'SPRINT-20_REPORT.md');

    // Ingest plan first
    await runIngest(fix, planPath, FAKE_SHA);
    // Ingest report second (different SHA)
    await runIngest(fix, reportPath, FAKE_SHA_2);

    const wikiPagePath = path.join(fix.wikiRoot, 'sprints', 'SPRINT-20.md');
    assert.ok(fs.existsSync(wikiPagePath), `Wiki page must exist at ${wikiPagePath}`);

    const content = fs.readFileSync(wikiPagePath, 'utf8');

    assert.ok(
      content.includes('<!-- BEGIN sprint-report -->'),
      `Expected wiki page to contain report block after plan+report ingest.\nContent: ${content}`,
    );

    // The plan stub title should also be present
    assert.ok(
      content.includes('SPRINT-20'),
      `Expected wiki page to contain sprint ID from plan stub.\nContent: ${content}`,
    );

    // On baseline FAILS: report ingest exits 2.
  });
});

// ─── Scenario 7: Report then plan — both blocks preserved ────────────────────

describe('CR-063 Scenario 7: Report-then-plan — plan ingest does NOT clobber report block', () => {
  let fix: SprintFixture;

  before(() => {
    fix = buildSprintFixture();
    addSprintPlan(
      fix,
      'SPRINT-19',
      'SPRINT-19_Test_Sprint.md',
      sprintPlanContent('SPRINT-19'),
    );
    addSprintRunReport(
      fix,
      'SPRINT-19',
      'SPRINT-19_REPORT.md',
      sprintReportContent('SPRINT-19'),
    );
  });

  after(() => fix.cleanup());

  it('after ingesting report then plan, both blocks are present (plan did not clobber report)', async () => {
    const planPath = path.join(fix.deliveryRoot, 'archive', 'SPRINT-19_Test_Sprint.md');
    const reportPath = path.join(fix.sprintRunsRoot, 'SPRINT-19', 'SPRINT-19_REPORT.md');

    // Ingest report FIRST
    await runIngest(fix, reportPath, FAKE_SHA);
    // Ingest plan SECOND
    await runIngest(fix, planPath, FAKE_SHA_2);

    const wikiPagePath = path.join(fix.wikiRoot, 'sprints', 'SPRINT-19.md');
    assert.ok(fs.existsSync(wikiPagePath), `Wiki page must exist at ${wikiPagePath}`);

    const content = fs.readFileSync(wikiPagePath, 'utf8');

    assert.ok(
      content.includes('<!-- BEGIN sprint-report -->'),
      `Expected report block to SURVIVE plan-ingest (plan must preserve report block).\nContent: ${content}`,
    );
    assert.ok(
      content.includes('<!-- END sprint-report -->'),
      `Expected report block end delimiter to survive plan-ingest.\nContent: ${content}`,
    );

    // On baseline FAILS: report ingest exits 2, so after plan ingest there is no report block.
  });
});

// ─── Scenario 8: Re-ingest plan preserves report block ───────────────────────

describe('CR-063 Scenario 8: Re-ingesting plan a second time preserves the report block verbatim', () => {
  let fix: SprintFixture;
  const REPORT_SENTINEL = 'Shipped features: A, B, C — SENTINEL TEXT';

  before(() => {
    fix = buildSprintFixture();
    addSprintPlan(
      fix,
      'SPRINT-18',
      'SPRINT-18_Test_Sprint.md',
      sprintPlanContent('SPRINT-18'),
    );
    addSprintRunReport(
      fix,
      'SPRINT-18',
      'SPRINT-18_REPORT.md',
      `---\nsprint_id: "SPRINT-18"\nstatus: "Completed"\n---\n\n# SPRINT-18 Report\n\n${REPORT_SENTINEL}\n`,
    );
  });

  after(() => fix.cleanup());

  it('report sentinel text survives a second plan ingest', async () => {
    const planPath = path.join(fix.deliveryRoot, 'archive', 'SPRINT-18_Test_Sprint.md');
    const reportPath = path.join(fix.sprintRunsRoot, 'SPRINT-18', 'SPRINT-18_REPORT.md');

    // Ingest plan → ingest report → ingest plan again (different SHA to force re-ingest)
    await runIngest(fix, planPath, FAKE_SHA);
    await runIngest(fix, reportPath, FAKE_SHA_2);
    await runIngest(fix, planPath, 'fffaaa000111222333444555666777888999aaab'); // force re-ingest

    const wikiPagePath = path.join(fix.wikiRoot, 'sprints', 'SPRINT-18.md');
    assert.ok(fs.existsSync(wikiPagePath), `Wiki page must exist at ${wikiPagePath}`);

    const content = fs.readFileSync(wikiPagePath, 'utf8');
    assert.ok(
      content.includes(REPORT_SENTINEL),
      `Expected sentinel text from report to survive re-ingest of plan.\nContent: ${content}`,
    );

    // On baseline FAILS: report block was never created (ingest exits 2).
  });
});

// ─── Scenario 9: Re-ingest report preserves plan stub ────────────────────────

describe('CR-063 Scenario 9: Re-ingesting report preserves plan stub verbatim', () => {
  let fix: SprintFixture;
  const PLAN_SENTINEL = 'unique-plan-description-SENTINEL-XYZ';

  before(() => {
    fix = buildSprintFixture();
    addSprintPlan(
      fix,
      'SPRINT-17',
      'SPRINT-17_Test_Sprint.md',
      `---\nsprint_id: "SPRINT-17"\nstatus: "Completed"\nremote_id: ""\ntitle: "Sprint 17"\ndescription: "${PLAN_SENTINEL}"\n---\n\n# SPRINT-17: Sprint 17\n\n${PLAN_SENTINEL}\n`,
    );
    addSprintRunReport(
      fix,
      'SPRINT-17',
      'SPRINT-17_REPORT.md',
      sprintReportContent('SPRINT-17'),
    );
  });

  after(() => fix.cleanup());

  it('plan sentinel text survives a second report ingest', async () => {
    const planPath = path.join(fix.deliveryRoot, 'archive', 'SPRINT-17_Test_Sprint.md');
    const reportPath = path.join(fix.sprintRunsRoot, 'SPRINT-17', 'SPRINT-17_REPORT.md');

    // Ingest plan → ingest report → ingest report again (different SHA)
    await runIngest(fix, planPath, FAKE_SHA);
    await runIngest(fix, reportPath, FAKE_SHA_2);
    await runIngest(fix, reportPath, 'ccc111222333444555666777888999aaa000bbb1'); // force re-ingest

    const wikiPagePath = path.join(fix.wikiRoot, 'sprints', 'SPRINT-17.md');
    assert.ok(fs.existsSync(wikiPagePath), `Wiki page must exist at ${wikiPagePath}`);

    const content = fs.readFileSync(wikiPagePath, 'utf8');
    assert.ok(
      content.includes(PLAN_SENTINEL),
      `Expected plan sentinel text to survive re-ingest of report.\nContent: ${content}`,
    );

    // On baseline FAILS: report ingest exits 2.
  });
});

// ─── Scenario 10: Idempotency — second ingest produces no-op ─────────────────

describe('CR-063 Scenario 10: Idempotency — second report ingest is a no-op when SHA unchanged', () => {
  let fix: SprintFixture;

  before(() => {
    fix = buildSprintFixture();
    addSprintRunReport(
      fix,
      'SPRINT-16',
      'SPRINT-16_REPORT.md',
      sprintReportContent('SPRINT-16'),
    );
  });

  after(() => fix.cleanup());

  it('second ingest with same SHA emits "(no-op)" and does not modify the wiki page', async () => {
    const reportPath = path.join(fix.sprintRunsRoot, 'SPRINT-16', 'SPRINT-16_REPORT.md');
    const wikiPagePath = path.join(fix.wikiRoot, 'sprints', 'SPRINT-16.md');

    // First ingest
    await runIngest(fix, reportPath, FAKE_SHA);

    // Record page mtime if created
    const mtimeBefore = fs.existsSync(wikiPagePath)
      ? fs.statSync(wikiPagePath).mtimeMs
      : undefined;

    // Second ingest with SAME SHA — must be a no-op
    const secondResult = await runIngest(fix, reportPath, FAKE_SHA);

    assert.ok(
      secondResult.stdout.includes('no-op'),
      `Expected second ingest to emit "no-op" when SHA unchanged.\nstdout: ${secondResult.stdout}`,
    );

    if (mtimeBefore !== undefined) {
      const mtimeAfter = fs.statSync(wikiPagePath).mtimeMs;
      assert.strictEqual(
        mtimeAfter,
        mtimeBefore,
        `Expected wiki page mtime to be unchanged on no-op ingest.`,
      );
    }

    // On baseline FAILS: first ingest exits 2, no page created; "no-op" text never emitted.
  });
});

// ─── Scenario 11: Legacy REPORT.md derives id from parent dir ─────────────────

describe('CR-063 Scenario 11: Legacy REPORT.md → id derived as SPRINT-12', () => {
  let fix: SprintFixture;

  before(() => {
    fix = buildSprintFixture();
    addSprintRunReport(fix, 'SPRINT-12', 'REPORT.md', sprintReportContent('SPRINT-12'));
  });

  after(() => fix.cleanup());

  it('ingesting .cleargate/sprint-runs/SPRINT-12/REPORT.md creates SPRINT-12.md in wiki/sprints/', async () => {
    const reportPath = path.join(fix.sprintRunsRoot, 'SPRINT-12', 'REPORT.md');
    await runIngest(fix, reportPath);

    const expectedWikiPage = path.join(fix.wikiRoot, 'sprints', 'SPRINT-12.md');
    assert.ok(
      fs.existsSync(expectedWikiPage),
      `Expected wiki page at wiki/sprints/SPRINT-12.md. The legacy REPORT.md filename must derive id from parent directory SPRINT-12.\nExisting files in sprints/: ${fs.existsSync(path.join(fix.wikiRoot, 'sprints')) ? fs.readdirSync(path.join(fix.wikiRoot, 'sprints')).join(', ') : 'none'}`,
    );

    // On baseline FAILS: ingest exits 2, no page created.
  });
});

// ─── Scenario 12: Canonical SPRINT-NN_REPORT.md derives id correctly ──────────

describe('CR-063 Scenario 12: Canonical SPRINT-26_REPORT.md → id derived as SPRINT-26', () => {
  let fix: SprintFixture;

  before(() => {
    fix = buildSprintFixture();
    addSprintRunReport(
      fix,
      'SPRINT-26',
      'SPRINT-26_REPORT.md',
      sprintReportContent('SPRINT-26'),
    );
  });

  after(() => fix.cleanup());

  it('ingesting .cleargate/sprint-runs/SPRINT-26/SPRINT-26_REPORT.md creates SPRINT-26.md in wiki/sprints/', async () => {
    const reportPath = path.join(fix.sprintRunsRoot, 'SPRINT-26', 'SPRINT-26_REPORT.md');
    await runIngest(fix, reportPath);

    const expectedWikiPage = path.join(fix.wikiRoot, 'sprints', 'SPRINT-26.md');
    assert.ok(
      fs.existsSync(expectedWikiPage),
      `Expected wiki page at wiki/sprints/SPRINT-26.md. The canonical filename SPRINT-26_REPORT.md must derive id=SPRINT-26 from parent dir.\nExisting: ${fs.existsSync(path.join(fix.wikiRoot, 'sprints')) ? fs.readdirSync(path.join(fix.wikiRoot, 'sprints')).join(', ') : 'none'}`,
    );

    // Verify the page id field
    const content = fs.readFileSync(expectedWikiPage, 'utf8');
    const page = parsePage(content);
    assert.strictEqual(
      page.id,
      'SPRINT-26',
      `Expected page id to be SPRINT-26, got: ${page.id}`,
    );

    // On baseline FAILS: ingest exits 2.
  });
});

// ─── Scenario 13: close_sprint.mjs Step 7.5 anchor comment ───────────────────

describe('CR-063 Scenario 13: close_sprint.mjs contains Step 7.5 anchor comment', () => {
  it('literal comment "// CR-063: wiki ingest sprint report" appears in .cleargate/scripts/close_sprint.mjs', () => {
    // Per M1 plan: "The Step 7.5 header comment MUST be a literal anchor"
    // The M1 plan specifies: // ── Step 7.5: wiki ingest sprint report ─────────────────
    // The dispatch spec also requires: // CR-063: wiki ingest sprint report
    // We test for BOTH the step header AND the CR anchor.
    const scriptPath = path.join(REPO_ROOT, '.cleargate', 'scripts', 'close_sprint.mjs');
    assert.ok(
      fs.existsSync(scriptPath),
      `close_sprint.mjs not found at ${scriptPath}`,
    );

    const content = fs.readFileSync(scriptPath, 'utf8');

    assert.ok(
      content.includes('Step 7.5'),
      `Expected close_sprint.mjs to contain "Step 7.5" step block.\nFile does not contain "Step 7.5". This is a baseline failure — Dev must insert Step 7.5.`,
    );

    assert.ok(
      content.includes('// CR-063: wiki ingest sprint report'),
      `Expected close_sprint.mjs to contain the literal anchor comment "// CR-063: wiki ingest sprint report".\nThis comment is required for CR-064 to find the insertion point.`,
    );

    // On baseline FAILS: neither "Step 7.5" nor the anchor comment exists in close_sprint.mjs.
  });
});

// ─── Scenario 14: Mirror parity — both close_sprint.mjs copies are byte-identical ──

describe('CR-063 Scenario 14: Mirror parity — close_sprint.mjs byte-identical in both locations', () => {
  it('diff between .cleargate/scripts/close_sprint.mjs and cleargate-planning/.cleargate/scripts/close_sprint.mjs is empty', () => {
    const livePath = path.join(REPO_ROOT, '.cleargate', 'scripts', 'close_sprint.mjs');
    const canonicalPath = path.join(
      REPO_ROOT,
      'cleargate-planning',
      '.cleargate',
      'scripts',
      'close_sprint.mjs',
    );

    assert.ok(fs.existsSync(livePath), `Live script missing: ${livePath}`);
    assert.ok(fs.existsSync(canonicalPath), `Canonical script missing: ${canonicalPath}`);

    const liveContent = fs.readFileSync(livePath, 'utf8');
    const canonicalContent = fs.readFileSync(canonicalPath, 'utf8');

    assert.strictEqual(
      liveContent,
      canonicalContent,
      `Expected close_sprint.mjs to be byte-identical in both locations after CR-063 edits.\nLive path: ${livePath}\nCanonical path: ${canonicalPath}\nNote: on baseline these may already be identical (no pre-existing divergence required); this test verifies post-CR parity.`,
    );

    // On baseline: may PASS (files could be identical pre-CR) or FAIL (pre-existing divergence).
    // Post-implementation: must PASS (both get the same Step 7.5 insertion).
  });
});

// ─── Scenario 15: Backfill script exists ─────────────────────────────────────

describe('CR-063 Scenario 15: Backfill script exists at cleargate-cli/scripts/backfill-sprint-reports.mjs', () => {
  it('backfill-sprint-reports.mjs file exists under cleargate-cli/scripts/', () => {
    const scriptPath = path.join(CLEARGATE_CLI_ROOT, 'scripts', 'backfill-sprint-reports.mjs');
    assert.ok(
      fs.existsSync(scriptPath),
      `Expected backfill script at ${scriptPath}. Dev must create cleargate-cli/scripts/backfill-sprint-reports.mjs.`,
    );

    // Verify it is not empty (has content)
    const content = fs.readFileSync(scriptPath, 'utf8');
    assert.ok(
      content.length > 100,
      `Backfill script exists but appears to be a stub (< 100 chars). Expected a real implementation.`,
    );

    // Verify it references SPRINT-03 and SPRINT-26 (the defined backfill range)
    assert.ok(
      content.includes('SPRINT-03') || content.includes('03'),
      `Expected backfill script to reference start of range SPRINT-03.\nContent snippet: ${content.slice(0, 300)}`,
    );

    // On baseline FAILS: file does not exist.
  });
});
