/**
 * Tests for STORY-020-02: Ingest Phase 4 — Contradiction Check (Advisory)
 *
 * Covers all five Gherkin scenarios from §2.1 + the idempotency assertion (§4.1 #6).
 * Co-located at cleargate-cli/test/wiki/ per FLASHCARD #test-location #wiki #cli.
 *
 * These are pure unit tests: no LLM is called. The phase4SubagentStub seam
 * replaces the real subagent invocation with a synchronous mock.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as url from 'node:url';
import { wikiIngestHandler } from '../../src/commands/wiki-ingest.js';
import { preparePhase4, commitPhase4Findings, type ContradictFinding } from '../../src/commands/wiki-ingest.js';
import { parsePage } from '../../src/wiki/page-schema.js';
import { buildFixture, type Fixture } from './_fixture.js';

const __testDirname = path.dirname(url.fileURLToPath(import.meta.url));
const TEMPLATE_DIR = path.resolve(__testDirname, '../../templates/synthesis');

// ─── Constants ────────────────────────────────────────────────────────────────
const FROZEN_NOW = '2026-04-30T10:00:00.000Z';
const FAKE_SHA = 'aabbccddee1122334455aabbccddee1122334455';
const FAKE_SHA_2 = 'ff00112233445566778899aabbccddeeff001122';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * A Draft story content that cites a neighbor [[STORY-Y-01]].
 */
function draftStoryContent(id: string, epicRef: string, opts: { status?: string; numCitations?: number } = {}): string {
  const status = opts.status ?? 'Draft';
  const numCitations = opts.numCitations ?? 1;

  // Build citation body
  const citations: string[] = [];
  for (let i = 0; i < numCitations; i++) {
    citations.push(`[[STORY-Y-${String(i + 1).padStart(2, '0')}]]`);
  }
  const body = citations.join(' ') + '\n\nThis draft has a contradicting claim about auth flow expects JWT.';

  return `---
story_id: "${id}"
parent_epic_ref: "${epicRef}"
status: "${status}"
remote_id: ""
---

# ${id}: Test Draft Story

${body}
`;
}

/**
 * A neighboring story that can be cited.
 */
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

/**
 * An epic with children refs.
 */
function epicWithChildrenContent(epicId: string, children: string[]): string {
  const childrenYaml = children.map((c) => `  - "${c}"`).join('\n');
  return `---
story_id: "${epicId}"
parent_epic_ref: ""
status: "Approved"
remote_id: ""
children:
${childrenYaml}
---

# ${epicId}: Test Epic

An epic with children for sibling collection.
`;
}

async function runIngestWithStub(
  fixture: Fixture,
  rawPath: string,
  stub: (draftWikiPath: string, neighborhood: string[]) => ContradictFinding[],
  overrides: Partial<Parameters<typeof wikiIngestHandler>[0]> = {},
): Promise<{ stdout: string; stderr: string; exitCode?: number }> {
  const out: string[] = [];
  const err: string[] = [];
  let exitCode: number | undefined;

  try {
    await wikiIngestHandler({
      rawPath,
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
      templateDir: TEMPLATE_DIR,
      phase4SubagentStub: stub,
      ...overrides,
    });
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('EXIT:')) {
      return { stdout: out.join(''), stderr: err.join(''), exitCode };
    }
    throw e;
  }
  return { stdout: out.join(''), stderr: err.join(''), exitCode };
}

function countContradictionEntries(contradictionsContent: string): number {
  // Count lines starting with "- draft:" — one per finding
  return (contradictionsContent.match(/^- draft:/gm) ?? []).length;
}

// ─── Scenario 1: Phase 4 fires on Draft and appends a finding ─────────────────

