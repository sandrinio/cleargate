import { describe, test, afterEach } from 'node:test';
import assert from 'node:assert/strict';

/**
 * hotfix-new.test.ts — vitest for `cleargate hotfix new <slug>`.
 *
 * STORY-022-06 — five Gherkin scenarios:
 *   1. Clean repo → HOTFIX-001_copy_fix.md created with correct structure.
 *   2. Existing HOTFIX-001 → new file is HOTFIX-002_another_fix.md, old unchanged.
 *   3. 3 active hotfixes → cap blocks 4th, no file created.
 *   4. Template scaffold mirror byte-equality — covered by template-stubs.test.ts
 *      (via TEMPLATE_NAMES extension in that file).
 *   5. wiki/index.md has "Hotfix Ledger" section linking to topics/hotfix-ledger.md.
 *
 * Test design: pure filesystem fixtures + exit seam. No module mocking — avoids the
 * module hoisting pitfall. The `cwd` seam injects a tmpdir so all filesystem reads/writes are isolated.
 */

import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { hotfixNewHandler } from '../../src/commands/hotfix.js';

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


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Repo root: test/commands/hotfix-new.test.ts → URL → up 4 levels → repo root
// (same pattern as template-stubs.test.ts which lives one dir deeper at test/scripts/)
const REPO_ROOT = path.resolve(new URL(import.meta.url).pathname, '..', '..', '..', '..');
const LIVE_TEMPLATE_PATH = path.join(REPO_ROOT, '.cleargate', 'templates', 'hotfix.md');

// ─── Shared helpers ───────────────────────────────────────────────────────────

function makeExitSeam() {
  let code: number | null = null;
  const exitFn = (c: number): never => {
    code = c;
    throw new Error(`exit:${c}`);
  };
  return { exitFn, getCode: () => code };
}

function makeCapture() {
  const out: string[] = [];
  const err: string[] = [];
  return {
    stdout: (s: string) => { out.push(s); },
    stderr: (s: string) => { err.push(s); },
    getOut: () => out,
    getErr: () => err,
  };
}

/**
 * Create a minimal repo fixture in a temp dir.
 * Seeds a real copy of the live hotfix.md template so the handler can read it.
 * Returns { cwd, pendingDir, archiveDir, cleanup }.
 */
function makeTmpRepo(): {
  cwd: string;
  pendingDir: string;
  archiveDir: string;
  cleanup: () => void;
} {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'cg-hotfix-test-'));
  const pendingDir = path.join(cwd, '.cleargate', 'delivery', 'pending-sync');
  const archiveDir = path.join(cwd, '.cleargate', 'delivery', 'archive');
  const templateDir = path.join(cwd, '.cleargate', 'templates');

  fs.mkdirSync(pendingDir, { recursive: true });
  fs.mkdirSync(archiveDir, { recursive: true });
  fs.mkdirSync(templateDir, { recursive: true });

  // Copy the live template into the fixture repo
  fs.copyFileSync(LIVE_TEMPLATE_PATH, path.join(templateDir, 'hotfix.md'));

  return {
    cwd,
    pendingDir,
    archiveDir,
    cleanup: () => { fs.rmSync(cwd, { recursive: true, force: true }); },
  };
}

const tempRepos: Array<() => void> = [];
afterEach(() => {
  while (tempRepos.length) {
    const fn = tempRepos.pop();
    try { fn?.(); } catch { /* swallow */ }
  }
});

// ─── Scenario 1: clean repo → HOTFIX-001_copy_fix.md ─────────────────────────

