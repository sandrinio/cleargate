/**
 * template-sync-fields.test.ts — STORY-010-01 §4 quality gate, test 11.
 *
 * For each of 5 work-item templates:
 *   a) The file contains all 6 new sync-attribution keys as strings.
 *   b) For templates with a proper ---...--- frontmatter block (epic, story, CR, Bug):
 *      parseFrontmatter returns an object with all 6 new keys + pre-existing keys intact.
 *      Round-trip via serializeFrontmatter → parseFrontmatter → deep-equal original.
 *   c) Live and mirror templates remain byte-identical (scaffold mirror discipline).
 */
import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { parseFrontmatter } from '../../src/wiki/parse-frontmatter.js';
import { serializeFrontmatter } from '../../src/lib/frontmatter-yaml.js';

// test/scripts/ → test/ → cleargate-cli/ → repo-root/ (3 levels up)
const REPO_ROOT = path.resolve(new URL(import.meta.url).pathname, '..', '..', '..', '..');

const LIVE_TEMPLATES_DIR = path.join(REPO_ROOT, '.cleargate', 'templates');
const MIRROR_TEMPLATES_DIR = path.join(REPO_ROOT, 'cleargate-planning', '.cleargate', 'templates');

const NEW_FIELDS = [
  'pushed_by',
  'pushed_at',
  'last_pulled_by',
  'last_pulled_at',
  'last_remote_update',
  'source',
] as const;

// Templates with proper ---...--- YAML frontmatter blocks (parseable via parseFrontmatter)
const PARSEABLE_TEMPLATES = ['epic.md', 'story.md', 'CR.md', 'Bug.md'] as const;

// All 4 work-item templates (proposal.md removed by CR-025 M3)
const ALL_TEMPLATES = ['epic.md', 'story.md', 'CR.md', 'Bug.md'] as const;

/**
 * Extract the YAML block from a template file.
 * Templates start with an <instructions>...</instructions> block before the --- delimiter.
 * We find the first --- occurrence and treat everything between it and the second --- as YAML.
 */
function extractYamlBlock(content: string): string | null {
  const firstDash = content.indexOf('---');
  if (firstDash === -1) return null;
  const afterFirst = content.indexOf('---', firstDash + 3);
  if (afterFirst === -1) return null;
  // Return just the ---...--- block
  return content.slice(firstDash, afterFirst + 3);
}

describe('Scenario: Templates carry new sync-attribution fields (string presence)', () => {
  for (const name of ALL_TEMPLATES) {
    it(`live template ${name} contains all 6 new sync fields`, () => {
      const content = fs.readFileSync(path.join(LIVE_TEMPLATES_DIR, name), 'utf8');
      for (const field of NEW_FIELDS) {
        expect(content, `${name} should contain field "${field}"`).toContain(`${field}:`);
      }
    });
  }
});

describe('Scenario: Templates parseable via parseFrontmatter contain new fields in FM', () => {
  for (const name of PARSEABLE_TEMPLATES) {
    it(`live template ${name} — parseFrontmatter returns all 6 new keys`, () => {
      const content = fs.readFileSync(path.join(LIVE_TEMPLATES_DIR, name), 'utf8');
      const yamlBlock = extractYamlBlock(content);
      expect(yamlBlock, `${name} must have a ---...--- block`).not.toBeNull();

      const { fm } = parseFrontmatter(yamlBlock!);

      for (const field of NEW_FIELDS) {
        expect(fm, `${name} frontmatter should have key "${field}"`).toHaveProperty(field);
      }
    });

    it(`live template ${name} — frontmatter round-trips losslessly`, () => {
      const content = fs.readFileSync(path.join(LIVE_TEMPLATES_DIR, name), 'utf8');
      const yamlBlock = extractYamlBlock(content);
      expect(yamlBlock).not.toBeNull();

      const { fm: originalFm } = parseFrontmatter(yamlBlock!);
      const serialized = serializeFrontmatter(originalFm);
      const { fm: roundTripped } = parseFrontmatter(serialized);

      expect(roundTripped).toEqual(originalFm);
    });
  }
});

describe('Scenario: Scaffold mirror parity — live === mirror for 5 work-item templates', () => {
  for (const name of ALL_TEMPLATES) {
    it(`template ${name}: live === mirror`, () => {
      const live = fs.readFileSync(path.join(LIVE_TEMPLATES_DIR, name), 'utf8');
      const mirror = fs.readFileSync(path.join(MIRROR_TEMPLATES_DIR, name), 'utf8');
      expect(live).toBe(mirror);
    });
  }
});

describe('Scenario: Pre-existing frontmatter keys preserved', () => {
  for (const name of PARSEABLE_TEMPLATES) {
    it(`live template ${name} still has draft_tokens and cached_gate_result`, () => {
      const content = fs.readFileSync(path.join(LIVE_TEMPLATES_DIR, name), 'utf8');
      expect(content).toContain('draft_tokens:');
      expect(content).toContain('cached_gate_result:');
    });
  }
});