describe('Scenario 1: Phase 4 fires on Draft + appends finding', () => {
  let fixture: Fixture;

  beforeEach(() => {
    fixture = buildFixture([
      { subdir: 'pending-sync', filename: 'EPIC-Y_Test.md', content: epicWithChildrenContent('EPIC-Y', ['STORY-Y-01', 'STORY-Y-02']) },
      { subdir: 'pending-sync', filename: 'STORY-020-02_Draft.md', content: draftStoryContent('STORY-020-02', 'EPIC-Y', { status: 'Draft', numCitations: 1 }) },
      { subdir: 'pending-sync', filename: 'STORY-Y-01_Neighbor.md', content: neighborStoryContent('STORY-Y-01', 'EPIC-Y') },
    ]);
    // Pre-create wiki bucket dirs
    for (const b of ['epics', 'stories', 'sprints', 'proposals', 'crs', 'bugs', 'topics']) {
      fs.mkdirSync(path.join(fixture.wikiRoot, b), { recursive: true });
    }
  });

  afterEach(() => fixture.cleanup());

  it('Phase 4 invokes stub and appends one finding to contradictions.md', async () => {
    const rawPath = path.join(fixture.deliveryRoot, 'pending-sync', 'STORY-020-02_Draft.md');

    const stub = (_draftWikiPath: string, _neighborhood: string[]): ContradictFinding[] => [
      {
        draft: 'STORY-020-02',
        neighbor: 'STORY-Y-01',
        claim: 'auth flow expects JWT vs neighbor mandates OAuth client_credentials',
      },
    ];

    await runIngestWithStub(fixture, rawPath, stub);

    const contradictionsPath = path.join(fixture.wikiRoot, 'contradictions.md');
    expect(fs.existsSync(contradictionsPath)).toBe(true);
    const content = fs.readFileSync(contradictionsPath, 'utf8');
    expect(countContradictionEntries(content)).toBe(1);
    expect(content).toContain('STORY-020-02');
    expect(content).toContain('STORY-Y-01');
  });

  it('last_contradict_sha is stamped on the raw frontmatter', async () => {
    const rawPath = path.join(fixture.deliveryRoot, 'pending-sync', 'STORY-020-02_Draft.md');
    const stub = (): ContradictFinding[] => [
      { draft: 'STORY-020-02', neighbor: 'STORY-Y-01', claim: 'JWT vs OAuth contradiction' },
    ];

    await runIngestWithStub(fixture, rawPath, stub);

    const updatedContent = fs.readFileSync(rawPath, 'utf8');
    expect(updatedContent).toContain(`last_contradict_sha: "${FAKE_SHA}"`);
  });

  it('ingest exits 0 (no throw, no exitCode)', async () => {
    const rawPath = path.join(fixture.deliveryRoot, 'pending-sync', 'STORY-020-02_Draft.md');
    const stub = (): ContradictFinding[] => [];

    const result = await runIngestWithStub(fixture, rawPath, stub);
    expect(result.exitCode).toBeUndefined(); // no exit called
  });
});

// ─── Scenario 2: Status filter — Approved page skips Phase 4 ─────────────────

