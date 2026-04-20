/**
 * Health endpoint unit tests — STORY-006-10
 *
 * Tests the GET /health handler (via the +server.ts route) and the
 * underlying health-check helper functions.
 * Mocks ioredis to avoid real network calls.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Shared mock state — hoisted so it's available inside vi.mock factory
const mockConnect = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const mockPing = vi.hoisted(() => vi.fn().mockResolvedValue('PONG'));
const mockDisconnect = vi.hoisted(() => vi.fn());

// Hoisted mock for ioredis — factory runs before any import
vi.mock('ioredis', () => {
  const RedisMock = vi.fn().mockImplementation(() => ({
    connect: mockConnect,
    ping: mockPing,
    disconnect: mockDisconnect,
  }));
  return { Redis: RedisMock };
});

import { checkRedis, checkMcp } from '../../src/lib/server/health-checks.js';
import { GET } from '../../src/routes/health/+server.js';

describe('GET /health (STORY-006-10)', () => {
  const savedEnv = { ...process.env };
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    process.env['REDIS_URL'] = 'redis://localhost:6379';
    process.env['PUBLIC_MCP_URL'] = 'http://localhost:3001';
    // Healthy Redis defaults
    mockConnect.mockResolvedValue(undefined);
    mockPing.mockResolvedValue('PONG');
    mockDisconnect.mockReset();
    // Healthy MCP default
    mockFetch = vi.fn().mockResolvedValue(new Response('ok', { status: 200 }));
    vi.stubGlobal('fetch', mockFetch);
  });

  afterEach(() => {
    for (const key of ['REDIS_URL', 'PUBLIC_MCP_URL']) {
      if (savedEnv[key] !== undefined) {
        process.env[key] = savedEnv[key];
      } else {
        delete process.env[key];
      }
    }
    vi.unstubAllGlobals();
  });

  it('Scenario: Health endpoint boots — returns 200 with status ok and both checks ok', async () => {
    const response = await GET({ url: new URL('http://localhost/health') } as Parameters<typeof GET>[0]);

    expect(response.status).toBe(200);
    const body = await response.json() as {
      status: string;
      checks: { redis: string; mcp: string };
      version: string;
      time: string;
    };
    expect(body.status).toBe('ok');
    expect(body.checks.redis).toBe('ok');
    expect(body.checks.mcp).toBe('ok');
    expect(typeof body.version).toBe('string');
    expect(typeof body.time).toBe('string');
    expect(response.headers.get('content-type')).toContain('application/json');
  });

  it('Scenario: Health endpoint degrades gracefully without MCP — 200 with checks.mcp = "fail"', async () => {
    mockFetch.mockRejectedValue(new Error('Connection refused'));

    const response = await GET({ url: new URL('http://localhost/health') } as Parameters<typeof GET>[0]);

    expect(response.status).toBe(200);
    const body = await response.json() as { status: string; checks: { redis: string; mcp: string } };
    expect(body.status).toBe('ok');
    expect(body.checks.redis).toBe('ok');
    expect(body.checks.mcp).toBe('fail');
  });

  it('Scenario: Health endpoint fails if Redis is down — 503 with checks.redis = "fail"', async () => {
    mockConnect.mockRejectedValue(new Error('ECONNREFUSED'));

    const response = await GET({ url: new URL('http://localhost/health') } as Parameters<typeof GET>[0]);

    expect(response.status).toBe(503);
    const body = await response.json() as { status: string; checks: { redis: string; mcp: string } };
    expect(body.status).toBe('fail');
    expect(body.checks.redis).toBe('fail');
  });

  it('response body includes version and time fields', async () => {
    const response = await GET({ url: new URL('http://localhost/health') } as Parameters<typeof GET>[0]);
    const body = await response.json() as { version: string; time: string };
    expect(body.version).toBeDefined();
    // time must be a valid ISO 8601 string
    expect(new Date(body.time).toISOString()).toBe(body.time);
  });

  it('checkMcp returns "skipped" when empty URL is provided', async () => {
    const result = await checkMcp('');
    expect(result).toBe('skipped');
  });

  it('checkRedis returns "fail" when empty URL is provided', async () => {
    const result = await checkRedis('');
    expect(result).toBe('fail');
  });
});
