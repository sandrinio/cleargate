/**
 * init-sprint-context.red.node.test.ts — CR-045 Red tests for init_sprint.mjs
 * sprint-context.md plumbing.
 *
 * QA-RED authored. DO NOT EDIT post-Red (immutable per CR-043 naming contract).
 *
 * Gherkin scenarios (CR-045 §4, M1 §CR-045 Test shape):
 *
 *   Scenario 1: `node init_sprint.mjs SPRINT-TEST --stories CR-001` writes
 *     `.cleargate/sprint-runs/SPRINT-TEST/sprint-context.md`; asserts file exists.
 *
 *   Scenario 2: Generated file contains the 4 original section headers
 *     (`## Locked Versions`, `## Cross-Cutting Rules`, `## Active FLASHCARD Tags`,
 *     `## Adjacent Implementations`) AND the 2 new headers (`## Sprint Goal`,
 *     `## Mid-Sprint Amendments`); ordering check: Sprint Goal precedes Locked
 *     Versions; Mid-Sprint Amendments is last.
 *
 *   Scenario 3: Frontmatter `sprint_id` matches the kickoff arg (`SPRINT-TEST`);
 *     `created_at` and `last_updated` are valid ISO-8601 timestamps.
 *
 * Baseline fail mode: file does not exist → ENOENT (init_sprint.mjs does NOT
 * yet write sprint-context.md). Pass after Dev: 3/3.
 *
 * Test seam: CLEARGATE_REPO_ROOT env var override (init_sprint.mjs L28-30).
 * Uses tmpdir per scenario. No vitest — node:test + tsx only.
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

// Resolve repo root from cleargate-cli/test/scripts/ → up 3 levels
const REPO_ROOT = path.resolve(__dirname, '..', '..', '..');
const INIT_SPRINT_SCRIPT = path.join(
  REPO_ROOT,
  '.cleargate',
  'scripts',
  'init_sprint.mjs'
);

/**
 * Build a minimal ClearGate repo structure in a tmpdir.
 * Returns the tmpdir path.
 */
function buildMinimalRepo(): string {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cg-ctx-test-'));
  fs.mkdirSync(path.join(tmpDir, '.cleargate', 'sprint-runs'), { recursive: true });
  // Templates dir — init_sprint.mjs reads sprint_context.md from here post-CR-045.
  // We copy the real template so the extension can read it.
  const templateSrc = path.join(REPO_ROOT, '.cleargate', 'templates', 'sprint_context.md');
  const templateDest = path.join(tmpDir, '.cleargate', 'templates', 'sprint_context.md');
  fs.mkdirSync(path.dirname(templateDest), { recursive: true });
  if (fs.existsSync(templateSrc)) {
    fs.copyFileSync(templateSrc, templateDest);
  }
  return tmpDir;
}

/**
 * Invoke init_sprint.mjs with CLEARGATE_REPO_ROOT pointing at tmpDir.
 * Returns { status, stdout, stderr }.
 */
function runInitSprint(
  tmpDir: string,
  sprintId: string,
  stories: string
): { status: number | null; stdout: string; stderr: string } {
  // NODE_TEST_CONTEXT must be deleted so nested tsx invocations get real pass/fail
  // (FLASHCARD 2026-05-04 #node-test #child-process)
  const env = { ...process.env };
  delete env['NODE_TEST_CONTEXT'];
  env['CLEARGATE_REPO_ROOT'] = tmpDir;

  const result = spawnSync(
    process.execPath,
    [INIT_SPRINT_SCRIPT, sprintId, '--stories', stories],
    {
      encoding: 'utf8',
      timeout: 15_000,
      env,
    }
  );
  return {
    status: result.status ?? -1,
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
  };
}

