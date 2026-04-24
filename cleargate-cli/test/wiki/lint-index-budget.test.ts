/**
 * Tests for STORY-015-03: Index Token-Budget Lint
 * Vitest, real-fs fixtures under os.tmpdir(). No fs mocks.
 *
 * Covers all 4 Gherkin scenarios from §2.1.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { wikiLintHandler } from '../../src/commands/wiki-lint.js';
import type { WikiLintOptions } from '../../src/commands/wiki-lint.js';

// ─── Fixture helpers ──────────────────────────────────────────────────────────

interface BudgetFixture {
  root: string;
  wikiRoot: string;
  cleargatePath: string;
  cleanup: () => void;
}

function buildBudgetFixture(): BudgetFixture {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'cg-budget-test-'));
  const cleargatePath = path.join(root, '.cleargate');
  const wikiRoot = path.join(cleargatePath, 'wiki');

  // Create the wiki bucket dirs (needed by loadWikiPages, even if empty)
  for (const bucket of ['epics', 'stories', 'sprints', 'proposals', 'crs', 'bugs', 'topics']) {
    fs.mkdirSync(path.join(wikiRoot, bucket), { recursive: true });
  }

  return {
    root,
    wikiRoot,
    cleargatePath,
    cleanup: () => fs.rmSync(root, { recursive: true, force: true }),
  };
}

/** Write .cleargate/wiki/index.md with `charCount` ASCII 'a' characters */
function writeIndex(fixture: BudgetFixture, charCount: number): void {
  const content = 'a'.repeat(charCount);
  fs.writeFileSync(path.join(fixture.wikiRoot, 'index.md'), content, 'utf8');
}

/** Write .cleargate/config.yml with wiki.index_token_ceiling */
function writeConfig(fixture: BudgetFixture, ceiling: number): void {
  const content = `wiki:\n  index_token_ceiling: ${ceiling}\n`;
  fs.writeFileSync(path.join(fixture.cleargatePath, 'config.yml'), content, 'utf8');
}

/** Run wikiLintHandler and capture exit code + stdout */
async function runLint(
  fixture: BudgetFixture,
  overrides: Partial<WikiLintOptions> = {},
): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  const out: string[] = [];
  const err: string[] = [];
  let exitCode: number | undefined;

  const opts: WikiLintOptions = {
    cwd: fixture.root,
    stdout: (s) => {
      out.push(s);
    },
    stderr: (s) => {
      err.push(s);
    },
    exit: (c): never => {
      exitCode = c;
      throw new Error(`EXIT:${c}`);
    },
    // Provide a stub gitRunner so stale-commit checks don't invoke real git
    gitRunner: () => '',
    ...overrides,
  };

  try {
    await wikiLintHandler(opts);
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('EXIT:')) {
      return { stdout: out.join(''), stderr: err.join(''), exitCode: exitCode ?? 0 };
    }
    throw e;
  }
  return { stdout: out.join(''), stderr: err.join(''), exitCode: 0 };
}

// ─── Scenario 1: Within ceiling passes silently ───────────────────────────────
//
//   Given wiki/index.md is 3000 tokens and ceiling is 8000
//   When I run `cleargate wiki lint`
//   Then the index-budget check produces no output
//   And if no other lint errors exist, exit code is 0

describe('Scenario 1: Within ceiling passes silently', () => {
  let fixture: BudgetFixture;

  beforeEach(() => {
    fixture = buildBudgetFixture();
    // 3000 tokens = 12000 chars (Math.round(12000 / 4) = 3000)
    writeIndex(fixture, 12000);
    // No config file — uses default ceiling of 8000
  });

  afterEach(() => fixture.cleanup());

  it('exits 0 when index tokens are under default ceiling', async () => {
    const result = await runLint(fixture);
    expect(result.exitCode).toBe(0);
  });

  it('does not emit index-budget: error when under ceiling', async () => {
    const result = await runLint(fixture);
    expect(result.stdout).not.toContain('index-budget:');
  });
});

