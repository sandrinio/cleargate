import { describe, test, afterEach } from 'node:test';
import assert from 'node:assert/strict';

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

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { upgradeHandler, type UpgradeCliOptions } from '../../src/commands/upgrade.js';
import type { ManifestFile, ManifestEntry } from '../../src/lib/manifest.js';

// Minimal expect() shim (STORY-028-06)
// Backs remaining expect() calls with node:assert so vitest is not needed.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function expect(actual: any): any {
  const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return {
    toBe(expected: unknown) { assert.strictEqual(actual, expected); },
    toEqual(expected: unknown) { assert.deepStrictEqual(actual, expected); },
    toStrictEqual(expected: unknown) { assert.deepStrictEqual(actual, expected); },
    toBeNull() { assert.strictEqual(actual, null); },
    toBeUndefined() { assert.strictEqual(actual, undefined); },
    toBeDefined() { assert.notStrictEqual(actual, undefined); },
    toBeTruthy() { assert.ok(actual); },
    toBeFalsy() { assert.ok(!actual); },
    toBeGreaterThan(n: number) { assert.ok((actual as number) > n); },
    toBeGreaterThanOrEqual(n: number) { assert.ok((actual as number) >= n); },
    toBeLessThan(n: number) { assert.ok((actual as number) < n); },
    toBeLessThanOrEqual(n: number) { assert.ok((actual as number) <= n); },
    toContain(sub: unknown) { assert.ok(String(actual).includes(String(sub))); },
    toMatch(p: string | RegExp) { assert.match(String(actual), typeof p === 'string' ? new RegExp(esc(p)) : p); },
    toHaveLength(len: number) { assert.strictEqual((actual as { length: number }).length, len); },
    toThrow(msg?: string | RegExp) {
      if (!msg) assert.throws(actual as () => void);
      else if (typeof msg === 'string') assert.throws(actual as () => void, new RegExp(esc(msg)));
      else assert.throws(actual as () => void, msg);
    },
    toBeInstanceOf(cls: new (...a: unknown[]) => unknown) { assert.ok(actual instanceof cls); },
    toMatchObject(expected: Record<string, unknown>) { assert.deepStrictEqual(actual, expected); },
    toHaveBeenCalled() { assert.ok((actual as { mock: { calls: unknown[] } }).mock.calls.length > 0); },
    toHaveBeenCalledTimes(n: number) { assert.strictEqual((actual as { mock: { calls: unknown[] } }).mock.calls.length, n); },
    toHaveBeenCalledOnce() { assert.strictEqual((actual as { mock: { calls: unknown[] } }).mock.calls.length, 1); },
    toHaveBeenCalledWith(...expectedArgs: unknown[]) {
      const calls = (actual as { mock: { calls: Array<{arguments: unknown[]}> } }).mock.calls;
      assert.deepStrictEqual(calls[calls.length - 1].arguments, expectedArgs);
    },
    toHaveProperty(key: string, val?: unknown) {
      const obj = actual as Record<string, unknown>;
      assert.ok(key in obj);
      if (val !== undefined) assert.deepStrictEqual(obj[key], val);
    },
    get not(): any {
      return {
        toBe(expected: unknown) { assert.notStrictEqual(actual, expected); },
        toEqual(expected: unknown) { assert.notDeepStrictEqual(actual, expected); },
        toBeNull() { assert.notStrictEqual(actual, null); },
        toBeUndefined() { assert.notStrictEqual(actual, undefined); },
        toBeDefined() { assert.strictEqual(actual, undefined); },
        toBeTruthy() { assert.ok(!actual); },
        toBeFalsy() { assert.ok(actual); },
        toContain(sub: unknown) { assert.ok(!String(actual).includes(String(sub))); },
        toMatch(p: string | RegExp) { assert.doesNotMatch(String(actual), typeof p === 'string' ? new RegExp(esc(p)) : p); },
        toThrow() { assert.doesNotThrow(actual as () => void); },
        toHaveBeenCalled() { assert.strictEqual((actual as { mock: { calls: unknown[] } }).mock.calls.length, 0); },
        toHaveProperty(key: string) { const obj = actual as Record<string, unknown>; assert.ok(!(key in obj)); },
        toBeInstanceOf(cls: new (...a: unknown[]) => unknown) { assert.ok(!(actual instanceof cls)); },
        toHaveLength(len: number) { assert.notStrictEqual((actual as { length: number }).length, len); },
      };
    },
    get resolves(): any {
      const p = actual as Promise<unknown>;
      return {
        async toBe(expected: unknown) { assert.strictEqual(await p, expected); },
        async toEqual(expected: unknown) { assert.deepStrictEqual(await p, expected); },
        async toBeUndefined() { assert.strictEqual(await p, undefined); },
        async toBeNull() { assert.strictEqual(await p, null); },
        async toBeDefined() { assert.notStrictEqual(await p, undefined); },
        async toBeTruthy() { assert.ok(await p); },
      };
    },
    get rejects(): any {
      const p = actual as Promise<unknown>;
      return {
        async toBeInstanceOf(cls: new (...a: unknown[]) => unknown) { await assert.rejects(p, cls); },
        async toThrow(msg?: string | RegExp | (new (...a: unknown[]) => unknown)) {
          if (!msg) await assert.rejects(p);
          else if (typeof msg === 'string') await assert.rejects(p, new RegExp(esc(msg)));
          else await assert.rejects(p, msg as RegExp);
        },
        async toSatisfy(predicate: (val: unknown) => boolean) {
          let err: unknown;
          try { await p; } catch(e) { err = e; }
          assert.ok(predicate(err), `Rejected value did not satisfy predicate. Got: ${String(err)}`);
        },
        async toMatchObject(expected: Record<string, unknown>) {
          let err: unknown;
          try { await p; } catch(e) { err = e; }
          const errObj = err as Record<string, unknown>;
          for (const [k, v] of Object.entries(expected)) {
            if (typeof v === 'string' && (v as any).__isStringContaining) {
              assert.ok(String(errObj[k]).includes((v as any).__value), `Expected ${k} to contain "${(v as any).__value}"`);
            } else {
              assert.deepStrictEqual(errObj[k], v, `Expected ${k} to equal ${String(v)}`);
            }
          }
        },
      };
    },
  };
}
// expect.stringContaining — creates a partial string matcher for use in toMatchObject
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(expect as any).stringContaining = (str: string) => ({ __isStringContaining: true, __value: str });


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
  test('stdout includes 0.8.2, 0.8.1, 0.8.0, 0.7.0 sections in order', async () => {
    const projectRoot = makeTmpDir();
    const pkgRoot = makeTmpDir();

    setupPkgRoot(pkgRoot, '0.8.2', FIXTURE_CHANGELOG);
    writeInstallSnapshot(projectRoot, '0.6.0');

    const cli = makeCliOpts({ cwd: projectRoot, packageRoot: pkgRoot });
    await upgradeHandler({ dryRun: true }, cli);

    const allOutput = cli.out.join('\n');

    // Should include sections for all intermediate versions
    assert.ok(String(allOutput).includes('## [0.8.2]'));
    assert.ok(String(allOutput).includes('## [0.8.1]'));
    assert.ok(String(allOutput).includes('## [0.8.0]'));
    assert.ok(String(allOutput).includes('## [0.7.0]'));
  });

  test('stdout does NOT include 0.6.0 or 0.5.0 sections', async () => {
    const projectRoot = makeTmpDir();
    const pkgRoot = makeTmpDir();

    setupPkgRoot(pkgRoot, '0.8.2', FIXTURE_CHANGELOG);
    writeInstallSnapshot(projectRoot, '0.6.0');

    const cli = makeCliOpts({ cwd: projectRoot, packageRoot: pkgRoot });
    await upgradeHandler({ dryRun: true }, cli);

    const allOutput = cli.out.join('\n');

    // fromExclusive=0.6.0 means 0.6.0 itself should NOT be in the delta
    assert.ok(!String(allOutput).includes('## [0.6.0]'));
    assert.ok(!String(allOutput).includes('## [0.5.0]'));
  });

  test('delta appears before the dry-run plan (--- divider then [dry-run] lines)', async () => {
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
    assert.ok(dividerIdx > -1);
    // The dry-run lines should appear after the divider
    if (dryRunIdx !== -1) {
      assert.ok(dividerIdx < dryRunIdx);
    }
  });
});

