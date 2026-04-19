/**
 * Tests for STORY-008-07: gate-failure + gate-stale lint checks.
 * Five scenarios matching Gherkin acceptance criteria.
 * Real-fs fixtures under os.tmpdir(). No fs mocks.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { checkGateFailure, checkGateStaleness } from '../../src/wiki/lint-checks.js';
import type { LoadedWikiPage } from '../../src/wiki/load-wiki.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

interface TestFixture {
  root: string;
  cleanup: () => void;
}

function buildTestFixture(): TestFixture {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'cg-gate-lint-test-'));
  fs.mkdirSync(path.join(root, '.cleargate', 'delivery', 'pending-sync'), { recursive: true });
  fs.mkdirSync(path.join(root, '.cleargate', 'wiki', 'epics'), { recursive: true });
  return { root, cleanup: () => fs.rmSync(root, { recursive: true, force: true }) };
}

/** Write a raw delivery file and return its relative path. */
function writeRawFile(root: string, filename: string, content: string): string {
  const relPath = `.cleargate/delivery/pending-sync/${filename}`;
  fs.writeFileSync(path.join(root, relPath), content, 'utf8');
  return relPath;
}

/** Build a minimal LoadedWikiPage stub pointing at the given raw_path. */
function makeWikiPage(root: string, rawPath: string): LoadedWikiPage {
  const pageFile = path.join(root, '.cleargate', 'wiki', 'epics', 'EPIC-Z.md');
  const content = [
    '---',
    'type: epic',
    'id: "EPIC-Z"',
    'parent: ""',
    'children: []',
    'status: "🟢"',
    'remote_id: ""',
    `raw_path: "${rawPath}"`,
    'last_ingest: "2026-04-19T12:00:00.000Z"',
    'last_ingest_commit: ""',
    'repo: "planning"',
    '---',
    '',
    '# EPIC-Z: Test Epic',
  ].join('\n');
  fs.writeFileSync(pageFile, content, 'utf8');

  return {
    absPath: pageFile,
    body: '# EPIC-Z: Test Epic',
    page: {
      type: 'epic',
      id: 'EPIC-Z',
      parent: '',
      children: [],
      status: '🟢',
      remote_id: '',
      raw_path: rawPath,
      last_ingest: '2026-04-19T12:00:00.000Z',
      last_ingest_commit: '',
      repo: 'planning',
    },
  };
}

// ─── Scenario 1: Enforcing fail — Epic Ready + pass:false emits gate-failure ──

describe('Scenario: Enforcing fail — Epic with status:Ready + pass:false', () => {
  let fixture: TestFixture;

  beforeEach(() => { fixture = buildTestFixture(); });
  afterEach(() => fixture.cleanup());

  it('checkGateFailure emits gate-failure finding with criterion id', () => {
    // Use inline flow YAML (the format writeCachedGate produces — parseFrontmatter treats {…} as opaque string)
    const rawContent = `---
epic_id: "EPIC-Z"
status: "Ready"
ambiguity: "🟢 Low"
updated_at: "2026-04-19T00:00:00Z"
cached_gate_result: {pass: false, failing_criteria: [{id: "no-tbds", detail: "No TBDs in document"}], last_gate_check: "2026-04-19T00:00:00Z"}
---

# EPIC-Z: Test Epic
`;
    const rawPath = writeRawFile(fixture.root, 'EPIC-Z_Test.md', rawContent);
    const page = makeWikiPage(fixture.root, rawPath);

    const finding = checkGateFailure(page, fixture.root);
    expect(finding).not.toBeNull();
    expect(finding!.category).toBe('gate-failure');
    expect(finding!.line).toContain('EPIC-Z');
    expect(finding!.line).toContain('no-tbds');
  });
});

// ─── Scenario 2: Advisory tolerated — Proposal pass:false returns null ────────

describe('Scenario: Advisory tolerated — Proposal with pass:false is not enforcing', () => {
  let fixture: TestFixture;

  beforeEach(() => { fixture = buildTestFixture(); });
  afterEach(() => fixture.cleanup());

  it('checkGateFailure returns null for Proposal type (advisory only)', () => {
    const rawContent = `---
proposal_id: "PROP-Z"
status: "Ready"
ambiguity: "🟢 Low"
updated_at: "2026-04-19T00:00:00Z"
cached_gate_result: {pass: false, failing_criteria: [{id: "no-tbds", detail: "No TBDs"}], last_gate_check: "2026-04-19T00:00:00Z"}
---

# PROP-Z: Test Proposal
`;
    const rawPath = writeRawFile(fixture.root, 'PROPOSAL-Z.md', rawContent);
    const page = makeWikiPage(fixture.root, rawPath);
    // Patch page.page.raw_path to point to proposal
    page.page.raw_path = rawPath;

    const finding = checkGateFailure(page, fixture.root);
    expect(finding).toBeNull();
  });
});

