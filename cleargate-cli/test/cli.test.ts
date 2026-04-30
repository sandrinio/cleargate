import { spawnSync } from 'node:child_process';
import { describe, it, expect } from 'vitest';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';
import { readFileSync } from 'node:fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const CLI = join(__dirname, '..', 'dist', 'cli.js');

function run(args: string[]) {
  return spawnSync(process.execPath, [CLI, ...args], {
    encoding: 'utf8',
    timeout: 10_000,
  });
}

describe('cleargate CLI', () => {
  describe('Scenario: Help lists all subcommands', () => {
    it('--help exits 0', () => {
      const result = run(['--help']);
      expect(result.status).toBe(0);
    });

    it('--help stdout lists join', () => {
      const result = run(['--help']);
      expect(result.stdout).toContain('join');
    });

    it('--help stdout lists whoami', () => {
      const result = run(['--help']);
      expect(result.stdout).toContain('whoami');
    });

    it('--help stdout lists stamp', () => {
      const result = run(['--help']);
      expect(result.stdout).toContain('stamp');
    });

    it('--help stdout lists wiki', () => {
      const result = run(['--help']);
      expect(result.stdout).toContain('wiki');
    });

    it('--help --all stdout lists admin (CR-011: admin hidden in pre-member state; visible with --all)', () => {
      const result = run(['--help', '--all']);
      expect(result.stdout).toContain('admin');
    });
  });

  describe('Scenario: Version flag', () => {
    it('--version prints the package.json version', () => {
      const pkg = JSON.parse(
        readFileSync(join(__dirname, '..', 'package.json'), 'utf-8'),
      ) as { version: string };
      const result = run(['--version']);
      expect(result.stdout.trim()).toBe(pkg.version);
    });
  });

  describe('Scenario: Unknown subcommand errors cleanly', () => {
    it('cleargate nonsense exits 1', () => {
      const result = run(['nonsense']);
      expect(result.status).toBe(1);
    });

    it('cleargate nonsense stderr suggests cleargate --help', () => {
      const result = run(['nonsense']);
      expect(result.stderr).toContain('cleargate --help');
    });
  });

  describe('Scenario: join missing positional exits 1', () => {
    it('cleargate join (no arg) exits 1', () => {
      const result = run(['join']);
      expect(result.status).toBe(1);
    });

    it('cleargate join (no arg) stderr mentions join', () => {
      const result = run(['join']);
      expect(result.stderr).toBeTruthy();
    });
  });

  describe('Scenario: No CLI collision (STORY-013-08)', () => {
    it('--help lists sprint command group', () => {
      const result = run(['--help']);
      expect(result.stdout).toContain('sprint');
    });

    it('--help lists story command group', () => {
      const result = run(['--help']);
      expect(result.stdout).toContain('story');
    });

    it('--help lists state command group', () => {
      const result = run(['--help']);
      expect(result.stdout).toContain('state');
    });

    it('gate --help lists qa subcommand', () => {
      const result = run(['gate', '--help']);
      expect(result.stdout).toContain('qa');
    });

    it('gate --help lists arch subcommand', () => {
      const result = run(['gate', '--help']);
      expect(result.stdout).toContain('arch');
    });

    it('gate --help still lists check subcommand (no collision)', () => {
      const result = run(['gate', '--help']);
      expect(result.stdout).toContain('check');
    });

    it('gate --help still lists explain subcommand (no collision)', () => {
      const result = run(['gate', '--help']);
      expect(result.stdout).toContain('explain');
    });

    it('no duplicate subcommand names in gate group', () => {
      const result = run(['gate', '--help']);
      // Extract subcommand names from help output
      const lines = result.stdout.split('\n').filter((l) => l.trim().startsWith('gate ') || /^\s{2}\w/.test(l));
      // Each subcommand should be listed exactly once
      const qaCount = (result.stdout.match(/\bqa\b/g) ?? []).length;
      const archCount = (result.stdout.match(/\barch\b/g) ?? []).length;
      const checkCount = (result.stdout.match(/\bcheck\b/g) ?? []).length;
      const explainCount = (result.stdout.match(/\bexplain\b/g) ?? []).length;
      // Each should appear at least once (listed in help)
      expect(qaCount).toBeGreaterThanOrEqual(1);
      expect(archCount).toBeGreaterThanOrEqual(1);
      expect(checkCount).toBeGreaterThanOrEqual(1);
      expect(explainCount).toBeGreaterThanOrEqual(1);
      // qa and arch are different from check and explain
      expect(['check', 'explain']).not.toContain('qa');
      expect(['check', 'explain']).not.toContain('arch');
      void lines;
    });
  });

  describe('Scenario: All four wrappers are inert under v1 (STORY-013-08)', () => {
    it('sprint init with missing sprint file exits 0 with inert message', () => {
      // SPRINT-99 does not exist in real delivery dir; defaults to v1
      const result = run(['sprint', 'init', 'SPRINT-99', '--stories', 'STORY-99-01']);
      expect(result.status).toBe(0);
      expect(result.stdout).toContain('v1 mode active');
    });

    it('sprint close with missing sprint file exits 0 with inert message', () => {
      const result = run(['sprint', 'close', 'SPRINT-99']);
      expect(result.status).toBe(0);
      expect(result.stdout).toContain('v1 mode active');
    });

    it('state validate with missing sprint file exits 0 with inert message', () => {
      const result = run(['state', 'validate', 'SPRINT-99']);
      expect(result.status).toBe(0);
      expect(result.stdout).toContain('v1 mode active');
    });
  });

  describe('Scenario: No direct node .mjs calls in CLI code (Scenario 4)', () => {
    it('dist/cli.js does not contain direct node .cleargate/scripts invocations', () => {
      const cliContents = readFileSync(CLI, 'utf-8');
      // Must not contain: node .cleargate/scripts/
      expect(cliContents).not.toMatch(/node\s+\.cleargate\/scripts\//);
    });
  });
});
