import { describe, test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';

/**
 * Tests for STORY-015-02: cleargate wiki audit-status
 * Vitest, real fs under os.tmpdir(), no fs mocks.
 * Covers all 5 Gherkin scenarios + E2E convergence (scenario 6).
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { wikiAuditStatusHandler } from '../../src/commands/wiki-audit-status.js';
import {
  buildFixture,
  epicContent,
  storyContent,
  sprintContentWithEpics,
  proposalContent,
  type Fixture,
} from './_fixture.js';

// Minimal expect() shim (STORY-028-06)
// Backs remaining expect() calls with node:assert so vitest is not needed.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function expect(actual: any): any {
  const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return {
    toBe(expected: unknown) { assert.strictEqual(actual, expected); },
    toEqual(expected: unknown) { assert.deepStrictEqual(actual, expected); },
    toStrictEqual(expected: unknown) { assert.deepStrictEqual(actual, expected); },
    toBeNull() { assert.strictEqual(actual, null); },
    toBeUndefined() { assert.strictEqual(actual, undefined); },
    toBeDefined() { assert.notStrictEqual(actual, undefined); },
    toBeTruthy() { assert.ok(actual); },
    toBeFalsy() { assert.ok(!actual); },
    toBeGreaterThan(n: number) { assert.ok((actual as number) > n); },
    toBeGreaterThanOrEqual(n: number) { assert.ok((actual as number) >= n); },
    toBeLessThan(n: number) { assert.ok((actual as number) < n); },
    toBeLessThanOrEqual(n: number) { assert.ok((actual as number) <= n); },
    toContain(sub: unknown) { assert.ok(String(actual).includes(String(sub))); },
    toMatch(p: string | RegExp) { assert.match(String(actual), typeof p === 'string' ? new RegExp(esc(p)) : p); },
    toHaveLength(len: number) { assert.strictEqual((actual as { length: number }).length, len); },
    toThrow(msg?: string | RegExp) {
      if (!msg) assert.throws(actual as () => void);
      else if (typeof msg === 'string') assert.throws(actual as () => void, new RegExp(esc(msg)));
      else assert.throws(actual as () => void, msg);
    },
    toBeInstanceOf(cls: new (...a: unknown[]) => unknown) { assert.ok(actual instanceof cls); },
    toMatchObject(expected: Record<string, unknown>) { assert.deepStrictEqual(actual, expected); },
    toHaveBeenCalled() { assert.ok((actual as { mock: { calls: unknown[] } }).mock.calls.length > 0); },
    toHaveBeenCalledTimes(n: number) { assert.strictEqual((actual as { mock: { calls: unknown[] } }).mock.calls.length, n); },
    toHaveBeenCalledOnce() { assert.strictEqual((actual as { mock: { calls: unknown[] } }).mock.calls.length, 1); },
    toHaveBeenCalledWith(...expectedArgs: unknown[]) {
      const calls = (actual as { mock: { calls: Array<{arguments: unknown[]}> } }).mock.calls;
      assert.deepStrictEqual(calls[calls.length - 1].arguments, expectedArgs);
    },
    toHaveProperty(key: string, val?: unknown) {
      const obj = actual as Record<string, unknown>;
      assert.ok(key in obj);
      if (val !== undefined) assert.deepStrictEqual(obj[key], val);
    },
    get not(): any {
      return {
        toBe(expected: unknown) { assert.notStrictEqual(actual, expected); },
        toEqual(expected: unknown) { assert.notDeepStrictEqual(actual, expected); },
        toBeNull() { assert.notStrictEqual(actual, null); },
        toBeUndefined() { assert.notStrictEqual(actual, undefined); },
        toBeDefined() { assert.strictEqual(actual, undefined); },
        toBeTruthy() { assert.ok(!actual); },
        toBeFalsy() { assert.ok(actual); },
        toContain(sub: unknown) { assert.ok(!String(actual).includes(String(sub))); },
        toMatch(p: string | RegExp) { assert.doesNotMatch(String(actual), typeof p === 'string' ? new RegExp(esc(p)) : p); },
        toThrow() { assert.doesNotThrow(actual as () => void); },
        toHaveBeenCalled() { assert.strictEqual((actual as { mock: { calls: unknown[] } }).mock.calls.length, 0); },
        toHaveProperty(key: string) { const obj = actual as Record<string, unknown>; assert.ok(!(key in obj)); },
        toBeInstanceOf(cls: new (...a: unknown[]) => unknown) { assert.ok(!(actual instanceof cls)); },
        toHaveLength(len: number) { assert.notStrictEqual((actual as { length: number }).length, len); },
      };
    },
    get resolves(): any {
      const p = actual as Promise<unknown>;
      return {
        async toBe(expected: unknown) { assert.strictEqual(await p, expected); },
        async toEqual(expected: unknown) { assert.deepStrictEqual(await p, expected); },
        async toBeUndefined() { assert.strictEqual(await p, undefined); },
        async toBeNull() { assert.strictEqual(await p, null); },
        async toBeDefined() { assert.notStrictEqual(await p, undefined); },
        async toBeTruthy() { assert.ok(await p); },
      };
    },
    get rejects(): any {
      const p = actual as Promise<unknown>;
      return {
        async toBeInstanceOf(cls: new (...a: unknown[]) => unknown) { await assert.rejects(p, cls); },
        async toThrow(msg?: string | RegExp | (new (...a: unknown[]) => unknown)) {
          if (!msg) await assert.rejects(p);
          else if (typeof msg === 'string') await assert.rejects(p, new RegExp(esc(msg)));
          else await assert.rejects(p, msg as RegExp);
        },
        async toSatisfy(predicate: (val: unknown) => boolean) {
          let err: unknown;
          try { await p; } catch(e) { err = e; }
          assert.ok(predicate(err), `Rejected value did not satisfy predicate. Got: ${String(err)}`);
        },
        async toMatchObject(expected: Record<string, unknown>) {
          let err: unknown;
          try { await p; } catch(e) { err = e; }
          const errObj = err as Record<string, unknown>;
          for (const [k, v] of Object.entries(expected)) {
            if (typeof v === 'string' && (v as any).__isStringContaining) {
              assert.ok(String(errObj[k]).includes((v as any).__value), `Expected ${k} to contain "${(v as any).__value}"`);
            } else {
              assert.deepStrictEqual(errObj[k], v, `Expected ${k} to equal ${String(v)}`);
            }
          }
        },
      };
    },
  };
}
// expect.stringContaining — creates a partial string matcher for use in toMatchObject
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(expect as any).stringContaining = (str: string) => ({ __isStringContaining: true, __value: str });


// ─── Test seam helpers ────────────────────────────────────────────────────────

function makeOpts(fixture: Fixture, overrides: Parameters<typeof wikiAuditStatusHandler>[0] = {}) {
  const outLines: string[] = [];
  const errLines: string[] = [];
  let exitCode: number | undefined;

  return {
    opts: {
      cwd: fixture.root,
      stdout: (s: string) => { outLines.push(s); },
      stderr: (s: string) => { errLines.push(s); },
      exit: (c: number): never => {
        exitCode = c;
        throw new Error(`EXIT:${c}`);
      },
      // Default: non-TTY so we don't accidentally prompt
      isTTY: false,
      ...overrides,
    },
    get stdout() { return outLines.join(''); },
    get stderr() { return errLines.join(''); },
    get exitCode() { return exitCode; },
  };
}

async function runAudit(fixture: Fixture, extra: Parameters<typeof wikiAuditStatusHandler>[0] = {}) {
  const h = makeOpts(fixture, extra);
  try {
    await wikiAuditStatusHandler(h.opts);
  } catch (e) {
    if (!(e instanceof Error) || !e.message.startsWith('EXIT:')) throw e;
  }
  return h;
}

// ─── Fixtures ────────────────────────────────────────────────────────────────

let fx: Fixture;

beforeEach(() => {
  // each test builds its own fixture
});

afterEach(() => {
  if (fx) {
    fx.cleanup();
  }
});

// ─── Scenario 1: Clean repo passes ───────────────────────────────────────────

describe('Scenario 1: Clean repo passes', () => {
  test('exits 0 and reports clean when no drift', async () => {
    fx = buildFixture([
      {
        subdir: 'pending-sync',
        filename: 'EPIC-100_Test.md',
        content: epicContent('EPIC-100', 'Draft'),
      },
      {
        subdir: 'archive',
        filename: 'EPIC-101_Old.md',
        content: epicContent('EPIC-101', 'Completed'),
      },
    ]);

    const h = await runAudit(fx);
    assert.strictEqual(h.exitCode, 0);
    assert.ok(String(h.stdout).includes('audit-status: clean (0 drift)'));
  });
});

// ─── Scenario 2: Archive + non-terminal status flagged (Rule A) ───────────────

describe('Scenario 2: Archive + non-terminal status flagged', () => {
  test('exits 1 and reports Rule A drift for archived item with non-terminal status', async () => {
    fx = buildFixture([
      {
        subdir: 'archive',
        filename: 'EPIC-001_Document_Metadata_Lifecycle.md',
        content: epicContent('EPIC-001', 'Ready'),
      },
    ]);

    const h = await runAudit(fx);
    assert.strictEqual(h.exitCode, 1);
    assert.ok(String(h.stdout).includes("EPIC-001: Rule A — archived with non-terminal status 'Ready'"));
  });

  test('suggests Abandoned for epic with no terminal children', async () => {
    fx = buildFixture([
      {
        subdir: 'archive',
        filename: 'EPIC-002_Test.md',
        content: epicContent('EPIC-002', 'Draft'),
      },
    ]);

    const h = await runAudit(fx);
    assert.strictEqual(h.exitCode, 1);
    assert.ok(String(h.stdout).includes("Rule A — archived with non-terminal status 'Draft'"));
  });
});

// ─── Scenario 3: Sprint with all-done stories flagged (Rule C) ───────────────

describe('Scenario 3: Sprint with all-done stories flagged', () => {
  test('emits Rule C suggestion when all 10 child stories are Done', async () => {
    // Build 10 stories in archive with status Done, all referencing EPIC-014
    const stories = Array.from({ length: 10 }, (_, i) => ({
      subdir: 'archive' as const,
      filename: `STORY-014-${String(i + 1).padStart(2, '0')}_Child_Story.md`,
      content: storyContent(`STORY-014-${String(i + 1).padStart(2, '0')}`, 'EPIC-014', 'Done'),
    }));

    // EPIC-014 itself in archive (terminal)
    const epic = {
      subdir: 'archive' as const,
      filename: 'EPIC-014_Test_Epic.md',
      content: epicContent('EPIC-014', 'Completed'),
    };

    // SPRINT-10 in pending-sync with status Planned, referencing EPIC-014
    const sprint = {
      subdir: 'pending-sync' as const,
      filename: 'SPRINT-10_Test_Sprint.md',
      content: sprintContentWithEpics('SPRINT-10', ['EPIC-014'], 'Planned'),
    };

    fx = buildFixture([...stories, epic, sprint]);
    const h = await runAudit(fx);

    assert.strictEqual(h.exitCode, 1);
    assert.ok(String(h.stdout).includes('SPRINT-10: Rule C — 10/10 child stories terminal; suggest Completed'));
  });

  test('does NOT fire Rule C when sprint has no epics key', async () => {
    // Use a sprint file with no `epics:` field (no sprintContentWithEpics)
    fx = buildFixture([
      {
        subdir: 'pending-sync',
        filename: 'SPRINT-99_No_Epics.md',
        content: epicContent('SPRINT-99', 'Planned'), // no epics field
      },
    ]);

    const h = await runAudit(fx);
    // No Rule C output — should be clean or just no Rule C mention
    assert.ok(!String(h.stdout).includes('SPRINT-99: Rule C'));
  });
});

// ─── Scenario 4: --fix --yes applies corrections ──────────────────────────────

describe('Scenario 4: --fix --yes applies corrections', () => {
  test('updates status lines in-place; frontmatter corrected, body unchanged', async () => {
    // 6 drift items: 3 Rule A epics + 3 Rule A stories (no Rule B or pending-sync sprints
    // that would create new Rule B violations after fix)
    const archiveItems = [
      { subdir: 'archive' as const, filename: 'EPIC-001_Doc.md', content: epicContent('EPIC-001', 'Ready') },
      { subdir: 'archive' as const, filename: 'EPIC-008_Gates.md', content: epicContent('EPIC-008', 'Draft') },
      { subdir: 'archive' as const, filename: 'EPIC-009_Scaffold.md', content: epicContent('EPIC-009', 'Draft') },
      { subdir: 'archive' as const, filename: 'STORY-001-01_Story.md', content: storyContent('STORY-001-01', 'EPIC-001', 'Draft') },
      { subdir: 'archive' as const, filename: 'STORY-001-02_Story.md', content: storyContent('STORY-001-02', 'EPIC-001', 'Draft') },
      { subdir: 'archive' as const, filename: 'STORY-001-03_Story.md', content: storyContent('STORY-001-03', 'EPIC-001', 'Draft') },
    ];

    fx = buildFixture(archiveItems);

    // First run: drift detected
    const h0 = await runAudit(fx);
    assert.strictEqual(h0.exitCode, 1);

    // Apply with --fix --yes
    const h1 = await runAudit(fx, { fix: true, yes: true, quiet: true });
    assert.strictEqual(h1.exitCode, 0);
    assert.ok(String(h1.stdout).includes('audit-status: applied 6 fix(es)'));

    // Verify the archive epic status lines were updated
    const epic001Path = path.join(fx.deliveryRoot, 'archive', 'EPIC-001_Doc.md');
    const epic001Text = fs.readFileSync(epic001Path, 'utf8');
    // EPIC-001 has children (STORY-001-xx) but they were Draft → non-terminal → suggests Abandoned
    assert.match(String(epic001Text), /^status: "Abandoned"/m);
    // Body must be unchanged (same content, just status line replaced)
    assert.ok(String(epic001Text).includes('# EPIC-001: Test Epic'));
    assert.ok(String(epic001Text).includes('A test epic for unit testing.'));

    // After fix, second run must be clean
    const h2 = await runAudit(fx, { fix: false });
    assert.strictEqual(h2.exitCode, 0);
    assert.ok(String(h2.stdout).includes('audit-status: clean (0 drift)'));
  });

  test('only changes the status line; all other bytes are identical', async () => {
    const originalContent = epicContent('EPIC-050', 'Ready');
    fx = buildFixture([
      { subdir: 'archive', filename: 'EPIC-050_Test.md', content: originalContent },
    ]);

    await runAudit(fx, { fix: true, yes: true, quiet: true });

    const fixedPath = path.join(fx.deliveryRoot, 'archive', 'EPIC-050_Test.md');
    const fixedContent = fs.readFileSync(fixedPath, 'utf8');

    // Line-by-line comparison: only the status line should differ
    const originalLines = originalContent.split('\n');
    const fixedLines = fixedContent.split('\n');
    assert.strictEqual(fixedLines.length, originalLines.length);

    const diffLines = originalLines.filter((l, i) => l !== fixedLines[i]);
    assert.strictEqual(diffLines.length, 1);
    assert.match(String(diffLines[0]), /^status:/);
  });
});

// ─── Scenario 5: Pending-sync + terminal status emits move command (Rule B) ───

describe('Scenario 5: Pending-sync + terminal status emits move command', () => {
  test('prints git mv hint for Completed-in-pending-sync and does NOT move under --fix', async () => {
    // Rule B: terminal status in pending-sync → emit git mv hint
    // Using 'Completed' which IS in TERMINAL set
    const proposalFilename = 'PROPOSAL-011_Execution_V2_Polish.md';
    fx = buildFixture([
      {
        subdir: 'pending-sync',
        filename: proposalFilename,
        content: proposalContent('PROPOSAL-011', 'Completed'),
      },
    ]);

    // Run without --fix first: check output contains git mv hint
    const h1 = await runAudit(fx);
    assert.strictEqual(h1.exitCode, 1);
    // stdout must contain the source path and destination archive dir
    assert.ok(String(h1.stdout).includes('.cleargate/delivery/pending-sync/PROPOSAL-011_Execution_V2_Polish.md'));
    assert.ok(String(h1.stdout).includes('.cleargate/delivery/archive/'));

    // Run with --fix --yes: file must NOT be moved (Rule B skips status mutation)
    const originalPath = path.join(fx.deliveryRoot, 'pending-sync', proposalFilename);
    const h2 = await runAudit(fx, { fix: true, yes: true, quiet: true });
    // exits 0 because no Rule A/C fixable items; Rule B is skipped
    assert.strictEqual(h2.exitCode, 0);
    // File still at original location — never moved
    expect(fs.existsSync(originalPath)).toBe(true);
    expect(fs.existsSync(path.join(fx.deliveryRoot, 'archive', proposalFilename))).toBe(false);
  });
});

// ─── Scenario 6: E2E convergence ─────────────────────────────────────────────

describe('Scenario 6: E2E convergence', () => {
  test('after --fix --yes on Rule A items only, second audit run exits 0', async () => {
    // Rule A items only — no Rule B items (Rule B can't be auto-fixed, preventing convergence)
    // and no Rule C items where fixing creates a new Rule B violation.
    const epicDrift1 = { subdir: 'archive' as const, filename: 'EPIC-301_Old.md', content: epicContent('EPIC-301', 'Ready') };
    const epicDrift2 = { subdir: 'archive' as const, filename: 'EPIC-302_Old.md', content: epicContent('EPIC-302', 'Draft') };
    const epicDrift3 = { subdir: 'archive' as const, filename: 'EPIC-303_Stale.md', content: epicContent('EPIC-303', 'Planned') };

    fx = buildFixture([epicDrift1, epicDrift2, epicDrift3]);

    // First audit: should detect 3 drift items
    const h1 = await runAudit(fx);
    assert.strictEqual(h1.exitCode, 1);

    // Apply fixes
    const h2 = await runAudit(fx, { fix: true, yes: true, quiet: true });
    assert.strictEqual(h2.exitCode, 0);
    assert.ok(String(h2.stdout).includes('audit-status: applied 3 fix(es)'));

    // Second audit: must exit 0 — convergence achieved
    const h3 = await runAudit(fx);
    assert.strictEqual(h3.exitCode, 0);
    assert.ok(String(h3.stdout).includes('audit-status: clean (0 drift)'));
  });

  test('Rule C fix convergence: archive sprint gets Completed status → clean', async () => {
    // Sprint in archive (not pending-sync) with non-terminal status + all children terminal
    // After fix: sprint in archive with Completed → no Rule A violation
    const stories = Array.from({ length: 3 }, (_, i) => ({
      subdir: 'archive' as const,
      filename: `STORY-400-${String(i + 1).padStart(2, '0')}_S.md`,
      content: storyContent(`STORY-400-${String(i + 1).padStart(2, '0')}`, 'EPIC-400', 'Done'),
    }));
    const epic = { subdir: 'archive' as const, filename: 'EPIC-400_Test.md', content: epicContent('EPIC-400', 'Completed') };
    // Sprint in archive with non-terminal status — Rule A fires (archive + non-terminal)
    // AND Rule C fires (sprint + all children terminal) — both suggest Completed
    const sprint = {
      subdir: 'archive' as const,
      filename: 'SPRINT-40_Archive.md',
      content: sprintContentWithEpics('SPRINT-40', ['EPIC-400'], 'Active'),
    };

    fx = buildFixture([...stories, epic, sprint]);

    // First run: drift detected
    const h1 = await runAudit(fx);
    assert.strictEqual(h1.exitCode, 1);

    // Fix
    const h2 = await runAudit(fx, { fix: true, yes: true, quiet: true });
    assert.strictEqual(h2.exitCode, 0);

    // Second run: clean
    const h3 = await runAudit(fx);
    assert.strictEqual(h3.exitCode, 0);
    assert.ok(String(h3.stdout).includes('audit-status: clean (0 drift)'));
  });
});

// ─── TTY guard tests ─────────────────────────────────────────────────────────

describe('TTY guards', () => {
  test('refuses --fix without --yes in non-TTY mode (exit 2)', async () => {
    fx = buildFixture([
      { subdir: 'archive', filename: 'EPIC-400_Drift.md', content: epicContent('EPIC-400', 'Ready') },
    ]);

    const h = await runAudit(fx, { fix: true, yes: false, isTTY: false });
    assert.strictEqual(h.exitCode, 2);
    assert.ok(String(h.stderr).includes('--fix requires --yes in non-interactive mode'));
  });

  test('prompts in TTY mode and aborts if answer != y', async () => {
    fx = buildFixture([
      { subdir: 'archive', filename: 'EPIC-401_Drift.md', content: epicContent('EPIC-401', 'Draft') },
    ]);

    const h = await runAudit(fx, {
      fix: true,
      yes: false,
      isTTY: true,
      promptReader: async () => 'n',
    });
    assert.strictEqual(h.exitCode, 2);
    assert.ok(String(h.stdout).includes('aborted'));
  });

  test('applies fixes in TTY mode when answer is y', async () => {
    fx = buildFixture([
      { subdir: 'archive', filename: 'EPIC-402_Drift.md', content: epicContent('EPIC-402', 'Draft') },
    ]);

    const h = await runAudit(fx, {
      fix: true,
      yes: false,
      isTTY: true,
      promptReader: async () => 'y',
    });
    assert.strictEqual(h.exitCode, 0);
  });
});
