import { mkdtempSync } from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('createTokenStore factory', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  function makeTmpDir(): string {
    return mkdtempSync(path.join(os.tmpdir(), 'cleargate-factory-'));
  }

  // Test 15: Keychain probe success → keychain backend, no warning emitted
  it('Test 15: probe success returns keychain backend with no warning', async () => {
    vi.doMock('@napi-rs/keyring', () => {
      class MockEntry {
        constructor(_service: string, _account: string) {}
        getPassword(): string | null {
          return null; // probe returns null cleanly
        }
      }
      return { Entry: MockEntry };
    });

    const { createTokenStore } = await import('../../src/auth/factory.js');
    const tmpDir = makeTmpDir();
    const warn = vi.fn();

    const store = await createTokenStore({
      keychainService: 'test-probe-success',
      filePath: path.join(tmpDir, 'auth.json'),
      warn,
    });

    expect(store.backend).toBe('keychain');
    expect(warn).not.toHaveBeenCalled();
  });

  // Test 16: Keychain constructor throw → file backend + warning with "keychain unavailable"
  it('Test 16: keychain constructor throw returns file backend and emits keychain unavailable warning', async () => {
    vi.doMock('@napi-rs/keyring', () => {
      class MockEntry {
        constructor(_service: string, _account: string) {
          throw new Error('module not found');
        }
        getPassword(): string | null {
          return null;
        }
      }
      return { Entry: MockEntry };
    });

    const { createTokenStore } = await import('../../src/auth/factory.js');
    const tmpDir = makeTmpDir();
    const warn = vi.fn();

    const store = await createTokenStore({
      filePath: path.join(tmpDir, 'auth.json'),
      warn,
    });

    expect(store.backend).toBe('file');
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0]![0]).toContain('keychain unavailable');
  });

  // Test 17: forceBackend: 'file' skips probe; forceBackend: 'keychain' skips probe
  it('Test 17: forceBackend skips probe entirely', async () => {
    // Mock Entry to throw on construction — if probe runs, it would trigger
    vi.doMock('@napi-rs/keyring', () => {
      class MockEntry {
        constructor(_service: string, _account: string) {
          throw new Error('native module broken');
        }
        getPassword(): string | null {
          return null;
        }
      }
      return { Entry: MockEntry };
    });

    const { createTokenStore } = await import('../../src/auth/factory.js');
    const tmpDir = makeTmpDir();
    const warn = vi.fn();

    // forceBackend: 'file' must skip probe — no warn, file backend returned
    const fileStore = await createTokenStore({
      filePath: path.join(tmpDir, 'auth.json'),
      warn,
      forceBackend: 'file',
    });
    expect(fileStore.backend).toBe('file');
    expect(warn).not.toHaveBeenCalled();

    // forceBackend: 'keychain' must skip probe — no warn, keychain backend returned
    // (The broken constructor would only be exercised at use-time, not factory-time)
    const keychainStore = await createTokenStore({
      filePath: path.join(tmpDir, 'auth.json'),
      warn,
      forceBackend: 'keychain',
    });
    expect(keychainStore.backend).toBe('keychain');
    expect(warn).not.toHaveBeenCalled();
  });
});
