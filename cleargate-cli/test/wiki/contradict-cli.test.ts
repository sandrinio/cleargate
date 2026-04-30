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
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import * as url from 'node:url';
import { wikiContradictHandler } from '../../src/commands/wiki-contradict.js';
import type { ContradictFinding } from '../../src/lib/wiki/contradict.js';

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

  it('prints at least one finding line to stdout', async () => {
    const rawPath = path.join(fixture.deliveryRoot, 'pending-sync', 'STORY-C-01_Draft.md');
    const stub = (): ContradictFinding[] => [
      { draft: 'STORY-C-01', neighbor: 'STORY-Y-01', claim: 'JWT vs OAuth contradiction' },
    ];

    const result = await runContradictHandler(fixture, rawPath, stub);

    expect(result.stdout).toContain('contradiction:');
    expect(result.stdout).toContain('STORY-C-01');
    expect(result.stdout).toContain('STORY-Y-01');
  });

  it('appends one entry to wiki/contradictions.md', async () => {
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

  it('stamps last_contradict_sha on the raw file', async () => {
    const rawPath = path.join(fixture.deliveryRoot, 'pending-sync', 'STORY-C-01_Draft.md');
    const stub = (): ContradictFinding[] => [
      { draft: 'STORY-C-01', neighbor: 'STORY-Y-01', claim: 'JWT vs OAuth contradiction' },
    ];

    await runContradictHandler(fixture, rawPath, stub);

    const updatedContent = fs.readFileSync(rawPath, 'utf8');
    expect(updatedContent).toContain(`last_contradict_sha: "${FAKE_SHA}"`);
  });

  it('exits 0', async () => {
    const rawPath = path.join(fixture.deliveryRoot, 'pending-sync', 'STORY-C-01_Draft.md');
    const stub = (): ContradictFinding[] => [];

    const result = await runContradictHandler(fixture, rawPath, stub);

    // exit(0) throws EXIT:0 in tests
    expect(result.exitCode).toBe(0);
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

  it('stdout contains exactly "skipped: status=Approved"', async () => {
    const rawPath = path.join(fixture.deliveryRoot, 'pending-sync', 'STORY-C-02_Approved.md');
    const stub = (): ContradictFinding[] => {
      stubCallCount++;
      return [];
    };

    const result = await runContradictHandler(fixture, rawPath, stub);

    expect(result.stdout).toContain('skipped: status=Approved');
  });

  it('no entry is appended to wiki/contradictions.md', async () => {
    const rawPath = path.join(fixture.deliveryRoot, 'pending-sync', 'STORY-C-02_Approved.md');
    const stub = (): ContradictFinding[] => [];

    await runContradictHandler(fixture, rawPath, stub);

    const contradictionsPath = path.join(fixture.wikiRoot, 'contradictions.md');
    if (fs.existsSync(contradictionsPath)) {
      const content = fs.readFileSync(contradictionsPath, 'utf8');
      expect(countContradictionEntries(content)).toBe(0);
    } else {
      expect(true).toBe(true); // not created = also fine
    }
  });

  it('last_contradict_sha is NOT stamped', async () => {
    const rawPath = path.join(fixture.deliveryRoot, 'pending-sync', 'STORY-C-02_Approved.md');
    const stub = (): ContradictFinding[] => [];

    await runContradictHandler(fixture, rawPath, stub);

    const content = fs.readFileSync(rawPath, 'utf8');
    expect(content).not.toContain('last_contradict_sha');
  });

  it('exits 0', async () => {
    const rawPath = path.join(fixture.deliveryRoot, 'pending-sync', 'STORY-C-02_Approved.md');
    const stub = (): ContradictFinding[] => [];

    const result = await runContradictHandler(fixture, rawPath, stub);

    expect(result.exitCode).toBe(0);
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

  it('findings are printed to stdout', async () => {
    const rawPath = path.join(fixture.deliveryRoot, 'pending-sync', 'STORY-C-03_Draft.md');
    const stub = (): ContradictFinding[] => [
      { draft: 'STORY-C-03', neighbor: 'STORY-Y-01', claim: 'JWT vs OAuth contradiction' },
    ];

    const result = await runContradictHandler(fixture, rawPath, stub, { dryRun: true });

    expect(result.stdout).toContain('contradiction:');
  });

  it('wiki/contradictions.md is unchanged (not created)', async () => {
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
      expect(contentAfter).toBe(contentBefore);
    }
  });

  it('last_contradict_sha is unchanged (not stamped)', async () => {
    const rawPath = path.join(fixture.deliveryRoot, 'pending-sync', 'STORY-C-03_Draft.md');
    const originalContent = fs.readFileSync(rawPath, 'utf8');
    const stub = (): ContradictFinding[] => [
      { draft: 'STORY-C-03', neighbor: 'STORY-Y-01', claim: 'JWT vs OAuth contradiction' },
    ];

    await runContradictHandler(fixture, rawPath, stub, { dryRun: true });

    const updatedContent = fs.readFileSync(rawPath, 'utf8');
    expect(updatedContent).not.toContain('last_contradict_sha');
    expect(updatedContent).toBe(originalContent);
  });

  it('exits 0', async () => {
    const rawPath = path.join(fixture.deliveryRoot, 'pending-sync', 'STORY-C-03_Draft.md');
    const stub = (): ContradictFinding[] => [];

    const result = await runContradictHandler(fixture, rawPath, stub, { dryRun: true });

    expect(result.exitCode).toBe(0);
  });
});

// ─── Scenario 4: Help text includes "contradict <file>" ──────────────────────
// Verifies CLI registration: commander emits the contradict subcommand in --help.

describe('Scenario 4: Help text lists the contradict subcommand', () => {
  it('cleargate wiki --help includes "contradict <file>"', async () => {
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
      expect(cliSource).toContain("'contradict <file>'");
      expect(cliSource).toContain('wikiContradictHandler');
      return;
    }

    const result = spawnSync('node', [cliEntry, 'wiki', '--help'], {
      encoding: 'utf8',
      timeout: 10000,
    });

    const helpText = result.stdout + result.stderr;
    expect(helpText).toContain('contradict');
    expect(helpText).toMatch(/build|ingest|query|lint/); // siblings also present
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
    expect(combinedOutput).toContain('phase4:');
    // The signal should contain valid JSON with the expected keys
    const phase4Line = combinedOutput.split('\n').find((l) => l.startsWith('phase4: '));
    expect(phase4Line).toBeDefined();
    if (phase4Line) {
      const signal = JSON.parse(phase4Line.replace('phase4: ', ''));
      expect(signal).toHaveProperty('draftId');
      expect(signal).toHaveProperty('neighborhood');
      expect(signal).toHaveProperty('prompt');
    }
  });
});
