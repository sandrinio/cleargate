import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

export interface CodebaseVersion {
  sha: string | null;
  dirty: boolean;
  tag: string | null;
  package_version: string | null;
  version_string: string; // e.g. "a3f2e91", "a3f2e91-dirty", "1.4.2", "unknown"
}

export type ExecFn = (cmd: string, args: string[]) => { stdout: string; code: number };

export interface CodebaseVersionOpts {
  cwd?: string;
  exec?: ExecFn;
}

function makeDefaultExec(cwd: string): ExecFn {
  return (cmd: string, args: string[]): { stdout: string; code: number } => {
    try {
      const stdout = execSync([cmd, ...args].join(' '), {
        cwd,
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'pipe'],
      });
      return { stdout: stdout.trim(), code: 0 };
    } catch (err: unknown) {
      const e = err as { stdout?: string | Buffer; status?: number };
      return {
        stdout: typeof e.stdout === 'string' ? e.stdout.trim() : '',
        code: typeof e.status === 'number' ? e.status : 1,
      };
    }
  };
}

function findPackageJson(startDir: string): string | null {
  let current = startDir;
  while (true) {
    const candidate = path.join(current, 'package.json');
    if (fs.existsSync(candidate)) {
      return candidate;
    }
    const parent = path.dirname(current);
    if (parent === current) {
      return null;
    }
    current = parent;
  }
}

export function getCodebaseVersion(opts?: CodebaseVersionOpts): CodebaseVersion {
  const cwd = opts?.cwd ?? process.cwd();
  const execFn = opts?.exec ?? makeDefaultExec(cwd);

  // Try git SHA
  const shaResult = execFn('git', ['rev-parse', '--short', 'HEAD']);
  if (shaResult.code === 0 && shaResult.stdout.length > 0) {
    const sha = shaResult.stdout.trim();

    // Check dirty
    const statusResult = execFn('git', ['status', '--porcelain']);
    const dirty = statusResult.code === 0 && statusResult.stdout.trim().length > 0;

    const version_string = dirty ? `${sha}-dirty` : sha;

    return {
      sha,
      dirty,
      tag: null,
      package_version: null,
      version_string,
    };
  }

  // Fallback: find nearest package.json
  const pkgPath = findPackageJson(cwd);
  if (pkgPath !== null) {
    try {
      const raw = fs.readFileSync(pkgPath, 'utf8');
      const pkg = JSON.parse(raw) as { version?: string };
      const package_version = typeof pkg.version === 'string' ? pkg.version : null;
      if (package_version !== null) {
        return {
          sha: null,
          dirty: false,
          tag: null,
          package_version,
          version_string: package_version,
        };
      }
    } catch {
      // fall through to unknown
    }
  }

  // Unknown
  console.warn('[cleargate] codebase-version: could not determine version (no git, no package.json)');
  return {
    sha: null,
    dirty: false,
    tag: null,
    package_version: null,
    version_string: 'unknown',
  };
}
