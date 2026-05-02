/**
 * Tests for STORY-008-02: readiness-predicates.ts
 * Covers all 6 predicate shapes (parse + evaluate) + sandbox tests.
 */
import { describe, it, expect, afterEach, vi } from 'vitest';
import * as os from 'node:os';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { parsePredicate, evaluate } from '../../src/lib/readiness-predicates.js';
import type { ParsedDoc } from '../../src/lib/readiness-predicates.js';

// ─── Fixture helpers ──────────────────────────────────────────────────────────

const tmpDirs: string[] = [];

function makeTmpDir(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cg-pred-test-'));
  tmpDirs.push(dir);
  return dir;
}

afterEach(() => {
  for (const dir of tmpDirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
  vi.restoreAllMocks();
});

function makeDoc(fm: Record<string, unknown>, body = '', absPath = '/tmp/test.md'): ParsedDoc {
  return { fm, body, absPath };
}

// ─── parsePredicate: accept all 6 shapes ─────────────────────────────────────

describe('parsePredicate — accepts all 6 shapes', () => {
  it('frontmatter(.) shape', () => {
    const p = parsePredicate('frontmatter(.).approved == true');
    expect(p.kind).toBe('frontmatter');
    if (p.kind === 'frontmatter') {
      expect(p.ref).toBe('.');
      expect(p.field).toBe('approved');
      expect(p.op).toBe('==');
      expect(p.value).toBe(true);
    }
  });

  it('frontmatter(context_source) shape', () => {
    const p = parsePredicate('frontmatter(context_source).approved == true');
    expect(p.kind).toBe('frontmatter');
    if (p.kind === 'frontmatter') {
      expect(p.ref).toBe('context_source');
      expect(p.field).toBe('approved');
    }
  });

  it('body-contains shape', () => {
    const p = parsePredicate("body contains 'TBD'");
    expect(p.kind).toBe('body-contains');
    if (p.kind === 'body-contains') {
      expect(p.needle).toBe('TBD');
      expect(p.negated).toBe(false);
    }
  });

  it('body-does-not-contain shape', () => {
    const p = parsePredicate("body does not contain 'TBD'");
    expect(p.kind).toBe('body-contains');
    if (p.kind === 'body-contains') {
      expect(p.needle).toBe('TBD');
      expect(p.negated).toBe(true);
    }
  });

  it('section shape with ≥', () => {
    const p = parsePredicate('section(2) has ≥1 checked-checkbox');
    expect(p.kind).toBe('section');
    if (p.kind === 'section') {
      expect(p.index).toBe(2);
      expect(p.count.op).toBe('>=');
      expect(p.count.n).toBe(1);
      expect(p.itemType).toBe('checked-checkbox');
    }
  });

  it('section shape with == ', () => {
    const p = parsePredicate('section(3) has ==0 listed-item');
    expect(p.kind).toBe('section');
    if (p.kind === 'section') {
      expect(p.count.op).toBe('==');
      expect(p.count.n).toBe(0);
      expect(p.itemType).toBe('listed-item');
    }
  });

  it('file-exists shape', () => {
    const p = parsePredicate('file-exists(.cleargate/knowledge/readiness-gates.md)');
    expect(p.kind).toBe('file-exists');
    if (p.kind === 'file-exists') {
      expect(p.path).toBe('.cleargate/knowledge/readiness-gates.md');
    }
  });

  it('link-target-exists shape', () => {
    const p = parsePredicate('link-target-exists([[STORY-003-13]])');
    expect(p.kind).toBe('link-target-exists');
    if (p.kind === 'link-target-exists') {
      expect(p.id).toBe('STORY-003-13');
    }
  });

  it('status-of shape', () => {
    const p = parsePredicate('status-of([[EPIC-008]]) == Active');
    expect(p.kind).toBe('status-of');
    if (p.kind === 'status-of') {
      expect(p.id).toBe('EPIC-008');
      expect(p.value).toBe('Active');
    }
  });
});

// ─── parsePredicate: rejects malformed predicates ────────────────────────────

describe('parsePredicate — rejects malformed predicates', () => {
  it('throws on eval injection', () => {
    expect(() => parsePredicate('eval(`rm -rf /`)')).toThrow('unsupported predicate shape');
  });

  it('throws on regex-style body match', () => {
    expect(() => parsePredicate('body matches /regex/')).toThrow('unsupported predicate shape');
  });

  it('throws on empty frontmatter ref', () => {
    expect(() => parsePredicate('frontmatter().foo == bar')).toThrow('unsupported predicate shape');
  });

  it('throws on non-numeric section index', () => {
    expect(() => parsePredicate('section(abc) has ≥1 checked-checkbox')).toThrow('unsupported predicate shape');
  });

  it('throws on random garbage', () => {
    expect(() => parsePredicate('just some random text')).toThrow('unsupported predicate shape');
  });
});

// ─── evaluate: frontmatter ────────────────────────────────────────────────────

describe('evaluate — frontmatter predicate', () => {
  it('frontmatter(.).approved == true → pass', () => {
    const doc = makeDoc({ approved: true });
    const result = evaluate('frontmatter(.).approved == true', doc);
    expect(result.pass).toBe(true);
  });

  it('frontmatter(.).approved == true → fail when false', () => {
    const doc = makeDoc({ approved: false });
    const result = evaluate('frontmatter(.).approved == true', doc);
    expect(result.pass).toBe(false);
  });

  it('frontmatter(.).parent_epic_ref != null → pass when set', () => {
    const doc = makeDoc({ parent_epic_ref: 'EPIC-008' });
    const result = evaluate('frontmatter(.).parent_epic_ref != null', doc);
    expect(result.pass).toBe(true);
  });

  it('frontmatter(.).parent_epic_ref != null → fail when null', () => {
    const doc = makeDoc({ parent_epic_ref: null });
    const result = evaluate('frontmatter(.).parent_epic_ref != null', doc);
    expect(result.pass).toBe(false);
  });

  it('frontmatter(context_source) resolves linked file', () => {
    const dir = makeTmpDir();
    const contextFile = path.join(dir, 'PROPOSAL-001.md');
    fs.writeFileSync(contextFile, '---\napproved: true\n---\n\nBody', 'utf8');

    const docPath = path.join(dir, 'EPIC-001.md');
    const doc = makeDoc({ context_source: 'PROPOSAL-001.md' }, 'body', docPath);
    const result = evaluate('frontmatter(context_source).approved == true', doc, { projectRoot: dir });
    expect(result.pass).toBe(true);
  });

  it('frontmatter(context_source) → fail when linked file missing', () => {
    const dir = makeTmpDir();
    const docPath = path.join(dir, 'EPIC-001.md');
    const doc = makeDoc({ context_source: 'NO_SUCH_FILE.md' }, 'body', docPath);
    const result = evaluate('frontmatter(context_source).approved == true', doc, { projectRoot: dir });
    expect(result.pass).toBe(false);
  });
});

// ─── evaluate: body-contains ──────────────────────────────────────────────────

describe('evaluate — body-contains predicate', () => {
  it("body contains 'TBD' → pass when TBD present", () => {
    const doc = makeDoc({}, '## Section 1\n\nSome TBD content here.\n');
    const result = evaluate("body contains 'TBD'", doc);
    expect(result.pass).toBe(true);
    expect(result.detail).toMatch(/found/);
  });

  it("body does not contain 'TBD' → fail when TBD present", () => {
    // Gherkin: "body-contains TBD fails no-tbds"
    const doc = makeDoc({}, '## Section 1\n\nSome TBD.\n## Section 2\n\nAnother TBD.');
    const result = evaluate("body does not contain 'TBD'", doc);
    expect(result.pass).toBe(false);
    // detail cites occurrence count and section
    expect(result.detail).toMatch(/2 occurrence/);
    expect(result.detail).toMatch(/§/);
  });

  it("body does not contain 'TBD' → pass when TBD absent", () => {
    const doc = makeDoc({}, '## Section 1\n\nAll good.\n');
    const result = evaluate("body does not contain 'TBD'", doc);
    expect(result.pass).toBe(true);
  });

  it("body contains 'STORY-' → fail when absent", () => {
    const doc = makeDoc({}, 'No story references here.');
    const result = evaluate("body contains 'STORY-'", doc);
    expect(result.pass).toBe(false);
  });
});

// ─── evaluate: section ───────────────────────────────────────────────────────

describe('evaluate — section predicate', () => {
  // Gherkin: "section checkbox count"
  it('section(2) has ≥1 checked-checkbox → pass', () => {
    const body = `## Section 1

Some intro.

## Section 2

- [x] First checked
- [x] Second checked
- [x] Third checked
- [ ] Unchecked one
`;
    const doc = makeDoc({}, body);
    const result = evaluate('section(2) has ≥1 checked-checkbox', doc);
    expect(result.pass).toBe(true);
  });

  it('section(2) has ≥1 checked-checkbox → fail when no checkboxes', () => {
    const body = `## Section 1

Some intro.

## Section 2

No checkboxes here.
`;
    const doc = makeDoc({}, body);
    const result = evaluate('section(2) has ≥1 checked-checkbox', doc);
    expect(result.pass).toBe(false);
  });

  it('section(1) has ≥1 listed-item → pass', () => {
    const body = `## Section 1

- item one
- item two

## Section 2

Empty.
`;
    const doc = makeDoc({}, body);
    const result = evaluate('section(1) has ≥1 listed-item', doc);
    expect(result.pass).toBe(true);
  });

  it('section(3) has ≥3 listed-item → pass with exactly 3', () => {
    const body = `## Section 1

Intro.

## Section 2

Middle.

## Section 3

- step one
- step two
- step three
`;
    const doc = makeDoc({}, body);
    const result = evaluate('section(3) has ≥3 listed-item', doc);
    expect(result.pass).toBe(true);
  });

  it('section(3) has ≥3 listed-item → fail with only 2', () => {
    const body = `## Section 1

Intro.

## Section 2

Middle.

## Section 3

- step one
- step two
`;
    const doc = makeDoc({}, body);
    const result = evaluate('section(3) has ≥3 listed-item', doc);
    expect(result.pass).toBe(false);
  });

  it('section(99) → fail with "not found" detail', () => {
    const doc = makeDoc({}, '## Section 1\n\nContent.\n');
    const result = evaluate('section(99) has ≥1 listed-item', doc);
    expect(result.pass).toBe(false);
    expect(result.detail).toMatch(/not found/);
  });
});

// ─── evaluate: file-exists ────────────────────────────────────────────────────

describe('evaluate — file-exists predicate', () => {
  // Gherkin: "file-exists on missing path"
  it('file-exists on missing path → fail', () => {
    const dir = makeTmpDir();
    const result = evaluate('file-exists(cleargate-cli/src/no-such.ts)', makeDoc({}), { projectRoot: dir });
    expect(result.pass).toBe(false);
  });

  it('file-exists on existing file → pass', () => {
    const dir = makeTmpDir();
    fs.writeFileSync(path.join(dir, 'existing.md'), 'content', 'utf8');
    const result = evaluate('file-exists(existing.md)', makeDoc({}), { projectRoot: dir });
    expect(result.pass).toBe(true);
  });
});

// ─── evaluate: link-target-exists ────────────────────────────────────────────

describe('evaluate — link-target-exists predicate', () => {
  // Gherkin: "link-target-exists resolves via wiki index"
  it('link-target-exists → pass when ID in wiki index', () => {
    const dir = makeTmpDir();
    const wikiDir = path.join(dir, '.cleargate', 'wiki');
    fs.mkdirSync(wikiDir, { recursive: true });
    const wikiIndexPath = path.join(wikiDir, 'index.md');
    fs.writeFileSync(
      wikiIndexPath,
      '# Wiki Index\n\n| [[STORY-003-13]] | story | Draft | .cleargate/delivery/pending-sync/STORY-003-13.md |\n',
      'utf8'
    );

    const result = evaluate(
      'link-target-exists([[STORY-003-13]])',
      makeDoc({}),
      { projectRoot: dir, wikiIndexPath }
    );
    expect(result.pass).toBe(true);
  });

  it('link-target-exists → fail when ID not in wiki index', () => {
    const dir = makeTmpDir();
    const wikiDir = path.join(dir, '.cleargate', 'wiki');
    fs.mkdirSync(wikiDir, { recursive: true });
    const wikiIndexPath = path.join(wikiDir, 'index.md');
    fs.writeFileSync(wikiIndexPath, '# Wiki Index\n\n(empty)\n', 'utf8');

    const result = evaluate(
      'link-target-exists([[STORY-003-13]])',
      makeDoc({}),
      { projectRoot: dir, wikiIndexPath }
    );
    expect(result.pass).toBe(false);
  });

  it('link-target-exists → fail when wiki index missing', () => {
    const dir = makeTmpDir();
    const result = evaluate('link-target-exists([[STORY-003-13]])', makeDoc({}), { projectRoot: dir });
    expect(result.pass).toBe(false);
  });
});

// ─── evaluate: status-of ─────────────────────────────────────────────────────

describe('evaluate — status-of predicate', () => {
  it('status-of reads linked file frontmatter.status → pass', () => {
    const dir = makeTmpDir();
    const deliveryDir = path.join(dir, '.cleargate', 'delivery', 'pending-sync');
    fs.mkdirSync(deliveryDir, { recursive: true });
    const epicFile = path.join(deliveryDir, 'EPIC-008.md');
    fs.writeFileSync(epicFile, '---\nstatus: Active\n---\n\nBody.', 'utf8');

    const wikiDir = path.join(dir, '.cleargate', 'wiki');
    fs.mkdirSync(wikiDir, { recursive: true });
    const wikiIndexPath = path.join(wikiDir, 'index.md');
    fs.writeFileSync(
      wikiIndexPath,
      '# Wiki Index\n\n| [[EPIC-008]] | epic | Active | .cleargate/delivery/pending-sync/EPIC-008.md |\n',
      'utf8'
    );

    const result = evaluate(
      'status-of([[EPIC-008]]) == Active',
      makeDoc({}),
      { projectRoot: dir, wikiIndexPath }
    );
    expect(result.pass).toBe(true);
  });

  it('status-of → fail when status does not match', () => {
    const dir = makeTmpDir();
    const deliveryDir = path.join(dir, '.cleargate', 'delivery', 'pending-sync');
    fs.mkdirSync(deliveryDir, { recursive: true });
    const epicFile = path.join(deliveryDir, 'EPIC-008.md');
    fs.writeFileSync(epicFile, '---\nstatus: Draft\n---\n\nBody.', 'utf8');

    const wikiDir = path.join(dir, '.cleargate', 'wiki');
    fs.mkdirSync(wikiDir, { recursive: true });
    const wikiIndexPath = path.join(wikiDir, 'index.md');
    fs.writeFileSync(
      wikiIndexPath,
      '# Wiki Index\n\n| [[EPIC-008]] | epic | Draft | .cleargate/delivery/pending-sync/EPIC-008.md |\n',
      'utf8'
    );

    const result = evaluate(
      'status-of([[EPIC-008]]) == Active',
      makeDoc({}),
      { projectRoot: dir, wikiIndexPath }
    );
    expect(result.pass).toBe(false);
    expect(result.detail).toMatch(/Draft/);
  });
});

// ─── Sandbox tests ────────────────────────────────────────────────────────────

describe('sandbox: evaluator restrictions', () => {
  it('rejects FS reads outside projectRoot (path traversal)', () => {
    const dir = makeTmpDir();
    // Attempt to escape sandbox via file-exists
    const result = evaluate('file-exists(../../etc/passwd)', makeDoc({}), { projectRoot: dir });
    // Should return fail (not a real file relative to projectRoot) or sandbox violation
    // The important thing is it does NOT successfully access /etc/passwd
    expect(result.pass).toBe(false);
    // Either "not found" or "sandbox violation" detail
    expect(result.detail).toMatch(/not found|sandbox/i);
  });

  it('does not import child_process (sandbox: no shell-out)', async () => {
    // Verify that readiness-predicates.ts source does not use child_process or execSync
    const { readFileSync } = await import('node:fs');
    const src = readFileSync(
      path.join('/Users/ssuladze/Documents/Dev/ClearGate', 'cleargate-cli/src/lib/readiness-predicates.ts'),
      'utf8'
    );
    expect(src).not.toContain('child_process');
    expect(src).not.toContain('execSync');
    expect(src).not.toContain('spawnSync');
  });
});

// ─── readiness-gates.md smoke test ───────────────────────────────────────────

describe('smoke test: readiness-gates.md parses correctly', () => {
  it('js-yaml parse of readiness-gates.md returns 7 blocks (6 original + sprint gate added by CR-027)', async () => {
    const yaml = await import('js-yaml');
    const gatesPath = path.join(
      '/Users/ssuladze/Documents/Dev/ClearGate',
      '.cleargate/knowledge/readiness-gates.md'
    );
    const raw = fs.readFileSync(gatesPath, 'utf8');
    // Extract fenced yaml blocks
    const yamlBlocks: string[] = [];
    const blockRe = /```yaml\n([\s\S]*?)```/g;
    let match;
    while ((match = blockRe.exec(raw)) !== null) {
      yamlBlocks.push(match[1]!);
    }
    // CR-027 added sprint.ready-for-execution gate (7th block); CR-028 adds no new gate blocks
    expect(yamlBlocks).toHaveLength(7);
    // Each block is a YAML array with a single element
    const parsed = yamlBlocks.map((b) => {
      const arr = yaml.load(b) as unknown[];
      return arr[0] as Record<string, unknown>;
    });
    for (const block of parsed) {
      expect(block).toHaveProperty('work_item_type');
      expect(block).toHaveProperty('transition');
      expect(block).toHaveProperty('severity');
      expect(block).toHaveProperty('criteria');
    }
  });

  it('every criterion.check parses via parsePredicate without throwing', async () => {
    const yaml = await import('js-yaml');
    const gatesPath = path.join(
      '/Users/ssuladze/Documents/Dev/ClearGate',
      '.cleargate/knowledge/readiness-gates.md'
    );
    const raw = fs.readFileSync(gatesPath, 'utf8');
    const yamlBlocks: string[] = [];
    const blockRe = /```yaml\n([\s\S]*?)```/g;
    let match;
    while ((match = blockRe.exec(raw)) !== null) {
      yamlBlocks.push(match[1]!);
    }
    for (const blockStr of yamlBlocks) {
      const arr = yaml.load(blockStr) as unknown[];
      const block = arr[0] as { criteria: { id: string; check: string }[] };
      for (const criterion of block.criteria) {
        expect(() => parsePredicate(criterion.check)).not.toThrow();
      }
    }
  });

  it('smoke: evaluate ≥1 real pending-sync item against proposal gate', () => {
    const projectRoot = '/Users/ssuladze/Documents/Dev/ClearGate';
    const pendingSyncDir = path.join(projectRoot, '.cleargate', 'delivery', 'pending-sync');
    const files = fs.readdirSync(pendingSyncDir).filter((f) => f.endsWith('.md'));
    // Just need one file to exercise the evaluator
    expect(files.length).toBeGreaterThan(0);

    const sampleFile = path.join(pendingSyncDir, files[0]!);
    const raw = fs.readFileSync(sampleFile, 'utf8');
    // Check if it has frontmatter
    if (!raw.startsWith('---')) return;

    const lines = raw.split('\n');
    let closeIdx = -1;
    for (let i = 1; i < lines.length; i++) {
      if (lines[i] === '---') { closeIdx = i; break; }
    }
    if (closeIdx === -1) return;

    const fmLines = lines.slice(1, closeIdx);
    const fm: Record<string, unknown> = {};
    for (const line of fmLines) {
      const colon = line.indexOf(':');
      if (colon === -1) continue;
      const key = line.slice(0, colon).trim();
      const val = line.slice(colon + 1).trim().replace(/^["']|["']$/g, '');
      fm[key] = val;
    }

    const bodyLines = lines.slice(closeIdx + 1);
    if (bodyLines[0] === '') bodyLines.shift();
    const body = bodyLines.join('\n');

    const doc: ParsedDoc = { fm, body, absPath: sampleFile };

    // Evaluate the "no-tbds" predicate which works on any item
    const result = evaluate("body does not contain 'TBD'", doc, { projectRoot });
    // Result may be pass or fail — just assert it runs without error
    expect(typeof result.pass).toBe('boolean');
    expect(typeof result.detail).toBe('string');
  });
});

// ─── BUG-008 regression tests ─────────────────────────────────────────────────

// Sub-fix #1: proposal-approved prose-vs-path heuristic

describe('BUG-008 sub-fix #1 — proposal-approved prose-vs-path heuristic', () => {
  it('R-08: context_source is prose with approved_by + approved_at → pass', () => {
    const dir = makeTmpDir();
    const docPath = path.join(dir, 'EPIC-021.md');
    const doc = makeDoc(
      {
        context_source:
          'User direct request 2026-04-25 — proposal gate waived (sharp intent + inline references). ' +
          'All interrogation questions ratified.',
        approved_by: 'sandrinio',
        approved_at: '2026-04-25T00:00:00Z',
      },
      'body text',
      docPath
    );
    const result = evaluate('frontmatter(context_source).approved == true', doc, { projectRoot: dir });
    expect(result.pass).toBe(true);
    expect(result.detail).toMatch(/prose.*waiver|waiver.*prose/i);
  });

  it('R-08: context_source is prose WITHOUT waiver fields → fail', () => {
    const dir = makeTmpDir();
    const docPath = path.join(dir, 'EPIC-014.md');
    const doc = makeDoc(
      {
        context_source:
          'User direct request 2026-04-14 — some prose explanation without proper waiver fields.',
      },
      'body text',
      docPath
    );
    const result = evaluate('frontmatter(context_source).approved == true', doc, { projectRoot: dir });
    expect(result.pass).toBe(false);
    expect(result.detail).toMatch(/no proposal_gate_waiver/i);
  });

  it('R-08 regression: context_source is "PROPOSAL-999.md" (no spaces, file does NOT exist) → fail even with waiver fields', () => {
    // This is the critical regression test: a path-like value must still fail
    // when the referenced file does not exist, even if waiver fields are present.
    const dir = makeTmpDir();
    const docPath = path.join(dir, 'EPIC-TEST.md');
    const doc = makeDoc(
      {
        context_source: 'PROPOSAL-999.md',
        approved_by: 'sandrinio',
        approved_at: '2026-04-25T00:00:00Z',
      },
      'body text',
      docPath
    );
    const result = evaluate('frontmatter(context_source).approved == true', doc, { projectRoot: dir });
    expect(result.pass).toBe(false);
    expect(result.detail).toMatch(/linked file not found/i);
  });

  it('R-08 happy path: context_source is "PROPOSAL-001.md" and file exists with approved: true → pass', () => {
    const dir = makeTmpDir();
    const proposalFile = path.join(dir, 'PROPOSAL-001.md');
    fs.writeFileSync(proposalFile, '---\napproved: true\n---\n\nProposal body.', 'utf8');
    const docPath = path.join(dir, 'EPIC-001.md');
    const doc = makeDoc({ context_source: 'PROPOSAL-001.md' }, 'body', docPath);
    const result = evaluate('frontmatter(context_source).approved == true', doc, { projectRoot: dir });
    expect(result.pass).toBe(true);
  });

  it('R-08 sandbox: path traversal "../../../etc/passwd" does not pass via prose heuristic', () => {
    // "../../../etc/passwd" has no space/em-dash/etc — looks like a path → falls through to resolveLinkedPath
    // resolveLinkedPath rejects it as outside projectRoot (sandbox violation) → returns null → fail
    const dir = makeTmpDir();
    const docPath = path.join(dir, 'EPIC-X.md');
    const doc = makeDoc(
      { context_source: '../../../etc/passwd', approved_by: 'attacker', approved_at: '2026-01-01' },
      'body',
      docPath
    );
    const result = evaluate('frontmatter(context_source).approved == true', doc, { projectRoot: dir });
    expect(result.pass).toBe(false);
  });
});

// Sub-fix #2: no-tbds marker semantics

describe('BUG-008 sub-fix #2 — no-tbds marker semantics', () => {
  it('body containing "TBD: <reason>" → fails (genuine marker with colon)', () => {
    const doc = makeDoc({}, '## Section 1\n\nTBD: figure out the architecture.\n');
    const result = evaluate("body does not contain marker 'TBD'", doc);
    expect(result.pass).toBe(false);
    expect(result.detail).toMatch(/occurrence/);
  });

  it('body containing "(TBD)" → fails (parens-bound)', () => {
    const doc = makeDoc({}, '## Section 1\n\nThis feature is (TBD) pending review.\n');
    const result = evaluate("body does not contain marker 'TBD'", doc);
    expect(result.pass).toBe(false);
  });

  it('body containing bare line "TBD" → fails (entire trimmed line)', () => {
    const doc = makeDoc({}, '## Section 1\n\nTBD\n\nMore text.\n');
    const result = evaluate("body does not contain marker 'TBD'", doc);
    expect(result.pass).toBe(false);
  });

  it('body containing prose "TBD resolution" → passes (noun usage, not a marker)', () => {
    // This is the CR-010 false-positive case
    const doc = makeDoc({}, '## Section 2\n\nThis CR drives TBD resolution across all open work items.\n');
    const result = evaluate("body does not contain marker 'TBD'", doc);
    expect(result.pass).toBe(true);
  });

  it('body containing "TBDs" (plural) → passes (not a marker)', () => {
    const doc = makeDoc({}, '## Section 1\n\nThe following TBDs were addressed in this sprint.\n');
    const result = evaluate("body does not contain marker 'TBD'", doc);
    expect(result.pass).toBe(true);
  });

  it('template self-reference line "- [x] 0 "TBDs" exist in the document." → passes (boilerplate excluded)', () => {
    // This is the EPIC-020 false-positive case
    const doc = makeDoc({}, '## Pass Criteria\n\n- [x] 0 "TBDs" exist in the document.\n- [x] All done.\n');
    const result = evaluate("body does not contain marker 'TBD'", doc);
    expect(result.pass).toBe(true);
  });

  it('body containing "TODO:" → fails (TODO marker with colon)', () => {
    const doc = makeDoc({}, '## Section 1\n\nTODO: implement this function\n');
    const result = evaluate("body does not contain marker 'TODO'", doc);
    expect(result.pass).toBe(false);
  });

  it('body containing "FIXME:" → fails (FIXME marker with colon)', () => {
    const doc = makeDoc({}, '## Section 1\n\nFIXME: broken logic here\n');
    const result = evaluate("body does not contain marker 'FIXME'", doc);
    expect(result.pass).toBe(false);
  });
});

// parsePredicate: marker-absence shape

describe('BUG-008 sub-fix #2 — parsePredicate marker-absence shape', () => {
  it('parses "body does not contain marker \'TBD\'" correctly', () => {
    const p = parsePredicate("body does not contain marker 'TBD'");
    expect(p.kind).toBe('marker-absence');
    if (p.kind === 'marker-absence') {
      expect(p.marker).toBe('TBD');
    }
  });

  it('parses "body does not contain marker \'TODO\'" correctly', () => {
    const p = parsePredicate("body does not contain marker 'TODO'");
    expect(p.kind).toBe('marker-absence');
    if (p.kind === 'marker-absence') {
      expect(p.marker).toBe('TODO');
    }
  });

  it('throws on unsupported marker "UNKNOWN"', () => {
    expect(() => parsePredicate("body does not contain marker 'UNKNOWN'")).toThrow('unsupported predicate shape');
  });
});

// Sub-fix #3: blast-radius-populated section index

describe('BUG-008 sub-fix #3 — blast-radius-populated section index', () => {
  it('CR fixture with §1 containing bullets AND §2 empty → fails (blast-radius targets §2)', () => {
    // Original bug: section(1) had items but gate expected blast-radius in §2
    const body = `## 1. The Context Override (Old vs. New)

- Old: we used Stripe
- New: we use PayPal

## 2. Blast Radius & Invalidation

(empty — no blast radius items listed)

## 3. Execution Sandbox

- src/payments.ts
`;
    const doc = makeDoc({}, body);
    // gate definition now uses section(2), so §2 empty → fail
    const result = evaluate('section(2) has ≥1 listed-item', doc);
    expect(result.pass).toBe(false);
    expect(result.detail).toMatch(/section 2/);
  });

  it('CR fixture with §2 containing ≥1 bullet → passes', () => {
    const body = `## 1. The Context Override (Old vs. New)

- Old: we used Stripe

## 2. Blast Radius & Invalidation

- STORY-003-05: payment flow must be re-tested
- EPIC-007: pricing epic needs review

## 3. Execution Sandbox

- src/payments.ts
`;
    const doc = makeDoc({}, body);
    const result = evaluate('section(2) has ≥1 listed-item', doc);
    expect(result.pass).toBe(true);
  });
});

// ─── CR-028 code-truth triage criteria ───────────────────────────────────────

describe('CR-028 code-truth triage criteria', () => {
  // Scenario 1 — Epic with both new sections present → both new criteria pass.
  it('Epic with ## Existing Surfaces AND ## Why not simpler? → reuse-audit-recorded + simplest-form-justified pass', () => {
    const body = `## 1. Problem & Value

Why we are doing this.

## Existing Surfaces

- **Surface:** \`cleargate-cli/src/lib/readiness-predicates.ts:1\` — predicate evaluator
- **Coverage of this epic's scope:** ≥80% extension — this epic extends the evaluator

## Why not simpler?

- **Smallest existing surface that could carry this:** \`readiness-predicates.ts\`
- **Why isn't extension / parameterization / config sufficient?** New predicate shapes are needed.

## 2. Scope Boundaries

- [ ] Some capability
`;
    const doc = makeDoc({ epic_id: 'EPIC-TEST', context_source: 'PROPOSAL-001.md' }, body);

    const resultReuse = evaluate("body contains '## Existing Surfaces'", doc);
    expect(resultReuse.pass).toBe(true);

    const resultSimpler = evaluate("body contains '## Why not simpler?'", doc);
    expect(resultSimpler.pass).toBe(true);
  });

  // Scenario 2 — Epic missing ## Existing Surfaces → reuse-audit-recorded fails.
  it('Epic missing ## Existing Surfaces → reuse-audit-recorded fails with non-empty detail', () => {
    const body = `## 1. Problem & Value

Some content.

## Why not simpler?

- **Smallest existing surface:** none
- **Why not sufficient?** Net-new abstraction required.
`;
    const doc = makeDoc({ epic_id: 'EPIC-TEST', context_source: 'PROPOSAL-001.md' }, body);

    const result = evaluate("body contains '## Existing Surfaces'", doc);
    expect(result.pass).toBe(false);
    expect(result.detail.length).toBeGreaterThan(0);
  });

  // Scenario 3 — Story missing ## Why not simpler? → simplest-form-justified fails.
  it('Story missing ## Why not simpler? → simplest-form-justified fails', () => {
    const body = `## 1. The Spec

Some spec content.

## Existing Surfaces

- **Surface:** \`cleargate-cli/src/commands/gate.ts:1\` — gate check handler
- **Coverage:** partial

## 2. The Truth

Gherkin here.
`;
    const doc = makeDoc({ story_id: 'STORY-TEST', parent_epic_ref: 'EPIC-001' }, body);

    const result = evaluate("body contains '## Why not simpler?'", doc);
    expect(result.pass).toBe(false);
  });

  // Scenario 4 — CR with ## Existing Surfaces present → reuse-audit-recorded passes;
  // simplest-form-justified is NOT in cr.ready-to-apply criteria.
  it('CR with ## Existing Surfaces present → reuse-audit-recorded passes; simplest-form-justified absent from cr.ready-to-apply', () => {
    const body = `## 1. The Context Override

Old: no reuse check.
New: reuse check required.

## 2. Blast Radius

- STORY-003: invalidated

## Existing Surfaces

- **Surface:** \`cleargate-cli/src/lib/readiness-predicates.ts:1\` — predicate evaluator
- **Why this CR extends:** extends existing surface, does not rebuild.

## 3. Execution Sandbox

Modify: \`readiness-gates.md\`
`;
    const doc = makeDoc({ cr_id: 'CR-TEST', context_source: 'PROPOSAL-001.md' }, body);

    const resultReuse = evaluate("body contains '## Existing Surfaces'", doc);
    expect(resultReuse.pass).toBe(true);

    // Negative assertion: cr.ready-to-apply must NOT include simplest-form-justified.
    const gatesPath = path.join(
      '/Users/ssuladze/Documents/Dev/ClearGate/.worktrees/CR-028',
      '.cleargate/knowledge/readiness-gates.md'
    );
    const gatesContent = fs.readFileSync(gatesPath, 'utf8');
    // Extract the cr.ready-to-apply block
    const crBlockMatch = gatesContent.match(/work_item_type: cr[\s\S]*?transition: ready-to-apply[\s\S]*?```/);
    expect(crBlockMatch).not.toBeNull();
    const crBlock = crBlockMatch![0];
    expect(crBlock).not.toContain('simplest-form-justified');
  });
});
