/**
 * Stub for $env/dynamic/public — used in unit tests.
 * STORY-028-07: Updated to support per-test overrides via __envOverrides__.
 *
 * Tests can override:
 *   import { __envOverrides__ } from '../../src/lib/__mocks__/env-dynamic-public.ts';
 *   beforeEach(() => { __envOverrides__.PUBLIC_MCP_URL = 'https://mcp.example.test'; });
 *   afterEach(() => { delete __envOverrides__.PUBLIC_MCP_URL; });
 */

export const __envOverrides__: Record<string, string | undefined> = {};

export const env: Record<string, string | undefined> = new Proxy({}, {
  get(_, key: string) {
    return __envOverrides__[key] ?? undefined;
  },
  has(_, key: string) {
    return key in __envOverrides__;
  },
});
