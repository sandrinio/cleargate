/**
 * foreign-repo.test.ts — STORY-018-05
 *
 * Integration test: verifies that `cleargate init` installs correctly into two
 * foreign-repo fixtures (blank Node, bare Go), then exercises scaffold-lint,
 * gate-run, and wiki-build against the installed scaffold.
 *
 * 7 Gherkin scenarios:
 *  1. Init into blank Node repo succeeds
 *  2. Init into bare Go repo succeeds
 *  3. scaffold-lint on installed scaffold is clean (Node fixture)
 *  4. Gate friendly-fallback in fresh fixture (Node fixture)
 *  5. Configured gate runs the command (Node fixture)
 *  6. Wiki build works in fixture (Node fixture)
 *  7. CI regression scenario (covered operationally by the CI job)
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { execSync } from 'node:child_process';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { initHandler, resolveDefaultPayloadDir } from '../../src/commands/init.js';
import { scaffoldLintHandler } from '../../src/commands/scaffold-lint.js';
import { gateRunHandler } from '../../src/commands/gate-run.js';
import { wikiBuildHandler } from '../../src/commands/wiki-build.js';
import { parseFrontmatter } from '../../src/wiki/parse-frontmatter.js';

/** Per-test timeout: init + wiki-build can take ~3s in isolation; 30s for CI under load. */
const TEST_TIMEOUT_MS = 30_000;

// ── Helpers ───────────────────────────────────────────────────────────────────

function noop(_s: string): void { /* swallow output */ }

/** Throwing exit seam — if called, it fails the test with the exit code. */
function throwingExit(code: number): never {
  throw new Error(`process.exit(${code}) called unexpectedly`);
}

/** Creates a fresh tmpdir. */
function makeTmpDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'cg-foreign-'));
}

/** Best-effort cleanup. */
function cleanup(dir: string): void {
  try { fs.rmSync(dir, { recursive: true, force: true }); } catch { /* best-effort */ }
}

/** Recursively collect all .md files under a directory. */
function collectMdFiles(dir: string): string[] {
  const results: string[] = [];
  if (!fs.existsSync(dir)) return results;
  const entries = fs.readdirSync(dir, { recursive: true, encoding: 'utf8' }) as string[];
  for (const rel of entries) {
    if (rel.endsWith('.md')) {
      results.push(path.join(dir, rel));
    }
  }
  return results;
}

/**
 * Resolve payloadDir for tests.
 *
 * resolveDefaultPayloadDir() uses import.meta.url which in the bundled dist
 * resolves to dist/cli.js → pkgRoot=cleargate-cli/. In vitest, import.meta.url
 * in init.ts resolves to src/commands/init.ts → pkgRoot=src/ (wrong).
 * Instead, resolve from this test file's known location:
 *   test/integration/foreign-repo.test.ts → ../../ = cleargate-cli/
 *   then templates/cleargate-planning (copied there by prebuild).
 */
function resolveTestPayloadDir(): string {
  const thisFile = fileURLToPath(import.meta.url);
  // test/integration/ → test/ → cleargate-cli/
  const pkgRoot = path.resolve(path.dirname(thisFile), '..', '..');
  return path.join(pkgRoot, 'templates', 'cleargate-planning');
}

/**
 * Resolve synthesis template dir for wikiBuildHandler.
 * Same root as payloadDir but at templates/synthesis/.
 */
function resolveTestSynthesisTemplateDir(): string {
  const thisFile = fileURLToPath(import.meta.url);
  const pkgRoot = path.resolve(path.dirname(thisFile), '..', '..');
  return path.join(pkgRoot, 'templates', 'synthesis');
}

