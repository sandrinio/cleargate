/**
 * scaffold-lint.test.ts — unit tests for `cleargate scaffold-lint`.
 *
 * STORY-018-04 Gherkin scenarios:
 *   1. Clean scaffold passes — no blocklist terms → exit 0 + "scaffold-lint: clean"
 *   2. Blocklist term flagged — "drizzle" at line 42 → exit 1 + stderr match
 *   3. User-extensible blocklist — custom term via scaffold-blocklist.txt
 *   4. Allowlist suppresses a match — scoped suppression
 *   5. --fix-hint suggests placeholders
 *   6. CI fails on leak — malformed allowlist → exit 2
 *
 * Uses tmpdir fixtures with fake cleargate-planning/ trees.
 * Does NOT scan the live repo tree.
 */

import { describe, it, expect, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { scaffoldLintHandler } from '../../src/commands/scaffold-lint.js';

// ─── Test seam helpers ────────────────────────────────────────────────────────

function makeExitSeam() {
  let code: number | null = null;
  const exitFn = (c: number): never => {
    code = c;
    throw new Error(`exit:${c}`);
  };
  return {
    get code() { return code; },
    exitFn,
  };
}

function makeCapture() {
  const lines: string[] = [];
  const fn = (s: string) => lines.push(s);
  return { lines, fn };
}

function makeTmpDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'cg-scaffold-lint-'));
}

const tmpdirs: string[] = [];

afterEach(() => {
  for (const d of tmpdirs) {
    try { fs.rmSync(d, { recursive: true, force: true }); } catch { /* ignore */ }
  }
  tmpdirs.length = 0;
});

function createFixture(base: string) {
  const planning = path.join(base, 'cleargate-planning');
  fs.mkdirSync(planning, { recursive: true });
  fs.mkdirSync(path.join(base, '.cleargate'), { recursive: true });
  return planning;
}

// ─── Scenario 1: Clean scaffold passes ───────────────────────────────────────

describe('Scenario 1: Clean scaffold passes', () => {
  it('exits 0 and stdout contains "scaffold-lint: clean" when no blocklist terms', () => {
    const tmp = makeTmpDir();
    tmpdirs.push(tmp);

    const planning = createFixture(tmp);
    fs.writeFileSync(
      path.join(planning, 'README.md'),
      '# ClearGate Scaffold\n\nThis scaffold is framework-agnostic.\n',
    );

    const out = makeCapture();
    const err = makeCapture();
    const exit = makeExitSeam();

    // Should NOT throw (exit 0 returns without calling exitFn)
    scaffoldLintHandler({
      cwd: tmp,
      stdout: out.fn,
      stderr: err.fn,
      exit: exit.exitFn,
    });

    expect(exit.code).toBeNull();
    expect(out.lines.join('\n')).toContain('scaffold-lint: clean');
  });
});

// ─── Scenario 2: Blocklist term flagged ──────────────────────────────────────

describe('Scenario 2: Blocklist term flagged', () => {
  it('exits 1 and stderr contains file:line:term for drizzle', () => {
    const tmp = makeTmpDir();
    tmpdirs.push(tmp);

    const planning = createFixture(tmp);
    const agentsDir = path.join(planning, '.claude', 'agents');
    fs.mkdirSync(agentsDir, { recursive: true });

    // Build file with drizzle at line 42
    const lines = Array.from({ length: 41 }, (_, i) => `# Line ${i + 1}`);
    lines.push('Uses drizzle ORM for persistence');  // line 42
    lines.push('# Line 43');
    const content = lines.join('\n');

    fs.writeFileSync(path.join(agentsDir, 'developer.md'), content);

    const out = makeCapture();
    const err = makeCapture();
    const exit = makeExitSeam();

    expect(() =>
      scaffoldLintHandler({
        cwd: tmp,
        stdout: out.fn,
        stderr: err.fn,
        exit: exit.exitFn,
      }),
    ).toThrow('exit:1');

    expect(exit.code).toBe(1);
    const errStr = err.lines.join('\n');
    expect(errStr).toMatch(/cleargate-planning\/.claude\/agents\/developer\.md:42:/);
    expect(errStr).toMatch(/drizzle/i);
  });
});

// ─── Scenario 3: User-extensible blocklist ───────────────────────────────────

describe('Scenario 3: User-extensible blocklist', () => {
  it('flags a custom term from .cleargate/scaffold-blocklist.txt', () => {
    const tmp = makeTmpDir();
    tmpdirs.push(tmp);

    const planning = createFixture(tmp);
    fs.writeFileSync(
      path.join(planning, 'README.md'),
      '# Using mycorp-internal tooling here\n',
    );

    // Write user blocklist
    fs.writeFileSync(
      path.join(tmp, '.cleargate', 'scaffold-blocklist.txt'),
      '# Custom terms\nmycorp-internal\n',
    );

    const out = makeCapture();
    const err = makeCapture();
    const exit = makeExitSeam();

    expect(() =>
      scaffoldLintHandler({
        cwd: tmp,
        stdout: out.fn,
        stderr: err.fn,
        exit: exit.exitFn,
      }),
    ).toThrow('exit:1');

    expect(exit.code).toBe(1);
    expect(err.lines.join('\n')).toMatch(/mycorp-internal/i);
  });
});

