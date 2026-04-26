/**
 * protocol-section-24.test.ts — STORY-022-01
 *
 * Verifies that §24 "Lane Routing" is present in BOTH:
 *   1. .cleargate/knowledge/cleargate-protocol.md (dogfood)
 *   2. cleargate-planning/.cleargate/knowledge/cleargate-protocol.md (scaffold mirror)
 *
 * And that:
 *   - The architect.md scaffold contains the ## Lane Classification section with 7-check rubric.
 *   - The two protocol files are byte-identical (scaffold-mirror discipline).
 *   - §24 body is ≤30 lines (heading inclusive).
 *
 * Test coverage:
 *   Scenario 1 — Architect agent file documents the seven-check rubric
 *   Scenario 2 — Protocol §24 documents rubric, demotion, forbidden surfaces, and LD event
 *   Scenario 3 — Protocol byte-equality is preserved
 *   Scenario 4 — §24 length conforms to protocol section-length convention (≤30 lines)
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';

const REPO_ROOT = path.resolve('/Users/ssuladze/Documents/Dev/ClearGate');

const DOGFOOD_PROTOCOL = path.join(REPO_ROOT, '.cleargate', 'knowledge', 'cleargate-protocol.md');
const SCAFFOLD_PROTOCOL = path.join(REPO_ROOT, 'cleargate-planning', '.cleargate', 'knowledge', 'cleargate-protocol.md');
const SCAFFOLD_ARCHITECT = path.join(REPO_ROOT, 'cleargate-planning', '.claude', 'agents', 'architect.md');

/**
 * Extract lines from §24 heading to the next top-level ## section or EOF.
 */
function extractSection24(content: string): string[] {
  const lines = content.split('\n');
  const start = lines.findIndex((l) => /^## 24\. Lane Routing/.test(l));
  if (start === -1) return [];
  const end = lines.findIndex((l, i) => i > start && /^## [0-9]+\./.test(l));
  return end === -1 ? lines.slice(start) : lines.slice(start, end);
}

describe('Protocol §24 — Lane Routing (STORY-022-01)', () => {
  it('Scenario 1: architect.md scaffold has ## Lane Classification with 7-check rubric and Lane Audit contract', () => {
    const content = fs.readFileSync(SCAFFOLD_ARCHITECT, 'utf8');

    expect(content, 'Missing ## Lane Classification heading').toContain('## Lane Classification');

    // Seven numbered checks must be present (1. through 7.)
    for (let i = 1; i <= 7; i++) {
      expect(content, `Missing check ${i}. in Lane Classification rubric`).toMatch(
        new RegExp(`^${i}\\.`, 'm'),
      );
    }

    // Lane Audit emission contract
    expect(content, 'Missing Lane Audit subsection contract').toContain('§2.4 Lane Audit');
    expect(content, 'Missing lane: standard|fast in architect.md').toContain('lane: standard|fast');
  });

  it('Scenario 2: protocol §24 contains rubric, demotion mechanics, forbidden surfaces, and LD event registration', () => {
    const content = fs.readFileSync(DOGFOOD_PROTOCOL, 'utf8');

    // Section heading
    expect(content, 'Missing ## 24. Lane Routing heading in dogfood protocol').toContain(
      '## 24. Lane Routing',
    );

    // Rubric present (all 7 checks)
    for (let i = 1; i <= 7; i++) {
      expect(content, `Missing check ${i}. in dogfood protocol §24`).toMatch(
        new RegExp(`\\n${i}\\.`, 'm'),
      );
    }

    // Demotion mechanics
    expect(content, 'Missing demotion mechanics in §24').toContain('Demotion mechanics');
    expect(content, 'Missing fast → standard demotion direction').toContain('fast → standard');

    // Forbidden surfaces
    expect(content, 'Missing mcp/src/db/ in forbidden surfaces').toContain('mcp/src/db/');
    expect(content, 'Missing mcp/src/auth/ in forbidden surfaces').toContain('mcp/src/auth/');
    expect(content, 'Missing mcp/src/adapters/ in forbidden surfaces').toContain('mcp/src/adapters/');
    expect(content, 'Missing MANIFEST.json in forbidden surfaces').toContain(
      'cleargate-planning/MANIFEST.json',
    );

    // LD event-type registration as self-contained sentence in §24
    expect(content, 'Missing LD event-type registration sentence in §24').toContain(
      'Event-type `LD` (Lane Demotion)',
    );
  });

  it('Scenario 3: diff between dogfood and scaffold protocol files is empty (byte-identical)', () => {
    const dogfood = fs.readFileSync(DOGFOOD_PROTOCOL, 'utf8');
    const scaffold = fs.readFileSync(SCAFFOLD_PROTOCOL, 'utf8');
    expect(dogfood).toBe(scaffold);
  });

  it('Scenario 4: §24 body is ≤30 lines (heading inclusive)', () => {
    const content = fs.readFileSync(DOGFOOD_PROTOCOL, 'utf8');
    const lines = extractSection24(content);
    expect(lines.length, `§24 has ${lines.length} lines — exceeds 30-line cap`).toBeLessThanOrEqual(30);
  });
});
