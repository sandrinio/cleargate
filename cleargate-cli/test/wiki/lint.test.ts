/**
 * Tests for STORY-002-08: cleargate wiki lint
 * Vitest, real-fs fixtures under os.tmpdir(). No fs mocks.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { wikiLintHandler } from '../../src/commands/wiki-lint.js';
import type { WikiLintOptions } from '../../src/commands/wiki-lint.js';

// ─── Fixture helpers ──────────────────────────────────────────────────────────

interface LintFixture {
  root: string;
  wikiRoot: string;
  cleanup: () => void;
}

function buildLintFixture(): LintFixture {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'cg-lint-test-'));
  const wikiRoot = path.join(root, '.cleargate', 'wiki');
  for (const bucket of ['epics', 'stories', 'sprints', 'proposals', 'crs', 'bugs', 'topics']) {
    fs.mkdirSync(path.join(wikiRoot, bucket), { recursive: true });
  }
  // Also create delivery dir for orphan tests
  fs.mkdirSync(path.join(root, '.cleargate', 'delivery', 'pending-sync'), { recursive: true });

  return {
    root,
    wikiRoot,
    cleanup: () => fs.rmSync(root, { recursive: true, force: true }),
  };
}

/** Build a valid wiki page content string (all 9 fields) */
function wikiPageContent(opts: {
  type?: string;
  id: string;
  parent?: string;
  children?: string[];
  status?: string;
  remote_id?: string;
  raw_path: string;
  last_ingest?: string;
  last_ingest_commit?: string;
  repo?: string;
  body?: string;
}): string {
  const {
    type = 'story',
    id,
    parent = '',
    children = [],
    status = '🟢',
    remote_id = '',
    raw_path,
    last_ingest = '2026-04-19T12:00:00.000Z',
    last_ingest_commit = '',
    repo = 'planning',
    body = `# ${id}: Test Page\n\nA test page.\n`,
  } = opts;

  const childrenYaml =
    children.length === 0 ? '[]' : `[${children.map((c) => `"${c}"`).join(', ')}]`;

  return [
    '---',
    `type: ${type}`,
    `id: "${id}"`,
    `parent: "${parent}"`,
    `children: ${childrenYaml}`,
    `status: "${status}"`,
    `remote_id: "${remote_id}"`,
    `raw_path: "${raw_path}"`,
    `last_ingest: "${last_ingest}"`,
    `last_ingest_commit: "${last_ingest_commit}"`,
    `repo: "${repo}"`,
    '---',
    '',
    body,
  ].join('\n');
}

/** Write a raw delivery file */
function writeRawFile(fixture: LintFixture, relativePath: string, content = 'raw content'): string {
  const abs = path.join(fixture.root, relativePath);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, content, 'utf8');
  return abs;
}

/** Write a wiki page file */
function writeWikiPage(
  fixture: LintFixture,
  bucket: string,
  id: string,
  content: string,
): string {
  const abs = path.join(fixture.wikiRoot, bucket, `${id}.md`);
  fs.writeFileSync(abs, content, 'utf8');
  return abs;
}

