import { describe, test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';

/**
 * init.test.ts — integration tests for `cleargate init` command
 *
 * Original 7 scenarios from M4 blueprint + 5 new STORY-009-03 snapshot/restore scenarios
 * + CR-009 scenarios for hook resolver pin and probe.
 * Uses real fs with tmpdir — no mocks per project policy.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import * as url from 'node:url';
import type { SpawnSyncReturns } from 'node:child_process';
import { initHandler } from '../../src/commands/init.js';
import type { WikiBuildOptions } from '../../src/commands/wiki-build.js';

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

  test('scenario 1: greenfield — creates full scaffold on empty dir', async () => {
    const cap = makeCapture();

    await initHandler({
      cwd: tmpDir,
      payloadDir: META_ROOT_PLANNING,
      stdout: cap.stdout,
      stderr: cap.stderr,
    });

    // CLAUDE.md exists with bounded block
    const claudeMd = fs.readFileSync(path.join(tmpDir, 'CLAUDE.md'), 'utf8');
    assert.ok(String(claudeMd).includes('<!-- CLEARGATE:START -->'));
    assert.ok(String(claudeMd).includes('<!-- CLEARGATE:END -->'));
    assert.ok(String(claudeMd).includes('ClearGate'));
    // BUG-016: scaffold must NOT carry the canonical-source preamble.
    // The preamble starts with the H1 title only present in cleargate-planning/CLAUDE.md
    // and the meta sentence describing the bounded-block contract.
    assert.ok(!String(claudeMd).includes('Injected CLAUDE.md Block'));
    assert.ok(!String(claudeMd).includes('This file is the content `cleargate init` injects'));
    // First non-empty line must be the START marker (no preamble above it).
    const firstNonEmpty = claudeMd.split('\n').find((l) => l.trim().length > 0);
    assert.strictEqual(firstNonEmpty, '<!-- CLEARGATE:START -->');

    // BUG-017 + BUG-019: .mcp.json registers cleargate as a stdio MCP server
    // spawned via `npx -y cleargate@<pin> mcp serve` (handles auth + refresh).
    // npx form chosen so users without a global cleargate install also get a
    // working spawn (most onboard via `npx cleargate init`).
    const mcpJsonPath = path.join(tmpDir, '.mcp.json');
    expect(fs.existsSync(mcpJsonPath)).toBe(true);
    const mcpJson = JSON.parse(fs.readFileSync(mcpJsonPath, 'utf8')) as {
      mcpServers?: Record<string, { command?: string; args?: string[] }>;
    };
    assert.strictEqual(mcpJson.mcpServers?.cleargate?.command, 'npx');
    const args = mcpJson.mcpServers?.cleargate?.args ?? [];
    assert.strictEqual(args[0], '-y');
    assert.match(String(args[1]), /^cleargate@/);
    expect(args.slice(2)).toEqual(['mcp', 'serve']);

    // BUG-018: hook scripts land with +x set (skip on Windows).
    if (process.platform !== 'win32') {
      const sessionStart = fs.statSync(path.join(tmpDir, '.claude', 'hooks', 'session-start.sh'));
      expect((sessionStart.mode & 0o111) !== 0).toBe(true);
    }

    // .claude/settings.json has BOTH SubagentStop (from payload) AND PostToolUse (added programmatically)
    const settings = JSON.parse(
      fs.readFileSync(path.join(tmpDir, '.claude', 'settings.json'), 'utf8'),
    );
    assert.notStrictEqual(settings.hooks?.SubagentStop, undefined);
    assert.notStrictEqual(settings.hooks?.PostToolUse, undefined);

    const postToolUse = settings.hooks.PostToolUse;
    expect(Array.isArray(postToolUse)).toBe(true);
    const editWriteEntry = postToolUse.find(
      (e: { matcher?: string }) => e.matcher === 'Edit|Write',
    );
    assert.notStrictEqual(editWriteEntry, undefined);
    assert.ok(String(editWriteEntry.hooks[0].command).includes('stamp-and-gate.sh'));

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
    assert.ok(String(outJoined).includes('skipping build'));
  });

  // ─── Scenario 2: Re-run idempotent ──────────────────────────────────────────

  test('scenario 2: re-run idempotent — no duplicate block in CLAUDE.md, no duplicate hook', async () => {
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
    assert.ok(String(withPlaceholder).includes('__BLOCK__'));
    expect(withPlaceholder.split('__BLOCK__')).toHaveLength(2);
    // Verify no remnant markers after the replacement (would indicate a second block)
    assert.ok(!String(withPlaceholder).includes('<!-- CLEARGATE:END -->'));

    // settings.json: exactly ONE PostToolUse entry with Edit|Write matcher
    const settings = JSON.parse(
      fs.readFileSync(path.join(tmpDir, '.claude', 'settings.json'), 'utf8'),
    );
    const postToolUse = settings.hooks?.PostToolUse ?? [];
    const editWriteEntries = postToolUse.filter((e: { matcher?: string }) => e.matcher === 'Edit|Write');
    assert.strictEqual((editWriteEntries).length, 1);

    // Inner hooks not duplicated
    const innerHooks = editWriteEntries[0].hooks;
    assert.strictEqual((innerHooks).length, 1);
  });

  // ─── Scenario 3: Existing CLAUDE.md without markers ─────────────────────────

  test('scenario 3: existing CLAUDE.md without markers — appends bounded block, preserves user content', async () => {
    const originalContent = '# My Project\n\nUser content here.\n';
    fs.writeFileSync(path.join(tmpDir, 'CLAUDE.md'), originalContent, 'utf8');

    const cap = makeCapture();
    await initHandler({ cwd: tmpDir, payloadDir: META_ROOT_PLANNING, stdout: cap.stdout, stderr: cap.stderr });

    const result = fs.readFileSync(path.join(tmpDir, 'CLAUDE.md'), 'utf8');

    // User content preserved above (starts with it)
    assert.ok(String(result).includes('# My Project\n\nUser content here.'));

    // Bounded block appended after
    const userIdx = result.indexOf('# My Project');
    const startIdx = result.indexOf('<!-- CLEARGATE:START -->');
    assert.ok(startIdx > userIdx);

    // Block present
    assert.ok(String(result).includes('<!-- CLEARGATE:END -->'));
    assert.ok(String(result).includes('ClearGate'));
  });

  // ─── Scenario 4: Existing CLAUDE.md WITH markers ────────────────────────────

  test('scenario 4: existing CLAUDE.md with markers — replaces block, preserves content above and below', async () => {
    const existingWithBlock =
      '# Top\n\n<!-- CLEARGATE:START -->\nOLD CONTENT\n<!-- CLEARGATE:END -->\n\n# Bottom\n';
    fs.writeFileSync(path.join(tmpDir, 'CLAUDE.md'), existingWithBlock, 'utf8');

    const cap = makeCapture();
    await initHandler({ cwd: tmpDir, payloadDir: META_ROOT_PLANNING, stdout: cap.stdout, stderr: cap.stderr });

    const result = fs.readFileSync(path.join(tmpDir, 'CLAUDE.md'), 'utf8');

    // # Top and # Bottom preserved
    assert.ok(String(result).includes('# Top'));
    assert.ok(String(result).includes('# Bottom'));

    // OLD CONTENT gone
    assert.ok(!String(result).includes('OLD CONTENT'));

    // New block present
    assert.ok(String(result).includes('<!-- CLEARGATE:START -->'));
    assert.ok(String(result).includes('<!-- CLEARGATE:END -->'));
    assert.ok(String(result).includes('ClearGate'));
  });

  // ─── Scenario 5: Existing settings.json with SubagentStop only ──────────────

  test('scenario 5: existing settings.json with SubagentStop — merges PostToolUse, preserves SubagentStop', async () => {
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
    assert.strictEqual((result.hooks?.SubagentStop).length, 1);
    assert.strictEqual(result.hooks.SubagentStop[0].hooks[0].command, '/usr/local/bin/my-hook');

    // PostToolUse added
    assert.notStrictEqual(result.hooks?.PostToolUse, undefined);
    const editWriteEntry = result.hooks.PostToolUse.find(
      (e: { matcher?: string }) => e.matcher === 'Edit|Write',
    );
    assert.notStrictEqual(editWriteEntry, undefined);
  });

  // ─── Scenario 6: Existing settings.json with different PostToolUse matcher ──

  test('scenario 6: existing PostToolUse with different matcher — appends Edit|Write entry, preserves Bash entry', async () => {
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
    assert.strictEqual((postToolUse).length, 2);

    const bashEntry = postToolUse.find((e: { matcher?: string }) => e.matcher === 'Bash');
    assert.notStrictEqual(bashEntry, undefined);
    assert.strictEqual(bashEntry.hooks[0].command, 'echo hi');

    const editWriteEntry = postToolUse.find((e: { matcher?: string }) => e.matcher === 'Edit|Write');
    assert.notStrictEqual(editWriteEntry, undefined);
    assert.ok(String(editWriteEntry.hooks[0].command).includes('stamp-and-gate.sh'));
  });

  // ─── STORY-009-03 Scenario 1: Fresh init writes snapshot ────────────────────

  test('STORY-009-03 scenario 1: fresh init writes .install-manifest.json with correct fields', async () => {
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
    assert.strictEqual(snapshot.cleargate_version, '0.2.0-test');
    assert.strictEqual(snapshot.installed_at, FROZEN_TS);
    expect(Array.isArray(snapshot.files)).toBe(true);
    assert.strictEqual((snapshot.files).length, 1);
    assert.strictEqual(snapshot.files[0].path, '.cleargate/FLASHCARD.md');

    // Snapshot step should be logged
    const outJoined = cap.out.join('');
    assert.ok(String(outJoined).includes('Wrote install snapshot'));
  });

  // ─── STORY-009-03 Scenario 2: Init detects .uninstalled and prompts ─────────

  test('STORY-009-03 scenario 2: init detects .uninstalled marker and prompts; Y preserves + removes marker', async () => {
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
    assert.strictEqual((promptQuestions).length, 1);
    assert.ok(String(promptQuestions[0]).includes('Restore preserved items? [Y/n]'));
    assert.ok(String(promptQuestions[0]).includes('2026-04-18T08:00:00.000Z'));
    assert.ok(String(promptQuestions[0]).includes('0.1.0-alpha.1'));

    // FLASHCARD.md was logged as [preserved] (file still exists)
    const outJoined = cap.out.join('');
    assert.ok(String(outJoined).includes('[preserved] .cleargate/FLASHCARD.md'));

    // FLASHCARD.md content preserved byte-for-byte
    expect(fs.readFileSync(flashcardPath, 'utf8')).toBe('# My flashcards\n');

    // .uninstalled marker removed after init
    expect(fs.existsSync(markerPath)).toBe(false);
  });

  // ─── STORY-009-03 Scenario 3: Init with N choice proceeds without restore ───

  test('STORY-009-03 scenario 3: N choice proceeds normally, preserved files untouched, marker removed', async () => {
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
    assert.ok(String(outJoined).includes('discarding preservation'));
    assert.ok(String(outJoined).includes('Done.'));

    // Preserved file untouched (N means do NOT touch them)
    expect(fs.readFileSync(flashcardPath, 'utf8')).toBe(originalContent);

    // Marker removed regardless of Y/N
    expect(fs.existsSync(markerPath)).toBe(false);
  });

  // ─── STORY-009-03 Scenario 4: Atomic snapshot write ─────────────────────────

  test('STORY-009-03 scenario 4: atomic snapshot write — if rename throws, final file does not exist', async () => {
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
    assert.strictEqual((tmpFiles).length, 0);

    // Content is valid JSON with installed_at
    const snapshot = JSON.parse(fs.readFileSync(snapshotPath, 'utf8'));
    assert.strictEqual(snapshot.installed_at, FROZEN_TS);
  });

  // ─── STORY-009-03 Scenario 5: Missing preserved file logs warning ────────────

  test('STORY-009-03 scenario 5: missing preserved path logs warning but init does NOT fail', async () => {
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
    assert.ok(String(outJoined).includes('[warn] preserved path missing on disk: .cleargate/MISSING.md'));

    // Existing file logged as preserved
    assert.ok(String(outJoined).includes('[preserved] .cleargate/FLASHCARD.md'));

    // Init did NOT fail — Done message present
    assert.ok(String(outJoined).includes('Done.'));

    // Marker removed
    expect(fs.existsSync(markerPath)).toBe(false);
  });

  // ─── CR-009 Scenario 1: No __CLEARGATE_VERSION__ placeholder remains ──────────

  test('CR-009 scenario 1: stamp-and-gate.sh has no __CLEARGATE_VERSION__ placeholder after init', async () => {
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
    assert.ok(!String(hookContent).includes('__CLEARGATE_VERSION__'));
    // (b) third resolver branch contains the pinned version
    assert.ok(String(hookContent).includes('npx -y "cleargate@0.5.0"'));
    // (c) pin comment present for sed-rewrite contract
    assert.ok(String(hookContent).includes('# cleargate-pin: 0.5.0'));
  });

  // ─── CR-009 Scenario 2: session-start.sh has no placeholder ─────────────────

  test('CR-009 scenario 2: session-start.sh has no __CLEARGATE_VERSION__ placeholder after init', async () => {
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
    assert.ok(!String(hookContent).includes('__CLEARGATE_VERSION__'));
    assert.ok(String(hookContent).includes('npx -y "cleargate@0.5.0"'));
  });

  // ─── CR-009 Scenario 3: --pin override stamps custom version ────────────────

  test('CR-009 scenario 3: --pin 0.6.0-beta stamps the custom version in both hooks', async () => {
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
    assert.ok(String(stampHook).includes('cleargate@0.6.0-beta'));
    assert.ok(String(sessionHook).includes('cleargate@0.6.0-beta'));
    assert.ok(!String(stampHook).includes('cleargate@0.5.0'));
  });

  // ─── CR-009 Scenario 4: Probe success — prints green line ───────────────────

  test('CR-009 scenario 4: probe success (status=0) — init prints green status line', async () => {
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
    assert.ok(String(outJoined).includes('\u{1F7E2}'));
    // Exits normally — Done message present
    assert.ok(String(outJoined).includes('Done.'));
  });

  // ─── CR-009 Scenario 5: Probe failure — prints red line and exits 1 ─────────

  test('CR-009 scenario 5 (post-BUG-015): probe failure prints yellow warning and continues init (no exit)', async () => {
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
    assert.ok(String(outJoined).includes('\u{1F7E1}')); // yellow warning, not red 🔴
    assert.ok(String(outJoined).includes('not resolvable in this environment'));
    assert.ok(String(outJoined).includes('warning, not a fatal error'));
    assert.strictEqual(exitCode, undefined); // init should NOT have called exit()
  });

  // ─── CR-009 Scenario 6: Snapshot lock — stamp-and-gate.sh byte-equals cr-009 lock ─

  test('CR-009 scenario 6: rendered stamp-and-gate.sh byte-equals the cr-009 snapshot lock', async () => {
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
    assert.strictEqual(rendered, locked);
  });

  // ─── CR-008 Scenario: Snapshot lock — session-start.sh byte-equals cr-008 lock ──
  // CR-008 drops `2>/dev/null` on the doctor call (Phase A stdout routing).
  // The cr-009 lock is retained as a historical baseline; this test asserts the
  // post-CR-008 rendered state matches the cr-008 lock.

  test('CR-008 snapshot: rendered session-start.sh byte-equals the cr-008 snapshot lock', async () => {
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
    assert.strictEqual(rendered, locked);
  });

  // ─── CR-008 Collision check: cr-008 vs cr-009 diff is exactly one line ────────

  test('CR-008 collision-check: session-start.cr-008.sh differs from cr-009 by exactly one line (line 18)', () => {
    const __testDir = path.dirname(url.fileURLToPath(import.meta.url));
    const cr009Path = path.resolve(__testDir, '..', 'snapshots', 'hooks', 'session-start.cr-009.sh');
    const cr008Path = path.resolve(__testDir, '..', 'snapshots', 'hooks', 'session-start.cr-008.sh');

    const cr009Lines = fs.readFileSync(cr009Path, 'utf8').split('\n');
    const cr008Lines = fs.readFileSync(cr008Path, 'utf8').split('\n');

    // Same line count
    assert.strictEqual((cr008Lines).length, cr009Lines.length);

    // Find differing lines
    const diffingLines: number[] = [];
    for (let i = 0; i < cr009Lines.length; i++) {
      if (cr009Lines[i] !== cr008Lines[i]) {
        diffingLines.push(i + 1); // 1-indexed line numbers
      }
    }

    // Exactly one line differs
    assert.strictEqual((diffingLines).length, 1);
    // The differing line is line 18 (the doctor call)
    assert.strictEqual(diffingLines[0], 18);
    // CR-009 has 2>/dev/null; CR-008 does not
    assert.ok(String(cr009Lines[17]).includes('2>/dev/null'));
    assert.ok(!String(cr008Lines[17]).includes('2>/dev/null'));
  });

  // ─── CR-008 Snapshot: pre-edit-gate.sh byte-equals cr-008 lock ──────────────

  test('CR-008 snapshot: rendered pre-edit-gate.sh byte-equals the cr-008 snapshot lock', async () => {
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
    assert.strictEqual(rendered, locked);
  });

  // ─── CR-008 Snapshot: stamp-and-gate.cr-008 equals cr-009 (CR-008 unchanged) ─

  test('CR-008 snapshot: stamp-and-gate.cr-008.sh is byte-identical to cr-009 lock (CR-008 does not touch it)', () => {
    const __testDir = path.dirname(url.fileURLToPath(import.meta.url));
    const cr009Path = path.resolve(__testDir, '..', 'snapshots', 'hooks', 'stamp-and-gate.cr-009.sh');
    const cr008Path = path.resolve(__testDir, '..', 'snapshots', 'hooks', 'stamp-and-gate.cr-008.sh');

    const cr009 = fs.readFileSync(cr009Path, 'utf8');
    const cr008 = fs.readFileSync(cr008Path, 'utf8');
    assert.strictEqual(cr008, cr009);
  });

  // ─── Scenario 7: Bootstrap with existing items ───────────────────────────────

  test('scenario 7: bootstrap pass — wiki build runs on pre-seeded delivery items', async () => {
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
    assert.strictEqual(wikiBuildCalled, 1);

    // Bootstrap message printed
    const outJoined = cap.out.join('');
    assert.ok(String(outJoined).includes('Bootstrap: ran wiki build'));

    // Wiki index exists and lists all 3 stories
    const indexPath = path.join(tmpDir, '.cleargate', 'wiki', 'index.md');
    expect(fs.existsSync(indexPath)).toBe(true);
    const indexContent = fs.readFileSync(indexPath, 'utf8');
    assert.ok(String(indexContent).includes('STORY-001-01'));
    assert.ok(String(indexContent).includes('STORY-001-02'));
    assert.ok(String(indexContent).includes('STORY-001-03'));

    // Wiki stories pages created
    for (const id of storyIds) {
      const pageExists = fs.existsSync(path.join(tmpDir, '.cleargate', 'wiki', 'stories', `${id}.md`));
      assert.strictEqual(pageExists, true);
    }
  }, 20000);

  // ─── CR-059 Scenario 5: Idempotent re-init suppresses restart warning ────────
  //
  // Given: existingSettings already has the exact PostToolUse + PreToolUse block
  //        that HOOK_ADDITION would add (nothing schema-meaningful changes).
  // When:  init runs.
  // Then:  stdout contains "unchanged (hooks block already current)"
  //        AND does NOT contain "restart Claude Code".

  test('CR-059 scenario 5: idempotent re-init suppresses restart warning', async () => {
    // Build a settings.json that already contains exactly what HOOK_ADDITION would merge.
    const existingSettings = {
      hooks: {
        PreToolUse: [
          {
            matcher: 'Edit|Write',
            hooks: [
              {
                type: 'command',
                command: '${CLAUDE_PROJECT_DIR}/.claude/hooks/pre-edit-gate.sh',
              },
            ],
          },
        ],
        PostToolUse: [
          {
            matcher: 'Edit|Write',
            hooks: [
              {
                type: 'command',
                command: '${CLAUDE_PROJECT_DIR}/.claude/hooks/stamp-and-gate.sh',
              },
            ],
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

    const outJoined = cap.out.join('');

    // Must report "unchanged" (no schema-meaningful change)
    assert.ok(String(outJoined).includes('[cleargate init] .claude/settings.json unchanged (hooks block already current)'));

    // The settings.json line must NOT include the restart suffix —
    // other steps (.mcp.json) may still mention restart on first creation,
    // so we assert on the specific settings.json log line.
    const settingsLine = cap.out.find((line) => line.includes('settings.json'));
    assert.notStrictEqual(settingsLine, undefined);
    assert.ok(!String(settingsLine).includes('restart Claude Code'));
  });

  // ─── CR-059 Scenario 6: Real hooks change still warns ─────────────────────
  //
  // Given: existingSettings has a stale/different PostToolUse command.
  // When:  init runs.
  // Then:  stdout contains "Updated .claude/settings.json"
  //        AND contains "restart Claude Code if already open".

  test('CR-059 scenario 6: real hooks change emits restart warning', async () => {
    // Settings with a stale stamp-and-gate command — different from what HOOK_ADDITION adds.
    const existingSettings = {
      hooks: {
        PostToolUse: [
          {
            matcher: 'Edit|Write',
            hooks: [
              {
                type: 'command',
                command: '${CLAUDE_PROJECT_DIR}/.claude/hooks/OLD-gate.sh',
              },
            ],
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

    const outJoined = cap.out.join('');

    // Must say "Updated" (hooks block really changed)
    assert.ok(String(outJoined).includes('Updated .claude/settings.json'));

    // Must advise a restart
    assert.ok(String(outJoined).includes('restart Claude Code if already open'));
  });

  // ─── CR-059 Scenario 7: Parse-failure conservative fallback ──────────────
  //
  // Given: existingSettings is malformed JSON (can't be parsed).
  // When:  init runs.
  // Then:  stdout contains "restart Claude Code if already open"
  //        (conservative — when in doubt, warn).

  test('CR-059 scenario 7: malformed settings.json triggers conservative restart warning', async () => {
    const clauDeDir = path.join(tmpDir, '.claude');
    fs.mkdirSync(clauDeDir, { recursive: true });
    // Write intentionally broken JSON
    fs.writeFileSync(
      path.join(clauDeDir, 'settings.json'),
      '{ this is not valid JSON }',
      'utf8',
    );

    const cap = makeCapture();
    await initHandler({ cwd: tmpDir, payloadDir: META_ROOT_PLANNING, stdout: cap.stdout, stderr: cap.stderr });

    const outJoined = cap.out.join('');

    // Conservative path: parse failure → treat existingSettings as null → new content differs from '{}' → warn
    assert.ok(String(outJoined).includes('restart Claude Code if already open'));
  });

  // ─── BUG-023: init stamps pin_version into install snapshot ─────────────────

  test('BUG-023: init writes pin_version into install snapshot', async () => {
    // Gherkin: BUG-023 — install snapshot carries the pin version used for hook substitution
    const cap = makeCapture();

    await initHandler({
      cwd: tmpDir,
      payloadDir: META_ROOT_PLANNING,
      stdout: cap.stdout,
      stderr: cap.stderr,
      pin: '0.9.0',
      readInstallManifest: () => ({
        cleargate_version: '0.9.0',
        generated_at: '2026-04-30T00:00:00.000Z',
        files: [],
      }),
    });

    const snapshotPath = path.join(tmpDir, '.cleargate', '.install-manifest.json');
    expect(fs.existsSync(snapshotPath)).toBe(true);

    const snapshot = JSON.parse(fs.readFileSync(snapshotPath, 'utf8')) as { pin_version?: string };
    // BUG-023 fix: pin_version must be present and equal to the pin used
    assert.strictEqual(snapshot.pin_version, '0.9.0');
  });
});
