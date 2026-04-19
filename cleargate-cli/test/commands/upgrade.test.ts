/**
 * upgrade.test.ts — STORY-009-05
 *
 * Tests for `cleargate upgrade` three-way merge driver.
 * Covers all 9 Gherkin scenarios + 4 unit scenarios.
 *
 * Uses real fs with tmpdir. Prompts + editor are injected via test seams.
 * No database; no network. No top-level await (FLASHCARD #tsup #cjs #esm).
 */

import { describe, it, expect, afterEach, vi } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { upgradeHandler, type UpgradeCliOptions } from '../../src/commands/upgrade.js';
import { renderInlineDiff } from '../../src/lib/merge-ui.js';
import { containsConflictMarkers } from '../../src/lib/editor.js';
import { hashNormalized } from '../../src/lib/sha256.js';
import type { ManifestFile, ManifestEntry } from '../../src/lib/manifest.js';
import type { MergeChoice as MC } from '../../src/lib/merge-ui.js';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const tmpDirs: string[] = [];

function makeTmpDir(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cg-upgrade-test-'));
  tmpDirs.push(dir);
  return dir;
}

afterEach(() => {
  for (const dir of tmpDirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
  vi.restoreAllMocks();
});

function makeEntry(overrides: Partial<ManifestEntry> = {}): ManifestEntry {
  return {
    path: '.cleargate/knowledge/cleargate-protocol.md',
    sha256: 'aaaa1111',
    tier: 'protocol',
    overwrite_policy: 'merge-3way',
    preserve_on_uninstall: false,
    ...overrides,
  };
}

function makeManifest(entries: ManifestEntry[]): ManifestFile {
  return {
    cleargate_version: '0.1.0',
    generated_at: '2026-04-19T00:00:00Z',
    files: entries,
  };
}

function writePackageManifest(pkgRoot: string, manifest: ManifestFile): void {
  fs.mkdirSync(pkgRoot, { recursive: true });
  fs.writeFileSync(path.join(pkgRoot, 'MANIFEST.json'), JSON.stringify(manifest, null, 2) + '\n');
}

function writeTrackedFile(root: string, relPath: string, content: string): void {
  const abs = path.join(root, relPath);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, content, 'utf-8');
}

function writeInstallSnapshot(projectRoot: string, manifest: ManifestFile): void {
  const dir = path.join(projectRoot, '.cleargate');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, '.install-manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
}

function readInstallSnapshot(projectRoot: string): ManifestFile {
  const raw = fs.readFileSync(path.join(projectRoot, '.cleargate', '.install-manifest.json'), 'utf-8');
  return JSON.parse(raw) as ManifestFile;
}

/** Build standard CLI options with captured stdout/stderr. */
function makeCliOpts(
  overrides: Partial<UpgradeCliOptions> = {}
): UpgradeCliOptions & { out: string[]; err: string[] } {
  const out: string[] = [];
  const err: string[] = [];
  return {
    stdout: (s: string) => out.push(s),
    stderr: (s: string) => err.push(s),
    now: () => new Date('2026-04-19T12:00:00.000Z'),
    ...overrides,
    out,
    err,
  } as UpgradeCliOptions & { out: string[]; err: string[] };
}

/** Create a promptMergeChoice stub that returns a fixed choice. */
function makePromptStub(choice: MC): UpgradeCliOptions['promptMergeChoice'] {
  return async (_opts) => choice;
}

/** Create an openInEditor stub that calls a callback then returns exitCode 0. */
function makeEditorStub(
  callback?: (filePath: string) => void
): UpgradeCliOptions['openInEditor'] {
  return async (filePath) => {
    if (callback) callback(filePath);
    return { exitCode: 0 };
  };
}

// ─── Scenario 1: Dry-run prints plan without changes ─────────────────────────

