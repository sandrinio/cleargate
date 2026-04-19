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
