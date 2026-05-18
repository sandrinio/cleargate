/**
 * migrate-status-to-completed.red.node.test.ts — QA-Red authored (STORY-067-01)
 *
 * Acceptance scenarios (STORY-067-01 §2.1 Gherkin + §4.1 lock-interaction):
 *
 *   Scenario 1: Rewrite Done → Completed
 *   Scenario 2: Rewrite Verified → Completed
 *   Scenario 3: Leave Completed unchanged
 *   Scenario 4: Idempotency — second run reports "Rewrote: 0 files"
 *   Scenario 5: Flag non-terminal stale statuses without rewriting
 *   Scenario 6: Lock respected by concurrent push (exit code 75)
 *   (Bonus) Scenario 7: Quoted variants Done/"Verified" rewritten
 *
 * BASELINE FAIL CONTRACT:
 *   All scenarios fail against clean baseline because:
 *   - cleargate-cli/scripts/migrate-status-to-completed.mjs does NOT exist yet
 *     (spawnSync calls exit with ENOENT / non-zero status).
 *   - push.ts lock-check block does NOT exist yet (pushHandler does not read
 *     .migration-lock; exit code 75 path is absent).
 *
 * IMMUTABILITY: this file is sealed post-Red. Devs must NOT modify it.
 * Naming: *.red.node.test.ts — immutable per SKILL.md §C.3.
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { spawnSync, type SpawnSyncReturns } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ── Path resolution ─────────────────────────────────────────────────────────

// cleargate-cli/test/scripts/ → up 2 → cleargate-cli/
const CLI_ROOT = path.resolve(__dirname, '..', '..');
// cleargate-cli/ → up 1 → repo root
const REPO_ROOT = path.resolve(CLI_ROOT, '..');

const SCRIPT_PATH = path.join(CLI_ROOT, 'scripts', 'migrate-status-to-completed.mjs');

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeTmpDelivery(): { tmpRoot: string; deliveryRoot: string; cleargatDir: string } {
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'migration-test-'));
  const deliveryRoot = path.join(tmpRoot, '.cleargate', 'delivery');
  const cleargatDir = path.join(tmpRoot, '.cleargate');
  fs.mkdirSync(path.join(deliveryRoot, 'pending-sync'), { recursive: true });
  fs.mkdirSync(path.join(deliveryRoot, 'archive'), { recursive: true });
  return { tmpRoot, deliveryRoot, cleargatDir };
}

function writeFixture(dir: string, filename: string, content: string): string {
  const filePath = path.join(dir, filename);
  fs.writeFileSync(filePath, content, 'utf8');
  return filePath;
}

function runMigrationScript(
  deliveryRoot: string,
  args: string[] = ['--apply'],
): SpawnSyncReturns<string> {
  return spawnSync(process.execPath, [SCRIPT_PATH, ...args, '--delivery-root', deliveryRoot], {
    encoding: 'utf8',
    timeout: 15_000,
  });
}

// ── Scenario 1: Rewrite Done → Completed ─────────────────────────────────────

describe('Scenario 1: Rewrite Done → Completed', () => {
  let tmpRoot: string;
  let deliveryRoot: string;
  let storyPath: string;
  const BODY_MARKER = 'Body content that must be preserved byte-for-byte.';
  const ORIGINAL = `---\nstory_id: STORY-FX1\nstatus: Done\napproved: true\n---\n\n# STORY-FX1: Done Fixture\n\n${BODY_MARKER}\n`;

  before(() => {
    ({ tmpRoot, deliveryRoot } = makeTmpDelivery());
    storyPath = writeFixture(path.join(deliveryRoot, 'pending-sync'), 'STORY-FX1.md', ORIGINAL);
  });

  after(() => {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  });

  it('script exits 0', () => {
    const result = runMigrationScript(deliveryRoot);
    assert.strictEqual(result.status, 0, `script exited ${result.status}: ${result.stderr}`);
  });

  it('STORY-FX1.md reads "status: Completed" after run', () => {
    runMigrationScript(deliveryRoot);
    const content = fs.readFileSync(storyPath, 'utf8');
    assert.match(content, /^status: Completed$/m);
    assert.doesNotMatch(content, /^status: Done$/m);
  });

  it('body bytes (after closing ---) are unchanged', () => {
    runMigrationScript(deliveryRoot);
    const content = fs.readFileSync(storyPath, 'utf8');
    assert.ok(content.includes(BODY_MARKER), 'body marker must survive migration');
  });

  it('summary reports at least 1 Done rewrite', () => {
    const result = runMigrationScript(deliveryRoot);
    // After idempotent second run above summary may say 0; run fresh copy
    const { deliveryRoot: dr2, tmpRoot: tr2 } = makeTmpDelivery();
    writeFixture(path.join(dr2, 'pending-sync'), 'STORY-FX1.md', ORIGINAL);
    const r2 = runMigrationScript(dr2);
    fs.rmSync(tr2, { recursive: true, force: true });
    assert.match(r2.stdout, /Rewrote:\s*\d+\s*files/i);
    // ensure it mentions Done in summary
    assert.match(r2.stdout, /Done/i);
  });
});

// ── Scenario 2: Rewrite Verified → Completed ─────────────────────────────────

describe('Scenario 2: Rewrite Verified → Completed', () => {
  let tmpRoot: string;
  let deliveryRoot: string;
  let bugPath: string;
  const ORIGINAL = `---\nstory_id: BUG-FX2\nstatus: Verified\napproved: true\n---\n\n# BUG-FX2: Verified Fixture\n\nBody unchanged.\n`;

  before(() => {
    ({ tmpRoot, deliveryRoot } = makeTmpDelivery());
    bugPath = writeFixture(path.join(deliveryRoot, 'archive'), 'BUG-FX2.md', ORIGINAL);
  });

  after(() => {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  });

  it('script exits 0', () => {
    const result = runMigrationScript(deliveryRoot);
    assert.strictEqual(result.status, 0, `script exited ${result.status}: ${result.stderr}`);
  });

  it('BUG-FX2.md reads "status: Completed" after run', () => {
    runMigrationScript(deliveryRoot);
    const content = fs.readFileSync(bugPath, 'utf8');
    assert.match(content, /^status: Completed$/m);
    assert.doesNotMatch(content, /^status: Verified$/m);
  });

  it('summary mentions Verified in rewrite count', () => {
    const { deliveryRoot: dr2, tmpRoot: tr2 } = makeTmpDelivery();
    writeFixture(path.join(dr2, 'archive'), 'BUG-FX2.md', ORIGINAL);
    const r2 = runMigrationScript(dr2);
    fs.rmSync(tr2, { recursive: true, force: true });
    assert.match(r2.stdout, /Rewrote:\s*\d+\s*files/i);
    assert.match(r2.stdout, /Verified/i);
  });
});

// ── Scenario 3: Leave Completed unchanged ─────────────────────────────────────

describe('Scenario 3: Leave Completed unchanged', () => {
  let tmpRoot: string;
  let deliveryRoot: string;
  let storyPath: string;
  const ORIGINAL = `---\nstory_id: STORY-FX3\nstatus: Completed\napproved: true\n---\n\n# STORY-FX3: Already Completed\n\nMust not be touched.\n`;

  before(() => {
    ({ tmpRoot, deliveryRoot } = makeTmpDelivery());
    storyPath = writeFixture(path.join(deliveryRoot, 'archive'), 'STORY-FX3.md', ORIGINAL);
  });

  after(() => {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  });

  it('STORY-FX3.md is byte-identical after run', () => {
    const before = fs.readFileSync(storyPath);
    runMigrationScript(deliveryRoot);
    const after = fs.readFileSync(storyPath);
    assert.deepStrictEqual(before, after, 'Completed file must not be modified');
  });

  it('summary reports Rewrote: 0 files when only Completed present', () => {
    const result = runMigrationScript(deliveryRoot);
    assert.match(result.stdout, /Rewrote:\s*0\s*files/i);
  });
});

// ── Scenario 4: Idempotency ────────────────────────────────────────────────────

describe('Scenario 4: Idempotency', () => {
  let tmpRoot: string;
  let deliveryRoot: string;
  let storyPath: string;
  let bugPath: string;
  let completedPath: string;

  before(() => {
    ({ tmpRoot, deliveryRoot } = makeTmpDelivery());
    storyPath = writeFixture(
      path.join(deliveryRoot, 'pending-sync'),
      'STORY-FX1.md',
      `---\nstory_id: STORY-FX1\nstatus: Done\napproved: true\n---\n\nBody A.\n`,
    );
    bugPath = writeFixture(
      path.join(deliveryRoot, 'archive'),
      'BUG-FX2.md',
      `---\nstory_id: BUG-FX2\nstatus: Verified\napproved: true\n---\n\nBody B.\n`,
    );
    completedPath = writeFixture(
      path.join(deliveryRoot, 'archive'),
      'STORY-FX3.md',
      `---\nstory_id: STORY-FX3\nstatus: Completed\napproved: true\n---\n\nBody C.\n`,
    );
  });

  after(() => {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  });

  it('second run reports "Rewrote: 0 files"', () => {
    // First run — rewrites Done + Verified
    const first = runMigrationScript(deliveryRoot);
    assert.strictEqual(first.status, 0, `first run exited ${first.status}: ${first.stderr}`);
    // Second run — should be idempotent
    const second = runMigrationScript(deliveryRoot);
    assert.strictEqual(second.status, 0, `second run exited ${second.status}: ${second.stderr}`);
    assert.match(second.stdout, /Rewrote:\s*0\s*files/i);
  });

  it('every file is byte-identical after second run', () => {
    // Files already migrated by the first run in the prior test;
    // snapshot them, run again, compare.
    const snap = (p: string) => fs.readFileSync(p);
    const snaps = [storyPath, bugPath, completedPath].map(snap);

    runMigrationScript(deliveryRoot);

    [storyPath, bugPath, completedPath].forEach((p, i) => {
      assert.deepStrictEqual(snap(p), snaps[i], `${path.basename(p)} changed on second run`);
    });
  });
});

// ── Scenario 5: Flag non-terminal stale without rewriting ─────────────────────

describe('Scenario 5: Flag non-terminal stale statuses without rewriting', () => {
  let tmpRoot: string;
  let deliveryRoot: string;
  let fx4Path: string;
  let fx5Path: string;
  const FX4_ORIGINAL = `---\nstory_id: STORY-FX4\nstatus: Approved\napproved: true\n---\n\nApproved body.\n`;
  const FX5_ORIGINAL = `---\nstory_id: STORY-FX5\nstatus: Triaged\napproved: false\n---\n\nTriaged body.\n`;

  before(() => {
    ({ tmpRoot, deliveryRoot } = makeTmpDelivery());
    fx4Path = writeFixture(path.join(deliveryRoot, 'archive'), 'STORY-FX4.md', FX4_ORIGINAL);
    fx5Path = writeFixture(path.join(deliveryRoot, 'archive'), 'STORY-FX5.md', FX5_ORIGINAL);
  });

  after(() => {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  });

  it('STORY-FX4.md is NOT rewritten', () => {
    runMigrationScript(deliveryRoot);
    const content = fs.readFileSync(fx4Path, 'utf8');
    assert.match(content, /^status: Approved$/m, 'Approved status must remain unchanged');
    assert.doesNotMatch(content, /^status: Completed$/m);
  });

  it('STORY-FX5.md is NOT rewritten', () => {
    runMigrationScript(deliveryRoot);
    const content = fs.readFileSync(fx5Path, 'utf8');
    assert.match(content, /^status: Triaged$/m, 'Triaged status must remain unchanged');
    assert.doesNotMatch(content, /^status: Completed$/m);
  });

  it('summary lists both files under "Flagged for human review"', () => {
    const result = runMigrationScript(deliveryRoot);
    assert.match(
      result.stdout,
      /Flagged for human review/i,
      'summary must mention "Flagged for human review"',
    );
    assert.ok(
      result.stdout.includes('STORY-FX4.md') || result.stdout.includes('STORY-FX4'),
      'summary must list STORY-FX4',
    );
    assert.ok(
      result.stdout.includes('STORY-FX5.md') || result.stdout.includes('STORY-FX5'),
      'summary must list STORY-FX5',
    );
  });

  it('Rewrote: 0 files (no terminal rewrites)', () => {
    const result = runMigrationScript(deliveryRoot);
    assert.match(result.stdout, /Rewrote:\s*0\s*files/i);
  });
});

// ── Scenario 6: Lock respected by concurrent push (exit code 75) ──────────────

describe('Scenario 6: Lock respected by concurrent push', () => {
  let tmpRoot: string;
  let deliveryRoot: string;
  let cleargatDir: string;
  let lockPath: string;
  let fixtureItemPath: string;
  const FIXTURE_ITEM = `---\nstory_id: STORY-LOCK-FX\napproved: true\nstatus: Draft\n---\n\n# Lock Fixture\n\nSome body.\n`;

  before(() => {
    ({ tmpRoot, deliveryRoot, cleargatDir } = makeTmpDelivery());
    // Write a .migration-lock file to simulate a running migration
    lockPath = path.join(cleargatDir, '.migration-lock');
    fs.writeFileSync(lockPath, String(process.pid), { encoding: 'utf8' });
    // Write a fixture item to push
    fixtureItemPath = path.join(deliveryRoot, 'pending-sync', 'STORY-LOCK-FX.md');
    fs.writeFileSync(fixtureItemPath, FIXTURE_ITEM, 'utf8');
  });

  after(() => {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  });

  it('pushHandler exits with code 75 when .migration-lock is held', async () => {
    // Import pushHandler — the lock-check path does NOT exist yet on baseline.
    // This import WILL resolve (push.ts exists), but pushHandler will NOT check
    // the lock — so exit code 75 will not be produced, causing this test to fail.
    const { pushHandler } = await import('../../src/commands/push.js');

    let exitCode: number | undefined;
    const collectedStderr: string[] = [];

    try {
      await pushHandler(fixtureItemPath, {
        projectRoot: tmpRoot,
        stdout: () => {},
        stderr: (s: string) => { collectedStderr.push(s); },
        exit: (code: number): never => {
          exitCode = code;
          throw new Error(`EXIT:${code}`);
        },
      });
    } catch (err) {
      const msg = (err as Error).message;
      if (!msg.startsWith('EXIT:')) throw err;
    }

    assert.strictEqual(exitCode, 75, `Expected exit code 75, got ${exitCode}`);
    const stderrOutput = collectedStderr.join('');
    assert.match(
      stderrOutput,
      /CR-067 migration in progress/i,
      `Expected "CR-067 migration in progress" in stderr, got: ${stderrOutput}`,
    );
  });
});

// ── Scenario 7 (bonus): Quoted status variants rewritten ──────────────────────

describe('Scenario 7: Quoted variants "Done" and single-quoted Verified rewritten', () => {
  let tmpRoot: string;
  let deliveryRoot: string;
  let fx6Path: string;
  let fx7Path: string;

  before(() => {
    ({ tmpRoot, deliveryRoot } = makeTmpDelivery());
    fx6Path = writeFixture(
      path.join(deliveryRoot, 'pending-sync'),
      'STORY-FX6.md',
      `---\nstory_id: STORY-FX6\nstatus: "Done"\napproved: true\n---\n\nBody with status: "Done" in body (must not be rewritten).\n`,
    );
    fx7Path = writeFixture(
      path.join(deliveryRoot, 'pending-sync'),
      'STORY-FX7.md',
      `---\nstory_id: STORY-FX7\nstatus: 'Verified'\napproved: true\n---\n\nBody.\n`,
    );
  });

  after(() => {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  });

  it('STORY-FX6.md with status: "Done" is rewritten to status: Completed', () => {
    runMigrationScript(deliveryRoot);
    const content = fs.readFileSync(fx6Path, 'utf8');
    assert.match(content, /^status: Completed$/m);
    assert.doesNotMatch(content, /^status: ["']?Done["']?$/m);
  });

  it('body line containing status: "Done" is NOT rewritten', () => {
    const content = fs.readFileSync(fx6Path, 'utf8');
    // The body line uses status: "Done" — it must survive unchanged
    assert.ok(
      content.includes('status: "Done" in body'),
      'body reference to status: "Done" must be preserved',
    );
  });

  it('STORY-FX7.md with status: \'Verified\' (single-quoted) is rewritten', () => {
    runMigrationScript(deliveryRoot);
    const content = fs.readFileSync(fx7Path, 'utf8');
    assert.match(content, /^status: Completed$/m);
    assert.doesNotMatch(content, /^status: ['"]?Verified['"]?$/m);
  });
});

// ── Dry-run mode: mutations do NOT happen ─────────────────────────────────────

describe('Dry-run mode: --dry-run flag mutates nothing', () => {
  let tmpRoot: string;
  let deliveryRoot: string;
  let storyPath: string;
  const ORIGINAL = `---\nstory_id: STORY-FX-DRY\nstatus: Done\napproved: true\n---\n\nDry-run body.\n`;

  before(() => {
    ({ tmpRoot, deliveryRoot } = makeTmpDelivery());
    storyPath = writeFixture(
      path.join(deliveryRoot, 'pending-sync'),
      'STORY-FX-DRY.md',
      ORIGINAL,
    );
  });

  after(() => {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  });

  it('file is byte-identical after --dry-run', () => {
    const before = fs.readFileSync(storyPath);
    runMigrationScript(deliveryRoot, ['--dry-run']);
    const after = fs.readFileSync(storyPath);
    assert.deepStrictEqual(before, after, '--dry-run must not mutate the file');
  });

  it('dry-run stdout mentions "Would rewrite" or similar diff output', () => {
    const result = runMigrationScript(deliveryRoot, ['--dry-run']);
    assert.match(
      result.stdout,
      /Would rewrite|dry.?run|--apply/i,
      'dry-run output must indicate prospective changes',
    );
  });
});
