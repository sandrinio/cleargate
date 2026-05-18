import { describe, test, beforeEach, mock } from 'node:test';
import assert from 'node:assert/strict';

import { mkdtempSync } from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
describe('createTokenStore factory', () => {
  beforeEach(() => {
    mock.reset();
  });

  function makeTmpDir(): string {
    return mkdtempSync(path.join(os.tmpdir(), 'cleargate-factory-'));
  }

  // Test 15: Keychain probe success → keychain backend, no warning emitted
  test('Test 15: probe success returns keychain backend with no warning', async () => {
    class MockEntrySuccess {
      constructor(_service: string, _account: string) {}
      getPassword(): string | null {
        return null; // probe returns null cleanly
      }
    }
    await mock.module('@napi-rs/keyring', { namedExports: { Entry: MockEntrySuccess } });

    const { createTokenStore } = await import('../../src/auth/factory.js');
    const tmpDir = makeTmpDir();
    const warn = mock.fn();

    const store = await createTokenStore({
      keychainService: 'test-probe-success',
      filePath: path.join(tmpDir, 'auth.json'),
      warn,
    });

    assert.strictEqual(store.backend, 'keychain');
    assert.strictEqual(warn.mock.calls.length, 0);
  });

  // Test 16: Keychain constructor throw → file backend + warning with "keychain unavailable"
  test('Test 16: keychain constructor throw returns file backend and emits keychain unavailable warning', async () => {
    class MockEntryThrows {
      constructor(_service: string, _account: string) {
        throw new Error('module not found');
      }
      getPassword(): string | null {
        return null;
      }
    }
    await mock.module('@napi-rs/keyring', { namedExports: { Entry: MockEntryThrows } });

    const { createTokenStore } = await import('../../src/auth/factory.js');
    const tmpDir = makeTmpDir();
    const warn = mock.fn();

    const store = await createTokenStore({
      filePath: path.join(tmpDir, 'auth.json'),
      warn,
    });

    assert.strictEqual(store.backend, 'file');
    assert.strictEqual(warn.mock.calls.length, 1);
    assert.ok(String(warn.mock.calls[0].arguments[0]).includes('keychain unavailable'));
  });

  // Test 17: forceBackend: 'file' skips probe; forceBackend: 'keychain' skips probe
  test('Test 17: forceBackend skips probe entirely', async () => {
    // Mock Entry to throw on construction — if probe runs, it would trigger
    class MockEntryBroken {
      constructor(_service: string, _account: string) {
        throw new Error('native module broken');
      }
      getPassword(): string | null {
        return null;
      }
    }
    await mock.module('@napi-rs/keyring', { namedExports: { Entry: MockEntryBroken } });

    const { createTokenStore } = await import('../../src/auth/factory.js');
    const tmpDir = makeTmpDir();
    const warn = mock.fn();

    // forceBackend: 'file' must skip probe — no warn, file backend returned
    const fileStore = await createTokenStore({
      filePath: path.join(tmpDir, 'auth.json'),
      warn,
      forceBackend: 'file',
    });
    assert.strictEqual(fileStore.backend, 'file');
    assert.strictEqual(warn.mock.calls.length, 0);

    // forceBackend: 'keychain' must skip probe — no warn, keychain backend returned
    // (The broken constructor would only be exercised at use-time, not factory-time)
    const keychainStore = await createTokenStore({
      filePath: path.join(tmpDir, 'auth.json'),
      warn,
      forceBackend: 'keychain',
    });
    assert.strictEqual(keychainStore.backend, 'keychain');
    assert.strictEqual(warn.mock.calls.length, 0);
  });
});