describe('Scenario: Dry-run prints plan without changes', () => {
  it('--dry-run lists proposed actions and leaves snapshot untouched', async () => {
    const projectRoot = makeTmpDir();
    const pkgRoot = makeTmpDir();

    // Create 3 drifted files: all merge-3way policy
    const pkgContent = 'package content\n';
    const pkgSha = hashNormalized(pkgContent);
    const installedContent = 'installed content\n';
    const installedSha = hashNormalized(installedContent);
    const currentContent = 'user-modified content\n';

    const entries: ManifestEntry[] = [
      makeEntry({ path: '.cleargate/knowledge/cleargate-protocol.md', sha256: pkgSha }),
      makeEntry({ path: '.cleargate/templates/story.md', sha256: pkgSha, tier: 'template' }),
      makeEntry({ path: '.claude/agents/developer.md', sha256: pkgSha, tier: 'agent' }),
    ];

    const pkgManifest = makeManifest(entries);
    writePackageManifest(pkgRoot, pkgManifest);

    // Write package files
    for (const e of entries) {
      writeTrackedFile(pkgRoot, e.path, pkgContent);
    }

    // Write current files (user-modified)
    for (const e of entries) {
      writeTrackedFile(projectRoot, e.path, currentContent);
    }

    // Install snapshot has a different SHA (upstream also changed → both-changed)
    const snapshotEntries = entries.map((e) => ({ ...e, sha256: installedSha }));
    writeInstallSnapshot(projectRoot, makeManifest(snapshotEntries));

    const snapshotBefore = fs.readFileSync(
      path.join(projectRoot, '.cleargate', '.install-manifest.json'),
      'utf-8'
    );

    const cli = makeCliOpts({ cwd: projectRoot, packageRoot: pkgRoot });

    await upgradeHandler({ dryRun: true }, cli);

    // stdout must mention 3 planned actions
    const output = cli.out.join('\n');
    expect(output).toContain('[dry-run]');
    // 3 file lines + summary line
    const dryRunLines = cli.out.filter((l) => l.includes('[dry-run]') && l.includes('action='));
    expect(dryRunLines.length).toBe(3);

    // No file on disk changes
    for (const e of entries) {
      const content = fs.readFileSync(path.join(projectRoot, e.path), 'utf-8');
      expect(content).toBe(currentContent);
    }

    // .install-manifest.json unchanged
    const snapshotAfter = fs.readFileSync(
      path.join(projectRoot, '.cleargate', '.install-manifest.json'),
      'utf-8'
    );
    expect(snapshotAfter).toBe(snapshotBefore);
  });
});

// ─── Scenario 2: Keep-mine on prompt-on-drift ────────────────────────────────

describe('Scenario: Keep-mine on prompt-on-drift', () => {
  it('user chooses k → file unchanged, snapshot.installed_sha = current_sha', async () => {
    const projectRoot = makeTmpDir();
    const pkgRoot = makeTmpDir();

    const pkgContent = 'package content\n';
    const pkgSha = hashNormalized(pkgContent);
    const installedContent = 'installed content\n';
    const installedSha = hashNormalized(installedContent);
    const currentContent = 'user modified content\n';
    const currentSha = hashNormalized(currentContent);

    const entry = makeEntry({ sha256: pkgSha });
    const pkgManifest = makeManifest([entry]);
    writePackageManifest(pkgRoot, pkgManifest);
    writeTrackedFile(pkgRoot, entry.path, pkgContent);
    writeTrackedFile(projectRoot, entry.path, currentContent);
    writeInstallSnapshot(projectRoot, makeManifest([{ ...entry, sha256: installedSha }]));

    const cli = makeCliOpts({
      cwd: projectRoot,
      packageRoot: pkgRoot,
      promptMergeChoice: makePromptStub('k'),
      openInEditor: makeEditorStub(),
    });

    await upgradeHandler({}, cli);

    // File must be unchanged
    const content = fs.readFileSync(path.join(projectRoot, entry.path), 'utf-8');
    expect(content).toBe(currentContent);

    // Snapshot installed_sha should now equal current_sha
    const snap = readInstallSnapshot(projectRoot);
    const snapEntry = snap.files.find((f) => f.path === entry.path);
    expect(snapEntry?.sha256).toBe(currentSha);
  });
});