// ─── Scenario 2: Over ceiling fails ──────────────────────────────────────────
//
//   Given wiki/index.md is 9000 tokens and ceiling is 8000
//   When I run `cleargate wiki lint`
//   Then exit code is non-zero
//   And stdout contains the exact error message

describe('Scenario 2: Over ceiling fails', () => {
  let fixture: BudgetFixture;

  beforeEach(() => {
    fixture = buildBudgetFixture();
    // 9000 tokens = 36000 chars (Math.round(36000 / 4) = 9000)
    writeIndex(fixture, 36000);
    // No config file — default ceiling 8000
  });

  afterEach(() => fixture.cleanup());

  it('exits non-zero when index tokens exceed default ceiling', async () => {
    const result = await runLint(fixture);
    expect(result.exitCode).toBe(1);
  });

  it('emits exact error message matching Gherkin spec', async () => {
    const result = await runLint(fixture);
    expect(result.stdout).toContain(
      'index-budget: wiki/index.md exceeds token ceiling: 9000 > 8000. Shard or prune (see EPIC-015).',
    );
  });

  it('emits lint: FAIL summary', async () => {
    const result = await runLint(fixture);
    expect(result.stdout).toContain('lint: FAIL');
  });
});

// ─── Scenario 3: Custom ceiling from config ───────────────────────────────────
//
//   Given `.cleargate/config.yml` sets `wiki.index_token_ceiling: 4000`
//   And wiki/index.md is 5000 tokens
//   When I run `cleargate wiki lint`
//   Then exit code is non-zero
//   And stdout references the 4000 ceiling

describe('Scenario 3: Custom ceiling from config', () => {
  let fixture: BudgetFixture;

  beforeEach(() => {
    fixture = buildBudgetFixture();
    // 5000 tokens = 20000 chars
    writeIndex(fixture, 20000);
    // Config ceiling: 4000
    writeConfig(fixture, 4000);
  });

  afterEach(() => fixture.cleanup());

  it('exits non-zero when over custom ceiling', async () => {
    const result = await runLint(fixture);
    expect(result.exitCode).toBe(1);
  });

  it('references custom ceiling 4000 in error message', async () => {
    const result = await runLint(fixture);
    expect(result.stdout).toContain('5000 > 4000');
  });

  it('emits full message with custom ceiling', async () => {
    const result = await runLint(fixture);
    expect(result.stdout).toContain(
      'index-budget: wiki/index.md exceeds token ceiling: 5000 > 4000. Shard or prune (see EPIC-015).',
    );
  });
});

// ─── Scenario 4: --suggest never fails ───────────────────────────────────────
//
//   Given wiki/index.md is 9000 tokens and ceiling is 8000
//   When I run `cleargate wiki lint --suggest`
//   Then exit code is 0
//   And stdout contains "index token usage: 9000 / 8000 (113%)"

describe('Scenario 4: --suggest never fails', () => {
  let fixture: BudgetFixture;

  beforeEach(() => {
    fixture = buildBudgetFixture();
    // 9000 tokens = 36000 chars
    writeIndex(fixture, 36000);
    // Default ceiling 8000
  });

  afterEach(() => fixture.cleanup());

  it('exits 0 in suggest mode even when over ceiling', async () => {
    const result = await runLint(fixture, { mode: 'suggest' });
    expect(result.exitCode).toBe(0);
  });

  it('emits usage line with correct tokens/ceiling/pct', async () => {
    const result = await runLint(fixture, { mode: 'suggest' });
    // 9000 / 8000 = 1.125 → Math.round → 113%
    expect(result.stdout).toContain('index token usage: 9000 / 8000 (113%)');
  });

  it('does NOT emit index-budget: finding line in suggest mode', async () => {
    const result = await runLint(fixture, { mode: 'suggest' });
    // The budget error line must NOT appear as a finding (only advisory for existing findings)
    expect(result.stdout).not.toContain(
      'index-budget: wiki/index.md exceeds token ceiling',
    );
  });

  it('emits lint: OK summary in suggest mode', async () => {
    const result = await runLint(fixture, { mode: 'suggest' });
    expect(result.stdout).toContain('lint: OK');
  });
});