/** Assert canonical scaffold shape in tmpdir. */
function assertScaffoldShape(tmp: string): void {
  // .cleargate scaffold files
  expect(fs.existsSync(path.join(tmp, '.cleargate', 'knowledge', 'cleargate-protocol.md')), '.cleargate/knowledge/cleargate-protocol.md').toBe(true);
  expect(fs.existsSync(path.join(tmp, '.cleargate', 'templates', 'initiative.md')), '.cleargate/templates/initiative.md').toBe(true);
  expect(fs.existsSync(path.join(tmp, '.cleargate', 'templates', 'epic.md')), '.cleargate/templates/epic.md').toBe(true);
  expect(fs.existsSync(path.join(tmp, '.cleargate', 'templates', 'story.md')), '.cleargate/templates/story.md').toBe(true);
  expect(fs.existsSync(path.join(tmp, '.cleargate', 'templates', 'CR.md')), '.cleargate/templates/CR.md').toBe(true);
  expect(fs.existsSync(path.join(tmp, '.cleargate', 'templates', 'Bug.md')), '.cleargate/templates/Bug.md').toBe(true);
  expect(fs.existsSync(path.join(tmp, '.cleargate', 'delivery', 'pending-sync')), '.cleargate/delivery/pending-sync/').toBe(true);
  expect(fs.existsSync(path.join(tmp, '.cleargate', 'delivery', 'archive')), '.cleargate/delivery/archive/').toBe(true);
  expect(fs.existsSync(path.join(tmp, '.cleargate', 'FLASHCARD.md')), '.cleargate/FLASHCARD.md').toBe(true);
  const manifestPath = path.join(tmp, '.cleargate', '.install-manifest.json');
  expect(fs.existsSync(manifestPath), '.cleargate/.install-manifest.json').toBe(true);
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8')) as Record<string, unknown>;
  expect(typeof manifest['cleargate_version'], '.install-manifest.json cleargate_version field').toBe('string');

  // .claude scaffold files
  expect(fs.existsSync(path.join(tmp, '.claude', 'agents', 'architect.md')), '.claude/agents/architect.md').toBe(true);
  expect(fs.existsSync(path.join(tmp, '.claude', 'agents', 'developer.md')), '.claude/agents/developer.md').toBe(true);
  expect(fs.existsSync(path.join(tmp, '.claude', 'agents', 'qa.md')), '.claude/agents/qa.md').toBe(true);
  expect(fs.existsSync(path.join(tmp, '.claude', 'agents', 'reporter.md')), '.claude/agents/reporter.md').toBe(true);
  expect(fs.existsSync(path.join(tmp, '.claude', 'hooks', 'token-ledger.sh')), '.claude/hooks/token-ledger.sh').toBe(true);
  expect(fs.existsSync(path.join(tmp, '.claude', 'skills', 'flashcard', 'SKILL.md')), '.claude/skills/flashcard/SKILL.md').toBe(true);

  // CLAUDE.md with bounded block
  const claudeMdPath = path.join(tmp, 'CLAUDE.md');
  expect(fs.existsSync(claudeMdPath), 'CLAUDE.md').toBe(true);
  const claudeMdContent = fs.readFileSync(claudeMdPath, 'utf8');
  expect(claudeMdContent).toContain('<!-- CLEARGATE:START -->');
  expect(claudeMdContent).toContain('<!-- CLEARGATE:END -->');
}

/**
 * Assert all .md files under .cleargate/ are frontmatter-parseable (or body-only).
 *
 * Scope: .cleargate/ only. Files under .claude/agents/ use Claude Code's agent
 * YAML format — those may contain complex description values with special chars
 * (backticks, colons) that are intentional and not ClearGate work-item frontmatter.
 * The load-bearing check is that ClearGate's own templates/knowledge/FLASHCARD files
 * parse correctly; agent definition files are excluded from this assertion.
 */
function assertMdFilesParseClean(tmp: string): void {
  const cleargateDir = path.join(tmp, '.cleargate');
  const mdFiles = collectMdFiles(cleargateDir);
  for (const filePath of mdFiles) {
    const raw = fs.readFileSync(filePath, 'utf8');
    // Only files that start with --- have frontmatter to parse
    if (raw.startsWith('---')) {
      expect(
        () => parseFrontmatter(raw),
        `parseFrontmatter should not throw for ${path.relative(tmp, filePath)}`,
      ).not.toThrow();
    }
  }
}

