/**
 * identity.test.ts — STORY-010-01 §2.1 Gherkin scenarios 1–4.
 *
 * All tests use tmpdir + injected opts seams.
 * Do NOT vi.mock('child_process') — use the gitEmail injectable instead
 * (see flashcard 2026-04-19 #cli #vitest #vi-mock-hoisting).
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { resolveIdentity, readParticipant, writeParticipant } from '../../src/lib/identity.js';

function makeTmpDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'cg-identity-test-'));
}

function cleanup(dir: string): void {
  fs.rmSync(dir, { recursive: true, force: true });
}

describe('Scenario: Identity resolves from participant.json first', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = makeTmpDir();
    fs.mkdirSync(path.join(tmpDir, '.cleargate'), { recursive: true });
    fs.writeFileSync(
      path.join(tmpDir, '.cleargate', '.participant.json'),
      JSON.stringify({ email: 'a@x.com', set_at: '2026-01-01T00:00:00Z', source: 'prompted' }),
      'utf8',
    );
  });

  afterEach(() => cleanup(tmpDir));

  it('participant-json wins over env + git', () => {
    const result = resolveIdentity(tmpDir, {
      env: { CLEARGATE_USER: 'b@x.com' },
      gitEmail: () => 'c@x.com',
    });
    expect(result.email).toBe('a@x.com');
    expect(result.source).toBe('participant-json');
  });
});

describe('Scenario: Identity falls through to env when participant.json absent', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = makeTmpDir();
  });

  afterEach(() => cleanup(tmpDir));

  it('env wins when participant-json absent', () => {
    const result = resolveIdentity(tmpDir, {
      env: { CLEARGATE_USER: 'b@x.com' },
      gitEmail: () => 'c@x.com',
    });
    expect(result.email).toBe('b@x.com');
    expect(result.source).toBe('env');
  });
});

describe('Scenario: Identity falls through to git', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = makeTmpDir();
  });

  afterEach(() => cleanup(tmpDir));

  it('git wins when no participant-json no env', () => {
    const result = resolveIdentity(tmpDir, {
      env: {},
      gitEmail: () => 'c@x.com',
    });
    expect(result.email).toBe('c@x.com');
    expect(result.source).toBe('git');
  });
});

describe('Scenario: Identity host fallback', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = makeTmpDir();
  });

  afterEach(() => cleanup(tmpDir));

  it('host fallback when all other sources absent', () => {
    const result = resolveIdentity(tmpDir, {
      env: {},
      gitEmail: () => null,
      hostname: () => 'mac',
      username: () => 'dev',
    });
    expect(result.email).toMatch(/.+@.+/);
    expect(result.source).toBe('host');
    expect(result.email).toBe('dev@mac');
  });
});

describe('readParticipant', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = makeTmpDir();
  });

  afterEach(() => cleanup(tmpDir));

  it('returns null when file does not exist', () => {
    expect(readParticipant(tmpDir)).toBeNull();
  });

  it('returns null for malformed JSON', () => {
    fs.mkdirSync(path.join(tmpDir, '.cleargate'), { recursive: true });
    fs.writeFileSync(path.join(tmpDir, '.cleargate', '.participant.json'), '{not-json', 'utf8');
    expect(readParticipant(tmpDir)).toBeNull();
  });
});

describe('writeParticipant', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = makeTmpDir();
  });

  afterEach(() => cleanup(tmpDir));

  it('writes atomic file with correct shape', async () => {
    const now = () => '2026-04-19T12:00:00Z';
    await writeParticipant(tmpDir, 'test@x.com', 'prompted', now);

    const filePath = path.join(tmpDir, '.cleargate', '.participant.json');
    expect(fs.existsSync(filePath)).toBe(true);

    const content = JSON.parse(fs.readFileSync(filePath, 'utf8')) as { email: string; set_at: string; source: string };
    expect(content.email).toBe('test@x.com');
    expect(content.source).toBe('prompted');
    expect(content.set_at).toBe('2026-04-19T12:00:00Z');
  });

  it('creates .cleargate/ directory if missing', async () => {
    const now = () => '2026-04-19T12:00:00Z';
    await writeParticipant(tmpDir, 'new@x.com', 'inferred', now);
    expect(fs.existsSync(path.join(tmpDir, '.cleargate'))).toBe(true);
  });
});
