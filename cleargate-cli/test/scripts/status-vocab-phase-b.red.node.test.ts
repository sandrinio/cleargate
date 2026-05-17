/**
 * status-vocab-phase-b.red.node.test.ts — QA-Red authored (STORY-067-02)
 *
 * Acceptance scenarios (STORY-067-02 §2.1 Gherkin + §4.1 quality gates):
 *
 *   Test 1 — repo-state assertion:
 *     `rg "status:\s*(Done|Verified)" .cleargate/delivery/` returns ZERO matches
 *     after Phase B (`--apply`) has run against the real delivery tree.
 *
 *   Test 2 — template status-vocab (8 live + 8 canonical):
 *     No remaining `status: Done` or `status: Verified` guidance lines in any
 *     of the 8 templates; every template lists "Completed" as terminal status.
 *
 *   Test 3 — npm payload parity:
 *     After `npm run prebuild`, `cleargate-cli/templates/cleargate-planning/
 *     .cleargate/templates/` is byte-for-byte identical to canonical
 *     `cleargate-planning/.cleargate/templates/`.
 *
 * BASELINE FAIL CONTRACT (RED phase — before STORY-067-02 Dev applies changes):
 *   Test 1 FAILS: ~114 archive files carry `status: Done` or `status: Verified`
 *                 today (confirmed 2026-05-18 via grep).
 *   Test 2 FAILS: Bug.md has `status: "Draft | Triaged | In Fix | Verified"`;
 *                 sprint_report.md has `Status: Done | Escalated | ...`.
 *   Test 3 PASSES vacuously today (templates unchanged, prebuild mirrors them as-is).
 *             The test guards against prebuild bugs AFTER Dev edits templates.
 *             See flashcard 2026-05-18 · #qa #red-test #vacuous-pass.
 *
 * Architect advisory risks (sprint-context Mid-Sprint Amendments 2026-05-18):
 *   (1) walk is non-recursive — subdirs of pending-sync/archive not traversed.
 *       Mitigated: tests use recursive glob (fs.readdirSync with recursive option)
 *       rather than relying on the script's walk; tests assert all .md files.
 *   (2) single-status-line break — only first frontmatter status: line is rewritten.
 *       Covered by: Test 1 counts ALL `status:` lines matching Done|Verified, not
 *       just the first per file.
 *   (3) dry-run audit pipe: out of scope for this test file (CI wiring concern).
 *   (4) exit-handler removal: covered by STORY-067-01 Red tests (lock cleanup).
 *
 * IMMUTABILITY: this file is sealed post-Red. Devs must NOT modify it.
 * Naming: *.red.node.test.ts — immutable per SKILL.md §C.3.
 */

import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ── Path resolution ──────────────────────────────────────────────────────────
// cleargate-cli/test/scripts/ → up 2 → cleargate-cli/
const CLI_ROOT = path.resolve(__dirname, '..', '..');
// cleargate-cli/ → up 1 → repo root
const REPO_ROOT = path.resolve(CLI_ROOT, '..');

const DELIVERY_ROOT = path.join(REPO_ROOT, '.cleargate', 'delivery');
const LIVE_TEMPLATES_DIR = path.join(REPO_ROOT, '.cleargate', 'templates');
const CANONICAL_TEMPLATES_DIR = path.join(
  REPO_ROOT,
  'cleargate-planning',
  '.cleargate',
  'templates',
);
const NPM_PAYLOAD_TEMPLATES_DIR = path.join(
  CLI_ROOT,
  'templates',
  'cleargate-planning',
  '.cleargate',
  'templates',
);

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Collect all .md files under a directory tree, recursively.
 * This is intentionally recursive (fixes advisory risk #1 — the migration
 * script's walk was non-recursive; these tests walk fully).
 */
function collectMdFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  const entries = fs.readdirSync(dir, { withFileTypes: true, recursive: true } as Parameters<typeof fs.readdirSync>[1]);
  const results: string[] = [];
  for (const entry of entries as fs.Dirent[]) {
    if (entry.isFile() && entry.name.endsWith('.md')) {
      // In Node 22+ recursive readdirSync, entry.path gives the directory.
      // Fall back to constructing from name if parentPath/path is undefined.
      const parentPath = (entry as unknown as { parentPath?: string; path?: string }).parentPath
        ?? (entry as unknown as { parentPath?: string; path?: string }).path
        ?? dir;
      results.push(path.join(parentPath, entry.name));
    }
  }
  return results;
}

