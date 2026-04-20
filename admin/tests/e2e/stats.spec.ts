/**
 * Playwright E2E — Stats page — STORY-006-08
 *
 * Scenarios:
 *   - Navigate to /projects/<P>/stats: chart + chips + window selector render
 *   - Window selector updates URL (?window=7d)
 *   - Summary chips show correct values from mocked endpoint
 *   - Empty project: chips show "0" and "—", empty overlay visible
 *   - Stats endpoint 503: retry banner shows
 *   - Navigate to /: NO chart.js chunk is requested (lazy-load invariant)
 *   - Navigate to /stats: chart.js chunk IS requested
 *
 * Requires: CLEARGATE_DISABLE_AUTH=1 (set in playwright.config.ts webServer env)
 */
import { test, expect } from '@playwright/test';

const EXCHANGE_URL = '**/admin-api/v1/auth/exchange';
const PROJECTS_URL = '**/admin-api/v1/projects';
const STATS_URL = '**/admin-api/v1/projects/*/stats*';

const STUB_PROJECT_ID = 'proj-stats-test';

const stubExchange = {
  admin_token: 'test-token-stats',
  expires_at: new Date(Date.now() + 3600 * 1000).toISOString(),
};

const stubProjects = [
  {
    id: STUB_PROJECT_ID,
    name: 'Stats Test Project',
    created_by: 'admin',
    created_at: new Date(Date.now() - 86400 * 1000).toISOString(),
    deleted_at: null,
  },
];

const stubStats30d = {
  window: '30d',
  requests_per_day: [
    { date: '2026-03-20', count: 5 },
    { date: '2026-03-21', count: 12 },
    { date: '2026-03-22', count: 8 },
    { date: '2026-03-23', count: 0 },
    { date: '2026-03-24', count: 20 },
  ],
  error_rate: 0.05,
  top_items: [
    { cleargate_id: 'EPIC-042', writes: 30 },
    { cleargate_id: 'STORY-007-01', writes: 15 },
  ],
};

const stubStats7d = {
  window: '7d',
  requests_per_day: [
    { date: '2026-04-13', count: 3 },
    { date: '2026-04-14', count: 7 },
  ],
  error_rate: 0.1,
  top_items: [{ cleargate_id: 'EPIC-042', writes: 10 }],
};

const stubStatsEmpty = {
  window: '30d',
  requests_per_day: [],
  error_rate: 0,
  top_items: [],
};

function mockExchange(page: import('@playwright/test').Page) {
  return page.route(EXCHANGE_URL, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(stubExchange),
    }),
  );
}

function mockProjects(page: import('@playwright/test').Page) {
  return page.route(PROJECTS_URL, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ projects: stubProjects }),
    }),
  );
}

