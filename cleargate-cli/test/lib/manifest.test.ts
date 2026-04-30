/**
 * manifest.test.ts — STORY-009-01
 *
 * Tests every Gherkin scenario for the manifest.ts library.
 */

import { describe, it, expect, afterEach } from 'vitest';
import * as os from 'os';
import * as fs from 'fs';
import * as path from 'path';
import {
  loadPackageManifest,
  loadInstallSnapshot,
  computeCurrentSha,
  classify,
  writeDriftState,
  readDriftState,
  reverseSubstitutePinAware,
  type ManifestEntry,
  type ManifestFile,
  type DriftMap,
  type DriftStateFile,
  type Tier,
} from '../../src/lib/manifest.js';
import { hashNormalized } from '../../src/lib/sha256.js';

const tmpDirs: string[] = [];

function makeTmpDir(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cg-manifest-test-'));
  tmpDirs.push(dir);
  return dir;
}

function writeJson(filePath: string, data: unknown): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n', 'utf-8');
}

function makeFixtureManifest(overrides: Partial<ManifestFile> = {}): ManifestFile {
  return {
    cleargate_version: '0.1.0',
    generated_at: '2026-04-19T00:00:00Z',
    files: [],
    ...overrides,
  };
}

function makeEntry(overrides: Partial<ManifestEntry> = {}): ManifestEntry {
  return {
    path: '.cleargate/knowledge/cleargate-protocol.md',
    sha256: 'abc123',
    tier: 'protocol',
    overwrite_policy: 'merge-3way',
    preserve_on_uninstall: false,
    ...overrides,
  };
}

