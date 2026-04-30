/**
 * init-from-source.test.ts — STORY-016-05
 *
 * Tests for `cleargate init --from-source <path>`.
 * Four scenarios map 1:1 to the Gherkin acceptance criteria in the story.
 *
 * Note: tests use real fs + tmpdir (no mocks per project policy).
 * The `--from-source` flag routes through `resolveScaffoldRoot` in lib/scaffold-source.ts.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import * as url from 'node:url';
import type { SpawnSyncReturns } from 'node:child_process';
import { initHandler } from '../../src/commands/init.js';
import { resolveScaffoldRoot, ScaffoldSourceError } from '../../src/lib/scaffold-source.js';

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

  it('Scenario 1: Local path resolves and copies scaffold byte-for-byte + MANIFEST.json generated', async () => {
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
      expect(claudeMdContent).toContain('<!-- CLEARGATE:START -->');
      expect(claudeMdContent).toContain('<!-- CLEARGATE:END -->');

      // .cleargate/.install-manifest.json generated (MANIFEST.json equivalent)
      const installManifestPath = path.join(tmpTarget, '.cleargate', '.install-manifest.json');
      expect(fs.existsSync(installManifestPath), '.install-manifest.json exists').toBe(true);
      const installManifest = JSON.parse(fs.readFileSync(installManifestPath, 'utf8')) as Record<string, unknown>;
      expect(typeof installManifest['installed_at']).toBe('string');
      expect(installManifest['cleargate_version']).toBe('0.9.0-test');

      // FLASHCARD.md source file was copied to target byte-for-byte
      const srcFlashcard = fs.readFileSync(path.join(srcDir, '.cleargate', 'FLASHCARD.md'), 'utf8');
      const dstFlashcard = fs.readFileSync(path.join(tmpTarget, '.cleargate', 'FLASHCARD.md'), 'utf8');
      expect(dstFlashcard).toBe(srcFlashcard);

      // Done message present
      expect(cap.out.join('')).toContain('Done.');
    } finally {
      cleanup(srcDir);
    }
  });

  // ─── Scenario 2: Missing scaffold path errors clearly ───────────────────────

  it('Scenario 2: Missing path exits with code 2 and clear stderr message', async () => {
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

    expect(threw).toBe(true);
    expect(exitCode).toBe(2);
    const errJoined = cap.err.join('');
    expect(errJoined).toContain('--from-source path missing required scaffold layout');

    // No files written to cwd
    const cwdEntries = fs.readdirSync(tmpTarget);
    expect(cwdEntries.filter((f) => !f.startsWith('.'))).toHaveLength(0);
  });

  // ─── Scenario 3: Path missing required subdirs errors with names ────────────

  it('Scenario 3: Path missing required subdirs errors with exit 2 and names missing dirs', async () => {
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

      expect(threw).toBe(true);
      expect(exitCode).toBe(2);
      const errJoined = cap.err.join('');
      expect(errJoined).toContain('--from-source path missing required scaffold layout');
      // Both missing dirs should be named in the error message
      expect(errJoined).toContain('.claude');
      expect(errJoined).toContain('.cleargate');
    } finally {
      cleanup(emptyDir);
    }
  });

  // ─── Scenario 4: Absent --from-source preserves existing npm-package behavior ─

  it('Scenario 4: Absent --from-source uses npm-resolved payloadDir (regression)', async () => {
    // When payloadDir is injected directly (as existing tests do), fromSource absent + payloadDir present
    // must work unchanged — this exercises the existing test seam.
    const cap = makeCapture();

    // Use the meta-repo's cleargate-planning/ as the test payload (same as existing init.test.ts)
    // Only run this if cleargate-planning/ has the required layout
    if (!fs.existsSync(META_ROOT_PLANNING) || !fs.existsSync(path.join(META_ROOT_PLANNING, '.claude'))) {
      // Fallback: just confirm resolveScaffoldRoot returns npm-package source when fromSource absent
      const result = resolveScaffoldRoot({ fromSource: undefined });
      expect(result.source).toBe('npm-package');
      expect(typeof result.payloadDir).toBe('string');
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
    expect(result.source).toBe('npm-package');
  });
});

// ─── Unit tests for resolveScaffoldRoot ─────────────────────────────────────

describe('resolveScaffoldRoot', () => {
  it('returns npm-package source when fromSource is undefined', () => {
    const result = resolveScaffoldRoot();
    expect(result.source).toBe('npm-package');
    expect(typeof result.payloadDir).toBe('string');
  });

  it('returns npm-package source when fromSource is empty string (falsy)', () => {
    const result = resolveScaffoldRoot({ fromSource: '' });
    expect(result.source).toBe('npm-package');
  });

  it('throws ScaffoldSourceError with PATH_MISSING when path does not exist', () => {
    expect(() =>
      resolveScaffoldRoot({ fromSource: '/nonexistent-scaffold-path-9999' }),
    ).toThrow(ScaffoldSourceError);

    try {
      resolveScaffoldRoot({ fromSource: '/nonexistent-scaffold-path-9999' });
    } catch (e) {
      expect(e).toBeInstanceOf(ScaffoldSourceError);
      const err = e as ScaffoldSourceError;
      expect(err.code).toBe('PATH_MISSING');
      expect(err.message).toContain('--from-source path missing required scaffold layout');
    }
  });

  it('throws ScaffoldSourceError with LAYOUT_INVALID when required items are missing', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cg-scaffold-src-unit-'));
    try {
      // Directory exists but has no scaffold structure
      expect(() => resolveScaffoldRoot({ fromSource: tmpDir })).toThrow(ScaffoldSourceError);

      try {
        resolveScaffoldRoot({ fromSource: tmpDir });
      } catch (e) {
        expect(e).toBeInstanceOf(ScaffoldSourceError);
        const err = e as ScaffoldSourceError;
        expect(err.code).toBe('LAYOUT_INVALID');
        expect(err.missing.length).toBeGreaterThan(0);
        expect(err.message).toContain('--from-source path missing required scaffold layout');
      }
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('returns from-source with absolute payloadDir when valid scaffold path provided', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cg-scaffold-src-valid-'));
    try {
      fs.mkdirSync(path.join(tmpDir, '.claude'), { recursive: true });
      fs.mkdirSync(path.join(tmpDir, '.cleargate'), { recursive: true });
      fs.writeFileSync(path.join(tmpDir, 'CLAUDE.md'), '<!-- CLEARGATE:START -->\n<!-- CLEARGATE:END -->\n', 'utf8');

      const result = resolveScaffoldRoot({ fromSource: tmpDir });
      expect(result.source).toBe('from-source');
      expect(result.payloadDir).toBe(tmpDir);
      expect(path.isAbsolute(result.payloadDir)).toBe(true);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it('resolves relative paths relative to the cwd option', () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cg-scaffold-src-rel-'));
    try {
      fs.mkdirSync(path.join(tmpDir, 'my-scaffold', '.claude'), { recursive: true });
      fs.mkdirSync(path.join(tmpDir, 'my-scaffold', '.cleargate'), { recursive: true });
      fs.writeFileSync(path.join(tmpDir, 'my-scaffold', 'CLAUDE.md'), '<!-- CLEARGATE:START -->\n<!-- CLEARGATE:END -->\n', 'utf8');

      const result = resolveScaffoldRoot({ fromSource: './my-scaffold', cwd: tmpDir });
      expect(result.source).toBe('from-source');
      expect(result.payloadDir).toBe(path.join(tmpDir, 'my-scaffold'));
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });
});