/** Run lintHandler and capture results */
async function runLint(fixture: LintFixture, overrides: Partial<WikiLintOptions> = {}) {
  const out: string[] = [];
  const err: string[] = [];
  let exitCode: number | undefined;

  const opts: WikiLintOptions = {
    cwd: fixture.root,
    stdout: (s) => { out.push(s); },
    stderr: (s) => { err.push(s); },
    exit: (c): never => {
      exitCode = c;
      throw new Error(`EXIT:${c}`);
    },
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

// ─── Scenario 1: All-clean wiki exits 0 ──────────────────────────────────────

describe('Scenario 1: All-clean wiki: exit 0, lint: OK', () => {
  let fixture: LintFixture;

  beforeEach(() => {
    fixture = buildLintFixture();

    // Write 3 epics + 5 stories, all consistent
    for (let i = 1; i <= 3; i++) {
      const id = `EPIC-00${i}`;
      const rawPath = `.cleargate/delivery/pending-sync/${id}_Test.md`;
      writeRawFile(fixture, rawPath);
      writeWikiPage(
        fixture,
        'epics',
        id,
        wikiPageContent({ type: 'epic', id, raw_path: rawPath }),
      );
    }
    for (let i = 1; i <= 5; i++) {
      const id = `STORY-001-0${i}`;
      const rawPath = `.cleargate/delivery/pending-sync/${id}_Test.md`;
      writeRawFile(fixture, rawPath);
      writeWikiPage(
        fixture,
        'stories',
        id,
        wikiPageContent({ type: 'story', id, raw_path: rawPath }),
      );
    }
  });

  afterEach(() => fixture.cleanup());

  it('exits 0', async () => {
    const result = await runLint(fixture);
    expect(result.exitCode).toBe(0);
  });

  it('stdout contains lint: OK', async () => {
    const result = await runLint(fixture);
    expect(result.stdout).toContain('lint: OK');
  });

  it('stdout contains "(8 pages checked, 0 findings)"', async () => {
    const result = await runLint(fixture);
    expect(result.stdout).toContain('8 pages checked, 0 findings');
  });
});

// ─── Scenario 2: Orphan detected ─────────────────────────────────────────────

describe('Scenario 2: Orphan detected', () => {
  let fixture: LintFixture;

  beforeEach(() => {
    fixture = buildLintFixture();
    // Write wiki page whose raw_path doesn't exist on disk
    writeWikiPage(
      fixture,
      'epics',
      'EPIC-FOO',
      wikiPageContent({
        type: 'epic',
        id: 'EPIC-FOO',
        raw_path: '.cleargate/delivery/pending-sync/EPIC-FOO.md',
      }),
    );
  });

  afterEach(() => fixture.cleanup());

  it('exits 1 in enforce mode', async () => {
    const result = await runLint(fixture);
    expect(result.exitCode).toBe(1);
  });

  it('stdout contains orphan: category string', async () => {
    const result = await runLint(fixture);
    expect(result.stdout).toContain('orphan:');
  });

  it('stdout contains the raw_path in the finding', async () => {
    const result = await runLint(fixture);
    expect(result.stdout).toContain('.cleargate/delivery/pending-sync/EPIC-FOO.md');
  });

  it('stdout contains "lint: FAIL"', async () => {
    const result = await runLint(fixture);
    expect(result.stdout).toContain('lint: FAIL');
  });
});

// ─── Scenario 3: Repo-mismatch ───────────────────────────────────────────────

describe('Scenario 3: Repo-mismatch detected', () => {
  let fixture: LintFixture;

  beforeEach(() => {
    fixture = buildLintFixture();
    // raw_path starts with .cleargate/ → should be repo: planning, but we say repo: cli
    const rawPath = '.cleargate/delivery/pending-sync/STORY-002-01_Test.md';
    writeRawFile(fixture, rawPath);
    writeWikiPage(
      fixture,
      'stories',
      'STORY-002-01',
      wikiPageContent({
        type: 'story',
        id: 'STORY-002-01',
        raw_path: rawPath,
        repo: 'cli', // wrong — should be 'planning'
      }),
    );
  });

  afterEach(() => fixture.cleanup());

  it('exits 1 in enforce mode', async () => {
    const result = await runLint(fixture);
    expect(result.exitCode).toBe(1);
  });

  it('stdout contains repo-mismatch: category string', async () => {
    const result = await runLint(fixture);
    expect(result.stdout).toContain('repo-mismatch:');
  });

  it('stdout mentions both stored and derived repo values', async () => {
    const result = await runLint(fixture);
    expect(result.stdout).toContain('repo:cli');
    expect(result.stdout).toContain('repo:planning');
  });
});

// ─── Scenario 4: Stale-commit ─────────────────────────────────────────────────

describe('Scenario 4: Stale-commit detected', () => {
  let fixture: LintFixture;
  const STORED_SHA = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
  const CURRENT_SHA = 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';

  beforeEach(() => {
    fixture = buildLintFixture();
    const rawPath = '.cleargate/delivery/pending-sync/EPIC-001_Test.md';
    writeRawFile(fixture, rawPath);
    writeWikiPage(
      fixture,
      'epics',
      'EPIC-001',
      wikiPageContent({
        type: 'epic',
        id: 'EPIC-001',
        raw_path: rawPath,
        last_ingest_commit: STORED_SHA,
      }),
    );
  });

  afterEach(() => fixture.cleanup());

  it('exits 1 when runner returns different SHA', async () => {
    const result = await runLint(fixture, {
      gitRunner: (_cmd, _args) => CURRENT_SHA + '\n',
    });
    expect(result.exitCode).toBe(1);
  });

  it('stdout contains stale-commit: category string', async () => {
    const result = await runLint(fixture, {
      gitRunner: (_cmd, _args) => CURRENT_SHA + '\n',
    });
    expect(result.stdout).toContain('stale-commit:');
  });

  it('stdout mentions stored SHA', async () => {
    const result = await runLint(fixture, {
      gitRunner: (_cmd, _args) => CURRENT_SHA + '\n',
    });
    expect(result.stdout).toContain(STORED_SHA);
  });

  it('exits 0 when runner returns same SHA (no stale commit)', async () => {
    const result = await runLint(fixture, {
      gitRunner: (_cmd, _args) => STORED_SHA + '\n',
    });
    expect(result.exitCode).toBe(0);
  });
});

// ─── Scenario 5: Missing-ingest ───────────────────────────────────────────────

describe('Scenario 5: Missing-ingest detected via mtime', () => {
  let fixture: LintFixture;

  beforeEach(() => {
    fixture = buildLintFixture();
    const rawPath = '.cleargate/delivery/pending-sync/EPIC-002_Test.md';
    const rawAbs = writeRawFile(fixture, rawPath);

    writeWikiPage(
      fixture,
      'epics',
      'EPIC-002',
      wikiPageContent({
        type: 'epic',
        id: 'EPIC-002',
        raw_path: rawPath,
      }),
    );

    // Set raw file mtime to be 5 seconds in the future relative to the wiki page
    const wikiPageAbs = path.join(fixture.wikiRoot, 'epics', 'EPIC-002.md');
    const pageStat = fs.statSync(wikiPageAbs);
    const futureTime = new Date(pageStat.mtimeMs + 5000);
    fs.utimesSync(rawAbs, futureTime, futureTime);
  });

  afterEach(() => fixture.cleanup());

  it('exits 1 in enforce mode', async () => {
    const result = await runLint(fixture);
    expect(result.exitCode).toBe(1);
  });

  it('stdout contains missing-ingest: category string', async () => {
    const result = await runLint(fixture);
    expect(result.stdout).toContain('missing-ingest:');
  });
});

// ─── Scenario 6: Broken-backlink ─────────────────────────────────────────────

describe('Scenario 6: Broken-backlink detected', () => {
  let fixture: LintFixture;

  beforeEach(() => {
    fixture = buildLintFixture();

    // Epic declares no children, but story declares it as parent
    const epicRawPath = '.cleargate/delivery/pending-sync/EPIC-010_Test.md';
    const storyRawPath = '.cleargate/delivery/pending-sync/STORY-010-01_Test.md';
    writeRawFile(fixture, epicRawPath);
    writeRawFile(fixture, storyRawPath);

    writeWikiPage(
      fixture,
      'epics',
      'EPIC-010',
      wikiPageContent({
        type: 'epic',
        id: 'EPIC-010',
        raw_path: epicRawPath,
        children: [], // INTENTIONALLY EMPTY — story not listed as child
      }),
    );

    writeWikiPage(
      fixture,
      'stories',
      'STORY-010-01',
      wikiPageContent({
        type: 'story',
        id: 'STORY-010-01',
        raw_path: storyRawPath,
        parent: '[[EPIC-010]]', // declares parent
      }),
    );
  });

  afterEach(() => fixture.cleanup());

  it('exits 1 in enforce mode', async () => {
    const result = await runLint(fixture);
    expect(result.exitCode).toBe(1);
  });

  it('stdout contains broken-backlink: category string', async () => {
    const result = await runLint(fixture);
    expect(result.stdout).toContain('broken-backlink:');
  });

  it('stdout mentions the child page', async () => {
    const result = await runLint(fixture);
    expect(result.stdout).toContain('STORY-010-01');
  });
});

// ─── Scenario 7: Invalidated-citation ────────────────────────────────────────

describe('Scenario 7: Invalidated-citation detected', () => {
  let fixture: LintFixture;

  beforeEach(() => {
    fixture = buildLintFixture();

    // Cancelled story
    const storyRawPath = '.cleargate/delivery/pending-sync/STORY-099-01_Test.md';
    writeRawFile(fixture, storyRawPath);
    writeWikiPage(
      fixture,
      'stories',
      'STORY-099-01',
      wikiPageContent({
        type: 'story',
        id: 'STORY-099-01',
        raw_path: storyRawPath,
        status: 'cancelled',
      }),
    );

    // Topic page that cites the cancelled story
    const topicContent = [
      '---',
      'type: topic',
      'id: "stripe"',
      'created_by: "cleargate-wiki-query"',
      'created_at: "2026-04-19T12:00:00.000Z"',
      'cites: ["[[STORY-099-01]]"]',
      '---',
      '',
      'Topic about stripe. References [[STORY-099-01]].',
      '',
    ].join('\n');
    fs.writeFileSync(path.join(fixture.wikiRoot, 'topics', 'stripe.md'), topicContent, 'utf8');
  });

  afterEach(() => fixture.cleanup());

  it('exits 1 in enforce mode', async () => {
    const result = await runLint(fixture);
    expect(result.exitCode).toBe(1);
  });

  it('stdout contains invalidated-citation: category string', async () => {
    const result = await runLint(fixture);
    expect(result.stdout).toContain('invalidated-citation:');
  });
});

// ─── Scenario 8: Excluded-path-ingested ──────────────────────────────────────

describe('Scenario 8: Excluded-path-ingested detected', () => {
  let fixture: LintFixture;

  beforeEach(() => {
    fixture = buildLintFixture();

    // Wiki page with raw_path under .cleargate/templates/
    writeWikiPage(
      fixture,
      'epics',
      'EPIC-TEMPLATE',
      wikiPageContent({
        type: 'epic',
        id: 'EPIC-TEMPLATE',
        raw_path: '.cleargate/templates/foo.md', // excluded path
      }),
    );
  });

  afterEach(() => fixture.cleanup());

  it('exits 1 in enforce mode', async () => {
    const result = await runLint(fixture);
    expect(result.exitCode).toBe(1);
  });

  it('stdout contains excluded-path-ingested: category string', async () => {
    const result = await runLint(fixture);
    expect(result.stdout).toContain('excluded-path-ingested:');
  });
});

// ─── Scenario 9: Suggest mode — always exits 0, flags prefixed [advisory] ────

describe('Scenario 9: Suggest mode', () => {
  let fixture: LintFixture;

  beforeEach(() => {
    fixture = buildLintFixture();
    // Add an orphan so there's a finding
    writeWikiPage(
      fixture,
      'epics',
      'EPIC-ORPHAN',
      wikiPageContent({
        type: 'epic',
        id: 'EPIC-ORPHAN',
        raw_path: '.cleargate/delivery/pending-sync/EPIC-ORPHAN.md', // doesn't exist
      }),
    );
  });

  afterEach(() => fixture.cleanup());

  it('exits 0 even with findings', async () => {
    const result = await runLint(fixture, { mode: 'suggest' });
    expect(result.exitCode).toBe(0);
  });

  it('flags are prefixed with [advisory]', async () => {
    const result = await runLint(fixture, { mode: 'suggest' });
    expect(result.stdout).toContain('[advisory]');
    expect(result.stdout).toContain('[advisory] orphan:');
  });

  it('summary still shows OK in suggest mode', async () => {
    const result = await runLint(fixture, { mode: 'suggest' });
    expect(result.stdout).toContain('lint: OK');
  });
});

// ─── Scenario 10: Literal-substring contract test (subagent ↔ CLI contract) ──

describe('Scenario 10: Literal-substring contract test — all 8 category strings', () => {
  let fixture: LintFixture;
  const STORED_SHA = 'aaaa0000aaaa0000aaaa0000aaaa0000aaaa0000';
  const CURRENT_SHA = 'bbbb1111bbbb1111bbbb1111bbbb1111bbbb1111';

  beforeEach(() => {
    fixture = buildLintFixture();

    // orphan: page with missing raw_path
    writeWikiPage(
      fixture,
      'epics',
      'EPIC-ORPHAN',
      wikiPageContent({
        type: 'epic',
        id: 'EPIC-ORPHAN',
        raw_path: '.cleargate/delivery/pending-sync/EPIC-MISSING.md',
      }),
    );

    // repo-mismatch: wrong repo tag
    const rmRawPath = '.cleargate/delivery/pending-sync/STORY-RM-01_Test.md';
    writeRawFile(fixture, rmRawPath);
    writeWikiPage(
      fixture,
      'stories',
      'STORY-RM-01',
      wikiPageContent({
        type: 'story',
        id: 'STORY-RM-01',
        raw_path: rmRawPath,
        repo: 'mcp', // wrong — should be 'planning'
      }),
    );

    // stale-commit: stored SHA differs
    const scRawPath = '.cleargate/delivery/pending-sync/EPIC-SC_Test.md';
    writeRawFile(fixture, scRawPath);
    writeWikiPage(
      fixture,
      'epics',
      'EPIC-SC',
      wikiPageContent({
        type: 'epic',
        id: 'EPIC-SC',
        raw_path: scRawPath,
        last_ingest_commit: STORED_SHA,
      }),
    );

    // missing-ingest: raw file newer than wiki page (by 5s)
    const miRawPath = '.cleargate/delivery/pending-sync/EPIC-MI_Test.md';
    const miRawAbs = writeRawFile(fixture, miRawPath);
    writeWikiPage(
      fixture,
      'epics',
      'EPIC-MI',
      wikiPageContent({
        type: 'epic',
        id: 'EPIC-MI',
        raw_path: miRawPath,
      }),
    );
    const wikiMiAbs = path.join(fixture.wikiRoot, 'epics', 'EPIC-MI.md');
    const pageStat = fs.statSync(wikiMiAbs);
    const futureTime = new Date(pageStat.mtimeMs + 5000);
    fs.utimesSync(miRawAbs, futureTime, futureTime);

    // broken-backlink: story declares parent but parent doesn't list it
    const bbEpicRaw = '.cleargate/delivery/pending-sync/EPIC-BB_Test.md';
    const bbStoryRaw = '.cleargate/delivery/pending-sync/STORY-BB-01_Test.md';
    writeRawFile(fixture, bbEpicRaw);
    writeRawFile(fixture, bbStoryRaw);
    writeWikiPage(
      fixture,
      'epics',
      'EPIC-BB',
      wikiPageContent({ type: 'epic', id: 'EPIC-BB', raw_path: bbEpicRaw, children: [] }),
    );
    writeWikiPage(
      fixture,
      'stories',
      'STORY-BB-01',
      wikiPageContent({
        type: 'story',
        id: 'STORY-BB-01',
        raw_path: bbStoryRaw,
        parent: '[[EPIC-BB]]',
      }),
    );

    // invalidated-citation: topic cites cancelled story
    const cancelledRaw = '.cleargate/delivery/pending-sync/STORY-CAN-01_Test.md';
    writeRawFile(fixture, cancelledRaw);
    writeWikiPage(
      fixture,
      'stories',
      'STORY-CAN-01',
      wikiPageContent({
        type: 'story',
        id: 'STORY-CAN-01',
        raw_path: cancelledRaw,
        status: 'cancelled',
      }),
    );
    const topicContent = [
      '---',
      'type: topic',
      'id: "inv-cite-topic"',
      'created_by: "cleargate-wiki-query"',
      'created_at: "2026-04-19T12:00:00.000Z"',
      'cites: ["[[STORY-CAN-01]]"]',
      '---',
      '',
      'References [[STORY-CAN-01]].',
      '',
    ].join('\n');
    fs.writeFileSync(path.join(fixture.wikiRoot, 'topics', 'inv-cite-topic.md'), topicContent, 'utf8');

    // excluded-path-ingested: wiki page for excluded raw_path
    writeWikiPage(
      fixture,
      'epics',
      'EPIC-EXCL',
      wikiPageContent({
        type: 'epic',
        id: 'EPIC-EXCL',
        raw_path: '.cleargate/sprint-runs/SPRINT-03/REPORT.md',
      }),
    );

    // pagination-needed: 51 pages in stories bucket
    for (let i = 1; i <= 51; i++) {
      const pid = `STORY-PG-${String(i).padStart(2, '0')}`;
      const pRaw = `.cleargate/delivery/pending-sync/${pid}_Test.md`;
      writeRawFile(fixture, pRaw);
      writeWikiPage(
        fixture,
        'stories',
        pid,
        wikiPageContent({ type: 'story', id: pid, raw_path: pRaw }),
      );
    }
  });

  afterEach(() => fixture.cleanup());

  it('stdout contains literal "orphan:" string', async () => {
    const result = await runLint(fixture, {
      gitRunner: () => CURRENT_SHA + '\n',
    });
    expect(result.stdout).toContain('orphan:');
  });

  it('stdout contains literal "repo-mismatch:" string', async () => {
    const result = await runLint(fixture, {
      gitRunner: () => CURRENT_SHA + '\n',
    });
    expect(result.stdout).toContain('repo-mismatch:');
  });

  it('stdout contains literal "stale-commit:" string', async () => {
    const result = await runLint(fixture, {
      gitRunner: () => CURRENT_SHA + '\n',
    });
    expect(result.stdout).toContain('stale-commit:');
  });

  it('stdout contains literal "missing-ingest:" string', async () => {
    const result = await runLint(fixture, {
      gitRunner: () => CURRENT_SHA + '\n',
    });
    expect(result.stdout).toContain('missing-ingest:');
  });

  it('stdout contains literal "broken-backlink:" string', async () => {
    const result = await runLint(fixture, {
      gitRunner: () => CURRENT_SHA + '\n',
    });
    expect(result.stdout).toContain('broken-backlink:');
  });

  it('stdout contains literal "invalidated-citation:" string', async () => {
    const result = await runLint(fixture, {
      gitRunner: () => CURRENT_SHA + '\n',
    });
    expect(result.stdout).toContain('invalidated-citation:');
  });

  it('stdout contains literal "excluded-path-ingested:" string', async () => {
    const result = await runLint(fixture, {
      gitRunner: () => CURRENT_SHA + '\n',
    });
    expect(result.stdout).toContain('excluded-path-ingested:');
  });

  it('stdout contains literal "pagination-needed:" string', async () => {
    const result = await runLint(fixture, {
      gitRunner: () => CURRENT_SHA + '\n',
    });
    expect(result.stdout).toContain('pagination-needed:');
  });
});

// ─── Scenario 11: O(n) perf sanity — 100 pages < 2s ─────────────────────────

describe('Scenario 11: O(n) perf sanity — 100 pages under 2s', () => {
  let fixture: LintFixture;

  beforeEach(() => {
    fixture = buildLintFixture();
    // Seed 100 stories, all valid
    for (let i = 1; i <= 100; i++) {
      const id = `STORY-PERF-${String(i).padStart(3, '0')}`;
      const rawPath = `.cleargate/delivery/pending-sync/${id}_Test.md`;
      writeRawFile(fixture, rawPath);
      writeWikiPage(
        fixture,
        'stories',
        id,
        wikiPageContent({ type: 'story', id, raw_path: rawPath }),
      );
    }
  });

  afterEach(() => fixture.cleanup());

  it('completes in under 2 seconds', async () => {
    const start = Date.now();
    // pagination-needed will fire since >50 stories; use gitRunner to avoid real git calls
    await runLint(fixture, { gitRunner: () => '' });
    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(2000);
  });
});
