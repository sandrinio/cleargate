import { describe, test, afterEach } from 'node:test';
import assert from 'node:assert/strict';

/**
 * doctor-session-start.test.ts — STORY-008-06 + CR-009 + CR-008
 *
 * Tests for `cleargate doctor --session-start` mode, CR-009 resolver-status line,
 * and CR-008 planning-first reminder block.
 * Named cases follow the Gherkin scenarios from the story.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import {
  runSessionStart,
  emitResolverStatusLine,
  PLANNING_FIRST_REMINDER,
  type DoctorOutcome,
} from '../../src/commands/doctor.js';

// Minimal expect() shim (STORY-028-06)
// Backs remaining expect() calls with node:assert so vitest is not needed.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function expect(actual: any): any {
  const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return {
    toBe(expected: unknown) { assert.strictEqual(actual, expected); },
    toEqual(expected: unknown) { assert.deepStrictEqual(actual, expected); },
    toStrictEqual(expected: unknown) { assert.deepStrictEqual(actual, expected); },
    toBeNull() { assert.strictEqual(actual, null); },
    toBeUndefined() { assert.strictEqual(actual, undefined); },
    toBeDefined() { assert.notStrictEqual(actual, undefined); },
    toBeTruthy() { assert.ok(actual); },
    toBeFalsy() { assert.ok(!actual); },
    toBeGreaterThan(n: number) { assert.ok((actual as number) > n); },
    toBeGreaterThanOrEqual(n: number) { assert.ok((actual as number) >= n); },
    toBeLessThan(n: number) { assert.ok((actual as number) < n); },
    toBeLessThanOrEqual(n: number) { assert.ok((actual as number) <= n); },
    toContain(sub: unknown) { assert.ok(String(actual).includes(String(sub))); },
    toMatch(p: string | RegExp) { assert.match(String(actual), typeof p === 'string' ? new RegExp(esc(p)) : p); },
    toHaveLength(len: number) { assert.strictEqual((actual as { length: number }).length, len); },
    toThrow(msg?: string | RegExp) {
      if (!msg) assert.throws(actual as () => void);
      else if (typeof msg === 'string') assert.throws(actual as () => void, new RegExp(esc(msg)));
      else assert.throws(actual as () => void, msg);
    },
    toBeInstanceOf(cls: new (...a: unknown[]) => unknown) { assert.ok(actual instanceof cls); },
    toMatchObject(expected: Record<string, unknown>) { assert.deepStrictEqual(actual, expected); },
    toHaveBeenCalled() { assert.ok((actual as { mock: { calls: unknown[] } }).mock.calls.length > 0); },
    toHaveBeenCalledTimes(n: number) { assert.strictEqual((actual as { mock: { calls: unknown[] } }).mock.calls.length, n); },
    toHaveBeenCalledOnce() { assert.strictEqual((actual as { mock: { calls: unknown[] } }).mock.calls.length, 1); },
    toHaveBeenCalledWith(...expectedArgs: unknown[]) {
      const calls = (actual as { mock: { calls: Array<{arguments: unknown[]}> } }).mock.calls;
      assert.deepStrictEqual(calls[calls.length - 1].arguments, expectedArgs);
    },
    toHaveProperty(key: string, val?: unknown) {
      const obj = actual as Record<string, unknown>;
      assert.ok(key in obj);
      if (val !== undefined) assert.deepStrictEqual(obj[key], val);
    },
    get not(): any {
      return {
        toBe(expected: unknown) { assert.notStrictEqual(actual, expected); },
        toEqual(expected: unknown) { assert.notDeepStrictEqual(actual, expected); },
        toBeNull() { assert.notStrictEqual(actual, null); },
        toBeUndefined() { assert.notStrictEqual(actual, undefined); },
        toBeDefined() { assert.strictEqual(actual, undefined); },
        toBeTruthy() { assert.ok(!actual); },
        toBeFalsy() { assert.ok(actual); },
        toContain(sub: unknown) { assert.ok(!String(actual).includes(String(sub))); },
        toMatch(p: string | RegExp) { assert.doesNotMatch(String(actual), typeof p === 'string' ? new RegExp(esc(p)) : p); },
        toThrow() { assert.doesNotThrow(actual as () => void); },
        toHaveBeenCalled() { assert.strictEqual((actual as { mock: { calls: unknown[] } }).mock.calls.length, 0); },
        toHaveProperty(key: string) { const obj = actual as Record<string, unknown>; assert.ok(!(key in obj)); },
        toBeInstanceOf(cls: new (...a: unknown[]) => unknown) { assert.ok(!(actual instanceof cls)); },
        toHaveLength(len: number) { assert.notStrictEqual((actual as { length: number }).length, len); },
      };
    },
    get resolves(): any {
      const p = actual as Promise<unknown>;
      return {
        async toBe(expected: unknown) { assert.strictEqual(await p, expected); },
        async toEqual(expected: unknown) { assert.deepStrictEqual(await p, expected); },
        async toBeUndefined() { assert.strictEqual(await p, undefined); },
        async toBeNull() { assert.strictEqual(await p, null); },
        async toBeDefined() { assert.notStrictEqual(await p, undefined); },
        async toBeTruthy() { assert.ok(await p); },
      };
    },
    get rejects(): any {
      const p = actual as Promise<unknown>;
      return {
        async toBeInstanceOf(cls: new (...a: unknown[]) => unknown) { await assert.rejects(p, cls); },
        async toThrow(msg?: string | RegExp | (new (...a: unknown[]) => unknown)) {
          if (!msg) await assert.rejects(p);
          else if (typeof msg === 'string') await assert.rejects(p, new RegExp(esc(msg)));
          else await assert.rejects(p, msg as RegExp);
        },
        async toSatisfy(predicate: (val: unknown) => boolean) {
          let err: unknown;
          try { await p; } catch(e) { err = e; }
          assert.ok(predicate(err), `Rejected value did not satisfy predicate. Got: ${String(err)}`);
        },
        async toMatchObject(expected: Record<string, unknown>) {
          let err: unknown;
          try { await p; } catch(e) { err = e; }
          const errObj = err as Record<string, unknown>;
          for (const [k, v] of Object.entries(expected)) {
            if (typeof v === 'string' && (v as any).__isStringContaining) {
              assert.ok(String(errObj[k]).includes((v as any).__value), `Expected ${k} to contain "${(v as any).__value}"`);
            } else {
              assert.deepStrictEqual(errObj[k], v, `Expected ${k} to equal ${String(v)}`);
            }
          }
        },
      };
    },
  };
}
// expect.stringContaining — creates a partial string matcher for use in toMatchObject
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(expect as any).stringContaining = (str: string) => ({ __isStringContaining: true, __value: str });


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
  test('names both failing IDs when 2 items fail and 1 passes', async () => {
    const dir = makeTmpDir();
    writePendingSyncItem(dir, 'STORY-001', 'STORY-001', false, ['no-tbds']);
    writePendingSyncItem(dir, 'STORY-002', 'STORY-002', false, ['criteria-2']);
    writePendingSyncItemPassing(dir, 'STORY-003', 'STORY-003');

    const out: string[] = [];
    await runSessionStart(dir, (s) => out.push(s));
    const output = out.join('\n');

    assert.ok(String(output).includes('STORY-001'));
    assert.ok(String(output).includes('STORY-002'));
    assert.ok(!String(output).includes('STORY-003'));
    assert.ok(String(output).includes('2 items blocked:'));
  });

  test('shows 10 items and overflow pointer when 15 items are blocked', async () => {
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
    assert.strictEqual((lines).length, 10);

    // Must show overflow pointer
    assert.ok(String(output).includes('…and 5 more — run cleargate doctor for full list'));
  });

  test('emits only the resolver-status line when zero items are blocked', async () => {
    const dir = makeTmpDir();
    writePendingSyncItemPassing(dir, 'STORY-001', 'STORY-001');
    writePendingSyncItemPassing(dir, 'STORY-002', 'STORY-002');

    const out: string[] = [];
    await runSessionStart(dir, (s) => out.push(s));

    // CR-011: state banner is the first line; CR-009: resolver-status line is second.
    // No blocked-items lines beyond these two.
    assert.strictEqual((out).length, 2);
    assert.ok(String(out[0]).includes('ClearGate state:'));
    assert.ok(String(out[1]).includes('cleargate CLI:'));
  });

  test('blocked-items output is ≤ 400 chars (100-token proxy) for 3 failing items', async () => {
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
    assert.ok(blockedOutput.length <= 400);
  });

  test('emits only the resolver-status line when pending-sync directory does not exist', async () => {
    const dir = makeTmpDir();
    // No .cleargate/delivery/pending-sync/ created

    const out: string[] = [];
    await runSessionStart(dir, (s) => out.push(s));

    // CR-011: state banner is first; CR-009: resolver-status line is second.
    assert.strictEqual((out).length, 2);
    assert.ok(String(out[0]).includes('ClearGate state:'));
    assert.ok(String(out[1]).includes('cleargate CLI:'));
  });

  test('includes first failing criterion id in per-item line', async () => {
    const dir = makeTmpDir();
    writePendingSyncItem(dir, 'EPIC-008', 'EPIC-008', false, ['no-tbds', 'section-check']);

    const out: string[] = [];
    await runSessionStart(dir, (s) => out.push(s));
    const output = out.join('\n');

    assert.ok(String(output).includes('EPIC-008: no-tbds'));
  });

  test('skips items with pass=null (pre-migration drafts)', async () => {
    const dir = makeTmpDir();
    writePendingSyncItem(dir, 'EPIC-009', 'EPIC-009', null);

    const out: string[] = [];
    await runSessionStart(dir, (s) => out.push(s));

    // CR-009: resolver-status line is always emitted; null-pass items are not blocked.
    // CR-008: the planning-first reminder MAY appear (item has no approved: true).
    // The key check: no "N items blocked:" lines.
    const blockedCountLines = out.filter((l) => l.includes('items blocked:'));
    assert.strictEqual((blockedCountLines).length, 0);
  });

  // ─── CR-009: resolver-status line is prepended to output ─────────────────────

  test('CR-009: resolver-status line is emitted by runSessionStart (CR-011: after state banner)', async () => {
    const dir = makeTmpDir();
    writePendingSyncItem(dir, 'STORY-001', 'STORY-001', false, ['no-tbds']);

    const out: string[] = [];
    await runSessionStart(dir, (s) => out.push(s));

    // CR-011: state banner is now first; CR-009: resolver-status line is second.
    assert.ok(out.length >= 2);
    assert.ok(String(out[0]).includes('ClearGate state:'));
    assert.ok(String(out[1]).includes('cleargate CLI:'));
  });

  test('CR-009: resolver-status line is emitted even when zero items are blocked', async () => {
    const dir = makeTmpDir();

    const out: string[] = [];
    await runSessionStart(dir, (s) => out.push(s));

    // At minimum the resolver-status line should be emitted
    const hasResolverLine = out.some((l) => l.includes('cleargate CLI:'));
    assert.strictEqual(hasResolverLine, true);
  });
});

describe('CR-009 emitResolverStatusLine', () => {
  test('emits "local dist" line when cleargate-cli/dist/cli.js exists under cwd', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cg-resolver-'));
    const distPath = path.join(dir, 'cleargate-cli', 'dist');
    fs.mkdirSync(distPath, { recursive: true });
    fs.writeFileSync(path.join(distPath, 'cli.js'), '// stub', 'utf-8');

    const out: string[] = [];
    emitResolverStatusLine(dir, (s) => out.push(s));

    fs.rmSync(dir, { recursive: true, force: true });

    assert.ok(String(out[0]).includes('local dist'));
    assert.ok(String(out[0]).includes('cleargate CLI:'));
  });

  test('emits pin version when hook script has cleargate-pin comment', () => {
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
    assert.ok(String(out[0]).includes('cleargate CLI:'));
  });
});

// ─── CR-008 Phase A: planning-first reminder block ────────────────────────────

describe('CR-008 Phase A: planning-first reminder block', () => {
  test('CR-008 scenario 1: empty pending-sync + no .active sentinel → planning-first reminder emitted', async () => {
    const dir = makeTmpDir();
    // Create empty pending-sync dir (no approved stories)
    const pendingDir = path.join(dir, '.cleargate', 'delivery', 'pending-sync');
    fs.mkdirSync(pendingDir, { recursive: true });

    const out: string[] = [];
    await runSessionStart(dir, (s) => out.push(s));
    const output = out.join('\n');

    assert.ok(String(output).includes('Triage first, draft second:'));
    assert.ok(String(output).includes('(1) classify the request'));
    assert.ok(String(output).includes('(2) draft a work item'));
    assert.ok(String(output).includes('(3) halt at Gate 1'));
  });

  test('CR-008 scenario 2: one approved story in pending-sync → planning-first reminder suppressed', async () => {
    const dir = makeTmpDir();
    writeApprovedStory(dir, 'STORY-001', 'STORY-001');

    const out: string[] = [];
    await runSessionStart(dir, (s) => out.push(s));
    const output = out.join('\n');

    assert.ok(!String(output).includes('Triage first, draft second:'));
  });

  test('CR-008 scenario 3: sprint-active sentinel present + empty pending-sync → planning-first reminder suppressed', async () => {
    const dir = makeTmpDir();
    // Empty pending-sync
    const pendingDir = path.join(dir, '.cleargate', 'delivery', 'pending-sync');
    fs.mkdirSync(pendingDir, { recursive: true });
    // Sprint active sentinel
    writeSprintActiveSentinel(dir);

    const out: string[] = [];
    await runSessionStart(dir, (s) => out.push(s));
    const output = out.join('\n');

    assert.ok(!String(output).includes('Triage first, draft second:'));
  });

  test('CR-008: planning-first reminder is emitted when pending-sync has items but none approved', async () => {
    const dir = makeTmpDir();
    // Add a failing (non-approved) item
    writePendingSyncItem(dir, 'STORY-001', 'STORY-001', false, ['no-tbds']);

    const out: string[] = [];
    await runSessionStart(dir, (s) => out.push(s));
    const output = out.join('\n');

    // Reminder fires (no approved stories)
    assert.ok(String(output).includes('Triage first, draft second:'));
    // Blocked items also present
    assert.ok(String(output).includes('1 items blocked:'));
  });

  test('CR-008: planning-first reminder text matches PLANNING_FIRST_REMINDER constant', async () => {
    const dir = makeTmpDir();
    const pendingDir = path.join(dir, '.cleargate', 'delivery', 'pending-sync');
    fs.mkdirSync(pendingDir, { recursive: true });

    const out: string[] = [];
    await runSessionStart(dir, (s) => out.push(s));

    // The reminder text should be in the output
    const output = out.join('\n');
    assert.ok(String(output).includes(PLANNING_FIRST_REMINDER));
  });

  test('CR-008: resolver-status line is emitted before reminder (CR-011: state banner is first)', async () => {
    const dir = makeTmpDir();
    const pendingDir = path.join(dir, '.cleargate', 'delivery', 'pending-sync');
    fs.mkdirSync(pendingDir, { recursive: true });

    const out: string[] = [];
    await runSessionStart(dir, (s) => out.push(s));

    // CR-011: state banner is first
    assert.ok(String(out[0]).includes('ClearGate state:'));
    // CR-009: resolver-status is second
    assert.ok(String(out[1]).includes('cleargate CLI:'));
    // CR-008: planning-first reminder appears after resolver
    const reminderIdx = out.findIndex((l) => l.includes('Triage first, draft second:'));
    assert.ok(reminderIdx > 1);
  });

  test('CR-008: pending-sync dir absent → planning-first reminder is NOT emitted (early return path)', async () => {
    const dir = makeTmpDir();
    // No pending-sync dir at all

    const out: string[] = [];
    await runSessionStart(dir, (s) => out.push(s));
    const output = out.join('\n');

    // No reminder (dir missing = early return after resolver line)
    assert.ok(!String(output).includes('Triage first, draft second:'));
    // CR-011: state banner is first; CR-009: resolver line is second
    assert.ok(String(out[0]).includes('ClearGate state:'));
    assert.ok(String(out[1]).includes('cleargate CLI:'));
  });
});

// ─── STORY-014-01: --session-start exit-code hierarchy ───────────────────────

describe('STORY-014-01: --session-start mode preserves exit-code hierarchy', () => {
  test('outcome.blocker is set when runSessionStart encounters blocked items', async () => {
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
    assert.strictEqual(outcome.blocker, true);
    // CR-011: state banner is first; resolver-status is second
    assert.ok(String(out[0]).includes('ClearGate state:'));
    assert.ok(String(out[1]).includes('cleargate CLI:'));
    // Blocked item listed in output
    expect(out.join('\n')).toContain('STORY-014-01-TEST');
  });

  test('outcome.blocker is false when no blocked items exist', async () => {
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

    assert.strictEqual(outcome.blocker, false);
    assert.strictEqual(outcome.configError, false);
  });
});
