import { describe, test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';

/**
 * sprint-archive-stamp.test.ts — STORY-015-04 acceptance tests.
 *
 * Gherkin scenarios covered:
 *   Scenario 1: Protocol files list Abandoned — definition present in both copies, files identical.
 *   Scenario 2: Sprint-archive stamps frontmatter (status + completed_at).
 *   Scenario 3: Sprint-archive rolls back on wiki-lint failure.
 *   Scenario 4: Sprint-archive rolls back on wiki-build failure.
 *   Scenario 5: Already-terminal sprint is no-op on status, still stamps completed_at.
 *   Scenario 6 (Gherkin §2.1 "Unmerged sprint rejected"): guard on state.sprint_status !== 'Completed'
 *     — test the actual contract string at sprint.ts L271, not the Gherkin wording.
 *   E2E: Full fixture run with real wikiBuildHandler + wikiLintHandler.
 *
 * NOTE: Gherkin §2.1 Scenario 4 says "sprint branch not merged" — actual guard checks
 * state.sprint_status !== 'Completed'. Tests match the real implemented contract.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import {
  sprintArchiveHandler,
  stampSprintClose,
  restoreSprintFile,
} from '../../src/commands/sprint.js';
import { wikiBuildHandler } from '../../src/commands/wiki-build.js';
import { wikiLintHandler } from '../../src/commands/wiki-lint.js';

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


// Repo root: test/commands/ → cleargate-cli/test/commands → up 4 dirs → repo root
// (same convention as test/scripts/protocol-section-13.test.ts)
const REPO_ROOT = path.resolve(new URL(import.meta.url).pathname, '..', '..', '..', '..');

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeExitSeam(): { exitFn: (code: number) => never; getCode: () => number | null } {
  let code: number | null = null;
  const exitFn = (c: number): never => {
    code = c;
    throw new Error(`exit:${c}`);
  };
  return { exitFn, getCode: () => code };
}

function makeCapture() {
  const out: string[] = [];
  const err: string[] = [];
  return {
    stdout: (s: string) => { out.push(s); },
    stderr: (s: string) => { err.push(s); },
    getOut: () => out,
    getErr: () => err,
  };
}

// ─── Fixture builder (adapted from sprint-archive.test.ts) ───────────────────

interface FixtureOptions {
  sprintStatus?: string;
  sprintFrontmatterStatus?: string;
  executionMode?: 'v1' | 'v2';
}

interface Fixture {
  cwd: string;
  pendingDir: string;
  archiveDir: string;
  sprintFilePath: string;
  cleanup: () => void;
}

function buildFixture(opts: FixtureOptions = {}): Fixture {
  const {
    sprintStatus = 'Completed',
    sprintFrontmatterStatus = 'Planned',
    executionMode = 'v2',
  } = opts;

  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'cg-stamp-test-'));

  const pendingDir = path.join(cwd, '.cleargate', 'delivery', 'pending-sync');
  const archiveDir = path.join(cwd, '.cleargate', 'delivery', 'archive');
  const sprintRunsDir = path.join(cwd, '.cleargate', 'sprint-runs', 'SPRINT-99');
  const wikiDir = path.join(cwd, '.cleargate', 'wiki');
  fs.mkdirSync(pendingDir, { recursive: true });
  fs.mkdirSync(archiveDir, { recursive: true });
  fs.mkdirSync(sprintRunsDir, { recursive: true });
  fs.mkdirSync(wikiDir, { recursive: true });
  // Write a minimal index so lint budget check sees an index (under ceiling)
  fs.writeFileSync(path.join(wikiDir, 'index.md'), '# Index\n\n(empty)\n');

  // state.json
  const stateJson = {
    schema_version: 2,
    sprint_id: 'SPRINT-99',
    execution_mode: 'v2',
    sprint_status: sprintStatus,
    stories: {
      'STORY-099-01': { state: 'Done', qa_bounces: 0, arch_bounces: 0, worktree: null, updated_at: '2026-04-21T00:00:00.000Z', notes: '', lane: 'standard', lane_assigned_by: 'migration-default', lane_demoted_at: null, lane_demotion_reason: null },
    },
  };
  fs.writeFileSync(path.join(sprintRunsDir, 'state.json'), JSON.stringify(stateJson, null, 2));

  // Sprint file in pending-sync
  const sprintContent = `---
sprint_id: "SPRINT-99"
status: "${sprintFrontmatterStatus}"
execution_mode: "${executionMode}"
epics: ["EPIC-099"]
---

# SPRINT-99: Test Sprint
`;
  const sprintFilePath = path.join(pendingDir, 'SPRINT-99_Test_Sprint.md');
  fs.writeFileSync(sprintFilePath, sprintContent);

  // Epic file
  fs.writeFileSync(
    path.join(pendingDir, 'EPIC-099_Test_Epic.md'),
    `---\nepic_id: EPIC-099\nstatus: "Active"\nparent_sprint_ref: SPRINT-99\n---\n\n# EPIC-099\n`,
  );

  // Story file
  fs.writeFileSync(
    path.join(pendingDir, 'STORY-099-01_Test_Story_1.md'),
    `---\nstory_id: STORY-099-01\nparent_epic_ref: EPIC-099\nstatus: "Ready"\n---\n\n# STORY-099-01\n`,
  );

  return {
    cwd,
    pendingDir,
    archiveDir,
    sprintFilePath,
    cleanup: () => fs.rmSync(cwd, { recursive: true, force: true }),
  };
}

// ─── Scenario 1: Protocol files list Abandoned ────────────────────────────────

describe('Scenario 1: Protocol files list Abandoned', () => {
  test('dogfood protocol contains Abandoned definition', () => {
    const protocolPath = path.join(REPO_ROOT, '.cleargate', 'knowledge', 'cleargate-protocol.md');
    const content = fs.readFileSync(protocolPath, 'utf8');
    assert.ok(String(content).includes('Abandoned'));
    assert.ok(String(content).includes('Work deliberately stopped without shipping'));
    assert.ok(String(content).includes('archive/'));
    assert.ok(String(content).includes('Not eligible for the Active index'));
  });

  test('scaffold protocol contains identical Abandoned definition', () => {
    const scaffoldPath = path.join(
      REPO_ROOT,
      'cleargate-planning', '.cleargate', 'knowledge', 'cleargate-protocol.md',
    );
    const content = fs.readFileSync(scaffoldPath, 'utf8');
    assert.ok(String(content).includes('Abandoned'));
    assert.ok(String(content).includes('Work deliberately stopped without shipping'));
  });

  test('both protocol files are byte-identical', () => {
    const dogfood = fs.readFileSync(
      path.join(REPO_ROOT, '.cleargate', 'knowledge', 'cleargate-protocol.md'),
      'utf8',
    );
    const scaffold = fs.readFileSync(
      path.join(REPO_ROOT, 'cleargate-planning', '.cleargate', 'knowledge', 'cleargate-protocol.md'),
      'utf8',
    );
    assert.strictEqual(dogfood, scaffold);
  });
});

// ─── stampSprintClose unit tests ──────────────────────────────────────────────

describe('stampSprintClose helper', () => {
  let tmpDir: string;
  let sprintFile: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cg-stamp-unit-'));
    sprintFile = path.join(tmpDir, 'SPRINT-99.md');
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  test('stamps status=Completed and completed_at on non-terminal sprint', () => {
    fs.writeFileSync(sprintFile, '---\nstatus: "Planned"\n---\n\n# Body\n');
    const { didChange, stampedContent } = stampSprintClose(sprintFile, () => '2026-01-01T00:00:00.000Z');
    assert.strictEqual(didChange, true);
    assert.ok(String(stampedContent).includes('status: Completed'));
    assert.ok(String(stampedContent).includes('completed_at:'));
    assert.ok(String(stampedContent).includes('2026-01-01T'));
    // Verify disk was written
    const onDisk = fs.readFileSync(sprintFile, 'utf8');
    assert.ok(String(onDisk).includes('status: Completed'));
  });

  test('is no-op when already terminal + completed_at set', () => {
    const original = '---\nstatus: "Completed"\ncompleted_at: "2026-01-01T00:00:00.000Z"\n---\n\n# Body\n';
    fs.writeFileSync(sprintFile, original);
    const { didChange, previousContent, stampedContent } = stampSprintClose(sprintFile, () => '2026-02-01T00:00:00.000Z');
    assert.strictEqual(didChange, false);
    assert.strictEqual(stampedContent, previousContent);
    // File should not have been changed
    const onDisk = fs.readFileSync(sprintFile, 'utf8');
    assert.strictEqual(onDisk, original);
  });

  test('keeps status when already terminal but stamps completed_at if absent', () => {
    fs.writeFileSync(sprintFile, '---\nstatus: "Done"\n---\n\n# Body\n');
    const { didChange, stampedContent } = stampSprintClose(sprintFile, () => '2026-01-01T00:00:00.000Z');
    assert.strictEqual(didChange, true);
    assert.ok(String(stampedContent).includes('status: Done'));
    assert.ok(String(stampedContent).includes('completed_at:'));
    assert.ok(String(stampedContent).includes('2026-01-01T'));
  });
});

describe('restoreSprintFile helper', () => {
  test('atomically restores original content', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cg-restore-'));
    const file = path.join(tmpDir, 'test.md');
    const original = '---\nstatus: "Planned"\n---\n\n# Body\n';
    fs.writeFileSync(file, original);
    // Stamp it
    stampSprintClose(file, () => '2026-01-01T00:00:00.000Z');
    // Restore
    restoreSprintFile(file, original);
    expect(fs.readFileSync(file, 'utf8')).toBe(original);
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });
});

// ─── Scenario 2: Sprint-archive stamps frontmatter ────────────────────────────

describe('Scenario 2: Sprint-archive stamps frontmatter', () => {
  let fixture: Fixture;
  beforeEach(() => { fixture = buildFixture({ sprintFrontmatterStatus: 'Planned' }); });
  afterEach(() => fixture.cleanup());

  test('stamps status=Completed and completed_at on the archived sprint file', async () => {
    const { exitFn } = makeExitSeam();
    const buildCalls: string[] = [];
    const lintCalls: string[] = [];

    try {
      await sprintArchiveHandler(
        { sprintId: 'SPRINT-99' },
        {
          sprintFilePath: fixture.sprintFilePath,
          cwd: fixture.cwd,
          stdout: () => {},
          stderr: () => {},
          exit: exitFn,
          spawnFn: () => ({ status: 0, error: null, stdout: '', stderr: '' }) as never,
          wikiBuildFn: async (cwd) => { buildCalls.push(cwd); },
          wikiLintFn: async (cwd) => { lintCalls.push(cwd); },
        },
      );
    } catch { /* expected exit */ }

    // Check archived sprint file has stamps
    const archived = fs.readFileSync(
      path.join(fixture.archiveDir, 'SPRINT-99_Test_Sprint.md'),
      'utf8',
    );
    assert.ok(String(archived).includes('status: Completed'));
    assert.match(String(archived), /completed_at: \d{4}-\d{2}-\d{2}T/);

    // wikiBuild called before wikiLint
    assert.strictEqual((buildCalls).length, 1);
    assert.strictEqual((lintCalls).length, 1);
    // Build was called before lint (both got the cwd)
    assert.strictEqual(buildCalls[0], fixture.cwd);
    assert.strictEqual(lintCalls[0], fixture.cwd);
  });
});

