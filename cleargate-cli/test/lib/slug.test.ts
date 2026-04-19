/**
 * slug.test.ts — STORY-010-05
 *
 * Tests for slugify() and nextProposalId() helpers.
 *
 * Test inventory:
 *   1. plainAscii — plain ASCII title slugified correctly
 *   2. specialChars — special chars and spaces replaced with dashes
 *   3. unicodeStripped — accented/unicode characters normalized then retained
 *   4. truncates — truncation at max with trailing dash re-trim
 *   5. emptyReturnsUntitled — empty + whitespace-only + all-special → "untitled"
 *   6. scansBothDirs — nextProposalId reads pending-sync + archive
 *   7. gapTolerant — nextProposalId returns max+1 (not first gap)
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { slugify, nextProposalId } from '../../src/lib/slug.js';

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeTmpDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'cg-slug-test-'));
}

function cleanup(dir: string): void {
  fs.rmSync(dir, { recursive: true, force: true });
}

function writeProposal(dir: string, filename: string, proposalId: string): void {
  const content = `---\nproposal_id: "${proposalId}"\nstatus: "Draft"\n---\n\n# Body\n`;
  fs.writeFileSync(path.join(dir, filename), content, 'utf8');
}

// ── slugify ───────────────────────────────────────────────────────────────────

describe('slugify', () => {
  it('plainAscii: lowercases and joins with dashes', () => {
    expect(slugify('Refund Flow Redesign')).toBe('refund-flow-redesign');
  });

  it('specialChars: replaces punctuation runs with a single dash', () => {
    expect(slugify('Hello, World! -- A Test')).toBe('hello-world-a-test');
  });

  it('unicodeStripped: NFKD normalization preserves base letters', () => {
    // "Déjà vu — naïve" → deja-vu-naive (accents stripped, em-dash replaced)
    expect(slugify('Déjà vu — naïve')).toBe('deja-vu-naive');
  });

  it('truncates: truncates to max chars and re-trims trailing dash', () => {
    // "Allow users — billing/accounts — to export CSVs & also PDFs !!!"
    // After slugify (no limit): allow-users-billing-accounts-to-export-csvs-also-pdfs
    // At 40 chars: "allow-users-billing-accounts-to-export-c" → 40 chars, no trailing dash
    const result = slugify('Allow users — billing/accounts — to export CSVs & also PDFs !!!', 40);
    expect(result.length).toBeLessThanOrEqual(40);
    expect(result).not.toMatch(/-$/);
    // Should start with 'allow-users'
    expect(result).toMatch(/^allow-users/);
  });

  it('emptyReturnsUntitled: empty string → "untitled"', () => {
    expect(slugify('')).toBe('untitled');
  });

  it('whitespaceOnlyReturnsUntitled: whitespace-only → "untitled"', () => {
    expect(slugify('   ')).toBe('untitled');
  });

  it('allSpecialReturnsUntitled: all-special chars → "untitled"', () => {
    expect(slugify('!!!')).toBe('untitled');
  });

  it('cjkStripped: CJK characters stripped, falls back to untitled', () => {
    // CJK characters are stripped by [^a-z0-9]+ replacement
    expect(slugify('日本語タイトル')).toBe('untitled');
  });
});

// ── nextProposalId ────────────────────────────────────────────────────────────

describe('nextProposalId', () => {
  let tmpDir: string;
  let pendingSync: string;
  let archive: string;

  beforeEach(() => {
    tmpDir = makeTmpDir();
    pendingSync = path.join(tmpDir, '.cleargate', 'delivery', 'pending-sync');
    archive = path.join(tmpDir, '.cleargate', 'delivery', 'archive');
    fs.mkdirSync(pendingSync, { recursive: true });
    fs.mkdirSync(archive, { recursive: true });
  });

  afterEach(() => cleanup(tmpDir));

  it('scansBothDirs: picks max from pending-sync + archive combined', async () => {
    // archive has PROP-030, pending-sync has PROP-031 → next is PROP-032
    writeProposal(archive, 'PROPOSAL-030-foo.md', 'PROP-030');
    writeProposal(pendingSync, 'PROPOSAL-031-bar.md', 'PROP-031');

    const result = await nextProposalId(tmpDir);
    expect(result).toBe('PROP-032');
  });

  it('gapTolerant: returns max+1 not first gap', async () => {
    // Has PROP-001 and PROP-031 (gap at 2-30) → max+1 = PROP-032
    writeProposal(archive, 'PROPOSAL-001-foo.md', 'PROP-001');
    writeProposal(pendingSync, 'PROPOSAL-031-bar.md', 'PROP-031');

    const result = await nextProposalId(tmpDir);
    expect(result).toBe('PROP-032');
  });

  it('emptyDirs: returns PROP-001 when no proposals exist', async () => {
    const result = await nextProposalId(tmpDir);
    expect(result).toBe('PROP-001');
  });

  it('unquotedFrontmatter: handles unquoted proposal_id: PROP-NNN', async () => {
    // Some archived proposals use unquoted form
    const content = `---\nproposal_id: PROP-010\nstatus: Approved\n---\n\n# Body\n`;
    fs.writeFileSync(path.join(archive, 'PROPOSAL-010-old.md'), content, 'utf8');

    const result = await nextProposalId(tmpDir);
    expect(result).toBe('PROP-011');
  });
});
