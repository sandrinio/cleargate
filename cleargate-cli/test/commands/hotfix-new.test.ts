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
 * Test design: pure filesystem fixtures + exit seam. No vi.mock — avoids the
 * vi.mock hoisting pitfall (FLASHCARD #cli #vitest #vi-mock-hoisting 2026-04-18).
 * The `cwd` seam injects a tmpdir so all filesystem reads/writes are isolated.
 */

import { describe, it, expect, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { hotfixNewHandler } from '../../src/commands/hotfix.js';

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
  it('creates HOTFIX-001_copy_fix.md with correct frontmatter and sections', () => {
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
    expect(content).toContain('hotfix_id: "HOTFIX-001"');
    expect(content).toContain('lane: "hotfix"');
    expect(content).toContain('status: "Draft"');
    expect(content).toContain(`created_at: "${iso}"`);

    // Section structure assertions
    expect(content).toContain('## 1. Anomaly');
    expect(content).toContain('## 2. Files Touched');
    expect(content).toContain('## 3. Verification Steps');
    expect(content).toContain('## 4. Rollback');

    // §3 is non-empty (has at least one checkbox placeholder)
    expect(content).toMatch(/## 3\. Verification Steps[\s\S]+- \[ \]/);

    // §4 is non-empty
    expect(content).toMatch(/## 4\. Rollback[\s\S]+\S/);

    // Slug substituted
    expect(content).toContain('copy-fix');

    // No leftover {SLUG} placeholder
    expect(content).not.toContain('{SLUG}');
    // No leftover {ISO} placeholder
    expect(content).not.toContain('{ISO}');
    // No leftover {ID} placeholder
    expect(content).not.toContain('{ID}');
  });
});

// ─── Scenario 2: increments ID ───────────────────────────────────────────────

describe('Scenario 2: ID increments when HOTFIX-001 already exists', () => {
  it('creates HOTFIX-002_another_fix.md; HOTFIX-001 is unchanged', () => {
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
    expect(newContent).toContain('hotfix_id: "HOTFIX-002"');
    expect(newContent).toContain('another-fix');

    // HOTFIX-001 must be unchanged
    expect(fs.readFileSync(oldFile, 'utf8')).toBe(sentinel);
  });
});

// ─── Scenario 3: cap blocks 4th ──────────────────────────────────────────────

describe('Scenario 3: cap blocks 4th hotfix in rolling 7-day window', () => {
  it('exits 1 with cap message; no new file created', () => {
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
    expect(errText).toContain('Hotfix cap: ≤3 per rolling 7-day window');
    expect(errText).toContain('Currently 3 active');

    // No new file created
    const newFile = path.join(repo.pendingDir, 'HOTFIX-004_fourth_fix.md');
    expect(fs.existsSync(newFile)).toBe(false);

    // Still only 3 files in pending-sync
    const hotfixFiles = fs
      .readdirSync(repo.pendingDir)
      .filter((f) => f.startsWith('HOTFIX-') && f.endsWith('.md'));
    expect(hotfixFiles).toHaveLength(3);
  });

  it('counts archive entries modified within 7 days toward the cap', () => {
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
  it('live hotfix.md contains draft_tokens and cached_gate_result', () => {
    const content = fs.readFileSync(LIVE_TEMPLATE_PATH, 'utf8');
    expect(content).toContain('draft_tokens:');
    expect(content).toContain('cached_gate_result:');
    expect(content).toContain('lane: "hotfix"');
  });
});

// ─── Scenario 5: wiki/index.md links to hotfix-ledger ────────────────────────

describe('Scenario 5: wiki/index.md has Hotfix Ledger section linking to hotfix-ledger.md', () => {
  it('wiki/index.md contains a "Hotfix Ledger" heading', () => {
    const wikiIndex = path.join(REPO_ROOT, '.cleargate', 'wiki', 'index.md');
    const content = fs.readFileSync(wikiIndex, 'utf8');
    expect(content).toMatch(/## Hotfix Ledger/);
  });

  it('wiki/index.md links to topics/hotfix-ledger', () => {
    const wikiIndex = path.join(REPO_ROOT, '.cleargate', 'wiki', 'index.md');
    const content = fs.readFileSync(wikiIndex, 'utf8');
    expect(content).toContain('topics/hotfix-ledger');
  });

  it('wiki/topics/hotfix-ledger.md exists with type: synthesis frontmatter', () => {
    const ledgerPage = path.join(REPO_ROOT, '.cleargate', 'wiki', 'topics', 'hotfix-ledger.md');
    expect(fs.existsSync(ledgerPage)).toBe(true);
    const content = fs.readFileSync(ledgerPage, 'utf8');
    expect(content).toContain('type: "synthesis"');
    expect(content).toContain('id: "hotfix-ledger"');
  });
});

// ─── Extra: slug validation ───────────────────────────────────────────────────

describe('Slug validation', () => {
  it('exits 1 with clear error on invalid slug', () => {
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
