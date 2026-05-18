import { describe, test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';

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

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { fileURLToPath } from 'node:url';
import { initHandler } from '../../src/commands/init.js';
import { doctorHandler } from '../../src/commands/doctor.js';
import { upgradeHandler } from '../../src/commands/upgrade.js';

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
  test(
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
      assert.ok(String(doctorOutput).includes('0 user-modified, 0 upstream-changed, 0 both-changed'));
      assert.ok(!String(doctorOutput).includes('Run cleargate upgrade to review.'));

      // Doctor exits 0 for a clean scaffold (no blockers, no config errors).
      assert.strictEqual(doctorExitCode, 'doctor --check-scaffold must exit 0', 0);

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
        assert.strictEqual(upgradeExitCode, 'upgrade --dry-run must exit 0 when called', 0);
      }
    },
    TEST_TIMEOUT_MS,
  );
});
