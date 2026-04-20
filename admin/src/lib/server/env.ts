/**
 * Required-env preflight — STORY-006-10
 *
 * Called at app boot from hooks.server.ts. Throws with a descriptive error
 * message if any required environment variable is missing or empty.
 * This causes the Node process to exit 1 with a clear log line on boot.
 *
 * Defense-in-depth: also forbids CLEARGATE_DISABLE_AUTH=1 in production
 * (the dev bypass from M1 must never ship to prod).
 */

export class EnvError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EnvError';
  }
}

const REQUIRED_VARS = [
  'CLEARGATE_GITHUB_WEB_CLIENT_ID',
  'CLEARGATE_GITHUB_WEB_CLIENT_SECRET',
  'AUTH_SECRET',
  'REDIS_URL',
  'PUBLIC_MCP_URL',
] as const;

/**
 * Validate required environment variables.
 * Throws EnvError with the name of the first missing variable.
 */
export function checkEnv(env: Record<string, string | undefined> = process.env): void {
  for (const key of REQUIRED_VARS) {
    if (!env[key]) {
      throw new EnvError(`missing required env: ${key}`);
    }
  }

  // Defense-in-depth: CLEARGATE_DISABLE_AUTH=1 must never run in production
  if (env['NODE_ENV'] === 'production' && env['CLEARGATE_DISABLE_AUTH'] === '1') {
    throw new EnvError(
      'CLEARGATE_DISABLE_AUTH=1 is forbidden in NODE_ENV=production; unset it before deploying',
    );
  }
}

// Run the check immediately at module load — fail-fast at boot.
// Skip in test environments where required vars are intentionally absent.
if (process.env['VITEST'] !== 'true' && process.env['NODE_ENV'] !== 'test') {
  checkEnv();
}
