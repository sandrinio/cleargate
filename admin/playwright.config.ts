import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  testMatch: ['**/*.spec.ts'],
  fullyParallel: true,
  forbidOnly: !!process.env['CI'],
  retries: process.env['CI'] ? 2 : 0,
  workers: process.env['CI'] ? 1 : undefined,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    port: 5173,
    reuseExistingServer: !process.env['CI'],
    timeout: 30_000,
    // CLEARGATE_DISABLE_AUTH=1 bypasses the auth redirect guard so the M1 shell smoke test
    // can hit / without a real cg_session cookie (test-only — never use in production).
    env: {
      CLEARGATE_DISABLE_AUTH: '1',
      // Prevent @auth/sveltekit from throwing on missing envs during dev smoke test
      CLEARGATE_GITHUB_WEB_CLIENT_ID: 'placeholder-for-smoke-test',
      CLEARGATE_GITHUB_WEB_CLIENT_SECRET: 'placeholder-for-smoke-test',
      AUTH_SECRET: 'smoke-test-secret-32-chars-minimum-ok',
      REDIS_URL: 'redis://localhost:6379',
    },
  },
});
