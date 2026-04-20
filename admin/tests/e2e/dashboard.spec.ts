/**
 * Playwright E2E — dashboard page — STORY-006-03
 *
 * Tests:
 *   Scenario: Empty state (no projects) — renders EmptyState + CTA to /projects/new
 *   Scenario: List projects — 2 mocked projects render as cards
 *   Scenario: Server error on load — shows retry banner
 *   Scenario: Mobile 390px viewport — no horizontal overflow, cards stack (QA kickback Fix 3)
 *
 * Requires: CLEARGATE_DISABLE_AUTH=1 (set in playwright.config.ts webServer env)
 * Uses page.route() to intercept /admin-api/v1/* calls without a live MCP server.
 *
 * Note: The exchange() call (POST /admin-api/v1/auth/exchange) must also be mocked
 * so the client can acquire an adminToken before calling /projects.
 */
import { test, expect } from '@playwright/test';

const EXCHANGE_URL = '**/admin-api/v1/auth/exchange';
const PROJECTS_URL = '**/admin-api/v1/projects';

const stubExchangeResponse = {
  admin_token: 'test-token-abc123',
  expires_at: new Date(Date.now() + 3600 * 1000).toISOString(),
};

const stubProjects = [
  {
    id: 'proj-001',
    name: 'Alpha Project',
    created_by: 'admin',
    created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    deleted_at: null,
  },
  {
    id: 'proj-002',
    name: 'Beta Project',
    created_by: 'admin',
    created_at: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    deleted_at: null,
  },
];

test.describe('Dashboard (STORY-006-03)', () => {
  test('Scenario: Empty state — shows "No projects yet" + CTA to /projects/new', async ({
    page,
  }) => {
    // Mock exchange endpoint
    await page.route(EXCHANGE_URL, (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(stubExchangeResponse),
      }),
    );

    // Mock projects endpoint — return empty list
    await page.route(PROJECTS_URL, (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ projects: [] }),
      }),
    );

    await page.goto('/');

    // Wait for the empty state to appear (client-side fetch completes)
    await expect(page.getByText('No projects yet')).toBeVisible({ timeout: 10_000 });
    await expect(
      page.getByText('Create your first project to start syncing items'),
    ).toBeVisible();

    // CTA link routes to /projects/new
    const cta = page.getByRole('link', { name: 'Create your first project →' });
    await expect(cta).toBeVisible();
    await expect(cta).toHaveAttribute('href', '/projects/new');
  });

  test('Scenario: List projects — 2 mocked projects render as cards', async ({ page }) => {
    // Mock exchange
    await page.route(EXCHANGE_URL, (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(stubExchangeResponse),
      }),
    );

    // Mock projects endpoint — return 2 projects
    await page.route(PROJECTS_URL, (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ projects: stubProjects }),
      }),
    );

    await page.goto('/');

    // Both project names should render as links
    await expect(page.getByRole('link', { name: 'Alpha Project' })).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.getByRole('link', { name: 'Beta Project' })).toBeVisible();

    // Cards should link to individual project pages
    const alphaLink = page.getByRole('link', { name: 'Alpha Project' });
    await expect(alphaLink).toHaveAttribute('href', '/projects/proj-001');

    const betaLink = page.getByRole('link', { name: 'Beta Project' });
    await expect(betaLink).toHaveAttribute('href', '/projects/proj-002');

    // Primary "New project" CTA should be visible
    await expect(page.getByRole('link', { name: 'New project' })).toBeVisible();
  });

  test('Scenario: Server error — shows "Couldn\'t load projects" + Retry button', async ({
    page,
  }) => {
    // Mock exchange
    await page.route(EXCHANGE_URL, (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(stubExchangeResponse),
      }),
    );

    // Mock projects endpoint — return 503
    await page.route(PROJECTS_URL, (route) =>
      route.fulfill({
        status: 503,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Service unavailable' }),
      }),
    );

    await page.goto('/');

    // Error banner should appear
    await expect(page.getByText("Couldn't load projects")).toBeVisible({ timeout: 10_000 });

    // Retry button should be present
    const retryBtn = page.getByRole('button', { name: 'Retry' });
    await expect(retryBtn).toBeVisible();
  });

  test('Scenario: alphabetical sort — out-of-order projects render Apple before Zebra', async ({
    page,
  }) => {
    // Mock exchange
    await page.route(EXCHANGE_URL, (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(stubExchangeResponse),
      }),
    );

    // Deliberately reversed: Zebra first, Apple second in the API response
    const outOfOrderProjects = [
      {
        id: 'proj-z',
        name: 'Zebra Project',
        created_by: 'admin',
        created_at: new Date(Date.now() - 1000).toISOString(),
        deleted_at: null,
      },
      {
        id: 'proj-a',
        name: 'Apple Project',
        created_by: 'admin',
        created_at: new Date(Date.now() - 2000).toISOString(),
        deleted_at: null,
      },
    ];

    await page.route(PROJECTS_URL, (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ projects: outOfOrderProjects }),
      }),
    );

    await page.goto('/');

    // Wait for the sorted list to appear
    const appleLink = page.getByRole('link', { name: 'Apple Project' });
    const zebraLink = page.getByRole('link', { name: 'Zebra Project' });
    await expect(appleLink).toBeVisible({ timeout: 10_000 });
    await expect(zebraLink).toBeVisible();

    // Assert DOM order: Apple must appear before Zebra in the document
    const allLinks = page.getByRole('link', { name: /Project$/ });
    const firstLinkText = await allLinks.first().textContent();
    expect(firstLinkText?.trim()).toBe('Apple Project');
  });

  test('Scenario: "New project" header CTA routes to /projects/new', async ({ page }) => {
    // Mock exchange
    await page.route(EXCHANGE_URL, (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(stubExchangeResponse),
      }),
    );

    // Mock projects with one project so we're in loaded state
    await page.route(PROJECTS_URL, (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ projects: stubProjects }),
      }),
    );

    await page.goto('/');

    // Wait for loaded state
    await expect(page.getByRole('link', { name: 'Alpha Project' })).toBeVisible({
      timeout: 10_000,
    });

    const newProjectBtn = page.getByRole('link', { name: 'New project' });
    await expect(newProjectBtn).toBeVisible();
    await expect(newProjectBtn).toHaveAttribute('href', '/projects/new');
  });
});

