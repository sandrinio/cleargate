import { describe, test } from 'node:test';
import assert from 'node:assert/strict';

/**
 * Tests for STORY-025-06: cleargate-enforcement.md §13 + CLAUDE.md sprint-preflight bullet.
 * One test() per Gherkin scenario in story §2.1 (5 scenarios).
 */
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
  // STORY-026-02 prune: "Sprint Execution Gate." paragraph moved to sprint-execution skill.
  // CLAUDE.md now carries only the skill-pointer bullet; the detailed preflight description
  // lives in .claude/skills/sprint-execution/SKILL.md.
  test('CLAUDE.md (live) does NOT contain "Sprint Execution Gate." paragraph (moved to skill)', () => {
    const content = fs.readFileSync(LIVE_CLAUDE, 'utf8');
    assert.ok(!String(content).includes('**Sprint Execution Gate.**'));
  });

  test('CLAUDE.md (live) does NOT contain the old "(CR-021)" parenthetical', () => {
    const content = fs.readFileSync(LIVE_CLAUDE, 'utf8');
    assert.doesNotMatch(String(content), /Sprint Execution Gate \(CR-021\)/);
  });

  test('CLAUDE.md (live) contains the sprint-execution skill pointer (R2)', () => {
    const content = fs.readFileSync(LIVE_CLAUDE, 'utf8');
    assert.ok(String(content).includes('.claude/skills/sprint-execution/SKILL.md'));
  });
});

describe('STORY-025-06 Scenario 2: cleargate-enforcement.md has §13 Sprint Execution Gate', () => {
  test('enforcement.md contains exactly one "## 13." heading', () => {
    const content = fs.readFileSync(LIVE_ENF, 'utf8');
    const matches = content.match(/^## 13\./gm) ?? [];
    assert.strictEqual((matches).length, 1);
  });

  test('§13 heading is "Sprint Execution Gate (Gate 3)"', () => {
    const content = fs.readFileSync(LIVE_ENF, 'utf8');
    assert.ok(String(content).includes('## 13. Sprint Execution Gate (Gate 3)'));
  });

  test('§13 enumerates the four checks', () => {
    const content = fs.readFileSync(LIVE_ENF, 'utf8');
    assert.ok(String(content).includes('Previous sprint Completed'));
    assert.ok(String(content).includes('No leftover worktrees'));
    assert.ok(String(content).includes('Sprint branch ref free'));
    assert.ok(String(content).includes('`main` is clean'));
  });

  test('§13 declares enforcing under v2 and advisory under v1', () => {
    const content = fs.readFileSync(LIVE_ENF, 'utf8');
    assert.match(String(content), /enforcing under `execution_mode: v2`/);
    assert.match(String(content), /advisory under v1/);
  });
});

describe('STORY-025-06 Scenario 3: Mirror parity for CLAUDE.md (new bullet only)', () => {
  // STORY-026-02 prune: Sprint Execution Gate paragraph removed from both files.
  // Parity now verified on the sprint-execution skill pointer (R2) which must match in both.
  test('Sprint execution skill pointer is identical in live and canonical CLAUDE.md', () => {
    const live = fs.readFileSync(LIVE_CLAUDE, 'utf8');
    const canon = fs.readFileSync(CANON_CLAUDE, 'utf8');
    const liveMatch = live.match(/\*\*Sprint execution\.\*\*[^\n]+/)?.[0];
    const canonMatch = canon.match(/\*\*Sprint execution\.\*\*[^\n]+/)?.[0];
    assert.notStrictEqual(liveMatch, undefined);
    assert.notStrictEqual(canonMatch, undefined);
    assert.strictEqual(liveMatch, canonMatch);
  });
});

describe('STORY-025-06 Scenario 4: Mirror parity for cleargate-enforcement.md', () => {
  test('live and canonical enforcement.md are byte-identical', () => {
    const live = fs.readFileSync(LIVE_ENF, 'utf8');
    const canon = fs.readFileSync(CANON_ENF, 'utf8');
    assert.strictEqual(live, canon);
  });
});

describe('STORY-025-06 Scenario 5: Wave dependency — preflight subcommand exists', () => {
  test('cleargate sprint preflight --help exits 0', () => {
    const output = execSync(`node "${CLI_BIN}" sprint preflight --help`, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    assert.notStrictEqual(output, undefined);
  });

  test('cleargate sprint preflight --help references the four Gate 3 checks', () => {
    const output = execSync(`node "${CLI_BIN}" sprint preflight --help`, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    assert.match(String(output), /Previous sprint Completed/i);
    assert.match(String(output), /leftover worktrees/i);
    assert.match(String(output), /sprint\/S-NN ref free/i);
    assert.match(String(output), /main is clean/i);
  });
});
