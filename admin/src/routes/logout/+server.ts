/**
 * POST /logout — STORY-006-02
 *
 * Deletes the cg_session Redis key, clears the cookie, redirects to /login.
 * CSRF-protected via SameSite=Lax (form POST from same origin only).
 */
import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { signOut } from '$lib/mcp-client.js';
import { createRedisAdapter } from '$lib/auth/redis-adapter.js';

export const POST: RequestHandler = async ({ cookies }) => {
  const sessionToken = cookies.get('cg_session');

  if (sessionToken) {
    // Delete from Redis
    try {
      const adapter = createRedisAdapter();
      await adapter.deleteSession?.(sessionToken);
    } catch (err) {
      // Log but don't block redirect — session will expire naturally
      console.error('[logout] failed to delete session from Redis:', err);
    }

    // Clear the cookie
    cookies.delete('cg_session', {
      path: '/',
      httpOnly: true,
      secure: process.env['NODE_ENV'] === 'production',
      sameSite: 'lax',
    });
  }

  // Clear the in-memory mcp-client state (cancel proactive refresh timer)
  signOut();

  throw redirect(303, '/login');
};
