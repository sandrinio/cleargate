/**
 * generate-changelog-diff.test.ts — STORY-009-02
 *
 * Tests for scripts/generate-changelog-diff.ts
 * All tests use fixture manifests; no npm show calls are made.
 */

import { describe, it, expect } from 'vitest';
import { diffManifests, formatDiff } from '../../scripts/generate-changelog-diff.js';
import type { ManifestFile, ManifestEntry } from '../../src/lib/manifest.js';

// ─── Fixture helpers ──────────────────────────────────────────────────────────

function makeEntry(
  p: string,
  sha: string | null,
  overrides: Partial<ManifestEntry> = {}
): ManifestEntry {
  return {
    path: p,
    sha256: sha,
    tier: 'protocol',
    overwrite_policy: 'merge-3way',
    preserve_on_uninstall: false,
    ...overrides,
  };
}

function makeManifest(files: ManifestEntry[]): ManifestFile {
  return {
    cleargate_version: '0.1.0',
    generated_at: '2026-01-01T00:00:00.000Z',
    files,
  };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('generate-changelog-diff: diffManifests', () => {
  it('added/removed/changed enumerated', () => {
    const prev = makeManifest([
      makeEntry('file-A.md', 'aaaa0001'),
    ]);
    const current = makeManifest([
      makeEntry('file-A.md', 'bbbb0002'),   // changed (sha differs)
      makeEntry('file-B.md', 'cccc0003'),   // added
    ]);

    const diff = diffManifests(prev, current);
    expect(diff.added).toContain('file-B.md');
    expect(diff.changed).toContain('file-A.md');
    expect(diff.removed).toHaveLength(0);
  });

  it('removed file appears in removed list', () => {
    const prev = makeManifest([
      makeEntry('file-A.md', 'aaaa'),
      makeEntry('file-B.md', 'bbbb'),
    ]);
    const current = makeManifest([
      makeEntry('file-A.md', 'aaaa'),
    ]);

    const diff = diffManifests(prev, current);
    expect(diff.removed).toContain('file-B.md');
    expect(diff.added).toHaveLength(0);
    expect(diff.changed).toHaveLength(0);
  });

  it('moved collapses into Moved entry, not Added+Removed', () => {
    // File moved from path X to path Y with identical sha
    const prev = makeManifest([
      makeEntry('.claude/agents/old-agent.md', 'sha-abc123'),
    ]);
    const current = makeManifest([
      makeEntry('.claude/agents/new-agent.md', 'sha-abc123'),
    ]);

    const diff = diffManifests(prev, current);
    expect(diff.moved).toHaveLength(1);
    expect(diff.moved[0]).toBe('.claude/agents/old-agent.md → .claude/agents/new-agent.md');
    expect(diff.added).toHaveLength(0);
    expect(diff.removed).toHaveLength(0);
  });

  it('empty diff yields empty result', () => {
    const prev = makeManifest([
      makeEntry('file-A.md', 'sha-same'),
    ]);
    const current = makeManifest([
      makeEntry('file-A.md', 'sha-same'),
    ]);

    const diff = diffManifests(prev, current);
    expect(diff.added).toHaveLength(0);
    expect(diff.removed).toHaveLength(0);
    expect(diff.changed).toHaveLength(0);
    expect(diff.moved).toHaveLength(0);
  });

  it('null sha does not trigger Changed', () => {
    // user-artifact entries with null sha should not be flagged as changed
    const prev = makeManifest([
      makeEntry('.cleargate/FLASHCARD.md', null, { tier: 'user-artifact' }),
    ]);
    const current = makeManifest([
      makeEntry('.cleargate/FLASHCARD.md', null, { tier: 'user-artifact' }),
    ]);

    const diff = diffManifests(prev, current);
    expect(diff.changed).toHaveLength(0);
  });

  it('Changed: same path, different sha', () => {
    const prev = makeManifest([
      makeEntry('.cleargate/knowledge/cleargate-protocol.md', 'sha-abc'),
    ]);
    const current = makeManifest([
      makeEntry('.cleargate/knowledge/cleargate-protocol.md', 'sha-def'),
    ]);

    const diff = diffManifests(prev, current);
    expect(diff.changed).toContain('.cleargate/knowledge/cleargate-protocol.md');
  });
});

describe('generate-changelog-diff: formatDiff', () => {
  it('empty diff yields empty string', () => {
    const diff = { added: [], removed: [], changed: [], moved: [] };
    expect(formatDiff(diff)).toBe('');
  });

  it('stdout contains Changed: path', () => {
    const diff = {
      added: [],
      removed: [],
      changed: ['.cleargate/knowledge/cleargate-protocol.md'],
      moved: [],
    };
    const output = formatDiff(diff);
    expect(output).toContain('## Scaffold files changed');
    expect(output).toContain('Changed: .cleargate/knowledge/cleargate-protocol.md');
  });

  it('stdout shows Moved: A → B (not separate Added+Removed)', () => {
    const diff = {
      added: [],
      removed: [],
      changed: [],
      moved: ['.claude/agents/old.md → .claude/agents/new.md'],
    };
    const output = formatDiff(diff);
    expect(output).toContain('Moved: .claude/agents/old.md → .claude/agents/new.md');
    expect(output).not.toContain('Added:');
    expect(output).not.toContain('Removed:');
  });

  it('all change types formatted correctly', () => {
    const diff = {
      added: ['new-file.md'],
      removed: ['old-file.md'],
      changed: ['changed-file.md'],
      moved: ['from.md → to.md'],
    };
    const output = formatDiff(diff);
    expect(output).toContain('Added: new-file.md');
    expect(output).toContain('Removed: old-file.md');
    expect(output).toContain('Changed: changed-file.md');
    expect(output).toContain('Moved: from.md → to.md');
    expect(output).toContain('## Scaffold files changed');
  });
});
