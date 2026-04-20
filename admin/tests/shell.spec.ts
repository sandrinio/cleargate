import { test, expect } from '@playwright/test';

/**
 * Playwright smoke test — STORY-006-01 Gherkin: "Playwright smoke"
 * Asserts the shell renders on / with correct Design Guide §2.2 tokens
 */
test.describe('Shell scaffold smoke', () => {
  test('login page renders with Sign-In button stub', async ({ page }) => {
    await page.goto('/login');
    // Page must load without error
    await expect(page).toHaveTitle(/ClearGate/i);
    // Sign-in button stub must be present
    const signInBtn = page.getByRole('button', { name: /sign in with github/i });
    await expect(signInBtn).toBeVisible();
  });

  test('dashboard page background is cream canvas #F4F1EC (bg-base-300)', async ({ page }) => {
    await page.goto('/');
    // Check that the body/html background resolves to the cream canvas token
    const bodyBg = await page.evaluate(() => {
      return window.getComputedStyle(document.body).backgroundColor;
    });
    // rgb(244, 241, 236) = #F4F1EC
    expect(bodyBg).toBe('rgb(244, 241, 236)');
  });

  test('primary color token resolves to #E85C2F terracotta on logo squircle', async ({ page }) => {
    await page.goto('/');
    // Find the logo squircle (bg-primary element in header)
    const logoSquircle = page.locator('header a div.bg-primary').first();
    await expect(logoSquircle).toBeVisible();
    const bgColor = await logoSquircle.evaluate((el) => {
      return window.getComputedStyle(el).backgroundColor;
    });
    // rgb(232, 92, 47) = #E85C2F
    expect(bgColor).toBe('rgb(232, 92, 47)');
  });

  test('placeholder text renders on dashboard', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('Dashboard coming in STORY-006-03')).toBeVisible();
  });

  test('no request to fonts.googleapis.com or fonts.gstatic.com', async ({ page }) => {
    const googleFontRequests: string[] = [];

    page.on('request', (request) => {
      const url = request.url();
      if (url.includes('fonts.googleapis.com') || url.includes('fonts.gstatic.com')) {
        googleFontRequests.push(url);
      }
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    expect(googleFontRequests).toHaveLength(0);
  });
});

/**
 * Mobile viewport test — STORY-006-01 QA kickback fix
 * Asserts sidebar is hidden, mobile-menu button is visible, and no horizontal overflow at 390px.
 */
test.describe('Shell mobile viewport (390px)', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('sidebar hidden, mobile-menu button visible, no horizontal overflow at 390px', async ({
    page,
  }) => {
    await page.goto('/');

    // 1. aside sidebar must NOT be visible at 390px (hidden lg:flex → hidden on mobile)
    const sidebar = page.locator('aside');
    await expect(sidebar).toBeHidden();

    // 2. mobile-menu IconButton must be visible at 390px (lg:hidden → visible on mobile)
    const mobileMenuBtn = page.getByRole('button', { name: 'Open navigation menu' });
    await expect(mobileMenuBtn).toBeVisible();

    // 3. no horizontal overflow — scrollWidth must not exceed viewport width
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(scrollWidth).toBeLessThanOrEqual(390);
  });
});
