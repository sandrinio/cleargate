import { describe, it, expect } from 'vitest';
import { requireToken } from '../../src/auth/require-token.js';
import type { TokenStore } from '../../src/auth/token-store.js';

/** Inline fake store for unit testing requireToken — no disk or keychain I/O. */
class FakeTokenStore implements TokenStore {
  readonly backend = 'file' as const;
  private readonly data = new Map<string, string>();

  seed(profile: string, token: string): void {
    this.data.set(profile, token);
  }

  async save(profile: string, token: string): Promise<void> {
    this.data.set(profile, token);
  }

  async load(profile: string): Promise<string | null> {
    return this.data.get(profile) ?? null;
  }

  async remove(profile: string): Promise<void> {
    this.data.delete(profile);
  }
}

describe('requireToken', () => {
  // Test 18: missing token throws exact message
  it('Test 18: missing token throws exact error message', async () => {
    const emptyStore = new FakeTokenStore();
    await expect(requireToken('default', emptyStore)).rejects.toThrow(
      'No refresh token for profile "default". Run `cleargate join <invite-url>` first.',
    );
  });

  // Test 19: present token returned verbatim
  it('Test 19: present token is returned verbatim', async () => {
    const store = new FakeTokenStore();
    store.seed('default', 'rt_x');
    const result = await requireToken('default', store);
    expect(result).toBe('rt_x');
  });
});
