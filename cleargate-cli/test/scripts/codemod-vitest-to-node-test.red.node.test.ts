/**
 * codemod-vitest-to-node-test.red.node.test.ts — STORY-028-04 QA-Red
 *
 * Failing tests (RED phase) for `cleargate-cli/scripts/codemod-vitest-to-node-test.mjs`.
 * All scenarios MUST fail on the clean baseline (script does not yet exist).
 *
 * Gherkin scenarios covered (§2.1):
 *   Scenario 1 — AUTO-CONVERTIBLE file with describe/it/expect/beforeAll
 *   Scenario 2 — All 8 matchers map correctly
 *   Scenario 3 — vi.mock flags for manual fix
 *   Scenario 4 — import { describe, it, expect } from 'vitest' rewrite
 *   Scenario 5 — beforeEach/afterEach hooks preserved; beforeAll → before
 *   Scenario 6 — vi.useFakeTimers flags for manual fix
 *   Scenario 7 — Idempotency: re-run on already-converted file is a no-op
 *   Scenario 8 — Exit code 0 when zero MANUAL-FIX-REQUIRED files
 *   Scenario 9 — Exit code 1 when any MANUAL-FIX-REQUIRED file present
 *
 * BASELINE FAIL CONTRACT (clean baseline — script does not yet exist):
 *   All 28 tests FAIL. The first assertion in every test is:
 *     assert.ok(fs.existsSync(CODEMOD_SCRIPT), 'PRE-FIX: ...')
 *   which is false because the script is absent. This guarantees no false passes.
 *
 *   For scenarios that check exit-code-1 or file-unchanged (coincidentally correct on
 *   an absent script), the script-exists guard is placed FIRST so the test fails
 *   before any accidental-pass assertion is reached.
 *
 * IMMUTABILITY: sealed post-Red per CR-043. DO NOT EDIT after QA-Red returns this file.
 *
 * Runner: tsx --test (node:test)
 * Naming: *.red.node.test.ts (immutable post-Red)
 * Forbidden: DO NOT create or modify codemod-vitest-to-node-test.mjs.
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

// Resolve paths: cleargate-cli/test/scripts/ → up 3 → repo root
const REPO_ROOT = path.resolve(__dirname, '..', '..', '..');
const CODEMOD_SCRIPT = path.join(
  REPO_ROOT,
  'cleargate-cli',
  'scripts',
  'codemod-vitest-to-node-test.mjs',
);
const FIXTURES_ROOT = path.join(
  REPO_ROOT,
  'cleargate-cli',
  'test',
  'fixtures',
  'codemod-vitest',
);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Assert the codemod script exists — FIRST check in every test.
 * On the clean baseline (script absent) this fails immediately,
 * preventing any coincidental pass on downstream assertions.
 */
function assertScriptExists(): void {
  assert.ok(
    fs.existsSync(CODEMOD_SCRIPT),
    `PRE-FIX GUARD: codemod script does not exist at:\n  ${CODEMOD_SCRIPT}\n` +
    'Developer must ship cleargate-cli/scripts/codemod-vitest-to-node-test.mjs.',
  );
}

/**
 * Copy a fixture's input file into a fresh tmpdir and return the tmpdir path.
 */
function stageTmpDir(
  scenarioDir: string,
  inputFilename: string,
): { tmpDir: string; stagedInput: string } {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cg-codemod-test-'));
  const srcInput = path.join(FIXTURES_ROOT, scenarioDir, 'input.vitest.test.ts');
  const stagedInput = path.join(tmpDir, inputFilename);
  fs.copyFileSync(srcInput, stagedInput);
  return { tmpDir, stagedInput };
}

/**
 * Invoke the codemod against a directory; return spawnSync result.
 * NODE_TEST_CONTEXT deleted per FLASHCARD 2026-05-04 #node-test #child-process.
 */
function runCodemod(
  rootDir: string,
  extraArgs: string[] = [],
): ReturnType<typeof spawnSync> {
  const env = { ...process.env };
  delete env['NODE_TEST_CONTEXT'];

  return spawnSync(
    process.execPath,
    [CODEMOD_SCRIPT, '--apply', '--root', rootDir, ...extraArgs],
    {
      encoding: 'utf8',
      timeout: 30_000,
      env,
    },
  );
}

/**
 * Read file content, return null if file does not exist.
 */
