/**
 * init-participant.test.ts — STORY-010-01 §4 quality gates, init prompt section.
 *
 * Tests 9–10 per plan:
 *   9. interactive happy path — inject promptEmail, assert .participant.json written with 'prompted'
 *   10. --yes non-interactive — inject gitEmail, assert file written with git email + source:'inferred', no prompt
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import * as url from 'node:url';
import { initHandler } from '../../src/commands/init.js';
import type { WikiBuildOptions } from '../../src/commands/wiki-build.js';

const __testDirname = path.dirname(url.fileURLToPath(import.meta.url));
// test/commands/ → test/ → cleargate-cli/ → meta-root/ (3 levels up)
const META_ROOT = path.resolve(__testDirname, '..', '..', '..');
const META_ROOT_PLANNING = path.join(META_ROOT, 'cleargate-planning');

function makeTmpDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'cg-init-participant-test-'));
}

function cleanup(dir: string): void {
  fs.rmSync(dir, { recursive: true, force: true });
}

function makeCapture() {
  const out: string[] = [];
  const err: string[] = [];
  return {
    out,
    err,
    stdout: (s: string) => { out.push(s); },
    stderr: (s: string) => { err.push(s); },
  };
}

/** Minimal initHandler call that skips wiki build and snapshot read */
async function runInit(
  tmpDir: string,
  overrides: Parameters<typeof initHandler>[0] = {},
): Promise<{ out: string[]; err: string[] }> {
  const capture = makeCapture();
  await initHandler({
    cwd: tmpDir,
    payloadDir: META_ROOT_PLANNING,
    now: () => '2026-04-19T12:00:00Z',
    stdout: capture.stdout,
    stderr: capture.stderr,
    runWikiBuild: async (_opts: WikiBuildOptions) => { /* noop */ },
    readInstallManifest: () => ({
      version: '0.2.1',
      installed_at: '2026-04-19T12:00:00Z',
      files: [],
    }),
    promptYesNo: async (_q: string, def: boolean) => def,
    ...overrides,
  });
  return capture;
}

describe('Scenario: init prompts and writes participant.json', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = makeTmpDir();
  });

  afterEach(() => cleanup(tmpDir));

  it('interactive happy path writes email with source=prompted', async () => {
    let promptCalled = false;
    const promptEmail = async (_question: string, _defaultValue: string): Promise<string> => {
      promptCalled = true;
      return 'ok@x.com';
    };

    await runInit(tmpDir, {
      yes: false,
      stdinIsTTY: true, // force interactive path in test environment
      promptEmail,
      identityOpts: {
        env: {},
        gitEmail: () => 'git@x.com',
      },
    });

    expect(promptCalled).toBe(true);

    const participantPath = path.join(tmpDir, '.cleargate', '.participant.json');
    expect(fs.existsSync(participantPath)).toBe(true);

    const content = JSON.parse(fs.readFileSync(participantPath, 'utf8')) as {
      email: string;
      source: string;
      set_at: string;
    };
    expect(content.email).toBe('ok@x.com');
    expect(content.source).toBe('prompted');
    expect(content.set_at).toBe('2026-04-19T12:00:00Z');
  });
});

describe('Scenario: init non-interactive accepts git default', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = makeTmpDir();
  });

  afterEach(() => cleanup(tmpDir));

  it('--yes flag uses git email with source=inferred and never invokes promptEmail', async () => {
    let promptCalled = false;
    const promptEmail = async (_question: string, defaultValue: string): Promise<string> => {
      promptCalled = true;
      return defaultValue;
    };

    await runInit(tmpDir, {
      yes: true,
      promptEmail,
      identityOpts: {
        env: {},
        gitEmail: () => 'default@x.com',
      },
    });

    expect(promptCalled).toBe(false);

    const participantPath = path.join(tmpDir, '.cleargate', '.participant.json');
    expect(fs.existsSync(participantPath)).toBe(true);

    const content = JSON.parse(fs.readFileSync(participantPath, 'utf8')) as {
      email: string;
      source: string;
      set_at: string;
    };
    expect(content.email).toBe('default@x.com');
    expect(content.source).toBe('inferred');
  });

  it('subsequent init run skips participant prompt when file exists', async () => {
    // Write participant file first
    fs.mkdirSync(path.join(tmpDir, '.cleargate'), { recursive: true });
    fs.writeFileSync(
      path.join(tmpDir, '.cleargate', '.participant.json'),
      JSON.stringify({ email: 'existing@x.com', set_at: '2026-01-01T00:00:00Z', source: 'prompted' }),
      'utf8',
    );

    let promptCalled = false;
    const promptEmail = async (_question: string, defaultValue: string): Promise<string> => {
      promptCalled = true;
      return defaultValue;
    };

    await runInit(tmpDir, {
      yes: false,
      stdinIsTTY: true,
      promptEmail,
      identityOpts: { env: {}, gitEmail: () => null },
    });

    // Prompt must NOT be called since file already exists
    expect(promptCalled).toBe(false);

    // Original email preserved
    const content = JSON.parse(
      fs.readFileSync(path.join(tmpDir, '.cleargate', '.participant.json'), 'utf8'),
    ) as { email: string };
    expect(content.email).toBe('existing@x.com');
  });
});