// ─── Scenario 3: Sprint-archive rolls back on wiki-lint failure ───────────────

describe('Scenario 3: Sprint-archive rolls back on wiki-lint failure', () => {
  let fixture: Fixture;
  beforeEach(() => { fixture = buildFixture({ sprintFrontmatterStatus: 'Planned' }); });
  afterEach(() => fixture.cleanup());

  test('reverts sprint frontmatter to Planned on lint failure', async () => {
    const { exitFn, getCode } = makeExitSeam();
    const cap = makeCapture();

    try {
      await sprintArchiveHandler(
        { sprintId: 'SPRINT-99' },
        {
          sprintFilePath: fixture.sprintFilePath,
          cwd: fixture.cwd,
          stdout: cap.stdout,
          stderr: cap.stderr,
          exit: exitFn,
          spawnFn: () => ({ status: 0, error: null, stdout: '', stderr: '' }) as never,
          wikiBuildFn: async () => { /* ok */ },
          wikiLintFn: async () => { throw new Error('index-budget: wiki/index.md exceeds token ceiling: 9000 > 8000'); },
        },
      );
    } catch { /* expected exit */ }

    expect(getCode()).toBe(1);
    // Sprint file should be restored to Planned
    const sprintOnDisk = fs.readFileSync(fixture.sprintFilePath, 'utf8');
    assert.ok(String(sprintOnDisk).includes('status: "Planned"'));
    assert.ok(!String(sprintOnDisk).includes('status: Completed'));

    // Stderr mentions reverted
    const errOut = cap.getErr().join('\n');
    assert.ok(String(errOut).includes('reverted'));

    // Sprint file was NOT moved to archive/
    expect(fs.existsSync(fixture.sprintFilePath)).toBe(true);
    const archived = fs.readdirSync(fixture.archiveDir);
    assert.ok(!String(archived).includes('SPRINT-99_Test_Sprint.md'));
  });
});