// ─── Gherkin Scenario: Same version skips delta ───────────────────────────────

describe('Scenario: Same version skips delta (installed=0.8.2, target=0.8.2)', () => {
  test('stdout does NOT include any "## [" CHANGELOG heading', async () => {
    const projectRoot = makeTmpDir();
    const pkgRoot = makeTmpDir();

    setupPkgRoot(pkgRoot, '0.8.2', FIXTURE_CHANGELOG);
    writeInstallSnapshot(projectRoot, '0.8.2');

    const cli = makeCliOpts({ cwd: projectRoot, packageRoot: pkgRoot });
    await upgradeHandler({ dryRun: true }, cli);

    const allOutput = cli.out.join('\n');

    // No changelog headings should appear
    assert.ok(!String(allOutput).includes('## ['));
  });

  test('upgrade proceeds to show dry-run plan or "nothing to do"', async () => {
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
  test('stderr contains "CHANGELOG.md not readable" and upgrade proceeds', async () => {
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
    assert.ok(String(allOutput).includes('[dry-run]'));
  });
});

// ─── Gherkin Scenario: Installed older than earliest entry prints all ─────────

describe('Scenario: Installed older than earliest changelog entry prints all', () => {
  test('installed=0.0.5, earliest=0.5.0 → all sections appear in stdout', async () => {
    const projectRoot = makeTmpDir();
    const pkgRoot = makeTmpDir();

    setupPkgRoot(pkgRoot, '0.8.2', FIXTURE_CHANGELOG);
    writeInstallSnapshot(projectRoot, '0.0.5');

    const cli = makeCliOpts({ cwd: projectRoot, packageRoot: pkgRoot });
    await upgradeHandler({ dryRun: true }, cli);

    const allOutput = cli.out.join('\n');

    // All 6 sections should appear (0.5.0 is the earliest in fixture)
    assert.ok(String(allOutput).includes('## [0.8.2]'));
    assert.ok(String(allOutput).includes('## [0.8.1]'));
    assert.ok(String(allOutput).includes('## [0.8.0]'));
    assert.ok(String(allOutput).includes('## [0.7.0]'));
    assert.ok(String(allOutput).includes('## [0.6.0]'));
    assert.ok(String(allOutput).includes('## [0.5.0]'));
  });
});
