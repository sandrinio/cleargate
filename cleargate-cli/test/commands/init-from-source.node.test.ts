import { describe, test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';

/**
 * init-from-source.test.ts — STORY-016-05
 *
 * Tests for `cleargate init --from-source <path>`.
 * Four scenarios map 1:1 to the Gherkin acceptance criteria in the story.
 *
 * Note: tests use real fs + tmpdir (no mocks per project policy).
 * The `--from-source` flag routes through `resolveScaffoldRoot` in lib/scaffold-source.ts.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import * as url from 'node:url';
import type { SpawnSyncReturns } from 'node:child_process';
import { initHandler } from '../../src/commands/init.js';
import { resolveScaffoldRoot, ScaffoldSourceError } from '../../src/lib/scaffold-source.js';

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


const __testDirname = path.dirname(url.fileURLToPath(import.meta.url));
// test/commands/ → test/ → cleargate-cli/ → repo-root/
const REPO_ROOT = path.resolve(__testDirname, '..', '..', '..', '..');
// The actual cleargate-planning/ in the meta-repo used as the dogfood source
const META_ROOT_PLANNING = path.join(REPO_ROOT, 'cleargate-planning');

function makeTmpDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'cg-from-src-test-'));
}

function cleanup(dir: string): void {
  fs.rmSync(dir, { recursive: true, force: true });
}

/** Capture stdout/stderr from initHandler */
function makeCapture(): {
  out: string[];
  err: string[];
  stdout: (s: string) => void;
  stderr: (s: string) => void;
} {
  const out: string[] = [];
  const err: string[] = [];
  return {
    out,
    err,
    stdout: (s) => { out.push(s); },
    stderr: (s) => { err.push(s); },
  };
}

/** Minimal probe stub that always returns success (avoids real npx invocations in tests). */
const probeStub = (_cmd: string): SpawnSyncReturns<string> => ({
  status: 0,
  stdout: '0.9.0',
  stderr: '',
  pid: 0,
  output: [],
  signal: null,
  error: undefined,
});

describe('cleargate init --from-source', () => {
  let tmpTarget: string;

  beforeEach(() => {
    tmpTarget = makeTmpDir();
  });

  afterEach(() => {
    cleanup(tmpTarget);
  });

  // ─── Scenario 1: Local path resolves and copies ─────────────────────────────

  test('Scenario 1: Local path resolves and copies scaffold byte-for-byte + MANIFEST.json generated', async () => {
    // Build a minimal source scaffold in a tmpdir
    const srcDir = makeTmpDir();
    try {
      // Replicate the required scaffold layout
      fs.mkdirSync(path.join(srcDir, '.claude', 'agents'), { recursive: true });
      fs.mkdirSync(path.join(srcDir, '.claude', 'hooks'), { recursive: true });
      fs.mkdirSync(path.join(srcDir, '.cleargate', 'knowledge'), { recursive: true });
      fs.mkdirSync(path.join(srcDir, '.cleargate', 'templates'), { recursive: true });
      fs.mkdirSync(path.join(srcDir, '.cleargate', 'delivery', 'pending-sync'), { recursive: true });
      fs.mkdirSync(path.join(srcDir, '.cleargate', 'delivery', 'archive'), { recursive: true });
      fs.writeFileSync(path.join(srcDir, 'CLAUDE.md'), '<!-- CLEARGATE:START -->\ntest content\n<!-- CLEARGATE:END -->\n', 'utf8');
      fs.writeFileSync(path.join(srcDir, '.cleargate', 'FLASHCARD.md'), '# Flashcards\n', 'utf8');
      // minimal knowledge file to pass copy
      fs.writeFileSync(
        path.join(srcDir, '.cleargate', 'knowledge', 'cleargate-protocol.md'),
        '# Protocol\nTest protocol content.\n',
        'utf8',
      );
      // Stub MANIFEST.json so loadPackageManifest works from the source dir
      const manifest = {
        cleargate_version: '0.9.0-test',
        generated_at: new Date().toISOString(),
        files: [
          {
            path: '.cleargate/FLASHCARD.md',
            sha256: null,
            tier: 'user-artifact',
            overwrite_policy: 'skip',
            preserve_on_uninstall: true,
          },
        ],
      };
      fs.writeFileSync(
        path.join(srcDir, 'MANIFEST.json'),
        JSON.stringify(manifest, null, 2) + '\n',
        'utf8',
      );

      const cap = makeCapture();
      await initHandler({
        cwd: tmpTarget,
        fromSource: srcDir,
        yes: true,
        stdout: cap.stdout,
        stderr: cap.stderr,
        spawnSyncFn: probeStub as Parameters<typeof initHandler>[0]['spawnSyncFn'],
      });

      // tmpdir/.cleargate/ and tmpdir/.claude/ must exist
      expect(fs.existsSync(path.join(tmpTarget, '.cleargate')), '.cleargate/ exists').toBe(true);
      expect(fs.existsSync(path.join(tmpTarget, '.claude')), '.claude/ exists').toBe(true);

      // tmpdir/CLAUDE.md must exist
      const claudeMdPath = path.join(tmpTarget, 'CLAUDE.md');
      expect(fs.existsSync(claudeMdPath), 'CLAUDE.md exists').toBe(true);

      // CLAUDE.md must contain the bounded block markers
      const claudeMdContent = fs.readFileSync(claudeMdPath, 'utf8');
      assert.ok(String(claudeMdContent).includes('<!-- CLEARGATE:START -->'));
      assert.ok(String(claudeMdContent).includes('<!-- CLEARGATE:END -->'));

      // .cleargate/.install-manifest.json generated (MANIFEST.json equivalent)
      const installManifestPath = path.join(tmpTarget, '.cleargate', '.install-manifest.json');
      expect(fs.existsSync(installManifestPath), '.install-manifest.json exists').toBe(true);
      const installManifest = JSON.parse(fs.readFileSync(installManifestPath, 'utf8')) as Record<string, unknown>;
      assert.strictEqual(typeof installManifest['installed_at'], 'string');
      assert.strictEqual(installManifest['cleargate_version'], '0.9.0-test');

      // FLASHCARD.md source file was copied to target byte-for-byte
      const srcFlashcard = fs.readFileSync(path.join(srcDir, '.cleargate', 'FLASHCARD.md'), 'utf8');
      const dstFlashcard = fs.readFileSync(path.join(tmpTarget, '.cleargate', 'FLASHCARD.md'), 'utf8');
      assert.strictEqual(dstFlashcard, srcFlashcard);

      // Done message present
      expect(cap.out.join('')).toContain('Done.');
    } finally {
      cleanup(srcDir);
    }
  });

  // ─── Scenario 2: Missing scaffold path errors clearly ───────────────────────

  test('Scenario 2: Missing path exits with code 2 and clear stderr message', async () => {
    const nonExistentPath = '/nonexistent-cleargate-test-path-should-not-exist';
    const cap = makeCapture();

    let exitCode: number | undefined;
    const exitStub = (code: number): never => {
      exitCode = code;
      throw new Error(`exit(${code})`);
    };

    let threw = false;
    try {
      await initHandler({
        cwd: tmpTarget,
        fromSource: nonExistentPath,
        yes: true,
        stdout: cap.stdout,
        stderr: cap.stderr,
        exit: exitStub,
        spawnSyncFn: probeStub as Parameters<typeof initHandler>[0]['spawnSyncFn'],
      });
    } catch {
      threw = true;
    }

    assert.strictEqual(threw, true);
    assert.strictEqual(exitCode, 2);
    const errJoined = cap.err.join('');
    assert.ok(String(errJoined).includes('--from-source path missing required scaffold layout'));

    // No files written to cwd
    const cwdEntries = fs.readdirSync(tmpTarget);
    expect(cwdEntries.filter((f) => !f.startsWith('.'))).toHaveLength(0);
  });

  // ─── Scenario 3: Path missing required subdirs errors with names ────────────

  test('Scenario 3: Path missing required subdirs errors with exit 2 and names missing dirs', async () => {
    // Create a directory that exists but has no .claude/ or .cleargate/
    const emptyDir = makeTmpDir();
    try {
      // Only create CLAUDE.md, not .claude/ or .cleargate/
      fs.writeFileSync(path.join(emptyDir, 'CLAUDE.md'), 'just a file\n', 'utf8');

      const cap = makeCapture();
      let exitCode: number | undefined;
      const exitStub = (code: number): never => {
        exitCode = code;
        throw new Error(`exit(${code})`);
      };

      let threw = false;
      try {
        await initHandler({
          cwd: tmpTarget,
          fromSource: emptyDir,
          yes: true,
          stdout: cap.stdout,
          stderr: cap.stderr,
          exit: exitStub,
          spawnSyncFn: probeStub as Parameters<typeof initHandler>[0]['spawnSyncFn'],
        });
      } catch {
        threw = true;
      }

      assert.strictEqual(threw, true);
      assert.strictEqual(exitCode, 2);
      const errJoined = cap.err.join('');
      assert.ok(String(errJoined).includes('--from-source path missing required scaffold layout'));
      // Both missing dirs should be named in the error message
      assert.ok(String(errJoined).includes('.claude'));
      assert.ok(String(errJoined).includes('.cleargate'));
    } finally {
      cleanup(emptyDir);
    }
  });

  // ─── Scenario 4: Absent --from-source preserves existing npm-package behavior ─

  test('Scenario 4: Absent --from-source uses npm-resolved payloadDir (regression)', async () => {
    // When payloadDir is injected directly (as existing tests do), fromSource absent + payloadDir present
    // must work unchanged — this exercises the existing test seam.
    const cap = makeCapture();

    // Use the meta-repo's cleargate-planning/ as the test payload (same as existing init.test.ts)
    // Only run this if cleargate-planning/ has the required layout
    if (!fs.existsSync(META_ROOT_PLANNING) || !fs.existsSync(path.join(META_ROOT_PLANNING, '.claude'))) {
      // Fallback: just confirm resolveScaffoldRoot returns npm-package source when fromSource absent
      const result = resolveScaffoldRoot({ fromSource: undefined });
      assert.strictEqual(result.source, 'npm-package');
      assert.strictEqual(typeof result.payloadDir, 'string');
      return;
    }

    await initHandler({
      cwd: tmpTarget,
      payloadDir: META_ROOT_PLANNING, // explicit test-seam: bypass import.meta resolution
      yes: true,
      stdout: cap.stdout,
      stderr: cap.stderr,
      spawnSyncFn: probeStub as Parameters<typeof initHandler>[0]['spawnSyncFn'],
    });

    // Scaffold installed successfully
    expect(fs.existsSync(path.join(tmpTarget, '.cleargate'))).toBe(true);
    expect(fs.existsSync(path.join(tmpTarget, '.claude'))).toBe(true);
    expect(cap.out.join('')).toContain('Done.');
    // Confirm resolveScaffoldRoot without fromSource returns npm-package source
    const result = resolveScaffoldRoot({ fromSource: undefined });
    assert.strictEqual(result.source, 'npm-package');
  });
});

// ─── Unit tests for resolveScaffoldRoot ─────────────────────────────────────

describe('resolveScaffoldRoot', () => {
  test('returns npm-package source when fromSource is undefined', () => {
    const result = resolveScaffoldRoot();
    assert.strictEqual(result.source, 'npm-package');
    assert.strictEqual(typeof result.payloadDir, 'string');
  });

  test('returns npm-package source when fromSource is empty string (falsy)', () => {
    const result = resolveScaffoldRoot({ fromSource: '' });
    assert.strictEqual(result.source, 'npm-package');
  });

  test('throws ScaffoldSourceError with PATH_MISSING when path does not exist', () => {
    expect(() =>
      resolveScaffoldRoot({ fromSource: '/nonexistent-scaffold-path-9999' }),
    ).toThrow(ScaffoldSourceError);

    try {
      resolveScaffoldRoot({ fromSource: '/nonexistent-scaffold-path-9999' });
    } catch (e) {
      assert.ok(e instanceof ScaffoldSourceError);
      const err = e as ScaffoldSourceError;
      assert.strictEqual(err.code, 'PATH_MISSING');
      assert.ok(String(err.message).includes('--from-source path missing required scaffold layout'));
    }
  });

  test('throws ScaffoldSourceError with LAYOUT_INVALID when required items are missing', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cg-scaffold-src-unit-'));
    try {
      // Directory exists but has no scaffold structure
      expect(() => resolveScaffoldRoot({ fromSource: tmpDir })).toThrow(ScaffoldSourceError);

      try {
        resolveScaffoldRoot({ fromSource: tmpDir });
      } catch (e) {
        assert.ok(e instanceof ScaffoldSourceError);
        const err = e as ScaffoldSourceError;
        assert.strictEqual(err.code, 'LAYOUT_INVALID');
        assert.ok(err.missing.length > 0);
        assert.ok(String(err.message).includes('--from-source path missing required scaffold layout'));
      }
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  test('returns from-source with absolute payloadDir when valid scaffold path provided', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cg-scaffold-src-valid-'));
    try {
      fs.mkdirSync(path.join(tmpDir, '.claude'), { recursive: true });
      fs.mkdirSync(path.join(tmpDir, '.cleargate'), { recursive: true });
      fs.writeFileSync(path.join(tmpDir, 'CLAUDE.md'), '<!-- CLEARGATE:START -->\n<!-- CLEARGATE:END -->\n', 'utf8');

      const result = resolveScaffoldRoot({ fromSource: tmpDir });
      assert.strictEqual(result.source, 'from-source');
      assert.strictEqual(result.payloadDir, tmpDir);
      expect(path.isAbsolute(result.payloadDir)).toBe(true);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  test('resolves relative paths relative to the cwd option', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cg-scaffold-src-rel-'));
    try {
      fs.mkdirSync(path.join(tmpDir, 'my-scaffold', '.claude'), { recursive: true });
      fs.mkdirSync(path.join(tmpDir, 'my-scaffold', '.cleargate'), { recursive: true });
      fs.writeFileSync(path.join(tmpDir, 'my-scaffold', 'CLAUDE.md'), '<!-- CLEARGATE:START -->\n<!-- CLEARGATE:END -->\n', 'utf8');

      const result = resolveScaffoldRoot({ fromSource: './my-scaffold', cwd: tmpDir });
      assert.strictEqual(result.source, 'from-source');
      assert.strictEqual(result.payloadDir, path.join(tmpDir, 'my-scaffold'));
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});
