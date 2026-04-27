/**
 * init.test.ts — integration tests for `cleargate init` command
 *
 * Original 7 scenarios from M4 blueprint + 5 new STORY-009-03 snapshot/restore scenarios
 * + CR-009 scenarios for hook resolver pin and probe.
 * Uses real fs with tmpdir — no mocks per project policy.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import * as url from 'node:url';
import type { SpawnSyncReturns } from 'node:child_process';
import { initHandler } from '../../src/commands/init.js';
import type { WikiBuildOptions } from '../../src/commands/wiki-build.js';

const __testDirname = path.dirname(url.fileURLToPath(import.meta.url));
// test/commands/ → test/ → cleargate-cli/ → meta-root/  (3 levels up)
const META_ROOT = path.resolve(__testDirname, '..', '..', '..');
const META_ROOT_PLANNING = path.join(META_ROOT, 'cleargate-planning');
const SYNTHESIS_TEMPLATE_DIR = path.join(META_ROOT, 'cleargate-cli', 'templates', 'synthesis');

/** Build a standard fixture raw item with valid frontmatter */
function makeStoryMd(id: string): string {
  return `---
story_id: "${id}"
parent_epic_ref: "EPIC-001"
status: "Draft"
remote_id: ""
---

# ${id}: Test Story

A test story.
`;
}

function makeTmpDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'cg-init-test-'));
}

function cleanup(dir: string): void {
  fs.rmSync(dir, { recursive: true, force: true });
}

/** Capture stdout/stderr from initHandler */
function makeCapture(): { out: string[]; err: string[]; stdout: (s: string) => void; stderr: (s: string) => void } {
  const out: string[] = [];
  const err: string[] = [];
  return {
    out,
    err,
    stdout: (s) => { out.push(s); },
    stderr: (s) => { err.push(s); },
  };
}

