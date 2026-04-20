/**
 * Login page server load — STORY-006-02
 * Redirects already-authenticated users to the dashboard.
 */
import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
  if (locals.session) {
    throw redirect(303, '/');
  }
  return {};
};
