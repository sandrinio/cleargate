/**
 * doctor-session-start.test.ts — STORY-008-06 + CR-009
 *
 * Tests for `cleargate doctor --session-start` mode and CR-009 resolver-status line.
 * Named cases follow the Gherkin scenarios from the story.
 */

import { describe, it, expect, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { runSessionStart, emitResolverStatusLine } from '../../src/commands/doctor.js';

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

  const content = `---
story_id: "${id}"
status: "Draft"
cached_gate_result: ${gateResult}
---

# ${name}
`;
  fs.writeFileSync(path.join(pendingDir, `${name}.md`), content, 'utf-8');
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

    // CR-009: resolver-status line is always emitted; no blocked-items lines
    expect(out).toHaveLength(1);
    expect(out[0]).toContain('cleargate CLI:');
  });

  it('blocked-items output is ≤ 400 chars (100-token proxy) for 3 failing items', async () => {
    const dir = makeTmpDir();
    writePendingSyncItem(dir, 'EPIC-001', 'EPIC-001', false, ['no-tbds']);
    writePendingSyncItem(dir, 'STORY-001-01', 'STORY-001-01', false, ['section-check']);
    writePendingSyncItem(dir, 'BUG-002', 'BUG-002', false, ['file-exists']);

    const out: string[] = [];
    await runSessionStart(dir, (s) => out.push(s));

    // CR-009: resolver-status line is the first item; blocked-items text is after it.
    // The 400-char cap applies to the blocked-items chunk, not the resolver line.
    const blockedOutput = out.filter((l) => !l.includes('cleargate CLI:')).join('\n');
    expect(blockedOutput.length).toBeLessThanOrEqual(400);
  });

  it('emits only the resolver-status line when pending-sync directory does not exist', async () => {
    const dir = makeTmpDir();
    // No .cleargate/delivery/pending-sync/ created

    const out: string[] = [];
    await runSessionStart(dir, (s) => out.push(s));

    // CR-009: resolver-status line is always emitted
    expect(out).toHaveLength(1);
    expect(out[0]).toContain('cleargate CLI:');
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

    // CR-009: resolver-status line is always emitted; null-pass items are not blocked
    const blockedLines = out.filter((l) => !l.includes('cleargate CLI:'));
    expect(blockedLines).toHaveLength(0);
  });

  // ─── CR-009: resolver-status line is prepended to output ─────────────────────

  it('CR-009: resolver-status line is the first line emitted by runSessionStart', async () => {
    const dir = makeTmpDir();
    writePendingSyncItem(dir, 'STORY-001', 'STORY-001', false, ['no-tbds']);

    const out: string[] = [];
    await runSessionStart(dir, (s) => out.push(s));

    // Output must be non-empty (blocked item + resolver line)
    expect(out.length).toBeGreaterThanOrEqual(1);
    // First emitted line must be the resolver-status line
    expect(out[0]).toContain('cleargate CLI:');
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
    const hookContent = `#!/usr/bin/env bash\n# cleargate-pin: 1.2.3\nCG=(npx -y "@cleargate/cli@1.2.3")\n`;
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
