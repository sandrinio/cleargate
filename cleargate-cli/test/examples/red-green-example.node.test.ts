/**
 * Sanity-check tests for the Red/Green example fixture (CR-043).
 *
 * Scenarios:
 * 1. Red test fails against an empty calculator implementation.
 * 2. Both Red and Green tests pass against the full calculator implementation.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  mkdtempSync,
  rmSync,
  writeFileSync,
  mkdirSync,
  copyFileSync,
  readdirSync,
  existsSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const EXAMPLE_DIR = join(
  __dirname,
  '..',
  '..',
  'examples',
  'red-green-example'
);

// Locate tsx binary: prefer worktree-local, fall back to PATH
const WORKTREE_ROOT = resolve(__dirname, '..', '..', '..'); // cleargate-cli/../.. = worktree root
const TSX_BIN = join(WORKTREE_ROOT, 'node_modules', '.bin', 'tsx');

function copyFixtureTo(dest: string): void {
  mkdirSync(dest, { recursive: true });
  for (const file of readdirSync(EXAMPLE_DIR)) {
    if (!file.endsWith('.md')) {
      copyFileSync(join(EXAMPLE_DIR, file), join(dest, file));
    }
  }
}

/**
 * Run tsx --test <file> in the given cwd.
 * NODE_TEST_CONTEXT is deleted from the child env to prevent the "recursive invocation" warning
 * that causes node:test to skip the file entirely (yielding exit 0 regardless of test results).
 */
function runTsxTest(cwd: string, testFile: string): ReturnType<typeof spawnSync> {
  const env = { ...process.env };
  delete env['NODE_TEST_CONTEXT'];
  return spawnSync(TSX_BIN, ['--test', testFile], {
    cwd,
    env,
    timeout: 30_000,
  });
}

describe('Red/Green example fixture — sanity checks (CR-043)', () => {
  it('Red test fails against empty calculator.ts implementation', () => {
    assert.ok(
      existsSync(TSX_BIN),
      `tsx binary not found at ${TSX_BIN} — run npm ci from worktree root`
    );
    const tmp = mkdtempSync(join(tmpdir(), 'cg-red-phase-'));
    try {
      copyFixtureTo(tmp);
      // Overwrite calculator.ts with empty stubs (pre-implementation state)
      writeFileSync(
        join(tmp, 'calculator.ts'),
        `// Empty stubs — implementation not yet written
export function add(_a: number, _b: number): number { return undefined as unknown as number; }
export function subtract(_a: number, _b: number): number { return undefined as unknown as number; }
export function multiply(_a: number, _b: number): number { return undefined as unknown as number; }
export function divide(_a: number, _b: number): number { return undefined as unknown as number; }
`
      );

      const result = runTsxTest(tmp, 'calculator.red.node.test.ts');

      assert.notStrictEqual(
        result.status,
        0,
        `Expected Red test to FAIL (non-zero exit) against empty impl, but got exit ${result.status}.\nstdout: ${result.stdout.toString()}\nstderr: ${result.stderr.toString()}`
      );
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });

  it('Both Red and Green tests pass against the full calculator.ts implementation', () => {
    assert.ok(
      existsSync(TSX_BIN),
      `tsx binary not found at ${TSX_BIN} — run npm ci from worktree root`
    );
    const tmp = mkdtempSync(join(tmpdir(), 'cg-green-phase-'));
    try {
      copyFixtureTo(tmp);
      // Use the original calculator.ts (full implementation already present in fixture)

      // Run Red tests
      const redResult = runTsxTest(tmp, 'calculator.red.node.test.ts');
      assert.strictEqual(
        redResult.status,
        0,
        `Expected Red tests to PASS against full impl, but got exit ${redResult.status}.\nstdout: ${redResult.stdout.toString()}\nstderr: ${redResult.stderr.toString()}`
      );

      // Run Green tests
      const greenResult = runTsxTest(tmp, 'calculator.node.test.ts');
      assert.strictEqual(
        greenResult.status,
        0,
        `Expected Green tests to PASS, but got exit ${greenResult.status}.\nstdout: ${greenResult.stdout.toString()}\nstderr: ${greenResult.stderr.toString()}`
      );
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });
});
