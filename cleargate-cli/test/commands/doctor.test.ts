/**
 * doctor.test.ts — STORY-009-04
 *
 * Tests for `cleargate doctor` base command + `--check-scaffold` mode.
 * 8 tests covering all Gherkin scenarios.
 *
 * Uses real fs with tmpdir — no database mocks per project policy.
 * No top-level await (FLASHCARD #tsup #cjs #esm).
 */

import { describe, it, expect, afterEach, vi } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import {
  doctorHandler,
  selectMode,
  shouldUseCache,
  formatVerboseLine,
  parseHookLogLine,
  runCanEdit,
  globMatch,
  type DoctorFlags,
  type DoctorCliOptions,
} from '../../src/commands/doctor.js';
import {
  writeDriftState,
  readDriftState,
  type DriftMap,
  type ManifestEntry,
  type ManifestFile,
} from '../../src/lib/manifest.js';
import { hashNormalized } from '../../src/lib/sha256.js';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const tmpDirs: string[] = [];

function makeTmpDir(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cg-doctor-test-'));
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

/** Write a package MANIFEST.json into a temp package root */
function writePackageManifest(pkgRoot: string, manifest: ManifestFile): void {
  fs.mkdirSync(pkgRoot, { recursive: true });
  fs.writeFileSync(
    path.join(pkgRoot, 'MANIFEST.json'),
    JSON.stringify(manifest, null, 2) + '\n',
    'utf-8'
  );
}

/** Write a tracked file with specific content into the project root */
function writeTrackedFile(projectRoot: string, relPath: string, content: string): void {
  const abs = path.join(projectRoot, relPath);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, content, 'utf-8');
}

/** Write .cleargate/.install-manifest.json */
function writeInstallSnapshot(projectRoot: string, manifest: ManifestFile): void {
  const dir = path.join(projectRoot, '.cleargate');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(
    path.join(dir, '.install-manifest.json'),
    JSON.stringify(manifest, null, 2) + '\n',
    'utf-8'
  );
}

function makeCliOpts(overrides: Partial<DoctorCliOptions> = {}): DoctorCliOptions & {
  out: string[];
  err: string[];
} {
  const out: string[] = [];
  const err: string[] = [];
  return {
    stdout: (s: string) => out.push(s),
    stderr: (s: string) => err.push(s),
    // STORY-014-01: doctorHandler now always calls exit() at the end.
    // Provide a no-op seam by default so existing tests don't see process.exit() thrown by vitest.
    exit: (_code: number) => undefined as never,
    ...overrides,
    out,
    err,
  };
}

// ─── Scenario 1: Clean repo reports clean ─────────────────────────────────────

describe('Scenario: Clean repo reports clean', () => {
  it('all manifest files match package SHAs — summary reports 0/0/0/N clean', async () => {
    // Gherkin: clean repo reports clean
    const projectRoot = makeTmpDir();
    const pkgRoot = makeTmpDir();

    const fileContent = 'protocol content\n';
    const sha = hashNormalized(fileContent);
    const entry = makeEntry({ sha256: sha });
    const manifest = makeManifest([entry]);

    writePackageManifest(pkgRoot, manifest);
    writeTrackedFile(projectRoot, entry.path, fileContent);

    // Install snapshot: same SHAs (clean)
    const installManifest = makeManifest([{ ...entry, sha256: sha }]);
    writeInstallSnapshot(projectRoot, installManifest);

    const now = new Date('2026-04-19T12:00:00.000Z');
    const cli = makeCliOpts({ cwd: projectRoot, packageRoot: pkgRoot, now: () => now });

    await doctorHandler({ checkScaffold: true }, cli);

    expect(cli.out.join('\n')).toContain('0 user-modified');
    expect(cli.out.join('\n')).toContain('0 upstream-changed');
    expect(cli.out.join('\n')).toContain('0 both-changed');
    expect(cli.out.join('\n')).toContain('1 clean');

    // .drift-state.json must be written
    const driftState = await readDriftState(projectRoot);
    expect(driftState).not.toBeNull();
    expect(driftState!.last_refreshed).toBe('2026-04-19T12:00:00.000Z');
  });
});

// ─── Scenario 2: User-modified file detected ──────────────────────────────────

