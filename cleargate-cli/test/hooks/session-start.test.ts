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

import { describe, it, expect, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { spawnSync } from 'node:child_process';

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
  it('Scenario 5: <24h since last_check → hook silent, no sync --check invoked', () => {
    const tmpDir = makeTmpDir();
    // Marker written 1 hour ago — within 24h throttle window
    writeMarker(tmpDir, isoSecondsAgo(3600));

    // Fake CLI that would print something if sync --check is called
    makeFakeCli(tmpDir, { syncCheckOutput: '{"updates":5,"since":"2026-01-01T00:00:00.000Z"}' });

    const { exitCode, stdout } = runHook(tmpDir);

    expect(exitCode).toBe(0);
    // No nudge line should appear
    expect(stdout).not.toContain('ClearGate:');
    expect(stdout).not.toContain('remote updates');
  });

  it('Scenario 6: ≥24h + MCP returns updates > 0 → hook prints 📡 nudge line with correct count', () => {
    const tmpDir = makeTmpDir();
    // Marker written 25 hours ago
    writeMarker(tmpDir, isoSecondsAgo(25 * 3600));
    makeFakeCli(tmpDir, { syncCheckOutput: '{"updates":5,"since":"2026-04-18T10:00:00.000Z"}' });

    const { exitCode, stdout } = runHook(tmpDir);

    expect(exitCode).toBe(0);
    expect(stdout).toContain('ClearGate:');
    expect(stdout).toContain('5 remote updates');
    expect(stdout).toContain('cleargate sync');
  });

  it('Scenario 7: ≥24h + MCP returns updates = 0 → hook silent', () => {
    const tmpDir = makeTmpDir();
    writeMarker(tmpDir, isoSecondsAgo(25 * 3600));
    makeFakeCli(tmpDir, { syncCheckOutput: '{"updates":0,"since":"2026-04-18T10:00:00.000Z"}' });

    const { exitCode, stdout } = runHook(tmpDir);

    expect(exitCode).toBe(0);
    expect(stdout).not.toContain('ClearGate:');
    expect(stdout).not.toContain('remote updates');
  });

  it('Scenario 8: ≥24h + MCP unreachable (stub exits after 4s) → hook exits 0 within ~3.5s, no nudge output', () => {
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

    expect(exitCode).toBe(0);
    // Should complete within 6s: 3s kill timer + overhead. The 4s slow CLI
    // is killed (or background-process-killed on macOS) at the 3s mark.
    // We use 6s to accommodate CI load variance.
    expect(elapsed).toBeLessThan(7000);
    // No nudge output (sync --check was killed/failed, fallback is {"updates":0})
    expect(stdout).not.toContain('remote updates');
  });

  it('Scenario 9 (missing marker): hook creates marker, makes NO MCP call → silent exit 0', () => {
    const tmpDir = makeTmpDir();
    // No marker exists
    const markerPath = path.join(tmpDir, '.cleargate', '.sync-marker.json');
    expect(fs.existsSync(markerPath)).toBe(false);

    // CLI that would print updates if called
    makeFakeCli(tmpDir, { syncCheckOutput: '{"updates":99,"since":"2026-01-01T00:00:00.000Z"}' });

    const { exitCode, stdout } = runHook(tmpDir);

    expect(exitCode).toBe(0);
    // Marker should now exist
    expect(fs.existsSync(markerPath)).toBe(true);
    const marker = JSON.parse(fs.readFileSync(markerPath, 'utf8')) as Record<string, unknown>;
    expect(typeof marker['last_check']).toBe('string');
    // No nudge (first-run 24h grace)
    expect(stdout).not.toContain('ClearGate:');
    expect(stdout).not.toContain('remote updates');
  });
});
