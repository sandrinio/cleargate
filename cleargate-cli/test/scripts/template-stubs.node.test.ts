import { describe, test } from 'node:test';
import assert from 'node:assert/strict';

/**
 * Tests for STORY-008-07: Template stubs verification.
 * Asserts that all 7 live + 7 mirror templates contain draft_tokens + cached_gate_result keys.
 */
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
  'story.md',
  // STORY-022-06: hotfix lane template. Note: live dir has 9 templates total
  // (sprint_context.md and sprint_report.md are not yet listed here — pre-existing
  // 7-vs-9 drift; fixing those is out of scope for this story).
  'hotfix.md',
];

describe('Scenario: All 7 live templates have draft_tokens + cached_gate_result stubs', () => {
  for (const name of TEMPLATE_NAMES) {
    test(`live template ${name} contains draft_tokens and cached_gate_result`, () => {
      const filePath = path.join(LIVE_TEMPLATES_DIR, name);
      const content = fs.readFileSync(filePath, 'utf8');
      assert.ok(String(content).includes('draft_tokens:'));
      assert.ok(String(content).includes('cached_gate_result:'));
    });
  }
});

describe('Scenario: All 7 mirror templates have draft_tokens + cached_gate_result stubs', () => {
  for (const name of TEMPLATE_NAMES) {
    test(`mirror template ${name} contains draft_tokens and cached_gate_result`, () => {
      const filePath = path.join(MIRROR_TEMPLATES_DIR, name);
      const content = fs.readFileSync(filePath, 'utf8');
      assert.ok(String(content).includes('draft_tokens:'));
      assert.ok(String(content).includes('cached_gate_result:'));
    });
  }
});

describe('Scenario: Live and mirror templates are byte-identical', () => {
  for (const name of TEMPLATE_NAMES) {
    test(`template ${name}: live === mirror`, () => {
      const live = fs.readFileSync(path.join(LIVE_TEMPLATES_DIR, name), 'utf8');
      const mirror = fs.readFileSync(path.join(MIRROR_TEMPLATES_DIR, name), 'utf8');
      assert.strictEqual(live, mirror);
    });
  }
});

// STORY-025-04: Sprint Plan + Sprint Report Template Reframe
// One test per Gherkin scenario from §2.1

describe('Scenario: Sprint Plan Template declares actively-authored (STORY-025-04)', () => {
  const sprintPlanPath = path.join(LIVE_TEMPLATES_DIR, 'Sprint Plan Template.md');
  let content: string;
  test('reads the file', () => {
    content = fs.readFileSync(sprintPlanPath, 'utf8');
    assert.ok(content);
  });
  test('instructions block contains "actively authored during the Prepare phase"', () => {
    const c = fs.readFileSync(sprintPlanPath, 'utf8');
    assert.ok(String(c).includes('actively authored during the Prepare phase'));
  });
  test('instructions block does NOT contain "READ artifact"', () => {
    const c = fs.readFileSync(sprintPlanPath, 'utf8');
    assert.ok(!String(c).includes('READ artifact'));
  });
  test('instructions block does NOT contain "Do NOT draft this file manually"', () => {
    const c = fs.readFileSync(sprintPlanPath, 'utf8');
    assert.ok(!String(c).includes('Do NOT draft this file manually'));
  });
});

describe('Scenario: Sprint Plan Template has POST-WRITE BRIEF six bullets (STORY-025-04)', () => {
  const sprintPlanPath = path.join(LIVE_TEMPLATES_DIR, 'Sprint Plan Template.md');
  test('instructions block contains POST-WRITE BRIEF section', () => {
    const c = fs.readFileSync(sprintPlanPath, 'utf8');
    assert.ok(String(c).includes('POST-WRITE BRIEF'));
  });
  test('POST-WRITE BRIEF contains Sprint Goal bullet', () => {
    const c = fs.readFileSync(sprintPlanPath, 'utf8');
    assert.ok(String(c).includes('Sprint Goal (1 sentence)'));
  });
  test('POST-WRITE BRIEF contains Selected items bullet', () => {
    const c = fs.readFileSync(sprintPlanPath, 'utf8');
    assert.ok(String(c).includes('Selected items'));
  });
  test('POST-WRITE BRIEF contains Recommended priority changes bullet', () => {
    const c = fs.readFileSync(sprintPlanPath, 'utf8');
    assert.ok(String(c).includes('Recommended priority changes'));
  });
  test('POST-WRITE BRIEF contains Open questions bullet', () => {
    const c = fs.readFileSync(sprintPlanPath, 'utf8');
    assert.ok(String(c).includes('Open questions for human'));
  });
  test('POST-WRITE BRIEF contains Risks bullet', () => {
    const c = fs.readFileSync(sprintPlanPath, 'utf8');
    assert.ok(String(c).includes('Risks (with mitigations)'));
  });
  test('POST-WRITE BRIEF contains Ambiguity + Gate 2 readiness bullet', () => {
    const c = fs.readFileSync(sprintPlanPath, 'utf8');
    assert.ok(String(c).includes('Gate 2 readiness checklist'));
  });
});