describe('Scenario 2: Status filter — Approved page skips Phase 4', () => {
  let fixture: Fixture;
  let stubCallCount: number;

  beforeEach(() => {
    stubCallCount = 0;
    fixture = buildFixture([
      { subdir: 'pending-sync', filename: 'STORY-020-02_Approved.md', content: draftStoryContent('STORY-020-02', 'EPIC-Y', { status: 'Approved' }) },
    ]);
    for (const b of ['epics', 'stories', 'sprints', 'proposals', 'crs', 'bugs', 'topics']) {
      fs.mkdirSync(path.join(fixture.wikiRoot, b), { recursive: true });
    }
  });

  afterEach(() => fixture.cleanup());

  it('stub is NOT called for Approved status', async () => {
    const rawPath = path.join(fixture.deliveryRoot, 'pending-sync', 'STORY-020-02_Approved.md');
    const stub = (): ContradictFinding[] => {
      stubCallCount++;
      return [];
    };

    await runIngestWithStub(fixture, rawPath, stub);

    expect(stubCallCount).toBe(0);
  });

  it('no finding is appended to contradictions.md', async () => {
    const rawPath = path.join(fixture.deliveryRoot, 'pending-sync', 'STORY-020-02_Approved.md');
    const stub = (): ContradictFinding[] => [];

    await runIngestWithStub(fixture, rawPath, stub);

    const contradictionsPath = path.join(fixture.wikiRoot, 'contradictions.md');
    // Either doesn't exist or has 0 entries
    if (fs.existsSync(contradictionsPath)) {
      const content = fs.readFileSync(contradictionsPath, 'utf8');
      expect(countContradictionEntries(content)).toBe(0);
    } else {
      expect(true).toBe(true); // not created = also fine
    }
  });

  it('last_contradict_sha is NOT stamped for Approved page', async () => {
    const rawPath = path.join(fixture.deliveryRoot, 'pending-sync', 'STORY-020-02_Approved.md');
    const stub = (): ContradictFinding[] => [];
    const originalContent = fs.readFileSync(rawPath, 'utf8');

    await runIngestWithStub(fixture, rawPath, stub);

    const updatedContent = fs.readFileSync(rawPath, 'utf8');
    expect(updatedContent).not.toContain('last_contradict_sha');
    // Frontmatter should be unchanged in terms of sha field
    void originalContent;
  });
});

// ─── Scenario 3: SHA-idempotency short-circuit ───────────────────────────────

describe('Scenario 3: SHA-idempotency short-circuit', () => {
  let fixture: Fixture;
  let stubCallCount: number;

  beforeEach(() => {
    stubCallCount = 0;
    fixture = buildFixture([
      { subdir: 'pending-sync', filename: 'STORY-020-03_Draft.md', content: draftStoryContent('STORY-020-03', 'EPIC-Y', { status: 'Draft' }) },
    ]);
    for (const b of ['epics', 'stories', 'sprints', 'proposals', 'crs', 'bugs', 'topics']) {
      fs.mkdirSync(path.join(fixture.wikiRoot, b), { recursive: true });
    }
  });

  afterEach(() => fixture.cleanup());

  it('second run on same SHA does not call stub', async () => {
    const rawPath = path.join(fixture.deliveryRoot, 'pending-sync', 'STORY-020-03_Draft.md');
    const stub = (): ContradictFinding[] => {
      stubCallCount++;
      return [];
    };

    // First run — primes the sha
    await runIngestWithStub(fixture, rawPath, stub);
    expect(stubCallCount).toBe(1);

    // Second run on same SHA — should short-circuit
    await runIngestWithStub(fixture, rawPath, stub);
    // Stub should NOT be called again
    expect(stubCallCount).toBe(1);
  });

  it('second run appends zero new entries to contradictions.md', async () => {
    const rawPath = path.join(fixture.deliveryRoot, 'pending-sync', 'STORY-020-03_Draft.md');
    const stub = (): ContradictFinding[] => [
      { draft: 'STORY-020-03', neighbor: 'STORY-X-01', claim: 'some contradiction' },
    ];

    // First run
    await runIngestWithStub(fixture, rawPath, stub);
    const contradictionsPath = path.join(fixture.wikiRoot, 'contradictions.md');
    const contentAfterFirst = fs.readFileSync(contradictionsPath, 'utf8');
    const countAfterFirst = countContradictionEntries(contentAfterFirst);

    // Second run (same SHA)
    await runIngestWithStub(fixture, rawPath, stub);
    const contentAfterSecond = fs.readFileSync(contradictionsPath, 'utf8');
    const countAfterSecond = countContradictionEntries(contentAfterSecond);

    // No new entries
    expect(countAfterSecond).toBe(countAfterFirst);
  });
});

// ─── Scenario 4: Neighborhood truncation at 12 ───────────────────────────────

