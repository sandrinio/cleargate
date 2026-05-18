/**
 * mock-overrides.ts — STORY-028-07
 *
 * Shared mutable state for SvelteKit virtual module overrides in tests.
 * Allows tests to override navigation/env functions without mock.module().
 *
 * Usage in test file:
 *   import { navOverrides, envOverrides } from '../mock-overrides.ts';
 *   // Then in beforeEach/test:
 *   navOverrides.goto = mock.fn();
 *   // The component will call navOverrides.goto instead of the stub
 */

// Navigation overrides ($app/navigation)
export const navOverrides = {
  goto: (_url: string, _opts?: unknown) => Promise.resolve(),
  beforeNavigate: (_cb: (nav: { cancel: () => void }) => void) => {},
  afterNavigate: (_cb: () => void) => {},
  invalidate: (_url: string) => Promise.resolve(),
  invalidateAll: () => Promise.resolve(),
  preloadData: (_url: string) => Promise.resolve(),
  preloadCode: (_url: string) => {},
};

// Env overrides ($env/dynamic/public)
export const envPublic: Record<string, string | undefined> = {
  PUBLIC_MCP_URL: undefined,
};