// ─── Scenario 3: Take-theirs on prompt-on-drift ──────────────────────────────

describe('Scenario: Take-theirs on prompt-on-drift', () => {
  it('user chooses t → file = package content, snapshot.installed_sha = package_sha', async () => {
    const projectRoot = makeTmpDir();
    const pkgRoot = makeTmpDir();

    const pkgContent = 'upstream package content\n';
    const pkgSha = hashNormalized(pkgContent);
    const installedSha = hashNormalized('installed content\n');
    const currentContent = 'user modified content\n';

    const entry = makeEntry({ sha256: pkgSha });
    writePackageManifest(pkgRoot, makeManifest([entry]));
    writeTrackedFile(pkgRoot, entry.path, pkgContent);
    writeTrackedFile(projectRoot, entry.path, currentContent);
    writeInstallSnapshot(projectRoot, makeManifest([{ ...entry, sha256: installedSha }]));

    const cli = makeCliOpts({
      cwd: projectRoot,
      packageRoot: pkgRoot,
      promptMergeChoice: makePromptStub('t'),
      openInEditor: makeEditorStub(),
    });

    await upgradeHandler({}, cli);

    // File must now contain package content
    const content = fs.readFileSync(path.join(projectRoot, entry.path), 'utf-8');
    expect(content).toBe(pkgContent);

    // Snapshot sha must equal package sha
    const snap = readInstallSnapshot(projectRoot);
    const snapEntry = snap.files.find((f) => f.path === entry.path);
    expect(snapEntry?.sha256).toBe(pkgSha);
  });
});

// ─── Scenario 4: Edit-in-editor happy path ────────────────────────────────────

describe('Scenario: Edit-in-editor happy path', () => {
  it('markers resolved after edit → file updated, snapshot = post-edit sha', async () => {
    const projectRoot = makeTmpDir();
    const pkgRoot = makeTmpDir();

    const pkgContent = 'upstream content\n';
    const pkgSha = hashNormalized(pkgContent);
    const installedSha = hashNormalized('installed\n');
    const currentContent = 'my edits\n';
    const resolvedContent = 'manually resolved\n';

    const entry = makeEntry({ sha256: pkgSha });
    writePackageManifest(pkgRoot, makeManifest([entry]));
    writeTrackedFile(pkgRoot, entry.path, pkgContent);
    writeTrackedFile(projectRoot, entry.path, currentContent);
    writeInstallSnapshot(projectRoot, makeManifest([{ ...entry, sha256: installedSha }]));

    // Editor stub: writes resolved content to the merge file (no markers)
    const editorStub = makeEditorStub((mergeFilePath: string) => {
      fs.writeFileSync(mergeFilePath, resolvedContent, 'utf-8');
    });

    const cli = makeCliOpts({
      cwd: projectRoot,
      packageRoot: pkgRoot,
      promptMergeChoice: makePromptStub('e'),
      openInEditor: editorStub,
    });

    await upgradeHandler({}, cli);

    // Target file must contain resolved content
    const content = fs.readFileSync(path.join(projectRoot, entry.path), 'utf-8');
    expect(content).toBe(resolvedContent);

    // .cleargate-merge file must be cleaned up
    const mergeFile = path.join(projectRoot, entry.path) + '.cleargate-merge';
    expect(fs.existsSync(mergeFile)).toBe(false);

    // Snapshot sha = hash of resolved content
    const snap = readInstallSnapshot(projectRoot);
    const snapEntry = snap.files.find((f) => f.path === entry.path);
    expect(snapEntry?.sha256).toBe(hashNormalized(resolvedContent));
  });
});

// ─── Scenario 5: Edit-in-editor with unresolved markers ──────────────────────

