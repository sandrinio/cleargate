/**
 * Health check helpers — STORY-006-10
 *
 * Extracted from the /health route so they can be unit-tested without
 * SvelteKit's endpoint export restrictions.
 */
import { Redis } from 'ioredis';

export type CheckResult = 'ok' | 'fail' | 'skipped';

export async function checkRedis(redisUrl?: string): Promise<CheckResult> {
  const url = redisUrl ?? process.env['REDIS_URL'];
  if (!url) return 'fail';

  const redis = new Redis(url, {
    connectTimeout: 500,
    commandTimeout: 500,
    maxRetriesPerRequest: 0,
    enableOfflineQueue: false,
    lazyConnect: true,
  });

  try {
    await redis.connect();
    const result = await Promise.race<string | null>([
      redis.ping(),
      new Promise<null>((_, reject) =>
        setTimeout(() => reject(new Error('Redis PING timeout')), 500),
      ),
    ]);
    return result === 'PONG' ? 'ok' : 'fail';
  } catch {
    return 'fail';
  } finally {
    redis.disconnect();
  }
}

export async function checkMcp(mcpUrl?: string): Promise<CheckResult> {
  const url = mcpUrl ?? process.env['PUBLIC_MCP_URL'];
  if (!url) return 'skipped';

  try {
    const response = await fetch(`${url}/health`, {
      method: 'HEAD',
      signal: AbortSignal.timeout(500),
    });
    return response.ok ? 'ok' : 'fail';
  } catch {
    return 'fail';
  }
}