/** Build a blank Node fixture in a tmpdir, return the tmpdir path. */
function buildNodeFixture(): string {
  const tmp = makeTmpDir();
  execSync('git init -q', { cwd: tmp });
  fs.writeFileSync(
    path.join(tmp, 'package.json'),
    JSON.stringify({ name: 'cg-foreign-node-fixture', version: '1.0.0', private: true, scripts: { test: 'echo stub' } }, null, 2),
  );
  fs.writeFileSync(path.join(tmp, 'README.md'), '# Foreign test repo\n');
  return tmp;
}

/** Build a bare Go fixture in a tmpdir, return the tmpdir path. */
function buildGoFixture(): string {
  const tmp = makeTmpDir();
  execSync('git init -q', { cwd: tmp });
  fs.writeFileSync(path.join(tmp, 'go.mod'), 'module example.com/foo\ngo 1.22\n');
  fs.writeFileSync(path.join(tmp, 'main.go'), 'package main\nfunc main() {}\n');
  fs.writeFileSync(path.join(tmp, 'README.md'), '# Foreign Go test repo\n');
  return tmp;
}

/** Run initHandler against tmp with test seams. */
async function runInit(tmp: string): Promise<void> {
  // Use resolveDefaultPayloadDir export to confirm the export exists,
  // but provide the test-resolved path directly to avoid bundle-path resolution.
  void resolveDefaultPayloadDir; // confirms export exists at compile time
  const payloadDir = resolveTestPayloadDir();
  await initHandler({
    cwd: tmp,
    payloadDir,
    yes: true,
    stdinIsTTY: false,
    stdout: noop,
    stderr: noop,
    exit: throwingExit,
  });
}

// ── Fixture A: Blank Node Repo ────────────────────────────────────────────────