describe('Scenario: Edit-in-editor with unresolved markers fails gracefully', () => {
  it('markers remain → error printed, .cleargate-merge persists, no snapshot update', async () => {
    const projectRoot = makeTmpDir();
    const pkgRoot = makeTmpDir();

    const pkgContent = 'upstream content\n';
    const pkgSha = hashNormalized(pkgContent);
    const installedSha = hashNormalized('installed\n');
    const currentContent = 'my edits\n';
    const originalSnapshotSha = installedSha;

    const entry = makeEntry({ sha256: pkgSha });
    writePackageManifest(pkgRoot, makeManifest([entry]));
    writeTrackedFile(pkgRoot, entry.path, pkgContent);
    writeTrackedFile(projectRoot, entry.path, currentContent);
    writeInstallSnapshot(projectRoot, makeManifest([{ ...entry, sha256: originalSnapshotSha }]));

    // Editor stub: does NOT resolve markers (leaves conflict file as-is)
    const editorStub = makeEditorStub(); // no callback → conflict file unchanged

    const cli = makeCliOpts({
      cwd: projectRoot,
      packageRoot: pkgRoot,
      promptMergeChoice: makePromptStub('e'),
      openInEditor: editorStub,
    });

    await upgradeHandler({}, cli);

    // .cleargate-merge must persist (contains conflict markers)
    const mergeFilePath = path.join(projectRoot, entry.path) + '.cleargate-merge';
    expect(fs.existsSync(mergeFilePath)).toBe(true);
    const mergeContent = fs.readFileSync(mergeFilePath, 'utf-8');
    expect(mergeContent).toContain('<<<<<<< ours');

    // Error must be reported
    expect(cli.err.some((l) => l.includes('unresolved conflict markers'))).toBe(true);

    // Snapshot NOT updated (still has originalSnapshotSha)
    const snap = readInstallSnapshot(projectRoot);
    const snapEntry = snap.files.find((f) => f.path === entry.path);
    expect(snapEntry?.sha256).toBe(originalSnapshotSha);

    // Target file unchanged
    const content = fs.readFileSync(path.join(projectRoot, entry.path), 'utf-8');
    expect(content).toBe(currentContent);
  });
});

// ─── Scenario 6: Incremental survival ────────────────────────────────────────

describe('Scenario: Incremental survival', () => {
  it('file 2 fails → file 1 persists, file 3 is still offered', async () => {
    const projectRoot = makeTmpDir();
    const pkgRoot = makeTmpDir();

    const pkgContent = 'upstream content\n';
    const pkgSha = hashNormalized(pkgContent);
    const currentContent = 'user content\n';
    const installedSha = hashNormalized('installed\n');

    // 3 merge-3way entries with deterministic alphabetical sort
    const entries: ManifestEntry[] = [
      makeEntry({ path: '.cleargate/agents/developer.md', sha256: pkgSha, tier: 'agent' }),
      makeEntry({ path: '.cleargate/knowledge/cleargate-protocol.md', sha256: pkgSha }),
      makeEntry({ path: '.cleargate/templates/story.md', sha256: pkgSha, tier: 'template' }),
    ];

    for (const e of entries) {
      writeTrackedFile(pkgRoot, e.path, pkgContent);
      writeTrackedFile(projectRoot, e.path, currentContent);
    }
    writePackageManifest(pkgRoot, makeManifest(entries));
    writeInstallSnapshot(projectRoot, makeManifest(entries.map((e) => ({ ...e, sha256: installedSha }))));

    let callCount = 0;
    // File 2 (index 1) uses 'e' with markers unresolved (fail); file 1 and 3 use 't'
    const promptStub: UpgradeCliOptions['promptMergeChoice'] = async (opts) => {
      callCount++;
      if (callCount === 2) {
        return 'e'; // will fail due to unresolved markers
      }
      return 't';
    };

    // Editor stub: for call 2, does NOT resolve markers
    const editorStub = makeEditorStub(); // leaves conflict markers in the file

    const cli = makeCliOpts({
      cwd: projectRoot,
      packageRoot: pkgRoot,
      promptMergeChoice: promptStub,
      openInEditor: editorStub,
    });

    await upgradeHandler({}, cli);

    // File 1 (path[0]) should be overwritten with package content (choice 't')
    const file1 = fs.readFileSync(path.join(projectRoot, entries[0]!.path), 'utf-8');
    expect(file1).toBe(pkgContent);

    // File 2 (path[1]) should be unchanged (edit failed due to markers)
    const file2 = fs.readFileSync(path.join(projectRoot, entries[1]!.path), 'utf-8');
    expect(file2).toBe(currentContent);

    // File 3 (path[2]) should be overwritten (choice 't')
    const file3 = fs.readFileSync(path.join(projectRoot, entries[2]!.path), 'utf-8');
    expect(file3).toBe(pkgContent);

    // promptMergeChoice should have been called 3 times (for all 3 files)
    expect(callCount).toBe(3);

    // Snapshot reflects file 1 and 3 but not file 2
    const snap = readInstallSnapshot(projectRoot);
    const snapEntries = new Map(snap.files.map((f) => [f.path, f.sha256]));
    expect(snapEntries.get(entries[0]!.path)).toBe(pkgSha); // file 1 updated
    expect(snapEntries.get(entries[1]!.path)).toBe(installedSha); // file 2 not updated
    expect(snapEntries.get(entries[2]!.path)).toBe(pkgSha); // file 3 updated
  });
});