// ─── Scenario 3: Null pass ignored — Draft Epic not flagged ──────────────────

describe('Scenario: Null pass ignored — Epic with pass:null returns null', () => {
  let fixture: TestFixture;

  beforeEach(() => { fixture = buildTestFixture(); });
  afterEach(() => fixture.cleanup());

  it('checkGateFailure returns null when cached_gate_result.pass is null', () => {
    // Null pass: template stub form — parseFrontmatter sees empty value, returns [] — parseCachedGateResult returns null
    const rawContent = `---
epic_id: "EPIC-Z"
status: "Draft"
ambiguity: "🔴 High"
updated_at: "2026-04-19T00:00:00Z"
cached_gate_result: {pass: null, failing_criteria: [], last_gate_check: null}
---

# EPIC-Z: Draft Epic
`;
    const rawPath = writeRawFile(fixture.root, 'EPIC-Z_Draft.md', rawContent);
    const page = makeWikiPage(fixture.root, rawPath);

    const finding = checkGateFailure(page, fixture.root);
    expect(finding).toBeNull();
  });
});

// ─── Scenario 4: Staleness — last_gate_check < updated_at emits gate-stale ───

describe('Scenario: Staleness — last_gate_check < updated_at emits gate-stale', () => {
  let fixture: TestFixture;

  beforeEach(() => { fixture = buildTestFixture(); });
  afterEach(() => fixture.cleanup());

  it('checkGateStaleness emits gate-stale when last_gate_check is before updated_at', () => {
    const rawContent = `---
epic_id: "EPIC-Z"
status: "Ready"
updated_at: "2026-04-19T00:00:00Z"
cached_gate_result: {pass: true, failing_criteria: [], last_gate_check: "2026-04-18T00:00:00Z"}
---

# EPIC-Z: Test Epic
`;
    const rawPath = writeRawFile(fixture.root, 'EPIC-Z_Stale.md', rawContent);
    const page = makeWikiPage(fixture.root, rawPath);

    const finding = checkGateStaleness(page, fixture.root);
    expect(finding).not.toBeNull();
    expect(finding!.category).toBe('gate-stale');
    expect(finding!.line).toContain('last_gate_check=2026-04-18T00:00:00Z');
    expect(finding!.line).toContain('updated_at=2026-04-19T00:00:00Z');
  });
});

// ─── Scenario 5: Fresh — last_gate_check >= updated_at returns null ───────────

describe('Scenario: Fresh — last_gate_check >= updated_at returns null', () => {
  let fixture: TestFixture;

  beforeEach(() => { fixture = buildTestFixture(); });
  afterEach(() => fixture.cleanup());

  it('checkGateStaleness returns null when last_gate_check is equal to updated_at', () => {
    const rawContent = `---
epic_id: "EPIC-Z"
status: "Ready"
updated_at: "2026-04-19T00:00:00Z"
cached_gate_result: {pass: true, failing_criteria: [], last_gate_check: "2026-04-19T00:00:00Z"}
---

# EPIC-Z: Test Epic
`;
    const rawPath = writeRawFile(fixture.root, 'EPIC-Z_Fresh.md', rawContent);
    const page = makeWikiPage(fixture.root, rawPath);

    const finding = checkGateStaleness(page, fixture.root);
    expect(finding).toBeNull();
  });

  it('checkGateStaleness returns null when last_gate_check is after updated_at', () => {
    const rawContent = `---
epic_id: "EPIC-Z"
status: "Ready"
updated_at: "2026-04-18T00:00:00Z"
cached_gate_result: {pass: true, failing_criteria: [], last_gate_check: "2026-04-19T00:00:00Z"}
---

# EPIC-Z: Test Epic
`;
    const rawPath = writeRawFile(fixture.root, 'EPIC-Z_Fresh2.md', rawContent);
    const page = makeWikiPage(fixture.root, rawPath);

    const finding = checkGateStaleness(page, fixture.root);
    expect(finding).toBeNull();
  });
});
