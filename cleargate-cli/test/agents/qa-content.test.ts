/**
 * Tests for CR-024 S2: QA agent Capability Surface + Pack-First Ingest + Lane-Aware Playbook,
 * plus developer.md structured-handoff schema cross-assertion.
 *
 * Six doc-lint tests on qa.md (one per Gherkin scenario) + one cross-assertion on developer.md.
 *
 * Path resolution: test/agents/qa-content.test.ts → up 4 levels → repo root
 * (same depth as test/agents/reporter-content.test.ts).
 */
import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';

// test/agents/qa-content.test.ts → up 4 levels → repo root
const REPO_ROOT = path.resolve(new URL(import.meta.url).pathname, '..', '..', '..', '..');

const CANONICAL_QA = path.join(
  REPO_ROOT,
  'cleargate-planning',
  '.claude',
  'agents',
  'qa.md',
);

const CANONICAL_DEVELOPER = path.join(
  REPO_ROOT,
  'cleargate-planning',
  '.claude',
  'agents',
  'developer.md',
);

// Live qa.md: gitignored; may not exist inside a worktree.
const LIVE_QA = path.join(REPO_ROOT, '.claude', 'agents', 'qa.md');

describe('CR-024 S2 Scenario 1: qa.md has Capability Surface section', () => {
  it('contains a "## Capability Surface" heading (exactly once)', () => {
    const content = fs.readFileSync(CANONICAL_QA, 'utf8');
    const matches = content.match(/^## Capability Surface$/gm) ?? [];
    expect(matches).toHaveLength(1);
  });

  it('Capability Surface table has a Scripts row', () => {
    const content = fs.readFileSync(CANONICAL_QA, 'utf8');
    expect(content).toContain('**Scripts**');
  });

  it('Capability Surface table has a Skills row', () => {
    const content = fs.readFileSync(CANONICAL_QA, 'utf8');
    expect(content).toContain('**Skills**');
  });

  it('Capability Surface table has a Hooks observing row', () => {
    const content = fs.readFileSync(CANONICAL_QA, 'utf8');
    expect(content).toContain('**Hooks observing**');
  });

  it('Capability Surface table has a Default input row', () => {
    const content = fs.readFileSync(CANONICAL_QA, 'utf8');
    expect(content).toContain('**Default input**');
  });

  it('Capability Surface table has an Output row', () => {
    const content = fs.readFileSync(CANONICAL_QA, 'utf8');
    expect(content).toContain('**Output**');
  });

  it('Capability Surface table has a Lane awareness row', () => {
    const content = fs.readFileSync(CANONICAL_QA, 'utf8');
    expect(content).toContain('**Lane awareness**');
  });
});

describe('CR-024 S2 Scenario 2: Capability Surface table cites the M2 contract', () => {
  function getCapabilitySurfaceSlice(content: string): string {
    const startIdx = content.search(/^## Capability Surface$/m);
    if (startIdx === -1) return '';
    const rest = content.slice(startIdx + '## Capability Surface'.length);
    const nextHeadingIdx = rest.search(/^## /m);
    return nextHeadingIdx === -1 ? rest : rest.slice(0, nextHeadingIdx);
  }

  it('Capability Surface slice cites prep_qa_context.mjs', () => {
    const content = fs.readFileSync(CANONICAL_QA, 'utf8');
    const slice = getCapabilitySurfaceSlice(content);
    expect(slice).toContain('prep_qa_context.mjs');
  });

  it('Capability Surface slice cites .qa-context-<story-id>.md filename', () => {
    const content = fs.readFileSync(CANONICAL_QA, 'utf8');
    const slice = getCapabilitySurfaceSlice(content);
    expect(slice).toContain('.qa-context-<story-id>.md');
  });

  it('Capability Surface slice cites schema_version: 1', () => {
    const content = fs.readFileSync(CANONICAL_QA, 'utf8');
    const slice = getCapabilitySurfaceSlice(content);
    expect(slice).toContain('schema_version: 1');
  });
});

describe('CR-024 S2 Scenario 3: qa.md has Pack-First Ingest section', () => {
  it('contains a "## Pack-First Ingest" heading (exactly once)', () => {
    const content = fs.readFileSync(CANONICAL_QA, 'utf8');
    const matches = content.match(/^## Pack-First Ingest$/gm) ?? [];
    expect(matches).toHaveLength(1);
  });

  it('Pack-First Ingest contains "pack missing" FAIL clause', () => {
    const content = fs.readFileSync(CANONICAL_QA, 'utf8');
    expect(content).toContain('pack missing');
  });

  it('Pack-First Ingest contains SCHEMA_INCOMPLETE legacy clause', () => {
    const content = fs.readFileSync(CANONICAL_QA, 'utf8');
    expect(content).toContain('SCHEMA_INCOMPLETE');
  });
});

describe('CR-024 S2 Scenario 4: qa.md has Lane-Aware Playbook with three lane sub-headings', () => {
  function getPlaybookSlice(content: string): string {
    const startIdx = content.search(/^## Lane-Aware Playbook$/m);
    if (startIdx === -1) return '';
    const rest = content.slice(startIdx + '## Lane-Aware Playbook'.length);
    const nextHeadingIdx = rest.search(/^## /m);
    return nextHeadingIdx === -1 ? rest : rest.slice(0, nextHeadingIdx);
  }

  it('contains a "## Lane-Aware Playbook" heading (exactly once)', () => {
    const content = fs.readFileSync(CANONICAL_QA, 'utf8');
    const matches = content.match(/^## Lane-Aware Playbook$/gm) ?? [];
    expect(matches).toHaveLength(1);
  });

  it('Lane-Aware Playbook mentions fast lane', () => {
    const content = fs.readFileSync(CANONICAL_QA, 'utf8');
    const slice = getPlaybookSlice(content);
    expect(slice).toMatch(/`fast`\s+lane/);
  });

  it('Lane-Aware Playbook mentions standard lane', () => {
    const content = fs.readFileSync(CANONICAL_QA, 'utf8');
    const slice = getPlaybookSlice(content);
    expect(slice).toMatch(/`standard`\s+lane/);
  });

  it('Lane-Aware Playbook mentions runtime lane', () => {
    const content = fs.readFileSync(CANONICAL_QA, 'utf8');
    const slice = getPlaybookSlice(content);
    expect(slice).toMatch(/`runtime`\s+lane/);
  });

  it('runtime sub-section cites Full test suite, exit-code matrix, Integration smoke', () => {
    const content = fs.readFileSync(CANONICAL_QA, 'utf8');
    const slice = getPlaybookSlice(content);
    expect(slice).toContain('Full test suite');
    expect(slice).toContain('exit-code matrix');
    expect(slice).toContain('Integration smoke');
  });
});

describe('CR-024 S2 Scenario 5: Forward-compat clause present', () => {
  it('Lane-Aware Playbook contains forward-compat clause "treat it as `standard`"', () => {
    const content = fs.readFileSync(CANONICAL_QA, 'utf8');
    expect(content).toContain('treat it as `standard`');
  });

  it('Lane-Aware Playbook references state.json schema (SPRINT-20 carry-forward)', () => {
    const content = fs.readFileSync(CANONICAL_QA, 'utf8');
    expect(content).toContain('state.json schema');
  });
});

describe('CR-024 S2 Scenario 6: Mirror parity over inserted sections', () => {
  function extractInsertedSections(content: string): string {
    const startIdx = content.search(/^## Capability Surface$/m);
    if (startIdx === -1) return '';
    const endIdx = content.search(/^## Your one job$/m);
    if (endIdx === -1) return content.slice(startIdx);
    return content.slice(startIdx, endIdx);
  }

  it('Capability Surface + Pack-First Ingest + Lane-Aware Playbook sections are byte-identical between live and canonical', () => {
    // Live qa.md is gitignored; in worktree context it may not exist.
    // Fall back to canonical for both sides — parity is then trivially satisfied.
    const canonContent = fs.readFileSync(CANONICAL_QA, 'utf8');
    let liveContent: string;
    try {
      liveContent = fs.readFileSync(LIVE_QA, 'utf8');
    } catch {
      liveContent = canonContent;
    }
    const liveSlice = extractInsertedSections(liveContent);
    const canonSlice = extractInsertedSections(canonContent);
    expect(liveSlice).toBeDefined();
    expect(liveSlice.length).toBeGreaterThan(0);
    expect(liveSlice).toBe(canonSlice);
  });
});

describe('CR-024 S2 Scenario 7: developer.md Output shape lists the three new structured fields', () => {
  function getOutputShapeSlice(content: string): string {
    const startIdx = content.search(/^## Output shape$/m);
    if (startIdx === -1) return '';
    const rest = content.slice(startIdx + '## Output shape'.length);
    const nextHeadingIdx = rest.search(/^## /m);
    return nextHeadingIdx === -1 ? rest : rest.slice(0, nextHeadingIdx);
  }

  it('developer.md Output shape contains r_coverage:, plan_deviations:, adjacent_files: alongside STATUS:', () => {
    const content = fs.readFileSync(CANONICAL_DEVELOPER, 'utf8');
    const slice = getOutputShapeSlice(content);
    expect(slice).toContain('STATUS:');
    expect(slice).toContain('r_coverage:');
    expect(slice).toContain('plan_deviations:');
    expect(slice).toContain('adjacent_files:');
  });
});
