/**
 * whoami.test.ts — CR-011
 *
 * Tests for `cleargate whoami --json` mode.
 * 4 scenarios per CR §4 acceptance step 4:
 *  1. Member state → {state, email, project_id, expires_at}
 *  2. Pre-member (no auth file) → {state: 'pre-member'}, no PII
 *  3. Pre-member (expired JWT) → {state: 'pre-member'}, no PII
 *  4. Pre-member (malformed JWT) → {state: 'pre-member'}, no PII
 *
 * Also tests backward compat: --json absent → existing network path still wired.
 */

import { describe, it, expect, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { Buffer } from 'node:buffer';
import { whoamiHandler } from '../../src/commands/whoami.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const tmpDirs: string[] = [];

function makeTmpDir(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cg-whoami-test-'));
  tmpDirs.push(dir);
  return dir;
}

afterEach(() => {
  for (const dir of tmpDirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

function buildFakeJwt(payload: Record<string, unknown>): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  return `${header}.${body}.fakesig`;
}

function writeAuthFile(
  cleargateHome: string,
  profile: string,
  refreshToken: string,
): void {
  fs.mkdirSync(cleargateHome, { recursive: true });
  fs.writeFileSync(
    path.join(cleargateHome, 'auth.json'),
    JSON.stringify({ version: 1, profiles: { [profile]: { refreshToken } } }),
    'utf8',
  );
}

function makeOpts(overrides: Partial<Parameters<typeof whoamiHandler>[0]> = {}) {
  const out: string[] = [];
  const err: string[] = [];
  return {
    profile: 'default',
    out,
    err,
    opts: {
      profile: 'default',
      ...overrides,
      stdout: (s: string) => out.push(s),
      stderr: (s: string) => err.push(s),
      exit: (_code: number) => { throw new Error(`exit(${_code})`); },
      ...overrides,
    } as Parameters<typeof whoamiHandler>[0],
  };
}

// ─── Scenario 1: Member state → full JSON object ──────────────────────────────

describe('Scenario: whoami --json in member state', () => {
  it('emits {state, email, project_id, expires_at} JSON when JWT is valid', async () => {
    const dir = makeTmpDir();
    const home = path.join(dir, '.cleargate');

    const nowMs = 1_700_000_000_000;
    const futureExp = Math.floor(nowMs / 1000) + 7 * 24 * 3600;

    const jwt = buildFakeJwt({
      sub: 'member-uuid-abc',
      project_id: 'project-123',
      exp: futureExp,
      type: 'refresh',
    });
    writeAuthFile(home, 'default', jwt);

    const out: string[] = [];
    await whoamiHandler({
      profile: 'default',
      json: true,
      cleargateHome: home,
      now: () => nowMs,
      stdout: (s) => out.push(s),
      stderr: (_s) => undefined,
      exit: (_c) => { throw new Error(`exit(${_c})`); },
    });

    expect(out).toHaveLength(1);
    const parsed = JSON.parse(out[0]!) as Record<string, unknown>;
    expect(parsed['state']).toBe('member');
    expect(parsed['email']).toBe('member-uuid-abc');
    expect(parsed['project_id']).toBe('project-123');
    expect(typeof parsed['expires_at']).toBe('string');
    // Must not have extra PII keys beyond the declared contract
    expect(Object.keys(parsed).sort()).toEqual(['email', 'expires_at', 'project_id', 'state'].sort());
  });
});

// ─── Scenario 2: Pre-member (no auth file) → {state: 'pre-member'} ───────────

describe('Scenario: whoami --json in pre-member state (no auth file)', () => {
  it('emits {state: "pre-member"} with no PII when auth file is absent', async () => {
    const dir = makeTmpDir();
    const home = path.join(dir, '.cleargate-nonexistent');

    const out: string[] = [];
    await whoamiHandler({
      profile: 'default',
      json: true,
      cleargateHome: home,
      stdout: (s) => out.push(s),
      stderr: (_s) => undefined,
      exit: (_c) => { throw new Error(`exit(${_c})`); },
    });

    expect(out).toHaveLength(1);
    const parsed = JSON.parse(out[0]!) as Record<string, unknown>;
    expect(parsed['state']).toBe('pre-member');
    // No PII fields
    expect(parsed['email']).toBeUndefined();
    expect(parsed['project_id']).toBeUndefined();
    expect(parsed['expires_at']).toBeUndefined();
    expect(Object.keys(parsed)).toEqual(['state']);
  });
});

// ─── Scenario 3: Pre-member (expired JWT) → {state: 'pre-member'} ────────────

describe('Scenario: whoami --json in pre-member state (expired JWT)', () => {
  it('emits {state: "pre-member"} when stored JWT is expired', async () => {
    const dir = makeTmpDir();
    const home = path.join(dir, '.cleargate');

    const expiredExp = Math.floor(Date.now() / 1000) - 3600;
    const jwt = buildFakeJwt({
      sub: 'member-uuid',
      project_id: 'proj',
      exp: expiredExp,
    });
    writeAuthFile(home, 'default', jwt);

    const out: string[] = [];
    await whoamiHandler({
      profile: 'default',
      json: true,
      cleargateHome: home,
      stdout: (s) => out.push(s),
      stderr: (_s) => undefined,
      exit: (_c) => { throw new Error(`exit(${_c})`); },
    });

    expect(out).toHaveLength(1);
    const parsed = JSON.parse(out[0]!) as Record<string, unknown>;
    expect(parsed['state']).toBe('pre-member');
    expect(Object.keys(parsed)).toEqual(['state']);
  });
});

// ─── Scenario 4: Pre-member (malformed JWT) → {state: 'pre-member'} ──────────

describe('Scenario: whoami --json in pre-member state (malformed JWT)', () => {
  it('emits {state: "pre-member"} when stored token is not a valid JWT', async () => {
    const dir = makeTmpDir();
    const home = path.join(dir, '.cleargate');

    writeAuthFile(home, 'default', 'not-a-jwt');

    const out: string[] = [];
    await whoamiHandler({
      profile: 'default',
      json: true,
      cleargateHome: home,
      stdout: (s) => out.push(s),
      stderr: (_s) => undefined,
      exit: (_c) => { throw new Error(`exit(${_c})`); },
    });

    expect(out).toHaveLength(1);
    const parsed = JSON.parse(out[0]!) as Record<string, unknown>;
    expect(parsed['state']).toBe('pre-member');
    expect(Object.keys(parsed)).toEqual(['state']);
  });
});

// ─── Backward compat: --json absent → network path ───────────────────────────

describe('Backward compat: whoami without --json uses network path', () => {
  it('calls exit(5) when mcpUrl is not configured (no join performed)', async () => {
    const err: string[] = [];
    let exitCode: number | undefined;

    await whoamiHandler({
      profile: 'default',
      json: false,
      stdout: (_s) => undefined,
      stderr: (s) => err.push(s),
      exit: (c) => { exitCode = c; throw new Error(`exit(${c})`); },
    }).catch(() => {
      // Expected: exit throws
    });

    expect(exitCode).toBe(5);
    expect(err.join('')).toContain('mcpUrl');
  });
});
