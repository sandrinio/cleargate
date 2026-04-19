/**
 * Tests for STORY-008-02: frontmatter-cache.ts
 * Covers: readCachedGate, writeCachedGate idempotency, key-order preservation.
 */
import { describe, it, expect, afterEach } from 'vitest';
import * as os from 'node:os';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { readCachedGate, writeCachedGate } from '../../src/lib/frontmatter-cache.js';
import type { CachedGate } from '../../src/lib/frontmatter-cache.js';

// ─── Fixture helpers ──────────────────────────────────────────────────────────

const tmpDirs: string[] = [];
const FIXED_NOW = new Date('2026-04-19T10:00:00.000Z');
const FIXED_NOW_FN = () => FIXED_NOW;

function makeTmpDir(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cg-fc-test-'));
  tmpDirs.push(dir);
  return dir;
}

afterEach(() => {
  for (const dir of tmpDirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

function writeMarkdown(filePath: string, content: string): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, 'utf8');
}

function readMarkdown(filePath: string): string {
  return fs.readFileSync(filePath, 'utf8');
}

// ─── readCachedGate tests ─────────────────────────────────────────────────────

describe('readCachedGate', () => {
  // Gherkin: "readCachedGate returns null when cached_gate_result absent"
  it('returns null when cached_gate_result absent', async () => {
    const dir = makeTmpDir();
    const file = path.join(dir, 'story.md');
    writeMarkdown(file, '---\nstory_id: "STORY-008-02"\nstatus: Draft\n---\n\nBody here.\n');

    const result = await readCachedGate(file);
    expect(result).toBeNull();
  });

  it('returns null when file does not exist', async () => {
    const result = await readCachedGate('/non/existent/file.md');
    expect(result).toBeNull();
  });

  it('returns null when frontmatter parse fails', async () => {
    const dir = makeTmpDir();
    const file = path.join(dir, 'bad.md');
    writeMarkdown(file, 'no frontmatter here\n');
    const result = await readCachedGate(file);
    expect(result).toBeNull();
  });

  it('reads back a cached_gate_result written by writeCachedGate', async () => {
    const dir = makeTmpDir();
    const file = path.join(dir, 'story.md');
    writeMarkdown(file, '---\nstory_id: "STORY-008-02"\n---\n\nBody.\n');

    const gate: CachedGate = {
      pass: true,
      failing_criteria: [],
      last_gate_check: '2026-04-19T10:00:00Z',
    };
    await writeCachedGate(file, gate, { now: FIXED_NOW_FN });
    const read = await readCachedGate(file);

    expect(read).not.toBeNull();
    expect(read!.pass).toBe(true);
    expect(read!.failing_criteria).toEqual([]);
    expect(read!.last_gate_check).toBe('2026-04-19T10:00:00Z');
  });

  it('reads back failing_criteria correctly', async () => {
    const dir = makeTmpDir();
    const file = path.join(dir, 'story.md');
    writeMarkdown(file, '---\nstory_id: "STORY-008-02"\n---\n\nBody.\n');

    const gate: CachedGate = {
      pass: false,
      failing_criteria: [
        { id: 'no-tbds', detail: "1 occurrence at §2" },
        { id: 'parent-epic-ref-set', detail: 'expected parent_epic_ref != null, got null' },
      ],
      last_gate_check: '2026-04-19T10:00:00Z',
    };
    await writeCachedGate(file, gate, { now: FIXED_NOW_FN });
    const read = await readCachedGate(file);

    expect(read!.pass).toBe(false);
    expect(read!.failing_criteria).toHaveLength(2);
    expect(read!.failing_criteria[0]!.id).toBe('no-tbds');
  });
});

// ─── writeCachedGate tests ────────────────────────────────────────────────────

describe('writeCachedGate', () => {
  // Gherkin: "frontmatter-cache idempotency"
  it('byte-identical rerun: write twice with same inputs → file bytes unchanged', async () => {
    const dir = makeTmpDir();
    const file = path.join(dir, 'story.md');
    writeMarkdown(file, '---\nstory_id: "STORY-008-02"\nstatus: Draft\n---\n\nBody.\n');

    const gate: CachedGate = {
      pass: false,
      failing_criteria: [{ id: 'no-tbds', detail: 'found TBD' }],
      last_gate_check: '2026-04-19T10:00:00Z',
    };

    // First write
    await writeCachedGate(file, gate, { now: FIXED_NOW_FN });
    const afterFirst = readMarkdown(file);

    // Second write with identical inputs
    await writeCachedGate(file, gate, { now: FIXED_NOW_FN });
    const afterSecond = readMarkdown(file);

    expect(afterFirst).toBe(afterSecond);
  });

  it('preserves existing frontmatter keys in original order', async () => {
    const dir = makeTmpDir();
    const file = path.join(dir, 'story.md');
    const original = '---\nstory_id: "STORY-008-02"\nstatus: Draft\nambiguity: Low\n---\n\nBody.\n';
    writeMarkdown(file, original);

    await writeCachedGate(file, {
      pass: true,
      failing_criteria: [],
      last_gate_check: '2026-04-19T10:00:00Z',
    }, { now: FIXED_NOW_FN });

    const written = readMarkdown(file);
    // story_id should appear before status should appear before ambiguity
    const storyIdx = written.indexOf('story_id:');
    const statusIdx = written.indexOf('status:');
    const ambiguityIdx = written.indexOf('ambiguity:');
    const cachedIdx = written.indexOf('cached_gate_result:');

    expect(storyIdx).toBeLessThan(statusIdx);
    expect(statusIdx).toBeLessThan(ambiguityIdx);
    expect(ambiguityIdx).toBeLessThan(cachedIdx);
  });

  it('updates cached_gate_result in-place when key already exists', async () => {
    const dir = makeTmpDir();
    const file = path.join(dir, 'story.md');
    writeMarkdown(file, '---\nstory_id: "STORY-008-02"\n---\n\nBody.\n');

    const gate1: CachedGate = {
      pass: false,
      failing_criteria: [{ id: 'no-tbds', detail: 'found TBD' }],
      last_gate_check: '2026-04-19T10:00:00Z',
    };
    await writeCachedGate(file, gate1, { now: FIXED_NOW_FN });

    const gate2: CachedGate = {
      pass: true,
      failing_criteria: [],
      last_gate_check: '2026-04-19T11:00:00Z',
    };
    await writeCachedGate(file, gate2, { now: FIXED_NOW_FN });

    const read = await readCachedGate(file);
    expect(read!.pass).toBe(true);
    expect(read!.last_gate_check).toBe('2026-04-19T11:00:00Z');
  });

  it('body is preserved verbatim after write', async () => {
    const dir = makeTmpDir();
    const file = path.join(dir, 'story.md');
    const body = '# My Story\n\n## Section 1\n\nContent here.\n\n## Section 2\n\n- item one\n- item two\n';
    writeMarkdown(file, `---\nstory_id: "STORY-008-02"\n---\n\n${body}`);

    await writeCachedGate(file, {
      pass: true,
      failing_criteria: [],
      last_gate_check: '2026-04-19T10:00:00Z',
    }, { now: FIXED_NOW_FN });

    const written = readMarkdown(file);
    expect(written).toContain('# My Story');
    expect(written).toContain('## Section 1');
    expect(written).toContain('- item one');
  });

  it('throws when file has no valid frontmatter', async () => {
    const dir = makeTmpDir();
    const file = path.join(dir, 'bad.md');
    writeMarkdown(file, 'no frontmatter here\n');

    await expect(writeCachedGate(file, {
      pass: true,
      failing_criteria: [],
      last_gate_check: '2026-04-19T10:00:00Z',
    })).rejects.toThrow('writeCachedGate: failed to parse frontmatter');
  });

  it('uses injected now for last_gate_check when not provided in result', async () => {
    const dir = makeTmpDir();
    const file = path.join(dir, 'story.md');
    writeMarkdown(file, '---\nstory_id: "STORY-008-02"\n---\n\nBody.\n');

    const fixedDate = new Date('2026-01-01T00:00:00.000Z');
    await writeCachedGate(file, {
      pass: true,
      failing_criteria: [],
      last_gate_check: '', // empty → use now()
    }, { now: () => fixedDate });

    const read = await readCachedGate(file);
    expect(read!.last_gate_check).toBe('2026-01-01T00:00:00Z');
  });
});
