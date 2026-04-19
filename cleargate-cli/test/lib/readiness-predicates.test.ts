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
  it('js-yaml parse of readiness-gates.md returns 6 blocks', async () => {
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
    expect(yamlBlocks).toHaveLength(6);
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