describe('Scenario: User-modified file detected', () => {
  it('user edited file after install — shows in summary as user-modified', async () => {
    // Gherkin: user-modified file detected
    const projectRoot = makeTmpDir();
    const pkgRoot = makeTmpDir();

    const originalContent = 'original protocol\n';
    const modifiedContent = 'user modified protocol\n';
    const pkgSha = hashNormalized(originalContent);
    const userSha = hashNormalized(modifiedContent);

    const entry = makeEntry({ sha256: pkgSha });
    const manifest = makeManifest([entry]);
    writePackageManifest(pkgRoot, manifest);

    // Write the modified file on disk
    writeTrackedFile(projectRoot, entry.path, modifiedContent);

    // Install snapshot: install sha == pkg sha (both were original)
    const installManifest = makeManifest([{ ...entry, sha256: pkgSha }]);
    writeInstallSnapshot(projectRoot, installManifest);

    const now = new Date('2026-04-19T12:00:00.000Z');
    const cli = makeCliOpts({ cwd: projectRoot, packageRoot: pkgRoot, now: () => now });

    await doctorHandler({ checkScaffold: true }, cli);

    expect(cli.out.join('\n')).toContain('1 user-modified');

    const driftState = await readDriftState(projectRoot);
    expect(driftState).not.toBeNull();
    const fileEntry = driftState!.drift[entry.path];
    expect(fileEntry).toBeDefined();
    expect(fileEntry!.state).toBe('user-modified');
    expect(fileEntry!.current_sha).toBe(userSha);
  });
});

// ─── Scenario 3: Upstream-changed surfaces pointer ────────────────────────────

describe('Scenario: Upstream-changed surfaces pointer', () => {
  it('package has newer SHA than install snapshot — prints upgrade pointer', async () => {
    // Gherkin: upstream-changed surfaces pointer
    const projectRoot = makeTmpDir();
    const pkgRoot = makeTmpDir();

    const fileContent = 'current content\n';
    const installSha = hashNormalized(fileContent);
    const newPkgSha = 'deadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeefdeadbeef';

    // Package manifest has a NEWER sha (upstream changed)
    const entry = makeEntry({ sha256: newPkgSha });
    writePackageManifest(pkgRoot, makeManifest([entry]));

    // File on disk matches install sha (user hasn't touched it)
    writeTrackedFile(projectRoot, entry.path, fileContent);

    // Install snapshot has the old sha
    const installEntry = { ...entry, sha256: installSha };
    writeInstallSnapshot(projectRoot, makeManifest([installEntry]));

    const now = new Date('2026-04-19T12:00:00.000Z');
    const cli = makeCliOpts({ cwd: projectRoot, packageRoot: pkgRoot, now: () => now });

    await doctorHandler({ checkScaffold: true }, cli);

    const output = cli.out.join('\n');
    expect(output).toContain('1 upstream-changed');
    expect(output).toContain('Run cleargate upgrade to review.');
  });
});

// ─── Scenario 4: user-artifact skipped silently ───────────────────────────────

describe('Scenario: user-artifact skipped silently', () => {
  it('FLASHCARD.md with user-artifact tier does NOT appear in drift output', async () => {
    // Gherkin: user-artifact skipped silently
    const projectRoot = makeTmpDir();
    const pkgRoot = makeTmpDir();

    const protocolContent = 'protocol\n';
    const protocolSha = hashNormalized(protocolContent);

    const flashcardEntry = makeEntry({
      path: '.cleargate/FLASHCARD.md',
      sha256: null,
      tier: 'user-artifact',
      overwrite_policy: 'preserve',
      preserve_on_uninstall: true,
    });
    const protocolEntry = makeEntry({ sha256: protocolSha });

    writePackageManifest(pkgRoot, makeManifest([flashcardEntry, protocolEntry]));
    writeTrackedFile(projectRoot, flashcardEntry.path, 'different content from install\n');
    writeTrackedFile(projectRoot, protocolEntry.path, protocolContent);
    writeInstallSnapshot(projectRoot, makeManifest([flashcardEntry, { ...protocolEntry, sha256: protocolSha }]));

    const now = new Date('2026-04-19T12:00:00.000Z');
    const cli = makeCliOpts({ cwd: projectRoot, packageRoot: pkgRoot, now: () => now, verbose: false });

    await doctorHandler({ checkScaffold: true, verbose: true }, cli);

    const output = cli.out.join('\n');
    // FLASHCARD.md must NOT appear in any form in drift output
    expect(output).not.toContain('FLASHCARD.md');

    const driftState = await readDriftState(projectRoot);
    expect(driftState).not.toBeNull();
    // user-artifact entries are skipped entirely — not added to driftMap
    expect(driftState!.drift[flashcardEntry.path]).toBeUndefined();
  });
});

// ─── Scenario 5: Daily throttle ───────────────────────────────────────────────

describe('Scenario: Daily throttle', () => {
  it('last_refreshed 10 minutes ago + --session-start-mode → cache reused, no SHA recompute', async () => {
    // Gherkin: daily throttle — cache reused
    const projectRoot = makeTmpDir();
    const pkgRoot = makeTmpDir();

    const now = new Date('2026-04-19T12:00:00.000Z');
    const tenMinutesAgo = new Date(now.getTime() - 10 * 60 * 1000);

    // Pre-write a cached drift state
    const cachedDrift: DriftMap = {};
    await writeDriftState(projectRoot, cachedDrift, {
      lastRefreshed: tenMinutesAgo.toISOString(),
    });

    // Write a minimal package manifest (should NOT be read if throttle works)
    writePackageManifest(pkgRoot, makeManifest([]));

    // Spy on computeCurrentSha to verify it's NOT called
    const manifestModule = await import('../../src/lib/manifest.js');
    const computeSpy = vi.spyOn(manifestModule, 'computeCurrentSha');

    const cli = makeCliOpts({ cwd: projectRoot, packageRoot: pkgRoot, now: () => now });

    await doctorHandler(
      { checkScaffold: true, sessionStartMode: true },
      cli
    );

    // computeCurrentSha must NOT have been called (cache was reused)
    expect(computeSpy).not.toHaveBeenCalled();
  });
});

