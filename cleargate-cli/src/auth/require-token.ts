import type { TokenStore } from './token-store.js';

/**
 * Asserts a refresh token is present for the given profile.
 * Throws a user-friendly error if the token is missing.
 *
 * Mirrors requireMcpUrl from config.ts — single throw site for "missing token".
 */
export async function requireToken(
  profile: string,
  store: TokenStore,
): Promise<string> {
  const token = await store.load(profile);
  if (token === null) {
    throw new Error(
      `No refresh token for profile "${profile}". Run \`cleargate join <invite-url>\` first.`,
    );
  }
  return token;
}
