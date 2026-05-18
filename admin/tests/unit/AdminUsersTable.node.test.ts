import { describe, test, mock } from 'node:test';
import assert from 'node:assert/strict';

/**
 * Unit tests for AdminUsersTable — STORY-006-09
 *
 * Gherkin scenarios covered:
 *   - Root admin lists admins: table renders rows with handle + role + status
 *   - Self row: actions disabled for current user
 *   - Disabled row: shows Enable button instead of Disable
 */
import { render } from '@testing-library/svelte';
import type { AdminUser } from 'cleargate/admin-api';
import AdminUsersTable from '../../src/lib/components/AdminUsersTable.svelte';

// Minimal expect() shim (STORY-028-06)
// Backs remaining expect() calls with node:assert so vitest is not needed.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function expect(actual: any): any {
  const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return {
    toBe(expected: unknown) { assert.strictEqual(actual, expected); },
    toEqual(expected: unknown) { assert.deepStrictEqual(actual, expected); },
    toStrictEqual(expected: unknown) { assert.deepStrictEqual(actual, expected); },
    toBeNull() { assert.strictEqual(actual, null); },
    toBeUndefined() { assert.strictEqual(actual, undefined); },
    toBeDefined() { assert.notStrictEqual(actual, undefined); },
    toBeTruthy() { assert.ok(actual); },
    toBeFalsy() { assert.ok(!actual); },
    toBeGreaterThan(n: number) { assert.ok((actual as number) > n); },
    toBeGreaterThanOrEqual(n: number) { assert.ok((actual as number) >= n); },
    toBeLessThan(n: number) { assert.ok((actual as number) < n); },
    toBeLessThanOrEqual(n: number) { assert.ok((actual as number) <= n); },
    toContain(sub: unknown) { assert.ok(String(actual).includes(String(sub))); },
    toMatch(p: string | RegExp) { assert.match(String(actual), typeof p === 'string' ? new RegExp(esc(p)) : p); },
    toHaveLength(len: number) { assert.strictEqual((actual as { length: number }).length, len); },
    toThrow(msg?: string | RegExp) {
      if (!msg) assert.throws(actual as () => void);
      else if (typeof msg === 'string') assert.throws(actual as () => void, new RegExp(esc(msg)));
      else assert.throws(actual as () => void, msg);
    },
    toBeInstanceOf(cls: new (...a: unknown[]) => unknown) { assert.ok(actual instanceof cls); },
    toMatchObject(expected: Record<string, unknown>) { assert.deepStrictEqual(actual, expected); },
    toHaveBeenCalled() { assert.ok((actual as { mock: { calls: unknown[] } }).mock.calls.length > 0); },
    toHaveBeenCalledTimes(n: number) { assert.strictEqual((actual as { mock: { calls: unknown[] } }).mock.calls.length, n); },
    toHaveBeenCalledOnce() { assert.strictEqual((actual as { mock: { calls: unknown[] } }).mock.calls.length, 1); },
    toHaveBeenCalledWith(...expectedArgs: unknown[]) {
      const calls = (actual as { mock: { calls: { arguments: unknown[] }[] } }).mock.calls;
      assert.deepStrictEqual(calls[calls.length - 1]?.arguments, expectedArgs);
    },
    toHaveProperty(key: string, val?: unknown) {
      const obj = actual as Record<string, unknown>;
      assert.ok(key in obj);
      if (val !== undefined) assert.deepStrictEqual(obj[key], val);
    },
    get not(): any {
      return {
        toBe(expected: unknown) { assert.notStrictEqual(actual, expected); },
        toEqual(expected: unknown) { assert.notDeepStrictEqual(actual, expected); },
        toBeNull() { assert.notStrictEqual(actual, null); },
        toBeUndefined() { assert.notStrictEqual(actual, undefined); },
        toBeDefined() { assert.strictEqual(actual, undefined); },
        toBeTruthy() { assert.ok(!actual); },
        toBeFalsy() { assert.ok(actual); },
        toContain(sub: unknown) { assert.ok(!String(actual).includes(String(sub))); },
        toMatch(p: string | RegExp) { assert.doesNotMatch(String(actual), typeof p === 'string' ? new RegExp(esc(p)) : p); },
        toThrow() { assert.doesNotThrow(actual as () => void); },
        toHaveBeenCalled() { assert.strictEqual((actual as { mock: { calls: unknown[] } }).mock.calls.length, 0); },
        toHaveProperty(key: string) { const obj = actual as Record<string, unknown>; assert.ok(!(key in obj)); },
        toBeInstanceOf(cls: new (...a: unknown[]) => unknown) { assert.ok(!(actual instanceof cls)); },
        toHaveLength(len: number) { assert.notStrictEqual((actual as { length: number }).length, len); },
      };
    },
    get resolves(): any {
      const p = actual as Promise<unknown>;
      return {
        async toBe(expected: unknown) { assert.strictEqual(await p, expected); },
        async toEqual(expected: unknown) { assert.deepStrictEqual(await p, expected); },
        async toBeUndefined() { assert.strictEqual(await p, undefined); },
        async toBeNull() { assert.strictEqual(await p, null); },
        async toBeDefined() { assert.notStrictEqual(await p, undefined); },
        async toBeTruthy() { assert.ok(await p); },
      };
    },
    get rejects(): any {
      const p = actual as Promise<unknown>;
      return {
        async toBeInstanceOf(cls: new (...a: unknown[]) => unknown) { await assert.rejects(p, cls); },
        async toThrow(msg?: string) {
          if (!msg) await assert.rejects(p);
          else await assert.rejects(p, new RegExp(esc(msg)));
        },
        async toSatisfy(predicate: (val: unknown) => boolean) {
          let err: unknown;
          try { await p; } catch(e) { err = e; }
          assert.ok(predicate(err), `Rejected value did not satisfy predicate. Got: ${String(err)}`);
        },
      };
    },
  };
}


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
  test('Scenario: Root admin lists admins — renders 3 rows', () => {
    const { getAllByTestId } = render(AdminUsersTable, {
      props: {
        users: mockUsers,
        currentUserId: 'aaa00000-0000-4000-8001-000000000001',
        ontoggleroot: mock.fn(() => Promise.resolve(undefined)),
        ondisable: mock.fn(() => Promise.resolve(undefined)),
        onenable: mock.fn(() => Promise.resolve(undefined)),
      },
    });

    const rows = getAllByTestId('admin-row');
    assert.strictEqual((rows).length, 3);
  });

  test('Scenario: Table renders handles correctly', () => {
    const { getByText } = render(AdminUsersTable, {
      props: {
        users: mockUsers,
        currentUserId: null,
        ontoggleroot: mock.fn(() => Promise.resolve(undefined)),
        ondisable: mock.fn(() => Promise.resolve(undefined)),
        onenable: mock.fn(() => Promise.resolve(undefined)),
      },
    });

    expect(getByText('@root-alice')).toBeTruthy();
    expect(getByText('@admin-bob')).toBeTruthy();
    expect(getByText('@disabled-carol')).toBeTruthy();
  });

  test('Scenario: Self row shows no actions (cannot modify own row)', () => {
    const { getAllByText } = render(AdminUsersTable, {
      props: {
        users: mockUsers,
        currentUserId: 'aaa00000-0000-4000-8001-000000000001', // root-alice is self
        ontoggleroot: mock.fn(() => Promise.resolve(undefined)),
        ondisable: mock.fn(() => Promise.resolve(undefined)),
        onenable: mock.fn(() => Promise.resolve(undefined)),
      },
    });

    // "No actions" text appears for the self row
    const noActions = getAllByText('No actions');
    assert.ok(noActions.length > 0);
  });

  test('Scenario: Disabled row shows Enable button, not Disable', () => {
    const { getAllByTestId } = render(AdminUsersTable, {
      props: {
        users: mockUsers,
        currentUserId: null,
        ontoggleroot: mock.fn(() => Promise.resolve(undefined)),
        ondisable: mock.fn(() => Promise.resolve(undefined)),
        onenable: mock.fn(() => Promise.resolve(undefined)),
      },
    });

    const enableBtns = getAllByTestId('enable-btn');
    assert.strictEqual(enableBtns.length, 1); // only carol is disabled
  });

  test('Scenario: Active non-self row shows Disable button', () => {
    const { getAllByTestId } = render(AdminUsersTable, {
      props: {
        users: mockUsers,
        currentUserId: null,
        ontoggleroot: mock.fn(() => Promise.resolve(undefined)),
        ondisable: mock.fn(() => Promise.resolve(undefined)),
        onenable: mock.fn(() => Promise.resolve(undefined)),
      },
    });

    const disableBtns = getAllByTestId('disable-btn');
    // alice and bob are active; carol is disabled (shows enable)
    assert.strictEqual(disableBtns.length, 2);
  });
});
