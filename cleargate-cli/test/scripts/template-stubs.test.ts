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
  'story.md',
  // STORY-022-06: hotfix lane template. Note: live dir has 9 templates total
  // (sprint_context.md and sprint_report.md are not yet listed here — pre-existing
  // 7-vs-9 drift; fixing those is out of scope for this story).
  'hotfix.md',
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

// STORY-025-04: Sprint Plan + Sprint Report Template Reframe
// One test per Gherkin scenario from §2.1

describe('Scenario: Sprint Plan Template declares actively-authored (STORY-025-04)', () => {
  const sprintPlanPath = path.join(LIVE_TEMPLATES_DIR, 'Sprint Plan Template.md');
  let content: string;
  it('reads the file', () => {
    content = fs.readFileSync(sprintPlanPath, 'utf8');
    expect(content).toBeTruthy();
  });
  it('instructions block contains "actively authored during the Prepare phase"', () => {
    const c = fs.readFileSync(sprintPlanPath, 'utf8');
    expect(c).toContain('actively authored during the Prepare phase');
  });
  it('instructions block does NOT contain "READ artifact"', () => {
    const c = fs.readFileSync(sprintPlanPath, 'utf8');
    expect(c).not.toContain('READ artifact');
  });
  it('instructions block does NOT contain "Do NOT draft this file manually"', () => {
    const c = fs.readFileSync(sprintPlanPath, 'utf8');
    expect(c).not.toContain('Do NOT draft this file manually');
  });
});

describe('Scenario: Sprint Plan Template has POST-WRITE BRIEF six bullets (STORY-025-04)', () => {
  const sprintPlanPath = path.join(LIVE_TEMPLATES_DIR, 'Sprint Plan Template.md');
  it('instructions block contains POST-WRITE BRIEF section', () => {
    const c = fs.readFileSync(sprintPlanPath, 'utf8');
    expect(c).toContain('POST-WRITE BRIEF');
  });
  it('POST-WRITE BRIEF contains Sprint Goal bullet', () => {
    const c = fs.readFileSync(sprintPlanPath, 'utf8');
    expect(c).toContain('Sprint Goal (1 sentence)');
  });
  it('POST-WRITE BRIEF contains Selected items bullet', () => {
    const c = fs.readFileSync(sprintPlanPath, 'utf8');
    expect(c).toContain('Selected items');
  });
  it('POST-WRITE BRIEF contains Recommended priority changes bullet', () => {
    const c = fs.readFileSync(sprintPlanPath, 'utf8');
    expect(c).toContain('Recommended priority changes');
  });
  it('POST-WRITE BRIEF contains Open questions bullet', () => {
    const c = fs.readFileSync(sprintPlanPath, 'utf8');
    expect(c).toContain('Open questions for human');
  });
  it('POST-WRITE BRIEF contains Risks bullet', () => {
    const c = fs.readFileSync(sprintPlanPath, 'utf8');
    expect(c).toContain('Risks (with mitigations)');
  });
  it('POST-WRITE BRIEF contains Ambiguity + Gate 2 readiness bullet', () => {
    const c = fs.readFileSync(sprintPlanPath, 'utf8');
    expect(c).toContain('Gate 2 readiness checklist');
  });
});

describe('Scenario: Sprint Plan Template has §0 Stakeholder Brief (STORY-025-04)', () => {
  const sprintPlanPath = path.join(LIVE_TEMPLATES_DIR, 'Sprint Plan Template.md');
  it('body contains "## 0. Stakeholder Brief" heading', () => {
    const c = fs.readFileSync(sprintPlanPath, 'utf8');
    expect(c).toContain('## 0. Stakeholder Brief');
  });
  it('"## 0. Stakeholder Brief" appears before "## 1. Consolidated Deliverables"', () => {
    const c = fs.readFileSync(sprintPlanPath, 'utf8');
    const idx0 = c.indexOf('## 0. Stakeholder Brief');
    const idx1 = c.indexOf('## 1. Consolidated Deliverables');
    expect(idx0).toBeGreaterThanOrEqual(0);
    expect(idx1).toBeGreaterThanOrEqual(0);
    expect(idx0).toBeLessThan(idx1);
  });
});

