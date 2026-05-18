import { describe, test } from 'node:test';
import assert from 'node:assert/strict';

/**
 * Tests for STORY-008-07: Protocol §12 verification.
 * Asserts that cleargate-protocol.md contains §12 with all 5 subsections,
 * and that live + mirror are byte-identical.
 */
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
  test('cleargate-protocol.md contains exactly one ## 12. heading', () => {
    const content = fs.readFileSync(LIVE_PROTOCOL, 'utf8');
    const matches = content.match(/^## 12\./gm) ?? [];
    assert.strictEqual((matches).length, 1);
  });

  test('protocol §12 heading is "Token Cost Stamping & Readiness Gates"', () => {
    const content = fs.readFileSync(LIVE_PROTOCOL, 'utf8');
    assert.ok(String(content).includes('## 12. Token Cost Stamping & Readiness Gates'));
  });

  test('protocol contains §12.1 Overview', () => {
    const content = fs.readFileSync(LIVE_PROTOCOL, 'utf8');
    assert.ok(String(content).includes('### §12.1 Overview'));
  });

  test('protocol contains §12.2 Token stamp semantics', () => {
    const content = fs.readFileSync(LIVE_PROTOCOL, 'utf8');
    assert.ok(String(content).includes('### §12.2 Token stamp semantics'));
  });

  test('protocol contains §12.3 Readiness gates', () => {
    const content = fs.readFileSync(LIVE_PROTOCOL, 'utf8');
    assert.ok(String(content).includes('### §12.3 Readiness gates'));
  });

  test('protocol contains §12.4 Enforcement points', () => {
    const content = fs.readFileSync(LIVE_PROTOCOL, 'utf8');
    assert.ok(String(content).includes('### §12.4 Enforcement points'));
  });

  test('protocol contains §12.5 Hook lifecycle', () => {
    const content = fs.readFileSync(LIVE_PROTOCOL, 'utf8');
    assert.ok(String(content).includes('### §12.5 Hook lifecycle'));
  });
});

describe('Scenario: Protocol §4 has Gate 2 machine-check cross-reference', () => {
  test('§4 contains Gate 2 machine-checked cross-ref to §12', () => {
    const content = fs.readFileSync(LIVE_PROTOCOL, 'utf8');
    assert.ok(String(content).includes('cleargate gate check'));
    assert.ok(String(content).includes('see §12'));
  });
});

describe('Scenario: Protocol §10.8 has gate-check hook cross-reference', () => {
  test('§10.8 contains gate-check hook staleness reference', () => {
    const content = fs.readFileSync(LIVE_PROTOCOL, 'utf8');
    assert.ok(String(content).includes('gate-check hook (§12.5)'));
    assert.ok(String(content).includes('staleness (§12.4)'));
  });
});

describe('Scenario: Protocol live and mirror are byte-identical', () => {
  test('live cleargate-protocol.md === mirror cleargate-protocol.md', () => {
    const live = fs.readFileSync(LIVE_PROTOCOL, 'utf8');
    const mirror = fs.readFileSync(MIRROR_PROTOCOL, 'utf8');
    assert.strictEqual(live, mirror);
  });
});
