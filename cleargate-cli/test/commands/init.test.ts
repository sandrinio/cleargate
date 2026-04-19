/**
 * init.test.ts — integration tests for `cleargate init` command
 *
 * All 7 scenarios from M4 blueprint.
 * Uses real fs with tmpdir — no mocks per project policy.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import * as url from 'node:url';
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
    expect(editWriteEntry.hooks[0].command).toContain('npx cleargate wiki ingest');

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
    expect(editWriteEntry.hooks[0].command).toContain('npx cleargate wiki ingest');
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
  });
});