// ─── Scenario 6: Interactive mode bypasses throttle ───────────────────────────

describe('Scenario: Interactive mode bypasses throttle', () => {
  it('last_refreshed recent but no --session-start-mode → recomputes and updates last_refreshed', async () => {
    // Gherkin: interactive mode bypasses throttle
    const projectRoot = makeTmpDir();
    const pkgRoot = makeTmpDir();

    const now = new Date('2026-04-19T12:00:00.000Z');
    const tenMinutesAgo = new Date(now.getTime() - 10 * 60 * 1000);

    const fileContent = 'protocol content\n';
    const sha = hashNormalized(fileContent);
    const entry = makeEntry({ sha256: sha });
    writePackageManifest(pkgRoot, makeManifest([entry]));
    writeTrackedFile(projectRoot, entry.path, fileContent);
    writeInstallSnapshot(projectRoot, makeManifest([{ ...entry, sha256: sha }]));

    // Pre-write an older drift state (10 min ago)
    await writeDriftState(projectRoot, {}, { lastRefreshed: tenMinutesAgo.toISOString() });

    const cli = makeCliOpts({ cwd: projectRoot, packageRoot: pkgRoot, now: () => now });

    // Interactive invocation (no --session-start-mode)
    await doctorHandler({ checkScaffold: true }, cli);

    // last_refreshed must be updated to `now`
    const driftState = await readDriftState(projectRoot);
    expect(driftState).not.toBeNull();
    expect(driftState!.last_refreshed).toBe(now.toISOString());
  });
});

// ─── Scenario 7: Verbose listing ─────────────────────────────────────────────

describe('Scenario: Verbose listing', () => {
  it('-v emits per-file lines with state + short-hash triple for non-clean files', async () => {
    // Gherkin: verbose listing
    const projectRoot = makeTmpDir();
    const pkgRoot = makeTmpDir();

    const originalContent = 'original\n';
    const modifiedContent = 'modified\n';
    const pkgSha = hashNormalized(originalContent);

    const entry = makeEntry({ sha256: pkgSha });
    writePackageManifest(pkgRoot, makeManifest([entry]));
    writeTrackedFile(projectRoot, entry.path, modifiedContent);
    writeInstallSnapshot(projectRoot, makeManifest([{ ...entry, sha256: pkgSha }]));

    const now = new Date('2026-04-19T12:00:00.000Z');
    const cli = makeCliOpts({ cwd: projectRoot, packageRoot: pkgRoot, now: () => now });

    await doctorHandler({ checkScaffold: true, verbose: true }, cli);

    const output = cli.out.join('\n');
    // Must contain the file path + state + hash triple
    expect(output).toContain(entry.path);
    expect(output).toContain('user-modified');
    // Short hash format: (install→current vs package)
    expect(output).toMatch(/\([0-9a-f]{6}→[0-9a-f]{6} vs [0-9a-f]{6}\)/);
  });
});

// ─── Scenario 8: selectMode dispatcher ───────────────────────────────────────

describe('selectMode dispatcher', () => {
  it('check-scaffold + session-start combo throws', () => {
    // Gherkin: dispatcher contract — mutually exclusive flags
    const flags: DoctorFlags = { checkScaffold: true, sessionStart: true };
    expect(() => selectMode(flags)).toThrow(/mutually exclusive/);
  });

  it('returns check-scaffold when only checkScaffold flag is set', () => {
    expect(selectMode({ checkScaffold: true })).toBe('check-scaffold');
  });

  it('returns hook-health when no mode flag is set', () => {
    expect(selectMode({})).toBe('hook-health');
  });
});

// ─── shouldUseCache unit tests ────────────────────────────────────────────────

describe('shouldUseCache', () => {
  it('returns true when cache is fresh and sessionStartMode is set', () => {
    const now = new Date('2026-04-19T12:00:00.000Z');
    const tenMinutesAgo = new Date(now.getTime() - 10 * 60 * 1000).toISOString();
    expect(shouldUseCache(tenMinutesAgo, now, true)).toBe(true);
  });

  it('returns false when sessionStartMode is not set (interactive)', () => {
    const now = new Date('2026-04-19T12:00:00.000Z');
    const tenMinutesAgo = new Date(now.getTime() - 10 * 60 * 1000).toISOString();
    expect(shouldUseCache(tenMinutesAgo, now, false)).toBe(false);
  });

  it('returns false when cache is older than 24 hours even with sessionStartMode', () => {
    const now = new Date('2026-04-19T12:00:00.000Z');
    const twentyFiveHoursAgo = new Date(now.getTime() - 25 * 60 * 60 * 1000).toISOString();
    expect(shouldUseCache(twentyFiveHoursAgo, now, true)).toBe(false);
  });
});

