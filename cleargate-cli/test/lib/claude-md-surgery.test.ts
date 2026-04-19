import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join } from 'path';
import { readBlock, writeBlock, removeBlock, CLEARGATE_START, CLEARGATE_END } from '../../src/lib/claude-md-surgery.js';

const FIXTURE_DIR = join(import.meta.dirname, '../fixtures/claude-md');

// Helper: build a minimal CLAUDE.md string with the given block body
function mkDoc(before: string, body: string, after: string): string {
  return `${before}${CLEARGATE_START}${body}${CLEARGATE_END}${after}`;
}

describe('readBlock', () => {
  it('happy path: extracts content between markers', () => {
    const content = `BEFORE\n${CLEARGATE_START}\nHELLO\n${CLEARGATE_END}\nAFTER`;
    const result = readBlock(content);
    expect(result).toBe('\nHELLO\n');
  });

  it('GREEDY regex handles body-mentions of markers (FLASHCARD 2026-04-19 #init #inject-claude-md #regex)', () => {
    const fixture = readFileSync(join(FIXTURE_DIR, 'with-prose-mention.md'), 'utf8');
    const result = readBlock(fixture);

    // Must return non-null
    expect(result).not.toBeNull();

    // The prose mention line must be INSIDE the returned body
    // (backtick-quoted inline markers as they appear in the fixture)
    expect(result).toContain('`<!-- CLEARGATE:START -->...<!-- CLEARGATE:END -->`');

    // The line after the prose mention must also be present (proves no early cutoff)
    expect(result).toContain('More content after the prose mention to confirm we got the full block.');

    // Content after the real END marker must NOT be in the result
    expect(result).not.toContain('This content is AFTER the block and must not be included.');
  });

  it('returns null when markers are missing', () => {
    const content = 'No markers here at all';
    expect(readBlock(content)).toBeNull();
  });
});

describe('writeBlock', () => {
  it('happy path: replaces block body and preserves surrounding content', () => {
    const before = 'BEFORE\n';
    const after = '\nAFTER';
    const original = mkDoc(before, '\nOLD CONTENT\n', after);

    const result = writeBlock(original, '\nNEW\n');

    expect(result).toContain('BEFORE');
    expect(result).toContain('AFTER');
    expect(result).toContain('\nNEW\n');
    expect(result).not.toContain('OLD CONTENT');
    expect(result.startsWith('BEFORE')).toBe(true);
    expect(result.endsWith('AFTER')).toBe(true);
  });

  it('throws on missing start marker', () => {
    const content = 'No markers here';
    expect(() => writeBlock(content, 'NEW')).toThrow(
      'CLAUDE.md is missing <!-- CLEARGATE:START --> marker'
    );
  });

  it('throws when end marker is missing but start is present', () => {
    const content = `${CLEARGATE_START}\nsome content\n`;
    expect(() => writeBlock(content, 'NEW')).toThrow(
      'CLAUDE.md is missing <!-- CLEARGATE:END --> marker'
    );
  });

  it('writeBlock is idempotent: calling twice with same body produces byte-identical result', () => {
    const original = mkDoc('BEFORE\n', '\nOLD\n', '\nAFTER');
    const once = writeBlock(original, '\nNEW\n');
    const twice = writeBlock(once, '\nNEW\n');
    expect(twice).toBe(once);
  });
});

describe('removeBlock', () => {
  it('strips both markers and content between them, leaving surroundings intact', () => {
    const before = 'BEFORE\n';
    const after = '\nAFTER';
    const original = mkDoc(before, '\nCONTENT\n', after);

    const result = removeBlock(original);

    expect(result).toBe('BEFORE\n\nAFTER');
    expect(result).not.toContain(CLEARGATE_START);
    expect(result).not.toContain(CLEARGATE_END);
    expect(result).not.toContain('CONTENT');
  });

  it('throws when start marker is missing', () => {
    const content = 'No markers here';
    expect(() => removeBlock(content)).toThrow(
      'CLAUDE.md is missing <!-- CLEARGATE:START --> marker'
    );
  });
});

describe('dogfood sanity', () => {
  it('readBlock on the live repo CLAUDE.md returns the ClearGate block', () => {
    // Absolute path per instructions — this test verifies the real file.
    const claudeMd = readFileSync(
      '/Users/ssuladze/Documents/Dev/ClearGate/CLAUDE.md',
      'utf8'
    );
    const result = readBlock(claudeMd);

    expect(result).not.toBeNull();
    // The block starts with the ClearGate Planning Framework heading
    expect(result).toContain('## 🔄 ClearGate Planning Framework');
  });
});