// ─── Scenario 7: Always-policy silent overwrite ──────────────────────────────

describe('Scenario: Always-policy silent overwrite', () => {
  it('always-policy file is overwritten silently without prompt', async () => {
    const projectRoot = makeTmpDir();
    const pkgRoot = makeTmpDir();

    const pkgContent = 'derived package content\n';
    const pkgSha = hashNormalized(pkgContent);
    const currentContent = 'old derived content\n';

    const entry = makeEntry({
      path: '.cleargate/derived.md',
      sha256: pkgSha,
      tier: 'derived',
      overwrite_policy: 'always',
    });

    writePackageManifest(pkgRoot, makeManifest([entry]));
    writeTrackedFile(pkgRoot, entry.path, pkgContent);
    writeTrackedFile(projectRoot, entry.path, currentContent);
    writeInstallSnapshot(projectRoot, makeManifest([{ ...entry, sha256: hashNormalized(currentContent) }]));

    let promptCalled = false;
    const promptStub: UpgradeCliOptions['promptMergeChoice'] = async () => {
      promptCalled = true;
      return 'k';
    };

    const cli = makeCliOpts({
      cwd: projectRoot,
      packageRoot: pkgRoot,
      promptMergeChoice: promptStub,
      openInEditor: makeEditorStub(),
    });

    await upgradeHandler({}, cli);

    // File overwritten with package content
    const content = fs.readFileSync(path.join(projectRoot, entry.path), 'utf-8');
    expect(content).toBe(pkgContent);

    // No prompt shown
    expect(promptCalled).toBe(false);

    // stdout shows [always]
    expect(cli.out.some((l) => l.includes('[always]'))).toBe(true);
  });
});

// ─── Scenario 8: Never-policy silent skip ────────────────────────────────────