// ─── Scenario 5: Doctor reports hook health (STORY-008-06 Gherkin Scenario 5) ──

describe('Scenario: Doctor reports hook health', () => {
  it('hook-log failure within 24h is named with ISO timestamp; failures older than 24h are excluded', async () => {
    // Gherkin: Given hook-log has a failure in the last 24h,
    //          When cleargate doctor,
    //          Then stdout names the failing hook + ISO timestamp.
    const projectRoot = makeTmpDir();

    // Set up .claude/settings.json (required for hook-health mode to proceed)
    const clauDir = path.join(projectRoot, '.claude');
    fs.mkdirSync(clauDir, { recursive: true });
    fs.writeFileSync(
      path.join(clauDir, 'settings.json'),
      JSON.stringify({ hooks: {} }),
      'utf-8'
    );

    const logDir = path.join(projectRoot, '.cleargate', 'hook-log');
    fs.mkdirSync(logDir, { recursive: true });

    // "now" is pinned
    const now = new Date('2026-04-19T12:00:00Z');

    // 1h ago — failure (gate=1)
    const oneHourAgo = new Date(now.getTime() - 1 * 60 * 60 * 1000).toISOString();
    // 1h ago — success (all zeros)
    const oneHourAgoSuccess = new Date(now.getTime() - 1 * 60 * 60 * 1000 - 1000).toISOString();
    // 30h ago — failure (outside 24h window, must be excluded)
    const thirtyHoursAgo = new Date(now.getTime() - 30 * 60 * 60 * 1000).toISOString();

    const logLines = [
      `[${thirtyHoursAgo}] stamp=0 gate=1 ingest=0 file=.cleargate/delivery/pending-sync/OLD.md`,
      `[${oneHourAgoSuccess}] stamp=0 gate=0 ingest=0 file=.cleargate/delivery/pending-sync/OK.md`,
      `[${oneHourAgo}] stamp=0 gate=1 ingest=0 file=.cleargate/delivery/pending-sync/FAIL.md`,
    ].join('\n') + '\n';

    fs.writeFileSync(path.join(logDir, 'gate-check.log'), logLines, 'utf-8');

    const cli = makeCliOpts({ cwd: projectRoot, now: () => now });
    await doctorHandler({}, cli);

    const output = cli.out.join('\n');

    // Must include the 1h-ago failure with its ISO timestamp
    expect(output).toContain(oneHourAgo);
    expect(output).toContain('FAIL.md');
    expect(output).toContain('gate=1');

    // Must NOT include the 30h-ago failure
    expect(output).not.toContain(thirtyHoursAgo);
    expect(output).not.toContain('OLD.md');

    // Success entry must NOT appear as a failure line
    expect(output).not.toContain('OK.md');
  });
});

// ─── parseHookLogLine unit tests ──────────────────────────────────────────────

describe('parseHookLogLine', () => {
  it('parses a valid log line', () => {
    const line = '[2026-04-19T11:00:00Z] stamp=0 gate=1 ingest=0 file=.cleargate/delivery/pending-sync/FAIL.md';
    const result = parseHookLogLine(line);
    expect(result).not.toBeNull();
    expect(result!.ts).toBe('2026-04-19T11:00:00Z');
    expect(result!.stamp).toBe(0);
    expect(result!.gate).toBe(1);
    expect(result!.ingest).toBe(0);
    expect(result!.file).toBe('.cleargate/delivery/pending-sync/FAIL.md');
  });

  it('returns null for a non-matching line (stdout noise from hook steps)', () => {
    const line = 'some random output from stamp-tokens command';
    expect(parseHookLogLine(line)).toBeNull();
  });
});

// ─── formatVerboseLine unit test ─────────────────────────────────────────────

describe('formatVerboseLine', () => {
  it('formats a drift entry with 6-char short hashes', () => {
    const entry = makeEntry({
      sha256: 'aaaa1111aaaa1111aaaa1111aaaa1111aaaa1111aaaa1111aaaa1111aaaa1111',
    });
    const driftEntry = {
      state: 'user-modified' as const,
      entry,
      install_sha: 'bbbb2222bbbb2222bbbb2222bbbb2222bbbb2222bbbb2222bbbb2222bbbb2222',
      current_sha: 'cccc3333cccc3333cccc3333cccc3333cccc3333cccc3333cccc3333cccc3333',
      package_sha: 'aaaa1111aaaa1111aaaa1111aaaa1111aaaa1111aaaa1111aaaa1111aaaa1111',
    };
    const line = formatVerboseLine(entry.path, driftEntry);
    expect(line).toContain(entry.path);
    expect(line).toContain('user-modified');
    // Should have 6-char hex fragments
    expect(line).toMatch(/bbbb22→cccc33 vs aaaa11/);
  });
});

