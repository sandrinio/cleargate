import { describe, test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';

/**
 * sprint-archive.test.ts — unit tests for `cleargate sprint archive` handler.
 *
 * STORY-014-08 Gherkin scenarios:
 *   Scenario 1: Happy path — Completed state → files moved, stamps correct, git commands fired.
 *   Scenario 2: Refuses when sprint_status === 'Active' → exit 1 + stderr.
 *   Scenario 3: --dry-run prints plan + zero filesystem changes.
 *   Scenario 4: v1 inert — no changes, prints inert message.
 *
 * Tests use tmpdir fixture + fake state.json + dummy pending-sync files.
 * No mocks of node:fs — real filesystem in tmpdir (no DB involved).
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { sprintArchiveHandler } from '../../src/commands/sprint.js';
import { V1_INERT_MESSAGE } from '../../src/commands/execution-mode.js';

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

// ─── Fixture builder ──────────────────────────────────────────────────────────

interface FixtureOptions {
  sprintStatus?: string;
  executionMode?: 'v1' | 'v2';
  includeOrphan?: boolean;
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
    executionMode = 'v2',
    includeOrphan = false,
  } = opts;

  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'cg-sprint-archive-test-'));

  // Directory scaffold
  const pendingDir = path.join(cwd, '.cleargate', 'delivery', 'pending-sync');
  const archiveDir = path.join(cwd, '.cleargate', 'delivery', 'archive');
  const sprintRunsDir = path.join(cwd, '.cleargate', 'sprint-runs', 'SPRINT-99');
  fs.mkdirSync(pendingDir, { recursive: true });
  fs.mkdirSync(archiveDir, { recursive: true });
  fs.mkdirSync(sprintRunsDir, { recursive: true });

  // state.json
  const stateJson = {
    schema_version: 2,
    sprint_id: 'SPRINT-99',
    execution_mode: 'v2',
    sprint_status: sprintStatus,
    stories: {
      'STORY-099-01': { state: 'Done', qa_bounces: 0, arch_bounces: 0, worktree: null, updated_at: '2026-01-01T00:00:00.000Z', notes: '', lane: 'standard', lane_assigned_by: 'migration-default', lane_demoted_at: null, lane_demotion_reason: null },
      'STORY-099-02': { state: 'Done', qa_bounces: 0, arch_bounces: 0, worktree: null, updated_at: '2026-01-01T00:00:00.000Z', notes: '', lane: 'standard', lane_assigned_by: 'migration-default', lane_demoted_at: null, lane_demotion_reason: null },
    },
  };
  fs.writeFileSync(path.join(sprintRunsDir, 'state.json'), JSON.stringify(stateJson, null, 2));

  // Sprint file in pending-sync
  const sprintContent = `---
sprint_id: "SPRINT-99"
status: "Active"
execution_mode: "${executionMode}"
epics: ["EPIC-099"]
---

# SPRINT-99: Test Sprint
`;
  const sprintFilePath = path.join(pendingDir, 'SPRINT-99_Test_Sprint.md');
  fs.writeFileSync(sprintFilePath, sprintContent);

  // Epic file in pending-sync
  const epicContent = `---
epic_id: EPIC-099
status: "Active"
parent_sprint_ref: SPRINT-99
---

# EPIC-099: Test Epic
`;
  fs.writeFileSync(path.join(pendingDir, 'EPIC-099_Test_Epic.md'), epicContent);

  // Story files in pending-sync
  const storyContent1 = `---
story_id: STORY-099-01
parent_epic_ref: EPIC-099
status: "Ready"
---

# STORY-099-01: Test Story 1
`;
  fs.writeFileSync(path.join(pendingDir, 'STORY-099-01_Test_Story_1.md'), storyContent1);

  const storyContent2 = `---
story_id: STORY-099-02
parent_epic_ref: EPIC-099
status: "Ready"
---

# STORY-099-02: Test Story 2
`;
  fs.writeFileSync(path.join(pendingDir, 'STORY-099-02_Test_Story_2.md'), storyContent2);

  // Orphan story: matches epic but NOT in state.json stories
  if (includeOrphan) {
    const orphanContent = `---
story_id: STORY-099-99
parent_epic_ref: EPIC-099
status: "Ready"
---

# STORY-099-99: Orphan Story
`;
    fs.writeFileSync(path.join(pendingDir, 'STORY-099-99_Orphan_Story.md'), orphanContent);
  }

  return {
    cwd,
    pendingDir,
    archiveDir,
    sprintFilePath,
    cleanup: () => fs.rmSync(cwd, { recursive: true, force: true }),
  };
}

// ─── Scenario 1: Happy path ───────────────────────────────────────────────────

describe('Scenario: archive completes the close-out (happy path)', () => {
  let fixture: Fixture;
  beforeEach(() => { fixture = buildFixture(); });
  afterEach(() => fixture.cleanup());

  test('fires git checkout main, merge, branch -d in order', () => {
    const { exitFn } = makeExitSeam();
    const cap = makeCapture();
    const spawnCalls: [string, string[]][] = [];
    const spawnMock = (cmd: string, args: string[]) => {
      spawnCalls.push([cmd, [...args]]);
      return { status: 0, error: null, stdout: 'abc123', stderr: '' };
    };

    try {
      sprintArchiveHandler(
        { sprintId: 'SPRINT-99' },
        {
          sprintFilePath: fixture.sprintFilePath,
          cwd: fixture.cwd,
          stdout: cap.stdout,
          stderr: cap.stderr,
          exit: exitFn,
          spawnFn: spawnMock as never,
        },
      );
    } catch { /* expected exit */ }

    // Verify git command order
    const gitCmds = spawnCalls.filter(([cmd]) => cmd === 'git');
    assert.ok(String(gitCmds[0]?.[1]).includes('main')); // checkout main
    assert.deepStrictEqual(gitCmds[0]?.[1], ['checkout', 'main']);
    assert.ok(String(gitCmds[1]?.[1]).includes('merge')); // merge
    assert.ok(String(gitCmds[1]?.[1]).includes('--no-ff'));
    assert.ok(String(gitCmds[1]?.[1]).includes('sprint/S-99')); // branch name (non-numeric falls back to SPRINT-99)
    assert.deepStrictEqual(gitCmds[2]?.[1], ['branch', '-d', 'sprint/S-99']); // branch delete
  });

  test('moves all 4 files to archive/', () => {
    const { exitFn } = makeExitSeam();
    const cap = makeCapture();
    const spawnMock = () => ({ status: 0, error: null, stdout: '', stderr: '' });

    try {
      sprintArchiveHandler(
        { sprintId: 'SPRINT-99' },
        {
          sprintFilePath: fixture.sprintFilePath,
          cwd: fixture.cwd,
          stdout: cap.stdout,
          stderr: cap.stderr,
          exit: exitFn,
          spawnFn: spawnMock as never,
        },
      );
    } catch { /* expected exit */ }

    const archived = fs.readdirSync(fixture.archiveDir);
    assert.ok(String(archived).includes('SPRINT-99_Test_Sprint.md'));
    assert.ok(String(archived).includes('EPIC-099_Test_Epic.md'));
    assert.ok(String(archived).includes('STORY-099-01_Test_Story_1.md'));
    assert.ok(String(archived).includes('STORY-099-02_Test_Story_2.md'));
    // pending-sync should now be empty of these files
    const remaining = fs.readdirSync(fixture.pendingDir);
    assert.ok(!String(remaining).includes('SPRINT-99_Test_Sprint.md'));
    assert.ok(!String(remaining).includes('EPIC-099_Test_Epic.md'));
  });

  test('stamps status+completed_at on archived files', () => {
    const { exitFn } = makeExitSeam();
    const spawnMock = () => ({ status: 0, error: null, stdout: '', stderr: '' });

    try {
      sprintArchiveHandler(
        { sprintId: 'SPRINT-99' },
        {
          sprintFilePath: fixture.sprintFilePath,
          cwd: fixture.cwd,
          stdout: () => {},
          exit: exitFn,
          spawnFn: spawnMock as never,
        },
      );
    } catch { /* expected exit */ }

    const sprintArchived = fs.readFileSync(
      path.join(fixture.archiveDir, 'SPRINT-99_Test_Sprint.md'),
      'utf8',
    );
    assert.ok(String(sprintArchived).includes('status: Completed'));
    assert.ok(String(sprintArchived).includes('completed_at:'));

    const epicArchived = fs.readFileSync(
      path.join(fixture.archiveDir, 'EPIC-099_Test_Epic.md'),
      'utf8',
    );
    assert.ok(String(epicArchived).includes('status: Approved'));

    const storyArchived = fs.readFileSync(
      path.join(fixture.archiveDir, 'STORY-099-01_Test_Story_1.md'),
      'utf8',
    );
    assert.ok(String(storyArchived).includes('status: Done'));
  });

  test('truncates .active sentinel to empty string', () => {
    const { exitFn } = makeExitSeam();
    const spawnMock = () => ({ status: 0, error: null, stdout: '', stderr: '' });
    const activeDir = path.join(fixture.cwd, '.cleargate', 'sprint-runs');
    const activePath = path.join(activeDir, '.active');
    fs.writeFileSync(activePath, 'SPRINT-99');

    try {
      sprintArchiveHandler(
        { sprintId: 'SPRINT-99' },
        {
          sprintFilePath: fixture.sprintFilePath,
          cwd: fixture.cwd,
          stdout: () => {},
          exit: exitFn,
          spawnFn: spawnMock as never,
        },
      );
    } catch { /* expected exit */ }

    const activeContent = fs.readFileSync(activePath, 'utf8');
    assert.strictEqual(activeContent, '');
  });
});

