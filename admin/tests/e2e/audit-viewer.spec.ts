/**
 * Playwright E2E — Audit Log Viewer — STORY-006-07
 *
 * Tests:
 *   Scenario: Default 7-day window — table renders rows from last 7d
 *   Scenario: Filter by tool — URL updates with ?tool= param, rows re-render
 *   Scenario: 30d clamp warning — wide range shows inline warning
 *   Scenario: Empty state — no rows renders "No audit events in this window."
 *   Scenario: Load more — appends rows when next_cursor present
 *   Scenario: Reset filters — URL drops all params, 7d window restored
 *   Scenario: Error result pill — error row shows red pill with error_code
 *   Scenario: Cursor-null hides Load more button
 *
 * Uses page.route() to mock MCP endpoints.
 * Requires CLEARGATE_DISABLE_AUTH=1 (set in playwright.config.ts).
 */
import { test, expect, type Page } from '@playwright/test';

const EXCHANGE_URL = '**/admin-api/v1/auth/exchange';
const PROJECT_URL = '**/admin-api/v1/projects/proj-audit-01';
const MEMBERS_URL = '**/admin-api/v1/projects/proj-audit-01/members';
const AUDIT_URL = '**/admin-api/v1/projects/proj-audit-01/audit**';

const stubExchange = {
  admin_token: 'test-token-audit',
  expires_at: new Date(Date.now() + 3600 * 1000).toISOString(),
};

const stubProject = {
  id: 'proj-audit-01',
  name: 'Audit Test Project',
  created_by: 'admin',
  created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
  deleted_at: null,
};

const stubMembers = {
  members: [
    {
      id: 'uuid-alice',
      email: 'alice@example.com',
      role: 'member',
      status: 'active',
      created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      github_handle: 'alice',
    },
  ],
};

function makeAuditRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 'row-001',
    timestamp: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
    member_id: 'uuid-alice',
    acting_user: 'alice@example.com',
    tool: 'push_item',
    target_cleargate_id: 'EPIC-001',
    result: 'ok',
    error_code: null,
    ip_address: null,
    user_agent: null,
    ...overrides,
  };
}

async function setupCommonMocks(page: Page, auditResponse: unknown) {
  await page.route(EXCHANGE_URL, (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(stubExchange) }),
  );
  await page.route(PROJECT_URL, (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(stubProject) }),
  );
  await page.route(MEMBERS_URL, (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(stubMembers) }),
  );
  await page.route(AUDIT_URL, (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(auditResponse) }),
  );
}