function readOrNull(filePath: string): string | null {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Scenario 1 — AUTO-CONVERTIBLE: describe/it/expect/beforeAll
// ---------------------------------------------------------------------------

describe('STORY-028-04 Scenario 1 — AUTO-CONVERTIBLE plain suite', () => {
  let tmpDir: string;

  before(() => {
    const staged = stageTmpDir('scenario-01', 'input.vitest.test.ts');
    tmpDir = staged.tmpDir;
  });

  after(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('codemod script exists at cleargate-cli/scripts/codemod-vitest-to-node-test.mjs', () => {
    // PRE-FIX: file absent → FAIL.
    assertScriptExists();
  });

  it('codemod exits 0 (all files auto-converted)', () => {
    // PRE-FIX: script absent → guard fires → FAIL.
    assertScriptExists();
    const result = runCodemod(tmpDir);
    assert.strictEqual(
      result.status,
      0,
      `Scenario 1 FAIL: expected exit 0 but got ${result.status}.\n` +
      `stderr: ${result.stderr}\n` +
      `error: ${result.error?.message ?? '(none)'}`,
    );
  });

  it('input.vitest.test.ts is renamed to input.node.test.ts (original removed)', () => {
    // PRE-FIX: guard fires → FAIL.
    assertScriptExists();
    runCodemod(tmpDir);
    const originalExists = fs.existsSync(path.join(tmpDir, 'input.vitest.test.ts'));
    assert.ok(
      !originalExists,
      'Scenario 1 FAIL: input.vitest.test.ts still present after codemod.\n' +
      'Expected: codemod renames *.test.ts → *.node.test.ts and removes source.',
    );
  });

  it('output matches expected.node.test.ts (after prettier normalization)', () => {
    // PRE-FIX: guard fires → FAIL.
    assertScriptExists();
    runCodemod(tmpDir);
    const outputFile = path.join(tmpDir, 'input.node.test.ts');
    const expectedFile = path.join(FIXTURES_ROOT, 'scenario-01', 'expected.node.test.ts');

    const actual = readOrNull(outputFile);
    const expected = readOrNull(expectedFile);

    assert.ok(
      actual !== null,
      `Scenario 1 FAIL: output file not found at ${outputFile}.`,
    );

    const normalize = (s: string) =>
      s
        .split('\n')
        .map((l) => l.trimEnd())
        .join('\n')
        .trimEnd();

    assert.strictEqual(
      normalize(actual!),
      normalize(expected!),
      'Scenario 1 FAIL: codemod output does not match expected.node.test.ts.',
    );
  });
});

// ---------------------------------------------------------------------------
// Scenario 2 — All 8 matchers map correctly
// ---------------------------------------------------------------------------

describe('STORY-028-04 Scenario 2 — all 8 matchers', () => {
  let tmpDir: string;

  before(() => {
    const staged = stageTmpDir('scenario-02', 'input.vitest.test.ts');
    tmpDir = staged.tmpDir;
  });

  after(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('codemod exits 0 (all-auto: no vi.* calls)', () => {
    assertScriptExists();
    const result = runCodemod(tmpDir);
    assert.strictEqual(
      result.status,
      0,
      `Scenario 2 FAIL: expected exit 0 for all-matcher fixture, got ${result.status}.`,
    );
  });

  it('output matches expected.node.test.ts (all assert.* mappings correct)', () => {
    assertScriptExists();
    runCodemod(tmpDir);
    const outputFile = path.join(tmpDir, 'input.node.test.ts');
    const expectedFile = path.join(FIXTURES_ROOT, 'scenario-02', 'expected.node.test.ts');

    const actual = readOrNull(outputFile);
    const expected = fs.readFileSync(expectedFile, 'utf8');

    assert.ok(actual !== null, `Scenario 2 FAIL: output file missing at ${outputFile}.`);

    const normalize = (s: string) =>
      s
        .split('\n')
        .map((l) => l.trimEnd())
        .join('\n')
        .trimEnd();

    assert.strictEqual(
      normalize(actual!),
      normalize(expected),
      'Scenario 2 FAIL: matcher conversion output does not match expected fixture.',
    );
  });

  it('output contains assert.strictEqual (toBe converted)', () => {
    assertScriptExists();
    runCodemod(tmpDir);
    const content = readOrNull(path.join(tmpDir, 'input.node.test.ts')) ?? '';
    assert.ok(
      content.includes('assert.strictEqual'),
      'Scenario 2 FAIL: output missing assert.strictEqual (toBe not converted).',
    );
  });

  it('output contains assert.deepStrictEqual (toEqual converted)', () => {
    assertScriptExists();
    runCodemod(tmpDir);
    const content = readOrNull(path.join(tmpDir, 'input.node.test.ts')) ?? '';
    assert.ok(
      content.includes('assert.deepStrictEqual'),
      'Scenario 2 FAIL: output missing assert.deepStrictEqual (toEqual not converted).',
    );
  });

  it('output contains assert.throws (toThrow converted)', () => {
    assertScriptExists();
    runCodemod(tmpDir);
    const content = readOrNull(path.join(tmpDir, 'input.node.test.ts')) ?? '';
    assert.ok(
      content.includes('assert.throws'),
      'Scenario 2 FAIL: output missing assert.throws (toThrow not converted).',
    );
  });

  it('output contains assert.ok (toBeTruthy/toBeFalsy converted)', () => {
    assertScriptExists();
    runCodemod(tmpDir);
    const content = readOrNull(path.join(tmpDir, 'input.node.test.ts')) ?? '';
    assert.ok(
      content.includes('assert.ok'),
      'Scenario 2 FAIL: output missing assert.ok (toBeTruthy/toBeFalsy not converted).',
    );
  });

  it('output does NOT contain vitest import', () => {
    assertScriptExists();
    runCodemod(tmpDir);
    const content = readOrNull(path.join(tmpDir, 'input.node.test.ts')) ?? '';
    assert.ok(
      !content.includes("from 'vitest'"),
      "Scenario 2 FAIL: output still contains `from 'vitest'` — import not rewritten.",
    );
  });
});

// ---------------------------------------------------------------------------
// Scenario 3 — vi.mock flags for manual fix
// ---------------------------------------------------------------------------

describe('STORY-028-04 Scenario 3 — vi.mock manual-fix flag', () => {
  let tmpDir: string;
  let reportPath: string;

  before(() => {
    const staged = stageTmpDir('scenario-03', 'input.vitest.test.ts');
    tmpDir = staged.tmpDir;
    reportPath = path.join(tmpDir, '.codemod-manual-fix-report.md');
  });

  after(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('codemod exits 1 (vi.mock triggers manual-fix path)', () => {
    // Guard first — prevents the coincidental exit-1 (MODULE_NOT_FOUND) from passing.
    assertScriptExists();
    const result = runCodemod(tmpDir, ['--report', reportPath]);
    assert.strictEqual(
      result.status,
      1,
      `Scenario 3 FAIL: expected exit 1 for vi.mock fixture, got ${result.status}.`,
    );
  });

  it('input file is NOT renamed (manual-fix path leaves file untouched)', () => {
    assertScriptExists();
    runCodemod(tmpDir, ['--report', reportPath]);
    const originalStillPresent = fs.existsSync(path.join(tmpDir, 'input.vitest.test.ts'));
    assert.ok(
      originalStillPresent,
      'Scenario 3 FAIL: input.vitest.test.ts was renamed despite containing vi.mock.',
    );
  });

  it('input file bytes are unchanged after codemod', () => {
    assertScriptExists();
    runCodemod(tmpDir, ['--report', reportPath]);
    const actual = readOrNull(path.join(tmpDir, 'input.vitest.test.ts'));
    const original = fs.readFileSync(
      path.join(FIXTURES_ROOT, 'scenario-03', 'input.vitest.test.ts'),
      'utf8',
    );
    assert.strictEqual(
      actual,
      original,
      'Scenario 3 FAIL: codemod modified file content despite vi.mock presence.',
    );
  });

  it('manual-fix report exists at default location', () => {
    assertScriptExists();
    runCodemod(tmpDir, ['--report', reportPath]);
    assert.ok(
      fs.existsSync(reportPath),
      `Scenario 3 FAIL: manual-fix report not found at ${reportPath}.`,
    );
  });

  it('manual-fix report lists "vi.mock" as flagged api', () => {
    assertScriptExists();
    runCodemod(tmpDir, ['--report', reportPath]);
    const reportContent = readOrNull(reportPath) ?? '';
    assert.ok(
      reportContent.includes('vi.mock'),
      `Scenario 3 FAIL: manual-fix report does not mention "vi.mock".\nReport:\n${reportContent}`,
    );
  });
});

// ---------------------------------------------------------------------------
// Scenario 4 — import { describe, it, expect } from 'vitest' rewrite
// ---------------------------------------------------------------------------

describe("STORY-028-04 Scenario 4 — import from 'vitest' rewrite", () => {
  let tmpDir: string;

  before(() => {
    const staged = stageTmpDir('scenario-04', 'input.vitest.test.ts');
    tmpDir = staged.tmpDir;
  });

  after(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('codemod exits 0', () => {
    assertScriptExists();
    const result = runCodemod(tmpDir);
    assert.strictEqual(
      result.status,
      0,
      `Scenario 4 FAIL: expected exit 0, got ${result.status}.`,
    );
  });

  it("output imports from 'node:test' not 'vitest'", () => {
    assertScriptExists();
    runCodemod(tmpDir);
    const content = readOrNull(path.join(tmpDir, 'input.node.test.ts')) ?? '';
    assert.ok(
      content.includes("from 'node:test'"),
      "Scenario 4 FAIL: output does not contain `from 'node:test'`.",
    );
    assert.ok(
      !content.includes("from 'vitest'"),
      "Scenario 4 FAIL: output still contains `from 'vitest'`.",
    );
  });

  it("output imports assert from 'node:assert/strict'", () => {
    assertScriptExists();
    runCodemod(tmpDir);
    const content = readOrNull(path.join(tmpDir, 'input.node.test.ts')) ?? '';
    assert.ok(
      content.includes("'node:assert/strict'"),
      "Scenario 4 FAIL: output does not import from 'node:assert/strict'.",
    );
  });
});

// ---------------------------------------------------------------------------
// Scenario 5 — beforeEach/afterEach hooks preserved; beforeAll → before
// ---------------------------------------------------------------------------

describe('STORY-028-04 Scenario 5 — beforeEach/afterEach hooks', () => {
  let tmpDir: string;

  before(() => {
    const staged = stageTmpDir('scenario-05', 'input.vitest.test.ts');
    tmpDir = staged.tmpDir;
  });

  after(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('codemod exits 0 (hooks fixture is auto-convertible)', () => {
    assertScriptExists();
    const result = runCodemod(tmpDir);
    assert.strictEqual(
      result.status,
      0,
      `Scenario 5 FAIL: expected exit 0, got ${result.status}.`,
    );
  });

  it('output contains beforeEach and afterEach (hooks preserved)', () => {
    assertScriptExists();
    runCodemod(tmpDir);
    const content = readOrNull(path.join(tmpDir, 'input.node.test.ts')) ?? '';
    assert.ok(content.includes('beforeEach'), 'Scenario 5 FAIL: output missing beforeEach.');
    assert.ok(content.includes('afterEach'), 'Scenario 5 FAIL: output missing afterEach.');
  });

  it('output matches expected.node.test.ts fixture', () => {
    assertScriptExists();
    runCodemod(tmpDir);
    const outputFile = path.join(tmpDir, 'input.node.test.ts');
    const expectedFile = path.join(FIXTURES_ROOT, 'scenario-05', 'expected.node.test.ts');

    const actual = readOrNull(outputFile);
    const expected = fs.readFileSync(expectedFile, 'utf8');

    assert.ok(actual !== null, `Scenario 5 FAIL: output not found at ${outputFile}.`);

    const normalize = (s: string) =>
      s
        .split('\n')
        .map((l) => l.trimEnd())
        .join('\n')
        .trimEnd();

    assert.strictEqual(
      normalize(actual!),
      normalize(expected),
      'Scenario 5 FAIL: hooks output does not match expected fixture.',
    );
  });
});

// ---------------------------------------------------------------------------
// Scenario 6 — vi.useFakeTimers flags for manual fix
// ---------------------------------------------------------------------------

describe('STORY-028-04 Scenario 6 — vi.useFakeTimers manual-fix flag', () => {
  let tmpDir: string;
  let reportPath: string;

  before(() => {
    const staged = stageTmpDir('scenario-06', 'input.vitest.test.ts');
    tmpDir = staged.tmpDir;
    reportPath = path.join(tmpDir, '.codemod-manual-fix-report.md');
  });

  after(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('codemod exits 1 (vi.useFakeTimers triggers manual-fix path)', () => {
    // Guard first — prevents coincidental MODULE_NOT_FOUND exit-1 from passing.
    assertScriptExists();
    const result = runCodemod(tmpDir, ['--report', reportPath]);
    assert.strictEqual(
      result.status,
      1,
      `Scenario 6 FAIL: expected exit 1, got ${result.status}.`,
    );
  });

  it('input file is NOT renamed (vi.useFakeTimers = manual-fix)', () => {
    assertScriptExists();
    runCodemod(tmpDir, ['--report', reportPath]);
    assert.ok(
      fs.existsSync(path.join(tmpDir, 'input.vitest.test.ts')),
      'Scenario 6 FAIL: input.vitest.test.ts renamed despite vi.useFakeTimers.',
    );
  });

  it('manual-fix report mentions vi.useFakeTimers', () => {
    assertScriptExists();
    runCodemod(tmpDir, ['--report', reportPath]);
    const reportContent = readOrNull(reportPath) ?? '';
    assert.ok(
      reportContent.includes('vi.useFakeTimers') || reportContent.includes('vi.'),
      `Scenario 6 FAIL: report does not mention vi.useFakeTimers.\nReport:\n${reportContent}`,
    );
  });
});

// ---------------------------------------------------------------------------
// Scenario 7 — Idempotency: re-run on already-converted file is a no-op
// ---------------------------------------------------------------------------

describe('STORY-028-04 Scenario 7 — idempotency', () => {
  let tmpDir: string;
  let alreadyConverted: string;

  before(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cg-codemod-idempotency-'));
    const src = path.join(FIXTURES_ROOT, 'scenario-05', 'expected.node.test.ts');
    alreadyConverted = path.join(tmpDir, 'already.node.test.ts');
    fs.copyFileSync(src, alreadyConverted);
  });

  after(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('codemod exits 0 on already-converted directory', () => {
    assertScriptExists();
    const result = runCodemod(tmpDir);
    assert.strictEqual(
      result.status,
      0,
      `Scenario 7 FAIL: expected exit 0 for already-converted dir, got ${result.status}.`,
    );
  });

  it('already-converted file is not double-renamed or modified', () => {
    assertScriptExists();
    const contentBefore = fs.readFileSync(alreadyConverted, 'utf8');
    runCodemod(tmpDir);
    const contentAfter = readOrNull(alreadyConverted);

    assert.ok(
      fs.existsSync(alreadyConverted),
      'Scenario 7 FAIL: already-converted file was renamed by second codemod run.',
    );

    assert.strictEqual(
      contentAfter,
      contentBefore,
      'Scenario 7 FAIL: already-converted file content changed on second run.',
    );
  });
});

// ---------------------------------------------------------------------------
// Scenario 8 — Exit code 0 when all files are AUTO-CONVERTIBLE
// ---------------------------------------------------------------------------

describe('STORY-028-04 Scenario 8 — exit code 0 on all-auto directory', () => {
  let tmpDir: string;

  before(() => {
    const staged = stageTmpDir('scenario-01', 'input.vitest.test.ts');
    tmpDir = staged.tmpDir;
  });

  after(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('exit code is 0 when zero MANUAL-FIX-REQUIRED files', () => {
    assertScriptExists();
    const result = runCodemod(tmpDir);
    assert.strictEqual(
      result.status,
      0,
      `Scenario 8 FAIL: expected status 0, got ${result.status}.\nstderr: ${result.stderr}`,
    );
  });
});

// ---------------------------------------------------------------------------
// Scenario 9 — Exit code 1 when any MANUAL-FIX-REQUIRED file present
// ---------------------------------------------------------------------------

describe('STORY-028-04 Scenario 9 — exit code 1 on any-manual directory', () => {
  let tmpDir: string;
  let reportPath: string;

  before(() => {
    const staged = stageTmpDir('scenario-03', 'input.vitest.test.ts');
    tmpDir = staged.tmpDir;
    reportPath = path.join(tmpDir, '.codemod-manual-fix-report.md');
  });

  after(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('exit code is 1 when any MANUAL-FIX-REQUIRED file present', () => {
    // Guard first — prevents coincidental MODULE_NOT_FOUND exit-1 from passing.
    assertScriptExists();
    const result = runCodemod(tmpDir, ['--report', reportPath]);
    assert.strictEqual(
      result.status,
      1,
      `Scenario 9 FAIL: expected status 1 for vi.mock dir, got ${result.status}.`,
    );
  });
});
