/**
 * stamp-and-gate.test.ts — STORY-008-06
 *
 * Shell integration tests for .claude/hooks/stamp-and-gate.sh.
 * Uses PATH override to stub cleargate-cli calls.
 */

import { describe, it, expect, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { execFileSync, spawnSync } from 'node:child_process';

const HOOK_PATH = path.resolve('/Users/ssuladze/Documents/Dev/ClearGate/.claude/hooks/stamp-and-gate.sh');

const tmpDirs: string[] = [];

function makeTmpDir(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cg-hook-test-'));
  tmpDirs.push(dir);
  return dir;
}

afterEach(() => {
  for (const dir of tmpDirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

/**
 * Create a stub `node` script that simulates cleargate-cli/dist/cli.js with a given exit code.
 * Returns the directory to prepend to PATH.
 */
function makeNodeStub(tmpDir: string, exitCode: number = 0): string {
  const binDir = path.join(tmpDir, 'bin');
  fs.mkdirSync(binDir, { recursive: true });

  // We need to stub the "node" call specifically for cleargate-cli/dist/cli.js
  // The hook calls: node "${REPO_ROOT}/cleargate-cli/dist/cli.js" <subcommand>
  // We can't intercept "node" itself easily; instead create a fake dist/cli.js that exits 0
  const fakeCliDir = path.join(tmpDir, 'cleargate-cli', 'dist');
  fs.mkdirSync(fakeCliDir, { recursive: true });
  const fakeCliPath = path.join(fakeCliDir, 'cli.js');
  fs.writeFileSync(fakeCliPath, `process.exit(${exitCode});\n`, 'utf-8');

  return fakeCliDir;
}

/**
 * Run stamp-and-gate.sh with a custom REPO_ROOT pointing to tmpDir.
 * We feed stdin as JSON with the file path.
 */
function runHookWithRepoRoot(
  tmpDir: string,
  filePath: string,
  gateExitCode: number = 0
): { exitCode: number; logContent: string } {
  // Create fake cli.js scripts for each call
  // stamp-tokens → exit 0, gate check → exitCode, wiki ingest → exit 0
  // We'll use a wrapper script that returns different codes per subcommand
  const fakeCliDir = path.join(tmpDir, 'cleargate-cli', 'dist');
  fs.mkdirSync(fakeCliDir, { recursive: true });

  const fakeCliPath = path.join(fakeCliDir, 'cli.js');
  // The hook calls: node cli.js stamp-tokens, node cli.js gate check, node cli.js wiki ingest
  // We detect via argv[2] (the subcommand)
  const fakeCliScript = `
const sub = process.argv[2];
if (sub === 'gate') {
  process.exit(${gateExitCode});
} else {
  process.exit(0);
}
`;
  fs.writeFileSync(fakeCliPath, fakeCliScript, 'utf-8');

  // Create the log dir
  const logDir = path.join(tmpDir, '.cleargate', 'hook-log');
  fs.mkdirSync(logDir, { recursive: true });
  const logPath = path.join(logDir, 'gate-check.log');

  // Create a modified version of the hook with REPO_ROOT overridden
  const modifiedHook = path.join(tmpDir, 'stamp-and-gate-test.sh');
  const originalHook = fs.readFileSync(HOOK_PATH, 'utf-8');
  // Replace the REPO_ROOT line with the tmpDir
  const modifiedContent = originalHook.replace(
    /^REPO_ROOT="[^"]*"$/m,
    `REPO_ROOT="${tmpDir}"`
  );
  fs.writeFileSync(modifiedHook, modifiedContent, 'utf-8');
  fs.chmodSync(modifiedHook, 0o755);

  const stdin = JSON.stringify({ tool_input: { file_path: filePath } });
  const result = spawnSync(
    '/usr/bin/env',
    ['bash', modifiedHook],
    {
      input: stdin,
      encoding: 'utf-8',
      timeout: 10_000,
    }
  );

  const logContent = fs.existsSync(logPath)
    ? fs.readFileSync(logPath, 'utf-8')
    : '';

  return { exitCode: result.status ?? -1, logContent };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('stamp-and-gate.sh hook', () => {
  it('logs stamp=0 gate=0 ingest=0 for a valid .cleargate/delivery path', () => {
    const tmpDir = makeTmpDir();
    const filePath = path.join(tmpDir, '.cleargate', 'delivery', 'pending-sync', 'TEST-001.md');
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, '---\nstory_id: TEST-001\n---\n# Test\n', 'utf-8');

    const { exitCode, logContent } = runHookWithRepoRoot(tmpDir, filePath, 0);

    expect(exitCode).toBe(0);
    expect(logContent).toContain('stamp=0');
    expect(logContent).toContain('gate=0');
    expect(logContent).toContain('ingest=0');
    expect(logContent).toContain('TEST-001.md');
  });

  it('exits 0 and writes no log line when path is NOT under .cleargate/delivery/', () => {
    const tmpDir = makeTmpDir();
    const filePath = '/tmp/some-other-file.md';

    const { exitCode, logContent } = runHookWithRepoRoot(tmpDir, filePath, 0);

    expect(exitCode).toBe(0);
    // No log entry because path doesn't match .cleargate/delivery/*
    expect(logContent).not.toContain('file=/tmp/some-other-file.md');
  });

  it('exits 0 even when gate check returns non-zero, and logs gate=<nonzero>', () => {
    const tmpDir = makeTmpDir();
    const filePath = path.join(tmpDir, '.cleargate', 'delivery', 'pending-sync', 'EPIC-999.md');
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, '---\nepic_id: EPIC-999\n---\n# Epic\n', 'utf-8');

    const { exitCode, logContent } = runHookWithRepoRoot(tmpDir, filePath, 1);

    expect(exitCode).toBe(0);
    expect(logContent).toContain('gate=1');
    expect(logContent).toContain('stamp=0');
    expect(logContent).toContain('ingest=0');
  });
});
