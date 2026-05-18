/**
 * Mock for mcp-client — used in unit tests.
 * STORY-028-07: supports per-test function overrides.
 *
 * Tests import __mockFns__ and set mock functions before rendering:
 *   import { __mockFns__ } from '../../src/lib/__mocks__/mcp-client.ts';
 *   beforeEach(() => { __mockFns__.post = mock.fn(); });
 *   afterEach(() => { __mockFns__.post = undefined; });
 */

// Mutable mock state — components will call these via the wrapper functions below
export const __mockFns__: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  post?: (...args: any[]) => any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  get?: (...args: any[]) => any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  del?: (...args: any[]) => any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  exchange?: (...args: any[]) => any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  signOut?: (...args: any[]) => any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getAdminToken?: (...args: any[]) => any;
} = {};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function post(...args: any[]): Promise<any> {
  if (__mockFns__.post) return __mockFns__.post(...args);
  return undefined;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function get(...args: any[]): Promise<any> {
  if (__mockFns__.get) return __mockFns__.get(...args);
  return undefined;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function del(...args: any[]): Promise<any> {
  if (__mockFns__.del) return __mockFns__.del(...args);
  return undefined;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function exchange(...args: any[]): Promise<any> {
  if (__mockFns__.exchange) return __mockFns__.exchange(...args);
  return { admin_token: 'mock-token', expires_at: new Date(Date.now() + 3600000).toISOString() };
}

export function signOut(): void {
  if (__mockFns__.signOut) __mockFns__.signOut();
}

export function getAdminToken(): string {
  if (__mockFns__.getAdminToken) return __mockFns__.getAdminToken();
  return 'mock-token';
}

export function _setBaseUrl(_url: string): void {}
export function _setFetch(_f: typeof fetch): void {}
export function _resetState(): void {
  Object.keys(__mockFns__).forEach(k => delete __mockFns__[k as keyof typeof __mockFns__]);
}

export const mcpClient = { get, post, del, exchange, signOut };
