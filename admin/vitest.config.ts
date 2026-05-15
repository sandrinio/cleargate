import { svelte } from '@sveltejs/vite-plugin-svelte';
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  plugins: [svelte({ hot: false })],
  resolve: {
    alias: {
      // SvelteKit $lib alias — needed for components that use $lib/* imports
      $lib: path.resolve(__dirname, './src/lib'),
      // SvelteKit $app/* stubs for unit tests (vitest does not run the SvelteKit plugin)
      '$app/navigation': path.resolve(__dirname, './src/lib/__mocks__/app-navigation.ts'),
      '$app/stores': path.resolve(__dirname, './src/lib/__mocks__/app-stores.ts'),
      // SvelteKit $env/* stubs — vi.mock() overrides these in individual tests
      '$env/dynamic/public': path.resolve(__dirname, './src/lib/__mocks__/env-dynamic-public.ts'),
    },
    conditions: ['browser'],
  },
  test: {
    include: ['tests/unit/**/*.{test,spec}.{js,ts}'],
    environment: 'jsdom',
    globals: true,
  },
});
