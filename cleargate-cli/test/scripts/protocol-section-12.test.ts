/**
 * Tests for STORY-008-07: Protocol §12 verification.
 * Asserts that cleargate-protocol.md contains §12 with all 5 subsections,
 * and that live + mirror are byte-identical.
 */
import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';

// test/scripts/protocol-section-12.test.ts → up 4 levels → cleargate-cli/ → up 1 → repo root
const REPO_ROOT = path.resolve(new URL(import.meta.url).pathname, '..', '..', '..', '..');

const LIVE_PROTOCOL = path.join(REPO_ROOT, '.cleargate', 'knowledge', 'cleargate-protocol.md');
const MIRROR_PROTOCOL = path.join(
  REPO_ROOT,
  'cleargate-planning',
  '.cleargate',
  'knowledge',
  'cleargate-protocol.md',
);

describe('Scenario: Protocol §12 exists with all subsections', () => {
  it('cleargate-protocol.md contains exactly one ## 12. heading', () => {
    const content = fs.readFileSync(LIVE_PROTOCOL, 'utf8');
    const matches = content.match(/^## 12\./gm) ?? [];
    expect(matches).toHaveLength(1);
  });

  it('protocol §12 heading is "Token Cost Stamping & Readiness Gates"', () => {
    const content = fs.readFileSync(LIVE_PROTOCOL, 'utf8');
    expect(content).toContain('## 12. Token Cost Stamping & Readiness Gates');
  });

  it('protocol contains §12.1 Overview', () => {
    const content = fs.readFileSync(LIVE_PROTOCOL, 'utf8');
    expect(content).toContain('### §12.1 Overview');
  });

  it('protocol contains §12.2 Token stamp semantics', () => {
    const content = fs.readFileSync(LIVE_PROTOCOL, 'utf8');
    expect(content).toContain('### §12.2 Token stamp semantics');
  });

  it('protocol contains §12.3 Readiness gates', () => {
    const content = fs.readFileSync(LIVE_PROTOCOL, 'utf8');
    expect(content).toContain('### §12.3 Readiness gates');
  });

  it('protocol contains §12.4 Enforcement points', () => {
    const content = fs.readFileSync(LIVE_PROTOCOL, 'utf8');
    expect(content).toContain('### §12.4 Enforcement points');
  });

  it('protocol contains §12.5 Hook lifecycle', () => {
    const content = fs.readFileSync(LIVE_PROTOCOL, 'utf8');
    expect(content).toContain('### §12.5 Hook lifecycle');
  });
});

describe('Scenario: Protocol §4 has Gate 2 machine-check cross-reference', () => {
  it('§4 contains Gate 2 machine-checked cross-ref to §12', () => {
    const content = fs.readFileSync(LIVE_PROTOCOL, 'utf8');
    expect(content).toContain('cleargate gate check');
    expect(content).toContain('see §12');
  });
});

describe('Scenario: Protocol §10.8 has gate-check hook cross-reference', () => {
  it('§10.8 contains gate-check hook staleness reference', () => {
    const content = fs.readFileSync(LIVE_PROTOCOL, 'utf8');
    expect(content).toContain('gate-check hook (§12.5)');
    expect(content).toContain('staleness (§12.4)');
  });
});

describe('Scenario: Protocol live and mirror are byte-identical', () => {
  it('live cleargate-protocol.md === mirror cleargate-protocol.md', () => {
    const live = fs.readFileSync(LIVE_PROTOCOL, 'utf8');
    const mirror = fs.readFileSync(MIRROR_PROTOCOL, 'utf8');
    expect(live).toBe(mirror);
  });
});