describe('Scenario 4: Neighborhood truncation at 12', () => {
  let fixture: Fixture;

  beforeEach(() => {
    // Build a draft citing 15 distinct [[ID]]s
    const citations = Array.from({ length: 15 }, (_, i) =>
      `[[STORY-N-${String(i + 1).padStart(2, '0')}]]`,
    );
    const draftBody = citations.join(' ') + '\n\nDraft with many citations.';
    const draftContent = `---
story_id: "STORY-020-04"
parent_epic_ref: "EPIC-N"
status: "Draft"
remote_id: ""
---

# STORY-020-04: Draft with 15 citations

${draftBody}
`;

    fixture = buildFixture([
      { subdir: 'pending-sync', filename: 'STORY-020-04_Draft.md', content: draftContent },
    ]);
    for (const b of ['epics', 'stories', 'sprints', 'proposals', 'crs', 'bugs', 'topics']) {
      fs.mkdirSync(path.join(fixture.wikiRoot, b), { recursive: true });
    }
    // Create wiki pages for all 15 neighbors so they exist in the neighborhood
    const storiesDir = path.join(fixture.wikiRoot, 'stories');
    for (let i = 1; i <= 15; i++) {
      const nId = `STORY-N-${String(i).padStart(2, '0')}`;
      const pageContent = `---
type: story
id: "${nId}"
parent: "[[EPIC-N]]"
children: []
status: "Approved"
remote_id: ""
raw_path: ".cleargate/delivery/pending-sync/${nId}.md"
last_ingest: "2026-04-30T00:00:00Z"
last_ingest_commit: "abc123"
repo: "planning"
---

# ${nId}: Neighbor ${i}

Neighbor story ${i}.
`;
      fs.writeFileSync(path.join(storiesDir, `${nId}.md`), pageContent, 'utf8');
    }
  });

  afterEach(() => fixture.cleanup());

  it('neighborhood passed to stub has exactly 12 entries when 15 IDs cited', async () => {
    const rawPath = path.join(fixture.deliveryRoot, 'pending-sync', 'STORY-020-04_Draft.md');
    let capturedNeighborhood: string[] = [];

    const stub = (_draftWikiPath: string, neighborhood: string[]): ContradictFinding[] => {
      capturedNeighborhood = neighborhood;
      return [];
    };

    await runIngestWithStub(fixture, rawPath, stub);

    expect(capturedNeighborhood).toHaveLength(12);
  });

  it('finding entry includes truncated: true when neighborhood was truncated', async () => {
    const rawPath = path.join(fixture.deliveryRoot, 'pending-sync', 'STORY-020-04_Draft.md');

    const stub = (): ContradictFinding[] => [
      { draft: 'STORY-020-04', neighbor: 'STORY-N-01', claim: 'contradiction claim' },
    ];

    await runIngestWithStub(fixture, rawPath, stub);

    const contradictionsPath = path.join(fixture.wikiRoot, 'contradictions.md');
    const content = fs.readFileSync(contradictionsPath, 'utf8');
    expect(content).toContain('truncated: true');
  });
});

// ─── Scenario 5: Advisory log schema well-formed ─────────────────────────────

