/**
 * Playwright E2E — Items Browser — STORY-006-06 (QA kickback fix)
 *
 * Scenarios:
 *   1. Items list renders + Next hidden when next_cursor null
 *   2. Cursor round-trip via URL
 *   3. Type filter + URL-sync
 *   4. CLID search filters client-side (no network re-call)
 *   5. 404 inline state (item not found)
 *   6. Empty list state
 *   7. Mobile 390px viewport — no horizontal overflow
 *
 * Uses page.route() to mock admin-api endpoints.
 * Requires CLEARGATE_DISABLE_AUTH=1 (set in playwright.config.ts webServer env).
 */
import { test, expect, type Page } from '@playwright/test';

const EXCHANGE_URL = '**/admin-api/v1/auth/exchange';
const PROJECT_URL = '**/admin-api/v1/projects/proj-items-01';
const ITEMS_URL = '**/admin-api/v1/projects/proj-items-01/items**';
const VERSIONS_URL = '**/admin-api/v1/items/*/versions';

const PROJECT_ID = 'proj-items-01';

const stubExchange = {
  admin_token: 'test-token-items',
  expires_at: new Date(Date.now() + 3600 * 1000).toISOString(),
};

const stubProject = {
  id: PROJECT_ID,
  name: 'Items Test Project',
  created_by: 'admin',
  created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
  deleted_at: null,
};

function makeItem(overrides: Record<string, unknown> = {}) {
  return {
    id: `item-uuid-${Math.random().toString(36).slice(2, 8)}`,
    cleargate_id: 'EPIC-001',
    type: 'epic',
    title: 'First epic',
    status: 'Active',
    version: 1,
    last_pushed_at: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
    pushed_by_member_id: null,
    ...overrides,
  };
}

async function setupCommonMocks(page: Page, itemsResponse: unknown) {
  await page.route(EXCHANGE_URL, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(stubExchange),
    }),
  );
  await page.route(PROJECT_URL, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(stubProject),
    }),
  );
  await page.route(ITEMS_URL, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(itemsResponse),
    }),
  );
}