// ─── Scenario 2: Refuses when sprint_status !== 'Completed' ──────────────────

describe('Scenario: archive refuses when sprint not yet Completed', () => {
  let fixture: Fixture;
  beforeEach(() => { fixture = buildFixture({ sprintStatus: 'Active' }); });
  afterEach(() => fixture.cleanup());

  test('exits with non-zero code', () => {
    const { exitFn, getCode } = makeExitSeam();
    const cap = makeCapture();

    try {
      sprintArchiveHandler(
        { sprintId: 'SPRINT-99' },
        {
          sprintFilePath: fixture.sprintFilePath,
          cwd: fixture.cwd,
          stdout: cap.stdout,
          stderr: cap.stderr,
          exit: exitFn,
          spawnFn: () => ({ status: 0, error: null, stdout: '', stderr: '' }) as never,
        },
      );
    } catch { /* expected exit */ }

    expect(getCode()).toBe(1);
  });

  test('stderr contains the diagnostic message', () => {
    const { exitFn } = makeExitSeam();
    const cap = makeCapture();

    try {
      sprintArchiveHandler(
        { sprintId: 'SPRINT-99' },
        {
          sprintFilePath: fixture.sprintFilePath,
          cwd: fixture.cwd,
          stdout: cap.stdout,
          stderr: cap.stderr,
          exit: exitFn,
          spawnFn: () => ({ status: 0, error: null, stdout: '', stderr: '' }) as never,
        },
      );
    } catch { /* expected exit */ }

    const errOut = cap.getErr().join('\n');
    assert.ok(String(errOut).includes('sprint not closed'));
    assert.ok(String(errOut).includes('--assume-ack'));
  });

  test('does not move any files when refused', () => {
    const { exitFn } = makeExitSeam();

    try {
      sprintArchiveHandler(
        { sprintId: 'SPRINT-99' },
        {
          sprintFilePath: fixture.sprintFilePath,
          cwd: fixture.cwd,
          stdout: () => {},
          exit: exitFn,
          spawnFn: () => ({ status: 0, error: null, stdout: '', stderr: '' }) as never,
        },
      );
    } catch { /* expected exit */ }

    const archived = fs.readdirSync(fixture.archiveDir);
    assert.strictEqual((archived).length, 0);
  });
});

