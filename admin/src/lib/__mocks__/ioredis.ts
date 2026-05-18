/**
 * Mock for ioredis — used in unit tests.
 * STORY-028-07: redirected via hooks for all test imports.
 *
 * Tests that need to control Redis behavior use the __ioredisState__ pattern:
 *   import { __ioredisState__ } from '../../src/lib/__mocks__/ioredis.ts';
 *   beforeEach(() => {
 *     Object.keys(__ioredisState__.store).forEach((k) => delete __ioredisState__.store[k]);
 *     __ioredisState__.methodOverrides = {};
 *   });
 *
 * For healthz tests that need to control connect/ping/disconnect behavior:
 *   import { __ioredisState__ } from '../../src/lib/__mocks__/ioredis.ts';
 *   __ioredisState__.methodOverrides.connect = () => Promise.reject(new Error('ECONNREFUSED'));
 */

// Shared in-memory store for all Redis instances
export const __ioredisState__: {
  store: Record<string, { value: string; expiresAt?: number }>;
  methodOverrides: {
    connect?: () => Promise<void>;
    ping?: () => Promise<string>;
    disconnect?: () => void | Promise<void>;
  };
} = {
  store: {},
  methodOverrides: {},
};

// Mock Redis class
class Redis {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  constructor(_url?: string, _options?: any) {
    // No connection — pure in-memory mock
  }

  async get(key: string): Promise<string | null> {
    const entry = __ioredisState__.store[key];
    if (!entry) return null;
    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      delete __ioredisState__.store[key];
      return null;
    }
    return entry.value;
  }

  async set(key: string, value: string, ...args: unknown[]): Promise<'OK'> {
    const argsArr = args as string[];
    const ttlIdx = argsArr.findIndex((a) => a === 'EX');
    let expiresAt: number | undefined;
    if (ttlIdx !== -1) {
      const ttlSec = Number(argsArr[ttlIdx + 1]);
      expiresAt = Date.now() + ttlSec * 1000;
    }
    const keepTtlIdx = argsArr.findIndex((a) => a === 'KEEPTTL');
    if (keepTtlIdx !== -1 && __ioredisState__.store[key]) {
      expiresAt = __ioredisState__.store[key].expiresAt;
    }
    __ioredisState__.store[key] = { value, expiresAt };
    return 'OK';
  }

  async del(key: string): Promise<number> {
    const existed = key in __ioredisState__.store;
    delete __ioredisState__.store[key];
    return existed ? 1 : 0;
  }

  async keys(pattern: string): Promise<string[]> {
    const regex = new RegExp('^' + pattern.replace('*', '.*') + '$');
    return Object.keys(__ioredisState__.store).filter((k) => regex.test(k));
  }

  async connect(): Promise<void> {
    if (__ioredisState__.methodOverrides.connect) {
      return __ioredisState__.methodOverrides.connect();
    }
  }

  disconnect(): void | Promise<void> {
    if (__ioredisState__.methodOverrides.disconnect) {
      return __ioredisState__.methodOverrides.disconnect();
    }
  }

  async quit(): Promise<'OK'> { return 'OK'; }

  async ping(): Promise<string> {
    if (__ioredisState__.methodOverrides.ping) {
      return __ioredisState__.methodOverrides.ping();
    }
    return 'PONG';
  }
}

export default Redis;
export { Redis };