test.describe('Items Browser (STORY-006-06)', () => {
  test('Scenario: Items list renders + Next hidden when next_cursor null', async ({ page }) => {
    const itemsResponse = {
      items: [
        makeItem({ id: 'item-uuid-001', cleargate_id: 'EPIC-001', title: 'Epic One' }),
        makeItem({ id: 'item-uuid-002', cleargate_id: 'STORY-001-01', type: 'story', title: 'Story One' }),
        makeItem({ id: 'item-uuid-003', cleargate_id: 'STORY-001-02', type: 'story', title: 'Story Two' }),
        makeItem({ id: 'item-uuid-004', cleargate_id: 'CR-001', type: 'cr', title: 'Change Request' }),
      ],
      next_cursor: null,
    };

    await setupCommonMocks(page, itemsResponse);
    await page.goto(`/projects/${PROJECT_ID}/items`);

    // Page renders
    await expect(page.getByTestId('items-page')).toBeVisible({ timeout: 10_000 });

    // All 4 rows visible (desktop table hidden on narrow viewports — check the page)
    await expect(page.getByTestId('item-row').first()).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId('item-row')).toHaveCount(4);

    // Next button is NOT present when next_cursor is null
    await expect(page.getByTestId('next-btn')).not.toBeAttached();
  });

  test('Scenario: Cursor round-trip via URL', async ({ page }) => {
    let requestCount = 0;

    await page.route(EXCHANGE_URL, (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(stubExchange),
      }),
    );
    await page.route(PROJECT_URL, (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(stubProject),
      }),
    );
    await page.route(ITEMS_URL, (route) => {
      requestCount++;
      if (requestCount === 1) {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            items: [makeItem({ id: 'item-page1', cleargate_id: 'EPIC-001', title: 'Page 1 Epic' })],
            next_cursor: 'abc123',
          }),
        });
      } else {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            items: [makeItem({ id: 'item-page2', cleargate_id: 'STORY-002-01', type: 'story', title: 'Page 2 Story' })],
            next_cursor: null,
          }),
        });
      }
    });

    await page.goto(`/projects/${PROJECT_ID}/items`);

    // Wait for first page to load and Next to appear
    await expect(page.getByTestId('next-btn')).toBeVisible({ timeout: 10_000 });

    // Click Next
    await page.getByTestId('next-btn').click();

    // URL must contain cursor=abc123
    await expect(page).toHaveURL(/cursor=abc123/, { timeout: 5_000 });

    // Second page item rendered
    await expect(page.getByText('Page 2 Story').first()).toBeVisible({ timeout: 5_000 });
  });

  test('Scenario: Type filter + URL-sync', async ({ page }) => {
    let lastRequestUrl = '';

    await page.route(EXCHANGE_URL, (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(stubExchange),
      }),
    );
    await page.route(PROJECT_URL, (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(stubProject),
      }),
    );
    await page.route(ITEMS_URL, (route) => {
      lastRequestUrl = route.request().url();
      const url = new URL(lastRequestUrl);
      const type = url.searchParams.get('type');
      const items =
        type === 'story'
          ? [makeItem({ id: 'item-story-01', cleargate_id: 'STORY-001-01', type: 'story', title: 'Filtered Story' })]
          : [
              makeItem({ id: 'item-epic-01', cleargate_id: 'EPIC-001', type: 'epic', title: 'All Epic' }),
              makeItem({ id: 'item-story-01', cleargate_id: 'STORY-001-01', type: 'story', title: 'All Story' }),
            ];
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ items, next_cursor: null }),
      });
    });

    await page.goto(`/projects/${PROJECT_ID}/items`);

    // Wait for page to load
    await expect(page.getByTestId('items-page')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId('item-row').first()).toBeVisible({ timeout: 10_000 });

    const callCountBefore = lastRequestUrl ? 1 : 0;

    // Select Story type
    await page.selectOption('[data-testid="type-select"]', 'story');

    // URL should update with type=story
    await expect(page).toHaveURL(/type=story/, { timeout: 5_000 });

    // Filtered story row visible
    await expect(page.getByText('Filtered Story').first()).toBeVisible({ timeout: 5_000 });

    // The network was hit again (lastRequestUrl updated after URL change)
    expect(lastRequestUrl).toContain('type=story');

    // Count should be 1 (only story)
    await expect(page.getByTestId('item-row')).toHaveCount(1);
    void callCountBefore; // suppress unused warning
  });

  test('Scenario: CLID search filters client-side (no network re-call)', async ({ page }) => {
    let networkCallCount = 0;

    await page.route(EXCHANGE_URL, (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(stubExchange),
      }),
    );
    await page.route(PROJECT_URL, (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(stubProject),
      }),
    );
    await page.route(ITEMS_URL, (route) => {
      networkCallCount++;
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          items: [
            makeItem({ id: 'item-uuid-001', cleargate_id: 'EPIC-001', title: 'First Epic' }),
            makeItem({ id: 'item-uuid-002', cleargate_id: 'STORY-001-01', type: 'story', title: 'First Story' }),
            makeItem({ id: 'item-uuid-003', cleargate_id: 'CR-001', type: 'cr', title: 'First CR' }),
          ],
          next_cursor: null,
        }),
      });
    });

    await page.goto(`/projects/${PROJECT_ID}/items`);
    await expect(page.getByTestId('item-row').first()).toBeVisible({ timeout: 10_000 });
    expect(networkCallCount).toBe(1);

    // Type in the CLID search box
    await page.fill('[data-testid="clid-search"]', 'EPIC');

    // Only the EPIC row should remain
    await expect(page.getByTestId('item-row')).toHaveCount(1, { timeout: 3_000 });

    // Network should NOT have been called again
    expect(networkCallCount).toBe(1);
  });

  test('Scenario: 404 inline state (item not found in project)', async ({ page }) => {
    // Navigate to detail page with non-existent CLID.
    // The detail page fetches list?limit=200 and versions — if neither returns the CLID, notFound=true.
    await page.route(EXCHANGE_URL, (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(stubExchange),
      }),
    );
    await page.route(PROJECT_URL, (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(stubProject),
      }),
    );
    // Items list returns empty — CLID not found
    await page.route(ITEMS_URL, (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ items: [], next_cursor: null }),
      }),
    );
    // Versions returns 404
    await page.route(VERSIONS_URL, (route) =>
      route.fulfill({
        status: 404,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Not Found' }),
      }),
    );

    await page.goto(`/projects/${PROJECT_ID}/items/NOPE-999-99`);

    // not-found-state should render
    await expect(page.getByTestId('not-found-state')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(/not found in this project/i)).toBeVisible();
  });

  test('Scenario: Empty list state — EmptyState component renders', async ({ page }) => {
    const itemsResponse = {
      items: [],
      next_cursor: null,
    };

    await setupCommonMocks(page, itemsResponse);
    await page.goto(`/projects/${PROJECT_ID}/items`);

    // items-empty-state wrapper must be visible
    await expect(page.getByTestId('items-empty-state')).toBeVisible({ timeout: 10_000 });

    // The headline text from EmptyState should appear
    await expect(page.getByText('No items synced yet.')).toBeVisible();
  });
});

// ── Mobile 390px ─────────────────────────────────────────────────────────────

test.describe('Items Browser — Mobile 390px (STORY-006-06 QA Fix)', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('Scenario: Mobile viewport — card list renders, no horizontal overflow', async ({ page }) => {
    const itemsResponse = {
      items: [
        makeItem({ id: 'item-uuid-001', cleargate_id: 'EPIC-001', title: 'Mobile Test Epic' }),
        makeItem({ id: 'item-uuid-002', cleargate_id: 'STORY-001-01', type: 'story', title: 'Mobile Test Story' }),
      ],
      next_cursor: null,
    };

    await setupCommonMocks(page, itemsResponse);
    await page.goto(`/projects/${PROJECT_ID}/items`);

    // Wait for page to load
    await expect(page.getByTestId('items-page')).toBeVisible({ timeout: 10_000 });

    // Mobile card stack (md:hidden = visible on 390px)
    await expect(page.getByTestId('items-table-mobile')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId('item-card').first()).toBeVisible();

    // Desktop table (hidden md:block = hidden on 390px)
    await expect(page.getByTestId('items-table-desktop')).not.toBeVisible();

    // No horizontal overflow
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(scrollWidth).toBeLessThanOrEqual(390);
  });
});
