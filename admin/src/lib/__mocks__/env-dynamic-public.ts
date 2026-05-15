/**
 * Stub for $env/dynamic/public — used in vitest unit tests.
 * In production, SvelteKit replaces this with real env vars.
 * In unit tests, vi.mock('$env/dynamic/public', ...) overrides this stub.
 */
export const env: Record<string, string | undefined> = {
  PUBLIC_MCP_URL: undefined,
};
