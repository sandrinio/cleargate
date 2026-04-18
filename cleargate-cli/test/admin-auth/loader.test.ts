import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { describe, it, expect, afterEach } from 'vitest';
import { loadAdminAuth } from '../../src/admin-api/admin-auth.js';

function makeTmpDir(): string {
  return mkdtempSync(path.join(os.tmpdir(), 'cleargate-admin-auth-'));
}

function writeAuthFile(dir: string, content: unknown, mode = 0o600): string {
  const filePath = path.join(dir, 'admin-auth.json');
  writeFileSync(filePath, JSON.stringify(content), { mode });
  return filePath;
}

describe('loadAdminAuth', () => {
  // A-1: env present → returns env token, file not read
  it('A-1: env present returns token from env and does not read file', () => {
    const tmpDir = makeTmpDir();
    // Pass a filePath that doesn't exist — would throw ENOENT if file read was attempted
    const nonExistentPath = path.join(tmpDir, 'nonexistent.json');

    const result = loadAdminAuth({
      env: { CLEARGATE_ADMIN_TOKEN: 'env-token-abc' },
      filePath: nonExistentPath,
    });

    expect(result).toEqual({ token: 'env-token-abc', source: 'env' });
  });

  // A-2: env absent, file present (valid) → returns file token
  it('A-2: env absent, valid file returns token from file', () => {
    const tmpDir = makeTmpDir();
    const filePath = writeAuthFile(tmpDir, { version: 1, token: 'file-token-xyz' });

    const result = loadAdminAuth({
      env: {},
      filePath,
    });

    expect(result).toEqual({ token: 'file-token-xyz', source: 'file' });
  });

  // A-3: env absent, file absent → throws with exact message
  it('A-3: env absent, file absent throws literal error message', () => {
    const tmpDir = makeTmpDir();
    const nonExistentPath = path.join(tmpDir, 'nonexistent.json');

    expect(() =>
      loadAdminAuth({ env: {}, filePath: nonExistentPath }),
    ).toThrow(
      'No admin token. Set CLEARGATE_ADMIN_TOKEN or write ~/.cleargate/admin-auth.json (chmod 600). See README §admin-jwt.',
    );
  });

  // A-4: file malformed JSON → throws with file path in message
  it('A-4: malformed JSON in file throws error with file path', () => {
    const tmpDir = makeTmpDir();
    const filePath = path.join(tmpDir, 'admin-auth.json');
    writeFileSync(filePath, 'not valid json', { mode: 0o600 });

    expect(() =>
      loadAdminAuth({ env: {}, filePath }),
    ).toThrow(filePath);
  });

  // A-5: file zod-strict violation → throws
  it('A-5: file with extra unknown key fails strict validation and throws', () => {
    const tmpDir = makeTmpDir();
    const filePath = writeAuthFile(tmpDir, { version: 1, token: 'valid', extra: 1 });

    expect(() =>
      loadAdminAuth({ env: {}, filePath }),
    ).toThrow();
  });

  // Chmod warn: file too permissive → warn called
  it('chmod warn: world-readable file triggers warn callback', () => {
    const tmpDir = makeTmpDir();
    const filePath = writeAuthFile(tmpDir, { version: 1, token: 'tok' }, 0o644);
    const warn = (msg: string) => { warnMessages.push(msg); };
    const warnMessages: string[] = [];

    loadAdminAuth({ env: {}, filePath, warn });

    expect(warnMessages.length).toBeGreaterThan(0);
    expect(warnMessages[0]).toContain('group/world readable');
  });
});
