import { svelte } from '@sveltejs/vite-plugin-svelte';
import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  plugins: [svelte({ hot: false })],
  resolve: {
    alias: {
      // SvelteKit $lib alias — needed for components that use $lib/* imports
      $lib: path.resolve(__dirname, './src/lib'),
    },
    conditions: ['browser'],
  },
  test: {
    include: ['tests/unit/**/*.{test,spec}.{js,ts}'],
    environment: 'jsdom',
    globals: true,
  },
});