// ─── Scenario 3: --dry-run prints plan only, no filesystem changes ────────────

describe('Scenario: --dry-run prints plan only', () => {
  let fixture: Fixture;
  beforeEach(() => { fixture = buildFixture(); });
  afterEach(() => fixture.cleanup());

  test('exits 0', () => {
    const { exitFn, getCode } = makeExitSeam();
    const cap = makeCapture();
    const spawnMock = () => ({ status: 0, error: null, stdout: '', stderr: '' });

    try {
      sprintArchiveHandler(
        { sprintId: 'SPRINT-99', dryRun: true },
        {
          sprintFilePath: fixture.sprintFilePath,
          cwd: fixture.cwd,
          stdout: cap.stdout,
          stderr: cap.stderr,
          exit: exitFn,
          spawnFn: spawnMock as never,
        },
      );
    } catch { /* expected exit */ }

    expect(getCode()).toBe(0);
  });

  test('stdout lists all planned file moves', () => {
    const { exitFn } = makeExitSeam();
    const cap = makeCapture();
    const spawnMock = () => ({ status: 0, error: null, stdout: '', stderr: '' });

    try {
      sprintArchiveHandler(
        { sprintId: 'SPRINT-99', dryRun: true },
        {
          sprintFilePath: fixture.sprintFilePath,
          cwd: fixture.cwd,
          stdout: cap.stdout,
          stderr: cap.stderr,
          exit: exitFn,
          spawnFn: spawnMock as never,
        },
      );
    } catch { /* expected exit */ }

    const outStr = cap.getOut().join('\n');
    assert.ok(String(outStr).includes('[dry-run]'));
    assert.ok(String(outStr).includes('SPRINT-99_Test_Sprint.md'));
    assert.ok(String(outStr).includes('EPIC-099_Test_Epic.md'));
    assert.ok(String(outStr).includes('STORY-099-01_Test_Story_1.md'));
    assert.ok(String(outStr).includes('STORY-099-02_Test_Story_2.md'));
    assert.ok(String(outStr).includes('git checkout main'));
    assert.ok(String(outStr).includes('git merge'));
    assert.ok(String(outStr).includes('git branch -d'));
  });

  test('makes no filesystem changes', () => {
    const { exitFn } = makeExitSeam();
    const spawnMock = () => ({ status: 0, error: null, stdout: '', stderr: '' });
    const pendingBefore = fs.readdirSync(fixture.pendingDir).sort();
    const archiveBefore = fs.readdirSync(fixture.archiveDir).sort();

    try {
      sprintArchiveHandler(
        { sprintId: 'SPRINT-99', dryRun: true },
        {
          sprintFilePath: fixture.sprintFilePath,
          cwd: fixture.cwd,
          stdout: () => {},
          exit: exitFn,
          spawnFn: spawnMock as never,
        },
      );
    } catch { /* expected exit */ }

    expect(fs.readdirSync(fixture.pendingDir).sort()).toEqual(pendingBefore);
    expect(fs.readdirSync(fixture.archiveDir).sort()).toEqual(archiveBefore);
  });

  test('does not invoke spawnFn under --dry-run', () => {
    const { exitFn } = makeExitSeam();
    let spawnCallCount = 0;
    const spawnMock = () => {
      spawnCallCount++;
      return { status: 0, error: null, stdout: '', stderr: '' };
    };

    try {
      sprintArchiveHandler(
        { sprintId: 'SPRINT-99', dryRun: true },
        {
          sprintFilePath: fixture.sprintFilePath,
          cwd: fixture.cwd,
          stdout: () => {},
          exit: exitFn,
          spawnFn: spawnMock as never,
        },
      );
    } catch { /* expected exit */ }

    assert.strictEqual(spawnCallCount, 0);
  });
});

