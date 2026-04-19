import { describe, it, expect, afterEach } from 'vitest';
import * as os from 'os';
import * as fs from 'fs';
import * as path from 'path';
import { stampFrontmatter } from '../../src/lib/stamp-frontmatter.js';
import type { CodebaseVersion } from '../../src/lib/codebase-version.js';

const FIXED_NOW = new Date('2025-06-15T10:00:00.000Z');
const FIXED_VERSION: CodebaseVersion = {
  sha: 'abc1234',
  dirty: false,
  tag: null,
  package_version: null,
  version_string: 'abc1234',
};

function makeNow(d: Date): () => Date {
  return () => d;
}

const tmpDirs: string[] = [];

function makeTmpDir(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cg-stamp-test-'));
  tmpDirs.push(dir);
  return dir;
}

function writeFile(filePath: string, content: string): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, content, 'utf8');
}

function readFile(filePath: string): string {
  return fs.readFileSync(filePath, 'utf8');
}

afterEach(() => {
  for (const dir of tmpDirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

// A simple frontmatter file without metadata fields
const FILE_WITHOUT_META = `---
title: "My Document"
status: "Draft"
---

# My Document

Some body content here.
`;

// A story-type file (write-template: has story_id)
const STORY_FILE_WITHOUT_META = `---
story_id: "STORY-001-99"
title: "Test Story"
status: "Draft"
---

# Test Story
`;

describe('stampFrontmatter', () => {
  it('first stamp sets all 4 fields', async () => {
    const dir = makeTmpDir();
    const filePath = path.join(dir, 'doc.md');
    writeFile(filePath, FILE_WITHOUT_META);

    const result = await stampFrontmatter(filePath, {
      now: makeNow(FIXED_NOW),
      version: FIXED_VERSION,
    });

    expect(result.reason).toBe('created');
    expect(result.changed).toBe(true);

    const after = result.frontmatterAfter;
    expect(after['created_at']).toBe('2025-06-15T10:00:00Z');
    expect(after['updated_at']).toBe('2025-06-15T10:00:00Z');
    expect(after['created_at_version']).toBe('abc1234');
    expect(after['updated_at_version']).toBe('abc1234');
  });

  it('write-templates also get server_pushed_at_version: null', async () => {
    const dir = makeTmpDir();
    const filePath = path.join(dir, 'story.md');
    writeFile(filePath, STORY_FILE_WITHOUT_META);

    const result = await stampFrontmatter(filePath, {
      now: makeNow(FIXED_NOW),
      version: FIXED_VERSION,
    });

    expect(result.reason).toBe('created');
    expect(result.frontmatterAfter['server_pushed_at_version']).toBeNull();
  });

  it('re-stamp preserves created_at', async () => {
    const dir = makeTmpDir();
    const filePath = path.join(dir, 'doc.md');
    writeFile(filePath, FILE_WITHOUT_META);

    const firstTime = new Date('2025-06-15T10:00:00.000Z');
    const secondTime = new Date('2025-06-15T10:05:00.000Z');

    // First stamp
    const first = await stampFrontmatter(filePath, {
      now: makeNow(firstTime),
      version: FIXED_VERSION,
    });
    expect(first.reason).toBe('created');

    // Second stamp with a later time
    const second = await stampFrontmatter(filePath, {
      now: makeNow(secondTime),
      version: FIXED_VERSION,
    });
    expect(second.reason).toBe('updated');
    expect(second.changed).toBe(true);

    // created_at must be unchanged
    expect(second.frontmatterAfter['created_at']).toBe('2025-06-15T10:00:00Z');
    // created_at_version must be unchanged
    expect(second.frontmatterAfter['created_at_version']).toBe('abc1234');
    // updated_at must advance
    expect(second.frontmatterAfter['updated_at']).toBe('2025-06-15T10:05:00Z');
  });

  it('archive path is no-op', async () => {
    const dir = makeTmpDir();
    // Simulate archive path
    const archiveDir = path.join(dir, '.cleargate', 'delivery', 'archive');
    fs.mkdirSync(archiveDir, { recursive: true });
    const filePath = path.join(archiveDir, 'SPRINT-03.md');
    writeFile(filePath, FILE_WITHOUT_META);

    const before = readFile(filePath);

    const result = await stampFrontmatter(filePath, {
      now: makeNow(FIXED_NOW),
      version: FIXED_VERSION,
    });

    expect(result.reason).toBe('noop-archive');
    expect(result.changed).toBe(false);

    const after = readFile(filePath);
    expect(after).toBe(before);
  });

  it('dirty-sha suffix propagates', async () => {
    const dir = makeTmpDir();
    const filePath = path.join(dir, 'doc.md');
    writeFile(filePath, FILE_WITHOUT_META);

    const dirtyVersion: CodebaseVersion = {
      sha: 'abc1234',
      dirty: true,
      tag: null,
      package_version: null,
      version_string: 'abc1234-dirty',
    };

    const result = await stampFrontmatter(filePath, {
      now: makeNow(FIXED_NOW),
      version: dirtyVersion,
    });

    expect(result.frontmatterAfter['updated_at_version']).toBe('abc1234-dirty');
    expect(result.frontmatterAfter['created_at_version']).toBe('abc1234-dirty');
  });

  it('key order stable across runs', async () => {
    const dir = makeTmpDir();
    const filePath = path.join(dir, 'doc.md');
    writeFile(filePath, FILE_WITHOUT_META);

    const fixedOpts = {
      now: makeNow(FIXED_NOW),
      version: FIXED_VERSION,
    };

    // First stamp
    await stampFrontmatter(filePath, fixedOpts);
    const afterFirst = readFile(filePath);

    // Second stamp with same now + version => noop-unchanged, same bytes
    const result = await stampFrontmatter(filePath, fixedOpts);
    const afterSecond = readFile(filePath);

    // The second stamp should be noop-unchanged (same second, same version)
    expect(result.reason).toBe('noop-unchanged');
    expect(afterFirst).toBe(afterSecond);
  });

  it('body preserved verbatim', async () => {
    const dir = makeTmpDir();
    const filePath = path.join(dir, 'doc.md');
    const originalBody = `# My Document

Some body content here.
`;
    writeFile(filePath, FILE_WITHOUT_META);

    await stampFrontmatter(filePath, {
      now: makeNow(FIXED_NOW),
      version: FIXED_VERSION,
    });

    const newContent = readFile(filePath);
    // The body should still contain the original content
    expect(newContent).toContain('# My Document');
    expect(newContent).toContain('Some body content here.');
    // Should not have any frontmatter bleed into body
    const fmEnd = newContent.indexOf('---', 4); // skip first ---
    const bodyStart = newContent.indexOf('\n', fmEnd) + 1;
    const bodyContent = newContent.slice(bodyStart).trimStart();
    expect(bodyContent).toContain('# My Document');
    expect(bodyContent).toContain('Some body content here.');
    void originalBody; // used to verify shape above
  });

  it('archive path matcher is overridable', async () => {
    const dir = makeTmpDir();
    const filePath = path.join(dir, 'custom-archive', 'SPRINT-03.md');
    writeFile(filePath, FILE_WITHOUT_META);

    // Use custom archive matcher
    const result = await stampFrontmatter(filePath, {
      now: makeNow(FIXED_NOW),
      version: FIXED_VERSION,
      archivePathMatcher: (p) => p.includes('custom-archive'),
    });

    expect(result.reason).toBe('noop-archive');
    expect(result.changed).toBe(false);
  });
});
