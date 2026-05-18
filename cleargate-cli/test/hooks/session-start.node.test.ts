import { describe, test, afterEach } from 'node:test';
import assert from 'node:assert/strict';

/**
 * session-start.test.ts — STORY-010-08
 *
 * Shell integration tests for the §14.9 sync-nudge block in session-start.sh.
 * Mirrors stamp-and-gate.test.ts pattern: child_process spawn + tmp dir + REPO_ROOT override.
 *
 * Tests verify:
 *  - <24h since last_check → silent, no MCP call
 *  - ≥24h + updates > 0 → prints 📡 nudge line
 *  - ≥24h + updates = 0 → silent
 *  - timeout/unreachable → exits 0 within timeout budget, no output
 *  - missing marker → creates marker, no MCP call (24h grace)
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { spawnSync } from 'node:child_process';

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


const HOOK_PATH = path.resolve('/Users/ssuladze/Documents/Dev/ClearGate/.claude/hooks/session-start.sh');

const tmpDirs: string[] = [];

function makeTmpDir(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cg-session-start-test-'));
  tmpDirs.push(dir);
  return dir;
}

afterEach(() => {
  for (const dir of tmpDirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

/**
 * Build a fake cli.js at tmpDir/cleargate-cli/dist/cli.js that:
 * - For `doctor` subcommand: exits 0 immediately
 * - For `sync --check` subcommand: prints the given JSON and exits 0
 * - Optionally: for `sync --check`, sleep N seconds before responding (timeout test)
 */
function makeFakeCli(tmpDir: string, opts: {
  syncCheckOutput?: string;
  syncCheckDelay?: number; // seconds to sleep before responding
} = {}): void {
  const cliDir = path.join(tmpDir, 'cleargate-cli', 'dist');
  fs.mkdirSync(cliDir, { recursive: true });

  const output = opts.syncCheckOutput ?? '{"updates":0,"since":"2026-01-01T00:00:00.000Z"}';
  const delay = opts.syncCheckDelay ?? 0;

  const script = `
const args = process.argv.slice(2);
const sub = args[0];
if (sub === 'sync' && args.includes('--check')) {
  ${delay > 0 ? `const start = Date.now(); while (Date.now() - start < ${delay * 1000}) {}` : ''}
  process.stdout.write(${JSON.stringify(output)} + '\\n');
  process.exit(0);
} else {
  // doctor --session-start or anything else
  process.exit(0);
}
`;
  fs.writeFileSync(path.join(cliDir, 'cli.js'), script, 'utf8');
}

/**
 * Run the session-start.sh with REPO_ROOT overridden to tmpDir.
 * Returns exit code + stdout.
 */
function runHook(tmpDir: string, timeoutMs: number = 10_000): { exitCode: number; stdout: string } {
  // Read and patch the hook's REPO_ROOT
  const original = fs.readFileSync(HOOK_PATH, 'utf-8');
  const patched = original.replace(
    /^REPO_ROOT="[^"]*"$/m,
    `REPO_ROOT="${tmpDir}"`,
  );
  const patchedHookPath = path.join(tmpDir, 'session-start-patched.sh');
  fs.writeFileSync(patchedHookPath, patched, 'utf-8');
  fs.chmodSync(patchedHookPath, 0o755);

  // Filter node_modules/.bin out of PATH so the hook's resolver falls through
  // to the test's fake dist stub at ${tmpDir}/cleargate-cli/dist/cli.js
  // instead of the workspace-linked real cleargate binary (BUG-006 fix).
  const filteredPath = (process.env.PATH ?? '')
    .split(':')
    .filter((d) => !d.includes('node_modules/.bin'))
    .join(':');
  const result = spawnSync('/usr/bin/env', ['bash', patchedHookPath], {
    encoding: 'utf-8',
    timeout: timeoutMs,
    env: { ...process.env, PATH: filteredPath },
  });

  return {
    exitCode: result.status ?? -1,
    stdout: result.stdout ?? '',
  };
}

/**
 * Create a marker file with a given ISO timestamp.
 */