// ─── Scenario 4: v1 inert ─────────────────────────────────────────────────────

describe('Scenario: v1 inert', () => {
  let fixture: Fixture;
  beforeEach(() => { fixture = buildFixture({ executionMode: 'v1' }); });
  afterEach(() => fixture.cleanup());

  test('exits 0 with inert message', () => {
    const { exitFn, getCode } = makeExitSeam();
    const cap = makeCapture();

    try {
      sprintArchiveHandler(
        { sprintId: 'SPRINT-99' },
        {
          sprintFilePath: fixture.sprintFilePath,
          cwd: fixture.cwd,
          stdout: cap.stdout,
          stderr: cap.stderr,
          exit: exitFn,
        },
      );
    } catch { /* expected exit */ }

    expect(getCode()).toBe(0);
    expect(cap.getOut().join(' ')).toContain(V1_INERT_MESSAGE);
  });

  test('makes no filesystem changes under v1', () => {
    const { exitFn } = makeExitSeam();
    let spawnCallCount = 0;
    const spawnMock = () => {
      spawnCallCount++;
      return { status: 0, error: null, stdout: '', stderr: '' };
    };
    const pendingBefore = fs.readdirSync(fixture.pendingDir).sort();

    try {
      sprintArchiveHandler(
        { sprintId: 'SPRINT-99' },
        {
          sprintFilePath: fixture.sprintFilePath,
          cwd: fixture.cwd,
          stdout: () => {},
          exit: exitFn,
          spawnFn: spawnMock as never,
        },
      );
    } catch { /* expected exit */ }

    assert.strictEqual(spawnCallCount, 0);
    expect(fs.readdirSync(fixture.pendingDir).sort()).toEqual(pendingBefore);
  });
});