// ─── Scenario 4: Sprint-archive rolls back on wiki-build failure ──────────────

describe('Scenario 4: Sprint-archive rolls back on wiki-build failure', () => {
  let fixture: Fixture;
  beforeEach(() => { fixture = buildFixture({ sprintFrontmatterStatus: 'Planned' }); });
  afterEach(() => fixture.cleanup());

  test('reverts sprint frontmatter to Planned on build failure', async () => {
    const { exitFn, getCode } = makeExitSeam();
    const cap = makeCapture();

    try {
      await sprintArchiveHandler(
        { sprintId: 'SPRINT-99' },
        {
          sprintFilePath: fixture.sprintFilePath,
          cwd: fixture.cwd,
          stdout: cap.stdout,
          stderr: cap.stderr,
          exit: exitFn,
          spawnFn: () => ({ status: 0, error: null, stdout: '', stderr: '' }) as never,
          wikiBuildFn: async () => { throw new Error('wiki build failed: scan error'); },
          wikiLintFn: async () => { /* should not reach here */ },
        },
      );
    } catch { /* expected exit */ }

    expect(getCode()).toBe(1);
    const sprintOnDisk = fs.readFileSync(fixture.sprintFilePath, 'utf8');
    assert.ok(String(sprintOnDisk).includes('status: "Planned"'));
    const errOut = cap.getErr().join('\n');
    assert.ok(String(errOut).includes('reverted'));
    const archived = fs.readdirSync(fixture.archiveDir);
    assert.ok(!String(archived).includes('SPRINT-99_Test_Sprint.md'));
  });
});

