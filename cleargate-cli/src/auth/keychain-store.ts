import { Entry } from '@napi-rs/keyring';
import type { TokenStore } from './token-store.js';

export class KeychainTokenStore implements TokenStore {
  readonly backend = 'keychain' as const;

  constructor(private readonly service: string) {}

  async save(profile: string, token: string): Promise<void> {
    new Entry(this.service, profile).setPassword(token);
  }

  async load(profile: string): Promise<string | null> {
    try {
      const result = new Entry(this.service, profile).getPassword();
      // getPassword() returns string | null per @napi-rs/keyring@1.2.0 index.d.ts:124
      // Despite the docstring claiming it throws NoEntry, the return type wins.
      // Handle both: null return AND potential thrown NoEntry (platform-specific).
      return result ?? null;
    } catch {
      // NoEntry or other keychain error — treat as absent
      return null;
    }
  }

  async remove(profile: string): Promise<void> {
    try {
      new Entry(this.service, profile).deletePassword();
    } catch {
      // Entry didn't exist or other keychain error — idempotent, swallow
    }
  }
}
