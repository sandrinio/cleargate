/**
 * SvelteKit server hooks stub — STORY-006-01
 *
 * TODO(STORY-006-02): Wire SvelteKitAuth({ providers: [GitHub(...)], adapter: redisAdapter, ... })
 * and seed locals.mcpClient pre-exchanged for SSR page.server.ts.
 */

import type { Handle } from '@sveltejs/kit';

/** Passthrough handle — STORY-006-02 replaces with auth middleware */
export const handle: Handle = async ({ event, resolve }) => {
  return resolve(event);
};