describe('Scenario 5: Advisory log schema is well-formed', () => {
  let fixture: Fixture;

  beforeEach(() => {
    fixture = buildFixture([
      { subdir: 'pending-sync', filename: 'STORY-020-05_Draft.md', content: draftStoryContent('STORY-020-05', 'EPIC-Y', { status: 'Draft' }) },
    ]);
    for (const b of ['epics', 'stories', 'sprints', 'proposals', 'crs', 'bugs', 'topics']) {
      fs.mkdirSync(path.join(fixture.wikiRoot, b), { recursive: true });
    }
  });

  afterEach(() => fixture.cleanup());

  it('appended entry has all required fields: draft, neighbor, claim, ingest_sha, truncated, label', async () => {
    const rawPath = path.join(fixture.deliveryRoot, 'pending-sync', 'STORY-020-05_Draft.md');

    const stub = (): ContradictFinding[] => [
      {
        draft: 'STORY-020-05',
        neighbor: 'STORY-Y-01',
        claim: 'auth flow expects JWT vs neighbor mandates OAuth',
      },
    ];

    await runIngestWithStub(fixture, rawPath, stub);

    const contradictionsPath = path.join(fixture.wikiRoot, 'contradictions.md');
    expect(fs.existsSync(contradictionsPath)).toBe(true);
    const content = fs.readFileSync(contradictionsPath, 'utf8');

    // All required fields present
    expect(content).toContain('draft:');
    expect(content).toContain('neighbor:');
    expect(content).toContain('claim:');
    expect(content).toContain('ingest_sha:');
    expect(content).toContain('truncated:');
    expect(content).toContain('label: null');
  });

  it('label field is null (pending human labeling)', async () => {
    const rawPath = path.join(fixture.deliveryRoot, 'pending-sync', 'STORY-020-05_Draft.md');
    const stub = (): ContradictFinding[] => [
      { draft: 'STORY-020-05', neighbor: 'STORY-Y-01', claim: 'some claim' },
    ];

    await runIngestWithStub(fixture, rawPath, stub);

    const content = fs.readFileSync(path.join(fixture.wikiRoot, 'contradictions.md'), 'utf8');
    // label must be null (not a string)
    expect(content).toMatch(/label: null/);
    expect(content).not.toMatch(/label: "null"/);
  });

  it('ingest_sha matches the FAKE_SHA used in gitRunner', async () => {
    const rawPath = path.join(fixture.deliveryRoot, 'pending-sync', 'STORY-020-05_Draft.md');
    const stub = (): ContradictFinding[] => [
      { draft: 'STORY-020-05', neighbor: 'STORY-Y-01', claim: 'some claim' },
    ];

    await runIngestWithStub(fixture, rawPath, stub);

    const content = fs.readFileSync(path.join(fixture.wikiRoot, 'contradictions.md'), 'utf8');
    expect(content).toContain(`ingest_sha: "${FAKE_SHA}"`);
  });
});

// ─── Scenario 6 (§4.1 idempotency assertion): two runs, zero new tokens ──────
// Note: In unit tests, "no tokens" is approximated by "stub not called on second run"
// (no LLM cost). The ledger assertion is a manual verification step (§2.2 step 5).

describe('Scenario 6: Idempotency assertion — stub not called on same SHA second run', () => {
  let fixture: Fixture;

  beforeEach(() => {
    fixture = buildFixture([
      { subdir: 'pending-sync', filename: 'STORY-020-06_Draft.md', content: draftStoryContent('STORY-020-06', 'EPIC-Y', { status: 'Draft' }) },
    ]);
    for (const b of ['epics', 'stories', 'sprints', 'proposals', 'crs', 'bugs', 'topics']) {
      fs.mkdirSync(path.join(fixture.wikiRoot, b), { recursive: true });
    }
  });

  afterEach(() => fixture.cleanup());

  it('stub is called exactly once across two ingest runs on the same SHA', async () => {
    const rawPath = path.join(fixture.deliveryRoot, 'pending-sync', 'STORY-020-06_Draft.md');
    let stubCallCount = 0;

    const stub = (): ContradictFinding[] => {
      stubCallCount++;
      return [];
    };

    // First run — Phase 4 fires
    await runIngestWithStub(fixture, rawPath, stub);
    const callsAfterFirst = stubCallCount;

    // Second run — same SHA → short-circuit
    await runIngestWithStub(fixture, rawPath, stub);
    const callsAfterSecond = stubCallCount;

    expect(callsAfterFirst).toBe(1);
    expect(callsAfterSecond).toBe(1); // no additional call
  });
});

// ─── Unit tests: preparePhase4 and commitPhase4Findings ──────────────────────

