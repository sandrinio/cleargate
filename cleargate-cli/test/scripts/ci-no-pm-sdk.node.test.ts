/**
 * ci-no-pm-sdk.node.test.ts — STORY-027-05 acceptance tests
 *
 * Gherkin scenarios covered:
 *   Scenario 1: CI build fails on forbidden PM-SDK import in CLI
 *   Scenario 2: CI build passes on adapter file in mcp/src/adapters (excluded by glob)
 *   Scenario 3: Comment mention of forbidden pattern not flagged
 *   Scenario 4: cleargate-protocol.md has Type & Payload Contract section
 *   Scenario 5: cleargate-protocol.md has Codebase / PM-Tool Boundary section
 *   Scenario 6: CLAUDE.md bounded block summarizes the rule (both copies identical + ≤200 words)
 *   Scenario 7: package.json exposes check:no-pm-sdk script
 *   Scenario 8: schema.ts type-column comment updated
 *
 * Node.test-pattern: spawnSync the script — no wrapScript; use raw node path.
 * env override pattern: set cwd + env.NODE_TEST_CONTEXT delete for nested tsx spawns.
 */
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// cleargate-cli/test/scripts/ → up 3 → repo root
const REPO_ROOT = path.resolve(__dirname, '..', '..', '..');
const SCRIPT_PATH = path.join(REPO_ROOT, 'scripts', 'ci-no-pm-sdk.mjs');

function runScript(rootOverride?: string): { status: number; stdout: string; stderr: string } {
  const env = { ...process.env };
  // Avoid nested test context masking exit codes
  delete env['NODE_TEST_CONTEXT'];
  if (rootOverride) {
    env['CG_SDK_CHECK_ROOT'] = rootOverride;
  } else {
    // Default: run against the actual repo root
    env['CG_SDK_CHECK_ROOT'] = REPO_ROOT;
  }
  const result = spawnSync(process.execPath, [SCRIPT_PATH], {
    cwd: REPO_ROOT,
    encoding: 'utf8',
    timeout: 15_000,
    env,
  });
  return {
    status: result.status ?? -1,
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
  };
}