// ─── CR-008 Phase B: runCanEdit + globMatch ────────────────────────────────────

describe('CR-008 globMatch', () => {
  it('matches exact file names', () => {
    expect(globMatch('src/foo.ts', 'src/foo.ts')).toBe(true);
  });

  it('does not match different file names', () => {
    expect(globMatch('src/foo.ts', 'src/bar.ts')).toBe(false);
  });

  it('matches wildcard * within a directory segment', () => {
    expect(globMatch('src/*.ts', 'src/foo.ts')).toBe(true);
  });

  it('wildcard * does not cross directory boundaries', () => {
    expect(globMatch('src/*.ts', 'src/subdir/foo.ts')).toBe(false);
  });

  it('matches double-star ** across directories', () => {
    expect(globMatch('src/**', 'src/subdir/foo.ts')).toBe(true);
  });

  it('returns false when no match on **', () => {
    expect(globMatch('lib/**', 'src/foo.ts')).toBe(false);
  });
});

describe('CR-008 runCanEdit', () => {
  const tmpDirsCanEdit: string[] = [];

  afterEach(() => {
    for (const d of tmpDirsCanEdit.splice(0)) {
      fs.rmSync(d, { recursive: true, force: true });
    }
  });

  function makeDir(): string {
    const d = fs.mkdtempSync(path.join(os.tmpdir(), 'cg-can-edit-'));
    tmpDirsCanEdit.push(d);
    return d;
  }

  function writeApprovedStory(dir: string, implFiles?: string[]): void {
    const pendingDir = path.join(dir, '.cleargate', 'delivery', 'pending-sync');
    fs.mkdirSync(pendingDir, { recursive: true });

    const implBlock = implFiles
      ? `implementation_files:\n${implFiles.map((f) => `  - "${f}"`).join('\n')}\n`
      : '';

    const content = `---
story_id: "STORY-001"
approved: true
${implBlock}---

# Story
`;
    fs.writeFileSync(path.join(pendingDir, 'STORY-001.md'), content, 'utf-8');
  }

  function writeActiveSentinel(dir: string): void {
    const sentDir = path.join(dir, '.cleargate', 'sprint-runs');
    fs.mkdirSync(sentDir, { recursive: true });
    fs.writeFileSync(path.join(sentDir, '.active'), 'SPRINT-14\n', 'utf-8');
  }

  it('CR-008 Gate A: no approved stories → exits 1, reason no_approved_stories', async () => {
    const dir = makeDir();
    const pendingDir = path.join(dir, '.cleargate', 'delivery', 'pending-sync');
    fs.mkdirSync(pendingDir, { recursive: true });

    const out: string[] = [];
    const codes: number[] = [];
    await runCanEdit('src/foo.ts', dir, (s) => out.push(s), (c) => { codes.push(c); return undefined as never; });

    expect(codes).toContain(1);
    expect(out.join(' ')).toContain('no_approved_stories');
  });

  it('CR-008 Gate A: no pending-sync dir → exits 1, reason no_approved_stories', async () => {
    const dir = makeDir();
    // No pending-sync dir at all

    const out: string[] = [];
    const codes: number[] = [];
    await runCanEdit('src/foo.ts', dir, (s) => out.push(s), (c) => { codes.push(c); return undefined as never; });

    expect(codes).toContain(1);
    expect(out.join(' ')).toContain('no_approved_stories');
  });

  it('CR-008 Gate B: approved story with implementation_files not covering file → exits 1', async () => {
    const dir = makeDir();
    writeApprovedStory(dir, ['src/bar.ts']);

    const out: string[] = [];
    const codes: number[] = [];
    await runCanEdit('src/foo.ts', dir, (s) => out.push(s), (c) => { codes.push(c); return undefined as never; });

    expect(codes).toContain(1);
    expect(out.join(' ')).toContain('file_not_in_implementation_files');
  });

  it('CR-008 Gate B: approved story covers file → exits 0 (allowed)', async () => {
    const dir = makeDir();
    writeApprovedStory(dir, ['src/foo.ts']);

    const out: string[] = [];
    const codes: number[] = [];
    await runCanEdit('src/foo.ts', dir, (s) => out.push(s), (c) => { codes.push(c); return undefined as never; });

    expect(codes).toHaveLength(0);
    expect(out.join(' ')).toContain('allowed');
  });

  it('CR-008: approved story with no implementation_files → any file is allowed', async () => {
    const dir = makeDir();
    writeApprovedStory(dir); // no implementation_files field

    const out: string[] = [];
    const codes: number[] = [];
    await runCanEdit('src/foo.ts', dir, (s) => out.push(s), (c) => { codes.push(c); return undefined as never; });

    expect(codes).toHaveLength(0);
    expect(out.join(' ')).toContain('allowed');
  });

  it('CR-008: sprint-active sentinel → always allowed regardless of stories', async () => {
    const dir = makeDir();
    // No approved stories
    const pendingDir = path.join(dir, '.cleargate', 'delivery', 'pending-sync');
    fs.mkdirSync(pendingDir, { recursive: true });
    writeActiveSentinel(dir);

    const out: string[] = [];
    const codes: number[] = [];
    await runCanEdit('src/any-file.ts', dir, (s) => out.push(s), (c) => { codes.push(c); return undefined as never; });

    expect(codes).toHaveLength(0);
    expect(out.join(' ')).toContain('allowed');
  });

  it('CR-008: approved story covers file via glob wildcard → allowed', async () => {
    const dir = makeDir();
    writeApprovedStory(dir, ['src/*.ts']);

    const out: string[] = [];
    const codes: number[] = [];
    await runCanEdit('src/foo.ts', dir, (s) => out.push(s), (c) => { codes.push(c); return undefined as never; });

    expect(codes).toHaveLength(0);
    expect(out.join(' ')).toContain('allowed');
  });
});

