/**
 * protocol-section-14.test.ts — STORY-010-08
 *
 * Verifies that §14 "Multi-Participant Sync" is present in BOTH:
 *   1. .cleargate/knowledge/cleargate-protocol.md (dogfood)
 *   2. cleargate-planning/.cleargate/knowledge/cleargate-protocol.md (scaffold mirror)
 *
 * And that the two files are byte-identical (scaffold-mirror discipline).
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';

const REPO_ROOT = path.resolve('/Users/ssuladze/Documents/Dev/ClearGate');

const DOGFOOD_PROTOCOL = path.join(REPO_ROOT, '.cleargate', 'knowledge', 'cleargate-protocol.md');
const SCAFFOLD_PROTOCOL = path.join(REPO_ROOT, 'cleargate-planning', '.cleargate', 'knowledge', 'cleargate-protocol.md');

const EXPECTED_SUBSECTIONS = [
  '### §14.1 Sync matrix & authority split',
  '### §14.2 Conflict resolution',
  '### §14.3 Sync ordering invariant',
  '### §14.4 Identity resolution precedence',
  '### §14.5 Stakeholder-authored proposal flow',
  '### §14.6 Comment policy',
  '### §14.7 Push preconditions',
  '### §14.8 Revert policy',
  '### §14.9 Sync cadence',
];

describe('Protocol §14 completeness and scaffold-mirror', () => {
  it('Scenario 9: all 9 §14 subsections present in dogfood protocol file', () => {
    const content = fs.readFileSync(DOGFOOD_PROTOCOL, 'utf8');
    for (const heading of EXPECTED_SUBSECTIONS) {
      expect(content, `Missing in dogfood: ${heading}`).toContain(heading);
    }
    // Also assert top-level § 14 section header
    expect(content).toContain('## 14. Multi-Participant Sync');
  });

  it('Scenario 9b: all 9 §14 subsections present in scaffold mirror protocol file', () => {
    const content = fs.readFileSync(SCAFFOLD_PROTOCOL, 'utf8');
    for (const heading of EXPECTED_SUBSECTIONS) {
      expect(content, `Missing in scaffold: ${heading}`).toContain(heading);
    }
    expect(content).toContain('## 14. Multi-Participant Sync');
  });

  it('Scenario 10: diff between dogfood and scaffold protocol files is empty (byte-identical)', () => {
    const dogfood = fs.readFileSync(DOGFOOD_PROTOCOL, 'utf8');
    const scaffold = fs.readFileSync(SCAFFOLD_PROTOCOL, 'utf8');
    expect(dogfood).toBe(scaffold);
  });
});