describe('preparePhase4: status filter', () => {
  let fixture: Fixture;

  beforeEach(() => {
    fixture = buildFixture([]);
    for (const b of ['epics', 'stories', 'sprints', 'proposals', 'crs', 'bugs', 'topics']) {
      fs.mkdirSync(path.join(fixture.wikiRoot, b), { recursive: true });
    }
  });

  afterEach(() => fixture.cleanup());

  for (const status of ['Approved', 'Done', 'Archived', 'Cancelled', 'Completed']) {
    it(`returns skip=true for status="${status}"`, () => {
      const result = preparePhase4({
        absRawPath: '/tmp/fake.md',
        relRawPath: '.cleargate/delivery/pending-sync/STORY-X.md',
        wikiRoot: fixture.wikiRoot,
        id: 'STORY-X',
        fm: { status },
        body: 'body text',
        currentSha: FAKE_SHA,
      });
      expect(result.skip).toBe(true);
      if (result.skip) {
        expect(result.reason).toContain(`status=${status}`);
      }
    });
  }

  for (const status of ['Draft', 'In Review']) {
    it(`returns skip=false for status="${status}" (no existing page)`, () => {
      const result = preparePhase4({
        absRawPath: '/tmp/fake.md',
        relRawPath: '.cleargate/delivery/pending-sync/STORY-X.md',
        wikiRoot: fixture.wikiRoot,
        id: 'STORY-X',
        fm: { status },
        body: 'body text',
        currentSha: FAKE_SHA,
      });
      expect(result.skip).toBe(false);
    });
  }
});

describe('preparePhase4: SHA idempotency', () => {
  let fixture: Fixture;

  beforeEach(() => {
    fixture = buildFixture([]);
    for (const b of ['epics', 'stories', 'sprints', 'proposals', 'crs', 'bugs', 'topics']) {
      fs.mkdirSync(path.join(fixture.wikiRoot, b), { recursive: true });
    }
  });

  afterEach(() => fixture.cleanup());

  it('returns skip=true when existing wiki page last_contradict_sha matches currentSha', () => {
    // Create a wiki page with last_contradict_sha set
    const pageContent = `---
type: story
id: "STORY-IDEM"
parent: ""
children: []
status: "Draft"
remote_id: ""
raw_path: ".cleargate/delivery/pending-sync/STORY-IDEM.md"
last_ingest: "2026-04-30T00:00:00Z"
last_ingest_commit: "${FAKE_SHA}"
repo: "planning"
last_contradict_sha: "${FAKE_SHA}"
---

# STORY-IDEM: Idempotent story
`;
    const pagePath = path.join(fixture.wikiRoot, 'stories', 'STORY-IDEM.md');
    fs.writeFileSync(pagePath, pageContent, 'utf8');

    const result = preparePhase4({
      absRawPath: '/tmp/fake.md',
      relRawPath: '.cleargate/delivery/pending-sync/STORY-IDEM.md',
      wikiRoot: fixture.wikiRoot,
      id: 'STORY-IDEM',
      fm: { status: 'Draft' },
      body: 'body text',
      currentSha: FAKE_SHA,
    });

    expect(result.skip).toBe(true);
    if (result.skip) {
      expect(result.reason).toContain('sha-idempotent');
    }
  });

  it('returns skip=false when sha differs', () => {
    const pageContent = `---
type: story
id: "STORY-DIFF"
parent: ""
children: []
status: "Draft"
remote_id: ""
raw_path: ".cleargate/delivery/pending-sync/STORY-DIFF.md"
last_ingest: "2026-04-30T00:00:00Z"
last_ingest_commit: "${FAKE_SHA}"
repo: "planning"
last_contradict_sha: "${FAKE_SHA_2}"
---

# STORY-DIFF: Different sha
`;
    const pagePath = path.join(fixture.wikiRoot, 'stories', 'STORY-DIFF.md');
    fs.writeFileSync(pagePath, pageContent, 'utf8');

    const result = preparePhase4({
      absRawPath: '/tmp/fake.md',
      relRawPath: '.cleargate/delivery/pending-sync/STORY-DIFF.md',
      wikiRoot: fixture.wikiRoot,
      id: 'STORY-DIFF',
      fm: { status: 'Draft' },
      body: 'body text',
      currentSha: FAKE_SHA,
    });

    expect(result.skip).toBe(false);
  });
});