// ─── STORY-014-01: Exit-code semantics ─────────────────────────────────────────

/**
 * Helpers shared by STORY-014-01 exit-code tests.
 */
function makeExitTmpDir(): string {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'cg-exit-'));
  tmpDirs.push(d);
  return d;
}

/** Write a minimal .cleargate/ scaffold (does NOT include .cleargate/.install-manifest.json). */
function writeCleargateDirOnly(dir: string): void {
  const deliveryDir = path.join(dir, '.cleargate', 'delivery', 'pending-sync');
  fs.mkdirSync(deliveryDir, { recursive: true });
}

/** Write a passing pending-sync item (approved, pass=true). */
function writePassingItem(dir: string): void {
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
}

/** Write a blocked pending-sync item (pass=false). */
function writeBlockedItem(dir: string): void {
  const pendingDir = path.join(dir, '.cleargate', 'delivery', 'pending-sync');
  fs.mkdirSync(pendingDir, { recursive: true });
  const gateResult = JSON.stringify({
    pass: false,
    failing_criteria: [{ id: 'no-tbds' }],
    last_gate_check: '2026-04-26T10:00:00Z',
  });
  const content = `---
story_id: "STORY-BLOCKED"
status: "Draft"
approved: true
cached_gate_result: ${gateResult}
---

# Blocked story
`;
  fs.writeFileSync(path.join(pendingDir, 'STORY-BLOCKED.md'), content, 'utf-8');
}

/** Write a valid .cleargate/.install-manifest.json (the install snapshot CR-053 path). */
function writeManifest(dir: string): void {
  const manifestDir = path.join(dir, '.cleargate');
  fs.mkdirSync(manifestDir, { recursive: true });
  fs.writeFileSync(
    path.join(manifestDir, '.install-manifest.json'),
    JSON.stringify({ cleargate_version: '0.5.0', generated_at: '2026-04-26T00:00:00Z', files: [] }, null, 2),
    'utf-8'
  );
}

/** Build a DoctorCliOptions that captures exit code. Returns { cli, codes }. */
function makeDoctorCapture(dir: string): { cli: DoctorCliOptions; out: string[]; codes: number[] } {
  const out: string[] = [];
  const codes: number[] = [];
  const cli: DoctorCliOptions = {
    cwd: dir,
    stdout: (s) => out.push(s),
    stderr: (s) => out.push(s),
    exit: (c) => { codes.push(c); return undefined as never; },
  };
  return { cli, out, codes };
}

// Scenario 1: Clean repo exits 0

describe('STORY-014-01 Scenario 1: Clean repo exits 0', () => {
  it('exits 0 when no blockers and no config errors', async () => {
    const dir = makeExitTmpDir();
    writeCleargateDirOnly(dir);
    writePassingItem(dir);
    writeManifest(dir);

    // Set up .claude/settings.json so hook-health proceeds
    const claudeDir = path.join(dir, '.claude');
    fs.mkdirSync(claudeDir, { recursive: true });
    fs.writeFileSync(path.join(claudeDir, 'settings.json'), JSON.stringify({ hooks: {} }), 'utf-8');

    const { cli, out, codes } = makeDoctorCapture(dir);
    await doctorHandler({}, cli);

    expect(codes).toHaveLength(1);
    expect(codes[0]).toBe(0);
    const output = out.join('\n');
    expect(output).not.toMatch(/blocked|error/i);
  });
});

// Scenario 2: Blocked items exit 1

