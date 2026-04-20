/**
 * Playwright E2E — Audit → Items link navigation — STORY-006-06 (QA kickback fix)
 *
 * Scenarios:
 *   1. Target link navigates to items detail (desktop)
 *   2. Target link navigates on mobile viewport (390px)
 *
 * Uses page.route() to mock admin-api endpoints.
 * Requires CLEARGATE_DISABLE_AUTH=1 (set in playwright.config.ts webServer env).
 */
import { test, expect, type Page } from '@playwright/test';

const EXCHANGE_URL = '**/admin-api/v1/auth/exchange';
const PROJECT_URL = '**/admin-api/v1/projects/proj-audit-links';
const MEMBERS_URL = '**/admin-api/v1/projects/proj-audit-links/members';
const AUDIT_URL = '**/admin-api/v1/projects/proj-audit-links/audit**';

const PROJECT_ID = 'proj-audit-links';
const TARGET_CLID = 'STORY-001-01';

const stubExchange = {
  admin_token: 'test-token-audit-links',
  expires_at: new Date(Date.now() + 3600 * 1000).toISOString(),
};

const stubProject = {
  id: PROJECT_ID,
  name: 'Audit Links Test Project',
  created_by: 'admin',
  created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
  deleted_at: null,
};

const stubMembers = {
  members: [
    {
      id: 'uuid-bob',
      email: 'bob@example.com',
      role: 'member',
      status: 'active',
      created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      github_handle: 'bob',
    },
  ],
};

const stubAuditWithTarget = {
  rows: [
    {
      id: 'audit-row-001',
      timestamp: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
      member_id: 'uuid-bob',
      acting_user: 'bob@example.com',
      tool: 'push_item',
      target_cleargate_id: TARGET_CLID,
      result: 'ok',
      error_code: null,
      ip_address: null,
      user_agent: null,
    },
  ],
  next_cursor: null,
};

async function setupAuditMocks(page: Page) {
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
  await page.route(MEMBERS_URL, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(stubMembers),
    }),
  );
  await page.route(AUDIT_URL, (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(stubAuditWithTarget),
    }),
  );
}

test.describe('Audit → Items link navigation — Desktop (STORY-006-06)', () => {
  test('Scenario: Target link navigates to items detail (desktop)', async ({ page }) => {
    await setupAuditMocks(page);
    await page.goto(`/projects/${PROJECT_ID}/audit`);

    // Wait for audit page to load
    await expect(page.getByTestId('audit-page')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId('audit-row').first()).toBeVisible({ timeout: 10_000 });

    // Target link in desktop table
    const targetLink = page.getByTestId('target-link').first();
    await expect(targetLink).toBeVisible();
    await expect(targetLink).toHaveText(TARGET_CLID);

    // Click the target link
    await targetLink.click();

    // URL should navigate to /projects/<id>/items/<clid>
    await expect(page).toHaveURL(
      new RegExp(`/projects/${PROJECT_ID}/items/${TARGET_CLID}`),
      { timeout: 5_000 },
    );
  });
});

test.describe('Audit → Items link navigation — Mobile 390px (STORY-006-06)', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('Scenario: Target link navigates on mobile viewport (390px)', async ({ page }) => {
    await setupAuditMocks(page);
    await page.goto(`/projects/${PROJECT_ID}/audit`);

    // Wait for audit page to load
    await expect(page.getByTestId('audit-page')).toBeVisible({ timeout: 10_000 });

    // On mobile, cards appear (audit-table-mobile)
    await expect(page.getByTestId('audit-table-mobile')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId('audit-card').first()).toBeVisible();

    // Mobile card target link
    const mobileTargetLink = page.getByTestId('target-link-mobile').first();
    await expect(mobileTargetLink).toBeVisible();
    await expect(mobileTargetLink).toHaveText(TARGET_CLID);

    // Click the mobile target link
    await mobileTargetLink.click();

    // URL should navigate to /projects/<id>/items/<clid>
    await expect(page).toHaveURL(
      new RegExp(`/projects/${PROJECT_ID}/items/${TARGET_CLID}`),
      { timeout: 5_000 },
    );
  });
});
