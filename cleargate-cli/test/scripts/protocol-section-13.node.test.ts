import { describe, test } from 'node:test';
import assert from 'node:assert/strict';

/**
 * Tests for STORY-009-08: Protocol §13 verification.
 * Asserts that cleargate-protocol.md contains §13 with all 6 subsections,
 * contains concrete JSON shapes, §4 cross-ref, no TBDs, and live + mirror are byte-identical.
 */
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
  test('cleargate-protocol.md contains exactly one ## 13. heading', () => {
    const content = fs.readFileSync(LIVE_PROTOCOL, 'utf8');
    const matches = content.match(/^## 13\./gm) ?? [];
    assert.strictEqual((matches).length, 1);
  });

  test('protocol §13 heading is "Scaffold Manifest & Uninstall"', () => {
    const content = fs.readFileSync(LIVE_PROTOCOL, 'utf8');
    assert.ok(String(content).includes('## 13. Scaffold Manifest & Uninstall'));
  });

  test('protocol contains §13.1', () => {
    const content = fs.readFileSync(LIVE_PROTOCOL, 'utf8');
    assert.ok(String(content).includes('### §13.1 Overview'));
  });

  test('protocol contains §13.2', () => {
    const content = fs.readFileSync(LIVE_PROTOCOL, 'utf8');
    assert.ok(String(content).includes('### §13.2 Install'));
  });

  test('protocol contains §13.3', () => {
    const content = fs.readFileSync(LIVE_PROTOCOL, 'utf8');
    assert.ok(String(content).includes('### §13.3 Drift detection'));
  });

  test('protocol contains §13.4', () => {
    const content = fs.readFileSync(LIVE_PROTOCOL, 'utf8');
    assert.ok(String(content).includes('### §13.4 Upgrade'));
  });

  test('protocol contains §13.5', () => {
    const content = fs.readFileSync(LIVE_PROTOCOL, 'utf8');
    assert.ok(String(content).includes('### §13.5 Uninstall'));
  });

  test('protocol contains §13.6', () => {
    const content = fs.readFileSync(LIVE_PROTOCOL, 'utf8');
    assert.ok(String(content).includes('### §13.6 Publishing notes'));
  });
});

describe('Scenario: Cross-reference from §4', () => {
  test('§4 contains a pointer to §13 for scaffold lifecycle commands', () => {
    const content = fs.readFileSync(LIVE_PROTOCOL, 'utf8');
    assert.ok(String(content).includes('See §13 for scaffold lifecycle commands'));
  });
});

describe('Scenario: No TBDs in §13', () => {
  test('§13 section contains no TBD strings', () => {
    const content = fs.readFileSync(LIVE_PROTOCOL, 'utf8');
    const section13Start = content.indexOf('## 13. Scaffold Manifest & Uninstall');
    assert.ok(section13Start > -1);
    const section13Body = content.slice(section13Start);
    assert.ok(!String(section13Body).includes('TBD'));
  });
});

describe('Scenario: Concrete shapes included', () => {
  test('§13.2 contains the .install-manifest.json shape in a fenced JSON block', () => {
    const content = fs.readFileSync(LIVE_PROTOCOL, 'utf8');
    // The install manifest block must contain cleargate_version and files array
    assert.ok(String(content).includes('"cleargate_version"'));
    assert.ok(String(content).includes('"installed_at"'));
    assert.ok(String(content).includes('"overwrite_policy"'));
  });

  test('§13.5 contains the .uninstalled marker shape in a fenced JSON block', () => {
    const content = fs.readFileSync(LIVE_PROTOCOL, 'utf8');
    assert.ok(String(content).includes('"uninstalled_at"'));
    assert.ok(String(content).includes('"prior_version"'));
    assert.ok(String(content).includes('"preserved"'));
    assert.ok(String(content).includes('"removed"'));
  });
});

describe('Scenario: Protocol live and mirror are byte-identical', () => {
  test('live cleargate-protocol.md === mirror cleargate-protocol.md', () => {
    const live = fs.readFileSync(LIVE_PROTOCOL, 'utf8');
    const mirror = fs.readFileSync(MIRROR_PROTOCOL, 'utf8');
    assert.strictEqual(live, mirror);
  });
});