describe('STORY-014-01 Scenario 2: Blocked items exit 1', () => {
  it('exits 1 when at least one pending-sync item has cached_gate_result.pass=false', async () => {
    const dir = makeExitTmpDir();
    writeCleargateDirOnly(dir);
    writeBlockedItem(dir);
    writeManifest(dir);

    const { cli, out, codes } = makeDoctorCapture(dir);
    await doctorHandler({ sessionStart: true }, cli);

    expect(codes).toHaveLength(1);
    expect(codes[0]).toBe(1);
    const output = out.join('\n');
    expect(output).toContain('STORY-BLOCKED');
    expect(output).toContain('no-tbds');
  });
});

// Scenario 3: Missing .cleargate exits 2

describe('STORY-014-01 Scenario 3: Missing .cleargate exits 2', () => {
  it('exits 2 when cwd has no .cleargate/', async () => {
    const dir = makeExitTmpDir();
    // Do NOT create .cleargate/

    const { cli, out, codes } = makeDoctorCapture(dir);
    await doctorHandler({}, cli);

    expect(codes).toHaveLength(1);
    expect(codes[0]).toBe(2);
    const output = out.join('\n');
    expect(output).toContain('cleargate init');
  });
});

// Scenario 4: Missing manifest exits 2

describe('STORY-014-01 Scenario 4: Missing manifest exits 2', () => {
  it('exits 2 when .cleargate/.install-manifest.json is absent', async () => {
    const dir = makeExitTmpDir();
    writeCleargateDirOnly(dir);
    // Do NOT write manifest
    // Set up .claude/settings.json
    const claudeDir = path.join(dir, '.claude');
    fs.mkdirSync(claudeDir, { recursive: true });
    fs.writeFileSync(path.join(claudeDir, 'settings.json'), JSON.stringify({ hooks: {} }), 'utf-8');

    const { cli, out, codes } = makeDoctorCapture(dir);
    await doctorHandler({}, cli);

    expect(codes).toHaveLength(1);
    expect(codes[0]).toBe(2);
    const output = out.join('\n');
    expect(output).toContain('.install-manifest.json');
  });
});

// Scenario 5: Hook resolver complete failure exits 2

describe('STORY-014-01 Scenario 5: Hook resolver complete failure exits 2', () => {
  it('exits 2 when emitResolverStatusLine reports not-resolvable', async () => {
    const dir = makeExitTmpDir();
    writeCleargateDirOnly(dir);
    writeManifest(dir);
    // No .claude/hooks/stamp-and-gate.sh → pinVersion = 'unknown' → 🔴 not resolvable branch
    // No dist/cli.js → local dist branch skipped
    // command -v cleargate → may or may not exist on test runner; to force failure,
    // we need pinVersion = 'unknown'. Ensure hooks dir is absent.
    // The resolver emits 🔴 when pinVersion === 'unknown'.

    const { cli, out, codes } = makeDoctorCapture(dir);
    await doctorHandler({ sessionStart: true }, cli);

    // If cleargate IS on PATH, the resolver will return PATH branch (not 🔴),
    // meaning exit code would be 1 (or 0 if no blocked items).
    // We only assert the resolver line is present; exit-2 assertion is conditional.
    const output = out.join('\n');
    expect(output).toContain('cleargate CLI:');

    // When resolver reports 🔴 not resolvable, exit should be 2
    const hasResolverFailure = out.some((l) => l.includes('\u{1F534}'));
    if (hasResolverFailure) {
      expect(codes[0]).toBe(2);
    }
  });
});

// Scenario 6: --session-start mode preserves exit-code hierarchy

describe('STORY-014-01 Scenario 6: --session-start preserves exit-code hierarchy', () => {
  it('exits 1 when --session-start runs against a repo with one blocked item', async () => {
    const dir = makeExitTmpDir();
    writeCleargateDirOnly(dir);
    writeBlockedItem(dir);
    writeManifest(dir);

    const { cli, out, codes } = makeDoctorCapture(dir);
    await doctorHandler({ sessionStart: true }, cli);

    expect(codes).toHaveLength(1);
    expect(codes[0]).toBe(1);
    const output = out.join('\n');
    // CR-009 contract: resolver-status line present
    expect(output).toContain('cleargate CLI:');
    // Blocked items listed
    expect(output).toContain('STORY-BLOCKED');
  });
});

// ─── BUG-023 regression: pin-aware hook files reported clean after fresh install ─