// ─── Scenario 5: Already-terminal sprint ─────────────────────────────────────

describe('Scenario 5: Already-terminal sprint is no-op on status, still stamps completed_at', () => {
  let fixture: Fixture;

  beforeEach(() => {
    fixture = buildFixture({ sprintFrontmatterStatus: 'Completed' });
    // Overwrite sprint file to have Completed status but no completed_at
    const sprintContent = `---
sprint_id: "SPRINT-99"
status: "Completed"
execution_mode: "v2"
epics: ["EPIC-099"]
---

# SPRINT-99: Test Sprint
`;
    fs.writeFileSync(fixture.sprintFilePath, sprintContent);
  });

  afterEach(() => fixture.cleanup());

  test('keeps status=Completed and adds completed_at', async () => {
    const { exitFn } = makeExitSeam();

    try {
      await sprintArchiveHandler(
        { sprintId: 'SPRINT-99' },
        {
          sprintFilePath: fixture.sprintFilePath,
          cwd: fixture.cwd,
          stdout: () => {},
          stderr: () => {},
          exit: exitFn,
          spawnFn: () => ({ status: 0, error: null, stdout: '', stderr: '' }) as never,
          wikiBuildFn: async () => {},
          wikiLintFn: async () => {},
        },
      );
    } catch { /* expected exit */ }

    const archived = fs.readFileSync(
      path.join(fixture.archiveDir, 'SPRINT-99_Test_Sprint.md'),
      'utf8',
    );
    assert.ok(String(archived).includes('status: Completed'));
    assert.match(String(archived), /completed_at: \d{4}-\d{2}-\d{2}T/);
  });
});

