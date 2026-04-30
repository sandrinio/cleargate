/**
 * membership.test.ts — CR-011
 *
 * Unit tests for getMembershipState() across 5 cases:
 *  1. File missing → pre-member
 *  2. Malformed JSON → pre-member
 *  3. Malformed JWT (not a JWT) → pre-member
 *  4. Expired JWT → pre-member
 *  5. Valid (non-expired) JWT → member
 */

import { describe, it, expect, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { getMembershipState, decodeJwtPayload } from '../../src/lib/membership.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const tmpDirs: string[] = [];

function makeTmpDir(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cg-membership-test-'));
  tmpDirs.push(dir);
  return dir;
}

afterEach(() => {
  for (const dir of tmpDirs.splice(0)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

/**
 * Build a minimal JWT (HS256 shape) with the given payload.
 * We don't sign it — getMembershipState only decodes, never verifies sig.
 */
function buildFakeJwt(payload: Record<string, unknown>): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = 'fakesig';
  return `${header}.${body}.${sig}`;
}

/**
 * Write an auth.json file with the given refresh token for the given profile.
 */
function writeAuthFile(
  cleargateHome: string,
  profile: string,
  refreshToken: string,
): void {
  fs.mkdirSync(cleargateHome, { recursive: true });
  const authFile = {
    version: 1,
    profiles: {
      [profile]: { refreshToken },
    },
  };
  fs.writeFileSync(
    path.join(cleargateHome, 'auth.json'),
    JSON.stringify(authFile, null, 2),
    'utf8',
  );
}

// ─── Scenario 1: File missing → pre-member ────────────────────────────────────

describe('Scenario: File missing → pre-member', () => {
  it('returns pre-member when auth.json does not exist', () => {
    const dir = makeTmpDir();
    const nonExistentHome = path.join(dir, 'nonexistent');

    const result = getMembershipState({ cleargateHome: nonExistentHome });

    expect(result).toEqual({ state: 'pre-member' });
  });
});

// ─── Scenario 2: Malformed JSON → pre-member ─────────────────────────────────

describe('Scenario: Malformed JSON → pre-member', () => {
  it('returns pre-member when auth.json contains invalid JSON', () => {
    const dir = makeTmpDir();
    const home = path.join(dir, '.cleargate');
    fs.mkdirSync(home, { recursive: true });
    fs.writeFileSync(path.join(home, 'auth.json'), '{ invalid json !!!', 'utf8');

    const result = getMembershipState({ cleargateHome: home });

    expect(result).toEqual({ state: 'pre-member' });
  });

  it('returns pre-member when auth.json has wrong version', () => {
    const dir = makeTmpDir();
    const home = path.join(dir, '.cleargate');
    fs.mkdirSync(home, { recursive: true });
    fs.writeFileSync(
      path.join(home, 'auth.json'),
      JSON.stringify({ version: 99, profiles: {} }),
      'utf8',
    );

    const result = getMembershipState({ cleargateHome: home });

    expect(result).toEqual({ state: 'pre-member' });
  });

  it('returns pre-member when profile is absent from auth.json', () => {
    const dir = makeTmpDir();
    const home = path.join(dir, '.cleargate');
    writeAuthFile(home, 'other-profile', buildFakeJwt({ sub: 'user', project_id: 'p1', exp: Math.floor(Date.now() / 1000) + 3600 }));

    const result = getMembershipState({ cleargateHome: home, profile: 'default' });

    expect(result).toEqual({ state: 'pre-member' });
  });
});

// ─── Scenario 3: Malformed JWT → pre-member ──────────────────────────────────

describe('Scenario: Malformed JWT → pre-member', () => {
  it('returns pre-member when refresh token is not a valid JWT (not 3 parts)', () => {
    const dir = makeTmpDir();
    const home = path.join(dir, '.cleargate');
    writeAuthFile(home, 'default', 'not-a-jwt-token');

    const result = getMembershipState({ cleargateHome: home });

    expect(result).toEqual({ state: 'pre-member' });
  });

  it('returns pre-member when JWT payload is not valid base64url JSON', () => {
    const dir = makeTmpDir();
    const home = path.join(dir, '.cleargate');
    writeAuthFile(home, 'default', 'header.!!!invalid_base64!!!.sig');

    const result = getMembershipState({ cleargateHome: home });

    expect(result).toEqual({ state: 'pre-member' });
  });

  it('returns pre-member when JWT payload has no exp claim', () => {
    const dir = makeTmpDir();
    const home = path.join(dir, '.cleargate');
    const jwt = buildFakeJwt({ sub: 'user', project_id: 'p1' }); // no exp

    writeAuthFile(home, 'default', jwt);

    const result = getMembershipState({ cleargateHome: home });

    expect(result).toEqual({ state: 'pre-member' });
  });
});

// ─── Scenario 4: Expired JWT → pre-member ────────────────────────────────────

describe('Scenario: Expired JWT → pre-member', () => {
  it('returns pre-member when JWT exp is in the past', () => {
    const dir = makeTmpDir();
    const home = path.join(dir, '.cleargate');

    const expiredExp = Math.floor(Date.now() / 1000) - 3600; // 1 hour ago
    const jwt = buildFakeJwt({
      sub: 'user-uuid-123',
      project_id: 'proj-abc',
      exp: expiredExp,
      type: 'refresh',
    });

    writeAuthFile(home, 'default', jwt);

    const result = getMembershipState({ cleargateHome: home });

    expect(result).toEqual({ state: 'pre-member' });
  });

  it('returns pre-member when JWT exp equals now (boundary condition)', () => {
    const dir = makeTmpDir();
    const home = path.join(dir, '.cleargate');
    const nowMs = 1_700_000_000_000;
    const expiredExp = Math.floor(nowMs / 1000); // exp == now means expired

    const jwt = buildFakeJwt({
      sub: 'user-uuid-123',
      project_id: 'proj-abc',
      exp: expiredExp,
    });

    writeAuthFile(home, 'default', jwt);

    const result = getMembershipState({ cleargateHome: home, now: () => nowMs });

    expect(result).toEqual({ state: 'pre-member' });
  });
});

// ─── Scenario 5: Valid JWT → member ──────────────────────────────────────────

describe('Scenario: Valid (non-expired) JWT → member', () => {
  it('returns member state with email, project_id, expires_at from JWT claims', () => {
    const dir = makeTmpDir();
    const home = path.join(dir, '.cleargate');

    const nowMs = 1_700_000_000_000;
    const futureExp = Math.floor(nowMs / 1000) + 7 * 24 * 3600; // 7 days from now

    const jwt = buildFakeJwt({
      sub: 'user-uuid-456',
      project_id: 'project-xyz',
      exp: futureExp,
      type: 'refresh',
    });

    writeAuthFile(home, 'default', jwt);

    const result = getMembershipState({ cleargateHome: home, now: () => nowMs });

    expect(result.state).toBe('member');
    if (result.state === 'member') {
      expect(result.email).toBe('user-uuid-456');
      expect(result.project_id).toBe('project-xyz');
      expect(result.expires_at).toBe(new Date(futureExp * 1000).toISOString());
    }
  });

  it('returns member state for non-default profile when that profile has a valid token', () => {
    const dir = makeTmpDir();
    const home = path.join(dir, '.cleargate');

    const nowMs = 1_700_000_000_000;
    const futureExp = Math.floor(nowMs / 1000) + 3600;

    const jwt = buildFakeJwt({
      sub: 'user-work',
      project_id: 'work-project',
      exp: futureExp,
    });

    fs.mkdirSync(home, { recursive: true });
    const authFile = {
      version: 1,
      profiles: {
        default: { refreshToken: 'not-a-jwt' }, // default profile is pre-member
        work: { refreshToken: jwt },
      },
    };
    fs.writeFileSync(path.join(home, 'auth.json'), JSON.stringify(authFile), 'utf8');

    const defaultResult = getMembershipState({ cleargateHome: home, profile: 'default', now: () => nowMs });
    expect(defaultResult).toEqual({ state: 'pre-member' });

    const workResult = getMembershipState({ cleargateHome: home, profile: 'work', now: () => nowMs });
    expect(workResult.state).toBe('member');
  });
});

// ─── decodeJwtPayload helper tests ────────────────────────────────────────────

describe('decodeJwtPayload helper', () => {
  it('returns null for tokens with fewer than 3 parts', () => {
    expect(decodeJwtPayload('only.two')).toBeNull();
    expect(decodeJwtPayload('onlyone')).toBeNull();
  });

  it('returns null when payload part is not valid base64url JSON', () => {
    expect(decodeJwtPayload('header.!!!.sig')).toBeNull();
  });

  it('decodes a valid JWT payload', () => {
    const payload = { sub: 'test', exp: 9999999999, project_id: 'p1' };
    const jwt = buildFakeJwt(payload);
    const decoded = decodeJwtPayload(jwt);
    expect(decoded).toMatchObject(payload);
  });
});
