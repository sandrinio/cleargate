/**
 * Playwright E2E — Project members page: invite + remove flows — STORY-006-04
 *
 * Runs with CLEARGATE_DISABLE_AUTH=1 (set by playwright.config.ts webServer env).
 * Intercepts MCP admin-API calls with mock responses — no live MCP connection needed.
 *
 * Scenarios covered (subset, per DoD §4):
 *   - Members table renders rows with StatusPill variants
 *   - Invite button opens InviteModal
 *   - Form submits → URL phase shows invite_url
 *   - Invite URL not in localStorage/sessionStorage after close
 *   - Remove button opens ConfirmDialog → confirm → row disappears + toast
 *   - Cancel on ConfirmDialog → no DELETE → row remains
 */
import { test, expect } from '@playwright/test';

const PROJECT_ID = 'test-project-id';
const BASE_URL = 'http://localhost:3001';

const mockProject = {
  id: PROJECT_ID,
  name: 'Test Project',
  created_by: 'admin-user',
  created_at: new Date(Date.now() - 86400e3 * 5).toISOString(),
  deleted_at: null,
};

const mockMembers = [
  {
    id: 'mem-active-1',
    project_id: PROJECT_ID,
    email: 'alice@example.com',
    role: 'user',
    status: 'active',
    display_name: null,
    created_at: new Date(Date.now() - 86400e3 * 3).toISOString(),
  },
  {
    id: 'mem-pending-1',
    project_id: PROJECT_ID,
    email: 'bob@example.com',
    role: 'user',
    status: 'pending',
    display_name: null,
    created_at: new Date(Date.now() - 86400e3).toISOString(),
  },
  {
    id: 'mem-expired-1',
    project_id: PROJECT_ID,
    email: 'carol@example.com',
    role: 'service',
    status: 'expired',
    display_name: null,
    created_at: new Date(Date.now() - 86400e3 * 10).toISOString(),
  },
];

const mockInviteResponse = {
  member: {
    id: 'mem-new-1',
    project_id: PROJECT_ID,
    email: 'dave@example.com',
    role: 'user',
    status: 'pending',
    display_name: null,
    created_at: new Date().toISOString(),
  },
  invite_url: 'https://mcp.cleargate.example/join/invite-token-xyz',
  invite_token: 'invite-token-xyz',
  invite_expires_in: 86400,
};

const mockTokens = { tokens: [] };

