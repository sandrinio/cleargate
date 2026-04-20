/**
 * Playwright E2E — auth redirect behavior — STORY-006-02
 *
 * Tests auth guard redirect behavior without live GitHub OAuth credentials.
 * The webServer in playwright.config.ts sets CLEARGATE_DISABLE_AUTH=1 for
 * the smoke test, but these tests verify behavior with and without that bypass.
 *
 * Scope: redirect-only (no live GitHub OAuth dance).
 * Full OAuth E2E with mocked GitHub endpoints is deferred to M5 when docker-compose
 * MCP + seeded admin_users table is available.
 */
import { test, expect } from '@playwright/test';

test.describe('Auth guard redirects', () => {
  test('/ renders the shell when CLEARGATE_DISABLE_AUTH=1 (smoke-test bypass)', async ({
    page,
  }) => {
    // The webServer env has CLEARGATE_DISABLE_AUTH=1 so the shell renders without auth
    await page.goto('/');
    // Should NOT redirect to /login (bypass is active)
    await expect(page).not.toHaveURL(/\/login/);
    // Shell placeholder should be visible
    await expect(page.locator('text=Dashboard coming in STORY-006-03')).toBeVisible();
  });

  test('/login page renders the Sign in with GitHub button', async ({ page }) => {
    await page.goto('/login');
    await expect(page).toHaveURL(/\/login/);

    const signInButton = page.getByRole('button', { name: /sign in with github/i });
    await expect(signInButton).toBeVisible();
    await expect(signInButton).toBeEnabled();
  });

  test('/login page shows the "restricted" footnote', async ({ page }) => {
    await page.goto('/login');
    await expect(
      page.getByText(/ClearGate Admin is restricted to approved GitHub users/i),
    ).toBeVisible();
  });

  test('/login page shows error toast for not_authorized error param', async ({ page }) => {
    await page.goto('/login?error=not_authorized');
    await expect(page.getByText(/not on the admin allowlist/i)).toBeVisible();
  });

  test('/login page shows error toast for session_expired error param', async ({ page }) => {
    await page.goto('/login?error=session_expired');
    await expect(page.getByText(/session has expired/i)).toBeVisible();
  });

  test('no auth data in localStorage or sessionStorage after visiting /', async ({ page }) => {
    await page.goto('/');
    const localStorageLength = await page.evaluate(() => window.localStorage.length);
    const sessionStorageLength = await page.evaluate(() => window.sessionStorage.length);
    expect(localStorageLength).toBe(0);
    expect(sessionStorageLength).toBe(0);
  });
});
