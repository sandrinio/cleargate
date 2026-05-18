/**
 * Type declarations for SvelteKit virtual modules.
 * Required when .svelte-kit/ generated files are absent (e.g. in CI without `vite dev`).
 * STORY-028-07: replaced the `extends: ".svelte-kit/tsconfig.json"` approach.
 */

// Route-level $types (each route's generated type file)
// When .svelte-kit/ isn't generated, use permissive any-typed stubs.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare module '*/$types' {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const RequestEvent: any;
  export { RequestEvent };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export type PageServerLoad = (...args: any[]) => any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export type LayoutServerLoad = (...args: any[]) => any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export type RequestHandler = (...args: any[]) => any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export type Actions = Record<string, (...args: any[]) => any>;
  // Permissive catch-all for any other types from this module
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const _default: any;
  export default _default;
  export { _default };
}

declare module '$env/dynamic/public' {
  export const env: Record<string, string>;
}

declare module '$env/dynamic/private' {
  export const env: Record<string, string>;
}

declare module '$env/static/public' {
  export const env: Record<string, string>;
}

declare module '$env/static/private' {
  export const env: Record<string, string>;
}