// ─── Scenario 5: --allow-wiki-lint-debt waives lint failure ──────────────────

describe('Scenario: --allow-wiki-lint-debt waives wiki-lint failure', () => {
  let fixture: Fixture;
  beforeEach(() => { fixture = buildFixture(); });
  afterEach(() => fixture.cleanup());

  test('exits 0, emits waiver message, and still archives sprint file', async () => {
    const { exitFn, getCode } = makeExitSeam();
    const cap = makeCapture();
    const spawnMock = () => ({ status: 0, error: null, stdout: '', stderr: '' });

    // Create wiki dir so wikiInitialised === true
    const wikiRoot = path.join(fixture.cwd, '.cleargate', 'wiki');
    fs.mkdirSync(wikiRoot, { recursive: true });
    fs.writeFileSync(path.join(wikiRoot, 'index.md'), '# Index\n\n(empty)\n');

    try {
      await sprintArchiveHandler(
        { sprintId: 'SPRINT-99', allowWikiLintDebt: true },
        {
          sprintFilePath: fixture.sprintFilePath,
          cwd: fixture.cwd,
          stdout: cap.stdout,
          stderr: cap.stderr,
          exit: exitFn,
          spawnFn: spawnMock as never,
          wikiBuildFn: async () => { /* ok */ },
          wikiLintFn: async () => { throw new Error('broken-backlink: cleargate-protocol.md → §11.4 (target missing)'); },
        },
      );
    } catch { /* expected exit */ }

    expect(getCode()).toBe(0);
    const errOut = cap.getErr().join('\n');
    assert.ok(String(errOut).includes('wiki-lint debt waived via --allow-wiki-lint-debt flag'));
    assert.ok(String(errOut).includes('broken-backlink: cleargate-protocol.md'));
    const archived = fs.readdirSync(fixture.archiveDir);
    assert.ok(String(archived).includes('SPRINT-99_Test_Sprint.md'));
    const sprintArchived = fs.readFileSync(
      path.join(fixture.archiveDir, 'SPRINT-99_Test_Sprint.md'),
      'utf8',
    );
    assert.ok(String(sprintArchived).includes('status: Completed'));
  });
});

