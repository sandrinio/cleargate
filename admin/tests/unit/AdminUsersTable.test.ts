/**
 * Unit tests for AdminUsersTable — STORY-006-09
 *
 * Gherkin scenarios covered:
 *   - Root admin lists admins: table renders rows with handle + role + status
 *   - Self row: actions disabled for current user
 *   - Disabled row: shows Enable button instead of Disable
 */
import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/svelte';
import type { AdminUser } from 'cleargate/admin-api';
import AdminUsersTable from '../../src/lib/components/AdminUsersTable.svelte';

const mockUsers: AdminUser[] = [
  {
    id: 'aaa00000-0000-4000-8001-000000000001',
    github_handle: 'root-alice',
    github_user_id: '11111',
    is_root: true,
    disabled_at: null,
    created_at: '2026-04-01T00:00:00Z',
    created_by: null,
  },
  {
    id: 'bbb00000-0000-4000-8001-000000000002',
    github_handle: 'admin-bob',
    github_user_id: '22222',
    is_root: false,
    disabled_at: null,
    created_at: '2026-04-02T00:00:00Z',
    created_by: 'aaa00000-0000-4000-8001-000000000001',
  },
  {
    id: 'ccc00000-0000-4000-8001-000000000003',
    github_handle: 'disabled-carol',
    github_user_id: '33333',
    is_root: false,
    disabled_at: '2026-04-10T00:00:00Z',
    created_at: '2026-04-03T00:00:00Z',
    created_by: 'aaa00000-0000-4000-8001-000000000001',
  },
];

describe('AdminUsersTable', () => {
  it('Scenario: Root admin lists admins — renders 3 rows', () => {
    const { getAllByTestId } = render(AdminUsersTable, {
      props: {
        users: mockUsers,
        currentUserId: 'aaa00000-0000-4000-8001-000000000001',
        ontoggleroot: vi.fn(),
        ondisable: vi.fn(),
        onenable: vi.fn(),
      },
    });

    const rows = getAllByTestId('admin-row');
    expect(rows).toHaveLength(3);
  });

  it('Scenario: Table renders handles correctly', () => {
    const { getByText } = render(AdminUsersTable, {
      props: {
        users: mockUsers,
        currentUserId: null,
        ontoggleroot: vi.fn(),
        ondisable: vi.fn(),
        onenable: vi.fn(),
      },
    });

    expect(getByText('@root-alice')).toBeTruthy();
    expect(getByText('@admin-bob')).toBeTruthy();
    expect(getByText('@disabled-carol')).toBeTruthy();
  });

  it('Scenario: Self row shows no actions (cannot modify own row)', () => {
    const { getAllByText } = render(AdminUsersTable, {
      props: {
        users: mockUsers,
        currentUserId: 'aaa00000-0000-4000-8001-000000000001', // root-alice is self
        ontoggleroot: vi.fn(),
        ondisable: vi.fn(),
        onenable: vi.fn(),
      },
    });

    // "No actions" text appears for the self row
    const noActions = getAllByText('No actions');
    expect(noActions.length).toBeGreaterThan(0);
  });

  it('Scenario: Disabled row shows Enable button, not Disable', () => {
    const { getAllByTestId } = render(AdminUsersTable, {
      props: {
        users: mockUsers,
        currentUserId: null,
        ontoggleroot: vi.fn(),
        ondisable: vi.fn(),
        onenable: vi.fn(),
      },
    });

    const enableBtns = getAllByTestId('enable-btn');
    expect(enableBtns.length).toBe(1); // only carol is disabled
  });

  it('Scenario: Active non-self row shows Disable button', () => {
    const { getAllByTestId } = render(AdminUsersTable, {
      props: {
        users: mockUsers,
        currentUserId: null,
        ontoggleroot: vi.fn(),
        ondisable: vi.fn(),
        onenable: vi.fn(),
      },
    });

    const disableBtns = getAllByTestId('disable-btn');
    // alice and bob are active; carol is disabled (shows enable)
    expect(disableBtns.length).toBe(2);
  });
});