test.describe('Audit Log Viewer (STORY-006-07)', () => {
  test('Scenario: Default 7-day window — table renders rows with actor email', async ({ page }) => {
    const auditResponse = {
      rows: [makeAuditRow()],
      next_cursor: null,
    };

    await setupCommonMocks(page, auditResponse);
    await page.goto('/projects/proj-audit-01/audit');

    // Table should render
    await expect(page.getByTestId('audit-page')).toBeVisible({ timeout: 10_000 });

    // Row renders
    await expect(page.getByTestId('audit-row').first()).toBeVisible({ timeout: 10_000 });

    // Tool value is visible
    await expect(page.getByText('push_item').first()).toBeVisible();
  });

  test('Scenario: Filter by tool — URL updates with ?tool=push_item', async ({ page }) => {
    const auditResponse = {
      rows: [makeAuditRow({ tool: 'push_item' })],
      next_cursor: null,
    };

    await setupCommonMocks(page, auditResponse);
    await page.goto('/projects/proj-audit-01/audit');

    // Wait for initial load
    await expect(page.getByTestId('audit-page')).toBeVisible({ timeout: 10_000 });

    // Select tool
    await page.selectOption('[data-testid="tool-select"]', 'push_item');

    // URL should contain tool param
    await expect(page).toHaveURL(/tool=push_item/, { timeout: 5_000 });
  });

  test('Scenario: Empty state — shows "No audit events in this window."', async ({ page }) => {
    const auditResponse = { rows: [], next_cursor: null };

    await setupCommonMocks(page, auditResponse);
    await page.goto('/projects/proj-audit-01/audit');

    await expect(page.getByText('No audit events in this window.')).toBeVisible({ timeout: 10_000 });
  });

  test('Scenario: Error result pill — shows red error pill with error_code', async ({ page }) => {
    const auditResponse = {
      rows: [
        makeAuditRow({
          id: 'row-error',
          result: 'error',
          error_code: 'invite_expired',
        }),
      ],
      next_cursor: null,
    };

    await setupCommonMocks(page, auditResponse);
    await page.goto('/projects/proj-audit-01/audit');

    await expect(page.getByTestId('result-pill-error').first()).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(/error: invite_expired/)).toBeVisible();
  });

  test('Scenario: Cursor-null hides Load more button', async ({ page }) => {
    const auditResponse = {
      rows: [makeAuditRow()],
      next_cursor: null,
    };

    await setupCommonMocks(page, auditResponse);
    await page.goto('/projects/proj-audit-01/audit');

    // Wait for table to render
    await expect(page.getByTestId('audit-row').first()).toBeVisible({ timeout: 10_000 });

    // Load more should not be visible
    await expect(page.getByTestId('load-more-btn')).not.toBeVisible();
  });

  test('Scenario: Load more — appends rows when next_cursor is present then hidden when null', async ({ page }) => {
    let requestCount = 0;

    await page.route(EXCHANGE_URL, (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(stubExchange) }),
    );
    await page.route(PROJECT_URL, (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(stubProject) }),
    );
    await page.route(MEMBERS_URL, (route) =>
      route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(stubMembers) }),
    );
    await page.route(AUDIT_URL, (route) => {
      requestCount++;
      if (requestCount === 1) {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            rows: [makeAuditRow({ id: 'row-page1' })],
            next_cursor: 'cursor-abc',
          }),
        });
      } else {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            rows: [makeAuditRow({ id: 'row-page2', target_cleargate_id: 'EPIC-002' })],
            next_cursor: null,
          }),
        });
      }
    });

    await page.goto('/projects/proj-audit-01/audit');

    // Load more button visible with first page
    await expect(page.getByTestId('load-more-btn')).toBeVisible({ timeout: 10_000 });

    // Click load more
    await page.click('[data-testid="load-more-btn"]');

    // After second page, load more button should disappear (next_cursor = null)
    await expect(page.getByTestId('load-more-btn')).not.toBeVisible({ timeout: 5_000 });
  });

  test('Scenario: Reset filters — URL drops all params', async ({ page }) => {
    const auditResponse = { rows: [makeAuditRow()], next_cursor: null };

    await setupCommonMocks(page, auditResponse);

    // Navigate with filters applied
    await page.goto('/projects/proj-audit-01/audit?tool=push_item');

    // Wait for page to load
    await expect(page.getByTestId('audit-page')).toBeVisible({ timeout: 10_000 });

    // Click reset
    await page.click('[data-testid="reset-btn"]');

    // URL should not contain tool param
    await expect(page).toHaveURL(/\/projects\/proj-audit-01\/audit$/, { timeout: 5_000 });
  });

  test('Scenario: 30d clamp warning — wide date range shows inline clamp warning', async ({ page }) => {
    const now = new Date();
    const to = now.toISOString();
    // 61 days back — exceeds the 30d cap
    const from = new Date(now.getTime() - 61 * 24 * 60 * 60 * 1000).toISOString();

    const auditResponse = { rows: [makeAuditRow()], next_cursor: null };
    await setupCommonMocks(page, auditResponse);

    await page.goto(
      `/projects/proj-audit-01/audit?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
    );

    // clamp-warning must be visible and mention "30 days"
    const warning = page.getByTestId('clamp-warning');
    await expect(warning).toBeVisible({ timeout: 10_000 });
    await expect(warning).toContainText('30 days');
  });

  test('Scenario: Last 24h preset — URL gains ?from= ~24h before ?to=', async ({ page }) => {
    const auditResponse = { rows: [makeAuditRow()], next_cursor: null };
    await setupCommonMocks(page, auditResponse);

    await page.goto('/projects/proj-audit-01/audit');

    // Wait for page to be ready
    await expect(page.getByTestId('audit-page')).toBeVisible({ timeout: 10_000 });

    const before = Date.now();
    // Click the "Last 24h" preset button
    await page.click('[data-testid="preset-24h"]');
    const after = Date.now();

    // URL must contain ?from=
    await expect(page).toHaveURL(/from=/, { timeout: 5_000 });

    const url = new URL(page.url());
    const fromParam = url.searchParams.get('from');
    const toParam = url.searchParams.get('to');

    expect(fromParam).not.toBeNull();
    expect(toParam).not.toBeNull();

    const fromMs = new Date(fromParam!).getTime();
    const toMs = new Date(toParam!).getTime();
    const windowMs = toMs - fromMs;
    const expected24h = 24 * 60 * 60 * 1000;

    // Window should be ~24h ± 2s of clock drift
    expect(windowMs).toBeGreaterThanOrEqual(expected24h - 2000);
    expect(windowMs).toBeLessThanOrEqual(expected24h + 2000);

    // "to" should be within the test execution window
    expect(toMs).toBeGreaterThanOrEqual(before - 1000);
    expect(toMs).toBeLessThanOrEqual(after + 5000);
  });

  test('Scenario: Filter roundtrip — URL-synced filters preserved across reload', async ({ page }) => {
    const auditResponse = {
      rows: [makeAuditRow({ tool: 'list_items' })],
      next_cursor: null,
    };

    await setupCommonMocks(page, auditResponse);

    // Navigate with existing filter in URL
    const now = new Date();
    const to = now.toISOString();
    const from = new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString();
    await page.goto(`/projects/proj-audit-01/audit?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&tool=list_items`);

    // Table should render with data
    await expect(page.getByTestId('audit-page')).toBeVisible({ timeout: 10_000 });

    // Tool select should reflect the URL filter
    const toolSelect = page.locator('[data-testid="tool-select"]');
    await expect(toolSelect).toHaveValue('list_items', { timeout: 5_000 });
  });
});

// ── Mobile 390px — Scenario: responsive layout at narrow viewport ─────────────

test.describe('Audit Log Viewer — Mobile 390px (STORY-006-07 QA Fix 3)', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('Scenario: Mobile viewport — mobile card stack visible, desktop table hidden, no horizontal overflow', async ({
    page,
  }) => {
    const auditResponse = { rows: [makeAuditRow()], next_cursor: null };
    await setupCommonMocks(page, auditResponse);

    await page.goto('/projects/proj-audit-01/audit');

    // Wait for data to load
    await expect(page.getByTestId('audit-page')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId('audit-card').first()).toBeVisible({ timeout: 10_000 });

    // audit-table-mobile (md:hidden ≡ visible on 390px) must be visible
    await expect(page.getByTestId('audit-table-mobile')).toBeVisible();

    // audit-table-desktop (hidden md:block ≡ hidden on 390px) must NOT be visible
    await expect(page.getByTestId('audit-table-desktop')).not.toBeVisible();

    // No horizontal overflow
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(scrollWidth).toBeLessThanOrEqual(390);
  });
});
