/**
 * Tests for STORY-025-06: cleargate-enforcement.md §13 + CLAUDE.md sprint-preflight bullet.
 * One it() per Gherkin scenario in story §2.1 (5 scenarios).
 */
import { describe, it, expect } from 'vitest';
import { execSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';

const REPO_ROOT = path.resolve(new URL(import.meta.url).pathname, '..', '..', '..', '..');

const LIVE_CLAUDE = path.join(REPO_ROOT, 'CLAUDE.md');
const CANON_CLAUDE = path.join(REPO_ROOT, 'cleargate-planning', 'CLAUDE.md');
const LIVE_ENF = path.join(REPO_ROOT, '.cleargate', 'knowledge', 'cleargate-enforcement.md');
const CANON_ENF = path.join(
  REPO_ROOT,
  'cleargate-planning',
  '.cleargate',
  'knowledge',
  'cleargate-enforcement.md',
);
const CLI_BIN = path.join(REPO_ROOT, 'cleargate-cli', 'dist', 'cli.js');

describe('STORY-025-06 Scenario 1: CLAUDE.md Sprint Execution Gate bullet updated', () => {
  it('CLAUDE.md (live) contains the new "Sprint Execution Gate." bullet wording', () => {
    const content = fs.readFileSync(LIVE_CLAUDE, 'utf8');
    expect(content).toContain('**Sprint Execution Gate.**');
    expect(content).toContain('cleargate sprint preflight <id>');
  });

  it('CLAUDE.md (live) does NOT contain the old "(CR-021)" parenthetical', () => {
    const content = fs.readFileSync(LIVE_CLAUDE, 'utf8');
    expect(content).not.toMatch(/Sprint Execution Gate \(CR-021\)/);
  });
});

describe('STORY-025-06 Scenario 2: cleargate-enforcement.md has §13 Sprint Execution Gate', () => {
  it('enforcement.md contains exactly one "## 13." heading', () => {
    const content = fs.readFileSync(LIVE_ENF, 'utf8');
    const matches = content.match(/^## 13\./gm) ?? [];
    expect(matches).toHaveLength(1);
  });

  it('§13 heading is "Sprint Execution Gate (Gate 3)"', () => {
    const content = fs.readFileSync(LIVE_ENF, 'utf8');
    expect(content).toContain('## 13. Sprint Execution Gate (Gate 3)');
  });

  it('§13 enumerates the four checks', () => {
    const content = fs.readFileSync(LIVE_ENF, 'utf8');
    expect(content).toContain('Previous sprint Completed');
    expect(content).toContain('No leftover worktrees');
    expect(content).toContain('Sprint branch ref free');
    expect(content).toContain('`main` is clean');
  });

  it('§13 declares enforcing under v2 and advisory under v1', () => {
    const content = fs.readFileSync(LIVE_ENF, 'utf8');
    expect(content).toMatch(/enforcing under `execution_mode: v2`/);
    expect(content).toMatch(/advisory under v1/);
  });
});

describe('STORY-025-06 Scenario 3: Mirror parity for CLAUDE.md (new bullet only)', () => {
  it('Sprint Execution Gate bullet text is byte-identical between live and canonical', () => {
    const live = fs.readFileSync(LIVE_CLAUDE, 'utf8');
    const canon = fs.readFileSync(CANON_CLAUDE, 'utf8');
    const liveMatch = live.match(/\*\*Sprint Execution Gate\.\*\*[^\n]+/)?.[0];
    const canonMatch = canon.match(/\*\*Sprint Execution Gate\.\*\*[^\n]+/)?.[0];
    expect(liveMatch).toBeDefined();
    expect(canonMatch).toBeDefined();
    expect(liveMatch).toBe(canonMatch);
  });
});

describe('STORY-025-06 Scenario 4: Mirror parity for cleargate-enforcement.md', () => {
  it('live and canonical enforcement.md are byte-identical', () => {
    const live = fs.readFileSync(LIVE_ENF, 'utf8');
    const canon = fs.readFileSync(CANON_ENF, 'utf8');
    expect(live).toBe(canon);
  });
});

describe('STORY-025-06 Scenario 5: Wave dependency — preflight subcommand exists', () => {
  it('cleargate sprint preflight --help exits 0', () => {
    const output = execSync(`node "${CLI_BIN}" sprint preflight --help`, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    expect(output).toBeDefined();
  });

  it('cleargate sprint preflight --help references the four Gate 3 checks', () => {
    const output = execSync(`node "${CLI_BIN}" sprint preflight --help`, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    expect(output).toMatch(/Previous sprint Completed/i);
    expect(output).toMatch(/leftover worktrees/i);
    expect(output).toMatch(/sprint\/S-NN ref free/i);
    expect(output).toMatch(/main is clean/i);
  });
});
