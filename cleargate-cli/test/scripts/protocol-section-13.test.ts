/**
 * Tests for STORY-009-08: Protocol §13 verification.
 * Asserts that cleargate-protocol.md contains §13 with all 6 subsections,
 * contains concrete JSON shapes, §4 cross-ref, no TBDs, and live + mirror are byte-identical.
 */
import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';

// test/scripts/protocol-section-13.test.ts → up 4 levels → cleargate-cli/ → up 1 → repo root
const REPO_ROOT = path.resolve(new URL(import.meta.url).pathname, '..', '..', '..', '..');

const LIVE_PROTOCOL = path.join(REPO_ROOT, '.cleargate', 'knowledge', 'cleargate-protocol.md');
const MIRROR_PROTOCOL = path.join(
  REPO_ROOT,
  'cleargate-planning',
  '.cleargate',
  'knowledge',
  'cleargate-protocol.md',
);

describe('Scenario: Section present with all subsections', () => {
  it('cleargate-protocol.md contains exactly one ## 13. heading', () => {
    const content = fs.readFileSync(LIVE_PROTOCOL, 'utf8');
    const matches = content.match(/^## 13\./gm) ?? [];
    expect(matches).toHaveLength(1);
  });

  it('protocol §13 heading is "Scaffold Manifest & Uninstall"', () => {
    const content = fs.readFileSync(LIVE_PROTOCOL, 'utf8');
    expect(content).toContain('## 13. Scaffold Manifest & Uninstall');
  });

  it('protocol contains §13.1', () => {
    const content = fs.readFileSync(LIVE_PROTOCOL, 'utf8');
    expect(content).toContain('### §13.1 Overview');
  });

  it('protocol contains §13.2', () => {
    const content = fs.readFileSync(LIVE_PROTOCOL, 'utf8');
    expect(content).toContain('### §13.2 Install');
  });

  it('protocol contains §13.3', () => {
    const content = fs.readFileSync(LIVE_PROTOCOL, 'utf8');
    expect(content).toContain('### §13.3 Drift detection');
  });

  it('protocol contains §13.4', () => {
    const content = fs.readFileSync(LIVE_PROTOCOL, 'utf8');
    expect(content).toContain('### §13.4 Upgrade');
  });

  it('protocol contains §13.5', () => {
    const content = fs.readFileSync(LIVE_PROTOCOL, 'utf8');
    expect(content).toContain('### §13.5 Uninstall');
  });

  it('protocol contains §13.6', () => {
    const content = fs.readFileSync(LIVE_PROTOCOL, 'utf8');
    expect(content).toContain('### §13.6 Publishing notes');
  });
});

describe('Scenario: Cross-reference from §4', () => {
  it('§4 contains a pointer to §13 for scaffold lifecycle commands', () => {
    const content = fs.readFileSync(LIVE_PROTOCOL, 'utf8');
    expect(content).toContain('See §13 for scaffold lifecycle commands');
  });
});

describe('Scenario: No TBDs in §13', () => {
  it('§13 section contains no TBD strings', () => {
    const content = fs.readFileSync(LIVE_PROTOCOL, 'utf8');
    const section13Start = content.indexOf('## 13. Scaffold Manifest & Uninstall');
    expect(section13Start).toBeGreaterThan(-1);
    const section13Body = content.slice(section13Start);
    expect(section13Body).not.toContain('TBD');
  });
});

describe('Scenario: Concrete shapes included', () => {
  it('§13.2 contains the .install-manifest.json shape in a fenced JSON block', () => {
    const content = fs.readFileSync(LIVE_PROTOCOL, 'utf8');
    // The install manifest block must contain cleargate_version and files array
    expect(content).toContain('"cleargate_version"');
    expect(content).toContain('"installed_at"');
    expect(content).toContain('"overwrite_policy"');
  });

  it('§13.5 contains the .uninstalled marker shape in a fenced JSON block', () => {
    const content = fs.readFileSync(LIVE_PROTOCOL, 'utf8');
    expect(content).toContain('"uninstalled_at"');
    expect(content).toContain('"prior_version"');
    expect(content).toContain('"preserved"');
    expect(content).toContain('"removed"');
  });
});

describe('Scenario: Protocol live and mirror are byte-identical', () => {
  it('live cleargate-protocol.md === mirror cleargate-protocol.md', () => {
    const live = fs.readFileSync(LIVE_PROTOCOL, 'utf8');
    const mirror = fs.readFileSync(MIRROR_PROTOCOL, 'utf8');
    expect(live).toBe(mirror);
  });
});