afterEach(() => {
  for (const dir of tmpDirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

// ─── loadPackageManifest ──────────────────────────────────────────────────────

describe('loadPackageManifest', () => {
  it('packageRoot seam — loads from fixture directory', () => {
    // Gherkin: loadPackageManifest: packageRoot seam
    const dir = makeTmpDir();
    const manifest = makeFixtureManifest({
      files: [makeEntry()],
    });
    writeJson(path.join(dir, 'MANIFEST.json'), manifest);

    const result = loadPackageManifest({ packageRoot: dir });
    expect(result.cleargate_version).toBe('0.1.0');
    expect(result.files).toHaveLength(1);
    expect(result.files[0].path).toBe('.cleargate/knowledge/cleargate-protocol.md');
  });

  it('throws a clear error when MANIFEST.json is absent', () => {
    const dir = makeTmpDir();
    // No MANIFEST.json written

    expect(() => loadPackageManifest({ packageRoot: dir })).toThrow(
      /MANIFEST\.json not found at.*run 'npm run build'/
    );
  });
});

// ─── loadInstallSnapshot ──────────────────────────────────────────────────────

describe('loadInstallSnapshot', () => {
  it('returns ManifestFile when .install-manifest.json exists', async () => {
    const dir = makeTmpDir();
    const manifest = makeFixtureManifest();
    writeJson(path.join(dir, '.cleargate', '.install-manifest.json'), manifest);

    const result = await loadInstallSnapshot(dir);
    expect(result).not.toBeNull();
    expect(result!.cleargate_version).toBe('0.1.0');
  });

  it('returns null when .install-manifest.json is absent', async () => {
    const dir = makeTmpDir();
    const result = await loadInstallSnapshot(dir);
    expect(result).toBeNull();
  });
});

// ─── computeCurrentSha ───────────────────────────────────────────────────────

describe('computeCurrentSha', () => {
  it('returns hash for an existing file', async () => {
    const dir = makeTmpDir();
    const content = 'hello\nworld\n';
    fs.writeFileSync(path.join(dir, 'file.txt'), content, 'utf-8');

    const entry = makeEntry({ path: 'file.txt' });
    const sha = await computeCurrentSha(entry, dir);

    expect(sha).toBe(hashNormalized(content));
    expect(sha).toHaveLength(64);
  });

  it('returns null when file does not exist', async () => {
    const dir = makeTmpDir();
    const entry = makeEntry({ path: 'nonexistent.md' });
    const sha = await computeCurrentSha(entry, dir);
    expect(sha).toBeNull();
  });
});

// ─── classify ────────────────────────────────────────────────────────────────

describe('classify', () => {
  it('clean — install == current == package', () => {
    // Gherkin: classify — clean
    expect(classify('abc', 'abc', 'abc', 'protocol')).toBe('clean');
  });

  it('user-modified — install == package, current != install', () => {
    // Gherkin: classify — user-modified
    expect(classify('abc', 'abc', 'xyz', 'protocol')).toBe('user-modified');
  });

  it('upstream-changed — install == current, package != install', () => {
    // Gherkin: classify — upstream-changed
    expect(classify('new', 'old', 'old', 'protocol')).toBe('upstream-changed');
  });

  it('both-changed — all three differ pairwise', () => {
    // Gherkin: classify — both-changed
    expect(classify('pkg', 'install', 'current', 'protocol')).toBe('both-changed');
  });

  it('user-artifact tier short-circuits to untracked regardless of SHAs', () => {
    // Gherkin: user-artifact tier skipped
    expect(classify('abc', 'abc', 'abc', 'user-artifact')).toBe('untracked');
    expect(classify('abc', 'abc', 'xyz', 'user-artifact')).toBe('untracked');
    expect(classify('pkg', 'install', 'current', 'user-artifact')).toBe('untracked');
  });

  it('missing file (current null) returns untracked', () => {
    // Gherkin: classify — missing file
    expect(classify('abc', 'abc', null, 'protocol')).toBe('untracked');
    expect(classify('abc', 'xyz', null, 'template')).toBe('untracked');
  });

  it('user-artifact with null sha returns untracked (canonical PROP-006 Q8 case)', () => {
    // ManifestEntry with sha256: null and tier: user-artifact
    expect(classify(null, null, null, 'user-artifact')).toBe('untracked');
    expect(classify(null, null, 'somesha', 'user-artifact')).toBe('untracked');
  });
});

// ─── writeDriftState ──────────────────────────────────────────────────────────

describe('writeDriftState', () => {
  it('writes .drift-state.json under <projectRoot>/.cleargate/ — wrapped format', async () => {
    const dir = makeTmpDir();
    const entry = makeEntry();
    const state: DriftMap = {
      [entry.path]: {
        state: 'clean',
        entry,
        install_sha: 'abc',
        current_sha: 'abc',
        package_sha: 'abc',
      },
    };

    await writeDriftState(dir, state, { lastRefreshed: '2026-04-19T00:00:00.000Z' });

    const driftPath = path.join(dir, '.cleargate', '.drift-state.json');
    expect(fs.existsSync(driftPath)).toBe(true);

    const parsed = JSON.parse(fs.readFileSync(driftPath, 'utf-8')) as DriftStateFile;
    expect(parsed.last_refreshed).toBe('2026-04-19T00:00:00.000Z');
    expect(parsed.drift[entry.path].state).toBe('clean');
  });

  it('atomic — .drift-state.json.tmp is absent after successful write', async () => {
    // Gherkin: writeDriftState is atomic
    const dir = makeTmpDir();
    const entry = makeEntry();
    const state: DriftMap = {
      [entry.path]: {
        state: 'user-modified',
        entry,
        install_sha: 'abc',
        current_sha: 'xyz',
        package_sha: 'abc',
      },
    };

    await writeDriftState(dir, state, { lastRefreshed: '2026-04-19T00:00:00.000Z' });

    const tmpPath = path.join(dir, '.cleargate', '.drift-state.json.tmp');
    // After success: .tmp must NOT exist (was renamed to final path)
    expect(fs.existsSync(tmpPath)).toBe(false);

    // Final path must exist with full content
    const driftPath = path.join(dir, '.cleargate', '.drift-state.json');
    expect(fs.existsSync(driftPath)).toBe(true);
  });

  it('creates .cleargate directory if it does not exist', async () => {
    const dir = makeTmpDir();
    // .cleargate does NOT exist yet
    expect(fs.existsSync(path.join(dir, '.cleargate'))).toBe(false);

    await writeDriftState(dir, {});

    expect(fs.existsSync(path.join(dir, '.cleargate'))).toBe(true);
    expect(fs.existsSync(path.join(dir, '.cleargate', '.drift-state.json'))).toBe(true);
  });

  it('overwrites an existing .drift-state.json atomically', async () => {
    const dir = makeTmpDir();
    const entry = makeEntry();

    const stateA: DriftMap = {
      [entry.path]: {
        state: 'clean',
        entry,
        install_sha: 'abc',
        current_sha: 'abc',
        package_sha: 'abc',
      },
    };
    await writeDriftState(dir, stateA, { lastRefreshed: '2026-04-19T00:00:00.000Z' });

    const stateB: DriftMap = {
      [entry.path]: {
        state: 'upstream-changed',
        entry,
        install_sha: 'abc',
        current_sha: 'abc',
        package_sha: 'new',
      },
    };
    await writeDriftState(dir, stateB, { lastRefreshed: '2026-04-19T01:00:00.000Z' });

    const driftPath = path.join(dir, '.cleargate', '.drift-state.json');
    const parsed = JSON.parse(fs.readFileSync(driftPath, 'utf-8')) as DriftStateFile;
    expect(parsed.drift[entry.path].state).toBe('upstream-changed');
    expect(parsed.last_refreshed).toBe('2026-04-19T01:00:00.000Z');
  });

  it('uses current time when lastRefreshed not provided', async () => {
    const dir = makeTmpDir();
    const before = Date.now();

    await writeDriftState(dir, {});

    const after = Date.now();
    const driftPath = path.join(dir, '.cleargate', '.drift-state.json');
    const parsed = JSON.parse(fs.readFileSync(driftPath, 'utf-8')) as DriftStateFile;
    const ts = new Date(parsed.last_refreshed).getTime();
    expect(ts).toBeGreaterThanOrEqual(before);
    expect(ts).toBeLessThanOrEqual(after);
  });
});

// ─── readDriftState ───────────────────────────────────────────────────────────

describe('readDriftState', () => {
  it('returns null when .drift-state.json is absent', async () => {
    const dir = makeTmpDir();
    const result = await readDriftState(dir);
    expect(result).toBeNull();
  });

  it('reads back the wrapped format written by writeDriftState', async () => {
    const dir = makeTmpDir();
    const entry = makeEntry();
    const state: DriftMap = {
      [entry.path]: {
        state: 'user-modified',
        entry,
        install_sha: 'aaa',
        current_sha: 'bbb',
        package_sha: 'aaa',
      },
    };
    await writeDriftState(dir, state, { lastRefreshed: '2026-04-19T12:00:00.000Z' });

    const result = await readDriftState(dir);
    expect(result).not.toBeNull();
    expect(result!.last_refreshed).toBe('2026-04-19T12:00:00.000Z');
    expect(result!.drift[entry.path].state).toBe('user-modified');
  });

  it('returns null for malformed / old flat-format file', async () => {
    const dir = makeTmpDir();
    fs.mkdirSync(path.join(dir, '.cleargate'), { recursive: true });
    // Write old flat-format (no last_refreshed / drift wrapper)
    fs.writeFileSync(
      path.join(dir, '.cleargate', '.drift-state.json'),
      JSON.stringify({ 'some/path': { state: 'clean' } }) + '\n',
      'utf-8'
    );
    const result = await readDriftState(dir);
    expect(result).toBeNull();
  });
});

// ─── BUG-023: reverseSubstitutePinAware ──────────────────────────────────────

describe('reverseSubstitutePinAware', () => {
  it('replaces pinVersion with __CLEARGATE_VERSION__ in a string', () => {
    // Gherkin: BUG-023 — basic reverse substitution
    const input = '#!/usr/bin/env bash\n# cleargate-pin: 0.9.0\nnpx -y "@cleargate/cli@0.9.0" doctor\n';
    const result = reverseSubstitutePinAware(input, '0.9.0');
    expect(result).toBe('#!/usr/bin/env bash\n# cleargate-pin: __CLEARGATE_VERSION__\nnpx -y "@cleargate/cli@__CLEARGATE_VERSION__" doctor\n');
  });

  it('is a no-op when pinVersion is not present in content', () => {
    // Gherkin: BUG-023 — no-op when placeholder absent
    const input = '#!/usr/bin/env bash\n# cleargate-pin: __CLEARGATE_VERSION__\n';
    const result = reverseSubstitutePinAware(input, '0.9.0');
    // 0.9.0 not present — output unchanged
    expect(result).toBe(input);
  });

  it('replaces all occurrences (multi-occurrence)', () => {
    // Gherkin: BUG-023 — multi-occurrence replacement
    const input = 'version=0.9.0 other=0.9.0 label=0.9.0';
    const result = reverseSubstitutePinAware(input, '0.9.0');
    expect(result).toBe('version=__CLEARGATE_VERSION__ other=__CLEARGATE_VERSION__ label=__CLEARGATE_VERSION__');
  });

  it('accepts Buffer input and converts to string before substitution', () => {
    // Gherkin: BUG-023 — Buffer input
    const text = '# cleargate-pin: 1.2.3\n';
    const result = reverseSubstitutePinAware(Buffer.from(text, 'utf-8'), '1.2.3');
    expect(result).toBe('# cleargate-pin: __CLEARGATE_VERSION__\n');
  });
});

// ─── BUG-023: computeCurrentSha with pin-aware entry ─────────────────────────

describe('computeCurrentSha — BUG-023 pin-aware reverse substitution', () => {
  it('produces same SHA as pkgSha when pinVersion provided for pin-aware file', async () => {
    // Gherkin: BUG-023 — freshly-installed pin-aware file is classified clean
    const dir = makeTmpDir();
    const pinVersion = '0.9.0';
    const placeholder = '__CLEARGATE_VERSION__';

    // Simulate package content (what MANIFEST.json sha256 was computed from):
    const packageContent = `#!/usr/bin/env bash\n# cleargate-pin: ${placeholder}\nnpx -y "@cleargate/cli@${placeholder}" doctor\n`;
    const pkgSha = hashNormalized(packageContent);

    // Simulate what copyPayload writes: version substituted
    const installedContent = packageContent.replaceAll(placeholder, pinVersion);
    const hookRelPath = '.claude/hooks/stamp-and-gate.sh';
    const hookAbsPath = path.join(dir, hookRelPath);
    fs.mkdirSync(path.dirname(hookAbsPath), { recursive: true });
    fs.writeFileSync(hookAbsPath, installedContent, 'utf-8');

    const entry = makeEntry({
      path: hookRelPath,
      sha256: pkgSha,
      overwrite_policy: 'pin-aware',
      tier: 'hook',
    });

    // Without pinVersion: SHA differs from pkgSha (the bug)
    const shaWithoutPin = await computeCurrentSha(entry, dir);
    expect(shaWithoutPin).not.toBe(pkgSha);

    // With pinVersion: SHA matches pkgSha (the fix)
    const shaWithPin = await computeCurrentSha(entry, dir, { pinVersion });
    expect(shaWithPin).toBe(pkgSha);
  });

  it('falls through to normal hashing for non-pin-aware files even when pinVersion provided', async () => {
    // Gherkin: BUG-023 — non-pin-aware files are unaffected
    const dir = makeTmpDir();
    const content = 'protocol content\n';
    fs.writeFileSync(path.join(dir, 'file.md'), content, 'utf-8');

    const entry = makeEntry({ path: 'file.md', overwrite_policy: 'merge-3way' });
    const sha = await computeCurrentSha(entry, dir, { pinVersion: '0.9.0' });
    expect(sha).toBe(hashNormalized(content));
  });

  it('falls through to normal hashing when pinVersion not provided (backwards-compat)', async () => {
    // Gherkin: BUG-023 — backwards compat: old snapshots without pin_version skip reverse-sub
    const dir = makeTmpDir();
    const content = 'some hook content\n';
    fs.writeFileSync(path.join(dir, 'hook.sh'), content, 'utf-8');

    const entry = makeEntry({ path: 'hook.sh', overwrite_policy: 'pin-aware', tier: 'hook' });
    const sha = await computeCurrentSha(entry, dir, { pinVersion: undefined });
    expect(sha).toBe(hashNormalized(content));
  });
});

// ─── BUG-023: regression — freshly-installed pin-aware file classified clean ──

describe('classify — BUG-023 regression: fresh install with pin_version is clean', () => {
  it('clean — install SHA == current SHA == package SHA for a pin-aware file after reverse-sub', () => {
    // Gherkin: BUG-023 regression — when currentSha has been reverse-substituted,
    // it should equal pkgSha and installSha → classify returns 'clean'.
    const pkgSha = hashNormalized('#!/usr/bin/env bash\n# cleargate-pin: __CLEARGATE_VERSION__\n');
    // After reverse substitution, currentSha == pkgSha == installSha → clean
    expect(classify(pkgSha, pkgSha, pkgSha, 'hook')).toBe('clean');
  });

  it('user-modified — without reverse-sub, pin-aware file appears user-modified (the original bug)', () => {
    // Gherkin: BUG-023 regression — demonstrates what happened before the fix.
    // pkgSha was computed from placeholder form; currentSha (without reverse-sub) differs → user-modified.
    const pkgSha = hashNormalized('#!/usr/bin/env bash\n# cleargate-pin: __CLEARGATE_VERSION__\n');
    const currentShaWithoutFix = hashNormalized('#!/usr/bin/env bash\n# cleargate-pin: 0.9.0\n');
    // They differ — which is the bug condition
    expect(pkgSha).not.toBe(currentShaWithoutFix);
    // classify would incorrectly return 'user-modified'
    expect(classify(pkgSha, pkgSha, currentShaWithoutFix, 'hook')).toBe('user-modified');
  });
});