describe('ci-no-pm-sdk.mjs — STORY-027-05', () => {

  describe('Scenario 1: CI exits 0 on clean source tree', () => {
    it('exits 0 and prints no forbidden import message on the real repo', () => {
      const result = runScript();
      assert.strictEqual(
        result.status,
        0,
        `Expected exit 0 on clean tree but got ${result.status}.\nstdout: ${result.stdout}\nstderr: ${result.stderr}`,
      );
      assert.ok(
        result.stdout.includes('✓ no forbidden PM-SDK imports'),
        `Expected success message but got: ${result.stdout}`,
      );
    });
  });

  describe('Scenario 2: CI exits 1 on forbidden @linear/sdk import in cleargate-cli/src', () => {
    let tmpDir: string;
    let fixtureSrc: string;
    let fixtureFile: string;

    before(() => {
      // Create a minimal repo-like structure: cleargate-cli/src/ with a fixture file
      tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cg-sdk-test-'));
      fixtureSrc = path.join(tmpDir, 'cleargate-cli', 'src');
      fs.mkdirSync(fixtureSrc, { recursive: true });
      fixtureFile = path.join(fixtureSrc, 'forbidden-fixture.ts');
      fs.writeFileSync(fixtureFile, `import { LinearClient } from '@linear/sdk';\nexport const x = 1;\n`);
      // Also create an empty .claude dir so the glob doesn't fail
      fs.mkdirSync(path.join(tmpDir, '.claude'), { recursive: true });
    });

    after(() => {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    });

    it('exits 1 and names the file and forbidden pattern', () => {
      const result = runScript(tmpDir);  // tmpDir passed as CG_SDK_CHECK_ROOT
      assert.strictEqual(
        result.status,
        1,
        `Expected exit 1 on forbidden import but got ${result.status}.\nstdout: ${result.stdout}`,
      );
      assert.ok(
        result.stdout.includes("forbidden import '@linear/sdk'"),
        `Expected forbidden import message in stdout but got: ${result.stdout}`,
      );
      assert.ok(
        result.stdout.includes('cleargate-cli/src/forbidden-fixture.ts'),
        `Expected filename in stdout but got: ${result.stdout}`,
      );
      assert.ok(
        result.stdout.includes('cleargate-protocol.md §Codebase/PM-Tool Boundary'),
        `Expected protocol.md reference in stdout but got: ${result.stdout}`,
      );
    });
  });

  describe('Scenario 3: CI exits 1 on forbidden jira-client import in .claude hooks', () => {
    let tmpDir: string;

    before(() => {
      tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cg-sdk-test-jira-'));
      // Create the .claude/hooks/ surface
      const claudeHooks = path.join(tmpDir, '.claude', 'hooks');
      fs.mkdirSync(claudeHooks, { recursive: true });
      fs.writeFileSync(
        path.join(claudeHooks, 'forbidden.ts'),
        `import jira from 'jira-client';\nconsole.log(jira);\n`,
      );
      // Empty cleargate-cli/src to keep the glob happy
      fs.mkdirSync(path.join(tmpDir, 'cleargate-cli', 'src'), { recursive: true });
    });

    after(() => {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    });

    it('exits 1 and names the .claude file and jira-client pattern', () => {
      const result = runScript(tmpDir);
      assert.strictEqual(
        result.status,
        1,
        `Expected exit 1 but got ${result.status}.\nstdout: ${result.stdout}`,
      );
      assert.ok(
        result.stdout.includes("forbidden import 'jira-client'"),
        `Expected jira-client mention but got: ${result.stdout}`,
      );
      assert.ok(
        result.stdout.includes('.claude/hooks/forbidden.ts'),
        `Expected .claude file in output but got: ${result.stdout}`,
      );
    });
  });

  describe('Scenario 4: mcp/src/adapters is not scanned (excluded by glob)', () => {
    let tmpDir: string;

    before(() => {
      tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cg-sdk-adapter-'));
      // Create mcp/src/adapters with a file that would be forbidden if scanned
      const adaptersDir = path.join(tmpDir, 'mcp', 'src', 'adapters');
      fs.mkdirSync(adaptersDir, { recursive: true });
      fs.writeFileSync(
        path.join(adaptersDir, 'linear-adapter.ts'),
        `import { LinearClient } from '@linear/sdk';\nexport const adapter = new LinearClient({});\n`,
      );
      // Empty cleargate-cli/src and .claude so no other hits
      fs.mkdirSync(path.join(tmpDir, 'cleargate-cli', 'src'), { recursive: true });
      fs.mkdirSync(path.join(tmpDir, '.claude'), { recursive: true });
    });

    after(() => {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    });

    it('exits 0 because mcp/src/adapters is not in the scanned glob', () => {
      const result = runScript(tmpDir);
      assert.strictEqual(
        result.status,
        0,
        `Expected exit 0 (adapter excluded) but got ${result.status}.\nstdout: ${result.stdout}`,
      );
      assert.ok(
        result.stdout.includes('✓ no forbidden PM-SDK imports'),
        `Expected success message but got: ${result.stdout}`,
      );
    });
  });

  describe('Scenario 5: Comment mention of forbidden pattern is not flagged', () => {
    let tmpDir: string;

    before(() => {
      tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cg-sdk-comment-'));
      const srcDir = path.join(tmpDir, 'cleargate-cli', 'src');
      fs.mkdirSync(srcDir, { recursive: true });
      fs.writeFileSync(
        path.join(srcDir, 'bar.ts'),
        `// previously used @linear/sdk; now uses MCP\nexport const x = 1;\n`,
      );
      fs.mkdirSync(path.join(tmpDir, '.claude'), { recursive: true });
    });

    after(() => {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    });

    it('exits 0 because comment lines are not import statements', () => {
      const result = runScript(tmpDir);
      assert.strictEqual(
        result.status,
        0,
        `Expected exit 0 on comment-only mention but got ${result.status}.\nstdout: ${result.stdout}`,
      );
    });
  });

  describe('Scenario 6: cleargate-protocol.md has Type & Payload Contract section', () => {
    it('contains ## Type & Payload Contract H2 section', () => {
      const protocolPath = path.join(REPO_ROOT, '.cleargate', 'knowledge', 'cleargate-protocol.md');
      const content = fs.readFileSync(protocolPath, 'utf8');
      assert.ok(
        content.includes('## Type & Payload Contract'),
        'cleargate-protocol.md must contain "## Type & Payload Contract" H2 section',
      );
    });

    it('documents KNOWN_TYPES in Type & Payload Contract', () => {
      const protocolPath = path.join(REPO_ROOT, '.cleargate', 'knowledge', 'cleargate-protocol.md');
      const content = fs.readFileSync(protocolPath, 'utf8');
      assert.ok(content.includes('KNOWN_TYPES'), 'Must document KNOWN_TYPES');
      assert.ok(content.includes('RESERVED_PAYLOAD_KEYS'), 'Must document RESERVED_PAYLOAD_KEYS');
      assert.ok(content.includes('payload.origin'), 'Must document payload.origin');
      assert.ok(content.includes('cleargate_id'), 'Must document cleargate_id formats');
      assert.ok(content.includes('errorCode'), 'Must document errorCode taxonomy');
      assert.ok(content.includes('warningCode'), 'Must document warningCode taxonomy');
    });
  });

  describe('Scenario 7: cleargate-protocol.md has Codebase / PM-Tool Boundary section', () => {
    it('contains ## Codebase / PM-Tool Boundary H2 section', () => {
      const protocolPath = path.join(REPO_ROOT, '.cleargate', 'knowledge', 'cleargate-protocol.md');
      const content = fs.readFileSync(protocolPath, 'utf8');
      assert.ok(
        content.includes('## Codebase / PM-Tool Boundary'),
        'cleargate-protocol.md must contain "## Codebase / PM-Tool Boundary" H2 section',
      );
    });

    it('names cleargate-cli/src/**, .claude/**, mcp/src/adapters/ in the boundary section', () => {
      const protocolPath = path.join(REPO_ROOT, '.cleargate', 'knowledge', 'cleargate-protocol.md');
      const content = fs.readFileSync(protocolPath, 'utf8');
      assert.ok(content.includes('cleargate-cli/src/**'), 'Must name cleargate-cli/src/**');
      assert.ok(content.includes('.claude/**'), 'Must name .claude/**');
      assert.ok(content.includes('mcp/src/adapters/'), 'Must name mcp/src/adapters/');
    });
  });

  describe('Scenario 8: CLAUDE.md bounded block contains the boundary paragraph and is ≤200 words', () => {
    function extractBoundedBlock(content: string): string {
      const start = content.indexOf('<!-- CLEARGATE:START -->');
      const end = content.indexOf('<!-- CLEARGATE:END -->');
      if (start === -1 || end === -1) return '';
      return content.slice(start, end + '<!-- CLEARGATE:END -->'.length);
    }

    it('CLAUDE.md contains a sentence referencing the codebase/PM-tool boundary rule', () => {
      const claudePath = path.join(REPO_ROOT, 'CLAUDE.md');
      const block = extractBoundedBlock(fs.readFileSync(claudePath, 'utf8'));
      assert.ok(
        block.includes('PM-Tool Boundary') || block.includes('PM-tool SDK'),
        'CLAUDE.md bounded block must reference the PM-tool boundary rule',
      );
      assert.ok(
        block.includes('cleargate-protocol.md'),
        'CLAUDE.md bounded block must cross-reference cleargate-protocol.md',
      );
    });

    it('canonical cleargate-planning/CLAUDE.md bounded block is identical to live CLAUDE.md bounded block', () => {
      const livePath = path.join(REPO_ROOT, 'CLAUDE.md');
      const canonicalPath = path.join(REPO_ROOT, 'cleargate-planning', 'CLAUDE.md');
      const liveBlock = extractBoundedBlock(fs.readFileSync(livePath, 'utf8'));
      const canonicalBlock = extractBoundedBlock(fs.readFileSync(canonicalPath, 'utf8'));
      assert.strictEqual(
        liveBlock,
        canonicalBlock,
        'Live CLAUDE.md and cleargate-planning/CLAUDE.md bounded blocks must be identical',
      );
    });

    it('CLAUDE.md Codebase/PM-Tool Boundary paragraph is under 200 words', () => {
      const claudePath = path.join(REPO_ROOT, 'CLAUDE.md');
      const lines = fs.readFileSync(claudePath, 'utf8').split('\n');
      const paragraphLine = lines.find((l) => l.includes('**Codebase / PM-Tool Boundary'));
      assert.ok(
        paragraphLine !== undefined,
        'Could not find Codebase / PM-Tool Boundary paragraph line in CLAUDE.md',
      );
      const wordCount = paragraphLine.split(/\s+/).filter(Boolean).length;
      assert.ok(
        wordCount <= 200,
        `Paragraph must be ≤200 words but found ${wordCount} words: ${paragraphLine.slice(0, 100)}...`,
      );
    });
  });

  describe('Scenario 9: package.json exposes check:no-pm-sdk script', () => {
    it('root package.json has "check:no-pm-sdk" mapped to "node scripts/ci-no-pm-sdk.mjs"', () => {
      const pkgPath = path.join(REPO_ROOT, 'package.json');
      const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
      assert.ok(
        pkg.scripts && pkg.scripts['check:no-pm-sdk'],
        'package.json must have check:no-pm-sdk script',
      );
      assert.strictEqual(
        pkg.scripts['check:no-pm-sdk'],
        'node scripts/ci-no-pm-sdk.mjs',
        'check:no-pm-sdk must map to "node scripts/ci-no-pm-sdk.mjs"',
      );
    });
  });

  describe('Scenario 10: schema.ts type-column comment updated', () => {
    it('mcp/src/db/schema.ts type column comment says "Open vocabulary: lowercase-kebab"', () => {
      // mcp/ is a nested repo — find it relative to REPO_ROOT
      const schemaPath = path.join(REPO_ROOT, 'mcp', 'src', 'db', 'schema.ts');
      if (!fs.existsSync(schemaPath)) {
        // mcp/ may not exist in worktree checkouts; skip gracefully
        return;
      }
      const content = fs.readFileSync(schemaPath, 'utf8');
      assert.ok(
        content.includes('Open vocabulary: lowercase-kebab'),
        'schema.ts type column comment must say "Open vocabulary: lowercase-kebab"',
      );
      assert.ok(
        content.includes('KNOWN_TYPES'),
        'schema.ts type column comment must reference KNOWN_TYPES',
      );
    });
  });
});