// ─── Scenario 6 (Gherkin §2.1 Scenario 4): Unmerged sprint rejected ──────────
// Actual guard: state.sprint_status !== 'Completed'.
// Gherkin says "sprint branch not merged" but implementation checks state.json.
// Test matches the actual contract (L271 error string).

describe('Scenario 6: Sprint not closed — guard on state.sprint_status', () => {
  let fixture: Fixture;
  beforeEach(() => { fixture = buildFixture({ sprintStatus: 'Active' }); });
  afterEach(() => fixture.cleanup());

  test('exits non-zero when sprint_status is not Completed', async () => {
    const { exitFn, getCode } = makeExitSeam();
    const cap = makeCapture();

    try {
      await sprintArchiveHandler(
        { sprintId: 'SPRINT-99' },
        {
          sprintFilePath: fixture.sprintFilePath,
          cwd: fixture.cwd,
          stdout: cap.stdout,
          stderr: cap.stderr,
          exit: exitFn,
          spawnFn: () => ({ status: 0, error: null, stdout: '', stderr: '' }) as never,
          wikiBuildFn: async () => {},
          wikiLintFn: async () => {},
        },
      );
    } catch { /* expected exit */ }

    expect(getCode()).toBe(1);
    const errOut = cap.getErr().join('\n');
    // Match actual contract string (not Gherkin "sprint branch not merged")
    assert.ok(String(errOut).includes('sprint not closed'));
    assert.ok(String(errOut).includes('--assume-ack'));
  });

  test('makes no frontmatter changes when rejected', async () => {
    const { exitFn } = makeExitSeam();
    const originalContent = fs.readFileSync(fixture.sprintFilePath, 'utf8');

    try {
      await sprintArchiveHandler(
        { sprintId: 'SPRINT-99' },
        {
          sprintFilePath: fixture.sprintFilePath,
          cwd: fixture.cwd,
          stdout: () => {},
          stderr: () => {},
          exit: exitFn,
          spawnFn: () => ({ status: 0, error: null, stdout: '', stderr: '' }) as never,
        },
      );
    } catch { /* expected exit */ }

    const currentContent = fs.readFileSync(fixture.sprintFilePath, 'utf8');
    assert.strictEqual(currentContent, originalContent);
  });
});

// ─── E2E: Full fixture run with real handlers ─────────────────────────────────
//
// Uses real wikiBuildHandler + wikiLintHandler wired with test seams
// (git runner stub + no-op exit seam) so the full stamp→build→lint→archive
// path is exercised without subprocess git calls or process.exit side effects.

