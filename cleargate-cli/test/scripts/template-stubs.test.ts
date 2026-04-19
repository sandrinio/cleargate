/**
 * Tests for STORY-008-07: Template stubs verification.
 * Asserts that all 7 live + 7 mirror templates contain draft_tokens + cached_gate_result keys.
 */
import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';

// test/scripts/template-stubs.test.ts → up 4 levels → cleargate-cli/ → up 1 → repo root
const REPO_ROOT = path.resolve(new URL(import.meta.url).pathname, '..', '..', '..', '..');

const LIVE_TEMPLATES_DIR = path.join(REPO_ROOT, '.cleargate', 'templates');
const MIRROR_TEMPLATES_DIR = path.join(REPO_ROOT, 'cleargate-planning', '.cleargate', 'templates');

const TEMPLATE_NAMES = [
  'Bug.md',
  'CR.md',
  'Sprint Plan Template.md',
  'epic.md',
  'initiative.md',
  'proposal.md',
  'story.md',
];

describe('Scenario: All 7 live templates have draft_tokens + cached_gate_result stubs', () => {
  for (const name of TEMPLATE_NAMES) {
    it(`live template ${name} contains draft_tokens and cached_gate_result`, () => {
      const filePath = path.join(LIVE_TEMPLATES_DIR, name);
      const content = fs.readFileSync(filePath, 'utf8');
      expect(content).toContain('draft_tokens:');
      expect(content).toContain('cached_gate_result:');
    });
  }
});

describe('Scenario: All 7 mirror templates have draft_tokens + cached_gate_result stubs', () => {
  for (const name of TEMPLATE_NAMES) {
    it(`mirror template ${name} contains draft_tokens and cached_gate_result`, () => {
      const filePath = path.join(MIRROR_TEMPLATES_DIR, name);
      const content = fs.readFileSync(filePath, 'utf8');
      expect(content).toContain('draft_tokens:');
      expect(content).toContain('cached_gate_result:');
    });
  }
});

describe('Scenario: Live and mirror templates are byte-identical', () => {
  for (const name of TEMPLATE_NAMES) {
    it(`template ${name}: live === mirror`, () => {
      const live = fs.readFileSync(path.join(LIVE_TEMPLATES_DIR, name), 'utf8');
      const mirror = fs.readFileSync(path.join(MIRROR_TEMPLATES_DIR, name), 'utf8');
      expect(live).toBe(mirror);
    });
  }
});