// ─── Scenario 6: Without --allow-wiki-lint-debt, lint failure still blocks ────

describe('Scenario: without --allow-wiki-lint-debt, lint failure still blocks', () => {
  let fixture: Fixture;
  beforeEach(() => { fixture = buildFixture(); });
  afterEach(() => fixture.cleanup());

  test('exits 1, reverts frontmatter, does not archive sprint file', async () => {
    const { exitFn, getCode } = makeExitSeam();
    const cap = makeCapture();
    const spawnMock = () => ({ status: 0, error: null, stdout: '', stderr: '' });

    // Create wiki dir so wikiInitialised === true
    const wikiRoot = path.join(fixture.cwd, '.cleargate', 'wiki');
    fs.mkdirSync(wikiRoot, { recursive: true });
    fs.writeFileSync(path.join(wikiRoot, 'index.md'), '# Index\n\n(empty)\n');

    try {
      await sprintArchiveHandler(
        { sprintId: 'SPRINT-99' /* no allowWikiLintDebt */ },
        {
          sprintFilePath: fixture.sprintFilePath,
          cwd: fixture.cwd,
          stdout: cap.stdout,
          stderr: cap.stderr,
          exit: exitFn,
          spawnFn: spawnMock as never,
          wikiBuildFn: async () => { /* ok */ },
          wikiLintFn: async () => { throw new Error('broken-backlink: cleargate-protocol.md → §11.4 (target missing)'); },
        },
      );
    } catch { /* expected exit */ }

    expect(getCode()).toBe(1);
    const errOut = cap.getErr().join('\n');
    assert.ok(String(errOut).includes('post-stamp wiki lint failed — sprint frontmatter reverted'));
    assert.ok(!String(errOut).includes('wiki-lint debt waived'));
    const archived = fs.readdirSync(fixture.archiveDir);
    assert.ok(!String(archived).includes('SPRINT-99_Test_Sprint.md'));
    expect(fs.existsSync(fixture.sprintFilePath)).toBe(true);
  });
});

// ─── Scenario: Orphan mid-sprint story WARN + archive ────────────────────────

describe('Scenario: orphan mid-sprint story — WARN but still archive', () => {
  let fixture: Fixture;
  beforeEach(() => { fixture = buildFixture({ includeOrphan: true }); });
  afterEach(() => fixture.cleanup());

  test('prints WARN to stderr', () => {
    const { exitFn } = makeExitSeam();
    const cap = makeCapture();
    const spawnMock = () => ({ status: 0, error: null, stdout: '', stderr: '' });

    try {
      sprintArchiveHandler(
        { sprintId: 'SPRINT-99' },
        {
          sprintFilePath: fixture.sprintFilePath,
          cwd: fixture.cwd,
          stdout: cap.stdout,
          stderr: cap.stderr,
          exit: exitFn,
          spawnFn: spawnMock as never,
        },
      );
    } catch { /* expected exit */ }

    const errOut = cap.getErr().join('\n');
    assert.ok(String(errOut).includes('WARN'));
    assert.ok(String(errOut).includes('STORY-099-99_Orphan_Story.md'));
  });

  test('archives the orphan file despite the WARN', () => {
    const { exitFn } = makeExitSeam();
    const spawnMock = () => ({ status: 0, error: null, stdout: '', stderr: '' });

    try {
      sprintArchiveHandler(
        { sprintId: 'SPRINT-99' },
        {
          sprintFilePath: fixture.sprintFilePath,
          cwd: fixture.cwd,
          stdout: () => {},
          stderr: () => {},
          exit: exitFn,
          spawnFn: spawnMock as never,
        },
      );
    } catch { /* expected exit */ }

    const archived = fs.readdirSync(fixture.archiveDir);
    assert.ok(String(archived).includes('STORY-099-99_Orphan_Story.md'));
  });
});
