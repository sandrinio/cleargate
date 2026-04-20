/**
 * Current-user store — STORY-006-09
 *
 * Singleton for the calling admin's own profile from GET /admin-api/v1/users/me.
 * Populated once during layout load; used to gate Settings tab visibility.
 *
 * Plain module-level variable with subscriber pattern.
 * Svelte components import getCurrentUser() and call it in $derived() / $effect().
 */

export interface CurrentUser {
  id: string;
  github_handle: string;
  is_root: boolean;
}

// Module-level singleton — plain variable, no Svelte runes (testable in .ts context)
let _currentUser: CurrentUser | null = null;
const _listeners = new Set<() => void>();

export function setCurrentUser(user: CurrentUser | null): void {
  _currentUser = user;
  for (const fn of _listeners) fn();
}

export function getCurrentUser(): CurrentUser | null {
  return _currentUser;
}

/**
 * Subscribe to current user changes.
 * Returns an unsubscribe function.
 * Svelte components use $effect() + this to re-read getCurrentUser().
 */
export function subscribeCurrentUser(fn: () => void): () => void {
  _listeners.add(fn);
  return () => _listeners.delete(fn);
}
