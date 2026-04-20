/**
 * Root layout server load — STORY-006-02
 *
 * Enforces auth guard: redirects unauthenticated users to /login.
 *
 * Bypass: CLEARGATE_DISABLE_AUTH=1 skips the redirect.
 * This is ONLY for M1 Playwright smoke test compatibility.
 * NEVER set this in production.
 *
 * Public routes that bypass the guard:
 *   /login     — the sign-in page
 *   /auth/*    — @auth/sveltekit OAuth callback routes
 *   /logout    — sign-out handler
 */
import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

const PUBLIC_ROUTES = ['/login', '/auth', '/logout'];

function isPublicRoute(pathname: string): boolean {
  return PUBLIC_ROUTES.some((prefix) => pathname === prefix || pathname.startsWith(prefix + '/'));
}

export const load: LayoutServerLoad = async ({ locals, url }) => {
  // Dev/test bypass — never use in production
  if (process.env['CLEARGATE_DISABLE_AUTH'] === '1') {
    return { session: null };
  }

  const pathname = url.pathname;

  if (!isPublicRoute(pathname) && !locals.session) {
    throw redirect(303, '/login');
  }

  return {
    session: locals.session,
  };
};
