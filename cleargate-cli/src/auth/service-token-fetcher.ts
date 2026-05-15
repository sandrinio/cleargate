/**
 * service-token-fetcher.ts — CR-065
 *
 * Static TokenFetcher implementation for service-token auth mode.
 * Used by `cleargate mcp serve` when CLEARGATE_SERVICE_TOKEN is set.
 *
 * Service tokens are long-lived bearer tokens (TTL set at issuance in admin
 * console). No rotation, no expiry logic, no keychain interaction.
 */

import type { TokenFetcher } from './refresh.js';

export class ServiceTokenFetcher implements TokenFetcher {
  constructor(private readonly token: string) {}

  async getAccessToken(): Promise<string> {
    return this.token;
  }
}