describe('E2E: Full fixture run with real wiki handlers', () => {
  let fixture: Fixture;

  beforeEach(() => {
    fixture = buildFixture({ sprintFrontmatterStatus: 'Planned' });
    // Update the epic file to include its story as a child (avoids broken-backlink lint finding)
    const epicPath = path.join(fixture.pendingDir, 'EPIC-099_Test_Epic.md');
    fs.writeFileSync(epicPath, `---
epic_id: EPIC-099
status: "Active"
parent_sprint_ref: SPRINT-99
children:
  - STORY-099-01
---

# EPIC-099: Test Epic

## Blast radius
Affects: [[SPRINT-99]]

## Children
- [[STORY-099-01]]
`);
    // wiki dir is already created by buildFixture
  });

  afterEach(() => fixture.cleanup());

  test('archives sprint with stamps and exits 0 on happy path', async () => {
    const { exitFn, getCode } = makeExitSeam();
    const cap = makeCapture();

    // Stub git runner — synchronous, returns a fixed SHA for all paths
    const stubGitRunner = (_cmd: string, _args: string[]) => 'abc1234abc1234abc1234abc1234abc1234abc1234';

    // Real wiki handlers wired with test seams (no process.exit, no real git)
    // Resolve template dir — needed because wikiBuildHandler uses import.meta.url to
    // find templates, which resolves to dist/ in compiled form but not in vitest TS mode.
    const templateDir = path.join(REPO_ROOT, 'cleargate-cli', 'templates', 'synthesis');

    // wikiBuildHandler on success returns (no exit call); on failure calls exit(1) which throws.
    // wikiLintHandler on success calls exit(0) which throws; on findings calls exit(1) which throws.
    // We intercept with a fakeExit that throws; success = await returns; failure = exit(nonzero) throws.
    const realBuildFn = async (wCwd: string, wStdout: (s: string) => void) => {
      const fakeExit = (code: number): never => {
        throw new Error(`wiki-build-exit:${code}`);
      };
      try {
        await wikiBuildHandler({
          cwd: wCwd,
          stdout: wStdout,
          exit: fakeExit as never,
          gitRunner: stubGitRunner,
          templateDir,
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.startsWith('wiki-build-exit:0')) return; // success exit
        throw err; // real error
      }
    };

    // wikiLintHandler on success calls exit(0); on findings calls exit(1).
    // Intercept: exit(0) → return; exit(1) → throw.
    const realLintFn = async (wCwd: string, wStdout: (s: string) => void) => {
      const fakeExit = (code: number): never => {
        throw new Error(`wiki-lint-exit:${code}`);
      };
      try {
        await wikiLintHandler({
          cwd: wCwd,
          stdout: wStdout,
          exit: fakeExit as never,
          gitRunner: stubGitRunner,
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : '';
        if (msg.startsWith('wiki-lint-exit:0')) return; // success exit
        throw err; // non-zero exit or real error
      }
    };

    try {
      await sprintArchiveHandler(
        { sprintId: 'SPRINT-99' },
        {
          sprintFilePath: fixture.sprintFilePath,
          cwd: fixture.cwd,
          stdout: cap.stdout,
          stderr: cap.stderr,
          exit: exitFn,
          spawnFn: () => ({ status: 0, error: null, stdout: '', stderr: '' }) as never,
          wikiBuildFn: realBuildFn,
          wikiLintFn: realLintFn,
        },
      );
    } catch { /* expected exit */ }

    expect(getCode()).toBe(0);

    // Sprint file archived with stamps
    const archived = fs.readFileSync(
      path.join(fixture.archiveDir, 'SPRINT-99_Test_Sprint.md'),
      'utf8',
    );
    assert.ok(String(archived).includes('status: Completed'));
    assert.match(String(archived), /completed_at: \d{4}-\d{2}-\d{2}T/);

    // All files moved
    const archivedFiles = fs.readdirSync(fixture.archiveDir);
    assert.ok(String(archivedFiles).includes('SPRINT-99_Test_Sprint.md'));
    assert.ok(String(archivedFiles).includes('EPIC-099_Test_Epic.md'));
    assert.ok(String(archivedFiles).includes('STORY-099-01_Test_Story_1.md'));
  });
});
