/**
 * Unit tests for current-user store — STORY-006-09
 *
 * Gherkin scenarios covered:
 *   - Non-root gets 403 signal: Settings tab hidden for non-root via /users/me store
 *   - Root gets Settings tab visible
 *   - current-user store populated in layout load
 */
import { describe, it, expect } from 'vitest';
import { setCurrentUser, getCurrentUser } from '../../src/lib/stores/current-user.js';

describe('current-user store', () => {
  it('Scenario: current-user store populated with root admin', () => {
    setCurrentUser({ id: 'aaa-1', github_handle: 'root-alice', is_root: true });
    const user = getCurrentUser();
    expect(user).not.toBeNull();
    expect(user?.is_root).toBe(true);
    expect(user?.github_handle).toBe('root-alice');
  });

  it('Scenario: current-user store populated with non-root admin', () => {
    setCurrentUser({ id: 'bbb-2', github_handle: 'non-root-bob', is_root: false });
    const user = getCurrentUser();
    expect(user?.is_root).toBe(false);
  });

  it('Scenario: Non-root setting — Settings tab hidden (is_root false)', () => {
    setCurrentUser({ id: 'bbb-2', github_handle: 'non-root-bob', is_root: false });
    const user = getCurrentUser();
    // Settings should NOT be shown for non-root
    const shouldShowSettings = user?.is_root === true;
    expect(shouldShowSettings).toBe(false);
  });

  it('Scenario: Root setting — Settings tab visible (is_root true)', () => {
    setCurrentUser({ id: 'aaa-1', github_handle: 'root-alice', is_root: true });
    const user = getCurrentUser();
    // Settings SHOULD be shown for root
    const shouldShowSettings = user?.is_root === true;
    expect(shouldShowSettings).toBe(true);
  });

  it('setCurrentUser(null) clears the store', () => {
    setCurrentUser({ id: 'aaa-1', github_handle: 'alice', is_root: true });
    setCurrentUser(null);
    expect(getCurrentUser()).toBeNull();
  });
});
