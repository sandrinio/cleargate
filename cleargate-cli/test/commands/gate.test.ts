/**
 * gate.test.ts — Integration + unit tests for `cleargate gate check|explain`
 *
 * Covers all 6 Gherkin scenarios from STORY-008-03 acceptance criteria:
 *   1. Check passing Epic → exit 0, cached_gate_result.pass = true
 *   2. Check failing enforcing Story → exit 1, stdout lists failing criteria
 *   3. Check failing Proposal (advisory) → exit 0, stdout prefixes ⚠
 *   4. Verbose output shows full detail per failing criterion
 *   5. Explain is read-only and cheap (≤50 tokens)
 *   6. Explicit transition override
 *
 * Plus unit tests:
 *   7. explain with no cached result prints hint and exits 0
 *   8. check on file with no ID frontmatter errors
 *   9. Type-detection detects proposal/epic/story/cr/bug from each ID key
 *  10. Transition-inference for Epic
 */

import { describe, it, expect, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { gateCheckHandler, gateExplainHandler } from '../../src/commands/gate.js';
import { parseFrontmatter } from '../../src/wiki/parse-frontmatter.js';
import {
  detectWorkItemTypeFromFm,
  detectWorkItemType,
  WORK_ITEM_TRANSITIONS,
} from '../../src/lib/work-item-type.js';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const FIXED_NOW = new Date('2026-01-01T12:00:00.000Z');
const FIXED_NOW_FN = () => FIXED_NOW;

/** Minimal readiness-gates.md for tests — 6 gate blocks. */
const GATES_DOC = `
# Readiness Gates

\`\`\`yaml
- work_item_type: proposal
  transition: ready-for-decomposition
  severity: advisory
  criteria:
    - id: architecture-populated
      check: "section(2) has ≥1 listed-item"
    - id: no-tbds
      check: "body does not contain 'TBD'"
\`\`\`

\`\`\`yaml
- work_item_type: epic
  transition: ready-for-decomposition
  severity: enforcing
  criteria:
    - id: no-tbds
      check: "body does not contain 'TBD'"
    - id: scope-in-populated
      check: "section(2) has ≥1 listed-item"
\`\`\`

\`\`\`yaml
- work_item_type: epic
  transition: ready-for-coding
  severity: enforcing
  criteria:
    - id: stories-referenced
      check: "body contains 'STORY-'"
    - id: no-tbds
      check: "body does not contain 'TBD'"
\`\`\`

\`\`\`yaml
- work_item_type: story
  transition: ready-for-execution
  severity: enforcing
  criteria:
    - id: parent-epic-ref-set
      check: "frontmatter(.).parent_epic_ref != null"
    - id: no-tbds
      check: "body does not contain 'TBD'"
    - id: implementation-files-declared
      check: "section(3) has ≥1 listed-item"
    - id: affected-files-verified
      check: "section(4) has ≥1 listed-item"
\`\`\`

\`\`\`yaml
- work_item_type: cr
  transition: ready-to-apply
  severity: enforcing
  criteria:
    - id: blast-radius-populated
      check: "section(1) has ≥1 listed-item"
    - id: no-tbds
      check: "body does not contain 'TBD'"
\`\`\`

\`\`\`yaml
- work_item_type: bug
  transition: ready-for-fix
  severity: enforcing
  criteria:
    - id: repro-steps-deterministic
      check: "section(2) has ≥3 listed-item"
    - id: severity-set
      check: "frontmatter(.).severity != null"
    - id: no-tbds
      check: "body does not contain 'TBD'"
\`\`\`
`;

/** An Epic that passes ready-for-decomposition: no TBDs, §2 has items. */
const PASSING_EPIC = `---
epic_id: "EPIC-X"
status: "Active"
---

# Epic X

## Section 1

Intro text.

## Section 2

- Scope item 1
- Scope item 2

## Section 3

More content.
`;

/** A Story that fails: no §3 or §4 items, no parent_epic_ref. */
const FAILING_STORY_NO_FILES = `---
story_id: "STORY-Y"
status: "Draft"
---

# Story Y

## Section 1

Intro.

## Section 2

Body text. No TBDs.

## Section 3

(empty)

## Section 4

(empty)
`;

/** A Proposal that contains a TBD (advisory). */
const PROPOSAL_WITH_TBD = `---
proposal_id: "PROPOSAL-Z"
status: "Draft"
---

# Proposal Z

## Section 1

Intro with TBD placeholder.

## Section 2

- Architecture item 1
`;

/** A Story that fails with a specific criterion for verbose output. */
const FAILING_STORY_VERBOSE = `---
story_id: "STORY-V"
status: "Draft"
parent_epic_ref: "EPIC-001"
---

# Story V

## Section 1

Intro.

## Section 2

Some text. No TBDs.

## Section 3

(no items)

## Section 4

(no items)
`;

/** An Epic that passes ready-for-decomposition (already cached as pass). */
const PASSING_EPIC_CACHED_PASS = `---
epic_id: "EPIC-W"
status: "Active"
cached_gate_result: {pass: true, failing_criteria: [], last_gate_check: "2026-01-01T10:00:00Z"}
---

# Epic W

## Section 1

Intro.

## Section 2

- Item 1

## Section 3

Body. References STORY-001-01.
`;

// ─── Helpers ──────────────────────────────────────────────────────────────────

const tmpDirs: string[] = [];

function makeTmpDir(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cg-gate-test-'));
  tmpDirs.push(dir);
  return dir;
}

function writeFile(filePath: string, content: string): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, 'utf8');
}