describe('commitPhase4Findings: creates contradictions.md skeleton when missing', () => {
  let fixture: Fixture;

  beforeEach(() => {
    fixture = buildFixture([]);
    fs.mkdirSync(fixture.wikiRoot, { recursive: true });
  });

  afterEach(() => fixture.cleanup());

  it('creates contradictions.md with skeleton when no findings', () => {
    // Create a temp raw file to stamp
    const rawPath = path.join(fixture.root, 'STORY-T.md');
    fs.writeFileSync(rawPath, `---\nstatus: "Draft"\n---\n\nBody\n`, 'utf8');

    commitPhase4Findings({
      absRawPath: rawPath,
      wikiRoot: fixture.wikiRoot,
      findings: [],
      ingestSha: FAKE_SHA,
      truncated: false,
      draftId: 'STORY-T',
      now: () => FROZEN_NOW,
    });

    const contradictionsPath = path.join(fixture.wikiRoot, 'contradictions.md');
    expect(fs.existsSync(contradictionsPath)).toBe(true);
    const content = fs.readFileSync(contradictionsPath, 'utf8');
    expect(content).toContain('type: "synthesis"');
    expect(content).toContain('id: "contradictions"');
    expect(content).toContain('findings: []');
  });

  it('appends findings to existing contradictions.md', () => {
    // Create existing contradictions.md with skeleton
    const contradictionsPath = path.join(fixture.wikiRoot, 'contradictions.md');
    fs.writeFileSync(contradictionsPath, [
      '---',
      'type: "synthesis"',
      'id: "contradictions"',
      `generated_at: "${FROZEN_NOW}"`,
      '---',
      '',
      '# Wiki Contradictions — Advisory Log',
      '',
      '(Append-only.)',
      '',
      'findings: []',
      '',
    ].join('\n'), 'utf8');

    const rawPath = path.join(fixture.root, 'STORY-T2.md');
    fs.writeFileSync(rawPath, `---\nstatus: "Draft"\n---\n\nBody\n`, 'utf8');

    commitPhase4Findings({
      absRawPath: rawPath,
      wikiRoot: fixture.wikiRoot,
      findings: [
        { draft: 'STORY-T2', neighbor: 'STORY-N', claim: 'claim text' },
      ],
      ingestSha: FAKE_SHA,
      truncated: false,
      draftId: 'STORY-T2',
      now: () => FROZEN_NOW,
    });

    const content = fs.readFileSync(contradictionsPath, 'utf8');
    expect(content).toContain('- draft: "[[STORY-T2]]"');
    expect(content).toContain('label: null');
  });
});

describe('page-schema: last_contradict_sha optional field', () => {
  it('parsePage reads last_contradict_sha when present', () => {
    const pageContent = `---
type: story
id: "STORY-S"
parent: ""
children: []
status: "Draft"
remote_id: ""
raw_path: ".cleargate/delivery/pending-sync/STORY-S.md"
last_ingest: "2026-04-30T00:00:00Z"
last_ingest_commit: "${FAKE_SHA}"
repo: "planning"
last_contradict_sha: "${FAKE_SHA_2}"
---

# STORY-S: Schema test
`;
    const page = parsePage(pageContent);
    expect(page.last_contradict_sha).toBe(FAKE_SHA_2);
  });

  it('parsePage returns undefined last_contradict_sha when field absent', () => {
    const pageContent = `---
type: story
id: "STORY-S2"
parent: ""
children: []
status: "Draft"
remote_id: ""
raw_path: ".cleargate/delivery/pending-sync/STORY-S2.md"
last_ingest: "2026-04-30T00:00:00Z"
last_ingest_commit: "${FAKE_SHA}"
repo: "planning"
---

# STORY-S2: No sha
`;
    const page = parsePage(pageContent);
    expect(page.last_contradict_sha).toBeUndefined();
  });
});
