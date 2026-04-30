/**
 * changelog-slice.test.ts — STORY-016-04
 *
 * Unit tests for lib/changelog.ts — parseChangelog + sliceChangelog.
 * Covers the 4 Gherkin scenarios from story §2.1 + 2 boundary tests.
 * Fixture-based; no real upgrade run.
 */

import { describe, it, expect } from 'vitest';
import { parseChangelog, sliceChangelog } from '../../src/lib/changelog.js';

// ─── Fixture ─────────────────────────────────────────────────────────────────

/**
 * Minimal CHANGELOG fixture with sections for:
 * 0.8.2, 0.8.1, 0.8.0, 0.7.0, 0.6.0, 0.5.0
 * in most-recent-first order (Common-Changelog format).
 */
const FIXTURE = `# Changelog

All notable changes to this project are documented in this file.
Format: [Common Changelog](https://common-changelog.org/) — most-recent version first.

## [0.8.2] — 2026-04-27

### Fixed
- Strip internal cross-reference comments (BUG-020).

---

## [0.8.1] — 2026-04-27

### Fixed
- .mcp.json now uses npx -y cleargate@<pin> (BUG-019 follow-up).

---

## [0.8.0] — 2026-04-27

### Added
- cleargate mcp serve command (BUG-019).

---

## [0.7.0] — 2026-04-27

### Added
- cleargate init writes .mcp.json (BUG-017).

### Fixed
- cleargate init preserves +x bit (BUG-018).

---

## [0.6.0] — 2026-04-27

### Added
- cleargate hotfix new command (STORY-022-06).

---

## [0.5.0] — 2026-04-26

### Fixed
- Init scaffold hooks resolve cleargate via PATH correctly (BUG-006).
`;

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('parseChangelog', () => {
  it('parses all sections in order from fixture', () => {
    const sections = parseChangelog(FIXTURE);
    expect(sections.length).toBe(6);
    expect(sections[0].version).toBe('0.8.2');
    expect(sections[5].version).toBe('0.5.0');
  });

  it('returns empty array on empty input', () => {
    expect(parseChangelog('')).toEqual([]);
  });

  it('returns empty array when no headings found', () => {
    expect(parseChangelog('# Changelog\n\nNo sections here.')).toEqual([]);
  });

  it('includes heading line in body', () => {
    const sections = parseChangelog(FIXTURE);
    expect(sections[0].body).toContain('## [0.8.2] — 2026-04-27');
  });
});

describe('sliceChangelog — Gherkin Scenario: Delta covers intermediate versions', () => {
  it('Scenario: installed=0.6.0 target=0.8.2 — returns 0.8.2, 0.8.1, 0.8.0, 0.7.0 in order (exclusive from, inclusive to)', () => {
    const sections = sliceChangelog(FIXTURE, '0.6.0', '0.8.2');
    const versions = sections.map((s) => s.version);
    expect(versions).toEqual(['0.8.2', '0.8.1', '0.8.0', '0.7.0']);
  });

  it('does NOT include 0.6.0 (fromExclusive boundary)', () => {
    const sections = sliceChangelog(FIXTURE, '0.6.0', '0.8.2');
    expect(sections.find((s) => s.version === '0.6.0')).toBeUndefined();
  });

  it('does NOT include 0.5.0 (older than fromExclusive)', () => {
    const sections = sliceChangelog(FIXTURE, '0.6.0', '0.8.2');
    expect(sections.find((s) => s.version === '0.5.0')).toBeUndefined();
  });

  it('includes 0.8.2 (toInclusive boundary)', () => {
    const sections = sliceChangelog(FIXTURE, '0.6.0', '0.8.2');
    expect(sections.find((s) => s.version === '0.8.2')).toBeDefined();
  });
});

describe('sliceChangelog — Gherkin Scenario: Same version skips delta', () => {
  it('Scenario: installed=0.8.2 target=0.8.2 — returns empty array', () => {
    const sections = sliceChangelog(FIXTURE, '0.8.2', '0.8.2');
    expect(sections).toEqual([]);
  });
});

describe('sliceChangelog — Gherkin Scenario: Installed older than earliest changelog entry prints all', () => {
  it('Scenario: installed=0.0.5, earliest=0.5.0 — returns all 6 sections (all are > 0.0.5)', () => {
    const sections = sliceChangelog(FIXTURE, '0.0.5', '0.8.2');
    expect(sections.length).toBe(6);
    const versions = sections.map((s) => s.version);
    expect(versions).toContain('0.5.0');
    expect(versions).toContain('0.8.2');
  });
});

describe('sliceChangelog — boundary tests', () => {
  it('boundary: empty content returns empty array', () => {
    expect(sliceChangelog('', '0.6.0', '0.8.2')).toEqual([]);
  });

  it('boundary: from===to returns empty array (same-version range)', () => {
    expect(sliceChangelog(FIXTURE, '0.7.0', '0.7.0')).toEqual([]);
  });

  it('boundary: installed exactly equals an entry version is excluded from results', () => {
    // from=0.7.0 means 0.7.0 itself should NOT appear (exclusive lower bound)
    const sections = sliceChangelog(FIXTURE, '0.7.0', '0.8.2');
    const versions = sections.map((s) => s.version);
    expect(versions).not.toContain('0.7.0');
    expect(versions).toContain('0.8.0');
    expect(versions).toContain('0.8.1');
    expect(versions).toContain('0.8.2');
  });

  it('boundary: section bodies contain the heading line verbatim', () => {
    const sections = sliceChangelog(FIXTURE, '0.6.0', '0.8.2');
    for (const section of sections) {
      expect(section.body).toMatch(
        new RegExp(`^## \\[${section.version}\\] — \\d{4}-\\d{2}-\\d{2}`, 'm')
      );
    }
  });
});
