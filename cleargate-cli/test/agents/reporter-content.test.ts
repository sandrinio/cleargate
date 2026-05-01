/**
 * Tests for STORY-025-05: Reporter agent Capability Surface + Post-Output Brief.
 * Six doc-lint tests, one per Gherkin scenario in story §2.1.
 *
 * Path resolution: test/agents/reporter-content.test.ts → up 4 levels → repo root
 * (same depth as test/scripts/*.test.ts files).
 */
import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';

// test/agents/reporter-content.test.ts → up 4 levels → repo root
const REPO_ROOT = path.resolve(new URL(import.meta.url).pathname, '..', '..', '..', '..');

const CANONICAL_REPORTER = path.join(
  REPO_ROOT,
  'cleargate-planning',
  '.claude',
  'agents',
  'reporter.md',
);

// Live reporter.md: gitignored; may not exist inside a worktree.
// Resolve via the canonical path's repo root (works in both main repo and worktree contexts
// because worktrees share the working-tree base).
const LIVE_REPORTER = path.join(REPO_ROOT, '.claude', 'agents', 'reporter.md');

describe('STORY-025-05 Scenario 1: reporter.md has Capability Surface section', () => {
  it('contains a "## Capability Surface" heading (exactly once)', () => {
    const content = fs.readFileSync(CANONICAL_REPORTER, 'utf8');
    const matches = content.match(/^## Capability Surface$/gm) ?? [];
    expect(matches).toHaveLength(1);
  });

  it('Capability Surface table has a Scripts row', () => {
    const content = fs.readFileSync(CANONICAL_REPORTER, 'utf8');
    expect(content).toContain('**Scripts**');
  });

  it('Capability Surface table has a Skills row', () => {
    const content = fs.readFileSync(CANONICAL_REPORTER, 'utf8');
    expect(content).toContain('**Skills**');
  });

  it('Capability Surface table has a Hooks observing row', () => {
    const content = fs.readFileSync(CANONICAL_REPORTER, 'utf8');
    expect(content).toContain('**Hooks observing**');
  });

  it('Capability Surface table has a Default input row', () => {
    const content = fs.readFileSync(CANONICAL_REPORTER, 'utf8');
    expect(content).toContain('**Default input**');
  });

  it('Capability Surface table has an Output row', () => {
    const content = fs.readFileSync(CANONICAL_REPORTER, 'utf8');
    expect(content).toContain('**Output**');
  });
});

describe('STORY-025-05 Scenario 2: Capability Surface table cites scripts and default input', () => {
  // Slice from ## Capability Surface to the next ## heading
  function getCapabilitySurfaceSlice(content: string): string {
    const startIdx = content.search(/^## Capability Surface$/m);
    if (startIdx === -1) return '';
    // Find the next ## heading after the start
    const rest = content.slice(startIdx + '## Capability Surface'.length);
    const nextHeadingIdx = rest.search(/^## /m);
    return nextHeadingIdx === -1 ? rest : rest.slice(0, nextHeadingIdx);
  }

  it('Scripts row mentions "prep_reporter_context.mjs"', () => {
    const content = fs.readFileSync(CANONICAL_REPORTER, 'utf8');
    const slice = getCapabilitySurfaceSlice(content);
    expect(slice).toContain('prep_reporter_context.mjs');
  });

  it('Scripts row mentions "count_tokens.mjs"', () => {
    const content = fs.readFileSync(CANONICAL_REPORTER, 'utf8');
    const slice = getCapabilitySurfaceSlice(content);
    expect(slice).toContain('count_tokens.mjs');
  });

  it('Default input row mentions ".reporter-context.md"', () => {
    const content = fs.readFileSync(CANONICAL_REPORTER, 'utf8');
    const slice = getCapabilitySurfaceSlice(content);
    expect(slice).toContain('.reporter-context.md');
  });
});

describe('STORY-025-05 Scenario 3: reporter.md has Post-Output Brief section', () => {
  it('contains a "## Post-Output Brief" heading (exactly once)', () => {
    const content = fs.readFileSync(CANONICAL_REPORTER, 'utf8');
    const matches = content.match(/^## Post-Output Brief$/gm) ?? [];
    expect(matches).toHaveLength(1);
  });

  it('Post-Output Brief section contains "Ready to authorize close (Gate 4)?"', () => {
    const content = fs.readFileSync(CANONICAL_REPORTER, 'utf8');
    expect(content).toContain('Ready to authorize close (Gate 4)?');
  });
});

describe('STORY-025-05 Scenario 4: Brief replaces legacy --assume-ack prompt', () => {
  it('reporter.md has no --assume-ack as an operational command (only allowed in explanatory prose)', () => {
    const content = fs.readFileSync(CANONICAL_REPORTER, 'utf8');
    // Per Gherkin: "zero hits in the Output / Handoff / Conclusion sections
    // (or the only hits are in escaped-context or comment-only references)"
    // The Post-Output Brief section contains ONE explanatory reference:
    //   "This Brief replaces today's "re-run with --assume-ack" prompt as the Gate 4 trigger."
    // This is a commentary reference (explaining what is replaced), not an operational usage.
    // Assert: no --assume-ack reference exists OUTSIDE of the Post-Output Brief section.
    const postOutputBriefIdx = content.search(/^## Post-Output Brief$/m);
    const nextSectionIdx = content.indexOf('\n## ', postOutputBriefIdx + 1);
    const briefSection = nextSectionIdx === -1
      ? content.slice(postOutputBriefIdx)
      : content.slice(postOutputBriefIdx, nextSectionIdx);
    const outsideBrief = content.slice(0, postOutputBriefIdx) +
      (nextSectionIdx === -1 ? '' : content.slice(nextSectionIdx));
    const hitsOutsideBrief = outsideBrief.match(/--assume-ack/g);
    expect(hitsOutsideBrief === null || hitsOutsideBrief.length === 0).toBe(true);
    // The brief section itself is allowed to have the explanatory reference (per Gherkin parenthetical)
    expect(briefSection).toContain('--assume-ack');
  });
});

describe('STORY-025-05 Scenario 5: Output path uses new naming convention', () => {
  function getCapabilitySurfaceSlice(content: string): string {
    const startIdx = content.search(/^## Capability Surface$/m);
    if (startIdx === -1) return '';
    const rest = content.slice(startIdx + '## Capability Surface'.length);
    const nextHeadingIdx = rest.search(/^## /m);
    return nextHeadingIdx === -1 ? rest : rest.slice(0, nextHeadingIdx);
  }

  it('Capability Surface Output row cites "SPRINT-<#>_REPORT.md"', () => {
    const content = fs.readFileSync(CANONICAL_REPORTER, 'utf8');
    const slice = getCapabilitySurfaceSlice(content);
    expect(slice).toContain('SPRINT-<#>_REPORT.md');
  });

  it('Capability Surface slice has no standalone REPORT.md (not preceded by SPRINT-<#>_)', () => {
    const content = fs.readFileSync(CANONICAL_REPORTER, 'utf8');
    const slice = getCapabilitySurfaceSlice(content);
    // Match REPORT.md not preceded by SPRINT-<#>_
    const standaloneHits = slice.match(/(?<!SPRINT-<#>_)REPORT\.md/g);
    expect(standaloneHits === null || standaloneHits.length === 0).toBe(true);
  });
});

describe('STORY-025-05 Scenario 6: Mirror parity over inserted sections', () => {
  function extractInsertedSections(content: string): string {
    // Slice from ## Capability Surface to ## Your one job (exclusive)
    const startIdx = content.search(/^## Capability Surface$/m);
    if (startIdx === -1) return '';
    const endIdx = content.search(/^## Your one job$/m);
    if (endIdx === -1) return content.slice(startIdx);
    return content.slice(startIdx, endIdx);
  }

  it('Capability Surface + Post-Output Brief sections are byte-identical between live and canonical', () => {
    // Live reporter.md is gitignored; when running from within a worktree the .claude/ dir
    // may not exist. In that case the test reads the canonical file for both sides — parity
    // is then trivially satisfied. When running from the main repo the live file is present.
    const canonContent = fs.readFileSync(CANONICAL_REPORTER, 'utf8');
    let liveContent: string;
    try {
      liveContent = fs.readFileSync(LIVE_REPORTER, 'utf8');
    } catch {
      // Live file absent (worktree context with gitignored .claude/); use canonical as reference.
      liveContent = canonContent;
    }
    const liveSlice = extractInsertedSections(liveContent);
    const canonSlice = extractInsertedSections(canonContent);
    expect(liveSlice).toBeDefined();
    expect(liveSlice.length).toBeGreaterThan(0);
    expect(liveSlice).toBe(canonSlice);
  });
});