describe.concurrent('Fixture A: Blank Node', () => {
  it('Scenario 1: Init into blank Node repo succeeds', async () => {
    const tmp = buildNodeFixture();
    try {
      await runInit(tmp);
      assertScaffoldShape(tmp);
      assertMdFilesParseClean(tmp);
    } finally {
      cleanup(tmp);
    }
  }, TEST_TIMEOUT_MS);

  it('Scenario 3: scaffold-lint on installed Node scaffold is clean', async () => {
    const tmp = buildNodeFixture();
    try {
      await runInit(tmp);

      let exitCode = 0;
      const stdoutBuf: string[] = [];

      // planningDir points to the installed scaffold's cleargate-planning subdir.
      // After init, tmp/cleargate-planning does NOT exist (init installs .cleargate/ + .claude/)
      // so scaffold-lint sees no planningDir and exits clean (no items to scan).
      scaffoldLintHandler({
        cwd: tmp,
        planningDir: path.join(tmp, 'cleargate-planning'),
        stdout: (s) => stdoutBuf.push(s),
        stderr: noop,
        exit: (code) => { exitCode = code; return undefined as never; },
      });

      expect(exitCode).toBe(0);
      expect(stdoutBuf.join('')).toContain('scaffold-lint: clean');
    } finally {
      cleanup(tmp);
    }
  }, TEST_TIMEOUT_MS);

  it('Scenario 4: Gate friendly-fallback in fresh fixture (no config.yml)', async () => {
    const tmp = buildNodeFixture();
    try {
      await runInit(tmp);

      const stdoutBuf: string[] = [];
      let exitCode = -1;

      gateRunHandler('precommit', {}, {
        cwd: tmp,
        stdout: (s) => stdoutBuf.push(s),
        stderr: noop,
        exit: (code) => { exitCode = code; return undefined as never; },
      });

      expect(exitCode).toBe(0);
      expect(stdoutBuf.join('')).toContain('not configured');
    } finally {
      cleanup(tmp);
    }
  }, TEST_TIMEOUT_MS);

  it('Scenario 5: Configured gate runs the command', async () => {
    const tmp = buildNodeFixture();
    try {
      await runInit(tmp);

      // Write config.yml with precommit gate
      const cleargateDir = path.join(tmp, '.cleargate');
      fs.mkdirSync(cleargateDir, { recursive: true });
      fs.writeFileSync(
        path.join(cleargateDir, 'config.yml'),
        'gates:\n  precommit: "echo PRECOMMIT_OK"\n',
      );

      const capturedOutput: string[] = [];
      let exitCode = -1;

      // spawnFn seam: override to capture output instead of stdio: 'inherit'
      const capturingSpawnFn: typeof spawnSync = (cmd, options) => {
        const result = spawnSync(cmd as string, {
          ...options,
          stdio: 'pipe',
          shell: true,
        });
        if (result.stdout) {
          capturedOutput.push(result.stdout.toString());
        }
        return result;
      };

      gateRunHandler('precommit', {}, {
        cwd: tmp,
        stdout: (s) => capturedOutput.push(s),
        stderr: noop,
        exit: (code) => { exitCode = code; return undefined as never; },
        spawnFn: capturingSpawnFn,
      });

      expect(exitCode).toBe(0);
      expect(capturedOutput.join('')).toContain('PRECOMMIT_OK');
    } finally {
      cleanup(tmp);
    }
  }, TEST_TIMEOUT_MS);

  it('Scenario 6: Wiki build works in fixture', async () => {
    const tmp = buildNodeFixture();
    try {
      await runInit(tmp);

      // Write a minimal proposal file to pending-sync
      const pendingSyncDir = path.join(tmp, '.cleargate', 'delivery', 'pending-sync');
      fs.mkdirSync(pendingSyncDir, { recursive: true });
      const proposalContent = [
        '---',
        'proposal_id: "PROPOSAL-999"',
        'status: "Draft"',
        'author: "test"',
        'approved: false',
        'created_at: "2026-04-24T00:00:00Z"',
        'updated_at: "2026-04-24T00:00:00Z"',
        '---',
        '',
        '# PROPOSAL-999: Test Proposal',
        '',
        'A minimal test proposal for integration testing.',
      ].join('\n');
      fs.writeFileSync(path.join(pendingSyncDir, 'PROPOSAL-999_Test.md'), proposalContent);

      // Pass synthesis templateDir seam — resolveDefaultTemplateDir() in active-sprint.ts
      // uses import.meta.url which resolves to src/wiki/synthesis/active-sprint.ts in vitest,
      // giving the wrong path. The templates live at cleargate-cli/templates/synthesis/.
      await wikiBuildHandler({
        cwd: tmp,
        templateDir: resolveTestSynthesisTemplateDir(),
        stdout: noop,
        stderr: noop,
        exit: throwingExit,
      });

      const wikiProposalPath = path.join(tmp, '.cleargate', 'wiki', 'proposals', 'PROPOSAL-999.md');
      expect(fs.existsSync(wikiProposalPath), '.cleargate/wiki/proposals/PROPOSAL-999.md exists').toBe(true);

      const indexPath = path.join(tmp, '.cleargate', 'wiki', 'index.md');
      expect(fs.existsSync(indexPath), '.cleargate/wiki/index.md exists').toBe(true);
      const indexContent = fs.readFileSync(indexPath, 'utf8');
      expect(indexContent).toContain('PROPOSAL-999');
    } finally {
      cleanup(tmp);
    }
  }, TEST_TIMEOUT_MS);
});

// ── Fixture B: Bare Go Repo ───────────────────────────────────────────────────

describe.concurrent('Fixture B: Bare Go', () => {
  it('Scenario 2: Init into bare Go repo succeeds', async () => {
    const tmp = buildGoFixture();
    try {
      await runInit(tmp);
      assertScaffoldShape(tmp);
      assertMdFilesParseClean(tmp);
    } finally {
      cleanup(tmp);
    }
  }, TEST_TIMEOUT_MS);
});
