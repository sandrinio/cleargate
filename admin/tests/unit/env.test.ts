/**
 * Required-env preflight unit tests — STORY-006-10
 *
 * Tests that checkEnv() throws EnvError for each missing required variable
 * and does NOT throw when all vars are present.
 */
import { describe, it, expect } from 'vitest';
import { checkEnv, EnvError } from '../../src/lib/server/env.js';

const ALL_REQUIRED = {
  CLEARGATE_GITHUB_WEB_CLIENT_ID: 'test-client-id',
  CLEARGATE_GITHUB_WEB_CLIENT_SECRET: 'test-client-secret',
  AUTH_SECRET: 'a-very-long-auth-secret-string-32-bytes',
  REDIS_URL: 'redis://localhost:6379',
  PUBLIC_MCP_URL: 'http://localhost:3001',
  NODE_ENV: 'test',
};

describe('checkEnv (STORY-006-10)', () => {
  it('passes when all required vars are present', () => {
    expect(() => checkEnv(ALL_REQUIRED)).not.toThrow();
  });

  it('Scenario: Env-var preflight — throws EnvError if CLEARGATE_GITHUB_WEB_CLIENT_ID is missing', () => {
    const env = { ...ALL_REQUIRED };
    delete (env as Partial<typeof env>)['CLEARGATE_GITHUB_WEB_CLIENT_ID'];
    expect(() => checkEnv(env)).toThrow(EnvError);
    expect(() => checkEnv(env)).toThrow('missing required env: CLEARGATE_GITHUB_WEB_CLIENT_ID');
  });

  it('throws EnvError if CLEARGATE_GITHUB_WEB_CLIENT_SECRET is missing', () => {
    const env = { ...ALL_REQUIRED };
    delete (env as Partial<typeof env>)['CLEARGATE_GITHUB_WEB_CLIENT_SECRET'];
    expect(() => checkEnv(env)).toThrow(EnvError);
    expect(() => checkEnv(env)).toThrow('missing required env: CLEARGATE_GITHUB_WEB_CLIENT_SECRET');
  });

  it('throws EnvError if AUTH_SECRET is missing', () => {
    const env = { ...ALL_REQUIRED };
    delete (env as Partial<typeof env>)['AUTH_SECRET'];
    expect(() => checkEnv(env)).toThrow(EnvError);
    expect(() => checkEnv(env)).toThrow('missing required env: AUTH_SECRET');
  });

  it('throws EnvError if REDIS_URL is missing', () => {
    const env = { ...ALL_REQUIRED };
    delete (env as Partial<typeof env>)['REDIS_URL'];
    expect(() => checkEnv(env)).toThrow(EnvError);
    expect(() => checkEnv(env)).toThrow('missing required env: REDIS_URL');
  });

  it('throws EnvError if PUBLIC_MCP_URL is missing', () => {
    const env = { ...ALL_REQUIRED };
    delete (env as Partial<typeof env>)['PUBLIC_MCP_URL'];
    expect(() => checkEnv(env)).toThrow(EnvError);
    expect(() => checkEnv(env)).toThrow('missing required env: PUBLIC_MCP_URL');
  });

  it('throws if CLEARGATE_DISABLE_AUTH=1 is set in production', () => {
    const env = { ...ALL_REQUIRED, NODE_ENV: 'production', CLEARGATE_DISABLE_AUTH: '1' };
    expect(() => checkEnv(env)).toThrow(EnvError);
    expect(() => checkEnv(env)).toThrow('CLEARGATE_DISABLE_AUTH=1 is forbidden in NODE_ENV=production');
  });

  it('allows CLEARGATE_DISABLE_AUTH=1 in non-production environments', () => {
    const env = { ...ALL_REQUIRED, NODE_ENV: 'development', CLEARGATE_DISABLE_AUTH: '1' };
    expect(() => checkEnv(env)).not.toThrow();
  });

  it('error message includes "missing required env:" prefix for container log detection', () => {
    const env = { ...ALL_REQUIRED };
    delete (env as Partial<typeof env>)['AUTH_SECRET'];
    let caughtError: Error | null = null;
    try {
      checkEnv(env);
    } catch (err) {
      caughtError = err as Error;
    }
    expect(caughtError).not.toBeNull();
    expect(caughtError!.message).toMatch(/^missing required env:/);
  });
});