describe('Scenario: Never-policy silent skip', () => {
  it('never-policy file is untouched without prompt', async () => {
    const projectRoot = makeTmpDir();
    const pkgRoot = makeTmpDir();

    const pkgContent = 'user artifact\n';
    const pkgSha = hashNormalized(pkgContent);
    const currentContent = 'my custom content\n';

    const entry = makeEntry({
      path: '.cleargate/user-notes.md',
      sha256: pkgSha,
      tier: 'user-artifact',
      overwrite_policy: 'skip',
    });

    writePackageManifest(pkgRoot, makeManifest([entry]));
    writeTrackedFile(pkgRoot, entry.path, pkgContent);
    writeTrackedFile(projectRoot, entry.path, currentContent);
    writeInstallSnapshot(projectRoot, makeManifest([{ ...entry, sha256: pkgSha }]));

    let promptCalled = false;
    const promptStub: UpgradeCliOptions['promptMergeChoice'] = async () => {
      promptCalled = true;
      return 'k';
    };

    const cli = makeCliOpts({
      cwd: projectRoot,
      packageRoot: pkgRoot,
      promptMergeChoice: promptStub,
      openInEditor: makeEditorStub(),
    });

    await upgradeHandler({}, cli);

    // File unchanged
    const content = fs.readFileSync(path.join(projectRoot, entry.path), 'utf-8');
    expect(content).toBe(currentContent);

    // No prompt
    expect(promptCalled).toBe(false);
  });
});

// ─── Scenario 9: --yes auto-takes-theirs ─────────────────────────────────────

describe('Scenario: --yes auto-takes-theirs', () => {
  it('--yes auto-takes-theirs for all merge-3way files without prompting', async () => {
    const projectRoot = makeTmpDir();
    const pkgRoot = makeTmpDir();

    const pkgContent = 'upstream content\n';
    const pkgSha = hashNormalized(pkgContent);
    const installedSha = hashNormalized('installed\n');
    const currentContent = 'user content\n';

    const entries: ManifestEntry[] = [
      makeEntry({ path: '.cleargate/agents/developer.md', sha256: pkgSha, tier: 'agent' }),
      makeEntry({ path: '.cleargate/knowledge/cleargate-protocol.md', sha256: pkgSha }),
    ];

    for (const e of entries) {
      writeTrackedFile(pkgRoot, e.path, pkgContent);
      writeTrackedFile(projectRoot, e.path, currentContent);
    }
    writePackageManifest(pkgRoot, makeManifest(entries));
    writeInstallSnapshot(projectRoot, makeManifest(entries.map((e) => ({ ...e, sha256: installedSha }))));

    let promptCalled = false;
    const promptStub: UpgradeCliOptions['promptMergeChoice'] = async () => {
      promptCalled = true;
      return 'k';
    };

    const cli = makeCliOpts({
      cwd: projectRoot,
      packageRoot: pkgRoot,
      promptMergeChoice: promptStub,
      openInEditor: makeEditorStub(),
    });

    await upgradeHandler({ yes: true }, cli);

    // All files overwritten with package content
    for (const e of entries) {
      const content = fs.readFileSync(path.join(projectRoot, e.path), 'utf-8');
      expect(content).toBe(pkgContent);
    }

    // No interactive prompt
    expect(promptCalled).toBe(false);

    // stdout shows [yes] prefix
    expect(cli.out.some((l) => l.includes('[yes]'))).toBe(true);
  });
});

// ─── Unit: renderInlineDiff ───────────────────────────────────────────────────

describe('Unit: renderInlineDiff', () => {
  it('produces a unified diff with installed/upstream labels', () => {
    const ours = 'line one\nline two\n';
    const theirs = 'line one\nline THREE\n';
    const patch = renderInlineDiff(ours, theirs, 'test.md');
    expect(patch).toContain('--- test.md');
    expect(patch).toContain('+++ test.md');
    expect(patch).toContain('-line two');
    expect(patch).toContain('+line THREE');
    expect(patch).toContain('installed');
    expect(patch).toContain('upstream');
  });
});

// ─── Unit: containsConflictMarkers ───────────────────────────────────────────

describe('Unit: containsConflictMarkers', () => {
  it('detects conflict markers in content', () => {
    const withMarkers = '<<<<<<< ours (installed)\nours\n=======\ntheirs\n>>>>>>> theirs (upstream)\n';
    expect(containsConflictMarkers(withMarkers)).toBe(true);
  });

  it('returns false for resolved content', () => {
    const resolved = 'cleanly resolved content\n';
    expect(containsConflictMarkers(resolved)).toBe(false);
  });
});