// ─── Scenario 4: Allowlist suppresses a match ────────────────────────────────

describe('Scenario 4: Allowlist suppresses a match', () => {
  it('suppresses svelte match when allowlist entry scopes it to that file', () => {
    const tmp = makeTmpDir();
    tmpdirs.push(tmp);

    const planning = createFixture(tmp);
    const templatesDir = path.join(planning, 'templates');
    fs.mkdirSync(templatesDir, { recursive: true });

    // File that contains svelte as legitimate example
    fs.writeFileSync(
      path.join(templatesDir, 'example.md'),
      '# Example\n\nYou might use svelte as a framework.\n',
    );

    // Allowlist: suppress svelte only in that one file
    fs.writeFileSync(
      path.join(tmp, '.cleargate', 'scaffold-allowlist.txt'),
      '# Legitimate examples\nsvelte cleargate-planning/templates/example.md\n',
    );

    const out = makeCapture();
    const err = makeCapture();
    const exit = makeExitSeam();

    // Should NOT throw (no findings after suppression)
    scaffoldLintHandler({
      cwd: tmp,
      stdout: out.fn,
      stderr: err.fn,
      exit: exit.exitFn,
    });

    expect(exit.code).toBeNull();
    expect(out.lines.join('\n')).toContain('scaffold-lint: clean');
    // svelte must NOT appear in stderr
    expect(err.lines.join('\n')).not.toMatch(/svelte/i);
  });

  it('still flags svelte in a DIFFERENT file not covered by the allowlist entry', () => {
    const tmp = makeTmpDir();
    tmpdirs.push(tmp);

    const planning = createFixture(tmp);
    const templatesDir = path.join(planning, 'templates');
    fs.mkdirSync(templatesDir, { recursive: true });

    // Allowlisted file
    fs.writeFileSync(
      path.join(templatesDir, 'example.md'),
      '# Example\nYou might use svelte.\n',
    );

    // Another file NOT in allowlist
    fs.writeFileSync(
      path.join(planning, 'LEAKED.md'),
      '# Oops\nThis file has svelte reference.\n',
    );

    // Allowlist scopes only to example.md
    fs.writeFileSync(
      path.join(tmp, '.cleargate', 'scaffold-allowlist.txt'),
      'svelte cleargate-planning/templates/example.md\n',
    );

    const out = makeCapture();
    const err = makeCapture();
    const exit = makeExitSeam();

    expect(() =>
      scaffoldLintHandler({
        cwd: tmp,
        stdout: out.fn,
        stderr: err.fn,
        exit: exit.exitFn,
      }),
    ).toThrow('exit:1');

    expect(exit.code).toBe(1);
    expect(err.lines.join('\n')).toMatch(/LEAKED\.md/);
  });
});

// ─── Scenario 5: --fix-hint suggests placeholders ────────────────────────────

describe('Scenario 5: --fix-hint suggests placeholders', () => {
  it('includes "hint: replace with <your-db>" for a postgres finding', () => {
    const tmp = makeTmpDir();
    tmpdirs.push(tmp);

    const planning = createFixture(tmp);
    fs.writeFileSync(
      path.join(planning, 'setup.md'),
      '# Setup\n\nStore data in postgres.\n',
    );

    const out = makeCapture();
    const err = makeCapture();
    const exit = makeExitSeam();

    expect(() =>
      scaffoldLintHandler({
        fixHint: true,
        cwd: tmp,
        stdout: out.fn,
        stderr: err.fn,
        exit: exit.exitFn,
      }),
    ).toThrow('exit:1');

    expect(exit.code).toBe(1);
    const errStr = err.lines.join('\n');
    expect(errStr).toMatch(/postgres/i);
    expect(errStr).toContain('hint: replace with <your-db>');
  });
});

// ─── Scenario 6: CI fails on malformed config ────────────────────────────────

describe('Scenario 6: CI fails on malformed allowlist', () => {
  it('exits 2 when scaffold-blocklist.txt contains a malformed line (multiple tokens)', () => {
    const tmp = makeTmpDir();
    tmpdirs.push(tmp);

    createFixture(tmp);

    // Write a malformed blocklist: a line with spaces (two tokens) — invalid for blocklist
    fs.writeFileSync(
      path.join(tmp, '.cleargate', 'scaffold-blocklist.txt'),
      'valid-term\nbad term extra tokens\n',
    );

    const out = makeCapture();
    const err = makeCapture();
    const exit = makeExitSeam();

    expect(() =>
      scaffoldLintHandler({
        cwd: tmp,
        stdout: out.fn,
        stderr: err.fn,
        exit: exit.exitFn,
      }),
    ).toThrow('exit:2');

    expect(exit.code).toBe(2);
  });
});
