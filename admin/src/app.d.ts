// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
  namespace App {
    // interface Error {}
    interface Locals {
      /** Auth.js session accessor — populated by SvelteKitAuth handle */
      auth: import('@auth/sveltekit').SvelteKitAuthConfig['trustHost'] extends never
        ? never
        : () => Promise<import('@auth/core/types').Session | null>;
      /** Typed session data from Redis adapter (when authenticated) */
      session: {
        user: {
          github_handle: string;
          github_user_id: string;
          avatar_url?: string | null;
          email?: string | null;
          name?: string | null;
          image?: string | null;
        };
      } | null;
    }
    // interface PageData {}
    // interface PageState {}
    // interface Platform {}
  }
}

export {};