test.describe('Stats page (STORY-006-08)', () => {
  test('Scenario: Stats page renders chips, chart, and window selector', async ({ page }) => {
    await mockExchange(page);
    await mockProjects(page);

    await page.route(STATS_URL, (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(stubStats30d),
      }),
    );

    await page.goto(`/projects/${STUB_PROJECT_ID}/stats`);

    // Wait for chips to render
    await expect(page.getByTestId('stats-chips')).toBeVisible({ timeout: 10_000 });

    // Two chips: Requests + Error rate
    const chips = page.getByTestId('value-chip-value');
    await expect(chips).toHaveCount(2);

    // Check requests total: 5+12+8+0+20 = 45
    await expect(chips.first()).toHaveText('45');

    // Check error rate: 5.0%
    await expect(chips.nth(1)).toHaveText('5.0%');

    // Window selector is visible
    await expect(page.getByTestId('window-btn-30d')).toBeVisible();
    await expect(page.getByTestId('window-btn-7d')).toBeVisible();
    await expect(page.getByTestId('window-btn-90d')).toBeVisible();

    // Chart wrapper is rendered
    await expect(page.getByTestId('requests-chart')).toBeVisible();

    // Top items table has EPIC-042
    await expect(page.getByTestId('top-items-table')).toBeVisible();
    await expect(page.getByTestId('item-link-EPIC-042')).toBeVisible();
  });

  test('Scenario: Window selector updates URL to ?window=7d', async ({ page }) => {
    await mockExchange(page);
    await mockProjects(page);

    // Return different data based on window param
    await page.route(STATS_URL, async (route) => {
      const url = new URL(route.request().url());
      const w = url.searchParams.get('window');
      const body = w === '7d' ? stubStats7d : stubStats30d;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(body),
      });
    });

    await page.goto(`/projects/${STUB_PROJECT_ID}/stats`);
    await expect(page.getByTestId('stats-chips')).toBeVisible({ timeout: 10_000 });

    // Click the 7d button
    await page.getByTestId('window-btn-7d').click();

    // URL should update
    await expect(page).toHaveURL(/window=7d/);

    // Chips should update for 7d data: total = 3+7 = 10
    await expect(page.getByTestId('value-chip-value').first()).toHaveText('10', {
      timeout: 5_000,
    });
  });

  test('Scenario: Empty project shows "0" requests, "—" error rate, empty overlay', async ({
    page,
  }) => {
    await mockExchange(page);
    await mockProjects(page);

    await page.route(STATS_URL, (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(stubStatsEmpty),
      }),
    );

    await page.goto(`/projects/${STUB_PROJECT_ID}/stats`);
    await expect(page.getByTestId('stats-chips')).toBeVisible({ timeout: 10_000 });

    // 0 requests
    await expect(page.getByTestId('value-chip-value').first()).toHaveText('0');
    // — error rate
    await expect(page.getByTestId('value-chip-value').nth(1)).toHaveText('—');

    // Empty overlay
    await expect(page.getByTestId('chart-empty-overlay')).toBeVisible();
    await expect(page.getByText('No activity in this window')).toBeVisible();
  });

  test('Scenario: Stats endpoint 503 shows retry banner', async ({ page }) => {
    await mockExchange(page);
    await mockProjects(page);

    await page.route(STATS_URL, (route) =>
      route.fulfill({
        status: 503,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Service unavailable' }),
      }),
    );

    await page.goto(`/projects/${STUB_PROJECT_ID}/stats`);

    await expect(page.getByTestId('stats-error')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole('button', { name: 'Retry' })).toBeVisible();
  });

  test('Scenario: Sparse activity hint shows when <3 active days', async ({ page }) => {
    await mockExchange(page);
    await mockProjects(page);

    const sparseStats = {
      window: '30d',
      requests_per_day: [
        { date: '2026-04-01', count: 5 },
        { date: '2026-04-02', count: 0 },
        { date: '2026-04-03', count: 0 },
      ],
      error_rate: 0,
      top_items: [],
    };

    await page.route(STATS_URL, (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(sparseStats),
      }),
    );

    await page.goto(`/projects/${STUB_PROJECT_ID}/stats`);
    await expect(page.getByTestId('stats-chips')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId('sparse-hint')).toBeVisible();
    await expect(page.getByText(/Not much activity yet/)).toBeVisible();
  });

  test('Scenario: Dashboard / does NOT request chart.js chunk (lazy-load invariant)', async ({
    page,
  }) => {
    await mockExchange(page);
    await mockProjects(page);

    const chartRequests: string[] = [];
    page.on('request', (req) => {
      if (/chart.*\.js/.test(req.url())) {
        chartRequests.push(req.url());
      }
    });

    await page.goto('/');
    // Wait for the dashboard to load
    await page.waitForLoadState('networkidle');

    // Give time for any deferred chunks
    await page.waitForTimeout(1000);

    expect(
      chartRequests,
      `chart.js should NOT be requested on dashboard /. Got: ${chartRequests.join(', ')}`,
    ).toHaveLength(0);
  });

  test('Scenario: Top items CLID link routes to /items/<clid>', async ({ page }) => {
    await mockExchange(page);
    await mockProjects(page);

    await page.route(STATS_URL, (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(stubStats30d),
      }),
    );

    await page.goto(`/projects/${STUB_PROJECT_ID}/stats`);
    await expect(page.getByTestId('item-link-EPIC-042')).toBeVisible({ timeout: 10_000 });

    const link = page.getByTestId('item-link-EPIC-042');
    await expect(link).toHaveAttribute(
      'href',
      `/projects/${STUB_PROJECT_ID}/items/EPIC-042`,
    );
  });
});