// ─── Unit: snapshot-update atomicity ─────────────────────────────────────────

describe('Unit: snapshot-update atomicity', () => {
  it('snapshot update writes a valid JSON file and no partial state survives', async () => {
    const projectRoot = makeTmpDir();
    const pkgRoot = makeTmpDir();

    const pkgContent = 'content\n';
    const pkgSha = hashNormalized(pkgContent);
    const installedSha = hashNormalized('installed\n');

    const entry = makeEntry({ sha256: pkgSha });
    writePackageManifest(pkgRoot, makeManifest([entry]));
    writeTrackedFile(pkgRoot, entry.path, pkgContent);
    writeTrackedFile(projectRoot, entry.path, 'user content\n');
    writeInstallSnapshot(projectRoot, makeManifest([{ ...entry, sha256: installedSha }]));

    const cli = makeCliOpts({
      cwd: projectRoot,
      packageRoot: pkgRoot,
      promptMergeChoice: makePromptStub('t'),
      openInEditor: makeEditorStub(),
    });

    await upgradeHandler({}, cli);

    // Snapshot must be valid JSON after upgrade
    const rawSnap = fs.readFileSync(
      path.join(projectRoot, '.cleargate', '.install-manifest.json'),
      'utf-8'
    );
    expect(() => JSON.parse(rawSnap)).not.toThrow();
    const snap = JSON.parse(rawSnap) as ManifestFile;
    const snapEntry = snap.files.find((f) => f.path === entry.path);
    expect(snapEntry?.sha256).toBe(pkgSha);

    // No .tmp files should remain
    const dir = path.join(projectRoot, '.cleargate');
    const tmpFiles = fs.readdirSync(dir).filter((f) => f.includes('.tmp.'));
    expect(tmpFiles).toHaveLength(0);
  });
});

// ─── Unit: --only <tier> filter ──────────────────────────────────────────────

describe('Unit: --only <tier> filter', () => {
  it('--only protocol only processes protocol-tier files', async () => {
    const projectRoot = makeTmpDir();
    const pkgRoot = makeTmpDir();

    const pkgContent = 'upstream\n';
    const pkgSha = hashNormalized(pkgContent);
    const installedSha = hashNormalized('installed\n');
    const currentContent = 'user\n';

    const entries: ManifestEntry[] = [
      makeEntry({ path: '.cleargate/knowledge/cleargate-protocol.md', sha256: pkgSha, tier: 'protocol' }),
      makeEntry({ path: '.cleargate/templates/story.md', sha256: pkgSha, tier: 'template' }),
    ];

    for (const e of entries) {
      writeTrackedFile(pkgRoot, e.path, pkgContent);
      writeTrackedFile(projectRoot, e.path, currentContent);
    }
    writePackageManifest(pkgRoot, makeManifest(entries));
    writeInstallSnapshot(projectRoot, makeManifest(entries.map((e) => ({ ...e, sha256: installedSha }))));

    let promptPaths: string[] = [];
    const promptStub: UpgradeCliOptions['promptMergeChoice'] = async (opts) => {
      promptPaths.push(opts.path);
      return 't';
    };

    const cli = makeCliOpts({
      cwd: projectRoot,
      packageRoot: pkgRoot,
      promptMergeChoice: promptStub,
      openInEditor: makeEditorStub(),
    });

    await upgradeHandler({ only: 'protocol' }, cli);

    // Only the protocol-tier file should have been prompted
    expect(promptPaths).toHaveLength(1);
    expect(promptPaths[0]).toBe('.cleargate/knowledge/cleargate-protocol.md');

    // Template file should be unchanged
    const templateContent = fs.readFileSync(path.join(projectRoot, entries[1]!.path), 'utf-8');
    expect(templateContent).toBe(currentContent);
  });
});
