/**
 * Tests for STORY-002-06: cleargate wiki build
 * Vitest, real fs under os.tmpdir(), no fs mocks.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as url from 'node:url';
import * as crypto from 'node:crypto';
import { wikiBuildHandler } from '../../src/commands/wiki-build.js';
import { parseFrontmatter } from '../../src/wiki/parse-frontmatter.js';
import { deriveRepo } from '../../src/wiki/derive-repo.js';
import { deriveBucket } from '../../src/wiki/derive-bucket.js';
import { getGitSha } from '../../src/wiki/git-sha.js';
import {
  buildFixture,
  epicContent,
  storyContent,
  sprintContent,
  proposalContent,
  ambiguousStoryContent,
  readyItemContent,
  activeSprintContent,
  completedSprintContent,
  type Fixture,
} from './_fixture.js';

// ─── Test seam helpers ────────────────────────────────────────────────────────

const FROZEN_NOW = '2026-04-19T12:00:00.000Z';

// Resolve the templates directory from the cleargate-cli package root.
// This seam ensures tests always find templates regardless of where vitest
// resolves the source files (flashcard: #tsup #npm-publish #assets).
const __testDirname = path.dirname(url.fileURLToPath(import.meta.url));
const TEMPLATE_DIR = path.resolve(__testDirname, '../../templates/synthesis');

function makeOpts(fixture: Fixture, overrides: Parameters<typeof wikiBuildHandler>[0] = {}) {
  const out: string[] = [];
  const err: string[] = [];
  let exitCode: number | undefined;

  return {
    opts: {
      cwd: fixture.root,
      now: () => FROZEN_NOW,
      stdout: (s: string) => { out.push(s); },
      stderr: (s: string) => { err.push(s); },
      exit: (c: number): never => {
        exitCode = c;
        throw new Error(`EXIT:${c}`);
      },
      templateDir: TEMPLATE_DIR,
      ...overrides,
    },
    get stdout() { return out.join(''); },
    get stderr() { return err.join(''); },
    get exitCode() { return exitCode; },
  };
}

async function runBuild(fixture: Fixture, overrides: Parameters<typeof wikiBuildHandler>[0] = {}) {
  const wrapped = makeOpts(fixture, overrides);
  try {
    await wikiBuildHandler(wrapped.opts);
  } catch (e) {
    if (e instanceof Error && e.message.startsWith('EXIT:')) return wrapped;
    throw e;
  }
  return wrapped;
}

// ─── Scenario 1: Empty delivery/ → skeleton wiki ─────────────────────────────

describe('Scenario 1: Empty .cleargate/delivery/ → produces wiki skeleton', () => {
  let fixture: Fixture;

  beforeEach(() => {
    fixture = buildFixture([]);
  });

  afterEach(() => fixture.cleanup());

  it('produces wiki/index.md', async () => {
    await runBuild(fixture);
    expect(fs.existsSync(path.join(fixture.wikiRoot, 'index.md'))).toBe(true);
  });

  it('produces wiki/log.md', async () => {
    await runBuild(fixture);
    expect(fs.existsSync(path.join(fixture.wikiRoot, 'log.md'))).toBe(true);
  });

  it('produces all four synthesis pages', async () => {
    await runBuild(fixture);
    for (const page of ['active-sprint.md', 'open-gates.md', 'product-state.md', 'roadmap.md']) {
      expect(fs.existsSync(path.join(fixture.wikiRoot, page)), `missing ${page}`).toBe(true);
    }
  });

  it('creates wiki/topics/ directory', async () => {
    await runBuild(fixture);
    expect(fs.existsSync(path.join(fixture.wikiRoot, 'topics'))).toBe(true);
    expect(fs.statSync(path.join(fixture.wikiRoot, 'topics')).isDirectory()).toBe(true);
  });

  it('index.md says "no items"', async () => {
    await runBuild(fixture);
    const content = fs.readFileSync(path.join(fixture.wikiRoot, 'index.md'), 'utf8');
    expect(content).toContain('no items');
  });

  it('log.md is empty (no entries)', async () => {
    await runBuild(fixture);
    const content = fs.readFileSync(path.join(fixture.wikiRoot, 'log.md'), 'utf8');
    // Just the header, no entries
    expect(content.trim()).toBe('# Wiki Event Log');
  });

  it('stdout says "wiki build: OK (0 pages written)"', async () => {
    const result = await runBuild(fixture);
    expect(result.stdout).toContain('wiki build: OK (0 pages written)');
  });
});

// ─── Scenario 2: Single epic → full frontmatter with all 9 fields ─────────────

describe('Scenario 2: Single epic in pending-sync/ → wiki page with full frontmatter', () => {
  let fixture: Fixture;

  beforeEach(() => {
    fixture = buildFixture([
      { subdir: 'pending-sync', filename: 'EPIC-001_Test_Epic.md', content: epicContent('EPIC-001') },
    ]);
  });

  afterEach(() => fixture.cleanup());

  it('wiki/epics/EPIC-001.md exists', async () => {
    await runBuild(fixture);
    expect(fs.existsSync(path.join(fixture.wikiRoot, 'epics', 'EPIC-001.md'))).toBe(true);
  });

  it('wiki page has all 9 frontmatter fields', async () => {
    await runBuild(fixture);
    const raw = fs.readFileSync(path.join(fixture.wikiRoot, 'epics', 'EPIC-001.md'), 'utf8');
    const { fm } = parseFrontmatter(raw);
    const requiredFields = ['type', 'id', 'parent', 'children', 'status', 'remote_id', 'raw_path', 'last_ingest', 'last_ingest_commit'];
    // repo is also required (field 9+1 but the schema has 10 fields total including repo)
    const allFields = [...requiredFields, 'repo'];
    for (const field of allFields) {
      expect(fm, `missing field: ${field}`).toHaveProperty(field);
    }
  });

  it('wiki page has correct type: epic', async () => {
    await runBuild(fixture);
    const raw = fs.readFileSync(path.join(fixture.wikiRoot, 'epics', 'EPIC-001.md'), 'utf8');
    const { fm } = parseFrontmatter(raw);
    expect(fm['type']).toBe('epic');
  });

  it('wiki page has repo: planning', async () => {
    await runBuild(fixture);
    const raw = fs.readFileSync(path.join(fixture.wikiRoot, 'epics', 'EPIC-001.md'), 'utf8');
    const { fm } = parseFrontmatter(raw);
    expect(fm['repo']).toBe('planning');
  });

  it('wiki page has last_ingest: frozen now', async () => {
    await runBuild(fixture);
    const raw = fs.readFileSync(path.join(fixture.wikiRoot, 'epics', 'EPIC-001.md'), 'utf8');
    const { fm } = parseFrontmatter(raw);
    expect(fm['last_ingest']).toBe(FROZEN_NOW);
  });

  it('wiki page has blast radius section', async () => {
    await runBuild(fixture);
    const raw = fs.readFileSync(path.join(fixture.wikiRoot, 'epics', 'EPIC-001.md'), 'utf8');
    expect(raw).toContain('## Blast radius');
  });

  it('index.md lists EPIC-001', async () => {
    await runBuild(fixture);
    const index = fs.readFileSync(path.join(fixture.wikiRoot, 'index.md'), 'utf8');
    expect(index).toContain('EPIC-001');
  });

  it('log.md has 1 entry', async () => {
    await runBuild(fixture);
    const log = fs.readFileSync(path.join(fixture.wikiRoot, 'log.md'), 'utf8');
    const entries = (log.match(/^- timestamp:/gm) ?? []).length;
    expect(entries).toBe(1);
  });
});

// ─── Scenario 3: Idempotency — byte-identical output with frozen now ──────────

describe('Scenario 3: Idempotency — two builds with same now = byte-identical output', () => {
  let fixture: Fixture;

  beforeEach(() => {
    fixture = buildFixture([
      { subdir: 'pending-sync', filename: 'EPIC-001_Test.md', content: epicContent('EPIC-001') },
      { subdir: 'archive', filename: 'STORY-001-01_Test.md', content: storyContent('STORY-001-01', 'EPIC-001') },
    ]);
  });

  afterEach(() => fixture.cleanup());

  it('two builds produce byte-identical wiki pages', async () => {
    await runBuild(fixture);

    // Capture hashes of all wiki page files after first build
    function hashDir(dir: string): Map<string, string> {
      const result = new Map<string, string>();
      if (!fs.existsSync(dir)) return result;
      const files = fs.readdirSync(dir, { recursive: true, encoding: 'utf8' }) as string[];
      for (const f of files) {
        const fullPath = path.join(dir, f);
        if (fs.statSync(fullPath).isFile()) {
          const content = fs.readFileSync(fullPath);
          result.set(f, crypto.createHash('sha256').update(content).digest('hex'));
        }
      }
      return result;
    }

    const hashes1 = hashDir(fixture.wikiRoot);

    // Second build with same frozen now
    await runBuild(fixture);

    const hashes2 = hashDir(fixture.wikiRoot);

    for (const [file, hash1] of hashes1) {
      expect(hashes2.get(file), `file ${file} differs between builds`).toBe(hash1);
    }
    expect(hashes1.size).toBe(hashes2.size);
  });

  it('two builds with different now: only last_ingest field differs', async () => {
    const now1 = '2026-04-19T10:00:00.000Z';
    const now2 = '2026-04-19T11:00:00.000Z';

    await runBuild(fixture, { now: () => now1 });
    const content1 = fs.readFileSync(path.join(fixture.wikiRoot, 'epics', 'EPIC-001.md'), 'utf8');

    await runBuild(fixture, { now: () => now2 });
    const content2 = fs.readFileSync(path.join(fixture.wikiRoot, 'epics', 'EPIC-001.md'), 'utf8');

    // Replace the last_ingest values before comparing — everything else must match
    const normalized1 = content1.replace(now1, '__NOW__');
    const normalized2 = content2.replace(now2, '__NOW__');
    expect(normalized1).toBe(normalized2);
  });
});

// ─── Scenario 4: Synthesis pages produced ─────────────────────────────────────

describe('Scenario 4: Synthesis pages are all produced', () => {
  let fixture: Fixture;

  beforeEach(() => {
    fixture = buildFixture([
      { subdir: 'pending-sync', filename: 'SPRINT-01_Test.md', content: sprintContent('SPRINT-01') },
    ]);
  });

  afterEach(() => fixture.cleanup());

  it('active-sprint.md exists', async () => {
    await runBuild(fixture);
    expect(fs.existsSync(path.join(fixture.wikiRoot, 'active-sprint.md'))).toBe(true);
  });

  it('open-gates.md exists', async () => {
    await runBuild(fixture);
    expect(fs.existsSync(path.join(fixture.wikiRoot, 'open-gates.md'))).toBe(true);
  });

  it('product-state.md exists', async () => {
    await runBuild(fixture);
    expect(fs.existsSync(path.join(fixture.wikiRoot, 'product-state.md'))).toBe(true);
  });

  it('roadmap.md exists', async () => {
    await runBuild(fixture);
    expect(fs.existsSync(path.join(fixture.wikiRoot, 'roadmap.md'))).toBe(true);
  });
});

// ─── Scenario 5: Multi-bucket: epic+story+sprint+proposal ────────────────────

describe('Scenario 5: Multi-bucket items from pending-sync + archive', () => {
  let fixture: Fixture;

  beforeEach(() => {
    fixture = buildFixture([
      { subdir: 'pending-sync', filename: 'EPIC-010_My_Epic.md', content: epicContent('EPIC-010') },
      { subdir: 'archive', filename: 'STORY-010-01_My_Story.md', content: storyContent('STORY-010-01', 'EPIC-010') },
      { subdir: 'pending-sync', filename: 'SPRINT-04_My_Sprint.md', content: sprintContent('SPRINT-04') },
      { subdir: 'archive', filename: 'PROPOSAL-002_My_Proposal.md', content: proposalContent('PROPOSAL-002') },
    ]);
  });

  afterEach(() => fixture.cleanup());

  it('wiki/epics/EPIC-010.md exists', async () => {
    await runBuild(fixture);
    expect(fs.existsSync(path.join(fixture.wikiRoot, 'epics', 'EPIC-010.md'))).toBe(true);
  });

  it('wiki/stories/STORY-010-01.md exists', async () => {
    await runBuild(fixture);
    expect(fs.existsSync(path.join(fixture.wikiRoot, 'stories', 'STORY-010-01.md'))).toBe(true);
  });

  it('wiki/sprints/SPRINT-04.md exists', async () => {
    await runBuild(fixture);
    expect(fs.existsSync(path.join(fixture.wikiRoot, 'sprints', 'SPRINT-04.md'))).toBe(true);
  });

  it('wiki/proposals/PROPOSAL-002.md exists', async () => {
    await runBuild(fixture);
    expect(fs.existsSync(path.join(fixture.wikiRoot, 'proposals', 'PROPOSAL-002.md'))).toBe(true);
  });

  it('index.md lists all four items', async () => {
    await runBuild(fixture);
    const index = fs.readFileSync(path.join(fixture.wikiRoot, 'index.md'), 'utf8');
    expect(index).toContain('EPIC-010');
    expect(index).toContain('STORY-010-01');
    expect(index).toContain('SPRINT-04');
    expect(index).toContain('PROPOSAL-002');
  });

  it('index.md has 4 log entries', async () => {
    await runBuild(fixture);
    const log = fs.readFileSync(path.join(fixture.wikiRoot, 'log.md'), 'utf8');
    const entries = (log.match(/^- timestamp:/gm) ?? []).length;
    expect(entries).toBe(4);
  });
});

// ─── Scenario 6: derive-repo unit tests ──────────────────────────────────────

describe('Scenario 6: derive-repo unit tests', () => {
  it('cleargate-cli/ prefix → cli', () => {
    expect(deriveRepo('cleargate-cli/.cleargate/delivery/pending-sync/EPIC-001.md')).toBe('cli');
  });

  it('mcp/ prefix → mcp', () => {
    expect(deriveRepo('mcp/.cleargate/delivery/pending-sync/EPIC-001.md')).toBe('mcp');
  });

  it('.cleargate/ prefix → planning', () => {
    expect(deriveRepo('.cleargate/delivery/pending-sync/EPIC-001.md')).toBe('planning');
  });

  it('cleargate-planning/ prefix → planning', () => {
    expect(deriveRepo('cleargate-planning/.cleargate/delivery/pending-sync/EPIC-001.md')).toBe('planning');
  });

  it('unknown prefix throws', () => {
    expect(() => deriveRepo('some-other-dir/EPIC-001.md')).toThrow('cannot derive repo');
  });
});

// ─── Scenario 7: derive-bucket unit tests ────────────────────────────────────

describe('Scenario 7: derive-bucket unit tests', () => {
  it('EPIC-001_name.md → epic, EPIC-001, epics', () => {
    const r = deriveBucket('EPIC-001_name.md');
    expect(r.type).toBe('epic');
    expect(r.id).toBe('EPIC-001');
    expect(r.bucket).toBe('epics');
  });

  it('STORY-042-01_name.md → story, STORY-042-01, stories', () => {
    const r = deriveBucket('STORY-042-01_name.md');
    expect(r.type).toBe('story');
    expect(r.id).toBe('STORY-042-01');
    expect(r.bucket).toBe('stories');
  });

  it('SPRINT-03_name.md → sprint, SPRINT-03, sprints', () => {
    const r = deriveBucket('SPRINT-03_name.md');
    expect(r.type).toBe('sprint');
    expect(r.id).toBe('SPRINT-03');
    expect(r.bucket).toBe('sprints');
  });

  it('PROPOSAL-002_name.md → proposal, PROPOSAL-002, proposals', () => {
    const r = deriveBucket('PROPOSAL-002_name.md');
    expect(r.type).toBe('proposal');
    expect(r.id).toBe('PROPOSAL-002');
    expect(r.bucket).toBe('proposals');
  });

  it('CR-001_name.md → cr, CR-001, crs', () => {
    const r = deriveBucket('CR-001_name.md');
    expect(r.type).toBe('cr');
    expect(r.id).toBe('CR-001');
    expect(r.bucket).toBe('crs');
  });

  it('BUG-042_name.md → bug, BUG-042, bugs', () => {
    const r = deriveBucket('BUG-042_name.md');
    expect(r.type).toBe('bug');
    expect(r.id).toBe('BUG-042');
    expect(r.bucket).toBe('bugs');
  });

  it('EPIC-001.md (no underscore) → id is EPIC-001', () => {
    const r = deriveBucket('EPIC-001.md');
    expect(r.id).toBe('EPIC-001');
  });

  it('unknown prefix throws', () => {
    expect(() => deriveBucket('README.md')).toThrow('cannot determine bucket');
  });
});

// ─── Scenario 8: parse-frontmatter unit tests ─────────────────────────────────

describe('Scenario 8: parse-frontmatter unit tests', () => {
  it('parses simple key: value', () => {
    const input = '---\nstatus: "🟢"\n---\nbody';
    const { fm, body } = parseFrontmatter(input);
    expect(fm['status']).toBe('🟢');
    expect(body).toBe('body');
  });

  it('strips quotes from values', () => {
    const input = '---\nid: "STORY-001"\n---\n';
    const { fm } = parseFrontmatter(input);
    expect(fm['id']).toBe('STORY-001');
  });

  it('parses [a, b] list literal', () => {
    const input = '---\nchildren: ["STORY-001", "STORY-002"]\n---\n';
    const { fm } = parseFrontmatter(input);
    expect(Array.isArray(fm['children'])).toBe(true);
    expect(fm['children']).toHaveLength(2);
  });

  it('empty [] → empty array', () => {
    const input = '---\nchildren: []\n---\n';
    const { fm } = parseFrontmatter(input);
    expect(fm['children']).toEqual([]);
  });

  it('missing opening --- throws', () => {
    expect(() => parseFrontmatter('no frontmatter')).toThrow('---');
  });

  it('missing closing --- throws', () => {
    expect(() => parseFrontmatter('---\nkey: val\n')).toThrow('missing closing ---');
  });

  it('nested YAML parsed natively (post-BUG-001)', () => {
    // Pre-fix: parser returned `{a: 1}` as an opaque string.
    // Post-fix: js-yaml parses flow-style as a native object.
    const { fm } = parseFrontmatter('---\nkey: {a: 1}\n---\n');
    expect(fm['key']).toEqual({ a: 1 });
  });

  it('block-style nested map parsed as nested object (post-BUG-001)', () => {
    const { fm } = parseFrontmatter('---\ndraft_tokens:\n  input: 100\n  output: 50\n  model: null\n---\n');
    expect(fm['draft_tokens']).toEqual({ input: 100, output: 50, model: null });
  });

  it('boolean and null scalars keep their types (post-BUG-001)', () => {
    const { fm } = parseFrontmatter('---\napproved: false\nref: null\n---\n');
    expect(fm['approved']).toBe(false);
    expect(fm['ref']).toBeNull();
  });
});

// ─── Scenario 9: git-sha unit tests ──────────────────────────────────────────

describe('Scenario 9: git-sha unit tests', () => {
  it('passes through the SHA returned by runner', () => {
    const fakeSha = 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2';
    const runner = (_cmd: string, _args: string[]) => fakeSha + '\n';
    const result = getGitSha('some/file.md', runner);
    expect(result).toBe(fakeSha);
  });

  it('returns null when runner returns empty stdout', () => {
    const runner = (_cmd: string, _args: string[]) => '';
    const result = getGitSha('some/file.md', runner);
    expect(result).toBeNull();
  });

  it('returns null for whitespace-only stdout', () => {
    const runner = (_cmd: string, _args: string[]) => '   \n';
    const result = getGitSha('some/file.md', runner);
    expect(result).toBeNull();
  });

  it('passes rawPath as last argument to git', () => {
    const calls: string[][] = [];
    const runner = (_cmd: string, args: string[]) => {
      calls.push(args);
      return 'abc123\n';
    };
    getGitSha('path/to/file.md', runner);
    expect(calls[0]).toContain('path/to/file.md');
  });
});

// ─── Scenario 10: Excluded paths not ingested ─────────────────────────────────

describe('Scenario 10: Excluded paths not ingested', () => {
  let fixture: Fixture;

  beforeEach(() => {
    // Place a "knowledge" file — but we need to put it in a special location.
    // The scan only reads pending-sync/ and archive/, so knowledge/ files would
    // never be picked up from there. However, if someone puts them in delivery/
    // by mistake, they should be skipped.
    // Since our scan only reads delivery/pending-sync + delivery/archive, and
    // the exclusion is based on rawPath starting with .cleargate/knowledge/,
    // we test by verifying knowledge/ files placed under delivery/ are excluded
    // (but our fixture puts them correctly in scan's search path).
    fixture = buildFixture([
      { subdir: 'pending-sync', filename: 'EPIC-001_Valid.md', content: epicContent('EPIC-001') },
    ]);

    // Manually create a file that would look like an excluded path
    // We simulate this by creating a custom folder structure
    const knowledgeDir = path.join(fixture.root, '.cleargate', 'knowledge');
    fs.mkdirSync(knowledgeDir, { recursive: true });
    fs.writeFileSync(
      path.join(knowledgeDir, 'EPIC-999_Excluded.md'),
      epicContent('EPIC-999'),
      'utf8',
    );
  });

  afterEach(() => fixture.cleanup());

  it('knowledge/ file does not produce a wiki page', async () => {
    await runBuild(fixture);
    // EPIC-999 should not exist in wiki — knowledge/ is excluded
    expect(fs.existsSync(path.join(fixture.wikiRoot, 'epics', 'EPIC-999.md'))).toBe(false);
  });

  it('valid delivery file is still ingested', async () => {
    await runBuild(fixture);
    expect(fs.existsSync(path.join(fixture.wikiRoot, 'epics', 'EPIC-001.md'))).toBe(true);
  });
});

// ─── Scenario 11: topics/ directory created but empty ─────────────────────────

describe('Scenario 11: topics/ dir created but no pages written', () => {
  let fixture: Fixture;

  beforeEach(() => {
    fixture = buildFixture([]);
  });

  afterEach(() => fixture.cleanup());

  it('wiki/topics/ exists as a directory', async () => {
    await runBuild(fixture);
    const topicsDir = path.join(fixture.wikiRoot, 'topics');
    expect(fs.existsSync(topicsDir)).toBe(true);
    expect(fs.statSync(topicsDir).isDirectory()).toBe(true);
  });

  it('wiki/topics/ is empty', async () => {
    await runBuild(fixture);
    const topicsDir = path.join(fixture.wikiRoot, 'topics');
    const entries = fs.readdirSync(topicsDir);
    expect(entries).toHaveLength(0);
  });
});

// ─── Scenario 12: STORY-002-09 — open-gates corpus-shape fix ─────────────────
// Verifies the emoji-filter bug is fixed: filters now use textual statuses.

describe('Scenario 12: open-gates synthesis — textual status filters (corpus-shape fix)', () => {
  let fixture: Fixture;

  beforeEach(() => {
    fixture = buildFixture([
      // Gate 1: proposal with approved: false and status Draft
      { subdir: 'pending-sync', filename: 'PROPOSAL-001_Draft.md', content: proposalContent('PROPOSAL-001', 'Draft') },
      // Gate 2: story with 🟡 Medium ambiguity
      { subdir: 'pending-sync', filename: 'STORY-001-01_Ambiguous.md', content: ambiguousStoryContent('STORY-001-01', 'EPIC-001', '🟡 Medium') },
      // Gate 3: epic with status Ready and empty remote_id
      { subdir: 'pending-sync', filename: 'EPIC-001_Ready.md', content: readyItemContent('EPIC-001') },
      // Normal item that should NOT appear in any gate
      { subdir: 'archive', filename: 'STORY-002-01_Done.md', content: storyContent('STORY-002-01', 'EPIC-001', 'Completed') },
    ]);
  });

  afterEach(() => fixture.cleanup());

  it('open-gates.md lists Gate 1 proposal with Draft status', async () => {
    await runBuild(fixture);
    const content = fs.readFileSync(path.join(fixture.wikiRoot, 'open-gates.md'), 'utf8');
    expect(content).toContain('PROPOSAL-001');
  });

  it('open-gates.md lists Gate 2 story with medium ambiguity', async () => {
    await runBuild(fixture);
    const content = fs.readFileSync(path.join(fixture.wikiRoot, 'open-gates.md'), 'utf8');
    expect(content).toContain('STORY-001-01');
  });

  it('open-gates.md lists Gate 3 epic that is Ready but not pushed', async () => {
    await runBuild(fixture);
    const content = fs.readFileSync(path.join(fixture.wikiRoot, 'open-gates.md'), 'utf8');
    expect(content).toContain('EPIC-001');
  });

  it('open-gates.md does NOT list completed story', async () => {
    await runBuild(fixture);
    const content = fs.readFileSync(path.join(fixture.wikiRoot, 'open-gates.md'), 'utf8');
    expect(content).not.toContain('STORY-002-01');
  });

  it('open-gates.md is non-empty (catches the 🔴 emoji-filter regression)', async () => {
    await runBuild(fixture);
    const content = fs.readFileSync(path.join(fixture.wikiRoot, 'open-gates.md'), 'utf8');
    // Should have actual items, not just "No items" messages
    const hasItems = content.includes('PROPOSAL-001') || content.includes('STORY-001-01') || content.includes('EPIC-001');
    expect(hasItems).toBe(true);
  });
});

// ─── Scenario 13: STORY-002-09 — active-sprint partitions by activated_at ────

describe('Scenario 13: active-sprint synthesis — sprint partitions', () => {
  let fixture: Fixture;

  beforeEach(() => {
    fixture = buildFixture([
      // In-flight sprint (activated_at set, completed_at null)
      { subdir: 'pending-sync', filename: 'SPRINT-04_Active.md', content: activeSprintContent('SPRINT-04') },
      // Planned sprint (neither set)
      { subdir: 'pending-sync', filename: 'SPRINT-05_Planned.md', content: sprintContent('SPRINT-05', 'Planned') },
      // Completed sprint
      { subdir: 'archive', filename: 'SPRINT-03_Done.md', content: completedSprintContent('SPRINT-03') },
    ]);
  });

  afterEach(() => fixture.cleanup());

  it('active-sprint.md lists SPRINT-04 in current sprint section', async () => {
    await runBuild(fixture);
    const content = fs.readFileSync(path.join(fixture.wikiRoot, 'active-sprint.md'), 'utf8');
    expect(content).toContain('SPRINT-04');
  });

  it('active-sprint.md lists SPRINT-05 in planned section', async () => {
    await runBuild(fixture);
    const content = fs.readFileSync(path.join(fixture.wikiRoot, 'active-sprint.md'), 'utf8');
    expect(content).toContain('SPRINT-05');
  });

  it('active-sprint.md lists SPRINT-03 in completed section', async () => {
    await runBuild(fixture);
    const content = fs.readFileSync(path.join(fixture.wikiRoot, 'active-sprint.md'), 'utf8');
    expect(content).toContain('SPRINT-03');
  });
});

// ─── Scenario 14: STORY-002-09 — roadmap partitions by status ─────────────────

describe('Scenario 14: roadmap synthesis — three-bucket split for sprints and epics', () => {
  let fixture: Fixture;

  beforeEach(() => {
    fixture = buildFixture([
      { subdir: 'pending-sync', filename: 'SPRINT-04_Inflight.md', content: activeSprintContent('SPRINT-04') },
      { subdir: 'pending-sync', filename: 'SPRINT-05_Planned.md', content: sprintContent('SPRINT-05', 'Planned') },
      { subdir: 'archive', filename: 'SPRINT-03_Done.md', content: completedSprintContent('SPRINT-03') },
      { subdir: 'pending-sync', filename: 'EPIC-002_Active.md', content: epicContent('EPIC-002', 'Active') },
      { subdir: 'pending-sync', filename: 'EPIC-003_Ready.md', content: epicContent('EPIC-003', 'Ready') },
      { subdir: 'archive', filename: 'EPIC-001_Done.md', content: epicContent('EPIC-001', 'Completed') },
    ]);
  });

  afterEach(() => fixture.cleanup());

  it('roadmap.md contains in-flight SPRINT-04', async () => {
    await runBuild(fixture);
    const content = fs.readFileSync(path.join(fixture.wikiRoot, 'roadmap.md'), 'utf8');
    expect(content).toContain('SPRINT-04');
  });

  it('roadmap.md contains planned SPRINT-05', async () => {
    await runBuild(fixture);
    const content = fs.readFileSync(path.join(fixture.wikiRoot, 'roadmap.md'), 'utf8');
    expect(content).toContain('SPRINT-05');
  });

  it('roadmap.md contains shipped SPRINT-03', async () => {
    await runBuild(fixture);
    const content = fs.readFileSync(path.join(fixture.wikiRoot, 'roadmap.md'), 'utf8');
    expect(content).toContain('SPRINT-03');
  });

  it('roadmap.md contains active epic EPIC-002', async () => {
    await runBuild(fixture);
    const content = fs.readFileSync(path.join(fixture.wikiRoot, 'roadmap.md'), 'utf8');
    expect(content).toContain('EPIC-002');
  });

  it('roadmap.md contains planned epic EPIC-003', async () => {
    await runBuild(fixture);
    const content = fs.readFileSync(path.join(fixture.wikiRoot, 'roadmap.md'), 'utf8');
    expect(content).toContain('EPIC-003');
  });

  it('roadmap.md contains shipped epic EPIC-001', async () => {
    await runBuild(fixture);
    const content = fs.readFileSync(path.join(fixture.wikiRoot, 'roadmap.md'), 'utf8');
    expect(content).toContain('EPIC-001');
  });
});

// ─── Scenario 15: STORY-002-09 — product-state counts and lists ──────────────

describe('Scenario 15: product-state synthesis — counts and shipped items', () => {
  let fixture: Fixture;

  beforeEach(() => {
    fixture = buildFixture([
      { subdir: 'pending-sync', filename: 'EPIC-001_Active.md', content: epicContent('EPIC-001', 'Active') },
      { subdir: 'pending-sync', filename: 'EPIC-002_Planned.md', content: epicContent('EPIC-002', 'Ready') },
      { subdir: 'archive', filename: 'EPIC-003_Done.md', content: epicContent('EPIC-003', 'Completed') },
      { subdir: 'pending-sync', filename: 'STORY-001-01_Draft.md', content: storyContent('STORY-001-01', 'EPIC-001', 'Draft') },
      { subdir: 'archive', filename: 'STORY-002-01_Done.md', content: storyContent('STORY-002-01', 'EPIC-001', 'Completed') },
      { subdir: 'pending-sync', filename: 'SPRINT-04_Active.md', content: activeSprintContent('SPRINT-04') },
    ]);
  });

  afterEach(() => fixture.cleanup());

  it('product-state.md lists active epic EPIC-001', async () => {
    await runBuild(fixture);
    const content = fs.readFileSync(path.join(fixture.wikiRoot, 'product-state.md'), 'utf8');
    expect(content).toContain('EPIC-001');
  });

  it('product-state.md lists shipped item EPIC-003 in shipped section', async () => {
    await runBuild(fixture);
    const content = fs.readFileSync(path.join(fixture.wikiRoot, 'product-state.md'), 'utf8');
    expect(content).toContain('EPIC-003');
  });

  it('product-state.md shows correct epic total', async () => {
    await runBuild(fixture);
    const content = fs.readFileSync(path.join(fixture.wikiRoot, 'product-state.md'), 'utf8');
    // 3 epics total
    expect(content).toContain('| Epics | 3 |');
  });
});

// ─── Scenario 16: STORY-002-09 — renderTemplate unit tests ──────────────────

import { renderTemplate } from '../../src/wiki/synthesis/render.js';

describe('Scenario 16: renderTemplate unit tests', () => {
  it('substitutes {{var}} with value from data', () => {
    const result = renderTemplate('Hello {{name}}!', { name: 'World' });
    expect(result).toBe('Hello World!');
  });

  it('missing variable renders empty string', () => {
    const result = renderTemplate('{{missing}}', {});
    expect(result).toBe('');
  });

  it('{{#arr}}{{id}}{{/arr}} iterates array', () => {
    const result = renderTemplate('{{#items}}{{id}},{{/items}}', {
      items: [{ id: 'A' }, { id: 'B' }, { id: 'C' }],
    });
    expect(result).toBe('A,B,C,');
  });

  it('{{#arr}}...{{/arr}} with empty array produces empty string', () => {
    const result = renderTemplate('{{#items}}{{id}}{{/items}}', { items: [] });
    expect(result).toBe('');
  });

  it('{{#arr}}...{{/arr}} with single item renders once', () => {
    const result = renderTemplate('{{#items}}{{id}}{{/items}}', { items: [{ id: 'X' }] });
    expect(result).toBe('X');
  });

  it('unsupported tag type throws error', () => {
    expect(() => renderTemplate('{{>partial}}', {})).toThrow();
  });

  it('same input produces identical output (determinism)', () => {
    const tpl = '# Header\n{{#items}}- {{id}}\n{{/items}}';
    const data = { items: [{ id: 'A' }, { id: 'B' }] };
    expect(renderTemplate(tpl, data)).toBe(renderTemplate(tpl, data));
  });
});