describe('Scenario: Sprint Plan Template DUAL-AUDIENCE STRUCTURE clause (STORY-025-04)', () => {
  const sprintPlanPath = path.join(LIVE_TEMPLATES_DIR, 'Sprint Plan Template.md');
  it('instructions block declares DUAL-AUDIENCE STRUCTURE', () => {
    const c = fs.readFileSync(sprintPlanPath, 'utf8');
    expect(c).toContain('DUAL-AUDIENCE STRUCTURE');
  });
  it('DUAL-AUDIENCE STRUCTURE references top-of-body stakeholder/sponsor view', () => {
    const c = fs.readFileSync(sprintPlanPath, 'utf8');
    expect(c).toContain('Top of body: Stakeholder/Sponsor view');
  });
  it('DUAL-AUDIENCE STRUCTURE references bottom-of-body AI-execution view', () => {
    const c = fs.readFileSync(sprintPlanPath, 'utf8');
    expect(c).toContain('Bottom of body: AI-execution view');
  });
});

describe('Scenario: Sprint Report Template has §4 Observe Phase Findings (STORY-025-04)', () => {
  const reportPath = path.join(LIVE_TEMPLATES_DIR, 'sprint_report.md');
  it('body contains "## §4 Observe Phase Findings" heading', () => {
    const c = fs.readFileSync(reportPath, 'utf8');
    expect(c).toContain('## §4 Observe Phase Findings');
  });
  it('§4 contains SKIP THIS SECTION ENTIRELY blockquote', () => {
    const c = fs.readFileSync(reportPath, 'utf8');
    expect(c).toContain('SKIP THIS SECTION ENTIRELY');
  });
  it('§4 has subsection 4.1 Bugs Found (UR:bug)', () => {
    const c = fs.readFileSync(reportPath, 'utf8');
    expect(c).toContain('### 4.1 Bugs Found (UR:bug)');
  });
  it('§4 has subsection 4.2 Hotfixes Triggered', () => {
    const c = fs.readFileSync(reportPath, 'utf8');
    expect(c).toContain('### 4.2 Hotfixes Triggered');
  });
  it('§4 has subsection 4.3 Review Feedback (UR:review-feedback)', () => {
    const c = fs.readFileSync(reportPath, 'utf8');
    expect(c).toContain('### 4.3 Review Feedback (UR:review-feedback)');
  });
});

describe('Scenario: Sprint Report Template renumbered §5 Lessons + §6 Framework Self-Assessment + §7 Change Log (STORY-025-04)', () => {
  const reportPath = path.join(LIVE_TEMPLATES_DIR, 'sprint_report.md');
  it('current §5 heading is "## §5 Lessons" (formerly §4)', () => {
    const c = fs.readFileSync(reportPath, 'utf8');
    expect(c).toContain('## §5 Lessons');
  });
  it('current §6 heading is "## §6 Framework Self-Assessment" (formerly §5)', () => {
    const c = fs.readFileSync(reportPath, 'utf8');
    expect(c).toContain('## §6 Framework Self-Assessment');
  });
  it('current §7 heading is "## §7 Change Log" (formerly §6)', () => {
    const c = fs.readFileSync(reportPath, 'utf8');
    expect(c).toContain('## §7 Change Log');
  });
  it('template does NOT contain the old "## §4 Lessons" heading', () => {
    const c = fs.readFileSync(reportPath, 'utf8');
    expect(c).not.toContain('## §4 Lessons');
  });
  it('template does NOT contain the old "## §5 Framework Self-Assessment" heading', () => {
    const c = fs.readFileSync(reportPath, 'utf8');
    expect(c).not.toContain('## §5 Framework Self-Assessment');
  });
  it('template does NOT contain the old "## §6 Change Log" heading', () => {
    const c = fs.readFileSync(reportPath, 'utf8');
    expect(c).not.toContain('## §6 Change Log');
  });
});

describe('Scenario: Mirror parity for both templates (STORY-025-04)', () => {
  it('Sprint Plan Template: live === mirror', () => {
    const live = fs.readFileSync(path.join(LIVE_TEMPLATES_DIR, 'Sprint Plan Template.md'), 'utf8');
    const mirror = fs.readFileSync(path.join(MIRROR_TEMPLATES_DIR, 'Sprint Plan Template.md'), 'utf8');
    expect(live).toBe(mirror);
  });
  it('sprint_report.md: live === mirror', () => {
    const live = fs.readFileSync(path.join(LIVE_TEMPLATES_DIR, 'sprint_report.md'), 'utf8');
    const mirror = fs.readFileSync(path.join(MIRROR_TEMPLATES_DIR, 'sprint_report.md'), 'utf8');
    expect(live).toBe(mirror);
  });
});