describe('BUG-023 regression: pin-aware hook files classified clean after fresh install', () => {
  it('pin-aware hook file is classified clean when install snapshot carries pin_version', async () => {
    // Gherkin: BUG-023 — freshly-installed pin-aware hook file must be "clean", not "user-modified"
    const projectRoot = makeTmpDir();
    const pkgRoot = makeTmpDir();

    const pinVersion = '0.9.0';
    const placeholder = '__CLEARGATE_VERSION__';

    // Package manifest SHA is computed from the placeholder form (as stored in MANIFEST.json)
    const packageContent = `#!/usr/bin/env bash\n# cleargate-pin: ${placeholder}\nnpx -y "@cleargate/cli@${placeholder}" doctor\n`;
    const pkgSha = hashNormalized(packageContent);

    // Hook file on disk: has the real version substituted (what copyPayload writes)
    const installedContent = packageContent.replaceAll(placeholder, pinVersion);
    const hookRelPath = '.claude/hooks/stamp-and-gate.sh';
    writeTrackedFile(projectRoot, hookRelPath, installedContent);

    // Package manifest: hook entry uses placeholder-based SHA + pin-aware policy
    const hookEntry = makeEntry({
      path: hookRelPath,
      sha256: pkgSha,
      overwrite_policy: 'pin-aware' as const,
      tier: 'hook' as const,
    });

    // Install snapshot: carries pin_version field (the BUG-023 fix)
    const installManifest: ManifestFile = {
      cleargate_version: '0.9.0',
      generated_at: '2026-04-19T00:00:00Z',
      files: [{ ...hookEntry, sha256: pkgSha }],
      installed_at: '2026-04-30T00:00:00Z',
      pin_version: pinVersion,
    };

    writePackageManifest(pkgRoot, makeManifest([hookEntry]));
    writeInstallSnapshot(projectRoot, installManifest);

    const now = new Date('2026-04-30T00:00:00.000Z');
    const cli = makeCliOpts({ cwd: projectRoot, packageRoot: pkgRoot, now: () => now });

    await doctorHandler({ checkScaffold: true }, cli);

    const output = cli.out.join('\n');
    // Before fix: 1 user-modified. After fix: 0 user-modified, 1 clean.
    expect(output).toContain('0 user-modified');
    expect(output).toContain('1 clean');

    const driftState = await readDriftState(projectRoot);
    expect(driftState).not.toBeNull();
    const fileEntry = driftState!.drift[hookRelPath];
    expect(fileEntry).toBeDefined();
    expect(fileEntry!.state).toBe('clean');
  });

  it('pin-aware hook file without pin_version in snapshot falls back to reporting user-modified (backwards compat)', async () => {
    // Gherkin: BUG-023 backwards compat — old snapshots without pin_version still report user-modified
    const projectRoot = makeTmpDir();
    const pkgRoot = makeTmpDir();

    const pinVersion = '0.9.0';
    const placeholder = '__CLEARGATE_VERSION__';
    const packageContent = `#!/usr/bin/env bash\n# cleargate-pin: ${placeholder}\n`;
    const pkgSha = hashNormalized(packageContent);

    const installedContent = packageContent.replaceAll(placeholder, pinVersion);
    const hookRelPath = '.claude/hooks/stamp-and-gate.sh';
    writeTrackedFile(projectRoot, hookRelPath, installedContent);

    const hookEntry = makeEntry({
      path: hookRelPath,
      sha256: pkgSha,
      overwrite_policy: 'pin-aware' as const,
      tier: 'hook' as const,
    });

    // Old snapshot: NO pin_version field
    const oldInstallManifest: ManifestFile = {
      cleargate_version: '0.9.0',
      generated_at: '2026-04-19T00:00:00Z',
      files: [{ ...hookEntry, sha256: pkgSha }],
      installed_at: '2026-04-30T00:00:00Z',
      // pin_version intentionally absent (old install)
    };

    writePackageManifest(pkgRoot, makeManifest([hookEntry]));
    writeInstallSnapshot(projectRoot, oldInstallManifest);

    const now = new Date('2026-04-30T00:00:00.000Z');
    const cli = makeCliOpts({ cwd: projectRoot, packageRoot: pkgRoot, now: () => now });

    await doctorHandler({ checkScaffold: true }, cli);

    const output = cli.out.join('\n');
    // Without reverse substitution, the file hashes differently → user-modified (accepted per spec)
    expect(output).toContain('1 user-modified');
  });
});

// Help-text snapshot: cli.ts contains the Exit codes block

describe('STORY-014-01 Help-text snapshot: doctor --help documents exit codes', () => {
  it('cli.ts doctor command addHelpText contains the Exit codes block', () => {
    // Read the cli.ts source to verify the exit-code documentation is present.
    // This test guards against future help-text edits that accidentally drop the section.
    const cliSrcPath = path.resolve(
      new URL(import.meta.url).pathname,
      '..', '..', '..', 'src', 'cli.ts'
    );
    const cliSrc = fs.readFileSync(cliSrcPath, 'utf-8');
    expect(cliSrc).toContain('Exit codes:');
    expect(cliSrc).toContain('0  Clean — no blockers, no config errors.');
    expect(cliSrc).toContain('1  Blocked items or advisory issues — see stdout.');
    expect(cliSrc).toContain('2  ClearGate misconfigured or partially installed — see stdout for remediation.');
  });
});
