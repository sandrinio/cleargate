/**
 * Auth stores — STORY-006-02
 * Svelte 5 rune-based reactive state for session user info.
 */

export interface SessionUser {
  github_handle: string;
  avatar_url?: string | null;
}

/** Reactive session user state — null when unauthenticated */
export let sessionUser = $state<SessionUser | null>(null);

export function setSessionUser(user: SessionUser | null): void {
  sessionUser = user;
}
