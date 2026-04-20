/**
 * $app/stores stub for vitest unit tests.
 * SvelteKit's $app/stores is not available in jsdom; this stub provides
 * minimal readable store implementations so components can be tested.
 */
import { readable } from 'svelte/store';

export const page = readable({
  url: new URL('http://localhost/'),
  params: {} as Record<string, string>,
  route: { id: null },
  status: 200,
  error: null,
  data: {},
  form: null,
  state: {},
});

export const navigating = readable(null);

export const updated = {
  subscribe: readable(false).subscribe,
  check: () => Promise.resolve(false),
};
