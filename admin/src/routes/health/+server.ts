/**
 * Health endpoint — STORY-006-10
 *
 * GET /health
 * - No auth required (used by Coolify + Dockerfile HEALTHCHECK)
 * - Checks Redis reachability (PING with 500ms timeout)
 * - Checks MCP reachability (fetch with 500ms timeout, warn-don't-fail)
 * - Redis fail → 503 with checks.redis = "fail"
 * - MCP fail → 200 with checks.mcp = "fail" (degrade-warn)
 */

import type { RequestHandler } from '@sveltejs/kit';
import { checkRedis, checkMcp } from '$lib/server/health-checks.js';

interface HealthResponse {
  status: 'ok' | 'fail';
  version: string;
  time: string;
  checks: {
    redis: 'ok' | 'fail' | 'skipped';
    mcp: 'ok' | 'fail' | 'skipped';
  };
}

export const GET: RequestHandler = async () => {
  const [redisResult, mcpResult] = await Promise.all([checkRedis(), checkMcp()]);

  const body: HealthResponse = {
    status: redisResult === 'ok' ? 'ok' : 'fail',
    version: process.env['npm_package_version'] ?? '0.1.0',
    time: new Date().toISOString(),
    checks: {
      redis: redisResult,
      mcp: mcpResult,
    },
  };

  const httpStatus = redisResult === 'ok' ? 200 : 503;

  return new Response(JSON.stringify(body), {
    status: httpStatus,
    headers: { 'content-type': 'application/json' },
  });
};
