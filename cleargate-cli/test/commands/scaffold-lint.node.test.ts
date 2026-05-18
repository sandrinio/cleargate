import { describe, test, afterEach } from 'node:test';
import assert from 'node:assert/strict';

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

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { scaffoldLintHandler } from '../../src/commands/scaffold-lint.js';

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
  test('exits 0 and stdout contains "scaffold-lint: clean" when no blocklist terms', () => {
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

    assert.strictEqual(exit.code, null);
    expect(out.lines.join('\n')).toContain('scaffold-lint: clean');
  });
});

// ─── Scenario 2: Blocklist term flagged ──────────────────────────────────────

describe('Scenario 2: Blocklist term flagged', () => {
  test('exits 1 and stderr contains file:line:term for drizzle', () => {
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

    assert.strictEqual(exit.code, 1);
    const errStr = err.lines.join('\n');
    assert.match(String(errStr), /cleargate-planning\/.claude\/agents\/developer\.md:42:/);
    assert.match(String(errStr), /drizzle/i);
  });
});

// ─── Scenario 3: User-extensible blocklist ───────────────────────────────────

describe('Scenario 3: User-extensible blocklist', () => {
  test('flags a custom term from .cleargate/scaffold-blocklist.txt', () => {
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

    assert.strictEqual(exit.code, 1);
    expect(err.lines.join('\n')).toMatch(/mycorp-internal/i);
  });
});

// ─── Scenario 4: Allowlist suppresses a match ────────────────────────────────

describe('Scenario 4: Allowlist suppresses a match', () => {
  test('suppresses svelte match when allowlist entry scopes it to that file', () => {
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

    assert.strictEqual(exit.code, null);
    expect(out.lines.join('\n')).toContain('scaffold-lint: clean');
    // svelte must NOT appear in stderr
    expect(err.lines.join('\n')).not.toMatch(/svelte/i);
  });

  test('still flags svelte in a DIFFERENT file not covered by the allowlist entry', () => {
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

    assert.strictEqual(exit.code, 1);
    expect(err.lines.join('\n')).toMatch(/LEAKED\.md/);
  });
});

// ─── Scenario 5: --fix-hint suggests placeholders ────────────────────────────

describe('Scenario 5: --fix-hint suggests placeholders', () => {
  test('includes "hint: replace with <your-db>" for a postgres finding', () => {
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

    assert.strictEqual(exit.code, 1);
    const errStr = err.lines.join('\n');
    assert.match(String(errStr), /postgres/i);
    assert.ok(String(errStr).includes('hint: replace with <your-db>'));
  });
});

// ─── Scenario 6: CI fails on malformed config ────────────────────────────────

describe('Scenario 6: CI fails on malformed allowlist', () => {
  test('exits 2 when scaffold-blocklist.txt contains a malformed line (multiple tokens)', () => {
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

    assert.strictEqual(exit.code, 2);
  });
});
