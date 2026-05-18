import { describe, test } from 'node:test';
import assert from 'node:assert/strict';

/**
 * agent-developer-section.test.ts — STORY-022-05
 *
 * Verifies that `cleargate-planning/.claude/agents/developer.md` (scaffold)
 * contains the required § "Lane-Aware Execution" section, and that the live
 * mirror is byte-identical to the scaffold.
 *
 * Test coverage:
 *   Scenario 1 — developer.md documents lane-aware spawn behavior
 *   Scenario 2 — live developer.md is byte-identical to scaffold (mirror discipline)
 *   Scenario 3 — First-line marker contract preserved
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

const REPO_ROOT = path.resolve('/Users/ssuladze/Documents/Dev/ClearGate');

const SCAFFOLD_DEVELOPER = path.join(
  REPO_ROOT,
  'cleargate-planning',
  '.claude',
  'agents',
  'developer.md',
);

const LIVE_DEVELOPER = path.join(REPO_ROOT, '.claude', 'agents', 'developer.md');

/**
 * Extract the body of the ## Lane-Aware Execution section from heading to the
 * next top-level ## heading (or EOF).
 */
function extractLaneAwareSection(content: string): string[] {
  const lines = content.split('\n');
  const start = lines.findIndex((l) => /^## Lane-Aware Execution/.test(l));
  if (start === -1) return [];
  const end = lines.findIndex((l, i) => i > start && /^## /.test(l));
  return end === -1 ? lines.slice(start) : lines.slice(start, end);
}

describe('Developer agent — Lane-Aware Execution (STORY-022-05)', () => {
  test('Scenario 1: developer.md documents lane-aware spawn behavior', () => {
    const content = fs.readFileSync(SCAFFOLD_DEVELOPER, 'utf8');

    // Section heading must exist
    assert.ok(String(content, 'Missing ## Lane-Aware Execution heading in developer.md').includes(
      '## Lane-Aware Execution',
    ));

    const section = extractLaneAwareSection(content).join('\n');

    // Must describe both lane=fast and lane=standard branches
    assert.ok(String(section, 'Section missing lane=fast keyword').includes('lane=fast'));
    assert.ok(String(section, 'Section missing lane=standard keyword').includes('lane=standard'));

    // Pre-gate scanner is never skipped on lane=fast
    assert.match(String(section, 'Section must state pre-gate scanner is never skipped'), 
      /pre.gate scanner.*never skipped|never skipped.*pre.gate scanner/is,
    );
    assert.ok(String(section, 'Section must mention pre-gate scanner by name').includes('pre-gate scanner'));

    // Demotion handler delegated to orchestrator re-dispatch
    assert.match(String(
      section,
      'Section must mention orchestrator re-dispatch for demotion handling',
    ), /orchestrator re.dispatch|orchestrator.*re-dispatch/i);
  });

  test('Scenario 2: live developer.md is byte-identical to scaffold (mirror discipline)', () => {
    // Only assert if the live file exists (it is gitignored; CI environments may
    // not have it). If the file is absent, skip this check so CI stays green.
    if (!fs.existsSync(LIVE_DEVELOPER)) {
      console.warn(
        'SKIP: .claude/agents/developer.md not present (gitignored); skipping byte-equality check.',
      );
      return;
    }
    const scaffold = fs.readFileSync(SCAFFOLD_DEVELOPER, 'utf8');
    const live = fs.readFileSync(LIVE_DEVELOPER, 'utf8');
    assert.strictEqual(live, 'Live developer.md differs from scaffold — run: cp cleargate-planning/.claude/agents/developer.md .claude/agents/developer.md', scaffold);
  });

  test('Scenario 3: first-line marker contract preserved — STORY=NNN-NN present, lane NOT part of marker', () => {
    const content = fs.readFileSync(SCAFFOLD_DEVELOPER, 'utf8');

    // STORY=NNN-NN literal must still appear in the file
    assert.ok(String(
      content,
      'STORY=NNN-NN first-line marker token must be present in developer.md',
    ).includes('STORY=NNN-NN'));

    // Other BUG-010 detector vocabulary variants must also be present
    assert.ok(String(content, 'CR=NNN marker token must be present').includes('CR=NNN'));
    assert.ok(String(content, 'BUG=NNN marker token must be present').includes('BUG=NNN'));

    // Extract the Lane-Aware Execution section and verify the first-line marker
    // contract is stated: lane is NOT part of the first-line marker
    const section = extractLaneAwareSection(content).join('\n');
    assert.match(String(
      section,
      'Lane-Aware Execution section must state lane is NOT part of the first-line marker',
    ), /lane is .{0,20}NOT.{0,20} part of the first.line marker/i);
  });
});