/**
 * Count occurrences of a pattern across ALL lines in a file.
 * Advisory risk #2: multi-line frontmatter may have >1 status: line — we count
 * all of them, not just the first.
 */
function countPatternInFile(filePath: string, pattern: RegExp): number {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  return lines.filter((line) => pattern.test(line)).length;
}

/**
 * The 8 template filenames required by STORY-067-02 §1.2.
 */
const REQUIRED_TEMPLATE_NAMES = [
  'story.md',
  'Bug.md',
  'CR.md',
  'epic.md',
  'initiative.md',
  'Sprint Plan Template.md',
  'sprint_report.md',
  'hotfix.md',
] as const;

// ── TEST 1: Repo-state assertion ─────────────────────────────────────────────

describe('Test 1 — repo-state: zero Done/Verified status lines in delivery/', () => {
  it('pending-sync has no status: Done or status: Verified frontmatter lines', () => {
    const pendingSyncDir = path.join(DELIVERY_ROOT, 'pending-sync');
    const mdFiles = collectMdFiles(pendingSyncDir);

    // Pattern matches `status: Done` and `status: Verified` (bare and quoted).
    // Uses case-sensitive match — the frontmatter is always lowercase "status:".
    const DONE_VERIFIED_PATTERN = /^status:\s*["']?(Done|Verified)["']?\s*$/m;

    const offending: string[] = [];
    for (const filePath of mdFiles) {
      const count = countPatternInFile(filePath, /^status:\s*["']?(Done|Verified)["']?\s*$/);
      if (count > 0) {
        offending.push(`${path.relative(REPO_ROOT, filePath)} (${count} line(s))`);
      }
    }

    assert.deepStrictEqual(
      offending,
      [],
      `pending-sync still has Done/Verified status lines:\n  ${offending.join('\n  ')}\n` +
        `Run: node cleargate-cli/scripts/migrate-status-to-completed.mjs --apply`,
    );
  });

  it('archive has no status: Done or status: Verified frontmatter lines', () => {
    const archiveDir = path.join(DELIVERY_ROOT, 'archive');
    const mdFiles = collectMdFiles(archiveDir);

    const offending: string[] = [];
    for (const filePath of mdFiles) {
      const count = countPatternInFile(filePath, /^status:\s*["']?(Done|Verified)["']?\s*$/);
      if (count > 0) {
        offending.push(`${path.relative(REPO_ROOT, filePath)} (${count} line(s))`);
      }
    }

    assert.deepStrictEqual(
      offending,
      [],
      `archive still has Done/Verified status lines (${offending.length} file(s)):\n` +
        `  ${offending.slice(0, 10).join('\n  ')}` +
        (offending.length > 10 ? `\n  ... and ${offending.length - 10} more` : '') +
        '\nRun: node cleargate-cli/scripts/migrate-status-to-completed.mjs --apply',
    );
  });
});

// ── TEST 2: Template status-vocab ────────────────────────────────────────────

describe('Test 2 — template status-vocab: 8 live + 8 canonical use Completed only', () => {
  /**
   * For each template:
   *   - status: "Draft | ... | Verified" guidance MUST NOT contain "Verified"
   *   - "Status: Done | ..." guidance MUST NOT contain "Done" as a terminal status
   *   - Each template MUST contain "Completed" as a terminal status example
   *
   * We check the raw file for the forbidden tokens in status-guidance lines,
   * and for presence of "Completed".
   *
   * Intentionally written as a shared assertion function applied to both
   * live and canonical dirs so the two suites are symmetric.
   */
  function assertTemplateVocab(templateDir: string, label: string): void {
    for (const templateName of REQUIRED_TEMPLATE_NAMES) {
      const filePath = path.join(templateDir, templateName);

      it(`${label}/${templateName} — file exists`, () => {
        assert.ok(
          fs.existsSync(filePath),
          `Expected template file to exist: ${filePath}`,
        );
      });

      it(`${label}/${templateName} — no status: Verified guidance line`, () => {
        assert.ok(
          fs.existsSync(filePath),
          `File missing, cannot check vocab: ${filePath}`,
        );
        const content = fs.readFileSync(filePath, 'utf8');
        // Match status field values and Status: guidance lines that include "Verified"
        // e.g. `status: "Draft | Triaged | In Fix | Verified"`
        const lines = content.split('\n');
        const violatingLines = lines.filter((line) =>
          /status[:\s].*Verified/i.test(line),
        );
        assert.deepStrictEqual(
          violatingLines,
          [],
          `${templateName} still references "Verified" in a status-guidance line:\n` +
            `  ${violatingLines.join('\n  ')}\n` +
            `Replace "Verified" → "Completed" in ${filePath}`,
        );
      });

      it(`${label}/${templateName} — no "Status: Done" guidance line`, () => {
        assert.ok(
          fs.existsSync(filePath),
          `File missing, cannot check vocab: ${filePath}`,
        );
        const content = fs.readFileSync(filePath, 'utf8');
        const lines = content.split('\n');
        // Match guidance lines like `- **Status:** Done | Escalated | ...`
        // or `| Stories shipped (Done) |` — any status-section "Done" reference
        const violatingLines = lines.filter((line) =>
          /Status[:\s].*\bDone\b/i.test(line) || /status[:\s].*\bDone\b/.test(line),
        );
        assert.deepStrictEqual(
          violatingLines,
          [],
          `${templateName} still references "Done" in a status-guidance line:\n` +
            `  ${violatingLines.join('\n  ')}\n` +
            `Replace "Done" → "Completed" in ${filePath}`,
        );
      });

      it(`${label}/${templateName} — contains "Completed" as terminal status`, () => {
        assert.ok(
          fs.existsSync(filePath),
          `File missing, cannot check vocab: ${filePath}`,
        );
        const content = fs.readFileSync(filePath, 'utf8');
        assert.ok(
          content.includes('Completed'),
          `${templateName} does not mention "Completed" anywhere — ` +
            `add it as the terminal-status example in ${filePath}`,
        );
      });
    }
  }

  describe('live templates (.cleargate/templates/)', () => {
    assertTemplateVocab(LIVE_TEMPLATES_DIR, 'live');
  });

  describe('canonical templates (cleargate-planning/.cleargate/templates/)', () => {
    assertTemplateVocab(CANONICAL_TEMPLATES_DIR, 'canonical');
  });
});

// ── TEST 3: NPM payload parity ───────────────────────────────────────────────

describe('Test 3 — npm payload parity: prebuild produces byte-identical templates', () => {
  before(() => {
    // Run prebuild so npm payload reflects the current canonical templates.
    // This is a beforeAll-style setup: if prebuild fails the parity tests below
    // will also fail (files may be stale or absent).
    const result = spawnSync('npm', ['run', 'prebuild'], {
      cwd: CLI_ROOT,
      encoding: 'utf8',
      timeout: 60_000,
    });
    if (result.status !== 0) {
      // Surface the error — downstream assertions will fail indicating
      // prebuild failure prevented payload generation.
      console.error('prebuild failed (exit ' + String(result.status) + '):\n' + result.stderr);
    }
  });

  it('npm payload templates directory exists after prebuild', () => {
    assert.ok(
      fs.existsSync(NPM_PAYLOAD_TEMPLATES_DIR),
      `npm payload templates dir does not exist at ${NPM_PAYLOAD_TEMPLATES_DIR} — ` +
        `run \`npm run prebuild\` in cleargate-cli/`,
    );
  });

  for (const templateName of REQUIRED_TEMPLATE_NAMES) {
    it(`npm payload ${templateName} is byte-identical to canonical`, () => {
      const canonicalFile = path.join(CANONICAL_TEMPLATES_DIR, templateName);
      const payloadFile = path.join(NPM_PAYLOAD_TEMPLATES_DIR, templateName);

      assert.ok(
        fs.existsSync(canonicalFile),
        `Canonical template missing: ${canonicalFile}`,
      );
      assert.ok(
        fs.existsSync(payloadFile),
        `npm payload template missing: ${payloadFile} — run \`npm run prebuild\``,
      );

      const canonicalBytes = fs.readFileSync(canonicalFile);
      const payloadBytes = fs.readFileSync(payloadFile);

      assert.deepStrictEqual(
        payloadBytes.compare(canonicalBytes),
        0,
        `npm payload ${templateName} differs from canonical.\n` +
          `canonical: ${canonicalFile}\n` +
          `payload:   ${payloadFile}\n` +
          `Run \`npm run prebuild\` in cleargate-cli/ to regenerate.`,
      );
    });
  }
});