describe('init_sprint.mjs sprint-context.md plumbing (CR-045)', () => {
  let tmpDir: string;
  const SPRINT_ID = 'SPRINT-TEST';
  const CONTEXT_FILE_REL = `.cleargate/sprint-runs/${SPRINT_ID}/sprint-context.md`;

  before(() => {
    tmpDir = buildMinimalRepo();
  });

  after(() => {
    if (tmpDir && fs.existsSync(tmpDir)) {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it(
    'Scenario 1: init_sprint.mjs writes sprint-context.md to the sprint run directory',
    () => {
      // Run init_sprint.mjs; it should create state.json (existing behaviour)
      // AND sprint-context.md (CR-045 extension — not yet implemented).
      const result = runInitSprint(tmpDir, SPRINT_ID, 'CR-001');

      // state.json creation may succeed; we only care that sprint-context.md was written.
      const contextFilePath = path.join(tmpDir, CONTEXT_FILE_REL);
      assert.ok(
        fs.existsSync(contextFilePath),
        `Expected sprint-context.md to be created at ${contextFilePath}. ` +
          `init_sprint.mjs exit=${result.status} stdout="${result.stdout.trim()}" stderr="${result.stderr.trim()}"`
      );
    }
  );

  it(
    'Scenario 2: sprint-context.md contains all 6 required section headers in correct order',
    () => {
      const contextFilePath = path.join(tmpDir, CONTEXT_FILE_REL);

      // If file doesn't exist (Scenario 1 failed), we want a clear error here too.
      assert.ok(
        fs.existsSync(contextFilePath),
        `sprint-context.md not found at ${contextFilePath} — Scenario 1 prerequisite not met`
      );

      const content = fs.readFileSync(contextFilePath, 'utf8');

      // Required section headers — 4 original + 2 new (CR-045 additive schema)
      const requiredHeaders = [
        '## Sprint Goal',
        '## Locked Versions',
        '## Cross-Cutting Rules',
        '## Active FLASHCARD Tags',
        '## Adjacent Implementations',
        '## Mid-Sprint Amendments',
      ];

      for (const header of requiredHeaders) {
        assert.ok(
          content.includes(header),
          `Expected sprint-context.md to contain "${header}" but it is absent. ` +
            `File content (first 400 chars): ${content.slice(0, 400)}`
        );
      }

      // Ordering constraints:
      // 1. Sprint Goal must precede Locked Versions
      const goalIdx = content.indexOf('## Sprint Goal');
      const lockedIdx = content.indexOf('## Locked Versions');
      assert.ok(
        goalIdx < lockedIdx,
        `Expected "## Sprint Goal" (at char ${goalIdx}) to appear BEFORE ` +
          `"## Locked Versions" (at char ${lockedIdx})`
      );

      // 2. Mid-Sprint Amendments must be the LAST ## header
      const amendmentsIdx = content.indexOf('## Mid-Sprint Amendments');
      // Find any ## header after Mid-Sprint Amendments
      const afterAmendments = content.slice(amendmentsIdx + '## Mid-Sprint Amendments'.length);
      const laterHeaderMatch = afterAmendments.match(/^## /m);
      assert.ok(
        laterHeaderMatch === null,
        `Expected "## Mid-Sprint Amendments" to be the last ## section, ` +
          `but found another ## header after it: "${laterHeaderMatch?.[0]}"`
      );
    }
  );

  it(
    'Scenario 3: sprint-context.md frontmatter contains sprint_id, created_at, and last_updated as valid ISO-8601',
    () => {
      const contextFilePath = path.join(tmpDir, CONTEXT_FILE_REL);

      assert.ok(
        fs.existsSync(contextFilePath),
        `sprint-context.md not found at ${contextFilePath} — Scenario 1 prerequisite not met`
      );

      const content = fs.readFileSync(contextFilePath, 'utf8');

      // Extract YAML frontmatter block (between first --- and second ---)
      const fmMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
      assert.ok(
        fmMatch !== null,
        `Expected sprint-context.md to have YAML frontmatter (--- block) but none found. ` +
          `File content (first 200 chars): ${content.slice(0, 200)}`
      );

      const frontmatter = fmMatch![1];

      // sprint_id must match the kickoff arg
      const sprintIdMatch = frontmatter.match(/^sprint_id:\s*["']?(SPRINT-TEST)["']?/m);
      assert.ok(
        sprintIdMatch !== null,
        `Expected frontmatter to contain sprint_id: SPRINT-TEST but got:\n${frontmatter}`
      );

      // ISO-8601 pattern: YYYY-MM-DDTHH:MM:SS...Z (basic check)
      const ISO_8601_RE = /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;

      const createdMatch = frontmatter.match(/^created_at:\s*["']?(.+?)["']?\s*$/m);
      assert.ok(
        createdMatch !== null,
        `Expected frontmatter to contain created_at field but got:\n${frontmatter}`
      );
      assert.match(
        createdMatch![1],
        ISO_8601_RE,
        `created_at value "${createdMatch![1]}" is not a valid ISO-8601 timestamp`
      );

      const updatedMatch = frontmatter.match(/^last_updated:\s*["']?(.+?)["']?\s*$/m);
      assert.ok(
        updatedMatch !== null,
        `Expected frontmatter to contain last_updated field but got:\n${frontmatter}`
      );
      assert.match(
        updatedMatch![1],
        ISO_8601_RE,
        `last_updated value "${updatedMatch![1]}" is not a valid ISO-8601 timestamp`
      );
    }
  );
});
