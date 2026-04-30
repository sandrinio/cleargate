/**
 * doctor-membership-banner.test.ts — CR-011
 *
 * Tests for `cleargate doctor --session-start` state-banner emission.
 * CR-011 adds a membership state banner as the FIRST line of --session-start output.
 *
 * Two scenarios:
 *  1. pre-member state → banner says "pre-member — local planning enabled, sync requires join."
 *  2. member state → banner says "member (project: <project_id>) — full surface enabled."
 */

import { describe, it, expect, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { Buffer } from 'node:buffer';
import { runSessionStart } from '../../src/commands/doctor.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const tmpDirs: string[] = [];

function makeTmpDir(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cg-doctor-banner-'));
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

// ─── Scenario 1: Pre-member banner ────────────────────────────────────────────

describe('Scenario: --session-start emits pre-member banner', () => {
  it('first line is the pre-member banner when no auth file is present', async () => {
    const dir = makeTmpDir();
    const cwd = dir; // empty dir, no .cleargate/

    const noAuthHome = path.join(dir, '.cleargate-nonexistent');

    const lines: string[] = [];
    await runSessionStart(
      cwd,
      (line) => lines.push(line),
      undefined,
      { cleargateHome: noAuthHome },
    );

    expect(lines.length).toBeGreaterThanOrEqual(1);
    expect(lines[0]).toBe(
      'ClearGate state: pre-member — local planning enabled, sync requires join.',
    );
  });

  it('first line is the pre-member banner when JWT is expired', async () => {
    const dir = makeTmpDir();
    const cwd = dir;
    const home = path.join(dir, '.cleargate');

    const expiredExp = Math.floor(Date.now() / 1000) - 3600;
    const jwt = buildFakeJwt({ sub: 'user', project_id: 'proj', exp: expiredExp });
    writeAuthFile(home, 'default', jwt);

    const lines: string[] = [];
    await runSessionStart(
      cwd,
      (line) => lines.push(line),
      undefined,
      { cleargateHome: home },
    );

    expect(lines[0]).toBe(
      'ClearGate state: pre-member — local planning enabled, sync requires join.',
    );
  });
});

// ─── Scenario 2: Member banner ────────────────────────────────────────────────

describe('Scenario: --session-start emits member banner', () => {
  it('first line is the member banner with project_id when JWT is valid', async () => {
    const dir = makeTmpDir();
    const cwd = dir;
    const home = path.join(dir, '.cleargate');

    const nowMs = Date.now();
    const futureExp = Math.floor(nowMs / 1000) + 7 * 24 * 3600;
    const jwt = buildFakeJwt({
      sub: 'user-uuid',
      project_id: 'my-project',
      exp: futureExp,
      type: 'refresh',
    });
    writeAuthFile(home, 'default', jwt);

    const lines: string[] = [];
    await runSessionStart(
      cwd,
      (line) => lines.push(line),
      undefined,
      { cleargateHome: home },
    );

    expect(lines.length).toBeGreaterThanOrEqual(1);
    expect(lines[0]).toBe(
      'ClearGate state: member (project: my-project) — full surface enabled.',
    );
  });

  it('banner precedes the resolver-status line (is the first line)', async () => {
    const dir = makeTmpDir();
    const cwd = dir;
    const home = path.join(dir, '.cleargate');

    const futureExp = Math.floor(Date.now() / 1000) + 3600;
    const jwt = buildFakeJwt({ sub: 'u', project_id: 'p', exp: futureExp });
    writeAuthFile(home, 'default', jwt);

    const lines: string[] = [];
    await runSessionStart(cwd, (line) => lines.push(line), undefined, { cleargateHome: home });

    // Banner must be first line; resolver-status line comes after
    expect(lines[0]).toContain('ClearGate state: member');
    // The resolver-status line contains "cleargate CLI:"
    const resolverIdx = lines.findIndex((l) => l.includes('cleargate CLI:'));
    expect(resolverIdx).toBeGreaterThan(0);
  });
});