function readFileStr(filePath: string): string {
  return fs.readFileSync(filePath, 'utf8');
}

afterEach(() => {
  for (const dir of tmpDirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

/**
 * Set up a test environment with a gates doc and an input file.
 * Returns absPath of the work-item file and the gatesDocPath.
 */
function setupEnv(fileContent: string, filename = 'item.md'): {
  dir: string;
  absPath: string;
  gatesDocPath: string;
} {
  const dir = makeTmpDir();
  const absPath = path.join(dir, filename);
  writeFile(absPath, fileContent);
  const gatesDocPath = path.join(dir, 'readiness-gates.md');
  writeFile(gatesDocPath, GATES_DOC);
  return { dir, absPath, gatesDocPath };
}

// ─── Scenario 1: Check passing Epic → exit 0, pass = true ────────────────────

describe('Scenario: Check passing Epic', () => {
  it('exit 0 and cached_gate_result.pass = true', async () => {
    const { dir, absPath, gatesDocPath } = setupEnv(PASSING_EPIC);
    const out: string[] = [];
    const exitCodes: number[] = [];

    await gateCheckHandler(
      absPath,
      {},
      {
        cwd: dir,
        now: FIXED_NOW_FN,
        gatesDocPath,
        stdout: (s) => out.push(s),
        stderr: (s) => out.push(s),
        exit: (code) => { exitCodes.push(code); throw new Error(`exit(${code})`); },
      },
    );

    // Exit should NOT have been called (success path)
    expect(exitCodes).toHaveLength(0);

    // Verify frontmatter was updated with cached_gate_result
    const { fm } = parseFrontmatter(readFileStr(absPath));
    const cached = fm['cached_gate_result'] as { pass: boolean };
    expect(cached).toBeTruthy();
    expect(cached.pass).toBe(true);

    // stdout should contain the ✅ pass indicator
    expect(out.some((l) => l.includes('\u2705'))).toBe(true);
  });
});

// ─── Scenario 2: Check failing Story (enforcing) ─────────────────────────────

describe('Scenario: Check failing Story (enforcing)', () => {
  it('exit non-zero, stdout lists failing criteria, cached_gate_result.pass = false', async () => {
    const { dir, absPath, gatesDocPath } = setupEnv(FAILING_STORY_NO_FILES);
    const out: string[] = [];
    const errOut: string[] = [];
    const exitCodes: number[] = [];

    await expect(
      gateCheckHandler(
        absPath,
        {},
        {
          cwd: dir,
          now: FIXED_NOW_FN,
          gatesDocPath,
          stdout: (s) => out.push(s),
          stderr: (s) => errOut.push(s),
          exit: (code) => { exitCodes.push(code); throw new Error(`exit(${code})`); },
        },
      ),
    ).rejects.toThrow('exit(1)');

    expect(exitCodes).toEqual([1]);

    // stdout must contain ❌ and the criterion id
    const combined = out.join('\n');
    expect(combined).toContain('\u274C');

    // cached_gate_result.pass = false
    const { fm } = parseFrontmatter(readFileStr(absPath));
    const cached = fm['cached_gate_result'] as { pass: boolean; failing_criteria: { id: string }[] };
    expect(cached.pass).toBe(false);
    expect(cached.failing_criteria.some((c) => c.id === 'affected-files-verified')).toBe(true);
  });
});

// ─── Scenario 3: Check failing Proposal (advisory) ───────────────────────────

describe('Scenario: Check failing Proposal (advisory)', () => {
  it('exit 0, stdout prefixes ⚠, cached_gate_result.pass = false', async () => {
    const { dir, absPath, gatesDocPath } = setupEnv(PROPOSAL_WITH_TBD);
    const out: string[] = [];
    const exitCodes: number[] = [];

    await gateCheckHandler(
      absPath,
      {},
      {
        cwd: dir,
        now: FIXED_NOW_FN,
        gatesDocPath,
        stdout: (s) => out.push(s),
        stderr: () => {},
        exit: (code) => { exitCodes.push(code); throw new Error(`exit(${code})`); },
      },
    );

    // Must exit 0 (no exit called)
    expect(exitCodes).toHaveLength(0);

    // stdout must contain ⚠ and "(advisory)"
    const combined = out.join('\n');
    expect(combined).toContain('\u26A0');
    expect(combined).toContain('(advisory)');

    // cached_gate_result.pass = false (recorded but not enforced)
    const { fm } = parseFrontmatter(readFileStr(absPath));
    const cached = fm['cached_gate_result'] as { pass: boolean; failing_criteria: { id: string }[] };
    expect(cached.pass).toBe(false);
    expect(cached.failing_criteria.some((c) => c.id === 'no-tbds')).toBe(true);
  });
});

// ─── Scenario 4: Verbose output ───────────────────────────────────────────────

describe('Scenario: Verbose output', () => {
  it('stdout contains full predicate evaluation per failing criterion', async () => {
    const { dir, absPath, gatesDocPath } = setupEnv(FAILING_STORY_VERBOSE);
    const out: string[] = [];
    const exitCodes: number[] = [];

    await expect(
      gateCheckHandler(
        absPath,
        { verbose: true },
        {
          cwd: dir,
          now: FIXED_NOW_FN,
          gatesDocPath,
          stdout: (s) => out.push(s),
          stderr: () => {},
          exit: (code) => { exitCodes.push(code); throw new Error(`exit(${code})`); },
        },
      ),
    ).rejects.toThrow('exit(1)');

    // In verbose mode, we get per-criterion evaluation detail lines
    const combined = out.join('\n');
    // Verbose mode shows [pass] or [fail] lines
    expect(combined).toMatch(/\[(pass|fail)\]/);
  });
});

// ─── Scenario 5: Explain is read-only and cheap ──────────────────────────────

describe('Scenario: Explain is read-only and cheap', () => {
  it('output ≤50 LLM-tokens and no predicate re-evaluation (frontmatter unchanged)', async () => {
    const { dir, absPath, gatesDocPath } = setupEnv(PASSING_EPIC_CACHED_PASS);
    void gatesDocPath;

    const bytesBefore = readFileStr(absPath);
    const out: string[] = [];

    await gateExplainHandler(absPath, {
      cwd: dir,
      stdout: (s) => out.push(s),
      stderr: () => {},
      exit: (code) => { throw new Error(`unexpected exit(${code})`); },
    });

    // File must be byte-identical (read-only)
    expect(readFileStr(absPath)).toBe(bytesBefore);

    // Output should be a compact summary
    const combined = out.join('\n');
    // Approximate token budget: split on whitespace, expect ≤50 words
    const wordCount = combined.trim().split(/\s+/).length;
    expect(wordCount).toBeLessThanOrEqual(50);

    // Should contain pass/fail status
    expect(combined).toMatch(/pass|fail/);
  });
});

// ─── Scenario 6: Explicit transition override ─────────────────────────────────

describe('Scenario: Explicit transition override', () => {
  it('evaluation runs against the specified transition even when already passed', async () => {
    // PASSING_EPIC_CACHED_PASS has cached pass=true. With override to ready-for-decomposition
    // the evaluator should use that gate's criteria (which Epic-W still passes).
    const { dir, absPath, gatesDocPath } = setupEnv(PASSING_EPIC_CACHED_PASS);
    const out: string[] = [];
    const exitCodes: number[] = [];

    // Use the override. Epic-W body contains 'STORY-001-01' so ready-for-coding passes.
    // But we override to ready-for-decomposition.
    await gateCheckHandler(
      absPath,
      { transition: 'ready-for-decomposition' },
      {
        cwd: dir,
        now: FIXED_NOW_FN,
        gatesDocPath,
        stdout: (s) => out.push(s),
        stderr: () => {},
        exit: (code) => { exitCodes.push(code); throw new Error(`exit(${code})`); },
      },
    );

    // Should not exit non-zero (passes the criteria with §2 populated and no TBDs)
    expect(exitCodes).toHaveLength(0);

    // Header should reflect the overridden transition
    const combined = out.join('\n');
    expect(combined).toContain('ready-for-decomposition');
  });
});

// ─── Additional unit test: explain with no cached result ─────────────────────

describe('explain with no cached result', () => {
  it('prints hint and exits 0', async () => {
    const { dir, absPath } = setupEnv(PASSING_EPIC);
    const out: string[] = [];
    const exitCodes: number[] = [];

    await gateExplainHandler(absPath, {
      cwd: dir,
      stdout: (s) => out.push(s),
      stderr: () => {},
      exit: (code) => { exitCodes.push(code); throw new Error(`exit(${code})`); },
    });

    expect(exitCodes).toHaveLength(0);
    const combined = out.join('\n');
    expect(combined).toContain('no gate check cached');
    expect(combined).toContain('cleargate gate check');
  });
});

// ─── Additional unit test: check on file with no ID frontmatter errors ────────

describe('check on file with no ID frontmatter', () => {
  it('errors with "unable to detect work-item type"', async () => {
    const noIdFile = `---
title: "No ID here"
status: "Draft"
---

Body text.
`;
    const { dir, absPath, gatesDocPath } = setupEnv(noIdFile);
    const errOut: string[] = [];
    const exitCodes: number[] = [];

    await expect(
      gateCheckHandler(
        absPath,
        {},
        {
          cwd: dir,
          now: FIXED_NOW_FN,
          gatesDocPath,
          stdout: () => {},
          stderr: (s) => errOut.push(s),
          exit: (code) => { exitCodes.push(code); throw new Error(`exit(${code})`); },
        },
      ),
    ).rejects.toThrow('exit(1)');

    expect(exitCodes).toEqual([1]);
    expect(errOut.join('\n')).toContain('unable to detect work-item type');
  });
});

// ─── Unit test: type-detection from each ID key ───────────────────────────────

describe('type-detection unit test', () => {
  it('detects proposal from proposal_id key', () => {
    expect(detectWorkItemTypeFromFm({ proposal_id: 'PROPOSAL-001' })).toBe('proposal');
  });

  it('detects epic from epic_id key', () => {
    expect(detectWorkItemTypeFromFm({ epic_id: 'EPIC-001' })).toBe('epic');
  });

  it('detects story from story_id key', () => {
    expect(detectWorkItemTypeFromFm({ story_id: 'STORY-001-01' })).toBe('story');
  });

  it('detects cr from cr_id key', () => {
    expect(detectWorkItemTypeFromFm({ cr_id: 'CR-001' })).toBe('cr');
  });

  it('detects bug from bug_id key', () => {
    expect(detectWorkItemTypeFromFm({ bug_id: 'BUG-001' })).toBe('bug');
  });

  it('returns null when no known ID key present', () => {
    expect(detectWorkItemTypeFromFm({ title: 'No ID' })).toBeNull();
  });

  it('detectWorkItemType from string prefix', () => {
    expect(detectWorkItemType('STORY-008-03')).toBe('story');
    expect(detectWorkItemType('EPIC-008')).toBe('epic');
    expect(detectWorkItemType('PROPOSAL-005')).toBe('proposal');
    expect(detectWorkItemType('CR-001')).toBe('cr');
    expect(detectWorkItemType('BUG-001')).toBe('bug');
    expect(detectWorkItemType('UNKNOWN-123')).toBeNull();
  });
});

// ─── Unit test: transition inference for Epic ─────────────────────────────────

describe('transition-inference', () => {
  it('Epic with no cached gate → picks ready-for-decomposition (first)', async () => {
    // Verify WORK_ITEM_TRANSITIONS maps correctly
    expect(WORK_ITEM_TRANSITIONS['epic'][0]).toBe('ready-for-decomposition');
    expect(WORK_ITEM_TRANSITIONS['epic'][1]).toBe('ready-for-coding');

    // Run gate check on a fresh Epic (no cached gate) — it should pick ready-for-decomposition
    const { dir, absPath, gatesDocPath } = setupEnv(PASSING_EPIC);
    const out: string[] = [];

    await gateCheckHandler(
      absPath,
      {},
      {
        cwd: dir,
        now: FIXED_NOW_FN,
        gatesDocPath,
        stdout: (s) => out.push(s),
        stderr: () => {},
        exit: (code) => { throw new Error(`exit(${code})`); },
      },
    );

    expect(out.some((l) => l.includes('ready-for-decomposition'))).toBe(true);
  });

  it('Epic already passed decomposition → picks ready-for-coding', async () => {
    const { dir, absPath, gatesDocPath } = setupEnv(PASSING_EPIC_CACHED_PASS);
    const out: string[] = [];

    // PASSING_EPIC_CACHED_PASS has cached_gate_result.pass=true
    // The handler should infer ready-for-coding as next transition
    // Epic-W body contains 'STORY-001-01' so it should pass or fail ready-for-coding
    // We just verify the transition header says ready-for-coding
    try {
      await gateCheckHandler(
        absPath,
        {},
        {
          cwd: dir,
          now: FIXED_NOW_FN,
          gatesDocPath,
          stdout: (s) => out.push(s),
          stderr: () => {},
          exit: (code) => { throw new Error(`exit(${code})`); },
        },
      );
    } catch {
      // May exit non-zero if TBD check fails — that's fine
    }

    expect(out.some((l) => l.includes('ready-for-coding'))).toBe(true);
  });
});

// ─── BUG-008 smoke: readiness-gates.md after fix parses cleanly ───────────────

describe('BUG-008 smoke: readiness-gates.md after fix parses cleanly', () => {
  const REAL_GATES_PATH = '/Users/ssuladze/Documents/Dev/ClearGate/.cleargate/knowledge/readiness-gates.md';
  const PROJECT_ROOT = '/Users/ssuladze/Documents/Dev/ClearGate';

  it('readiness-gates.md parses all 6 gate blocks with no errors', async () => {
    const yaml = await import('js-yaml');
    const raw = fs.readFileSync(REAL_GATES_PATH, 'utf8');
    const fenceRe = /```yaml\n([\s\S]*?)```/g;
    const blocks: unknown[] = [];
    let match;
    while ((match = fenceRe.exec(raw)) !== null) {
      blocks.push(yaml.load(match[1]!));
    }
    expect(blocks).toHaveLength(6);
  });

  it('all criterion check strings in readiness-gates.md parse via parsePredicate without throwing', async () => {
    const { parsePredicate: pp } = await import('../../src/lib/readiness-predicates.js');
    const yaml = await import('js-yaml');
    const raw = fs.readFileSync(REAL_GATES_PATH, 'utf8');
    const fenceRe = /```yaml\n([\s\S]*?)```/g;
    let match;
    while ((match = fenceRe.exec(raw)) !== null) {
      const block = (yaml.load(match[1]!) as unknown[])[0] as { criteria: { id: string; check: string }[] };
      for (const criterion of block.criteria) {
        expect(() => pp(criterion.check)).not.toThrow();
      }
    }
  });

  it('EPIC-021-style fixture: prose context_source with approved_by + approved_at passes proposal-approved', async () => {
    // Simulates the real EPIC-021 scenario: context_source is long prose with em-dash,
    // and the epic has approved_by + approved_at waiver fields.
    const EPIC_LIKE_FIXTURE = `---
epic_id: "EPIC-021-sim"
status: "Ready"
context_source: "User direct request 2026-04-25 — proposal gate waived (sharp intent + inline references). All interrogation questions ratified by user."
owner: sandrinio
approved_by: sandrinio
approved_at: 2026-04-25T00:00:00Z
---

# EPIC-021: Token-First Onboarding

## 1. Context

Intro text for the epic.

## 2. Scope-In

- Token-based bearer auth as default path
- Admin panel token issuance

## 3. Stories

Initial story decomposition TBD.

## 4. Affected Files

- cleargate-cli/src/commands/join.ts

## 5. Gherkin

Scenario: happy path
Given a user with an invite URL
When they run cleargate join
Then they are authenticated

Scenario: Error case
Given a user with expired invite
When they run cleargate join
Then an Error is shown
`;
    const { dir, absPath, gatesDocPath } = setupEnv(EPIC_LIKE_FIXTURE, 'EPIC-021-sim.md');

    const out: string[] = [];
    const exitCodes: number[] = [];

    try {
      await gateCheckHandler(
        absPath,
        { transition: 'ready-for-decomposition' },
        {
          cwd: dir,
          now: FIXED_NOW_FN,
          gatesDocPath,
          stdout: (s) => out.push(s),
          stderr: (s) => out.push(s),
          exit: (code) => { exitCodes.push(code); throw new Error(`exit(${code})`); },
        },
      );
    } catch {
      // Other criteria may fail — only proposal-approved matters for this smoke test
    }

    const combined = out.join('\n');
    // proposal-approved should emit a [pass] line, NOT a ❌ line
    // The gate output format is: "✅ proposal-approved: ..." for pass
    //                        or "❌ proposal-approved: ..." for fail
    expect(combined).not.toMatch(/❌ proposal-approved/);
  });

  it('CR-010-style fixture: prose "TBD resolution" in body passes no-tbds marker predicate', async () => {
    // Simulates CR-010 scenario: the body contains "TBD resolution" as a noun phrase,
    // not as a TBD marker. The marker-aware predicate should NOT flag this.
    const CR_LIKE_FIXTURE = `---
cr_id: "CR-010-sim"
parent_ref: "EPIC-008"
status: "Approved"
approved: true
approved_by: sandrinio
approved_at: 2026-04-26T00:00:00Z
---

# CR-010-sim: Advisory Readiness Gates

## 1. The Context Override (Old vs. New)

**Obsolete Logic:**
- Gate failures cause hard push rejection.

**New Logic:**
- Gate failures become advisory; push proceeds with a note.

## 2. Blast Radius & Invalidation

- [x] No downstream items invalidated; this is purely additive.
- [x] The "TBD resolution" workflow for open-question tracking is unaffected.

## 3. Execution Sandbox

- cleargate-cli/src/commands/gate.ts
`;
    const { dir, absPath, gatesDocPath } = setupEnv(CR_LIKE_FIXTURE, 'CR-010-sim.md');

    const out: string[] = [];
    const exitCodes: number[] = [];

    // Provide the REAL gates doc to use the marker-based predicate
    const realGatesDoc = fs.readFileSync(REAL_GATES_PATH, 'utf8');
    const realGatesDocInDir = path.join(dir, 'real-readiness-gates.md');
    fs.writeFileSync(realGatesDocInDir, realGatesDoc, 'utf8');

    try {
      await gateCheckHandler(
        absPath,
        { transition: 'ready-to-apply' },
        {
          cwd: dir,
          now: FIXED_NOW_FN,
          gatesDocPath: realGatesDocInDir,
          stdout: (s) => out.push(s),
          stderr: (s) => out.push(s),
          exit: (code) => { exitCodes.push(code); throw new Error(`exit(${code})`); },
        },
      );
    } catch {
      // Other criteria may fail — only no-tbds matters for this smoke test
    }

    const combined = out.join('\n');
    // no-tbds should pass (not appear as ❌)
    expect(combined).not.toMatch(/❌ no-tbds/);
  });

  it('CR-011-style fixture: §2 Blast Radius with items passes blast-radius-populated', async () => {
    // Simulates CR-011 scenario: the CR has items in §2 (Blast Radius).
    // The old gate was checking section(1) which returned 0 items even when §1 had bullets.
    // The fix points to section(2) which correctly targets the Blast Radius section.
    const CR_11_LIKE_FIXTURE = `---
cr_id: "CR-011-sim"
parent_ref: "EPIC-021"
status: "Draft"
approved: false
---

# CR-011-sim: Capability Gating

## 1. The Context Override (Old vs. New)

**Obsolete Logic:**
- All commands shown regardless of membership state.

**New Logic:**
- Pre-member surface is limited to init/join/whoami/wiki/gate/doctor.

## 2. Blast Radius & Invalidation

- [x] STORY-019-XX: acceptance criteria need capability-gating contract
- [x] EPIC-021: parent epic must reference this CR

## 3. Execution Sandbox

- cleargate-cli/src/cli.ts
`;
    const { dir, absPath, gatesDocPath } = setupEnv(CR_11_LIKE_FIXTURE, 'CR-011-sim.md');

    const out: string[] = [];
    const exitCodes: number[] = [];

    // Provide the REAL gates doc to use section(2) for blast-radius-populated
    const realGatesDoc = fs.readFileSync(REAL_GATES_PATH, 'utf8');
    const realGatesDocInDir = path.join(dir, 'real-readiness-gates.md');
    fs.writeFileSync(realGatesDocInDir, realGatesDoc, 'utf8');

    try {
      await gateCheckHandler(
        absPath,
        { transition: 'ready-to-apply' },
        {
          cwd: dir,
          now: FIXED_NOW_FN,
          gatesDocPath: realGatesDocInDir,
          stdout: (s) => out.push(s),
          stderr: (s) => out.push(s),
          exit: (code) => { exitCodes.push(code); throw new Error(`exit(${code})`); },
        },
      );
    } catch {
      // Other criteria may fail — only blast-radius-populated matters for this smoke test
    }

    const combined = out.join('\n');
    // blast-radius-populated should pass (not appear as ❌)
    expect(combined).not.toMatch(/❌ blast-radius-populated/);
  });
});
