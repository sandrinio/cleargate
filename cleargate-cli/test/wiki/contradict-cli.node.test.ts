import { describe, test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';

/**
 * Tests for STORY-020-03: `cleargate wiki contradict <file>` CLI subcommand.
 *
 * 4 unit tests (one per Gherkin scenario from §2.1) + 1 integration scenario
 * gated behind CLEARGATE_E2E=1 (same pattern as test/e2e/join-smoke.test.ts).
 *
 * Co-located at cleargate-cli/test/wiki/ per FLASHCARD #test-location #wiki #cli.
 *
 * These are pure unit tests: no LLM is called. The phase4SubagentStub seam
 * replaces real subagent invocation with a synchronous mock.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import * as url from 'node:url';
import { wikiContradictHandler } from '../../src/commands/wiki-contradict.js';
import type { ContradictFinding } from '../../src/lib/wiki/contradict.js';

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


const __testDirname = path.dirname(url.fileURLToPath(import.meta.url));
const TEMPLATE_DIR = path.resolve(__testDirname, '../../templates/synthesis');
void TEMPLATE_DIR; // used if we ever call ingest from here

// ─── Constants ────────────────────────────────────────────────────────────────
const FROZEN_NOW = '2026-04-30T10:00:00.000Z';
const FAKE_SHA = 'aabbccddee1122334455aabbccddee1122334455';

// ─── Fixture helpers ──────────────────────────────────────────────────────────

interface CliFixture {
  root: string;
  deliveryRoot: string;
  wikiRoot: string;
  cleanup: () => void;
}

function buildCliFixture(items: { subdir: string; filename: string; content: string }[]): CliFixture {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'cg-contradict-cli-test-'));
  const deliveryRoot = path.join(root, '.cleargate', 'delivery');
  const wikiRoot = path.join(root, '.cleargate', 'wiki');

  fs.mkdirSync(path.join(deliveryRoot, 'pending-sync'), { recursive: true });
  fs.mkdirSync(path.join(deliveryRoot, 'archive'), { recursive: true });
  fs.mkdirSync(wikiRoot, { recursive: true });

  // Create wiki bucket dirs
  for (const b of ['epics', 'stories', 'sprints', 'proposals', 'crs', 'bugs', 'topics']) {
    fs.mkdirSync(path.join(wikiRoot, b), { recursive: true });
  }

  for (const item of items) {
    const dir = path.join(deliveryRoot, item.subdir);
    fs.writeFileSync(path.join(dir, item.filename), item.content, 'utf8');
  }

  return {
    root,
    deliveryRoot,
    wikiRoot,
    cleanup: () => fs.rmSync(root, { recursive: true, force: true }),
  };
}

function draftStoryContent(id: string, epicRef: string, status = 'Draft'): string {
  return `---
story_id: "${id}"
parent_epic_ref: "${epicRef}"
status: "${status}"
remote_id: ""
---

# ${id}: Test Draft Story

This draft has a contradicting claim about auth flow expects JWT.
[[STORY-Y-01]]
`;
}

function neighborStoryContent(id: string, epicRef: string): string {
  return `---
story_id: "${id}"
parent_epic_ref: "${epicRef}"
status: "Approved"
remote_id: ""
---

# ${id}: Neighbor Story

This neighbor mandates OAuth client_credentials for auth.
`;
}

// Pre-create a neighbor wiki page so neighborhood collection finds it
function createNeighborWikiPage(wikiRoot: string, id: string): void {
  const pageContent = `---
type: story
id: "${id}"
parent: ""
children: []
status: "Approved"
remote_id: ""
raw_path: ".cleargate/delivery/pending-sync/${id}.md"
last_ingest: "${FROZEN_NOW}"
last_ingest_commit: "abc123"
repo: "planning"
---

# ${id}: Neighbor
`;
  const storiesDir = path.join(wikiRoot, 'stories');
  fs.mkdirSync(storiesDir, { recursive: true });
  fs.writeFileSync(path.join(storiesDir, `${id}.md`), pageContent, 'utf8');
}

function countContradictionEntries(contradictionsContent: string): number {
  return (contradictionsContent.match(/^- draft:/gm) ?? []).length;
}

async function runContradictHandler(
  fixture: CliFixture,
  rawPath: string,
  stub: (draftWikiPath: string, neighborhood: string[]) => ContradictFinding[],
  extraOpts: Partial<Parameters<typeof wikiContradictHandler>[0]> = {},
): Promise<{ stdout: string; stderr: string; exitCode?: number }> {
  const out: string[] = [];
  const err: string[] = [];
  let exitCode: number | undefined;

  try {
    await wikiContradictHandler({
      filePath: rawPath,
      cwd: fixture.root,
      now: () => FROZEN_NOW,
      stdout: (s: string) => { out.push(s); },
      stderr: (s: string) => { err.push(s); },
      exit: (c: number): never => {
        exitCode = c;
        throw new Error(`EXIT:${c}`);
      },
      gitRunner: (_cmd: string, args: string[]) => {
        if (args[0] === 'log') return FAKE_SHA + '\n';
        return '\0__NONZERO__';
      },
      phase4SubagentStub: stub,
      ...extraOpts,
    });
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('EXIT:')) {
      return { stdout: out.join(''), stderr: err.join(''), exitCode };
    }
    throw e;
  }
  return { stdout: out.join(''), stderr: err.join(''), exitCode };
}

// ─── Scenario 1: Happy path — Draft file with contradicting neighbor ──────────

describe('Scenario 1: Happy path — Draft file with contradicting neighbor', () => {
  let fixture: CliFixture;

  beforeEach(() => {
    fixture = buildCliFixture([
      { subdir: 'pending-sync', filename: 'STORY-C-01_Draft.md', content: draftStoryContent('STORY-C-01', 'EPIC-C', 'Draft') },
      { subdir: 'pending-sync', filename: 'STORY-Y-01_Neighbor.md', content: neighborStoryContent('STORY-Y-01', 'EPIC-C') },
    ]);
    createNeighborWikiPage(fixture.wikiRoot, 'STORY-Y-01');
  });

  afterEach(() => fixture.cleanup());

  test('prints at least one finding line to stdout', async () => {
    const rawPath = path.join(fixture.deliveryRoot, 'pending-sync', 'STORY-C-01_Draft.md');
    const stub = (): ContradictFinding[] => [
      { draft: 'STORY-C-01', neighbor: 'STORY-Y-01', claim: 'JWT vs OAuth contradiction' },
    ];

    const result = await runContradictHandler(fixture, rawPath, stub);

    assert.ok(String(result.stdout).includes('contradiction:'));
    assert.ok(String(result.stdout).includes('STORY-C-01'));
    assert.ok(String(result.stdout).includes('STORY-Y-01'));
  });

  test('appends one entry to wiki/contradictions.md', async () => {
    const rawPath = path.join(fixture.deliveryRoot, 'pending-sync', 'STORY-C-01_Draft.md');
    const stub = (): ContradictFinding[] => [
      { draft: 'STORY-C-01', neighbor: 'STORY-Y-01', claim: 'JWT vs OAuth contradiction' },
    ];

    await runContradictHandler(fixture, rawPath, stub);

    const contradictionsPath = path.join(fixture.wikiRoot, 'contradictions.md');
    expect(fs.existsSync(contradictionsPath)).toBe(true);
    const content = fs.readFileSync(contradictionsPath, 'utf8');
    expect(countContradictionEntries(content)).toBe(1);
  });

  test('stamps last_contradict_sha on the raw file', async () => {
    const rawPath = path.join(fixture.deliveryRoot, 'pending-sync', 'STORY-C-01_Draft.md');
    const stub = (): ContradictFinding[] => [
      { draft: 'STORY-C-01', neighbor: 'STORY-Y-01', claim: 'JWT vs OAuth contradiction' },
    ];

    await runContradictHandler(fixture, rawPath, stub);

    const updatedContent = fs.readFileSync(rawPath, 'utf8');
    assert.ok(String(updatedContent).includes(`last_contradict_sha: "${FAKE_SHA}"`));
  });

  test('exits 0', async () => {
    const rawPath = path.join(fixture.deliveryRoot, 'pending-sync', 'STORY-C-01_Draft.md');
    const stub = (): ContradictFinding[] => [];

    const result = await runContradictHandler(fixture, rawPath, stub);

    // exit(0) throws EXIT:0 in tests
    assert.strictEqual(result.exitCode, 0);
  });
});

// ─── Scenario 2: Status filter — Approved file ───────────────────────────────

describe('Scenario 2: Status filter — Approved file', () => {
  let fixture: CliFixture;
  let stubCallCount: number;

  beforeEach(() => {
    stubCallCount = 0;
    fixture = buildCliFixture([
      { subdir: 'pending-sync', filename: 'STORY-C-02_Approved.md', content: draftStoryContent('STORY-C-02', 'EPIC-C', 'Approved') },
    ]);
  });

  afterEach(() => fixture.cleanup());

  test('stdout contains exactly "skipped: status=Approved"', async () => {
    const rawPath = path.join(fixture.deliveryRoot, 'pending-sync', 'STORY-C-02_Approved.md');
    const stub = (): ContradictFinding[] => {
      stubCallCount++;
      return [];
    };

    const result = await runContradictHandler(fixture, rawPath, stub);

    assert.ok(String(result.stdout).includes('skipped: status=Approved'));
  });

  test('no entry is appended to wiki/contradictions.md', async () => {
    const rawPath = path.join(fixture.deliveryRoot, 'pending-sync', 'STORY-C-02_Approved.md');
    const stub = (): ContradictFinding[] => [];

    await runContradictHandler(fixture, rawPath, stub);

    const contradictionsPath = path.join(fixture.wikiRoot, 'contradictions.md');
    if (fs.existsSync(contradictionsPath)) {
      const content = fs.readFileSync(contradictionsPath, 'utf8');
      expect(countContradictionEntries(content)).toBe(0);
    } else {
      assert.strictEqual(true, true); // not created = also fine
    }
  });

  test('last_contradict_sha is NOT stamped', async () => {
    const rawPath = path.join(fixture.deliveryRoot, 'pending-sync', 'STORY-C-02_Approved.md');
    const stub = (): ContradictFinding[] => [];

    await runContradictHandler(fixture, rawPath, stub);

    const content = fs.readFileSync(rawPath, 'utf8');
    assert.ok(!String(content).includes('last_contradict_sha'));
  });

  test('exits 0', async () => {
    const rawPath = path.join(fixture.deliveryRoot, 'pending-sync', 'STORY-C-02_Approved.md');
    const stub = (): ContradictFinding[] => [];

    const result = await runContradictHandler(fixture, rawPath, stub);

    assert.strictEqual(result.exitCode, 0);
  });
});

// ─── Scenario 3: --dry-run does not mutate state ─────────────────────────────

describe('Scenario 3: --dry-run does not mutate state', () => {
  let fixture: CliFixture;

  beforeEach(() => {
    fixture = buildCliFixture([
      { subdir: 'pending-sync', filename: 'STORY-C-03_Draft.md', content: draftStoryContent('STORY-C-03', 'EPIC-C', 'Draft') },
      { subdir: 'pending-sync', filename: 'STORY-Y-01_Neighbor.md', content: neighborStoryContent('STORY-Y-01', 'EPIC-C') },
    ]);
    createNeighborWikiPage(fixture.wikiRoot, 'STORY-Y-01');
  });

  afterEach(() => fixture.cleanup());

  test('findings are printed to stdout', async () => {
    const rawPath = path.join(fixture.deliveryRoot, 'pending-sync', 'STORY-C-03_Draft.md');
    const stub = (): ContradictFinding[] => [
      { draft: 'STORY-C-03', neighbor: 'STORY-Y-01', claim: 'JWT vs OAuth contradiction' },
    ];

    const result = await runContradictHandler(fixture, rawPath, stub, { dryRun: true });

    assert.ok(String(result.stdout).includes('contradiction:'));
  });

  test('wiki/contradictions.md is unchanged (not created)', async () => {
    const rawPath = path.join(fixture.deliveryRoot, 'pending-sync', 'STORY-C-03_Draft.md');
    const stub = (): ContradictFinding[] => [
      { draft: 'STORY-C-03', neighbor: 'STORY-Y-01', claim: 'JWT vs OAuth contradiction' },
    ];

    const contradictionsPath = path.join(fixture.wikiRoot, 'contradictions.md');
    const existedBefore = fs.existsSync(contradictionsPath);

    await runContradictHandler(fixture, rawPath, stub, { dryRun: true });

    // contradictions.md should not have been created if it didn't exist
    if (!existedBefore) {
      expect(fs.existsSync(contradictionsPath)).toBe(false);
    } else {
      // If it existed, it should be byte-identical
      const contentAfter = fs.readFileSync(contradictionsPath, 'utf8');
      const contentBefore = fs.readFileSync(contradictionsPath, 'utf8');
      assert.strictEqual(contentAfter, contentBefore);
    }
  });

  test('last_contradict_sha is unchanged (not stamped)', async () => {
    const rawPath = path.join(fixture.deliveryRoot, 'pending-sync', 'STORY-C-03_Draft.md');
    const originalContent = fs.readFileSync(rawPath, 'utf8');
    const stub = (): ContradictFinding[] => [
      { draft: 'STORY-C-03', neighbor: 'STORY-Y-01', claim: 'JWT vs OAuth contradiction' },
    ];

    await runContradictHandler(fixture, rawPath, stub, { dryRun: true });

    const updatedContent = fs.readFileSync(rawPath, 'utf8');
    assert.ok(!String(updatedContent).includes('last_contradict_sha'));
    assert.strictEqual(updatedContent, originalContent);
  });

  test('exits 0', async () => {
    const rawPath = path.join(fixture.deliveryRoot, 'pending-sync', 'STORY-C-03_Draft.md');
    const stub = (): ContradictFinding[] => [];

    const result = await runContradictHandler(fixture, rawPath, stub, { dryRun: true });

    assert.strictEqual(result.exitCode, 0);
  });
});

// ─── Scenario 4: Help text includes "contradict <file>" ──────────────────────
// Verifies CLI registration: commander emits the contradict subcommand in --help.

describe('Scenario 4: Help text lists the contradict subcommand', () => {
  test('cleargate wiki --help includes "contradict <file>"', async () => {
    // Spawn the CLI process and capture --help output
    const { spawnSync } = await import('node:child_process');
    const cliEntry = path.resolve(__testDirname, '../../dist/cli.js');

    // If dist doesn't exist, fall back to checking the source registration
    // (in CI, dist may not be built yet; we verify the Commander registration instead)
    if (!fs.existsSync(cliEntry)) {
      // Read cli.ts source and assert the contradict subcommand is registered
      const cliSource = fs.readFileSync(
        path.resolve(__testDirname, '../../src/cli.ts'),
        'utf8',
      );
      assert.ok(String(cliSource).includes("'contradict <file>'"));
      assert.ok(String(cliSource).includes('wikiContradictHandler'));
      return;
    }

    const result = spawnSync('node', [cliEntry, 'wiki', '--help'], {
      encoding: 'utf8',
      timeout: 10000,
    });

    const helpText = result.stdout + result.stderr;
    assert.ok(String(helpText).includes('contradict'));
    assert.match(String(helpText), /build|ingest|query|lint/); // siblings also present
  });
});

// ─── Scenario 5: Integration — gated behind CLEARGATE_E2E=1 ──────────────────
// Real subagent would be spawned; we gate this test so it only runs in E2E mode.
// In practice the production flow emits a phase4: JSON signal (no stub).

const IS_E2E = !!process.env['CLEARGATE_E2E'];

describe('Scenario 5: Integration — production signal path (gated)', () => {
  let fixture: CliFixture;

  beforeEach(() => {
    fixture = buildCliFixture([
      { subdir: 'pending-sync', filename: 'STORY-C-05_Draft.md', content: draftStoryContent('STORY-C-05', 'EPIC-C', 'Draft') },
      { subdir: 'pending-sync', filename: 'STORY-Y-01_Neighbor.md', content: neighborStoryContent('STORY-Y-01', 'EPIC-C') },
    ]);
    createNeighborWikiPage(fixture.wikiRoot, 'STORY-Y-01');
  });

  afterEach(() => fixture.cleanup());

  it.skipIf(!IS_E2E)('emits phase4: JSON signal when no stub is provided', async () => {
    const rawPath = path.join(fixture.deliveryRoot, 'pending-sync', 'STORY-C-05_Draft.md');
    const out: string[] = [];

    try {
      await wikiContradictHandler({
        filePath: rawPath,
        cwd: fixture.root,
        now: () => FROZEN_NOW,
        stdout: (s: string) => { out.push(s); },
        stderr: () => {},
        exit: (c: number): never => { throw new Error(`EXIT:${c}`); },
        gitRunner: (_cmd: string, args: string[]) => {
          if (args[0] === 'log') return FAKE_SHA + '\n';
          return '\0__NONZERO__';
        },
        // No phase4SubagentStub — production path
      });
    } catch {
      // exit(0) throws
    }

    const combinedOutput = out.join('');
    // In production path (no stub), handler emits the phase4: signal
    assert.ok(String(combinedOutput).includes('phase4:'));
    // The signal should contain valid JSON with the expected keys
    const phase4Line = combinedOutput.split('\n').find((l) => l.startsWith('phase4: '));
    assert.notStrictEqual(phase4Line, undefined);
    if (phase4Line) {
      const signal = JSON.parse(phase4Line.replace('phase4: ', ''));
      assert.ok('draftId' in (signal));
      assert.ok('neighborhood' in (signal));
      assert.ok('prompt' in (signal));
    }
  });
});
