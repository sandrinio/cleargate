/**
 * gate-run.test.ts — unit tests for `cleargate gate <name>` command handler.
 *
 * STORY-018-03 Gherkin scenarios:
 *   1. Configured gate runs the user's command
 *   2. Configured gate propagates non-zero exit
 *   3. Missing config is friendly, not fatal
 *   4. Missing key with --strict fails
 *   5. Unknown gate name rejected
 *   6. Agent wording updated (grep-test — no npm test / npm run typecheck)
 *   7. Meta-repo workflow preserved (reads actual .cleargate/config.yml)
 *
 * FLASHCARD #cli #test-seam #exit: exitFn throws in tests; extract validation
 *   into value-returning fn and call exitFn only at handler top-level after
 *   spawnSync completes.
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { gateRunHandler } from '../../src/commands/gate-run.js';
import type { GateRunCliOptions } from '../../src/commands/gate-run.js';
import { loadWikiConfig } from '../../src/lib/wiki-config.js';
import type { WikiConfig } from '../../src/lib/wiki-config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Repo root — three levels up from test/commands/
const REPO_ROOT = path.resolve(__dirname, '../../..');

// ─── Test seam helpers ────────────────────────────────────────────────────────

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
    outStr: () => out.join('\n'),
    errStr: () => err.join('\n'),
  };
}

function makeConfigLoader(gates: Partial<WikiConfig['gates']>): (repoRoot: string) => WikiConfig {
  return (_repoRoot: string) => ({
    wiki: { index_token_ceiling: 8000 },
    gates,
  });
}

// ─── Scenario 1: Configured gate runs the user's command ─────────────────────

describe('Scenario 1: Configured gate runs the user\'s command', () => {
  it('calls spawnFn with the configured command string, shell:true, and correct cwd', () => {
    const { exitFn, getCode } = makeExitSeam();
    const cap = makeCapture();

    const spawnCalls: Array<{ cmd: string; opts: Record<string, unknown> }> = [];
    const spawnFn = ((cmd: string, opts: unknown) => {
      spawnCalls.push({ cmd, opts: opts as Record<string, unknown> });
      return { status: 0, error: undefined };
    }) as unknown as typeof spawnSync;

    const cli: GateRunCliOptions = {
      cwd: '/fake/cwd',
      stdout: cap.stdout,
      stderr: cap.stderr,
      exit: exitFn,
      spawnFn,
      configLoader: makeConfigLoader({ test: 'echo TEST_RAN' }),
    };

    try {
      gateRunHandler('test', {}, cli);
    } catch { /* expected — exitFn throws */ }

    expect(getCode()).toBe(0);
    expect(spawnCalls).toHaveLength(1);
    expect(spawnCalls[0]!.cmd).toBe('echo TEST_RAN');
    expect(spawnCalls[0]!.opts).toMatchObject({ shell: true, stdio: 'inherit', cwd: '/fake/cwd' });
  });
});

// ─── Scenario 2: Configured gate propagates non-zero exit ────────────────────

describe('Scenario 2: Configured gate propagates non-zero exit', () => {
  it('exits with code 7 when spawnFn returns status 7', () => {
    const { exitFn, getCode } = makeExitSeam();
    const cap = makeCapture();

    const spawnFn = ((_cmd: string, _opts: unknown) => {
      return { status: 7, error: undefined };
    }) as unknown as typeof spawnSync;

    const cli: GateRunCliOptions = {
      cwd: '/fake/cwd',
      stdout: cap.stdout,
      stderr: cap.stderr,
      exit: exitFn,
      spawnFn,
      configLoader: makeConfigLoader({ test: 'exit 7' }),
    };

    try {
      gateRunHandler('test', {}, cli);
    } catch { /* expected */ }

    expect(getCode()).toBe(7);
  });
});

// ─── Scenario 3: Missing config is friendly, not fatal ───────────────────────

describe('Scenario 3: Missing config is friendly, not fatal', () => {
  it('prints a friendly message to stdout and exits 0 when gate not configured', () => {
    const { exitFn, getCode } = makeExitSeam();
    const cap = makeCapture();

    const cli: GateRunCliOptions = {
      cwd: '/fake/cwd',
      stdout: cap.stdout,
      stderr: cap.stderr,
      exit: exitFn,
      spawnFn: (() => { throw new Error('should not spawn'); }) as unknown as typeof spawnSync,
      configLoader: makeConfigLoader({}),
    };

    try {
      gateRunHandler('precommit', {}, cli);
    } catch { /* expected */ }

    expect(getCode()).toBe(0);
    expect(cap.outStr()).toContain('gate "precommit" not configured');
    expect(cap.outStr()).toContain('add gates.precommit to .cleargate/config.yml');
    expect(cap.errStr()).toBe('');
  });
});

