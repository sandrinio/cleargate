/**
 * Tests for CR-032: Surface Gate Failures + Literal-Criterion Rule.
 *
 * Verifies 3 Gherkin scenarios from M2 plan §CR-032 test shape:
 *   1. CLAUDE.md literal-rule paragraph present in both live + canonical.
 *   2. 5 templates carry the preamble (live + canonical pairs).
 *   3. Mirror parity — new paragraph region is byte-identical in live + canonical CLAUDE.md.
 */
import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';

// test/scripts/template-claude-md.test.ts → up 3 levels → cleargate-cli/ → up 1 → repo root
const REPO_ROOT = path.resolve(new URL(import.meta.url).pathname, '..', '..', '..', '..');

const LIVE_CLAUDE_MD = path.join(REPO_ROOT, 'CLAUDE.md');
const CANONICAL_CLAUDE_MD = path.join(REPO_ROOT, 'cleargate-planning', 'CLAUDE.md');

const LIVE_TEMPLATES_DIR = path.join(REPO_ROOT, '.cleargate', 'templates');
const CANONICAL_TEMPLATES_DIR = path.join(REPO_ROOT, 'cleargate-planning', '.cleargate', 'templates');

// The 5 templates that have an Ambiguity Gate footer per M2 plan Architect audit.
const FOOTER_TEMPLATES = ['Bug.md', 'CR.md', 'epic.md', 'hotfix.md', 'story.md'];

const LITERAL_RULE_PHRASE = 'Ambiguity Gate criteria are evaluated literally';
const TEMPLATE_PREAMBLE_PHRASE = 'Evaluate each criterion against its literal text. If you substituted an interpretation, leave the box unchecked and surface the substitution in the Brief.';

// ─────────────────────────────────────────────────────────────────────────────
// Scenario 1: CLAUDE.md literal-rule paragraph present in both live + canonical
// ─────────────────────────────────────────────────────────────────────────────
describe('Scenario: CLAUDE.md literal-rule paragraph (CR-032)', () => {
  it('live CLAUDE.md contains "Ambiguity Gate criteria are evaluated literally"', () => {
    const content = fs.readFileSync(LIVE_CLAUDE_MD, 'utf8');
    expect(content).toContain(LITERAL_RULE_PHRASE);
  });

  it('canonical cleargate-planning/CLAUDE.md contains "Ambiguity Gate criteria are evaluated literally"', () => {
    const content = fs.readFileSync(CANONICAL_CLAUDE_MD, 'utf8');
    expect(content).toContain(LITERAL_RULE_PHRASE);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Scenario 2: 5 templates carry the preamble (live + canonical pairs)
// ─────────────────────────────────────────────────────────────────────────────
describe('Scenario: 5 live templates carry the literal-criterion preamble (CR-032)', () => {
  for (const name of FOOTER_TEMPLATES) {
    it(`live template ${name} contains the literal-criterion preamble`, () => {
      const filePath = path.join(LIVE_TEMPLATES_DIR, name);
      const content = fs.readFileSync(filePath, 'utf8');
      expect(content).toContain(TEMPLATE_PREAMBLE_PHRASE);
    });
  }
});

describe('Scenario: 5 canonical templates carry the literal-criterion preamble (CR-032)', () => {
  for (const name of FOOTER_TEMPLATES) {
    it(`canonical template ${name} contains the literal-criterion preamble`, () => {
      const filePath = path.join(CANONICAL_TEMPLATES_DIR, name);
      const content = fs.readFileSync(filePath, 'utf8');
      expect(content).toContain(TEMPLATE_PREAMBLE_PHRASE);
    });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// Scenario 3: Mirror parity — live and canonical CLAUDE.md new paragraph region is identical
// ─────────────────────────────────────────────────────────────────────────────
describe('Scenario: CLAUDE.md mirror parity for the new literal-rule paragraph (CR-032)', () => {
  /**
   * Extract the paragraph block starting from LITERAL_RULE_PHRASE up to
   * the next blank line (exclusive). Both ends should produce identical text.
   */
  function extractLiteralRuleBlock(filePath: string): string {
    const content = fs.readFileSync(filePath, 'utf8');
    const startIdx = content.indexOf(LITERAL_RULE_PHRASE);
    if (startIdx === -1) return '';
    // Find the start of the line
    const lineStart = content.lastIndexOf('\n', startIdx) + 1;
    // Find the end of the paragraph (next blank line or end of file)
    const nextBlankLine = content.indexOf('\n\n', lineStart);
    const end = nextBlankLine === -1 ? content.length : nextBlankLine;
    return content.slice(lineStart, end).trim();
  }

  it('live and canonical CLAUDE.md literal-rule paragraph text is byte-identical', () => {
    const liveBlock = extractLiteralRuleBlock(LIVE_CLAUDE_MD);
    const canonicalBlock = extractLiteralRuleBlock(CANONICAL_CLAUDE_MD);
    expect(liveBlock).not.toBe(''); // guard: block was found
    expect(liveBlock).toBe(canonicalBlock);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Bonus: 5 live/canonical template pairs are byte-identical for the new region
// ─────────────────────────────────────────────────────────────────────────────
describe('Scenario: 5 template live/canonical pairs are byte-identical (CR-032)', () => {
  for (const name of FOOTER_TEMPLATES) {
    it(`template ${name}: live preamble region === canonical preamble region`, () => {
      const livePath = path.join(LIVE_TEMPLATES_DIR, name);
      const canonicalPath = path.join(CANONICAL_TEMPLATES_DIR, name);
      const live = fs.readFileSync(livePath, 'utf8');
      const canonical = fs.readFileSync(canonicalPath, 'utf8');
      expect(live).toBe(canonical);
    });
  }
});
