/**
 * upgrade-changelog.test.ts — STORY-016-04
 *
 * Integration tests for `cleargate upgrade` CHANGELOG delta printing.
 * Covers the Gherkin scenarios from story §2.1 that require the full
 * upgradeHandler to be invoked.
 *
 * All tests use injected test seams (packageRoot, cwd, stdout/stderr).
 * No real upgrade merge is run — dry-run mode only.
 */

import { describe, it, expect, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { upgradeHandler, type UpgradeCliOptions } from '../../src/commands/upgrade.js';
import type { ManifestFile, ManifestEntry } from '../../src/lib/manifest.js';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const tmpDirs: string[] = [];

function makeTmpDir(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cg-cl-upgrade-test-'));
  tmpDirs.push(dir);
  return dir;
}

afterEach(() => {
  for (const dir of tmpDirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

/**
 * Minimal Common-Changelog content with sections for:
 * 0.8.2, 0.8.1, 0.8.0, 0.7.0, 0.6.0, 0.5.0
 */
const FIXTURE_CHANGELOG = `# Changelog

All notable changes to this project are documented in this file.
Format: [Common Changelog](https://common-changelog.org/) — most-recent version first.

## [0.8.2] — 2026-04-27

### Fixed
- Strip internal cross-reference comments (BUG-020).

---

## [0.8.1] — 2026-04-27

### Fixed
- .mcp.json now uses npx -y cleargate@<pin> (BUG-019 follow-up).

---

## [0.8.0] — 2026-04-27

### Added
- cleargate mcp serve command (BUG-019).

---

## [0.7.0] — 2026-04-27

### Added
- cleargate init writes .mcp.json (BUG-017).

### Fixed
- cleargate init preserves +x bit (BUG-018).

---

## [0.6.0] — 2026-04-27

### Added
- cleargate hotfix new command.

---

## [0.5.0] — 2026-04-26

### Fixed
- Init scaffold hooks resolve cleargate via PATH (BUG-006).
`;

function makeManifest(version: string, files: ManifestEntry[] = []): ManifestFile {
  return {
    cleargate_version: version,
    generated_at: '2026-04-27T00:00:00Z',
    files,
  };
}

/**
 * Write MANIFEST.json (package manifest) and optionally CHANGELOG.md to pkgRoot.
 */
function setupPkgRoot(pkgRoot: string, targetVersion: string, changelog?: string): void {
  fs.mkdirSync(pkgRoot, { recursive: true });
  fs.writeFileSync(
    path.join(pkgRoot, 'MANIFEST.json'),
    JSON.stringify(makeManifest(targetVersion), null, 2) + '\n'
  );
  if (changelog !== undefined) {
    fs.writeFileSync(path.join(pkgRoot, 'CHANGELOG.md'), changelog, 'utf-8');
  }
}

/**
 * Write install snapshot (.cleargate/.install-manifest.json) in the project dir.
 */
function writeInstallSnapshot(projectRoot: string, installedVersion: string): void {
  const dir = path.join(projectRoot, '.cleargate');
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(
    path.join(dir, '.install-manifest.json'),
    JSON.stringify(makeManifest(installedVersion), null, 2) + '\n'
  );
}

function makeCliOpts(
  overrides: Partial<UpgradeCliOptions> = {}
): UpgradeCliOptions & { out: string[]; err: string[] } {
  const out: string[] = [];
  const err: string[] = [];
  return {
    stdout: (s: string) => out.push(s),
    stderr: (s: string) => err.push(s),
    now: () => new Date('2026-04-27T12:00:00.000Z'),
    // Suppress interactive prompts in dry-run
    promptMergeChoice: async () => 'k',
    ...overrides,
    out,
    err,
  } as unknown as UpgradeCliOptions & { out: string[]; err: string[] };
}

// ─── Gherkin Scenario: Delta covers intermediate versions ─────────────────────

describe('Scenario: Delta covers intermediate versions (installed=0.6.0, target=0.8.2)', () => {
  it('stdout includes 0.8.2, 0.8.1, 0.8.0, 0.7.0 sections in order', async () => {
    const projectRoot = makeTmpDir();
    const pkgRoot = makeTmpDir();

    setupPkgRoot(pkgRoot, '0.8.2', FIXTURE_CHANGELOG);
    writeInstallSnapshot(projectRoot, '0.6.0');

    const cli = makeCliOpts({ cwd: projectRoot, packageRoot: pkgRoot });
    await upgradeHandler({ dryRun: true }, cli);

    const allOutput = cli.out.join('\n');

    // Should include sections for all intermediate versions
    expect(allOutput).toContain('## [0.8.2]');
    expect(allOutput).toContain('## [0.8.1]');
    expect(allOutput).toContain('## [0.8.0]');
    expect(allOutput).toContain('## [0.7.0]');
  });

  it('stdout does NOT include 0.6.0 or 0.5.0 sections', async () => {
    const projectRoot = makeTmpDir();
    const pkgRoot = makeTmpDir();

    setupPkgRoot(pkgRoot, '0.8.2', FIXTURE_CHANGELOG);
    writeInstallSnapshot(projectRoot, '0.6.0');

    const cli = makeCliOpts({ cwd: projectRoot, packageRoot: pkgRoot });
    await upgradeHandler({ dryRun: true }, cli);

    const allOutput = cli.out.join('\n');

    // fromExclusive=0.6.0 means 0.6.0 itself should NOT be in the delta
    expect(allOutput).not.toContain('## [0.6.0]');
    expect(allOutput).not.toContain('## [0.5.0]');
  });

  it('delta appears before the dry-run plan (--- divider then [dry-run] lines)', async () => {
    const projectRoot = makeTmpDir();
    const pkgRoot = makeTmpDir();

    setupPkgRoot(pkgRoot, '0.8.2', FIXTURE_CHANGELOG);
    writeInstallSnapshot(projectRoot, '0.6.0');

    const cli = makeCliOpts({ cwd: projectRoot, packageRoot: pkgRoot });
    await upgradeHandler({ dryRun: true }, cli);

    const allOutput = cli.out.join('\n');

    // The divider should appear before dry-run output
    const dividerIdx = allOutput.indexOf('---');
    const dryRunIdx = allOutput.indexOf('[dry-run]');

    // There should be a divider
    expect(dividerIdx).toBeGreaterThan(-1);
    // The dry-run lines should appear after the divider
    if (dryRunIdx !== -1) {
      expect(dividerIdx).toBeLessThan(dryRunIdx);
    }
  });
});

// ─── Gherkin Scenario: Same version skips delta ───────────────────────────────

describe('Scenario: Same version skips delta (installed=0.8.2, target=0.8.2)', () => {
  it('stdout does NOT include any "## [" CHANGELOG heading', async () => {
    const projectRoot = makeTmpDir();
    const pkgRoot = makeTmpDir();

    setupPkgRoot(pkgRoot, '0.8.2', FIXTURE_CHANGELOG);
    writeInstallSnapshot(projectRoot, '0.8.2');

    const cli = makeCliOpts({ cwd: projectRoot, packageRoot: pkgRoot });
    await upgradeHandler({ dryRun: true }, cli);

    const allOutput = cli.out.join('\n');

    // No changelog headings should appear
    expect(allOutput).not.toContain('## [');
  });

  it('upgrade proceeds to show dry-run plan or "nothing to do"', async () => {
    const projectRoot = makeTmpDir();
    const pkgRoot = makeTmpDir();

    setupPkgRoot(pkgRoot, '0.8.2', FIXTURE_CHANGELOG);
    writeInstallSnapshot(projectRoot, '0.8.2');

    const cli = makeCliOpts({ cwd: projectRoot, packageRoot: pkgRoot });
    await upgradeHandler({ dryRun: true }, cli);

    // Should complete without error (dry-run summary or 0 files)
    expect(cli.err.join('\n')).not.toContain('[upgrade]');
  });
});

// ─── Gherkin Scenario: Missing CHANGELOG warns and continues ─────────────────

describe('Scenario: Missing CHANGELOG.md warns and continues', () => {
  it('stderr contains "CHANGELOG.md not readable" and upgrade proceeds', async () => {
    const projectRoot = makeTmpDir();
    const pkgRoot = makeTmpDir();

    // Setup pkgRoot WITHOUT CHANGELOG.md (no third arg to setupPkgRoot)
    setupPkgRoot(pkgRoot, '0.8.2');
    writeInstallSnapshot(projectRoot, '0.6.0');

    const cli = makeCliOpts({ cwd: projectRoot, packageRoot: pkgRoot });
    await upgradeHandler({ dryRun: true }, cli);

    // Warning emitted on stderr
    expect(cli.err.join('\n')).toContain('CHANGELOG.md not readable');

    // Upgrade still proceeded (dry-run output present)
    const allOutput = cli.out.join('\n');
    expect(allOutput).toContain('[dry-run]');
  });
});

// ─── Gherkin Scenario: Installed older than earliest entry prints all ─────────

describe('Scenario: Installed older than earliest changelog entry prints all', () => {
  it('installed=0.0.5, earliest=0.5.0 → all sections appear in stdout', async () => {
    const projectRoot = makeTmpDir();
    const pkgRoot = makeTmpDir();

    setupPkgRoot(pkgRoot, '0.8.2', FIXTURE_CHANGELOG);
    writeInstallSnapshot(projectRoot, '0.0.5');

    const cli = makeCliOpts({ cwd: projectRoot, packageRoot: pkgRoot });
    await upgradeHandler({ dryRun: true }, cli);

    const allOutput = cli.out.join('\n');

    // All 6 sections should appear (0.5.0 is the earliest in fixture)
    expect(allOutput).toContain('## [0.8.2]');
    expect(allOutput).toContain('## [0.8.1]');
    expect(allOutput).toContain('## [0.8.0]');
    expect(allOutput).toContain('## [0.7.0]');
    expect(allOutput).toContain('## [0.6.0]');
    expect(allOutput).toContain('## [0.5.0]');
  });
});
