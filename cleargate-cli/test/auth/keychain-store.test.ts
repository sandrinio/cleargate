import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock @napi-rs/keyring before importing KeychainTokenStore
vi.mock('@napi-rs/keyring', () => {
  const store = new Map<string, string>();

  class MockEntry {
    private key: string;
    constructor(service: string, account: string) {
      this.key = `${service}:${account}`;
    }
    setPassword(password: string): void {
      store.set(this.key, password);
    }
    getPassword(): string | null {
      return store.get(this.key) ?? null;
    }
    deletePassword(): boolean {
      return store.delete(this.key);
    }
  }

  return { Entry: MockEntry };
});

import { KeychainTokenStore } from '../../src/auth/keychain-store.js';

describe('KeychainTokenStore (mocked @napi-rs/keyring)', () => {
  let store: KeychainTokenStore;

  beforeEach(() => {
    // Each test gets a fresh store with unique service to avoid cross-test pollution
    store = new KeychainTokenStore(`test-svc-${Math.random()}`);
  });

  // Test 12: round-trip via mocked Entry
  it('Test 12: save/load round-trips token via mocked Entry', async () => {
    await store.save('default', 'secret-token');
    expect(await store.load('default')).toBe('secret-token');
  });

  // Test 13: getPassword returning null from mock surfaces as null from load
  it('Test 13: getPassword returning null surfaces as null from load', async () => {
    // Never saved — mock returns null
    expect(await store.load('never-saved')).toBeNull();
  });

  // Test 14: deletePassword returning false (entry didn't exist) is swallowed by remove
  it('Test 14: remove on missing profile does not throw', async () => {
    // Never saved anything — deletePassword returns false, remove must not throw
    await expect(store.remove('missing')).resolves.toBeUndefined();
  });
});
