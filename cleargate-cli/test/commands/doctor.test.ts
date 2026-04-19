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
