/**
 * devops-agent-registration.red.node.test.ts — CR-051 RED
 *
 * UNUSUAL FOR RED MODE: this is an investigation-CR. The devops.md files
 * currently exist with well-formed frontmatter, so all scenarios are expected
 * to PASS on the clean baseline (in primary checkout). The test exists as a
 * regression sentinel — if anyone deletes devops.md or breaks its frontmatter,
 * this test catches it.
 *
 * Per CR-051 §3 Execution Sandbox + M1.md TPV scope:
 *   "This test cannot verify Claude Code agent-registry runtime behavior.
 *    Scope is filesystem + frontmatter shape only."
 *
 * No `Agent(subagent_type=devops)` invocation is possible from node:test.
 *
 * Naming: *.red.node.test.ts per CR-043 convention (red BEFORE node infix).
 * Post-Dev investigation: rename to *.node.test.ts per CR-043 Red→Verified process.
 *
 * Scenarios:
 *   1 — devops.md exists at canonical path
 *   2 — devops.md exists at live path (skipped in worktrees per #qa #worktree #mirror)
 *   3 — frontmatter parses; required keys (name, description, tools, model) present
 *   4 — name field === "devops" for both files
 *   CTRL — same 3 checks pass for qa.md (control: known-registering agent)
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

// ---------------------------------------------------------------------------
// REPO_ROOT resolution via import.meta.url — works in worktrees (not hardcoded).
// test/scaffold/ → test/ → cleargate-cli/ → (repo root)
// ---------------------------------------------------------------------------
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..', '..', '..');

// ---------------------------------------------------------------------------
// Worktree detection: live .claude/ is gitignored; checks against live paths
// must be skipped in worktrees (per FLASHCARD 2026-05-04 #qa #worktree #mirror).
// In a worktree, REPO_ROOT/.git is a FILE (pointer), not a directory.
// In a primary checkout, REPO_ROOT/.git is a directory.
// This mirrors the pattern in canonical-live-parity.red.node.test.ts.
// ---------------------------------------------------------------------------
function isWorktree(): boolean {
  try {
    return fs.statSync(path.join(REPO_ROOT, '.git')).isFile();
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Hand-rolled YAML frontmatter parser.
// Extracts the --- ... --- block and parses key: value pairs (strings only).
// Acceptable for this scope per M1.md TPV note; js-yaml not in project deps.
// ---------------------------------------------------------------------------
interface Frontmatter {
  name?: string;
  description?: string;
  tools?: string;
  model?: string;
  [key: string]: string | undefined;
}

function parseFrontmatter(content: string): Frontmatter | null {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return null;
  const block = match[1];
  const result: Frontmatter = {};
  for (const line of block.split('\n')) {
    const colonIdx = line.indexOf(':');
    if (colonIdx === -1) continue;
    const key = line.slice(0, colonIdx).trim();
    const value = line.slice(colonIdx + 1).trim();
    if (key) result[key] = value;
  }
  return result;
}

const REQUIRED_KEYS: (keyof Frontmatter)[] = ['name', 'description', 'tools', 'model'];

const CANONICAL_DEVOPS = path.join(REPO_ROOT, 'cleargate-planning', '.claude', 'agents', 'devops.md');
const LIVE_DEVOPS = path.join(REPO_ROOT, '.claude', 'agents', 'devops.md');
const CANONICAL_QA = path.join(REPO_ROOT, 'cleargate-planning', '.claude', 'agents', 'qa.md');
const LIVE_QA = path.join(REPO_ROOT, '.claude', 'agents', 'qa.md');

// ---------------------------------------------------------------------------
// Scenario 1 — file existence (canonical path)
// Pre-Dev: PASS (devops.md exists in canonical). Post-Dev: still PASS.
// ---------------------------------------------------------------------------
describe('CR-051 Scenario 1: devops.md file existence', () => {
  it('canonical devops.md exists at cleargate-planning/.claude/agents/devops.md', () => {
    assert.ok(
      fs.existsSync(CANONICAL_DEVOPS),
      `devops.md not found at canonical path: ${CANONICAL_DEVOPS}`,
    );
  });
});

// ---------------------------------------------------------------------------
// Scenario 2 — file existence (live path)
// Skipped in worktrees: live .claude/ is gitignored (FLASHCARD #qa #worktree #mirror).
// Pre-Dev (primary checkout): PASS. In worktree: SKIP (early return).
// ---------------------------------------------------------------------------
describe('CR-051 Scenario 2: devops.md file existence at live path', () => {
  it('live devops.md exists at .claude/agents/devops.md (skipped in worktrees)', () => {
    if (isWorktree()) {
      // Live .claude/agents/ is gitignored and not checked out in worktrees.
      // Skip without fail per FLASHCARD 2026-05-04 #qa #worktree #mirror.
      return;
    }
    assert.ok(
      fs.existsSync(LIVE_DEVOPS),
      `devops.md not found at live path: ${LIVE_DEVOPS}`,
    );
  });
});

// ---------------------------------------------------------------------------
// Scenario 3 — frontmatter parses; required keys present
// Scenario 4 — name field === "devops"
// Pre-Dev: PASS (canonical devops.md has valid frontmatter). Post-Dev: still PASS.
// Live-path tests skipped in worktrees.
// ---------------------------------------------------------------------------
describe('CR-051 Scenario 3 + 4: frontmatter parse + name field', () => {
  it('canonical devops.md frontmatter parses and has required keys', () => {
    const content = fs.readFileSync(CANONICAL_DEVOPS, 'utf8');
    const fm = parseFrontmatter(content);
    assert.ok(fm !== null, 'frontmatter block (--- ... ---) not found in canonical devops.md');
    for (const key of REQUIRED_KEYS) {
      assert.ok(
        typeof fm[key] === 'string' && fm[key]!.length > 0,
        `canonical devops.md frontmatter missing or empty key: ${key}`,
      );
    }
  });

  it('canonical devops.md frontmatter.name === "devops"', () => {
    const content = fs.readFileSync(CANONICAL_DEVOPS, 'utf8');
    const fm = parseFrontmatter(content);
    assert.ok(fm !== null, 'frontmatter block (--- ... ---) not found in canonical devops.md');
    assert.equal(fm.name, 'devops', `expected name: "devops", got: "${fm.name}"`);
  });

  it('live devops.md frontmatter parses and has required keys (skipped in worktrees)', () => {
    if (isWorktree()) {
      return;
    }
    const content = fs.readFileSync(LIVE_DEVOPS, 'utf8');
    const fm = parseFrontmatter(content);
    assert.ok(fm !== null, 'frontmatter block (--- ... ---) not found in live devops.md');
    for (const key of REQUIRED_KEYS) {
      assert.ok(
        typeof fm[key] === 'string' && fm[key]!.length > 0,
        `live devops.md frontmatter missing or empty key: ${key}`,
      );
    }
  });

  it('live devops.md frontmatter.name === "devops" (skipped in worktrees)', () => {
    if (isWorktree()) {
      return;
    }
    const content = fs.readFileSync(LIVE_DEVOPS, 'utf8');
    const fm = parseFrontmatter(content);
    assert.ok(fm !== null, 'frontmatter block (--- ... ---) not found in live devops.md');
    assert.equal(fm.name, 'devops', `expected name: "devops", got: "${fm.name}"`);
  });
});

// ---------------------------------------------------------------------------
// CTRL (Sanity / positive baseline) — same shape checks for qa.md
// qa.md is a known-registering agent. If qa.md fails any check, devops.md
// likely has a systemic frontmatter problem too — controls for false-positive-on-shape.
// Pre-Dev: PASS. Post-Dev: still PASS. Live-path tests skipped in worktrees.
// ---------------------------------------------------------------------------
describe('CR-051 CTRL: qa.md passes same shape checks (control — known-registering agent)', () => {
  it('canonical qa.md exists at cleargate-planning/.claude/agents/qa.md', () => {
    assert.ok(
      fs.existsSync(CANONICAL_QA),
      `qa.md not found at canonical path: ${CANONICAL_QA}`,
    );
  });

  it('canonical qa.md frontmatter parses and has required keys', () => {
    const content = fs.readFileSync(CANONICAL_QA, 'utf8');
    const fm = parseFrontmatter(content);
    assert.ok(fm !== null, 'frontmatter block (--- ... ---) not found in canonical qa.md');
    for (const key of REQUIRED_KEYS) {
      assert.ok(
        typeof fm[key] === 'string' && fm[key]!.length > 0,
        `canonical qa.md frontmatter missing or empty key: ${key}`,
      );
    }
  });

  it('canonical qa.md frontmatter.name === "qa"', () => {
    const content = fs.readFileSync(CANONICAL_QA, 'utf8');
    const fm = parseFrontmatter(content);
    assert.ok(fm !== null, 'frontmatter block (--- ... ---) not found in canonical qa.md');
    assert.equal(fm.name, 'qa', `expected name: "qa", got: "${fm.name}"`);
  });

  it('live qa.md exists at .claude/agents/qa.md (skipped in worktrees)', () => {
    if (isWorktree()) {
      return;
    }
    assert.ok(
      fs.existsSync(LIVE_QA),
      `qa.md not found at live path: ${LIVE_QA}`,
    );
  });

  it('live qa.md frontmatter parses and has required keys (skipped in worktrees)', () => {
    if (isWorktree()) {
      return;
    }
    const content = fs.readFileSync(LIVE_QA, 'utf8');
    const fm = parseFrontmatter(content);
    assert.ok(fm !== null, 'frontmatter block (--- ... ---) not found in live qa.md');
    for (const key of REQUIRED_KEYS) {
      assert.ok(
        typeof fm[key] === 'string' && fm[key]!.length > 0,
        `live qa.md frontmatter missing or empty key: ${key}`,
      );
    }
  });

  it('live qa.md frontmatter.name === "qa" (skipped in worktrees)', () => {
    if (isWorktree()) {
      return;
    }
    const content = fs.readFileSync(LIVE_QA, 'utf8');
    const fm = parseFrontmatter(content);
    assert.ok(fm !== null, 'frontmatter block (--- ... ---) not found in live qa.md');
    assert.equal(fm.name, 'qa', `expected name: "qa", got: "${fm.name}"`);
  });
});
