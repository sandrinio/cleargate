import { describe, it, expect, afterEach } from 'vitest';
import * as os from 'os';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import { getCodebaseVersion, type ExecFn } from '../../src/lib/codebase-version.js';

function makeTmpDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'cg-cv-test-'));
}

function initGitRepo(dir: string): void {
  execSync('git init', { cwd: dir, stdio: 'pipe' });
  execSync('git config user.email "test@test.com"', { cwd: dir, stdio: 'pipe' });
  execSync('git config user.name "Test"', { cwd: dir, stdio: 'pipe' });
}

function makeCommit(dir: string, filename = 'README.md', content = 'hello'): string {
  fs.writeFileSync(path.join(dir, filename), content);
  execSync('git add .', { cwd: dir, stdio: 'pipe' });
  execSync('git commit -m "init"', { cwd: dir, stdio: 'pipe' });
  return execSync('git rev-parse --short HEAD', { cwd: dir, encoding: 'utf8' }).trim();
}

/** exec seam that returns non-zero (git not available) */
const noGitExec: ExecFn = (_cmd, _args) => ({ stdout: '', code: 128 });

const tmpDirs: string[] = [];

function trackTmp(dir: string): string {
  tmpDirs.push(dir);
  return dir;
}

afterEach(() => {
  for (const dir of tmpDirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

describe('getCodebaseVersion', () => {
  it('clean git returns short sha', () => {
    const dir = trackTmp(makeTmpDir());
    initGitRepo(dir);
    const sha = makeCommit(dir);

    const result = getCodebaseVersion({ cwd: dir });

    expect(result.sha).toBe(sha);
    expect(result.dirty).toBe(false);
    expect(result.version_string).toBe(sha);
    // sha should be 7 hex chars (git default)
    expect(result.version_string).toMatch(/^[0-9a-f]{7}$/);
  });

  it('dirty git returns sha-dirty', () => {
    const dir = trackTmp(makeTmpDir());
    initGitRepo(dir);
    const sha = makeCommit(dir);

    // Add an untracked file to make it dirty
    fs.writeFileSync(path.join(dir, 'dirty.txt'), 'unstaged');

    const result = getCodebaseVersion({ cwd: dir });

    expect(result.sha).toBe(sha);
    expect(result.dirty).toBe(true);
    expect(result.version_string).toBe(`${sha}-dirty`);
  });

  it('no git, package.json present returns version', () => {
    const dir = trackTmp(makeTmpDir());
    fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ version: '1.4.2' }));

    // Use exec seam so git fails — simulates no-git environment
    const result = getCodebaseVersion({ cwd: dir, exec: noGitExec });

    expect(result.sha).toBeNull();
    expect(result.dirty).toBe(false);
    expect(result.package_version).toBe('1.4.2');
    expect(result.version_string).toBe('1.4.2');
  });

  it('no git, no package.json returns unknown with warning', () => {
    const dir = trackTmp(makeTmpDir());
    const warnings: string[] = [];
    const origWarn = console.warn;
    console.warn = (...args: unknown[]) => { warnings.push(args.join(' ')); };

    try {
      // Use exec seam so git fails — simulates no-git environment
      const result = getCodebaseVersion({ cwd: dir, exec: noGitExec });
      expect(result.sha).toBeNull();
      expect(result.dirty).toBe(false);
      expect(result.package_version).toBeNull();
      expect(result.version_string).toBe('unknown');
      expect(warnings.length).toBeGreaterThan(0);
    } finally {
      console.warn = origWarn;
    }
  });

  it('monorepo walk-up finds parent package.json', () => {
    const parentDir = trackTmp(makeTmpDir());
    const subDir = path.join(parentDir, 'packages', 'sub');
    fs.mkdirSync(subDir, { recursive: true });
    fs.writeFileSync(path.join(parentDir, 'package.json'), JSON.stringify({ version: '2.3.4' }));
    // No package.json in subDir itself

    // Use exec seam so git fails — simulates no-git environment
    const result = getCodebaseVersion({ cwd: subDir, exec: noGitExec });

    expect(result.package_version).toBe('2.3.4');
    expect(result.version_string).toBe('2.3.4');
  });

  it('exec seam injectable — no real git call made', () => {
    const dir = trackTmp(makeTmpDir());
    const callLog: Array<{ cmd: string; args: string[] }> = [];

    const fakeExec: ExecFn = (cmd, args) => {
      callLog.push({ cmd, args });
      if (args[0] === 'rev-parse') {
        return { stdout: 'a3f2e91', code: 0 };
      }
      if (args[0] === 'status') {
        return { stdout: '', code: 0 };
      }
      return { stdout: '', code: 1 };
    };

    const result = getCodebaseVersion({ cwd: dir, exec: fakeExec });

    expect(result.sha).toBe('a3f2e91');
    expect(result.dirty).toBe(false);
    expect(result.version_string).toBe('a3f2e91');
    // Must have used the seam, not real git
    expect(callLog.length).toBeGreaterThan(0);
    expect(callLog.every(c => c.cmd === 'git')).toBe(true);
  });
});