describe('Scenario: Sprint Plan Template has §0 Stakeholder Brief (STORY-025-04)', () => {
  const sprintPlanPath = path.join(LIVE_TEMPLATES_DIR, 'Sprint Plan Template.md');
  test('body contains "## 0. Stakeholder Brief" heading', () => {
    const c = fs.readFileSync(sprintPlanPath, 'utf8');
    assert.ok(String(c).includes('## 0. Stakeholder Brief'));
  });
  test('"## 0. Stakeholder Brief" appears before "## 1. Consolidated Deliverables"', () => {
    const c = fs.readFileSync(sprintPlanPath, 'utf8');
    const idx0 = c.indexOf('## 0. Stakeholder Brief');
    const idx1 = c.indexOf('## 1. Consolidated Deliverables');
    assert.ok(idx0 >= 0);
    assert.ok(idx1 >= 0);
    assert.ok(idx0 < idx1);
  });
});

describe('Scenario: Sprint Plan Template DUAL-AUDIENCE STRUCTURE clause (STORY-025-04)', () => {
  const sprintPlanPath = path.join(LIVE_TEMPLATES_DIR, 'Sprint Plan Template.md');
  test('instructions block declares DUAL-AUDIENCE STRUCTURE', () => {
    const c = fs.readFileSync(sprintPlanPath, 'utf8');
    assert.ok(String(c).includes('DUAL-AUDIENCE STRUCTURE'));
  });
  test('DUAL-AUDIENCE STRUCTURE references top-of-body stakeholder/sponsor view', () => {
    const c = fs.readFileSync(sprintPlanPath, 'utf8');
    assert.ok(String(c).includes('Top of body: Stakeholder/Sponsor view'));
  });
  test('DUAL-AUDIENCE STRUCTURE references bottom-of-body AI-execution view', () => {
    const c = fs.readFileSync(sprintPlanPath, 'utf8');
    assert.ok(String(c).includes('Bottom of body: AI-execution view'));
  });
});

describe('Scenario: Sprint Report Template has §4 Observe Phase Findings (STORY-025-04)', () => {
  const reportPath = path.join(LIVE_TEMPLATES_DIR, 'sprint_report.md');
  test('body contains "## §4 Observe Phase Findings" heading', () => {
    const c = fs.readFileSync(reportPath, 'utf8');
    assert.ok(String(c).includes('## §4 Observe Phase Findings'));
  });
  test('§4 contains SKIP THIS SECTION ENTIRELY blockquote', () => {
    const c = fs.readFileSync(reportPath, 'utf8');
    assert.ok(String(c).includes('SKIP THIS SECTION ENTIRELY'));
  });
  test('§4 has subsection 4.1 Bugs Found (UR:bug)', () => {
    const c = fs.readFileSync(reportPath, 'utf8');
    assert.ok(String(c).includes('### 4.1 Bugs Found (UR:bug)'));
  });
  test('§4 has subsection 4.2 Hotfixes Triggered', () => {
    const c = fs.readFileSync(reportPath, 'utf8');
    assert.ok(String(c).includes('### 4.2 Hotfixes Triggered'));
  });
  test('§4 has subsection 4.3 Review Feedback (UR:review-feedback)', () => {
    const c = fs.readFileSync(reportPath, 'utf8');
    assert.ok(String(c).includes('### 4.3 Review Feedback (UR:review-feedback)'));
  });
});

describe('Scenario: Sprint Report Template renumbered §5 Lessons + §6 Framework Self-Assessment + §7 Change Log (STORY-025-04)', () => {
  const reportPath = path.join(LIVE_TEMPLATES_DIR, 'sprint_report.md');
  test('current §5 heading is "## §5 Lessons" (formerly §4)', () => {
    const c = fs.readFileSync(reportPath, 'utf8');
    assert.ok(String(c).includes('## §5 Lessons'));
  });
  test('current §6 heading is "## §6 Framework Self-Assessment" (formerly §5)', () => {
    const c = fs.readFileSync(reportPath, 'utf8');
    assert.ok(String(c).includes('## §6 Framework Self-Assessment'));
  });
  test('current §7 heading is "## §7 Change Log" (formerly §6)', () => {
    const c = fs.readFileSync(reportPath, 'utf8');
    assert.ok(String(c).includes('## §7 Change Log'));
  });
  test('template does NOT contain the old "## §4 Lessons" heading', () => {
    const c = fs.readFileSync(reportPath, 'utf8');
    assert.ok(!String(c).includes('## §4 Lessons'));
  });
  test('template does NOT contain the old "## §5 Framework Self-Assessment" heading', () => {
    const c = fs.readFileSync(reportPath, 'utf8');
    assert.ok(!String(c).includes('## §5 Framework Self-Assessment'));
  });
  test('template does NOT contain the old "## §6 Change Log" heading', () => {
    const c = fs.readFileSync(reportPath, 'utf8');
    assert.ok(!String(c).includes('## §6 Change Log'));
  });
});

describe('Scenario: Mirror parity for both templates (STORY-025-04)', () => {
  test('Sprint Plan Template: live === mirror', () => {
    const live = fs.readFileSync(path.join(LIVE_TEMPLATES_DIR, 'Sprint Plan Template.md'), 'utf8');
    const mirror = fs.readFileSync(path.join(MIRROR_TEMPLATES_DIR, 'Sprint Plan Template.md'), 'utf8');
    assert.strictEqual(live, mirror);
  });
  test('sprint_report.md: live === mirror', () => {
    const live = fs.readFileSync(path.join(LIVE_TEMPLATES_DIR, 'sprint_report.md'), 'utf8');
    const mirror = fs.readFileSync(path.join(MIRROR_TEMPLATES_DIR, 'sprint_report.md'), 'utf8');
    assert.strictEqual(live, mirror);
  });
});