// ─── Scenario 4: Missing key with --strict fails ──────────────────────────────

describe('Scenario 4: Missing key with --strict fails', () => {
  it('exits 1 and emits message to stderr when gate not configured and --strict', () => {
    const { exitFn, getCode } = makeExitSeam();
    const cap = makeCapture();

    const cli: GateRunCliOptions = {
      cwd: '/fake/cwd',
      stdout: cap.stdout,
      stderr: cap.stderr,
      exit: exitFn,
      spawnFn: (() => { throw new Error('should not spawn'); }) as unknown as typeof spawnSync,
      configLoader: makeConfigLoader({}),
    };

    try {
      gateRunHandler('precommit', { strict: true }, cli);
    } catch { /* expected */ }

    expect(getCode()).toBe(1);
    expect(cap.errStr()).toContain('gate "precommit" not configured');
    expect(cap.errStr()).toContain('add gates.precommit to .cleargate/config.yml');
  });
});

// ─── Scenario 5: Unknown gate name rejected ───────────────────────────────────

describe('Scenario 5: Unknown gate name rejected', () => {
  it('exits 2 and emits unknown gate message to stderr for an unrecognised name', () => {
    const { exitFn, getCode } = makeExitSeam();
    const cap = makeCapture();

    const cli: GateRunCliOptions = {
      cwd: '/fake/cwd',
      stdout: cap.stdout,
      stderr: cap.stderr,
      exit: exitFn,
      spawnFn: (() => { throw new Error('should not spawn'); }) as unknown as typeof spawnSync,
      configLoader: makeConfigLoader({}),
    };

    try {
      gateRunHandler('frobnicate', {}, cli);
    } catch { /* expected */ }

    expect(getCode()).toBe(2);
    expect(cap.errStr()).toContain("unknown gate name 'frobnicate'");
    expect(cap.errStr()).toContain('precommit, test, typecheck, lint');
  });
});

// ─── Scenario 6: Agent wording updated ───────────────────────────────────────

describe('Scenario 6: Agent wording updated', () => {
  it('developer.md contains cleargate gate test/typecheck and not npm test/npm run typecheck', () => {
    const devMd = fs.readFileSync(
      path.resolve(REPO_ROOT, 'cleargate-planning/.claude/agents/developer.md'),
      'utf8',
    );
    expect(devMd).not.toMatch(/npm test(?!\s*needs)/);
    expect(devMd).not.toContain('npm run typecheck');
    expect(devMd).toContain('cleargate gate test');
    expect(devMd).toContain('cleargate gate typecheck');
  });

  it('qa.md contains cleargate gate test/typecheck and not npm test/npm run typecheck', () => {
    const qaMd = fs.readFileSync(
      path.resolve(REPO_ROOT, 'cleargate-planning/.claude/agents/qa.md'),
      'utf8',
    );
    expect(qaMd).not.toMatch(/npm test(?!\s*needs)/);
    expect(qaMd).not.toContain('npm run typecheck');
    expect(qaMd).toContain('cleargate gate test');
    expect(qaMd).toContain('cleargate gate typecheck');
  });
});

// ─── Scenario 7: Meta-repo workflow preserved ─────────────────────────────────

describe('Scenario 7: Meta-repo workflow preserved', () => {
  it('this repo\'s .cleargate/config.yml has gates.precommit with typecheck + test', () => {
    const configPath = path.resolve(REPO_ROOT, '.cleargate/config.yml');
    expect(fs.existsSync(configPath)).toBe(true);

    const config = loadWikiConfig(REPO_ROOT);

    expect(config.gates.precommit).toBeDefined();
    expect(config.gates.precommit).toContain('npm run typecheck');
    expect(config.gates.precommit).toContain('npm test');
    expect(config.gates.test).toBeDefined();
    expect(config.gates.typecheck).toBeDefined();
    expect(config.gates.lint).toBeDefined();
  });
});