/**
 * Fix 3 (QA kickback) — Mobile 390px viewport test.
 *
 * Asserts no horizontal overflow and that project cards stack vertically
 * (i.e., no side-by-side layout that causes overflow at 390px width).
 * The dashboard uses grid-cols-1 at mobile (Tailwind default, sm:grid-cols-2 at ≥640px).
 */
test.describe('Mobile 390px viewport (QA kickback Fix 3)', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('Scenario: no horizontal overflow at 390px, project cards stack vertically', async ({
    page,
  }) => {
    // Mock exchange
    await page.route(EXCHANGE_URL, (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(stubExchangeResponse),
      }),
    );

    // Two projects — at 390px they must stack (grid-cols-1)
    const twoProjects = [
      {
        id: 'proj-001',
        name: 'Alpha Project',
        created_by: 'admin',
        created_at: new Date(Date.now() - 1000).toISOString(),
        deleted_at: null,
      },
      {
        id: 'proj-002',
        name: 'Beta Project',
        created_by: 'admin',
        created_at: new Date(Date.now() - 2000).toISOString(),
        deleted_at: null,
      },
    ];

    await page.route(PROJECTS_URL, (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ projects: twoProjects }),
      }),
    );

    await page.goto('/');

    // Wait for project cards to render
    await expect(page.getByRole('link', { name: 'Alpha Project' })).toBeVisible({
      timeout: 10_000,
    });

    // Assert no horizontal scroll: scrollWidth must not exceed viewport width
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(scrollWidth).toBeLessThanOrEqual(390);

    // Assert cards stack vertically: card bounding boxes must not overlap horizontally.
    // At grid-cols-1 each card spans full width, so alphaBox.right <= betaBox.left is false
    // and betaBox.top >= alphaBox.bottom (vertical stacking).
    const alphaBox = await page.getByRole('link', { name: 'Alpha Project' }).boundingBox();
    const betaBox = await page.getByRole('link', { name: 'Beta Project' }).boundingBox();

    expect(alphaBox).toBeTruthy();
    expect(betaBox).toBeTruthy();

    // Beta card must start below (or at the same Y as) alpha card's bottom — vertical stacking
    // alphaBox.y + alphaBox.height = alpha bottom edge; betaBox.y must be >= that
    const alphaBottom = alphaBox!.y + alphaBox!.height;
    expect(betaBox!.y).toBeGreaterThanOrEqual(alphaBottom - 5); // 5px tolerance for sub-pixel
  });
});
