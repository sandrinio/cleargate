import { mkdtempSync, statSync, writeFileSync } from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { describe, it, expect, beforeEach } from 'vitest';
import { FileTokenStore } from '../../src/auth/file-store.js';

function makeTmpStore(): { store: FileTokenStore; filePath: string; dir: string } {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'cleargate-auth-'));
  const filePath = path.join(dir, 'auth', 'auth.json');
  const store = new FileTokenStore(filePath);
  return { store, filePath, dir };
}

describe('FileTokenStore', () => {
  let store: FileTokenStore;
  let filePath: string;

  beforeEach(() => {
    const tmp = makeTmpStore();
    store = tmp.store;
    filePath = tmp.filePath;
  });

  // Test 1: save then load round-trips token
  it('Test 1: save then load round-trips token', async () => {
    await store.save('default', 't1');
    expect(await store.load('default')).toBe('t1');
  });

  // Test 2: load on never-saved profile returns null (no throw, file may not exist)
  it('Test 2: load on never-saved profile returns null', async () => {
    const result = await store.load('default');
    expect(result).toBeNull();
  });

  // Test 3: remove on existing profile clears it
  it('Test 3: remove on existing profile clears it, file still exists', async () => {
    await store.save('work', 't');
    await store.remove('work');
    expect(await store.load('work')).toBeNull();
  });

  // Test 4: remove on missing profile is a no-op (no throw, file may not exist)
  it('Test 4: remove on missing profile is a no-op', async () => {
    await expect(store.remove('nonexistent')).resolves.toBeUndefined();
  });

  // Test 5: chmod 0600 on the auth file after save
  it.skipIf(process.platform === 'win32')(
    'Test 5: auth file has mode 0600 after save',
    async () => {
      await store.save('default', 'tok');
      const mode = statSync(filePath).mode & 0o777;
      expect(mode).toBe(0o600);
    },
  );

  // Test 6: chmod 0700 on the parent dir when mkdir had to create it
  it.skipIf(process.platform === 'win32')(
    'Test 6: parent directory has mode 0700 after first save',
    async () => {
      await store.save('default', 'tok');
      const mode = statSync(path.dirname(filePath)).mode & 0o777;
      expect(mode).toBe(0o700);
    },
  );

  // Test 7: profile namespacing — no clobber
  it('Test 7: saving staging does not clobber default profile', async () => {
    await store.save('default', 'A');
    await store.save('staging', 'B');
    expect(await store.load('default')).toBe('A');
    expect(await store.load('staging')).toBe('B');
  });

  // Test 8: overwrite semantics — second save replaces first
  it('Test 8: second save for same profile replaces first value', async () => {
    await store.save('default', 'A');
    await store.save('default', 'B');
    expect(await store.load('default')).toBe('B');
  });

  // Test 9: malformed JSON throws with file path in message
  it('Test 9: malformed JSON in auth file throws with file path in message', async () => {
    // Ensure parent dir exists first by doing a save
    await store.save('default', 'seed');
    // Now overwrite with invalid JSON
    writeFileSync(filePath, '{', 'utf8');
    await expect(store.load('default')).rejects.toThrow(filePath);
  });

  // Test 10: unknown top-level key throws (zod strict)
  it('Test 10: unknown top-level key in auth file throws (zod strict)', async () => {
    await store.save('default', 'seed');
    writeFileSync(
      filePath,
      JSON.stringify({ version: 1, profiles: {}, junk: 1 }),
      'utf8',
    );
    await expect(store.load('default')).rejects.toThrow();
  });

  // Test 11: wrong version throws with upgrade hint
  it('Test 11: wrong version in auth file throws with "upgrade" hint', async () => {
    await store.save('default', 'seed');
    writeFileSync(
      filePath,
      JSON.stringify({ version: 2, profiles: {} }),
      'utf8',
    );
    await expect(store.load('default')).rejects.toThrow('upgrade');
  });
});