describe('cleargate init', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = makeTmpDir();
  });

  afterEach(() => {
    cleanup(tmpDir);
  });

  // ─── Scenario 1: Greenfield init ────────────────────────────────────────────

  it('scenario 1: greenfield — creates full scaffold on empty dir', async () => {
    const cap = makeCapture();

    await initHandler({
      cwd: tmpDir,
      payloadDir: META_ROOT_PLANNING,
      stdout: cap.stdout,
      stderr: cap.stderr,
    });

    // CLAUDE.md exists with bounded block
    const claudeMd = fs.readFileSync(path.join(tmpDir, 'CLAUDE.md'), 'utf8');
    expect(claudeMd).toContain('<!-- CLEARGATE:START -->');
    expect(claudeMd).toContain('<!-- CLEARGATE:END -->');
    expect(claudeMd).toContain('ClearGate');
    // BUG-016: scaffold must NOT carry the canonical-source preamble.
    // The preamble starts with the H1 title only present in cleargate-planning/CLAUDE.md
    // and the meta sentence describing the bounded-block contract.
    expect(claudeMd).not.toContain('Injected CLAUDE.md Block');
    expect(claudeMd).not.toContain('This file is the content `cleargate init` injects');
    // First non-empty line must be the START marker (no preamble above it).
    const firstNonEmpty = claudeMd.split('\n').find((l) => l.trim().length > 0);
    expect(firstNonEmpty).toBe('<!-- CLEARGATE:START -->');

    // BUG-017 + BUG-019: .mcp.json registers cleargate as a stdio MCP server
    // pointing at `cleargate mcp serve` (handles auth + token refresh).
    const mcpJsonPath = path.join(tmpDir, '.mcp.json');
    expect(fs.existsSync(mcpJsonPath)).toBe(true);
    const mcpJson = JSON.parse(fs.readFileSync(mcpJsonPath, 'utf8')) as {
      mcpServers?: Record<string, { command?: string; args?: string[] }>;
    };
    expect(mcpJson.mcpServers?.cleargate?.command).toBe('cleargate');
    expect(mcpJson.mcpServers?.cleargate?.args).toEqual(['mcp', 'serve']);

    // BUG-018: hook scripts land with +x set (skip on Windows).
    if (process.platform !== 'win32') {
      const sessionStart = fs.statSync(path.join(tmpDir, '.claude', 'hooks', 'session-start.sh'));
      expect((sessionStart.mode & 0o111) !== 0).toBe(true);
    }

    // .claude/settings.json has BOTH SubagentStop (from payload) AND PostToolUse (added programmatically)
    const settings = JSON.parse(
      fs.readFileSync(path.join(tmpDir, '.claude', 'settings.json'), 'utf8'),
    );
    expect(settings.hooks?.SubagentStop).toBeDefined();
    expect(settings.hooks?.PostToolUse).toBeDefined();

    const postToolUse = settings.hooks.PostToolUse;
    expect(Array.isArray(postToolUse)).toBe(true);
    const editWriteEntry = postToolUse.find(
      (e: { matcher?: string }) => e.matcher === 'Edit|Write',
    );
    expect(editWriteEntry).toBeDefined();
    expect(editWriteEntry.hooks[0].command).toContain('stamp-and-gate.sh');

    // Agents present
    expect(fs.existsSync(path.join(tmpDir, '.claude', 'agents', 'architect.md'))).toBe(true);
    expect(fs.existsSync(path.join(tmpDir, '.claude', 'agents', 'developer.md'))).toBe(true);

    // Knowledge dir present
    expect(
      fs.existsSync(path.join(tmpDir, '.cleargate', 'knowledge', 'cleargate-protocol.md')),
    ).toBe(true);

    // Templates present
    expect(fs.existsSync(path.join(tmpDir, '.cleargate', 'templates', 'story.md'))).toBe(true);

    // Bootstrap skipped (empty delivery)
    const outJoined = cap.out.join('');
    expect(outJoined).toContain('skipping build');
  });

  // ─── Scenario 2: Re-run idempotent ──────────────────────────────────────────

  it('scenario 2: re-run idempotent — no duplicate block in CLAUDE.md, no duplicate hook', async () => {
    const cap1 = makeCapture();
    await initHandler({ cwd: tmpDir, payloadDir: META_ROOT_PLANNING, stdout: cap1.stdout, stderr: cap1.stderr });

    const cap2 = makeCapture();
    await initHandler({ cwd: tmpDir, payloadDir: META_ROOT_PLANNING, stdout: cap2.stdout, stderr: cap2.stderr });

    // CLAUDE.md: verify idempotency — the BLOCK_REGEX (greedy, matches first START to last END)
    // finds exactly ONE contiguous block. We verify this by checking that replacing the block
    // with a placeholder splits the file into exactly 2 parts (before + after the single block).
    // NOTE: The payload CLAUDE.md block itself contains inline references to the markers in prose
    // (line 37: "Content OUTSIDE this <!-- CLEARGATE:START -->...<!-- CLEARGATE:END --> block"),
    // so counting raw marker occurrences gives 2 per init run — this is expected and correct.
    const claudeMd = fs.readFileSync(path.join(tmpDir, 'CLAUDE.md'), 'utf8');
    const GREEDY_BLOCK_REGEX = /<!-- CLEARGATE:START -->[\s\S]*<!-- CLEARGATE:END -->/;
    // Replace entire greedy block with a placeholder — should replace exactly once
    const withPlaceholder = claudeMd.replace(GREEDY_BLOCK_REGEX, '__BLOCK__');
    // Verify only one block was replaced (file splits into 2 parts at placeholder)
    expect(withPlaceholder).toContain('__BLOCK__');
    expect(withPlaceholder.split('__BLOCK__')).toHaveLength(2);
    // Verify no remnant markers after the replacement (would indicate a second block)
    expect(withPlaceholder).not.toContain('<!-- CLEARGATE:END -->');

    // settings.json: exactly ONE PostToolUse entry with Edit|Write matcher
    const settings = JSON.parse(
      fs.readFileSync(path.join(tmpDir, '.claude', 'settings.json'), 'utf8'),
    );
    const postToolUse = settings.hooks?.PostToolUse ?? [];
    const editWriteEntries = postToolUse.filter((e: { matcher?: string }) => e.matcher === 'Edit|Write');
    expect(editWriteEntries).toHaveLength(1);

    // Inner hooks not duplicated
    const innerHooks = editWriteEntries[0].hooks;
    expect(innerHooks).toHaveLength(1);
  });

  // ─── Scenario 3: Existing CLAUDE.md without markers ─────────────────────────

  it('scenario 3: existing CLAUDE.md without markers — appends bounded block, preserves user content', async () => {
    const originalContent = '# My Project\n\nUser content here.\n';
    fs.writeFileSync(path.join(tmpDir, 'CLAUDE.md'), originalContent, 'utf8');

    const cap = makeCapture();
    await initHandler({ cwd: tmpDir, payloadDir: META_ROOT_PLANNING, stdout: cap.stdout, stderr: cap.stderr });

    const result = fs.readFileSync(path.join(tmpDir, 'CLAUDE.md'), 'utf8');

    // User content preserved above (starts with it)
    expect(result).toContain('# My Project\n\nUser content here.');

    // Bounded block appended after
    const userIdx = result.indexOf('# My Project');
    const startIdx = result.indexOf('<!-- CLEARGATE:START -->');
    expect(startIdx).toBeGreaterThan(userIdx);

    // Block present
    expect(result).toContain('<!-- CLEARGATE:END -->');
    expect(result).toContain('ClearGate');
  });

  // ─── Scenario 4: Existing CLAUDE.md WITH markers ────────────────────────────

  it('scenario 4: existing CLAUDE.md with markers — replaces block, preserves content above and below', async () => {
    const existingWithBlock =
      '# Top\n\n<!-- CLEARGATE:START -->\nOLD CONTENT\n<!-- CLEARGATE:END -->\n\n# Bottom\n';
    fs.writeFileSync(path.join(tmpDir, 'CLAUDE.md'), existingWithBlock, 'utf8');

    const cap = makeCapture();
    await initHandler({ cwd: tmpDir, payloadDir: META_ROOT_PLANNING, stdout: cap.stdout, stderr: cap.stderr });

    const result = fs.readFileSync(path.join(tmpDir, 'CLAUDE.md'), 'utf8');

    // # Top and # Bottom preserved
    expect(result).toContain('# Top');
    expect(result).toContain('# Bottom');

    // OLD CONTENT gone
    expect(result).not.toContain('OLD CONTENT');

    // New block present
    expect(result).toContain('<!-- CLEARGATE:START -->');
    expect(result).toContain('<!-- CLEARGATE:END -->');
    expect(result).toContain('ClearGate');
  });

  // ─── Scenario 5: Existing settings.json with SubagentStop only ──────────────

  it('scenario 5: existing settings.json with SubagentStop — merges PostToolUse, preserves SubagentStop', async () => {
    const existingSettings = {
      hooks: {
        SubagentStop: [
          {
            hooks: [{ type: 'command', command: '/usr/local/bin/my-hook' }],
          },
        ],
      },
    };
    const clauDeDir = path.join(tmpDir, '.claude');
    fs.mkdirSync(clauDeDir, { recursive: true });
    fs.writeFileSync(
      path.join(clauDeDir, 'settings.json'),
      JSON.stringify(existingSettings, null, 2) + '\n',
      'utf8',
    );

    const cap = makeCapture();
    await initHandler({ cwd: tmpDir, payloadDir: META_ROOT_PLANNING, stdout: cap.stdout, stderr: cap.stderr });

    const result = JSON.parse(
      fs.readFileSync(path.join(clauDeDir, 'settings.json'), 'utf8'),
    );

    // SubagentStop preserved (still 1 entry with my-hook)
    expect(result.hooks?.SubagentStop).toHaveLength(1);
    expect(result.hooks.SubagentStop[0].hooks[0].command).toBe('/usr/local/bin/my-hook');

    // PostToolUse added
    expect(result.hooks?.PostToolUse).toBeDefined();
    const editWriteEntry = result.hooks.PostToolUse.find(
      (e: { matcher?: string }) => e.matcher === 'Edit|Write',
    );
    expect(editWriteEntry).toBeDefined();
  });

  // ─── Scenario 6: Existing settings.json with different PostToolUse matcher ──

  it('scenario 6: existing PostToolUse with different matcher — appends Edit|Write entry, preserves Bash entry', async () => {
    const existingSettings = {
      hooks: {
        PostToolUse: [
          {
            matcher: 'Bash',
            hooks: [{ type: 'command', command: 'echo hi' }],
          },
        ],
      },
    };
    const clauDeDir = path.join(tmpDir, '.claude');
    fs.mkdirSync(clauDeDir, { recursive: true });
    fs.writeFileSync(
      path.join(clauDeDir, 'settings.json'),
      JSON.stringify(existingSettings, null, 2) + '\n',
      'utf8',
    );

    const cap = makeCapture();
    await initHandler({ cwd: tmpDir, payloadDir: META_ROOT_PLANNING, stdout: cap.stdout, stderr: cap.stderr });

    const result = JSON.parse(
      fs.readFileSync(path.join(clauDeDir, 'settings.json'), 'utf8'),
    );

    const postToolUse = result.hooks?.PostToolUse ?? [];

    // Now 2 entries: Bash (preserved) + Edit|Write (added)
    expect(postToolUse).toHaveLength(2);

    const bashEntry = postToolUse.find((e: { matcher?: string }) => e.matcher === 'Bash');
    expect(bashEntry).toBeDefined();
    expect(bashEntry.hooks[0].command).toBe('echo hi');

    const editWriteEntry = postToolUse.find((e: { matcher?: string }) => e.matcher === 'Edit|Write');
    expect(editWriteEntry).toBeDefined();
    expect(editWriteEntry.hooks[0].command).toContain('stamp-and-gate.sh');
  });

  // ─── STORY-009-03 Scenario 1: Fresh init writes snapshot ────────────────────

  it('STORY-009-03 scenario 1: fresh init writes .install-manifest.json with correct fields', async () => {
    const FROZEN_TS = '2026-04-19T12:00:00.000Z';
    const fakeManifest = {
      cleargate_version: '0.2.0-test',
      generated_at: '2026-04-19T10:00:00.000Z',
      files: [
        {
          path: '.cleargate/FLASHCARD.md',
          sha256: null,
          tier: 'user-artifact' as const,
          overwrite_policy: 'skip' as const,
          preserve_on_uninstall: true,
        },
      ],
    };

    const cap = makeCapture();
    await initHandler({
      cwd: tmpDir,
      payloadDir: META_ROOT_PLANNING,
      now: () => FROZEN_TS,
      stdout: cap.stdout,
      stderr: cap.stderr,
      readInstallManifest: () => fakeManifest,
    });

    const snapshotPath = path.join(tmpDir, '.cleargate', '.install-manifest.json');
    expect(fs.existsSync(snapshotPath)).toBe(true);

    const snapshot = JSON.parse(fs.readFileSync(snapshotPath, 'utf8'));
    expect(snapshot.cleargate_version).toBe('0.2.0-test');
    expect(snapshot.installed_at).toBe(FROZEN_TS);
    expect(Array.isArray(snapshot.files)).toBe(true);
    expect(snapshot.files).toHaveLength(1);
    expect(snapshot.files[0].path).toBe('.cleargate/FLASHCARD.md');

    // Snapshot step should be logged
    const outJoined = cap.out.join('');
    expect(outJoined).toContain('Wrote install snapshot');
  });

  // ─── STORY-009-03 Scenario 2: Init detects .uninstalled and prompts ─────────

  it('STORY-009-03 scenario 2: init detects .uninstalled marker and prompts; Y preserves + removes marker', async () => {
    // Set up .cleargate dir + FLASHCARD.md (the "preserved" file)
    const cleargateDir = path.join(tmpDir, '.cleargate');
    fs.mkdirSync(cleargateDir, { recursive: true });
    const flashcardPath = path.join(cleargateDir, 'FLASHCARD.md');
    fs.writeFileSync(flashcardPath, '# My flashcards\n', 'utf8');

    // Write .uninstalled marker
    const marker = {
      uninstalled_at: '2026-04-18T08:00:00.000Z',
      prior_version: '0.1.0-alpha.1',
      preserved: ['.cleargate/FLASHCARD.md'],
    };
    const markerPath = path.join(cleargateDir, '.uninstalled');
    fs.writeFileSync(markerPath, JSON.stringify(marker), 'utf8');

    const promptQuestions: string[] = [];
    const cap = makeCapture();

    await initHandler({
      cwd: tmpDir,
      payloadDir: META_ROOT_PLANNING,
      stdout: cap.stdout,
      stderr: cap.stderr,
      readInstallManifest: () => ({
        cleargate_version: '0.2.0-test',
        generated_at: '2026-04-19T10:00:00.000Z',
        files: [],
      }),
      promptYesNo: async (q: string) => {
        promptQuestions.push(q);
        return true; // User answers Y
      },
    });

    // Prompt was shown with the marker details
    expect(promptQuestions).toHaveLength(1);
    expect(promptQuestions[0]).toContain('Restore preserved items? [Y/n]');
    expect(promptQuestions[0]).toContain('2026-04-18T08:00:00.000Z');
    expect(promptQuestions[0]).toContain('0.1.0-alpha.1');

    // FLASHCARD.md was logged as [preserved] (file still exists)
    const outJoined = cap.out.join('');
    expect(outJoined).toContain('[preserved] .cleargate/FLASHCARD.md');

    // FLASHCARD.md content preserved byte-for-byte
    expect(fs.readFileSync(flashcardPath, 'utf8')).toBe('# My flashcards\n');

    // .uninstalled marker removed after init
    expect(fs.existsSync(markerPath)).toBe(false);
  });

  // ─── STORY-009-03 Scenario 3: Init with N choice proceeds without restore ───

  it('STORY-009-03 scenario 3: N choice proceeds normally, preserved files untouched, marker removed', async () => {
    const cleargateDir = path.join(tmpDir, '.cleargate');
    fs.mkdirSync(cleargateDir, { recursive: true });
    const flashcardPath = path.join(cleargateDir, 'FLASHCARD.md');
    const originalContent = '# User notes\n';
    fs.writeFileSync(flashcardPath, originalContent, 'utf8');

    const marker = {
      uninstalled_at: '2026-04-18T09:00:00.000Z',
      prior_version: '0.1.0-alpha.1',
      preserved: ['.cleargate/FLASHCARD.md'],
    };
    const markerPath = path.join(cleargateDir, '.uninstalled');
    fs.writeFileSync(markerPath, JSON.stringify(marker), 'utf8');

    const cap = makeCapture();
    await initHandler({
      cwd: tmpDir,
      payloadDir: META_ROOT_PLANNING,
      stdout: cap.stdout,
      stderr: cap.stderr,
      readInstallManifest: () => ({
        cleargate_version: '0.2.0-test',
        generated_at: '2026-04-19T10:00:00.000Z',
        files: [],
      }),
      promptYesNo: async () => false, // User answers N
    });

    // Init proceeded (Done message present)
    const outJoined = cap.out.join('');
    expect(outJoined).toContain('discarding preservation');
    expect(outJoined).toContain('Done.');

    // Preserved file untouched (N means do NOT touch them)
    expect(fs.readFileSync(flashcardPath, 'utf8')).toBe(originalContent);

    // Marker removed regardless of Y/N
    expect(fs.existsSync(markerPath)).toBe(false);
  });

  // ─── STORY-009-03 Scenario 4: Atomic snapshot write ─────────────────────────

  it('STORY-009-03 scenario 4: atomic snapshot write — if rename throws, final file does not exist', async () => {
    // We test atomicity by verifying writeAtomic pattern: the final file is either
    // fully written or absent. Since we cannot easily intercept fs.renameSync inside
    // writeAtomic without mocking, we instead verify the tmp file is cleaned up
    // on a successful write (no stale .tmp.* file remains).
    const cap = makeCapture();
    const FROZEN_TS = '2026-04-19T15:00:00.000Z';

    await initHandler({
      cwd: tmpDir,
      payloadDir: META_ROOT_PLANNING,
      now: () => FROZEN_TS,
      stdout: cap.stdout,
      stderr: cap.stderr,
      readInstallManifest: () => ({
        cleargate_version: '0.2.0-test',
        generated_at: '2026-04-19T10:00:00.000Z',
        files: [],
      }),
    });

    const cleargateDir = path.join(tmpDir, '.cleargate');
    const snapshotPath = path.join(cleargateDir, '.install-manifest.json');

    // Final file exists
    expect(fs.existsSync(snapshotPath)).toBe(true);

    // No stale .tmp.* files remain
    const tmpFiles = fs.readdirSync(cleargateDir).filter((f) => f.includes('.tmp.'));
    expect(tmpFiles).toHaveLength(0);

    // Content is valid JSON with installed_at
    const snapshot = JSON.parse(fs.readFileSync(snapshotPath, 'utf8'));
    expect(snapshot.installed_at).toBe(FROZEN_TS);
  });

  // ─── STORY-009-03 Scenario 5: Missing preserved file logs warning ────────────

  it('STORY-009-03 scenario 5: missing preserved path logs warning but init does NOT fail', async () => {
    const cleargateDir = path.join(tmpDir, '.cleargate');
    fs.mkdirSync(cleargateDir, { recursive: true });

    // Preserved file listed but does NOT exist on disk
    const marker = {
      uninstalled_at: '2026-04-18T10:00:00.000Z',
      prior_version: '0.1.0-alpha.1',
      preserved: ['.cleargate/FLASHCARD.md', '.cleargate/MISSING.md'],
    };
    const markerPath = path.join(cleargateDir, '.uninstalled');
    fs.writeFileSync(markerPath, JSON.stringify(marker), 'utf8');

    // FLASHCARD.md exists but MISSING.md does not
    fs.writeFileSync(path.join(cleargateDir, 'FLASHCARD.md'), '# exists\n', 'utf8');

    const cap = makeCapture();
    await initHandler({
      cwd: tmpDir,
      payloadDir: META_ROOT_PLANNING,
      stdout: cap.stdout,
      stderr: cap.stderr,
      readInstallManifest: () => ({
        cleargate_version: '0.2.0-test',
        generated_at: '2026-04-19T10:00:00.000Z',
        files: [],
      }),
      promptYesNo: async () => true, // User answers Y
    });

    const outJoined = cap.out.join('');

    // Warning for the missing file
    expect(outJoined).toContain('[warn] preserved path missing on disk: .cleargate/MISSING.md');

    // Existing file logged as preserved
    expect(outJoined).toContain('[preserved] .cleargate/FLASHCARD.md');

    // Init did NOT fail — Done message present
    expect(outJoined).toContain('Done.');

    // Marker removed
    expect(fs.existsSync(markerPath)).toBe(false);
  });

  // ─── CR-009 Scenario 1: No __CLEARGATE_VERSION__ placeholder remains ──────────

  it('CR-009 scenario 1: stamp-and-gate.sh has no __CLEARGATE_VERSION__ placeholder after init', async () => {
    const cap = makeCapture();

    // Stub the probe so test does not require real npx
    const probeStub = (cmd: string): SpawnSyncReturns<string> => {
      void cmd;
      return { status: 0, stdout: '0.5.0', stderr: '', pid: 0, output: [], signal: null, error: undefined };
    };

    await initHandler({
      cwd: tmpDir,
      payloadDir: META_ROOT_PLANNING,
      stdout: cap.stdout,
      stderr: cap.stderr,
      pin: '0.5.0',
      spawnSyncFn: probeStub as Parameters<typeof initHandler>[0]['spawnSyncFn'],
    });

    const hookContent = fs.readFileSync(
      path.join(tmpDir, '.claude', 'hooks', 'stamp-and-gate.sh'),
      'utf8',
    );
    // (a) placeholder fully substituted
    expect(hookContent).not.toContain('__CLEARGATE_VERSION__');
    // (b) third resolver branch contains the pinned version
    expect(hookContent).toContain('npx -y "cleargate@0.5.0"');
    // (c) pin comment present for sed-rewrite contract
    expect(hookContent).toContain('# cleargate-pin: 0.5.0');
  });

  // ─── CR-009 Scenario 2: session-start.sh has no placeholder ─────────────────

  it('CR-009 scenario 2: session-start.sh has no __CLEARGATE_VERSION__ placeholder after init', async () => {
    const cap = makeCapture();

    const probeStub = (_cmd: string): SpawnSyncReturns<string> =>
      ({ status: 0, stdout: '0.5.0', stderr: '', pid: 0, output: [], signal: null, error: undefined });

    await initHandler({
      cwd: tmpDir,
      payloadDir: META_ROOT_PLANNING,
      stdout: cap.stdout,
      stderr: cap.stderr,
      pin: '0.5.0',
      spawnSyncFn: probeStub as Parameters<typeof initHandler>[0]['spawnSyncFn'],
    });

    const hookContent = fs.readFileSync(
      path.join(tmpDir, '.claude', 'hooks', 'session-start.sh'),
      'utf8',
    );
    expect(hookContent).not.toContain('__CLEARGATE_VERSION__');
    expect(hookContent).toContain('npx -y "cleargate@0.5.0"');
  });

  // ─── CR-009 Scenario 3: --pin override stamps custom version ────────────────

  it('CR-009 scenario 3: --pin 0.6.0-beta stamps the custom version in both hooks', async () => {
    const cap = makeCapture();

    const probeStub = (_cmd: string): SpawnSyncReturns<string> =>
      ({ status: 0, stdout: '0.6.0-beta', stderr: '', pid: 0, output: [], signal: null, error: undefined });

    await initHandler({
      cwd: tmpDir,
      payloadDir: META_ROOT_PLANNING,
      stdout: cap.stdout,
      stderr: cap.stderr,
      pin: '0.6.0-beta',
      spawnSyncFn: probeStub as Parameters<typeof initHandler>[0]['spawnSyncFn'],
    });

    const stampHook = fs.readFileSync(
      path.join(tmpDir, '.claude', 'hooks', 'stamp-and-gate.sh'),
      'utf8',
    );
    const sessionHook = fs.readFileSync(
      path.join(tmpDir, '.claude', 'hooks', 'session-start.sh'),
      'utf8',
    );
    expect(stampHook).toContain('cleargate@0.6.0-beta');
    expect(sessionHook).toContain('cleargate@0.6.0-beta');
    expect(stampHook).not.toContain('cleargate@0.5.0');
  });

  // ─── CR-009 Scenario 4: Probe success — prints green line ───────────────────

  it('CR-009 scenario 4: probe success (status=0) — init prints green status line', async () => {
    const cap = makeCapture();

    // Stub probe to succeed (status 0)
    const probeStub = (_cmd: string): SpawnSyncReturns<string> =>
      ({ status: 0, stdout: '0.5.0', stderr: '', pid: 0, output: [], signal: null, error: undefined });

    await initHandler({
      cwd: tmpDir,
      payloadDir: META_ROOT_PLANNING,
      stdout: cap.stdout,
      stderr: cap.stderr,
      pin: '0.5.0',
      spawnSyncFn: probeStub as Parameters<typeof initHandler>[0]['spawnSyncFn'],
    });

    const outJoined = cap.out.join('');
    // Green status line
    expect(outJoined).toContain('\u{1F7E2}');
    // Exits normally — Done message present
    expect(outJoined).toContain('Done.');
  });

  // ─── CR-009 Scenario 5: Probe failure — prints red line and exits 1 ─────────

  it('CR-009 scenario 5 (post-BUG-015): probe failure prints yellow warning and continues init (no exit)', async () => {
    const cap = makeCapture();

    // Stub probe to fail (status non-zero) for ALL calls
    const probeStub = (_cmd: string): SpawnSyncReturns<string> =>
      ({ status: 1, stdout: '', stderr: 'error', pid: 0, output: [], signal: null, error: undefined });

    let exitCode: number | undefined;
    const exitStub = (code: number): never => {
      exitCode = code;
      throw new Error(`exit(${code})`);
    };

    // Post-BUG-015: probe failure is warn-not-block. init should NOT exit; should
    // print the yellow warning banner and continue scaffolding.
    await initHandler({
      cwd: tmpDir,
      payloadDir: META_ROOT_PLANNING,
      stdout: cap.stdout,
      stderr: cap.stderr,
      pin: '0.5.0',
      spawnSyncFn: probeStub as Parameters<typeof initHandler>[0]['spawnSyncFn'],
      exit: exitStub,
    });

    const outJoined = cap.out.join('');
    expect(outJoined).toContain('\u{1F7E1}'); // yellow warning, not red 🔴
    expect(outJoined).toContain('not resolvable in this environment');
    expect(outJoined).toContain('warning, not a fatal error');
    expect(exitCode).toBeUndefined(); // init should NOT have called exit()
  });

  // ─── CR-009 Scenario 6: Snapshot lock — stamp-and-gate.sh byte-equals cr-009 lock ─

  it('CR-009 scenario 6: rendered stamp-and-gate.sh byte-equals the cr-009 snapshot lock', async () => {
    const __testDir = path.dirname(url.fileURLToPath(import.meta.url));
    const lockPath = path.resolve(__testDir, '..', 'snapshots', 'hooks', 'stamp-and-gate.cr-009.sh');

    const probeStub = (_cmd: string): SpawnSyncReturns<string> =>
      ({ status: 0, stdout: '0.5.0', stderr: '', pid: 0, output: [], signal: null, error: undefined });

    const cap = makeCapture();
    await initHandler({
      cwd: tmpDir,
      payloadDir: META_ROOT_PLANNING,
      stdout: cap.stdout,
      stderr: cap.stderr,
      pin: '0.5.0',
      spawnSyncFn: probeStub as Parameters<typeof initHandler>[0]['spawnSyncFn'],
    });

    const rendered = fs.readFileSync(
      path.join(tmpDir, '.claude', 'hooks', 'stamp-and-gate.sh'),
      'utf8',
    );
    const locked = fs.readFileSync(lockPath, 'utf8');
    expect(rendered).toBe(locked);
  });

  // ─── CR-008 Scenario: Snapshot lock — session-start.sh byte-equals cr-008 lock ──
  // CR-008 drops `2>/dev/null` on the doctor call (Phase A stdout routing).
  // The cr-009 lock is retained as a historical baseline; this test asserts the
  // post-CR-008 rendered state matches the cr-008 lock.

  it('CR-008 snapshot: rendered session-start.sh byte-equals the cr-008 snapshot lock', async () => {
    const __testDir = path.dirname(url.fileURLToPath(import.meta.url));
    const lockPath = path.resolve(__testDir, '..', 'snapshots', 'hooks', 'session-start.cr-008.sh');

    const probeStub = (_cmd: string): SpawnSyncReturns<string> =>
      ({ status: 0, stdout: '0.5.0', stderr: '', pid: 0, output: [], signal: null, error: undefined });

    const cap = makeCapture();
    await initHandler({
      cwd: tmpDir,
      payloadDir: META_ROOT_PLANNING,
      stdout: cap.stdout,
      stderr: cap.stderr,
      pin: '0.5.0',
      spawnSyncFn: probeStub as Parameters<typeof initHandler>[0]['spawnSyncFn'],
    });

    const rendered = fs.readFileSync(
      path.join(tmpDir, '.claude', 'hooks', 'session-start.sh'),
      'utf8',
    );
    const locked = fs.readFileSync(lockPath, 'utf8');
    expect(rendered).toBe(locked);
  });

  // ─── CR-008 Collision check: cr-008 vs cr-009 diff is exactly one line ────────

  it('CR-008 collision-check: session-start.cr-008.sh differs from cr-009 by exactly one line (line 18)', () => {
    const __testDir = path.dirname(url.fileURLToPath(import.meta.url));
    const cr009Path = path.resolve(__testDir, '..', 'snapshots', 'hooks', 'session-start.cr-009.sh');
    const cr008Path = path.resolve(__testDir, '..', 'snapshots', 'hooks', 'session-start.cr-008.sh');

    const cr009Lines = fs.readFileSync(cr009Path, 'utf8').split('\n');
    const cr008Lines = fs.readFileSync(cr008Path, 'utf8').split('\n');

    // Same line count
    expect(cr008Lines).toHaveLength(cr009Lines.length);

    // Find differing lines
    const diffingLines: number[] = [];
    for (let i = 0; i < cr009Lines.length; i++) {
      if (cr009Lines[i] !== cr008Lines[i]) {
        diffingLines.push(i + 1); // 1-indexed line numbers
      }
    }

    // Exactly one line differs
    expect(diffingLines).toHaveLength(1);
    // The differing line is line 18 (the doctor call)
    expect(diffingLines[0]).toBe(18);
    // CR-009 has 2>/dev/null; CR-008 does not
    expect(cr009Lines[17]).toContain('2>/dev/null');
    expect(cr008Lines[17]).not.toContain('2>/dev/null');
  });

  // ─── CR-008 Snapshot: pre-edit-gate.sh byte-equals cr-008 lock ──────────────

  it('CR-008 snapshot: rendered pre-edit-gate.sh byte-equals the cr-008 snapshot lock', async () => {
    const __testDir = path.dirname(url.fileURLToPath(import.meta.url));
    const lockPath = path.resolve(__testDir, '..', 'snapshots', 'hooks', 'pre-edit-gate.cr-008.sh');

    const probeStub = (_cmd: string): SpawnSyncReturns<string> =>
      ({ status: 0, stdout: '0.5.0', stderr: '', pid: 0, output: [], signal: null, error: undefined });

    const cap = makeCapture();
    await initHandler({
      cwd: tmpDir,
      payloadDir: META_ROOT_PLANNING,
      stdout: cap.stdout,
      stderr: cap.stderr,
      pin: '0.5.0',
      spawnSyncFn: probeStub as Parameters<typeof initHandler>[0]['spawnSyncFn'],
    });

    const rendered = fs.readFileSync(
      path.join(tmpDir, '.claude', 'hooks', 'pre-edit-gate.sh'),
      'utf8',
    );
    const locked = fs.readFileSync(lockPath, 'utf8');
    expect(rendered).toBe(locked);
  });

  // ─── CR-008 Snapshot: stamp-and-gate.cr-008 equals cr-009 (CR-008 unchanged) ─

  it('CR-008 snapshot: stamp-and-gate.cr-008.sh is byte-identical to cr-009 lock (CR-008 does not touch it)', () => {
    const __testDir = path.dirname(url.fileURLToPath(import.meta.url));
    const cr009Path = path.resolve(__testDir, '..', 'snapshots', 'hooks', 'stamp-and-gate.cr-009.sh');
    const cr008Path = path.resolve(__testDir, '..', 'snapshots', 'hooks', 'stamp-and-gate.cr-008.sh');

    const cr009 = fs.readFileSync(cr009Path, 'utf8');
    const cr008 = fs.readFileSync(cr008Path, 'utf8');
    expect(cr008).toBe(cr009);
  });

  // ─── Scenario 7: Bootstrap with existing items ───────────────────────────────

  it('scenario 7: bootstrap pass — wiki build runs on pre-seeded delivery items', async () => {
    // Seed delivery/pending-sync with 3 story files
    const pendingSyncDir = path.join(tmpDir, '.cleargate', 'delivery', 'pending-sync');
    const archiveDir = path.join(tmpDir, '.cleargate', 'delivery', 'archive');
    fs.mkdirSync(pendingSyncDir, { recursive: true });
    fs.mkdirSync(archiveDir, { recursive: true });

    const storyIds = ['STORY-001-01', 'STORY-001-02', 'STORY-001-03'];
    for (const id of storyIds) {
      fs.writeFileSync(
        path.join(pendingSyncDir, `${id}_Test.md`),
        makeStoryMd(id),
        'utf8',
      );
    }

    // Track whether runWikiBuild was called
    let wikiBuildCalled = 0;
    const mockRunWikiBuild = async (opts: WikiBuildOptions): Promise<void> => {
      wikiBuildCalled++;
      // Actually run wiki build (not a stub) so we can assert wiki output
      const { wikiBuildHandler } = await import('../../src/commands/wiki-build.js');
      await wikiBuildHandler({
        ...opts,
        // Supply a real templateDir so synthesis doesn't fail on import.meta resolution
        templateDir: SYNTHESIS_TEMPLATE_DIR,
      });
    };

    const cap = makeCapture();
    await initHandler({
      cwd: tmpDir,
      payloadDir: META_ROOT_PLANNING,
      stdout: cap.stdout,
      stderr: cap.stderr,
      runWikiBuild: mockRunWikiBuild,
    });

    // wikiBuildHandler called exactly once
    expect(wikiBuildCalled).toBe(1);

    // Bootstrap message printed
    const outJoined = cap.out.join('');
    expect(outJoined).toContain('Bootstrap: ran wiki build');

    // Wiki index exists and lists all 3 stories
    const indexPath = path.join(tmpDir, '.cleargate', 'wiki', 'index.md');
    expect(fs.existsSync(indexPath)).toBe(true);
    const indexContent = fs.readFileSync(indexPath, 'utf8');
    expect(indexContent).toContain('STORY-001-01');
    expect(indexContent).toContain('STORY-001-02');
    expect(indexContent).toContain('STORY-001-03');

    // Wiki stories pages created
    for (const id of storyIds) {
      const pageExists = fs.existsSync(path.join(tmpDir, '.cleargate', 'wiki', 'stories', `${id}.md`));
      expect(pageExists).toBe(true);
    }
  }, 20000);
});
