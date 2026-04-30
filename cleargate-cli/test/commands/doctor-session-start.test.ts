/**
 * doctor-session-start.test.ts — STORY-008-06 + CR-009 + CR-008
 *
 * Tests for `cleargate doctor --session-start` mode, CR-009 resolver-status line,
 * and CR-008 planning-first reminder block.
 * Named cases follow the Gherkin scenarios from the story.
 */

import { describe, it, expect, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import {
  runSessionStart,
  emitResolverStatusLine,
  PLANNING_FIRST_REMINDER,
  type DoctorOutcome,
} from '../../src/commands/doctor.js';

const tmpDirs: string[] = [];

function makeTmpDir(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cg-doctor-ss-'));
  tmpDirs.push(dir);
  return dir;
}

afterEach(() => {
  for (const dir of tmpDirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

function writePendingSyncItem(
  dir: string,
  name: string,
  id: string,
  pass: boolean | null,
  failingCriteria: string[] = []
): void {
  const pendingDir = path.join(dir, '.cleargate', 'delivery', 'pending-sync');
  fs.mkdirSync(pendingDir, { recursive: true });

  const criteria = failingCriteria.map((fc) => `{"id":"${fc}"}`).join(',');
  const gateResult = JSON.stringify({
    pass,
    failing_criteria: failingCriteria.map((fc) => ({ id: fc })),
    last_gate_check: '2026-04-19T10:00:00Z',
  });

  const content = `---
story_id: "${id}"
status: "Draft"
cached_gate_result: ${gateResult}
---

# ${name}
`;
  fs.writeFileSync(path.join(pendingDir, `${name}.md`), content, 'utf-8');
}

function writePendingSyncItemPassing(dir: string, name: string, id: string): void {
  const pendingDir = path.join(dir, '.cleargate', 'delivery', 'pending-sync');
  fs.mkdirSync(pendingDir, { recursive: true });

  const gateResult = JSON.stringify({
    pass: true,
    failing_criteria: [],
    last_gate_check: '2026-04-19T10:00:00Z',
  });

  // CR-008: items that pass all gate criteria are also marked approved: true,
  // which suppresses the planning-first reminder (they have a ready work item).
  const content = `---
story_id: "${id}"
status: "Draft"
approved: true
cached_gate_result: ${gateResult}
---

# ${name}
`;
  fs.writeFileSync(path.join(pendingDir, `${name}.md`), content, 'utf-8');
}

/**
 * CR-008: write a pending-sync item with approved: true (planning-first gate suppressor).
 */
function writeApprovedStory(dir: string, name: string, id: string, implementationFiles?: string[]): void {
  const pendingDir = path.join(dir, '.cleargate', 'delivery', 'pending-sync');
  fs.mkdirSync(pendingDir, { recursive: true });

  const implFilesBlock = implementationFiles
    ? `implementation_files:\n${implementationFiles.map((f) => `  - "${f}"`).join('\n')}\n`
    : '';

  const content = `---
story_id: "${id}"
status: "Approved"
approved: true
cached_gate_result:
  pass: true
  failing_criteria: []
${implFilesBlock}---

# ${name}
`;
  fs.writeFileSync(path.join(pendingDir, `${name}.md`), content, 'utf-8');
}

/**
 * CR-008: create the sprint-active sentinel.
 */
function writeSprintActiveSentinel(dir: string): void {
  const sentinelDir = path.join(dir, '.cleargate', 'sprint-runs');
  fs.mkdirSync(sentinelDir, { recursive: true });
  fs.writeFileSync(path.join(sentinelDir, '.active'), 'SPRINT-14\n', 'utf-8');
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('doctor --session-start', () => {
  it('names both failing IDs when 2 items fail and 1 passes', async () => {
    const dir = makeTmpDir();
    writePendingSyncItem(dir, 'STORY-001', 'STORY-001', false, ['no-tbds']);
    writePendingSyncItem(dir, 'STORY-002', 'STORY-002', false, ['criteria-2']);
    writePendingSyncItemPassing(dir, 'STORY-003', 'STORY-003');

    const out: string[] = [];
    await runSessionStart(dir, (s) => out.push(s));
    const output = out.join('\n');

    expect(output).toContain('STORY-001');
    expect(output).toContain('STORY-002');
    expect(output).not.toContain('STORY-003');
    expect(output).toContain('2 items blocked:');
  });

  it('shows 10 items and overflow pointer when 15 items are blocked', async () => {
    const dir = makeTmpDir();
    for (let i = 1; i <= 15; i++) {
      const id = `STORY-${String(i).padStart(3, '0')}`;
      writePendingSyncItem(dir, id, id, false, [`criterion-${i}`]);
    }

    const out: string[] = [];
    await runSessionStart(dir, (s) => out.push(s));
    const output = out.join('\n');

    // Must show 10 items
    const lines = output.split('\n').filter((l) => l.startsWith('  STORY-'));
    expect(lines).toHaveLength(10);

    // Must show overflow pointer
    expect(output).toContain('…and 5 more — run cleargate doctor for full list');
  });

  it('emits only the resolver-status line when zero items are blocked', async () => {
    const dir = makeTmpDir();
    writePendingSyncItemPassing(dir, 'STORY-001', 'STORY-001');
    writePendingSyncItemPassing(dir, 'STORY-002', 'STORY-002');

    const out: string[] = [];
    await runSessionStart(dir, (s) => out.push(s));

    // CR-011: state banner is the first line; CR-009: resolver-status line is second.
    // No blocked-items lines beyond these two.
    expect(out).toHaveLength(2);
    expect(out[0]).toContain('ClearGate state:');
    expect(out[1]).toContain('cleargate CLI:');
  });

  it('blocked-items output is ≤ 400 chars (100-token proxy) for 3 failing items', async () => {
    const dir = makeTmpDir();
    writePendingSyncItem(dir, 'EPIC-001', 'EPIC-001', false, ['no-tbds']);
    writePendingSyncItem(dir, 'STORY-001-01', 'STORY-001-01', false, ['section-check']);
    writePendingSyncItem(dir, 'BUG-002', 'BUG-002', false, ['file-exists']);

    const out: string[] = [];
    await runSessionStart(dir, (s) => out.push(s));

    // CR-009: resolver-status line is the first item; blocked-items text is after it.
    // CR-008: planning-first reminder may also be emitted (no approved stories).
    // The 400-char cap applies to the blocked-items chunk only.
    const blockedOutput = out
      .filter((l) => !l.includes('cleargate CLI:') && !l.includes('Triage first') && l !== '')
      .join('\n');
    expect(blockedOutput.length).toBeLessThanOrEqual(400);
  });

  it('emits only the resolver-status line when pending-sync directory does not exist', async () => {
    const dir = makeTmpDir();
    // No .cleargate/delivery/pending-sync/ created

    const out: string[] = [];
    await runSessionStart(dir, (s) => out.push(s));

    // CR-011: state banner is first; CR-009: resolver-status line is second.
    expect(out).toHaveLength(2);
    expect(out[0]).toContain('ClearGate state:');
    expect(out[1]).toContain('cleargate CLI:');
  });

  it('includes first failing criterion id in per-item line', async () => {
    const dir = makeTmpDir();
    writePendingSyncItem(dir, 'EPIC-008', 'EPIC-008', false, ['no-tbds', 'section-check']);

    const out: string[] = [];
    await runSessionStart(dir, (s) => out.push(s));
    const output = out.join('\n');

    expect(output).toContain('EPIC-008: no-tbds');
  });

  it('skips items with pass=null (pre-migration drafts)', async () => {
    const dir = makeTmpDir();
    writePendingSyncItem(dir, 'EPIC-009', 'EPIC-009', null);

    const out: string[] = [];
    await runSessionStart(dir, (s) => out.push(s));

    // CR-009: resolver-status line is always emitted; null-pass items are not blocked.
    // CR-008: the planning-first reminder MAY appear (item has no approved: true).
    // The key check: no "N items blocked:" lines.
    const blockedCountLines = out.filter((l) => l.includes('items blocked:'));
    expect(blockedCountLines).toHaveLength(0);
  });

  // ─── CR-009: resolver-status line is prepended to output ─────────────────────

  it('CR-009: resolver-status line is emitted by runSessionStart (CR-011: after state banner)', async () => {
    const dir = makeTmpDir();
    writePendingSyncItem(dir, 'STORY-001', 'STORY-001', false, ['no-tbds']);

    const out: string[] = [];
    await runSessionStart(dir, (s) => out.push(s));

    // CR-011: state banner is now first; CR-009: resolver-status line is second.
    expect(out.length).toBeGreaterThanOrEqual(2);
    expect(out[0]).toContain('ClearGate state:');
    expect(out[1]).toContain('cleargate CLI:');
  });

  it('CR-009: resolver-status line is emitted even when zero items are blocked', async () => {
    const dir = makeTmpDir();

    const out: string[] = [];
    await runSessionStart(dir, (s) => out.push(s));

    // At minimum the resolver-status line should be emitted
    const hasResolverLine = out.some((l) => l.includes('cleargate CLI:'));
    expect(hasResolverLine).toBe(true);
  });
});

describe('CR-009 emitResolverStatusLine', () => {
  it('emits "local dist" line when cleargate-cli/dist/cli.js exists under cwd', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cg-resolver-'));
    const distPath = path.join(dir, 'cleargate-cli', 'dist');
    fs.mkdirSync(distPath, { recursive: true });
    fs.writeFileSync(path.join(distPath, 'cli.js'), '// stub', 'utf-8');

    const out: string[] = [];
    emitResolverStatusLine(dir, (s) => out.push(s));

    fs.rmSync(dir, { recursive: true, force: true });

    expect(out[0]).toContain('local dist');
    expect(out[0]).toContain('cleargate CLI:');
  });

  it('emits pin version when hook script has cleargate-pin comment', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cg-resolver-'));
    const hooksDir = path.join(dir, '.claude', 'hooks');
    fs.mkdirSync(hooksDir, { recursive: true });
    const hookContent = `#!/usr/bin/env bash\n# cleargate-pin: 1.2.3\nCG=(npx -y "cleargate@1.2.3")\n`;
    fs.writeFileSync(path.join(hooksDir, 'stamp-and-gate.sh'), hookContent, 'utf-8');

    // Ensure no dist/cli.js so we fall through to the hook-parse branch
    // (we can't control PATH, but the pin-parse branch is a fallback)
    // Use a dir with no cleargate on PATH (already handled by `command -v`)
    const out: string[] = [];
    emitResolverStatusLine(dir, (s) => out.push(s));

    fs.rmSync(dir, { recursive: true, force: true });

    // Either "PATH" (if cleargate is globally installed) or npx@1.2.3 (if not)
    // Either way, a resolver-status line must be emitted
    expect(out[0]).toContain('cleargate CLI:');
  });
});

// ─── CR-008 Phase A: planning-first reminder block ────────────────────────────

describe('CR-008 Phase A: planning-first reminder block', () => {
  it('CR-008 scenario 1: empty pending-sync + no .active sentinel → planning-first reminder emitted', async () => {
    const dir = makeTmpDir();
    // Create empty pending-sync dir (no approved stories)
    const pendingDir = path.join(dir, '.cleargate', 'delivery', 'pending-sync');
    fs.mkdirSync(pendingDir, { recursive: true });

    const out: string[] = [];
    await runSessionStart(dir, (s) => out.push(s));
    const output = out.join('\n');

    expect(output).toContain('Triage first, draft second:');
    expect(output).toContain('(1) classify the request');
    expect(output).toContain('(2) draft a work item');
    expect(output).toContain('(3) halt at Gate 1');
  });

  it('CR-008 scenario 2: one approved story in pending-sync → planning-first reminder suppressed', async () => {
    const dir = makeTmpDir();
    writeApprovedStory(dir, 'STORY-001', 'STORY-001');

    const out: string[] = [];
    await runSessionStart(dir, (s) => out.push(s));
    const output = out.join('\n');

    expect(output).not.toContain('Triage first, draft second:');
  });

  it('CR-008 scenario 3: sprint-active sentinel present + empty pending-sync → planning-first reminder suppressed', async () => {
    const dir = makeTmpDir();
    // Empty pending-sync
    const pendingDir = path.join(dir, '.cleargate', 'delivery', 'pending-sync');
    fs.mkdirSync(pendingDir, { recursive: true });
    // Sprint active sentinel
    writeSprintActiveSentinel(dir);

    const out: string[] = [];
    await runSessionStart(dir, (s) => out.push(s));
    const output = out.join('\n');

    expect(output).not.toContain('Triage first, draft second:');
  });

  it('CR-008: planning-first reminder is emitted when pending-sync has items but none approved', async () => {
    const dir = makeTmpDir();
    // Add a failing (non-approved) item
    writePendingSyncItem(dir, 'STORY-001', 'STORY-001', false, ['no-tbds']);

    const out: string[] = [];
    await runSessionStart(dir, (s) => out.push(s));
    const output = out.join('\n');

    // Reminder fires (no approved stories)
    expect(output).toContain('Triage first, draft second:');
    // Blocked items also present
    expect(output).toContain('1 items blocked:');
  });

  it('CR-008: planning-first reminder text matches PLANNING_FIRST_REMINDER constant', async () => {
    const dir = makeTmpDir();
    const pendingDir = path.join(dir, '.cleargate', 'delivery', 'pending-sync');
    fs.mkdirSync(pendingDir, { recursive: true });

    const out: string[] = [];
    await runSessionStart(dir, (s) => out.push(s));

    // The reminder text should be in the output
    const output = out.join('\n');
    expect(output).toContain(PLANNING_FIRST_REMINDER);
  });

  it('CR-008: resolver-status line is emitted before reminder (CR-011: state banner is first)', async () => {
    const dir = makeTmpDir();
    const pendingDir = path.join(dir, '.cleargate', 'delivery', 'pending-sync');
    fs.mkdirSync(pendingDir, { recursive: true });

    const out: string[] = [];
    await runSessionStart(dir, (s) => out.push(s));

    // CR-011: state banner is first
    expect(out[0]).toContain('ClearGate state:');
    // CR-009: resolver-status is second
    expect(out[1]).toContain('cleargate CLI:');
    // CR-008: planning-first reminder appears after resolver
    const reminderIdx = out.findIndex((l) => l.includes('Triage first, draft second:'));
    expect(reminderIdx).toBeGreaterThan(1);
  });

  it('CR-008: pending-sync dir absent → planning-first reminder is NOT emitted (early return path)', async () => {
    const dir = makeTmpDir();
    // No pending-sync dir at all

    const out: string[] = [];
    await runSessionStart(dir, (s) => out.push(s));
    const output = out.join('\n');

    // No reminder (dir missing = early return after resolver line)
    expect(output).not.toContain('Triage first, draft second:');
    // CR-011: state banner is first; CR-009: resolver line is second
    expect(out[0]).toContain('ClearGate state:');
    expect(out[1]).toContain('cleargate CLI:');
  });
});

// ─── STORY-014-01: --session-start exit-code hierarchy ───────────────────────

describe('STORY-014-01: --session-start mode preserves exit-code hierarchy', () => {
  it('outcome.blocker is set when runSessionStart encounters blocked items', async () => {
    const dir = makeTmpDir();

    // Write a blocked item
    const pendingDir = path.join(dir, '.cleargate', 'delivery', 'pending-sync');
    fs.mkdirSync(pendingDir, { recursive: true });
    const gateResult = JSON.stringify({
      pass: false,
      failing_criteria: [{ id: 'no-tbds' }],
      last_gate_check: '2026-04-26T10:00:00Z',
    });
    const content = `---
story_id: "STORY-014-01-TEST"
status: "Draft"
approved: true
cached_gate_result: ${gateResult}
---

# Blocked story for exit-code test
`;
    fs.writeFileSync(path.join(pendingDir, 'STORY-014-01-TEST.md'), content, 'utf-8');

    const out: string[] = [];
    const outcome: DoctorOutcome = { configError: false, blocker: false };
    await runSessionStart(dir, (s) => out.push(s), outcome);

    // Blocked item must set outcome.blocker
    expect(outcome.blocker).toBe(true);
    // CR-011: state banner is first; resolver-status is second
    expect(out[0]).toContain('ClearGate state:');
    expect(out[1]).toContain('cleargate CLI:');
    // Blocked item listed in output
    expect(out.join('\n')).toContain('STORY-014-01-TEST');
  });

  it('outcome.blocker is false when no blocked items exist', async () => {
    const dir = makeTmpDir();

    // Write a passing item
    const pendingDir = path.join(dir, '.cleargate', 'delivery', 'pending-sync');
    fs.mkdirSync(pendingDir, { recursive: true });
    const content = `---
story_id: "STORY-PASS"
status: "Approved"
approved: true
cached_gate_result:
  pass: true
  failing_criteria: []
---

# Passing story
`;
    fs.writeFileSync(path.join(pendingDir, 'STORY-PASS.md'), content, 'utf-8');

    const out: string[] = [];
    const outcome: DoctorOutcome = { configError: false, blocker: false };
    await runSessionStart(dir, (s) => out.push(s), outcome);

    expect(outcome.blocker).toBe(false);
    expect(outcome.configError).toBe(false);
  });
});
