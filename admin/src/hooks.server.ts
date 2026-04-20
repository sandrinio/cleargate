/**
 * SvelteKit server hooks — STORY-006-02
 *
 * Wires @auth/sveltekit with GitHub OAuth + custom Redis adapter.
 * Seeds locals.session for SSR page.server.ts load functions.
 *
 * Environment variables required:
 *   CLEARGATE_GITHUB_WEB_CLIENT_ID
 *   CLEARGATE_GITHUB_WEB_CLIENT_SECRET
 *   AUTH_SECRET
 *   REDIS_URL
 *
 * Dev bypass: CLEARGATE_DISABLE_AUTH=1 skips the auth redirect guard
 * (for M1 Playwright smoke test compatibility — never set in production).
 */

import { SvelteKitAuth } from '@auth/sveltekit';
import GitHub from '@auth/core/providers/github';
import type { Handle } from '@sveltejs/kit';
import { sequence } from '@sveltejs/kit/hooks';
import { createRedisAdapter } from '$lib/auth/redis-adapter.js';

// Lazy-initialize the adapter once
const redisAdapter = createRedisAdapter();

// SvelteKitAuth returns { handle, signIn, signOut }
const { handle: authHandle } = SvelteKitAuth({
  providers: [
    GitHub({
      clientId: process.env['CLEARGATE_GITHUB_WEB_CLIENT_ID'] ?? '',
      clientSecret: process.env['CLEARGATE_GITHUB_WEB_CLIENT_SECRET'] ?? '',
      authorization: {
        params: { scope: 'read:user' },
      },
      profile(profile) {
        // Augment the standard user shape with our required M1 contract fields
        // These will be passed to createUser and stored in Redis
        return {
          id: profile.id.toString(),
          name: profile.name ?? profile.login,
          email: profile.email ?? `${profile.login}@users.noreply.github.com`,
          image: profile.avatar_url,
          // Extra fields stored in the user record for session population
          github_handle: profile.login,
          github_user_id: profile.id.toString(),
          avatar_url: profile.avatar_url,
        };
      },
    }),
  ],
  adapter: redisAdapter,
  session: {
    strategy: 'database',
    maxAge: 60 * 60 * 24 * 7, // 7 days
  },
  cookies: {
    sessionToken: {
      name: 'cg_session',
      options: {
        httpOnly: true,
        secure: process.env['NODE_ENV'] === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 60 * 60 * 24 * 7,
      },
    },
  },
  callbacks: {
    async signIn({ profile }) {
      // Only allow sign in — admin authorization is verified via the exchange route's 403 signal.
      // The signIn callback returning true allows the session to be created.
      // Non-admin users will be rejected when the UI calls /auth/exchange and gets 403.
      if (!profile?.login) return false;
      return true;
    },
    async session({ session, user }) {
      // With database strategy, 'user' is the AdapterUser from the store.
      // Expose github_handle for the client (safe to expose — it's the public GitHub login).
      const extendedUser = user as typeof user & {
        github_handle?: string;
        github_user_id?: string;
        avatar_url?: string;
      };
      return {
        ...session,
        user: {
          ...session.user,
          github_handle: extendedUser.github_handle ?? (user.name ?? ''),
          github_user_id: extendedUser.github_user_id ?? '',
          avatar_url: extendedUser.avatar_url ?? user.image,
        },
      };
    },
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  trustHost: true,
  secret: process.env['AUTH_SECRET'] ?? 'dev-secret-change-in-production',
});

/**
 * Session population handle — reads auth session into locals.session for SSR.
 */
const sessionHandle: Handle = async ({ event, resolve }) => {
  // Populate locals.session from the @auth/sveltekit session
  const authSession = await event.locals.auth();
  if (authSession?.user) {
    const user = authSession.user as typeof authSession.user & {
      github_handle?: string;
      github_user_id?: string;
      avatar_url?: string;
    };
    event.locals.session = {
      user: {
        github_handle: user.github_handle ?? user.name ?? '',
        github_user_id: user.github_user_id ?? '',
        avatar_url: user.avatar_url ?? user.image,
        email: user.email,
        name: user.name,
        image: user.image,
      },
    };
  } else {
    event.locals.session = null;
  }

  return resolve(event);
};

export const handle: Handle = sequence(authHandle, sessionHandle);