describe('Scenario 1: cleargate hotfix new copy-fix in clean repo scaffolds HOTFIX-001', () => {
  test('creates HOTFIX-001_copy_fix.md with correct frontmatter and sections', () => {
    const repo = makeTmpRepo();
    tempRepos.push(repo.cleanup);

    const { exitFn, getCode } = makeExitSeam();
    const cap = makeCapture();
    const iso = '2026-04-26T12:00:00.000Z';

    try {
      hotfixNewHandler(
        { slug: 'copy-fix' },
        {
          cwd: repo.cwd,
          stdout: cap.stdout,
          stderr: cap.stderr,
          exit: exitFn,
          now: iso,
        },
      );
    } catch { /* expected exit throw */ }

    expect(getCode()).toBe(0);

    const outFile = path.join(repo.pendingDir, 'HOTFIX-001_copy_fix.md');
    expect(fs.existsSync(outFile)).toBe(true);

    const content = fs.readFileSync(outFile, 'utf8');

    // Frontmatter assertions
    assert.ok(String(content).includes('hotfix_id: "HOTFIX-001"'));
    assert.ok(String(content).includes('lane: "hotfix"'));
    assert.ok(String(content).includes('status: "Draft"'));
    assert.ok(String(content).includes(`created_at: "${iso}"`));

    // Section structure assertions
    assert.ok(String(content).includes('## 1. Anomaly'));
    assert.ok(String(content).includes('## 2. Files Touched'));
    assert.ok(String(content).includes('## 3. Verification Steps'));
    assert.ok(String(content).includes('## 4. Rollback'));

    // §3 is non-empty (has at least one checkbox placeholder)
    assert.match(String(content), /## 3\. Verification Steps[\s\S]+- \[ \]/);

    // §4 is non-empty
    assert.match(String(content), /## 4\. Rollback[\s\S]+\S/);

    // Slug substituted
    assert.ok(String(content).includes('copy-fix'));

    // No leftover {SLUG} placeholder
    assert.ok(!String(content).includes('{SLUG}'));
    // No leftover {ISO} placeholder
    assert.ok(!String(content).includes('{ISO}'));
    // No leftover {ID} placeholder
    assert.ok(!String(content).includes('{ID}'));
  });
});

// ─── Scenario 2: increments ID ───────────────────────────────────────────────

describe('Scenario 2: ID increments when HOTFIX-001 already exists', () => {
  test('creates HOTFIX-002_another_fix.md; HOTFIX-001 is unchanged', () => {
    const repo = makeTmpRepo();
    tempRepos.push(repo.cleanup);

    // Pre-stage HOTFIX-001_old_fix.md
    const oldFile = path.join(repo.pendingDir, 'HOTFIX-001_old_fix.md');
    const sentinel = 'SENTINEL_CONTENT_001';
    fs.writeFileSync(oldFile, sentinel, 'utf8');

    const { exitFn, getCode } = makeExitSeam();
    const cap = makeCapture();

    try {
      hotfixNewHandler(
        { slug: 'another-fix' },
        {
          cwd: repo.cwd,
          stdout: cap.stdout,
          stderr: cap.stderr,
          exit: exitFn,
        },
      );
    } catch { /* expected exit throw */ }

    expect(getCode()).toBe(0);

    const newFile = path.join(repo.pendingDir, 'HOTFIX-002_another_fix.md');
    expect(fs.existsSync(newFile)).toBe(true);

    const newContent = fs.readFileSync(newFile, 'utf8');
    assert.ok(String(newContent).includes('hotfix_id: "HOTFIX-002"'));
    assert.ok(String(newContent).includes('another-fix'));

    // HOTFIX-001 must be unchanged
    expect(fs.readFileSync(oldFile, 'utf8')).toBe(sentinel);
  });
});

// ─── Scenario 3: cap blocks 4th ──────────────────────────────────────────────

describe('Scenario 3: cap blocks 4th hotfix in rolling 7-day window', () => {
  test('exits 1 with cap message; no new file created', () => {
    const repo = makeTmpRepo();
    tempRepos.push(repo.cleanup);

    // Stage 3 hotfix files in pending-sync
    for (let i = 1; i <= 3; i++) {
      fs.writeFileSync(
        path.join(repo.pendingDir, `HOTFIX-00${i}_existing_fix_${i}.md`),
        `# stub ${i}`,
        'utf8',
      );
    }

    const { exitFn, getCode } = makeExitSeam();
    const cap = makeCapture();

    try {
      hotfixNewHandler(
        { slug: 'fourth-fix' },
        {
          cwd: repo.cwd,
          stdout: cap.stdout,
          stderr: cap.stderr,
          exit: exitFn,
        },
      );
    } catch { /* expected exit throw */ }

    expect(getCode()).toBe(1);

    const errText = cap.getErr().join('\n');
    assert.ok(String(errText).includes('Hotfix cap: ≤3 per rolling 7-day window'));
    assert.ok(String(errText).includes('Currently 3 active'));

    // No new file created
    const newFile = path.join(repo.pendingDir, 'HOTFIX-004_fourth_fix.md');
    expect(fs.existsSync(newFile)).toBe(false);

    // Still only 3 files in pending-sync
    const hotfixFiles = fs
      .readdirSync(repo.pendingDir)
      .filter((f) => f.startsWith('HOTFIX-') && f.endsWith('.md'));
    assert.strictEqual((hotfixFiles).length, 3);
  });

  test('counts archive entries modified within 7 days toward the cap', () => {
    const repo = makeTmpRepo();
    tempRepos.push(repo.cleanup);

    // 1 in pending-sync
    fs.writeFileSync(
      path.join(repo.pendingDir, 'HOTFIX-001_existing.md'),
      '# stub',
      'utf8',
    );

    // 2 in archive with recent mtime (now)
    for (let i = 2; i <= 3; i++) {
      const archivePath = path.join(repo.archiveDir, `HOTFIX-00${i}_archived.md`);
      fs.writeFileSync(archivePath, `# archived ${i}`, 'utf8');
      // mtime defaults to now — definitely within 7 days
    }

    const { exitFn, getCode } = makeExitSeam();
    const cap = makeCapture();

    try {
      hotfixNewHandler(
        { slug: 'fourth-fix' },
        {
          cwd: repo.cwd,
          stdout: cap.stdout,
          stderr: cap.stderr,
          exit: exitFn,
        },
      );
    } catch { /* expected exit throw */ }

    expect(getCode()).toBe(1);
    expect(cap.getErr().join('\n')).toContain('Hotfix cap: ≤3 per rolling 7-day window');
  });
});

// ─── Scenario 4: template scaffold mirror byte-equality ──────────────────────
// Covered by template-stubs.test.ts after adding 'hotfix.md' to TEMPLATE_NAMES.
// This test confirms the live template path we copied above actually loads.
describe('Scenario 4 (coverage check): live template is readable and has required stubs', () => {
  test('live hotfix.md contains draft_tokens and cached_gate_result', () => {
    const content = fs.readFileSync(LIVE_TEMPLATE_PATH, 'utf8');
    assert.ok(String(content).includes('draft_tokens:'));
    assert.ok(String(content).includes('cached_gate_result:'));
    assert.ok(String(content).includes('lane: "hotfix"'));
  });
});

// ─── Scenario 5: wiki/index.md links to hotfix-ledger ────────────────────────

describe('Scenario 5: wiki/index.md has Hotfix Ledger section linking to hotfix-ledger.md', () => {
  test('wiki/index.md contains a "Hotfix Ledger" heading', () => {
    const wikiIndex = path.join(REPO_ROOT, '.cleargate', 'wiki', 'index.md');
    const content = fs.readFileSync(wikiIndex, 'utf8');
    assert.match(String(content), /## Hotfix Ledger/);
  });

  test('wiki/index.md links to topics/hotfix-ledger', () => {
    const wikiIndex = path.join(REPO_ROOT, '.cleargate', 'wiki', 'index.md');
    const content = fs.readFileSync(wikiIndex, 'utf8');
    assert.ok(String(content).includes('topics/hotfix-ledger'));
  });

  test('wiki/topics/hotfix-ledger.md exists with type: synthesis frontmatter', () => {
    const ledgerPage = path.join(REPO_ROOT, '.cleargate', 'wiki', 'topics', 'hotfix-ledger.md');
    expect(fs.existsSync(ledgerPage)).toBe(true);
    const content = fs.readFileSync(ledgerPage, 'utf8');
    assert.ok(String(content).includes('type: "synthesis"'));
    assert.ok(String(content).includes('id: "hotfix-ledger"'));
  });
});

// ─── Extra: slug validation ───────────────────────────────────────────────────

describe('Slug validation', () => {
  test('exits 1 with clear error on invalid slug', () => {
    const repo = makeTmpRepo();
    tempRepos.push(repo.cleanup);

    const { exitFn, getCode } = makeExitSeam();
    const cap = makeCapture();

    try {
      hotfixNewHandler(
        { slug: 'Invalid Slug With Spaces!' },
        {
          cwd: repo.cwd,
          stdout: cap.stdout,
          stderr: cap.stderr,
          exit: exitFn,
        },
      );
    } catch { /* expected exit throw */ }

    expect(getCode()).toBe(1);
    expect(cap.getErr().join('\n')).toContain('slug must match ^[a-z0-9-]+$');
  });
});
