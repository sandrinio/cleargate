import { spawnSync } from 'node:child_process';
import { describe, it, expect } from 'vitest';
import { fileURLToPath } from 'node:url';
import { join, dirname } from 'node:path';

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

    it('--help stdout lists admin', () => {
      const result = run(['--help']);
      expect(result.stdout).toContain('admin');
    });
  });

  describe('Scenario: Version flag', () => {
    it('--version prints 0.1.0-alpha.1', () => {
      const result = run(['--version']);
      expect(result.stdout.trim()).toBe('0.1.0-alpha.1');
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
});