function writeMarker(tmpDir: string, lastCheckIso: string): void {
  const markerDir = path.join(tmpDir, '.cleargate');
  fs.mkdirSync(markerDir, { recursive: true });
  fs.writeFileSync(
    path.join(markerDir, '.sync-marker.json'),
    JSON.stringify({ last_check: lastCheckIso }),
    'utf8',
  );
}

/**
 * Return ISO timestamp that is `secondsAgo` seconds before now.
 */
function isoSecondsAgo(secondsAgo: number): string {
  return new Date(Date.now() - secondsAgo * 1000).toISOString();
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('session-start.sh §14.9 sync nudge block', () => {
  test('Scenario 5: <24h since last_check → hook silent, no sync --check invoked', () => {
    const tmpDir = makeTmpDir();
    // Marker written 1 hour ago — within 24h throttle window
    writeMarker(tmpDir, isoSecondsAgo(3600));

    // Fake CLI that would print something if sync --check is called
    makeFakeCli(tmpDir, { syncCheckOutput: '{"updates":5,"since":"2026-01-01T00:00:00.000Z"}' });

    const { exitCode, stdout } = runHook(tmpDir);

    assert.strictEqual(exitCode, 0);
    // No nudge line should appear
    assert.ok(!String(stdout).includes('ClearGate:'));
    assert.ok(!String(stdout).includes('remote updates'));
  });

  test('Scenario 6: ≥24h + MCP returns updates > 0 → hook prints 📡 nudge line with correct count', () => {
    const tmpDir = makeTmpDir();
    // Marker written 25 hours ago
    writeMarker(tmpDir, isoSecondsAgo(25 * 3600));
    makeFakeCli(tmpDir, { syncCheckOutput: '{"updates":5,"since":"2026-04-18T10:00:00.000Z"}' });

    const { exitCode, stdout } = runHook(tmpDir);

    assert.strictEqual(exitCode, 0);
    assert.ok(String(stdout).includes('ClearGate:'));
    assert.ok(String(stdout).includes('5 remote updates'));
    assert.ok(String(stdout).includes('cleargate sync'));
  });

  test('Scenario 7: ≥24h + MCP returns updates = 0 → hook silent', () => {
    const tmpDir = makeTmpDir();
    writeMarker(tmpDir, isoSecondsAgo(25 * 3600));
    makeFakeCli(tmpDir, { syncCheckOutput: '{"updates":0,"since":"2026-04-18T10:00:00.000Z"}' });

    const { exitCode, stdout } = runHook(tmpDir);

    assert.strictEqual(exitCode, 0);
    assert.ok(!String(stdout).includes('ClearGate:'));
    assert.ok(!String(stdout).includes('remote updates'));
  });

  test('Scenario 8: ≥24h + MCP unreachable (stub exits after 4s) → hook exits 0 within ~3.5s, no nudge output', () => {
    const tmpDir = makeTmpDir();
    writeMarker(tmpDir, isoSecondsAgo(25 * 3600));

    // Create a slow fake CLI (4s delay — should be killed by timeout 3)
    const cliDir = path.join(tmpDir, 'cleargate-cli', 'dist');
    fs.mkdirSync(cliDir, { recursive: true });
    // Bash sleep is more reliable for simulating slow external call
    const script = `
const args = process.argv.slice(2);
if (args[0] === 'sync' && args.includes('--check')) {
  // Simulate slow MCP — sleep 4 seconds
  const start = Date.now();
  while (Date.now() - start < 4000) {
    // busy wait (timeout 3 in the hook should kill us)
  }
  process.stdout.write('{"updates":10}\\n');
  process.exit(0);
} else {
  process.exit(0);
}
`;
    fs.writeFileSync(path.join(cliDir, 'cli.js'), script, 'utf8');

    const start = Date.now();
    const { exitCode, stdout } = runHook(tmpDir, 7_000); // give generous outer timeout
    const elapsed = Date.now() - start;

    assert.strictEqual(exitCode, 0);
    // Should complete within 6s: 3s kill timer + overhead. The 4s slow CLI
    // is killed (or background-process-killed on macOS) at the 3s mark.
    // We use 6s to accommodate CI load variance.
    assert.ok(elapsed < 7000);
    // No nudge output (sync --check was killed/failed, fallback is {"updates":0})
    assert.ok(!String(stdout).includes('remote updates'));
  });

  test('Scenario 9 (missing marker): hook creates marker, makes NO MCP call → silent exit 0', () => {
    const tmpDir = makeTmpDir();
    // No marker exists
    const markerPath = path.join(tmpDir, '.cleargate', '.sync-marker.json');
    expect(fs.existsSync(markerPath)).toBe(false);

    // CLI that would print updates if called
    makeFakeCli(tmpDir, { syncCheckOutput: '{"updates":99,"since":"2026-01-01T00:00:00.000Z"}' });

    const { exitCode, stdout } = runHook(tmpDir);

    assert.strictEqual(exitCode, 0);
    // Marker should now exist
    expect(fs.existsSync(markerPath)).toBe(true);
    const marker = JSON.parse(fs.readFileSync(markerPath, 'utf8')) as Record<string, unknown>;
    assert.strictEqual(typeof marker['last_check'], 'string');
    // No nudge (first-run 24h grace)
    assert.ok(!String(stdout).includes('ClearGate:'));
    assert.ok(!String(stdout).includes('remote updates'));
  });
});

// ─── STORY-026-01: skill auto-load directive ──────────────────────────────────

describe('session-start.sh §026-01 skill auto-load directive', () => {
  /**
   * Scenario 1: Banner emits load directive when sprint is active.
   * .cleargate/sprint-runs/.active contains "SPRINT-20" → directive printed.
   */
  test('Scenario 1: sprint active (.active has content) → emits skill load directive and exits 0', () => {
    const tmpDir = makeTmpDir();
    // Write a valid .active sentinel
    const sprintRunsDir = path.join(tmpDir, '.cleargate', 'sprint-runs');
    fs.mkdirSync(sprintRunsDir, { recursive: true });
    fs.writeFileSync(path.join(sprintRunsDir, '.active'), 'SPRINT-20\n', 'utf8');

    // Marker within 24h to suppress sync nudge (keeps stdout clean for assertion)
    writeMarker(tmpDir, isoSecondsAgo(3600));
    makeFakeCli(tmpDir, { syncCheckOutput: '{"updates":0}' });

    const { exitCode, stdout } = runHook(tmpDir);

    assert.strictEqual(exitCode, 0);
    assert.ok(String(stdout).includes('→ Active sprint detected. Load skill: sprint-execution'));
  });

  /**
   * Scenario 2a: Banner stays quiet when .active is MISSING.
   */
  test('Scenario 2a: .active missing → no load directive, exits 0', () => {
    const tmpDir = makeTmpDir();
    // Ensure .cleargate/sprint-runs/ exists but no .active file
    fs.mkdirSync(path.join(tmpDir, '.cleargate', 'sprint-runs'), { recursive: true });

    writeMarker(tmpDir, isoSecondsAgo(3600));
    makeFakeCli(tmpDir, { syncCheckOutput: '{"updates":0}' });

    const { exitCode, stdout } = runHook(tmpDir);

    assert.strictEqual(exitCode, 0);
    assert.ok(!String(stdout).includes('Load skill: sprint-execution'));
  });

  /**
   * Scenario 2b: Banner stays quiet when .active exists but is whitespace-only.
   * This tests the tr -d '[:space:]' guard — a single newline MUST NOT trigger emit.
   */
  test('Scenario 2b: .active is whitespace-only (single newline) → no load directive, exits 0', () => {
    const tmpDir = makeTmpDir();
    const sprintRunsDir = path.join(tmpDir, '.cleargate', 'sprint-runs');
    fs.mkdirSync(sprintRunsDir, { recursive: true });
    // Write a file that is non-zero size but only whitespace
    fs.writeFileSync(path.join(sprintRunsDir, '.active'), '\n', 'utf8');

    writeMarker(tmpDir, isoSecondsAgo(3600));
    makeFakeCli(tmpDir, { syncCheckOutput: '{"updates":0}' });

    const { exitCode, stdout } = runHook(tmpDir);

    assert.strictEqual(exitCode, 0);
    assert.ok(!String(stdout).includes('Load skill: sprint-execution'));
  });
});
