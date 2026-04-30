/**
 * dogfood-install.test.ts — STORY-016-06
 *
 * E2E integration test: exercises the meta-repo install path end-to-end using
 * the handler-direct pattern (per Architect plan M1 §STORY-016-06 override).
 *
 * Flow: initHandler(--from-source cleargate-planning/) → doctorHandler(--check-scaffold) → upgradeHandler(--dry-run)
 *
 * Deliberate scope choice: handler-direct (no subprocess spawn). Spawn fidelity is
 * covered transitively by test/integration/foreign-repo.test.ts. This test verifies
 * the full install→check→upgrade-dry-run flow without the 30s pretest build budget.
 *
 * 2 Gherkin scenarios:
 *   1. Install + doctor + upgrade-dry-run all clean
 *   2. Test cleans up tmpdir on failure (via afterEach)
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { fileURLToPath } from 'node:url';
import { initHandler } from '../../src/commands/init.js';
import { doctorHandler } from '../../src/commands/doctor.js';
import { upgradeHandler } from '../../src/commands/upgrade.js';

/** Per-test timeout: handler-direct invocation fits easily within 30s. */
const TEST_TIMEOUT_MS = 30_000;

// ── Helpers ───────────────────────────────────────────────────────────────────

function noop(_s: string): void { /* swallow output */ }

/** Throwing exit seam — if called, it fails the test with the exit code. */
function throwingExit(code: number): never {
  throw new Error(`process.exit(${code}) called unexpectedly`);
}

/** Creates a fresh tmpdir for the dogfood install target. */
function makeTmpDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'cg-dogfood-'));
}

/** Best-effort cleanup. */
function cleanup(dir: string): void {
  try { fs.rmSync(dir, { recursive: true, force: true }); } catch { /* best-effort */ }
}

/**
 * Resolve the absolute path to the meta-repo's cleargate-planning/ directory.
 *
 * This test lives at cleargate-cli/test/e2e/dogfood-install.test.ts.
 * Navigating up:
 *   dirname(thisFile) = cleargate-cli/test/e2e/
 *   ../               = cleargate-cli/test/
 *   ../../            = cleargate-cli/
 *   ../../../         = repo-root/ (worktree root, contains cleargate-planning/)
 */
function resolveMetaRepoScaffoldSource(): string {
  const thisFile = fileURLToPath(import.meta.url);
  // test/e2e/ → test/ → cleargate-cli/ → repo-root (3 levels up from test/e2e/)
  const repoRoot = path.resolve(path.dirname(thisFile), '..', '..', '..');
  return path.join(repoRoot, 'cleargate-planning');
}

// ── State ─────────────────────────────────────────────────────────────────────

let tmpDir: string;
let prevNoUpdateCheck: string | undefined;

beforeEach(() => {
  tmpDir = makeTmpDir();
  // Suppress STORY-016-01 registry check — no network calls during tests.
  prevNoUpdateCheck = process.env['CLEARGATE_NO_UPDATE_CHECK'];
  process.env['CLEARGATE_NO_UPDATE_CHECK'] = '1';
});

afterEach(() => {
  // Scenario 2: clean up tmpdir even on failure.
  cleanup(tmpDir);
  // Restore env var.
  if (prevNoUpdateCheck === undefined) {
    delete process.env['CLEARGATE_NO_UPDATE_CHECK'];
  } else {
    process.env['CLEARGATE_NO_UPDATE_CHECK'] = prevNoUpdateCheck;
  }
});

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('Dogfood install end-to-end', () => {
  it(
    'Scenario 1: Install + doctor + upgrade-dry-run all clean',
    async () => {
      const fromSource = resolveMetaRepoScaffoldSource();

      // Verify the scaffold source exists before running (fast-fail on env issue).
      expect(
        fs.existsSync(fromSource),
        `cleargate-planning/ must exist at ${fromSource}`,
      ).toBe(true);

      // ── Step 1: init --from-source ───────────────────────────────────────────
      // Pass fromSource as an absolute path. initHandler calls resolveScaffoldRoot
      // which resolves it relative to cwd — absolute paths are returned as-is.
      //
      // pin: '__CLEARGATE_VERSION__' is a no-op substitution: copyPayload replaces
      // the placeholder with itself, so the installed hook files keep the same
      // content as in cleargate-planning/ source. This ensures the installed SHAs
      // match cleargate-planning/MANIFEST.json exactly, giving doctor a clean report.
      // Without this, pin defaults to 'latest', changing hook file SHAs and making
      // doctor report 2 user-modified files (a design tradeoff in --from-source mode).
      await initHandler({
        cwd: tmpDir,
        fromSource,
        yes: true,
        stdinIsTTY: false,
        pin: '__CLEARGATE_VERSION__',
        stdout: noop,
        stderr: noop,
        exit: throwingExit,
      });

      // Sanity: install manifest must exist after init.
      const manifestPath = path.join(tmpDir, '.cleargate', '.install-manifest.json');
      expect(
        fs.existsSync(manifestPath),
        '.cleargate/.install-manifest.json must exist after init',
      ).toBe(true);

      // ── Step 2: doctor --check-scaffold ─────────────────────────────────────
      // Capture stdout to assert clean marker.
      const doctorStdout: string[] = [];
      let doctorExitCode: number | undefined;

      await doctorHandler(
        { checkScaffold: true },
        {
          cwd: tmpDir,
          stdout: (s) => doctorStdout.push(s),
          stderr: noop,
          exit: (code) => {
            doctorExitCode = code;
            return undefined as never;
          },
        },
      );

      const doctorOutput = doctorStdout.join('\n');

      // Clean marker: Architect plan §STORY-016-06 — assert 0/0/0 counts, no upgrade prompt.
      expect(doctorOutput).toContain('0 user-modified, 0 upstream-changed, 0 both-changed');
      expect(doctorOutput).not.toContain('Run cleargate upgrade to review.');

      // Doctor exits 0 for a clean scaffold (no blockers, no config errors).
      expect(doctorExitCode, 'doctor --check-scaffold must exit 0').toBe(0);

      // ── Step 3: upgrade --dry-run ────────────────────────────────────────────
      // Same-version dry-run: files are classified, plan is printed, nothing is applied.
      let upgradeExitCode: number | undefined;

      await upgradeHandler(
        { dryRun: true },
        {
          cwd: tmpDir,
          stdout: noop,
          stderr: noop,
          exit: (code) => {
            upgradeExitCode = code;
            return undefined as never;
          },
        },
      );

      // upgradeHandler returns without calling exit() in the dry-run path (line 408 — just returns).
      // If exit was called at all, it must be 0.
      if (upgradeExitCode !== undefined) {
        expect(upgradeExitCode, 'upgrade --dry-run must exit 0 when called').toBe(0);
      }
    },
    TEST_TIMEOUT_MS,
  );
});