test.describe('Members page', () => {
  test.beforeEach(async ({ page }) => {
    // Mock auth exchange
    await page.route(`${BASE_URL}/admin-api/v1/auth/exchange`, (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          admin_token: 'mock-admin-token',
          expires_at: new Date(Date.now() + 3600e3).toISOString(),
        }),
      });
    });

    // Mock project detail
    await page.route(`${BASE_URL}/admin-api/v1/projects/${PROJECT_ID}`, (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockProject),
      });
    });

    // Mock members list
    await page.route(`${BASE_URL}/admin-api/v1/projects/${PROJECT_ID}/members`, (route) => {
      if (route.request().method() === 'GET') {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ members: mockMembers }),
        });
      } else {
        route.continue();
      }
    });

    // Mock tokens list
    await page.route(`${BASE_URL}/admin-api/v1/projects/${PROJECT_ID}/tokens`, (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockTokens),
      });
    });
  });

  test('members table renders rows with correct status pills', async ({ page }) => {
    await page.goto(`/projects/${PROJECT_ID}/members`);

    // Wait for table to appear
    await expect(page.getByText('alice@example.com')).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('bob@example.com')).toBeVisible();
    await expect(page.getByText('carol@example.com')).toBeVisible();

    // Check StatusPill labels
    await expect(page.getByText('Active')).toBeVisible();
    await expect(page.getByText('Pending')).toBeVisible();
    await expect(page.getByText('Expired')).toBeVisible();
  });

  test('Invite button opens modal with form', async ({ page }) => {
    await page.goto(`/projects/${PROJECT_ID}/members`);
    await expect(page.getByText('alice@example.com')).toBeVisible({ timeout: 5000 });

    await page.getByRole('button', { name: 'Invite' }).click();
    await expect(page.getByLabel('Email address')).toBeVisible();
    await expect(page.getByLabel('Role')).toBeVisible();
  });

  test('invite form submit → URL phase shows invite_url', async ({ page }) => {
    // Mock invite POST
    await page.route(`${BASE_URL}/admin-api/v1/projects/${PROJECT_ID}/members`, (route) => {
      if (route.request().method() === 'POST') {
        route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify(mockInviteResponse),
        });
      } else {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ members: mockMembers }),
        });
      }
    });

    await page.goto(`/projects/${PROJECT_ID}/members`);
    await expect(page.getByText('alice@example.com')).toBeVisible({ timeout: 5000 });

    await page.getByRole('button', { name: 'Invite' }).click();
    await page.getByLabel('Email address').fill('dave@example.com');
    await page.getByRole('button', { name: 'Send invite' }).click();

    // URL phase should show invite URL
    await expect(
      page.locator('input[value="https://mcp.cleargate.example/join/invite-token-xyz"]')
    ).toBeVisible({ timeout: 5000 });

    // Copy button should be present
    await expect(page.getByLabel('Copy invite URL')).toBeVisible();
  });

  test('invite URL is not in localStorage/sessionStorage after modal close', async ({ page }) => {
    await page.route(`${BASE_URL}/admin-api/v1/projects/${PROJECT_ID}/members`, (route) => {
      if (route.request().method() === 'POST') {
        route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify(mockInviteResponse),
        });
      } else {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ members: mockMembers }),
        });
      }
    });

    await page.goto(`/projects/${PROJECT_ID}/members`);
    await expect(page.getByText('alice@example.com')).toBeVisible({ timeout: 5000 });

    await page.getByRole('button', { name: 'Invite' }).click();
    await page.getByLabel('Email address').fill('dave@example.com');
    await page.getByRole('button', { name: 'Send invite' }).click();

    await expect(
      page.locator('input[value="https://mcp.cleargate.example/join/invite-token-xyz"]')
    ).toBeVisible({ timeout: 5000 });

    // Close the modal
    await page.getByRole('button', { name: 'Done' }).click();

    // Assert invite_url not in storage
    const storageCheck = await page.evaluate(() => {
      const lsContent = JSON.stringify(Object.entries(localStorage));
      const ssContent = JSON.stringify(Object.entries(sessionStorage));
      return { ls: lsContent, ss: ssContent };
    });
    expect(storageCheck.ls).not.toContain('invite-token-xyz');
    expect(storageCheck.ss).not.toContain('invite-token-xyz');
  });

  test('Remove button opens ConfirmDialog', async ({ page }) => {
    await page.goto(`/projects/${PROJECT_ID}/members`);
    await expect(page.getByText('alice@example.com')).toBeVisible({ timeout: 5000 });

    // Click Remove for alice
    await page.getByRole('button', { name: 'Remove alice@example.com' }).click();

    // ConfirmDialog should appear
    await expect(page.getByText('Remove member')).toBeVisible();
    await expect(
      page.getByText(/Remove alice@example\.com from Test Project/i)
    ).toBeVisible();
  });

  test('Cancel on ConfirmDialog closes dialog without DELETE', async ({ page }) => {
    let deleteCount = 0;
    await page.route(`${BASE_URL}/admin-api/v1/members/**`, (route) => {
      if (route.request().method() === 'DELETE') {
        deleteCount++;
        route.fulfill({ status: 204, body: '' });
      } else {
        route.continue();
      }
    });

    await page.goto(`/projects/${PROJECT_ID}/members`);
    await expect(page.getByText('alice@example.com')).toBeVisible({ timeout: 5000 });

    await page.getByRole('button', { name: 'Remove alice@example.com' }).click();
    await expect(page.getByText('Remove member')).toBeVisible();

    // Cancel
    await page.getByRole('button', { name: 'Cancel' }).click();

    // Dialog should close
    await expect(page.getByText('Remove member')).not.toBeVisible();

    // No DELETE should have been called
    expect(deleteCount).toBe(0);

    // Alice's row still present
    await expect(page.getByText('alice@example.com')).toBeVisible();
  });

  test('Confirm remove → DELETE called → row removed + toast', async ({ page }) => {
    await page.route(`${BASE_URL}/admin-api/v1/members/mem-active-1`, (route) => {
      if (route.request().method() === 'DELETE') {
        route.fulfill({ status: 204, body: '' });
      } else {
        route.continue();
      }
    });

    await page.goto(`/projects/${PROJECT_ID}/members`);
    await expect(page.getByText('alice@example.com')).toBeVisible({ timeout: 5000 });

    await page.getByRole('button', { name: 'Remove alice@example.com' }).click();
    await expect(page.getByText('Remove member')).toBeVisible();

    // Confirm
    await page.getByRole('button', { name: 'Remove' }).last().click();

    // Alice's row should disappear (optimistic removal)
    await expect(page.getByText('alice@example.com')).not.toBeVisible({ timeout: 5000 });

    // Toast appears
    await expect(page.getByText('Removed alice@example.com')).toBeVisible();
  });
});
